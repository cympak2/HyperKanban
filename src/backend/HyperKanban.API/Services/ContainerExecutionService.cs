using Azure;
using Azure.Core;
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.ContainerInstance;
using Azure.ResourceManager.ContainerInstance.Models;
using HyperKanban.API.Models;
using System.Text.Json;

namespace HyperKanban.API.Services;

public interface IContainerExecutionService
{
    Task<ContainerExecutionResult> ExecuteContainerAsync(
        string workItemId,
        string containerImage,
        object inputPayload,
        int timeoutSeconds = 300);
}

public class ContainerExecutionResult
{
    public bool Success { get; set; }
    public object? Output { get; set; }
    public string? ErrorMessage { get; set; }
    public int ExecutionTimeSeconds { get; set; }
    public int ExitCode { get; set; }
    public string? ContainerLogs { get; set; }
}

public class AciExecutionService : IContainerExecutionService
{
    private readonly ArmClient _armClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AciExecutionService> _logger;
    private readonly string _resourceGroupName;
    private readonly string _location;
    private readonly TokenCredential _credential;
    private readonly HttpClient _httpClient;

    public AciExecutionService(
        IConfiguration configuration,
        ILogger<AciExecutionService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _resourceGroupName = configuration["Azure:ResourceGroup"] ?? "hyperkanban-rg";
        _location = configuration["Azure:Location"] ?? "eastus";

        // Use DefaultAzureCredential for authentication (supports local dev + Azure managed identity)
        _credential = new DefaultAzureCredential();
        _armClient = new ArmClient(_credential);
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<ContainerExecutionResult> ExecuteContainerAsync(
        string workItemId,
        string containerImage,
        object inputPayload,
        int timeoutSeconds = 300)
    {
        var startTime = DateTime.UtcNow;
        var containerGroupName = $"ai-agent-{workItemId}-{Guid.NewGuid().ToString().Substring(0, 8)}";

        try
        {
            _logger.LogInformation("Starting container execution for work item {WorkItemId} with image {Image}",
                workItemId, containerImage);

            // 1. Prepare container input (as environment variable for security)
            var inputJson = JsonSerializer.Serialize(inputPayload);

            // 2. Get subscription and resource group
            var subscriptionId = _configuration["Azure:SubscriptionId"] 
                ?? throw new InvalidOperationException("Azure:SubscriptionId not configured");
            
            var subscription = _armClient.GetSubscriptionResource(
                new Azure.Core.ResourceIdentifier($"/subscriptions/{subscriptionId}")
            );
            var resourceGroup = await subscription.GetResourceGroupAsync(_resourceGroupName);

            // 3. Create container group data
            var containerGroupData = new ContainerGroupData(
                new AzureLocation(_location),
                new List<ContainerInstanceContainer>
                {
                    new ContainerInstanceContainer(
                        name: "ai-agent",
                        image: containerImage,
                        resources: new ContainerResourceRequirements(
                            requests: new ContainerResourceRequestsContent(memoryInGB: 1.5, cpu: 1.0)
                        )
                    )
                    {
                        EnvironmentVariables =
                        {
                            new ContainerEnvironmentVariable("WORK_ITEM_INPUT") { SecureValue = inputJson }
                        }
                    }
                },
                ContainerInstanceOperatingSystemType.Linux
            )
            {
                RestartPolicy = ContainerGroupRestartPolicy.Never
            };
            
            // Add registry credentials if configured
            var credentials = GetRegistryCredentials();
            foreach (var credential in credentials)
            {
                containerGroupData.ImageRegistryCredentials.Add(credential);
            }

            // 4. Start container
            var containerGroupCollection = resourceGroup.Value.GetContainerGroups();
            var operation = await containerGroupCollection.CreateOrUpdateAsync(
                WaitUntil.Completed,
                containerGroupName,
                containerGroupData
            );

            var containerGroup = operation.Value;

            // 5. Wait for completion with timeout
            var exitStatus = await WaitForContainerCompletionAsync(
                resourceGroup.Value,
                containerGroupName,
                timeoutSeconds
            );

            // 6. Retrieve container logs (output is expected on STDOUT)
            var logs = await GetContainerLogsAsync(resourceGroup.Value, containerGroupName);

            // 7. Parse output JSON from logs
            var output = ParseContainerOutput(logs);

            // 8. Cleanup - delete container group
            await containerGroup.DeleteAsync(WaitUntil.Completed);

            var executionTime = (int)(DateTime.UtcNow - startTime).TotalSeconds;

            _logger.LogInformation("Container execution completed for work item {WorkItemId} in {ExecutionTime}s",
                workItemId, executionTime);

            return new ContainerExecutionResult
            {
                Success = exitStatus.ExitCode == 0,
                Output = output,
                ExecutionTimeSeconds = executionTime,
                ExitCode = exitStatus.ExitCode,
                ContainerLogs = logs
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container execution failed for work item {WorkItemId}", workItemId);
            
            // Cleanup on error
            try
            {
                var subscriptionId = _configuration["Azure:SubscriptionId"]!;
                var subscription = _armClient.GetSubscriptionResource(
                    new Azure.Core.ResourceIdentifier($"/subscriptions/{subscriptionId}")
                );
                var resourceGroup = await subscription.GetResourceGroupAsync(_resourceGroupName);
                var containerGroup = await resourceGroup.Value.GetContainerGroupAsync(containerGroupName);
                await containerGroup.Value.DeleteAsync(WaitUntil.Completed);
            }
            catch
            {
                // Ignore cleanup errors
            }

            return new ContainerExecutionResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                ExecutionTimeSeconds = (int)(DateTime.UtcNow - startTime).TotalSeconds,
                ExitCode = -1
            };
        }
    }

    private async Task<(int ExitCode, DateTime FinishTime)> WaitForContainerCompletionAsync(
        Azure.ResourceManager.Resources.ResourceGroupResource resourceGroup,
        string containerGroupName,
        int timeoutSeconds)
    {
        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
        
        while (!cts.Token.IsCancellationRequested)
        {
            var containerGroupResponse = await resourceGroup.GetContainerGroupAsync(containerGroupName);
            var containerGroup = containerGroupResponse.Value;
            var container = containerGroup.Data.Containers.First();

            if (container.InstanceView?.CurrentState?.State == "Terminated")
            {
                return (
                    container.InstanceView.CurrentState.ExitCode ?? -1,
                    container.InstanceView.CurrentState.FinishOn?.UtcDateTime ?? DateTime.UtcNow
                );
            }

            await Task.Delay(2000, cts.Token); // Poll every 2 seconds
        }

        // Timeout - force terminate
        throw new TimeoutException($"Container execution exceeded {timeoutSeconds}s timeout");
    }

    private async Task<string> GetContainerLogsAsync(
        Azure.ResourceManager.Resources.ResourceGroupResource resourceGroup,
        string containerGroupName)
    {
        try
        {
            // Get subscription ID for REST API call
            var subscriptionId = _configuration["Azure:SubscriptionId"] 
                ?? throw new InvalidOperationException("Azure:SubscriptionId not configured");

            // Build REST API URL for container logs
            // https://learn.microsoft.com/rest/api/container-instances/container-groups/list-logs
            var apiUrl = $"https://management.azure.com/subscriptions/{subscriptionId}" +
                        $"/resourceGroups/{_resourceGroupName}" +
                        $"/providers/Microsoft.ContainerInstance/containerGroups/{containerGroupName}" +
                        $"/containers/ai-agent/logs?api-version=2023-05-01&tail=1000";

            // Get access token for Azure Management API
            var tokenRequestContext = new TokenRequestContext(new[] { "https://management.azure.com/.default" });
            var token = await _credential.GetTokenAsync(tokenRequestContext, CancellationToken.None);

            // Make REST API call to retrieve logs
            var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);
            
            var response = await _httpClient.SendAsync(request);
            
            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var logResponse = JsonSerializer.Deserialize<ContainerLogsResponse>(responseContent);
                var logs = logResponse?.Content ?? string.Empty;
                
                _logger.LogInformation("Retrieved {LogLength} characters of logs from container {ContainerGroupName}", 
                    logs.Length, containerGroupName);
                
                return logs;
            }
            else
            {
                _logger.LogWarning("Failed to retrieve logs for {ContainerGroupName}. Status: {StatusCode}", 
                    containerGroupName, response.StatusCode);
                return string.Empty;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve container logs for {ContainerGroupName}", containerGroupName);
            return string.Empty;
        }
    }

    // Response model for container logs API
    private class ContainerLogsResponse
    {
        public string? Content { get; set; }
    }

    private object? ParseContainerOutput(string logs)
    {
        try
        {
            // Container should output JSON to STDOUT
            // Find the JSON output (last valid JSON in logs)
            var lines = logs.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            
            for (int i = lines.Length - 1; i >= 0; i--)
            {
                var line = lines[i].Trim();
                if (line.StartsWith("{") || line.StartsWith("["))
                {
                    return JsonSerializer.Deserialize<object>(line);
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse container output as JSON");
            return null;
        }
    }

    private List<ContainerGroupImageRegistryCredential> GetRegistryCredentials()
    {
        var credentials = new List<ContainerGroupImageRegistryCredential>();
        
        var acrServer = _configuration["Azure:ContainerRegistry:Server"];
        var acrUsername = _configuration["Azure:ContainerRegistry:Username"];
        var acrPassword = _configuration["Azure:ContainerRegistry:Password"];

        if (!string.IsNullOrEmpty(acrServer) && !string.IsNullOrEmpty(acrUsername) && !string.IsNullOrEmpty(acrPassword))
        {
            credentials.Add(new ContainerGroupImageRegistryCredential(acrServer)
            {
                Username = acrUsername,
                Password = acrPassword
            });
        }

        return credentials;
    }
}

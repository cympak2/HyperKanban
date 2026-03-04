using System.Text.Json;
using System.Text.Json.Serialization;
using HyperKanban.API.Models.Requests;
using HyperKanban.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace HyperKanban.API.Controllers;

// ── cic HTTP API response shapes ─────────────────────────────────────────────

public class CicHealthResponse
{
    [JsonPropertyName("status")]  public string Status  { get; set; } = string.Empty;
    [JsonPropertyName("version")] public string Version { get; set; } = string.Empty;
}

public class CicServerListResponse
{
    [JsonPropertyName("instances")] public List<CicServerInstance> Instances { get; set; } = new();
}

public class CicServerInstance
{
    [JsonPropertyName("instanceName")]    public string  InstanceName    { get; set; } = string.Empty;
    [JsonPropertyName("containerId")]     public string  ContainerId     { get; set; } = string.Empty;
    [JsonPropertyName("containerName")]   public string  ContainerName   { get; set; } = string.Empty;
    [JsonPropertyName("port")]            public int     Port            { get; set; }
    [JsonPropertyName("model")]           public string? Model           { get; set; }
    [JsonPropertyName("logLevel")]        public string  LogLevel        { get; set; } = string.Empty;
    [JsonPropertyName("startedAt")]       public string  StartedAt       { get; set; } = string.Empty;
    [JsonPropertyName("workspaceFolder")] public string  WorkspaceFolder { get; set; } = string.Empty;
    [JsonPropertyName("status")]          public string  Status          { get; set; } = string.Empty;
    [JsonPropertyName("uptime")]          public string? Uptime          { get; set; }
    // Injected by the proxy so the frontend knows which cic HTTP server this instance came from
    [JsonPropertyName("cicServerUrl")]    public string  CicServerUrl    { get; set; } = string.Empty;
}

// ─────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly IHttpClientFactory _httpClientFactory;

    public ProjectsController(IProjectService projectService, IHttpClientFactory httpClientFactory)
    {
        _projectService = projectService;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var projects = await _projectService.GetAllAsync();
        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var project = await _projectService.GetByIdAsync(id);
        if (project == null)
            return NotFound(new { message = $"Project '{id}' not found" });
        return Ok(project);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request)
    {
        try
        {
            var project = await _projectService.CreateAsync(request.Name, request.Code, request.Description, request.CicServerUrls);
            return CreatedAtAction(nameof(GetById), new { id = project.Id }, project);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProjectRequest request)
    {
        try
        {
            var project = await _projectService.UpdateAsync(id, request.Name, request.Code, request.Description, request.CicServerUrls);
            return Ok(project);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            await _projectService.DeleteAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/cic-servers/verify")]
    public async Task<IActionResult> VerifyCicServer(string id, [FromBody] VerifyCicServerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { message = "URL is required" });

        var project = await _projectService.GetByIdAsync(id);
        if (project == null)
            return NotFound(new { message = $"Project '{id}' not found" });

        var result = await CheckCicServerHealth(request.Url);
        return Ok(result);
    }

    [HttpGet("{id}/cic-servers/status")]
    public async Task<IActionResult> GetCicServerStatuses(string id)
    {
        var project = await _projectService.GetByIdAsync(id);
        if (project == null)
            return NotFound(new { message = $"Project '{id}' not found" });

        var tasks = project.CicServerUrls.Select(url => CheckCicServerHealth(url));
        var results = await Task.WhenAll(tasks);
        return Ok(results);
    }

    [HttpGet("{id}/cic-servers/instances")]
    public async Task<IActionResult> GetCicServerInstances(string id)
    {
        var project = await _projectService.GetByIdAsync(id);
        if (project == null)
            return NotFound(new { message = $"Project '{id}' not found" });

        var tasks = project.CicServerUrls.Select(url => FetchInstancesAsync(url));
        var perServer = await Task.WhenAll(tasks);
        return Ok(perServer.SelectMany(x => x).ToList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<object> CheckCicServerHealth(string url)
    {
        try
        {
            var client    = _httpClientFactory.CreateClient("CicServerCheck");
            var healthUrl = url.TrimEnd('/') + "/health";
            var response  = await client.GetAsync(healthUrl);

            if (!response.IsSuccessStatusCode)
                return new { url, reachable = false, version = (string?)null, error = (string?)$"HTTP {(int)response.StatusCode}" };

            var json   = await response.Content.ReadAsStringAsync();
            var health = JsonSerializer.Deserialize<CicHealthResponse>(json);
            var ok     = health?.Status == "ok";
            return ok
                ? new { url, reachable = true,  version = (string?)health!.Version, error = (string?)null }
                : new { url, reachable = false, version = (string?)null,              error = (string?)$"Unexpected status: {health?.Status}" };
        }
        catch (HttpRequestException ex)
        {
            return new { url, reachable = false, version = (string?)null, error = (string?)ex.Message };
        }
        catch (TaskCanceledException)
        {
            return new { url, reachable = false, version = (string?)null, error = (string?)"Connection timed out" };
        }
        catch (Exception ex)
        {
            return new { url, reachable = false, version = (string?)null, error = (string?)ex.Message };
        }
    }

    private async Task<List<CicServerInstance>> FetchInstancesAsync(string url)
    {
        try
        {
            var client     = _httpClientFactory.CreateClient("CicServerCheck");
            var serversUrl = url.TrimEnd('/') + "/api/servers";
            var response   = await client.GetAsync(serversUrl);
            if (!response.IsSuccessStatusCode) return new();

            var json = await response.Content.ReadAsStringAsync();
            var list = JsonSerializer.Deserialize<CicServerListResponse>(json);
            if (list?.Instances == null) return new();

            foreach (var inst in list.Instances)
                inst.CicServerUrl = url;

            return list.Instances;
        }
        catch
        {
            return new();
        }
    }
}

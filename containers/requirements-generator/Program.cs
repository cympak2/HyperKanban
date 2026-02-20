using Azure;
using Azure.AI.OpenAI;
using System.Text.Json;

namespace RequirementsGenerator;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var startTime = DateTime.UtcNow;

        try
        {
            var inputJson = Environment.GetEnvironmentVariable("WORK_ITEM_INPUT");
            if (string.IsNullOrEmpty(inputJson))
            {
                await Console.Error.WriteLineAsync(JsonSerializer.Serialize(new
                {
                    status = "error",
                    error = "WORK_ITEM_INPUT environment variable not set"
                }));
                return 1;
            }

            var input = JsonSerializer.Deserialize<WorkItemInput>(inputJson);
            if (input == null)
            {
                await Console.Error.WriteLineAsync(JsonSerializer.Serialize(new
                {
                    status = "error",
                    error = "Failed to deserialize WORK_ITEM_INPUT"
                }));
                return 1;
            }

            // Extract previous analysis from AI processing history
            var previousAnalysis = input.PreviousResults?.FirstOrDefault()?.Output ?? "{}";

            var endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")
                ?? throw new InvalidOperationException("AZURE_OPENAI_ENDPOINT not set");
            var apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")
                ?? throw new InvalidOperationException("AZURE_OPENAI_KEY not set");

            var client = new OpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));

            var prompt = $@"
Based on this feature analysis, generate detailed requirements:

Title: {input.Title}
Description: {input.Description}
Analysis: {previousAnalysis}

Generate:
1. **Functional Requirements** (list of FR-XXX with descriptions)
2. **User Stories** (list of As a..., I want..., So that...)
3. **Acceptance Criteria** (list of Given/When/Then scenarios)
4. **Non-Functional Requirements** (performance, security, etc.)
5. **Technical Constraints** (list of technical limitations or requirements)

Return as JSON:
{{
  ""functionalRequirements"": [{{""id"": ""FR-001"", ""description"": ""...""}}],
  ""userStories"": [""As a user, I want...""],
  ""acceptanceCriteria"": [""Given..., When..., Then...""],
  ""nonFunctionalRequirements"": [""...""],
  ""technicalConstraints"": [""...""]
}}";

            var chatCompletionsOptions = new ChatCompletionsOptions
            {
                DeploymentName = "gpt-4",
                Messages =
                {
                    new ChatRequestSystemMessage("You are a senior requirements engineer. Generate detailed, testable requirements."),
                    new ChatRequestUserMessage(prompt)
                },
                Temperature = 0.6f,
                MaxTokens = 1500
            };

            var response = await client.GetChatCompletionsAsync(chatCompletionsOptions);
            var requirementsContent = response.Value.Choices[0].Message.Content;

            var requirementsResult = JsonSerializer.Deserialize<RequirementsResult>(requirementsContent);

            var output = new
            {
                status = "success",
                result = requirementsResult,
                metadata = new
                {
                    processingTimeSeconds = (int)(DateTime.UtcNow - startTime).TotalSeconds,
                    aiModel = "azure-openai-gpt-4",
                    confidence = 0.88
                }
            };

            Console.WriteLine(JsonSerializer.Serialize(output, new JsonSerializerOptions { WriteIndented = false }));

            return 0;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync(JsonSerializer.Serialize(new
            {
                status = "error",
                error = ex.Message,
                stackTrace = ex.StackTrace
            }));

            return 1;
        }
    }
}

public class WorkItemInput
{
    public string WorkItemId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<PreviousResult>? PreviousResults { get; set; }
}

public class PreviousResult
{
    public string Output { get; set; } = string.Empty;
}

public class RequirementsResult
{
    public List<FunctionalRequirement> FunctionalRequirements { get; set; } = new();
    public List<string> UserStories { get; set; } = new();
    public List<string> AcceptanceCriteria { get; set; } = new();
    public List<string> NonFunctionalRequirements { get; set; } = new();
    public List<string> TechnicalConstraints { get; set; } = new();
}

public class FunctionalRequirement
{
    public string Id { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

using Azure;
using Azure.AI.OpenAI;
using Azure.Identity;
using System.Text.Json;

namespace IdeaAnalyzer;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var startTime = DateTime.UtcNow;

        try
        {
            // 1. Read input from environment variable
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

            // 2. Initialize Azure OpenAI client
            var endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")
                ?? throw new InvalidOperationException("AZURE_OPENAI_ENDPOINT not set");
            var apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY")
                ?? throw new InvalidOperationException("AZURE_OPENAI_KEY not set");

            var client = new OpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));

            // 3. Build prompt for AI analysis
            var prompt = $@"
Analyze this feature request for a workflow management product:

Title: {input.Title}
Description: {input.Description}
Priority: {input.Priority}

Please provide:
1. **Summary** (1-2 sentences) - What is being requested
2. **Key Objectives** (list) - Main goals to achieve
3. **Similar Features** (list) - Any existing similar capabilities in the product
4. **Recommendations** (list) - Suggested implementation approach
5. **Estimated Complexity** (Low/Medium/High) - Technical complexity assessment
6. **Dependencies** (list) - Required infrastructure or systems

Return your analysis as JSON with this structure:
{{
  ""summary"": ""..."",
  ""objectives"": [""...""],
  ""similarFeatures"": [""...""],
  ""recommendations"": [""...""],
  ""estimatedComplexity"": ""Medium"",
  ""dependencies"": [""...""]
}}";

            // 4. Call Azure OpenAI
            var chatCompletionsOptions = new ChatCompletionsOptions
            {
                DeploymentName = "gpt-4", // or your deployment name
                Messages =
                {
                    new ChatRequestSystemMessage("You are an expert product analyst. Provide structured, actionable analysis of feature requests. Always return valid JSON."),
                    new ChatRequestUserMessage(prompt)
                },
                Temperature = 0.7f,
                MaxTokens = 1000,
                ResponseFormat = ChatCompletionsResponseFormat.JsonObject
            };

            var response = await client.GetChatCompletionsAsync(chatCompletionsOptions);
            var analysisContent = response.Value.Choices[0].Message.Content;

            // 5. Parse AI response - handle markdown code blocks
            var jsonContent = ExtractJsonFromResponse(analysisContent);
            var analysisResult = JsonSerializer.Deserialize<AnalysisResult>(jsonContent);

            if (analysisResult == null)
            {
                throw new InvalidOperationException("Failed to deserialize AI response");
            }

            // 6. Output to STDOUT (captured by Azure Container Instances)
            var output = new
            {
                status = "success",
                result = analysisResult,
                metadata = new
                {
                    processingTimeSeconds = (int)(DateTime.UtcNow - startTime).TotalSeconds,
                    aiModel = "azure-openai-gpt-4",
                    confidence = 0.85
                }
            };

            Console.WriteLine(JsonSerializer.Serialize(output, new JsonSerializerOptions { WriteIndented = false }));

            return 0; // Success exit code
        }
        catch (Exception ex)
        {
            // Log error to STDERR
            await Console.Error.WriteLineAsync(JsonSerializer.Serialize(new
            {
                status = "error",
                error = ex.Message,
                stackTrace = ex.StackTrace
            }));

            return 1; // Failure exit code
        }
    }

    private static string ExtractJsonFromResponse(string response)
    {
        // Remove markdown code blocks if present
        var trimmed = response.Trim();
        
        if (trimmed.StartsWith("```json"))
        {
            trimmed = trimmed.Substring(7); // Remove ```json
        }
        else if (trimmed.StartsWith("```"))
        {
            trimmed = trimmed.Substring(3); // Remove ```
        }
        
        if (trimmed.EndsWith("```"))
        {
            trimmed = trimmed.Substring(0, trimmed.Length - 3); // Remove trailing ```
        }
        
        return trimmed.Trim();
    }
}

public class WorkItemInput
{
    public string WorkItemId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public List<string> Tags { get; set; } = new();
}

public class AnalysisResult
{
    public string Summary { get; set; } = string.Empty;
    public List<string> Objectives { get; set; } = new();
    public List<string> SimilarFeatures { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public string EstimatedComplexity { get; set; } = "Medium";
    public List<string> Dependencies { get; set; } = new();
}

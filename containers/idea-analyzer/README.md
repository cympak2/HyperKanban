# Idea Analyzer Container

AI agent that analyzes business ideas for feasibility and complexity.

## Build & Run

```bash
# Build
dotnet build -c Release
dotnet publish -c Release

# Build Docker image
docker build -t idea-analyzer:v1.0 .

# Run locally
docker run --rm \
  -e WORK_ITEM_INPUT='{"workItemId":"test-001","title":"Add file export","description":"Users want to export boards as PDF"}' \
  -e AZURE_OPENAI_ENDPOINT="https://your-endpoint.openai.azure.com" \
  -e AZURE_OPENAI_KEY="your-api-key" \
  idea-analyzer:v1.0
```

## Environment Variables

- `WORK_ITEM_INPUT`: JSON input (required)
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint URL (required)
- `AZURE_OPENAI_KEY`: Azure OpenAI API key (required)

## Output

Success:
```json
{
  "status": "success",
  "result": {
    "summary": "Request to add PDF export capability...",   
    "objectives": ["Enable board export", "Support PDF format"],
    "similarFeatures": ["Image export (exists)"],
    "recommendations": ["Use server-side rendering", "Leverage existing export infrastructure"],
    "estimatedComplexity": "Medium",
    "dependencies": ["PDF generation library"]
  },
  "metadata": {
    "processingTimeSeconds": 18,
    "aiModel": "azure-openai-gpt-4",
    "confidence": 0.85
  }
}
```

Error:
```json
{
  "status": "error",
  "error": "AZURE_OPENAI_ENDPOINT not set"
}
```

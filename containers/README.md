# AI Agent Containers

Containerized AI agents for HyperKanban workflow automation.

## Container Interface Standard

All AI agent containers must follow the standardized JSON input/output interface:

### Input Format

Input is provided via environment variable `WORK_ITEM_INPUT` as JSON:

```json
{
  "workItemId": "WI-20260215-001",
  "title": "Add real-time collaboration to project boards",
  "description": "Multiple users should be able to edit boards simultaneously...",
  "priority": "High",
  "tags": ["collaboration", "enterprise"],
  "previousResults": [],
  "boardContext": {
    "boardName": "Kanban Upstream",
    "columnName": "Initial Analysis"
  }
}
```

### Output Format

Output must be written to **STDOUT** as JSON:

```json
{
  "status": "success",
  "result": {
    "summary": "Analysis result summary",
    "details": {}
  },
  "metadata": {
    "processingTimeSeconds": 22,
    "aiModel": "azure-openai-gpt-4",
    "confidence": 0.87
  }
}
```

### Exit Codes

- `0`: Success
- Non-zero: Failure (triggers error handling)

### Error Output

Errors should be written to **STDERR** as JSON:

```json
{
  "status": "error",
  "error": "Detailed error message",
  "stackTrace": "..."
}
```

## Available Containers

### 1. Idea Analyzer (`idea-analyzer`)

Analyzes business ideas for feasibility, complexity, and recommendations.

**Image**: `hyperkanban.azurecr.io/idea-analyzer:v1.0`  
**Purpose**: Initial analysis of feature requests  
**Timeout**: 300 seconds

### 2. Requirements Generator (`requirements-generator`)

Generates detailed requirements and user stories from analyzed ideas.

**Image**: `hyperkanban.azurecr.io/requirements-generator:v1.0`  
**Purpose**: Elaborate requirements  
**Timeout**: 300 seconds

### 3. Technical Breakdown (`technical-breakdown`)

Breaks requirements into technical tasks with estimates.

**Image**: `hyperkanban.azurecr.io/technical-breakdown:v1.0`  
**Purpose**: Create development tasks  
**Timeout**: 300 seconds

### 4. Prioritization Analyzer (`prioritization-analyzer`)

Scores and recommends prioritization based on value, effort, and risk.

**Image**: `hyperkanban.azurecr.io/prioritization-analyzer:v1.0`  
**Purpose**: Recommend priority  
**Timeout**: 180 seconds

## Building Containers

```bash
# Build container
cd containers/idea-analyzer
docker build -t idea-analyzer:v1.0 .

# Tag for Azure Container Registry
docker tag idea-analyzer:v1.0 hyperkanban.azurecr.io/idea-analyzer:v1.0

# Login to ACR
az acr login --name hyperkanban

# Push to ACR
docker push hyperkanban.azurecr.io/idea-analyzer:v1.0
```

## Security Best Practices

1. **Non-root user**: Containers run as non-root user
2. **Minimal base images**: Alpine Linux for smaller attack surface
3. **No secrets in images**: API keys passed via environment variables
4. **Vulnerability scanning**: Images scanned before deployment
5. **Network isolation**: Limited network access

## Local Testing

```bash
# Test container locally
docker run --rm \
  -e WORK_ITEM_INPUT='{"workItemId":"test","title":"Test idea","description":"Testing"}' \
  -e AZURE_OPENAI_ENDPOINT="https://your-endpoint.openai.azure.com" \
  -e AZURE_OPENAI_KEY="your-api-key" \
  idea-analyzer:v1.0
```

Expected output to STDOUT:
```json
{"status":"success","result":{...},"metadata":{...}}
```

# HyperKanban: AI Workflow Orchestration Platform

Transform Kanban boards into visual AI automation pipelines with mandatory human oversight at critical decision points.

## Architecture Overview

- **Frontend**: Next.js 16 with TypeScript, deployed to Azure Static Web Apps
- **Backend**: .NET 8 ASP.NET Core Web API, deployed to Azure App Service  
- **Database**: MySQL for persistent storage
- **Container Orchestration**: Azure Container Instances (MVP cold-start) → Azure Kubernetes Service (Phase 2 warm containers)
- **AI Agents**: Containerized agents (.NET 8) with standardized JSON I/O interface
- **Authentication**: Azure AD (Microsoft Entra ID) with OAuth 2.0 - optional in MVP

## Project Structure

```
HyperKanban/
├── docs/                          # Documentation
│   ├── info.md                    # Platform vision
│   ├── requirements.md            # Business requirements (MVP & Phase 2)
│   └── use-cases.md              # Detailed use case scenarios
├── src/
│   ├── backend/                   # .NET 10 API
│   │   └── HyperKanban.API/
│   └── frontend/                  # Next.js UI
│       └── hyperkanban-ui/
├── containers/                    # AI agent containers
│   ├── idea-analyzer/
│   ├── requirements-generator/
│   ├── technical-breakdown/
│   └── prioritization-analyzer/
├── infrastructure/                # Azure IaC
│   ├── bicep/                    # Bicep templates
│   └── scripts/                  # Deployment scripts
└── .github/
    └── workflows/                # CI/CD pipelines
```

## Quick Start

### Prerequisites

- **.NET 8 SDK**: https://dotnet.microsoft.com/download
- **Node.js 20+**: https://nodejs.org/
- **Docker Desktop**: https://www.docker.com/products/docker-desktop
- **Azure CLI** (for deployment): https://docs.microsoft.com/cli/azure/install-azure-cli

### Local Development Setup

#### 1. Run Backend API

```bash
cd src/backend/HyperKanban.API
dotnet restore
dotnet run
```

API will start on http://localhost:5000. On first run, it automatically creates the `hyperkanban` database tables.

#### 2. Run Frontend UI

```bash
cd src/frontend/hyperkanban-ui
npm install

# Create environment file
cp .env.local.example .env.local

npm run dev
```

Frontend will start on http://localhost:3000

#### 4. Create Demo Board and Work Item

```bash
# Create board
curl -X POST http://localhost:5000/api/boards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-board-001",
    "description": "Demo Kanban Upstream Board",
    "columns": [
      {
        "name": "Initial Analysis",
        "columnType": "AI",
        "containerConfig": {
          "imageName": "idea-analyzer",
          "imageTag": "v1.0",
          "registryUrl": "hyperkanban.azurecr.io",
          "timeoutSeconds": 300
        }
      },
      {
        "name": "Review Analysis",
        "columnType": "Human"
      },
      {
        "name": "Generate Requirements",
        "columnType": "AI",
        "containerConfig": {
          "imageName": "requirements-generator",
          "imageTag": "v1.0",
          "registryUrl": "hyperkanban.azurecr.io",
          "timeoutSeconds": 300
        }
      },
      {
        "name": "Approve Requirements",
        "columnType": "Human"
      },
      {
        "name": "Done",
        "columnType": "Human"
      }
    ]
  }'

# Activate the board
curl -X POST http://localhost:5000/api/boards/demo-board-001/activate

# Create a work item
curl -X POST http://localhost:5000/api/boards/demo-board-001/workitems \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add real-time collaboration",
    "description": "Users should be able to collaborate on boards in real-time with presence indicators",
    "priority": "High",
    "tags": ["feature", "collaboration"],
    "assignees": []
  }'
```

Now visit http://localhost:3000 to see the board with your work item!

#### 5. Build AI Agent Container (Example)

```bash
cd containers/idea-analyzer
dotnet publish -c Release -o ./bin/Release/net8.0/publish
docker build -t idea-analyzer:v1.0 .

# Test locally
docker run --rm \
  -e WORK_ITEM_INPUT='{"workItemId":"test-001","title":"Test idea","description":"Testing the analyzer"}' \
  -e AZURE_OPENAI_ENDPOINT="https://your-endpoint.openai.azure.com" \
  -e AZURE_OPENAI_KEY="your-api-key" \
  idea-analyzer:v1.0
```

## Azure Deployment

### Prerequisites Setup

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create resource group
az group create --name hyperkanban-rg --location eastus
```

### Infrastructure Deployment

```bash
cd infrastructure/bicep
az deployment group create \
  --resource-group hyperkanban-rg \
  --template-file main.bicep \
  --parameters environment=dev
```

### Application Deployment

Deployments are automated via GitHub Actions on push to `main` branch. See `.github/workflows/` for CI/CD configuration.

## Key Features (MVP)

✅ **Visual Workflow Boards**: Create Kanban boards with AI Agent and Human Action columns  
✅ **Automated AI Processing**: Containerized AI agents execute when work items enter AI columns  
✅ **Mandatory Human Checkpoints**: Every AI step followed by human review/approval  
✅ **Complete Audit Trail**: Immutable log of all AI processing and human decisions  
✅ **Role-Based Access Control**: Board Administrators, Human Reviewers, Work Item Submitters  
✅ **Flexible Schema**: MySQL JSON columns support evolving work item structures  

## Phase 2 Roadmap

- **Child Boards**: Hierarchical multi-stage workflows
- **Rows (Swimlanes)**: Workflow variations per work item type
- **Advanced Actions**: Retry, Override, Skip at checkpoints
- **Warm Containers**: Pre-started containers on AKS for <1s latency
- **External Integrations**: REST API, webhooks, Jira/ServiceNow/Slack connectors

## Documentation

- [Platform Vision](docs/info.md) - Complete feature set and capabilities
- [Requirements](docs/requirements.md) - MVP and Phase 2 requirements
- [Use Cases](docs/use-cases.md) - Detailed user interaction scenarios
- [API Documentation](src/backend/HyperKanban.API/README.md) - Backend API reference
- [Frontend Guide](src/frontend/hyperkanban-ui/README.md) - UI development guide
- [Container Development](containers/README.md) - AI agent container standards

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Follow coding standards (.editorconfig)
3. Write tests for new functionality
4. Run tests: `dotnet test` (backend) and `npm test` (frontend)
5. Submit pull request

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact: support@hyperkanban.com

# HyperKanban Backend API

.NET 10 ASP.NET Core Web API for HyperKanban AI workflow orchestration platform.

## Architecture

- **Framework**: .NET 8 ASP.NET Core
- **Database**: MySQL
- **Container Orchestration**: Azure Container Instances (MVP)
- **Authentication**: Azure AD (optional for MVP)
- **Logging**: Serilog with Application Insights

## Project Structure

```
HyperKanban.API/
├── Controllers/           # API endpoints
│   ├── BoardsController.cs
│   └── WorkItemsController.cs
├── Models/               # Domain models
│   ├── Board.cs
│   ├── WorkItem.cs
│   ├── ContainerConfigEntry.cs
│   └── Requests/
├── Repositories/         # Data access layer
│   ├── MySql/
│   │   ├── MySqlBoardRepository.cs
│   │   ├── MySqlWorkItemRepository.cs
│   │   └── MySqlContainerConfigRepository.cs
├── Services/             # Business logic
│   ├── BoardService.cs
│   ├── WorkItemService.cs
│   └── ContainerExecutionService.cs
├── Program.cs            # Application entry point
└── appsettings.json      # Configuration
```

## Local Development

### Prerequisites

- .NET 8 SDK
- MySQL 8.0+ (local install or Docker)

### Setup

1. **Start MySQL** (via Docker or local install):

```bash
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=hyperkanban \
  -p 3306:3306 mysql:8
```

2. **Configure connection string** in `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "MySQL": "Server=localhost;Database=hyperkanban;User=root;Password=yourpassword;"
  }
}
```

3. **Run the API**:

```bash
dotnet restore
dotnet run
```

API runs on `https://localhost:7001`

### Test Endpoints

```bash
# Health check
curl https://localhost:7001/swagger

# Create board
curl -X POST https://localhost:7001/api/boards \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Board","description":"My first board"}'

# Get all boards
curl https://localhost:7001/api/boards
```

## API Endpoints

### Boards

- `POST /api/boards` - Create board
- `GET /api/boards` - Get all boards
- `GET /api/boards/{id}` - Get board by ID
- `POST /api/boards/{id}/columns` - Add column
- `POST /api/boards/{id}/activate` - Activate board
- `POST /api/boards/{id}/deactivate` - Deactivate board
- `POST /api/boards/{id}/validate` - Validate configuration

### Work Items

- `POST /api/boards/{boardId}/workitems` - Create work item
- `GET /api/boards/{boardId}/workitems` - Get all work items for board
- `GET /api/boards/{boardId}/workitems?columnId={id}` - Get work items by column
- `GET /api/boards/{boardId}/workitems/{id}` - Get work item by ID
- `PATCH /api/boards/{boardId}/workitems/{id}/move` - Move work item
- `PATCH /api/boards/{boardId}/workitems/{id}/approve` - Approve at checkpoint
- `PATCH /api/boards/{boardId}/workitems/{id}/edit` - Edit and approve

## Deployment

### Azure App Service

```bash
dotnet publish -c Release -o ./publish
az webapp deployment source config-zip \
  --resource-group hyperkanban-rg \
  --name hyperkanban-api \
  --src ./publish.zip
```

### Environment Variables (Production)

Set in Azure App Service Configuration:

- `ConnectionStrings__MySQL`: MySQL connection string
- `Azure__SubscriptionId`: Azure subscription ID
- `Azure__ResourceGroup`: Resource group name
- `Azure__ContainerRegistry__Server`: ACR server URL
- `Azure__ContainerRegistry__Username`: ACR username
- `Azure__ContainerRegistry__Password`: ACR password (use Key Vault reference)
- `ApplicationInsights__ConnectionString`: Application Insights connection string

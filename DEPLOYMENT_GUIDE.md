# HyperKanban Deployment Configuration Guide

## Required Environment Variables

### Backend API (App Service Configuration)

Set these in Azure App Service Configuration or local `appsettings.json`:

```json
{
  // Database
  "ConnectionStrings:MySQL": "server=YOUR-MYSQL-HOST;port=3306;database=hyperkanban;user=YOUR-USER;password=YOUR-PASSWORD",
  
  // Azure Container Instances
  "Azure:SubscriptionId": "YOUR-AZURE-SUBSCRIPTION-ID",
  "Azure:ResourceGroup": "hyperkanban-rg",
  "Azure:Location": "eastus",
  
  // Azure Container Registry
  "Azure:ContainerRegistry:Server": "hyperkanban.azurecr.io",
  "Azure:ContainerRegistry:Username": "hyperkanban",
  "Azure:ContainerRegistry:Password": "YOUR-ACR-PASSWORD",
  
  // Application Insights
  "ApplicationInsights:ConnectionString": "InstrumentationKey=YOUR-KEY;IngestionEndpoint=https://eastus-1.in.applicationinsights.azure.com/",
  
  // CORS Origins (frontend URL)
  "Cors:AllowedOrigins:0": "https://your-frontend.azurestaticapps.net",
  "Cors:AllowedOrigins:1": "http://localhost:3000"
}
```

### Frontend (Static Web App Configuration)

Create `.env.local` from `.env.local.example`:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.azurewebsites.net
```

### AI Container Environment Variables

Containers need access to Azure OpenAI (set in App Service Configuration):

```json
{
  "AZURE_OPENAI_ENDPOINT": "https://your-openai.openai.azure.com",
  "AZURE_OPENAI_KEY": "your-openai-api-key",
  "AZURE_OPENAI_DEPLOYMENT_NAME": "gpt-4"
}
```

---

## Local Development Setup

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- MySQL 8.0+ (local install or Docker)

### Backend Setup

See [MYSQL_SETUP.md](MYSQL_SETUP.md) for detailed MySQL installation and configuration.

Quick start:
```bash
# Install MySQL (macOS)
brew install mysql
brew services start mysql

# Or use Docker
docker run --name hyperkanban-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=hyperkanban \
  -p 3306:3306 \
  -d mysql:8.0
```

Update [appsettings.Development.json](src/backend/HyperKanban.API/appsettings.Development.json):
```json
{
  "ConnectionStrings": {
    "MySQL": "server=localhost;port=3306;database=hyperkanban;user=root;password=password"
  },
  "Azure": {
    "SubscriptionId": "mock-subscription-id",
    "ResourceGroup": "local-dev",
    "Location": "local"
  }
}
```

#### Run Backend

Navigate to backend directory and run:
```bash
cd src/backend/HyperKanban.API
dotnet run
```

Backend will be available at `https://localhost:5000` (or port shown in console)

The database will be automatically initialized and seeded with container configurations on first run.

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd src/frontend/hyperkanban-ui
```

2. Create `.env.local`:
```bash
cp .env.local.example .env.local
```

3. Install dependencies:
```bash
npm install
```

4. Run frontend:
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

---

## Azure Deployment

### 1. Provision Azure Resources

```bash
# Login and set subscription
az login
az account set --subscription "YOUR-SUBSCRIPTION-ID"

# Create resource group
az group create --name hyperkanban-rg --location eastus

# Deploy infrastructure
cd infrastructure
az deployment group create \
  --resource-group hyperkanban-rg \
  --template-file main.bicep \
  --parameters environment=dev
```

### 2. Get Resource Connection Strings

After deployment, retrieve connection strings:

```bash
# Container Registry password
az acr credential show \
  --name hyperkanbanacr \
  --query "passwords[0].value" -o tsv

# Application Insights connection string
az monitor app-insights component show \
  --app hyperkanban-insights-dev \
  --resource-group hyperkanban-rg \
  --query "connectionString" -o tsv
```

### 3. Configure App Service

Set environment variables in Azure Portal or via CLI:

```bash
az webapp config appsettings set \
  --resource-group hyperkanban-rg \
  --name hyperkanban-api-dev \
  --settings \
    ConnectionStrings__MySQL="server=YOUR-MYSQL-HOST;port=3306;database=hyperkanban;user=YOUR-USER;password=YOUR-PASSWORD" \
    Azure__SubscriptionId="YOUR-SUBSCRIPTION-ID" \
    Azure__ResourceGroup="hyperkanban-rg" \
    Azure__Location="eastus" \
    Azure__ContainerRegistry__Server="hyperkanbanacr.azurecr.io" \
    Azure__ContainerRegistry__Username="hyperkanbanacr" \
    Azure__ContainerRegistry__Password="YOUR-ACR-PASSWORD" \
    ApplicationInsights__ConnectionString="YOUR-APPINSIGHTS-CONNECTION-STRING" \
    Cors__AllowedOrigins__0="https://YOUR-FRONTEND.azurestaticapps.net" \
    Cors__AllowedOrigins__1="http://localhost:3000" \
    AZURE_OPENAI_ENDPOINT="https://your-openai.openai.azure.com" \
    AZURE_OPENAI_KEY="your-api-key"
```

### 4. Build and Push Container Images

```bash
# Login to ACR
az acr login --name hyperkanbanacr

# Build idea-analyzer
cd containers/idea-analyzer
dotnet publish -c Release -o ./bin/Release/net8.0/publish
docker build -t hyperkanbanacr.azurecr.io/idea-analyzer:v1.0 .
docker push hyperkanbanacr.azurecr.io/idea-analyzer:v1.0

# Build requirements-generator
cd ../requirements-generator
dotnet publish -c Release -o ./bin/Release/net8.0/publish
docker build -t hyperkanbanacr.azurecr.io/requirements-generator:v1.0 .
docker push hyperkanbanacr.azurecr.io/requirements-generator:v1.0
```

### 5. Configure GitHub Secrets

Add these secrets to your GitHub repository for CI/CD:

- `AZURE_WEBAPP_PUBLISH_PROFILE`: Download from Azure Portal (App Service > Get publish profile)
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: From Static Web App deployment token
- `ACR_USERNAME`: Container registry username
- `ACR_PASSWORD`: Container registry password

### 6. Deploy via GitHub Actions

Push to main branch to trigger deployments:

```bash
git push origin main
```

Workflows will:
1. Build and deploy backend to App Service
2. Build and deploy frontend to Static Web App
3. Build and push container images to ACR

---

## Verification

### Test Backend API

```bash
curl https://hyperkanban-api-dev.azurewebsites.net/api/boards
```

### Test Frontend

Open `https://YOUR-FRONTEND.azurestaticapps.net` in browser

### Test Container Configs

```bash
curl https://hyperkanban-api-dev.azurewebsites.net/api/v1/containerconfigs
```

Should return seeded container configurations (idea-analyzer, requirements-generator)

---

## Troubleshooting

### Backend Fails to Start

1. Check Application Insights logs in Azure Portal
2. Verify MySQL connection string
3. Ensure MySQL server is accessible from App Service

### Container Execution Fails

1. Verify ACR credentials in App Service configuration
2. Check container images exist in registry: `az acr repository list --name hyperkanbanacr`
3. Verify Azure subscription ID and resource group name
4. Check App Service has Managed Identity with ACI permissions

### Frontend Cannot Connect to Backend

1. Verify NEXT_PUBLIC_API_URL in Static Web App configuration
2. Check CORS settings in backend (allowed origins)
3. Ensure backend is running and accessible

### Container Logs Not Retrieved

1. Verify Managed Identity has permissions on resource group
2. Check Azure subscription ID is correct
3. Ensure container groups are in same resource group as App Service

---

## Cost Optimization

### Development Environment
- Scale down App Service to B1 or F1 (free tier) for testing
- Delete container instances when not in use (they're created/deleted per work item)

### Production Environment
- Use autoscaling for App Service
- Monitor Application Insights for usage patterns

---

## Security Checklist

- [ ] App Service Managed Identity enabled
- [ ] ACR credentials stored as secrets (not in code)
- [ ] Azure OpenAI keys rotated regularly
- [ ] CORS configured with specific origins (not *)
- [ ] HTTPS enforced on all endpoints
- [ ] Container images scanned for vulnerabilities
- [ ] Application Insights data retention configured

---

## Next Steps

After successful deployment:

1. **Create Your First Board**: Use the UI to create a board with AI and Human columns
2. **Test AI Workflow**: Submit a work item and watch it flow through AI processing
3. **Monitor Performance**: Check Application Insights for latency and errors
4. **Scale Testing**: Create multiple boards and work items to test concurrency
5. **Enable Authentication**: Uncomment [Authorize] attributes and configure Azure AD

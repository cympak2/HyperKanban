# HyperKanban Azure Infrastructure

Bicep templates for provisioning Azure resources.

## Resources Created

- **Azure App Service Plan** (Standard S1) - hyperkanban-plan
- **Azure Web App** (.NET 8 backend) - hyperkanban-api
- **Azure Static Web App** (Next.js frontend) - hyperkanban-ui
- **Azure Container Registry** - hyperkanban-acr
- **Application Insights** - hyperkanban-insights

## Deployment

### Prerequisites

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "Your Subscription Name"

# Create resource group
az group create --name hyperkanban-rg --location eastus
```

### Deploy Infrastructure

```bash
# Navigate to infrastructure directory
cd infrastructure

# Deploy all resources
az deployment group create \
  --resource-group hyperkanban-rg \
  --template-file main.bicep \
  --parameters environment=dev
```

### Deploy Backend API

```bash
# Build and publish backend
cd src/backend/HyperKanban.API
dotnet publish -c Release -o ./publish

# Create ZIP for deployment
cd publish
zip -r ../deploy.zip .

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group hyperkanban-rg \
  --name hyperkanban-api \
  --src ../deploy.zip
```

### Deploy Frontend

```bash
# Build frontend
cd src/frontend/hyperkanban-ui
npm run build

# Deploy to Static Web App (via GitHub Actions or SWA CLI)
swa deploy --app-location . --output-location .next
```

### Build and Push Container Images

```bash
# Login to ACR
az acr login --name hyperkanbanacr

# Build and push idea-analyzer
cd containers/idea-analyzer
docker build -t hyperkanbanacr.azurecr.io/idea-analyzer:v1.0 .
docker push hyperkanbanacr.azurecr.io/idea-analyzer:v1.0

# Repeat for other containers...
```

## Configuration

After deployment, update these settings:

1. **Backend App Service** (`hyperkanban-api`):
   - Add Application Settings:
     - `ConnectionStrings__MySQL`: MySQL connection string
     - `Azure__SubscriptionId`: Your subscription ID
     - `Azure__ContainerRegistry__LoginServer`: hyperkanbanacr.azurecr.io

2. **Frontend Static Web App** (`hyperkanban-ui`):
   - Add Application Settings:
     - `NEXT_PUBLIC_API_URL`: https://hyperkanban-api.azurewebsites.net

## Costs

Estimated monthly costs (East US, Standard tier):

- App Service (S1): ~$73/month
- Static Web App (Standard): ~$9/month
- Container Registry (Basic): ~$5/month
- Application Insights: ~$2/month (low volume)

**Total**: ~$89/month

## Monitoring

```bash
# View logs
az monitor app-insights query \
  --app hyperkanban-insights \
  --analytics-query "traces | take 100"

# Check App Service logs
az webapp log tail --name hyperkanban-api --resource-group hyperkanban-rg
```

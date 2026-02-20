@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param baseName string = 'hyperkanban'

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${baseName}-insights-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
  }
}

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: '${baseName}acr${environment}'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${baseName}-plan-${environment}'
  location: location
  sku: {
    name: 'S1'
    tier: 'Standard'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Backend Web App
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: '${baseName}-api-${environment}'
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      alwaysOn: true
      cors: {
        allowedOrigins: [
          'https://${staticWebApp.properties.defaultHostname}'
          'http://localhost:3000'
        ]
        supportCredentials: false
      }
      appSettings: [
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'Azure__SubscriptionId'
          value: subscription().subscriptionId
        }
        {
          name: 'Azure__ResourceGroup'
          value: resourceGroup().name
        }
        {
          name: 'Azure__ContainerRegistry__LoginServer'
          value: containerRegistry.properties.loginServer
        }
        {
          name: 'Azure__ContainerRegistry__Username'
          value: containerRegistry.name
        }
      ]
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Static Web App (Frontend)
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: '${baseName}-ui-${environment}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/your-org/hyperkanban' // Update with your repo
    branch: 'main'
    buildProperties: {
      appLocation: 'src/frontend/hyperkanban-ui'
      apiLocation: ''
      outputLocation: '.next'
    }
  }
}

// Grant Web App access to Container Registry
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(webApp.id, containerRegistry.id, 'AcrPull')
  scope: containerRegistry
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull role
  }
}

// Outputs
output apiUrl string = 'https://${webApp.properties.defaultHostName}'
output frontendUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output containerRegistryUrl string = containerRegistry.properties.loginServer
output appInsightsConnectionString string = appInsights.properties.ConnectionString

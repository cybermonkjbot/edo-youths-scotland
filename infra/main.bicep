targetScope = 'subscription'

@minLength(1)
@maxLength(40)
@description('Environment name used for resource naming, for example dev or prod.')
param environmentName string = 'prod'

@description('Azure region for the Static Web App.')
param location string = 'westeurope'

@description('Optional GitHub repository URL connected to the Static Web App.')
param repositoryUrl string = ''

@description('GitHub branch deployed by the Static Web App.')
param branch string = 'main'

@description('Azure Static Web Apps SKU. Free is enough for a very small public site.')
param skuName string = 'Free'

var resourceToken = toLower(uniqueString(subscription().id, environmentName, 'eys'))
var tags = {
  'azd-env-name': environmentName
  app: 'edo-youths-scotland'
}

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-eys-${environmentName}'
  location: location
  tags: tags
}

resource staticSite 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'stapp-eys-${resourceToken}'
  scope: rg
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuName
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    buildProperties: {
      appLocation: '/'
      apiLocation: ''
      outputLocation: ''
    }
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output STATIC_WEB_APP_NAME string = staticSite.name
output STATIC_WEB_APP_HOSTNAME string = staticSite.properties.defaultHostname

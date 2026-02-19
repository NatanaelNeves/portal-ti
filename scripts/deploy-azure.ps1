# ================================================
# Script de Deploy para Azure - Portal TI
# ================================================
# Execute: .\scripts\deploy-azure.ps1
# ================================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  PORTAL TI - Deploy Azure (Nonprofit)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Azure CLI esta instalado
Write-Host "[1/6] Verificando Azure CLI..." -ForegroundColor Yellow
try {
    $azVersion = az --version 2>&1 | Select-String "azure-cli" | Select-Object -First 1
    if ($azVersion) {
        Write-Host "[OK] Azure CLI instalado" -ForegroundColor Green
    } else {
        throw
    }
} catch {
    Write-Host "[ERRO] Azure CLI nao encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale com:" -ForegroundColor Yellow
    Write-Host "  winget install Microsoft.AzureCLI" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Login no Azure
Write-Host ""
Write-Host "[2/6] Fazendo login no Azure..." -ForegroundColor Yellow
Write-Host "Uma janela do navegador sera aberta..." -ForegroundColor Gray

az login --use-device-code

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Login falhou" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Login realizado" -ForegroundColor Green

# Selecionar subscription
Write-Host ""
Write-Host "[3/6] Listando subscriptions..." -ForegroundColor Yellow
az account list --output table

Write-Host ""
$subscriptionId = Read-Host "Digite o ID da subscription (ou Enter para usar a padrao)"

if ($subscriptionId -ne "") {
    az account set --subscription $subscriptionId
    Write-Host "[OK] Subscription selecionada" -ForegroundColor Green
}

# Configurar variaveis
Write-Host ""
Write-Host "[4/6] Configuracao..." -ForegroundColor Yellow

$resourceGroup = Read-Host "Nome do Resource Group (Enter = rg-portal-ti)"
if ($resourceGroup -eq "") { $resourceGroup = "rg-portal-ti" }

$location = Read-Host "Localizacao (Enter = brazilsouth)"
if ($location -eq "") { $location = "brazilsouth" }

$backendName = Read-Host "Nome do Backend App (Enter = portal-ti-backend)"
if ($backendName -eq "") { $backendName = "portal-ti-backend" }

$frontendName = Read-Host "Nome do Frontend App (Enter = portal-ti-frontend)"
if ($frontendName -eq "") { $frontendName = "portal-ti-frontend" }

$dbServerName = Read-Host "Nome do Servidor PostgreSQL (Enter = portal-ti-db)"
if ($dbServerName -eq "") { $dbServerName = "portal-ti-db" }

$dbAdminUser = Read-Host "Usuario admin do banco (Enter = portaladmin)"
if ($dbAdminUser -eq "") { $dbAdminUser = "portaladmin" }

$securePassword = Read-Host "Senha do banco (minimo 8 caracteres)" -AsSecureString
$dbAdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
)

# Criar Resource Group
Write-Host ""
Write-Host "[5/6] Criando recursos no Azure..." -ForegroundColor Yellow
Write-Host "  Resource Group: $resourceGroup" -ForegroundColor Gray

az group create --name $resourceGroup --location $location | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Resource Group criado" -ForegroundColor Green
}

# Criar PostgreSQL Server
Write-Host "  PostgreSQL Server: $dbServerName" -ForegroundColor Gray

az postgres flexible-server create `
    --resource-group $resourceGroup `
    --name $dbServerName `
    --location $location `
    --admin-user $dbAdminUser `
    --admin-password $dbAdminPassword `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --version 15 `
    --storage-size 32 `
    --public-access 0.0.0.0 `
    --backup-retention 7 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] PostgreSQL Server criado" -ForegroundColor Green
}

# Criar banco de dados
Write-Host "  Banco de dados: portal_ti" -ForegroundColor Gray

az postgres flexible-server db create `
    --resource-group $resourceGroup `
    --server-name $dbServerName `
    --database-name portal_ti | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Banco de dados criado" -ForegroundColor Green
}

# Criar App Service Plan
Write-Host "  App Service Plan" -ForegroundColor Gray

az appservice plan create `
    --name "plan-$backendName" `
    --resource-group $resourceGroup `
    --location $location `
    --sku F1 `
    --is-linux | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] App Service Plan criado" -ForegroundColor Green
}

# Criar App Service (Backend)
Write-Host "  App Service (Backend): $backendName" -ForegroundColor Gray

az webapp create `
    --name $backendName `
    --resource-group $resourceGroup `
    --plan "plan-$backendName" `
    --runtime "NODE:18-lts" | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] App Service criado" -ForegroundColor Green
    Write-Host "     URL: https://$backendName.azurewebsites.net" -ForegroundColor Cyan
}

# Gerar JWT Secrets
Write-Host ""
Write-Host "  Gerando JWT Secrets..." -ForegroundColor Gray
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$jwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Configurar variaveis de ambiente do App Service
Write-Host "  Configurando variaveis de ambiente..." -ForegroundColor Gray

$dbHost = "$dbServerName.postgres.database.azure.com"

az webapp config appsettings set `
    --name $backendName `
    --resource-group $resourceGroup `
    --settings `
        NODE_ENV=production `
        PORT=8080 `
        DB_HOST=$dbHost `
        DB_PORT=5432 `
        DB_USER=$dbAdminUser `
        DB_PASSWORD=$dbAdminPassword `
        DB_NAME=portal_ti `
        DB_SSL=true `
        JWT_SECRET=$jwtSecret `
        JWT_REFRESH_SECRET=$jwtRefreshSecret `
        JWT_EXPIRES_IN=15m `
        JWT_REFRESH_EXPIRES_IN=7d `
        CORS_ORIGIN="https://$frontendName.azurestaticapps.net" | Out-Null

Write-Host "[OK] Variaveis configuradas" -ForegroundColor Green

# Deploy do Backend
Write-Host ""
Write-Host "[6/6] Fazendo deploy do backend..." -ForegroundColor Yellow

cd backend
Write-Host "  Instalando dependencias..." -ForegroundColor Gray
npm install --silent

Write-Host "  Compilando..." -ForegroundColor Gray
npm run build

Write-Host "  Criando pacote..." -ForegroundColor Gray
if (Test-Path "deploy.zip") { Remove-Item "deploy.zip" }
Compress-Archive -Path * -DestinationPath deploy.zip -Force

Write-Host "  Enviando para Azure..." -ForegroundColor Gray
az webapp deployment source config-zip `
    --resource-group $resourceGroup `
    --name $backendName `
    --src deploy.zip | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backend deployed" -ForegroundColor Green
}

cd ..

# Resumo
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  DEPLOY CONCLUIDO!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "RECURSOS CRIADOS:" -ForegroundColor Yellow
Write-Host "  Resource Group: $resourceGroup" -ForegroundColor White
Write-Host "  Backend: https://$backendName.azurewebsites.net" -ForegroundColor White
Write-Host "  Banco: $dbHost" -ForegroundColor White
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Executar migrations:" -ForegroundColor White
Write-Host "   az webapp ssh --resource-group $resourceGroup --name $backendName" -ForegroundColor Gray
Write-Host "   cd site/wwwroot && npm run migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Criar Static Web App para o Frontend:" -ForegroundColor White
Write-Host "   Portal Azure -> Criar Recurso -> Static Web App" -ForegroundColor Gray
Write-Host "   Conectar ao GitHub: portal-ti" -ForegroundColor Gray
Write-Host "   App location: /frontend" -ForegroundColor Gray
Write-Host "   Output location: dist" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configurar GitHub Secrets:" -ForegroundColor White
Write-Host "   AZURE_BACKEND_APP_NAME = $backendName" -ForegroundColor Gray
Write-Host "   AZURE_BACKEND_PUBLISH_PROFILE = (baixar do portal)" -ForegroundColor Gray
Write-Host "   VITE_API_URL = https://$backendName.azurewebsites.net" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Push para GitHub para deploy automatico" -ForegroundColor White
Write-Host ""
Write-Host "Documentacao: DEPLOY_AZURE_GRATIS.md" -ForegroundColor Cyan
Write-Host ""

# ================================================
# GUIA RAPIDO - Deploy Azure Automatico
# ================================================

## PASSO 1: Login no Azure

Execute no PowerShell:

```powershell
az login
```

Uma janela do navegador vai abrir. Faca login com sua conta Microsoft Nonprofit.

---

## PASSO 2: Verificar Subscription

```powershell
# Listar subscriptions
az account list --output table

# Se tiver mais de uma, selecione a correta:
az account set --subscription "NOME-OU-ID-DA-SUBSCRIPTION"
```

---

## PASSO 3: Criar Recursos

Copie e execute este bloco completo:

```powershell
# Variaveis (ajuste se quiser nomes diferentes)
$resourceGroup = "rg-portal-ti"
$location = "brazilsouth"
$backendName = "portal-ti-backend-$(Get-Random -Maximum 9999)"
$dbServerName = "portal-ti-db-$(Get-Random -Maximum 9999)"
$dbAdminUser = "portaladmin"
$dbAdminPassword = "Portal@TI2026!"  # MUDE ISSO!

Write-Host "Criando Resource Group..." -ForegroundColor Yellow
az group create --name $resourceGroup --location $location

Write-Host "Criando PostgreSQL (pode demorar 5 min)..." -ForegroundColor Yellow
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
    --public-access All `
    --yes

Write-Host "Criando banco portal_ti..." -ForegroundColor Yellow
az postgres flexible-server db create `
    --resource-group $resourceGroup `
    --server-name $dbServerName `
    --database-name portal_ti

Write-Host "Criando App Service..." -ForegroundColor Yellow
az appservice plan create `
    --name "plan-$backendName" `
    --resource-group $resourceGroup `
    --location $location `
    --sku F1 `
    --is-linux

az webapp create `
    --name $backendName `
    --resource-group $resourceGroup `
    --plan "plan-$backendName" `
    --runtime "NODE:18-lts"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "RECURSOS CRIADOS COM SUCESSO!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL: https://$backendName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Banco: $dbServerName.postgres.database.azure.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "ANOTE ESSES VALORES!" -ForegroundColor Yellow
```

---

## PASSO 4: Configurar Variaveis de Ambiente

```powershell
# Gerar JWT Secrets
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$jwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host "JWT_SECRET: $jwtSecret" -ForegroundColor Green
Write-Host "JWT_REFRESH_SECRET: $jwtRefreshSecret" -ForegroundColor Green

# Configurar App Service
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
        CORS_ORIGIN="*"

Write-Host "Variaveis configuradas!" -ForegroundColor Green
```

---

## PASSO 5: Deploy do Backend

```powershell
cd backend

# Instalar e buildar
npm install
npm run build

# Criar pacote
Compress-Archive -Path * -DestinationPath deploy.zip -Force

# Upload para Azure
az webapp deployment source config-zip `
    --resource-group $resourceGroup `
    --name $backendName `
    --src deploy.zip

Write-Host "Backend deployed!" -ForegroundColor Green
Write-Host "Aguarde 2 minutos para o servico iniciar..." -ForegroundColor Yellow

cd ..
```

---

## PASSO 6: Executar Migrations

Opcao A - Via browser:
1. Acesse: https://$backendName.scm.azurewebsites.net
2. Debug Console -> CMD
3. cd site\wwwroot
4. npm run migrate

Opcao B - Via SSH:
```powershell
az webapp ssh --resource-group $resourceGroup --name $backendName
cd site/wwwroot
npm run migrate
exit
```

---

## PASSO 7: Criar Static Web App (Frontend)

1. Acesse: https://portal.azure.com
2. Criar Recurso -> Static Web App
3. Configuracao:
   - Resource Group: rg-portal-ti
   - Nome: portal-ti-frontend
   - Plan: Free
   - Region: Brazil South
   - Source: GitHub
   - Organization: sua-conta
   - Repository: portal-ti
   - Branch: main
   - Build Presets: Custom
   - App location: /frontend
   - Output location: dist

4. Criar

5. Apos criado:
   - Ir em Configuracao
   - Adicionar variavel:
     VITE_API_URL = https://$backendName.azurewebsites.net

---

## PRONTO! ✅

Seu sistema esta no ar:
- Backend: https://$backendName.azurewebsites.net
- Frontend: https://portal-ti-frontend.azurestaticapps.net

Custo: $0 (com creditos nonprofit) 🎉

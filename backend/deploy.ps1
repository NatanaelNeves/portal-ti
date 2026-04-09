# Script de Deploy do Backend para Azure
# Uso: .\deploy.ps1

Write-Host "`n🚀 Iniciando Deploy do Backend para Azure...`n" -ForegroundColor Cyan

$backendDir = $PSScriptRoot
$projectRoot = Split-Path $backendDir -Parent

# Verificar se está no diretório correto
if (-not (Test-Path "$backendDir\package.json")) {
    Write-Host "❌ Execute este script na pasta backend" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "📦 1. Build do projeto..." -ForegroundColor Yellow
Set-Location $backendDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build falhou!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build concluído`n" -ForegroundColor Green

# Criar pasta de deploy temporária
Write-Host "📁 2. Preparando arquivos de deploy..." -ForegroundColor Yellow
$deployTemp = "$backendDir\deploy-temp"
if (Test-Path $deployTemp) {
    Remove-Item $deployTemp -Recurse -Force
}
New-Item -ItemType Directory -Path $deployTemp -Force | Out-Null

# Copiar arquivos necessários
Copy-Item "$backendDir\dist" -Destination "$deployTemp\dist" -Recurse -Force
Copy-Item "$backendDir\node_modules" -Destination "$deployTemp\node_modules" -Recurse -Force
Copy-Item "$backendDir\package.json" -Destination "$deployTemp\package.json" -Force
Copy-Item "$backendDir\startup.sh" -Destination "$deployTemp\startup.sh" -Force
Copy-Item "$backendDir\web.config" -Destination "$deployTemp\web.config" -Force
Copy-Item "$backendDir\.deployment" -Destination "$deployTemp\.deployment" -Force
Copy-Item "$backendDir\.deployignore" -Destination "$deployTemp\.deployignore" -Force

Write-Host "✅ Arquivos preparados`n" -ForegroundColor Green

# Criar ZIP
Write-Host "📦 3. Criando pacote de deploy..." -ForegroundColor Yellow
$zipPath = "$backendDir\backend-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Compress-Archive -Path "$deployTemp\*" -DestinationPath $zipPath -Force
Write-Host "✅ Pacote criado: $zipPath`n" -ForegroundColor Green

# Limpar pasta temporária
Remove-Item $deployTemp -Recurse -Force

# Instruções de deploy
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 DEPLOY NO AZURE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opção 1: Via Azure Portal (Recomendado)" -ForegroundColor Yellow
Write-Host "  1. Acesse: https://portal.azure.com" -ForegroundColor Gray
Write-Host "  2. Vá para: portal-ti-backend → Deployment Center" -ForegroundColor Gray
Write-Host "  3. Faça upload do arquivo:" -ForegroundColor Gray
Write-Host "     $zipPath" -ForegroundColor White
Write-Host ""
Write-Host "Opção 2: Via Azure CLI" -ForegroundColor Yellow
Write-Host "  Execute:" -ForegroundColor Gray
Write-Host "  az webapp deployment source config-zip ``" -ForegroundColor White
Write-Host "    --resource-group rg-portal-ti ``" -ForegroundColor White
Write-Host "    --name portal-ti-backend ``" -ForegroundColor White
Write-Host "    --src `"$zipPath`"" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Perguntar se quer fazer deploy agora
$deploy = Read-Host "Fazer deploy agora? (s/n)"
if ($deploy -eq 's' -or $deploy -eq 'S') {
    Write-Host "`n🚀 Fazendo deploy..." -ForegroundColor Yellow
    
    # Tentar via Azure CLI
    try {
        az webapp deployment source config-zip `
            --resource-group rg-portal-ti `
            --name portal-ti-backend `
            --src $zipPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
            Write-Host "🌐 Acesse: https://portal-ti-backend.azurewebsites.net/api/health" -ForegroundColor Cyan
        } else {
            Write-Host "`n❌ Deploy falhou. Tente via Azure Portal." -ForegroundColor Red
        }
    } catch {
        Write-Host "`n❌ Azure CLI não encontrado. Faça deploy via Azure Portal." -ForegroundColor Red
    }
} else {
    Write-Host "`n💡 Para fazer deploy depois, use as instruções acima." -ForegroundColor Cyan
}

Write-Host ""

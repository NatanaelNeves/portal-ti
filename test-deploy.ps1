# Script para testar o deploy do Portal TI no Azure
# Execute: .\test-deploy.ps1

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔍 TESTANDO DEPLOY DO PORTAL TI" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Testar Frontend
Write-Host "📱 Testando Frontend..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "https://green-ocean-096bd050f.2.azurestaticapps.net" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   ✅ Frontend ONLINE - Status: $($frontendResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   URL: https://green-ocean-096bd050f.2.azurestaticapps.net`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Frontend com problemas: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Testar Backend
Write-Host "🖥️  Testando Backend..." -ForegroundColor Yellow
try {
    $backendResponse = Invoke-WebRequest -Uri "https://portal-ti-backend.azurewebsites.net" -TimeoutSec 15 -ErrorAction Stop
    Write-Host "   ✅ Backend ONLINE - Status: $($backendResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   URL: https://portal-ti-backend.azurewebsites.net`n" -ForegroundColor White
} catch {
    Write-Host "   ⚠️  Backend ainda não respondeu" -ForegroundColor Yellow
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "   💡 Se o deploy acabou de ser feito, aguarde mais alguns minutos`n" -ForegroundColor Gray
}

# Testar Banco de Dados (conexão via backend)
Write-Host "🗄️  Testando conexão com Banco de Dados..." -ForegroundColor Yellow
try {
    $dbTestResponse = Invoke-WebRequest -Uri "https://portal-ti-backend.azurewebsites.net/health" -TimeoutSec 15 -ErrorAction Stop
    Write-Host "   ✅ Banco de dados acessível!`n" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Endpoint /health não respondeu" -ForegroundColor Yellow
    Write-Host "   (Backend pode estar ainda inicializando)`n" -ForegroundColor Gray
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📊 RESUMO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "🔗 Links úteis:" -ForegroundColor White
Write-Host "   • Frontend: https://green-ocean-096bd050f.2.azurestaticapps.net" -ForegroundColor Gray
Write-Host "   • Backend: https://portal-ti-backend.azurewebsites.net" -ForegroundColor Gray
Write-Host "   • GitHub Actions: https://github.com/NatanaelNeves/portal-ti/actions" -ForegroundColor Gray
Write-Host "   • Azure Portal: https://portal.azure.com`n" -ForegroundColor Gray

Write-Host "💡 Para ver logs do backend:" -ForegroundColor White
Write-Host "   az webapp log tail --name portal-ti-backend --resource-group rg-portal-ti`n" -ForegroundColor Gray

Write-Host "`nPressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

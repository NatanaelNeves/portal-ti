# ===================================================
# GUIA DE CONFIGURACAO RAPIDA - PORTAL TI
# ===================================================
# Siga os passos abaixo para configurar o sistema
# ===================================================

## PASSO 1: Copiar arquivos de ambiente
## ======================================

# Backend
Copy-Item backend\.env.example backend\.env

# Frontend  
Copy-Item frontend\.env.example frontend\.env

Write-Host "[OK] Arquivos .env criados" -ForegroundColor Green


## PASSO 2: Gerar JWT Secrets
## ======================================

Write-Host ""
Write-Host "Gerando JWT Secrets..." -ForegroundColor Yellow
$secret1 = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$secret2 = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host ""
Write-Host "JWT_SECRET gerado:" -ForegroundColor Cyan
Write-Host $secret1 -ForegroundColor Green
Write-Host ""
Write-Host "JWT_REFRESH_SECRET gerado:" -ForegroundColor Cyan
Write-Host $secret2 -ForegroundColor Green
Write-Host ""
Write-Host "COPIE esses valores e adicione no arquivo backend\.env" -ForegroundColor Yellow
Write-Host ""


## PASSO 3: Instalar dependencias Backend
## ======================================

Write-Host "Instalando dependencias do backend..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backend instalado" -ForegroundColor Green
}
Set-Location ..


## PASSO 4: Instalar dependencias Frontend
## ======================================

Write-Host ""
Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Frontend instalado" -ForegroundColor Green
}
Set-Location ..


## PASSO 5: Compilar Backend
## ======================================

Write-Host ""
Write-Host "Compilando TypeScript..." -ForegroundColor Yellow
Set-Location backend
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backend compilado" -ForegroundColor Green
}
Set-Location ..


## FINALIZADO
## ======================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP CONCLUIDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Edite o arquivo backend\.env com:" -ForegroundColor White
Write-Host "   - JWT_SECRET e JWT_REFRESH_SECRET (gerados acima)" -ForegroundColor Gray
Write-Host "   - DB_PASSWORD (senha do PostgreSQL)" -ForegroundColor Gray
Write-Host "   - SMTP_USER e SMTP_PASSWORD (seu email)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure o PostgreSQL:" -ForegroundColor White
Write-Host "   createdb portal_ti" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Execute as migrations:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Inicie o sistema:" -ForegroundColor White
Write-Host "   Terminal 1: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "   Terminal 2: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Abra no navegador:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""

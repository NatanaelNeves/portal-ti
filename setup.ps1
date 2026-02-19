# ==============================================
# Script de Setup Inicial - Portal TI
# ==============================================
# Execute: .\setup.ps1
# ==============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PORTAL TI - Setup Inicial" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Node.js está instalado
Write-Host "[1/8] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion instalado" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Node.js nao encontrado. Instale em: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Verificar se Docker está instalado (opcional)
Write-Host ""
Write-Host "[2/8] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "[OK] Docker instalado: $dockerVersion" -ForegroundColor Green
    $hasDocker = $true
} catch {
    Write-Host "[AVISO] Docker nao encontrado (opcional para desenvolvimento)" -ForegroundColor Yellow
    $hasDocker = $false
}

# Criar arquivos .env
Write-Host ""
Write-Host "[3/8] Configurando arquivos de ambiente..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[OK] Criado: backend\.env" -ForegroundColor Green
} else {
    Write-Host "[AVISO] backend\.env ja existe (mantido)" -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "[OK] Criado: frontend\.env" -ForegroundColor Green
} else {
    Write-Host "[AVISO] frontend\.env ja existe (mantido)" -ForegroundColor Yellow
}

# Instalar dependências do backend
Write-Host ""
Write-Host "[4/8] Instalando dependências do backend..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Dependencias do backend instaladas" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Erro ao instalar dependencias do backend" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Instalar dependências do frontend
Write-Host ""
Write-Host "[5/8] Instalando dependências do frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Dependencias do frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Erro ao instalar dependencias do frontend" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Criar diretórios de upload
Write-Host ""
Write-Host "[6/8] Criando diretórios de upload..." -ForegroundColor Yellow
$uploadDirs = @(
    "backend\uploads\equipment-photos",
    "backend\uploads\documents",
    "backend\uploads\terms",
    "backend\uploads\ticket-attachments"
)

foreach ($dir in $uploadDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "[OK] Criado: $dir" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] $dir ja existe" -ForegroundColor Yellow
    }
}

# Compilar backend
Write-Host ""
Write-Host "[7/8] Compilando TypeScript do backend..." -ForegroundColor Yellow
Set-Location backend
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backend compilado com sucesso" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Erro ao compilar backend" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Instruções finais
Write-Host ""
Write-Host "[8/8] Instruções finais" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP CONCLUÍDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure o PostgreSQL:" -ForegroundColor White
Write-Host "   - Instale PostgreSQL 12+ ou use Docker" -ForegroundColor Gray
Write-Host "   - Crie o banco: createdb portal_ti" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure variáveis de ambiente:" -ForegroundColor White
Write-Host "   - Edite: backend\.env" -ForegroundColor Gray
Write-Host "   - Altere: DB_PASSWORD, JWT_SECRET, SMTP_*" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Execute as migrations:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Inicie o sistema:" -ForegroundColor White
Write-Host ""
Write-Host "   OPÇÃO A - Desenvolvimento:" -ForegroundColor Cyan
Write-Host "   Terminal 1: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "   Terminal 2: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
if ($hasDocker) {
    Write-Host "   OPÇÃO B - Docker:" -ForegroundColor Cyan
    Write-Host "   docker-compose up -d" -ForegroundColor Gray
    Write-Host ""
}
Write-Host "5. Acesse o sistema:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentacao util:" -ForegroundColor Yellow
Write-Host "   - QUICKSTART.md - Guia rapido" -ForegroundColor Gray
Write-Host "   - DEPLOY_CHECKLIST.md - Checklist de deploy" -ForegroundColor Gray
Write-Host "   - TESTING_GUIDE.md - Como testar" -ForegroundColor Gray
Write-Host ""

# ====================================================
# Script de Deploy - Portal TI
# ====================================================
# Use: .\scripts\deploy.ps1
# ====================================================

param(
    [string]$serverIP = "",
    [string]$serverUser = "root",
    [string]$deployPath = "/root/portal-ti"
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   PORTAL TI - Deploy para Servidor" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se IP foi fornecido
if ($serverIP -eq "") {
    Write-Host "ERRO: Informe o IP do servidor!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\scripts\deploy.ps1 -serverIP 192.168.1.100" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Servidor: $serverUser@$serverIP" -ForegroundColor Yellow
Write-Host "Destino: $deployPath" -ForegroundColor Yellow
Write-Host ""

# Confirmação
$confirm = Read-Host "Continuar com o deploy? (s/n)"
if ($confirm -ne "s") {
    Write-Host "Deploy cancelado." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/6] Criando backup local..." -ForegroundColor Cyan

# Criar pasta de backup
$backupDir = ".\backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Copiar arquivos importantes
Copy-Item ".\backend\.env" "$backupDir\backend.env" -ErrorAction SilentlyContinue
Copy-Item ".\frontend\.env" "$backupDir\frontend.env" -ErrorAction SilentlyContinue
Write-Host "[OK] Backup criado em: $backupDir" -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Verificando conexao SSH..." -ForegroundColor Cyan

# Testar conexão SSH
$testSSH = ssh -o ConnectTimeout=5 "$serverUser@$serverIP" "echo 'OK'" 2>&1
if ($testSSH -ne "OK") {
    Write-Host "[ERRO] Nao foi possivel conectar ao servidor" -ForegroundColor Red
    Write-Host "Verifique: IP, usuario, senha/chave SSH" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Conexao estabelecida" -ForegroundColor Green

Write-Host ""
Write-Host "[3/6] Criando diretorio no servidor..." -ForegroundColor Cyan

ssh "$serverUser@$serverIP" "mkdir -p $deployPath"
Write-Host "[OK] Diretorio criado" -ForegroundColor Green

Write-Host ""
Write-Host "[4/6] Enviando arquivos (pode demorar)..." -ForegroundColor Cyan

# Arquivos a enviar
$filesToSend = @(
    "docker-compose.yml",
    ".dockerignore",
    ".env.production.example",
    "backend",
    "frontend"
)

foreach ($file in $filesToSend) {
    if (Test-Path $file) {
        Write-Host "  Enviando: $file" -ForegroundColor Gray
        scp -r $file "${serverUser}@${serverIP}:${deployPath}/" 2>&1 | Out-Null
    }
}
Write-Host "[OK] Arquivos enviados" -ForegroundColor Green

Write-Host ""
Write-Host "[5/6] Configurando ambiente no servidor..." -ForegroundColor Cyan

# Script para executar no servidor
$remoteScript = @"
cd $deployPath
echo 'Verificando Docker...'
if ! command -v docker &> /dev/null; then
    echo 'Instalando Docker...'
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    echo 'Instalando Docker Compose...'
    apt-get update
    apt-get install -y docker-compose
fi

echo 'Docker e Docker Compose OK'

if [ ! -f .env ]; then
    echo 'Criando arquivo .env...'
    cp .env.production.example .env
    echo 'AVISO: Configure o arquivo .env antes de buildar!'
fi

echo 'Setup concluido'
"@

$remoteScript | ssh "$serverUser@$serverIP" "bash -s"
Write-Host "[OK] Ambiente configurado" -ForegroundColor Green

Write-Host ""
Write-Host "[6/6] Instrucoes finais" -ForegroundColor Cyan
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   DEPLOY ENVIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PROXIMOS PASSOS no servidor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conectar ao servidor:" -ForegroundColor White
Write-Host "   ssh $serverUser@$serverIP" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Navegar ao projeto:" -ForegroundColor White
Write-Host "   cd $deployPath" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Editar arquivo .env:" -ForegroundColor White
Write-Host "   nano .env" -ForegroundColor Gray
Write-Host "   (Configure: DB_PASSWORD, JWT_SECRET, SMTP, etc)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "4. Build e iniciar:" -ForegroundColor White
Write-Host "   docker-compose build" -ForegroundColor Gray
Write-Host "   docker-compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Executar migrations:" -ForegroundColor White
Write-Host "   docker-compose exec backend npm run migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Acessar sistema:" -ForegroundColor White
Write-Host "   http://$serverIP" -ForegroundColor Gray
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentacao completa:" -ForegroundColor Yellow
Write-Host "  - DEPLOY_PASSO_A_PASSO.md" -ForegroundColor Gray
Write-Host "  - DEPLOY_CHECKLIST.md" -ForegroundColor Gray
Write-Host ""

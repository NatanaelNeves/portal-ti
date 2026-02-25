# 🏢 Deploy INTERNO (Rede Local) - 100% GRATUITO

## 💡 Para Que Serve?

Hospedar o Portal TI em um computador da sua organização, acessível apenas pela rede local.

**Ideal para**:
- ONGs pequenas/médias
- Acesso apenas de funcionários internos
- Controle total do sistema
- Custo ZERO de hospedagem

---

## 📋 O Que Você Precisa

### Hardware Mínimo:
- **PC/Servidor** que fique ligado durante horário de trabalho
- **2GB RAM** (mínimo)
- **20GB disco** livre
- **Windows** (que você já tem) OU Linux

### Software:
- ✅ Node.js (já instalado)
- ✅ PostgreSQL (já tem)
- Docker (opcional, mas recomendado)

---

## 🚀 OPÇÃO 1: Docker (Mais Fácil)

### 1. Instalar Docker Desktop

```powershell
# Baixar e instalar:
# https://www.docker.com/products/docker-desktop

# Ou via winget:
winget install Docker.DockerDesktop
```

### 2. Configurar Arquivos

Já está pronto! Use o `docker-compose.yml` que criei:

```powershell
cd C:\Users\TECNOLOGIA\portal-ti

# Criar arquivo .env
Copy-Item .env.production.example .env

# Editar .env
notepad .env
```

**Configure no .env**:
```env
DB_PASSWORD=senha123
JWT_SECRET=GERE_UM_SECRET_32_CHARS
JWT_REFRESH_SECRET=GERE_OUTRO_SECRET
CORS_ORIGIN=*
VITE_API_URL=http://IP-DO-PC:3001
VITE_WS_URL=http://IP-DO-PC:3001
```

### 3. Iniciar Sistema

```powershell
# Iniciar tudo
docker-compose up -d

# Ver logs
docker-compose logs -f

# Executar migrations
docker-compose exec backend npm run migrate
```

### 4. Descobrir IP do Computador

```powershell
# Descobrir seu IP na rede local
ipconfig | Select-String "IPv4"
# Exemplo: 192.168.1.100
```

### 5. Acessar de Outros Computadores

Em qualquer computador na mesma rede:
- **Frontend**: http://192.168.1.100
- **Backend**: http://192.168.1.100:3001

---

## 🖥️ OPÇÃO 2: Instalação Manual (Sem Docker)

### 1. Configurar Backend

```powershell
cd backend

# Copiar .env
Copy-Item .env.example .env
notepad .env

# Configurar (DB_PASSWORD, JWT_SECRET, etc)

# Instalar e compilar
npm install --production
npm run build

# Executar migrations
npm run migrate

# Instalar PM2 (mantém rodando)
npm install -g pm2

# Iniciar
pm2 start dist/index.js --name portal-ti-backend
pm2 save
pm2 startup
```

### 2. Configurar Frontend

```powershell
cd frontend

# Criar .env.production
@"
VITE_API_URL=http://192.168.1.100:3001
VITE_WS_URL=http://192.168.1.100:3001
"@ | Out-File -Encoding utf8 .env.production

# Build
npm install
npm run build

# Servir com servidor estático
npm install -g serve
pm2 start "serve -s dist -p 3000" --name portal-ti-frontend
```

### 3. Configurar Firewall

```powershell
# Permitir acesso às portas
New-NetFirewallRule -DisplayName "Portal TI Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Portal TI Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## 🌐 Tornar Acessível por Nome (Opcional)

### Opção A: Editar hosts em cada PC

Em cada computador cliente, editar:
`C:\Windows\System32\drivers\etc\hosts`

Adicionar:
```
192.168.1.100    portal-ti
```

Agora podem acessar: http://portal-ti

### Opção B: Configurar no Roteador/DNS

Se seu roteador permite, configure:
- **Nome**: portal-ti.local
- **IP**: 192.168.1.100

---

## 🔄 Iniciar Automaticamente com o Windows

### Para Docker:
- Docker Desktop já inicia automaticamente
- Configure para iniciar com Windows

### Para PM2:
```powershell
pm2 startup
# Seguir instruções mostradas
pm2 save
```

---

## 📱 Acessar de Celulares na Rede

Celulares conectados ao WiFi da organização podem acessar:
- http://192.168.1.100

---

## 🔒 Segurança Básica

1. **Firewall do Windows**: 
   - Permitir apenas rede local
   - Bloquear acesso externo

2. **Senhas fortes**:
   - Banco de dados
   - Usuários do sistema

3. **Backup regular**:
```powershell
# Script de backup automático
$date = Get-Date -Format "yyyyMMdd"
$env:PGPASSWORD='123'
& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U postgres portal_ti > "C:\Backups\portal_ti_$date.sql"
```

Agende no Task Scheduler (Agendador de Tarefas).

---

## 📊 Monitoramento

### Ver status:
```powershell
# Docker
docker-compose ps

# PM2
pm2 status
pm2 logs
pm2 monit
```

### Reiniciar serviços:
```powershell
# Docker
docker-compose restart

# PM2
pm2 restart all
```

---

## 🔄 Atualizar Sistema

```powershell
# Parar serviços
docker-compose down
# ou
pm2 stop all

# Atualizar código
git pull

# Docker
docker-compose build
docker-compose up -d

# Manual
cd backend
npm install
npm run build
cd ../frontend
npm install
npm run build
pm2 restart all
```

---

## 💰 Custos

- **Energia elétrica**: ~R$ 10-30/mês (se PC já fica ligado = R$ 0 extra)
- **Internet**: Já tem
- **Hardware**: PC que já tem
- **Software**: Tudo gratuito

**TOTAL**: R$ 0-30/mês (praticamente zero!)

---

## ✅ Vantagens

- ✅ **Custo zero** de hospedagem
- ✅ **Controle total** dos dados
- ✅ **Sem limites** de uso/tráfego
- ✅ **Rápido** (rede local)
- ✅ **Privado** (não sai para internet)

## ⚠️ Desvantagens

- ⚠️ Acesso apenas na rede local
- ⚠️ Depende do PC estar ligado
- ⚠️ Você é responsável por manutenção
- ⚠️ Precisa configurar backup manual

---

## 🎯 Recomendação

**Use Docker** - Muito mais fácil de gerenciar!

```powershell
# Setup completo em 3 comandos:
docker-compose up -d
docker-compose exec backend npm run migrate
# Pronto!
```

---

**⏱️ Tempo de setup**: 15-30 minutos  
**💰 Custo**: R$ 0/mês

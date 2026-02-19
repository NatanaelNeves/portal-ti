# 🚀 Deploy Passo a Passo - Portal TI

## 🎯 3 Opções de Deploy

### A) **Docker** (Mais Fácil) - Recomendado
### B) **VPS/Servidor** (DigitalOcean, AWS, Azure)
### C) **Plataformas Gerenciadas** (Render, Railway, Heroku)

---

# 🐳 OPÇÃO A: Deploy com Docker (Recomendado)

## Vantagens:
- ✅ Tudo em um comando
- ✅ Funciona igual em qualquer servidor
- ✅ Fácil de atualizar
- ✅ Isolamento completo

---

## 🖥️ 1. Preparar Servidor

### Onde hospedar?

**Opções nacionais (Brasil):**
- **Hostinger VPS** - R$ 19/mês - https://hostinger.com.br
- **Contabo VPS** - R$ 25/mês - https://contabo.com
- **Locaweb VPS** - R$ 49/mês - https://locaweb.com.br

**Opções internacionais:**
- **DigitalOcean** - $6/mês - https://digitalocean.com
- **Vultr** - $6/mês - https://vultr.com
- **Hetzner** - €4/mês - https://hetzner.com

### Requisitos mínimos:
- CPU: 2 cores
- RAM: 2GB
- Disco: 20GB SSD
- SO: Ubuntu 22.04 LTS

---

## 📦 2. Instalar Docker no Servidor

```bash
# Conectar ao servidor via SSH
ssh root@seu-servidor-ip

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose -y

# Verificar instalação
docker --version
docker-compose --version
```

---

## 🔧 3. Configurar Projeto no Servidor

```bash
# Instalar Git
apt install git -y

# Clonar projeto (ou fazer upload via FTP)
git clone https://github.com/seu-usuario/portal-ti.git
cd portal-ti

# OU fazer upload direto via SCP do seu PC:
# scp -r C:\Users\TECNOLOGIA\portal-ti root@seu-ip:/root/
```

---

## 🔑 4. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.production.example .env

# Editar com nano
nano .env
```

**Preencha o arquivo `.env`:**

```env
# OBRIGATÓRIO - Gere secrets seguros
DB_PASSWORD=SuaSenhaForteAqui123!
JWT_SECRET=COLE_AQUI_O_SECRET_DE_32_CHARS
JWT_REFRESH_SECRET=COLE_AQUI_OUTRO_SECRET_DIFERENTE

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app-google

# URLs (ajuste para seu domínio ou IP)
CORS_ORIGIN=http://seu-ip-ou-dominio
VITE_API_URL=http://seu-ip-ou-dominio:3001
VITE_WS_URL=http://seu-ip-ou-dominio:3001
```

**Gerar secrets no servidor:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 5. Iniciar Aplicação

```bash
# Build das imagens
docker-compose build

# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## 🗄️ 6. Executar Migrations

```bash
# Aguardar containers iniciarem (30 segundos)
sleep 30

# Executar migrations
docker-compose exec backend npm run migrate

# Criar usuário admin
docker-compose exec backend node scripts/create-users.js
```

---

## 🌐 7. Configurar HTTPS (Let's Encrypt)

### Instalar Nginx e Certbot:

```bash
# Instalar
apt install nginx certbot python3-certbot-nginx -y

# Criar configuração Nginx
nano /etc/nginx/sites-available/portal-ti
```

**Cole esta configuração:**

```nginx
# Backend (API)
server {
    listen 80;
    server_name api.seu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Frontend
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Ativar e obter certificado SSL:**

```bash
# Ativar site
ln -s /etc/nginx/sites-available/portal-ti /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Obter certificado SSL (HTTPS)
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com -d api.seu-dominio.com

# Auto-renovação já configurada!
```

---

## 🎯 8. Acessar Sistema

- **Frontend**: https://seu-dominio.com
- **Backend**: https://api.seu-dominio.com
- **Health**: https://api.seu-dominio.com/api/health

---

## 🔄 9. Atualizar Sistema

```bash
# Conectar ao servidor
ssh root@seu-servidor-ip

# Navegar ao projeto
cd /root/portal-ti

# Baixar atualizações
git pull

# Rebuild e reiniciar
docker-compose down
docker-compose build
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## 📊 10. Monitoramento

### Ver status dos containers:
```bash
docker-compose ps
```

### Ver logs em tempo real:
```bash
# Todos
docker-compose logs -f

# Apenas backend
docker-compose logs -f backend

# Apenas frontend
docker-compose logs -f frontend
```

### Reiniciar um serviço:
```bash
docker-compose restart backend
```

### Parar tudo:
```bash
docker-compose down
```

### Backup do banco:
```bash
docker-compose exec postgres pg_dump -U postgres portal_ti > backup_$(date +%Y%m%d).sql
```

---

# 🖥️ OPÇÃO B: Deploy Manual (VPS sem Docker)

## 1. Preparar Servidor

```bash
# Conectar via SSH
ssh root@seu-ip

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar PostgreSQL
apt install postgresql postgresql-contrib -y

# Instalar Nginx
apt install nginx -y

# Instalar PM2 (gerenciador de processos)
npm install -g pm2
```

## 2. Configurar PostgreSQL

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar usuário e banco
CREATE USER portal_ti WITH PASSWORD 'sua-senha-forte';
CREATE DATABASE portal_ti OWNER portal_ti;
GRANT ALL PRIVILEGES ON DATABASE portal_ti TO portal_ti;
\q
```

## 3. Fazer Upload do Projeto

```bash
# Do seu PC, fazer upload
scp -r C:\Users\TECNOLOGIA\portal-ti root@seu-ip:/var/www/

# No servidor
cd /var/www/portal-ti
```

## 4. Configurar Backend

```bash
cd backend

# Copiar e editar .env
cp .env.example .env
nano .env

# Preencher com suas credenciais:
# DB_PASSWORD, JWT_SECRET, etc.

# Instalar dependências
npm install --production

# Compilar
npm run build

# Executar migrations
npm run migrate

# Iniciar com PM2
pm2 start dist/index.js --name portal-ti-backend
pm2 save
pm2 startup
```

## 5. Configurar Frontend

```bash
cd /var/www/portal-ti/frontend

# Criar .env.production
nano .env.production

# Preencher:
VITE_API_URL=https://api.seu-dominio.com
VITE_WS_URL=https://api.seu-dominio.com

# Instalar e buildar
npm install
npm run build

# Arquivos compilados estarão em dist/
```

## 6. Configurar Nginx

```bash
nano /etc/nginx/sites-available/portal-ti
```

**Cole:**

```nginx
# Backend
server {
    listen 80;
    server_name api.seu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    root /var/www/portal-ti/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Ativar
ln -s /etc/nginx/sites-available/portal-ti /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# SSL com Certbot
apt install certbot python3-certbot-nginx -y
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com -d api.seu-dominio.com
```

---

# ☁️ OPÇÃO C: Plataformas Gerenciadas

## Render.com (Mais Fácil)

### Backend:
1. Vá em https://render.com
2. Conecte seu GitHub
3. New → Web Service
4. Selecione repositório
5. Configure:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && node dist/index.js`
   - **Environment**: Node
6. Adicione variáveis de ambiente no painel

### Frontend:
1. New → Static Site
2. Selecione repositório
3. Configure:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
4. Adicione variáveis VITE_* no painel

### PostgreSQL:
1. New → PostgreSQL
2. Copie a URL de conexão
3. Cole no .env do backend como `DATABASE_URL`

---

## Railway.app

```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up
```

Siga as instruções no terminal!

---

# 📋 Checklist Final de Deploy

## Antes de ir ao ar:

- [ ] Domínio configurado (DNS apontando para IP)
- [ ] HTTPS configurado (Let's Encrypt)
- [ ] Variáveis de ambiente configuradas
- [ ] JWT Secrets gerados (32+ chars)
- [ ] Senha do banco forte
- [ ] SMTP configurado e testado
- [ ] Migrations executadas
- [ ] Usuário admin criado
- [ ] Backup automático configurado
- [ ] Firewall configurado (portas 80, 443, 22)
- [ ] Monitoramento ativo

## Testar:

- [ ] Login funciona
- [ ] Criar chamado funciona
- [ ] Upload de arquivo funciona
- [ ] WebSocket conecta
- [ ] Emails são enviados
- [ ] Dashboard carrega
- [ ] Exportar Excel funciona
- [ ] Mobile responsivo funciona

---

# 🔐 Segurança Essencial

```bash
# Firewall básico (UFW)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Desabilitar login root direto
nano /etc/ssh/sshd_config
# Mudar: PermitRootLogin no
systemctl restart sshd

# Fail2ban (proteção contra brute force)
apt install fail2ban -y
systemctl enable fail2ban
```

---

# 💰 Custos Estimados

## Hospedagem Docker (Recomendado):
- **VPS 2GB** - R$ 19-49/mês
- **Domínio .com.br** - R$ 40/ano
- **SSL** - Grátis (Let's Encrypt)
- **TOTAL**: ~R$ 25-55/mês

## Plataforma Gerenciada:
- **Render/Railway** - $7-15/mês
- **TOTAL**: ~R$ 35-75/mês

---

# 🆘 Problemas Comuns

## "Connection refused"
```bash
# Verificar se serviço está rodando
docker-compose ps
# ou
pm2 status
```

## "Cannot connect to database"
```bash
# Verificar PostgreSQL
docker-compose logs postgres
# ou
systemctl status postgresql
```

## "CORS error"
- Verifique `CORS_ORIGIN` no `.env`
- Deve ser o domínio do frontend

## Porta em uso
```bash
# Ver o que usa a porta
lsof -i :3001
# Matar processo
kill -9 <PID>
```

---

# 📞 Comandos Úteis

```bash
# Ver uso de recursos
htop
docker stats

# Espaço em disco
df -h

# Backup
docker-compose exec postgres pg_dump -U postgres portal_ti > backup.sql

# Restore
cat backup.sql | docker-compose exec -T postgres psql -U postgres portal_ti

# Limpar logs do Docker
docker system prune -a

# Ver logs do Nginx
tail -f /var/log/nginx/error.log
```

---

**🎉 Pronto! Sistema no ar!** 

Sua empresa já pode começar a usar o Portal TI em produção! 🚀

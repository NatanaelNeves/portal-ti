# 🚀 Guia Rápido de Deploy - Portal TI

## 📋 Pré-requisitos

- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 12+ (ou Docker)
- [ ] Git instalado
- [ ] (Opcional) Docker + Docker Compose

---

## ⚡ Início Rápido (5 minutos)

### 1️⃣ Setup Inicial

```powershell
# Execute o script de setup automático
.\setup.ps1
```

Este script vai:
- ✅ Verificar dependências  
- ✅ Criar arquivos .env
- ✅ Instalar pacotes npm
- ✅ Criar diretórios necessários
- ✅ Compilar TypeScript

### 2️⃣ Configurar Banco de Dados

**Opção A - PostgreSQL Local:**
```powershell
# Criar banco
createdb portal_ti

# Editar backend\.env com suas credenciais
notepad backend\.env
```

**Opção B - Docker (Recomendado):**
```powershell
# Criar container PostgreSQL
docker run -d `
  --name portal-ti-postgres `
  -e POSTGRES_DB=portal_ti `
  -e POSTGRES_PASSWORD=postgres `
  -p 5432:5432 `
  postgres:15-alpine
```

### 3️⃣ Configurar Variáveis de Ambiente

Edite `backend\.env`:

```env
# OBRIGATÓRIO MUDAR:
JWT_SECRET=GERE_COM_COMANDO_ABAIXO
JWT_REFRESH_SECRET=GERE_OUTRO_SECRET

# Configure seu email (Gmail):
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app
```

**Gerar JWT Secrets:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4️⃣ Executar Migrations

```powershell
cd backend
npm run migrate
```

### 5️⃣ Iniciar Sistema

**Desenvolvimento (2 terminais):**

Terminal 1 - Backend:
```powershell
cd backend
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

**Acesse:** http://localhost:3000

---

## 🐳 Deploy com Docker (Recomendado para Produção)

### 1️⃣ Preparar Ambiente

```powershell
# Copiar arquivo de configuração
Copy-Item .env.production.example .env

# Editar .env com valores reais
notepad .env
```

**Configure no `.env`:**
```env
DB_PASSWORD=senha-forte-aqui
JWT_SECRET=seu-secret-de-32-chars
JWT_REFRESH_SECRET=outro-secret-diferente
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
CORS_ORIGIN=https://seu-dominio.com
VITE_API_URL=https://api.seu-dominio.com
```

### 2️⃣ Build e Deploy

```powershell
# Build das imagens
docker-compose build

# Iniciar todos os serviços
docker-compose up -d
```

### 3️⃣ Executar Migrations

```powershell
# Executar migrations no container
docker-compose exec backend npm run migrate
```

### 4️⃣ Verificar Status

```powershell
# Ver logs
docker-compose logs -f

# Ver status
docker-compose ps

# Health checks
curl http://localhost:3001/api/health
curl http://localhost/health
```

---

## 🔧 Comandos Úteis

### Desenvolvimento

```powershell
# Backend
cd backend
npm run dev          # Modo desenvolvimento
npm run build        # Compilar TypeScript
npm run start        # Produção (após build)
npm test             # Rodar testes

# Frontend
cd frontend
npm run dev          # Modo desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm test             # Rodar testes
```

### Docker

```powershell
# Ver logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Reiniciar serviço
docker-compose restart backend

# Parar tudo
docker-compose down

# Parar e limpar volumes
docker-compose down -v

# Rebuild após mudanças
docker-compose up -d --build
```

### Banco de Dados

```powershell
# Conectar ao PostgreSQL (local)
psql -U postgres -d portal_ti

# Conectar ao PostgreSQL (Docker)
docker-compose exec postgres psql -U postgres -d portal_ti

# Backup
pg_dump -U postgres portal_ti > backup.sql

# Restore
psql -U postgres portal_ti < backup.sql

# Executar migration específica
cd backend
node scripts/migrate.js
```

---

## 📊 Importar Dados Iniciais

### Criar Usuário Admin

```powershell
cd backend

# Criar admin via script
node scripts/create-users.js
```

### Importar Usuários em Massa

```powershell
# Preparar CSV (veja exemplo em backend/data/)
node scripts/import-users.js caminho/para/usuarios.csv
```

### Importar Equipamentos

```powershell
node scripts/import-equipment.js caminho/para/equipamentos.csv
```

**Formato CSV de Usuários:**
```csv
name,email,username,password,role,department
João Silva,joao@empresa.com,joao.silva,senha123,user,TI
Maria Santos,maria@empresa.com,maria.santos,senha456,agent,Suporte
```

**Formato CSV de Equipamentos:**
```csv
code,name,type,status,location
NB001,Notebook Dell i5,COMPUTER,ACTIVE,Sala 101
MON001,Monitor LG 24",MONITOR,ACTIVE,Sala 102
```

---

## 🧪 Testar o Sistema

### Testes Automatizados

```powershell
# Backend
cd backend
npm test
npm run test:coverage

# Frontend
cd frontend
npm test
npm run test:coverage
```

### Teste Manual Básico

1. **Login**: Acesse http://localhost:3000
2. **Criar Chamado**: Teste abertura de ticket
3. **Upload**: Anexe um arquivo
4. **Comentários**: Adicione comentários
5. **WebSocket**: Abra 2 abas, veja atualizações em tempo real
6. **Dashboard**: Veja gráficos e estatísticas

---

## 🔒 Configurar HTTPS (Produção)

### Let's Encrypt com Certbot

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Auto-renovação já configurada automaticamente
```

### Adicionar HTTPS ao docker-compose

Crie `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend
```

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

```powershell
# Verificar se PostgreSQL está rodando
Get-Service postgresql*  # Windows
docker-compose ps        # Docker

# Testar conexão
psql -U postgres -h localhost -d portal_ti
```

### Erro: "Port 3000 already in use"

```powershell
# Windows - encontrar processo
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou use outra porta
# frontend: vite.config.ts -> server.port
```

### Erro: "JWT Secret not configured"

```powershell
# Gerar novo secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicionar ao backend\.env
JWT_SECRET=<secret-gerado>
```

### Frontend não carrega API

```powershell
# Verificar CORS no backend\.env
CORS_ORIGIN=http://localhost:3000

# Verificar URL da API no frontend\.env
VITE_API_URL=http://localhost:3001
```

### Docker: "no space left on device"

```powershell
# Limpar containers antigos
docker system prune -a

# Limpar volumes
docker volume prune
```

---

## 📚 Próximos Passos

Após configurar o básico:

1. **Segurança**: Siga o [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)
2. **Monitoramento**: Configure logs e alertas
3. **Backup**: Automatize backups do PostgreSQL
4. **Performance**: Configure cache e CDN
5. **Documentação**: Treine a equipe

---

## 🆘 Suporte

### Arquivos Úteis

- [QUICKSTART.md](QUICKSTART.md) - Guia de início
- [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) - Checklist completo
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Como testar
- [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) - Status do sistema

### Verificar Saúde do Sistema

```powershell
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost/health

# Ver logs em tempo real
docker-compose logs -f
```

---

## ✅ Checklist Rápido

- [ ] PostgreSQL configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas
- [ ] JWT Secrets gerados
- [ ] SMTP configurado
- [ ] Backend rodando em http://localhost:3001
- [ ] Frontend rodando em http://localhost:3000
- [ ] Login funcionando
- [ ] Criar chamado funcionando
- [ ] Upload de arquivo funcionando

**Tudo OK?** Sistema pronto para uso! 🎉

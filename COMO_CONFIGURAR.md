# 🎯 CONFIGURAÇÃO RÁPIDA - PORTAL TI

## ⚡ Escolha seu Método:

### **A) Desenvolvimento Local (Mais Rápido)**
Para testar e desenvolver localmente sem Docker

### **B) Deploy com Docker**
Para produção ou ambiente similar

---

# 📦 MÉTODO A: Desenvolvimento Local

## 1️⃣ Configurar Arquivos de Ambiente

Execute os comandos abaixo no PowerShell:

```powershell
# Copiar templates
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

## 2️⃣ Gerar JWT Secrets

```powershell
# Gerar secrets aleatórios
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**📝 Copie os secrets gerados e cole no arquivo `backend\.env`**

## 3️⃣ Editar backend\.env

Abra o arquivo e configure:

```env
# Altere estas linhas:
JWT_SECRET=COLE_O_PRIMEIRO_SECRET_AQUI
JWT_REFRESH_SECRET=COLE_O_SEGUNDO_SECRET_AQUI

# Se usar PostgreSQL local, deixe assim:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=portal_ti

# Configure seu email (opcional por enquanto):
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app
```

## 4️⃣ Instalar Dependências

```powershell
# Backend
cd backend
npm install

# Frontend (em outro terminal ou após o backend)
cd ../frontend
npm install
cd ..
```

## 5️⃣ Configurar PostgreSQL

**Opção A - PostgreSQL Instalado:**
```powershell
createdb portal_ti
```

**Opção B - Docker (Mais Fácil):**
```powershell
docker run -d --name portal-ti-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=portal_ti -p 5432:5432 postgres:15-alpine
```

## 6️⃣ Executar Migrations

```powershell
cd backend
npm run migrate
```

## 7️⃣ Iniciar Sistema

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

## 8️⃣ Acessar

Abra no navegador: **http://localhost:3000**

---

# 🐳 MÉTODO B: Deploy com Docker

## 1️⃣ Criar Arquivo .env

```powershell
# Copiar template
Copy-Item .env.production.example .env
```

## 2️⃣ Gerar Secrets

```powershell
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 3️⃣ Editar .env na raiz do projeto

```env
# Secrets gerados
DB_PASSWORD=senha-forte-aqui
JWT_SECRET=COLE_PRIMEIRO_SECRET
JWT_REFRESH_SECRET=COLE_SEGUNDO_SECRET

# Email
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app

# URLs (mude para seu domínio em produção)
CORS_ORIGIN=http://localhost
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

## 4️⃣ Build e Iniciar

```powershell
# Build das imagens
docker-compose build

# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## 5️⃣ Executar Migrations

```powershell
# Aguardar containers iniciarem (30 segundos)
Start-Sleep -Seconds 30

# Executar migrations
docker-compose exec backend npm run migrate
```

## 6️⃣ Acessar

Abra no navegador: **http://localhost**

---

# 🔧 Comandos Úteis

## Ver logs
```powershell
# Desenvolvimento
cd backend
npm run dev

# Docker
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Parar serviços
```powershell
# Docker
docker-compose down

# Container PostgreSQL standalone
docker stop portal-ti-postgres
```

## Reiniciar
```powershell
docker-compose restart backend
```

## Backup do banco
```powershell
# Local
pg_dump -U postgres portal_ti > backup.sql

# Docker
docker-compose exec postgres pg_dump -U postgres portal_ti > backup.sql
```

---

# 🆘 Problemas Comuns

## "Port 3000 already in use"
```powershell
# Windows - encontrar e matar processo
netstat -ano | findstr :3000
taskkill /PID <numero-do-pid> /F
```

## "Cannot connect to database"
```powershell
# Verificar se PostgreSQL está rodando
# Local:
Get-Service postgresql*

# Docker:
docker ps
docker-compose ps
```

## Erro de CORS
Verifique se `CORS_ORIGIN` no backend\.env está correto:
```env
CORS_ORIGIN=http://localhost:3000
```

## Migrations falham
```powershell
# Verificar conexão com banco
cd backend
node -e "const {Pool}=require('pg'); const pool=new Pool({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'portal_ti'}); pool.query('SELECT NOW()').then(()=>console.log('OK')).catch(e=>console.log('ERRO:',e.message))"
```

---

# ✅ Checklist Rápido

- [ ] Node.js 18+ instalado
- [ ] PostgreSQL rodando (local ou Docker)
- [ ] Arquivos .env criados
- [ ] JWT Secrets gerados
- [ ] Dependências instaladas (npm install)
- [ ] Migrations executadas
- [ ] Backend rodando (porta 3001)
- [ ] Frontend rodando (porta 3000)
- [ ] Site abrindo no navegador

---

# 📚 Próximos Passos

Depois que estiver rodando localmente:

1. **Criar primeiro usuário admin**
   ```powershell
   cd backend
   node scripts/create-users.js
   ```

2. **Importar dados** (opcional)
   ```powershell
   node scripts/import-users.js dados/usuarios.csv
   node scripts/import-equipment.js dados/equipamentos.csv
   ```

3. **Configurar SMTP** (para emails)
   - Use uma conta Gmail
   - Ative "Senha de App" nas configurações
   - Adicione no backend\.env

4. **Ler documentação completa**
   - [GUIA_RAPIDO_DEPLOY.md](GUIA_RAPIDO_DEPLOY.md) - Guia completo
   - [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) - Checklist produção
   - [TESTING_GUIDE.md](TESTING_GUIDE.md) - Como testar

---

**Pronto!** 🎉 Sistema configurado e rodando!

# 🚂 Deploy GRATUITO no Railway.app (5 minutos)

## 💰 Plano Gratuito
- **$5 em créditos/mês** - GRÁTIS para sempre
- **500 horas de execução/mês** - Mais que suficiente
- **Domínio personalizado** - Grátis
- **SSL automático** - Grátis
- **PostgreSQL incluído** - Grátis

---

## 🚀 Deploy em 3 Passos

### PASSO 1: Criar Conta

1. Acesse: https://railway.app
2. Clique em **"Start a New Project"**
3. Login com GitHub (crie conta se não tiver)

---

### PASSO 2: Fazer Upload do Projeto no GitHub

Se ainda não tem o código no GitHub:

```powershell
cd C:\Users\TECNOLOGIA\portal-ti

# Inicializar Git
git init
git add .
git commit -m "Portal TI - Sistema completo"

# Criar repositório em: https://github.com/new
# Depois:
git remote add origin https://github.com/seu-usuario/portal-ti.git
git branch -M main
git push -u origin main
```

---

### PASSO 3: Deploy no Railway

1. **No Railway**, clique em **"New Project"**

2. **Deploy PostgreSQL**:
   - Escolha: **"Provision PostgreSQL"**
   - Clique em **"Add PostgreSQL"**
   - Anote as credenciais (ou copie a DATABASE_URL)

3. **Deploy Backend**:
   - Clique: **"New Service"** → **"GitHub Repo"**
   - Autorize o Railway no GitHub
   - Selecione: **portal-ti**
   - Settings:
     - **Root Directory**: `/backend`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `node dist/index.js`
   
   - **Variables** (aba Variables):
     ```
     NODE_ENV=production
     PORT=3001
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     JWT_SECRET=GERE_UM_SECRET_32_CHARS
     JWT_REFRESH_SECRET=GERE_OUTRO_SECRET_32_CHARS
     JWT_EXPIRES_IN=15m
     JWT_REFRESH_EXPIRES_IN=7d
     CORS_ORIGIN=*
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=seu-email@gmail.com
     SMTP_PASSWORD=sua-senha-app
     ```
   
   - Clique em **"Deploy"**

4. **Deploy Frontend**:
   - Clique: **"New Service"** → **"GitHub Repo"**
   - Selecione: **portal-ti** novamente
   - Settings:
     - **Root Directory**: `/frontend`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npx serve -s dist -p $PORT`
   
   - **Variables**:
     ```
     VITE_API_URL=https://seu-backend.railway.app
     VITE_WS_URL=https://seu-backend.railway.app
     ```
   
   - Clique em **"Deploy"**

5. **Executar Migrations**:
   - Vá no serviço **Backend**
   - Aba **"Settings"** → **"Custom Start Command"**
   - Temporariamente mude para: `npm run migrate && node dist/index.js`
   - Após executar uma vez, volte para: `node dist/index.js`

---

## 🎯 Pronto!

URLs geradas automaticamente:
- **Backend**: https://portal-ti-backend-production.up.railway.app
- **Frontend**: https://portal-ti-frontend-production.up.railway.app

**Custo**: $0 (usando os $5 de crédito gratuito) 🎉

---

## 🔄 Atualizar Sistema

Basta fazer push no GitHub:
```powershell
git add .
git commit -m "Nova feature"
git push
```

Railway faz deploy automático! ✅

---

## 📊 Monitoramento

No painel do Railway você vê:
- Logs em tempo real
- Uso de recursos
- Custo estimado
- Status de deploy

---

## ⚙️ Dicas

1. **Domínio personalizado** (opcional):
   - Settings → Domains → Add Custom Domain
   - Configure CNAME no seu provedor

2. **Escalar** (se precisar):
   - Railway cobra ~$0.000231/GB-hora
   - Com $5/mês você tem recursos de sobra

3. **Backup do banco**:
   - PostgreSQL → Connect → Copiar DATABASE_URL
   - Fazer backup periódico via pg_dump

---

## 🆘 Problemas Comuns

**Erro "Port already in use"**:
- Use a variável `$PORT` fornecida pelo Railway
- Backend: Já está configurado para usar `process.env.PORT`

**Migrations não executam**:
- Acesse o terminal no Railway:
  - Backend → Settings → Terminal
  - Execute: `npm run migrate`

**Frontend não conecta ao backend**:
- Verifique se VITE_API_URL está correto nas variáveis
- Verifique CORS_ORIGIN no backend

---

**⏱️ Tempo total de setup**: ~5 minutos  
**💰 Custo**: $0/mês (com créditos gratuitos)

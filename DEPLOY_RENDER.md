# 🌐 Deploy GRATUITO no Render.com

## 💰 Plano Gratuito
- **Web Services** - GRÁTIS (com limitações)
- **PostgreSQL** - GRÁTIS (90 dias, depois $7/mês)
- **SSL automático** - GRÁTIS
- **Domínio personalizado** - GRÁTIS
- **Deploy automático via GitHub** - GRÁTIS

---

## 🚀 Deploy Passo a Passo

### PASSO 1: Criar Conta

1. Acesse: https://render.com
2. **Sign Up** com GitHub
3. Autorize o Render a acessar seus repositórios

---

### PASSO 2: Subir Código no GitHub

```powershell
cd C:\Users\TECNOLOGIA\portal-ti

git init
git add .
git commit -m "Portal TI completo"

# Criar repo em: https://github.com/new
git remote add origin https://github.com/seu-usuario/portal-ti.git
git push -u origin main
```

---

### PASSO 3: Deploy PostgreSQL

1. No Render Dashboard, clique **"New +"**
2. Escolha **"PostgreSQL"**
3. Configuração:
   - **Name**: portal-ti-db
   - **Database**: portal_ti
   - **User**: portal_ti_user
   - **Region**: Oregon (US West) - mais próximo
   - **Plan**: **Free** ✅
4. Clique **"Create Database"**
5. **IMPORTANTE**: Copie a **Internal Database URL** (formato: postgresql://...)

---

### PASSO 4: Deploy Backend

1. Clique **"New +"** → **"Web Service"**
2. Conecte ao repositório **portal-ti**
3. Configuração:
   - **Name**: portal-ti-backend
   - **Region**: Oregon
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Plan**: **Free** ✅

4. **Environment Variables** (clique em "Advanced"):
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://... (cole a URL do banco)
   JWT_SECRET=GERE_SECRET_32_CHARS
   JWT_REFRESH_SECRET=GERE_OUTRO_SECRET_32_CHARS
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   CORS_ORIGIN=*
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASSWORD=sua-senha-app
   ```

5. Clique **"Create Web Service"**

6. Aguarde o build (~3 minutos)

7. **Executar Migrations**:
   - No dashboard do backend, vá em **"Shell"**
   - Execute: `npm run migrate`

---

### PASSO 5: Deploy Frontend

1. Clique **"New +"** → **"Static Site"**
2. Selecione repositório **portal-ti**
3. Configuração:
   - **Name**: portal-ti-frontend
   - **Branch**: main
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://portal-ti-backend.onrender.com
   VITE_WS_URL=https://portal-ti-backend.onrender.com
   ```

5. Clique **"Create Static Site"**

---

## 🎯 URLs Geradas

- **Frontend**: https://portal-ti-frontend.onrender.com
- **Backend**: https://portal-ti-backend.onrender.com
- **Database**: Conexão interna

---

## ⚠️ Limitações do Plano Free

1. **Backend "dorme" após 15 min de inatividade**
   - Primeira requisição demora ~30 segundos (cold start)
   - Depois funciona normal
   
2. **750 horas/mês de uptime**
   - Suficiente se não usar 24/7
   
3. **PostgreSQL grátis por 90 dias**
   - Depois: $7/mês (ainda barato)
   - Alternativa: Migrar para Supabase (grátis)

---

## 💡 Dicas para Otimizar

### Manter Backend Acordado:
Use um serviço de ping gratuito:
- **UptimeRobot** - https://uptimerobot.com (gratuito)
- Configurar ping a cada 5 minutos

### Upgrade Quando Necessário:
- **Starter Plan**: $7/mês - Sem sleep, mais recursos

---

## 🔄 Deploy Automático

Todo `git push` para o GitHub faz deploy automático! ✅

```powershell
git add .
git commit -m "Nova funcionalidade"
git push
```

Render detecta mudanças e faz redeploy automaticamente.

---

## 📊 Monitoramento

No dashboard do Render:
- Logs em tempo real
- Métricas de performance
- Status de deploy
- Uso de recursos

---

## 🆘 Troubleshooting

**Build falha**:
- Verifique se Root Directory está correto
- Verifique se Build Command está correto

**Backend não inicia**:
- Verifique logs no dashboard
- Confirme que PORT=10000 está nas variáveis

**Frontend não conecta**:
- Verifique VITE_API_URL nas variáveis
- Confirme CORS no backend

**Banco não conecta**:
- Use a Internal Database URL (não a External)
- Formato deve ser: postgresql://user:pass@host/db

---

## 💰 Custos

| Serviço | Free | Depois de 90 dias |
|---------|------|-------------------|
| Frontend | $0 | $0 |
| Backend | $0 | $0 ou $7/mês |
| PostgreSQL | $0 | $7/mês |
| **TOTAL** | **$0** | **$7-14/mês** |

---

**⏱️ Tempo de setup**: ~10 minutos  
**💰 Custo inicial**: $0/mês

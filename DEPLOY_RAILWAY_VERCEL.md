# 🚀 GUIA DEFINITIVO: Railway (Backend) + Vercel (Frontend)

**Tempo total**: 15 minutos  
**Custo**: $0 nos primeiros meses  

---

## 📦 PARTE 1: Subir Código no GitHub (2 min)

```powershell
cd C:\Users\TECNOLOGIA\portal-ti

# Inicializar Git (se ainda não fez)
git init
git add .
git commit -m "Portal TI - Deploy completo"

# Criar repositório em: https://github.com/new
# Nome: portal-ti
# Público ou Privado: tanto faz

# Conectar e enviar
git remote add origin https://github.com/SEU-USUARIO/portal-ti.git
git branch -M main
git push -u origin main
```

✅ **Checkpoint**: Código no GitHub

---

## 🚂 PARTE 2: Deploy Backend + Banco no Railway (5 min)

### 1. Criar Conta
1. Acesse: https://railway.app
2. Clique **"Start a New Project"**
3. Login com **GitHub**
4. Autorize Railway

### 2. Criar Projeto
1. Clique **"New Project"**
2. Escolha **"Deploy from GitHub repo"**
3. Selecione: **portal-ti**

### 3. Configurar Backend
Railway vai detectar o projeto. Configure:

**Service Settings** (clique no serviço criado):
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.js`

**Variables** (aba Variables, clique em "+ New Variable"):

```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
JWT_REFRESH_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=*
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app-google
```

**Gerar secrets verdadeiros** (no PowerShell):
```powershell
# JWT_SECRET
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# JWT_REFRESH_SECRET  
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 4. Adicionar PostgreSQL
1. No projeto Railway, clique **"+ New"**
2. Escolha **"Database"** → **"Add PostgreSQL"**
3. Railway cria automaticamente

### 5. Conectar Backend ao Banco
1. Clique no serviço **Backend**
2. Aba **"Variables"**
3. Clique **"+ New Variable"** → **"Add Reference"**
4. Selecione:
   - `DATABASE_URL` → Reference from **Postgres** → `DATABASE_URL`

**OU adicione manualmente estas variáveis** (pegando do serviço PostgreSQL):
```bash
DB_HOST=postgres.railway.internal
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=(copiar do serviço PostgreSQL)
DB_NAME=railway
DB_SSL=false
```

**Melhor ainda**: Só use `DATABASE_URL` e adapte seu código para parseá-la.

### 6. Deploy
Railway faz deploy automático!

Aguarde ~2 minutos e veja os logs.

### 7. Obter URL do Backend
1. No serviço Backend
2. Aba **"Settings"**
3. Role até **"Networking"**
4. Clique **"Generate Domain"**
5. Copie a URL: `https://portal-ti-backend-production.up.railway.app`

### 8. Executar Migrations
**Opção A - Via Railway CLI**:
```powershell
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link ao projeto
railway link

# Executar migrations
railway run npm run migrate
```

**Opção B - Adicionar ao Start Command temporariamente**:
- Start Command: `npm run migrate && node dist/index.js`
- Após primeira execução, voltar para: `node dist/index.js`

✅ **Checkpoint**: Backend rodando + Banco conectado + Migrations ok

---

## ▲ PARTE 3: Deploy Frontend no Vercel (5 min)

### 1. Criar Conta
1. Acesse: https://vercel.com
2. Clique **"Sign Up"**
3. Login com **GitHub**

### 2. Importar Projeto
1. Clique **"Add New..."** → **"Project"**
2. **Import Git Repository** → Selecione **portal-ti**
3. Clique **"Import"**

### 3. Configurar Build
Vercel detecta Vite automaticamente, mas ajuste:

**Root Directory**: `frontend`

**Build Settings**:
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**Environment Variables** (clique em "Environment Variables"):
```bash
VITE_API_URL=https://portal-ti-backend-production.up.railway.app
VITE_WS_URL=https://portal-ti-backend-production.up.railway.app
```

*(Cole a URL real do Railway)*

### 4. Deploy
Clique **"Deploy"**

Aguarde ~3 minutos.

### 5. Obter URL
Vercel gera automaticamente:
`https://portal-ti.vercel.app`

✅ **Checkpoint**: Frontend no ar!

---

## 🔗 PARTE 4: Conectar Frontend ↔ Backend (2 min)

### 1. Atualizar CORS no Backend (Railway)
1. No Railway, vá no serviço **Backend**
2. **Variables**
3. Edite `CORS_ORIGIN`:
```bash
CORS_ORIGIN=https://portal-ti.vercel.app
```

4. Railway redeploy automático

### 2. Testar
1. Acesse: `https://portal-ti.vercel.app`
2. Faça login
3. Crie um chamado
4. Se funcionar = **SUCESSO** ✅

---

## 🎯 URLs Finais

- **Frontend**: https://portal-ti.vercel.app
- **Backend**: https://portal-ti-backend-production.up.railway.app
- **Banco**: Interno no Railway (PostgreSQL)

---

## 🔄 Deploy Contínuo

Agora toda vez que você fizer:

```powershell
git add .
git commit -m "Nova feature"
git push
```

✅ Railway redeploy backend automaticamente  
✅ Vercel redeploy frontend automaticamente

---

## 💰 Custos Reais

### Primeiros 3-6 meses:
- **Railway**: $5 créditos grátis/mês = **$0**
- **Vercel**: Free tier ilimitado = **$0**
- **TOTAL**: **$0/mês**

### Depois que acabarem os créditos Railway:
- **Railway Hobby**: $5/mês (backend + banco)
- **Vercel**: $0/mês (continua grátis)
- **TOTAL**: **$5/mês** (~R$ 25/mês)

---

## 🛠️ Comandos Úteis

### Ver logs:
```powershell
# Railway CLI
railway logs

# Ou no dashboard: railway.app → projeto → serviço → Logs
```

### Executar comando no servidor:
```powershell
railway run <comando>

# Exemplo: criar usuário admin
railway run node scripts/create-users.js
```

### Redeploy manual:
- Railway: Dashboard → Deployments → "Redeploy"
- Vercel: Dashboard → Deployments → "Redeploy"

---

## 🔒 Segurança Pós-Deploy

### 1. Atualizar CORS exato:
```bash
CORS_ORIGIN=https://portal-ti.vercel.app
```

### 2. Secrets fortes:
- Trocar JWT_SECRET por um real de 32+ chars
- Senha do SMTP com senha de app do Google

### 3. Rate limiting:
Já está no código (express-rate-limit)

---

## 🆘 Troubleshooting

### Backend não conecta ao banco:
- Ver logs no Railway
- Confirmar que `DATABASE_URL` está nas variáveis
- Verificar se migrations rodaram

### Frontend não carrega API:
- Confirmar `VITE_API_URL` no Vercel
- Verificar CORS no backend
- Abrir DevTools (F12) → Console → Ver erros

### Build falha:
- Verificar Root Directory correto
- Confirmar que package.json existe na pasta
- Ver logs do build

### Migrations não executam:
```powershell
# Via CLI
railway run npm run migrate

# Ou adicionar ao Start Command
npm run migrate && node dist/index.js
```

---

## ✅ Checklist Final

Antes de divulgar para os usuários:

- [ ] Backend responde em `/api/health`
- [ ] Frontend carrega
- [ ] Login funciona
- [ ] Criar chamado funciona
- [ ] Upload de arquivo funciona
- [ ] WebSocket conecta
- [ ] Dashboard carrega gráficos
- [ ] Migrations executadas
- [ ] Usuário admin criado
- [ ] CORS configurado corretamente
- [ ] SMTP testado (envia email)

---

## 🎊 PRONTO!

Sistema totalmente funcional na nuvem!

**Próximos passos**:
1. Criar usuário admin
2. Importar dados iniciais
3. Divulgar para equipe
4. Monitorar uso no Railway/Vercel dashboards

**Tempo gasto**: 15 minutos  
**Custo atual**: $0  
**Resultado**: Sistema profissional no ar! 🚀

---

## 📞 Dúvidas Comuns

**P: E se acabarem os créditos Railway?**  
R: Upgrade para Railway Hobby ($5/mês) ou migrar banco para Supabase (free)

**P: Posso usar domínio próprio?**  
R: Sim! No Vercel: Settings → Domains. No Railway: Settings → Networking

**P: Como fazer backup?**  
R: Railway: Backups automáticos no plano pago. Alternativa: pg_dump via CLI

**P: Vercel é grátis para sempre?**  
R: Sim, para projetos pessoais/nonprofit com tráfego razoável

# 🆓 Deploy GRATUITO no Azure (Microsoft for Nonprofits)

## 💰 Benefícios Microsoft for Nonprofits

Com sua conta nonprofit você tem:
- ✅ **$3,500 - $5,000/ano** em créditos Azure (dependendo da elegibilidade)
- ✅ **Azure Static Web Apps** - GRÁTIS (Frontend)
- ✅ **Azure App Service** - F1 Free Tier
- ✅ **Azure Database for PostgreSQL** - B1ms (pago com créditos)
- ✅ **Domínio personalizado + SSL** - GRÁTIS
- ✅ **GitHub Actions** para deploy automático - GRÁTIS

**Custo real**: $0 se usar os créditos! 🎉

---

## 🚀 DEPLOY NO AZURE - Passo a Passo

### 📋 Pré-requisitos

1. Conta Azure ativada via Microsoft for Nonprofits
2. GitHub account (gratuito)
3. Azure CLI instalado (opcional, mas recomendado)

---

## PARTE 1️⃣: Preparar Código no GitHub

### 1. Criar Repositório no GitHub

```powershell
# Inicializar Git no projeto (se ainda não tem)
cd C:\Users\TECNOLOGIA\portal-ti

git init
git add .
git commit -m "Initial commit - Portal TI"

# Criar repositório no GitHub e fazer push
# Vá em: https://github.com/new
# Depois execute:

git remote add origin https://github.com/seu-usuario/portal-ti.git
git branch -M main
git push -u origin main
```

### 2. Criar arquivo de configuração do Azure

Criar `azure-deploy.yml`:

```yaml
# Arquivo: .github/workflows/azure-deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
          
      - name: Build
        run: |
          cd backend
          npm run build
      
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./backend

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/frontend"
          output_location: "dist"
```

---

## PARTE 2️⃣: Configurar Azure Portal

### 🗄️ 1. Criar Banco de Dados PostgreSQL

1. **Acesse**: https://portal.azure.com
2. **Criar Recurso** → Busque "Azure Database for PostgreSQL"
3. **Escolha**: "Servidor Flexível"
4. **Configurações**:
   - **Grupo de Recursos**: Novo → `rg-portal-ti`
   - **Nome do Servidor**: `portal-ti-db`
   - **Região**: Brazil South (São Paulo)
   - **Versão PostgreSQL**: 15
   - **Computação + Armazenamento**: 
     - Clique em "Configurar servidor"
     - Escolha: **Burstable, B1ms** (mais barato)
     - Armazenamento: 32 GB
   - **Usuário admin**: `portaladmin`
   - **Senha**: Crie uma senha forte
   - **Rede**:
     - ✅ Permitir acesso de serviços do Azure
     - ✅ Adicionar seu IP atual

5. **Criar** → Aguarde 5 minutos

6. **Após criado**:
   - Vá em "Bancos de dados"
   - Criar banco: `portal_ti`

7. **Anote a connection string**:
   - Vá em "Connection strings"
   - Copie a string de conexão

---

### 🖥️ 2. Criar App Service (Backend)

1. **Criar Recurso** → "App Service"
2. **Configurações**:
   - **Grupo de Recursos**: `rg-portal-ti` (mesmo do banco)
   - **Nome**: `portal-ti-backend` (será: portal-ti-backend.azurewebsites.net)
   - **Publicar**: Código
   - **Pilha de runtime**: Node 18 LTS
   - **Sistema Operacional**: Linux
   - **Região**: Brazil South
   - **Plano Linux**: 
     - Criar novo: `plan-portal-ti`
     - SKU: **F1 (Gratuito)** ✅
       - *Se F1 não estiver disponível, use B1 (será pago com créditos)*

3. **Criar** → Aguarde 2 minutos

4. **Configurar Variáveis de Ambiente**:
   - Vá no App Service criado
   - Menu lateral: **Configuração** → **Configurações do aplicativo**
   - Adicionar:

```
NODE_ENV=production
PORT=8080
DB_HOST=portal-ti-db.postgres.database.azure.com
DB_PORT=5432
DB_USER=portaladmin
DB_PASSWORD=sua-senha-do-banco
DB_NAME=portal_ti
DB_SSL=true
JWT_SECRET=GERE_UM_SECRET_32_CHARS
JWT_REFRESH_SECRET=GERE_OUTRO_SECRET_32_CHARS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://seu-site.azurestaticapps.net
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
```

5. **Salvar** (no topo da página)

6. **Obter Perfil de Publicação**:
   - No App Service, clique em "Obter perfil de publicação"
   - Baixe o arquivo `.publishsettings`
   - Copie todo o conteúdo

---

### 🌐 3. Criar Static Web App (Frontend)

1. **Criar Recurso** → "Static Web App"
2. **Configurações**:
   - **Grupo de Recursos**: `rg-portal-ti`
   - **Nome**: `portal-ti-frontend`
   - **Plano de hospedagem**: **Free** ✅ (100% gratuito!)
   - **Região**: Brazil South
   - **Detalhes de implantação**:
     - **Origem**: GitHub
     - **Entrar no GitHub** → Autorizar
     - **Organização**: Sua conta
     - **Repositório**: portal-ti
     - **Branch**: main
   - **Detalhes de build**:
     - **Predefinições de build**: Custom
     - **Localização do app**: `/frontend`
     - **Localização da API**: (deixar vazio)
     - **Localização da saída**: `dist`

3. **Criar** → Aguarde 2 minutos

4. **Obter URL**:
   - Após criado, anote a URL: `https://seu-site.azurestaticapps.net`

5. **Configurar Variáveis de Ambiente**:
   - No Static Web App, vá em **Configuração**
   - Adicionar:

```
VITE_API_URL=https://portal-ti-backend.azurewebsites.net
VITE_WS_URL=https://portal-ti-backend.azurewebsites.net
```

---

## PARTE 3️⃣: Configurar GitHub Secrets

1. **No GitHub**, vá no seu repositório
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** (para cada um):

```
AZURE_WEBAPP_NAME = portal-ti-backend

AZURE_WEBAPP_PUBLISH_PROFILE = 
(cole o conteúdo do arquivo .publishsettings)

AZURE_STATIC_WEB_APPS_API_TOKEN = 
(copie do Azure Portal → Static Web App → Gerenciar token de implantação)

VITE_API_URL = https://portal-ti-backend.azurewebsites.net
```

---

## PARTE 4️⃣: Fazer Deploy

### Opção A: Deploy Manual (Primeira Vez)

#### Backend:

```powershell
# Instalar Azure CLI
winget install Microsoft.AzureCLI

# Login
az login

# Navegar ao backend
cd backend

# Zipar arquivos
Compress-Archive -Path * -DestinationPath deploy.zip -Force

# Deploy
az webapp deployment source config-zip `
  --resource-group rg-portal-ti `
  --name portal-ti-backend `
  --src deploy.zip

# Executar migrations
az webapp ssh --resource-group rg-portal-ti --name portal-ti-backend
# No terminal SSH:
cd site/wwwroot
npm run migrate
exit
```

#### Frontend:

```powershell
cd frontend

# Instalar ferramenta
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy --env production
```

### Opção B: Deploy Automático (GitHub Actions)

Depois de configurar tudo acima:

```powershell
git add .
git commit -m "Configure Azure deployment"
git push origin main
```

GitHub Actions vai fazer deploy automático! 🎉

Acompanhe em: **GitHub → Actions**

---

## PARTE 5️⃣: Executar Migrations

### Via Azure CLI:

```powershell
# SSH no App Service
az webapp ssh --resource-group rg-portal-ti --name portal-ti-backend

# No terminal SSH do Azure:
cd site/wwwroot
npm run migrate
exit
```

### Via Kudu (Interface Web):

1. Acesse: `https://portal-ti-backend.scm.azurewebsites.net`
2. **Debug Console** → **CMD**
3. Navegar: `site/wwwroot`
4. Execute: `npm run migrate`

---

## PARTE 6️⃣: Configurar Domínio Personalizado (Opcional)

### Se você tem um domínio (exemplo.org.br):

#### Para o Frontend (Static Web App):

1. No Azure Portal → Static Web App
2. **Domínios personalizados** → **Adicionar**
3. **Tipo**: Domínio personalizado
4. **Nome de domínio**: `www.exemplo.org.br`
5. **Tipo de validação**: TXT
6. Copie os registros DNS
7. Configure no seu provedor de domínio:
   - **Tipo**: CNAME
   - **Nome**: www
   - **Valor**: seu-site.azurestaticapps.net

#### Para o Backend (App Service):

1. No Azure Portal → App Service
2. **Domínios personalizados** → **Adicionar domínio personalizado**
3. **Domínio**: `api.exemplo.org.br`
4. Configure CNAME no provedor:
   - **Tipo**: CNAME
   - **Nome**: api
   - **Valor**: portal-ti-backend.azurewebsites.net

**SSL é automático e GRÁTIS!** ✅

---

## 📊 Monitoramento (Grátis!)

### Application Insights:

1. **Criar Recurso** → "Application Insights"
2. **Grupo de Recursos**: `rg-portal-ti`
3. **Nome**: `portal-ti-insights`
4. **Região**: Brazil South
5. **Criar**

6. **Conectar ao App Service**:
   - Vá no App Service
   - **Application Insights** → **Ativar**
   - Selecione o recurso criado

Agora você tem monitoramento completo: logs, erros, performance! 📈

---

## 💰 Custos Estimados (Com Créditos)

| Serviço | Tier | Custo/mês | Com Créditos |
|---------|------|-----------|--------------|
| **Static Web App** | Free | $0 | ✅ $0 |
| **App Service** | F1 Free | $0 | ✅ $0 |
| **PostgreSQL** | B1ms | ~$15 | ✅ $0 |
| **Application Insights** | Basic | ~$5 | ✅ $0 |
| **TOTAL** | | **~$20** | **$0** 🎉 |

Com seus **$3,500-$5,000/ano de créditos**, você tem **sobra para crescer muito!**

---

## 🔄 Atualizar Sistema

### Deploy automático:

```powershell
# Fazer alterações no código
git add .
git commit -m "Nova funcionalidade"
git push origin main
```

GitHub Actions faz deploy automático em ~5 minutos! ✅

---

## 🆘 Troubleshooting

### Backend não inicia:

```powershell
# Ver logs
az webapp log tail --resource-group rg-portal-ti --name portal-ti-backend
```

### Erro de conexão com banco:

1. Azure Portal → PostgreSQL
2. **Rede** → **Regras de firewall**
3. ✅ Marcar: "Permitir acesso aos serviços do Azure"
4. Adicionar seu IP se necessário

### Frontend não carrega:

1. Verificar variáveis de ambiente no Static Web App
2. Verificar CORS no backend (variável `CORS_ORIGIN`)

---

## 📋 Checklist Final

- [ ] Banco PostgreSQL criado
- [ ] App Service criado (Backend)
- [ ] Static Web App criado (Frontend)
- [ ] Variáveis de ambiente configuradas
- [ ] GitHub Secrets adicionados
- [ ] Código no GitHub (repositório público ou privado)
- [ ] GitHub Actions executados com sucesso
- [ ] Migrations executadas
- [ ] Site acessível via URL do Azure
- [ ] SSL funcionando (HTTPS)
- [ ] Login testado
- [ ] Criar chamado testado

---

## 🎯 URLs Finais

Após tudo configurado, você terá:

- **Frontend**: https://seu-site.azurestaticapps.net
- **Backend**: https://portal-ti-backend.azurewebsites.net
- **Admin Portal**: https://portal.azure.com

**Custo**: **$0** (usando créditos Microsoft for Nonprofits) 🎊

---

## 📞 Suporte Azure para Nonprofits

Se tiver problemas:

- **Documentação**: https://aka.ms/nonprofits
- **Suporte**: https://azure.microsoft.com/support
- **Comunidade**: https://techcommunity.microsoft.com

---

## 🚀 Próximos Passos

1. **Backup automático**: Configure backup do PostgreSQL
2. **Escalar**: Se precisar mais recursos, basta mudar o tier (pago com créditos)
3. **CI/CD**: GitHub Actions já está configurado!
4. **Monitoramento**: Use Application Insights

---

**🎉 Parabéns! Seu Portal TI está na nuvem da Microsoft, 100% grátis!** ☁️

# ✅ DEPLOY NO AZURE - STATUS E PRÓXIMOS PASSOS

## 📊 Infraestrutura Criada (03/03/2026)

### Recursos no Azure

| Recurso | Nome | Status | URL/Detalhes |
|---------|------|--------|--------------|
| **Resource Group** | rg-portal-ti | ✅ Criado | Região: Brazil South |
| **PostgreSQL** | portal-ti-db | ✅ Criado e Inicializado | portal-ti-db.postgres.database.azure.com |
| **App Service Plan** | plan-portal-ti | ✅ Criado | SKU: F1 (Free) |
| **App Service Backend** | portal-ti-backend | ⚠️ Em configuração | https://portal-ti-backend.azurewebsites.net |
| **Static Web App** | portal-ti-frontend | ✅ Criado | https://green-ocean-096bd050f.2.azurestaticapps.net |

---

## 🔐 Credenciais do Banco de Dados

```
Host: portal-ti-db.postgres.database.azure.com
Porta: 5432
Usuário: portaladmin
Senha: Opn@1234567
Database: portal_ti
SSL: Obrigatório (true)
```

✅ **Esquema do banco inicializado** - Todas as tabelas foram criadas com sucesso!

---

## 🚀 PRÓXIMOS PASSOS: Configurar Deploy Automático via GitHub Actions

Como a **autenticação básica está desabilitada** no Azure (configuração de segurança), a forma mais confiável de fazer deploy é via **GitHub Actions** que você já tem configurado no repositório.

### 📋 Configurar Secrets no GitHub

1. **Acesse**: https://github.com/NatanaelNeves/portal-ti/settings/secrets/actions

2. **Clique em "New repository secret"** e adicione cada um:

#### Secret 1: AZURE_BACKEND_APP_NAME
```
portal-ti-backend
```

#### Secret 2: VITE_API_URL
```
https://portal-ti-backend.azurewebsites.net
```

#### Secret 3: VITE_WS_URL
```
wss://portal-ti-backend.azurewebsites.net
```

#### Secret 4: AZURE_STATIC_WEB_APPS_API_TOKEN
```
a813975dbb6b4ad35dd06f037308f9f50e5f1e375ff9d8db22a19a4543e2e32d02-454a7308-6311-4bbd-af5e-96ed335c1e4800f0404096bd050f
```

#### Secret 5: AZURE_BACKEND_PUBLISH_PROFILE (IMPORTANTE)

**Para obter este secret:**

1. Abra o **PowerShell** nesta pasta e execute:

```powershell
az webapp deployment list-publishing-profiles --name portal-ti-backend --resource-group rg-portal-ti --xml | Out-File -FilePath "publish-profile.xml" -Encoding UTF8
notepad publish-profile.xml
```

2. Copie **TODO o conteúdo XML** do arquivo que abrir
3. Cole no GitHub como valor do secret `AZURE_BACKEND_PUBLISH_PROFILE`

---

### 🎯 Depois de Configurar os Secrets

Faça qualquer alteração no código (ou um commit vazio) e dê push:

```powershell
git commit --allow-empty -m "trigger: Deploy automático no Azure"
git push origin main
```

O **GitHub Actions** vai automaticamente:
1. ✅ Fazer build do backend
2. ✅ Deploy no Azure App Service
3. ✅ Fazer build do frontend
4. ✅ Deploy no Azure Static Web Apps

Você pode acompanhar o progresso em:
🔗 https://github.com/NatanaelNeves/portal-ti/actions

---

## 🔍 Verificar Status do Deploy

### Backend (API)
```powershell
curl https://portal-ti-backend.azurewebsites.net -UseBasicParsing
```

### Frontend
```powershell
Start-Process https://green-ocean-096bd050f.2.azurestaticapps.net
```

### Logs do Backend
```powershell
az webapp log tail --name portal-ti-backend --resource-group rg-portal-ti
```

---

## 💡 Alternativa: Deploy Manual Direto

Se quiser fazer deploy manual sem GitHub Actions:

```powershell
cd backend
az webapp up --name portal-ti-backend --resource-group rg-portal-ti --runtime "NODE:20-lts"
```

⚠️ **Nota**: O tier F1 (gratuito) tem recursos limitados e o build pode demorar bastante.

---

## 🔑 Variáveis de Ambiente Configuradas

Todas as variáveis já estão configuradas no App Service:

- ✅ NODE_ENV=production
- ✅ PORT=8080
- ✅ DB_HOST=portal-ti-db.postgres.database.azure.com
- ✅ DB_PORT=5432
- ✅ DB_USER=portaladmin
- ✅ DB_PASSWORD=Opn@1234567
- ✅ DB_NAME=portal_ti
- ✅ DB_SSL=true
- ✅ JWT_SECRET=Hitu0wGPTjXS7UQzbOgfMYR4r2eFo6EL
- ✅ JWT_REFRESH_SECRET=0UmKjQ3O6Svp7IityNM2xkD8wRscLzGC
- ✅ JWT_EXPIRES_IN=15m
- ✅ JWT_REFRESH_EXPIRES_IN=7d
- ✅ CORS_ORIGIN=https://green-ocean-096bd050f.2.azurestaticapps.net
- ✅ SCM_DO_BUILD_DURING_DEPLOYMENT=true

---

## 📚 Documentação Útil

- **Azure Portal**: https://portal.azure.com
- **Seu Resource Group**: https://portal.azure.com/#@/resource/subscriptions/e286c6fa-db39-4758-b8a0-6275b6d856eb/resourceGroups/rg-portal-ti/overview
- **Repositório GitHub**: https://github.com/NatanaelNeves/portal-ti
- **Guias de Deploy**: Ver arquivos `DEPLOY_*.md` neste repositório

---

## 💰 Custos Estimados

Com o **Microsoft for Nonprofits** você tem créditos Azure que cobrem:

- ✅ **Static Web App**: Grátis (tier Free)
- ✅ **App Service F1**: Grátis
- 💵 **PostgreSQL B1ms**: ~R$ 50/mês (coberto pelos créditos)

**Total com créditos: R$ 0/mês** 🎉

---

## ⚠️ Troubleshooting

### Se o backend não iniciar:

1. **Verificar logs**:
```powershell
az webapp log download --name portal-ti-backend --resource-group rg-portal-ti --log-file logs.zip
```

2. **Reiniciar o app**:
```powershell
az webapp restart --name portal-ti-backend --resource-group rg-portal-ti
```

3. **Ver logs em tempo real**:
```powershell
az webapp log tail --name portal-ti-backend --resource-group rg-portal-ti
```

### Se o frontend não conectar ao backend:

Verifique se o CORS está configurado corretamente:
```powershell
az webapp config appsettings set --name portal-ti-backend --resource-group rg-portal-ti --settings CORS_ORIGIN=https://green-ocean-096bd050f.2.azurestaticapps.net
```

---

## 🎉 Conclusão

**Tudo está pronto!** Só falta:

1. ✅ Configurar os 5 secrets no GitHub
2. ✅ Fazer um push para disparar o deploy automático
3. ✅ Aguardar ~5 minutos
4. ✅ Acessar https://green-ocean-096bd050f.2.azurestaticapps.net

**Está deploy! 🚀**

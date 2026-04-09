# Diagnóstico: Backend Fora do Ar (Erro CORS)

## ❌ **Erro Reportado**:
```
Access to XMLHttpRequest at 'https://portal-ti-backend.azurewebsites.net/api/documents/stats' 
from origin 'https://green-ocean-096bd050f.2.azurestaticapps.net' has been blocked by CORS
```

## 🔍 **Causa Real**:

O backend **NÃO está respondendo**. O erro de CORS é enganoso - acontece porque:

1. O deploy automático **falhou** (build failed após 685 segundos)
2. O backend antigo pode ter **caído** durante o deploy
3. O endpoint de health check deve estar **fora do ar**

## ✅ **Solução**:

### **Opção 1: Verificar Status do Backend**

Teste o health check:
```
https://portal-ti-backend.azurewebsites.net/api/health
```

**Se retornar erro ou timeout** → Backend está fora

**Se retornar JSON com `"status": "ok"`** → Backend está online

---

### **Opção 2: Verificar Logs do Azure**

1. Acesse: https://portal.azure.com
2. Vá para: **portal-ti-backend** → **Log stream**
3. Observe os logs em tempo real

**O que procurar:**
- Erros de inicialização
- Falhas de conexão com banco
- Mensagens de "Build failed"

---

### **Opção 3: Redeploy Manual do Backend**

#### **Via Azure Portal:**

1. Acesse: https://portal.azure.com
2. **portal-ti-backend** → **Deployment Center**
3. **Sync** ou **Redeploy**

#### **Via GitHub Actions (Recomendado):**

O workflow de deploy já existe. Para re-disparar:

```bash
cd c:\Users\TECNOLOGIA\portal-ti
# Fazer uma pequena alteração no backend
touch backend/src/trigger-redeploy.txt
git add backend/src/trigger-redeploy.txt
git commit -m "chore: trigger backend redeploy"
git push origin main
```

#### **Via Azure CLI:**

```powershell
cd c:\Users\TECNOLOGIA\portal-ti\backend

# Build
npm run build

# Deploy via Kudu (mais confiável que zip)
az webapp deploy `
  --resource-group rg-portal-ti `
  --name portal-ti-backend `
  --src-path "c:\Users\TECNOLOGIA\portal-ti\backend" `
  --type zip
```

---

### **Opção 4: Restart do App Service**

Se o backend está travado:

```bash
az webapp restart `
  --resource-group rg-portal-ti `
  --name portal-ti-backend
```

Ou via Azure Portal:
1. **portal-ti-backend** → **Overview**
2. Clique em **Restart**

---

## 📋 **Checklist de Verificação**:

- [ ] Health check responde: `/api/health`
- [ ] Logs do Azure não mostram erros críticos
- [ ] Variáveis de ambiente configuradas:
  - `CORS_ORIGIN=https://green-ocean-096bd050f.2.azurestaticapps.net`
  - `DB_HOST=portal-ti-db.postgres.database.azure.com`
  - `DB_PASSWORD=****`
  - `JWT_SECRET=****`
- [ ] Deployment Center mostra último deploy com sucesso
- [ ] App Service está em estado "Running"

---

## 🎯 **Ação Imediata**:

1. **Testar health check**:
   ```
   curl https://portal-ti-backend.azurewebsites.net/api/health
   ```

2. **Se falhar**: Restart do App Service

3. **Se persistir**: Redeploy completo

---

## 💡 **Nota Importante**:

O backend **já está configurado corretamente** para aceitar CORS do frontend:

```typescript
// backend/src/index.ts
const isAllowedCorsOrigin = (origin: string): boolean => {
  // ...
  return hostname.endsWith('.azurestaticapps.net');  // ✅ Já permite
};
```

O problema **NÃO é configuração CORS**, e sim o backend estar fora do ar.

---

**Próximo passo**: Verificar se backend está rodando e fazer restart/redeploy se necessário.

# Diagnóstico: Erro 404 no Download de Documentos

## ❌ **Erro Reportado**:
```
GET https://portal-ti-backend.azurewebsites.net/api/documents/f3657198-d245-4c8c-9af2-e24b5ef0e0bb/download
HTTP 404 (Not Found)
```

---

## 🔍 **Possíveis Causas**

### **1. Backend Não Foi Redeployado**
Se o código novo não está em Azure, o endpoint `/api/documents/:id/download` não existe.

**Como verificar**:
```bash
# Testar endpoint no Azure
curl -X GET "https://portal-ti-backend.azurewebsites.net/api/documents/f3657198-d245-4c8c-9af2-e24b5ef0e0bb/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

**Se retornar**:
- `404 Not Found` → Endpoint não existe ou documento não existe
- `401 Unauthorized` → Endpoint existe, precisa de token
- `404` com JSON `{"error": "Documento não encontrado"}` → Endpoint funciona, documento não existe

---

### **2. Documento Não Existe no Banco**
O ID `f3657198-d245-4c8c-9af2-e24b5ef0e0bb` pode não existir.

**Como verificar**:
Execute no banco de dados Azure:
```sql
-- Verificar se documento existe
SELECT id, title, file_url, created_at
FROM documents
WHERE id = 'f3657198-d245-4c8c-9af2-e24b5ef0e0bb';
```

**Resultados possíveis**:
- ✅ **1 linha retornada** → Documento existe, problema é outro
- ❌ **0 linhas retornadas** → Documento não existe!

---

### **3. Documento Existe mas Não Tem file_url**
O registro existe mas o campo `file_url` é NULL.

**Como verificar**:
```sql
SELECT id, title, file_url,
  CASE 
    WHEN file_url IS NULL THEN 'SEM ARQUIVO'
    ELSE 'COM ARQUIVO'
  END as status
FROM documents
WHERE id = 'f3657198-d245-4c8c-9af2-e24b5ef0e0bb';
```

**Resultados possíveis**:
- ✅ `COM ARQUIVO` → Problema é no caminho do arquivo
- ❌ `SEM ARQUIVO` → Documento foi criado sem upload de arquivo

---

### **4. Arquivo Não Existe no Disco**
O documento tem `file_url` mas o arquivo foi perdido/deletado.

**Como verificar**:
1. Olhar logs do Azure App Service
2. Procurar por:
```
📥 Download request for document f3657198-...
  - File URL: /uploads/documents/1772805180399_unknown_CONFIGURAR_TEAMS.pdf
  - Full path: /app/backend/uploads/documents/1772805180399_unknown_CONFIGURAR_TEAMS.pdf
❌ File not found on disk: /app/backend/uploads/documents/...
```

**Solução**:
- Verificar se upload foi feito corretamente
- Re-upload do arquivo

---

## 🛠️ **Passos para Diagnosticar**

### **Passo 1: Verificar Deploy**
```bash
# Verificar se backend está rodando versão nova
curl -X GET "https://portal-ti-backend.azurewebsites.net/api/health"
```

Se retornar versão antiga → Precisa redeploy

---

### **Passo 2: Verificar Documento**
Execute no banco Azure:
```sql
-- Arquivo: backend/check-documents.sql
SELECT id, title, file_url, created_at
FROM documents
ORDER BY created_at DESC
LIMIT 10;
```

---

### **Passo 3: Testar Localmente**
```bash
# Testar backend local
cd backend
npm run dev

# Em outro terminal
curl -X GET "http://localhost:3001/api/documents/SEU_ID/download" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -v
```

---

### **Passo 4: Verificar Logs do Azure**
1. Azure Portal → App Service → Log stream
2. Tentar baixar documento
3. Observar logs:

**Logs esperados se funcionando**:
```
📥 Download request for document f3657198-...
  - File URL: /uploads/documents/...
  - Title: como configurar o teams
  - Full path: /home/site/wwwroot/backend/uploads/documents/...
✅ Serving file: /home/site/wwwroot/backend/uploads/documents/...
```

**Logs se NÃO funcionando**:
```
📥 Download request for document f3657198-...
❌ Document not found: f3657198-...
```
OU
```
  - File URL: /uploads/documents/...
❌ File not found on disk: /home/site/wwwroot/backend/uploads/documents/...
```

---

## ✅ **Soluções**

### **Solução 1: Redeploy Backend**
```bash
cd c:\Users\TECNOLOGIA\portal-ti\backend
npm run build
# Fazer deploy para Azure
```

---

### **Solução 2: Recriar Documento**
Se documento não existe ou não tem file_url:

1. Ir para `/admin/documentos`
2. Editar o documento
3. Fazer upload do arquivo novamente
4. Salvar

---

### **Solução 3: Corrigir file_url no Banco**
Se arquivo existe mas URL está errado:

```sql
-- Atualizar file_url para formato correto
UPDATE documents
SET file_url = '/uploads/documents/NOME_DO_ARQUIVO.pdf'
WHERE id = 'f3657198-d245-4c8c-9af2-e24b5ef0e0bb';
```

---

### **Solução 4: Verificar Estrutura de Pastas no Azure**
Conectar via SSH ao container Azure:
```bash
az webapp ssh --name portal-ti-backend --resource-group SEU_GRUPO
```

Verificar arquivos:
```bash
ls -la /home/site/wwwroot/backend/uploads/documents/
```

Se pasta não existe ou está vazia → Problema de deploy

---

## 🎯 **Ação Recomendada**

### **1. Imediato: Redeploy Backend**
```bash
cd c:\Users\TECNOLOGIA\portal-ti\backend
npm run build
# Deploy to Azure
```

### **2. Após Deploy: Verificar Logs**
- Tentar baixar documento
- Olhar Azure logs
- Identificar erro exato

### **3. Se Persistir: Verificar Banco**
```sql
SELECT id, title, file_url FROM documents
WHERE id = 'f3657198-d245-4c8c-9af2-e24b5ef0e0bb';
```

### **4. Se file_url é NULL: Re-upload**
- Editar documento no frontend
- Fazer upload do arquivo
- Salvar

---

## 📝 **Resumo do Problema**

| Item | Status |
|------|--------|
| Código corrigido | ✅ Sim |
| Backend em Azure | ❌ Provavelmente desatualizado |
| Documento existe | ❓ Precisa verificar |
| Arquivo existe | ❓ Precisa verificar |

---

**Próximo passo**: Redeploy do backend e verificar logs do Azure para identificar o erro exato.

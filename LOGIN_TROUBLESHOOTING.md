# 🔐 Guia de Login - Portal TI

## ✅ Sistema Está Funcionando!

**Status:**
- ✅ Backend: http://localhost:3001 (Online)
- ✅ Frontend: http://localhost:3000 (Online)
- ✅ WebSocket: Ativo
- ✅ Rate Limiting: Ativo (você atingiu o limite!)

---

## 📋 Requisitos de Validação

### **Email:**
- ✅ Deve ser um email válido
- ✅ Máximo 255 caracteres

### **Senha:**
- ✅ **Mínimo 6 caracteres** ⚠️
- ✅ Máximo 100 caracteres

---

## ⚠️ Erro 400 (Bad Request)

Se você receber erro 400, significa que:
1. **Senha tem menos de 6 caracteres**
2. Email está em formato inválido
3. Algum campo está faltando

---

## 🚫 Erro 429 (Too Many Requests)

Você atingiu o **limite de 5 tentativas** de login em 15 minutos!

**Soluções:**

### **Opção 1: Aguardar 15 minutos**
O rate limit será resetado automaticamente.

### **Opção 2: Desabilitar temporariamente** (apenas para desenvolvimento)

Edite `backend/src/index.ts` linha 37 e comente o authLimiter:

```typescript
// Rotas da API
app.use('/api/auth', require('./routes/auth').default);
app.use('/api/public-auth', require('./routes/publicAuth').default);
app.use('/api/internal-auth', require('./routes/internalAuth').default);
// app.use('/api/internal-auth', authLimiter, require('./routes/internalAuth').default);
```

Depois reinicie o backend: `Ctrl+C` e `npm run dev`

### **Opção 3: Mudar o limite** (apenas para desenvolvimento)

Edite `backend/src/middleware/rateLimiter.ts`:

```typescript
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // era 5, agora 100
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: false,
});
```

---

## 🎯 Como Fazer Login

1. **Acesse:** http://localhost:3000/admin/login

2. **Use credenciais válidas:**
   - Email: `admin@example.com` (ou qualquer email cadastrado)
   - Senha: no mínimo 6 caracteres

3. **Se não tiver usuário, crie um:**

```powershell
cd backend
node create-users.js
```

Ou crie manualmente via script SQL.

---

## 🔧 Criar Usuário Admin Manualmente

```sql
-- Conecte ao PostgreSQL
psql -U postgres -d portal_ti

-- Criar admin (senha: admin123)
INSERT INTO internal_users (email, name, password_hash, role, is_active)
VALUES (
  'admin@example.com',
  'Administrador',
  '$2a$10$YourHashedPasswordHere',
  'admin',
  true
);
```

Para gerar hash de senha em Node.js:

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('admin123', 10);
console.log(hash);
```

---

## 🐛 Debug

Para ver detalhes do erro 400, abra o **Console do navegador** (F12) e veja a aba Network:
- Clique na requisição `internal-login`
- Veja a aba "Response"
- Verá algo como:

```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "password",
      "message": "Senha deve ter no mínimo 6 caracteres"
    }
  ]
}
```

---

## ✅ Checklist Final

- [ ] Backend rodando na porta 3001
- [ ] Frontend rodando na porta 3000
- [ ] Usuário criado no banco de dados
- [ ] Senha tem no mínimo 6 caracteres
- [ ] Rate limit não atingido (ou desabilitado em dev)
- [ ] Console do navegador aberto para ver erros

---

**Após corrigir, seu sistema estará 100% funcional! 🚀**

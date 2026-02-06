# 🔐 CRIAÇÃO DO USUÁRIO ADMINISTRADOR INICIAL

## ⚠️ IMPORTANTE: Execute APENAS UMA VEZ na primeira instalação

Este script cria os usuários iniciais do sistema:
- **Administrador** (acesso total)
- **Equipe de TI** (gerenciar chamados e estoque)
- **Gestor** (visualizar relatórios e aprovar compras)

---

## 📋 PRÉ-REQUISITOS

1. ✅ Banco de dados PostgreSQL rodando
2. ✅ Banco `portal_ti` criado
3. ✅ Backend já executado pelo menos uma vez (para criar as tabelas)

---

## 🚀 COMO EXECUTAR

### No terminal, dentro da pasta `backend`:

```bash
node create-users.js
```

---

## 📝 CREDENCIAIS PADRÃO

Após executar o script, você terá acesso com:

### 👑 ADMINISTRADOR
- **URL**: http://localhost:3000/admin/login
- **Email**: `admin@opequenonazareno.org.br`
- **Senha**: `admin123`
- **Pode fazer**: Tudo (criar usuários, gerenciar sistema completo)

### 🛠️ EQUIPE DE TI
- **URL**: http://localhost:3000/admin/login
- **Email**: `ti@opequenonazareno.org.br`
- **Senha**: `ti123`
- **Pode fazer**: Gerenciar chamados, atualizar estoque

### 📊 GESTOR/COORDENADOR
- **URL**: http://localhost:3000/admin/login
- **Email**: `gestor@opequenonazareno.org.br`
- **Senha**: `gestor123`
- **Pode fazer**: Ver relatórios, aprovar compras

---

## 🔒 ALTERE AS SENHAS!

**⚠️ CRÍTICO**: Após fazer o primeiro login, **MUDE ESSAS SENHAS IMEDIATAMENTE!**

Estas são senhas padrão apenas para facilitar a primeira configuração.

---

## ✅ APÓS CRIAR O ADMIN

1. Acesse `http://localhost:3000/admin/login`
2. Faça login como **admin@opequenonazareno.org.br**
3. No Dashboard, clique em **"👥 Gerenciar Usuários"**
4. **Crie novos usuários** com senhas fortes
5. **Desative ou exclua** os usuários padrão (opcional)

---

## 🔄 SE PRECISAR EXECUTAR NOVAMENTE

O script usa `ON CONFLICT DO UPDATE`, então:
- Se o usuário já existir: **atualiza** a senha para a padrão
- Se não existir: **cria** o usuário

**Útil para**: Reset de senha de admin em caso de emergência

---

## 🎯 PRÓXIMOS PASSOS

Agora que o admin existe:

1. ✅ Não precisa mais do script
2. ✅ Todos os novos usuários são criados pela interface web
3. ✅ Acesse `/admin/usuarios` para gerenciar

---

## ❓ PARA QUE SERVE O BOTÃO "SAIR"?

O botão **"Sair"** no menu superior:

- ✅ **Aparece apenas** para usuários internos autenticados
- ✅ Faz **logout** da sessão
- ✅ Redireciona para a tela de login
- ❌ **NÃO aparece** para usuários públicos (quem abre chamado sem login)

### Quando usar:
- Trocar de usuário
- Sair do sistema ao fim do expediente
- Liberar a sessão em computador compartilhado

---

## 🆘 PROBLEMAS COMUNS

### "Error: connect ECONNREFUSED"
➜ PostgreSQL não está rodando. Inicie o serviço.

### "database 'portal_ti' does not exist"
➜ Crie o banco: `createdb portal_ti` ou via pgAdmin

### "relation 'internal_users' does not exist"
➜ Execute o backend primeiro: `cd backend && npm run dev`
➜ Ele criará as tabelas automaticamente

---

## 📞 ESTRUTURA DO SISTEMA

```
USUÁRIOS PÚBLICOS (sem login)
↓
Abrem chamado → Recebem token → Acompanham via token

USUÁRIOS INTERNOS (com login)
↓
Admin → Cria usuários, gerencia tudo
TI → Gerencia chamados e estoque  
Gestor → Relatórios e aprovações
```

---

## ✨ RESUMO EXECUTIVO

```bash
# 1. Certifique-se que o backend rodou pelo menos uma vez
cd backend
npm run dev

# 2. Em outro terminal, crie os usuários iniciais
node create-users.js

# 3. Acesse a interface
# http://localhost:3000/admin/login

# 4. Login: admin@opequenonazareno.org.br / admin123

# 5. Crie seus usuários reais e altere as senhas!
```

**Pronto! Sistema configurado! 🎉**

# 🎯 FLUXO DE ATENDIMENTO - SISTEMA DE CHAMADOS TI

## 📊 SISTEMA DE CORES E STATUS

### 🎨 Indicadores de Cor por Status

| Cor | Emoji | Status | Significado |
|-----|-------|--------|-------------|
| 🔴 Vermelho | 🔴 | `priority: high/critical` | **URGENTE** - Prioridade alta, precisa atenção imediata |
| 🟡 Amarelo | 🟡 | `waiting_user` | **Aguardando Usuário** - TI respondeu, esperando retorno do solicitante |
| 🔵 Azul | 🔵 | `in_progress` | **Em Atendimento** - Chamado assumido por alguém da TI |
| ⚪ Branco | ⚪ | `open` | **Aberto** - Novo chamado sem atribuição |
| ✅ Verde | ✅ | `resolved` | **Resolvido** - Problema solucionado |
| 🔒 Cinza | 🔒 | `closed` | **Fechado** - Ticket finalizado |

---

## 🔄 FLUXO COMPLETO - PASSO A PASSO

### **Etapa 1️⃣: Novo Chamado Chega**

```
Status: open
Cor: ⚪ Branco (ou 🔴 se urgente)
assigned_to: null
Responsável: "Ninguém"
```

**O que fazer:**
- Chamado aparece na lista
- Você pode clicar em "🎯 Assumir" diretamente no card
- OU clicar em "🔧 Atender" para ver detalhes

---

### **Etapa 2️⃣: Assumir o Chamado**

**Opção A - Assumir Diretamente (NOVO!)**
```
Clique no botão "🎯 Assumir" no card do ticket
```

**Opção B - Entrar nos Detalhes**
```
1. Clique em "🔧 Atender"
2. Na página de detalhes, clique "🎯 Assumir"
```

**O que acontece:**
```javascript
// Backend recebe:
{
  status: "in_progress",
  assigned_to_id: "seu-user-id"

  
}

// Ticket é atualizado:
- Status: open → in_progress
- Cor: ⚪ → 🔵 (azul)
- Responsável: "Ninguém" → "Seu Nome"
```

---

### **Etapa 3️⃣: Durante o Atendimento**

**Você pode:**

1. **Aguardar Resposta do Usuário**
   ```
   Botão: "⏳ Aguardar Usuário"
   Status: in_progress → waiting_user
   Cor: 🔵 → 🟡 (amarelo)
   ```

2. **Adicionar Mensagens**
   - Mensagens públicas (usuário vê)
   - Notas internas (só TI vê)

3. **Alterar Prioridade**
   - Baixa, Média, Alta, Urgente

4. **Reatribuir**
   - Transferir para outro membro da TI

---

### **Etapa 4️⃣: Resolver o Chamado**

```
Botão: "✅ Resolver"
Status: in_progress → resolved
Cor: 🔵 → ✅ (verde)
```

---

### **Etapa 5️⃣: Fechar Definitivamente**

```
Botão: "🔒 Fechar"
Status: resolved → closed
Cor: ✅ → 🔒 (cinza)
```

---

## 📋 FILTROS DISPONÍVEIS

### Por Status
- **Todos** - Mostra todos os tickets
- **Abertos** - `status: open`
- **Em Progresso** - `status: in_progress`
- **Aguardando Usuário** - `status: waiting_user`
- **Resolvidos** - `status: resolved`
- **Fechados** - `status: closed`

### Por Atribuição
- **Todos** - Mostra todos os tickets
- **Meus Atendimentos** - Apenas tickets atribuídos a você
- **Sem Responsável** - Tickets com `assigned_to: null`

---

## ❓ POR QUE TODOS OS TICKETS ESTÃO AMARELOS?

Se você está vendo todos os tickets em 🟡 **amarelo**, significa:

1. **Status = `waiting_user`**
   - Alguém da TI já respondeu
   - Está aguardando retorno do usuário

2. **Solução:**
   - Clique em "🎯 Assumir" para mudar para azul
   - OU mude manualmente o status nos detalhes

---

## 🆕 NOVO: BOTÃO "ASSUMIR" NA LISTA

Agora você **NÃO precisa mais entrar nos detalhes** para assumir um ticket!

**Antes:**
```
Ticket → Clique "Atender" → Abrir detalhes → Clique "Assumir"
```

**Agora:**
```
Ticket → Clique "🎯 Assumir" (direto no card)
```

**Quando o botão aparece:**
- ✅ Ticket ainda não está atribuído (`assigned_to: null`)
- ✅ Status é `open`
- ❌ Não aparece se já está em atendimento

---

## 🎯 ATALHOS E DICAS

### Ordenação Automática
Os tickets são ordenados por **urgência** (prioridade + tempo parado):
```javascript
Urgência = (Pontos de Prioridade) + (Horas Paradas)

Prioridades:
- critical: 100 pontos
- high: 50 pontos
- medium: 20 pontos
- low: 10 pontos
```

### Indicadores Rápidos (Topo da Página)
- 🔴 **Críticos** - Clique para filtrar apenas urgentes
- 🟡 **Aguard. Usuário** - Clique para filtrar pendentes
- 🔵 **Em Atendimento** - Clique para ver tickets em progresso

### Painel Lateral
- Clique em qualquer ticket para ver resumo rápido
- Botões de ação rápida sem sair da lista

---

## 🔐 PERMISSÕES

| Ação | 👤 Público | 👷 TI | 👔 Gestor | 🔑 Admin |
|------|-----------|-------|-----------|----------|
| Ver todos os tickets | ❌ | ✅ | ✅ | ✅ |
| Assumir ticket | ❌ | ✅ | ❌ | ✅ |
| Mudar status | ❌ | ✅ | ❌ | ✅ |
| Reatribuir | ❌ | ✅ | ❌ | ✅ |
| Fechar ticket | ❌ | ✅ | ❌ | ✅ |

---

## 📱 ONDE ACESSAR

**URL:** `http://localhost:3000/admin/chamados`

**Login:**
```
TI: ti@opequenonazareno.org.br / ti123
Admin: admin@opequenonazareno.org.br / Opn@TI2026!
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Todos os tickets estão amarelos"
**Causa:** Status = `waiting_user`  
**Solução:** Clique "🎯 Assumir" para mudar para azul (`in_progress`)

### Problema: "Não consigo assumir o ticket"
**Causa:** Falta permissão ou ticket já atribuído  
**Solução:** Verifique se você está logado como TI/Admin

### Problema: "Botão 'Assumir' não aparece"
**Causa:** Ticket já tem responsável  
**Solução:** Ticket já está atribuído a alguém, veja o nome do responsável

### Problema: "assigned_to: null"
**Causa:** Ninguém assumiu o ticket ainda  
**Solução:** Clique "🎯 Assumir" para atribuir a você

---

## ✅ CHECKLIST DE ATENDIMENTO

- [ ] Ticket aberto (⚪)
- [ ] Cliquei em "🎯 Assumir"
- [ ] Ticket mudou para azul (🔵)
- [ ] Meu nome aparece como responsável
- [ ] Adicionei mensagem de atendimento
- [ ] Se necessário: "⏳ Aguardar Usuário" (🟡)
- [ ] Problema resolvido: "✅ Resolver" (verde)
- [ ] Finalizei: "🔒 Fechar" (cinza)

---

**🚀 Pronto! Agora você domina todo o fluxo de atendimento!**

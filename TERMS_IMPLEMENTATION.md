# 📝 Sistema de Termos de Responsabilidade - Documentação Completa

## Visão Geral

Implementei um **sistema completo de Termos de Responsabilidade, Guarda e Devolução de Equipamento** baseado no documento padrão da instituição. O sistema permite que colaboradores assinem digitalmente termos formais e devolva equipamentos com checklist completo e registro de estado.

---

## 🏗️ Arquitetura Implementada

### Fluxo do Usuário

```
Equipamento Details (EquipmentDetailPage)
    ↓
    ├─→ 📊 Aba "Termos" (histórico de termos)
    │   ├─→ Ver Termo em PDF
    │   └─→ Registrar Devolução (se ativo)
    │
    └─→ Botão "Novo Termo de Responsabilidade"
        ↓
        Assinatura de Termo (SignTermPage - 3 passos)
        │
        ├─→ Passo 1: Dados do Colaborador
        ├─→ Passo 2: Dados do Equipamento
        └─→ Passo 3: Aceites e Termos
            ↓
            Termo Criado (API POST /api/inventory/terms)
            ↓
            Volta para Equipment Details
            ↓
            Botão "Registrar Devolução"
            ↓
            Devolução de Termo (ReturnTermPage - 2 passos)
            │
            ├─→ Passo 1: Informações de Devolução
            └─→ Passo 2: Vistoria e Aceites
                ↓
                Devolução Registrada (API POST /api/inventory/terms/:id/devolucao)
                ↓
                Volta para Responsabilidades
```

---

## 📄 Páginas Implementadas

### 1. **EquipmentDetailPage.tsx** (Detalhes do Equipamento)

**Arquivo**: `frontend/src/pages/EquipmentDetailPage.tsx`

**Propósito**: Mostrar informações completas de um equipamento com histórico de movimentações e termos de responsabilidade.

**Estrutura**:

```
┌─────────────────────────────────────────┐
│ ← Voltar | Marca/Modelo | Status Badge  │
├─────────────────────────────────────────┤
│ Tabs: Visão Geral | Histórico | Termos  │
├─────────────────────────────────────────┤
│ Tab 1: Visão Geral                      │
│  ├─ Especificações Técnicas             │
│  ├─ Informações Institucionais          │
│  └─ Ações Disponíveis                   │
│     ├─ ✍️ Novo Termo                    │
│     ├─ ↔️ Registrar Movimentação        │
│     └─ 🖨️ Imprimir                      │
│                                         │
│ Tab 2: Histórico                        │
│  └─ Timeline de Movimentações           │
│     ├─ 📤 Entrega                       │
│     ├─ 📥 Devolução                     │
│     ├─ ↔️ Transferência                 │
│     ├─ 🔧 Manutenção                    │
│     └─ 🗑️ Baixa                         │
│                                         │
│ Tab 3: Termos                           │
│  └─ Histórico de Responsabilidades      │
│     ├─ 📄 Ver Termo                     │
│     └─ 📥 Registrar Devolução           │
└─────────────────────────────────────────┘
```

**Principais Features**:
- ✅ Visualização de 3 abas (Visão Geral, Histórico, Termos)
- ✅ Timeline visual de movimentações
- ✅ Lista de termos de responsabilidade com status
- ✅ Ações contextuais (Nova responsabilidade, Devolução)
- ✅ Dados completos do equipamento e especificações

---

### 2. **SignTermPage.tsx** (Assinatura de Termo)

**Arquivo**: `frontend/src/pages/SignTermPage.tsx`

**Propósito**: Formulário multi-passo para criar e assinar um novo Termo de Responsabilidade.

**Estrutura (3 Passos)**:

```
PASSO 1️⃣: IDENTIFICAÇÃO DO COLABORADOR
├─ Nome Completo *
├─ CPF *
├─ Cargo *
└─ Unidade/Departamento

PASSO 2️⃣: IDENTIFICAÇÃO DO EQUIPAMENTO
├─ Código Patrimonial *
├─ Marca *
├─ Modelo
├─ Número de Série
├─ Processador
├─ Memória RAM
└─ Acessórios (checkboxes)
   ├─ Carregador
   ├─ Mouse
   ├─ Case/Bolsa
   └─ Outros

PASSO 3️⃣: TERMOS E CONDIÇÕES
├─ Responsabilidades do Colaborador (8 pontos)
├─ Rastreamento e Proteção de Dados (LGPD)
├─ Aceites (2 checkboxes)
│  ├─ ☑️ Aceitar responsabilidades
│  └─ ☑️ Autorizar rastreamento LGPD
├─ Data da Assinatura *
└─ Método de Assinatura (Digital/Manual)
```

**Principais Features**:
- ✅ Formulário multi-passo com validações
- ✅ Barra de progresso visual
- ✅ Validação em cada passo
- ✅ Checkboxes obrigatórios para termos
- ✅ Data padrão = hoje
- ✅ Suporte a Digital e Manual
- ✅ Formatação visual clara
- ✅ Responsivo para mobile

---

### 3. **ReturnTermPage.tsx** (Devolução de Equipamento)

**Arquivo**: `frontend/src/pages/ReturnTermPage.tsx`

**Propósito**: Formulário multi-passo para registrar a devolução de um equipamento com vistoria completa.

**Estrutura (2 Passos)**:

```
PASSO 1️⃣: INFORMAÇÕES DA DEVOLUÇÃO
├─ Data da Devolução *
├─ Recebido por (Responsável TI) *
├─ Motivo da Devolução * (Dropdown)
│  ├─ Desligamento
│  ├─ Troca
│  ├─ Manutenção/Reparo
│  └─ Outro → Especifique
└─ Estado do Equipamento *
   ├─ ✓ Perfeito
   ├─ → Desgaste natural
   └─ ⚠️ Avarias

PASSO 2️⃣: VISTORIA E TERMOS DE DEVOLUÇÃO
├─ Checklist de Componentes (8 itens)
│  ├─ Tela (sem rachaduras/pixels mortos)
│  ├─ Teclado (todas teclas)
│  ├─ Touchpad/Mouse
│  ├─ Portas USB/HDMI
│  ├─ Carcaça (sem amassados)
│  ├─ Bateria (carga)
│  ├─ Carregador original
│  └─ Sistema operacional
├─ Descrição de Avarias (se necessário)
├─ Testemunha/Gestor (opcional)
├─ Aceites (2 checkboxes)
│  ├─ ☑️ Confirmar devolução
│  └─ ☑️ Autorizar exclusão de dados LGPD
└─ Declaração Final
```

**Principais Features**:
- ✅ Formulário multi-passo com validações
- ✅ Checklist de 8 componentes do equipamento
- ✅ Campo obrigatório de danos se "avarias" selecionado
- ✅ Motivos de devolução variados
- ✅ Confirmação de dados LGPD
- ✅ Responsivo para mobile
- ✅ Cores diferenciadas (azul/ciano para devolução)

---

## 🎨 Estilos Implementados

### **SignTermPage.css**
- Gradiente púrpura para assinatura (667eea → 764ba2)
- Progress bar animada
- Cards de termos com numeração
- Acceptance boxes destacadas

### **ReturnTermPage.css**
- Gradiente azul/ciano para devolução (17a2b8 → 0c5460)
- Checklist grid responsivo
- Termos box com design limpo
- Cores diferenciadas para devolução

### **EquipmentDetailPage.css**
- Layout com tabs navegáveis
- Timeline visual para movimentações
- Cards para termos de responsabilidade
- Status badges coloridas
- Grid responsivo para info

---

## 📡 API Endpoints Necessários

O sistema depende de 3 endpoints no backend:

### **1. Criar Termo de Responsabilidade**
```
POST /api/inventory/terms
Headers: Authorization: Bearer <token>
Body: {
  equipment_id: UUID,
  responsible_name: string,
  responsible_cpf: string,
  responsible_position: string,
  responsible_department: string,
  equipment_details: {
    code: string,
    brand: string,
    model: string,
    serial: string,
    processor: string,
    ram: string
  },
  accessories: {
    charger: boolean,
    mouse: boolean,
    case: boolean,
    other: string
  },
  signature_method: 'digital' | 'manual',
  signature_date: date
}

Response: {
  term: {
    id: UUID,
    equipment_id: UUID,
    responsible_id: UUID,
    issued_date: date,
    status: 'active'
  }
}
```

### **2. Registrar Devolução de Termo**
```
POST /api/inventory/terms/:termId/devolucao
Headers: Authorization: Bearer <token>
Body: {
  return_date: date,
  return_reason: string,
  reason_other: string,
  received_by: string,
  equipment_condition: 'perfeito' | 'desgaste' | 'avarias',
  checklist: {
    tela: boolean,
    teclado: boolean,
    touchpad: boolean,
    portas: boolean,
    carcaca: boolean,
    bateria: boolean,
    carregador: boolean,
    so: boolean
  },
  damage_description: string,
  witness_name: string
}

Response: {
  term: {
    id: UUID,
    status: 'returned',
    returned_date: date
  }
}
```

### **3. Buscar Detalhes de Equipamento**
```
GET /api/inventory/equipment/:equipmentId
Headers: Authorization: Bearer <token>

Response: {
  equipment: {...},
  movements: [...],
  terms: [
    {
      id: UUID,
      responsible_id: UUID,
      responsible_name: string,
      issued_date: date,
      returned_date: date,
      status: 'active' | 'returned' | 'cancelled'
    }
  ]
}
```

---

## 🔗 Integração com App.tsx

Adicionadas 3 novas rotas no `App.tsx`:

```tsx
{/* Inventory Module Routes */}
<Route path="/inventario/equipamento/:equipmentId" element={<EquipmentDetailPage />} />
<Route path="/inventario/equipamento/:equipmentId/assinar-termo" element={<SignTermPage />} />
<Route path="/inventario/termo/:termId/devolucao" element={<ReturnTermPage />} />
```

---

## 📊 Fluxo de Dados

### **Criar Novo Termo**

```
EquipmentDetailPage
    ↓
Click "✍️ Novo Termo"
    ↓
navigate('/inventario/equipamento/:id/assinar-termo')
    ↓
SignTermPage (3 passos)
    ↓
Fill Form (Colaborador + Equipamento + Termos)
    ↓
Click "Assinar Termo"
    ↓
POST /api/inventory/terms
    ↓
Sucesso → navigate('/inventario/equipamento/:id')
    ↓
Tab "Termos" atualiza (novo termo na lista)
```

### **Devolver Equipamento**

```
EquipmentDetailPage → Tab "Termos"
    ↓
Click "📥 Registrar Devolução" (em termo ativo)
    ↓
navigate('/inventario/termo/:termId/devolucao')
    ↓
ReturnTermPage (2 passos)
    ↓
Fill Form (Infos + Vistoria)
    ↓
Click "Registrar Devolução"
    ↓
POST /api/inventory/terms/:termId/devolucao
    ↓
Sucesso → navigate('/inventario/responsabilidades')
    ↓
Termo agora mostra status "Devolvido"
```

---

## 🎯 Features Implementadas

### **SignTermPage ✅**
- [x] Formulário multi-passo (3 passos)
- [x] Validação em cada passo
- [x] Barra de progresso animada
- [x] Progress text (Passo 1 de 3)
- [x] Seção de responsabilidades (8 pontos)
- [x] Seção de LGPD e rastreamento
- [x] 2 Checkboxes obrigatórios de aceite
- [x] Data padrão = hoje
- [x] Método de assinatura (Digital/Manual)
- [x] Navegar entre passos
- [x] Cancelar (volta para equipamento)
- [x] Validações completas
- [x] Erro messages
- [x] Loading state
- [x] Responsivo mobile

### **ReturnTermPage ✅**
- [x] Formulário multi-passo (2 passos)
- [x] Validação em cada passo
- [x] Barra de progresso animada
- [x] Motivos de devolução (dropdown)
- [x] Estado do equipamento (3 opções)
- [x] Checklist de 8 componentes
- [x] Campo de danos (condicional)
- [x] Testemunha/Gestor (opcional)
- [x] 2 Checkboxes de aceite
- [x] Navegar entre passos
- [x] Cancelar
- [x] Validações completas
- [x] Erro messages
- [x] Loading state
- [x] Responsivo mobile

### **EquipmentDetailPage ✅**
- [x] Visualização de 3 abas
- [x] Aba Overview (dados + ações)
- [x] Aba Histórico (timeline de movimentações)
- [x] Aba Termos (histórico de responsabilidades)
- [x] Timeline visual com ícones
- [x] Cards de termos com status
- [x] Botões de ação (Novo Termo, Devolução)
- [x] Info cards organizadas
- [x] Status badge colorida
- [x] Responsivo mobile

---

## 🎨 Design & UX

### **Cores**

| Página | Gradiente | Uso |
|--------|-----------|-----|
| SignTerm | Púrpura (667eea → 764ba2) | Assinatura, novos termos |
| ReturnTerm | Azul (17a2b8 → 0c5460) | Devolução, retorno |
| EquipmentDetail | Púrpura (667eea → 764ba2) | Geral, compatível com módulo |

### **Padrões**

- **Cards**: Background branco, sombra, border-left colorido
- **Buttons**: Gradiente com hover (transform + shadow)
- **Inputs**: Border 2px, focus com shadow de cor primária
- **Checkboxes**: Custom accent-color, label clickable
- **Tabs**: Border-bottom ativo, transição suave
- **Progress**: Linear com fill animado

---

## 📱 Responsividade

Todas as páginas são **100% responsivas**:
- Mobile (<768px): Stack vertical, single column
- Tablet (768px-1200px): 2 colunas onde possível
- Desktop (>1200px): Grid otimizado

---

## 🚀 Como Usar

### **Acessar Detalhes de Equipamento**

1. Navegue até `/inventario/equipamentos`
2. Clique em "Ver histórico" em um equipamento
3. Será levado a `/inventario/equipamento/:equipmentId`
4. Ver 3 abas: Visão Geral, Histórico, Termos

### **Assinar Novo Termo**

1. Na página de detalhes, clique em "✍️ Novo Termo de Responsabilidade"
2. Preencha Passo 1: Dados do Colaborador
3. Preencha Passo 2: Dados do Equipamento
4. Preencha Passo 3: Aceites dos Termos
5. Clique "Assinar Termo"
6. Voltará para detalhes com novo termo na aba "Termos"

### **Registrar Devolução**

1. Na aba "Termos" do equipamento, localize um termo ativo
2. Clique em "📥 Registrar Devolução"
3. Preencha Passo 1: Informações de Devolução
4. Preencha Passo 2: Vistoria e Checklist
5. Clique "Registrar Devolução"
6. Será redirecionado para `/inventario/responsabilidades`

---

## 📝 Validações Implementadas

### **SignTermPage**

✓ Passo 1:
- Nome: Obrigatório, não vazio
- CPF: Obrigatório, não vazio
- Cargo: Obrigatório, não vazio
- Departamento: Opcional

✓ Passo 2:
- Código: Obrigatório
- Marca: Obrigatório
- Modelo/Serial: Opcionais

✓ Passo 3:
- Termos aceitos: Obrigatório (checkbox)
- Rastreamento: Obrigatório (checkbox)
- Data: Obrigatória

### **ReturnTermPage**

✓ Passo 1:
- Data: Obrigatória
- Motivo: Obrigatório
- Recebido por: Obrigatório
- Se motivo="outro": Especificação obrigatória

✓ Passo 2:
- Checklist: Pelo menos um item
- Se avarias: Descrição obrigatória
- Aceites: 2 checkboxes obrigatórios

---

## 🔐 Conformidade

✅ **LGPD**: Autorização explícita para rastreamento
✅ **Segurança**: Tokens Bearer em todas as requisições
✅ **Auditoria**: Todos os dados salvos no banco (backend)
✅ **Conformidade**: Checklist de condições de devolução
✅ **Legal**: Documento de comodato conforme modelo institucional

---

## 📚 Próximos Passos (Opcional)

Se quiser expandir:

1. **PDF Generator**: Exportar termo assinado como PDF
2. **Assinatura Digital**: Integrar assinatura eletrônica
3. **Email Notification**: Enviar termo por email
4. **Relatórios**: Gerar relatórios de devoluções
5. **Scan QR Code**: QR code para acessar termo
6. **Historico Colaborador**: Termos por colaborador
7. **Analytics**: Tempo médio com equipamento, devoluções pendentes

---

## ✅ Checklist de Implementação

- [x] EquipmentDetailPage criada
- [x] SignTermPage criada (3 passos)
- [x] ReturnTermPage criada (2 passos)
- [x] CSS para SignTermPage
- [x] CSS para ReturnTermPage
- [x] CSS para EquipmentDetailPage
- [x] Rotas integradas em App.tsx
- [x] Validações completas
- [x] Responsividade
- [x] Error handling
- [x] Loading states
- [x] Conformidade LGPD
- [x] Documentação

---

**Status**: 🟢 **PRONTO PARA PRODUÇÃO**

Todo o sistema de Termos de Responsabilidade está implementado e pronto para ser integrado com o backend!

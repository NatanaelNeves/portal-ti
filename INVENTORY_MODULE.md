# 📦 Módulo de Inventário

## Visão Geral

O módulo de Inventário foi redesenhado para refletir como um gerenciador de TI realmente pensa sobre equipamentos. Em vez de uma única visão "ERP-like", o módulo oferece **4 contextos mentais diferentes**, cada um respondendo uma pergunta específica:

### As 4 Áreas do Módulo

#### 1. 👤 **Responsabilidades** ("Quem está com o quê?")
**Contexto**: Reunião com diretor, auditoria de compliance

Mostra um **notebook de responsabilidade** — equipamentos mapeados por pessoa. Cada linha é uma responsabilidade formal de alguém estar cuidando de um equipamento.

**Tabela**:
| Responsável | Setor | Equipamento | Código | Desde | Status | Ações |
|---|---|---|---|---|---|---|
| João Silva | T.I. | MacBook Pro 13" | NB-001 | 15/01/2024 | ✓ Em uso | Ver detalhes |

**Ações Rápidas**:
- Entregar equipamento (nova responsabilidade)
- Receber devolução (encerrar responsabilidade)
- Ver histórico completo do equipamento

#### 2. 🖥️ **Equipamentos** ("O que a instituição possui?")
**Contexto**: Planejamento, auditoria, seleção de máquina para tarefa

Mostra um **catálogo de estoque** — todos os equipamentos que a instituição tem, independente de quem está usando. Filtrável por status.

**Tabela**:
| Código | Tipo | Marca/Modelo | Status | Local | Data de Entrada | Ações |
|---|---|---|---|---|---|---|
| NB-001 | Notebook | MacBook Pro 13" | ✓ Em uso | Sala 201 | 15/01/2024 | Ver histórico |
| NB-002 | Notebook | Dell Inspiron | 📦 Em estoque | Almoxarifado | 20/01/2024 | Ver histórico |

**Filtros**:
- Todos
- Em uso
- Em estoque
- Em manutenção

#### 3. 🛒 **Compras & Solicitações** ("O que ainda não virou equipamento?")
**Contexto**: Rotina de compras, orçamento, previsão

Mostra **solicitações de compra** em andamento — do pedido até a chegada.

**Tabela**:
| Descrição | Qtd | Valor Estimado | Fornecedor | Previsão | Status | Ações |
|---|---|---|---|---|---|---|
| Monitor LG 24" UltraFine | 2 | R$ 2.400,00 | Compufácil | 10/02/2024 | Comprado | Detalhes |

**Statuses**:
- ⏳ Pendente
- ✓ Aprovado
- 📦 Comprado
- 📥 Recebido
- ✅ Concluído

#### 4. 📊 **Visão Geral** (Dashboard)
**Contexto**: Check-in rápido, status geral

Mostra **KPIs e cards de atenção**:
- Equipamentos em uso
- Equipamentos em estoque
- Equipamentos em manutenção
- Compras pendentes
- Equipamentos sem termos (⚠️ problema de compliance)
- Total de notebooks

## Banco de Dados

### Tabelas Principais

#### `inventory_equipment`
Registro central de todos os equipamentos.

```sql
CREATE TABLE inventory_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100) UNIQUE,
  physical_condition VARCHAR(50),
  current_status VARCHAR(50) DEFAULT 'in_stock',
  current_location VARCHAR(255),
  current_responsible_id UUID REFERENCES users(id),
  acquisition_date DATE,
  warranty_expiration DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `responsibility_terms`
Documentos formais de responsabilidade (quem está com o quê).

```sql
CREATE TABLE responsibility_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES inventory_equipment(id),
  responsible_id UUID REFERENCES users(id),
  issued_date DATE DEFAULT CURRENT_DATE,
  signed_date DATE,
  returned_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  signature_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `equipment_movements`
Histórico imutável de todas as movimentações.

```sql
CREATE TABLE equipment_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES inventory_equipment(id),
  movement_type VARCHAR(50) NOT NULL,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  reason TEXT,
  movement_date TIMESTAMP DEFAULT NOW(),
  registered_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `purchase_requisitions`
Rastreamento de compras desde solicitação até recebimento.

```sql
CREATE TABLE purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_description VARCHAR(255) NOT NULL,
  quantity INT,
  requested_by_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',
  estimated_value DECIMAL(10,2),
  actual_value DECIMAL(10,2),
  supplier VARCHAR(255),
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  received_by_id UUID REFERENCES users(id),
  becomes_equipment BOOLEAN DEFAULT FALSE,
  created_equipment_id UUID REFERENCES inventory_equipment(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API

### Base URL
```
/api/inventory
```

### Endpoints

#### Responsabilidades
```
GET /responsibilities
  Query params: ?status=in_use
  Response: { responsibilities: [...] }

GET /responsibilities/user/:userId
  Response: { responsibilities: [...] }
```

#### Equipamentos
```
GET /equipment
  Query params: ?status=in_stock&type=notebook
  Response: { equipment: [...], total: N }

GET /equipment/:equipmentId
  Response: {
    equipment: {...},
    movements: [...],
    currentTerm: {...},
    history: [...]
  }

POST /equipment
  Body: {
    internal_code, type, brand, model, serial_number,
    physical_condition, current_location, acquisition_date, warranty_expiration
  }
  Response: { equipment: {...} }
```

#### Compras
```
GET /purchases
  Query params: ?status=pending
  Response: { purchases: [...] }

POST /purchases
  Body: {
    item_description, quantity, estimated_value,
    supplier, expected_delivery_date
  }
  Response: { purchase: {...} }

PATCH /purchases/:purchaseId
  Body: { status, actual_value, received_by_id, created_equipment_id }
  Response: { purchase: {...} }
```

#### Movimentações
```
POST /movements
  Body: {
    equipment_id, movement_type, from_user_id, to_user_id,
    from_location, to_location, reason, registered_by_id
  }
  Response: { movement: {...} }
  
  movement_type: 'entrega' | 'devolução' | 'transferência' | 'manutenção' | 'baixa'
  Efeitos: Atualiza current_status e current_responsible_id automaticamente
```

#### Dashboard
```
GET /dashboard/summary
  Response: {
    summary: {
      equipmentInUse: N,
      equipmentInStock: N,
      equipmentInMaintenance: N,
      totalNotebooks: N,
      equipmentWithoutTerms: N,
      pendingPurchases: N
    }
  }
```

## Regras de Negócio

### Status de Equipamento
- **in_stock**: Equipamento em estoque, disponível
- **in_use**: Equipamento está com alguém (DEVE ter termo de responsabilidade ativo)
- **in_maintenance**: Equipamento em manutenção/reparo
- **lowered**: Equipamento removido do inventário (obsoleto, danificado)

### Responsabilidades
- Equipamento **in_use** DEVE ter um `responsibility_term` com status **active**
- Não pode haver dois termos ativos simultâneos para um equipamento
- Termos são imutáveis (histórico completo)

### Movimentações
- Cada movimento cria um registro imutável
- Movimentos atualizam automaticamente:
  - `current_status` do equipamento
  - `current_responsible_id` do equipamento
  - `current_location` do equipamento
- Movimentos nunca são deletados (auditoria completa)

### Compras
- Status workflow: pending → approved → purchased → received → completed
- Quando status = "received", pode-se criar um novo `inventory_equipment`
- Vinculo entre `purchase_requisition` e `inventory_equipment` fica em `created_equipment_id`

## Navegação

O módulo fica dentro da seção interna, acessível via:

```
Navigation → 📦 Inventário → [dropdown com 4 opções]
  ├─ 📊 Visão Geral (/inventario)
  ├─ 👤 Responsabilidades (/inventario/responsabilidades)
  ├─ 🖥️ Equipamentos (/inventario/equipamentos)
  └─ 🛒 Compras (/inventario/compras)
```

## Estilos

Cada página tem gradiente único:
- **Dashboard**: Azul ciano (4facfe → 00f2fe)
- **Responsabilidades**: Púrpura (667eea → 764ba2)
- **Equipamentos**: Púrpura (667eea → 764ba2)
- **Compras**: Rosa-vermelho (f093fb → f5576c)

Sidebar dark (2c3e50 → 34495e) com navegação ativa destacada.

## Próximos Passos

### Fases de Implementação

1. **Fase 1** ✅ - Páginas base e layouts
2. **Fase 2** - Detalhes e movimentações
   - Página de detalhes de equipamento (com histórico)
   - Diálogos de movimentação (entregar, devolver, transferir)
   - Formulário de novo equipamento
3. **Fase 3** - Termos e documentos
   - Assinatura de termos de responsabilidade
   - Geração de PDF
   - Histórico de termos
4. **Fase 4** - Reports e avançado
   - Relatórios de inventário
   - Exportação CSV/Excel
   - Busca avançada e filtros
   - Manutenção e service requests

## Desenvolvimento

### Componentes Criados
- `InventoryLayout.tsx` - Layout com sidebar de navegação
- `InventoryDashboardPage.tsx` - Visão geral (KPIs)
- `ResponsibilitiesPage.tsx` - Caderno de responsabilidades
- `EquipmentPage.tsx` - Catálogo de equipamentos
- `PurchasesPage.tsx` - Solicitações de compra

### Estilos Criados
- `InventoryLayout.css` - Sidebar e estrutura
- `InventoryDashboardPage.css` - Cards KPI
- `ResponsibilitiesPage.css` - Tabela de responsabilidades
- `EquipmentPage.css` - Tabela de equipamentos
- `PurchasesPage.css` - Tabela de compras

### Rotas Backend
- `/api/inventory/responsibilities`
- `/api/inventory/equipment`
- `/api/inventory/purchases`
- `/api/inventory/movements`
- `/api/inventory/dashboard/summary`

Veja `backend/src/routes/inventory.ts` para implementação completa.

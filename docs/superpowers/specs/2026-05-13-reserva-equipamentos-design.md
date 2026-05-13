# Reserva de Equipamentos — Design Spec (Fase 1)

**Data:** 2026-05-13  
**Status:** Aprovado  
**Escopo:** Fase 1 MVP — reservas, conflitos, calendário, status

---

## Contexto

O portal TI precisa de um módulo para gerenciar empréstimos de notebooks para aulas, treinamentos e eventos internos. Hoje os conflitos de horário são resolvidos informalmente, causando problemas operacionais. O módulo resolve isso com reservas por horário e validação automática de disponibilidade.

**Restrição principal:** usuários comuns NÃO devem ver quantidade real de equipamentos nem dados do inventário. O módulo opera com um "pool de reserva" configurado pelo admin, independente do inventário físico.

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Pool de quantidade | Fixo por tipo, admin-configurável | Protege dados do inventário real |
| Aprovação | Auto-aprova se pool disponível | Reduz trabalho manual do TI |
| Quem reserva | Todos: público (e-mail) + usuários internos | Atende aulas e eventos externos |
| Fluxo público | E-mail sem login, token UUID de rastreio | Padrão do portal (igual a chamados) |
| Tipos iniciais | Apenas Notebooks | Único tipo em uso no momento |
| Arquitetura | Módulo isolado + serviços existentes | Zero risco ao inventário, reutiliza PDF/QR/WS/email |

---

## Arquitetura

### Estratégia

Módulo standalone com tabelas próprias, sem acoplamento a `inventory_equipment`. Reutiliza serviços já existentes: `pdfService`, `qrcodeService`, `websocketService`, `emailService`, `schedulerService`.

### Banco de Dados

#### `equipment_types`
Pool de reserva por tipo de equipamento. Admin-gerenciado.

```sql
CREATE TABLE equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "Notebooks"
  description TEXT,
  max_quantity INTEGER NOT NULL,        -- pool disponível para reservas
  icon VARCHAR(50),                     -- emoji ou nome de ícone
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Seed inicial: `{ name: 'Notebooks', max_quantity: <admin configura>, icon: '💻' }`

#### `equipment_reservations`
Tabela principal de reservas.

```sql
CREATE TABLE equipment_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number VARCHAR(20) UNIQUE NOT NULL,  -- RES-2026-001
  equipment_type_id UUID NOT NULL REFERENCES equipment_types(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(200) NOT NULL,
  purpose TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending','approved','rejected','in_use','returned','cancelled')),

  -- Usuário público (sem login)
  requester_name VARCHAR(200),
  requester_email VARCHAR(200),
  requester_phone VARCHAR(50),
  access_token UUID UNIQUE,             -- token para acompanhamento sem login

  -- Usuário interno (nullable)
  internal_user_id UUID REFERENCES internal_users(id),

  -- Campos TI
  approved_by_id UUID REFERENCES internal_users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_end_after_start CHECK (end_time > start_time),
  CONSTRAINT chk_requester CHECK (
    requester_email IS NOT NULL OR internal_user_id IS NOT NULL
  )
);

CREATE INDEX idx_reservations_date ON equipment_reservations(date);
CREATE INDEX idx_reservations_type_date ON equipment_reservations(equipment_type_id, date);
CREATE INDEX idx_reservations_token ON equipment_reservations(access_token);
CREATE INDEX idx_reservations_status ON equipment_reservations(status);
```

#### `reservation_logs`
Auditoria de todas as ações.

```sql
CREATE TABLE reservation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES equipment_reservations(id),
  action VARCHAR(50) NOT NULL,          -- created, approved, rejected, cancelled, etc.
  performed_by_id UUID REFERENCES internal_users(id),
  performed_by_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Lógica de Conflito

Ao criar reserva para tipo X, quantidade Q, data D, horário T1–T2:

```sql
SELECT COALESCE(SUM(quantity), 0) AS reserved_qty
FROM equipment_reservations
WHERE equipment_type_id = $1
  AND date = $2
  AND status IN ('approved', 'in_use')
  AND start_time < $4   -- end_time da nova reserva
  AND end_time > $3;    -- start_time da nova reserva
```

- Se `reserved_qty + Q <= max_quantity` → cria com `status = 'approved'`
- Se exceder → retorna 409 com mensagem: `"Apenas X equipamentos disponíveis para este horário."`
- Se pool = 0 → `"Sem disponibilidade para este horário."`

### Geração de Número

Formato `RES-YYYY-NNN` (sequencial por ano), mesmo padrão de `MOV-YEAR-NNNNNN` em `inventory.ts`.

---

## Backend

**Arquivo:** `backend/src/routes/reservations.ts`  
**Registro:** `backend/src/index.ts` → `app.use('/api/reservations', reservationsRouter)`  
**Migração:** `backend/migrations/017_equipment_reservations.sql`

### Endpoints

#### Públicos (sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/reservations/types` | Lista tipos ativos (sem `max_quantity`) |
| `GET` | `/api/reservations/availability` | Verifica disponibilidade `?type_id&date&start_time&end_time` |
| `POST` | `/api/reservations` | Cria reserva (público ou interno) |
| `GET` | `/api/reservations/public/:token` | Acompanha reserva por token |

#### Usuário interno autenticado

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/reservations/my` | Minhas reservas |
| `GET` | `/api/reservations/:id` | Detalhe da reserva |
| `PATCH` | `/api/reservations/:id/cancel` | Cancelar própria reserva |

#### TI / Admin (`it_staff`, `admin`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/reservations` | Todas reservas (filtros: date, status, type_id) |
| `PATCH` | `/api/reservations/:id/approve` | Aprovar manualmente |
| `PATCH` | `/api/reservations/:id/reject` | Recusar com motivo |

#### Admin — Tipos de equipamento

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/reservations/equipment-types` | Listar tipos |
| `POST` | `/api/reservations/equipment-types` | Criar tipo |
| `PATCH` | `/api/reservations/equipment-types/:id` | Atualizar (incl. max_quantity) |
| `DELETE` | `/api/reservations/equipment-types/:id` | Desativar tipo |

### Permissões (em `authorization.ts`)

```typescript
'reservations:manage': [UserRole.IT_STAFF, UserRole.ADMIN],
'reservations:types:manage': [UserRole.ADMIN],
```

### Notificações

Ao criar reserva: email para `requester_email` com número da reserva e link de acompanhamento (`/reservar/acompanhar/:token` para público, `/reservas/:id` para internos). Via `emailService` existente.

WebSocket: ao aprovar/recusar manualmente, notifica usuário interno via `websocketService.notifyUser()`.

---

## Frontend

### Rotas

```
/reservar                          → ReservationPublicPage       (pública)
/reservar/acompanhar/:token        → ReservationTrackingPage     (pública)
/reservas                          → MyReservationsPage          (todos internos)
/reservas/nova                     → CreateReservationPage       (todos internos)
/admin/reservas                    → AdminReservationsPage       (it_staff, admin)
/admin/reservas/:id                → AdminReservationDetailPage  (it_staff, admin)
/admin/reservas/tipos              → AdminEquipmentTypesPage     (admin)
```

### Navegação

- Nav pública: item `"Reservar Equipamentos"` → `/reservar`
- Nav interna: item `"Reservas"` visível para todos os roles internos → `/reservas`
- `AdminDashboardPage`: card de acesso rápido → `/admin/reservas`

**Arquivos a modificar:**
- `frontend/src/components/Navigation.tsx` — adicionar itens
- `frontend/src/App.tsx` — registrar rotas

### Novos Arquivos Frontend

```
frontend/src/pages/ReservationPublicPage.tsx
frontend/src/pages/ReservationTrackingPage.tsx
frontend/src/pages/MyReservationsPage.tsx
frontend/src/pages/CreateReservationPage.tsx
frontend/src/pages/AdminReservationsPage.tsx
frontend/src/pages/AdminReservationDetailPage.tsx
frontend/src/pages/AdminEquipmentTypesPage.tsx
frontend/src/services/reservationService.ts
frontend/src/styles/ReservationPublicPage.css
frontend/src/styles/ReservationTrackingPage.css
frontend/src/styles/MyReservationsPage.css
frontend/src/styles/AdminReservationsPage.css
frontend/src/styles/AdminEquipmentTypesPage.css
```

### Formulário Público (`ReservationPublicPage`)

1. Selector de tipo de equipamento (chips — busca de `/api/reservations/types`)
2. Campo de quantidade
3. Data + hora início + hora fim
4. Verificador de disponibilidade em tempo real (debounce 500ms → `/api/reservations/availability`)
5. Indicador verde/amarelo/vermelho de disponibilidade
6. Local e finalidade
7. Dados do solicitante: nome, e-mail, telefone (público) OU exibe nome do usuário logado (interno)
8. Botão "Confirmar Reserva" → POST → mostra número e link de acompanhamento

### Painel TI (`AdminReservationsPage`)

**Layout:** calendário mensal (esquerda) + mini status cards (topo) + lista do dia (direita/baixo)

**Mini status cards:**
- Em uso agora
- Reservas hoje
- Próximos 7 dias
- Conflitos evitados (reservas rejeitadas por lotação)

**Calendário:**
- Navegação mês anterior/próximo
- Hoje destacado
- Pontos coloridos nos dias com reservas: verde (disponível), amarelo (parcial ≥50%), vermelho (lotado)
- Clicar no dia → filtra lista de reservas para aquele dia

**Lista de reservas:**
- Card por reserva: horário, tipo, quantidade, local, solicitante, badge de status colorido
- Ações rápidas: Aprovar / Recusar (inline nos cards pendentes)

### Design System

Seguir padrão existente: CSS variables `--verde-nazareno`, `--laranja-acolhedor`, `--azul-sereno`, `--sombra-card`, `--border-radius`. Um arquivo CSS por página. Sem bibliotecas UI externas.

---

## Fluxo de Status

```
Criação com pool disponível  → approved  (automático)
Criação sem pool             → rejeitada na criação (HTTP 409, não salva)
approved                     → cancelled  (pelo solicitante ou TI)
approved                     → in_use     (Fase 2: check-in TI)
in_use                       → returned   (Fase 2: check-out TI)
TI pode aprovar/recusar      → approved / rejected (ação manual, ex: reservas que ficaram pendentes)
```

---

## Verificação (como testar)

1. **Migração:** `npm run migrate` no backend — tabelas criadas sem erro
2. **Seed:** criar tipo "Notebooks" com `max_quantity = 20` via `POST /api/reservations/equipment-types`
3. **Reserva pública:** acessar `/reservar`, criar reserva de 10 notebooks, verificar e-mail + token
4. **Conflito:** criar segunda reserva de 15 notebooks no mesmo horário → deve bloquear ("Apenas 10 disponíveis")
5. **Calendário:** acessar `/admin/reservas`, verificar ponto colorido no dia com reservas
6. **Clique no dia:** lista deve filtrar para reservas do dia selecionado
7. **Acompanhamento público:** acessar `/reservar/acompanhar/:token` com token recebido

---

## Fora do Escopo (Fase 1)

- Check-in / check-out físico (Fase 2)
- Geração de PDF de reserva (Fase 2)
- QR Code de reserva (Fase 2)
- Assinatura digital (Fase 2)
- Dashboard analytics avançado (Fase 3)
- Integração com `inventory_equipment` (decisão: mantida separada indefinidamente)

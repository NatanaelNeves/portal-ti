# Reserva de Equipamentos — Design Spec (Fase 1)

**Data:** 2026-05-13  
**Status:** Aprovado  
**Escopo:** Fase 1 MVP — reservas, conflitos, calendário, status

---

## Contexto

O portal TI precisa de um módulo para gerenciar empréstimos de notebooks para aulas, treinamentos e eventos internos. Hoje os conflitos de horário são resolvidos informalmente, causando problemas operacionais. O módulo resolve isso com reservas por horário, validação automática de disponibilidade e buffer de tempo entre reservas.

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
| Buffer entre reservas | `buffer_minutes` por tipo (default 30 min) | Tempo de devolução, conferência e transporte |
| Antecedência mínima | 30 min antes do início | TI precisa de tempo para separar |
| Design | Mobile first | Uso predominante via celular |

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
  buffer_minutes INTEGER NOT NULL DEFAULT 30,  -- tempo de buffer entre reservas
  icon VARCHAR(50),                     -- emoji ou nome de ícone
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Seed inicial: `{ name: 'Notebooks', max_quantity: <admin configura>, buffer_minutes: 30, icon: '💻' }`

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
    CHECK (status IN (
      'pending', 'approved', 'rejected',
      'ready',                              -- TI separou os equipamentos
      'in_use', 'returned',
      'no_show',                            -- solicitante não apareceu
      'cancelled'
    )),

  -- Recorrência (placeholder Fase 2)
  recurrence_group_id UUID NULL,

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
CREATE INDEX idx_reservations_recurrence ON equipment_reservations(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;
```

#### `reservation_logs`
Auditoria de todas as ações.

```sql
CREATE TABLE reservation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES equipment_reservations(id),
  action VARCHAR(50) NOT NULL,          -- created, approved, rejected, cancelled, no_show, etc.
  performed_by_id UUID REFERENCES internal_users(id),
  performed_by_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Lógica de Conflito (com buffer)

Ao criar reserva para tipo X, quantidade Q, data D, horário T1–T2:

```sql
SELECT COALESCE(SUM(er.quantity), 0) AS reserved_qty
FROM equipment_reservations er
JOIN equipment_types et ON et.id = er.equipment_type_id
WHERE er.equipment_type_id = $1
  AND er.date = $2
  AND er.status IN ('approved', 'ready', 'in_use')
  AND er.start_time < ($4::time + (et.buffer_minutes || ' minutes')::interval)
  AND er.end_time   > ($3::time - (et.buffer_minutes || ' minutes')::interval);
```

- Se `reserved_qty + Q <= max_quantity` → cria com `status = 'approved'`
- Se exceder → retorna 409 com `{ available: false, reason: 'conflict' | 'buffer', remaining: N, next_available: 'HH:MM' }`
  - `reason: 'buffer'` → mensagem: `"Indisponível devido ao tempo de preparação/devolução (30min). Próximo horário disponível: 12:30."`
  - `reason: 'conflict'` → `"Apenas X equipamentos disponíveis para este horário."`
- Se pool = 0 → `"Sem disponibilidade para este horário."`

**Cálculo de `next_available`:** após encontrar conflito, o backend itera em slots de 15min a partir de `end_time` para encontrar o primeiro horário livre para a quantidade solicitada.

**Endpoint de disponibilidade** retorna `{ available: boolean, remaining: number, next_available?: string }` — sem expor `max_quantity`.

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
| `GET` | `/api/reservations/availability` | Verifica disponibilidade `?type_id&date&start_time&end_time` → `{ available, remaining }` |
| `POST` | `/api/reservations` | Cria reserva (público ou interno) |
| `GET` | `/api/reservations/public/:token` | Acompanha reserva por token |
| `GET` | `/api/reservations/public/:token/ics` | Exporta `.ics` para Google/Outlook/Apple Calendar |

#### Usuário interno autenticado

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/reservations/my` | Minhas reservas |
| `GET` | `/api/reservations/:id` | Detalhe da reserva |
| `GET` | `/api/reservations/:id/ics` | Exporta `.ics` |
| `PATCH` | `/api/reservations/:id/cancel` | Cancelar própria reserva |

#### TI / Admin (`it_staff`, `admin`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/reservations` | Todas reservas (filtros: `date_filter=today\|tomorrow\|week\|month`, `status`, `type_id`) |
| `GET` | `/api/reservations/active-now` | Equipamentos em uso agora + próxima devolução |
| `GET` | `/api/reservations/export/csv` | Exporta CSV com mesmos filtros |
| `PATCH` | `/api/reservations/:id/approve` | Aprovar manualmente |
| `PATCH` | `/api/reservations/:id/reject` | Recusar com motivo |
| `PATCH` | `/api/reservations/:id/ready` | Marcar como "equipamentos separados" |
| `PATCH` | `/api/reservations/:id/no-show` | Marcar no-show |

#### Admin — Tipos de equipamento

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/reservations/equipment-types` | Listar tipos |
| `POST` | `/api/reservations/equipment-types` | Criar tipo |
| `PATCH` | `/api/reservations/equipment-types/:id` | Atualizar (incl. `max_quantity`, `buffer_minutes`) |
| `DELETE` | `/api/reservations/equipment-types/:id` | Desativar tipo |

### Validação de Antecedência Mínima

Backend e frontend validam:
```
(date + start_time) >= NOW() + 30 minutos
```
Se não atender → retorna 400: `"Reservas devem ser criadas com no mínimo 30 minutos de antecedência."`

Frontend desabilita horários passados e horários dentro dos próximos 30min no seletor de hora.

### Exportação ICS

Gera arquivo `.ics` válido para importar no Google Calendar, Outlook e Apple Calendar.

```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260520T080000
DTEND:20260520T120000
SUMMARY:Reserva RES-2026-042 — Notebooks × 15
LOCATION:Lab de Informática — Bloco B
DESCRIPTION:Aula de informática para turma do 9º ano
END:VEVENT
END:VCALENDAR
```

Endpoint retorna `Content-Type: text/calendar` com `Content-Disposition: attachment; filename="reserva-RES-2026-042.ics"`.

### Permissões (em `authorization.ts`)

```typescript
'reservations:manage': [UserRole.IT_STAFF, UserRole.ADMIN],
'reservations:types:manage': [UserRole.ADMIN],
```

### Notificações Automáticas (via `schedulerService`)

4 jobs adicionados ao `schedulerService.ts` existente:

| Job | Quando | Canal | Conteúdo |
|---|---|---|---|
| Confirmação | Na criação | Email | Número, horário, local, botão "Acompanhar" + link ICS |
| Lembrete 24h | Cron diário 08:00 | Email | "Sua reserva é amanhã" + detalhes |
| Lembrete 1h | Cron a cada hora | Email | "Sua reserva começa em 1 hora" |
| Auto no-show | Cron a cada hora | Sistema | Se `approved` e `start_time + 1h` passou sem virar `ready`/`in_use` → marca `no_show` + notifica TI |

Crons adicionados no `schedulerService`:
- `0 8 * * *` → lembrete 24h
- `0 * * * *` → lembrete 1h + verificação auto no-show

WebSocket: ao aprovar/recusar/marcar-ready manualmente, notifica usuário interno via `websocketService.notifyUser()`.

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

### Formulário Público (`ReservationPublicPage`) — Mobile First

Design focado em tela pequena, poucos campos, rápido de preencher.

1. Selector de tipo (chips — busca `/api/reservations/types`)
2. Campo quantidade
3. Data + hora início + hora fim
4. Verificador disponibilidade em tempo real (debounce 500ms → `/api/reservations/availability`)
5. Indicador de capacidade: 🟢 Disponível / 🟡 Parcialmente ocupado / 🔴 Lotado
6. Local e finalidade
7. Dados: nome, e-mail, telefone (público) — ou nome do usuário logado (interno)
8. Botão "Confirmar Reserva" → mostra número, link de acompanhamento e botão "Adicionar ao Calendário" (ICS)

### Painel TI (`AdminReservationsPage`)

**Layout:** mini status cards (topo) + calendário mensal (centro-esquerda) + lista do dia (direita/baixo)

**Mini status cards:**
- Em uso agora
- Reservas hoje
- Próximos 7 dias
- No-shows acumulados (métrica de desperdício)

**Calendário mensal:**
- Navegação mês anterior/próximo
- Hoje destacado
- Pontos coloridos nos dias: 🟢 disponível / 🟡 parcial (≥50% do pool ocupado) / 🔴 lotado
- Hover no dia → tooltip com "X reservas / Y notebooks ocupados"
- Clicar no dia → filtra lista + abre visão do dia

**Visão diária (ao clicar no dia):**
- Blocos por horário estilo Google Calendar
- Cada bloco: solicitante, quantidade, local, status colorido
- Visualiza gaps e buffer entre blocos

**Lista de reservas:**
- Card por reserva: horário, tipo, quantidade, local, solicitante, badge status
- Ações rápidas inline: Aprovar / Recusar / Marcar Pronto / Marcar No-show

### Indicadores de Capacidade (sem expor números)

Regra de cor baseada em `remaining / max_quantity` (calculado no backend, exposto apenas como status):
- 🟢 **Disponível:** > 50% do pool livre
- 🟡 **Parcialmente ocupado:** 1–50% livre
- 🔴 **Lotado:** 0% livre

### Filtros de Data (Painel TI)

Tabs/pills rápidos no topo da lista:
`Hoje` | `Amanhã` | `Esta Semana` | `Este Mês` | `Todos`

Mapeia para o parâmetro `date_filter` na API.

### Exportação CSV

Botão "Exportar CSV" no painel TI. Exporta todas as reservas com os filtros ativos. Campos: número, tipo, quantidade, data, horário, local, finalidade, solicitante, e-mail, status, criado em.

Usa `excelExportService.ts` existente (já tem padrão de exportação no projeto).

### Cores de Status Padronizadas

Definidas em CSS variables e reutilizadas em todos os badges/cards:

| Status | Cor | Hex |
|---|---|---|
| `pending` | Amarelo | `#F59E0B` |
| `approved` | Azul | `#4A90E2` |
| `ready` | Roxo | `#8B5CF6` |
| `in_use` | Verde | `#007A33` |
| `returned` | Cinza | `#6B7280` |
| `cancelled` | Vermelho | `#EF4444` |
| `no_show` | Laranja | `#F28C38` |
| `rejected` | Vermelho escuro | `#B91C1C` |

### Definição Operacional de "ready"

Status `ready` significa: **TI separou os notebooks, carregou as baterias, verificou o funcionamento e os equipamentos estão no local informado aguardando retirada.**

Ação TI: clica "Marcar como Pronto" → sistema notifica solicitante: "Seus equipamentos estão prontos para retirada em [local]."

### Animações e UX

- Hover em cards: `transform: translateY(-2px)` + `box-shadow` suave (150ms ease)
- Fade-in em listas: `opacity 0 → 1` ao carregar (200ms)
- Skeleton loading nos cards do calendário enquanto carrega
- Transição suave ao trocar dia no calendário (fade 150ms)
- Tooltip no indicador de disponibilidade mostrando `next_available` quando bloqueado

### "Em Uso Agora" — Card Operacional

Card de destaque no painel TI, atualizado em tempo real via WebSocket:

```
💻 12 notebooks em uso agora
   Próxima devolução: 15:00 (Sala A)
```

Endpoint: `GET /api/reservations/active-now` → `{ count: 12, type: 'Notebooks', next_return: { time, location } }`

### Design System

Mobile first. CSS variables `--verde-nazareno`, `--laranja-acolhedor`, `--azul-sereno`, `--sombra-card`, `--border-radius`. Um arquivo CSS por página. Sem bibliotecas UI externas.

---

## Fluxo de Status

```
Criação com pool disponível  → approved   (automático)
Criação sem pool             → HTTP 409    (não salva)
approved                     → ready       (TI separou equipamentos fisicamente)
approved / ready             → cancelled   (solicitante ou TI)
approved / ready             → no_show     (TI marca: solicitante não apareceu)
ready                        → in_use      (Fase 2: check-in TI)
in_use                       → returned    (Fase 2: check-out TI)
TI pode aprovar/recusar      → approved / rejected (ação manual)
```

---

## Verificação (como testar)

1. **Migração:** `npm run migrate` → tabelas criadas sem erro
2. **Seed:** criar tipo "Notebooks" `max_quantity=20, buffer_minutes=30`
3. **Antecedência:** tentar criar reserva para daqui a 10min → deve bloquear
4. **Reserva pública:** `/reservar` → criar 10 notebooks → verificar e-mail + token + botão ICS
5. **Buffer tooltip:** criar reserva 08:00–10:00; tentar criar 10:00–12:00 → mensagem com `next_available: 10:30`
6. **Buffer válido:** criar 10:30–12:00 → deve aprovar
7. **Conflito quantidade:** criar 15 notebooks no mesmo horário válido → "Apenas 10 disponíveis"
8. **Filtros data:** testar pills Hoje/Amanhã/Semana/Mês no painel TI
9. **Calendário:** ponto colorido no dia → clicar → lista filtrada + visão diária com blocos
10. **Em uso agora:** card mostra contagem correta em tempo real
11. **Lembrete email:** forçar cron → verificar envio de 24h e 1h
12. **Auto no-show:** simular `start_time + 1h` passado sem check-in → status vira `no_show`
13. **ICS:** baixar `.ics` → importar no Google Calendar → evento criado
14. **CSV:** exportar com filtro "Hoje" → verificar colunas e dados
15. **Cores:** verificar badge de cada status com a cor correta

---

## Fora do Escopo (Fase 1)

- Check-in / check-out físico (Fase 2)
- Geração de PDF de reserva (Fase 2)
- QR Code de reserva (Fase 2)
- Assinatura digital (Fase 2)
- Reserva recorrente — campo `recurrence_group_id` existe mas sem UI (Fase 2)
- Dashboard analytics avançado (Fase 3)
- Integração com `inventory_equipment` (mantida separada indefinidamente)

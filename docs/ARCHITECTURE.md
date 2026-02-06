# Diagrama de Arquitetura

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                     │
├─────────────────────────────────────────────────────────────┤
│  Pages          Components         Stores                    │
│  - Login        - Navigation      - Auth                     │
│  - Dashboard    - ProtectedRoute  - Tickets                  │
│  - Tickets      - Forms           - Assets                   │
│  - Assets       - Cards                                      │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP/REST (axios)
               │ localStorage → JWT Token
               │
┌──────────────▼──────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)               │
├──────────────────────────────────────────────────────────────┤
│  Routes → Middleware (Auth) → Controllers/Services           │
│                                                              │
│  /api/auth        /api/tickets        /api/assets            │
│  - login          - create            - create              │
│  - register       - getAll            - getByStatus         │
│  - me             - getByUser         - updateStatus        │
│                   - updateStatus      - assign              │
│                   - assign                                   │
│                                                              │
│  Models (Data Layer)                                         │
│  - User           - Ticket            - Asset               │
│  - Department     - TicketHistory     - AssetMovement       │
│                   - PurchaseRequest   - KnowledgeArticle    │
└──────────────┬───────────────────────────────────────────────┘
               │ SQL (pg driver)
               │
┌──────────────▼───────────────────────────────────────────────┐
│              PostgreSQL Database                              │
├──────────────────────────────────────────────────────────────┤
│  Tables:                                                     │
│  - users                    - assets                         │
│  - departments              - asset_movements                │
│  - tickets                  - purchase_requests              │
│  - ticket_history           - knowledge_articles             │
└──────────────────────────────────────────────────────────────┘
```

## Modelo de Dados

### Users (Usuários)
```
id UUID (PK)
email VARCHAR UNIQUE
name VARCHAR
password_hash VARCHAR
role ENUM (final_user, it_staff, manager, admin)
department_id UUID (FK)
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Tickets (Chamados)
```
id UUID (PK)
title VARCHAR
description TEXT
type ENUM (incident, request, change, problem)
priority ENUM (low, medium, high, critical)
status ENUM (open, in_progress, waiting, resolved, closed, cancelled)
requester_id UUID (FK → users)
assigned_to_id UUID (FK → users)
department_id UUID (FK → departments)
resolved_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Assets (Ativos)
```
id UUID (PK)
name VARCHAR
asset_type VARCHAR
serial_number VARCHAR UNIQUE
manufacturer VARCHAR
model VARCHAR
status ENUM (available, in_use, maintenance, retired)
assigned_to_id UUID (FK → users)
department_id UUID (FK → departments)
location VARCHAR
acquisition_date DATE
warranty_expiration DATE
notes TEXT
is_deleted BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

### AssetMovements (Movimentações)
```
id UUID (PK)
asset_id UUID (FK → assets)
movement_type ENUM (entry, exit, transfer, maintenance, retirement)
from_user_id UUID (FK → users)
to_user_id UUID (FK → users)
from_department_id UUID (FK → departments)
to_department_id UUID (FK → departments)
description TEXT
document_id UUID
responsible_id UUID (FK → users)
movement_date DATE
created_at TIMESTAMP
```

## Fluxo de Autenticação

```
1. Usuário faz login
   POST /api/auth/login { email, password }

2. Backend valida credenciais
   - Busca usuário por email
   - Compara password_hash com bcrypt

3. Retorna JWT Token + User Data
   { token: "eyJ...", user: { id, name, role, ... } }

4. Frontend armazena token no localStorage
   localStorage.setItem('token', token)

5. Requisições subsequentes incluem token
   Authorization: Bearer <token>

6. Middleware verifica token
   - Decodifica JWT
   - Valida assinatura
   - Extrai dados do usuário

7. Controle de acesso por papel
   - Verifica user.role
   - Permite/nega acesso à rota
```

## Fluxo de Chamado

```
┌─────────────────────────────────────┐
│  Usuário Final cria Chamado         │
│  (Portal Público)                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  POST /api/tickets                       │
│  {                                       │
│    title, description, type, priority    │
│  }                                       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Sistema cria registro em tickets        │
│  status = 'open'                         │
│  Registra em ticket_history              │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Equipe de TI visualiza e gerencia       │
│  - Atualiza status                       │
│  - Atribui para técnico                  │
│  - Registra histórico de ações           │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Chamado é resolvido/fechado             │
│  resolved_at = timestamp                 │
│  Histórico completo fica registrado      │
└──────────────────────────────────────────┘
```

## Fluxo de Asset

```
┌────────────────────────────┐
│  Novo ativo é registrado   │
│  (Status: available)       │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  Atribuído a usuário       │
│  (Status: in_use)          │
│  Movimento registrado      │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  Transferido para outro    │
│  usuário/departamento      │
│  (Status: in_use)          │
│  Novo movimento registrado │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  Enviado para manutenção   │
│  (Status: maintenance)     │
│  Movimento registrado      │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  Baixado do sistema        │
│  (Status: retired)         │
│  Não aparece em listagens  │
│  Histórico preservado      │
└────────────────────────────┘
```

## Segurança

- Senhas: bcryptjs com 10 salts
- Tokens: JWT com assinatura HS256
- CORS: Configurável por domínio
- Validação: Middleware em todas rotas autenticadas
- SQL: Prepared statements (pg driver)

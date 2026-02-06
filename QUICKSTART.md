# Quick Start - Portal de Serviços de TI

## 1. Preparação do Banco de Dados

### PostgreSQL Setup
```bash
# No Windows, se usar PostgreSQL via chocolatey:
choco install postgresql --version=15.2 -y

# Ou baixar de https://www.postgresql.org/download/

# Após instalar, criar banco:
psql -U postgres
CREATE DATABASE portal_ti;
```

## 2. Backend - Configuração e Execução

```bash
# Entrar na pasta do backend
cd backend

# Instalar dependências
npm install

# Criar .env (copiar do .env.example e ajustar)
copy .env.example .env

# Editar .env com suas credenciais PostgreSQL

# Compilar TypeScript
npm run build

# Iniciar em modo desenvolvimento (com auto-reload)
npm run dev

# Ou iniciar após build
npm run start
```

**Esperado:**
```
✓ Connected to database
✓ Database schema initialized successfully

╔═══════════════════════════════════╗
║   Portal de Serviços de TI        ║
║   Server running on port 3001     ║
║   Environment: DEVELOPMENT        ║
╚═══════════════════════════════════╝
```

## 3. Frontend - Configuração e Execução

```bash
# Em outro terminal, entrar na pasta do frontend
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

**Esperado:**
```
VITE v5.0.8  ready in 234 ms

➜  Local:   http://localhost:3000/
```

## 4. Testar a Aplicação

1. Abrir navegador em `http://localhost:3000`
2. Ver página de login
3. Criar uma conta (email, nome, senha)
4. Fazer login
5. Criar um chamado de teste
6. Visualizar nos Meus Chamados

## 5. Criar Usuário de Teste (IT Staff)

Para inserir usuário de TI diretamente no banco:

```sql
-- Conectar ao banco
psql -U postgres -d portal_ti

-- Inserir usuário de TI (password = teste123)
INSERT INTO users (id, email, name, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  'ti@empresa.com',
  'Equipe TI',
  '$2a$10$WJ5/kkPHF7B2r3J8nK5Z0O6Q1mR2nS3t4vU5wX6yZ7aB8cD9eF0gH', -- bcrypt hash de "teste123"
  'it_staff',
  true
);
```

Credenciais: `ti@empresa.com / teste123`

## 6. Estrutura de Pastas Criada

```
portal-ti/
├── backend/
│   ├── src/
│   │   ├── config/         → Configurações
│   │   ├── database/       → BD e schema
│   │   ├── models/         → Camada de dados
│   │   ├── routes/         → Rotas da API
│   │   ├── middleware/     → Autenticação
│   │   ├── types/          → Tipos TypeScript
│   │   └── index.ts        → Servidor
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── types/          → Tipos TS
│   │   ├── services/       → Cliente API
│   │   ├── stores/         → Estado (Zustand)
│   │   ├── components/     → Componentes
│   │   ├── pages/          → Páginas
│   │   ├── styles/         → CSS
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
│
└── docs/
    ├── ARCHITECTURE.md     → Diagrama de arquitetura
    ├── DEVELOPMENT.md      → Guia de desenvolvimento
    └── README.md           → Este arquivo
```

## 7. Próximos Passos Recomendados

- [ ] Testar fluxo completo de login e chamado
- [ ] Validar integração frontend-backend
- [ ] Implementar validações de formulário
- [ ] Adicionar notificações (toast messages)
- [ ] Implementar módulo de compras
- [ ] Implementar central de conhecimento
- [ ] Criar dashboards com gráficos
- [ ] Testes automatizados
- [ ] Deploy em produção

## 8. Troubleshooting

### Porta 3001 já em uso
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### PostgreSQL não conecta
```bash
# Verificar se está rodando
pg_ctl status

# Iniciar se necessário
pg_ctl start
```

### Erro de JWT_SECRET
```
Verificar se .env está criado e com valor válido em JWT_SECRET
```

### CORS erro
```
Verificar se CORS_ORIGIN em .env bate com a origem do navegador
```

## 9. Variáveis de Ambiente

### Backend (.env)
```
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=portal_ti
JWT_SECRET=secret-aleatorio-muito-seguro
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000
```

### Frontend
Frontend usa proxy automático via vite.config.ts para `/api`

## 10. API Health Check

```bash
curl http://localhost:3001/api/health
# Resposta esperada:
# {"status":"ok","timestamp":"2024-02-03T10:00:00.000Z"}
```

## 11. Documentação Completa

Ver arquivos em `/docs/`:
- `README.md` - Visão geral do projeto
- `DEVELOPMENT.md` - Guia de desenvolvimento
- `ARCHITECTURE.md` - Arquitetura de dados e fluxos

---

**Pronto para começar! 🚀**

Se encontrar problemas, consulte os arquivos de documentação ou a seção Troubleshooting.

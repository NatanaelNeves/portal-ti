# Guia de Desenvolvimento

## Setup do Ambiente

### 1. Instalar Dependências

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configurar PostgreSQL

```bash
# Criar banco de dados
createdb portal_ti

# Ou usar GUI tool como pgAdmin
```

### 3. Configurar Variáveis de Ambiente

**Backend** - criar arquivo `.env`:
```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=portal_ti

JWT_SECRET=seu-secret-key-super-secreto
JWT_EXPIRATION=7d

CORS_ORIGIN=http://localhost:3000
```

## Desenvolvimento

### Iniciar Backend

```bash
cd backend
npm run dev
```

Servidor rodará em `http://localhost:3001`

### Iniciar Frontend

```bash
cd frontend
npm run dev
```

Aplicação rodará em `http://localhost:3000`

## Build para Produção

### Backend

```bash
cd backend
npm run build
npm run start
```

### Frontend

```bash
cd frontend
npm run build
```

Os arquivos estáticos estarão em `dist/`

## Estrutura de Tipos

### Backend (TypeScript)

Todos os modelos devem estender de interfaces bem definidas:

```typescript
// models/User.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Frontend (TypeScript)

Importar tipos de `src/types/index.ts`:

```typescript
import { User, Ticket, Asset } from '../types';
```

## Padrões de Código

### Services

Services encapsulam chamadas à API:

```typescript
// services/ticketService.ts
export const ticketService = {
  create: async (title, description) => {
    const response = await api.post('/tickets', { title, description });
    return response.data;
  },
};
```

### Stores (Zustand)

Gerenciar estado global:

```typescript
export const useTicketStore = create((set) => ({
  tickets: [],
  load: async () => {
    // ...
    set({ tickets: data });
  },
}));
```

### Components

Componentes React devem ser funcionais:

```typescript
export default function MyComponent() {
  const [state, setState] = useState();
  
  return <div>{state}</div>;
}
```

## API Request/Response

### Padrão de Requisição

```typescript
const response = await api.post('/tickets', {
  title: 'Novo chamado',
  description: 'Descrição',
});
```

### Padrão de Resposta

```json
{
  "id": "uuid",
  "title": "Novo chamado",
  "status": "open",
  "createdAt": "2024-02-03T10:00:00Z"
}
```

### Tratamento de Erros

```typescript
try {
  const data = await ticketService.create(title, description);
  // sucesso
} catch (error) {
  const message = error.response?.data?.error || 'Erro desconhecido';
  setError(message);
}
```

## Testes

### Backend (a implementar)

```bash
npm test
```

### Frontend (a implementar)

```bash
npm test
```

## Debugging

### Backend

Use `console.log` ou debugger do Node.js:

```bash
node --inspect dist/index.js
```

### Frontend

Use React Developer Tools e fonte do navegador.

## Git Workflow

1. Criar branch: `git checkout -b feature/nome-da-feature`
2. Commit: `git commit -m "Descrição da mudança"`
3. Push: `git push origin feature/nome-da-feature`
4. Pull Request

## Troubleshooting

### Erro de Conexão ao Banco

```
Error: connect ECONNREFUSED
```

Verificar se PostgreSQL está rodando:
```bash
psql -U postgres -d portal_ti
```

### Erro de CORS

Verificar se `CORS_ORIGIN` está correto no `.env`

### Erro de JWT

Verificar se token está sendo enviado no header:
```
Authorization: Bearer <token>
```

## Performance

### Backend

- Use índices no banco para queries frequentes
- Cache de dados com Redis (futuro)
- Paginação em endpoints que retornam muitos registros

### Frontend

- Code splitting com React.lazy()
- Memoização com React.memo()
- Otimização de re-renders

## Documentação de API

Endpoints documentados no README principal.

## Contato

Para dúvidas: contato@empresa.com

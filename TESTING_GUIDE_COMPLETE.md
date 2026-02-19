# 🧪 GUIA DE TESTES

Documentação dos testes automatizados do Portal de Serviços de TI.

## 📋 Estrutura de Testes

### Frontend (`frontend/src/`)
- `stores/*.test.ts` - Testes de Zustand stores
- `components/*.test.tsx` - Testes de componentes React
- `utils/*.test.ts` - Testes de funções utilitárias
- `services/*.test.ts` - Testes de serviços de API

### Backend (`backend/src/tests/`)
- `*.test.js` - Testes unitários e de integração
- `api/*.test.js` - Testes de rotas da API (planejado)
- `models/*.test.js` - Testes de models (planejado)

---

## 🚀 Executando Testes

### Frontend (Vitest)

```bash
cd frontend

# Executar todos os testes
npm run test

# Executar com coverage
npm run test:coverage

# Modo watch (executa ao salvar)
npm run test:watch

# Interface gráfica
npm run test:ui
```

### Backend (Jest)

```bash
cd backend

# Executar todos os testes
npm test

# Executar com coverage
npm run test:coverage

# Modo watch
npm run test:watch

# Executar apenas um arquivo
npm test basic.test.js
```

---

## ✅ Testes Implementados

### Frontend

#### 1. **ToastStore** (`toastStore.test.ts`)
- ✅ Adicionar toast
- ✅ Remover toast
- ✅ Helpers (success, error, warning, info)
- ✅ Múltiplos toasts simultâneos

#### 2. **Utils** (`utils.test.ts`)
- ✅ Formatação de datas (pt-BR)
- ✅ Formatação de moeda (BRL)
- ✅ Formatação de tamanho de arquivo
- ✅ Validação de email
- ✅ Validação de CPF

### Backend

#### 1. **API Básica** (`basic.test.js`)
- ✅ Health check endpoint
- ✅ Validação de campos obrigatórios
- ✅ Criação de recursos

#### 2. **Lógica de Negócio** (`basic.test.js`)
- ✅ Cálculo de prioridade de tickets
- ✅ Cálculo de deadline de SLA
- ✅ Validação de código de equipamento
- ✅ Cálculo de depreciação

---

## 📊 Coverage Esperado

### Metas
- **Stores**: 80%+ coverage
- **Utils**: 90%+ coverage
- **Business Logic**: 85%+ coverage
- **API Routes**: 70%+ coverage (planejado)
- **Components**: 60%+ coverage (planejado)

### Comandos de Coverage

```bash
# Frontend
cd frontend
npm run test:coverage

# Backend
cd backend
npm run test:coverage
```

Relatórios gerados em:
- Frontend: `frontend/coverage/`
- Backend: `backend/coverage/`

---

## 🧩 Exemplos de Testes

### Teste de Store (Zustand)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useMyStore } from './myStore';

describe('MyStore', () => {
  beforeEach(() => {
    useMyStore.setState({ items: [] });
  });

  it('should add item', () => {
    const store = useMyStore.getState();
    store.addItem({ id: 1, name: 'Test' });
    
    const items = useMyStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Test');
  });
});
```

### Teste de Componente React

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Teste de API (Backend)

```javascript
const request = require('supertest');
const app = require('../app');

describe('GET /api/tickets', () => {
  it('should return tickets list', async () => {
    const response = await request(app)
      .get('/api/tickets')
      .set('Authorization', 'Bearer fake-token');
    
    expect(response.status).toBe(200);
    expect(response.body.tickets).toBeDefined();
  });
});
```

---

## 🔧 Configuração

### Frontend (Vitest)

Arquivo: `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

### Backend (Jest)

Arquivo: `backend/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/index.ts',
  ],
};
```

---

## 🎯 Testes Planejados (TODO)

### Frontend
- [ ] Componente Comments
- [ ] Componente FileUpload
- [ ] Componente FilterBar
- [ ] Componente Pagination
- [ ] AuthStore
- [ ] API Services

### Backend
- [ ] Rotas de Tickets
- [ ] Rotas de Inventário
- [ ] Middleware de Autenticação
- [ ] Validações de Schema
- [ ] WebSocket Service

---

## 📝 Boas Práticas

### 1. **Nomenclatura**
- Arquivo de teste: `*.test.ts` ou `*.test.tsx`
- Describe: Nome do componente/módulo
- It/Test: Comportamento esperado em português

### 2. **Estrutura**
```typescript
describe('NomeDoModulo', () => {
  // Setup
  beforeEach(() => {
    // Reset state
  });

  // Testes positivos
  it('should comportamento esperado', () => {
    // Arrange, Act, Assert
  });

  // Testes negativos
  it('should lidar com erro', () => {
    // Test error cases
  });

  // Edge cases
  it('should lidar com caso extremo', () => {
    // Test edge cases
  });
});
```

### 3. **AAA Pattern**
- **Arrange**: Preparar dados e mocks
- **Act**: Executar a ação
- **Assert**: Verificar resultado

### 4. **Mocking**
- Mock external dependencies
- Mock API calls
- Mock localStorage/sessionStorage

---

## 🐛 Debugging

### Frontend
```bash
# Run tests with debugging
npm run test -- --reporter=verbose

# Run single test file
npm run test toastStore.test.ts
```

### Backend
```bash
# Run with verbose output
npm test -- --verbose

# Run specific test suite
npm test -- basic.test
```

---

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest](https://github.com/visionmedia/supertest)

---

## ✨ Contribuindo

Ao adicionar novas funcionalidades:

1. ✅ Escreva testes para novas funções
2. ✅ Mantenha coverage acima de 70%
3. ✅ Execute testes antes de commit
4. ✅ Atualize esta documentação

---

**Status**: 🟡 Testes básicos implementados  
**Próximo**: Expandir coverage de componentes e APIs

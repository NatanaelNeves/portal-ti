# Central de Apoio O Pequeno Nazareno

*Cuidando de quem transforma vidas através da educação e do acolhimento*

---

Um sistema completo e humanizado para organização, centralização e transparência das atividades de apoio tecnológico, alinhado com a missão institucional de **Dignidade e Justiça para a Infância**.

## 🎯 Visão Geral

Este sistema substitui controles informais (planilhas, e-mails, mensagens) por um ambiente único, acolhedor e rastreável, servindo:

- **Colaboradores/Educadores**: Solicitação e acompanhamento de apoio
- **Equipe de TI**: Gerenciamento operacional humanizado
- **Coordenação/Gestão**: Painéis e relatórios estratégicos

## 🎨 Identidade Visual

O sistema foi redesenhado para refletir os valores institucionais:

- **Verde Nazareno** (`#007A33`): Cor principal - esperança e crescimento
- **Laranja Acolhedor** (`#F28C38`): Trabalho em andamento - energia
- **Azul Sereno** (`#4A90E2`): Sucesso - tranquilidade
- **Design "Ruído Zero"**: Sombras suaves, bordas arredondadas, sem elementos agressivos

> 📘 Veja [STYLE-GUIDE.md](docs/STYLE-GUIDE.md) para detalhes completos

## 🏗️ Arquitetura

### Backend
- **Node.js** com **Express** e **TypeScript**
- **PostgreSQL** para persistência de dados
- Autenticação com **JWT**
- Sistema de controle de acesso baseado em perfis

### Frontend
- **React 18** com **TypeScript**
- **Vite** para desenvolvimento rápido
- **Zustand** para gerenciamento de estado
- **Axios** para requisições HTTP
- Design responsivo com identidade institucional

## 📦 Estrutura do Projeto

```
portal-ti/
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações
│   │   ├── database/        # Conexão e schema
│   │   ├── types/           # Tipos e enums
│   │   ├── models/          # Modelos de dados
│   │   ├── routes/          # Rotas da API
│   │   ├── middleware/      # Middleware (auth)
│   │   ├── services/        # Lógica de negócio
│   │   └── index.ts         # Entrada da app
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── types/           # Tipos TypeScript
│   │   ├── services/        # Serviços de API
│   │   ├── stores/          # Estado (Zustand)
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas/Views
│   │   ├── styles/          # CSS
│   │   ├── App.tsx          # App principal
│   │   └── main.tsx         # Entrada
│   ├── package.json
│   └── vite.config.ts
│
└── docs/                    # Documentação
```

## 🚀 Getting Started

### Pré-requisitos
- Node.js 18+
- PostgreSQL 12+
- npm ou yarn

### Instalação do Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env com suas configurações
npm run build
npm run dev
```

### Instalação do Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:3000`
O backend estará rodando em `http://localhost:3001`

## 📚 Módulos do Sistema

### 1. **Chamados (Tickets)**
- Abertura de chamados simples
- Classificação por tipo e prioridade
- Status claros (aberto, em andamento, resolvido, etc)
- Histórico completo de interações
- Restrição de visualização por perfil

### 2. **Ativos**
- Cadastro de equipamentos e bens de TI
- Status do ativo (disponível, em uso, manutenção, baixado)
- Associação com usuário, setor e local
- Histórico de movimentações

### 3. **Movimentações de Ativos**
- Registro de todas as ações relevantes
- Tipos: entrada, saída, transferência, manutenção, baixa
- Rastreabilidade completa com datas e responsáveis

### 4. **Compras e Solicitações**
- Controle de itens solicitados
- Status (solicitado, cotação, aprovado, comprado, recebido)
- Registro de valores e fornecedores
- Integração com estoque

### 5. **Central de Informações**
- Base de conhecimento da TI
- Tutoriais, onboarding, documentos
- Perguntas frequentes
- Conteúdo público e restrito

### 6. **Dashboards e Relatórios**
- Volume de chamados por período
- Tempo médio de atendimento
- Ativos por status
- Compras por período
- Gargalos operacionais

## 👥 Perfis de Usuário

### Usuário Final
- Abrir solicitações
- Acompanhar apenas seus próprios atendimentos
- Acesso à central de informações

### Equipe de TI
- Visualizar e gerenciar todos os chamados
- Controlar prioridades e status
- Gerenciar ativos e estoque
- Registrar movimentações
- Gerar relatórios operacionais

### Coordenação/Gestão
- Visualizar dashboards
- Acompanhar indicadores
- Entender volume de trabalho e gargalos
- Sem acesso para alterar dados operacionais

### Admin
- Acesso completo ao sistema

## 🔐 Autenticação

Sistema baseado em JWT:
- Login com email e senha
- Token armazenado no localStorage
- Renovação automática de sessão
- Controle de acesso por perfil

## 📊 API Endpoints

### Autenticação
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Solicitações de Apoio (Tickets)
- `POST /api/tickets` - Criar solicitação
- `GET /api/tickets/my-tickets` - Minhas solicitações
- `GET /api/tickets` - Todas as solicitações (equipe TI)
- `GET /api/tickets/:id` - Detalhes
- `PATCH /api/tickets/:id/status` - Atualizar status
- `PATCH /api/tickets/:id/assign` - Atribuir

### Recursos (Assets)
- `POST /api/assets` - Registrar recurso
- `GET /api/assets/:id` - Detalhes
- `GET /api/assets/status/:status` - Por status (equipe TI)
- `PATCH /api/assets/:id/status` - Atualizar status
- `PATCH /api/assets/:id/assign` - Atribuir responsável

## 🎨 Design System

### Paleta de Cores Institucional
- **Verde Nazareno**: #007A33 (Primária)
- **Laranja Acolhedor**: #F28C38 (Em andamento)
- **Azul Sereno**: #4A90E2 (Sucesso)
- **Coral Suave**: #FF7B7B (Crítico)
- **Verde Claro**: #7ED957 (Concluído)

> 📘 Detalhes completos em [STYLE-GUIDE.md](docs/STYLE-GUIDE.md)

### Microcopy Humanizado
| Sistema | Interface |
|---------|-----------|
| Ticket | Solicitação de Apoio |
| Priority | Impacto no Atendimento |
| Inventory | Nossos Recursos |
| User | Colaborador/Educador |

## 📝 Status das Solicitações

- `open`: 📥 Recebido
- `in_progress`: 🔍 Em Análise
- `waiting`: ⏳ Aguardando
- `resolved`: ⚙️ Resolvendo
- `closed`: ✅ Concluído
- `cancelled`: ❌ Cancelado

## 📈 Próximos Passos

### ✅ Concluído
1. [x] Estrutura base do projeto
2. [x] Backend com modelos principais
3. [x] Frontend com componentes básicos
4. [x] Reforma de UX institucional
5. [x] Identidade visual O Pequeno Nazareno
6. [x] Microcopy humanizado
7. [x] Dashboard acolhedor
8. [x] Componente de progresso visual

### 🚧 Em Desenvolvimento
9. [ ] Implementar Central de Dúvidas completa
10. [ ] Módulo de Recursos com QR Code
11. [ ] Dashboards com métricas de impacto
12. [ ] Sistema de feedback humanizado

### 📋 Planejado
13. [ ] Modo Foco para equipe TI
14. [ ] Mapa de calor por setor
15. [ ] Histórico de impacto dos recursos
16. [ ] Notificações em tempo real
17. [ ] Testes automatizados
18. [ ] Deploy e CI/CD

## 🔧 Desenvolvimento

### Convenções de Código
- Usar TypeScript em todo o código
- Componentes React com hooks modernos
- Nomes descritivos para funções e variáveis
- Comentários para lógica complexa
- Commit messages em português

### Database Migrations
Atualizações de schema são feitas através do arquivo `schema.ts`

## 📄 Licença

Propriedade corporativa - Todos os direitos reservados

## 👨‍💼 Suporte

Para dúvidas ou problemas, contacte a equipe de TI.

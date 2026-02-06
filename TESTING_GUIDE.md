# 🧪 Guia de Testes - Módulo de Inventário

## Pré-requisitos

1. **Backend rodando**: `npm run dev` em `backend/` (porta 3001)
2. **Frontend rodando**: `npm run dev` em `frontend/` (porta 3000)
3. **PostgreSQL**: Database `portal_ti` disponível
4. **Usuário interno**: Login como IT staff ou admin

## Roteiro de Testes

### 1. Acesso ao Módulo

**Teste 1.1**: Acessar via navegação
```
✓ Login como usuário interno (IT staff ou admin)
✓ Na navigation bar, clicar em "📦 Inventário"
✓ Deve redirecionar para /inventario (Dashboard)
```

**Teste 1.2**: Acesso direto à URL
```
✓ Acessar http://localhost:3000/inventario
✓ Deve mostrar InventoryDashboardPage
✓ Se não autenticado, redirecionar para login
```

### 2. Dashboard (Visão Geral)

**Teste 2.1**: Carregamento inicial
```
✓ Página mostra spinner enquanto carrega
✓ Após carregamento, exibe 4 KPI cards
✓ Cards mostram números (0 ou > 0)
```

**Teste 2.2**: KPI Cards
```
✓ Card "Em Uso" mostra número de equipamentos em_use
✓ Card "Em Estoque" mostra número de equipamentos in_stock
✓ Card "Em Manutenção" mostra número de equipamentos in_maintenance
✓ Card "Compras Pendentes" mostra número de purchases pendentes
```

**Teste 2.3**: Clicabilidade nos KPIs
```
✓ Clicar em "Em Uso" → /inventario/equipamentos?status=in_use
✓ Clicar em "Em Estoque" → /inventario/equipamentos?status=in_stock
✓ Clicar em "Em Manutenção" → /inventario/equipamentos?status=in_maintenance
✓ Clicar em "Compras Pendentes" → /inventario/compras
```

**Teste 2.4**: Attention Cards
```
✓ Card "Equipamentos sem termos" mostra número
✓ Botão "Regularizar" leva para /inventario/responsabilidades
✓ Card "Total de Notebooks" mostra número
✓ Botão "Consultar" leva para /inventario/equipamentos
```

**Teste 2.5**: Quick Access Buttons
```
✓ Botão "Quem está com quê" → /inventario/responsabilidades
✓ Botão "O que a instituição possui" → /inventario/equipamentos
✓ Botão "Compras e solicitações" → /inventario/compras
✓ Botão "Registrar entrega" → /inventario/responsabilidades
```

### 3. Sidebar Navigation

**Teste 3.1**: Visibilidade e funcionamento
```
✓ Sidebar está visível com fundo dark (2c3e50)
✓ Tem 4 items: "📊 Visão Geral", "👤 Responsabilidades", etc
✓ Clicar em cada item navega para a página correspondente
```

**Teste 3.2**: Active Highlighting
```
✓ Quando em /inventario, "Visão Geral" está destacado
✓ Quando em /inventario/responsabilidades, "Responsabilidades" está destacado
✓ Quando em /inventario/equipamentos, "Equipamentos" está destacado
✓ Quando em /inventario/compras, "Compras" está destacado
✓ Item ativo tem background azul e borda esquerda
```

### 4. Responsabilidades

**Teste 4.1**: Carregamento de dados
```
✓ Página carrega dados da API /api/inventory/responsibilities
✓ Mostra tabela com colunas: Pessoa, Setor, Equipamento, Código, Desde, Status, Ações
✓ Se não há dados, tabela fica vazia
✓ Se há erro, mostra mensagem de erro em vermelho
```

**Teste 4.2**: Status Filter
```
✓ Dropdown com opções: Todos, Em Uso, Em Estoque, Em Manutenção
✓ Selecionar filtro faz nova requisição à API
✓ Tabela atualiza com dados filtrados
```

**Teste 4.3**: Status Badges
```
✓ Status "in_use" mostra badge verde "✓ Em uso"
✓ Status "in_stock" mostra badge azul "📦 Em estoque"
✓ Status "in_maintenance" mostra badge amarelo "🔧 Manutenção"
```

**Teste 4.4**: Botão "Ver detalhes"
```
✓ Clicar navega para /inventario/responsabilidades/:id
✓ Se página não existe ainda, pode gerar 404 (esperado)
```

### 5. Equipamentos

**Teste 5.1**: Carregamento inicial
```
✓ Página mostra dropdown com filtro de status
✓ Tabela carrega equipamentos da API
✓ Colunas: Código, Tipo, Marca/Modelo, Status, Local, Data entrada, Ações
```

**Teste 5.2**: Status Filter Funcional
```
✓ Selecionar "Em uso" mostra apenas equipamentos com status "in_use"
✓ Selecionar "Em estoque" mostra apenas "in_stock"
✓ Selecionar "Manutenção" mostra apenas "in_maintenance"
✓ "Todos" mostra equipamentos de todos os status
```

**Teste 5.3**: Visual de Status
```
✓ Coluna Status mostra badges com cores:
  - "✓ Em uso" (verde)
  - "📦 Em estoque" (azul)
  - "🔧 Manutenção" (amarelo)
✓ Borda esquerda da linha muda de cor por status
```

**Teste 5.4**: Botões de Ação
```
✓ Botão "Ver histórico" clicável
✓ Clicar navega para /inventario/equipamento/:id
✓ Botão "+ Novo equipamento" clicável
✓ Clicar navega para /inventario/novo-equipamento (página não existe ainda)
```

### 6. Compras

**Teste 6.1**: Carregamento de dados
```
✓ Página carrega compras da API
✓ Mostra tabela com: Descrição, Qtd, Valor, Fornecedor, Previsão, Status, Ações
✓ Status filter dropdown funciona
```

**Teste 6.2**: Status Filter
```
✓ Opções: Todos, Pendente, Aprovado, Comprado, Recebido
✓ Filtragem atualiza a tabela
```

**Teste 6.3**: Status Labels Formatados
```
✓ "pending" mostra "⏳ Pendente"
✓ "approved" mostra "✓ Aprovado"
✓ "purchased" mostra "📦 Comprado"
✓ "received" mostra "📥 Recebido"
```

**Teste 6.4**: Formatação de Datas e Valores
```
✓ Datas mostram em formato DD/MM/YYYY
✓ Valores mostram em formato R$ X.XXX,XX
✓ Se valor = null, mostra "-"
✓ Se data = null, mostra "-"
```

**Teste 6.5**: Ações
```
✓ Botão "Detalhes" clicável
✓ Clicar navega para /inventario/compra/:id
✓ Botão "+ Nova solicitação" clicável
✓ Clicar navega para /inventario/nova-compra (página não existe ainda)
```

### 7. Responsividade

**Teste 7.1**: Desktop (>1200px)
```
✓ Sidebar fixo à esquerda (280px)
✓ Conteúdo ocupa espaço restante
✓ Tabelas mostram todas as colunas
```

**Teste 7.2**: Tablet (768px - 1200px)
```
✓ Sidebar visível mas pode ter scroll
✓ Tabelas horizontais com scroll
✓ Gradientes carregam normalmente
```

**Teste 7.3**: Mobile (<768px)
```
✓ Sidebar fica horizontal no topo
✓ Items de navegação em row com scroll horizontal
✓ Tabelas com scroll horizontal
✓ Texto legível (não muito pequeno)
```

### 8. Integração com Backend

**Teste 8.1**: Requisições HTTP
```
✓ Abrir DevTools → Network
✓ Navegar para /inventario
✓ Ver requisição GET /api/inventory/dashboard/summary
✓ Status: 200 OK
✓ Response contém: equipmentInUse, equipmentInStock, etc
```

**Teste 8.2**: Headers de Autenticação
```
✓ Todas as requisições incluem header: Authorization: Bearer <token>
✓ Se token inválido, API retorna 401
✓ Se token ausente, API retorna 401 (esperado, pois autenticado)
```

**Teste 8.3**: Tratamento de Erros
```
✓ Se API retorna erro 500, mostra mensagem de erro na página
✓ Se API timeout, mostra timeout error
✓ Se API retorna 404, mostra página não encontrada
```

## Checklist de Validação

```
[ ] Acesso ao módulo funciona
[ ] Dashboard carrega e mostra KPIs
[ ] Sidebar navega para todas as 4 páginas
[ ] Responsabilidades carrega e filtra
[ ] Equipamentos carrega e filtra
[ ] Compras carrega e filtra
[ ] Status badges mostram com cores corretas
[ ] Tabelas são responsivas
[ ] Botões de ação são clicáveis
[ ] Dados vêm do backend correto
[ ] Autenticação está funcionando
[ ] Sem erros de console (warnings aceitáveis)
[ ] Sem erros de 404 (exceto páginas ainda não implementadas)
```

## Problemas Conhecidos / Expected

### Esperado (Features não implementadas ainda)
- ❌ Clicar "Ver detalhes" em responsabilidades → 404 (página não existe)
- ❌ Clicar "Ver histórico" em equipamentos → 404 (página não existe)
- ❌ Clicar "Detalhes" em compras → 404 (página não existe)
- ❌ Botões "+ Novo equipamento" → 404 (página não existe)
- ❌ Botões "+ Nova solicitação" → 404 (página não existe)
- ⚠️ Modal de movimentações não implementado (botões "Entregar", "Receber")

### Possíveis Erros e Soluções

**Erro**: "Cannot GET /api/inventory/..."
- **Solução**: Verificar se backend está rodando em porta 3001
- **Verificar**: `npm run dev` em `backend/`

**Erro**: Token inválido (401)
- **Solução**: Fazer login novamente como usuário interno
- **Verificar**: localStorage tem `internal_token`?

**Erro**: Tabela vazia
- **Solução**: Pode não haver dados no banco de dados
- **Verificar**: Executar seed/migrations no banco
- **Comando**: `npm run seed` em `backend/` (se disponível)

**Erro**: Sidebar desapareceu
- **Solução**: CSS pode ter conflito com tema
- **Verificar**: Devtools → Elements → CSS aplicado corretamente

## Performance Notes

- Todas as requisições são feitas no useEffect com `[]` dependency
- Sem cache implementado (cada acesso refaz requisição)
- Status filter dispara nova requisição a cada mudança
- Ideal: implementar cache + pagination em tabelas grandes

## Próximos Testes (Após Features Implementadas)

- Criar novo equipamento
- Registrar novo termo de responsabilidade
- Fazer movimentação de equipamento
- Criar nova solicitação de compra
- Gerar PDF de termo
- Exportar tabelas para CSV

# 🎨 Guia de Estilo - Central de Apoio OPN

## Paleta de Cores

### Cores Primárias

```css
/* Verde Institucional */
--verde-nazareno: #007A33;
--verde-nazareno-hover: #005a24;
```
**Uso**: Headers, navegação, botões principais, elementos de destaque

### Cores de Status

```css
/* Em Andamento / Energia */
--laranja-acolhedor: #F28C38;

/* Sucesso / Informação */
--azul-sereno: #4A90E2;

/* Crítico / Urgente */
--coral-suave: #FF7B7B;

/* Concluído / Confirmação */
--verde-claro: #7ED957;
```

### Cores Neutras

```css
--branco: #FFFFFF;
--cinza-claro: #F8F9FA;
--cinza-medio: #E9ECEF;
--cinza-escuro: #495057;
--texto-principal: #2C3E50;
```

---

## Tipografia

### Hierarquia

```css
/* Títulos Principais */
h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--texto-principal);
}

/* Subtítulos */
h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--texto-principal);
}

/* Cards e Seções */
h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--texto-principal);
}

/* Corpo de Texto */
p {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--cinza-escuro);
}

/* Texto Secundário */
small {
  font-size: 0.85rem;
  color: var(--cinza-escuro);
}
```

---

## Componentes

### Botões

#### Botão Primário
```tsx
<button className="btn btn-primary">
  Solicitar Apoio
</button>
```
- Fundo: Verde Nazareno
- Texto: Branco
- Hover: Verde mais escuro + elevação
- Border-radius: 8px

#### Botão Secundário
```tsx
<button className="btn btn-secondary">
  Ver Mais
</button>
```
- Fundo: Laranja Acolhedor
- Texto: Branco
- Border-radius: 8px

### Cards

#### Card Padrão
```tsx
<div className="dashboard-card">
  <div className="card-icon">🤝</div>
  <div className="card-content">
    <h3>Título do Card</h3>
    <p className="stat">5</p>
    <small>Descrição</small>
  </div>
</div>
```
- Fundo: Branco
- Sombra: `var(--sombra-card)`
- Border-radius: 12px
- Hover: Elevação + transform

#### Card com Status
```tsx
<div className="dashboard-card card-primary">
  <!-- Verde Nazareno -->
</div>

<div className="dashboard-card card-secondary">
  <!-- Azul Sereno -->
</div>

<div className="dashboard-card card-accent">
  <!-- Laranja Acolhedor -->
</div>
```

### Alertas

```tsx
<div className="alert alert-success">
  ✅ Solicitação criada com sucesso!
</div>

<div className="alert alert-error">
  ⚠️ Erro ao processar solicitação
</div>

<div className="alert alert-warning">
  ⏳ Aguardando aprovação
</div>

<div className="alert alert-info">
  ℹ️ Informação importante
</div>
```

### Barra de Progresso

```tsx
import StatusProgressBar from '../components/StatusProgressBar';

<StatusProgressBar status="in_progress" />
```

Status disponíveis:
- `open`: Recebido 📥
- `in_progress`: Em Análise 🔍
- `resolved`: Resolvendo ⚙️
- `closed`: Concluído ✅

---

## Espaçamento

### Sistema de Espaçamento

```css
/* Pequeno */
padding: 0.5rem; /* 8px */
gap: 0.5rem;

/* Médio */
padding: 1rem; /* 16px */
gap: 1rem;

/* Grande */
padding: 1.5rem; /* 24px */
gap: 1.5rem;

/* Extra Grande */
padding: 2rem; /* 32px */
gap: 2rem;
```

### Margens entre Seções

```css
margin-bottom: 2rem; /* Entre seções */
margin-bottom: 1.5rem; /* Entre sub-seções */
margin-bottom: 1rem; /* Entre elementos */
```

---

## Ícones

### Ícones Institucionais

| Contexto | Ícone | Uso |
|----------|-------|-----|
| Solicitar Apoio | 🤝 | Formulário, botão de ação |
| Solicitações | 📋 | Lista, histórico |
| Dúvidas | 💡 | Central de conhecimento |
| Recursos | 💻 | Equipamentos, patrimônio |
| Pendências | ⏳ | Aguardando ação |
| Sucesso | ✅ | Confirmação, concluído |
| Equipe | 👥 | Colaboradores |
| Progresso | 🔍 | Em andamento |
| Resolvendo | ⚙️ | Trabalhando |
| Recebido | 📥 | Status inicial |

---

## Sombras e Elevações

### Níveis de Elevação

```css
/* Nível 1 - Cards em repouso */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Nível 2 - Hover */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);

/* Nível 3 - Modal / Destaque */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
```

### Sombra de Foco

```css
/* Para inputs e elementos focáveis */
box-shadow: 0 0 0 3px rgba(0, 122, 51, 0.15);
```

---

## Animações

### Transições Padrão

```css
transition: all 0.3s ease;
```

### Hover em Cards

```css
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sombra-hover);
}
```

### Hover em Botões

```css
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--sombra-hover);
}
```

### Animação Pulse (Status Atual)

```css
@keyframes pulse {
  0%, 100% {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(242, 140, 56, 0.3);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 6px 16px rgba(242, 140, 56, 0.5);
  }
}
```

---

## Formulários

### Input Padrão

```tsx
<input
  type="text"
  placeholder="Digite aqui..."
  className="form-input"
/>
```

**Estilos:**
- Padding: 0.75rem
- Border: 1px solid cinza-medio
- Border-radius: 8px
- Focus: Borda verde + sombra de foco

### Textarea

```tsx
<textarea
  rows={6}
  placeholder="Descreva em detalhes..."
  className="form-input"
/>
```

### Select

```tsx
<select className="form-input">
  <option value="low">Baixo - Pode esperar alguns dias</option>
  <option value="medium">Médio - Afeta minhas atividades</option>
  <option value="high">Alto - Dificulta muito o trabalho</option>
  <option value="critical">Crítico - Impede o atendimento</option>
</select>
```

---

## Layouts

### Container Principal

```tsx
<div className="page-container">
  <!-- Conteúdo -->
</div>
```
- Max-width: 1400px
- Margin: 0 auto
- Padding: 2rem

### Grid Responsivo

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

### Quick Links

```css
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
```

---

## Responsividade

### Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  .page-container {
    padding: 1rem;
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## Acessibilidade

### Contraste de Cores

- ✅ Verde Nazareno em fundo branco: AAA
- ✅ Texto principal em fundo branco: AAA
- ✅ Cinza escuro em fundo branco: AA

### Focus Visible

Todos os elementos interativos devem ter estado de foco visível:

```css
button:focus,
input:focus,
a:focus {
  outline: 2px solid var(--verde-nazareno);
  outline-offset: 2px;
}
```

### Tamanhos de Toque

Elementos clicáveis devem ter no mínimo 44x44px:

```css
.btn {
  min-height: 44px;
  min-width: 44px;
}
```

---

## Tom de Voz

### Princípios

1. **Acolhedor, não corporativo**
   - ✅ "Solicitar Apoio"
   - ❌ "Abrir Ticket"

2. **Colaborativo, não hierárquico**
   - ✅ "Como podemos apoiar seu trabalho hoje?"
   - ❌ "Painel de Controle"

3. **Focado na missão**
   - ✅ "Impacto no Atendimento"
   - ❌ "Prioridade"

4. **Simples e claro**
   - ✅ "Central de Dúvidas"
   - ❌ "Base de Conhecimento"

### Exemplos de Microcopy

| Situação | Texto |
|----------|-------|
| Saudação | "Bom dia, [Nome]! 👋" |
| Pergunta engajadora | "Como podemos apoiar seu trabalho hoje?" |
| Confirmação | "Solicitação criada com sucesso!" |
| Erro suave | "Não foi possível processar. Vamos tentar novamente?" |
| Vazio | "Nenhuma solicitação ativa no momento" |
| Loading | "Buscando suas solicitações..." |

---

## Checklist de Implementação

Ao criar novos componentes, verifique:

- [ ] Usa variáveis CSS do tema
- [ ] Border-radius: 8px ou 12px
- [ ] Sombras suaves (não duras)
- [ ] Transições de 0.3s ease
- [ ] Hover com elevação
- [ ] Microcopy humanizado
- [ ] Ícones institucionais
- [ ] Cores de status corretas
- [ ] Responsivo (mobile-first)
- [ ] Acessibilidade (contraste, foco)

---

**Atualizado em**: 4 de fevereiro de 2026

# 💻 Exemplos de Código - Sistema OPN

## Índice
1. [Usando o Tema](#usando-o-tema)
2. [Componentes Básicos](#componentes-básicos)
3. [StatusProgressBar](#statusprogressbar)
4. [Cards e Dashboards](#cards-e-dashboards)
5. [Formulários](#formulários)
6. [Alertas](#alertas)

---

## Usando o Tema

### Importando Estilos Base

```tsx
// Em qualquer componente
import '../styles/index.css';
```

### Usando Variáveis CSS

```css
/* No seu arquivo CSS */
.meu-botao {
  background-color: var(--verde-nazareno);
  color: var(--branco);
  border-radius: var(--border-radius-small);
  box-shadow: var(--sombra-card);
  transition: all 0.3s ease;
}

.meu-botao:hover {
  background-color: var(--verde-nazareno-hover);
  transform: translateY(-2px);
  box-shadow: var(--sombra-hover);
}
```

---

## Componentes Básicos

### Botão Primário

```tsx
<button className="btn btn-primary">
  Solicitar Apoio
</button>
```

### Botão Secundário

```tsx
<button className="btn btn-secondary">
  Ver Mais
</button>
```

### Card Simples

```tsx
<div className="dashboard-card">
  <div className="card-icon">🤝</div>
  <div className="card-content">
    <h3>Minhas Solicitações</h3>
    <p className="stat">5</p>
    <small>Em andamento</small>
  </div>
</div>
```

### Card com Status

```tsx
<div className="dashboard-card card-primary">
  {/* Verde Nazareno */}
  <div className="card-content">
    <h3>Importante</h3>
  </div>
</div>

<div className="dashboard-card card-secondary">
  {/* Azul Sereno */}
</div>

<div className="dashboard-card card-accent">
  {/* Laranja Acolhedor */}
</div>
```

---

## StatusProgressBar

### Importação

```tsx
import StatusProgressBar from '../components/StatusProgressBar';
```

### Uso Básico

```tsx
// Status: 'open' | 'in_progress' | 'resolved' | 'closed'
<StatusProgressBar status="in_progress" />
```

### Exemplo Completo em um Componente

```tsx
import { useState, useEffect } from 'react';
import StatusProgressBar from '../components/StatusProgressBar';

interface Ticket {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export default function TicketDetailPage() {
  const [ticket, setTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    // Buscar ticket...
  }, []);

  if (!ticket) return <div className="loading">Carregando...</div>;

  return (
    <div className="page-container">
      <h1>{ticket.title}</h1>
      
      <StatusProgressBar status={ticket.status} />
      
      <div className="ticket-details">
        {/* Detalhes do ticket */}
      </div>
    </div>
  );
}
```

---

## Cards e Dashboards

### Grid de Cards Responsivo

```tsx
<div className="dashboard-grid">
  <div className="dashboard-card card-primary">
    <div className="card-icon">🤝</div>
    <div className="card-content">
      <h3>Solicitações Ativas</h3>
      <p className="stat">8</p>
      <small>Aguardando atendimento</small>
    </div>
    <div className="card-action">
      <button className="btn-card">Ver Todas</button>
    </div>
  </div>

  <div className="dashboard-card card-secondary">
    <div className="card-icon">💻</div>
    <div className="card-content">
      <h3>Recursos Ativos</h3>
      <p className="stat">42</p>
      <small>Equipamentos em uso</small>
    </div>
    <div className="card-action">
      <button className="btn-card">Gerenciar</button>
    </div>
  </div>

  <div className="dashboard-card card-accent">
    <div className="card-icon">⏳</div>
    <div className="card-content">
      <h3>Aguardando Ação</h3>
      <p className="stat">3</p>
      <small>Feedback necessário</small>
    </div>
    <div className="card-action">
      <button className="btn-card">Ver Pendências</button>
    </div>
  </div>
</div>
```

### Seção de Boas-Vindas

```tsx
import { useState, useEffect } from 'react';

export default function WelcomeSection() {
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('Colaborador');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Bom dia');
    } else if (hour < 18) {
      setGreeting('Boa tarde');
    } else {
      setGreeting('Boa noite');
    }

    const user = localStorage.getItem('internal_user');
    if (user) {
      const userData = JSON.parse(user);
      setUserName(userData.name?.split(' ')[0] || 'Colaborador');
    }
  }, []);

  return (
    <div className="welcome-section">
      <h1>{greeting}, {userName}! 👋</h1>
      <p className="welcome-message">Como podemos apoiar seu trabalho hoje?</p>
    </div>
  );
}
```

---

## Formulários

### Formulário Completo com Microcopy OPN

```tsx
import { useState } from 'react';

export default function SolicitacaoForm() {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'incident',
    impacto: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Processar formulário...
  };

  return (
    <form onSubmit={handleSubmit} className="ticket-form">
      <fieldset className="form-section">
        <legend>Detalhes da Solicitação</legend>
        
        <div className="form-group">
          <label htmlFor="titulo">Resumo</label>
          <input
            id="titulo"
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={(e) => setFormData({...formData, titulo: e.target.value})}
            placeholder="Ex: Computador da sala de aula não liga"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="descricao">Descrição Completa</label>
          <textarea
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={(e) => setFormData({...formData, descricao: e.target.value})}
            placeholder="Descreva em detalhes o que está acontecendo e como isso impacta seu trabalho..."
            rows={6}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tipo">Tipo de Solicitação</label>
            <select
              id="tipo"
              name="tipo"
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
            >
              <option value="incident">Problema Técnico</option>
              <option value="request">Pedido de Material/Serviço</option>
              <option value="change">Alteração de Configuração</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="impacto">Impacto no Atendimento</label>
            <select
              id="impacto"
              name="impacto"
              value={formData.impacto}
              onChange={(e) => setFormData({...formData, impacto: e.target.value})}
            >
              <option value="low">Baixo - Pode esperar alguns dias</option>
              <option value="medium">Médio - Afeta minhas atividades</option>
              <option value="high">Alto - Dificulta muito o trabalho</option>
              <option value="critical">Crítico - Impede o atendimento</option>
            </select>
          </div>
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary">
        Solicitar Apoio
      </button>
    </form>
  );
}
```

---

## Alertas

### Tipos de Alerta

```tsx
// Sucesso
<div className="alert alert-success">
  ✅ Solicitação criada com sucesso!
</div>

// Erro
<div className="alert alert-error">
  ⚠️ Não foi possível processar. Vamos tentar novamente?
</div>

// Aviso
<div className="alert alert-warning">
  ⏳ Aguardando aprovação da coordenação
</div>

// Informação
<div className="alert alert-info">
  ℹ️ Esta solicitação está sendo analisada por João Silva
</div>
```

### Alerta com Estado

```tsx
import { useState } from 'react';

export default function ComponenteComAlerta() {
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  const handleAcao = async () => {
    try {
      // Ação...
      setSucesso('Operação concluída com sucesso!');
      setErro('');
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar');
      setSucesso('');
    }
  };

  return (
    <div>
      {erro && <div className="alert alert-error">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}
      
      <button onClick={handleAcao} className="btn btn-primary">
        Executar Ação
      </button>
    </div>
  );
}
```

---

## Estado Vazio

### Empty State Humanizado

```tsx
<div className="empty-state">
  <div className="empty-icon">📋</div>
  <p>Nenhuma solicitação de apoio ativa no momento</p>
  <button className="btn btn-primary">Nova Solicitação</button>
</div>
```

### Empty State com Loading

```tsx
import { useState, useEffect } from 'react';

export default function ListaComEmpty() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar dados...
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <p>Nenhuma solicitação encontrada</p>
        <button className="btn btn-primary">Criar Primeira Solicitação</button>
      </div>
    );
  }

  return (
    <div className="items-list">
      {items.map(item => (
        <div key={item.id}>{/* Renderizar item */}</div>
      ))}
    </div>
  );
}
```

---

## Links Rápidos

### Seção de Acesso Rápido

```tsx
<div className="quick-access">
  <h2>Acesso Rápido</h2>
  <div className="quick-links">
    <a href="/central" className="quick-link">
      <span className="link-icon">💡</span>
      <span>Central de Dúvidas</span>
    </a>
    <a href="/abrir-chamado" className="quick-link">
      <span className="link-icon">🤝</span>
      <span>Solicitar Apoio</span>
    </a>
    <a href="/meus-chamados" className="quick-link">
      <span className="link-icon">📋</span>
      <span>Minhas Solicitações</span>
    </a>
  </div>
</div>
```

---

## Navegação

### Menu com Navegação Condicional

```tsx
import { useNavigate } from 'react-router-dom';

export default function MenuLateral() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('internal_user') || '{}');
  
  const showAssetsLink = ['it_staff', 'admin'].includes(userData.role);
  const showUsersLink = ['admin', 'it_staff'].includes(userData.role);

  return (
    <nav className="menu-lateral">
      <button onClick={() => navigate('/admin/dashboard')}>
        Painel
      </button>
      <button onClick={() => navigate('/admin/chamados')}>
        Solicitações
      </button>
      {showAssetsLink && (
        <button onClick={() => navigate('/admin/estoque')}>
          Nossos Recursos
        </button>
      )}
      {showUsersLink && (
        <button onClick={() => navigate('/admin/usuarios')}>
          Equipe
        </button>
      )}
    </nav>
  );
}
```

---

## Utilitários

### Hook de Saudação Dinâmica

```tsx
import { useState, useEffect } from 'react';

export function useGreeting() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  return greeting;
}

// Uso:
// const greeting = useGreeting();
```

### Hook de Dados do Usuário

```tsx
import { useState, useEffect } from 'react';

export function useUserData() {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const user = localStorage.getItem('internal_user');
    if (user) {
      setUserData(JSON.parse(user));
    }
  }, []);

  return userData;
}

// Uso:
// const userData = useUserData();
// const firstName = userData?.name?.split(' ')[0] || 'Colaborador';
```

---

## Testando Componentes

### Teste Visual Simples

```tsx
// TestePage.tsx - Página para testar componentes
import StatusProgressBar from '../components/StatusProgressBar';

export default function TestePage() {
  return (
    <div className="page-container">
      <h1>Testes de Componentes</h1>
      
      <section>
        <h2>Status Progress Bar</h2>
        <StatusProgressBar status="open" />
        <StatusProgressBar status="in_progress" />
        <StatusProgressBar status="resolved" />
        <StatusProgressBar status="closed" />
      </section>

      <section>
        <h2>Cards</h2>
        <div className="dashboard-grid">
          <div className="dashboard-card card-primary">
            <div className="card-icon">🤝</div>
            <div className="card-content">
              <h3>Card Primário</h3>
              <p className="stat">10</p>
              <small>Verde Nazareno</small>
            </div>
          </div>
          <div className="dashboard-card card-secondary">
            <div className="card-icon">💻</div>
            <div className="card-content">
              <h3>Card Secundário</h3>
              <p className="stat">20</p>
              <small>Azul Sereno</small>
            </div>
          </div>
          <div className="dashboard-card card-accent">
            <div className="card-icon">⏳</div>
            <div className="card-content">
              <h3>Card Accent</h3>
              <p className="stat">5</p>
              <small>Laranja Acolhedor</small>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2>Alertas</h2>
        <div className="alert alert-success">✅ Sucesso</div>
        <div className="alert alert-error">⚠️ Erro</div>
        <div className="alert alert-warning">⏳ Aviso</div>
        <div className="alert alert-info">ℹ️ Informação</div>
      </section>

      <section>
        <h2>Botões</h2>
        <button className="btn btn-primary">Primário</button>
        <button className="btn btn-secondary">Secundário</button>
      </section>
    </div>
  );
}
```

---

**Última atualização**: 4 de fevereiro de 2026
**Versão**: 1.0.0 - Central de Apoio OPN

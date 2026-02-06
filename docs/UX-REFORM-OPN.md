# 🎨 Reforma UX - O Pequeno Nazareno

## Visão Geral

Este documento detalha a transformação completa do UX do sistema "Portal de TI" para a **Central de Apoio OPN**, alinhada com a missão institucional de "Dignidade e Justiça para a Infância" da Associação Beneficente O Pequeno Nazareno.

---

## 1. Identidade Visual Implementada

### Paleta de Cores

As cores foram redesenhadas para refletir a identidade institucional:

| Cor | Código | Uso |
|-----|--------|-----|
| **Verde Nazareno** | `#007A33` | Cor primária - header, botões principais |
| **Verde Nazareno Hover** | `#005a24` | Estado hover dos elementos verdes |
| **Laranja Acolhedor** | `#F28C38` | Indicador "em andamento", energia |
| **Azul Sereno** | `#4A90E2` | Cor de sucesso/informação |
| **Coral Suave** | `#FF7B7B` | Alertas críticos (suave, não agressivo) |
| **Verde Claro** | `#7ED957` | Sucesso/concluído |

### Design System

- **Bordas arredondadas**: 12px (cards) e 8px (botões)
- **Sombras suaves**: `0 2px 8px rgba(0, 0, 0, 0.08)`
- **Sombra hover**: `0 4px 12px rgba(0, 0, 0, 0.12)`
- **Transições**: 0.3s ease para todos os elementos interativos

---

## 2. Microcopy Humanizado

Transformamos a linguagem de "TI corporativa" para "institucional colaborativa":

| Termo Antigo | Termo Novo | Benefício |
|--------------|------------|-----------|
| Portal de Serviços de TI | **Central de Apoio OPN** | Nome institucional e acolhedor |
| Chamado/Ticket | **Solicitação de Apoio** | Remove frieza burocrática |
| Abrir Chamado | **Solicitar Apoio** | Colaborativo, não transacional |
| Meus Chamados | **Minhas Solicitações** | Mais humanizado |
| Base de Conhecimento | **Central de Dúvidas** | Acessível e clara |
| Estoque | **Nossos Recursos** | Senso de propriedade compartilhada |
| Prioridade | **Impacto no Atendimento** | Foco na missão |
| Usuário | **Colaborador/Educador** | Valoriza a função |
| Dashboard | **Painel** | Mais simples |

---

## 3. Melhorias nos Dashboards

### Dashboard do Colaborador

**Antes**: Lista fria de números
**Depois**: Experiência acolhedora e informativa

#### Implementações:
- ✅ Saudação dinâmica personalizada: "Bom dia, [Nome]! 👋"
- ✅ Pergunta engajadora: "Como podemos apoiar seu trabalho hoje?"
- ✅ Cards visuais coloridos com ícones
- ✅ Indicadores de status com cores institucionais
- ✅ Seção de "Acesso Rápido" com links contextuais

### Componente de Progresso Visual

Criamos o componente `StatusProgressBar` que mostra visualmente o andamento das solicitações:

```
📥 Recebido → 🔍 Em Análise → ⚙️ Resolvendo → ✅ Concluído
```

**Características:**
- Ícones visuais para cada etapa
- Animação "pulse" no status atual
- Cores que mudam conforme o progresso
- Linha conectora entre as etapas

---

## 4. Páginas Atualizadas

### Home Page
- Hero section com gradiente verde institucional
- Ícones atualizados: 🤝 (Apoio), 📋 (Solicitações), 💡 (Dúvidas)
- Footer institucional: "Dignidade e Justiça para a Infância"
- Info cards destacam: Ágil, Transparente, Colaborativo

### Navegação
- Título principal: "Central de Apoio OPN"
- Subtítulo: "Cuidando de quem transforma vidas"
- Menu interno com termos atualizados:
  - Painel
  - Solicitações
  - Central de Dúvidas
  - Nossos Recursos
  - Equipe

### Nova Solicitação de Apoio
- Título: "Nova Solicitação de Apoio"
- Descrição: "Descreva sua necessidade para que possamos apoiar seu trabalho"
- Campo "Impacto no Atendimento" com opções explicativas:
  - Baixo - Pode esperar alguns dias
  - Médio - Afeta minhas atividades
  - Alto - Dificulta muito o trabalho
  - Crítico - Impede o atendimento
- Placeholder contextual: "Ex: Computador da sala de aula não liga"
- Botão: "Solicitar Apoio" (não "Criar Chamado")

### Central de Dúvidas
- Título atualizado com ícone 💡
- Busca preditiva com placeholder extenso
- Nova categoria: "Documentos Institucionais"
- Categorias renomeadas para linguagem clara

---

## 5. Arquivos Criados/Modificados

### Novos Arquivos
- ✅ `frontend/src/components/StatusProgressBar.tsx` - Barra de progresso visual
- ✅ `frontend/src/styles/StatusProgressBar.css` - Estilos da barra de progresso
- ✅ `docs/UX-REFORM-OPN.md` - Este documento

### Arquivos Modificados
- ✅ `frontend/src/styles/index.css` - Tema global com variáveis CSS
- ✅ `frontend/src/components/Navigation.tsx` - Novos labels e estrutura
- ✅ `frontend/src/styles/Navigation.css` - Cores institucionais
- ✅ `frontend/src/pages/HomePage.tsx` - Microcopy e ícones
- ✅ `frontend/src/styles/HomePage.css` - Cores e estilos OPN
- ✅ `frontend/src/pages/DashboardPage.tsx` - Dashboard humanizado
- ✅ `frontend/src/styles/DashboardPage.css` - Layout melhorado
- ✅ `frontend/src/pages/OpenTicketPage.tsx` - Formulário atualizado
- ✅ `frontend/src/pages/InformationCenterPage.tsx` - Nova categoria e labels

---

## 6. Como Usar o Novo Sistema

### Variáveis CSS Disponíveis

```css
var(--verde-nazareno)         /* Cor primária */
var(--verde-nazareno-hover)   /* Hover primário */
var(--laranja-acolhedor)      /* Em andamento */
var(--azul-sereno)            /* Sucesso */
var(--coral-suave)            /* Crítico */
var(--verde-claro)            /* Concluído */
var(--border-radius)          /* 12px */
var(--border-radius-small)    /* 8px */
var(--sombra-card)            /* Sombra padrão */
var(--sombra-hover)           /* Sombra hover */
var(--sombra-foco)            /* Sombra de foco */
```

### Usando o StatusProgressBar

```tsx
import StatusProgressBar from '../components/StatusProgressBar';

<StatusProgressBar status="in_progress" />
```

---

## 7. Próximos Passos Recomendados

### Implementações Futuras

1. **Feedback Humanizado**
   - Ao concluir solicitação, perguntar: "Essa solução ajudou no seu dia a dia?" (Sim/Não)
   - Remover nota de 0 a 10

2. **Modo Foco para TI**
   - Botão que oculta métricas e mostra apenas próximo chamado crítico

3. **Mapa de Calor por Setor**
   - Dashboard da coordenação mostrando qual área precisa mais apoio

4. **QR Code para Patrimônio**
   - Etiquetas para equipamentos com transferência rápida

5. **Histórico de Impacto**
   - Ficha do equipamento mostrando "storytelling" do recurso

6. **Política de Proteção à Criança**
   - Adicionar na Central de Dúvidas como documento destacado

---

## 8. Princípios de UX Aplicados

### Regra do Ruído Zero
O sistema agora é um "oásis de calma" para educadores que lidam com alta complexidade emocional:
- ✅ Sombras suaves e difusas
- ✅ Bordas arredondadas (nada pontiagudo)
- ✅ Cores suaves (sem vermelho sangue)
- ✅ Animações gentis

### Humanização
- ✅ Linguagem de apoio entre colegas
- ✅ Foco na missão institucional
- ✅ Valorização do trabalho do educador
- ✅ Transparência no processo

### Acessibilidade
- ✅ Contraste adequado
- ✅ Tamanhos de fonte legíveis
- ✅ Espaçamento generoso
- ✅ Feedback visual claro

---

## 9. Testando as Mudanças

Para ver as mudanças em ação:

1. Navegue para a home page
2. Observe o novo gradiente verde e os ícones atualizados
3. Clique em "Solicitar Apoio" e veja o novo formulário
4. Acesse a área interna e veja o dashboard personalizado
5. Observe as cores e bordas arredondadas em todos os elementos

---

## 10. Conclusão

A reforma de UX transforma o sistema de um "portal de TI genérico" para uma **ferramenta institucional** que reflete os valores do Pequeno Nazareno. Cada palavra, cada cor, cada interação agora reforça a missão de dignidade e cuidado com a infância.

**Lema interno**: *"Cuidando de quem transforma vidas."*

---

**Documentado em**: 4 de fevereiro de 2026
**Responsável**: Equipe de Desenvolvimento OPN

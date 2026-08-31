---
name: Portal de Serviços Internos — Central Administrativa
description: Uma central institucional legível para reconhecer o escopo, ler a saúde da operação, entrar na fila e agir com contexto.
colors:
  ink: "#102c22"
  ink-muted: "#64766e"
  evergreen: "#063c2d"
  evergreen-active: "#075039"
  action: "#14945a"
  action-bright: "#46bd73"
  canvas: "#f4f7f5"
  paper: "#ffffff"
  line: "#dde5df"
  info: "#2d73d2"
  analysis: "#7f56c5"
  warning: "#ed8a22"
  danger: "#d9464f"
typography:
  display:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "clamp(1.55rem, 2.35vw, 2.25rem)"
    fontWeight: 750
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 780
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.61rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  control-sm: "7px"
  control: "8px"
  navigation: "9px"
  group: "10px"
  surface: "11px"
  metric: "12px"
  command: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  control-gap: "10px"
  md: "12px"
  compact: "14px"
  surface: "16px"
  section: "20px"
  topbar: "28px"
  command: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "38px"
  button-command:
    backgroundColor: "{colors.action-bright}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "42px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.evergreen-active}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "32px"
  surface-operational:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "14px"
  navigation-active:
    backgroundColor: "rgba(124, 218, 160, 0.17)"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.navigation}"
    padding: "0 12px"
    height: "44px"
---

# Design System: Portal de Serviços Internos — Central Administrativa

## Overview

**Creative North Star: "The Institutional Operations Desk"**

A interface administrativa é uma central de operações institucional, não uma barra genérica sobre uma grade de cartões. A moldura evergreen permanece fixa e reconhecível durante o expediente; dentro dela, a topbar branca funciona como uma faixa de utilidades e o canvas mineral recebe superfícies brancas, planas e regradas. O resultado é sóbrio, humano e operacional: denso o bastante para trabalhar, hierárquico o bastante para decidir sem reler.

O dashboard conduz da leitura da saúde da operação para a ação, com estado, indicadores, desempenho e ações em capítulos claros. Na Central de Chamados, o percurso começa pela fila: encontrar, ler, abrir o contexto e retornar sem interrupção; a leitura de indicadores fica na visão separada “Panorama”. A cor aparece quando há uma ação, seleção ou estado real — nunca para compensar falta de hierarquia.

As especificações locais de `frontend/src/pages/AdminTicketsPage.tsx` abaixo substituem, somente nessa rota, a tipografia miúda e a antiga composição de fila e detalhe sempre visíveis. Os tokens gerais e as orientações de dashboard, relatórios e shell permanecem vigentes; as medidas locais não são uma nova escala global.

### Directional Contract

- **THESIS:** transformar a operação diária em uma central legível e recusar barra genérica ou grade sem hierarquia.
- **OWN-WORLD:** sidebar evergreen fixa, topbar de papel, superfícies brancas regradas e cor reservada a estados reais.
- **STORY:** reconhecer escopo, ler saúde, entrar na fila e agir com contexto.
- **FIRST VIEWPORT:** navegação fixa à esquerda, utilidades no topo e contexto, filtros e ação imediatamente visíveis.
- **FORM:** central de operações institucional aprovada pelas referências `user-pinned-20260821`.
- **FINISH:** o build termina com revisão de acabamento, veredito e este documento atualizado; não revisado e não documentado significa inacabado.

**Key Characteristics:**

- Sidebar evergreen fixa com rota ativa marcada por lavagem verde e filete interno.
- Topbar branca e calma para busca global, data, notificações e identidade do usuário.
- Canvas mineral com superfícies brancas delimitadas por linhas frias de 1px.
- Hierarquia tipográfica compacta em DM Sans e números operacionais tabulares.
- Dashboard em capítulos: comando, indicadores, desempenho, atividade, prioridade e atalhos.
- Na Central de Chamados, fila de largura integral em “Atendimento”, indicadores em “Panorama” e detalhe aberto sob demanda.
- Cor semântica e movimento contido, sempre ligados a estado ou feedback real.

## Colors

A paleta combina verdes institucionais firmes com papel branco e canvas mineral; azul, roxo, laranja e vermelho ficam subordinados a informação, análise, atenção e exceção.

### Primary

- **Evergreen Institucional** (`evergreen`): ocupa a sidebar e ancora o produto durante toda a operação.
- **Evergreen de Seleção** (`evergreen-active`): confirma tabs, chips e escopos ativos.
- **Verde de Ação** (`action`): sustenta ações primárias, progresso e estados positivos.
- **Verde Vivo** (`action-bright`): destaca a ação principal dentro de um cabeçalho escuro.

### Secondary

- **Azul Informativo** (`info`): diferencia informação e uma das categorias analíticas do dashboard.
- **Violeta Analítico** (`analysis`): identifica uma categoria comparativa sem assumir significado de sucesso.

### Tertiary

- **Laranja de Atenção** (`warning`): comunica prioridade intermediária, espera ou risco moderado.
- **Vermelho de Exceção** (`danger`): comunica atraso, prioridade crítica, falha e contagem não vista.

### Neutral

- **Tinta Florestal** (`ink`): títulos, valores e conteúdo primário.
- **Tinta Operacional Suave** (`ink-muted`): contexto, metadados, horários e explicações.
- **Papel de Trabalho** (`paper`): topbar, controles, filas, painéis e superfícies de leitura.
- **Canvas Mineral** (`canvas`): plano de fundo contínuo da área administrativa.
- **Linha de Registro** (`line`): divisores, bordas, cabeçalhos de painel e continuidade de listas.

### Named Rules

**The State-Earns-Color Rule.** Verde, azul, violeta, laranja e vermelho só entram quando existe ação, seleção, categoria analítica ou estado real para comunicar.

**The Evergreen Frame Rule.** O evergreen pertence à moldura persistente e às seleções; grandes áreas de conteúdo permanecem claras para leitura prolongada.

**The White-Surface Rule.** O branco organiza conteúdo e controle sobre o canvas mineral; ele não deve virar uma coleção de cartões soltos sem relação.

## Typography

**Display Font:** DM Sans, com `system-ui` e `sans-serif` como fallbacks.
**Body Font:** DM Sans, com a mesma pilha de fallbacks.
**Label/Mono Font:** DM Sans; números de KPI, progresso e contagem usam numerais tabulares.

**Character:** DM Sans torna a central contemporânea e institucional sem parecer cerimonial. Pesos fortes e tracking negativo dão autoridade a títulos e métricas; rótulos pequenos, espaçados e em caixa alta orientam filtros e metadados sem disputar atenção.

### Hierarchy

- **Display** (peso 750, escala fluida até 2.25rem, linha 1.12): saudação e contexto principal do cabeçalho de comando do dashboard.
- **Headline** (peso 780, 1.35rem, linha 1.2): títulos de página compactos; a Central de Chamados usa a hierarquia local abaixo.
- **Title** (peso 750, 1rem, linha 1.25): cabeçalhos de painéis, seções e agrupamentos operacionais.
- **Body** (peso 400, 0.92rem, linha 1.55): contexto, explicações e descrições curtas; mantenha linhas contínuas entre 55–72ch.
- **Label** (peso 800, 0.61rem, tracking 0.05em): cabeçalhos de filtro, estados, metadados e orientação de controles; caixa alta somente nesses papéis.

### Named Rules

**The Number-Is-Evidence Rule.** Contagens, percentuais, horas e posição de fila usam numerais tabulares e permanecem alinhados durante atualização.

**The Compact-Authority Rule.** Títulos administrativos são compactos e densos; escala exagerada não substitui uma ordem de leitura clara.

### Central de Chamados — hierarquia local

Em `AdminTicketsPage.tsx`, DM Sans permanece, mas o assunto do chamado usa leitura de corpo (16px, peso 650, linha 1.45), e solicitante e contexto próximo usam 14px, linha 1.5. O assunto cresce para 17px em telas a partir de 1700px; não há corte que impeça a leitura de títulos longos. Referência e responsável usam 13px; prioridade, estado e idade usam 12px, sem caixa alta obrigatória. O token global `label` de 0.61rem não rege esses papéis nesta rota.

O título da página usa 30px no desktop, reduzindo conforme o espaço; a busca usa 16px e os filtros rápidos, 14px. Nos detalhes expandidos, os títulos e a descrição usam 16px, com linha 1.7 no texto; histórico usa 15px e informações complementares, 13–14px. Esses valores pertencem à implementação local em `frontend/src/styles/TicketsWorkspace.css`.

## Layout

O shell desktop reserva 236px para a sidebar fixa e 72px para a topbar. Entre 761px e 1040px, a sidebar reduz para 214px; abaixo de 760px, ela vira um drawer de até 292px acionado por um controle explícito de 44px, e a topbar passa a 64px. A área principal respeita esses offsets e nunca corre sob a navegação.

As páginas usam largura central de até 1380–1420px, margens laterais de 17–19px e intervalo vertical compacto de 12–20px, exceto pela largura local da Central de Chamados descrita abaixo. O dashboard abre com um cabeçalho de comando em duas colunas — contexto à esquerda, escopo e ações à direita — seguido por quatro indicadores, painéis de desempenho e atividade, leitura de prioridade e atalhos.

### Central de Chamados — composição local

Somente em `AdminTicketsPage.tsx`, o conteúdo ocupa até 1560px, com 32px de margem lateral e 32px de respiro superior no desktop. A primeira viewport ordena título e “Novo chamado”, uma única busca de chamados com ações de filtro e atualização, seletor “Atendimento” / “Panorama” e equipe responsável, filtros rápidos e fila. A busca global do shell não muda. Indicadores, insights e distribuição da equipe aparecem apenas em “Panorama”; a fila não precisa disputar espaço com métricas ou com um detalhe vazio.

“Atendimento” é a visão inicial. A lista usa toda a largura disponível, sem coluna lateral permanente ou rolagem interna da fila. Linhas contínuas organizam seleção, assunto e solicitante, situação, responsável e menu; divisores preservam o conjunto. Clicar no chamado expande os detalhes logo abaixo do resumo, dentro da mesma linha. Apenas um chamado fica expandido por vez; o restante da fila continua acessível, sem sobreposição ou bloqueio da página.

Até 1280px, margens laterais passam a 20px e colunas ficam mais estreitas; até 1080px, o responsável passa para uma linha abaixo do assunto. Até 760px, margens laterais passam a 16px, busca e ações empilham, equipe responsável ocupa sua própria faixa, filtros rápidos permitem rolagem horizontal, e as linhas acomodam situação e responsável abaixo do assunto. Os detalhes expandidos passam a uma coluna; ações rápidas usam dois botões por linha e o acesso ao atendimento completo ocupa a largura disponível. Até 420px, “Novo chamado” passa para baixo do título. Filtros e ações principais mantêm controles explícitos; o layout não depende de uma tabela larga no celular.

Relatórios preservam “Equipe responsável” e “Setor solicitante” como dimensões distintas e mostram um resumo do escopo ativo. No dashboard, a dimensão operacional correspondente é nomeada “Fila responsável”. A interface nunca faz o usuário inferir qual universo de dados está lendo.

**The Fixed-Frame Rule.** A navegação lateral e a topbar definem o mundo; conteúdo, filtros e detalhe se organizam dentro dessa moldura, sem uma segunda barra genérica concorrente.

**The Context-Before-Queue Rule.** Escopo, atualização, filtros e ação principal aparecem antes da lista; a fila nunca começa sem explicar o que está sendo mostrado.

**The Continuous-Queue Rule.** Chamados são linhas de uma fila contínua, separadas por divisores e estados de seleção; não são cartões flutuantes independentes.

## Elevation & Depth

O sistema é plano por padrão. Profundidade vem do contraste entre canvas e papel, de bordas de 1px, de divisores contínuos e de estados inset. Sombras são ambientais e muito baixas: confirmam a moldura fixa, o cabeçalho de comando ou um hover discreto, mas nunca fabricam hierarquia.

### Shadow Vocabulary

- **Shell lateral** (`8px 0 30px -28px rgba(3,37,27,.9)`): separação quase imperceptível entre sidebar e área de trabalho.
- **Topbar de papel** (`0 7px 22px -24px rgba(6,60,45,.75)`): mantém a faixa de utilidades legível sobre o canvas.
- **Comando ambiente** (`0 18px 42px -34px rgba(6,60,45,.95)`): somente no cabeçalho evergreen do dashboard.
- **Superfície baixa** (`0 10px 28px -26px rgba(15,61,44,.55)`): opcional em painéis de dashboard; a fila permanece sem sombra.
- **Seleção de rota** (`inset 3px 0 0 #58d289`): marca a rota ativa sem deslocar o item.

### Named Rules

**The Flat-by-Default Rule.** Se uma borda, divisor ou fundo tonal explica a relação, não adicione sombra.

**The Inset-State Rule.** Seleção acontece dentro da geometria existente — filete, contorno interno ou lavagem — e não por elevação dramática.

## Shapes

A linguagem é contida: 7–9px em controles, 10px em grupos de filtro, 11–12px em superfícies operacionais e 14px no grande cabeçalho de comando. Pílulas são reservadas a contagens, prioridade, SLA e progresso; ícones circulares aparecem apenas como suportes compactos de métricas e atividade. Dentro de listas, resumos e painéis, divisores retos preservam continuidade e as células internas abandonam raios próprios.

**The Outer-Silhouette Rule.** Arredonde a moldura externa do conjunto; células internas, linhas de fila e métricas anexadas compartilham bordas retas.

**The Pill-Means-Status Rule.** Uma pílula deve carregar estado, filtro ou contagem breve; nunca é ornamento.

## Components

### Buttons

- **Shape:** controles compactos de 7–8px, entre 38px e 42px no desktop e no mínimo 44px no mobile.
- **Primary:** verde de ação com texto branco para “Novo chamado” e ações conclusivas.
- **Command:** verde vivo com texto branco dentro do cabeçalho evergreen do dashboard.
- **Secondary:** papel ou transparência discreta com borda de registro; não compete com a ação principal.
- **Hover / Focus:** hover escurece ou lava o fundo sem deslocamento excessivo; foco visível usa contorno verde ou informativo de 3px.
- **Async States:** exportação, atualização e tentativa de recuperação bloqueiam repetição e mantêm feedback textual próximo ao controle.

### Chips

- **Style:** chips de prioridade e filtros avançados usam 32px de altura, borda fina e raio total.
- **State:** inativo é cinza-verde sobre papel; ativo usa evergreen de seleção e texto branco. A contagem fica em cápsula interna e o rótulo continua explícito.

### Cards / Containers

- **Corner Style:** 11–12px na moldura; células anexadas e linhas internas usam raio zero.
- **Background:** papel branco sobre canvas mineral.
- **Shadow Strategy:** plano na fila e baixo no dashboard; consulte Elevation & Depth.
- **Border:** linha de registro de 1px; divisores internos repetem o mesmo tom.
- **Internal Padding:** 14–20px em filas e painéis; 28–32px no cabeçalho de comando.

### Inputs / Fields

- **Style:** papel branco ou lavagem quase branca, borda de registro, raio de 8px e altura de 40–42px.
- **Focus:** borda evergreen e anel translúcido de 3px; o foco nunca depende somente de cor do texto.
- **Error / Disabled:** erro usa mensagem textual e vermelho de exceção; filtros rápidos desabilitados explicam quando filtros avançados os substituem.

### Navigation

- **Sidebar:** fixa, evergreen, 236px, com marca, links de 44px, badges e saída no rodapé.
- **Active:** lavagem verde translúcida, texto branco, ícone menta e filete interno de 3px; a rota também mantém `aria-current="page"`.
- **Topbar:** papel de 72px com busca global, data, notificações e identidade do usuário; utilidades secundárias recuam conforme o espaço diminui.
- **Mobile:** drawer lateral explícito com scrim e transição curta; o botão Menu tem 44px e a rota atual continua visível quando o drawer abre.

### Dashboard Operacional

O cabeçalho evergreen declara contexto, atualização ao vivo, “Fila responsável” e ações. Indicadores usam quatro células brancas de mesma hierarquia; categorias aparecem por ícone e cor real, sem tags decorativas. Ativos, desempenho, distribuição de chamados, atividade recente, prioridade e atalhos formam capítulos separados por cabeçalhos, linhas e proporção — não uma grade indiferenciada.

### Central de Chamados — fila e visões

Esta composição pertence somente a `AdminTicketsPage.tsx` e substitui seu antigo ledger com resumo do dia e painel mestre–detalhe permanente. “Atendimento” reúne uma busca, filtros rápidos, expansão deliberada dos filtros avançados e fila contínua. Busca e filtros mantêm o escopo explícito; a busca tem debounce de 300ms e volta à visão de atendimento. “Panorama” apresenta os indicadores reais da equipe e declara que eles independem dos filtros da fila.

A superfície da fila usa borda fina, raio externo de 12px e linhas planas com divisores. No desktop, cada linha tem pelo menos 128px de altura e 22px de preenchimento; seleção usa lavagem verde e contorno interno. Assunto é um botão legível que abre a prévia, seleção em lote tem checkbox próprio e o menu mantém as ações existentes. Estado, prioridade e “Meta de SLA excedida” têm texto além de cor.

**Contrato local de direção:**

- **THESIS:** fila em primeiro plano, em um espaço de trabalho calmo para executar o atendimento.
- **OWN-WORLD:** verde institucional, DM Sans e superfícies brancas do produto existente; shell preservado.
- **STORY:** encontrar, ler, abrir o contexto e retornar sem interrupção.
- **FIRST VIEWPORT:** título e ação, busca, visões e escopo, filtros rápidos, fila.
- **FORM:** inbox com detalhes expansíveis na própria linha; referência de direção `fcbc1f1c`.

### Central de Chamados — detalhe contextual

O detalhe usa uma região nomeada dentro da própria linha. O botão do assunto expõe `aria-expanded` e `aria-controls`; a seta gira ao expandir, e a superfície verde conecta resumo e ações. Cliques no resumo também alternam a abertura, sem interferir no checkbox, na cópia do identificador, no menu ou no conteúdo expandido. Não há modal nem rolagem interna.

A faixa superior reúne ações rápidas: assumir um chamado livre, aguardar resposta, retomar uma espera e resolver um chamado próprio, conforme as permissões existentes. Alterações bloqueiam os botões enquanto são salvas e preservam a expansão se o chamado continuar na fila. “Abrir atendimento” mantém o acesso à rota completa. Abaixo, descrição e três últimas interações ficam à esquerda; solicitante, localização, responsável, equipe, tipo, categoria e abertura ficam à direita. No celular, os grupos empilham na ordem do documento. Falhas de histórico têm mensagem e nova tentativa, distintas do estado sem mensagens; respostas de um chamado anterior são descartadas.

Clicar novamente no assunto recolhe o conteúdo; “Recolher detalhes” ou Escape dentro da região também devolve o foco ao assunto sem forçar rolagem. Textos extensos quebram linha, e a entrada discreta de 180ms respeita redução de movimento. A implementação está em `TicketInlineDetails.tsx` e nos estilos locais de `TicketsWorkspace.css`.

### Central de Chamados — atualização sem interrupção

A checagem automática roda a cada 30 segundos enquanto a página está visível; eventos de chamados são agrupados com debounce de 400ms. A resposta em segundo plano apenas sinaliza mudanças e oferece “Ver novidades”: não substitui a lista visível, não reapresenta skeletons e não altera busca, seleção ou posição de leitura. O usuário decide quando aplicar os dados. O placeholder da fila aparece somente antes da primeira carga concluída; atualizações posteriores mantêm o conteúdo disponível e mostram feedback no controle.

Ao aplicar a atualização, a busca e a página atual permanecem; a seleção conserva os IDs ainda presentes na resposta e a prévia acompanha o chamado se ele continuar na lista. Mudar filtros, escopo ou página é uma ação explícita e pode limpar a seleção. Erros de atualização mantêm a última fila e oferecem nova tentativa. Erros do panorama não impedem usar o atendimento. Esse comportamento é local à rota e não altera a política de atualização do dashboard ou dos relatórios.

### Escopos e transparência da fila

- Relatórios mantêm “Equipe responsável” e “Setor solicitante” separados e repetem o escopo ativo em um resumo visível.
- O dashboard chama a dimensão de atendimento de “Fila responsável”.
- Para o solicitante, mostrar “Posição estimada”, “Na sua frente” e “Nesta fila” quando os dados existirem, junto do aviso de que prioridade e impacto podem reordenar a fila.
- Informações temporais usam “Meta de SLA”; posição, prazo e ordem nunca são apresentados como promessa.

## Do's and Don'ts

### Do:

- **Do** manter sidebar evergreen e topbar de papel como moldura persistente da operação administrativa.
- **Do** colocar contexto, escopo, atualização, filtros e ação principal na primeira viewport.
- **Do** organizar dashboard e fila por capítulos, faixas anexadas, listas contínuas e divisores de 1px.
- **Do** usar DM Sans, pesos compactos e números tabulares para leitura em varredura.
- **Do** manter estados de carregamento, erro, vazio, atualização, exportação e sucesso textualmente claros.
- **Do** preservar distinção entre equipe responsável, setor solicitante e fila responsável.
- **Do** comunicar posição e Meta de SLA como estimativas operacionais sujeitas a prioridade e impacto.
- **Do** garantir foco visível, `aria-current`, rótulos além da cor e alvos mínimos de 44px no mobile.

### Don't:

- **Don't** voltar a uma barra horizontal genérica ou a uma grade de cartões sem hierarquia.
- **Don't** usar cor sem estado, categoria analítica ou ação real que a justifique.
- **Don't** transformar linhas de chamados, métricas anexadas ou resumos em cartões flutuantes independentes.
- **Don't** esconder o escopo atual ou misturar equipe responsável com setor solicitante.
- **Don't** apresentar posição, ordem ou prazo como promessa; use estimativas e “Meta de SLA”.
- **Don't** usar gradientes decorativos, sombras pesadas, ícones ornamentais ou animação contínua para fabricar importância.
- **Don't** esconder navegação, filtros essenciais ou ação primária no mobile sem um controle explícito.

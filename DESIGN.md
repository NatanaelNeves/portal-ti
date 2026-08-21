---
name: Portal de Servicos Internos — Operacao Administrativa
description: Um centro de comando humano que transforma atividade de TI em evidencia clara de impacto.
colors:
  ink: "#132a21"
  ink-soft: "#52645d"
  command-deep: "#09271b"
  command: "#103c2a"
  evergreen: "#15553a"
  action-green: "#1d6b48"
  mist-green: "#dcebe2"
  wash-green: "#edf5f0"
  action-mint: "#a7d9b6"
  paper: "#fffefa"
  canvas: "#f3f6f2"
  divider: "#d8e0da"
  divider-strong: "#bdc9c0"
  info: "#245d8f"
  info-soft: "#e8f1f8"
  warning: "#a45c12"
  warning-soft: "#fff2dd"
  danger: "#a33b35"
  danger-soft: "#fbeae8"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif"
    fontSize: "clamp(2.2rem, 3.8vw, 3.7rem)"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.7rem, 3vw, 2.65rem)"
    fontWeight: 640
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  compact: "8px"
  control: "9px"
  medium: "12px"
  surface: "14px"
  hero: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  section: "34px"
  major: "52px"
components:
  button-primary:
    backgroundColor: "{colors.action-mint}"
    textColor: "{colors.command-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "43px"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.07)"
    textColor: "#edf6f0"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "42px"
  field:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "41px"
  chip-selected:
    backgroundColor: "{colors.command}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "34px"
  card-ledger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "22px"
  navigation-active:
    backgroundColor: "rgba(167, 217, 182, 0.13)"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "4px 7px"
---

# Design System: Portal de Serviços Internos — Operação Administrativa

## Overview

**Creative North Star: "The Operational Impact Ledger"**

O sistema visual trata a operação de TI como um livro de evidências vivo: sóbrio, confiável e rápido de ler. O verde-esmeralda institucional cria o mundo de comando; superfícies de papel levemente aquecido organizam métricas, filas e relatos sem parecer uma coleção genérica de cartões. A densidade é alta, mas cada bloco tem hierarquia explícita, números tabulares e divisões regradas que favorecem leitura em varredura.

A experiência deve conduzir uma narrativa operacional completa: primeiro mostrar onde há atenção e qual é o ritmo atual, depois permitir executar a fila e, por fim, traduzir o trabalho em impacto para a liderança. O cabeçalho da primeira viewport sempre estabelece contexto e estado; a informação priorizada vem imediatamente abaixo. Estados de carregamento, falha e sucesso são parte do sistema, não acabamento opcional.

### Directional Contract

- **THESIS:** transformar atividade operacional de TI em evidência legível de impacto.
- **OWN-WORLD:** identidade institucional verde-esmeralda sobre papel off-white, com linguagem de ledger e relatório.
- **STORY:** enxergar atenção e ritmo; executar a fila; explicar impacto à liderança.
- **FIRST VIEWPORT:** cabeçalho de comando com estado atual e resumo priorizado.
- **FORM:** seed determinística `cba51653`, candidato estrutural aterrado 6, “operational impact ledger”; células regradas e hierarquia densa, porém escaneável.
- **FINISH:** estados honestos de carregamento, erro e sucesso; navegação móvel explícita; alvos de toque adequados; exportações com feedback.

**Key Characteristics:**

- Verde profundo para contexto de comando; papel e canvas quentes para trabalho prolongado.
- Divisões de ledger, tabelas e listas contínuas no lugar de mosaicos soltos.
- Tipografia de sistema precisa, números tabulares e títulos compactos de alto contraste.
- Cor semântica reservada para prioridade, SLA, risco e estado real.
- Responsividade que reorganiza a hierarquia sem esconder controles essenciais.

## Colors

A paleta combina verdes institucionais profundos com neutros orgânicos e usa azul, âmbar e vermelho apenas para informação acionável.

### Primary

- **Verde Comando Profundo** (`command-deep`, #09271b): cabeçalhos de comando e a moldura visual das páginas administrativas.
- **Verde Operacional** (`action-green`, #1d6b48): progresso, estados positivos, ícones e ênfases de ação dentro das superfícies claras.
- **Menta de Ação** (`action-mint`, #a7d9b6): ação primária sobre fundos escuros, preservando contraste sem recorrer a branco puro.

### Secondary

- **Azul Informativo** (`info`, #245d8f): foco visível e estados informativos que precisam se distinguir do sucesso.
- **Âmbar de Atenção** (`warning`, #a45c12): pendências, espera e risco moderado.
- **Vermelho de Exceção** (`danger`, #a33b35): atraso, falha e prioridade crítica.

### Neutral

- **Tinta Florestal** (`ink`, #132a21): texto principal, números e títulos sobre superfícies claras.
- **Tinta Suave** (`ink-soft`, #52645d): contexto, metadados e texto secundário.
- **Papel Operacional** (`paper`, #fffefa): cartões, tabelas e células de leitura.
- **Canvas Mineral** (`canvas`, #f3f6f2): fundo geral que separa superfícies sem contraste agressivo.
- **Linha de Ledger** (`divider`, #d8e0da): bordas, divisores e grade estrutural.

### Named Rules

**The Evidence Color Rule.** Verde, azul, âmbar e vermelho devem comunicar significado operacional; não decorar áreas sem estado.

**The Paper-and-Ink Rule.** Conteúdo denso vive em papel quente com tinta florestal. Branco puro aparece apenas em controles, realces e estados ativos.

## Typography

**Display Font:** pilha de sistema com Segoe UI e Roboto como fallbacks.
**Body Font:** a mesma pilha de sistema, para consistência e leitura rápida.
**Label/Mono Font:** pilha de sistema para rótulos; números usam `font-variant-numeric: tabular-nums`.

**Character:** a tipografia é direta e institucional, com títulos de tracking negativo para autoridade e rótulos compactos em caixa alta para orientação. A ausência de uma fonte decorativa mantém o foco na evidência.

### Hierarchy

- **Display** (peso 650, `clamp(2.2rem, 3.8vw, 3.7rem)`, linha 1): títulos de páginas e mensagens executivas no cabeçalho de comando.
- **Headline** (peso 640, `clamp(1.7rem, 3vw, 2.65rem)`, linha 1.08): narrativas de impacto e blocos executivos.
- **Title** (peso 720, 1.25rem): seções principais e agrupamentos de análise.
- **Body** (peso 400, 0.95rem, linha 1.55): explicações, contexto e conteúdo contínuo; limite preferencial de 60–72ch.
- **Label** (peso 700, 0.72rem, tracking 0.06em): estados, filtros e metadados; caixa alta apenas quando funciona como orientação.

### Named Rules

**The Number-Is-Evidence Rule.** Valores operacionais importantes usam alinhamento e numerais tabulares; nunca variam de posição durante atualização.

**The Two-Level Scan Rule.** Cada região começa com uma decisão ou número e termina com contexto; evite mais de dois níveis de texto competindo dentro da mesma célula.

## Layout

O desktop usa containers centrais entre 1480px e 1540px, com margens laterais de 18–20px e ritmo vertical amplo entre grandes seções. Cabeçalhos são grades de duas colunas — narrativa à esquerda, ações ou estado à direita — e os corpos usam células regradas, listas contínuas e painéis lado a lado. O espaçamento cresce de 4px em relações íntimas até 52px entre capítulos operacionais.

Em até 1180px, composições de impacto, KPI e fila/detalhe colapsam para uma coluna. Em até 900px, cabeçalhos e filtros passam para fluxo vertical. Em até 620px, navegação vira menu explícito, grades viram uma coluna, controles essenciais ocupam a largura disponível e alvos interativos têm no mínimo 44px.

**The Priority-First Rule.** A primeira viewport contém estado atual e resumo priorizado; gráficos exploratórios e histórico vêm depois.

**The Ledger Continuity Rule.** Métricas relacionadas compartilham uma moldura e divisores de 1px; não as fragmente em cartões flutuantes sem relação visual.

## Elevation & Depth

O sistema é plano por padrão e constrói profundidade com contraste tonal, bordas e agrupamento. Sombras são ambientais e raras: apenas cabeçalhos de comando recebem um halo baixo, e alguns estados ativos usam uma sombra mínima para confirmar seleção. Hover em células prefere mudança de fundo ou contorno interno.

### Shadow Vocabulary

- **Comando Ambiente** (`0 18px 48px -36px rgba(9, 39, 27, 0.9)`): somente nos grandes cabeçalhos verde-profundo.
- **Seleção Baixa** (`0 4px 12px -10px rgba(19, 42, 33, 0.7)`): tabs e filtros ativos sobre trilhos neutros.
- **Contorno de Célula** (`inset 0 0 0 1px #1d6b48`): hover de KPI sem deslocar o layout.

**The Flat-by-Default Rule.** Superfícies de trabalho ficam planas em repouso; sombra não substitui borda, contraste ou hierarquia.

## Shapes

Grandes molduras de comando usam cantos suavemente curvos de 16px; superfícies operacionais usam 14px; trilhos e agrupadores, 12px; controles, 8–10px. Células internas perdem o raio e deixam a borda externa definir a silhueta. Pílulas de 999px são reservadas a filtros, badges e estados breves.

**The Outer-Silhouette Rule.** Arredonde a moldura do conjunto, não cada célula de uma grade. A continuidade visual é parte da linguagem de ledger.

## Components

### Buttons

- **Shape:** controles compactos e seguros, com cantos de 8–10px e altura de 41–44px.
- **Primary:** menta de ação sobre fundo de comando; texto verde-profundo e peso 700.
- **Hover / Focus:** hover pode subir 1px apenas em ações isoladas; foco sempre usa contorno azul translúcido de 3px com offset de 2px.
- **Secondary / Ghost:** fundo branco translúcido em cabeçalhos ou lavagem verde em superfícies claras; nunca compete com a ação principal.
- **Async States:** bloqueia repetição enquanto processa e exibe feedback textual de sucesso ou falha próximo ao grupo.

### Chips

- **Style:** pílulas compactas com borda de ledger e texto suave quando inativas.
- **State:** seleção usa verde comando e texto branco; contagem fica em cápsula interna translúcida. Prioridade e SLA combinam cor com texto explícito.

### Cards / Containers

- **Corner Style:** 14px na moldura externa; zero nas células internas.
- **Background:** papel operacional sobre canvas mineral.
- **Shadow Strategy:** plano por padrão; consulte Elevation & Depth.
- **Border:** linha de ledger de 1px; separadores internos usam o mesmo token.
- **Internal Padding:** 18–24px em células; 30–38px em blocos executivos.

### Inputs / Fields

- **Style:** fundo branco, borda forte de ledger, raio de 9px, altura de 41px no desktop e 44px no mobile.
- **Focus:** contorno azul translúcido compartilhado por inputs, selects, botões e links.
- **Error / Disabled:** erro usa vermelho de exceção em texto e lavagem correspondente; disabled reduz opacidade e mantém o rótulo legível.

### Navigation

- **Style:** barra interna escura e compacta; item ativo usa lavagem de menta, texto branco e borda sutil.
- **Desktop:** links permanecem em uma linha, com densidade progressivamente reduzida abaixo de 1500px.
- **Mobile:** botão “Menu” de 44px controla uma grade expansível de duas colunas; rota atual continua explicitamente marcada.

### Operational Impact Ledger

O componente assinatura combina narrativa executiva à esquerda e quatro células de evidência à direita. Cada célula coloca o rótulo acima e o número dominante abaixo, usa numerais tabulares e mantém divisores contínuos. Em telas menores, narrativa e ledger empilham sem mudar a ordem da história.

## Do's and Don'ts

### Do:

- **Do** começar páginas administrativas com um cabeçalho de comando que declare contexto, estado e ação principal.
- **Do** agrupar métricas comparáveis em ledgers contínuos com divisores de 1px.
- **Do** manter carregamento, erro, vazio, sucesso e atualização visíveis e honestos.
- **Do** preservar rótulos explícitos junto a cor, especialmente em prioridade, SLA e falha.
- **Do** manter 44px como mínimo de alvo interativo em telas de até 620px.

### Don't:

- **Don't** usar gradientes coloridos, ícones decorativos ou sombras pesadas para fabricar importância.
- **Don't** inventar métricas ou apresentar dados antigos como atualizados.
- **Don't** transformar todo dado em cartão arredondado independente; preserve relações em grades, listas e tabelas.
- **Don't** esconder navegação ou ações essenciais no mobile sem um controle de abertura explícito.
- **Don't** depender só de cor para comunicar estado, prioridade ou resultado de exportação.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Equipes internas de TI e lideranças que acompanham a operação do Portal de Serviços Internos. A equipe de TI usa o sistema durante o trabalho diário para priorizar, atender e documentar chamados, acompanhar ativos e prestar contas do trabalho realizado.

## Product Purpose

Centralizar a operação de suporte interno, inventário e serviços administrativos. O sucesso significa reduzir o esforço para entender o que exige atenção agora, manter a fila organizada e transformar a atividade operacional em evidência clara de volume, velocidade e qualidade do trabalho.

## Positioning

O portal conecta o atendimento de chamados aos ativos e às rotinas internas da organização em uma única visão operacional, permitindo que a equipe execute o trabalho e demonstre seu impacto sem montar relatórios manualmente.

## Operating Context

- Uso recorrente em desktop pela equipe interna durante o expediente.
- Dashboard para leitura rápida da saúde da operação.
- Página de chamados para triagem, filtros, atribuição e acompanhamento.
- Relatórios para análise por período, equipe responsável (TI, RH ou Administrativo), setor solicitante, status, prioridade e SLA, com o escopo atual sempre visível.
- Apresentação de resultados para coordenação e liderança.

## Capabilities and Constraints

- Aplicação React e TypeScript existente; manter rotas, integrações de API e permissões por perfil.
- Preservar os termos já usados no produto: chamados, ativos, inventário, SLA, equipe e relatórios.
- Não inventar métricas que a API não fornece; indicadores derivados devem usar apenas dados já disponíveis.
- Tratar equipe responsável e setor solicitante como dimensões distintas: a primeira define quem atende; a segunda identifica de onde veio a demanda.
- Posição de fila e SLA são estimativas operacionais. Usar “Meta de SLA” e avisos de reordenação por impacto; nunca comunicar prazo ou ordem como promessa.
- Interface responsiva e utilizável em telas menores, embora o contexto principal seja desktop.

## Brand Commitments

- Produto: Portal de Serviços Internos.
- Organização: O Pequeno Nazareno.
- Preservar a identidade institucional verde e o tom humano, direto e profissional já presentes no sistema.
- A interface administrativa pode ser mais sóbria e analítica do que o portal público, sem perder a ligação com a marca.

## Evidence on Hand

- Dados reais vindos das APIs existentes de dashboard, chamados, técnicos, tendências e SLA.
- Código e textos atuais nas páginas administrativas.
- Não há imagens, depoimentos ou benchmarks externos a serem apresentados como prova.

## Product Principles

- Prioridade antes de volume: destacar primeiro o que exige ação.
- Evidência sem esforço: transformar dados operacionais em uma narrativa clara de impacto.
- Densidade com legibilidade: permitir leitura rápida sem esconder informação útil.
- Uma operação, três perspectivas: executar no dashboard e chamados; explicar nos relatórios.
- Confiança por honestidade: estados vazios, falhas e métricas devem ser claros e nunca decorativos.
- Transparência sem promessa: mostrar posição estimada, quantidade à frente e total da fila quando disponíveis, explicando que prioridade e impacto podem alterar a ordem.

## Accessibility & Inclusion

A interface deve manter contraste legível, foco visível, navegação por teclado, alvos de toque adequados e não depender apenas de cor para comunicar estados.

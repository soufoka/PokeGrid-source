---
id: PG-011
tipo: feature
prioridade: p1
area: ux
estado: fazendo
responsavel: Codex (prévia local)
github_issue:
---

# Nova navegação e palco de batalha global

## Problema

O Modo Simples oferece muitos dados e controles no mesmo nível, elevando carga
cognitiva e escondendo o estado mais importante.

## Resultado esperado

Visão geral com palco da conta em foco, quatro KPIs, saúde das contas e eventos
relevantes, apoiada por navegação estável entre áreas.

## Critérios de aceite

- [x] Navegação principal tem no máximo cinco áreas persistentes.
- [ ] Configurações ficam em um menu único.
- [ ] Palco mostra líder, inimigo, níveis, HP, hunt e último golpe.
- [ ] Sprites usam PokeAPI com fallback e cache por espécie.
- [x] Cenário continua legível sem rede ou sprite.
- [x] Os quatro campos globais mantêm líder e inimigo animados.
- [ ] CPU e foco são verificados com quatro contas.
- [ ] Modo Simples antigo permanece acessível durante o rollout.

## Dependências

PG-010 e PG-006.

## Log

### 2026-07-26 — Leo

- Estado: ticket criado.
- Evidência: protótipo `pokegrid-experience.html`.
- Próxima ação: implementar primeiro com sprites estáticos e dados demonstráveis.

### 2026-07-26 — Codex — prévia integrada

- Botão `✨ Novo painel` e navegação Visão geral/Time & IV/Inventário integrados.
- Palco usa líder, encontro e sprites PokeAPI com fallback estático.
- Quatro KPIs, saúde das contas e eventos já usam o coletor quando há login.
- Webviews permanecem vivos sob o overlay.
- Validado no Electron em 2294×890 e 1024×720, sem overflow ou erro de console.
- Pendente para aceite final: confirmar encontro/último golpe com uma conta
  autenticada e medir CPU numa sessão longa.

### 2026-07-26 — Codex — modo simples integrado

- A navegação passou a ter quatro áreas: Todas as contas, Conta em foco,
  Time & IV e Inventário.
- `🌐 Todas as contas` substitui o botão do Modo Simples sem apagar a
  implementação antiga, que segue como fallback durante o rollout.
- A visão consolidada reutiliza os mesmos históricos persistidos do Modo
  Simples: hoje, 7 dias, total, metas, capturas, shinies e medições de hunt.
- Sessão ao vivo inclui KPIs, tempo, melhor/última captura, tentativas de shiny,
  recursos, compartilhados no chat e tendência da última hora.
- Cada prévia de batalha e linha de desempenho fecha overlays e amplia o
  webview da conta correspondente em modo foco.
- Validado no Electron com quatro webviews, 1440×900 e 1024×720, zero erro de
  console/page e sem overflow horizontal.

### 2026-07-26 — Codex — Outland, capturas e navegação compacta

- Variantes de Outland agora preservam nome, ID, stats e golpes do registro
  próprio, mas resolvem a imagem pelo `captureBase`; `Brave Steelix` (10534),
  por exemplo, usa o sprite do Steelix (208).
- A Central ganhou troca rápida entre as quatro contas e um botão `Jogo N` que
  fecha o overlay e devolve a conta selecionada já ampliada.
- Nova quinta área `Capturas`, com busca, conta, IV mínimo, qualidade mínima,
  período, tipo e ordenação; até 10 mil registros persistidos são apresentados
  em páginas de 100 para manter o painel leve.
- Inventário e Poké Balls usam os ícones entregues pelos catálogos do próprio
  jogo; sprites genéricos de itens da PokeAPI foram removidos.
- O modo `Limpar jogo` não esconde mais o Auto Helper. Dock, HUD, Auto Helper,
  janelas internas e cabeçalhos dos quatro painéis receberam regras compactas
  para viewport reduzida.
- As quatro prévias globais usam sprites animados de líder e inimigo, com
  fallback estático quando a animação não existe.
- Validação estrutural: scripts principal e inline compilam, `git diff --check`
  passa e as asserções de aliases Outland, ícones oficiais, filtros, retenção e
  responsividade estão verdes. Validação visual final continua no cliente
  Electron, porque o navegador incorporado bloqueia páginas `file://`.

### 2026-07-26 — Codex — correção após teste do usuário

- Capturas deixou de escolher entre histórico ou sessão: agora mescla e deduplica
  as duas fontes das quatro contas, tem sincronização explícita e registra o
  `speciesId` assim que um Pokémon novo entra na coleção.
- Inventário virou consolidado por padrão, com seções para as quatro contas,
  seletor global/individual, totais e os mesmos filtros sobre todo o estoque.
- Sprites animados foram restaurados nos quatro campos de batalha.
- A linguagem visual da Central foi estendida para barra, menu, painéis,
  modais, Scripts, Resumo, Cartas e janelas internas responsivas do jogo.

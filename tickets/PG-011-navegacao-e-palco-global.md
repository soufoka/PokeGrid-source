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

- [ ] Navegação principal tem no máximo cinco áreas persistentes.
- [ ] Configurações ficam em um menu único.
- [ ] Palco mostra líder, inimigo, níveis, HP, hunt e último golpe.
- [ ] Sprites usam PokeAPI com fallback e cache por espécie.
- [ ] Cenário continua legível sem rede ou sprite.
- [ ] Apenas o palco em foco pode usar animação.
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

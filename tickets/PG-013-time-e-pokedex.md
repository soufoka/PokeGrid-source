---
id: PG-013
tipo: feature
prioridade: p1
area: ux
estado: pronto
responsavel:
github_issue:
---

# Time atual e ficha Pokepedia

## Problema

O painel global reduz hoje cada integrante a nome, nível, shiny e tipo. A Central
de IV é separada e exige que o usuário reconstrua o contexto.

## Resultado esperado

Time atual em seis posições, com sprite e IV, abrindo uma ficha fiel aos dados do
Poke Idle World.

## Critérios de aceite

- [ ] Cada integrante mostra sprite, nível, HP, qualidade, IV/192 e poder.
- [ ] Seleção preserva o contexto da conta.
- [ ] Ficha distingue IV confirmado de IV estimado.
- [ ] Exibe seis IVs e base stats lado a lado.
- [ ] Exibe tipos, fraquezas/resistências e ataques do jogo.
- [ ] Ataques incluem tipo, categoria, poder, cooldown e nível.
- [ ] PokeAPI não é usada como fonte da lista de golpes.
- [ ] Sem time ou catálogo há estado vazio explicativo.

## Dependências

PG-010.

## Log

### 2026-07-26 — Leo

- Estado: ticket criado.
- Evidência: `creatures.json.attacks` contém os nove golpes do Gyarados.
- Próxima ação: reconciliar os stats observados do WebSocket com o leitor atual.


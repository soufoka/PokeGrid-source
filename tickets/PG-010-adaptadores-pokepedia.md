---
id: PG-010
tipo: feature
prioridade: p0
area: data
estado: fazendo
responsavel: Leo (arquitetura)
github_issue:
---

# Adaptadores versionados de Pokepedia, itens e time

## Problema

A interface consome formatos remotos diretamente e descarta campos importantes
do time. Novas telas aumentariam o acoplamento ao monólito.

## Resultado esperado

Adaptadores puros normalizam `creatures.json`, `items.json`, `pokes` e
`poke-delta` em modelos estáveis para a interface.

## Critérios de aceite

- [ ] Espécie inclui base stats, tipos, ataques, drops, hunt, XP e valor NPC.
- [ ] Item inclui id, nome, ícone resolvido, categoria, raridade e valor NPC.
- [ ] Time preserva instância, espécie, slot, líder, nível, HP, qualidade, IV e stats.
- [ ] `poke-delta` atualiza a mesma instância sem perder campos anteriores.
- [ ] Fixtures cobrem Gyarados e três formatos de URL de ícone.
- [ ] Falhas de catálogo não derrubam a coleta nem a interface.

## Dependências

PG-002 e PG-003.

## Log

### 2026-07-26 — Leo

- Estado: ticket criado a partir de `docs/PRODUCT_DESIGN_V2.md`.
- Evidência: os catálogos públicos atuais expõem 299 criaturas e 261 itens.
- Próxima ação: capturar fixtures mínimas e definir os tipos normalizados.

### 2026-07-26 — Leo — contrato fechado

- Estado: arquitetura e handoff concluídos em `docs/DATA_CONTRACT_V2.md`.
- Evidência: catálogo auditado por formato e casos-limite. IDs de espécie são
  únicos, nomes não: Blastoise aparece como `9` e `10001`; Ditto não possui
  ataques. Ícones de item aparecem como URL permitida, caminho relativo ou vazio.
- Decisões: ID vence nome; nome ambíguo não alimenta cálculo; delta preserva
  campos ausentes e aceita zero/false; PokeAPI é apenas fallback de base e fonte
  de sprite, nunca de golpes.
- Verificação: vetores definidos para espécie, item, delta e fórmula no nível
  138/500.
- Arquivos previstos na implementação: `src/data/*`, `src/domain/power.js` e
  `test/fixtures|data`.
- Próxima ação: agente implementador criar o runner mínimo do PG-002 e executar
  a ordem de implementação descrita no contrato.

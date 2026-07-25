---
id: PG-007
tipo: feature
prioridade: p2
area: ux
estado: pronto
responsavel:
github_issue:
---

# Alertas configuráveis por conta

## Problema

Os limites são globais e fixos no código: 100 bolas, 15 potions e 5 revives.
Contas em estágios diferentes geram ruído ou avisam tarde.

## Resultado esperado

Perfis de alerta globais com sobrescrita opcional por conta.

## Critérios de aceite

- [ ] Limites editáveis para bolas, potions e revives.
- [ ] Cada evento pode ser silenciado.
- [ ] Conta pode herdar o padrão ou sobrescrever.
- [ ] Histerese continua evitando notificações repetidas.
- [ ] Configuração entra no backup e na migração.

## Fora do escopo

- Alertas remotos além do Discord existente.

## Riscos

Interface de configuração ficar complexa.

## Verificação

Testar herança, sobrescrita, silêncio e reabastecimento.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado.
- Evidência: constantes `BALL_MIN`, `POTION_MIN` e `REVIVE_MIN`.
- Próxima ação: depende de PG-004.

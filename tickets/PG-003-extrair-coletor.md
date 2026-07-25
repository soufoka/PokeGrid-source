---
id: PG-003
tipo: tech-debt
prioridade: p1
area: data
estado: pronto
responsavel:
github_issue:
---

# Extrair parser e cálculos do coletor

## Problema

Coleta WebSocket, normalização e cálculos de sessão vivem como strings extensas
dentro de `index.html`, junto da interface.

## Resultado esperado

Parser e cálculos testáveis em módulos próprios, sem mudança de comportamento.

## Critérios de aceite

- [ ] Mensagens conhecidas produzem o mesmo estado de antes.
- [ ] Cálculos de gold/h, XP/h, capturas e suprimentos mantêm os resultados.
- [ ] Fixtures não contêm tokens nem dados pessoais.
- [ ] O PR/commit não muda visual ou funcionalidade.
- [ ] Testes cobrem troca de hunt, reload e captura shiny.

## Fora do escopo

- Redesenhar o dashboard.
- Migrar `<webview>`.

## Riscos

Alterar silenciosamente números históricos. Comparar snapshots antes/depois.

## Verificação

Fixtures de frames reais saneados e comparação de snapshots.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado.
- Evidência: coletor e `READ_STATE` estão embutidos em `index.html`.
- Próxima ação: depende de PG-002.

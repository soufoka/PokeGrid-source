# Tickets locais do PokeGrid

Esta pasta é a fonte de verdade do trabalho enquanto o projeto estiver na fase
local. Não criar issues, branches remotas ou PRs sem autorização do mantenedor.

## Fluxo

`triagem → pronto → fazendo → revisao → feito`

`bloqueado` pode substituir temporariamente `fazendo`.

Antes de começar, o agente deve preencher `responsavel`, mudar o estado e
registrar seu plano no `log`. Commits usam o identificador do ticket, por
exemplo: `fix(PG-001): refuse insecure credential storage`.

## Backlog

| Ticket | Prioridade | Estado | Título |
|---|---:|---|---|
| [PG-001](PG-001-credenciais-seguras.md) | P0 | pronto | Nunca persistir credenciais sem criptografia real |
| [PG-002](PG-002-baseline-qualidade.md) | P0 | pronto | Lockfile, checks, testes básicos e CI local |
| [PG-003](PG-003-extrair-coletor.md) | P1 | pronto | Extrair parser e cálculos do coletor |
| [PG-004](PG-004-storage-versionado.md) | P1 | pronto | Storage versionado e migrações |
| [PG-005](PG-005-central-eventos.md) | P1 | pronto | Central de Eventos persistente |
| [PG-006](PG-006-overlay-compacto.md) | P1 | pronto | Overlay compacto das quatro contas |
| [PG-007](PG-007-alertas-por-conta.md) | P2 | pronto | Alertas configuráveis por conta |
| [PG-008](PG-008-diagnostico-inicial.md) | P2 | pronto | Diagnóstico de primeira execução |
| [PG-009](PG-009-spike-webcontentsview.md) | P2 | pronto | Spike de WebContentsView |
| [PG-010](PG-010-adaptadores-pokepedia.md) | P0 | fazendo | Adaptadores versionados de Pokepedia, itens e time |
| [PG-011](PG-011-navegacao-e-palco-global.md) | P1 | pronto | Nova navegação e palco de batalha global |
| [PG-012](PG-012-inventario-visual.md) | P1 | pronto | Inventário visual com sprites e atenção |
| [PG-013](PG-013-time-e-pokedex.md) | P1 | pronto | Time atual e ficha Pokepedia |
| [PG-014](PG-014-laboratorio-iv.md) | P1 | pronto | Laboratório de comparação e projeção de IV |

## Ordem recomendada

Base: `PG-001 → PG-002 → PG-003 → PG-004 → PG-005/PG-006`

Experiência V2: `PG-010 → PG-013 → PG-014` e `PG-010 → PG-012/PG-011`

Os tickets de experiência dependem da base segura e modular para não aumentar o
monólito atual.

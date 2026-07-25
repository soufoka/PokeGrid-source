---
id: PG-006
tipo: feature
prioridade: p1
area: ux
estado: pronto
responsavel:
github_issue:
---

# Overlay compacto das quatro contas

## Problema

O usuário precisa abrir o Grid inteiro para saber se as contas continuam
farmando enquanto usa outro programa.

## Resultado esperado

Janela opcional sempre no topo com estado das contas, gold/h, recurso crítico e
último evento.

## Critérios de aceite

- [ ] Overlay pode ser ligado/desligado sem afetar o farm.
- [ ] Exibe as quatro contas de forma legível e compacta.
- [ ] Clique numa conta abre/foca o painel correspondente.
- [ ] Não rouba foco durante digitação no jogo.
- [ ] Posição e visibilidade persistem.

## Fora do escopo

- Controles de automação do jogo.
- Dashboard completo dentro do overlay.

## Riscos

Roubo de foco e comportamento diferente entre sistemas. Aplicar as lições de
layout idempotente do Launcher.

## Verificação

Teste de foco, múltiplos monitores, minimizar/bandeja e retorno.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado a partir do overlay do Launcher.
- Evidência: Grid não tem visão always-on-top.
- Próxima ação: executar após a Central de Eventos ou em paralelo com dados já
  normalizados.

---
id: PG-005
tipo: feature
prioridade: p1
area: dashboard
estado: pronto
responsavel:
github_issue:
---

# Central de Eventos persistente

## Problema

Notificações de queda, reconexão, farm parado e recursos baixos desaparecem. Ao
voltar para o PC, o usuário não consegue reconstruir o que ocorreu.

## Resultado esperado

Linha do tempo local, filtrável por conta e tipo, com os eventos que explicam o
farm.

## Critérios de aceite

- [ ] Registra shiny, queda, reconexão, farm parado, recurso baixo e time caído.
- [ ] Mostra conta, horário, severidade e resolução quando aplicável.
- [ ] Persiste entre reinicializações com limite de retenção.
- [ ] Permite filtrar por conta e tipo.
- [ ] Não armazena senha, token ou conteúdo sensível.

## Fora do escopo

- Telemetria remota.
- Feed social ou sincronização.

## Riscos

Ruído excessivo e storage ilimitado. Eventos repetidos precisam de dedupe e
histerese.

## Verificação

Simular cada evento e conferir persistência, filtros e retenção.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado a partir do feed persistente do Launcher.
- Evidência: alertas atuais são principalmente efêmeros.
- Próxima ação: depende de PG-004.

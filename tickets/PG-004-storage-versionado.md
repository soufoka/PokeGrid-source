---
id: PG-004
tipo: tech-debt
prioridade: p1
area: data
estado: pronto
responsavel:
github_issue:
---

# Storage versionado e migrações

## Problema

Configurações, histórico, layout e logs vivem em várias chaves de
`localStorage`, sem versão central ou migração testável.

## Resultado esperado

Uma camada de storage com schema, versão, validação, backup e migrações
idempotentes.

## Critérios de aceite

- [ ] Schema e versão documentados.
- [ ] Dados atuais migram sem perda.
- [ ] Migração pode rodar duas vezes sem duplicar dados.
- [ ] Arquivo inválido não executa código nem quebra a inicialização.
- [ ] Exportar/importar continua compatível ou tem migração explícita.

## Fora do escopo

- Sincronização em nuvem.
- Banco de dados remoto.

## Riscos

Perder histórico de 90 dias, layout ou lista de shinies.

## Verificação

Fixtures de storage antigo, atual, corrompido e importado.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado.
- Evidência: múltiplas chaves sem versão em `index.html`.
- Próxima ação: executar após PG-002 e preferencialmente PG-003.

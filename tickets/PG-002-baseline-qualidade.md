---
id: PG-002
tipo: tech-debt
prioridade: p0
area: desktop
estado: pronto
responsavel:
github_issue:
---

# Lockfile, checks, testes básicos e CI local

## Problema

O repositório não tem lockfile, comando de validação nem testes. Mudanças podem
quebrar sintaxe, segurança ou inicialização sem sinal automático.

## Resultado esperado

Uma base reproduzível que qualquer pessoa ou IA execute antes de declarar um
ticket pronto.

## Critérios de aceite

- [ ] `package-lock.json` versionado.
- [ ] `npm run check` valida JavaScript e artefatos essenciais.
- [ ] `npm test` cobre ao menos o cofre de credenciais e funções extraídas.
- [ ] Um comando local executa check + testes.
- [ ] O README documenta os comandos.

## Fora do escopo

- Empacotadores e release automático.
- Teste visual completo dos quatro jogos.

## Riscos

Fixar uma versão problemática do Electron ou criar testes que dependam da rede.
O baseline deve funcionar offline após instalar dependências.

## Verificação

Instalação limpa, `npm run check` e `npm test`.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado.
- Evidência: `package.json` tem apenas `npm start`.
- Próxima ação: executar depois ou junto de PG-001 para testar o cofre.

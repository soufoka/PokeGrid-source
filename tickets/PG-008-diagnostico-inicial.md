---
id: PG-008
tipo: feature
prioridade: p2
area: ux
estado: pronto
responsavel:
github_issue:
---

# Diagnóstico de primeira execução

## Problema

A proposta source-first depende de confiança, mas o usuário leigo não consegue
verificar facilmente se criptografia, sessões, conectividade e isolamento estão
funcionando.

## Resultado esperado

Uma tela curta de saúde do ambiente e caminho claro para o relatório de erros.

## Critérios de aceite

- [ ] Mostra versão do app/Electron e sistema.
- [ ] Informa se credenciais podem ser salvas com segurança.
- [ ] Verifica conectividade com o domínio do jogo.
- [ ] Confirma partições independentes sem revelar cookies.
- [ ] Explica onde abrir o relatório de erros.

## Fora do escopo

- Enviar diagnóstico automaticamente.
- Expor tokens, cookies ou detalhes sensíveis.

## Riscos

Passar falsa sensação de segurança com checks superficiais.

## Verificação

Testar estados saudável, offline e sem cofre seguro.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado.
- Evidência: tutorial explica execução, mas não valida o ambiente.
- Próxima ação: depende de PG-001/PG-002.

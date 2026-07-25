---
id: PG-001
tipo: bug
prioridade: p0
area: security
estado: pronto
responsavel:
github_issue:
---

# Nunca persistir credenciais sem criptografia real

## Problema

`main.js` grava `accounts.enc` em UTF-8 quando `safeStorage` não está disponível.
No Linux, o backend `basic_text` também não oferece a proteção prometida pelo
README. O usuário acredita que a senha está criptografada.

## Resultado esperado

Salvar credenciais apenas quando existir proteção real do sistema. Caso
contrário, manter login manual e explicar claramente a limitação.

## Critérios de aceite

- [ ] Não existe caminho que grave e-mail/senha em texto puro.
- [ ] `basic_text` é tratado como armazenamento inseguro.
- [ ] A interface informa quando salvar credenciais não está disponível.
- [ ] Arquivo antigo em texto puro é detectado sem ser sobrescrito.
- [ ] Há testes para disponível, indisponível, `basic_text` e arquivo legado.

## Fora do escopo

- Trocar o fluxo de login ou automatizar captcha.
- Criar conta online ou sincronizar credenciais.

## Riscos

Perder acesso a credenciais antigas ou quebrar Linux sem keyring. A migração deve
preservar o arquivo e oferecer recuperação manual.

## Verificação

Testes unitários do cofre e teste manual de salvar/carregar em ambiente seguro e
indisponível.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado a partir da auditoria Launcher × Grid.
- Evidência: fallback `Buffer.from(json, 'utf8')` em `main.js`.
- Próxima ação: isolar o cofre de credenciais em módulo testável.

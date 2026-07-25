---
id: PG-009
tipo: spike
prioridade: p2
area: desktop
estado: pronto
responsavel:
github_issue:
---

# Spike de WebContentsView

## Problema

O Electron não recomenda `<webview>` devido a riscos de estabilidade, mas uma
migração pode quebrar o layout, foco, login e injeções atuais.

## Resultado esperado

Protótipo descartável de uma conta e decisão documentada de migrar, adiar ou
manter.

## Critérios de aceite

- [ ] Uma conta abre com partição persistente e domínio restrito.
- [ ] Login/captcha manual funciona.
- [ ] Coleta de rede e dados necessários é viável.
- [ ] Foco sobrevive a atualizações de estado e resize.
- [ ] Custos, lacunas e plano incremental estão documentados.
- [ ] O spike não substitui o produto principal.

## Fora do escopo

- Migrar as quatro contas.
- Reescrever o dashboard.

## Riscos

Repetir o bug de foco do Launcher se o layout esconder ou reanexar views. Todo
layout deve aplicar somente diferenças.

## Verificação

Teste manual de login, digitação contínua, resize, foco e reconexão.

## Log

### 2026-07-25 — Leo

- Estado: ticket criado.
- Evidência: recomendação atual do Electron e experiência do Launcher.
- Próxima ação: executar somente depois da base de testes.

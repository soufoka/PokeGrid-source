# Colaboração entre pessoas e agentes

## Modelo adotado

O projeto começa em modo local. Os arquivos preservam o contexto entre o
mantenedor, colaboradores e suas IAs:

```text
ticket = pedido + contexto + decisão + estado
branch/commit = implementação isolada de um responsável
log do ticket = evidência, revisão e handoff
```

Chats de IA são temporários. Uma decisão que só existe em um chat não existe para
o projeto. O GitHub só entra quando o mantenedor autorizar a publicação.

## Fluxo de um ticket

1. **Triagem:** criar `tickets/PG-NNN-slug.md` com tipo, prioridade, área,
   problema e aceite.
2. **Pronto:** contexto suficiente para alguém executar sem adivinhar.
3. **Em andamento:** um responsável assume no frontmatter e registra o plano no
   log.
4. **Revisão:** commit ligado a `PG-NNN`, com evidências e riscos no log.
5. **Concluído:** ticket vira `feito`; documentação acompanha a mudança.

Bloqueios ficam na entrada mais recente do log do ticket com:

- o que foi tentado;
- a evidência observada;
- a decisão necessária;
- quem pode destravar.

## Handoff entre IAs

Ao passar um ticket para outro agente, acrescentar no log:

```text
HANDOFF
- Objetivo:
- Estado atual:
- Branch/commit:
- Arquivos tocados:
- Evidências:
- Próxima ação exata:
- Riscos ou dúvidas:
```

O agente que recebe deve reler o ticket, `AGENTS.md` e o diff. Não deve confiar
somente no resumo do outro agente.

## Campos locais

- Tipo: `bug`, `feature`, `tech-debt`, `docs`, `spike`
- Prioridade: `p0`, `p1`, `p2`, `p3`
- Área: `desktop`, `data`, `dashboard`, `security`, `ux`, `docs`
- Estado: `triagem`, `pronto`, `fazendo`, `bloqueado`, `revisao`, `feito`

Prioridades:

- **P0:** risco de segurança, perda de dados ou produto inutilizável.
- **P1:** alto impacto, deve entrar no próximo ciclo.
- **P2:** melhoria importante sem urgência.
- **P3:** ideia ou polimento.

## Limites de edição concorrente

`index.html` é hoje o maior ponto de conflito. Até a modularização:

- apenas um ticket ativo por trecho funcional;
- o comentário de posse lista os blocos que serão tocados;
- alterações de tradução acompanham a mesma mudança;
- refatoração mecânica não entra no mesmo PR de uma funcionalidade.

## Aprendizados trazidos do Poke Idle Launcher

- Instrumentar bugs de foco/timing antes de tentar corrigir.
- Render e layout recorrentes devem ser idempotentes e orientados a diferenças.
- Separar aquisição de dados, normalização, persistência e apresentação.
- Preferir eventos estruturados da rede a leitura frágil do DOM.
- Persistir um histórico útil para explicar o que aconteceu durante o farm.
- Credenciais falham de forma segura; nunca degradam silenciosamente para texto
  puro.

## Migração futura para GitHub

Somente após autorização do mantenedor:

1. criar labels equivalentes aos campos locais;
2. transformar cada ticket ativo em GitHub Issue;
3. gravar `github_issue` no arquivo local;
4. mudar a fonte de verdade para Issues;
5. abrir PRs sem push direto na `main`.

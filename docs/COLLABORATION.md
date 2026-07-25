# Colaboração entre pessoas e agentes

## Modelo adotado

O GitHub é o ponto de encontro entre o mantenedor, colaboradores e suas IAs:

```text
Issue = pedido + contexto + decisão + estado
Branch = implementação isolada de um responsável
PR = evidência, revisão e integração
```

Chats de IA são temporários. Uma decisão que só existe em um chat não existe
para o projeto.

## Fluxo de um ticket

1. **Triagem:** definir tipo, prioridade, área, problema e aceite.
2. **Pronto:** contexto suficiente para alguém executar sem adivinhar.
3. **Em andamento:** um responsável comenta que assumiu e publica o plano curto.
4. **Revisão:** PR com `Closes #N`, evidências e riscos.
5. **Concluído:** merge fecha a issue; documentação acompanha a mudança.

Bloqueios ficam no comentário mais recente da issue com:

- o que foi tentado;
- a evidência observada;
- a decisão necessária;
- quem pode destravar.

## Handoff entre IAs

Ao passar um ticket para outro agente, comentar na issue:

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

O agente que recebe deve reler a issue, `AGENTS.md` e o diff. Não deve confiar
somente no resumo do outro agente.

## Labels

- Tipo: `type:bug`, `type:feature`, `type:tech-debt`, `type:docs`, `type:spike`
- Prioridade: `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`
- Área: `area:desktop`, `area:data`, `area:dashboard`, `area:security`,
  `area:ux`, `area:docs`
- Estado excepcional: `status:blocked`, `status:needs-decision`

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

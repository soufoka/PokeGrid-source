# PokeGrid — contrato de trabalho para agentes

Este arquivo é a primeira leitura obrigatória para qualquer IA ou pessoa que
altere o repositório.

## Fonte de verdade

- Fase local atual: `tickets/` contém trabalho, decisões, responsáveis e
  bloqueios.
- Código local: commits ligados a um ticket pelo identificador `PG-###`.
- Quando o mantenedor decidir publicar: GitHub Issues e Pull Requests substituem
  os tickets locais.
- Estado do produto e comandos de uso: `README.md`, `TUTORIAL.md` e `CHANGELOG.md`.
- Arquitetura, colaboração e handoff: `docs/COLLABORATION.md`.

Não criar uma segunda lista de tarefas. Documentos podem propor ideias, mas
trabalho aprovado precisa virar arquivo em `tickets/`. Na migração para o
GitHub, cada arquivo recebe o link da issue correspondente e deixa de ser ativo.

## Antes de alterar

1. Leia o ticket inteiro e o log mais recente.
2. Preencha o responsável, marque `fazendo` e registre no log o plano curto e os
   arquivos previstos.
3. Atualize sua branch a partir de `main`.
4. Se outra pessoa ou agente estiver mexendo no mesmo arquivo, coordene no ticket
   antes de editar. `index.html` é o maior ponto de colisão.

Branches locais: `ticket-PG-NNN/descricao-curta`.

## Arquitetura atual

- `main.js`: ciclo de vida Electron, janela, bandeja, credenciais, notificações,
  navegação e integrações com o sistema.
- `preload.js`: ponte IPC mínima exposta à interface.
- `index.html`: shell visual, `<webview>` das contas, coleta de estado,
  armazenamento local, traduções, alertas e Modo Simples.
- `presets/`: scripts opcionais injetados no jogo.

O `index.html` ainda é um monólito. Extrações devem ser pequenas, mecânicas e
separadas de mudanças de comportamento.

## Invariantes de segurança e produto

- Nunca versionar contas, senhas, tokens, cookies, dumps ou dados do usuário.
- Credenciais só podem ser persistidas com proteção criptográfica real. Se ela
  não estiver disponível, falhar com mensagem clara; nunca gravar texto puro.
- Conteúdo remoto do jogo não recebe Node.js nem acesso direto ao sistema.
- Painéis permanecem presos a `https://poke.idleworld.online`.
- Não automatizar captcha, combate ou decisões do jogador.
- A coleta observa dados que o próprio jogo entrega; não enviar telemetria para
  terceiros sem opção explícita do usuário.
- Dados importados e campos vindos do jogo são não confiáveis: validar e escapar.
- Layout e renderização recorrente devem aplicar apenas diferenças. Não
  esconder/recriar uma view focada sem necessidade.

## Como trabalhar

- Um ticket deve ter um responsável por vez e um único estado em seu frontmatter.
- Bugs de timing, foco ou estado exigem instrumentação antes de tentativa de fix.
- Mudança estrutural e mudança visual/comportamental vão em PRs separados.
- Preserve compatibilidade dos dados locais ou documente e teste a migração.
- Não faça refatoração oportunista fora do escopo do ticket.
- Decisão que muda escopo, segurança ou arquitetura deve ficar registrada no
  log do ticket, não apenas no chat entre agentes.

## Definição de pronto

- Critérios de aceite do ticket atendidos.
- Verificações locais executadas e descritas no PR.
- Fluxo afetado testado de verdade; para UI, anexar imagem ou vídeo quando útil.
- Sem credenciais ou artefatos locais no diff.
- Documentação e `CHANGELOG.md` atualizados quando o usuário percebe a mudança.
- Commit local inclui `PG-NNN`; no GitHub, o PR usa `Closes #N`.

Se uma verificação não puder ser executada, declare isso claramente no PR.

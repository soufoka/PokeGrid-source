# Auditoria inicial: PokeGrid × Poke Idle Launcher

Data: 2026-07-25

## Veredito

O PokeGrid já absorveu boa parte do melhor produto do Poke Idle Launcher e, em
alguns pontos, foi além: Modo Simples customizável, ranking de hunts com média
real, histórico diário, três idiomas, webhook e operação a partir do código.

O próximo salto não vem de acumular mais botões. Vem de três frentes:

1. tornar o código seguro para colaboração;
2. transformar alertas efêmeros em uma experiência de acompanhamento;
3. reduzir dependência de um `index.html` monolítico e de injeções frágeis.

## Comparação

| Tema | PokeGrid | Poke Idle Launcher | Direção |
|---|---|---|---|
| Quatro contas | `<webview>` com partições próprias | `WebContentsView` por conta | manter a experiência; investigar migração sem pressa |
| Dados | coletor WebSocket e fetch injetado no jogo | parser de rede e API em módulos separados | extrair e testar o parser do Grid |
| Dashboard | Modo Simples muito completo e customizável | painel e dashboard separados | preservar o Grid como produto principal |
| Alertas | notificações, som, Discord e card de shiny | feed persistente, alertas e screenshots opcionais | criar Central de Eventos e overlay compacto |
| Persistência | `localStorage` + arquivo criptografado de contas | store em arquivos e cofre de token fail-closed | criar camada de storage e migrações |
| Manutenção | 214 KB e 2.395 linhas em `index.html` | módulos para parser, cálculos, store e API | modularização incremental |
| Qualidade | sem testes, check ou CI | `npm run check` e componentes isolados | estabelecer baseline automatizado |

## Riscos encontrados

### P0 — promessa de criptografia não é sempre verdadeira

`main.js` grava `accounts.enc` em UTF-8 quando `safeStorage` não está disponível.
O README afirma que as senhas são criptografadas. Em especial no Linux, também é
necessário rejeitar o backend `basic_text`, que a
[documentação do `safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage)
identifica como fallback sem um gerenciador de senhas do sistema.

Direção: falhar fechado, explicar ao usuário por que não foi possível salvar e
manter login manual disponível.

### P0 — não há baseline reproduzível

Não há `package-lock.json`, testes, comando de validação ou workflow de CI. Um
colaborador pode quebrar sintaxe, plataforma ou segurança sem sinal automático.

Direção: lockfile, `npm run check`, smoke tests e CI em Windows/Linux.

### P1 — monólito dificulta duas IAs trabalhando juntas

Interface, traduções, storage, coleta, regras de negócio e grandes scripts
injetados vivem no mesmo arquivo. Isso aumenta conflito de merge e torna uma
mudança visual capaz de afetar captura, alertas ou login.

Direção de extração, sem reescrita:

1. parser e normalização de mensagens;
2. cálculos de sessão;
3. storage com versão e migrações;
4. traduções;
5. seções do Modo Simples.

### P1 — `<webview>` é uma dívida arquitetural

A [documentação atual do Electron](https://www.electronjs.org/docs/latest/api/webview-tag)
recomenda não usar `<webview>` por riscos de estabilidade de renderização,
navegação e eventos. O Launcher prova que `WebContentsView` funciona, mas também
mostrou que layout não idempotente pode roubar o foco.

Direção: abrir um spike com protótipo de uma conta, critérios de foco, login,
isolamento, eco, captura de rede e layout. Não migrar o produto inteiro em um PR.

## Melhorias de experiência vindas do Launcher

### 1. Central de Eventos

Uma linha do tempo persistente por conta para shiny, captura rara, queda,
reconexão, farm parado, falta de recursos e time derrubado. O usuário que deixou
o app AFK precisa responder “o que aconteceu?” sem depender de uma notificação
que já sumiu.

### 2. Overlay compacto

Janela opcional sempre no topo com quatro estados: online/farmando, gold/h,
recursos críticos e último evento. Clique abre a conta correspondente. É o
benefício do overlay do Launcher adaptado ao visual e aos dados melhores do
Grid.

### 3. Alertas configuráveis por conta

Os limites atuais são globais e fixos no código: 100 bolas, 15 potions e 5
revives. Expor limites, silêncio por evento e perfil por conta reduz ruído e
torna o alerta confiável.

### 4. Diagnóstico de primeira execução

Uma tela curta de saúde: Electron/Node, criptografia disponível, quatro sessões
isoladas, conectividade com o jogo, permissões negadas e onde fica o relatório
de erros. Isso reforça a proposta do projeto de “rode o código e confie porque
você pode verificar”.

### 5. Screenshot opcional de shiny

O Launcher guarda uma prova visual local quando o usuário captura shiny. No Grid
isso deve ser opt-in, local e ligado à Central de Eventos, sem capturar
credenciais ou telas de login.

## Backlog proposto

1. **P0:** impedir persistência de senha sem criptografia real.
2. **P0:** lockfile, check, smoke tests e CI.
3. **P1:** extrair parser/cálculos do coletor sem alterar comportamento.
4. **P1:** criar storage versionado e migração do `localStorage`.
5. **P1:** Central de Eventos persistente.
6. **P1:** overlay compacto por conta.
7. **P2:** alertas e limites configuráveis por conta.
8. **P2:** diagnóstico de primeira execução.
9. **Spike:** viabilidade de `WebContentsView` com critérios de aceite.

Cada item aprovado deve virar GitHub Issue; este documento não substitui o
backlog operacional.

# Changelog

## Próxima versão — prévia local Experience V2

- **Central moderna dentro do cliente**, acessível por `✨ Central`, sem desligar
  ou recriar os webviews do jogo.
- **Modo Simples integrado à Central**: `🌐 Todas as contas` reúne as quatro
  batalhas, KPIs globais, desempenho por conta, tendência, histórico de
  hoje/7 dias/total, metas, capturas, shinies, tentativas, compartilhados do
  chat, recursos e medições de hunt.
- **Clique para focar**: uma batalha ou linha de desempenho fecha a Central e
  amplia diretamente a conta correspondente.
- **Navegação sem beco sem saída**: a Central agora tem atalhos fixos para as
  quatro contas e um botão `Jogo N` que fecha o painel e volta ao webview
  selecionado; `Alt+1..4` também abre uma conta e `Esc` volta à grade.
- **Visão geral com palco de batalha**, sprites animados da PokeAPI, quatro KPIs,
  saúde das contas e eventos recentes.
- **Variantes de Outland reconhecidas**: dados continuam vindo da variante do
  jogo, enquanto a imagem usa a espécie-base indicada por `captureBase` — por
  exemplo, `Brave Steelix` mostra o sprite do Steelix.
- **Capturas completas e filtráveis**: busca, conta, IV mínimo, qualidade,
  período, shiny/primeira espécie e ordenação por tempo, IV, qualidade ou
  potencial; histórico persistido e registros vivos das quatro contas são
  mesclados imediatamente, com sincronização manual, retenção de 10 mil e
  paginação de 100.
- **Time & IV** com os seis integrantes, IV total, qualidade, golpes do catálogo
  oficial, comparação e projeção de nível 1 a 500.
- **Inventário consolidado das quatro contas**: itens usam `items.json`, Poké
  Balls usam o catálogo de Balls e cada treinador tem sua própria seção, com
  seletor global/individual, totais, filtros e estado de atenção.
- **Quatro telas mais utilizáveis**: cabeçalhos compactos por painel e ajustes
  responsivos no dock, HUD, Auto Helper, captura, Pokédex e mercado. `Limpar
  jogo` não oculta mais o Auto Helper.
- **Batalhas vivas no painel global**: líder e inimigo permanecem animados nos
  quatro campos, com fallback estático quando uma animação não existe.
- **Redesign além da Central**: barra principal, menu, painéis dos jogos,
  Treinadores, Scripts, Resumo, Cartas, Auto Helper, captura, Pokédex e mercado
  agora compartilham cores, bordas, foco, profundidade e comportamento compacto.
- **Dados reais quando a conta está conectada** e modo demonstrativo claramente
  identificado durante login ou ausência de dados.
- A prévia vive em `src/ui/experience-v2.*`; o painel antigo continua disponível.

## 1.5.4

### Segurança

- **Correção importante no card de IV.** A URL da sprite era validada só pelo início do endereço, e um dado forjado conseguia escapar do atributo e rodar código na janela do app, que é onde ficam as credenciais salvas. Agora o endereço passa por lista branca estrita e tudo que chega pelo canal é conferido (tipo, tamanho e formato) antes de ir pra tela.
  *Important fix in the IV card. The sprite URL was validated only by its prefix, and a forged value could break out of the attribute and run code in the app window, which is where saved credentials live. The address now goes through a strict allowlist, and everything arriving through the channel is checked (type, size and shape) before rendering.*
- **Limites contra payload inflado**: no máximo 12 golpes, 4 tipos e nomes de 40 caracteres, pra um dado torto não travar a tela.
  *Caps against inflated payloads: at most 12 moves, 4 types and 40-character names, so malformed data cannot freeze the screen.*
- **Itens fixados do painel** passaram a ser escapados e validados na carga, e ids vindos do jogo são convertidos pra número antes de entrar na página. Fecha o mesmo tipo de brecha por arquivo de configuração importado.
  *Pinned panel items are now escaped and validated on load, and ids coming from the game are coerced to numbers before reaching the page. Closes the same class of hole via imported config files.*

### Leitor de IV

- **Sprite do pokémon** no cabeçalho do card (animada, com imagem estática de reserva).
  *Pokémon sprite in the card header (animated, with a static fallback).*
- **Anel de potencial** com a porcentagem, a classificação e a descrição, igual ao da aba de análise.
  *Potential ring with the percentage, classification and description, same as the analysis tab.*
- **Golpes com o poder de cada um**, chip de tipo colorido, o dano observado na última batalha com a efetividade, e o golpe em uso destacado.
  *Moves with each ones power, colored type chip, the damage seen in the last battle with effectiveness, and the move in use highlighted.*

## 1.5.3

- **Uma calculadora de IV só, no centro da tela e maior.** Antes eram quatro, uma presa dentro de cada painel. Agora o botão IV's abre um card único na janela do app, que você arrasta pra onde quiser: passe o mouse num pokémon em qualquer painel e os dados aparecem nele. Mostra tipos, nível, qualidade, IV total, os 6 atributos com IV por stat e o poder, e todos os campos são editáveis pra recalcular. O cálculo continua sendo feito pela extensão dentro do painel, então o resultado é o mesmo de sempre.
  *A single IV calculator, centered and bigger. There used to be four, each trapped inside its panel. The IV's button now opens one card in the app window that you can drag anywhere: hover a Pokémon in any panel and the data lands there. It shows types, level, quality, total IV, the 6 stats with per-stat IV and power, and every field is editable to recalculate. The math is still done by the extension inside the panel, so results are unchanged.*
  - Quem precisa das abas de golpes ou comparar usa o botão ⧉ no cabeçalho do card, que abre a calculadora dentro do painel de origem.
    *For the moves or compare tabs, use the ⧉ button in the card header to open the calculator inside the source panel.*

## 1.5.2

- **Aviso claro quando um shiny é CAPTURADO.** Como é o evento mais raro, agora aparece um cartão na tela com o sprite do shiny, o nome, a conta, IV e qualidade, e ele fica até você fechar. O som é mais longo que o de "apareceu" e a notificação é própria.
  *Clear notice when a shiny is CAUGHT. Being the rarest event, a card now shows up with the shiny sprite, name, account, IV and quality, and it stays until you close it. The sound is longer than the "appeared" one and the notification is its own.*
- **Correção: a rolagem das seções não volta mais pro topo.** No modo Simples, a atualização automática reconstruía as seções e zerava a rolagem interna de quem tinha altura ajustada.
  *Fix: section scrolling no longer jumps back to the top. In Simple mode the auto-refresh rebuilt the sections and reset the inner scroll of any section with an adjusted height.*
- **Melhor catch com critério à sua escolha**: IV × qualidade (padrão), só IV ou só qualidade. A qualidade multiplica os stats e o poder, então IV puro sozinho engana. A coluna passa a mostrar o multiplicador.
  *Best catch with your choice of criterion: IV × quality (default), IV only or quality only. Quality multiplies stats and power, so raw IV alone is misleading. The column now shows the multiplier.*
- **O botão de layout mostra o modo atual** (▦ Grade, ▤ Uma coluna, ▥ Uma linha). Antes dizia "Grade" sempre, e não dava pra saber por que os painéis estavam empilhados.
  *The layout button now shows the current mode (grid, single column, single row). It used to always read "Grid", so there was no way to tell why panels were stacked.*
- **A calculadora de IV abre no card do pokémon**, com o formulário de cálculo recolhido e altura acompanhando o conteúdo: mostra nome, tipos, qualidade, IV total, os 6 stats e o poder sem precisar rolar.
  *The IV calculator opens on the Pokémon card, with the calculation form collapsed and the height following the content: name, types, quality, total IV, the 6 stats and power, no scrolling needed.*

## 1.5.1

- **Cor da conta na barra de cada painel.** A bolinha de status agora usa a cor da conta (a mesma do modo Simples e do painel lateral); o estado aparece pelo brilho, pelo anel vermelho no erro e pela transparência quando está desligada.
  *Account color in each panel header. The status dot now uses the account color (the same one used in Simple mode and the side panel); state shows through the glow, a red ring on error, and transparency when off.*
- **Correção: painel não fica mais preso em "carregando...".** O rótulo só era limpo quando a página recarregava inteira, e navegação interna do jogo deixava ele travado com a conta funcionando normalmente.
  *Fix: panels no longer get stuck on "loading...". The label was only cleared on a full page reload, so the game internal navigation left it frozen while the account was running fine.*
- **Potions e revives agora contam no gasto da sessão.** Só as bolas eram descontadas, então o saldo e o gold/h ficavam otimistas pra quem usa cura. O painel também mostra a contagem ao lado (bolas e curas usadas), como o Hunt Analyzer do jogo. É estimativa: o inventário é lido a cada 30s, e vender cura no mercado é indistinguível de consumir.
  *Potions and revives now count as session cost. Only balls were deducted, so balance and gold/h looked optimistic for anyone using heals. The panel also shows the counts next to it (balls and heals used), like the game Hunt Analyzer. It is an estimate: the inventory is read every 30s, and selling heals on the market is indistinguishable from using them.*
- **Correção: o aviso de "poucas potions" não insiste mais com a conta deslogada.** Sem inventário o app lia 0 item e concluía que tinha acabado, e cada religada repetia a notificação. Agora cada aviso depende do dado que ele mede, então conta deslogada (ou ainda carregando) não gera alerta nenhum.
  *Fix: the "low potions" alert no longer nags when the account is logged out. With no inventory the app read 0 items and assumed you had run out, repeating the notification on every relog. Each alert now depends on the data it measures, so a logged-out (or still loading) account triggers nothing.*
- **Correção: o app abre no Linux.** A janela nascia escondida e só era maximizada, o que vários gerenciadores de janela ignoram, então o processo subia sem mostrar nada. Agora ela é exibida explicitamente quando o conteúdo fica pronto.
  *Fix: the app opens on Linux. The window was created hidden and only maximized, which several window managers ignore, so the process started without showing anything. It is now shown explicitly once the content is ready.*
- **O erro deixa de ficar escondido**: o `iniciar.sh` não descarta mais a saída de erro e, se o app fechar com falha, mostra o que tentar (sandbox, bibliotecas do sistema).
  *Errors are no longer hidden: `iniciar.sh` stops discarding stderr and, if the app exits with a failure, suggests what to try (sandbox, system libraries).*
- **Bandeja opcional**: em sistema sem ícone de bandeja o app continua funcionando em vez de falhar no início, e minimizar não esconde a janela quando não há bandeja pra restaurá-la.
  *Optional tray: on systems without a tray icon the app keeps working instead of failing at startup, and minimizing does not hide the window when there is no tray to restore it from.*
- **Atalho dos IV's dentro do jogo removido**: quem abre e fecha a calculadora agora é só o botão IV's da barra do app.
  *In-game IV's shortcut removed: the IV's button in the app bar is now the only control for the calculator.*

## 1.5.0

### Correções que os usuários pediram

- **Shiny derrotado agora conta.** Em auto-battle o shiny nascia e morria entre duas leituras, então não entrava em "Aparições de shiny". Agora a contagem vem do desfecho (derrotado ou capturado), com ✓ verde pra capturado e ✕ vermelho pra perdido.
  *Defeated shinies now count. In auto-battle a shiny could spawn and die between two reads, so it never showed in "Shiny appearances". Counting now comes from the outcome (defeated or caught), with a green ✓ for caught and a red ✕ for lost.*
- **Os números não zeram mais quando o painel recarrega.** Se a conta cai e reloga, a sessão continua de onde estava (kills, XP, capturas, shinies, drops, tempo na hunt). Trocar de hunt continua zerando, como antes.
  *Stats no longer reset when a panel reloads. If an account drops and logs back in, the session continues where it was. Switching hunts still resets, as before.*
- **Painel travado se recupera sozinho.** Três camadas: painel sem responder por 20s é reiniciado, painel silencioso por 60s recarrega, e jogo congelado por perda de contexto gráfico recarrega. Cada recuperação fica no relatório de erros.
  *Frozen panels now recover on their own, in three layers, and each recovery is logged in the error report.*
- **Calculadora de IV mostra o IV exato do jogo.** Abaixo do Nv 15 a estimativa por atributos errava por arredondamento (149 em vez de 150). Agora o valor informado pelo jogo tem prioridade.
  *IV calculator shows the game's exact IV. Below Lv 15 the stat-based estimate was off by rounding; the value reported by the game now takes priority.*
- **Rare Pokémon Picture** entra no loot e no loot/hora.
  *Rare Pokémon Picture is now counted in loot and loot/hour.*
- **Shiny de uma só conta** mostra em qual conta foi, igual aos outros.
  *Single-account shinies now show which account they came from.*

### Modo Simples (era "Cartas")

- **Layout customizável de verdade.** Cada seção pode ser movida (arraste o ⋮⋮), ter a largura ajustada (borda direita) e a altura ajustada (borda de baixo, com clique duplo pra voltar ao automático). Grade de 12 colunas que fecha sem lacunas em tela cheia. Tudo salvo.
  *Truly customizable layout: move, resize width and height per section, on a 12-column grid that fills the screen without gaps. All saved.*
- **Seção "Hoje"** com gold, XP, kills, capturas e shinies do dia, mais os totais de 7 dias e de sempre.
  *A "Today" section with the day's gold, XP, kills, captures and shinies, plus 7-day and all-time totals.*
- **Metas diárias** de gold e de capturas, com barra de progresso.
  *Daily gold and capture goals, with a progress bar.*
- **Coluna Tempo** (tempo na hunt) e o **pokémon em uso** na coluna Status.
  *A Time column (time on the hunt) and the Pokémon in use in the Status column.*
- **Shinies tentados** com três modos: total, só a sessão, ou só os alvos que você marcar com a ★.
  *Attempted shinies in three modes: all-time, session only, or just the targets you star.*
- **Histórico de shinies e capturas não se perde** ao fechar o app.
  *Shiny and capture history survives closing the app.*

### Novidades

- **Som do shiny**: um alerta sonoro quando aparece shiny, pra quem farma AFK. Dá pra desligar.
  *Shiny sound: an audible alert when a shiny shows up, for AFK farming. Can be turned off.*
- **Aviso de farm parado**: se a conta está online mas os kills não sobem há 10 minutos, você é avisado.
  *Stalled-farm alert: if an account is online but kills haven't moved in 10 minutes, you get notified.*
- **Webhook do Discord** (opcional): receba shiny encontrado e o resumo do dia no seu servidor. A URL é sua, o app só envia.
  *Discord webhook (optional): get shiny alerts and the daily summary in your own server.*
- **Exportar CSV** do histórico diário, pra abrir em planilha.
  *Export the daily history as CSV.*
- **Backup das configurações**: exportar e importar layout, preferências e histórico num arquivo.
  *Settings backup: export and import layout, preferences and history in a file.*
- **Espanhol**, com seletor de idioma PT / EN / ES no menu.
  *Spanish, with a PT / EN / ES language selector in the menu.*
- **Botão IV's na barra do app**: abre e fecha a calculadora em todos os painéis de uma vez. A pílula flutuante dentro do jogo saiu, o controle agora é só pelo botão da barra.
  *IV's button in the app bar: opens and closes the calculator in every panel at once. The floating in-game pill is gone; the app bar button is now the only control.*
- **🧼 Limpar jogo**: esconde o auto-helper, o popup de captura e o HUD do canto; a conta e o menu do jogo aparecem ao passar o mouse.
  *🧼 Clean game: hides the auto-helper, the capture popup and the corner HUD; account and game menu appear on hover.*
- **Minimizar do seu jeito**: escolha entre bandeja ou barra de tarefas, e ao voltar a janela abre no mesmo estado de antes (maximizada continua maximizada).
  *Minimize your way: tray or taskbar, and the window returns exactly as it was.*
- **Venda protegida** agora mostra IV, qualidade e nível do pokémon no aviso.
  *Sell guard now shows the Pokémon's IV, quality and level in the warning.*

### Segurança

- **Importar configuração não carrega mais código.** Userscripts ficam fora do backup: um arquivo de config compartilhado por terceiros não pode mais rodar código na sua conta.
  *Importing settings no longer carries code. Userscripts are excluded from backups, so a config file from someone else cannot run code in your account.*
- **Dados salvos em disco são validados** antes de ir pra tela (cores, nomes e números), fechando XSS armazenado via arquivo importado.
  *Data loaded from disk is validated before rendering, closing stored-XSS via imported files.*
- **CSV sem injeção de fórmula** e **webhook sem @everyone**: nome vindo do jogo não executa nada na planilha nem marca todo mundo no Discord.
  *No formula injection in the CSV and no @everyone in the webhook.*

## 1.4.0

- **Rode 1 conta também**: o menu Painéis agora vai de 1 a 4. Quem quer focar numa conta só usa a janela inteira.
  *Run 1 account too: the Panels menu now goes from 1 to 4. Focus on a single account using the whole window.*
- **Ranking de hunts com a sua média real**: o app grava, por hunt, a média de gold/h, XP/h e capturas/h que você de fato fez ali, e mostra no ranking (com a ordenação "Medido: gold/h"). Assim dá pra escolher a hunt pela sua performance real, não só pela estimativa do catálogo. A base vai se formando conforme você farma.
  *Hunt ranking with your real average: the app records, per hunt, the average gold/h, XP/h and captures/h you actually got there, and shows it in the ranking (with a "Measured: gold/h" sort). Pick a hunt by your real performance, not just the catalog estimate. The baseline builds up as you farm.*

## 1.3.2

- **Botão de zerar a sessão** (⟲ no Painel e no Modo Cartas): reinicia as estatísticas da sessão de todas as contas na hora, pra monitorar a partir de um momento escolhido. Diferente do Hunt Analyzer do jogo, que não zera os nossos números. Os totais da conta (gold, nível, shinies de vida) não mudam.
  *Reset-session button (⟲ in the Panel and Cards mode): restarts the session stats for all accounts on the spot, to monitor from a chosen moment. Unlike the game's Hunt Analyzer, which doesn't reset our numbers. Account totals (gold, level, lifetime shinies) are unchanged.*

## 1.3.1

- **Correção: a calculadora de IV (JustPokédex) voltou a funcionar com o jogo em inglês.** Uma atualização do jogo trocou os rótulos do tooltip; agora o leitor entende português e inglês (Nv/Lv, Qualidade/Quality, Poder/Power, Vel/Spe).
  *Fix: the IV calculator (JustPokédex) works again with the game in English. A game update changed the tooltip labels; the reader now understands both Portuguese and English.*
- **JustPokédex começa fechado**: vira um botão "IV's" discreto no canto inferior direito, longe do login. Clique pra abrir.
  *JustPokédex starts closed: a discreet "IV's" button in the bottom-right corner, away from the login. Click to open.*
- **Painel de resumo espera o login**: se estava aberto, reabre sozinho quando a primeira conta entra no jogo.
  *Stats panel waits for login: if it was open, it reopens on its own once the first account logs in.*
- **Painel empurra os quadrantes** em vez de cobrir a tela da esquerda, e a largura acompanha o ajuste.
  *The panel now pushes the game panels aside instead of covering the left column, following its width.*
- **Ouro da sessão conta a venda dos pokémon capturados** (linha "Capturas (venda)", entra no saldo e no gold/h).
  *Session gold now counts the sale value of caught Pokémon (a "Captures (sell)" line, included in balance and gold/h).*
- **Alvo shiny**: o seletor na engrenagem funciona mesmo abrindo direto na aba Σ.
  *Shiny target: the picker in the gear works even when opened straight from the Σ tab.*
- **Log de capturas**: dá pra ordenar por qualidade ou IV, crescente e decrescente.
  *Capture log: sort by quality or IV, ascending or descending.*
- **Visual do JustPokédex** no tema do app: um só chip "Ativo", cores de tipo corretas no card, botão de histórico compacto e tudo até o Poder total cabe sem rolar.
  *JustPokédex visuals matching the app theme: a single "Active" chip, correct type colors on the card, compact history button, and everything up to Total Power fits without scrolling.*
- **🃏 Modo Cartas**: um dashboard ultra leve que esconde o jogo (canvas oculto, ~1 fps) e mostra só os números, KPIs totais, tabela por conta ordenável, tendência da última hora, últimas capturas e aparições de shiny. O farm continua rodando.
  *🃏 Cards mode: an ultra-light dashboard that hides the game (canvas off, ~1 fps) and shows only the numbers, total KPIs, sortable per-account table, last-hour trend, latest captures and shiny appearances. Farming keeps running.*
- **Melhorias de qualidade de vida**: bolas desde o último catch, marca de 1ª captura da espécie, ranking de hunts com favoritos e efetividade de tipo, e os pokémon compartilhados no chat com IV e raridade.
  *Quality-of-life: balls since the last catch, first-capture-of-species mark, a hunt ranking with favorites and type effectiveness, and Pokémon shared in chat with IV and rarity.*
- **🛡 Venda protegida** (menu Opções): pede confirmação antes de vender shiny, Lendária+ ou item raro. Dá pra desligar.
  *🛡 Sell guard (Options menu): asks for confirmation before selling shiny, Legendary+ or rare items. Can be turned off.*
- **Filtros na Pokédex e no Mercado**: caught / não caught / menor valor na Pokédex; raridade, IV mínimo e ordenação no mercado.
  *Pokédex and Market filters: caught / not caught / lowest value in the Pokédex; rarity, minimum IV and sorting in the market.*
- **🐞 Relatório de erros** (menu Opções): crashes, travamentos e erros caem num arquivo fácil de enviar pro suporte.
  *🐞 Error report (Options menu): crashes, freezes and errors are saved to a file that's easy to send to support.*
- **Correções**: nível do time atualiza ao vivo e a raridade dos capturados usa as cores certas do jogo.
  *Fixes: team level updates live and captured Pokémon rarity uses the game's correct colors.*
- **Segurança**: corrigido um XSS que um pokémon malicioso compartilhado no chat poderia explorar, com CSP e trava de navegação na interface como reforço.
  *Security: fixed an XSS a malicious chat-shared Pokémon could exploit, hardened with a CSP and navigation lock on the UI.*

## 1.3.0

- **📊 Painel de estatísticas** (botão no topo): barra lateral com os números de cada conta ao vivo (gold/h, XP/h, kills/h, ouro da sessão, drops, bag), mais um compilado com o total de todas as contas. Não precisa abrir o Hunt Analyzer.
  *📊 Stats panel: a live sidebar with each account's numbers (gold/h, XP/h, kills/h, session gold, drops, bag), plus a combined view totaling all accounts. No need to open the in-game Hunt Analyzer.*
- **Shinies**: contador de shinies encontrados na vida da conta, alerta quando um shiny aparece, e um "alvo" pra acompanhar a caça de um shiny específico.
  *Shinies: a lifetime shinies-found counter, an alert when a shiny shows up, and a "target" to track hunting a specific shiny.*
- **Mais alertas**: pokémon do time derrubado e inventário baixo (bolas/potions/revives) com contagem exata.
  *More alerts: team Pokémon fainting and low inventory (balls/potions/revives) with exact counts.*
- **Painel personalizável** (⚙): arraste as seções pra reordenar, esconda o que não usa, escolha itens da bag pra mostrar/esconder, fixe itens específicos e ajuste a largura. Emblema do clã ao lado do nome.
  *Customizable panel (⚙): drag sections to reorder, hide what you don't use, pick which bag items show, pin specific items and resize it. Clan emblem next to the name.*
- **🧩 Scripts**: rode userscripts nos painéis, com uma calculadora de IV (JustPokédex, do guilherme-se) já embutida.
  *🧩 Scripts: run userscripts in the panels, with an IV calculator (JustPokédex, by guilherme-se) built in.*
- **Layout em linha**: o botão ▦ Grade agora cicla entre grade, coluna e linha.
  *Row layout: the ▦ Grid button now cycles between grid, column and row.*
- Correções de segurança (o token de login não fica mais exposto na página) e o botão de doação foi removido.
  *Security fixes (the login token is no longer exposed on the page) and the donate button was removed.*

## 1.2.0

- **Escolha quantos painéis rodar (2, 3 ou 4)** no menu Opções. Roda menos contas pra gastar menos, e o layout se ajusta sozinho.
  *Choose how many panels to run (2, 3 or 4) in the Options menu. Run fewer accounts to use less, and the layout adapts on its own.*

## 1.1.3

- **Alertas (🔔 no menu Opções)**: notificação do Windows quando uma conta cai (o painel não carrega ou trava) ou quando fica sem pokébola. Dá pra desligar.
  *Alerts (🔔 in the Options menu): a Windows notification when an account drops (a panel fails to load or freezes) or runs out of Pokéballs. Can be turned off.*

## 1.1.2

- **Windows em .zip** também: além do instalador e do portátil.exe, agora tem a versão para extrair e abrir. A pessoa escolhe.
  *Windows .zip too: alongside the installer and portable.exe, there is now an extract-and-run version. Your choice.*
- README destacando que os dados de login ficam só no computador do usuário.
  *README highlights that login data stays only on the user's computer.*

## 1.1.1

- **Login mais confiável**: reenche o campo se o jogo o limpar e só envia quando e-mail e senha estão corretos
  *More reliable login: refills a field if the game clears it, and only submits when e-mail and password are correct*
- **Hunt vira toggle**: o botão Hunt abre e fecha o Hunt Analyzer (fecha no X do próprio painel)
  *Hunt is now a toggle: the Hunt button opens and closes the Hunt Analyzer (closes via the panel's own X)*

## 1.1.0

- **Multiplataforma**: agora com builds para Windows, macOS e Linux (instalador, .dmg e .AppImage), via GitHub Actions
  *Cross-platform: builds for Windows, macOS and Linux (installer, .dmg and .AppImage), via GitHub Actions*
- **Auto-Helper em todos**: opção no menu abre o Auto-Helper (hunt analyzer) nos 4 painéis de uma vez
  *Auto-Helper for all: a menu option opens the Auto-Helper (hunt analyzer) in all 4 panels at once*
- **Limpar conta por slot**: botão de lixeira em cada linha no gerenciador de contas
  *Clear account per slot: a trash button on each row in the account manager*
- **Watchdog**: painel que cai ou crasha tenta reconectar sozinho (com limite pra não entrar em loop)
  *Watchdog: a panel that drops or crashes reconnects on its own (capped to avoid loops)*

## 1.0.1

- Menu do jogo agora vem **visível** por padrão (o usuário esconde se quiser)
  *Game menu now starts **visible** by default (hide it if you want)*
- Aviso de atualização: o app checa o GitHub ao abrir e avisa quando há versão nova
  *Update notice: the app checks GitHub on launch and tells you when a new version is out*

## 1.0.0

### Novidades / Added
- Painéis abrem direto na tela de login, que rola sozinha até o captcha e o botão Entrar
  *Panels open straight on the login screen, auto-scrolled to the captcha and the Enter button*
- Login automático: preenche e-mail/senha e envia assim que você resolve o captcha
  *Auto login: fills credentials and submits as soon as you solve the captcha*
- 🎛 Menu do jogo: esconde a barra de ícones, alterna com **F2**
  *Game menu: hides the icon bar, toggled with **F2***
- 💬 Chat do jogo oculto por padrão, com toggle
  *Game chat hidden by default, with a toggle*
- Popup de promoção fechado automaticamente
  *Promo popup dismissed automatically*
- 🌐 Idioma PT/EN para a interface e para o jogo
  *PT/EN language switch for the app and the game*
- ☰ Opções: menu suspenso com Chat, Som, Eco, Dormir, Grade e Idioma
  *Options: dropdown with Chat, Sound, Eco, Sleep, Grid and Language*
- Modo Eco (15 fps), anti-sono, bandeja do sistema e início com o Windows
  *Eco mode (15 fps), keep-awake, system tray and start with Windows*
- Zoom, expandir e liga/desliga por painel
  *Per-panel zoom, expand and power toggle*

### Correções / Fixed
- Auto-login podia ressubmeter em loop com senha errada ou redirect; agora tem cooldown
  *Auto login could resubmit in a loop on wrong password or redirect; now rate-limited*
- Trocar de idioma podia bloquear o re-login após o reload
  *Switching language could block the re-login after the reload*
- F2 não respondia quando o foco estava na interface do app
  *F2 did not respond when focus was on the app UI*
- Contas salvas podiam ser perdidas se o arquivo ficasse ilegível; agora há backup e gravação atômica
  *Saved accounts could be lost if the file became unreadable; now backed up and written atomically*

### Segurança / Security
- Electron 43 (zero vulnerabilidades conhecidas) / *Electron 43 (no known vulnerabilities)*
- Senhas criptografadas via `safeStorage` do SO / *Passwords encrypted via the OS `safeStorage`*
- Painéis restritos ao domínio do jogo / *Panels restricted to the game's domain*
- Permissões de mídia e localização negadas / *Media and geolocation permissions denied*

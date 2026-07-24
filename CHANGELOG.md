# Changelog

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

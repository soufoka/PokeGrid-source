# Changelog

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

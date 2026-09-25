# Changelog

## 1.5.27

- **Tierlist por Pokémon e por gold/h.** Um seletor no topo da tierlist escolhe o que a nota mede: **XP/h** ou **Gold/h**. O jogo não manda gold por kill (o gold vem do loot vendido ao NPC), então o app calcula o loot esperado de cada hunt a partir da chance de cada drop e do preço de NPC, inclusive nas hunts que você nunca visitou, e multiplica pelos kills/h do modelo. E o chip **🎯 Pokémon** inverte a pergunta: escolha um Pokémon do seu time (com o nível, a qualidade, o IV e os TMs dele) ou digite qualquer um, e a lista mostra as melhores hunts pra ele até o seu nível, com kills/h, XP/h e gold/h de cada uma. Com Ditto, mostra a forma certa pra cada hunt.
  *Tierlist by Pokémon and by gold/h: choose whether the score measures XP/h or Gold/h (expected loot per kill at NPC price, computed for every hunt), and the 🎯 Pokémon chip lists the best hunts for a Pokémon from your team or any species, up to your level.*
- **Mais leve com a janela minimizada ou na bandeja.** O app mantém os jogos acordados pra o farm não travar, e por isso eles seguiam desenhando o mapa pra ninguém. Agora, com a janela escondida, os jogos entram sozinhos no mesmo modo leve do 🍃 Simples (1 quadro por segundo, sem imagem) e o painel de números para de redesenhar; ao abrir a janela, tudo volta. O farm continua igual, porque roda no servidor.
  *Lighter when minimized or in the tray: with the window hidden, the games switch to the same light mode as Simple view (1 frame per second) and the stats stop redrawing; everything returns when you open the window. Farming is unaffected.*
- **O ⚡ Eco deixava loops do jogo vivos pra sempre.** O Eco limitava a animação do jogo mas não o cancelamento dela, e o jogo encerra várias animações só cancelando (a barra da onda na pesca, as etiquetas da cidade). Cada uma "cancelada" seguia rodando, e o app ficava mais pesado quanto mais tempo aberto. Corrigido, com os mesmos 15 quadros por segundo.
  *Eco kept game animation loops alive forever (it limited requestAnimationFrame but not cancelAnimationFrame), so the app got heavier the longer it ran. Fixed, same 15 fps.*
- **Menos travadas no Simples e na tierlist.** O Simples com Ditto no time refazia a varredura inteira (0,3 s) a cada 30 s por causa de variações mínimas da calibração, e a tierlist guardava só o último cálculo. Agora variações pequenas não invalidam o cache, e a tierlist guarda as 4 últimas combinações (nível, TM e objetivo). Cada painel também parou de acumular na memória uma cópia de cada leitura enviada ao app.
  *Fewer stalls in Simple view and the tierlist: tiny calibration changes no longer invalidate the cache, the tierlist keeps its last 4 results, and each panel stopped piling up a copy of every state push in memory.*
- **Linux: o iniciar.sh oferece o conserto do sandbox.** No Ubuntu 24.04 e outros Linux novos, o Electron baixado não abre sem uma permissão de root no `chrome-sandbox`, e o iniciar.sh mandava abrir com `--no-sandbox`, que tira a proteção. Agora, quando o sistema bloqueia, ele mostra o comando e se oferece pra rodar (pede a senha); o `--no-sandbox` virou último recurso.
  *Linux: iniciar.sh now offers the chrome-sandbox fix (with your password) when the system blocks the sandbox, instead of suggesting --no-sandbox first.*
- **O chat do jogo fechava sozinho quando você abria.** Com o 💬 Chat oculto (o padrão), o app escondia o chat no mesmo instante em que você clicava no botão 💬 Chat do próprio jogo. Agora esse clique vale como pedido seu: o chat abre naquele painel e fica, até você usar o 💬 do app ou ligar o 🍃 Simples.
  *The game chat closed itself when you opened it: with the app hiding the chat (the default), clicking the game's own 💬 Chat button now opens it in that panel and it stays open.*
- **O gold do dia não some mais com o 🗑 do Hunt Analyzer.** O 🗑 (Zerar sessão) do Hunt Analyzer do jogo e o ⟲ Zerar do app apagavam o gold do dia no histórico diário (Hoje, 7 dias, Total, meta de gold, planilha e resumo diário do Discord). E abrir o app com uma conta havia horas na mesma hunt somava de novo o saldo inteiro do Hunt Analyzer no gold de Hoje. Agora o histórico só soma o que entrou depois da última leitura. Os poucos segundos entre abrir o app (ou recarregar o painel) e o Hunt Analyzer responder ficam de fora.
  *Daily gold is no longer wiped by the Hunt Analyzer's 🗑 (reset session) or the app's Reset, and opening the app while an account has been in the same hunt for hours no longer adds the whole analyzer balance to Today again.*
- **O gold/h, o saldo e os drops contam as Rare Pokemon Picture.** A foto da profissão fotógrafo chega à parte no Hunt Analyzer, e o app deixava ela de fora. Agora ela entra a preço de NPC no gold/h, no saldo e numa linha própria nos drops. O Hunt Analyzer já vem com **Considerar preço dos itens no Mercado** marcado e soma as fotos pela média do Mercado; desmarque pra bater com o app, que usa sempre o preço de NPC.
  *Gold/h, balance and drops now include Rare Pokemon Pictures (photographer profession), which the Hunt Analyzer reports separately, at NPC price.*
- **Trocar de hunt ou ir pra cidade não mistura mais os números.** Na troca de hunt, o 📊 Painel e o 🍃 Simples mostravam por até 30 s os números da hunt anterior, que também entravam na medida de hunts usada pela tierlist. E fora da hunt (na cidade, ou com o time desmaiado e teleportado) eles seguiam mostrando a hunt antiga, e a medida continuava sendo gravada nela.
  *Switching hunts or going to town no longer mixes numbers: the previous hunt's numbers leaked into the new one for up to 30 s (and into the tierlist's measurements), and outside a hunt the old one kept showing and being measured.*
- **Shiny capturado conta uma vez só.** Ele entrava duas vezes em vistos, capturados, perdidos, Hoje e no total da vida, e o webhook mandava "perdido ✕" antes do "CAPTURADO ✅". Agora o aviso do shiny derrotado diz "apareceu 👀", e se você capturar chega o "CAPTURADO ✅" como antes. Os Shinies tentados do Simples contam o total de bolas, que o jogo nunca zera: o shiny capturado fica no card com ✓ em vez de sumir, e o "Shinies Enc. Total" do Painel não cai mais a cada captura. O 🆕 das capturas só marca espécie ainda não capturada, e o 🎯 Alvo shiny mostra "✓ capturado" depois da captura.
  *A caught shiny counts once (it was counted twice, and the webhook sent "lost ✕" before "CAUGHT ✅"; a defeated shiny now reads "appeared 👀"). Shinies tried count total balls, which the game never resets, so a caught shiny stays on the card with ✓. The 🆕 catch mark and the Shiny target card now know what was really caught.*
- **Modo Soneca: o app não acorda mais a conta.** Com a conta dormindo pelo Zzz do jogo, o vigia de sessão caída relogava depois de 60 s, o que cancelava a soneca (o jogo cancela quem volta em menos de 5 min) e deixava a conta parada na cidade. Ele também relogava a cada minuto nas telas de criar personagem, verificar e-mail, trocar nome e trocar senha, apagando o que você tinha digitado. O relogin automático continua quando a sessão cai dentro do jogo e na manutenção.
  *Sleep mode: the app no longer logs back into an account put to sleep with the game's Zzz (that cancelled the nap and left it idle in town), and stopped reloading the character creation, email verification, rename and password screens every minute. Auto relogin still works when the session drops in game and during maintenance.*
- **🔢 Painéis: você escolhe o número direto.** O botão ia de 4 pra 1, 2 e 3: pra tirar um painel você passava pelo 1, e o app fechava e relogava as contas do meio, que iam pra cidade. Agora o ☰ Opções mostra os números de 1 a 4. Escolher 3 com 4 painéis abertos fecha só o painel 4, e escolher 3 com 2 abertos só abre o 3.
  *🔢 Panels: pick the number directly (1 to 4 in ☰ Options). Going from 4 to 3 closes only panel 4 and going from 2 to 3 only opens panel 3, so the accounts in between are no longer closed and relogged.*
- **▶ Logar equipe não tira do jogo quem está farmando.** Ele relogava todas as contas, e cada relogin manda a conta pra cidade. Agora só loga as contas que estão fora do jogo e as que tiveram o e-mail ou a senha trocados no 👤 Treinadores.
  *▶ Log in all only logs in the accounts that are out of the game, plus those whose email or password changed in 👤 Accounts; farming accounts are left alone.*
- **Janela de confirmação do jogo aberta não recarrega mais o painel.** Com a confirmação da 🛡 Venda protegida ou o "Sair da família" esperando resposta, a página do jogo fica parada, e o vigia de painel travado recarregava aos 60 s, mandando a conta pra cidade. Agora ele espera até 10 minutos.
  *An open in-game confirmation (sell guard, leave family) no longer makes the panel reload after 60 s; the watchdog waits up to 10 minutes.*
- **Com o app em Español, o jogo fica em espanhol.** O app punha o jogo em inglês e desfazia a escolha feita no seletor do próprio jogo a cada carga. E trocar o app entre English e Español recarregava os painéis sem mudar nada no jogo. A calculadora de IV (JustPokédex) também lê o jogo em espanhol.
  *With the app in Español the game now runs in Spanish (it was forced to English), and switching between English and Español no longer reloads the panels for nothing. The IV calculator (JustPokédex) also reads the game in Spanish.*
- **Atalhos de letra não disparam com uma janela do app aberta.** Digitar no Treinadores, nos Scripts, na Tierlist ou no Ditto antes de clicar no campo recarregava as contas (R), desligava os alertas (A) ou fazia o que a letra manda.
  *Letter shortcuts no longer fire while an app window (Accounts, Scripts, Tierlist, Ditto) is open.*
- **Os botões Copiar do jogo copiam.** Recovery Key, códigos do 2FA, Pix e link de indicação não iam pra área de transferência, porque o app negava ao jogo essa permissão. Agora só ela é liberada; ler a área de transferência continua bloqueado.
  *The game's Copy buttons (Recovery Key, 2FA codes, Pix, referral link) now work: the app lets the game write to the clipboard, and reading it stays blocked.*
- **Comprar pokébolas funciona.** Os botões +1.000 e +10.000 da engrenagem do 📊 Painel mandavam a compra sem a identificação da conta, e o servidor recusava (erro 401).
  *Buying Poké Balls (+1,000/+10,000 in the 📊 Panel gear) now works: the request lacked the account's authorization and the server refused it (401).*
- **A seção Times & IV do Simples aparece.** Anunciada na 1.5.5, ela nunca era desenhada. Mostra o time de cada conta com IV, qualidade e poder, e o poder projetado no nível que você escolher (até 3000). Vem ligada e dá pra esconder na engrenagem.
  *The Simple view's Teams & IV section, announced in 1.5.5, now shows up: each account's team with IV, quality, power and projected power at a level you choose.*
- **Renomear o painel com clique duplo.** O clique duplo no nome do painel não fazia nada. Agora o nome vira um campo ali mesmo: Enter ou clicar fora grava, Esc cancela, até 40 caracteres, e vazio volta pra "Treinador N".
  *Double-click a panel's name to rename it in place (Enter or clicking away saves, Esc cancels, up to 40 characters); it did nothing before.*
- **Tierlist e Ditto não recomendam mais hunt em que o pokémon mal mata.** O quadro por elemento, a nota Geral e o painel do Ditto podiam apontar como melhor uma hunt em que o pokémon levaria golpes demais por kill, que o Simples e o modo 🎯 Pokémon já descartavam. Agora eles usam o mesmo corte, e a hunt-alvo do Ditto no Simples também, então notas, ordem e algumas formas do Ditto mudam.
  *Tierlist and Ditto no longer recommend hunts where the Pokémon would need too many hits per kill, the cutoff the Simple view and Pokémon mode already used. Scores, order and some Ditto picks change.*
- **A calibração acontece farmando, em qualquer tela.** A medição de dano que ajusta a tierlist, o Ditto e o Sugerido só rodava com a seção Hunts do Simples em Sugerido e a janela à vista. Agora roda sozinha, até com o app minimizado, e só conta os golpes do líder atual. Se você trocar o líder, ou ele evoluir, no meio da sessão, aquela hunt só volta a ser medida depois de você trocar de hunt ou usar o ⟲ Zerar do app, porque os golpes do líder antigo continuam somados nela (o 🗑 do Hunt Analyzer do jogo não apaga os golpes). O Sugerido já abre com os tempos medidos nas suas hunts, sem precisar abrir a tierlist antes, e a dica "Tempos ajustados com N hunts suas" só aparece quando os tempos foram de fato ajustados.
  *Calibration happens while you farm, in any view: damage sampling runs in the background (even minimized), only counts the current leader's moves and skips a hunt until you change hunts or use the app's Reset when the leader is swapped or evolves mid session; Suggested uses your measured timings from the start; "Timings fitted on N hunts" only shows when they were.*
- **Tierlist, modo 🎯 Pokémon.** O campo Qualidade aceita acima de 2, até 10, o que cobre Anciã (3) e Divina (4); antes qualquer valor maior virava 2. E o "do meu time..." continua no Pokémon calculado depois de trocar o líder ou reordenar o time, em vez de marcar outro.
  *Tierlist, Pokémon mode: Quality accepts values above 2 (up to 10), and "from my team..." stays on the Pokémon being computed after reordering the team.*
- **Código-fonte: o Abrir PokeGrid não fica mais preso numa instalação pela metade, e o iniciar.bat mostra o erro.** Se a primeira extração do Electron fosse interrompida (janela fechada, antivírus), o Abrir PokeGrid via o `electron.exe` e abria um Electron incompleto, que fechava sem aviso, toda vez. Agora ele confere o último arquivo que a extração grava e refaz o que faltou. Também reinstala quando o antivírus levou o `electron.exe` depois de instalado, roda o `npm install` toda vez que entra na instalação (repõe dependência que faltou) e, com Node.js mais velho que o 22.12, avisa pra atualizar o Node em vez de mandar conferir a internet. O iniciar.bat descartava a saída de erro; agora o erro aparece e a janela espera você ler, e ele instala quando falta o Electron, não só quando falta a pasta `node_modules`. E o relatório de erros registra quando um segundo clique só mostrou o PokeGrid que já estava aberto.
  *Source: Abrir PokeGrid no longer gets stuck on a half-extracted Electron, reinstalls when the antivirus removed electron.exe or a dependency is missing, and warns when Node.js is older than 22.12. iniciar.bat installs when Electron is missing and shows the error when the app fails to start, and the error log notes when a second launch only showed the running instance.*
- **Misdreavus continua aprendendo TM agora que evolui.** Com a Mismagius (patch do jogo de 25/09), a Misdreavus deixou de ser estágio final e o app passou a tirar dela os TMs elementais e o AoE. O jogo pôs ela na lista de exceções que aprendem TM mesmo evoluindo, e o app agora segue: a tierlist com TM, o Sugerido e o modo 🎯 Pokémon voltam a contar o Untold Nightmare e o AoE dela.
  *Misdreavus still learns TMs now that it evolves: the game (25/09 patch, Mismagius) added it to the TM stage exceptions, so the tierlist with TM, Suggested and Pokémon mode count its Untold Nightmare and AoE again.*
- **A calibração de dano não se perde mais ao fechar o app.** As medições que ajustam o dano do modelo eram gravadas mas nunca lidas de volta: cada abertura recomeçava de "Ainda sem medição sua de dano" e o ajuste dependia só das contas daquela sessão. Agora as últimas 40 medições voltam na abertura.
  *Damage calibration survives restarts: the samples were saved but never loaded back, so every launch started from scratch. The last 40 now come back.*
- **O boost Discord (na call) não some mais dos painéis sem foco.** A barra de boosts do jogo só se atualiza quando a janela ganha foco, e o boost da call chega com prazo curto, porque o bot confere a call a cada 30 s. Com 4 contas abertas só um painel tem foco, então nos outros o "na call" sumia uns 30 s depois do último clique. O buff seguia valendo, porque quem confere é o servidor; só o aviso sumia. Agora cada painel pede a lista de boosts ao jogo a cada 25 s enquanto houver um boost da call, e a cada 2 min quando não houver, pra mostrar quem entrar na call depois.
  *The Discord (in call) boost no longer vanishes from unfocused panels: the game's boost bar only refreshes when its window gets focus, so with 4 accounts open it disappeared about 30 s after the last click. The buff itself kept counting on the server; now each panel asks the game for the boost list every 25 s while a call boost is active, and every 2 min otherwise.*
- **Miúdos**: a barra de EXP do time fica certa acima do Lv150 (travava em 100% perto do Lv165); na aba Σ do 📊 Painel, conta com pokébola infinita mostra "∞ bolas" e o total de Pokébolas mostra ∞, em vez de um milhão; o Inventário do Simples passa a somar o depósito pessoal; trocar de conta pelo Sair do jogo no mesmo painel não conta mais a caixa da conta nova como capturas e shinies capturados; webhook do Discord PTB ou Canary é aceito; a calculadora de IV volta onde foi arrastada depois de fechar e abrir o app; marcar um alerta ou uma opção do webhook na engrenagem do Simples não congela mais os números até clicar em outro lugar; o filtro das Capturas que estava numa conta cujo painel saiu no 🔢 Painéis volta pra "todas"; na Tierlist e no Ditto por Gold/h, os preços que chegam numa nova tentativa passam a aparecer, e depois de 5 tentativas sem preço a tela pede pra fechar e abrir o app em vez de dizer que tenta sozinha; em inglês e espanhol, a tierlist, a aba Σ, as dicas do topo do 📊 Painel, a janela de Scripts, as dicas Remover e o ✓/✕ dos shinies deixaram de aparecer em português.
  *Smaller: team EXP bar is right above Lv150; an unlimited Poké Ball shows ∞ in the Σ tab; the Simple view inventory counts the personal depot; switching accounts with the game's Logout no longer turns the new account's box into catches; Discord PTB/Canary webhooks are accepted; the IV card reopens where you dragged it; ticking an alert or webhook option no longer freezes the Simple view; the Catches filter resets when its panel is removed; Gold/h lists appear when prices arrive on a retry, and after 5 failures the screen says to reopen the app; more of the interface translated to English and Spanish.*
- **FAQ novo:** como usar uma conta que entra pelo Google (criando uma senha no jogo), como deixar o app mais leve, com as opções do app e as de vídeo do próprio jogo, o que conferir quando o Abrir PokeGrid abre e fecha (Controle inteligente de aplicativos do Windows, antivírus) e o que fazer quando o Linux só abre com `--no-sandbox`.
  *New FAQ entries: Google accounts (create a password in the game), making the app lighter, and Linux --no-sandbox.*

## 1.5.26

- **Código-fonte: o `Abrir PokeGrid.bat` travava em "A instalação não terminou".** O Electron 43 não baixa mais o programa dele durante a instalação, só na primeira vez que alguém pede o caminho, e o `.bat` da 1.5.25 procurava o programa antes disso. Quem instalou do zero ficava preso nessa mensagem. Agora o `.bat` pede o download (uns 100 MB, com a janela avisando pra não fechar), e se a internet cair no meio, abrir de novo continua de onde parou. A instalação também pula a auditoria do npm, que só atrasava.
  *Source: Abrir PokeGrid.bat got stuck on "installation did not finish": Electron 43 only downloads its binary the first time something asks for its path, and the 1.5.25 launcher checked for it before that. It now triggers the download (about 100 MB) and resumes if the connection drops.*
- **Limpar jogo esconde o card novo de abate** ("Pokémon derrotado", com TREINADOR, POKÉMON, as partes do XP e o LOOT), que o jogo passou a mostrar no lugar do aviso antigo. Level up, troca e os outros avisos continuam aparecendo.
  *Clean game hides the new kill card (TRAINER, POKÉMON, XP breakdown and LOOT) the game now shows instead of the old combat notice.*

## 1.5.25

- **Código-fonte: o `Abrir PokeGrid.vbs` virou `Abrir PokeGrid.bat`.** Desde 22/09 o Windows Defender barra o zip do código-fonte na hora do download como "Trojan:Script/Wacatac.H!ml", um falso positivo. O suspeito é o VBS, que abria o terminal escondido (o mesmo padrão já fez o zip de outros projetos ser barrado), então o lançador agora é um `.bat` que abre o app direto, sem terminal escondido: na primeira vez mostra a instalação, depois a janela só pisca. Quem tinha atalho pro `.vbs` refaz apontando pro `.bat`. O FAQ explica o aviso e como baixar enquanto a Microsoft não libera.
  *Source: the Abrir PokeGrid.vbs launcher became Abrir PokeGrid.bat. Since 09/22 Windows Defender blocks the source zip at download time as "Trojan:Script/Wacatac.H!ml", a false positive. The suspect is the VBS, which opened a hidden terminal (the same pattern got other projects' zips blocked), so the launcher is now a .bat that opens the app directly. The FAQ explains the warning and how to download meanwhile.*
- **Cmd+V agora cola no macOS**, e Cmd+C, Cmd+X, Cmd+A e Cmd+Z também: no login do jogo, no chat e nos campos do app. No Mac esses atalhos vêm do menu de edição, e o app sempre usou, no lugar do menu padrão, um menu só com os atalhos de painel. Agora ele tem o menu Edição, e no Mac o menu PokeGrid (com Quit PokeGrid, Cmd+Q) vem antes dele. No Windows e no Linux o Ctrl+V já funcionava: lá a única diferença é o menu Edição na barra que aparece com Alt.
  *Cmd+V now pastes on macOS (and Cmd+C/X/A/Z): on the Mac those shortcuts come from the Edit menu, which the app never had. It now has one, with the PokeGrid app menu (Hide, Quit with Cmd+Q) before it. On Windows and Linux Ctrl+V already worked: the only difference there is an Edit menu in the Alt menu bar.*
- **"Abrir com o Windows" funciona na versão portátil.** A portátil se extrai numa pasta temporária a cada abertura, e o atalho da pasta Inicializar apontava pra essa pasta, que some quando o app fecha: no logon seguinte, nada abria. Agora o atalho aponta pro `.exe` que você abriu, e quem já tinha ligado a opção é corrigido sozinho na próxima abertura. E o item "Abrir com o Windows" do menu da bandeja passa a acompanhar o botão da janela: antes, depois de mudar por um, o outro pedia dois cliques.
  *"Open with Windows" works in the portable version: the Startup shortcut pointed to the temporary folder the portable extracts itself into, which is deleted on exit. It now points to the .exe you opened, and existing shortcuts are fixed on the next launch. The tray menu item now follows the window button (it used to need two clicks after changing the other).*
- **O "Iniciar com o Windows" antigo é apagado de verdade.** Até a 1.5.4 o app se registrava na chave Run do Windows pra abrir escondido na bandeja. A limpeza que devia apagar esse registro desde a 1.5.5 nunca apagava nada, então quem ligou a opção naquela época continuava com o app abrindo escondido no logon. Agora o registro antigo sai, uma vez só. Quem quiser abrir junto com o Windows liga de novo em **🚀 Abrir com o Windows**, que usa um atalho visível na pasta Inicializar.
  *The old "Start with Windows" entry is really removed: up to 1.5.4 the app registered itself in the Windows Run key to start hidden in the tray, and the cleanup added in 1.5.5 never deleted anything. The old entry is now removed once; turn on 🚀 Open with Windows again if you want it (a visible shortcut in the Startup folder).*

## 1.5.24

- **Tierlist, Sugerido e painel do Ditto vazios no app instalado, desde a 1.5.5.** O arquivo de matemática de IV (`src/domain/iv-math.js`) nunca entrou no pacote do instalador, da portátil e do zip: quem instalava via nessas telas só o rodapé ou nada, e o cálculo nunca rodava. Quem roda pelo código-fonte nunca sentiu. Corrigido no empacotamento, com teste que confere que tudo que o app carrega vai no pacote.
  *Tierlist, Suggested and the Ditto panel were empty in the installed app since 1.5.5: the IV math file never made it into the installer, portable and zip packages. Fixed, with a test that checks every file the app loads is packaged.*
- **Aviso de vírus explicado no FAQ**, e o build passa a registrar a varredura do Windows Defender no log de cada versão.
  *Antivirus warning explained in the FAQ, and each release build now logs a Windows Defender scan.*
- **TMs como o jogo faz.** A caixinha "com TM" tratava o TM como golpe principal de um alvo. No jogo o TM elemental é um golpe EXTRA em área que dispara sozinho a cada 10 s (só do próprio tipo, poder 300) e o AoE TM faz o golpe normal acertar todos os selvagens do quadro, e os dois convivem. Agora a tierlist, a sugestão do Simples (com os TMs que o seu pokémon tem) e a nota Geral contam assim, e a linha mostra qual TM entrou (tipo e/ou AOE). O coletor passou a medir por golpe: acertos, salvas em área, alvos por salva e dano em % da vida, e a densidade medida de cada hunt entra no cálculo (alvos por salva, salvas do TM por hora e alvos por golpe normal com AoE). O disco elemental segue a regra do jogo: qualquer estágio final aprende o do próprio tipo, nos 18 tipos.
  *TMs the way the game does them: the elemental TM is an extra area hit every 10 s (own type, power 300) and the AoE TM makes the normal move splash on every wild in the box; both coexist. The tierlist, the Simple view's suggestion (with your Pokémon's real TMs) and the Overall score count them this way, and the row shows which TM applies. The collector now measures per move: hits, area salvos, targets per salvo and damage in % of HP.*
- **Nota da tierlist e do Ditto virou XP por hora de verdade.** O modelo dizia "mata de um golpe" onde as contas medem 2 golpes, e tratava kills/h como proporcional ao dano. Agora a nota é golpes esperados por kill × tempo do golpe + sobrecarga por kill (2,1 s + 3,1 s, medidos em 25 hunts reais: andar até o próximo selvagem e o spawn pesam tanto quanto bater), vezes o XP da hunt. E o app se calibra sozinho: o dano real do seu líder (lido do jogo) corrige a constante do modelo, e seus kills/h por hunt ajustam os tempos. A dica no topo da tierlist e do painel do Ditto mostra o estado da calibração.
  *Tierlist and Ditto scores are now real XP per hour: expected hits per kill × hit time + per-kill overhead (2.1 s + 3.1 s, measured on 25 real hunts), times the hunt's XP. The app self-calibrates: your leader's real damage (read from the game) corrects the model's constant and your kills/h per hunt fit the timings.*
- **Limpar jogo também esconde os avisos de combate** ("Kabutops derrotado! +3.848 EXP..."), que ficavam empilhando no canto. Level up, troca e os outros avisos continuam aparecendo.
  *Clean game now also hides the combat notices ("X defeated! +XP..."); level up, trade and other notices still show.*

## 1.5.23

- **Painel do Ditto que ficava vazio pra sempre** (só o rodapé "N hunts acima do nível da conta ficaram de fora"). Quando o catálogo de criaturas do jogo demora ou falha na primeira tentativa, o quadro do Simples pedia a varredura do Ditto sem catálogo e o resultado vazio ficava guardado com a mesma chave que o painel usa depois. Em conexão lenta acontecia sempre. Resultado vazio não fica mais no cache, e a chegada do catálogo invalida o que foi calculado sem ele.
  *Ditto panel stuck empty forever (only the "N hunts above the account level" footer): the Simple view's board requested the sweep before the creature catalog had loaded and the empty result stayed cached under the same key the panel uses. Empty results are no longer cached and the catalog's arrival invalidates them.*

## 1.5.22

- **Tierlist e Ditto: nota que separa de verdade.** O modelo de dano passou a seguir as regras que o jogo documenta: efetividade amplificada na hunt (×2 vira ×2.5, ×4 vira ×5.5, resistências dividem por 1.5), STAB ×1.5 no golpe do próprio tipo, golpe físico contra a Defesa e especial contra a Defesa Especial do selvagem, e a vida dele dizendo quantos golpes o kill leva. E matar de um golpe no limite deixou de valer o mesmo que matar com folga: a nota usa a chance de matar de um golpe, então dezenas de espécies (e todos os tipos do Shiny Ditto) não empatam mais em 100. Vale pra tierlist, pra sugestão de hunt do Simples e pro painel do Ditto.
  *Tierlist and Ditto scores now separate: the damage model follows the game's documented rules (amplified matchups in hunts, STAB, physical vs Defense and special vs Sp. Def, the wild's HP deciding hits per kill), and a marginal one-shot no longer scores the same as a comfortable one. Dozens of species (and every Shiny Ditto type) stopped tying at 100.*
- **O app passa a ler o dano real de cada golpe e a vida do selvagem** (vêm na mensagem de campo do jogo). A lista de hunts mostra os golpes por kill medidos ao lado da sua média; é com isso que o modelo será calibrado.
  *The app now reads the real damage per hit and the wild's HP from the game's field messages; the hunt list shows measured hits per kill next to your average.*

## 1.5.21

- **Pokébolas infinitas e com validade** (lançamento de 17/09 à noite): o jogo passou a ter bola de arremessos ilimitados por um prazo, bola vinculada ao personagem e bola com validade. O app contava a infinita como "1 bola" e avisava "poucas pokébolas" o tempo todo, cobrava o preço dela a cada arremesso no saldo da sessão, e contava bola vencida como disponível. Agora: com uma infinita válida a contagem é ilimitada (sem alerta), o arremesso dela custa zero, a vencida não conta e some da mochila, e a infinita aparece com ∞.
  *Unlimited and expiring Pokéballs: an active unlimited ball now counts as unlimited (no low-ball alert), its throws cost nothing in the session balance, expired balls no longer count, and unlimited ones show an ∞.*
- **Atualização do jogo de 17/09: golpes reescritos e TMs.** O jogo refez os golpes de quase todas as criaturas (agora são até 18 por pokémon, o app lia só os 12 primeiros) e trouxe os **TMs**, golpes de poder 600 (300 no de Dragão). O app tratava TM como golpe natural de nível 1, então o "melhor golpe" de 187 espécies virou um TM que você talvez nem tenha. Agora TM só conta pro pokémon que aprendeu o disco (o jogo informa isso), e todos os golpes são lidos.
  *Game update of Sep 17: moves were rewritten (up to 18 per Pokémon, the app only read the first 12) and TMs arrived with power 600 (300 for Dragon). The app treated TMs as natural level-1 moves. Now a TM only counts for a Pokémon that actually learned it.*
- **Recomendação do Ditto corrigida, principalmente a do Shiny.** Ditto não aprende TM, e o app recomendava transformação contando com golpe de TM. As regras de quem pode ser copiado foram refeitas a partir do jogo de hoje: nada de Mega, Nightmare, boss de Orre nem Outland avançado, e o Shiny Ditto só vira espécie com forma shiny, que hoje são 190 (o app ainda usava uma lista antiga de 64). Em empate, a recomendação agora é a forma mais forte, não a primeira da lista (saía "Bulbasaur" e "Charizard com Ember"). Qualidade e IV usados são os do seu Ditto.
  *Ditto recommendation fixed, especially Shiny Ditto: no TM moves (Ditto cannot learn them), today's copy rules from the game (no Mega, Nightmare, Orre bosses; Shiny Ditto limited to the 190 species with a shiny form, up from a stale list of 64), and ties now pick the strongest form.*
- **Tierlist ajustada aos níveis.** Só aparecem espécies que dá pra ter no nível escolhido, caçando ou evoluindo (Mega, Orre e Nightmare apareciam como melhor atacante pra quem está no nível 50). A folga passou a pesar de verdade na nota: nos níveis baixos quase tudo mata de um golpe e 75 de 76 espécies viravam S. E ganhou a caixinha **com TM**, desligada por padrão, pra quem tem os discos.
  *Tierlist adjusted to levels: only species you can actually own at the chosen level, the overkill margin now really weighs on the score (at low levels nearly everything was S), and a "with TM" checkbox, off by default.*
- **Hunts fora do ar não derrubam mais o resto.** Quando a lista de hunts do jogo falha (aconteceu hoje, erro 502), o app perdia junto sprites, stats e golpes. Agora o catálogo de criaturas fica, e as hunts são tentadas de novo a cada minuto.
  *When the game's hunt list is down, the app no longer loses sprites, stats and moves with it.*
- **Scripts de terceiros não rodam mais na tela de login.** É ali que o app digita a senha salva, e qualquer script ligado conseguia ler o campo. Agora eles só entram depois do login. De quebra: cada script roda uma vez por página (ligar com o painel carregando rodava duas), erro de script vai pro relatório de erros, e arrastar ou colar código pede a mesma confirmação de confiança que o link já pedia.
  *Third-party scripts no longer run on the login screen, where the app types the saved password. They also run once per page, log their errors, and drag-and-drop or pasted code now asks for the same trust confirmation as a link.*
- **Conta que perdia a sessão sem recarregar ficava "online" pra sempre**, e o relogin automático nunca disparava. Agora o app percebe (servidor parou de responder pelo personagem e a conexão caiu) e volta pro login sozinho. E quem acabou de logar não é mais devolvido pra tela de login logo em seguida.
  *An account that lost its session without reloading stayed "online" forever and never logged back in. Fixed, and a fresh login is no longer bounced back to the login screen.*
- **Tierlist voltou a separar bom de ruim.** Com o seletor de nível, do nível 600 pra cima quase toda espécie virava S com nota 91 a 100. O nível escolhido continua filtrando as hunts que você alcança, mas cada pokémon volta a ser avaliado no nível de cada hunt.
  *The tierlist ranks again: with the level selector nearly every species became S above level 600. Your level still filters reachable hunts, but each Pokémon is rated at each hunt's level.*
- **Histórico de hunts não some mais quando o arquivo falha.** As hunts que passam de 150 vão pra um CSV, mas eram apagadas mesmo se a gravação falhasse (CSV aberto no Excel, disco cheio). Agora só saem da memória depois que o arquivo confirmou (se o arquivo seguir falhando e o histórico passar de 300 hunts, as mais antigas são descartadas pra não crescer sem teto), e os drops por item também são arquivados, em `hunts-historico-drops.csv`.
  *Hunt history is no longer lost when archiving fails, and per-item drops are archived too.*
- **Importar config avisa que troca o histórico e guarda uma cópia antes.** O arquivo de outra pessoa leva junto as hunts, shinies e gráficos dela, e substituía os seus sem avisar.
  *Importing a config now says it replaces your history and saves a copy of your current state first.*
- **Mochila: "esconder itens específicos" voltou a esconder.** A caixinha desmarcada voltava marcada e nada sumia.
  *Bag: "hide specific items" works again.*
- **Resumo diário do Discord ao abrir o app** falhava calado e travava o dia salvo. Corrigido.
  *The Discord daily summary on startup failed silently. Fixed.*
- **Painel não mistura mais os números de duas contas** quando você troca o treinador de um painel, e a sessão antiga não ressuscita depois de horas parado no login.
  *A panel no longer mixes the numbers of two accounts when you switch trainers.*
- **Estimativa de kills por hora usa a conta certa**: a medição do líder forte de uma conta inflava a estimativa do pokémon de outra. E hunts com pontuação no nome voltaram a casar com as suas medições.
  *The kills-per-hour estimate now anchors on the attacker's own account.*
- **Card de IV: mudar o nível projeta de verdade.** Antes derrubava o IV total e mostrava poder errado.
  *IV card: editing the level now projects correctly.*
- **Blastoise de Kanto não aparece mais como Outland**, o aviso de nível do Ditto usa o nível do mapa, a venda protegida fala seu idioma também depois de recarregar, e desligar, remover ou atualizar um script avisa que os painéis vão recarregar.
  *Kanto's Blastoise is no longer tagged Outland, plus smaller fixes to Ditto, protected sale and the scripts manager.*
- **Voltar pra hunt depois de recarregar (experimental, desligado por padrão)**: quando o app recarrega um painel sozinho (conta travada, painel que caiu), o jogo larga a conta na cidade e ela para de farmar. Com a opção **↩ Voltar pra hunt** ligada em ☰ Opções, o app manda a conta de volta pra mesma hunt 12 segundos depois, e repete a cada 12 s (até 3 vezes) enquanto não houver kill. Só age se houve kill nos últimos 10 minutos, então quem estacionou na cidade de propósito não é mexido. A tela do jogo pode seguir mostrando a cidade enquanto a conta farma. Vem desligado até ser validado por mais gente: se testar, conta como foi.
  *Back to hunt after a reload (experimental, off by default): when the app reloads a panel on its own, the game drops the account in the city. With the option on, the app sends it back to the same hunt 12 seconds later, retrying every 12 s up to 3 times until a kill lands, only if there was a kill in the last 10 minutes. The game screen may keep showing the city while the account farms.*
- **Região Nightmare**: os 110 pokémon e as 108 hunts novas (nível 2000 a 3000) entram na lista de hunts com rótulo NIGHTMARE e sprite, e a tierlist aceita nível até 3000 (antes travava em 600). Elas concorrem na tierlist e no Sugerido, mas com o XP que o jogo publica hoje (máximo de 6 mil por kill, contra 19 mil de Orre) não chegam ao topo: para farmar XP, Orre ainda rende mais.
  *Nightmare region: the 110 new Pokémon and 108 hunts (level 2000 to 3000) show up in the hunt list, labeled and with sprites, and the tierlist level cap went from 600 to 3000. They compete in the tierlist and Suggested, but with the XP the game publishes today they do not reach the top: Orre still pays more.*
- **Hunts com dois pokémon no nome** ("Nightmare Bagon e Shelgon") pegavam os dados do pokémon comum, com XP de outro mundo. Agora casam com o da região certa.
  *Hunts named after two Pokémon now match the right regional creature instead of the base one.*
- **Mochila: Berries, Held e Addons** ganharam categoria própria. São 135 itens que antes caíam em "Outros".
  *Bag: Berries, Held and Addons got their own categories instead of landing in "Other".*
- **Painel do Ditto: onde caçar e o que virar** (☰ Opções → ✨ Ditto, logo abaixo da Tierlist). A recomendação do Ditto só existia dentro do Simples, com o Ditto que estivesse no time. Agora tem painel próprio: shiny ou comum, nível do Ditto e nível da conta são editáveis (e **Meu Ditto…** preenche com o Ditto real do time); qualidade e IV são os fixos do jogo. **Por hunt** ranqueia as hunts da melhor pra pior, cada uma com a melhor transformação; **Por tipo** mostra a melhor forma de cada elemento. Regras e debuffs do jogo, sem TM.
  *Ditto panel: where to hunt and what to become (Options, right below the Tierlist). Shiny or regular, Ditto level and account level are editable ("My Ditto" fills in a real one from the team); quality and IV are the game's fixed values. "By hunt" ranks hunts best to worst, each with its best transformation; "By type" shows the best form per element. Game rules and debuffs, no TMs.*
- **Custo das pokébolas no saldo da sessão: cada arremesso cobra a bola que saiu naquela hora.** Antes era o preço da bola de auto-catch do momento vezes o total de arremessos: trocar de bola no meio da sessão reescrevia o custo de tudo que já tinha saído, e o Simples e o Painel cobravam a bola infinita. A contagem de bolas do Simples com infinita ativa vira ilimitada, e nos itens fixados a infinita aparece como ∞ e a vencida some.
  *Pokéball cost in the session balance: each throw is charged at the ball actually thrown. Before, it was the current auto-catch ball's price times all throws, so switching balls mid-session rewrote the cost of everything already thrown, and the Simple view and Panel still charged the unlimited ball.*
- **Tierlist: o nível mínimo pra ter uma espécie vem do mapa, não do registro da criatura.** Treecko, Grovyle e Sceptile só existem em Orre (nível 520+), mas o registro nacional deles diz nível 20, e a tierlist os oferecia como atacante pra quem está no 20. Na aba Geral com TM ligado, cada disco é avaliado por vez (o jogo só deixa um TM por pokémon) e fica o melhor; o Sugerido marca quando o golpe recomendado é de TM; os textos citam que o TM de Dragão tem 300, não 600.
  *Tierlist: the minimum level to own a species now comes from the map markers, not the creature record (Treecko's line only exists in Orre at 520+, but its record said 20). The General tab with TMs on evaluates one disc at a time, like the game allows, and the Suggested column flags TM moves.*
- **Arquivo de hunts: drops e resumo gravam em sequência.** Se a gravação dos drops falhasse e a do resumo desse certo, os drops sumiam pra sempre; no inverso, a próxima tentativa duplicava as linhas de drops. Agora só sai da memória o que os dois arquivos confirmaram.
  *Hunt archive: per-item drops and the summary are written in sequence, and nothing leaves memory until both files confirmed (before, one failing and the other succeeding either lost the drops or duplicated them).*
- **Login automático em mais situações, e menos agressivo em manutenção.** Sair pelo menu do jogo (que troca pra tela de login sem recarregar) não disparava o login automático. E em manutenção do jogo o app tentava relogar a cada 60 s, recarregando o painel toda vez; agora tenta a cada 10 min.
  *Auto-login now also fires after logging out from the game menu, and during game maintenance it retries every 10 min instead of every 60 s.*
- **Scripts de terceiros: mais três buracos fechados.** Ligar um script com o painel parado no login deixava aquele painel sem o script até o próximo reload; nenhum script entra mais em cadastro, recuperação de senha e verificação de e-mail (nem fora do jogo, como painel desligado ou página de erro); e "atualizar" sem recarregar avisa que a versão nova só entra no próximo reload.
  *Third-party scripts: turning one on while a panel sits on the login screen now injects it after login; no script runs on sign-up, password recovery or e-mail verification pages; and updating without reloading says the new version only runs after the next reload.*
- **Resumo do dia no Discord não se perde mais com a rede ainda subindo** (ao abrir o app junto com o Windows): o envio que falha é repetido a cada 30 s, até 5 vezes. Importar a config de outra pessoa não traz mais o marcador do dia dela (mandaria o resumo do dia dela pro seu Discord), e se a cópia de segurança do seu estado falhar, o app pergunta antes de importar.
  *The Discord daily summary is retried up to 5 times when the network is still coming up. Importing someone else's config no longer carries their day marker, and if the safety copy fails the app asks before importing.*
- **Miúdos**: "Voltar pra hunt" não manda a conta de novo pra uma hunt que o servidor já aceitou e só arma na página do jogo; a recomendação do Ditto é recalculada quando uma hunt do meio da lista muda; se a lista de criaturas falhar mas as hunts vierem, o app continua tentando o catálogo (tierlist e Ditto não ficam vazios até reiniciar).
  *Smaller: "Back to hunt" no longer re-sends an accepted hunt and only arms on the game page; the Ditto recommendation refreshes when any hunt in the list changes; the creature catalog keeps being retried if it fails while hunts load.*
- **2FA do jogo**: compatível. Depois da senha, o jogo pede o código do autenticador e você digita; o app não toca nele, igual ao captcha.
  *Game 2FA: supported. The app fills e-mail and password and stops there; you type the code yourself.*

## 1.5.20

- **Hunts que apareciam vazias**: Nidoran macho, Nidoran fêmea e Farfetchd não casavam com os dados do jogo, então essas hunts ficavam sem tipo, sem XP e sem loot no ranking. Agora todos os 482 pokémon do jogo são reconhecidos.
  *Hunts that showed up empty: Nidoran male, Nidoran female and Farfetchd now match the game data, so they get type, XP and loot again.*
- **Botão Testar do webhook agora testa mesmo**: ele dizia OK até com a URL errada ou o webhook apagado. Agora ele espera a resposta do Discord e mostra se chegou ou falhou.
  *The webhook Test button now waits for Discord's answer and reports success or failure.*
- **Barra de EXP do time voltou a aparecer** no Simples: ela lia um campo que o jogo não tem.
  *Team EXP bar shows again in Simple mode.*
- **Ouro de "Hoje" bate com o painel**: os dois números vinham de contas diferentes e podiam divergir.
  *"Today" gold now uses the same server number the panel shows.*
- **Resumo diário do Discord não some mais** se o app estiver fechado na virada da meia-noite: ele fecha o dia pendente ao abrir.
  *The Discord daily summary is no longer lost when the app is closed at midnight.*
- **Conta perdida por queda de internet não recarrega mais em loop**: falha de um elemento de terceiro dentro da página parava de derrubar o painel inteiro.
  *A third-party frame failing inside the page no longer reloads the whole panel in a loop.*
- **Zerar sessão não apaga mais o nome da hunt**, então a hunt seguinte entra no histórico identificada.
  *Resetting the session keeps the current hunt name, so the next hunt is logged with its name.*
- **Alertas continuam acompanhando com o sino desligado**: religar não dispara mais aviso velho nem engole suprimento que baixou nesse meio tempo.
  *With the bell off the app keeps tracking, so turning it back on no longer fires stale alerts.*
- **"Melhor hunt" e a estimativa ficaram mais honestas**: o nível exigido agora vem do mapa, e a estimativa de kills por hora deixa de extrapolar quando você escolhe um atacante bem mais fraco que o da medição.
  *Suggested hunt uses the map's required level, and the kills-per-hour estimate no longer extrapolates from a much weaker attacker.*
- **Sprites de Outland no time deixam de faltar** no painel Resumo.
  *Outland Pokémon in your team no longer show up without a sprite.*
- **Limpar jogo voltou a revelar a conta ao passar o mouse** (o app escondia um elemento que não existe e deixava a conta escondida de vez).
  *Clean game reveals the account on hover again.*
- **Backup automático também roda com o app aberto** (de 6 em 6 horas ele confere se já passou a semana), não só ao abrir.
  *The automatic backup is also checked every 6 hours while the app stays open.*
- **Aviso de venda protegida sai no idioma do app**, não mais só em português.
  *The protected-sale confirmation now follows the app language.*
- **Senhas nunca são gravadas sem criptografia**: em sistema sem cofre, o app recusa e avisa, em vez de salvar em texto puro calado.
  *Passwords are never written unencrypted: on a system without a keystore the app refuses and says so.*
- **A página do jogo não abre mais links no seu navegador em sequência**: no máximo 3 a cada 10 segundos.
  *The game page can no longer open unlimited links in your browser: at most 3 per 10 seconds.*
- **Abrir com o Windows se conserta sozinho** quando a pasta do app muda de lugar.
  *Start with Windows repairs its shortcut when the app folder moves.*
- **Simples não congela mais em silêncio** se um arraste for interrompido no meio.
  *Simple mode no longer freezes silently when a drag is interrupted.*
- Textos e documentação: opção do sino descreve os 5 tipos de aviso, botão 🗑 diz que limpa o formulário, manual lista os atalhos E e A, README corrige contagem de contas e cita o espanhol, e o changelog perdeu dois marcadores de edição que tinham vazado.
  *Text and docs cleanup across the app, manual, README and changelog.*
- **Conta caída agora avisa de verdade**: com a internet fora, o painel continuava mostrando "online" com a bolinha verde e o aviso de "conta caiu" nunca chegava, nem no Windows nem no Discord. A página de erro do navegador zerava o contador de falhas por dentro. Corrigido, e a reconexão agora vai espaçando as tentativas (6s, 12s... até 1 minuto) em vez de desistir: uma queda longa, como reiniciar o roteador, se recupera sozinha.
  *Dropped account now actually alerts: with the internet down the panel kept showing "online" and the alert never fired. Fixed, and reconnection now backs off up to 1 minute instead of giving up.*
- **Salvar senha nunca mais falha calado**: se o antivírus estivesse segurando o arquivo ou o disco estivesse cheio, a janela de treinadores fechava como se tivesse salvo e a senha sumia no próximo boot. Agora o app avisa na hora, não fecha a janela e registra no relatório de erros.
  *Saving passwords no longer fails silently: the app now warns, keeps the window open and logs the error.*
- **Config de terceiro não executa mais código**: um arquivo de configuração recebido de outra pessoa podia esconder código no nome do alvo shiny e, ao ser importado, rodar dentro do app com acesso às suas senhas. O nome agora é tratado como texto puro. O mesmo buraco foi fechado na calculadora de IV, que confiava no que a página do jogo devolvia.
  *Imported configs can no longer run code: the shiny target name is escaped and the IV card sanitizes what the game page returns.*
- **Depósito volta a contar no inventário**: o inventário do Simples somava só a mochila, porque o pedido do depósito ia sem autenticação e voltava vazio, sem aviso nenhum.
  *Depot counts in the inventory again: the request was missing its auth token and silently returned nothing.*
- **Conta que perde a sessão volta a logar sozinha**: quando a sessão caía sem trocar de página (ou você clicava Sair dentro do jogo), o painel ficava parado até alguém clicar em Logar equipe. Agora, depois de 1 minuto sem sessão, ele volta pra tela de login sozinho. Se você estiver resolvendo o captcha, ele não mexe.
  *Accounts that lose their session log back in on their own, and it never interrupts a captcha you are solving.*
- **Alerta de suprimento na caixa certa**: "poucas potions" e "poucos revives" estavam presos à opção "Conta caiu". Foram pro lugar certo, e a opção agora se chama "Suprimento baixo (pokébola, potion, revive)".
  *Low potion and revive alerts moved out of the "account dropped" toggle into the supplies one.*
- **Nome de treinador com cifrão ($) não embaralha mais o texto** das confirmações.
  *Trainer names containing "$" no longer garble confirmation dialogs.*
- **Botão de wiki do jogo não abria nada**: qualquer link que o jogo tenta abrir em aba nova (a wiki, por exemplo) era engolido em silêncio pelo painel. Agora ele abre no seu navegador padrão, fora do PokeGrid, e a conta continua no lugar. Nada abre dentro do app.
  *In-game wiki button did nothing: links the game opens in a new tab were silently swallowed by the panel. They now open in your default browser, outside PokeGrid; nothing opens inside the app.*
- **Painel preso num login velho (sem o "confirme que é humano")**: quando o jogo atualiza a tela de login, um painel podia continuar mostrando a versão antiga guardada em cache, sem o captcha, e você não conseguia logar. Agora o **⟳ Atualizar tudo** (e o ⟳ de cada painel) recarrega ignorando o cache, então uma atualização já traz a tela de login nova. O recarregamento automático de conta travada continua rápido como antes.
  *Panel stuck on a stale cached login (no captcha): the manual reload (⟳) now ignores the cache, so refreshing brings the fresh login page; the automatic watchdog reload stays fast.*
- **Alertas do Windows por tipo** (pedido do Abel): na configuração do Simples agora dá pra escolher quais avisos tocam na sua máquina, cada um separado: shiny, conta caiu, parou de farmar, sem pokébola e pokémon derrubado. Assim quem tem muito shiny na hunt pode desligar só o alerta de shiny e continuar recebendo o de "parou de farmar", sem precisar desligar tudo. O botão 🔔 no topo continua sendo o liga/desliga geral, e o Discord tem as opções próprias dele.
  *Windows alerts by type: pick which alerts fire on your machine, each independently (shiny, dropped, stopped farming, out of balls, fainted), so you can mute just shiny and keep the inactivity alert.*

## 1.5.19

- **"Sugerido" corrigido**: o ranking recomendava hunts de nível 600 (Megas/endgame) no topo porque o XP delas é gigante, mesmo quando o seu pokémon mal arranha (você faintaria antes de matar). Agora uma hunt onde o atacante não causa dano suficiente afunda no ranking, e o topo passa a ser uma hunt que você realmente consegue fazer. As hunts fortes voltam a ser recomendadas quando você leva o pokémon certo (o counter de tipo).
  *"Suggested" fixed: it recommended lv600 hunts at the top because of their huge XP, even when your pokémon barely scratches them (you would faint). Now unviable matchups sink, and a hunt is only suggested when your attacker can actually dent it.*
- Ajuste do "Sugerido": a barrinha de % ao lado de cada hunt agora respeita o mesmo critério do ranking, então uma hunt que você não consegue fazer não aparece mais com % verde estourado (chegava a passar de 100%).
  *Suggested tweak: the per-hunt % bar now respects the viability floor too, so an unviable hunt no longer shows an inflated green percentage.*
- **"Reciclar painéis" removido**: a ideia era recarregar os painéis pra liberar memória sem parar o farm, mas o jogo é um site de página única: ao recarregar, a conta volta pra tela da cidade e não retoma a hunt sozinha, então o farm parava. Como não dá pra re-entrar na hunt com segurança, tirei a opção. O cap de memória (que não recarrega nada) continua. Se você tinha ativado, atualize; enquanto isso, desligue a opção.
  *"Recycle panels" removed: reloading the SPA drops the account back to the city screen and does not resume the hunt, so farming stopped. Removed until it can re-enter the hunt safely; the memory cap stays.*

## 1.5.18

- **Botão Zerar (estatísticas) voltou a funcionar**: desde a 1.5.16 os números da sessão passaram a vir do servidor do jogo (o mesmo do Hunt Analyzer), e o Zerar não mexia neles, então parecia não fazer nada. Agora o Zerar marca o ponto de partida e o painel passa a mostrar tudo a partir dali (gold, kills, XP, capturas, drops). Trocar de hunt continua zerando sozinho.
  *The Reset button works again: since 1.5.16 the session numbers come from the game server (same as the Hunt Analyzer) and Reset was not affecting them; now Reset marks the starting point and the panel counts from there.*
- Robustez do Zerar: o ponto de partida marcado pelo Zerar agora sobrevive a um reload do painel (reciclagem/reconexão), então as estatísticas não voltam ao total antigo depois que o painel recarrega.
  *Reset robustness: the reset baseline now survives a panel reload, so stats do not revert after a recycle/reconnect.*
- **Reciclar painéis (opcional)**: pra quem deixa rodando por muitas horas, o app pode recarregar os painéis de tempos em tempos e liberar a memória que o jogo acumula. Recarrega **um de cada vez** (nunca os 4 juntos) e **o farm não para** (é do servidor, e a sessão volta sozinha no reload). Fica na configuração do Simples, com liga/desliga e intervalo em horas ajustável. **Desligado por padrão.**
  *Optional panel recycling: on long sessions the app can reload the panels every few hours to free the memory the game accumulates, one at a time, without stopping the farm. Configurable (on/off + interval in hours), off by default.*
- **Menos memória em sessão longa**: os registros internos de captura e de shiny do coletor não incham mais sem limite na página do jogo.
  *Lower memory on long sessions: the collector no longer lets its capture/shiny logs grow without bound on the game page.*

## 1.5.17

- **Polimento (caça de bugs da 1.5.17)**: as categorias novas da mochila (Cartas/TMs/Clã) agora dá pra esconder e reordenar na config; trocar o nível da tierlist rápido não trava mais (os cálculos se juntam num só); e limpezas internas sem efeito visível.
  *Polish from the 1.5.17 bug hunt: the new bag categories are now hideable/reorderable in settings, fast tierlist level changes no longer stutter, plus internal cleanups.*
- **Tierlist com seletor de nível**: escolha o seu nível no topo da tierlist e ela se adapta, avaliando cada pokémon nesse nível e mostrando só as hunts que você alcança, com o golpe e a região certos. Sem isso, o conteúdo novo de nível 600 (Megas) afogava o ranking de quem ainda não chegou lá. O padrão é o nível da conta em foco.
  *Tierlist level selector: pick your level and the tierlist adapts, rating each pokemon at that level and showing only reachable hunts with the right move and region.*
- **Mochila mostra os itens novos do update**: as categorias novas (Cartas shiny, TMs, itens de clã) apareciam todas como "Outros" e, pior, colidiam entre si, então parte delas sumia do painel. Agora cada uma tem seu grupo e cor, e nada é descartado.
  *Bag shows the new item categories (Shiny Cards, TMs, clan items) as their own groups instead of collapsing into a single Others that silently dropped items.*
- **Tierlist: a coluna Orre×Outland voltou a funcionar**: as hunts de Mega/endgame de nível 600 estavam sendo marcadas como "Outland" (poluindo todas as linhas e matando a comparação entre regiões). Agora Outland é identificada pela região real, não pelo nível.
  *Tierlist: the Orre-vs-Outland column works again; lv600 Mega/endgame hunts were being mislabeled Outland.*
- **Compatível com a grande atualização do jogo**: as novas criaturas (Mega Evoluções e as formas de Outland, tipo "Brave Blastoise") agora aparecem com a sprite certa na tierlist e no painel. Antes ficavam sem imagem porque o jogo passou a numerá-las numa faixa nova.
  *Compatible with the big game update: the new creatures (Mega Evolutions and the Outland forms) now show the correct sprite in the tierlist and panel.*
- **Versão do app de volta ao lado do logo**: tinha sumido na 1.5.16 (quando a identificação do app saiu do cabeçalho de rede por segurança). Agora ela é lida direto do app, pequena e discreta ao lado do nome.
  *App version back next to the logo: it disappeared in 1.5.16 and now reads straight from the app.*

## 1.5.16

- **O ouro da sessão agora bate com o Hunt Analyzer** (relato do FellipeLuis): o app refazia a conta por fora e errava nas parcelas que só o servidor conhece (qual pokébola foi jogada em cada arremesso, se o pokémon novo veio de captura ou do mercado, se a poção saiu por uso ou por venda, e a foto rara a preço de mercado), ainda por cima com um relógio próprio. Agora ele pede os números ao próprio jogo e mostra os mesmos do Hunt Analyzer; sem resposta do servidor, cai na conta antiga. Efeito colateral bom: trocar a pokébola do auto-catch não reescreve mais o gasto da sessão inteira.
  *Session gold now matches the games Hunt Analyzer: the app used to recompute it from raw events and got the server-only parts wrong (which ball each throw used, whether a new pokémon came from a catch or the market, whether a potion was used or sold). It now asks the game for the numbers and falls back to the old math if the server does not answer.*
- **O Painel agora se explica** (feedback do FellipeLuis, que perguntou pra que servia a opção "Alvo shiny" porque ela não mudava nada): as seções **Alvo shiny** e **Itens fixados** sumiam da tela quando ainda não estavam configuradas, então marcar a caixa parecia não fazer efeito. Agora elas aparecem dizendo pra que servem e onde escolher a espécie ou o item.
  *The Panel explains itself now: the Shiny target and Pinned items sections used to render nothing until configured, so ticking their checkbox looked broken. They now show what they do and where to set them up.*
- **📖 Manual novo**, em Opções e no GitHub: o que cada botão e cada seção faz, em linguagem simples. O README passou a linkar manual, FAQ, tutorial e changelog.
  *New Manual, in Options and on GitHub, explaining every button and section in plain language; the README now links manual, FAQ, tutorial and changelog.*
- **Caçada profunda de bugs e vulnerabilidades** (12 auditores em paralelo, cada achado verificado por execução). Corrigido:
  - **Falha de segurança séria**: um userscript rodando na página do jogo conseguia executar código na janela do PokeGrid (bastava um item com categoria maliciosa) e dali chegar nas senhas salvas das 4 contas. Agora o texto vindo do jogo é escapado e a categoria só aceita rótulo conhecido.
  - **A URL do seu webhook saía dentro do Exportar config** e do backup automático: era a credencial do seu canal viajando em texto puro. Saiu do backup.
  - **O botão 🧹 Limpar dados da conta não funcionava** (erro de programação) e, se funcionasse, apagaria a conta vizinha. Os dois consertados.
  - **A trava que impede o painel de sair do site do jogo** aceitava domínio que apenas começa igual (poke.idleworld.online.algumacoisa.com); agora compara a origem inteira.
  - **O app se identificava pro servidor do jogo** com nome e versão no cabeçalho de rede; agora a assinatura é a de um Chrome comum.
  - **A janela do app congelava na bandeja** depois de 5 minutos, junto com o vigia que recarrega painel travado.
  - Backup em .json era anexado e virava arquivo inválido; a poda por falta de espaço apagava todo o histórico medido de gold/h; um dado torto no disco travava o modo Simples para sempre; desmarcar Avisar shiny não parava os avisos; e o webhook podia disparar em rajada e levar bloqueio do Discord (agora sai enfileirado).
  *Deep bug and vulnerability hunt with 12 parallel auditors, each finding verified by execution: renderer XSS reachable from the game page (credential exposure), webhook URL leaking into config exports, dead and off-by-one account wipe, prefix-based navigation lock, app fingerprint in the User-Agent, main window freezing in the tray, invalid JSON backups, quota pruning wiping measured history, corrupted disk data freezing Simples, shiny alert toggle ignored, and webhook burst rate limiting.*
- **Contas travando com o PC sozinho, corrigido** (relatos do Moura, RMayrink e Abel): o Chromium congela páginas em segundo plano, e as janelas do jogo nasciam sem essa trava desligada. Com o app minimizado (ou no modo Simples, onde as janelas ficam de 4 pixels), o jogo parava no meio do combate e a conta ficava com o popup preso até alguém voltar ao PC. Agora as janelas do jogo nunca são congeladas por estar em segundo plano, e um toque leve a cada 30 segundos mantém os painéis vivos mesmo com a janela do app escondida.
  *Fixed accounts freezing while the PC is unattended: Chromium freezes background pages and the game views were created without disabling it, so with the app minimized (or in Simples, where the views are 4 pixels wide) the game stalled mid-combat. Background throttling is now disabled for the game views, plus a light 30s keepalive that runs even when the app window is hidden.*
- Bughunt: a menção do webhook (entregue na 1.5.13) aparecia como texto mas **nunca notificava de verdade**, porque o app mandava a mensagem proibindo toda e qualquer menção. Agora a menção funciona: o app libera só o ID que você configurou e que já está na mensagem, e @everyone, @here e cargos continuam barrados.
  *Bughunt: the webhook mention shipped in 1.5.13 never actually pinged, because every mention was disallowed. It works now, allowing only the user ID you configured while @everyone, @here and roles stay blocked.*
- **Aviso no Discord quando uma conta cai ou para de farmar** (sugestão do Arthur): os alertas que já existiam (queda, 10 minutos sem kills, sem pokébola) agora também vão pro webhook, com menção opcional, então a notificação chega no celular e dá pra voltar no PC e reconectar. Dá pra desligar na configuração do webhook.
  *Discord alerts when an account drops or stops farming (suggested by Arthur): the existing alerts now also go to the webhook with optional mention, so the notification reaches your phone.*

## 1.5.15

- O botão **Ajude o projeto** mudou do fim do Painel pro topo do app, ao lado do logo, bem visível (verde, sem emoji).
  *The support button moved from the end of the Panel to the top bar, next to the logo.*

## 1.5.14

- **💚 Ajude o projeto**: card discreto no fim do Painel com o link oficial de apoio (https://link.mercadopago.com.br/pokegrid, Pix e cartão). Opcional, não desbloqueia nada; o app segue gratuito. E a lista do time agora mostra a **EXP %** de cada pokémon junto do HP, como no card do jogo.
  *Support-the-project card at the end of the Panel with the official donation link (optional, unlocks nothing), and the team list now shows each pokémons EXP % next to HP.*
- **Atalhos de teclado** (PR do israeltduarte): H abre o Hunt Analyzer, L o Limpar jogo, C o Simples, E o Eco, A os Alertas, R atualiza tudo, T os Treinadores, M o menu do jogo, G a Tierlist e O as Opções. Só valem com o foco na interface: enquanto você digita em qualquer campo, ou com o jogo focado, as teclas não fazem nada.
  *Keyboard shortcuts (PR by israeltduarte), active only when the app interface has focus.*
- **Instalar userscript por link do GitHub ou arrastando o arquivo** (PR do JulianoCLI, adaptado): cole o link ou solte o .user.js na janela de Scripts; o app lê nome, autor e versão do cabeçalho e mostra na lista, com botão **Atualizar** por script. O link de página (/blob/) é convertido pro arquivo cru automaticamente, e o arrastar só responde com a janela de Scripts aberta. **Sem atualização automática, por decisão de projeto**: código de terceiro não troca sozinho dentro das suas contas logadas, só quando você clica em Atualizar.
  *Install userscripts from a GitHub link or by dropping the file (PR by JulianoCLI, adapted): metadata is read from the header and each script gets a manual Update button. GitHub /blob/ links are converted to raw automatically, dropping only responds with the Scripts window open, and there is no automatic updating by design.*
- **Filtro do log de capturas volta a funcionar com o formato novo do jogo** (obrigado FellipeLuis): o jogo mudou como o IV e a qualidade chegam (ex.: 104/192 e Épica ×1.76), e comparações numéricas quebravam. Um extrator robusto entrou em todas as camadas (registro das capturas, filtro, time e a proteção de venda, que era o risco silencioso: qualidade em texto deixava de bloquear a venda de pokémon valiosos). Os campos do filtro também aceitam vírgula decimal.
  *Capture-log filter works again with the games new IV/quality format (thanks FellipeLuis): a robust number extractor now guards every layer, including the sell protection, which could silently stop blocking valuable sales with text quality. Filter fields accept comma decimals too.*
- Retoques visuais na tierlist: sprites maiores (30px), os elementos do pokémon em destaque (12px), ORRE/OUT mais discretos (9px), e os símbolos de categoria do golpe viraram etiquetas FÍS/ESP com explicação no tooltip (a bola de cristal 🔮 significava golpe especial e ninguém adivinhava).
  *Tierlist visual touches: bigger sprites, pokémon elements emphasized, ORRE/OUT labels smaller, and the move-category icons became FIS/SPE labels with explanatory tooltips.*
- Bughunt de desempenho: a primeira abertura da tierlist travava a interface por ~0,7s num mapa cheio (111 mil projeções de stats, quase todas repetidas); um cache de projeções derrubou pra ~0,17s e 3,8 mil chamadas, acelerando também o Sugerido e o modo Ditto. O leitor do depósito da família parou de ler o texto de containers grandes a cada movimento do mouse.
  *Performance bughunt: first tierlist open froze the UI ~0.7s on a full map (111k stat projections, mostly repeated); a projection cache cut it to ~0.17s and 3.8k calls, also speeding the hunt suggester and Ditto mode. The family-depot reader no longer reads large containers text on every mouse move.*
- **Sprites dos pokémon de Orre corrigidas em todo o app**: o jogo desloca os ids de Orre em +13000 (Treecko = 13252) e o repositório de sprites só conhece a dex nacional, então tierlist, time do Painel, cards de shiny e a calculadora de IV mostravam essas linhas sem imagem. Um normalizador único converte o id em todos os pontos, no app e no JustPokédex.
  *Orre sprites fixed everywhere: the game offsets Orre ids by +13000 while the sprite repo uses the national dex, so those rows had no image. A single normalizer now converts the id at every sprite site, in the app and in JustPokédex.*
- **Aba Geral com comparação real** (feedback da comunidade): a nota da Geral agora é o rendimento somado em todas as hunts (cada uma no próprio nível), com o melhor do jogo na base 100 e os demais descendo conforme a inferioridade real. Antes, dezenas de espécies empatavam perto de 100 porque davam one-shot na mesma melhor hunt; render em todo lugar passou a valer mais do que uma única fraqueza ×4.
  *Overall tab now compares species by yield summed across every hunt, with the games best as the 100 base and real spread below it, instead of the wall of near-100 one-shot ties.*
- **Tierlist: regiões lado a lado e aba Geral** (feedback da comunidade): a linha agora mostra ORRE e OUT juntos, cada um com nome, nível e nota (ORRE Pelipper Lv580 · 100 | OUT Cloyster Lv150 · 33), em vez do Outland perdido no canto. E o chip **Geral** rankeia todos os elementos juntos: os melhores pokémons pra hunt como um todo.
  *Tierlist: ORRE and OUT now sit side by side on the row, each with its own score, and the new Overall tab ranks every element together.*
- **Melhor hunt de Outland na lateral da tierlist**: quando o pico de um pokémon é em Orre, a lateral direita mostra também a melhor hunt fora de Orre (Lv150+, a faixa da aba Outland) com a nota dela, pra quem ainda não alcança a região saber onde caçar.
  *Best Outland hunt on the tierlists right side: when a pokémons peak is in Orre, the side also shows its best non-Orre hunt (Lv150+) with its score, for players who cannot reach the region yet.*
- **A folga do dano desempata a tierlist** (feedback da comunidade: seis elétricos empatados em 100): quem mata de um golpe satura o ritmo, então ATK/SPA e o poder do golpe sumiam da nota no topo. Agora a nota composta soma até 10% pela folga (quanto dano além do necessário pro one-shot, capada em 4×), e a folga aparece na linha (folga ×2.3). Matar com sobra vale mais do que matar raspando, porque continua matando de um com qualidade e IV piores.
  *Overkill margin now breaks tierlist ties: one-shotters used to saturate the score, hiding ATK/SPA and move power. The composite score adds up to 10% for damage margin (capped at 4x), shown per row.*
- **Calculadora de IV funciona no Depósito da família**: essas janelas não abrem o tooltip do jogo (a fonte do leitor), então o card ficava mudo nelas. Agora passar o mouse numa linha do depósito (Nome · Nv · IV · Q) alimenta o card com nível, qualidade, IV total e poder estimado. Os stats por atributo não existem na linha, então essa parte fica pro tooltip normal.
  *IV calculator now works in the family depot: hovering a depot row feeds the card with level, quality, total IV and estimated power (per-stat values are not present in the row, so those remain tooltip-only).*
- **Tierlist com nota 0 a 100** no lugar das barras: o melhor de cada elemento é a base 100 e os demais mostram a nota relativa, na cor do tier. **Formas com prefixo contam uma vez só**: Mad Golem, Furious Scyther e afins entram como a espécie base (vale a melhor forma), com o nome e a sprite da base; Mr. Mime e Nidoran Female continuam inteiros porque não têm base. Sprite em todas as linhas.
  *Tierlist now shows a 0-100 score instead of bars (100 = the elements best), prefixed forms count once as their base species with the base name and sprite, and every row has a sprite.*
- **Tierlist geral, sem nível de referência** (feedback da comunidade): com nível 200 apareciam picos em hunts Lv580, porque a trava de nível estava desligada no cálculo. Agora cada espécie enfrenta cada hunt **no nível da própria hunt**, então a comparação é justa em qualquer faixa, nenhuma hunt inalcançável infla o ranking e o campo de nível sumiu do modal.
  *General tierlist with no reference level: each species now faces every hunt at that hunts own level, so no unreachable hunt inflates the ranking and the level field is gone.*

## 1.5.13

- Bughunt: a cor de tipo agora passa por um resolvedor com tipo garantido em todos os pontos (tierlist, ditto e calculadora de IV); um nome de tipo estranho vindo do jogo cai no cinza padrão em vez de vazar pro estilo.
  *Bughunt: type colors now go through a type-guarded resolver everywhere; a weird type name from the game falls back to gray instead of leaking into the style attribute.*
- **🏆 Tierlist por elemento** (botão novo em Opções): rankeia todas as espécies do jogo (Orre incluso) pela melhor hunt que cada uma alcança, usando o mesmo modelo do sugestor: golpe físico enfrenta a defesa física de cada hunt e especial enfrenta a especial, então dois pokémon de golpe igual rankeiam diferente conforme as hunts disponíveis favorecem um lado ou o outro. Nível de referência ajustável, qualidade 1 e IV 96 fixos (compara espécies, não exemplares), tiers S/A/B/C/D relativos ao topo do elemento, resumo com top 3 de cada elemento e lista completa por elemento com sprite, golpe, efetividade e a hunt onde o pico acontece.
  *New Tierlist button: ranks every species (Orre included) by its best achievable hunt using the suggesters model, so physical vs special attackers rank according to which defenses the available hunts actually expose. Adjustable reference level, S-D tiers relative to each elements top, summary plus full per-element lists.*
- **Time completo no Painel** (pedido do FellipeLuis): a seção Time agora mostra cada pokémon com sprite, barra de HP colorida, barra de EXP e a estrela do líder, no estilo do painel do próprio jogo. **Clicar num pokémon coloca ele na frente** (vira o líder que caça), então dá pra deixar o 🧼 Limpar jogo escondendo o HUD e gerenciar o time só pelo app. A troca aciona a linha correspondente do painel do próprio jogo, sem mexer na comunicação interna dele.
  *Full team in the Panel: each pokémon shows sprite, colored HP bar, EXP bar and the leader star; clicking one makes it the hunting leader, so you can keep Clean game hiding the games HUD and manage the team from the app.*
- Bughunt final: a confirmação da compra de bolas mostra o saldo da conta onde a compra vai rodar (o fallback podia exibir o de outra conta), e a coleta do depot tolera configuração corrompida no disco.
  *Final bughunt: the bulk-buy confirmation shows the balance of the account the purchase runs on, and depot collection tolerates corrupted on-disk config.*
- **Região Orre integrada**: as hunts novas entram na lista, no ranking Sugerido e no modo Ditto/Shiny Ditto, com selo ORRE e o detalhe que muda tudo: o XP mostrado e rankeado já aplica o **multiplicador de XP da região** (orreXpMul, que vai de 1.9× a 145×; um Treecko de 248 XP rende na verdade ~13.000). Lucro usa o valor de venda normal. Conta abaixo do nível da hunt (470 a 550) vê a trava de nível em vez de recomendação errada.
  *Orre region integrated: new hunts join the list, the Suggested ranking and the Ditto mode, with an ORRE badge; shown and ranked XP already applies the regions XP multiplier (1.9x to 145x). Accounts below the hunt level see the level lock.*
- **Inventário global agora soma o depot** (pergunta do Semai): a seção Inventário do Simples passa a incluir o depósito das 4 contas, com a origem separada no tooltip (conta e conta (depot)). A busca é leve: só com o painel aberto, no máximo a cada 2 minutos por conta.
  *Global inventory now includes the depot across the 4 accounts, with per-account origin in the tooltip.*
- **🧹 Limpar os dados do jogo de uma conta** (pedido do FellipeLuis): botão novo na linha de cada treinador limpa cookies e cache só daquela conta, pra resolver conta bugada (mapa sem pokémon, filtros sumidos) sem mexer nas outras. A senha salva fica; a conta recarrega e loga de novo.
  *Per-account game-data clear: a new button on each trainer row clears only that accounts cookies and cache to fix a glitched account without touching the others.*
- **Menção no alerta de shiny do webhook** (sugestão do LeMadness): campo opcional de ID do Discord na configuração do webhook; o alerta de shiny chega com o <@menção>. O resumo diário segue sem ping.
  *Optional Discord user ID in the webhook config; the shiny alert now pings that user. The daily summary stays ping-free.*
- **🧺 Comprar pokébolas em massa**: na engrenagem do painel, +1.000 ou +10.000 de uma vez, direto na loja do jogo, sempre com confirmação mostrando custo, saldo e conta. Formato da compra aprendido com o PIW-QOL do Desjunior.
  *Bulk Poké Ball buying from the panel gear, +1,000 or +10,000 at once, always confirming cost, balance and account.*
- **A pokébola voltou a ser fácil de trocar**: com o 🧼 Limpar jogo ligado, o Auto-Helper agora aparece ao passar o mouse (como a conta e o menu) em vez de sumir de vez. Era a dúvida mais comum do FAQ.
  *With Clean game on, the Auto-Helper now appears on hover instead of vanishing, so switching pokéballs is easy again.*
- **Aviso de versão nova**: o número da versão ao lado do logo checa o GitHub uma vez por dia e mostra "→ v1.5.14" clicável quando sai atualização. Nasceu do incidente 1.5.5, quando usuários da versão sem executável ficaram presos numa versão quebrada sem saber. A conexão de rede do app continua fechada pra todo o resto.
  *The version number next to the logo checks GitHub once a day and shows a clickable "new version" hint. The apps network stays closed to everything else.*
- **Backup automático**: uma vez por semana as configurações são salvas sozinhas em `%APPDATA%\pokegrid\backups` (12 cópias mais recentes), e as hunts que saem do limite de 150 são anexadas num CSV histórico em vez de descartadas.
  *Weekly automatic config backup and pruned hunts appended to a history CSV instead of discarded.*
- **Tendência de 30 dias**: a seção Tendência do Simples ganhou gráficos de gold/dia e XP/dia usando o histórico diário que o app já guardava.
  *30-day gold/day and XP/day charts in the Trend section.*
- **Previsão de meta**: com meta de gold definida e caça andando, o Hoje mostra a que horas a meta bate no ritmo atual.
  *With a gold goal set, Today shows the ETA at the current pace.*
- Número da versão aberta ao lado do logo, pequeno e discreto (lido da própria assinatura do app, sem canal novo de comunicação interna).
  *Running version number next to the logo, small and unobtrusive (read from the apps own user agent, no new internal channel).*

## 1.5.12

- Bughunt: o nome de item adicionado ao cadeado de venda agora respeita o teto de 60 caracteres também na hora de adicionar (antes só na carga), e o zoom lido do disco é validado (um valor corrompido mostrava NaN% no visor novo do cabeçalho).
  *Bughunt: sell-lock item names are now capped at 60 chars on add too, and zoom read from disk is validated (a corrupted value showed NaN% in the new header display).*

## 1.5.11

- **FAQ novo**: as perguntas mais comuns da comunidade estão em FAQ.md no GitHub e num botão **❓ FAQ** dentro de Opções, que abre direto no navegador. Inclui o clássico "não consigo mudar a pokébola" (é o 🧼 Limpar jogo escondendo o Auto-Helper).
  *New FAQ: the communitys most common questions live in FAQ.md on GitHub and behind a ❓ FAQ button in Options that opens it in your browser.*
- **Filtros e seletores do Simples aplicam na hora** (obrigado xllD3an pelo aviso): mudar o critério IV × Qualidade, a ordenação de hunts ou qualquer outro seletor segurava a atualização enquanto o foco ficasse no campo, e o painel parecia congelado. Agora a mudança redesenha imediatamente; a proteção de quem está digitando continua valendo pro tique automático.
  *Simples-mode filters and selectors now apply instantly (thanks xllD3an): changing IV × Quality or any selector used to hold the refresh while the field kept focus, freezing the panel. User changes now repaint immediately; the typing protection still applies to the automatic tick.*
- **Desmarcar um script agora para o script de verdade** (obrigado FellipeLuis): um script injetado só morre quando a página recarrega, então desmarcar (ou excluir) um script ativo recarrega as contas ligadas automaticamente.
  *Unchecking a script now actually stops it (thanks FellipeLuis): injected code only dies on reload, so unchecking or deleting an active script now reloads the powered-on accounts automatically.*
- **FAQ.md novo no repositório**, com as dúvidas mais comuns da comunidade: atualização sem perder configurações, onde ficam os dados, sugestão de hunts, scripts, planilhas, captcha e como contribuir.
  *New FAQ.md in the repo covering the communitys most common questions.*
- **Zoom com porcentagem no cabeçalho de cada conta**, no estilo da barra do próprio jogo: o valor aparece entre o − e o +, e clicar nele volta pra 100%. O botão de desligar a conta foi removido (ficava colado nos outros e causava cliques acidentais; o Logar equipe continua religando tudo sozinho).
  *Zoom percentage in each accounts header, styled after the games own bar: the value sits between − and +, click it to reset to 100%. The power-off button was removed (it sat next to the other buttons and caused accidental clicks; Team login still re-enables everything automatically).*
- **As planilhas agora abrem certo no Excel em português.** Antes tudo caía numa coluna só, porque o Excel em português usa ponto e vírgula como separador e não vírgula, e os números com ponto viravam texto. Agora o arquivo sai com ponto e vírgula, decimal com vírgula, data no formato dd/mm/aaaa, acentuação correta e cabeçalho em português com a unidade de cada coluna (Kills/h, Gold/h, Drop (%)). Vale para as três planilhas: hunts, drops e o histórico do dia.
  *Spreadsheets now open correctly in Portuguese Excel. Everything used to land in a single column because Portuguese Excel expects semicolons as the separator, and dot decimals were read as text. Files now use semicolons, comma decimals, dd/mm/yyyy dates, correct accents and Portuguese headers with each columns unit. Applies to all three exports.*
- **Cadeado de venda configurável** (ideia inspirada no PIW-QOL, do Desjunior): na engrenagem do painel dá pra escolher os itens que pedem confirmação antes de vender, buscando pelo nome no catálogo do próprio jogo. Shiny e qualidade alta continuam protegidos sem precisar configurar nada, e o feromônio e a foto rara seguem travados de fábrica.
  *Configurable sell lock: in the panel settings you can pick which items ask for confirmation before selling, searching by name in the games own catalog. Shiny and high quality remain protected with no setup, and the pheromone and rare picture stay locked by default.*

## 1.5.10

### A versão sem executável voltou a abrir

- **Causa raiz do app que não abria, encontrada com a ajuda do MKL no Discord**: na versão sem executável, o mesmo canal de comunicação interna (o do webhook do Discord) estava registrado duas vezes no arquivo principal. O Electron recusa registro repetido e interrompe o carregamento, então o programa subia como processo e a janela nunca era criada. O bloco duplicado foi removido. Existia desde a 1.5.5, que é exatamente quando os relatos começaram, e afetava só a versão sem executável, por isso não aparecia nos testes com o instalador.
  *Root cause of the app that would not open, found with MKL from Discord: in the no-executable version the same internal channel (the Discord webhook one) was registered twice in the main file. Electron refuses a repeated registration and aborts loading, so the program started as a process and the window was never created. The duplicated block was removed. It had been there since 1.5.5, exactly when the reports started, and affected only the no-executable version, which is why installer tests never caught it.*
- **Isso não volta a acontecer sem ser percebido**: os testes agora conferem que nenhum canal está repetido nas quatro cópias do projeto, e o simulador de inicialização passou a recusar registro duplicado igual ao Electron faz.
  *This cannot silently happen again: the tests now check that no channel is duplicated across the four copies of the project, and the startup simulator rejects duplicate registration just like Electron does.*

## 1.5.9

### O app que não abria

- **Causa encontrada: o app consultava o registro do Windows e a pasta Inicializar antes de mostrar a janela.** São chamadas que travam quando um antivírus as intercepta, e com elas travadas o programa ficava vivo sem nunca abrir a tela, exatamente o que foi relatado. Agora a janela aparece primeiro e essas consultas acontecem depois, sem poder segurar a abertura; a limpeza do atalho antigo passou a ser feita uma única vez em vez de a cada abertura.
  *Root cause found: the app queried the Windows registry and the Startup folder before showing the window. Those calls stall when an antivirus intercepts them, leaving the process alive with no window, exactly as reported. The window now appears first and those queries happen afterwards, unable to hold up startup; cleanup of the legacy shortcut now runs once instead of on every launch.*
- **O app agora anota o passo a passo da abertura no relatório de erros** (janela criada, conteúdo pronto, bandeja pronta). Se ainda falhar para alguém, o arquivo mostra exatamente onde parou.
  *The app now records startup milestones in the error report. If it still fails for someone, the file shows exactly where it stopped.*
- Inclui também as proteções da 1.5.8, que não chegou a ser publicada: nenhuma gravação ou leitura de dados salvos pode mais derrubar a abertura, e o log de hunts ficou bem menor.
  *Also includes the 1.5.8 protections, which were never published: no saved-data read or write can prevent startup anymore, and the hunt log is much smaller.*

## 1.5.8

### Correção do app que não abria

- **O app não abria mais em algumas máquinas** (processo vivo, nenhuma janela). Eram três falhas somadas, todas corrigidas: com o armazenamento local cheio, a primeira gravação da inicialização derrubava a interface inteira; um dado torto salvo em disco (por exemplo a configuração do painel) fazia o mesmo; e no processo principal, uma falha do sistema ao registrar o app ou ao abrir a sessão de uma conta matava a criação da janela. Agora nenhuma escrita, leitura ou peça do sistema pode impedir o app de abrir, e sobrou uma rede de segurança que mostra a janela mesmo diante de erro não previsto.
  *The app stopped opening on some machines (process alive, no window). Three separate faults, all fixed: with local storage full, the first write during startup took down the whole interface; a malformed value saved on disk did the same; and in the main process, a system failure while registering the app or opening an account session killed window creation. No write, read or system component can prevent the app from opening now, and a final safety net shows the window even on an unforeseen error.*
- **O log de hunts ocupa bem menos espaço** (150 hunts com 30 drops, era 400 com 60), e quando o armazenamento enche o app poda os registros antigos sozinho em vez de falhar.
  *The hunt log takes far less space (150 hunts with 30 drops, was 400 with 60), and when storage fills up the app prunes old records by itself instead of failing.*

## 1.5.7

- **Modelo do sugestor revisado com dados reais** (bug reportado: Golem sugerido pra Gyarados quando o Magneton rende muito mais). Os kills/h medidos provaram que o cooldown dos golpes não é o relógio da luta, então ele saiu da conta; ficou o dano por acerto contra a vida do defensor, com constante calibrada por observação real e efetividade desempatando. Agora o Magneton (elétrico ×4) lidera o quadro do Gyarados, como na prática.
  *Suggestion model revised with real data: measured kills/h proved move cooldowns are not the fight clock, so they left the formula; what remains is damage per hit against defender HP, with a constant calibrated by real observation and effectiveness as tiebreaker. Magneton (electric x4) now tops the Gyarados board, as in practice.*

## 1.5.6

- **Removido o custo em gold nos shinies tentados** (pedido de usuário): a linha de gold gasto em bolas saiu dos cards.
  *Removed the gold cost on attempted shinies: the gold-spent line left the cards.*

- **Ditto transformado agora é reconhecido no "caçar com"**: o jogo reporta o nome da forma (ex.: Gyarados) e a detecção por nome falhava; agora vale a flag oficial do jogo, e o seletor mostra "Shiny Ditto → Gyarados" pra ficar claro quem ele é.
  *Transformed Ditto is now recognized in "hunt with": the game reports the forms name and name-based detection failed; the games official flag now decides, and the picker shows "Shiny Ditto → form".*

## 1.5.5

### Leitor de IV

- **Poder do pokémon agora bate com o do jogo.** A estimativa antiga errava bastante: num Jolteon Nv 15 o card mostrava 342 onde o jogo mostra 412. A conta foi trocada pela fórmula que reproduz o valor do jogo, conferida contra quatro pokémon reais (412, 8.017, 8.032 e 2.880) com diferença de 0% a 0,3%. Como o campo de nível é editável, dá pra projetar o poder que o pokémon terá num nível futuro.
  *Pokémon power now matches the game. The old estimate was off by a lot: a level 15 Jolteon showed 342 where the game shows 412. The math was replaced with the formula that reproduces the games value, checked against four real Pokémon (412, 8,017, 8,032 and 2,880) within 0% to 0.3%. Since the level field is editable, you can project the power at a future level.*
- **Formas alternativas voltaram a funcionar** (Furious Scyther, Brave Venusaur, Ancient Meganium e outras 45). O card falhava inteiro nelas, porque a base de dados externa não conhece esses nomes. Agora o app usa os dados do próprio jogo, com os atributos da forma e a sprite da espécie original.
  *Alternate forms work again (Furious Scyther, Brave Venusaur, Ancient Meganium and 45 others). The card used to fail completely on them because the external database does not know those names. The app now uses the games own data, with the forms stats and the original species sprite.*

### Hunts

- **Log automático das hunts + exportação em planilha** (pedido do Thierrye). Toda hunt encerrada é gravada sozinha, com duração, kills, XP, capturas, gold e os drops item a item. O botão na seção Hoje gera dois CSVs: um por hunt e um por item, esse já com drop por kill e a porcentagem calculada, pra montar as contas de % de loot sem transcrever nada à mão.
  *Automatic hunt log plus spreadsheet export. Every finished hunt is recorded on its own with duration, kills, XP, catches, gold and per-item drops. The button in the Today section generates two CSVs: one per hunt and one per item, the latter already with drops per kill and the percentage, so you can work out loot rates without copying anything by hand.*

### Pokédex

- **Nível necessário de cada golpe**, e os golpes que o pokémon ainda não aprendeu ficam apagados, com o motivo no tooltip.
  *Required level for each move, with moves the Pokémon has not learned yet dimmed and the reason in the tooltip.*
- **Coluna Pokémon** na tabela por conta, com nome e nível de quem está em campo, ao lado da Hunt.
  *Pokémon column in the per-account table, with the name and level of whos on the field, next to Hunt.*
- **A lupa de IV também funciona no mercado e no histórico**, que antes não alimentavam o card.
  *The IV magnifier now also works in the market and history, which did not feed the card before.*

### Janelas

- **Imagem sem distorção** em qualquer arranjo, inclusive o vertical com 3 janelas. O jogo tem proporção fixa e era esticado nos dois eixos; agora o painel respeita a proporção, mesmo que sobre uma borda.
  *Undistorted image in any arrangement, including vertical with 3 windows. The game has a fixed aspect ratio and was being stretched on both axes; the panel now respects it, even if that leaves a border.*
- **Painel expandido corrigido**: ao maximizar uma tela, o jogo continuava no tamanho antigo em vez de ocupar o espaço.
  *Expanded panel fixed: maximizing a screen left the game at its old size instead of filling the space.*
- **Iniciar com o Windows**, opcional e desligada por padrão. Usa um atalho na pasta Inicializar, que fica visível pro usuário e não é tratado como comportamento suspeito por antivírus.
  *Start with Windows, optional and off by default. It uses a shortcut in the Startup folder, visible to the user and not treated as suspicious behavior by antivirus.*

### Painel

- **Suprimentos por conta no Resumo geral** (pedido do Flory): cada card de conta ganhou uma linha com as pokébolas, potions e revives daquela conta, nas mesmas cores da seção de totais.
  *Per-account supplies in the overall summary: each account card gained a line with that accounts pokeballs, potions and revives, in the same colors as the totals section.*

### Desempenho

- **Modo Simples ainda mais leve.** O jogo agora fica mudo sozinho (o botão de som continua mandando), o chat do jogo some junto com o resto, o painel só redesenha quando algum número mudou de verdade na tela, e o app parou de perguntar os dados pras 4 contas de 4 em 4 segundos: cada jogo publica a própria leitura a cada 10s e o app só escuta, com o método antigo de reserva. Nada disso toca no farm, que é do servidor.
  *Simple mode got even lighter. The game now mutes itself (the sound button still wins), the games chat hides along with the rest, the panel only redraws when a number actually changed on screen, and the app stopped asking all 4 accounts for data every 4 seconds: each game publishes its own reading every 10s and the app just listens, with the old method as backup. None of this touches farming, which is server-side.*

### Interface

- **Botão de desligar afastado** dos outros botões do cabeçalho do painel: usuários estavam clicando nele sem querer.
  *Power button moved away from the other panel-header buttons: users were clicking it by accident.*

### Central (paridade com a versão de teste)

- **Modo foco com o clique direito**: botão direito numa janela do jogo expande ela; de novo (ou Esc) volta pra grade. Clique em campo de texto fica de fora, pra não atrapalhar o colar.
  *Focus mode on right click: right-click a game window to expand it; again (or Esc) goes back to the grid. Text fields are excluded so pasting still works.*
- **Capturas com filtros** no modo Simples: conta, nome, período (1h/6h/24h), IV mínimo, qualidade mínima e só shiny, mostrando até 40 resultados.
  *Catch history filters in Simple mode: account, name, period (1h/6h/24h), minimum IV, minimum quality and shiny only, showing up to 40 results.*
- **Times & IV**: nova seção com os times das 4 contas lado a lado, cada pokémon com IV total, qualidade e o poder atual e projetado (nível alvo configurável, padrão 500), pela mesma fórmula fiel do card de IV.
  *Teams & IV: new section with all 4 teams side by side, each Pokémon with total IV, quality and current plus projected power (configurable target level, default 500), using the same game-accurate formula as the IV card.*
- **Inventário global**: nova seção somando os itens das 4 contas, com o ícone oficial de cada item, busca por nome e o detalhe por conta no tooltip.
  *Global inventory: new section adding up items across the 4 accounts, with each items official icon, name search and the per-account breakdown in the tooltip.*

### Onde caçar

- **Sugestão de hunt por pokémon** (pedido de usuário): o Ranking de hunts ganhou a ordenação "Sugerido" com um seletor de "caçar com" listando os pokémon dos 4 times. O score usa os golpes que o pokémon já aprendeu (poder e cooldown), a efetividade do tipo do golpe contra os tipos do defensor, e o confronto real de atributos: golpe físico bate na Defesa do defensor e especial na Defesa Especial, então bicho blindado de um lado rende menos daquele lado, e a vida do defensor segura o ritmo. Hunt acima do nível da conta aparece apagada com o nível que falta, e cada linha mostra o melhor golpe, a efetividade e a porcentagem relativa ao melhor lugar. O "Medido: gold/h" continua sendo a régua da verdade onde você já caçou.
  *Hunt suggestion per Pokémon: the hunt ranking gained a "Suggested" sort with a "hunt with" picker listing all Pokémon from the 4 teams. The score uses moves already learned (power and cooldown), the move types effectiveness against the defenders types, and the real stat matchup: physical moves hit the defenders Defense and special ones its Special Defense, so a wall on one side yields less on that side, and the defenders HP slows the pace. Hunts above the accounts level show dimmed with the missing level, and each row shows the best move, effectiveness and the percentage relative to the best spot. Measured gold/h remains the ground truth where you have already hunted.*

- **Estimativa de kills/h e XP/h nas sugestões**, calibrada pelas SUAS hunts: o app mede a razão entre o kills/h real das hunts que você já caçou e o ritmo calculado, e aplica essa constante (pela mediana) nas hunts que você nunca entrou, mostrando "≈ kills/h · ≈ xp/h" em cada linha. Sem nenhuma hunt medida ainda, a porcentagem relativa fica sozinha: melhor sem estimativa do que com chute. Gold/h segue aparecendo só onde foi medido de verdade, porque as chances de drop não existem nos dados do jogo.
  *Estimated kills/h and XP/h in suggestions, calibrated by YOUR hunts: the app takes the ratio between real kills/h in hunts you have farmed and the computed pace, and applies that constant (median) to hunts you have never entered, showing kills/h and xp/h estimates per row. With no measured hunt yet, only the relative percentage shows: better no estimate than a guess. Gold/h still only appears where actually measured, since drop chances are not in the game data.*

- **Modo Ditto** (pedido de usuário): escolhendo um Ditto no "caçar com", o ranking vira um quadro com a melhor transformação de cada tipo (fogo, água, lutador...) e o melhor lugar pra farmar com ela, calculado varrendo todas as espécies contra todas as hunts com a mesma conta de golpes, efetividade e defesas. Usa a mecânica oficial do jogo: stats fixos (Shiny: IV 119 e qualidade 2.0; comum: IV 89 e qualidade 1.4), o debuff de transformação (-20% de ataque no Shiny, -25% no comum) e só as transformações permitidas: lendários nunca, e o Shiny só vira espécie com forma shiny. O nível é o do seu Ditto, então o quadro muda sozinho conforme ele sobe.
  *Ditto mode: pick a Ditto in "hunt with" and the ranking becomes a board with the best transformation per type (fire, water, fighting...) and the best spot to farm with it, computed by sweeping every species against every hunt with the same move, effectiveness and defense math. Uses the games official mechanics: fixed stats (Shiny: IV 119 and quality 2.0; regular: IV 89 and quality 1.4), the transform debuff (-20% attack on Shiny, -25% on regular) and only the allowed transformations: never legendaries, and the Shiny only becomes species with a shiny form. The level is your Dittos, so the board adapts as it levels.*
- **Modelo do Sugerido mais honesto**: o ritmo agora respeita a cadência do golpe, no máximo 1 acerto por cooldown. Antes, hunts de nível 1 pareciam render infinito e venciam qualquer lugar de verdade.
  *More honest suggestion model: pace now respects move cadence, at most 1 hit per cooldown. Before, level 1 hunts looked infinitely fast and beat every real spot.*

### Experiência

- **Previsão de estoque na tabela por conta**: quando potions ou bolas vão acabar em menos de 12h no ritmo da sessão, o Status mostra "potions ~6h" (vermelho abaixo de 2h, laranja abaixo de 6h). Dá pra saber antes de dormir se o estoque atravessa a noite.
  *Supply forecast in the per-account table: when potions or balls will run out within 12h at the sessions pace, Status shows an ETA (red under 2h, orange under 6h). You know before bed whether stock lasts the night.*
- **Custo dos shinies tentados**: cada card mostra o gold já gasto em bolas naquela espécie (aproximado pelo preço da bola atual).
  *Cost of attempted shinies: each card shows the gold spent in balls on that species (approximated by the current ball price).*
- **Aviso de lugar melhor**: se outra hunt sua, medida com 2 ou mais amostras, rende 15% acima da atual, um ↗ discreto aparece ao lado da hunt com o número no tooltip. Se você já está na melhor, silêncio.
  *Better-spot hint: if another of your measured hunts (2+ samples) yields 15%+ above the current one, a subtle arrow appears next to the hunt with the number in the tooltip. Already at the best? Silence.*

- **Hunt específica no modo Ditto**: um seletor de alvo; escolhida a hunt, o quadro vira o ranking das melhores transformações para ELA, com golpe, efetividade e porcentagem. Alvo acima do nível da conta avisa quanto falta.
  *Specific hunt in Ditto mode: a target picker; pick a hunt and the board becomes the ranking of best transformations FOR it, with move, effectiveness and percentage. Targets above the accounts level show the missing level.*

### Atalhos

- **Esc sai do foco**: fecha o card de IV; se não tiver card aberto, tira o painel do modo expandido.
  *Esc leaves focus: closes the IV card; with no card open, it un-expands the panel.*

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

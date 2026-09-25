# PokeGrid: perguntas frequentes

## Instalação e atualização

### Atualizar apaga minhas configurações e scripts?
Não. Tudo fica em `%APPDATA%\pokegrid`, fora do programa. Atualizar, reinstalar ou trocar de versão não mexe nessa pasta.

### Existe um config.ini?
Não. Backup = copiar a pasta `%APPDATA%\pokegrid`. Só as senhas não migram pra outro PC (são criptografadas pelo Windows); o resto vai junto.

### O processo abre mas a janela não aparece
Bug das versões 1.5.5 a 1.5.9, corrigido na **1.5.10**. Baixe a mais recente: https://github.com/soufoka/PokeGrid-source

### O Windows ou o navegador dizem que o app é vírus
São dois avisos diferentes, e nenhum é vírus.

**"O Windows protegeu o PC" ou "não é baixado com frequência"**, no instalador: é o aviso padrão para programa **sem assinatura digital** (o certificado custa, e o projeto é gratuito). O código é aberto e cada versão sai de uma compilação pública no GitHub Actions, com o resultado do Windows Defender no log. Pra instalar: clique em **Mais informações** e depois em **Executar assim mesmo**; no navegador, **Manter**.

**"Ameaça bloqueada: Trojan:Script/Wacatac.H!ml"**, no zip do código-fonte, com o download que não termina: é um falso positivo do Windows Defender na hora do download, que começou em 22/09/2026. Os scripts do projeto e o instalador dão zero detecção no VirusTotal, inclusive no antivírus da Microsoft. O suspeito é o antigo lançador `Abrir PokeGrid.vbs`, um VBS que abria o terminal escondido: o mesmo padrão já fez o zip de outros projetos ser barrado. Ele foi trocado na 1.5.25 por um `.bat`. Enquanto a Microsoft não libera, dá pra baixar o **instalador** em https://github.com/soufoka/PokeGrid/releases/latest, ou abrir **Segurança do Windows → Proteção contra vírus e ameaças → Histórico de proteção**, clicar no aviso, escolher **Ações → Permitir no dispositivo** e baixar de novo. Faça isso só com o arquivo baixado de **github.com/soufoka**.

### No Linux o app só abre com --no-sandbox
Não é o PokeGrid: o Ubuntu 24.04 e outros Linux novos bloqueiam o sandbox do Chromium pra usuário comum, e aí o Electron precisa do `chrome-sandbox` como programa do root. Pelo código (`bash iniciar.sh`), quando o app não abre o próprio iniciar.sh oferece o conserto. À mão, na pasta do app: `sudo chown root:root node_modules/electron/dist/chrome-sandbox && sudo chmod 4755 node_modules/electron/dist/chrome-sandbox`. Cada pasta nova baixa o Electron de novo, então repita ao atualizar. Não abra com sudo e deixe a pasta na sua home: pendrive e HD externo ignoram essa permissão. No AppImage não dá pra dar essa permissão: abra com `--no-sandbox` ou rode pelo código. O `--no-sandbox` funciona, mas tira o isolamento entre as páginas do jogo e o resto do PC. No Windows, se a pasta estiver numa unidade de rede, passe ela pro C:.

### O Abrir PokeGrid abre e fecha e o app não aparece
Confira nesta ordem:

1. **Segurança do Windows → Controle de aplicativos e do navegador → Configurações do controle inteligente de aplicativos.** Se estiver **Ativado**, é o mais provável: essa proteção do Windows 11 barra programa sem assinatura digital, e o Electron (o motor do PokeGrid) não tem. Normalmente aparece um aviso do Windows dizendo que bloqueou. Não dá pra liberar só um app; pra usar o PokeGrid nesse PC é preciso marcar **Desativado**, o que é uma proteção a menos.
2. **Segurança do Windows → Proteção contra vírus e ameaças → Histórico de proteção**, e a quarentena do McAfee ou do Norton se tiver: procure `electron.exe` ou a pasta do PokeGrid. Só restaure se o zip veio de github.com/soufoka.
3. **Ctrl+Shift+Esc**: se tiver **Electron** na lista, **Finalizar tarefa** e abra de novo.
4. Na pasta do PokeGrid, clique na barra de endereço, digite `cmd` e dê Enter. Rode `node -v` (precisa ser 22.12 ou mais novo) e `node -p process.arch` (dá x64 na maioria dos PCs, ou arm64 em notebook com Snapdragon; os dois servem), e depois `npm install` e `npm start`. Essa janela não fecha sozinha: o `npm install` completa uma instalação que ficou pela metade, o `npm start` baixa o Electron se ele faltar, e se der erro ele aparece ali.

### A tierlist, o Sugerido e o painel do Ditto ficam vazios
Bug das versões 1.5.5 a 1.5.23 do instalador, da portátil e do zip: um arquivo do app ficava fora do pacote e essas telas não tinham como calcular. Corrigido na **1.5.24**. Quem roda pelo código-fonte nunca teve o problema.

### Qual navegador o app usa?
Electron (Chromium, o motor do Chrome). Cada conta roda numa sessão separada.

## Uso diário

### Onde vejo a sugestão de hunts?
**Simples → seção Hunts**: ordene por **Sugerido** e escolha o atacante no **"caçar com"**. Com Ditto no time, aparece a melhor transformação por elemento. Cada hunt mostra kills/h e XP/h estimados, que se ajustam sozinhos conforme o app mede as hunts que você farma.

### Tenho um Shiny Ditto: onde caço e em que viro?
**☰ Opções → ✨ Ditto** (logo abaixo da Tierlist). Escolha shiny ou comum, o nível do Ditto e o nível da conta (qualidade e IV são fixos no jogo, o app já usa os certos); **Meu Ditto…** preenche com o Ditto do seu time. **Por hunt** lista as hunts da melhor pra pior, cada uma com a forma certa pra ela; **Por tipo** mostra a melhor forma de cada elemento. Só entram formas que o jogo deixa o Ditto copiar (o shiny só vira espécie com forma shiny), sem TM, e com o debuff do jogo na conta.

### O app está pesado. Como deixo mais leve?
Quase todo o peso vem dos jogos desenhando o mapa, um por conta aberta; os números, alertas e estatísticas do app gastam pouco. Do que mais alivia pro que menos:

- 🍃 Simples (barra do topo, ou tecla C com o clique fora do jogo): esconde o jogo e mostra só os números. O jogo cai pra 1 quadro por segundo e o farm continua, porque roda no servidor. Ele começa desligado toda vez que o app abre (o login e o captcha precisam do jogo à vista), então ligue depois que as contas entrarem.
- Minimizar ou mandar pra bandeja: desde a 1.5.27 os jogos entram sozinhos no mesmo modo leve do Simples enquanto a janela está escondida, e voltam ao normal quando você abre.
- 🔢 Painéis (☰ Opções): cada painel é um jogo inteiro rodando. Clique no número de painéis que você quer, de 1 a 4. Pôr painéis só abre os novos, e tirar fecha os últimos da grade, então deixe as contas que você usa nos primeiros lugares do 👤 Treinadores. As contas que ficam na tela seguem farmando. O painel tirado fecha de verdade, e a senha dele continua salva.
- ⚡ Eco (☰ Opções): segura cada jogo em 15 quadros por segundo. Já vem ligado; se o botão estiver como ⚡ Eco off, clique pra religar.
- 📊 Painel: feche quando não estiver olhando, principalmente na aba Σ. Aberto, ele relê as contas a cada 2 segundos.

Mudo, grade e proporção não deixam o app mais leve.

### E nas configurações do próprio jogo?
Ajudam quando você deixa o jogo à vista (com o 🍃 Simples ligado quase não mudam nada, porque o jogo nem aparece). Em cada painel, no menu de ícones do jogo, clique no ícone **Configurações**, escolha **Configurações** de novo e fique na aba **Vídeo**:

- Modo Leve: ⚡ Ligado. Meia resolução e cenário parado (os pokémon continuam animados). Já coloca o FPS em 30 e a renderização em Default.
- Modo de batalha: 🃏 Cartas. Na hunt, troca o mapa com personagens andando por herói e inimigos sem animação; nas cidades o jogo continua em 3D.
- Limite de FPS: 30, se você desligou o ⚡ Eco. Com o Eco ligado o app já segura em 15.

Com o 🧼 Limpar jogo ligado, o menu de ícones só aparece quando o mouse passa por cima; se ele sumiu de vez, aperte F2 no painel. Cada painel guarda a própria configuração, então repita nas contas que você usa. O 🧹 do Treinadores apaga essa configuração junto com os outros dados do jogo.

### O chat do jogo some quando eu abro
O app esconde o chat do jogo por padrão, pra sobrar tela: o botão em **☰ Opções** aparece como **💬 Chat oculto**. Clique nele pra virar **💬 Chat visível** e o chat aparece em todos os painéis. Até a 1.5.26, abrir pelo botão 💬 Chat do próprio jogo não adiantava: o app fechava de novo na mesma hora. Desde a 1.5.27 esse botão abre o chat naquele painel, até você mexer no 💬 do app ou ligar o 🍃 Simples.

### Mudo um filtro e nada acontece / painel demora
Bug corrigido na **1.5.11**: o painel segurava a atualização enquanto o foco ficava no seletor. Até a 1.5.26 o mesmo acontecia ao marcar um alerta ou uma opção do webhook na engrenagem do Simples. Fora isso, o Simples atualiza a cada 10s de propósito, pra pesar menos.

### Não consigo mudar a pokébola!
É o "sabonete": o botão **🧼 Limpar jogo** esconde o Auto-Helper do jogo, que é onde fica o seletor de pokébola. Desde a 1.5.13 basta **passar o mouse** no canto onde ele fica que ele aparece; em versões antigas, desligue o 🧼 na barra do topo, troque a bola e ligue de novo.

### Como desabilito um script?
**Opções → Scripts**, desmarque a caixinha. Desde a 1.5.11 isso recarrega as contas e o script para na hora. Antes: desmarque e clique em **⟳ Atualizar tudo**.

### Como exporto os logs de hunt?
**Simples → Hoje → "⬇ Hunts (N)"**. Baixa duas planilhas (hunts e drops) que abrem direto no Excel. O app guarda as últimas 150 hunts; as mais antigas ficam em `%APPDATA%\pokegrid\backups\hunts-historico.csv` (e `hunts-historico-drops.csv` pros drops por item).

### O ouro da sessão não bate com o Hunt Analyzer do jogo
A partir da 1.5.16 bate: o app passou a usar os números do próprio servidor do jogo, os mesmos que o Hunt Analyzer mostra. Antes ele refazia a conta por fora e errava em coisas que só o servidor sabe (qual pokébola foi usada em cada arremesso, se o pokémon novo veio de captura ou do mercado, se a poção saiu por uso ou por venda). Se ainda houver diferença, lembre que o relógio do Hunt Analyzer zera ao trocar de hunt e no 🗑 dele, e nenhum dos dois mede o ouro real da carteira: os dois mostram o valor do que caiu, a preço de NPC. Desde a 1.5.27 o app também conta as Rare Pokemon Picture (profissão fotógrafo), que o Hunt Analyzer soma à parte. O Hunt Analyzer já vem com **Considerar preço dos itens no Mercado** marcado, e com ele marcado soma as Rare Pokemon Picture pela média do Mercado; o app usa sempre o preço de NPC. Pra bater, desmarque a caixa. O 🗑 zera a sessão, mas o gold de Hoje no histórico do app fica (até a 1.5.26 ele era apagado).

### O app recarregou um painel e a conta ficou parada na cidade
É o jogo: toda vez que a página recarrega, ele coloca a conta em Cerulean. O app recarrega sozinho quando um painel trava ou cai. Em **☰ Opções** existe o **↩ Voltar pra hunt** (experimental, desligado por padrão): ligado, o app manda a conta de volta pra mesma hunt 12 segundos depois do recarregamento (e repete a cada 12 s, até 3 vezes, enquanto não houver kill), desde que ela tenha matado algo nos últimos 10 minutos. A tela do jogo pode continuar mostrando a cidade enquanto a conta farma; os números do Painel e do Simples são os do servidor.

### O boost do Discord (na call) some dos painéis
O buff de EXP e drop da call do Discord é do servidor: o bot confere a call a cada 30 s e o buff vale enquanto alguém da família estiver nela, com o painel em foco ou não. O que sumia era só o aviso "na call" na barra de boosts, porque o jogo atualiza essa barra quando a janela ganha foco, e com 4 painéis só um tem foco. Desde a 1.5.27 o app pede a lista de boosts a cada 25 s e o aviso fica. Pra conferir que o buff está contando, olhe o card de abate: a EXP de treinador e a de Pokémon mostram a parcela **Discord**.

### E o captcha?
O app nunca resolve captcha. É sempre você, na janela da conta. Proposital, não vai mudar.

### Ativei o 2FA no jogo, o app funciona?
Funciona. O app preenche e-mail e senha e para ali. Depois da senha o jogo pede o código do autenticador na janela da conta: você digita, igual ao captcha. O app nunca toca no código.

### Minha conta do jogo entra pelo Google. Funciona no PokeGrid?
Funciona, entrando com e-mail e senha. O botão do Google não completa o login dentro dos painéis: o app não deixa o jogo abrir janelas novas e manda o link pro seu navegador, e o login feito lá não volta pro painel. O próprio Google também recusa login em navegador embutido em outro programa. A saída é criar uma senha na conta, uma vez só:

1. No Chrome ou no Edge, abra https://poke.idleworld.online e entre pelo botão do Google, como sempre.
2. No menu de ícones do jogo, clique no ícone **Configurações** (passe o mouse pra ver o nome; fica quase no fim da barra, e se não aparecer, role a barra com a roda do mouse) e escolha **Minha Conta**.
3. Abra a aba **Senha**, digite a senha nova em **Senha** e repita em **Confirmar nova senha** (pelo menos 6 caracteres).
4. Clique em **Criar senha**. Aparece "Senha criada com sucesso."
5. Na aba **Geral**, confira o **Endereço de email** da conta.
6. No PokeGrid, abra **👤 Treinadores**, coloque esse email em **E-mail ou usuário** e a senha nova em **Senha**, e clique em **Salvar**. Depois, **▶ Logar equipe**.

A janela **Configurações** do jogo também tem uma aba Senha, que sempre pede a senha atual: a certa é a da janela **Minha Conta**. Se a aba Senha da Minha Conta pedir **Senha atual**, a conta já tem senha; se você não lembra qual é, use **ESQUECI MINHA SENHA** na tela de entrada do jogo.

### Como funciona a proteção de venda?
Com o escudo ligado, o app pede confirmação antes de vender shiny, qualidade Lendária ou acima e itens raros. Desde a 1.5.11 dá pra travar seus próprios itens na engrenagem do painel (**🔒 Cadeado de venda**).

## Projeto

### Como apoio o projeto?
Pelo botão **Ajude o projeto** ao lado do logo, no topo do app, ou direto em https://link.mercadopago.com.br/pokegrid (Pix e cartão). Apoio é opcional e não desbloqueia nada; o app é e continua gratuito. **Esse é o único link oficial**: desconfie de qualquer outro.


### Como contribuo?
Fork de https://github.com/soufoka/PokeGrid-source, rode `npm test` e abra o PR. A `main` é protegida, tudo entra por PR.

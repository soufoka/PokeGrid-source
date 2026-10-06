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
Não é o PokeGrid: o Ubuntu 24.04 e outros Linux novos bloqueiam o sandbox do Chromium pra usuário comum, e aí o Electron precisa do `chrome-sandbox` como programa do root. Pelo código (`bash iniciar.sh`), quando o app não abre o próprio iniciar.sh oferece o conserto. À mão, na pasta do app: `sudo chown root:root node_modules/electron/dist/chrome-sandbox && sudo chmod 4755 node_modules/electron/dist/chrome-sandbox`. Cada pasta nova baixa o Electron de novo, então repita ao atualizar. Não abra com sudo e deixe a pasta na sua home: pendrive e HD externo ignoram essa permissão. No AppImage não dá pra dar essa permissão: abra com `--no-sandbox` ou rode pelo código. O `--no-sandbox` funciona, mas tira o isolamento entre as páginas do jogo e o resto do PC.

### No Windows o app fecha sozinho ao abrir ("GPU process isn't usable") ou só abre com --no-sandbox
Algo no PC impede o Electron de abrir os processos isolados (o sandbox). O `--no-sandbox` abre, mas desliga o isolamento de tudo, inclusive das páginas do jogo e dos scripts, e uma falha explorada numa página passa a enxergar os seus arquivos. Use o `--disable-gpu-sandbox` no lugar: ele tira do sandbox só a parte que desenha a tela (o processo da GPU), e as páginas do jogo continuam isoladas.

Desde a 1.5.28 o app faz isso sozinho quando a GPU cai antes da janela aparecer: reabre com `--disable-gpu-sandbox` e anota no 🐞 Erros. Às vezes essa primeira abertura só fecha; abra de novo e a segunda já vem com o conserto. Vale até a próxima versão do app ou do Electron. Pra voltar ao sandbox antes disso, depois de resolver a causa, apague o `gpu-sem-sandbox.txt` na pasta que o 🐞 Erros abre.

Pra testar à mão pelo código: na pasta do PokeGrid, clique na barra de endereço, digite `cmd`, dê Enter e rode `node_modules\electron\dist\electron.exe . --disable-gpu-sandbox`. No instalador e na portátil, crie um atalho do PokeGrid e acrescente ` --disable-gpu-sandbox` no fim do campo Destino. Se abrir e os 4 painéis carregarem, era só a GPU. Se a janela ficar em branco, os painéis caírem ou nem assim abrir, o bloqueio pega todos os processos isolados. As causas, da mais comum pra menos:

1. Permissão da pasta. Alguns programas com sandbox próprio (editores de código com agente de IA, instaladores e desinstaladores de apps da Microsoft Store) deixam uma permissão órfã nas pastas do seu usuário, e o que é criado depois herda. Aí o Windows barra os processos isolados de qualquer app Electron ali, e Chrome e Edge escapam porque ficam em Arquivos de Programas. Pra conferir, no `cmd` na pasta do PokeGrid: `icacls node_modules\electron\dist\icudtl.dat` (no instalador, `icacls icudtl.dat` na pasta onde ele foi instalado). Se aparecer uma linha começando com `S-1-15-2-` seguida de números longos e não aparecer `TODOS OS PACOTES DE APLICATIVOS` (ou `ALL APPLICATION PACKAGES`), é isso. O conserto só acrescenta leitura e não pede administrador: na pasta do PokeGrid, rode `icacls . /grant *S-1-15-2-2:(OI)(CI)(RX)` (no PowerShell, com aspas simples em volta de `*S-1-15-2-2:(OI)(CI)(RX)`) e abra sem nenhuma flag. Se voltar, o programa que criou a permissão rodou de novo, e o mesmo comando resolve. Passar o PokeGrid pra uma pasta nova, como `C:\PokeGrid`, também costuma resolver.
2. Aberto como administrador. Se o atalho ou o .bat está marcado pra "Executar como administrador" (Propriedades, aba Compatibilidade), desmarque e abra com dois cliques.
3. Pasta fora do disco local: unidade de rede, OneDrive com arquivos só online ou HD externo. Passe a pasta pro `C:`.
4. Antivírus além do Defender (Avast, AVG, Kaspersky, Bitdefender e parecidos): crie uma exceção só pra pasta do PokeGrid, em vez de desligar a proteção.
5. Programa que desenha por cima de jogos (MSI Afterburner, RivaTuner, gravação de tela, contador de FPS) ou driver de vídeo recém-atualizado. Aqui o `--disable-gpu-sandbox` resolve; pra ter o sandbox de volta, feche o programa ou volte o driver e apague o `gpu-sem-sandbox.txt`.

Se nada disso resolver, reinicie o PC e mande o `relatorio-de-erros.log` de `%APPDATA%\pokegrid`: as linhas `[processo-GPU]` e `[gpu]` mostram qual caso é.

### O Abrir PokeGrid diz "A instalação não terminou"
Na primeira vez, o `Abrir PokeGrid.bat` instala o que o app precisa e baixa o Electron, o motor do PokeGrid. Tudo o que passa na janela também fica no `instalacao.log`, na pasta do PokeGrid, e o arquivo é refeito a cada tentativa. A linha "A instalação não terminou" diz o motivo provável:

- "O Windows barrou o extrator do Electron": o Electron baixou, mas o módulo que abre o zip dele não carregou. O .bat já tenta extrair com o `tar` do próprio Windows e só para se isso também falhar. A linha `Motivo:` logo acima diz a causa. `An Application Control policy has blocked this file` é o Controle inteligente de aplicativos (veja o item 1 da pergunta abaixo). `The specified module could not be found` é o Microsoft Visual C++ 2015-2022 x64 que falta: instale o `vc_redist.x64.exe` da Microsoft (https://aka.ms/vs/17/release/vc_redist.x64.exe) e abra o .bat de novo. `Cannot find module` ou `is not a valid Win32 application` é o arquivo apagado ou estragado, quase sempre pelo antivírus: confira o **Histórico de proteção**, apague a pasta `node_modules` e abra o .bat de novo.
- "O download falhou": confira a internet, desligue VPN ou proxy e abra o .bat de novo. Ele baixa tudo outra vez.
- "O Electron chegou corrompido": abra o .bat de novo, que ele baixa outra vez. Se repetir, desligue VPN, proxy ou a verificação HTTPS do antivírus.
- "Um arquivo estava em uso ou sem permissão": feche o PokeGrid, inclusive pelo ícone da bandeja, e abra o .bat de novo. Se repetir, reinicie o PC. Deixe o PokeGrid numa pasta sua, como Downloads ou Documentos, fora de Arquivos de Programas e do OneDrive.
- "Faltou ou veio cortado um arquivo da instalação": apague a pasta `node_modules` e abra o .bat de novo, com internet.
- "O electron.exe sumiu depois de instalado": o antivírus levou o programa logo depois de extraído. Confira o **Histórico de proteção**, restaure o arquivo ou crie uma exceção só pra pasta do PokeGrid e abra o .bat de novo.

Se não resolver, mande o `instalacao.log` no Discord do PokeGrid.

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

### O que quer dizer o aviso no topo de cada painel?
Desde a 1.5.31 é o que a conta está fazendo, o mesmo status da coluna do 🍃 Simples. **Caçando** vem com a hunt e o tempo. **⚠ Parada há X min** aparece depois de 10 minutos sem kill numa conta que estava farmando: se o ↩ Voltar pra hunt estiver ligado, o app tenta destravar sozinho. **Na cidade** é a conta logada fora da hunt. **⚠ Potions p/ ~1h** (ou pokébolas) é a estimativa de quanto o suprimento dura no ritmo atual. **Time derrotado** quer dizer que a conta foi pro Centro Pokémon. **Erro ao carregar** e **Desconectada** trazem o botão **Recarregar**, que faz o mesmo que o ⟳ do painel. **Aguardando…** é o jogo ainda sem mandar os dados da conta. **⚠ Depósito cheio** quer dizer que o Depósito e a Bolsa encheram e o jogo pausou o Auto-Catch.

### As capturas pararam de aparecer
Se a conta segue caçando mas nenhuma captura nova entra no 🍃 Simples, olhe o topo do painel: **⚠ Depósito cheio** quer dizer que o Depósito e a Bolsa encheram e o próprio jogo pausou o Auto-Catch. Venda ou solte Pokémon que as capturas voltam. Desde a 1.5.33 o aviso do jogo no auto-helper também fica à vista com o 🧼 Limpar jogo ligado.

### O app está pesado. Como deixo mais leve?
Quase todo o peso vem dos jogos desenhando o mapa, um por conta aberta; os números, alertas e estatísticas do app gastam pouco. Do que mais alivia pro que menos:

- 🍃 Simples (barra do topo, ou tecla C com o clique fora do jogo): esconde o jogo e mostra só os números. O jogo cai pra 1 quadro por segundo e o farm continua, porque roda no servidor. Ele começa desligado toda vez que o app abre (o login e o captcha precisam do jogo à vista), então ligue depois que as contas entrarem.
- Minimizar ou mandar pra bandeja: desde a 1.5.27 os jogos entram sozinhos no mesmo modo leve do Simples enquanto a janela está escondida, e voltam ao normal quando você abre.
- 🔢 Painéis (☰ Opções, grupo Tela): cada painel é um jogo inteiro rodando. Clique no número de painéis que você quer, de 1 a 4. Pôr painéis só abre os novos, e tirar fecha os últimos da grade, então deixe as contas que você usa nos primeiros lugares do 👤 Treinadores. As contas que ficam na tela seguem farmando. O painel tirado fecha de verdade, e a senha dele continua salva.
- ⚡ Modo Eco (☰ Opções, grupo Sistema): segura cada jogo em 15 quadros por segundo. Já vem ligado; se a chave estiver desligada, clique pra religar.
- 📊 Painel: feche quando não estiver olhando, principalmente na aba Σ. Aberto, ele relê as contas a cada 2 segundos.

Silenciar jogos, grade e proporção não deixam o app mais leve.

### E nas configurações do próprio jogo?
Ajudam quando você deixa o jogo à vista (com o 🍃 Simples ligado quase não mudam nada, porque o jogo nem aparece). Em cada painel, no menu de ícones do jogo, clique no ícone **Configurações**, escolha **Configurações** de novo e fique na aba **Vídeo**:

- Modo Leve: ⚡ Ligado. Meia resolução e cenário parado (os pokémon continuam animados). Já coloca o FPS em 30 e a renderização em Default.
- Modo de batalha: 🃏 Cartas. Na hunt, troca o mapa com personagens andando por herói e inimigos sem animação; nas cidades o jogo continua em 3D.
- Limite de FPS: 30, se você desligou o ⚡ Modo Eco. Com ele ligado o app já segura em 15.

Com o 🧼 Limpar jogo ligado, o menu de ícones do jogo só aparece quando o mouse passa por cima. O F2 liga e desliga o Limpar jogo, até com o mouse dentro do jogo. Cada painel guarda a própria configuração, então repita nas contas que você usa. O **Limpar cache** do Treinadores apaga essa configuração junto com os outros dados do jogo.

### O chat do jogo some quando eu abro
O app esconde o chat do jogo por padrão, pra sobrar tela: a chave **💬 Esconder chat** (☰ Opções, grupo Tela) vem ligada. Desligue e o chat aparece em todos os painéis. Até a 1.5.26, abrir pelo botão 💬 Chat do próprio jogo não adiantava: o app fechava de novo na mesma hora. Desde a 1.5.27 esse botão abre o chat naquele painel, até você mexer na chave do app ou ligar o 🍃 Simples.

### Mudo um filtro e nada acontece / painel demora
Bug corrigido na **1.5.11**: o painel segurava a atualização enquanto o foco ficava no seletor. Até a 1.5.26 o mesmo acontecia ao marcar um alerta ou uma opção do webhook na engrenagem do Simples. Fora isso, o Simples atualiza a cada 10s de propósito, pra pesar menos.

### Não consigo mudar a pokébola!
É o "sabonete": o botão **🧼 Limpar jogo** esconde o Auto-Helper do jogo, que é onde fica o seletor de pokébola. Desde a 1.5.13 basta **passar o mouse** no canto onde ele fica que ele aparece; em versões antigas, desligue o 🧼 na barra do topo, troque a bola e ligue de novo.

### A calculadora de IV sumiu dos Scripts
Desde a 1.5.31 ela é do próprio app e não precisa ligar nada: clique em **IVs** na barra do topo e passe o mouse num pokémon em qualquer painel, ou clique num anúncio do Mercado. Quem tinha o script antigo ligado não precisa fazer nada. Se um IV aparece como faixa (12-13), é que no nível daquele pokémon mais de um IV dá o mesmo atributo.

### O card de IV troca de pokémon enquanto eu comparo
Clique no ⏸ no topo do card: ele trava no pokémon atual, e os próximos que você passar o mouse vão só pro **Histórico**. Pra ver vários lado a lado, fixe até 3 com o 📌 e abra a aba **Comparar**. A lista de golpes fica na aba **Golpes**.

### Como desabilito um script?
**Opções → Scripts**, desmarque a caixinha. Desde a 1.5.11 isso recarrega as contas e o script para na hora. Antes: desmarque e clique em **⟳ Atualizar tudo**.

### Como exporto os logs de hunt?
**Simples → Hoje → "⬇ Hunts (N)"**. Baixa duas planilhas (hunts e drops) que abrem direto no Excel. O app guarda as últimas 150 hunts; as mais antigas ficam em `%APPDATA%\pokegrid\backups\hunts-historico.csv` (e `hunts-historico-drops.csv` pros drops por item).

### O ouro da sessão não bate com o Hunt Analyzer do jogo
A partir da 1.5.16 bate: o app passou a usar os números do próprio servidor do jogo, os mesmos que o Hunt Analyzer mostra. Antes ele refazia a conta por fora e errava em coisas que só o servidor sabe (qual pokébola foi usada em cada arremesso, se o pokémon novo veio de captura ou do mercado, se a poção saiu por uso ou por venda). Se ainda houver diferença, lembre que o relógio do Hunt Analyzer zera ao trocar de hunt e no 🗑 dele, e nenhum dos dois mede o ouro real da carteira: os dois mostram o valor do que caiu, a preço de NPC. Desde a 1.5.27 o app também conta as Rare Pokemon Picture (profissão fotógrafo), que o Hunt Analyzer soma à parte. O Hunt Analyzer já vem com **Considerar preço dos itens no Mercado** marcado, e com ele marcado soma as Rare Pokemon Picture pela média do Mercado; o app usa sempre o preço de NPC. Pra bater, desmarque a caixa. O 🗑 zera a sessão, mas o gold de Hoje no histórico do app fica (até a 1.5.26 ele era apagado).

### O app recarregou um painel e a conta ficou parada na cidade
É o jogo: toda vez que a página recarrega, ele coloca a conta em Cerulean. O app recarrega sozinho quando um painel trava ou cai. Em **☰ Opções** existe o **↩ Voltar pra hunt** (experimental, desligado por padrão): ligado, o app manda a conta de volta pra mesma hunt 12 segundos depois do recarregamento (e repete a cada 12 s, até 3 vezes, enquanto não houver kill), desde que ela tenha matado algo nos últimos 10 minutos. Desde a 1.5.30 ele também age depois do relogin automático e não leva de volta a conta que saiu da hunt depois do último kill (você foi pra cidade, o time inteiro foi derrotado ou o servidor recusou a hunt). A tela do jogo pode continuar mostrando a cidade enquanto a conta farma; os números do Painel e do Simples são os do servidor.

### A conta fica parada na hunt e aparece "Sincronizando…"
O "Sincronizando…" é do jogo: aparece quando a janela volta a ficar à vista e some em até 4 segundos, assim que o servidor manda a hunt. Se o mapa continua parado e não há kill, a hunt parou no servidor. Isso pode acontecer quando o servidor reinicia (o jogo mostra "Servidor reiniciado" se você tinha boost e espera você clicar em Atualizar) ou quando a hunt para de chegar com a conexão aberta. Com o **↩ Voltar pra hunt** ligado em **☰ Opções**, desde a 1.5.28 o app resolve sozinho: clica em Atualizar por você e, depois de 10 minutos sem kill e sem atualização da hunt, pede a hunt de novo e, se não adiantar, recarrega o painel e volta pra hunt. São até 3 tentativas a cada 6 horas por conta, todas anotadas no 🐞 Erros.

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

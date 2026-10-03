@echo off
rem Abre o PokeGrid. Na primeira vez instala o necessario nesta janela; depois ela so pisca e fecha.
rem Dica: botao direito neste arquivo > Enviar para > Area de trabalho (criar atalho).
rem Nada de parenteses dentro dos textos de echo abaixo: dentro de um bloco if ( ) eles quebram o .bat.
cd /d "%~dp0"
rem Aberto de dentro do zip ou copiado sozinho pra outra pasta, ele nao acha o resto do app e o npm install falhava com
rem um motivo que nao ajudava. Explica e para antes de instalar qualquer coisa.
if not exist "package.json" (
  echo.
  echo O Abrir PokeGrid.bat precisa ficar dentro da pasta do PokeGrid, junto com os outros arquivos.
  echo Se voce abriu de dentro do zip: clique com o botao direito no zip, Extrair tudo, e abra o Abrir PokeGrid.bat da pasta extraida.
  echo Se copiou so ele pra Area de Trabalho: abra o original, de dentro da pasta. Pra ter atalho: botao direito no original, Enviar para, Area de trabalho.
  echo.
  pause
  exit /b
)
rem path.txt e o ultimo arquivo que o Electron grava ao extrair. Sem ele a extracao ficou pela metade (janela fechada,
rem antivirus) e o electron.exe sozinho abre e fecha sem aviso. Sem o electron.exe o antivirus levou o programa depois
rem de instalado. Nos dois casos o bloco abaixo refaz o que faltou. O .bat nao tem OU: vai numa variavel.
set "PG_FALTA="
if not exist "node_modules\electron\path.txt" set "PG_FALTA=1"
if not exist "node_modules\electron\dist\electron.exe" set "PG_FALTA=1"
rem O cmd nao tem tee: este node copia a saida da instalacao pra tela e pro instalacao.log, porque o motivo real de uma
rem falha rolava pra fora da janela. Sem terminal a barra de download some, entao um ponto a cada 5 s mostra que nao travou.
set PG_TEE=node -e "const w=require('fs').createWriteStream('instalacao.log',{flags:'a'}).on('error',()=>{});let p=0;process.stdin.on('data',d=>{if(p)process.stdout.write('\n');p=0;process.stdout.write(d);w.write(d)}).on('end',()=>{if(p)process.stdout.write('\n')});setInterval(()=>{p=1;process.stdout.write('.')},5000).unref()"
if defined PG_FALTA (
  where npm >nul 2>nul || (
    echo.
    echo O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org
    echo Depois de instalar, feche e abra este arquivo de novo.
    echo.
    pause
    exit /b
  )
  rem O Electron 43 pede Node 22.12 ou mais novo. Com Node velho o download falha e o aviso de internet la embaixo enganava.
  node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||a===22&&b>=12?0:1)" || (
    echo.
    echo O Node.js deste PC e antigo: o PokeGrid precisa da versao 22.12 ou mais nova. Instale a LTS em https://nodejs.org
    echo Depois de instalar, feche e abra este arquivo de novo.
    echo.
    pause
    exit /b
  )
  rem Sempre, nao so sem node_modules: com tudo instalado leva segundos, e repoe dependencia que faltou numa instalacao
  rem interrompida. Antes o require abaixo falhava com Cannot find module em toda abertura.
  echo Instalando o necessario. Na primeira vez isso pode levar alguns minutos...
  node -p "'PokeGrid '+require('./package.json').version+', Node '+process.version+' '+process.arch+', Windows '+require('os').release()" > instalacao.log
  call npm install --no-audit --no-fund 2>&1 | %PG_TEE%
  rem O Electron 43 so baixa o programa dele na primeira vez que alguem pede o caminho: e isto que pede.
  rem Se a internet cair no meio, abrir de novo baixa tudo outra vez.
  echo Baixando o Electron, uns 100 MB, so desta vez. Nao feche esta janela...
  node -e "require('electron')" 2>&1 | %PG_TEE%
  rem O extrator do zip do Electron tem um modulo nativo sem assinatura, que o Controle inteligente de aplicativos, o
  rem antivirus ou a falta do Visual C++ barram com um erro que nao diz o motivo. Nesse ponto o zip ja baixou e passou
  rem no checksum: mostra o motivo real e extrai com o tar do proprio Windows. path.txt sem quebra de linha, como o Electron grava.
  findstr /c:"native binding" instalacao.log >nul 2>&1 && (
    node -e "import('@electron-internal/extract-zip').catch(e=>{while(e.cause)e=e.cause;console.log('Motivo: '+e.message)})" 2>&1 | %PG_TEE%
    for /f %%v in ('node -p "require('electron/package.json').version+'-win32-'+process.arch"') do for /d %%d in ("%LOCALAPPDATA%\electron\Cache\*") do if exist "%%d\electron-v%%v.zip" (
      echo Extraindo o Electron com o tar do Windows...
      mkdir "node_modules\electron\dist" 2>nul
      "%SystemRoot%\System32\tar.exe" -xf "%%d\electron-v%%v.zip" -C "node_modules\electron\dist" && <nul set /p "=electron.exe" > "node_modules\electron\path.txt"
    )
  )
)
if exist "node_modules\electron\path.txt" if exist "node_modules\electron\dist\electron.exe" goto abre
rem Motivo provavel lido do instalacao.log. Cada findstr que acha o seu erro troca o motivo e o ultimo que achar vence,
rem entao a ordem vai do mais generico ao mais especifico. /i sempre: sem ele o findstr erra com varios /c: de tamanhos diferentes.
set "PG_MOTIVO=Confira a internet e abra este arquivo de novo."
if exist "node_modules\electron\path.txt" set "PG_MOTIVO=O electron.exe sumiu depois de instalado, quase sempre levado pelo antivirus: confira o Historico de protecao, libere a pasta do PokeGrid e abra este arquivo de novo."
findstr /i /c:"Cannot find module" /c:"Cannot find package" /c:"SyntaxError" instalacao.log >nul 2>&1 && set "PG_MOTIVO=Faltou ou veio cortado um arquivo da instalacao: apague a pasta node_modules e abra este arquivo de novo."
findstr /i /c:"fetch failed" /c:"HTTPError" /c:"terminated" /c:"ECONN" /c:"ENOTFOUND" /c:"ETIMEDOUT" /c:"EAI_AGAIN" /c:"CERT" instalacao.log >nul 2>&1 && set "PG_MOTIVO=O download falhou: confira a internet, desligue VPN ou proxy e abra este arquivo de novo."
findstr /i /c:"expected checksum" instalacao.log >nul 2>&1 && set "PG_MOTIVO=O Electron chegou corrompido: abra este arquivo de novo. Se repetir, desligue VPN, proxy ou a verificacao HTTPS do antivirus."
findstr /i /c:"os error 32" /c:"(os error 5)" /c:"EBUSY" /c:"EPERM" /c:"EACCES" instalacao.log >nul 2>&1 && set "PG_MOTIVO=Um arquivo estava em uso ou sem permissao: feche o PokeGrid, inclusive na bandeja, e abra este arquivo de novo. Se repetir, reinicie o PC ou mova a pasta do PokeGrid pra Documentos."
findstr /i /c:"native binding" instalacao.log >nul 2>&1 && set "PG_MOTIVO=O Windows barrou o extrator do Electron. A linha Motivo acima diz por que, e o FAQ.md desta pasta diz o que fazer."
echo.
echo A instalacao nao terminou. %PG_MOTIVO%
echo Se nao resolver, veja o FAQ.md desta pasta ou mande o arquivo instalacao.log no Discord do PokeGrid.
pause
exit /b
:abre
rem o electron.exe e um app de janela: abre sem terminal nenhum, e esta janela fecha em seguida
start "" "node_modules\electron\dist\electron.exe" .

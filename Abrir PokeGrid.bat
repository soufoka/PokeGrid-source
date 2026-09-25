@echo off
rem Abre o PokeGrid. Na primeira vez instala o necessario nesta janela; depois ela so pisca e fecha.
rem Dica: botao direito neste arquivo > Enviar para > Area de trabalho (criar atalho).
rem Nada de parenteses dentro dos textos de echo abaixo: dentro de um bloco if ( ) eles quebram o .bat.
cd /d "%~dp0"
rem path.txt e o ultimo arquivo que o Electron grava ao extrair. Sem ele a extracao ficou pela metade (janela fechada,
rem antivirus) e o electron.exe sozinho abre e fecha sem aviso. Sem o electron.exe o antivirus levou o programa depois
rem de instalado. Nos dois casos o bloco abaixo refaz o que faltou. O .bat nao tem OU: vai numa variavel.
set "PG_FALTA="
if not exist "node_modules\electron\path.txt" set "PG_FALTA=1"
if not exist "node_modules\electron\dist\electron.exe" set "PG_FALTA=1"
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
  call npm install --no-audit --no-fund
  rem O Electron 43 so baixa o programa dele na primeira vez que alguem pede o caminho: e isto que pede.
  rem Se a internet cair no meio, abrir de novo continua de onde parou.
  echo Baixando o Electron, uns 100 MB, so desta vez. Nao feche esta janela...
  node -e "require('electron')"
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo.
  echo A instalacao nao terminou. Confira a internet e abra este arquivo de novo.
  echo Se apareceu aviso do Controle inteligente de aplicativos ou do antivirus, veja o FAQ do PokeGrid.
  pause
  exit /b
)
rem o electron.exe e um app de janela: abre sem terminal nenhum, e esta janela fecha em seguida
start "" "node_modules\electron\dist\electron.exe" .

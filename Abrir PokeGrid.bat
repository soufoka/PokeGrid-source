@echo off
rem Abre o PokeGrid. Na primeira vez instala o necessario nesta janela; depois ela so pisca e fecha.
rem Dica: botao direito neste arquivo > Enviar para > Area de trabalho (criar atalho).
rem Nada de parenteses dentro dos textos de echo abaixo: dentro de um bloco if ( ) eles quebram o .bat.
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  where npm >nul 2>nul || (
    echo.
    echo O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org
    echo Depois de instalar, feche e abra este arquivo de novo.
    echo.
    pause
    exit /b
  )
  if not exist "node_modules\electron\package.json" (
    echo Primeira vez: instalando o necessario. Isso pode levar alguns minutos...
    call npm install --no-audit --no-fund
  )
  rem O Electron 43 so baixa o programa dele na primeira vez que alguem pede o caminho: e isto que pede.
  rem Se a internet cair no meio, abrir de novo continua de onde parou.
  echo Baixando o Electron, uns 100 MB, so desta vez. Nao feche esta janela...
  node -e "require('electron')"
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo.
  echo A instalacao nao terminou. Confira a internet e abra este arquivo de novo.
  pause
  exit /b
)
rem o electron.exe e um app de janela: abre sem terminal nenhum, e esta janela fecha em seguida
start "" "node_modules\electron\dist\electron.exe" .

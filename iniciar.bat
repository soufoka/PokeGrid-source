@echo off
cd /d "%~dp0"
where npm >nul 2>nul || (
  echo.
  echo O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org
  echo Depois de instalar, feche e abra este arquivo de novo.
  echo.
  pause
  exit /b
)
rem Instala quando falta o Electron, nao so sem node_modules: uma instalacao interrompida deixava dependencia faltando
rem e o npm start falhava sempre. Com tudo no lugar o npm install leva segundos; o npm start baixa o Electron se faltar.
set "PG_FALTA="
if not exist "node_modules\electron\path.txt" set "PG_FALTA=1"
if not exist "node_modules\electron\dist\electron.exe" set "PG_FALTA=1"
if defined PG_FALTA (
  echo Instalando o necessario. Na primeira vez isso pode levar alguns minutos...
  call npm install
)
echo Abrindo o PokeGrid...
rem O erro precisa aparecer: descartar o stderr escondia a causa quando o app nao abria. O proprio app ja
rem silencia o spam do Chromium pelo log-level. Se fechar com erro, a janela fica aberta pra dar pra ler.
call npm start
if errorlevel 1 (
  echo.
  echo O PokeGrid fechou com erro. Tire um print desta janela pra pedir ajuda.
  pause
)

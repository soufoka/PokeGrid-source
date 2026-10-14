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
rem e o app nao abria nunca. Com tudo no lugar o npm install leva segundos; abrir baixa o Electron se faltar.
set "PG_FALTA="
if not exist "node_modules\electron\path.txt" set "PG_FALTA=1"
if not exist "node_modules\electron\dist\electron.exe" set "PG_FALTA=1"
rem Electron diferente do que o package.json pede (zip novo extraido por cima da pasta antiga): reinstala, senao o
rem Electron velho, sem os consertos de seguranca da versao nova, ficava pra sempre. So com o Node instalado.
where node >nul 2>nul && (node -e "process.exit(require('./node_modules/electron/package.json').version===require('./package.json').devDependencies.electron?0:1)" 2>nul || set "PG_FALTA=1")
if defined PG_FALTA (
  rem O Electron 43 pede Node 22.12 ou mais novo: com Node velho o download falhava com um erro que nao dizia o motivo.
  node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||a===22&&b>=12?0:1)" || (
    echo.
    echo O Node.js deste PC e antigo: o PokeGrid precisa da versao 22.12 ou mais nova. Instale a LTS em https://nodejs.org
    echo Depois de instalar, feche e abra este arquivo de novo.
    echo.
    pause
    exit /b
  )
  echo Instalando o necessario. Na primeira vez isso pode levar alguns minutos...
  call npm ci --ignore-scripts --no-audit --no-fund
)
echo Abrindo o PokeGrid...
rem O erro precisa aparecer: descartar o stderr escondia a causa quando o app nao abria. O proprio app ja
rem silencia o spam do Chromium pelo log-level. Se fechar com erro, a janela fica aberta pra dar pra ler.
rem Direto no cli.js do Electron, sem npm start: o electron.cmd que o npm cria em node_modules\.bin quebra com & no caminho da pasta.
node "node_modules\electron\cli.js" .
rem queda do Electron sai com codigo negativo: 0xC0000005 vira -1073741819, e o "if errorlevel 1" so pegava 1 ou mais
if %errorlevel% neq 0 (
  echo.
  echo O PokeGrid fechou com erro. Tire um print desta janela pra pedir ajuda.
  pause
)

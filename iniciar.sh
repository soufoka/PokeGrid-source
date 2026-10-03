#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org"
  exit 1
fi
# path.txt e o ultimo arquivo que o Electron grava. Sem ele a instalacao nem comecou ou ficou pela metade (so olhar a
# pasta node_modules nao bastava: interrompida, ela existia sem o Electron), e o npm install refaz o que faltou.
if [ ! -f node_modules/electron/path.txt ]; then
  # O Electron 43 pede Node 22.12 ou mais novo: com Node velho o download falhava e o aviso la embaixo falava de sandbox
  if ! node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||a===22&&b>=12?0:1)"; then
    echo "O Node.js deste PC e antigo: o PokeGrid precisa da versao 22.12 ou mais nova. Instale a LTS em https://nodejs.org"
    exit 1
  fi
  echo "Instalando o necessario. Na primeira vez isso pode levar alguns minutos..."
  npm install
fi
echo "Abrindo o PokeGrid..."
# O erro do Electron precisa aparecer: descartar o stderr escondia a causa quando o app
# nao abria (o proprio app ja silencia o spam do Chromium via log-level).
npm start
code=$?
if [ $code -ne 0 ]; then
  echo
  echo "O PokeGrid fechou com erro (codigo $code)."
  # Ubuntu 24.04+ (AppArmor) e outros Linux bloqueiam o sandbox do Chromium pra usuario comum, e ai o Electron
  # exige o chrome-sandbox do root com permissao 4755. O download do Electron nunca vem assim, entao cada pasta
  # nova do PokeGrid precisa disso uma vez. So oferece quando o sistema de fato bloqueia (senao a causa e outra).
  sb=node_modules/electron/dist/chrome-sandbox
  if [ "$(uname -s)" = Linux ] && [ "$(id -u)" != 0 ] && [ -f "$sb" ] && [ "$(stat -c %u:%a "$sb" 2>/dev/null)" != 0:4755 ] \
    && { [ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null)" = 1 ] || [ "$(cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null)" = 0 ]; }; then
    echo
    echo "Este Linux bloqueia o sandbox do Chromium. Conserto, uma vez por pasta nova do PokeGrid:"
    echo "  sudo chown root:root $sb && sudo chmod 4755 $sb"
    echo "(com a pasta na sua home: pendrive e HD externo ignoram essa permissao)"
    read -r -p "Rodar agora? Pede a sua senha. [s/N] " r
    case "$r" in [sS]*) sudo chown root:root "$sb" && sudo chmod 4755 "$sb" && npm start && exit 0 ;; esac
    echo
  fi
  echo "Se falar de sandbox e voce abriu com sudo: abra sem sudo."
  echo "Ultimo recurso pra sandbox:  npm start -- --no-sandbox  (abre, mas sem a protecao do Chromium)"
  echo "Se falar de biblioteca faltando (libgbm, libnss3, libatk...), instale os pacotes que o seu sistema pedir."
  read -r -p "Enter para fechar..." _
fi

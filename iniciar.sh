#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Primeira vez: instalando o necessario. Isso pode levar alguns minutos..."
  npm install
fi
npm start

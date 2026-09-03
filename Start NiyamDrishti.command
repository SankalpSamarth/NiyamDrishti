#!/bin/zsh
set -e

cd -- "${0:A:h}"

if [[ ! -d node_modules ]]; then
  echo "Installing NiyamDrishti dependencies…"
  npm install
fi

echo "Starting NiyamDrishti at http://localhost:4173/"
(sleep 1; open http://localhost:4173/) &
npm run dev

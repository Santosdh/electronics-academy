#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then double-click this file again."
  read -p "Press Enter to close..."; exit 1
fi
[ -d node_modules ] || npm install --omit=dev
( sleep 3; open http://localhost:4321 ) &
npm start

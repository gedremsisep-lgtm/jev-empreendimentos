#!/bin/bash
# Troca o número da versão nos dois aplicativos de uma vez só.
#   ./versao.sh 1.0.1
set -e
cd "$(dirname "$0")"
NOVA="$1"
if [ -z "$NOVA" ]; then
  echo "Uso: ./versao.sh 1.0.1"
  echo "Versão atual: $(node -p "require('./desktop/package.json').version")"
  exit 1
fi
if ! echo "$NOVA" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "A versão precisa ter o formato 1.0.1"; exit 1
fi

# aplicativo de janela (Windows)
node -e "
  const fs=require('fs'), p='desktop/package.json';
  const j=JSON.parse(fs.readFileSync(p,'utf8')); j.version='$NOVA';
  fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
"
# aplicativo do celular (PWA)
sed -i "s/const APP_VER = '[^']*'/const APP_VER = '$NOVA'/" mobile/src/03_core.js

echo "Versão trocada para $NOVA."
echo
echo "Agora:"
echo "  1) bash mobile/build.sh          # remonta o aplicativo do celular"
echo "  2) git add -A && git commit -m \"versão $NOVA\" && git push"
echo "  3) git tag v$NOVA && git push origin v$NOVA   # dispara o instalador do Windows"

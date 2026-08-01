#!/bin/bash
# Monta o JeV Mobile (PWA) a partir dos arquivos de src/
set -e
cd "$(dirname "$0")"

VER=$(grep -oP "APP_VER\s*=\s*'\K[^']+" src/03_core.js)
echo "JeV Mobile ${VER}"

{
  cat src/01_head.html
  cat src/02_body.html
  echo "/* ===== QR Code Generator — Kazuhiko Arase (MIT) ===== */"
  cat vendor/qrcode.js
  cat src/03_core.js src/04_tipos.js src/05_form.js src/06_views.js src/07_nuvem.js src/08_boot.js
  cat src/09_foot.html
} > index.html

python3 embed.py

# a versão entra no service worker e no arquivo que o app consulta
sed "s/__VER__/${VER}/" sw.js > sw.build.js && mv sw.build.js sw.dist.js
printf '{"versao":"%s","em":"%s"}\n' "$VER" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > versao.json

mkdir -p dist
cp index.html manifest.webmanifest versao.json dist/
cp sw.dist.js dist/sw.js && rm -f sw.dist.js
mkdir -p dist/icons && cp icons/*.png dist/icons/

echo "dist/ pronto — $(du -sh dist | cut -f1)"
ls -la dist

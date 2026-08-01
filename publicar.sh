#!/bin/bash
# Envia este projeto para o seu repositório no GitHub.
#   ./publicar.sh https://github.com/SEU-USUARIO/jev-empreendimentos.git
set -e
cd "$(dirname "$0")"
REMOTO="$1"
if [ -z "$REMOTO" ]; then
  echo "Uso: ./publicar.sh https://github.com/SEU-USUARIO/jev-empreendimentos.git"
  exit 1
fi
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTO"
git push -u origin main
git push origin v1.0.0
echo
echo "Pronto. Agora, no GitHub:"
echo "  . Settings -> Pages -> Source: GitHub Actions   (publica o JeV Mobile)"
echo "  . A aba Actions mostra o instalador sendo montado"
echo "  . Em poucos minutos o .exe aparece em Releases"

#!/bin/bash
# =========================================================================
#  Publica uma versão nova do SISTEMA (o arquivo do sistema, não o programa).
#
#    ./atualizar.sh 1.0.2 "Agrupamento de casas em conjunto" "Correção do orçamento"
#
#  O que ele faz:
#    1. troca o número da versão no sistema, no aplicativo e no celular
#    2. remonta o arquivo único do sistema
#    3. copia para dentro do aplicativo (desktop/app) e para a pasta atualizacao/
#    4. calcula a impressão digital (sha256) e escreve o atualizacao/versao.json
#
#  Depois é só mandar a pasta atualizacao/ para o GitHub: quem tem o sistema
#  instalado recebe a versão nova sozinho, testa no reinício e, se algo sair
#  errado, volta atrás no botão.
# =========================================================================
set -e
cd "$(dirname "$0")"
RAIZ="$(pwd)"
FONTE="/root/jev"          # onde mora o código do sistema

NOVA="$1"; shift || true
if [ -z "$NOVA" ]; then
  echo "Uso: ./atualizar.sh 1.0.2 \"primeira nota\" \"segunda nota\""
  echo "Versão atual: $(node -p "require('./desktop/package.json').version")"
  exit 1
fi
if ! echo "$NOVA" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "A versão precisa ter o formato 1.0.2"; exit 1
fi

ANTERIOR="$(node -p "require('./desktop/package.json').version")"

echo "→ trocando a versão $ANTERIOR para $NOVA"
sed -i "s/const SISTEMA_VERSAO = '[^']*'/const SISTEMA_VERSAO = '$NOVA'/" "$FONTE/src/03_core.js"
node -e "
  const fs=require('fs'), p='desktop/package.json';
  const j=JSON.parse(fs.readFileSync(p,'utf8')); j.version='$NOVA';
  fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
"
sed -i "s/const APP_VER = '[^']*'/const APP_VER = '$NOVA'/" mobile/src/03_core.js
sed -i "s/^!define VERSAO     \".*\"/!define VERSAO     \"$NOVA\"/" desktop/instalador.nsi 2>/dev/null || true
sed -i "s/^VIProductVersion \".*\"/VIProductVersion \"$NOVA.0\"/"   desktop/instalador.nsi 2>/dev/null || true

echo "→ remontando o sistema"
bash "$FONTE/build.sh" >/dev/null

echo "→ espalhando o arquivo"
cp "$FONTE/jev_empreendimentos.html" desktop/app/index.html
cp "$FONTE"/src/*.js "$FONTE"/src/*.html desktop/fonte/src/
cp "$FONTE/build.sh" "$FONTE/embed.py" desktop/fonte/ 2>/dev/null || true
bash mobile/build.sh >/dev/null 2>&1 || echo "  (o aplicativo do celular não foi remontado)"

mkdir -p atualizacao
ARQ="jev-$NOVA.html"
cp "$FONTE/jev_empreendimentos.html" "atualizacao/$ARQ"
SHA=$(sha256sum "atualizacao/$ARQ" | cut -d' ' -f1)
TAM=$(stat -c%s "atualizacao/$ARQ")

echo "→ escrevendo o atualizacao/versao.json"
NOTAS_JSON=$(node -e '
  const notas = process.argv.slice(1);
  console.log(JSON.stringify(notas.length?notas:["Melhorias gerais."]));
' "$@")

node -e '
  const fs=require("fs");
  const [versao,arquivo,sha256,tamanho,anterior,notas] = process.argv.slice(1);
  const caminho = "atualizacao/versao.json";
  const antigo = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho,"utf8")) : {};
  const anteriores = (antigo.anteriores||[]).slice();
  if(antigo.versao && antigo.arquivo && antigo.versao !== versao){
    anteriores.unshift({versao:antigo.versao, arquivo:antigo.arquivo, sha256:antigo.sha256, data:antigo.data});
  }
  const info = {
    sistema: "JeV Empreendimentos",
    versao, arquivo,
    data: new Date().toISOString().slice(0,10),
    sha256, tamanho: Number(tamanho),
    notas: JSON.parse(notas),
    substitui: anterior,
    anteriores: anteriores.slice(0,6)
  };
  fs.writeFileSync(caminho, JSON.stringify(info,null,2)+"\n");
' "$NOVA" "$ARQ" "$SHA" "$TAM" "$ANTERIOR" "$NOTAS_JSON"

# mantém no máximo 7 arquivos de versão na pasta
ls -1t atualizacao/jev-*.html 2>/dev/null | tail -n +8 | xargs -r rm -f

echo
echo "Versão $NOVA pronta."
echo "  atualizacao/$ARQ   ($(( TAM / 1024 )) KB)"
echo "  sha256: $SHA"
echo
echo "Para chegar nos computadores da família, mande para o GitHub a pasta atualizacao/:"
echo "  git add -A && git commit -m \"sistema $NOVA\" && git push"
echo
echo "Quem estiver com o sistema aberto recebe o aviso em até 3 horas — ou na hora,"
echo "pelo menu Atualizações → Procurar atualização do sistema."

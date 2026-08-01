#!/bin/bash
# Remonta o sistema (desktop/app/index.html) a partir dos arquivos de src/.
# Precisa de: node, python3 e as bibliotecas do npm (npm install aqui dentro).
set -e
cd "$(dirname "$0")"
cat src/01_head.html src/02_body.html \
    src/03_core.js src/04_dados.js src/05_dados_obras.js src/06_fin.js src/07_hub.js \
    src/08_obras.js src/09_orc.js src/10_crono.js src/11_mat.js src/12_mo.js src/13_rdo.js \
    src/14_med.js src/15_proj.js src/16_imoveis.js src/17_veiculos.js src/18_chacara.js \
    src/19_produtos.js src/20_midia.js src/21_pessoas.js src/22_rel.js src/23_cfg.js \
    src/24_celular.js src/25_nuvem.js src/24_boot.js src/25_foot.html > ../app/index.html
python3 embed.py
echo "pronto: desktop/app/index.html"

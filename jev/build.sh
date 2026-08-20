#!/bin/bash
set -e
cd /root/jev
cat src/01_head.html src/02_body.html \
    src/03_core.js src/04_dados.js src/05_dados_obras.js src/06_fin.js src/07_hub.js \
    src/08_obras.js src/09_orc.js src/10_crono.js src/11_mat.js src/12_mo.js src/13_rdo.js \
    src/14_med.js src/15_proj.js src/16_imoveis.js src/17_veiculos.js src/18_chacara.js \
    src/19_produtos.js src/20_midia.js src/21_pessoas.js src/22_rel.js src/23_cfg.js \
    src/24_celular.js src/25_nuvem.js src/26_versao.js src/27_afiliados.js src/28_garimpo.js src/29_anuncio.js src/30_disparo.js src/31_postar.js src/32_cortes.js src/33_afiliado.js src/34_estudio.js src/35_pauta.js src/36_kalo.js src/37_pessoa.js src/38_higgs.js src/24_boot.js src/25_foot.html > jev_empreendimentos.html
python3 embed.py

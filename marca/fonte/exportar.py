#!/usr/bin/env python3
"""Gera os arquivos do logotipo (SVG) para cada paleta."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo import (PALETAS, horizontal, vertical, icone, icone_chapado,
                  marca_texto, selo_redondo)

BASE = '/root/marca/arquivos'

PECAS = [
    ('logo-horizontal',          lambda p: horizontal(p, 200)),
    ('logo-horizontal-escuro',   lambda p: horizontal(p, 200, 'escuro')),
    ('logo-horizontal-preto',    lambda p: horizontal(p, 200, 'preto')),
    ('logo-horizontal-branco',   lambda p: horizontal(p, 200, 'branco')),
    ('logo-vertical',            lambda p: vertical(p, 200)),
    ('logo-vertical-escuro',     lambda p: vertical(p, 200, 'escuro')),
    ('selo',                     lambda p: icone(p, 512)),
    ('selo-escuro',              lambda p: icone(p, 512, 'escuro')),
    ('selo-uma-cor-preto',       lambda p: icone_chapado(p, 512, 'preto')),
    ('selo-uma-cor-branco',      lambda p: icone_chapado(p, 512, 'branco')),
    ('selo-redondo',             lambda p: selo_redondo(p, 512)),
    ('so-o-nome',                lambda p: marca_texto(p, 160)),
    ('so-o-nome-branco',         lambda p: marca_texto(p, 160, 'branco')),
]

def main():
    indice = {}
    for chave, p in PALETAS.items():
        pasta = os.path.join(BASE, chave)
        os.makedirs(pasta, exist_ok=True)
        nomes = []
        for nome, fn in PECAS:
            caminho = os.path.join(pasta, nome + '.svg')
            open(caminho, 'w', encoding='utf-8').write(fn(p))
            nomes.append(nome)
        open(os.path.join(pasta, 'cores.txt'), 'w', encoding='utf-8').write(
            f"{p['nome']}\n\n"
            f"Cor principal (selo).......: {p['selo']}\n"
            f"Cor de destaque (letras)...: {p['marca']}\n"
            f"Texto......................: {p['nome_cor']}\n"
            f"Texto secundário...........: {p['sub']}\n"
            f"Fundo claro................: {p['papel']}\n"
            f"Fundo escuro...............: {p['escuro']}\n\n"
            "Tipografia: Poppins (Bold para JeV, Medium para EMPREENDIMENTOS).\n"
            "Nos arquivos SVG o texto já está em curvas — abre igual em qualquer computador.\n")
        indice[chave] = nomes
    print(json.dumps({k: len(v) for k, v in indice.items()}, ensure_ascii=False))

if __name__ == '__main__':
    main()

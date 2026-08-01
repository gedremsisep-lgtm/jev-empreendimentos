#!/usr/bin/env python3
"""Gera os ícones dos aplicativos a partir do logotipo oficial (paleta escolhida)."""
import sys, os, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo import PALETAS, selo, _svg, _id

OFICIAL = 'petroleo'
P = PALETAS[OFICIAL]
TMP = '/tmp/icones'
os.makedirs(TMP, exist_ok=True)

def svg_icone(S=512, sangria=False, quadrado=False):
    """sangria: fundo cheio com o selo menor no meio (ícone 'maskable' do Android).
       quadrado: cantos retos (o Android recorta do jeito dele)."""
    if sangria:
        m = S*0.14                       # zona segura do Android
        s = S - 2*m
        idp = _id()
        corpo = selo(s, m, m, P['selo'], P['selo2'], P['marca'], P['marca2'], idp)
        # troca o quadrado interno por fundo inteiro
        corpo = corpo.replace(f'<rect x="{m:.2f}" y="{m:.2f}" width="{s}" height="{s}" '
                              f'rx="{s*0.235:.2f}" fill="url(#f{idp})"/>',
                              f'<rect x="0" y="0" width="{S}" height="{S}" fill="url(#f{idp})"/>')
        return _svg(S, S, corpo, 'JeV')
    idp = _id()
    corpo = selo(S, 0, 0, P['selo'], P['selo2'], P['marca'], P['marca2'], idp)
    if quadrado:
        corpo = corpo.replace(f'rx="{S*0.235:.2f}"', 'rx="0"')
    return _svg(S, S, corpo, 'JeV')

PECAS = [
    ('icone',          svg_icone(1024),               [512, 256, 192, 180, 128, 64, 48, 32, 24, 16]),
    ('icone-sangrado', svg_icone(1024, sangria=True), [512, 192]),
]

def main():
    jobs = []
    for nome, svg, tamanhos in PECAS:
        caminho = os.path.join(TMP, nome + '.svg')
        open(caminho, 'w', encoding='utf-8').write(svg)
        for t in tamanhos:
            jobs.append({'svg': caminho, 'png': os.path.join(TMP, f'{nome}-{t}.png'), 'w': t})
    json.dump(jobs, open('/tmp/jobs_icones.json', 'w'))
    subprocess.run(['node', '/tmp/png.js', '/tmp/jobs_icones.json'], check=True)
    print(f'{len(jobs)} imagens em {TMP}')

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Embute a fonte de ícones (só os glifos usados) no JeV Mobile,
para o aplicativo funcionar 100% offline."""
import re, base64, subprocess, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(BASE, 'index.html')
NODE = os.path.join(os.path.dirname(BASE), '..', 'jev', 'node_modules')
NODE = os.path.normpath(os.path.join(BASE, '..', '..', 'jev', 'node_modules'))
CSSF = os.path.join(NODE, '@tabler/icons-webfont/dist/tabler-icons.css')
WOFF = os.path.join(NODE, '@tabler/icons-webfont/dist/fonts/tabler-icons.woff2')

html = open(HTML, encoding='utf-8').read()

candidatos = set(re.findall(r'\bti-([a-z0-9-]+)', html))
css = open(CSSF, encoding='utf-8').read()
mapa = {}
for m in re.finditer(r'\.ti-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"', css):
    mapa[m.group(1)] = int(m.group(2), 16)

usados = sorted(c for c in candidatos if c in mapa)
faltando = sorted(c for c in candidatos if c not in mapa)
print(f'ícones usados: {len(usados)}')
if faltando:
    print('não são ícones do catálogo (ignorados):', ', '.join(faltando[:15]))

cps = sorted({mapa[u] for u in usados})
sub = '/tmp/ti-sub-mobile.woff2'
subprocess.run([sys.executable, '-m', 'fontTools.subset', WOFF,
                '--unicodes=' + ','.join(f'U+{c:04X}' for c in cps),
                '--flavor=woff2', '--output-file=' + sub,
                '--no-hinting', '--desubroutinize', '--layout-features='],
               check=True, capture_output=True)
b64 = base64.b64encode(open(sub, 'rb').read()).decode()
print(f'fonte embutida: {len(b64)//1024} KB base64 ({len(cps)} glifos)')

regras = '\n'.join(f'.ti-{n}:before{{content:"\\{mapa[n]:x}"}}' for n in usados)
face = ('@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:block;'
        f'src:url("data:font/woff2;base64,{b64}") format("woff2")}}\n'
        '.ti{font-family:"tabler-icons"!important;font-style:normal;font-weight:400!important;'
        'font-variant:normal;text-transform:none;line-height:1;display:inline-block;'
        '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}\n' + regras + '\n')

html = html.replace('<style>', '<style>\n/* ==== Fonte de ícones embutida (Tabler Icons, MIT) ==== */\n' + face + '\n', 1)
open(HTML, 'w', encoding='utf-8').write(html)
print(f'index.html: {os.path.getsize(HTML)//1024} KB')
assert 'cdnjs' not in html and 'jsdelivr' not in html, 'ainda há referência a CDN'
print('OK — nenhuma dependência externa')

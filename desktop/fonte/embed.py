#!/usr/bin/env python3
"""Embute a fonte de ícones (apenas os glifos usados) e o three.js no arquivo final,
tornando o sistema 100% offline — sem nenhuma dependência de internet."""
import re, base64, subprocess, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.normpath(os.path.join(BASE, '..', 'app', 'index.html'))
CSSF = os.path.join(BASE, 'node_modules/@tabler/icons-webfont/dist/tabler-icons.css')
WOFF = os.path.join(BASE, 'node_modules/@tabler/icons-webfont/dist/fonts/tabler-icons.woff2')
THREE = os.path.join(BASE, 'node_modules/three/build/three.min.js')
QRC   = os.path.join(BASE, 'vendor/qrcode.min.js')
JSQR  = os.path.join(BASE, 'vendor/jsqr.min.js')

html = open(HTML, encoding='utf-8').read()

# 1) descobrir os ícones realmente usados
candidatos = set(re.findall(r'\bti-([a-z0-9-]+)', html))

# 2) mapear nome -> codepoint a partir do CSS do tabler
css = open(CSSF, encoding='utf-8').read()
mapa = {}
for m in re.finditer(r'\.ti-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"', css):
    mapa[m.group(1)] = int(m.group(2), 16)
print(f'ícones no catálogo: {len(mapa)}')

# só entram os que existem de fato no catálogo (descarta falsos positivos do regex)
usados = sorted(c for c in candidatos if c in mapa)
print(f'ícones usados: {len(usados)}')
ignorados = sorted(c for c in candidatos if c not in mapa)
if ignorados:
    print('não são ícones (ignorados):', ', '.join(ignorados[:12]))

cps = sorted({mapa[u] for u in usados if u in mapa})

# 3) subset da fonte
sub = '/tmp/ti-sub.woff2'
subprocess.run([sys.executable, '-m', 'fontTools.subset', WOFF,
                '--unicodes=' + ','.join(f'U+{c:04X}' for c in cps),
                '--flavor=woff2', '--output-file=' + sub,
                '--no-hinting', '--desubroutinize', '--layout-features='],
               check=True, capture_output=True)
b64 = base64.b64encode(open(sub, 'rb').read()).decode()
print(f'fonte subsetada: {len(b64)//1024} KB em base64 ({len(cps)} glifos)')

regras = '\n'.join(f'.ti-{n}:before{{content:"\\{mapa[n]:x}"}}' for n in usados if n in mapa)
face = ('@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:block;'
        f'src:url("data:font/woff2;base64,{b64}") format("woff2")}}\n'
        '.ti{font-family:"tabler-icons"!important;font-style:normal;font-weight:400!important;'
        'font-variant:normal;text-transform:none;line-height:1;display:inline-block;'
        '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}\n' + regras + '\n')

# 4) trocar os <link> do CDN pelo CSS embutido
html = re.sub(r'<link rel="stylesheet" href="https://[^"]*tabler-icons[^"]*">\s*', '', html)
html = html.replace('<style>', '<style>\n/* ==== Fonte de ícones embutida (Tabler Icons, MIT) ==== */\n' + face + '\n', 1)

# 5) trocar o three.js do CDN pelo script embutido
three_js = open(THREE, encoding='utf-8').read()
html = html.replace(
    '<script src="XXTHREEXX"></script>',
    '<script>/* three.js r128 (MIT) — embutido para funcionar offline */\n' + three_js + '\n</script>')

# 6) gerador e leitor de QR Code, também embutidos
html = html.replace(
    '<script src="XXQRCODEXX"></script>',
    '<script>/* QR Code Generator — Kazuhiko Arase (MIT) */\n'
    + open(QRC, encoding='utf-8').read() + '\n</script>')
html = html.replace(
    '<script src="XXJSQRXX"></script>',
    '<script>/* jsQR — leitor de QR Code (Apache-2.0) */\n'
    + open(JSQR, encoding='utf-8').read() + '\n</script>')

open(HTML, 'w', encoding='utf-8').write(html)
print(f'arquivo final: {os.path.getsize(HTML)//1024} KB')
assert 'cdnjs' not in html and 'jsdelivr' not in html, 'ainda restou referência a CDN'
print('OK — nenhuma dependência externa restante')

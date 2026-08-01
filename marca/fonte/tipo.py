#!/usr/bin/env python3
"""Transforma texto em caminhos SVG, para o logotipo não depender de fonte instalada."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Identity

FONTES = {
    'bold':   '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf',
    'medium': '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf',
    'regular':'/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf',
    'light':  '/usr/share/fonts/truetype/google-fonts/Poppins-Light.ttf',
}
_cache = {}
def _fonte(peso):
    if peso not in _cache:
        f = TTFont(FONTES[peso])
        _cache[peso] = (f, f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm)
    return _cache[peso]

def texto_para_path(txt, peso='bold', tamanho=100, tracking=0.0, x=0.0, y=0.0):
    """Devolve (path_d, largura_total). y é a linha de base. tracking em em."""
    f, gs, cmap, upem = _fonte(peso)
    esc = tamanho / upem
    partes, caneta = [], 0.0
    for ch in txt:
        g = cmap.get(ord(ch))
        if g is None:
            caneta += tamanho * 0.35
            continue
        pen = SVGPathPen(gs)
        # y invertido: no SVG o eixo cresce para baixo
        tp = TransformPen(pen, (esc, 0, 0, -esc, x + caneta, y))
        gs[g].draw(tp)
        d = pen.getCommands()
        if d:
            partes.append(d)
        caneta += gs[g].width * esc + tracking * tamanho
    if txt:
        caneta -= tracking * tamanho
    return ' '.join(partes), caneta

def largura(txt, peso='bold', tamanho=100, tracking=0.0):
    return texto_para_path(txt, peso, tamanho, tracking)[1]

def caixa(txt, peso='bold', tamanho=100, tracking=0.0):
    """Altura real das letras (para centralizar opticamente)."""
    f, gs, cmap, upem = _fonte(peso)
    esc = tamanho / upem
    ymin, ymax = 1e9, -1e9
    for ch in txt:
        g = cmap.get(ord(ch))
        if g is None: continue
        bp = BoundsPen(gs)
        gs[g].draw(bp)
        if bp.bounds:
            ymin = min(ymin, bp.bounds[1]); ymax = max(ymax, bp.bounds[3])
    if ymin > ymax: return 0.0, 0.0
    return ymin * esc, ymax * esc

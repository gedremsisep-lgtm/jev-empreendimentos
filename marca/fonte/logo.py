#!/usr/bin/env python3
"""Logotipo da JeV Empreendimentos em SVG, com o texto já convertido em curvas
(o arquivo não depende de nenhuma fonte instalada em quem abrir)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tipo import texto_para_path, largura, caixa

# ---------------------------------------------------------------- paletas
PALETAS = {
  'grafite': {
    'chave':'grafite', 'nome':'Grafite e Âmbar',
    'descr':'Quase preto com âmbar. Sóbrio e caro; serve igual para obra, imóvel, veículo, '
            'produção da chácara e produto digital, sem puxar para nenhum dos lados.',
    'selo':'#14181A', 'selo2':'#242B2E', 'marca':'#E5A93A', 'marca2':'#C88C1F',
    'nome_cor':'#14181A', 'sub':'#6E7679', 'papel':'#F5F2ED', 'escuro':'#0C0F10'
  },
  'petroleo': {
    'chave':'petroleo', 'nome':'Petróleo e Cobre',
    'descr':'Azul profundo com cobre. Passa confiança e patrimônio — cara de empresa que '
            'administra bens de família e assina contrato.',
    'selo':'#123B4E', 'selo2':'#1C5872', 'marca':'#E09659', 'marca2':'#C2703D',
    'nome_cor':'#0F3243', 'sub':'#6C8794', 'papel':'#F2F1EC', 'escuro':'#0A2531'
  },
  'oliva': {
    'chave':'oliva', 'nome':'Oliva e Areia',
    'descr':'Verde-oliva com areia. Puxa para a terra e a chácara sem perder a formalidade '
            'da construtora; é a mais calma das três.',
    'selo':'#3E4A32', 'selo2':'#556344', 'marca':'#E3D0A6', 'marca2':'#C0A776',
    'nome_cor':'#2E3728', 'sub':'#79826E', 'papel':'#F6F3EA', 'escuro':'#242B1D'
  },
  'atual': {
    'chave':'atual', 'nome':'Verde e Dourado (o de hoje)',
    'descr':'As cores que já estão no sistema e nos aplicativos, desenhadas no logotipo novo. '
            'Fica aqui para você comparar.',
    'selo':'#0B4F3F', 'selo2':'#0E6A54', 'marca':'#E8B84B', 'marca2':'#C8912A',
    'nome_cor':'#0B4F3F', 'sub':'#6C8079', 'papel':'#F3F5F4', 'escuro':'#07332A'
  },
}

def cores(p, modo):
    """Devolve (fundo do selo, fundo2, letras do selo, letras2, cor do nome, cor do subtítulo)."""
    if modo == 'claro':   return p['selo'], p['selo2'], p['marca'], p['marca2'], p['nome_cor'], p['sub']
    if modo == 'escuro':  return p['marca'], p['marca2'], p['escuro'], p['escuro'], p['papel'], p['marca']
    if modo == 'preto':   return '#101010', None, '#FFFFFF', None, '#101010', '#101010'
    if modo == 'branco':  return '#FFFFFF', None, '#101010', None, '#FFFFFF', '#FFFFFF'
    return cores(p, 'claro')

_seq = [0]
def _id():
    _seq[0] += 1
    return 'g%d' % _seq[0]

# ---------------------------------------------------------------- selo
def selo(S, x, y, c1, c2, m1, m2, idp):
    r = S*0.235
    tam = S*0.545
    lg = largura('JeV', 'bold', tam, -0.014)
    _, ymax = caixa('JeV', 'bold', tam, -0.014)
    cx = x + S/2

    rh, folga = S*0.060, S*0.100
    total, gap = S*0.52, S*0.028
    pes = [0.22, 0.31, 0.47]
    larg = [(total - 2*gap)*q for q in pes]

    topo = y + (S - (ymax + folga + rh))/2 + S*0.010
    base = topo + ymax
    ry = base + folga
    d, _ = texto_para_path('JeV', 'bold', tam, -0.014, cx - lg/2, base)

    rx = cx - total/2
    barras = ''
    for w in larg:
        barras += f'<rect x="{rx:.2f}" y="{ry:.2f}" width="{w:.2f}" height="{rh:.2f}" rx="{rh/2:.2f}"/>'
        rx += w + gap

    if c2 and m2:
        defs = (f'<defs><linearGradient id="f{idp}" x1="0" y1="0" x2="0.35" y2="1">'
                f'<stop offset="0" stop-color="{c2}"/><stop offset="1" stop-color="{c1}"/></linearGradient>'
                f'<linearGradient id="m{idp}" x1="0" y1="0" x2="0.2" y2="1">'
                f'<stop offset="0" stop-color="{m1}"/><stop offset="1" stop-color="{m2}"/></linearGradient></defs>')
        ff, fm = f'url(#f{idp})', f'url(#m{idp})'
    else:
        defs, ff, fm = '', c1, m1
    return (f'{defs}<g><rect x="{x:.2f}" y="{y:.2f}" width="{S}" height="{S}" rx="{r:.2f}" fill="{ff}"/>'
            f'<g fill="{fm}"><path d="{d}"/>{barras}</g></g>')

def _svg(W, H, corpo, titulo='JeV Empreendimentos'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H:.1f}" '
            f'width="{W:.1f}" height="{H:.1f}" role="img" aria-label="{titulo}">{corpo}</svg>')

# ---------------------------------------------------------------- assinaturas
def horizontal(p, S=120, modo='claro'):
    c1,c2,m1,m2,cn,cs = cores(p, modo)
    idp = _id()
    gap = S*0.30
    t1, t2, tr = S*0.52, S*0.163, 0.235
    l1 = largura('JeV', 'bold', t1, -0.014)
    l2 = largura('EMPREENDIMENTOS', 'medium', t2, tr)
    W, H = S + gap + max(l1, l2), S
    x0 = S + gap
    b1 = H*0.50 + S*0.185
    b2 = b1 + S*0.225
    d1,_ = texto_para_path('JeV', 'bold', t1, -0.014, x0, b1)
    d2,_ = texto_para_path('EMPREENDIMENTOS', 'medium', t2, tr, x0+S*0.012, b2)
    return _svg(W, H, selo(S,0,0,c1,c2,m1,m2,idp) +
                f'<g fill="{cn}"><path d="{d1}"/></g><g fill="{cs}"><path d="{d2}"/></g>')

def vertical(p, S=120, modo='claro'):
    c1,c2,m1,m2,cn,cs = cores(p, modo)
    idp = _id()
    t1, t2, tr = S*0.46, S*0.147, 0.25
    l1 = largura('JeV', 'bold', t1, -0.014)
    l2 = largura('EMPREENDIMENTOS', 'medium', t2, tr)
    W = max(S, l1, l2) + S*0.10
    H = S + S*0.70
    cx = W/2
    b1 = S + S*0.40
    b2 = b1 + S*0.215
    d1,_ = texto_para_path('JeV', 'bold', t1, -0.014, cx - l1/2, b1)
    d2,_ = texto_para_path('EMPREENDIMENTOS', 'medium', t2, tr, cx - l2/2 + t2*tr/2, b2)
    return _svg(W, H, selo(S, cx-S/2, 0, c1,c2,m1,m2, idp) +
                f'<g fill="{cn}"><path d="{d1}"/></g><g fill="{cs}"><path d="{d2}"/></g>')

def icone(p, S=120, modo='claro'):
    c1,c2,m1,m2,_,_ = cores(p, modo)
    return _svg(S, S, selo(S,0,0,c1,c2,m1,m2,_id()), 'JeV')

def icone_chapado(p, S=120, modo='claro'):
    """Sem degradê — para gravação, bordado e impressão simples."""
    c1,_,m1,_,_,_ = cores(p, modo)
    return _svg(S, S, selo(S,0,0,c1,None,m1,None,_id()), 'JeV')

def marca_texto(p, T=100, modo='claro'):
    _,_,_,_,cn,cs = cores(p, modo)
    t2, tr = T*0.29, 0.235
    l1 = largura('JeV', 'bold', T, -0.014)
    l2 = largura('EMPREENDIMENTOS', 'medium', t2, tr)
    W, H = max(l1, l2), T*1.28
    d1,_ = texto_para_path('JeV', 'bold', T, -0.014, 0, T*0.72)
    d2,_ = texto_para_path('EMPREENDIMENTOS', 'medium', t2, tr, T*0.02, T*1.12)
    return _svg(W, H, f'<g fill="{cn}"><path d="{d1}"/></g><g fill="{cs}"><path d="{d2}"/></g>')

def selo_redondo(p, S=120, modo='claro'):
    """Versão circular, para carimbo, adesivo e foto de perfil."""
    c1,c2,m1,m2,_,_ = cores(p, modo)
    idp = _id()
    corpo = selo(S,0,0,c1,c2,m1,m2,idp)
    corpo = corpo.replace(f'rx="{S*0.235:.2f}"', f'rx="{S/2:.2f}"')
    return _svg(S, S, corpo, 'JeV')

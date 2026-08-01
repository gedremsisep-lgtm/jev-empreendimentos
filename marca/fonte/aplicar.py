#!/usr/bin/env python3
"""Aplica a marca oficial (Petróleo e Cobre) no sistema, no aplicativo do
celular e no instalador do Windows."""
import sys, os, re, base64, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo import PALETAS, selo, _svg

P = PALETAS['petroleo']
ICO = '/tmp/icones'

# ------------------------------------------------------------------ selo em linha
def selo_html(S, idp):
    """Selo pronto para colar dentro do HTML (sem cabeçalho de arquivo)."""
    corpo = selo(S, 0, 0, P['selo'], P['selo2'], P['marca'], P['marca2'], idp)
    return (f'<svg viewBox="0 0 {S} {S}" width="{S}" height="{S}" xmlns="http://www.w3.org/2000/svg" '
            f'aria-label="JeV" style="display:block">{corpo}</svg>')

def b64(caminho):
    return base64.b64encode(open(caminho, 'rb').read()).decode()

def troca(txt, de, para, arquivo, obrigatorio=True):
    if de not in txt:
        if obrigatorio: raise SystemExit(f'não achei em {arquivo}: {de[:70]}')
        return txt
    return txt.replace(de, para)

# ================================================================== 1) SISTEMA
def sistema():
    p = '/root/jev/src/01_head.html'
    s = open(p, encoding='utf-8').read()

    raiz_nova = """:root{
  /* base neutra e quente */
  --bg:#F5F4F0;--bg2:#FFFFFF;--bg3:#EDECE6;--bg4:#E1E0D8;
  --border:#E3E1DA;--border2:#CCCCC5;
  --text:#141A1D;--text2:#59636A;--text3:#8C969C;
  /* marca JeV — Petróleo e Cobre */
  --brand:#123B4E;--brand2:#1C5872;--brand-bg:#E6EEF2;--brand-lt:#B2CAD7;
  --gold:#C2703D;--gold-bg:#FAECE2;--gold-dk:#8F4E24;
  /* semânticas */
  --green:#1F7A44;--green-bg:#E7F4EC;
  --red:#A8291F;--red-bg:#FBEAE8;
  --amber:#8A5108;--amber-bg:#FDF1DF;
  --blue:#2A6CB8;--blue-bg:#E9F1FB;
  --purple:#6B3FA0;--purple-bg:#F0EAF9;
  --teal:#0E6E70;--teal-bg:#E2F3F3;
  --dark:#0A2531;--dark2:#123B4E;
  --radius:14px;--radius-sm:8px;
  --font:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;
  --sh1:0 1px 2px rgba(12,26,33,.05),0 2px 6px rgba(12,26,33,.05);
  --sh2:0 6px 18px rgba(12,26,33,.10);
  --sh3:0 14px 40px rgba(12,26,33,.16);
  --top:58px;--ctx:46px;
}"""
    ini = s.index(':root{')
    fim = s.index('\n}', ini) + 2
    s = s[:ini] + raiz_nova + s[fim:]

    s = troca(s, '<meta name="theme-color" content="#0B4F3F">',
                 '<meta name="theme-color" content="#123B4E">', p)

    # o quadrado dourado com "JeV" escrito vira o selo de verdade
    s = re.sub(r'\.lgm\{[^}]*\}',
               '.lgm{width:36px;height:36px;flex:none;display:flex;align-items:center;justify-content:center}\n'
               '.lgm svg{width:36px;height:36px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,.22)}',
               s, count=1)

    # favicon novo
    s = re.sub(r'<link rel="icon" type="image/png" href="data:image/png;base64,[^"]+">',
               f'<link rel="icon" type="image/png" href="data:image/png;base64,{b64(ICO+"/icone-64.png")}">',
               s, count=1)
    open(p, 'w', encoding='utf-8').write(s)

    p = '/root/jev/src/02_body.html'
    s = open(p, encoding='utf-8').read()
    s = troca(s, '<div class="lgm">JeV</div>', f'<div class="lgm">{selo_html(36, "topo")}</div>', p)
    open(p, 'w', encoding='utf-8').write(s)
    print('sistema: cores, logotipo e favicon atualizados')

# ================================================================== 2) CELULAR
def celular():
    p = '/root/jevapp/mobile/src/01_head.html'
    s = open(p, encoding='utf-8').read()

    raiz_nova = """:root{
  --bg:#F5F4F0;--bg2:#FFFFFF;--bg3:#EDECE6;--bg4:#E1E0D8;
  --border:#E3E1DA;--border2:#CCCCC5;
  --text:#141A1D;--text2:#59636A;--text3:#8C969C;
  --brand:#123B4E;--brand2:#1C5872;--brand-bg:#E6EEF2;--brand-lt:#B2CAD7;
  --gold:#C2703D;--gold-bg:#FAECE2;--gold-dk:#8F4E24;
  --green:#177A46;--green-bg:#E4F3EA;
  --red:#B3261E;--red-bg:#FBE9E7;
  --amber:#8A5108;--amber-bg:#FDF0DC;
  --blue:#2A6CB8;--blue-bg:#E9F1FB;
  --purple:#7B3FA0;--purple-bg:#F2EAF9;
  --r:14px;--r2:11px;
  --font:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;
  --sh:0 1px 2px rgba(12,26,33,.05),0 2px 8px rgba(12,26,33,.06);
  --sh2:0 8px 26px rgba(12,26,33,.14);
  --top:60px;--bot:70px;
}"""
    ini = s.index(':root{')
    fim = s.index('\n}', ini) + 2
    s = s[:ini] + raiz_nova + s[fim:]

    s = troca(s, '<meta name="theme-color" content="#0B4F3F">',
                 '<meta name="theme-color" content="#123B4E">', p)
    s = re.sub(r'\.top \.lg\{[^}]*\}',
               '.top .lg{width:36px;height:36px;flex:none;display:flex;align-items:center;justify-content:center}\n'
               '.top .lg svg{width:36px;height:36px;border-radius:10px}',
               s, count=1)
    # o resto do texto claro do topo era esverdeado
    s = s.replace('#9FC5B8', '#9FB8C5')
    s = s.replace('color:#3A2A05', 'color:#0A2531')
    s = s.replace('background:#E8B84B;color:#3A2A05', 'background:#E09659;color:#0A2531')
    open(p, 'w', encoding='utf-8').write(s)

    p = '/root/jevapp/mobile/src/02_body.html'
    s = open(p, encoding='utf-8').read()
    s = troca(s, '<div class="lg">JeV</div>', f'<div class="lg">{selo_html(36, "topom")}</div>', p)
    open(p, 'w', encoding='utf-8').write(s)

    # ícones do aplicativo
    dest = '/root/jevapp/mobile/icons'
    shutil.copy(ICO+'/icone-192.png', dest+'/icon-192.png')
    shutil.copy(ICO+'/icone-512.png', dest+'/icon-512.png')
    shutil.copy(ICO+'/icone-sangrado-512.png', dest+'/icon-maskable-512.png')
    shutil.copy(ICO+'/icone-64.png', dest+'/favicon-64.png')

    # manifesto
    p = '/root/jevapp/mobile/manifest.webmanifest'
    s = open(p, encoding='utf-8').read()
    s = s.replace('"background_color": "#0B4F3F"', '"background_color": "#123B4E"')
    s = s.replace('"theme_color": "#0B4F3F"', '"theme_color": "#123B4E"')
    open(p, 'w', encoding='utf-8').write(s)
    print('celular: cores, logotipo, ícones e manifesto atualizados')

# ================================================================== 3) WINDOWS
def windows():
    from PIL import Image
    dest = '/root/jevapp/desktop/build'
    shutil.copy(ICO+'/icone-512.png', dest+'/icon.png')
    shutil.copy(ICO+'/icone-256.png', dest+'/instalador.png')
    base = Image.open(ICO+'/icone-256.png').convert('RGBA')
    base.save(dest+'/icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])

    p = '/root/jevapp/desktop/main.js'
    s = open(p, encoding='utf-8').read()
    s = s.replace("backgroundColor: '#F3F5F4'", "backgroundColor: '#F5F4F0'")
    open(p, 'w', encoding='utf-8').write(s)
    print('windows: ícone do aplicativo e do instalador atualizados')

if __name__ == '__main__':
    sistema(); celular(); windows()

#!/usr/bin/env python3
"""Ícone do aplicativo JeV para Windows (.ico) e Linux (.png)."""
from PIL import Image, ImageDraw, ImageFont
import os
BASE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(BASE, 'build'); os.makedirs(OUT, exist_ok=True)

VERDE=(11,79,63); VERDE2=(10,63,51); OURO1=(232,184,75); OURO2=(200,145,42); ESCURO=(58,42,5)

def fonte(px):
    for c in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
              '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(c): return ImageFont.truetype(c, px)
    return ImageFont.load_default()

def desenhar(s):
    img = Image.new('RGBA', (s, s), (0,0,0,0))
    d = ImageDraw.Draw(img)
    r = int(s*0.11)                                  # cantos arredondados
    d.rounded_rectangle([0,0,s-1,s-1], radius=r, fill=VERDE)
    for y in range(s):                               # degradê
        t = y/max(1,s-1)
        c = tuple(int(VERDE[i]+(VERDE2[i]-VERDE[i])*t) for i in range(3))
        d.line([(0,y),(s,y)], fill=c+(255,))
    m = Image.new('L',(s,s),0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,s-1,s-1], radius=r, fill=255)
    img.putalpha(m)
    d = ImageDraw.Draw(img)
    cx=cy=s/2; rr=int(s*0.30)
    for i in range(rr,0,-1):
        t=1-i/rr
        c=tuple(int(OURO1[k]+(OURO2[k]-OURO1[k])*t) for k in range(3))
        d.ellipse([cx-i,cy-i,cx+i,cy+i], fill=c+(255,))
    f = fonte(int(rr*0.80)); txt='JeV'
    bb = d.textbbox((0,0),txt,font=f)
    d.text((cx-(bb[2]-bb[0])/2-bb[0], cy-(bb[3]-bb[1])/2-bb[1]), txt, font=f, fill=ESCURO+(255,))
    return img

grande = desenhar(512)
grande.save(os.path.join(OUT,'icon.png'))
grande.save(os.path.join(OUT,'icon.ico'), sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
desenhar(256).save(os.path.join(OUT,'instalador.png'))
print('build/icon.ico, build/icon.png')

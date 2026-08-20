#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
O teste do ENQUADRAMENTO.

O defeito que ele tranca: a foto do produto entrava com
"force_original_aspect_ratio=increase,crop=..." — que é "aumenta até cobrir a
tela e corta o que sobrar". Numa capa quadrada de 800x800 virando um vídeo
9:16, isso amputava 44% da LARGURA. O produto saía sem as laterais.

Como este teste prova que acabou: ele desenha uma foto com um quadrado de cor
em cada um dos quatro cantos, renderiza uma cena de verdade com o ffmpeg, lê
um quadro do vídeo pronto e exige que as QUATRO cores estejam lá. Se qualquer
canto sumir, houve corte.

Não usa PIL nem numpy — lê os pixels crus que o próprio ffmpeg entrega, para
rodar em qualquer máquina da família.

Rodar:  python3 test_enquadre.py
"""
import os
import sys
import struct
import zlib
import tempfile
import subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('JEV_ESTUDIO', tempfile.mkdtemp(prefix='jev-enq-'))

import fabrica  # noqa: E402

falhas = []


def ok(nome, valor):
    if valor is True:
        print('  ok    ' + nome)
    else:
        falhas.append(nome)
        print(' FALHA  ' + nome + '  -> ' + repr(valor)[:200])


# --------------------------------------------------------------- a foto
CANTOS = {
    'vermelho': (255, 0, 0),
    'azul': (0, 0, 255),
    'amarelo': (255, 255, 0),
    'magenta': (255, 0, 255),
}


def escrever_png(caminho, larg, alt, pixels):
    """PNG mínimo, sem PIL: a família não precisa instalar nada para testar."""
    linhas = b''
    for y in range(alt):
        linhas += b'\x00' + bytes(
            v for x in range(larg) for v in pixels[y * larg + x])

    def chunk(tipo, dados):
        c = struct.pack('>I', len(dados)) + tipo + dados
        return c + struct.pack('>I', zlib.crc32(tipo + dados) & 0xFFFFFFFF)

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', larg, alt, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(linhas, 6))
           + chunk(b'IEND', b''))
    with open(caminho, 'wb') as f:
        f.write(png)


def foto_marcada(caminho, larg=800, alt=800):
    """Fundo claro, produto no meio, e um quadrado de cor em cada canto."""
    px = [(238, 238, 238)] * (larg * alt)
    m = max(8, larg // 16)

    def pinta(x0, y0, x1, y1, cor):
        for y in range(max(0, y0), min(alt, y1)):
            for x in range(max(0, x0), min(larg, x1)):
                px[y * larg + x] = cor

    pinta(int(larg * .14), int(alt * .22), int(larg * .86), int(alt * .78), (20, 110, 80))
    pinta(0, 0, m, m, CANTOS['vermelho'])
    pinta(larg - m, 0, larg, m, CANTOS['azul'])
    pinta(0, alt - m, m, alt, CANTOS['amarelo'])
    pinta(larg - m, alt - m, larg, alt, CANTOS['magenta'])
    escrever_png(caminho, larg, alt, px)


def cores_do_quadro(video, larg, alt):
    """Lê um quadro do meio do vídeo como RGB cru, direto do ffmpeg."""
    saida = subprocess.run(
        [fabrica.FFMPEG, '-v', 'error', '-ss', '1', '-i', video, '-frames:v', '1',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
    achou = {k: False for k in CANTOS}
    passo = 3 * 2  # de dois em dois pixels: rápido e suficiente
    for i in range(0, len(saida) - 3, passo):
        r, g, b = saida[i], saida[i + 1], saida[i + 2]
        for nome, (R, G, B) in CANTOS.items():
            if not achou[nome] and abs(r - R) < 45 and abs(g - G) < 45 and abs(b - B) < 45:
                achou[nome] = True
    return achou, len(saida)


def rodar_cena(pasta, foto, larg, alt, nome):
    som = os.path.join(pasta, 'som.aac')
    subprocess.run([fabrica.FFMPEG, '-y', '-v', 'error', '-f', 'lavfi',
                    '-i', 'anullsrc=r=44100:cl=stereo', '-t', '2',
                    '-c:a', 'aac', som], check=True)
    destino = os.path.join(pasta, nome)
    fabrica.render_cena(foto, som, 2.0, larg, alt, destino, False, 0)
    return destino


def main():
    fabrica.FFMPEG = fabrica.FFMPEG or 'ffmpeg'
    if not os.path.isabs(fabrica.FFMPEG) and not fabrica.FFMPEG:
        fabrica.FFMPEG = 'ffmpeg'
    pasta = tempfile.mkdtemp(prefix='jev-enq-')
    foto = os.path.join(pasta, 'capa.png')

    print('\n1) a capa quadrada no video em pe (o caso do Kalodata)')
    foto_marcada(foto, 800, 800)
    v = rodar_cena(pasta, foto, 1080, 1920, 'vertical.mp4')
    ok('a cena foi gerada', os.path.getsize(v) > 1000 if os.path.exists(v) else 'nao gerou')
    achou, tam = cores_do_quadro(v, 1080, 1920)
    ok('o quadro tem o tamanho pedido', tam == 1080 * 1920 * 3 or tam)
    for nome in ('vermelho', 'azul', 'amarelo', 'magenta'):
        ok('o canto ' + nome + ' da foto continua no quadro', achou[nome] or 'foi cortado')

    print('\n2) uma foto deitada no video em pe (o caso mais dificil)')
    foto2 = os.path.join(pasta, 'deitada.png')
    foto_marcada(foto2, 1200, 600)
    v2 = rodar_cena(pasta, foto2, 1080, 1920, 'deitada.mp4')
    achou2, _ = cores_do_quadro(v2, 1080, 1920)
    for nome in ('vermelho', 'azul', 'amarelo', 'magenta'):
        ok('o canto ' + nome + ' sobreviveu', achou2[nome] or 'foi cortado')

    print('\n3) uma foto em pe no video deitado')
    foto3 = os.path.join(pasta, 'empe.png')
    foto_marcada(foto3, 600, 1200)
    v3 = rodar_cena(pasta, foto3, 1920, 1080, 'deitado.mp4')
    achou3, _ = cores_do_quadro(v3, 1920, 1080)
    for nome in ('vermelho', 'azul', 'amarelo', 'magenta'):
        ok('o canto ' + nome + ' sobreviveu', achou3[nome] or 'foi cortado')

    print('\n4) a margem de respiro existe')
    li, ai = fabrica.caixa_interna(1080, 1920)
    ok('sobra folga na largura', li < 1080 or (li, 1080))
    ok('sobra folga na altura para a legenda do aplicativo', ai < 1920 or (ai, 1920))
    ok('a caixa e par, como o h264 exige', (li % 2 == 0 and ai % 2 == 0) or (li, ai))

    print('\n5) o filtro nao usa mais o corte que amputava o produto')
    f = fabrica.encaixe(1080, 1920, 60)
    ok('a foto da frente entra por "decrease", que cabe inteira',
       'force_original_aspect_ratio=decrease' in f or f[:120])
    ok('o fundo desfocado preenche o vazio, em vez de tarja preta',
       'gblur' in f and 'overlay' in f or f[:120])

    print('')
    if falhas:
        print(str(len(falhas)) + ' FALHA(S)')
        sys.exit(1)
    print('Tudo certo - a foto do produto entra inteira, sem perder as bordas.')


if __name__ == '__main__':
    main()

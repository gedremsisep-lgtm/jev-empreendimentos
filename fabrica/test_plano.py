# -*- coding: utf-8 -*-
"""Prova a regra do plano de cenas: o vídeo do vendedor vem primeiro.

Essa regra é a diferença entre o vídeo com uma pessoa usando o produto e o
vídeo com texto no fundo verde. Se alguém mexer nela sem querer, é aqui que
o erro aparece — e não na casa do dono, depois de publicado.

Rode assim:   python3 fabrica/test_plano.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fabrica as F   # noqa: E402

falhas = 0


def ok(nome, condicao, visto=None):
    global falhas
    if condicao:
        print('  ok    %s' % nome)
    else:
        falhas += 1
        print('  FALHA %s%s' % (nome, ('  -> %r' % (visto,)) if visto is not None else ''))


def cenas(n, seg=4.0):
    return [{'dur': seg} for _ in range(n)]


def foto(c='/f.jpg'):
    return {'tipo': 'foto', 'caminho': c}


def video(c='/v.mp4', dur=20.0):
    return {'tipo': 'video', 'caminho': c, 'dur': dur}


print('\nplano de cenas — o vídeo do vendedor na frente')

# 1) com vídeo e foto juntos, o vídeo leva TODAS as cenas que couberem
p = F.plano_de_cenas([foto('/a.jpg'), foto('/b.jpg'), video('/v.mp4', 20.0)], cenas(5))
ok('vídeo longo enche as cinco cenas', [x['tipo'] for x in p] == ['video'] * 5,
   [x['tipo'] for x in p])
ok('e cada cena pega um pedaço diferente dele',
   len(set(x['ini'] for x in p)) == 5, [x['ini'] for x in p])
ok('os pedaços vêm em ordem, do começo ao fim',
   [x['ini'] for x in p] == sorted(x['ini'] for x in p), [x['ini'] for x in p])
ok('e nenhum pedaço começa depois do fim do vídeo',
   all(x['ini'] + 4.0 <= 20.0 + 0.01 for x in p), [x['ini'] for x in p])

# 2) vídeo curto: rende o que dá, a foto pega o resto — melhor que fundo liso
p = F.plano_de_cenas([foto('/a.jpg'), video('/v1.mp4', 6.0), video('/v2.mp4', 5.0)], cenas(5))
ok('dois vídeos curtos rendem duas cenas',
   [x['tipo'] for x in p] == ['video', 'video', 'foto', 'foto', 'foto'],
   [x['tipo'] for x in p])
ok('e reveza entre os dois, sem gastar um só',
   p[0]['caminho'] != p[1]['caminho'], [x.get('caminho') for x in p[:2]])

# 3) só foto: continua funcionando como antes
p = F.plano_de_cenas([foto('/a.jpg'), foto('/b.jpg')], cenas(4))
ok('só foto reveza entre as fotos',
   [x['caminho'] for x in p] == ['/a.jpg', '/b.jpg', '/a.jpg', '/b.jpg'],
   [x['caminho'] for x in p])

# 4) só vídeo curto e nenhuma foto: repete o vídeo em vez de cair no fundo liso
p = F.plano_de_cenas([video('/v.mp4', 5.0)], cenas(4))
ok('sem foto, o vídeo repete e o fundo liso não aparece',
   [x['tipo'] for x in p] == ['video'] * 4, [x['tipo'] for x in p])

# 5) nada de nada: aí sim, fundo liso — e é o único caso
p = F.plano_de_cenas([], cenas(3))
ok('sem material nenhum é que sai o fundo liso',
   [x['tipo'] for x in p] == ['carta'] * 3, [x['tipo'] for x in p])

# 6) o plano nunca devolve menos cena do que o roteiro pediu
for n in range(1, 9):
    for fontes in ([], [foto()], [video()], [foto(), video()],
                   [video('/v1.mp4', 3.0), video('/v2.mp4', 30.0), foto()]):
        q = F.plano_de_cenas(fontes, cenas(n))
        if len(q) != n:
            ok('plano do tamanho do roteiro (%d cenas, %d fontes)' % (n, len(fontes)),
               False, len(q))
            break
else:
    ok('o plano sempre tem uma fonte para cada cena, em qualquer combinação', True)

# 7) o plano não inventa caminho: tudo que sai, entrou
fontes = [foto('/a.jpg'), video('/v.mp4', 30.0)]
saiu = set(x.get('caminho') for x in F.plano_de_cenas(fontes, cenas(6)))
ok('nenhum arquivo aparece do nada',
   saiu <= set(['/a.jpg', '/v.mp4']), saiu)

print('')
print('%d FALHA(S)' % falhas if falhas else
      'Tudo certo — o vídeo do vendedor entra na frente da foto e do fundo liso.')
sys.exit(1 if falhas else 0)

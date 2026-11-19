"""Confere se algum ícone usado no código ficou de fora da fonte embutida.

Sem o embed.py, o cabeçalho traz um conjunto FIXO de ícones — o que estava em
uso na 1.0.34. Se alguém escrever um ícone novo, ele sai como quadradinho
vazio na tela, e isso é o tipo de defeito que ninguém percebe até o dono
reclamar. Então o build acusa na hora.

OS DOIS JEITOS DE USAR UM ÍCONE
-------------------------------
1. escrito na tela:   <i class="ti ti-crane"></i>
2. guardado como dado: {id:'obras', ic:'ti-crane', ...}  e desenhado depois

Por muito tempo esta conferência só enxergava o primeiro. O segundo é o
jeito das tabelas que mandam no sistema inteiro — UNIDADES, VIGIAS,
MID_FINALIDADES, as abas do Controle — então o buraco ficava exatamente em
cima das peças mais importantes. Foi assim que um 'ti-speakerphone' entrou
numa tabela de canais sem existir na fonte: o build passou e o ícone teria
saído como quadrado vazio na casa da família.
"""
import re, sys
h = open('jev_empreendimentos.html', encoding='utf-8').read()
# o embed.py original também ignorava estes: são nomes que parecem ícone
# mas não existem no catálogo Tabler. Não são defeito novo.
NAO_SAO_ICONES = {'clapperboard'}

na_tela   = set(re.findall(r'\bti\s+ti-([a-z0-9-]+)', h))
como_dado = set(re.findall(r"""['"]ti-([a-z0-9-]+)['"]""", h))
usados    = (na_tela | como_dado) - NAO_SAO_ICONES
embutidos = set(re.findall(r'\.ti-([a-z0-9-]+):before', h))

faltando = sorted(usados - embutidos)
print('ícones usados: %d (%d escritos na tela, %d guardados como dado) | embutidos na fonte: %d'
      % (len(usados), len(na_tela), len(como_dado), len(embutidos)))
if faltando:
    print('\n' + '#'*62)
    print('#  ATENÇÃO: %d ícone(s) usados NÃO estão na fonte embutida.' % len(faltando))
    print('#  Eles vão sair como quadrado vazio na tela:')
    for f in faltando:
        onde = 'escrito na tela' if f in na_tela else 'guardado como dado numa tabela'
        print('#    ti-%-28s (%s)' % (f, onde))
    print('#  Troque por um ícone que já exista, ou recupere o embed.py.')
    print('#'*62)
    sys.exit(1)
print('OK — todo ícone usado existe na fonte embutida.')

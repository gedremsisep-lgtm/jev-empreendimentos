"""Confere se algum ícone usado no código ficou de fora da fonte embutida.

Sem o embed.py, o cabeçalho traz um conjunto FIXO de ícones — o que estava em
uso na 1.0.34. Se alguém escrever um ícone novo, ele sai como quadradinho
vazio na tela, e isso é o tipo de defeito que ninguém percebe até o dono
reclamar. Então o build acusa na hora."""
import re, sys
h = open('jev_empreendimentos.html', encoding='utf-8').read()
# o embed.py original também ignorava estes: são nomes que parecem ícone
# mas não existem no catálogo Tabler. Não são defeito novo.
NAO_SAO_ICONES = {'clapperboard'}
usados = set(re.findall(r'\bti\s+ti-([a-z0-9-]+)', h)) - NAO_SAO_ICONES
embutidos = set(re.findall(r'\.ti-([a-z0-9-]+):before', h))
faltando = sorted(usados - embutidos)
print('ícones usados: %d | embutidos na fonte: %d' % (len(usados), len(embutidos)))
if faltando:
    print('\n' + '#'*62)
    print('#  ATENÇÃO: %d ícone(s) usados NÃO estão na fonte embutida.' % len(faltando))
    print('#  Eles vão sair como quadrado vazio na tela:')
    for f in faltando: print('#    ti-' + f)
    print('#  Troque por um ícone que já exista, ou recupere o embed.py.')
    print('#'*62)
    sys.exit(1)
print('OK — todo ícone usado existe na fonte embutida.')

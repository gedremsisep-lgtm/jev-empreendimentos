# -*- coding: utf-8 -*-
"""
FÁBRICA DE CORTES DA JeV
Pega um vídeo longo do YouTube e devolve vários cortes de um minuto,
em pé, legendados e prontos para subir.

Roda no seu computador. O vídeo não sai daqui.

O miolo é a função `escolher`, que decide quais pedaços viram corte.
Ela é a MESMA que existe dentro do sistema, em JavaScript (32_cortes.js).
Existe um teste que roda as duas sobre o mesmo material e exige o mesmo
resultado — se alguém mexer só de um lado, o teste quebra na hora.
"""
import json, math, os, re, subprocess, sys, unicodedata

AQUI    = os.path.dirname(os.path.abspath(__file__))
FERR    = os.path.join(AQUI, 'ferramentas')
PEDIDOS = os.path.join(AQUI, 'pedidos')
SAIDA   = os.path.join(AQUI, 'saida')
TEMP    = os.path.join(AQUI, 'temp-cortes')


# =========================================================================
#  A ESCOLHA DOS MOMENTOS — espelho exato do 32_cortes.js
# =========================================================================
CORT_GANCHOS = [
    'olha isso', 'olha so', 'presta atencao', 'preste atencao', 'repara', 'repara nisso',
    'voce sabia', 'sabia que', 'ninguem', 'ninguem te conta', 'ninguem fala',
    'segredo', 'a verdade', 'na verdade', 'verdade e que', 'mentira',
    'nunca', 'sempre', 'jamais', 'pela primeira vez',
    'erro', 'errado', 'cuidado', 'atencao', 'perigo', 'cilada', 'armadilha',
    'incrivel', 'absurdo', 'impressionante', 'inacreditavel', 'surreal', 'chocante',
    'nao acredito', 'nao acreditei', 'me surpreendeu', 'surpreendente',
    'o problema', 'o pulo do gato', 'o detalhe', 'o segredo e',
    'dica', 'truque', 'macete', 'jeito certo', 'passo a passo',
    'de graca', 'gratis', 'barato', 'caro', 'desconto', 'promocao',
    'dinheiro', 'reais', 'real', 'custou', 'economizei', 'gastei', 'preco',
    'antes e depois', 'antes', 'depois', 'resultado', 'funciona', 'resolve',
    'melhor', 'pior', 'maior', 'menor', 'mais rapido', 'mais facil',
    'primeiro', 'segundo lugar', 'por ultimo', 'no final',
    'por que', 'porque', 'como fazer', 'como e que', 'o que acontece',
    'espera', 'calma', 'pera', 'olha', 'gente', 'serio', 'de verdade',
    'imagina', 'pensa', 'repete', 'de novo', 'outra vez',
]


def sem_acento(t):
    t = '' if t is None else str(t)
    return ''.join(c for c in unicodedata.normalize('NFD', t.lower())
                   if unicodedata.category(c) != 'Mn')


def fala_pontos(texto):
    t = sem_acento(texto)
    n = 0
    for g in CORT_GANCHOS:
        if g in t:
            n += 1
    bruto = '' if texto is None else str(texto)
    if '?' in bruto:
        n += 2
    if '!' in bruto:
        n += 1
    if re.search(r'[0-9]', bruto):
        n += 1
    p = n / 4.0
    return 1.0 if p > 1 else p


def normalizar(a):
    v = list(a or [])
    if not v:
        return []
    lo, hi = min(v), max(v)
    if hi - lo < 1e-9:
        return [0.5] * len(v)
    faixa = hi - lo
    return [(x - lo) / faixa for x in v]


def media(serie, ini, dur):
    if not serie or dur <= 0:
        return 0.0
    s = 0.0
    n = len(serie)
    for i in range(dur):
        k = ini + i
        if 0 <= k < n:
            s += serie[k]
    return s / dur


def serie_fala(falas, n):
    s = [0.0] * n
    for f in (falas or []):
        p = fala_pontos(f.get('texto'))
        i = int(math.floor(float(f.get('ini') or 0)))
        j = int(math.ceil(float(f.get('fim') or 0)))
        if i < 0:
            i = 0
        if j <= i:
            j = i + 1
        if j > n:
            j = n
        for k in range(i, j):
            if s[k] < p:
                s[k] = p
    return s


PADRAO = {'quantos': 5, 'dur': 60, 'passo': 2, 'folga': 5, 'encaixe': 4}


def opcoes(o):
    p = o or {}
    s = p.get('sinais') or {}
    return {
        'quantos': max(1, int(round(float(p.get('quantos') or PADRAO['quantos'])))),
        'dur':     max(5, int(round(float(p.get('dur') or PADRAO['dur'])))),
        'passo':   max(1, int(round(float(p.get('passo') or PADRAO['passo'])))),
        'folga':   max(0, int(round(float(PADRAO['folga'] if p.get('folga') is None else p['folga'])))),
        'encaixe': max(0, int(round(float(PADRAO['encaixe'] if p.get('encaixe') is None else p['encaixe'])))),
        'sinais': {'reprise': s.get('reprise') is not False,
                   'audio':   s.get('audio') is not False,
                   'fala':    s.get('fala') is not False},
    }


def nota_janela(pre, ini, o):
    tem_rep = o['sinais']['reprise'] and len(pre['reprise']) > 0
    tem_ene = o['sinais']['audio'] and len(pre['energia']) > 0
    tem_fal = o['sinais']['fala'] and len(pre['fala']) > 0

    abertura = min(8, o['dur'])
    gancho = min(10, o['dur'])

    rep = media(pre['reprise'], ini, o['dur']) if tem_rep else 0.0
    abre = media(pre['reprise'], ini, abertura) if tem_rep else 0.0
    ene = media(pre['energia'], ini, o['dur']) if tem_ene else 0.0
    fal = (0.6 * media(pre['fala'], ini, o['dur'])
           + 0.4 * media(pre['fala'], ini, gancho)) if tem_fal else 0.0

    p_rep = 40 if tem_rep else 0
    p_abre = 15 if tem_rep else 0
    p_ene = 20 if tem_ene else 0
    p_fal = 25 if tem_fal else 0
    soma = p_rep + p_abre + p_ene + p_fal
    if soma <= 0:
        return {'nota': 0.0, 'rep': rep, 'abre': abre, 'ene': ene, 'fal': fal}
    k = 100.0 / soma
    return {'nota': k * (p_rep * rep + p_abre * abre + p_ene * ene + p_fal * fal),
            'rep': rep, 'abre': abre, 'ene': ene, 'fal': fal}


def motivos(n):
    m = []
    if n['rep'] >= 0.66:
        m.append('é dos trechos mais revistos do vídeo')
    elif n['rep'] >= 0.45:
        m.append('tem boa taxa de reprise')
    if n['abre'] >= 0.6:
        m.append('já começa num pico de audiência')
    if n['ene'] >= 0.66:
        m.append('áudio marcante — riso, ênfase ou virada de tom')
    if n['fal'] >= 0.5:
        m.append('a fala tem gancho logo no começo')
    elif n['fal'] >= 0.3:
        m.append('a fala traz pergunta ou número')
    if not m:
        m.append('foi o melhor trecho que sobrou dentro do vídeo')
    return m


def encaixar(falas, ini, o):
    if not o['encaixe'] or not falas:
        return ini
    melhor, dist = ini, o['encaixe'] + 1
    for f in falas:
        t = int(math.floor(float(f.get('ini') or 0)))
        d = abs(t - ini)
        if d <= o['encaixe'] and d < dist:
            dist, melhor = d, t
    return melhor


def bate(a, b, dur, folga):
    return (a < b + dur + folga) and (b < a + dur + folga)


def fala_do_trecho(falas, ini, fim):
    partes = []
    for f in (falas or []):
        a = float(f.get('ini') or 0)
        b = float(f.get('fim') or 0)
        if b > ini and a < fim and f.get('texto'):
            partes.append(str(f['texto']).strip())
    return re.sub(r'\s+', ' ', ' '.join(partes)).strip()


def escolher(sinais, opts=None):
    o = opcoes(opts)
    s = sinais or {}
    total = max(0, int(math.floor(float(s.get('duracao') or 0))))
    falas = s.get('falas') or []

    pre = {'reprise': normalizar(s.get('reprise')),
           'energia': normalizar(s.get('energia')),
           'fala': serie_fala(falas, total)}

    if total < o['dur']:
        return []

    cands = []
    ini = 0
    while ini + o['dur'] <= total:
        n = nota_janela(pre, ini, o)
        cands.append({'ini': ini, 'nota': n['nota'], 'det': n})
        ini += o['passo']
    cands.sort(key=lambda c: (-c['nota'], c['ini']))

    pegos = []
    for c in cands:
        if len(pegos) >= o['quantos']:
            break
        if any(bate(c['ini'], p['ini'], o['dur'], o['folga']) for p in pegos):
            continue
        i = encaixar(falas, c['ini'], o)
        if i + o['dur'] > total:
            i = total - o['dur']
        if i < 0:
            i = 0
        if i != c['ini'] and any(bate(i, p['ini'], o['dur'], o['folga']) for p in pegos):
            i = c['ini']
        pegos.append({'ini': i, 'nota': c['nota'], 'det': c['det']})

    pegos.sort(key=lambda p: p['ini'])
    saida = []
    for idx, p in enumerate(pegos):
        saida.append({
            'n': idx + 1,
            'ini': p['ini'],
            'fim': p['ini'] + o['dur'],
            'dur': o['dur'],
            # floor(x+0.5) e não round(): o round do Python arredonda 0,5 para
            # o par mais próximo e o do JavaScript arredonda para cima. Sem
            # isso, uma nota terminada em ,x5 sai diferente nos dois lados.
            'nota': math.floor(p['nota'] * 10 + 0.5) / 10.0,
            'motivos': motivos(p['det']),
            'fala': fala_do_trecho(falas, p['ini'], p['ini'] + o['dur']),
        })
    return saida


# =========================================================================
#  FERRAMENTAS
# =========================================================================
def achar(nome):
    # o aplicativo diz onde guardou as ferramentas; o .bat usa a pasta ao lado
    bases = [FERR]
    for p in (os.environ.get('JEV_FERRAMENTAS') or '').split(os.pathsep):
        if p.strip():
            bases.append(p.strip())
    direto = os.environ.get('JEV_' + nome.replace('-', '').upper())
    if direto and os.path.isfile(direto):
        return direto
    for base in bases:
        if not os.path.isdir(base):
            continue
        for raiz, _dirs, arqs in os.walk(base):
            for a in arqs:
                if a.lower() in (nome + '.exe', nome):
                    return os.path.join(raiz, a)
    for p in os.environ.get('PATH', '').split(os.pathsep):
        c = os.path.join(p, nome)
        if os.path.isfile(c):
            return c
        if os.path.isfile(c + '.exe'):
            return c + '.exe'
    return None


def rodar(args, timeout=None):
    return subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                          timeout=timeout)


# =========================================================================
#  MEDIR OS SINAIS
# =========================================================================
def sinal_reprise(info, duracao):
    """A curva de 'mais revisto' que o próprio YouTube publica."""
    mapa = info.get('heatmap')
    if not mapa:
        return []
    serie = [0.0] * duracao
    for faixa in mapa:
        try:
            a = int(math.floor(float(faixa.get('start_time', 0))))
            b = int(math.ceil(float(faixa.get('end_time', 0))))
            v = float(faixa.get('value', 0))
        except (TypeError, ValueError):
            continue
        for k in range(max(0, a), min(duracao, max(a + 1, b))):
            if serie[k] < v:
                serie[k] = v
    return serie


def sinal_energia(ffmpeg, video, duracao):
    """Volume por segundo. Risada, grito e ênfase aparecem como pico."""
    filtro = ('aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1,'
              'ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-')
    try:
        r = rodar([ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', video,
                   '-vn', '-af', filtro, '-f', 'null', '-'], timeout=900)
    except Exception:
        return []
    vals = []
    for linha in r.stdout.decode('utf-8', 'ignore').splitlines():
        if 'RMS_level' not in linha:
            continue
        bruto = linha.split('=')[-1].strip()
        try:
            db = float(bruto)
        except ValueError:
            db = -91.0                      # silêncio absoluto
        if db < -91.0:
            db = -91.0
        vals.append(10 ** (db / 20.0))      # de decibel para amplitude
    if len(vals) > duracao:
        vals = vals[:duracao]
    while 0 < len(vals) < duracao:
        vals.append(vals[-1])
    return vals


TEMPO_SRT = re.compile(r'(\d+):(\d\d):(\d\d)[,.](\d+)\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d+)')


def _seg(h, m, s, ms):
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def ler_srt(caminho):
    """Lê a legenda e devolve as falas com começo, fim e texto."""
    try:
        with open(caminho, 'r', encoding='utf-8', errors='ignore') as f:
            bruto = f.read()
    except OSError:
        return []
    falas, atual = [], None
    for linha in bruto.replace('\r', '').split('\n'):
        m = TEMPO_SRT.search(linha)
        if m:
            if atual and atual['texto']:
                falas.append(atual)
            atual = {'ini': _seg(*m.groups()[0:4]), 'fim': _seg(*m.groups()[4:8]), 'texto': ''}
        elif atual is not None and linha.strip() and not linha.strip().isdigit():
            limpo = re.sub(r'<[^>]+>', '', linha).strip()
            if limpo and limpo not in atual['texto']:
                atual['texto'] = (atual['texto'] + ' ' + limpo).strip()
    if atual and atual['texto']:
        falas.append(atual)
    # o YouTube repete a linha anterior nas legendas automáticas
    limpas, visto = [], ''
    for f in falas:
        if f['texto'] == visto:
            continue
        visto = f['texto']
        limpas.append(f)
    return limpas


def escrever_srt(falas, ini, fim, destino):
    """Legenda do corte, com os tempos recomeçando do zero."""
    def carimbo(t):
        t = max(0.0, t)
        h = int(t // 3600); m = int(t % 3600 // 60); s = int(t % 60); ms = int(round((t - int(t)) * 1000))
        return '%02d:%02d:%02d,%03d' % (h, m, s, min(ms, 999))
    linhas, n = [], 0
    for f in falas:
        if f['fim'] <= ini or f['ini'] >= fim:
            continue
        n += 1
        linhas.append(str(n))
        linhas.append(carimbo(max(0.0, f['ini'] - ini)) + ' --> ' + carimbo(min(fim - ini, f['fim'] - ini)))
        linhas.append(f['texto'])
        linhas.append('')
    with open(destino, 'w', encoding='utf-8') as h:
        h.write('\n'.join(linhas))
    return n > 0


# =========================================================================
#  BAIXAR E CORTAR
# =========================================================================
def baixar(ytdlp, url, pasta):
    os.makedirs(pasta, exist_ok=True)
    alvo = os.path.join(pasta, 'video')
    args = [ytdlp, '--no-playlist', '--no-warnings',
            '-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]/b',
            '--merge-output-format', 'mp4',
            '--write-info-json', '--write-auto-subs', '--write-subs',
            '--sub-langs', 'pt.*,pt-BR,pt', '--convert-subs', 'srt',
            '-o', alvo + '.%(ext)s', url]
    r = rodar(args, timeout=5400)
    saida = r.stdout.decode('utf-8', 'ignore')
    if r.returncode != 0:
        return None, saida
    video = None
    for ext in ('mp4', 'mkv', 'webm'):
        c = alvo + '.' + ext
        if os.path.isfile(c):
            video = c
            break
    return video, saida


def cortar(ffmpeg, video, ini, dur, srt, destino, formato='9:16'):
    """Recorta, vira em pé e queima a legenda."""
    if formato == '9:16':
        vf = ('[0:v]split=2[bg][fg];'
              '[bg]scale=1080:1920:force_original_aspect_ratio=increase,'
              'crop=1080:1920,boxblur=32:4[bgb];'
              '[fg]scale=1080:-2:force_original_aspect_ratio=decrease[fgs];'
              '[bgb][fgs]overlay=(W-w)/2:(H-h)/2[v]')
    else:
        vf = '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1[v]'

    if srt and os.path.isfile(srt) and os.path.getsize(srt) > 0:
        estilo = ("force_style='Fontname=Arial,Fontsize=15,Bold=1,PrimaryColour=&H00FFFFFF,"
                  "OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,MarginV=140'")
        caminho = srt.replace('\\', '/').replace(':', '\\:')
        vf = vf[:-3] + "[vb];[vb]subtitles='" + caminho + "':" + estilo + '[v]'

    args = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
            '-ss', str(ini), '-t', str(dur), '-i', video,
            '-filter_complex', vf, '-map', '[v]', '-map', '0:a?',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart', destino]
    r = rodar(args, timeout=1800)
    return r.returncode == 0, r.stdout.decode('utf-8', 'ignore')


def limpo(t, tam=48):
    t = sem_acento(t)
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    return t[:tam] or 'corte'


# =========================================================================
#  O TRABALHO INTEIRO
# =========================================================================
def fazer(pedido, ytdlp, ffmpeg):
    url = pedido.get('video') or ''
    vid = pedido.get('videoId') or 'video'
    print('  baixando o vídeo... (pode demorar)')
    pasta_tmp = os.path.join(TEMP, vid)
    video, log = baixar(ytdlp, url, pasta_tmp)
    if not video:
        print('  NÃO CONSEGUI BAIXAR. O que o baixador disse:')
        print('  ' + log.strip().splitlines()[-1] if log.strip() else '  (sem detalhes)')
        return None

    info = {}
    for a in os.listdir(pasta_tmp):
        if a.endswith('.info.json'):
            with open(os.path.join(pasta_tmp, a), 'r', encoding='utf-8', errors='ignore') as f:
                info = json.load(f)
            break
    srt_geral = None
    for a in sorted(os.listdir(pasta_tmp)):
        if a.endswith('.srt'):
            srt_geral = os.path.join(pasta_tmp, a)
            break

    duracao = int(float(info.get('duration') or 0))
    if duracao <= 0:
        print('  não consegui medir a duração do vídeo.')
        return None
    titulo = info.get('title') or 'Vídeo'
    canal = info.get('uploader') or info.get('channel') or ''

    print('  medindo os sinais...')
    reprise = sinal_reprise(info, duracao)
    energia = sinal_energia(ffmpeg, video, duracao)
    falas = ler_srt(srt_geral) if srt_geral else []
    print('    curva de mais revisto: %s' % ('sim' if reprise else 'este vídeo não tem'))
    print('    picos de áudio: %s' % ('sim' if energia else 'não consegui medir'))
    print('    legenda: %d fala(s)' % len(falas))

    escolhidos = escolher({'duracao': duracao, 'reprise': reprise,
                           'energia': energia, 'falas': falas},
                          {'quantos': pedido.get('quantos', 5),
                           'dur': pedido.get('duracao', 60),
                           'sinais': pedido.get('sinais')})
    if not escolhidos:
        print('  o vídeo é mais curto que a duração pedida para cada corte.')
        return None

    destino = os.path.join(SAIDA, 'cortes-' + vid)
    os.makedirs(destino, exist_ok=True)
    prontos = []
    for c in escolhidos:
        nome = '%02d-%s.mp4' % (c['n'], limpo(c['fala'] or titulo))
        alvo = os.path.join(destino, nome)
        srt_corte = os.path.join(pasta_tmp, 'corte-%02d.srt' % c['n'])
        tem_leg = escrever_srt(falas, c['ini'], c['fim'], srt_corte) if (falas and pedido.get('legenda', True)) else False
        print('  corte %d/%d — %02d:%02d, nota %.1f' %
              (c['n'], len(escolhidos), c['ini'] // 60, c['ini'] % 60, c['nota']))
        ok, erro = cortar(ffmpeg, video, c['ini'], c['dur'],
                          srt_corte if tem_leg else None, alvo, pedido.get('formato', '9:16'))
        if not ok:
            print('    falhou: ' + (erro.strip().splitlines()[-1] if erro.strip() else 'motivo desconhecido'))
            continue
        item = dict(c)
        item['arquivo'] = nome
        prontos.append(item)

    manifesto = {
        'tipo': 'cortes', 'versao': 1,
        'videoId': vid, 'titulo': titulo, 'canal': canal,
        'canalId': pedido.get('canalId'),
        'pasta': destino,
        'autorizacao': pedido.get('autorizacao'),
        'cortes': prontos,
    }
    with open(os.path.join(destino, 'manifesto.json'), 'w', encoding='utf-8') as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=1)
    return destino, len(prontos)


def main():
    # modo de conferência, usado pelo teste que compara com o sistema
    if len(sys.argv) >= 3 and sys.argv[1] == '--escolher':
        with open(sys.argv[2], 'r', encoding='utf-8') as f:
            entrada = json.load(f)
        print(json.dumps(escolher(entrada.get('sinais'), entrada.get('opcoes')),
                         ensure_ascii=False))
        return 0

    for p in (PEDIDOS, SAIDA, TEMP):
        os.makedirs(p, exist_ok=True)

    ytdlp = achar('yt-dlp')
    ffmpeg = achar('ffmpeg')
    if not ytdlp or not ffmpeg:
        print('Faltam ferramentas. Rode pelo FAZER-CORTES.bat, que baixa tudo sozinho.')
        return 1

    pedidos = sorted(a for a in os.listdir(PEDIDOS) if a.lower().endswith('.json'))
    if not pedidos:
        print('Nenhum pedido na pasta "pedidos".')
        print('No sistema: Canais de Vídeo → Cortes → Gerar o pedido.')
        return 1

    for nome in pedidos:
        caminho = os.path.join(PEDIDOS, nome)
        try:
            with open(caminho, 'r', encoding='utf-8') as f:
                pedido = json.load(f)
        except (OSError, ValueError):
            print('Não consegui ler ' + nome + ' — pulei.')
            continue
        if pedido.get('tipo') != 'cortes':
            print(nome + ' não é um pedido de cortes — pulei.')
            continue
        print('\n=== ' + nome)
        aut = pedido.get('autorizacao') or {}
        if aut.get('quem'):
            print('  autorizado por: ' + aut['quem'])
        r = fazer(pedido, ytdlp, ffmpeg)
        if r:
            destino, n = r
            print('  PRONTO: %d corte(s) em %s' % (n, destino))
            try:
                os.rename(caminho, caminho + '.feito')
            except OSError:
                pass
    return 0


if __name__ == '__main__':
    sys.exit(main())

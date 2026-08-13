# -*- coding: utf-8 -*-
"""
=============================================================================
 FÁBRICA DE VÍDEO DA JeV — monta o vídeo no seu computador, sem crédito
-----------------------------------------------------------------------------
 Lê o roteiro exportado pelo sistema (pasta roteiros/), pega as fotos do
 produto (pasta fotos/), gera a narração em português com IA local, monta as
 cenas no ritmo da narração, queima as legendas, mistura a trilha e exporta
 nos formatos de cada plataforma (pasta saida/).

 Nada é enviado para a internet: o áudio e o vídeo são gerados aqui.
=============================================================================
"""
import json, os, re, subprocess, sys, shutil, wave, contextlib, unicodedata

AQUI      = os.path.dirname(os.path.abspath(__file__))
ROTEIROS  = os.path.join(AQUI, 'roteiros')
FOTOS     = os.path.join(AQUI, 'fotos')
TRILHAS   = os.path.join(AQUI, 'trilhas')
SAIDA     = os.path.join(AQUI, 'saida')
TEMP      = os.path.join(AQUI, 'temp')
FERR      = os.path.join(AQUI, 'ferramentas')

FORMATOS = {
    '9:16':  (1080, 1920, 'vertical'),
    '16:9':  (1920, 1080, 'horizontal'),
    '1:1':   (1080, 1080, 'quadrado'),
}
IMAGENS = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')
AUDIOS  = ('.mp3', '.m4a', '.wav', '.ogg', '.aac')


VIDEOS  = ('.mp4', '.mov', '.m4v', '.webm', '.mkv')


# --------------------------------------------------------------- utilidades
def diz(*a):
    print(*a, flush=True)


def passo(pct, texto):
    """Linha que o aplicativo lê para mover a barra de progresso.
       Quem roda pelo .bat também entende, porque o texto vem junto."""
    print('PROGRESSO %d %s' % (max(0, min(100, int(pct))), texto), flush=True)


def usar_pastas(base):
    """Trabalhar dentro de uma pasta que o aplicativo preparou, em vez das
       pastas fixas ao lado do programa. É isto que permite montar o vídeo
       de dentro do sistema, sem ninguém arrastar arquivo para lugar nenhum."""
    global ROTEIROS, FOTOS, TRILHAS, SAIDA, TEMP
    ROTEIROS = os.path.join(base, 'roteiro')
    FOTOS    = os.path.join(base, 'midia')
    TRILHAS  = os.path.join(base, 'trilha')
    SAIDA    = os.path.join(base, 'saida')
    TEMP     = os.path.join(base, 'temp')
    for p in (ROTEIROS, FOTOS, TRILHAS, SAIDA, TEMP):
        os.makedirs(p, exist_ok=True)


def achar(nome, *pastas):
    """Procura um executável nas pastas de ferramentas e depois no PATH."""
    exe = nome + ('.exe' if os.name == 'nt' else '')
    for p in pastas:
        if not p or not os.path.isdir(p):
            continue
        for raiz, _, arquivos in os.walk(p):
            if exe in arquivos:
                return os.path.join(raiz, exe)
    return shutil.which(nome)


def pastas_de_ferramentas():
    """Onde procurar o FFmpeg e a voz.

       Rodando pelo .bat, é a pasta 'ferramentas' aqui do lado. Mas quando quem
       chama é o APLICATIVO, a fábrica mora dentro do programa (em Arquivos de
       Programas) e as ferramentas moram na pasta de dados do usuário — dois
       lugares completamente diferentes. Por isso o aplicativo diz, pelo
       ambiente, exatamente onde ele guardou as coisas. Sem isso a fábrica
       procurava no lugar errado e reclamava que faltava o FFmpeg."""
    ps = [FERR]
    for p in (os.environ.get('JEV_FERRAMENTAS') or '').split(os.pathsep):
        if p.strip():
            ps.append(p.strip())
    return ps


FFMPEG  = None
FFPROBE = None
PIPER   = None
VOZ     = None


def preparar_ferramentas():
    global FFMPEG, FFPROBE, PIPER, VOZ
    ps = pastas_de_ferramentas()
    # o caminho que o aplicativo mandou vale mais que qualquer procura
    FFMPEG  = os.environ.get('JEV_FFMPEG')  or achar('ffmpeg',  *ps)
    FFPROBE = os.environ.get('JEV_FFPROBE') or achar('ffprobe', *ps)
    PIPER   = os.environ.get('JEV_PIPER')   or achar('piper',   *ps)
    VOZ     = os.environ.get('JEV_VOZ') or None
    if not VOZ:
        for base in ps:
            if not base or not os.path.isdir(base):
                continue
            for raiz, _, arqs in os.walk(base):
                for a in arqs:
                    if a.endswith('.onnx'):
                        VOZ = os.path.join(raiz, a)
                        break
                if VOZ:
                    break
            if VOZ:
                break
    if not FFMPEG or not FFPROBE:
        diz('ERRO: não encontrei o FFmpeg.')
        diz('Procurei em: ' + ' · '.join(p for p in ps if p))
        diz('Pelo aplicativo: clique em instalar as ferramentas.')
        diz('Pelo .bat: rode o MONTAR-VIDEO.bat, que ele baixa sozinho.')
        sys.exit(1)


def rodar(args, entrada=None):
    r = subprocess.run(args, input=entrada, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE)
    if r.returncode != 0:
        diz('\n--- o FFmpeg reclamou ---')
        diz(r.stderr.decode('utf-8', 'ignore')[-1500:])
        raise RuntimeError('falhou: ' + ' '.join(str(x) for x in args[:6]))
    return r


def duracao(caminho):
    r = subprocess.run([FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'default=nw=1:nk=1', caminho],
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        return float(r.stdout.decode().strip())
    except Exception:
        return 0.0


def tem_nvidia():
    """Só vale se a placa REALMENTE codificar: aparecer na lista de encoders não
       basta — sem driver, o FFmpeg lista mas falha na hora de usar. Então
       fazemos um teste de verdade, com um quadro preto."""
    try:
        r = subprocess.run([FFMPEG, '-hide_banner', '-encoders'],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if b'h264_nvenc' not in r.stdout:
            return False
        t = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error',
                            '-f', 'lavfi', '-i', 'color=black:s=256x256:d=0.1',
                            '-frames:v', '1', '-c:v', 'h264_nvenc', '-f', 'null', '-'],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        return t.returncode == 0
    except Exception:
        return False


# --------------------------------------------------------------- narração
def estimar_segundos(texto):
    """Sem TTS, estima pela contagem de palavras: ~2,6 palavras por segundo."""
    n = len([p for p in re.split(r'\s+', texto.strip()) if p])
    return max(2.0, round(n / 2.6, 2))


def narrar(texto, destino):
    """Gera o WAV da narração. Devolve (caminho, usou_ia)."""
    texto = texto.strip()
    if PIPER and VOZ and texto:
        try:
            with open(destino, 'wb') as _:
                pass
            r = subprocess.run([PIPER, '--model', VOZ, '--output_file', destino],
                               input=texto.encode('utf-8'),
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if r.returncode == 0 and os.path.exists(destino) and os.path.getsize(destino) > 1000:
                return destino, True
        except Exception as e:
            diz('   (a narração por IA falhou: %s — seguindo com silêncio)' % e)
    # silêncio com a duração estimada, para você dublar depois
    seg = estimar_segundos(texto)
    rodar([FFMPEG, '-y', '-f', 'lavfi', '-i',
           'anullsrc=channel_layout=mono:sample_rate=22050',
           '-t', str(seg), destino])
    return destino, False


# --------------------------------------------------------------- legendas
def hms(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return '%d:%02d:%05.2f' % (h, m, s)


def escrever_legendas(cenas, largura, altura, caminho):
    """Legenda em blocos curtos, distribuída dentro de cada cena."""
    tamanho = int(altura * 0.045)
    margem  = int(altura * 0.16)
    cab = (
        '[Script Info]\nScriptType: v4.00+\nWrapStyle: 0\n'
        'PlayResX: %d\nPlayResY: %d\nScaledBorderAndShadow: yes\n\n'
        '[V4+ Styles]\n'
        'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,'
        'Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,'
        'Alignment,MarginL,MarginR,MarginV,Encoding\n'
        'Style: JeV,Arial,%d,&H00FFFFFF,&H00FFFFFF,&H00202020,&H90000000,'
        '-1,0,0,0,100,100,0,0,3,%d,0,2,60,60,%d,1\n\n'
        '[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n'
    ) % (largura, altura, tamanho, max(3, tamanho // 12), margem)

    linhas = []
    for c in cenas:
        txt = re.sub(r'\s+', ' ', str(c.get('fala', ''))).strip()
        if not txt:
            continue
        palavras = txt.split(' ')
        blocos, atual = [], []
        for p in palavras:
            atual.append(p)
            if len(' '.join(atual)) >= 34:
                blocos.append(' '.join(atual)); atual = []
        if atual:
            blocos.append(' '.join(atual))
        if not blocos:
            continue
        passo = c['dur'] / len(blocos)
        for i, b in enumerate(blocos):
            ini = c['ini'] + i * passo
            fim = min(c['ini'] + c['dur'], ini + passo)
            b = b.replace('{', '(').replace('}', ')').replace('\\', '/')
            linhas.append('Dialogue: 0,%s,%s,JeV,,0,0,0,,%s' % (hms(ini), hms(fim), b))

    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(cab + '\n'.join(linhas) + '\n')


# ------------------------------------------------------- de onde vem a imagem
def codec(nvenc):
    return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'] if nvenc \
        else ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21']


def ler_midia(pasta):
    """Fotos e vídeos que o sistema colocou aqui. O vídeo do produto entra
       como fonte de recorte: cada cena pega um pedaço diferente dele."""
    fontes = []
    if not os.path.isdir(pasta):
        return fontes
    for a in sorted(os.listdir(pasta)):
        c = os.path.join(pasta, a)
        if not os.path.isfile(c):
            continue
        ext = os.path.splitext(a)[1].lower()
        if ext in IMAGENS:
            fontes.append({'tipo': 'foto', 'caminho': c})
        elif ext in VIDEOS:
            d = duracao(c)
            if d > 0.5:
                fontes.append({'tipo': 'video', 'caminho': c, 'dur': d})
    return fontes


def animar_com_ia(fontes):
    """Quando o dono liga a IA de vídeo do PC dele, cada FOTO vira um clipe
       curto com movimento. A foto continua sendo o primeiro quadro, então o
       produto não muda de cara — a IA só inventa os quadros seguintes.

       Se a IA não estiver ligada, ou não couber na máquina, esta função não
       faz nada e devolve as fontes como estavam. Ela nunca derruba a
       montagem: um vídeo com foto parada é melhor que nenhum vídeo."""
    if os.environ.get('JEV_IA') not in ('1', 'sim', 'true'):
        return fontes

    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import ia_local
    except Exception as erro:
        diz('   AVISO: não consegui carregar a IA local (%s). Sigo sem ela.' % erro)
        return fontes

    e = ia_local.estado()
    if not e.get('pronto'):
        diz('   AVISO: a IA de vídeo local não está pronta. %s' % e.get('motivo', ''))
        diz('   O vídeo sai do mesmo jeito, com as fotos paradas e o movimento de câmera.')
        return fontes

    fotos = [f for f in fontes if f['tipo'] == 'foto']
    if not fotos:
        return fontes

    diz('\n   IA de vídeo local: animando %d foto(s) na placa %s'
        % (len(fotos), e.get('placa', '')))
    if e.get('apertado'):
        diz('   (a memória da placa está apertada — vai funcionar, mas devagar)')

    saida = os.path.join(TEMP, 'ia')
    os.makedirs(saida, exist_ok=True)
    novas, animadas = [], 0
    for i, f in enumerate(fontes):
        if f['tipo'] != 'foto':
            novas.append(f)
            continue
        destino = os.path.join(saida, 'ia_%02d.mp4' % i)
        passo(3 + 4.0 * (i + 1) / max(1, len(fontes)),
              'IA animando a foto %d de %d' % (animadas + 1, len(fotos)))
        try:
            r = ia_local.animar(f['caminho'], destino, 4.0)
        except Exception as erro:
            r = {'ok': False, 'motivo': str(erro)}
        if r.get('ok') and os.path.isfile(destino):
            d = duracao(destino)
            if d > 0.5:
                novas.append({'tipo': 'video', 'caminho': destino, 'dur': d})
                animadas += 1
                diz('   foto %d virou clipe de %.1fs' % (i + 1, d))
                continue
        diz('   foto %d não animou (%s) — entra parada mesmo'
            % (i + 1, r.get('motivo', 'sem motivo')))
        novas.append(f)

    diz('   %d de %d foto(s) viraram clipe.' % (animadas, len(fotos)))
    return novas


def plano_de_cenas(fontes, cenas):
    """Decide a fonte de cada cena antes de montar nada.

       O vídeo do vendedor vem na frente, sempre. Ele é o único material que
       já mostra uma PESSOA usando o produto: a foto mostra o produto parado
       em cima da mesa e o fundo liso não mostra nada. Então as cenas são
       preenchidas nesta ordem — recortes do vídeo enquanto houver pedaço
       novo para mostrar, depois as fotos, e o fundo liso só quando não
       chegou material nenhum aqui.

       Quando a mesma fonte é um vídeo usado mais de uma vez, os recortes são
       espalhados ao longo dele, assim duas cenas não mostram o mesmo pedaço."""
    if not fontes:
        return [{'tipo': 'carta'} for _ in cenas]

    videos = [f for f in fontes if f['tipo'] == 'video']
    fotos = [f for f in fontes if f['tipo'] == 'foto']

    segs = [float(c.get('dur') or 5) for c in cenas]
    media = max(1.0, sum(segs) / max(1, len(segs)))

    # quantos recortes DIFERENTES cada vídeo consegue dar sem repetir pedaço
    sobra = {}
    for k, f in enumerate(videos):
        sobra[k] = max(1, int(float(f.get('dur') or 0) // media))

    # reveza entre os vídeos: um clipe longo não pode engolir o outro
    vagas = []
    while len(vagas) < len(cenas) and any(sobra[k] > 0 for k in sobra):
        for k, f in enumerate(videos):
            if sobra[k] > 0 and len(vagas) < len(cenas):
                vagas.append(f)
                sobra[k] -= 1

    plano = []
    for i in range(len(cenas)):
        if i < len(vagas):
            plano.append(dict(vagas[i]))
        elif fotos:
            plano.append(dict(fotos[(i - len(vagas)) % len(fotos)]))
        elif videos:
            # sem foto nenhuma: repetir o vídeo ainda é melhor que fundo liso
            plano.append(dict(videos[i % len(videos)]))
        else:
            plano.append({'tipo': 'carta'})

    for f in videos:
        usos = [i for i, p in enumerate(plano) if p.get('caminho') == f['caminho']]
        for k, i in enumerate(usos):
            seg = float(cenas[i].get('dur') or 5)
            folga = max(0.0, f['dur'] - seg)
            plano[i]['ini'] = round(folga * (k / (len(usos) - 1)), 2) if len(usos) > 1 \
                else round(folga / 2.0, 2)
    return plano


def render_cena_video(fonte, audio, seg, larg, alt, destino, nvenc):
    """Recorta um pedaço do vídeo do produto e encaixa na cena."""
    vf = ('scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,'
          'fps=30,format=yuv420p' % (larg, alt, larg, alt))
    entrada = ['-ss', '%.2f' % float(fonte.get('ini') or 0), '-i', fonte['caminho']] \
        if float(fonte.get('dur') or 0) >= seg \
        else ['-stream_loop', '-1', '-i', fonte['caminho']]
    rodar([FFMPEG, '-y', *entrada, '-i', audio, '-vf', vf, '-af', 'apad',
           '-t', '%.3f' % seg, '-map', '0:v:0', '-map', '1:a:0',
           *codec(nvenc), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
           '-ar', '44100', '-ac', '2', destino])


def render_cena_carta(audio, seg, larg, alt, destino, nvenc):
    """Sem foto e sem vídeo, a cena vira um fundo liso da JeV. A mensagem
       continua legível porque a legenda queimada entra por cima."""
    rodar([FFMPEG, '-y', '-f', 'lavfi', '-i',
           'color=c=0x0E2A20:s=%dx%d:r=30' % (larg, alt),
           '-i', audio, '-af', 'apad', '-t', '%.3f' % seg,
           *codec(nvenc), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
           '-ar', '44100', '-ac', '2', destino])


# --------------------------------------------------------------- montagem
def render_cena(foto, audio, seg, larg, alt, destino, nvenc, indice):
    frames = max(2, int(seg * 30))
    zoom_in = (indice % 2 == 0)
    z = ("min(zoom+0.0004,1.10)" if zoom_in else "if(lte(zoom,1.0),1.10,max(1.001,zoom-0.0004))")
    vf = (
        "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,"
        "zoompan=z='%s':d=%d:s=%dx%d:fps=30,format=yuv420p"
        % (larg, alt, larg, alt, z, frames, larg, alt)
    )
    cod = ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'] if nvenc \
        else ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21']
    # apad completa o áudio até o fim da cena: é o respiro entre uma fala e outra.
    # Sem isso, o -t seria cortado pelo áudio mais curto e o vídeo encolheria.
    rodar([FFMPEG, '-y', '-loop', '1', '-framerate', '30', '-i', foto,
           '-i', audio, '-vf', vf, '-af', 'apad', '-t', '%.3f' % seg,
           *cod, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
           '-ar', '44100', '-ac', '2', destino])


def montar(roteiro, fontes, trilha, formatos, nvenc):
    titulo = re.sub(r'[^\w\- ]+', '', roteiro.get('titulo', 'video')).strip()[:60] or 'video'
    cenas = roteiro.get('cenas', [])
    if not cenas:
        diz('ERRO: o roteiro não tem cenas.'); return []

    os.makedirs(TEMP, exist_ok=True)
    passo(5, 'gerando a narração')
    diz('\n1) Gerando a narração de %d cena(s)…' % len(cenas))
    usou_ia = False
    t = 0.0
    for i, c in enumerate(cenas):
        wav = os.path.join(TEMP, 'narr_%02d.wav' % i)
        texto = str(c.get('fala', '')).strip()
        _, ia = narrar(texto, wav)
        usou_ia = usou_ia or ia
        d = duracao(wav)
        if d <= 0.3:
            d = estimar_segundos(texto)
        c['wav'] = wav
        c['dur'] = round(d + 0.35, 3)      # respiro entre as cenas
        c['ini'] = round(t, 3)
        t += c['dur']
        diz('   cena %d — %.1fs %s' % (i + 1, c['dur'], '(voz de IA)' if ia else '(silêncio para dublar)'))
    total = t
    diz('   duração final: %.1f segundos' % total)
    if not usou_ia:
        diz('   AVISO: a voz de IA não estava disponível — o vídeo sai mudo, com os tempos certos.')

    plano = plano_de_cenas(fontes, cenas)
    quantos = {'foto': 0, 'video': 0, 'carta': 0}
    for p in plano:
        quantos[p['tipo']] = quantos.get(p['tipo'], 0) + 1
    diz('   cenas por recorte de vídeo: %d · por foto: %d · em fundo liso: %d'
        % (quantos['video'], quantos['foto'], quantos['carta']))
    if quantos['carta'] == len(plano):
        diz('   AVISO: nenhuma foto ou vídeo do produto chegou até aqui, então o')
        diz('   vídeo sai só com texto no fundo. Lojas como o TikTok Shop não')
        diz('   deixam a gente ler a página sozinho. No sistema, use o botão')
        diz('   "Materiais do produto" e aponte o vídeo que você baixou no painel')
        diz('   do vendedor — é ele que mostra a pessoa usando o produto.')
    elif not quantos['video']:
        diz('   AVISO: veio foto, mas nenhum vídeo. Foto mostra o produto parado;')
        diz('   quem mostra a pessoa usando é o vídeo do anúncio. Baixe o vídeo no')
        diz('   painel do vendedor e aponte em "Materiais do produto".')

    saidas = []
    # a barra anda de 10 a 95: cada formato tem a sua faixa, e dentro dela
    # as cenas ocupam quatro quintos e o fechamento o resto
    faixa = 85.0 / max(1, len(formatos))
    for idx, fmt in enumerate(formatos):
        inicio = 10.0 + faixa * idx
        larg, alt, nome = FORMATOS[fmt]
        diz('\n2) Montando o formato %s (%s)…' % (fmt, nome))
        lista = os.path.join(TEMP, 'lista_%s.txt' % nome)
        with open(lista, 'w', encoding='utf-8') as f:
            for i, c in enumerate(cenas):
                dest = os.path.join(TEMP, 'cena_%s_%02d.mp4' % (nome, i))
                fonte = plano[i]
                if fonte['tipo'] == 'video':
                    render_cena_video(fonte, c['wav'], c['dur'], larg, alt, dest, nvenc)
                elif fonte['tipo'] == 'foto':
                    render_cena(fonte['caminho'], c['wav'], c['dur'], larg, alt, dest, nvenc, i)
                else:
                    render_cena_carta(c['wav'], c['dur'], larg, alt, dest, nvenc)
                f.write("file '%s'\n" % dest.replace('\\', '/').replace("'", "'\\''"))
                passo(inicio + faixa * 0.8 * (i + 1) / len(cenas),
                      'montando %s — cena %d de %d' % (nome, i + 1, len(cenas)))
                diz('   cena %d de %d' % (i + 1, len(cenas)))

        bruto = os.path.join(TEMP, 'bruto_%s.mp4' % nome)
        rodar([FFMPEG, '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', bruto])

        ass = os.path.join(TEMP, 'legendas_%s.ass' % nome)
        escrever_legendas(cenas, larg, alt, ass)

        os.makedirs(SAIDA, exist_ok=True)
        final = os.path.join(SAIDA, '%s - %s.mp4' % (titulo, nome))
        cod = ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'] if nvenc \
            else ['-c:v', 'libx264', '-preset', 'medium', '-crf', '21']

        # o filtro de legenda precisa de caminho simples: rodamos dentro da pasta temp
        rel_ass = os.path.basename(ass)
        if trilha:
            filtro = ("[0:v]subtitles=%s[v];"
                      "[1:a]volume=0.10,aloop=loop=-1:size=2e9[m];"
                      "[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]") % rel_ass
            args = [FFMPEG, '-y', '-i', bruto, '-i', trilha, '-filter_complex', filtro,
                    '-map', '[v]', '-map', '[a]']
        else:
            args = [FFMPEG, '-y', '-i', bruto, '-vf', 'subtitles=' + rel_ass]
        args += [*cod, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                 '-movflags', '+faststart', final]
        subprocess.run(args, cwd=TEMP, check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        saidas.append(final)
        passo(inicio + faixa, 'fechando o ' + nome)
        diz('   pronto: %s' % os.path.basename(final))

    # a legenda de publicação vai junto, para colar na plataforma
    if roteiro.get('legenda'):
        with open(os.path.join(SAIDA, '%s - legenda.txt' % titulo), 'w', encoding='utf-8') as f:
            f.write(roteiro['legenda'])
            if roteiro.get('hashtags'):
                f.write('\n\n' + ' '.join(roteiro['hashtags']))
    return saidas


# --------------------------------------------------------------- principal
def principal():
    # Modo "trabalho": o aplicativo preparou uma pasta com tudo dentro e
    # quer o vídeo montado ali mesmo. Ninguém arrasta arquivo nenhum.
    trabalho = None
    if len(sys.argv) >= 3 and sys.argv[1] == '--trabalho':
        trabalho = sys.argv[2]
        usar_pastas(trabalho)

    diz('=' * 62)
    diz(' FÁBRICA DE VÍDEO DA JeV')
    diz('=' * 62)
    passo(1, 'conferindo as ferramentas')
    preparar_ferramentas()
    for p in (ROTEIROS, FOTOS, TRILHAS, SAIDA):
        os.makedirs(p, exist_ok=True)

    roteiros = sorted([os.path.join(ROTEIROS, a) for a in os.listdir(ROTEIROS)
                       if a.lower().endswith('.json')],
                      key=os.path.getmtime, reverse=True)
    if not roteiros:
        diz('\nNão achei nenhum roteiro na pasta "roteiros".')
        diz('No sistema, vá em Canais de Vídeo -> Gerar vídeo, monte o vídeo e clique')
        diz('em "Baixar para a fábrica". Depois coloque o arquivo baixado nessa pasta.')
        return 1
    # utf-8-sig: aceita o arquivo com ou sem BOM, venha de onde vier
    with open(roteiros[0], encoding='utf-8-sig') as f:
        roteiro = json.load(f)
    diz('\nRoteiro: %s' % roteiro.get('titulo', '(sem título)'))

    fontes = ler_midia(FOTOS)
    fontes = animar_com_ia(fontes)
    fotos = [f for f in fontes if f['tipo'] == 'foto']
    videos = [f for f in fontes if f['tipo'] == 'video']
    if not fontes and not trabalho:
        diz('\nNão achei nenhuma foto na pasta "fotos".')
        diz('Coloque ali as fotos do produto (jpg ou png). Elas entram na ordem do nome:')
        diz('1.jpg, 2.jpg, 3.jpg… Se houver menos fotos que cenas, elas se repetem.')
        return 1
    diz('Fotos: %d · vídeos do produto: %d' % (len(fotos), len(videos)))
    if not fontes:
        diz('Sem foto e sem vídeo: as cenas saem em fundo liso, com a legenda por cima.')

    trilha = None
    if os.path.isdir(TRILHAS):
        cand = sorted([os.path.join(TRILHAS, a) for a in os.listdir(TRILHAS)
                       if a.lower().endswith(AUDIOS)])
        trilha = cand[0] if cand else None
    diz('Trilha: %s' % (os.path.basename(trilha) if trilha else 'nenhuma (sem música)'))

    nvenc = tem_nvidia()
    diz('Placa NVIDIA: %s' % ('sim — usando aceleração de hardware' if nvenc else 'não detectada'))
    diz('Voz de IA: %s' % ('sim' if (PIPER and VOZ) else 'não instalada'))

    fmt_rot = str(roteiro.get('formato', '9:16'))
    principal_fmt = '9:16' if '9:16' in fmt_rot else ('16:9' if '16:9' in fmt_rot else '1:1')
    formatos = [principal_fmt]
    for f in ('9:16', '16:9', '1:1'):
        if f not in formatos:
            formatos.append(f)

    saidas = montar(roteiro, fontes, trilha, formatos, nvenc)
    if saidas:
        diz('\n' + '=' * 62)
        diz(' PRONTO — %d arquivo(s) na pasta "saida":' % len(saidas))
        for s in saidas:
            diz('   ' + os.path.basename(s))
        diz('\n O texto para colar em cada plataforma está no sistema,')
        diz(' na aba Publicar. A legenda base também foi salva em saida/.')
        diz('=' * 62)
        passo(100, 'pronto')
        # linha que o aplicativo lê para saber quais arquivos apareceram
        print('ARQUIVOS ' + json.dumps(saidas, ensure_ascii=False), flush=True)
    try:
        shutil.rmtree(TEMP, ignore_errors=True)
    except Exception:
        pass
    return 0


if __name__ == '__main__':
    try:
        sys.exit(principal())
    except KeyboardInterrupt:
        diz('\nCancelado.')
        sys.exit(1)
    except Exception as e:
        diz('\nDeu problema: %s' % e)
        diz('Me mande esta mensagem que eu resolvo.')
        sys.exit(1)

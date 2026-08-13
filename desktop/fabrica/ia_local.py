# -*- coding: utf-8 -*-
"""IA de vídeo rodando no computador do dono.

O QUE ESTA PEÇA FAZ E O QUE ELA NÃO FAZ
---------------------------------------
Ela NÃO inventa uma pessoa. Modelo grátis rodando em PC de casa, quando você
manda "uma mulher segurando o Kit Coala", desenha uma mulher qualquer segurando
um vidro que PARECE o produto — rótulo torto, nome errado, formato diferente.
Isso não vende: quem clica no link vê outro produto e sai.

O que ela FAZ é o contrário, e funciona: pega uma FOTO DE VERDADE (a foto do
anúncio, onde a pessoa já está com o produto na mão) e põe aquela foto em
movimento. O primeiro quadro é a foto real, então o produto continua sendo o
produto — a IA só cria os quadros seguintes. É o mesmo caminho que os aplicativos
pagos chamam de "image to video", e é o único jeito honesto de fazer isso de
graça, no seu computador.

PRECISA DE PLACA DE VÍDEO NVIDIA. Sem ela, esta peça se recusa a rodar e diz
por quê, em vez de travar o computador por meia hora e entregar nada.

Uso:
    python3 ia_local.py --estado
    python3 ia_local.py --animar foto.jpg saida.mp4 --segundos 4
"""
import json
import os
import shutil
import subprocess
import sys

# Abaixo disso o modelo não cabe na placa e o computador começa a usar o disco
# como se fosse memória — trava tudo e não termina nunca.
VRAM_MINIMA_GB = 8.0
VRAM_FOLGADA_GB = 12.0

MODELO = 'Lightricks/LTX-Video'   # 2 bilhões de parâmetros, licença aberta
PACOTES = ['torch', 'diffusers', 'transformers', 'accelerate', 'imageio', 'imageio-ffmpeg']


def pasta_modelos():
    """Onde os pesos do modelo ficam. Junto das outras ferramentas nossas,
       não espalhados pelo computador do dono."""
    d = os.environ.get('JEV_IA_MODELOS')
    if d:
        return d
    for p in (os.environ.get('JEV_FERRAMENTAS') or '').split(os.pathsep):
        if p.strip():
            return os.path.join(p.strip(), 'ia-modelos')
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ferramentas', 'ia-modelos')


def placas():
    """Pergunta ao driver da NVIDIA o que existe na máquina. Não depende de
       ter instalado nada nosso ainda — é o primeiro exame, o mais barato."""
    exe = shutil.which('nvidia-smi')
    if not exe:
        return []
    try:
        r = subprocess.run([exe, '--query-gpu=name,memory.total',
                            '--format=csv,noheader,nounits'],
                           capture_output=True, text=True, timeout=25)
    except Exception:
        return []
    if r.returncode != 0:
        return []
    achadas = []
    for linha in (r.stdout or '').strip().splitlines():
        partes = [x.strip() for x in linha.split(',')]
        if len(partes) < 2:
            continue
        try:
            mb = float(partes[1])
        except ValueError:
            continue
        achadas.append({'nome': partes[0], 'vram_gb': round(mb / 1024.0, 1)})
    return achadas


def tem_pacote(nome):
    mod = {'imageio-ffmpeg': 'imageio_ffmpeg'}.get(nome, nome)
    try:
        __import__(mod)
        return True
    except Exception:
        return False


def modelo_baixado():
    d = pasta_modelos()
    if not os.path.isdir(d):
        return False
    # o pipeline salvo tem sempre esse arquivo de descrição no topo
    return os.path.isfile(os.path.join(d, 'model_index.json'))


def estado():
    gpus = placas()
    melhor = max(gpus, key=lambda g: g['vram_gb']) if gpus else None
    faltando = [p for p in PACOTES if not tem_pacote(p)]
    baixado = modelo_baixado()

    e = {
        'placa': melhor['nome'] if melhor else '',
        'vram_gb': melhor['vram_gb'] if melhor else 0.0,
        'pacotes': not faltando,
        'faltando': faltando,
        'modelo': baixado,
        'pasta_modelos': pasta_modelos(),
        'pronto': False,
        'pode_instalar': False,
        'apertado': False,
        'motivo': ''
    }

    if not gpus:
        e['motivo'] = ('Não achei placa de vídeo NVIDIA neste computador. A IA de vídeo '
                       'local só roda em NVIDIA — nas outras, ela levaria horas por clipe '
                       'e travaria a máquina. O caminho que funciona aqui é usar o vídeo '
                       'do anúncio, que já mostra a pessoa com o produto.')
        return e
    if melhor['vram_gb'] < VRAM_MINIMA_GB:
        e['motivo'] = ('A placa %s tem %.1f GB de memória e o modelo precisa de pelo menos '
                       '%.0f GB. Abaixo disso ele não cabe: o computador começa a usar o '
                       'disco no lugar da memória, trava e não termina.'
                       % (melhor['nome'], melhor['vram_gb'], VRAM_MINIMA_GB))
        return e

    e['pode_instalar'] = True
    e['apertado'] = melhor['vram_gb'] < VRAM_FOLGADA_GB
    if faltando:
        e['motivo'] = 'Falta instalar: ' + ', '.join(faltando) + '.'
        return e
    if not baixado:
        e['motivo'] = 'Falta baixar o modelo de vídeo (uns 8 GB, uma vez só).'
        return e

    e['pronto'] = True
    e['motivo'] = ('Pronto. A placa %s vai animar as fotos do produto. '
                   % melhor['nome']) + \
                  ('Com %.1f GB a conta fica apertada: vai funcionar, mas devagar.'
                   % melhor['vram_gb'] if e['apertado'] else '')
    return e


# ------------------------------------------------------------------ animar
def animar(foto, destino, segundos=4.0, prompt='', semente=0):
    """Põe a foto em movimento. O primeiro quadro é a foto, sempre — é isso
       que segura o produto no lugar e impede a IA de inventar outro."""
    e = estado()
    if not e['pronto']:
        return {'ok': False, 'motivo': e['motivo']}
    if not os.path.isfile(foto):
        return {'ok': False, 'motivo': 'não achei a foto ' + foto}

    import torch                                    # noqa: E402
    from diffusers import LTXImageToVideoPipeline   # noqa: E402
    from diffusers.utils import export_to_video     # noqa: E402
    from PIL import Image                           # noqa: E402

    pipe = LTXImageToVideoPipeline.from_pretrained(pasta_modelos(), torch_dtype=torch.bfloat16)
    if e['apertado']:
        # descarrega da placa a parte que não está em uso: cabe em 8 GB, mas devagar
        pipe.enable_model_cpu_offload()
    else:
        pipe.to('cuda')

    img = Image.open(foto).convert('RGB')
    # o modelo pede lado múltiplo de 32; 704x1216 é o vertical que ele aguenta
    img = img.resize((704, 1216))

    # 24 quadros por segundo, e o modelo exige um número de quadros 8n+1
    quadros = int(round(float(segundos) * 24))
    quadros = max(9, (quadros // 8) * 8 + 1)

    texto = prompt or ('the person keeps using the product, natural gentle motion, '
                       'handheld phone camera, realistic home lighting')
    saida = pipe(
        image=img,
        prompt=texto,
        negative_prompt='deformed, distorted, warped product, extra fingers, text artifacts, blurry',
        width=704, height=1216, num_frames=quadros,
        num_inference_steps=30,
        generator=torch.Generator('cpu').manual_seed(int(semente))
    ).frames[0]

    os.makedirs(os.path.dirname(os.path.abspath(destino)) or '.', exist_ok=True)
    export_to_video(saida, destino, fps=24)
    return {'ok': True, 'arquivo': destino, 'quadros': quadros,
            'segundos': round(quadros / 24.0, 2)}


def principal():
    args = sys.argv[1:]
    if '--estado' in args:
        print(json.dumps(estado(), ensure_ascii=False))
        return 0
    if '--animar' in args:
        i = args.index('--animar')
        try:
            foto, destino = args[i + 1], args[i + 2]
        except IndexError:
            print('uso: --animar <foto> <destino.mp4> [--segundos N] [--prompt "..."]')
            return 2
        seg = 4.0
        if '--segundos' in args:
            try:
                seg = float(args[args.index('--segundos') + 1])
            except (IndexError, ValueError):
                pass
        prompt = ''
        if '--prompt' in args:
            try:
                prompt = args[args.index('--prompt') + 1]
            except IndexError:
                pass
        r = animar(foto, destino, seg, prompt)
        print(json.dumps(r, ensure_ascii=False))
        return 0 if r.get('ok') else 1

    print(__doc__)
    print(json.dumps(estado(), ensure_ascii=False, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(principal())

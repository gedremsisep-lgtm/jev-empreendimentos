# -*- coding: utf-8 -*-
"""IA de imagem → modelo 3D, rodando no computador do dono.

O QUE ESTA PEÇA FAZ
--------------------
Pega UMA FOTO (de um objeto, de preferência em fundo simples) e devolve uma
malha 3D pronta para fatiar e imprimir (.stl). Usa o TripoSR (Stability AI +
Tripo AI, código aberto, licença MIT) rodando aqui dentro — sem mandar a foto
para fora e sem gastar crédito a cada tentativa.

SEJA HONESTO COM O QUE SAI DAQUI: é um ponto de partida bom para peças
simples (bonecos, objetos redondos, produtos sem furo/vão interno fino) —
não substitui modelagem feita à mão para peças técnicas, com encaixe ou
medida exata. Sempre confira a malha antes de mandar fatiar.

PRECISA DE PLACA DE VÍDEO NVIDIA. Sem ela, esta peça se recusa a rodar e diz
por quê, em vez de travar o computador e não entregar nada.

Uso:
    python3 imagem3d.py --estado
    python3 imagem3d.py --gerar foto.jpg saida.stl [--resolucao 256]
"""
import json
import os
import shutil
import subprocess
import sys

# Abaixo disso o modelo não cabe na placa e o computador começa a usar o disco
# como se fosse memória — trava tudo e não termina nunca.
VRAM_MINIMA_GB = 6.0
VRAM_FOLGADA_GB = 10.0

MODELO = 'stabilityai/TripoSR'   # pesos do modelo, baixados do Hugging Face
PACOTES = ['torch', 'torchvision', 'transformers', 'einops', 'omegaconf',
           'trimesh', 'rembg', 'onnxruntime', 'huggingface_hub']


def pasta_modelos():
    """Onde os pesos do TripoSR ficam. Junto das outras ferramentas nossas,
       não espalhados pelo computador do dono."""
    d = os.environ.get('JEV_IMAGEM3D_MODELOS')
    if d:
        return d
    for p in (os.environ.get('JEV_FERRAMENTAS') or '').split(os.pathsep):
        if p.strip():
            return os.path.join(p.strip(), 'imagem3d-modelos')
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ferramentas', 'imagem3d-modelos')


def pasta_codigo():
    """Onde o código do TripoSR (o pacote 'tsr') foi descompactado — é
       código de terceiro, baixado uma vez, nunca copiado à mão."""
    d = os.environ.get('JEV_IMAGEM3D_CODIGO')
    if d:
        return d
    for p in (os.environ.get('JEV_FERRAMENTAS') or '').split(os.pathsep):
        if p.strip():
            return os.path.join(p.strip(), 'imagem3d-codigo')
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ferramentas', 'imagem3d-codigo')


def _raiz_tsr():
    """O zip do GitHub descompacta numa subpasta tipo TripoSR-main/ — acha
       ela, em vez de supor o nome exato (a branch pode virar 'master' um
       dia e isso não pode quebrar tudo calado)."""
    base = pasta_codigo()
    if os.path.isdir(os.path.join(base, 'tsr')):
        return base
    if not os.path.isdir(base):
        return base
    for nome in os.listdir(base):
        c = os.path.join(base, nome)
        if os.path.isdir(c) and os.path.isdir(os.path.join(c, 'tsr')):
            return c
    return base


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
    try:
        __import__(nome)
        return True
    except Exception:
        return False


def modelo_baixado():
    d = pasta_modelos()
    if not os.path.isdir(d):
        return False
    # os pesos oficiais do TripoSR vêm sempre com esses dois arquivos
    return os.path.isfile(os.path.join(d, 'model.ckpt')) and os.path.isfile(os.path.join(d, 'config.yaml'))


def codigo_baixado():
    return os.path.isdir(os.path.join(_raiz_tsr(), 'tsr'))


def estado():
    gpus = placas()
    melhor = max(gpus, key=lambda g: g['vram_gb']) if gpus else None
    faltando = [p for p in PACOTES if not tem_pacote(p)]
    pesos = modelo_baixado()
    codigo = codigo_baixado()

    e = {
        'placa': melhor['nome'] if melhor else '',
        'vram_gb': melhor['vram_gb'] if melhor else 0.0,
        'pacotes': not faltando,
        'faltando': faltando,
        'codigo': codigo,
        'modelo': pesos,
        'pasta_modelos': pasta_modelos(),
        'pronto': False,
        'pode_instalar': False,
        'apertado': False,
        'motivo': ''
    }

    if not gpus:
        e['motivo'] = ('Não achei placa de vídeo NVIDIA neste computador. Imagem → 3D local '
                       'só roda em NVIDIA — sem ela, o jeito é usar um serviço na nuvem (como '
                       'o calc3d ou a Tripo3D) para essa conversão.')
        return e
    if melhor['vram_gb'] < VRAM_MINIMA_GB:
        e['motivo'] = ('A placa %s tem %.1f GB de memória e o modelo precisa de pelo menos '
                       '%.0f GB. Abaixo disso ele não cabe: o computador começa a usar o '
                       'disco no lugar da memória, trava e não termina.'
                       % (melhor['nome'], melhor['vram_gb'], VRAM_MINIMA_GB))
        return e

    e['pode_instalar'] = True
    e['apertado'] = melhor['vram_gb'] < VRAM_FOLGADA_GB
    faltas = []
    if faltando:
        faltas.append('instalar: ' + ', '.join(faltando))
    if not codigo:
        faltas.append('baixar o código do TripoSR')
    if not pesos:
        faltas.append('baixar os pesos do modelo (uns 200 MB, uma vez só)')
    if faltas:
        e['motivo'] = 'Falta ' + '; '.join(faltas) + '.'
        return e

    e['pronto'] = True
    e['motivo'] = ('Pronto. A placa %s vai gerar o modelo 3D a partir da foto. '
                   % melhor['nome']) + \
                  ('Com %.1f GB a conta fica apertada: baixe a resolução da malha se travar.'
                   % melhor['vram_gb'] if e['apertado'] else '')
    return e


# ------------------------------------------------------------------- gerar
def gerar(foto, destino, resolucao=256):
    """Transforma a foto numa malha 3D e exporta pronta para imprimir.

    O fundo da foto é removido automaticamente (rembg) antes de entrar no
    modelo — é assim que o TripoSR consegue separar o objeto do resto da
    cena sem você precisar recortar nada na mão."""
    e = estado()
    if not e['pronto']:
        return {'ok': False, 'motivo': e['motivo']}
    if not os.path.isfile(foto):
        return {'ok': False, 'motivo': 'não achei a foto ' + foto}

    sys.path.insert(0, _raiz_tsr())
    import torch                         # noqa: E402
    import numpy as np                   # noqa: E402
    import rembg                         # noqa: E402
    from PIL import Image                # noqa: E402
    from tsr.system import TSR           # noqa: E402
    from tsr.utils import remove_background, resize_foreground  # noqa: E402

    dispositivo = 'cuda' if torch.cuda.is_available() else 'cpu'
    if dispositivo != 'cuda':
        return {'ok': False, 'motivo': 'a placa NVIDIA não respondeu ao PyTorch — reinicie e tente de novo'}

    modelo = TSR.from_pretrained(
        pasta_modelos(), config_name='config.yaml', weight_name='model.ckpt'
    )
    # tamanho do pedaço processado por vez — menor aqui segura o uso de
    # memória em placas apertadas, ao custo de um pouco mais de tempo
    modelo.renderer.set_chunk_size(8192 if not e['apertado'] else 4096)
    modelo.to(dispositivo)

    sessao = rembg.new_session()
    img = Image.open(foto).convert('RGBA')
    img = remove_background(img, sessao)
    img = resize_foreground(img, 0.85)
    arr = np.array(img).astype(np.float32) / 255.0
    # funde com um cinza neutro — é o que o modelo espera de fundo, depois
    # de recortado o objeto; fundo transparente puro confunde a geometria
    arr = arr[:, :, :3] * arr[:, :, 3:4] + (1 - arr[:, :, 3:4]) * 0.5
    img = Image.fromarray((arr * 255.0).astype('uint8'))

    with torch.no_grad():
        codigos = modelo([img], device=dispositivo)
    malhas = modelo.extract_mesh(codigos, resolution=int(resolucao or 256))
    malha = malhas[0]

    os.makedirs(os.path.dirname(os.path.abspath(destino)) or '.', exist_ok=True)
    malha.export(destino)
    return {
        'ok': True, 'arquivo': destino,
        'vertices': int(malha.vertices.shape[0]),
        'faces': int(malha.faces.shape[0]),
        'resolucao': int(resolucao or 256)
    }


def principal():
    args = sys.argv[1:]
    if '--estado' in args:
        print(json.dumps(estado(), ensure_ascii=False))
        return 0
    if '--gerar' in args:
        i = args.index('--gerar')
        try:
            foto, destino = args[i + 1], args[i + 2]
        except IndexError:
            print('uso: --gerar <foto> <destino.stl> [--resolucao 256]')
            return 2
        resolucao = 256
        if '--resolucao' in args:
            try:
                resolucao = int(args[args.index('--resolucao') + 1])
            except (IndexError, ValueError):
                pass
        try:
            r = gerar(foto, destino, resolucao)
        except Exception as ex:
            r = {'ok': False, 'motivo': 'a geração quebrou no meio: ' + str(ex)}
        print(json.dumps(r, ensure_ascii=False))
        return 0 if r.get('ok') else 1

    print(__doc__)
    print(json.dumps(estado(), ensure_ascii=False, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(principal())

/* =========================================================================
   ESTÚDIO — o aplicativo monta o vídeo sozinho, no computador do dono

   Antes, para virar roteiro em vídeo era preciso baixar um arquivo, achar a
   pasta da fábrica, arrastar para lá e dar dois cliques num .bat. Isso
   acabou. Aqui o próprio programa:

     1. instala as ferramentas (Python, FFmpeg e a voz de IA em português)
        dentro da pasta de dados dele, sem instalar nada no Windows;
     2. traz a mídia do produto — as fotos e o vídeo que o vendedor publicou;
     3. monta o vídeo chamando a fábrica, contando o progresso ao vivo;
     4. devolve os arquivos prontos para o sistema tocar na tela.

   Duas escolhas que valem explicação.

   Nada sai do computador. A narração é gerada por IA local (Piper), não por
   serviço na internet. Não gasta crédito, não tem limite e não manda o seu
   texto para servidor nenhum.

   A mídia do produto é BAIXADA, não copiada de dentro do navegador. Quem
   baixa é este arquivo, com limite de tamanho e conferindo o tipo — para o
   sistema nunca engolir um arquivo gigante ou um executável disfarçado de
   foto.
   ========================================================================= */
const { app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const WIN = process.platform === 'win32';
const EXE = WIN ? '.exe' : '';

/* limites de segurança para o que vem da internet */
const MAX_FOTO  = 25 * 1024 * 1024;
const MAX_VIDEO = 300 * 1024 * 1024;
const MAX_ITENS = 30;

/* ------------------------------------------------------------------ pastas */
function raiz() {
  const base = process.env.JEV_ESTUDIO || path.join(app.getPath('userData'), 'estudio');
  return base;
}
function pasta(...p) {
  const c = path.join(raiz(), ...p);
  fs.mkdirSync(c, { recursive: true });
  return c;
}
function ferramentas() { return pasta('ferramentas'); }

/* onde mora a fábrica: dentro do pacote do programa */
function fabricaPy() {
  const tentativas = [
    path.join(__dirname, 'fabrica', 'fabrica.py'),
    path.join(process.resourcesPath || '', 'fabrica', 'fabrica.py'),
    path.join(__dirname, '..', 'fabrica', 'fabrica.py')
  ];
  for (const t of tentativas) if (t && fs.existsSync(t)) return t;
  return tentativas[0];
}
function cortesPy() {
  return path.join(path.dirname(fabricaPy()), 'cortes.py');
}

/* --------------------------------------------------------- achar programa */
function procurarEm(dir, nome) {
  if (!fs.existsSync(dir)) return null;
  const pilha = [dir];
  while (pilha.length) {
    const d = pilha.pop();
    let itens;
    try { itens = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { continue; }
    for (const it of itens) {
      const c = path.join(d, it.name);
      if (it.isDirectory()) pilha.push(c);
      else if (it.name === nome) return c;
    }
  }
  return null;
}
function noSistema(nome) {
  const r = spawnSync(WIN ? 'where' : 'which', [nome], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const linha = String(r.stdout || '').split(/\r?\n/).find(Boolean);
  return linha ? linha.trim() : null;
}
/* procura primeiro no que nós baixamos; só depois no que a máquina já tem */
function achar(nome) {
  return procurarEm(ferramentas(), nome + EXE) || noSistema(nome);
}
function acharVoz() {
  const d = ferramentas();
  if (!fs.existsSync(d)) return null;
  const pilha = [d];
  while (pilha.length) {
    const p = pilha.pop();
    let itens;
    try { itens = fs.readdirSync(p, { withFileTypes: true }); } catch (e) { continue; }
    for (const it of itens) {
      const c = path.join(p, it.name);
      if (it.isDirectory()) pilha.push(c);
      else if (it.name.endsWith('.onnx')) return c;
    }
  }
  return null;
}

/* ------------------------------------------------- achar um Python de verdade

   O Windows vem de fábrica com uma ARMADILHA: existem arquivos chamados
   python.exe e python3.exe dentro de WindowsApps que não são o Python. São
   atalhos para a Loja da Microsoft. Quem manda rodar um deles não recebe um
   erro claro — recebe a frase "Python was not found; run without arguments to
   install from the Microsoft Store".

   Foi exatamente isso que aconteceu na primeira vez que este botão rodou numa
   máquina de verdade. O programa achou o atalho, achou que estava tudo pronto,
   e a montagem morreu com uma mensagem que não é nossa e não ajuda ninguém.

   A correção não é desviar do atalho pelo nome do caminho — é PERGUNTAR ao
   candidato se ele é Python mesmo, rodando uma linha e conferindo a resposta.
   Assim, qualquer Python quebrado por qualquer motivo é descartado do mesmo
   jeito, e o de dentro da nossa pasta continua tendo preferência.            */
const CANDIDATOS_PY = ['python3', 'python', 'py'];
let pyLembrado = null;

function pythonServe(caminho) {
  if (!caminho) return false;
  try {
    const r = spawnSync(caminho, ['-c', 'import sys;sys.stdout.write(str(sys.version_info[0]))'],
                        { encoding: 'utf8', timeout: 20000 });
    return r.status === 0 && String(r.stdout || '').trim() === '3';
  } catch (e) { return false; }
}

function acharPython(fresco) {
  if (!fresco && pyLembrado !== null) return pyLembrado;
  const vistos = new Set();
  const tentar = c => {
    if (!c || vistos.has(c)) return false;
    vistos.add(c);
    return pythonServe(c);
  };
  /* primeiro o que nós mesmos instalamos; só depois o que a máquina já tem */
  for (const n of CANDIDATOS_PY) {
    const local = procurarEm(ferramentas(), n + EXE);
    if (tentar(local)) { pyLembrado = local; return local; }
  }
  for (const n of CANDIDATOS_PY) {
    const doSistema = noSistema(n);
    if (tentar(doSistema)) { pyLembrado = doSistema; return doSistema; }
  }
  pyLembrado = '';
  return '';
}

/* o FFmpeg também é conferido de verdade, e não só pela existência do arquivo */
let ffLembrado = null;
function acharFfmpeg(fresco) {
  if (!fresco && ffLembrado !== null) return ffLembrado;
  const c = achar('ffmpeg');
  if (!c) { ffLembrado = ''; return ''; }
  try {
    const r = spawnSync(c, ['-hide_banner', '-version'], { encoding: 'utf8', timeout: 20000 });
    ffLembrado = (r.status === 0 && /ffmpeg version/i.test(String(r.stdout || ''))) ? c : '';
  } catch (e) { ffLembrado = ''; }
  return ffLembrado;
}

function esquecerFerramentas() { pyLembrado = null; ffLembrado = null; }

function estado(opcoes) {
  const fresco = !!(opcoes && opcoes.fresco);
  const py = acharPython(fresco);
  const ff = acharFfmpeg(fresco);
  const piper = achar('piper');
  const voz = acharVoz();
  return {
    pasta: raiz(),
    python: py || '',
    ffmpeg: ff || '',
    piper: piper || '',
    voz: voz || '',
    fabrica: fs.existsSync(fabricaPy()),
    pronto: !!(py && ff && fs.existsSync(fabricaPy())),
    comVoz: !!(piper && voz),
    plataforma: process.platform
  };
}

/* -------------------------------------------------------------- baixar */
function baixar(url, destino, limite, aviso) {
  return new Promise((ok, erro) => {
    const mod = url.startsWith('http://') ? http : https;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 JeV/1.0', 'Accept': '*/*' },
      timeout: 120000
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const proximo = new URL(res.headers.location, url).href;
        return baixar(proximo, destino, limite, aviso).then(ok, erro);
      }
      if (res.statusCode !== 200) { res.resume(); return erro(new Error('resposta ' + res.statusCode)); }
      const tamanho = Number(res.headers['content-length'] || 0);
      if (limite && tamanho > limite) { res.resume(); return erro(new Error('arquivo grande demais')); }
      let baixado = 0;
      const saida = fs.createWriteStream(destino);
      res.on('data', d => {
        baixado += d.length;
        if (limite && baixado > limite) {
          req.destroy(); saida.destroy();
          try { fs.unlinkSync(destino); } catch (e) {}
          return erro(new Error('arquivo grande demais'));
        }
        if (aviso && tamanho) aviso(baixado, tamanho);
      });
      res.pipe(saida);
      saida.on('finish', () => saida.close(() => ok(destino)));
      saida.on('error', erro);
    });
    req.on('timeout', () => { req.destroy(new Error('demorou demais')); });
    req.on('error', erro);
  });
}

function pegarTexto(url) {
  return new Promise((ok, erro) => {
    const mod = url.startsWith('http://') ? http : https;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 30000
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return pegarTexto(new URL(res.headers.location, url).href).then(ok, erro);
      }
      if (res.statusCode !== 200) { res.resume(); return erro(new Error('resposta ' + res.statusCode)); }
      let t = '', n = 0;
      res.setEncoding('utf8');
      res.on('data', d => { n += d.length; if (n < 4e6) t += d; });
      res.on('end', () => ok(t));
    });
    req.on('timeout', () => req.destroy(new Error('demorou demais')));
    req.on('error', erro);
  });
}

/* ------------------------------------------------ a mídia do produto
   Lê a página do produto e junta os endereços de foto e de vídeo que ela
   declara. Não é adivinhação: são as próprias marcas que a página publica
   para o WhatsApp e o Google mostrarem a prévia (og:image, og:video) e a
   ficha estruturada (JSON-LD). Onde a loja monta a vitrine só depois, por
   programa — o TikTok Shop faz isso — não vem nada, e aí o sistema diz
   para pegar os materiais no painel de afiliado em vez de inventar.      */
function extrairMidia(html, base) {
  const fotos = [], videos = [];
  const junta = (lista, u) => {
    if (!u) return;
    let limpo;
    try { limpo = new URL(String(u).replace(/&amp;/g, '&'), base).href; } catch (e) { return; }
    if (!/^https?:/i.test(limpo)) return;
    if (!lista.includes(limpo)) lista.push(limpo);
  };

  const meta = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']+)["']/gi;
  let m;
  while ((m = meta.exec(html))) {
    const chave = m[1].toLowerCase(), valor = m[2];
    if (chave === 'og:image' || chave === 'twitter:image' || chave === 'og:image:secure_url') junta(fotos, valor);
    if (chave === 'og:video' || chave === 'og:video:url' || chave === 'og:video:secure_url') junta(videos, valor);
  }
  const metaInvertida = /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']([^"']+)["']/gi;
  while ((m = metaInvertida.exec(html))) {
    const chave = m[2].toLowerCase(), valor = m[1];
    if (chave === 'og:image' || chave === 'twitter:image') junta(fotos, valor);
    if (chave === 'og:video' || chave === 'og:video:url') junta(videos, valor);
  }

  /* ficha estruturada: costuma trazer a galeria inteira, não só a capa */
  const ld = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ld.exec(html))) {
    let dado;
    try { dado = JSON.parse(m[1].trim()); } catch (e) { continue; }
    const fila = [dado];
    while (fila.length) {
      const x = fila.shift();
      if (!x || typeof x !== 'object') continue;
      if (Array.isArray(x)) { fila.push(...x); continue; }
      if (x.image) (Array.isArray(x.image) ? x.image : [x.image])
        .forEach(i => junta(fotos, typeof i === 'string' ? i : (i && i.url)));
      if (x.contentUrl && /\.(mp4|webm|mov)(\?|$)/i.test(String(x.contentUrl))) junta(videos, x.contentUrl);
      Object.values(x).forEach(v => { if (v && typeof v === 'object') fila.push(v); });
    }
  }

  /* imagens grandes soltas no HTML, quando não há ficha nenhuma */
  if (fotos.length < 3) {
    const img = /https?:\/\/[^\s"'<>\\]+?\.(?:jpg|jpeg|png|webp)/gi;
    let g, vistos = 0;
    while ((g = img.exec(html)) && vistos < 60) {
      vistos++;
      const u = g[0];
      if (/sprite|icon|logo|placeholder|pixel|1x1|avatar/i.test(u)) continue;
      junta(fotos, u);
      if (fotos.length >= 12) break;
    }
  }
  return { fotos: fotos.slice(0, 12), videos: videos.slice(0, 3) };
}

async function midiaDoProduto(url) {
  if (!/^https?:\/\//i.test(String(url || '')))
    return { ok: false, motivo: 'Isso não é um endereço de página.', fotos: [], videos: [] };
  let html;
  try { html = await pegarTexto(url); }
  catch (e) {
    return { ok: false, fotos: [], videos: [],
      motivo: 'A loja não deixou eu ler a página (' + (e && e.message) + ').' };
  }
  const r = extrairMidia(html, url);
  if (!r.fotos.length && !r.videos.length)
    return { ok: false, fotos: [], videos: [],
      motivo: 'A página não publica as fotos de um jeito que eu consiga ler. ' +
              'Baixe os materiais no painel de afiliado e escolha os arquivos aqui.' };
  return { ok: true, fotos: r.fotos, videos: r.videos, motivo: '' };
}

/* -------------------------------------------------- escolher arquivos */
async function escolherArquivos(qual) {
  const filtros = qual === 'trilha'
    ? [{ name: 'Música', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'aac'] }]
    : [{ name: 'Fotos e vídeos', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'mp4', 'mov', 'm4v', 'webm'] }];
  const r = await dialog.showOpenDialog({
    title: qual === 'trilha' ? 'Escolha a música de fundo' : 'Escolha as fotos e vídeos do produto',
    properties: qual === 'trilha' ? ['openFile'] : ['openFile', 'multiSelections'],
    filters: filtros
  });
  if (r.canceled || !r.filePaths.length) return [];
  return r.filePaths.slice(0, MAX_ITENS).map(c => ({
    caminho: c, nome: path.basename(c),
    tamanho: (fs.existsSync(c) ? fs.statSync(c).size : 0)
  }));
}

/* ------------------------------------------------------------ o trabalho */
function nomeSeguro(t, n) {
  const limpo = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40);
  return (limpo || 'video') + '-' + n;
}

/* prepara a pasta do trabalho: roteiro, mídia e trilha, tudo no lugar */
async function preparar(dados, enviar) {
  const d = dados || {};
  const roteiro = d.roteiro || {};
  const numero = String(Date.now());
  const base = pasta('trabalhos', nomeSeguro(roteiro.titulo, numero));
  const dirRot = path.join(base, 'roteiro');
  const dirMid = path.join(base, 'midia');
  const dirTri = path.join(base, 'trilha');
  [dirRot, dirMid, dirTri, path.join(base, 'saida')].forEach(p => fs.mkdirSync(p, { recursive: true }));

  fs.writeFileSync(path.join(dirRot, 'roteiro.json'), JSON.stringify(roteiro, null, 1), 'utf8');

  const avisos = [];
  let ordem = 0;
  const proximoNome = (origem, ehVideo) => {
    ordem++;
    let ext = (path.extname(origem).split('?')[0] || '').toLowerCase();
    if (!/^\.[a-z0-9]{2,4}$/.test(ext)) ext = ehVideo ? '.mp4' : '.jpg';
    return path.join(dirMid, String(ordem).padStart(2, '0') + ext);
  };

  /* arquivos que já estão no computador */
  for (const c of (d.arquivos || []).slice(0, MAX_ITENS)) {
    try {
      const ehVideo = /\.(mp4|mov|m4v|webm|mkv)$/i.test(c);
      fs.copyFileSync(c, proximoNome(c, ehVideo));
    } catch (e) { avisos.push('não consegui copiar ' + path.basename(c)); }
  }

  /* mídia da página do produto */
  const daInternet = [].concat(
    (d.fotos || []).slice(0, MAX_ITENS).map(u => ({ url: u, video: false })),
    (d.videos || []).slice(0, 3).map(u => ({ url: u, video: true })));
  let n = 0;
  for (const item of daInternet) {
    n++;
    if (enviar) enviar({ tipo: 'midia', pct: Math.round(n / daInternet.length * 100),
                         texto: 'trazendo a mídia do produto (' + n + ' de ' + daInternet.length + ')' });
    try {
      await baixar(item.url, proximoNome(item.url, item.video),
                   item.video ? MAX_VIDEO : MAX_FOTO);
    } catch (e) { avisos.push('não veio ' + item.url.slice(0, 60) + ' (' + (e && e.message) + ')'); }
  }

  if (d.trilha) {
    try { fs.copyFileSync(d.trilha, path.join(dirTri, 'trilha' + path.extname(d.trilha))); }
    catch (e) { avisos.push('não consegui copiar a música'); }
  }

  const midias = fs.readdirSync(dirMid).filter(a => !a.startsWith('.'));
  return { base, avisos, midias: midias.length };
}

/* roda a fábrica e vai contando o que está acontecendo */
let rodando = null;

function montar(base, enviar) {
  return new Promise(resolve => {
    const e = estado();
    if (!e.python || !e.ffmpeg)
      return resolve({ ok: false, motivo: 'as ferramentas ainda não foram instaladas' });
    if (!fs.existsSync(fabricaPy()))
      return resolve({ ok: false, motivo: 'a fábrica não veio dentro deste pacote' });

    const amb = Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' });
    const p = spawn(e.python, ['-u', fabricaPy(), '--trabalho', base], { env: amb });
    rodando = p;
    let arquivos = [], registro = '', sobra = '';

    const linha = txt => {
      registro += txt;
      sobra += txt;
      const partes = sobra.split(/\r?\n/);
      sobra = partes.pop();
      for (const l of partes) {
        const mp = l.match(/^PROGRESSO (\d+) (.*)$/);
        if (mp && enviar) { enviar({ tipo: 'passo', pct: Number(mp[1]), texto: mp[2] }); continue; }
        const ma = l.match(/^ARQUIVOS (.*)$/);
        if (ma) { try { arquivos = JSON.parse(ma[1]); } catch (er) {} continue; }
        if (l.trim() && enviar) enviar({ tipo: 'linha', texto: l.trim() });
      }
    };
    p.stdout.on('data', d => linha(d.toString('utf8')));
    p.stderr.on('data', d => linha(d.toString('utf8')));

    p.on('error', err => { rodando = null; resolve({ ok: false, motivo: String(err && err.message) }); });
    p.on('close', code => {
      rodando = null;
      if (code !== 0 && !arquivos.length) {
        if (/was not found|Microsoft Store|execution alias/i.test(registro)) {
          esquecerFerramentas();
          return resolve({ ok: false, lojaDaMicrosoft: true, motivo:
            'o Windows respondeu com o atalho da Loja da Microsoft no lugar do Python. ' +
            'Clique em instalar as ferramentas: eu baixo um Python só nosso e não uso mais o do sistema.' });
        }
        const ultima = registro.trim().split(/\r?\n/).slice(-6).join(' · ');
        return resolve({ ok: false, motivo: ultima || ('a fábrica parou com o código ' + code) });
      }
      const saida = path.join(base, 'saida');
      const lista = (arquivos.length ? arquivos
        : fs.readdirSync(saida).filter(a => a.endsWith('.mp4')).map(a => path.join(saida, a)));
      resolve({
        ok: lista.length > 0,
        motivo: lista.length ? '' : 'a fábrica terminou mas não deixou nenhum vídeo',
        pasta: saida,
        arquivos: lista.filter(a => fs.existsSync(a)).map(a => ({
          caminho: a, nome: path.basename(a),
          formato: /vertical/i.test(a) ? '9:16' : /horizontal/i.test(a) ? '16:9' : '1:1',
          tamanho: fs.statSync(a).size
        }))
      });
    });
  });
}

/* A barra é uma promessa ao dono do computador: enquanto ela anda, algo
   está acontecendo. Por isso ela NUNCA volta atrás. Cada etapa tem a sua
   faixa, e um porteiro segura qualquer número menor que o último — mesmo
   que a fábrica um dia passe a contar de outro jeito. */
function porteiroDeProgresso(enviar) {
  let ultimo = 0;
  return (de, ate) => evento => {
    const e = Object.assign({}, evento);
    if (typeof e.pct === 'number') {
      const dentro = de + (ate - de) * Math.max(0, Math.min(100, e.pct)) / 100;
      ultimo = Math.max(ultimo, dentro);
      e.pct = Math.round(ultimo);
    }
    try { if (enviar) enviar(e); } catch (x) {}
  };
}

async function criar(dados, enviar) {
  if (rodando) return { ok: false, motivo: 'já tem um vídeo sendo montado' };
  const faixa = porteiroDeProgresso(enviar);
  const naPreparacao = faixa(0, 8);
  const naMontagem = faixa(8, 100);

  naPreparacao({ tipo: 'passo', pct: 5, texto: 'preparando o material' });
  let prep;
  try { prep = await preparar(dados, naPreparacao); }
  catch (e) { return { ok: false, motivo: 'não consegui preparar a pasta: ' + (e && e.message) }; }
  naPreparacao({ tipo: 'passo', pct: 100, texto: prep.midias
        ? prep.midias + ' arquivo(s) de mídia prontos'
        : 'sem foto e sem vídeo — as cenas saem em fundo liso' });

  const r = await montar(prep.base, naMontagem);
  r.avisos = prep.avisos;
  r.trabalho = prep.base;
  return r;
}

function parar() {
  if (!rodando) return false;
  try { rodando.kill(); } catch (e) {}
  rodando = null;
  return true;
}

/* ---------------------------------------------------------- instalação
   Baixa Python, FFmpeg e a voz de IA para dentro da pasta de dados do
   programa. Não instala nada no Windows: para desfazer, apaga a pasta.  */
const PECAS_WIN = [
  { id: 'python', nome: 'Python portátil', mb: 11, zip: true, dentro: 'python',
    url: 'https://www.python.org/ftp/python/3.13.14/python-3.13.14-embed-amd64.zip',
    confere: () => !!acharPython(true) },
  { id: 'ffmpeg', nome: 'FFmpeg — é ele que monta o vídeo', mb: 80, zip: true, dentro: 'ffmpeg',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    confere: () => !!acharFfmpeg(true) },
  { id: 'piper', nome: 'Voz de IA', mb: 20, zip: true, dentro: 'piper',
    url: 'https://github.com/rhasspy/piper/releases/latest/download/piper_windows_amd64.zip',
    confere: () => !!achar('piper') },
  { id: 'voz', nome: 'Voz brasileira', mb: 64, zip: false, dentro: 'piper', arquivo: 'pt_BR-faber-medium.onnx',
    url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx',
    confere: () => !!acharVoz() },
  { id: 'vozficha', nome: 'Ficha da voz', mb: 1, zip: false, dentro: 'piper', arquivo: 'pt_BR-faber-medium.onnx.json',
    url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json',
    confere: () => fs.existsSync(path.join(ferramentas(), 'piper', 'pt_BR-faber-medium.onnx.json')) }
];

function descompactar(zip, destino) {
  fs.mkdirSync(destino, { recursive: true });
  if (WIN) {
    const r = spawnSync('powershell', ['-NoProfile', '-Command',
      'Expand-Archive -Path ' + JSON.stringify(zip) + ' -DestinationPath ' + JSON.stringify(destino) + ' -Force'],
      { encoding: 'utf8' });
    return r.status === 0;
  }
  const r = spawnSync('unzip', ['-o', '-q', zip, '-d', destino], { encoding: 'utf8' });
  return r.status === 0;
}

async function instalar(enviar) {
  const av = e => { try { if (enviar) enviar(e); } catch (x) {} };
  esquecerFerramentas();
  if (!WIN) {
    /* fora do Windows o programa usa o que a máquina já tem — é assim que
       este arquivo consegue ser testado de verdade, e não só de mentira */
    const e = estado({ fresco: true });
    av({ tipo: 'passo', pct: 100, texto: e.pronto ? 'usando as ferramentas do sistema' : 'faltam ferramentas' });
    return { ok: e.pronto, estado: e,
      motivo: e.pronto ? '' : 'neste sistema, instale o python3 e o ffmpeg pelo gerenciador de pacotes' };
  }

  const faltando = PECAS_WIN.filter(p => !p.confere());
  if (!faltando.length) { av({ tipo: 'passo', pct: 100, texto: 'já estava tudo instalado' });
    return { ok: true, estado: estado(), motivo: '' }; }

  const total = faltando.reduce((s, p) => s + p.mb, 0);
  let feito = 0;
  const erros = [];
  for (const peca of faltando) {
    av({ tipo: 'passo', pct: Math.round(feito / total * 100),
         texto: 'baixando ' + peca.nome + ' (' + peca.mb + ' MB)' });
    const destino = path.join(ferramentas(), peca.dentro);
    fs.mkdirSync(destino, { recursive: true });
    const alvo = peca.zip ? path.join(os.tmpdir(), 'jev-' + peca.id + '.zip')
                          : path.join(destino, peca.arquivo);
    try {
      await baixar(peca.url, alvo, 400 * 1024 * 1024, (b, t) => {
        av({ tipo: 'passo', texto: 'baixando ' + peca.nome,
             pct: Math.round((feito + peca.mb * (b / t)) / total * 100) });
      });
      if (peca.zip) {
        av({ tipo: 'passo', pct: Math.round((feito + peca.mb) / total * 100), texto: 'abrindo ' + peca.nome });
        if (!descompactar(alvo, destino)) erros.push(peca.nome + ': não consegui abrir o pacote');
        try { fs.unlinkSync(alvo); } catch (e) {}
      }
      if (!peca.confere()) erros.push(peca.nome + ': baixou mas não apareceu onde eu esperava');
    } catch (e) {
      erros.push(peca.nome + ': ' + (e && e.message));
    }
    feito += peca.mb;
  }

  esquecerFerramentas();
  const e = estado({ fresco: true });
  av({ tipo: 'passo', pct: 100, texto: e.pronto ? 'ferramentas prontas' : 'faltou alguma coisa' });
  return { ok: e.pronto, estado: e, motivo: erros.join(' · ') };
}

/* apaga as ferramentas — serve para consertar instalação pela metade */
function limpar() {
  esquecerFerramentas();
  try { fs.rmSync(ferramentas(), { recursive: true, force: true }); return true; }
  catch (e) { return false; }
}

/* apaga trabalhos antigos, deixando os mais novos */
function faxina(guardar) {
  const dir = pasta('trabalhos');
  let itens;
  try { itens = fs.readdirSync(dir).map(a => ({ nome: a, c: path.join(dir, a) })); }
  catch (e) { return 0; }
  itens.sort((a, b) => fs.statSync(b.c).mtimeMs - fs.statSync(a.c).mtimeMs);
  let apagados = 0;
  itens.slice(Math.max(1, guardar || 8)).forEach(i => {
    try { fs.rmSync(i.c, { recursive: true, force: true }); apagados++; } catch (e) {}
  });
  return apagados;
}

module.exports = {
  estado, instalar, limpar, criar, parar, faxina,
  acharPython, acharFfmpeg, pythonServe, esquecerFerramentas,
  escolherArquivos, midiaDoProduto, extrairMidia,
  raiz, fabricaPy, cortesPy, baixar
};

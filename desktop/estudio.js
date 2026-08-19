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

/* ------------------------------------------------- onde mora a fábrica

   Aqui mora uma armadilha do Electron. Quando o programa é instalado, tudo
   vira UM arquivo só: o app.asar. Para o Node, esse arquivo se comporta como
   se fosse uma pasta — fs.existsSync diz que o fabrica.py está lá, e está
   mesmo. Só que o Python é um programa DE FORA: ele não sabe abrir um arquivo
   que mora dentro de outro arquivo, e responde

       can't open file '...\app.asar\fabrica\fabrica.py': [Errno 2]

   Foi assim que a segunda tentativa de montar vídeo morreu, logo depois de
   consertar o Python. A saída tem duas camadas, de propósito:

     1. o empacotador é instruído a deixar a pasta fabrica FORA do app.asar
        (asarUnpack no package.json);
     2. e, se mesmo assim ela vier presa lá dentro, o programa COPIA os
        arquivos para a pasta de dados e roda de lá.

   A segunda camada existe porque a primeira depende de uma configuração de
   empacotamento dar certo — e configuração de empacotamento é exatamente o
   tipo de coisa que quebra sem avisar.                                     */
const ARQUIVOS_FABRICA = ['fabrica.py', 'cortes.py', 'ia_local.py'];

function ehDentroDoAsar(c) {
  return /[\\/]app\.asar[\\/]/i.test(String(c || ''));
}

function candidatosFabrica() {
  const res = process.resourcesPath || '';
  return [
    path.join(__dirname, 'fabrica'),                    // rodando do código
    res ? path.join(res, 'app.asar.unpacked', 'fabrica') : '',  // instalado, solto
    res ? path.join(res, 'fabrica') : '',               // instalado, ao lado
    path.join(__dirname, '..', 'fabrica'),
    path.join(__dirname, 'fabrica')                     // instalado, preso no asar
  ].filter(Boolean);
}

/* copia os arquivos para fora do pacote, onde um programa de fora alcança */
function soltarFabrica(origem) {
  const destino = pasta('fabrica');
  for (const nome of ARQUIVOS_FABRICA) {
    const de = path.join(origem, nome);
    const para = path.join(destino, nome);
    if (!fs.existsSync(de)) continue;
    let precisa = true;
    try {
      precisa = !fs.existsSync(para) || fs.statSync(para).size !== fs.statSync(de).size;
    } catch (e) {}
    if (precisa) {
      try { fs.writeFileSync(para, fs.readFileSync(de)); } catch (e) {}
    }
  }
  return destino;
}

function pastaDaFabrica(lista) {
  const cands = lista || candidatosFabrica();
  const tem = d => { try { return fs.existsSync(path.join(d, 'fabrica.py')); } catch (e) { return false; } };
  /* o melhor caso: existe e não está preso dentro do pacote */
  for (const d of cands) if (!ehDentroDoAsar(d) && tem(d)) return d;
  /* só sobrou o de dentro do pacote: solta para fora e roda de lá */
  for (const d of cands) if (tem(d)) return soltarFabrica(d);
  return cands[0];
}

function fabricaPy() { return path.join(pastaDaFabrica(), 'fabrica.py'); }
function cortesPy()  { return path.join(pastaDaFabrica(), 'cortes.py'); }

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
  /* o ffprobe vem no mesmo pacote do ffmpeg e mora ao lado dele */
  let ffp = '';
  if (ff) {
    const irmao = path.join(path.dirname(ff), 'ffprobe' + EXE);
    ffp = fs.existsSync(irmao) ? irmao : (achar('ffprobe') || '');
  }
  const piper = achar('piper');
  const voz = acharVoz();
  return {
    pasta: raiz(),
    python: py || '',
    ffmpeg: ff || '',
    ffprobe: ffp,
    piper: piper || '',
    voz: voz || '',
    fabrica: fs.existsSync(fabricaPy()),
    pronto: !!(py && ff && fs.existsSync(fabricaPy())),
    comVoz: !!(piper && voz),
    plataforma: process.platform
  };
}

/* -------------------------------------------------------------- baixar */
function baixar(url, destino, limite, aviso, referer) {
  return new Promise((ok, erro) => {
    const mod = url.startsWith('http://') ? http : https;
    /* o Referer é o endereço do anúncio. Muita loja só entrega a foto para
       quem diz de qual página veio — sem isso o servidor devolve 403 e a
       imagem some sem explicação. */
    const cabecalho = {
      'User-Agent': UA_NAVEGADOR,
      'Accept': 'image/avif,image/webp,image/apng,video/*,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };
    if (referer) cabecalho.Referer = referer;
    const req = mod.get(url, { headers: cabecalho, timeout: 120000 }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const proximo = new URL(res.headers.location, url).href;
        return baixar(proximo, destino, limite, aviso, referer).then(ok, erro);
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

/* ================================ ler a página com o navegador de verdade

   O pedido cru do Node não passa em loja grande. O TikTok Shop derruba a
   conexão na cara (read ECONNRESET) porque a assinatura de quem está
   pedindo não é a de um navegador — e, mesmo quando passa, a página chega
   vazia, porque a vitrine é montada depois, por programa, dentro do
   navegador.

   Acontece que este aplicativo É um navegador: o Electron carrega um
   Chromium inteiro. Então em vez de fingir ser um, a gente usa o que já
   está aqui. A página abre numa janela escondida, roda os programas dela
   como rodaria na sua tela, e só então a gente lê as imagens que ficaram
   de fato desenhadas.

   Duas regras que valem a pena escrever, porque é fácil escorregar nelas:

   A janela NÃO clica em nada. Nem em aviso de cookie, nem em "aceitar",
   nem em botão nenhum. Ela só olha. Aceitar termo em nome do dono não é
   trabalho de robô.

   E se a loja pedir login ou pôr um teste de "não sou robô", a gente não
   contorna: devolve o motivo escrito e para. O caminho nesse caso é o
   material do painel do vendedor, que é seu por direito.                  */
const UA_NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

/* roda DENTRO da página. Só lê o que está desenhado na tela. */
function coletorDaPagina() {
  const rolar = async () => {
    for (let i = 0; i < 6; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 400));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400));
  };
  const limpar = u => String(u || '').trim();
  const vale = u => /^https?:\/\//i.test(u) &&
    !/sprite|\bicon\b|logo|placeholder|avatar|1x1|blank/i.test(u);

  return rolar().then(() => {
    const fotos = [], videos = [];
    const junta = (lista, u) => {
      const c = limpar(u);
      if (vale(c) && !lista.includes(c)) lista.push(c);
    };

    document.querySelectorAll('img').forEach(i => {
      const l = i.naturalWidth || i.width || 0;
      const a = i.naturalHeight || i.height || 0;
      /* imagem de produto é grande; ícone e selo são pequenos */
      if (l >= 250 && a >= 250) junta(fotos, i.currentSrc || i.src);
    });

    document.querySelectorAll('video').forEach(v => {
      junta(videos, v.currentSrc || v.src);
      v.querySelectorAll('source').forEach(s => junta(videos, s.src));
      if (v.poster) junta(fotos, v.poster);
    });

    /* algumas lojas põem a foto como fundo, não como <img> */
    document.querySelectorAll('div,span,section,a').forEach(e => {
      const f = getComputedStyle(e).backgroundImage || '';
      const m = f.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
      if (m && e.clientWidth >= 250 && e.clientHeight >= 250) junta(fotos, m[1]);
    });

    const texto = (document.body.innerText || '').slice(0, 3000);
    return {
      fotos: fotos.slice(0, 20),
      videos: videos.slice(0, 5),
      /* sinais de que a loja pôs uma porta na frente */
      barrado: /verifica(ç|c)(ã|a)o de seguran|not a robot|captcha|entrar para continuar|log in to continue|acesso negado|access denied/i.test(texto),
      titulo: String(document.title || '')
    };
  });
}

async function midiaPelaJanela(url, opcoes) {
  const o = opcoes || {};
  let janela;
  try {
    janela = new BrowserWindow({
      show: !!o.mostrar,
      width: 1280, height: 900,
      title: 'JeV — lendo a página do produto',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        /* sessão própria e persistente: o que a loja guardar de uma
           tentativa para outra continua valendo, e nada disso se mistura
           com o resto do programa */
        partition: 'persist:jev-loja',
        backgroundThrottling: false
      }
    });
  } catch (e) {
    return { ok: false, fotos: [], videos: [],
             motivo: 'não consegui abrir o navegador interno: ' + (e && e.message) };
  }

  try {
    await janela.loadURL(url, { userAgent: UA_NAVEGADOR });
    /* tempo para a vitrine se montar sozinha */
    await esperar(Math.max(2000, Number(o.espera) || 7000));
    const r = await janela.webContents.executeJavaScript(
      '(' + coletorDaPagina.toString() + ')()', true);

    if (r && r.barrado)
      return { ok: false, fotos: [], videos: [], barrado: true,
        motivo: 'a loja pediu verificação de segurança ou login para mostrar a página. ' +
                'Eu não passo por esse tipo de porta — e nem devo.' };

    const fotos = (r && r.fotos) || [], videos = (r && r.videos) || [];
    if (!fotos.length && !videos.length)
      return { ok: false, fotos: [], videos: [],
        motivo: 'abri a página no navegador, mas ela não desenhou nenhuma foto grande.' };

    return { ok: true, fotos, videos, motivo: '', porJanela: true };
  } catch (e) {
    const detalhe = detalharErro(e);
    return { ok: false, fotos: [], videos: [], inalcancavel: ehInalcancavel(detalhe),
             motivo: ehInalcancavel(detalhe)
               ? recadoDeRede(url, detalhe)
               : 'o navegador não conseguiu abrir a página: ' + detalhe };
  } finally {
    try { if (janela && !janela.isDestroyed()) janela.destroy(); } catch (x) {}
  }
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

/* ------------------------------------------- barrado ou inalcançável?

   Essa diferença parece detalhe e não é: ela decide para onde a pessoa vai
   procurar solução.

   BARRADO é a loja te vendo e dizendo não — resposta 403, pedido de login,
   verificação de robô. Aí a saída é pegar o material no painel do vendedor.

   INALCANÇÁVEL é a conexão morrendo antes de qualquer conversa: connection
   reset, endereço que não resolve, tempo esgotado. Aí a loja nem soube que
   alguém bateu na porta. A causa está no caminho — antivírus com filtro de
   rede, DNS do provedor, bloqueio do roteador, arquivo hosts do Windows. E
   nesse caso NENHUMA mudança no programa resolve, porque o problema não é
   com o programa.

   Uma versão anterior deste arquivo dizia "a loja não deixou eu ler" para
   os dois casos. Isso mandou o dono caçar solução no lugar errado.        */
const SINAIS_INALCANCAVEL =
  /ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|CONNECTION_RESET|CONNECTION_REFUSED|CONNECTION_CLOSED|NAME_NOT_RESOLVED|NETWORK_CHANGED|EMPTY_RESPONSE|CONNECTION_FAILED|socket hang up|demorou demais/i;

function ehInalcancavel(msg) { return SINAIS_INALCANCAVEL.test(String(msg || '')); }

/* o Node guarda o motivo bom em .code (ECONNRESET) e um texto vago em
   .message ("socket hang up"). Os dois juntos é o que o dono precisa ver. */
function detalharErro(e) {
  const codigo = e && e.code ? String(e.code) : '';
  const texto = String((e && e.message) || e || '');
  if (codigo && texto.indexOf(codigo) < 0) return codigo + ' — ' + texto;
  return texto;
}

function recadoDeRede(url, detalhe) {
  let dominio = url;
  try { dominio = new URL(url).hostname; } catch (e) {}
  return 'Este computador não conseguiu nem alcançar ' + dominio + ' (' + detalhe + '). ' +
    'A loja não chegou a responder — a conexão foi cortada no caminho. ' +
    'Confira abrindo https://' + dominio + ' no seu navegador: se também não abrir lá, ' +
    'o bloqueio é da internet deste computador (antivírus com filtro de rede, DNS do ' +
    'provedor, roteador ou o arquivo hosts do Windows), e não do aplicativo.';
}

async function midiaDoProduto(url) {
  if (!/^https?:\/\//i.test(String(url || '')))
    return { ok: false, motivo: 'Isso não é um endereço de página.', fotos: [], videos: [] };
  let html;
  try { html = await pegarTexto(url); }
  catch (e) {
    const detalhe = detalharErro(e);
    return { ok: false, fotos: [], videos: [], inalcancavel: ehInalcancavel(detalhe),
      motivo: ehInalcancavel(detalhe)
        ? recadoDeRede(url, detalhe)
        : 'A loja não deixou eu ler a página (' + detalhe + ').' };
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

/* ============================================ baixar a mídia do produto

   Isto é diferente de "montar o vídeo". Aqui os arquivos do anúncio — as
   fotos e o vídeo do vendedor — são BAIXADOS e ficam guardados numa pasta
   do produto, no computador do dono. Três razões para isso ser um passo
   separado, com botão próprio:

     1. você vê o que veio ANTES de gastar minutos montando, em vez de
        descobrir no fim que não veio nada;
     2. o material fica guardado: gerar de novo não baixa tudo outra vez,
        e se a loja tirar o anúncio do ar o material continua seu;
     3. o que foi baixado entra na mesma lista dos arquivos escolhidos na
        mão — então a montagem usa esses arquivos sem precisar saber de
        onde vieram.

   Quando a loja não deixa ler a página (o TikTok Shop é assim), nada é
   inventado: volta um não com o motivo escrito.                          */
function chaveDePasta(t) {
  const limpo = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 50);
  return limpo || 'produto';
}

function tipoDeArquivo(c) {
  return /\.(mp4|mov|m4v|webm|mkv)$/i.test(String(c)) ? 'video' : 'foto';
}

/* o que já está guardado deste produto */
function midiasGuardadas(chave) {
  const dir = path.join(raiz(), 'produtos', chaveDePasta(chave));
  let nomes;
  try { nomes = fs.readdirSync(dir); } catch (e) { return []; }
  return nomes.filter(a => !a.startsWith('.')).sort().map(a => {
    const c = path.join(dir, a);
    let t = 0;
    try { t = fs.statSync(c).size; } catch (e) {}
    return { caminho: c, nome: a, tamanho: t, tipo: tipoDeArquivo(a) };
  }).filter(x => x.tamanho > 0);
}

async function baixarMidias(dados, enviar) {
  const d = dados || {};
  const chave = chaveDePasta(d.chave || d.nome);
  const av = e => { try { if (enviar) enviar(e); } catch (x) {} };

  const enderecos = (Array.isArray(d.urls) ? d.urls : [d.urls])
    .map(u => String(u || '').trim()).filter(u => /^https?:\/\//i.test(u));
  const temDireta = (Array.isArray(d.imagens) ? d.imagens : [])
    .some(u => /^https?:\/\//i.test(String(u || '')));
  if (!enderecos.length && !temDireta)
    return { ok: false, arquivos: midiasGuardadas(chave), avisos: [],
             motivo: 'este produto não tem o endereço do anúncio guardado' };

  /* 1) descobrir o que a página publica.

     Duas tentativas, da mais barata para a mais cara. Primeiro o pedido
     cru, que é rápido e resolve a maioria das lojas. Se a loja derrubar a
     conexão ou entregar página vazia — que é o que o TikTok Shop faz — aí
     sim a gente abre a página no navegador de verdade que já vem dentro
     deste programa. Não adianta insistir no pedido cru: quem barra, barra. */
  const fotos = [], videos = [], recusas = [];
  let usouJanela = false, barrado = false, inalcancavel = false;

  /* Atalho: quando o garimpo já sabe o endereço EXATO da foto — é o caso do
     Kalodata, que guarda a capa no CDN dele — não há página para ler nem
     loja para negociar. Baixa direto e pronto. */
  const diretas = (Array.isArray(d.imagens) ? d.imagens : [])
    .map(u => String(u || '').trim()).filter(u => /^https?:\/\//i.test(u));
  diretas.forEach(u => { if (!fotos.includes(u)) fotos.push(u); });

  for (const url of (diretas.length ? [] : enderecos)) {
    av({ tipo: 'passo', pct: 3, texto: 'lendo a página do anúncio' });
    let m;
    try { m = await midiaDoProduto(url); }
    catch (e) { m = { ok: false, motivo: String((e && e.message) || e), fotos: [], videos: [] }; }

    if (!m.ok) {
      av({ tipo: 'passo', pct: 4,
           texto: 'a loja barrou o pedido — abrindo a página no navegador' });
      let j;
      try { j = await midiaPelaJanela(url, { espera: d.espera, mostrar: !!d.mostrar }); }
      catch (e) { j = { ok: false, motivo: String((e && e.message) || e), fotos: [], videos: [] }; }
      if (j.ok) { m = j; usouJanela = true; }
      else {
        barrado = barrado || !!j.barrado;
        /* os dois caminhos morreram na rede: então não é a loja barrando,
           é este computador não chegando lá. Isso muda o recado inteiro. */
        if (m.inalcancavel && j.inalcancavel) {
          inalcancavel = true;
          recusas.push(j.motivo);
        } else {
          recusas.push(m.motivo + ' Pelo navegador também não deu: ' + j.motivo);
        }
        continue;
      }
    }

    (m.fotos || []).forEach(u => { if (!fotos.includes(u)) fotos.push(u); });
    (m.videos || []).forEach(u => { if (!videos.includes(u)) videos.push(u); });
  }

  if (!fotos.length && !videos.length) {
    /* loja inalcançável não tem plano B dentro do programa: nem o painel do
       vendedor vai abrir, porque ele mora no mesmo endereço bloqueado.
       Abrir a janela de novo só faria a pessoa perder mais tempo. */
    if (inalcancavel)
      return { ok: false, arquivos: midiasGuardadas(chave), avisos: recusas,
        inalcancavel: true, podeTentarNaTela: false,
        motivo: recusas[0] };

    return { ok: false, arquivos: midiasGuardadas(chave), avisos: recusas, barrado,
      /* quando a loja pôs uma porta, tentar de novo pelo mesmo caminho não
         resolve — o certo é abrir a loja na tela, ou pegar no painel */
      podeTentarNaTela: !d.mostrar,
      motivo: (recusas[0] || 'a página não publica as fotos de um jeito que eu consiga ler') +
        (barrado
          ? ' Você pode tentar de novo com a loja aberta na sua tela, para passar o aviso ' +
            'de cookie ou entrar na conta você mesmo. Ou, mais rápido: baixe o vídeo no ' +
            'painel do vendedor e use "Materiais do produto".'
          : ' Baixe o vídeo do anúncio no painel do vendedor e use "Materiais do produto".') };
  }

  /* 2) baixar de verdade. O vídeo primeiro: é ele que mostra a pessoa. */
  const dir = path.join(raiz(), 'produtos', chave);
  fs.mkdirSync(dir, { recursive: true });
  const fila = [].concat(
    videos.slice(0, 3).map(u => ({ url: u, video: true })),
    fotos.slice(0, MAX_ITENS).map(u => ({ url: u, video: false })));

  const avisos = recusas.slice();
  let n = 0, guardados = 0;
  for (const item of fila) {
    n++;
    const rotulo = item.video ? 'vídeo' : 'foto';
    av({ tipo: 'passo', pct: 5 + Math.round(n / fila.length * 90),
         texto: 'baixando ' + rotulo + ' ' + n + ' de ' + fila.length });
    let ext = (path.extname(item.url).split('?')[0] || '').toLowerCase();
    if (!/^\.[a-z0-9]{2,4}$/.test(ext)) ext = item.video ? '.mp4' : '.jpg';
    /* o vídeo vai com nome que ordena antes: assim ele encabeça a lista */
    const destino = path.join(dir, (item.video ? 'a' : 'b') +
      String(n).padStart(2, '0') + ext);
    try {
      await baixar(item.url, destino, item.video ? MAX_VIDEO : MAX_FOTO,
                   null, enderecos[0] || undefined);
      if (fs.statSync(destino).size > 0) guardados++;
      else { try { fs.unlinkSync(destino); } catch (e) {} }
    } catch (e) {
      try { fs.unlinkSync(destino); } catch (x) {}
      avisos.push('não veio ' + item.url.slice(0, 60) + ' (' + (e && e.message) + ')');
    }
  }

  av({ tipo: 'passo', pct: 100, texto: guardados + ' arquivo(s) guardados' });
  const arquivos = midiasGuardadas(chave);
  const temVideo = arquivos.some(a => a.tipo === 'video');
  if (arquivos.length && !temVideo)
    avisos.push('Vieram fotos, mas nenhum vídeo. O vídeo do TikTok Shop toca por um ' +
      'caminho que não dá para salvar de fora. Para ter a pessoa usando o produto, ' +
      'baixe o vídeo no painel do vendedor e use "Materiais do produto".');
  return {
    ok: arquivos.length > 0,
    arquivos, avisos, pasta: dir, porJanela: usouJanela, temVideo,
    motivo: arquivos.length ? '' :
      'a loja respondeu, mas nenhum arquivo chegou inteiro. ' +
      'Baixe o material no painel do vendedor e use "Materiais do produto".'
  };
}

/* apaga o que foi baixado deste produto — libera espaço e força baixar de novo */
function limparMidias(chave) {
  try {
    fs.rmSync(path.join(raiz(), 'produtos', chaveDePasta(chave)),
              { recursive: true, force: true });
    return true;
  } catch (e) { return false; }
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

function montar(base, enviar, opcoes) {
  return new Promise(resolve => {
    const e = estado();
    if (!e.python || !e.ffmpeg)
      return resolve({ ok: false, motivo: 'as ferramentas ainda não foram instaladas' });
    if (!fs.existsSync(fabricaPy()))
      return resolve({ ok: false, motivo: 'a fábrica não veio dentro deste pacote' });

    /* A fábrica mora dentro do programa (Arquivos de Programas) e as
       ferramentas moram na pasta de dados do usuário. São dois lugares
       diferentes, e a fábrica não teria como adivinhar o segundo. Então o
       caminho de cada coisa vai escrito, pelo ambiente — sem procura, sem
       depender do PATH do Windows. */
    const amb = Object.assign({}, process.env, {
      PYTHONIOENCODING: 'utf-8',
      JEV_FERRAMENTAS: ferramentas(),
      JEV_FFMPEG: e.ffmpeg || '',
      JEV_FFPROBE: e.ffprobe || '',
      JEV_PIPER: e.piper || '',
      JEV_VOZ: e.voz || '',
      /* a IA de vídeo local só entra quando o dono pede. Ela é lenta e come a
         placa inteira: ninguém pode ser surpreendido por ela. */
      JEV_IA: (opcoes && opcoes.ia) ? '1' : '',
      JEV_IA_MODELOS: pasta('ferramentas', 'ia-modelos')
    });
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
        if (/can't open file|No such file or directory/i.test(registro) && /app\.asar/i.test(registro)) {
          return resolve({ ok: false, motivo:
            'a fábrica ficou presa dentro do pacote do programa e o Python não alcança lá. ' +
            'Instale a versão mais nova do aplicativo, que já vem com ela solta.' });
        }
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

  const r = await montar(prep.base, naMontagem, { ia: !!(dados && dados.ia) });
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

/* =========================================================================
   IA DE VÍDEO NO COMPUTADOR DO DONO

   Isto aqui é caro em disco (uns 8 GB) e só roda em placa NVIDIA. Por isso
   nada acontece sozinho: o programa primeiro EXAMINA a máquina e conta o que
   viu, e só baixa quando o dono manda, sabendo o tamanho.

   E é bom repetir o que essa IA faz, porque a expectativa costuma ser outra:
   ela NÃO inventa uma pessoa segurando o produto. Ela pega a foto real do
   anúncio e põe aquela foto em movimento. O produto continua sendo o produto
   porque o primeiro quadro é a foto de verdade.
   ========================================================================= */
const IA_PACOTES = [
  /* o torch com CUDA é o pedaço gordo: uns 2,5 GB só ele */
  { nome: 'torch', args: ['torch', '--index-url', 'https://download.pytorch.org/whl/cu124'] },
  { nome: 'diffusers e companhia',
    args: ['diffusers', 'transformers', 'accelerate', 'imageio', 'imageio-ffmpeg', 'sentencepiece'] }
];

function iaLocalPy() { return path.join(pastaDaFabrica(), 'ia_local.py'); }

/* pergunta à peça de IA o que ela vê nesta máquina */
function iaEstado() {
  const e = estado();
  const py = e.python;
  const arq = iaLocalPy();
  if (!py)
    return { pronto: false, pode_instalar: false, placa: '', vram_gb: 0,
             motivo: 'as ferramentas de vídeo ainda não foram instaladas' };
  if (!fs.existsSync(arq))
    return { pronto: false, pode_instalar: false, placa: '', vram_gb: 0,
             motivo: 'a peça de IA não veio dentro deste pacote — instale a versão mais nova do aplicativo' };

  const amb = Object.assign({}, process.env, {
    PYTHONIOENCODING: 'utf-8',
    JEV_FERRAMENTAS: ferramentas(),
    JEV_IA_MODELOS: pasta('ferramentas', 'ia-modelos')
  });
  const r = spawnSync(py, ['-u', arq, '--estado'], { env: amb, encoding: 'utf8', timeout: 60000 });
  const linha = String(r.stdout || '').trim().split(/\r?\n/).pop();
  try { return JSON.parse(linha); }
  catch (x) {
    return { pronto: false, pode_instalar: false, placa: '', vram_gb: 0,
             motivo: 'não consegui examinar a placa de vídeo: ' +
                     (String(r.stderr || '').trim().split(/\r?\n/).pop() || 'sem resposta') };
  }
}

/* baixa o que falta para a IA de vídeo local. Só roda depois do dono mandar. */
function iaInstalar(enviar) {
  return new Promise(resolve => {
    const av = e => { try { if (enviar) enviar(e); } catch (x) {} };
    const antes = iaEstado();
    if (antes.pronto) { av({ tipo: 'passo', pct: 100, texto: 'a IA de vídeo já estava pronta' });
      return resolve({ ok: true, estado: antes, motivo: '' }); }
    if (!antes.pode_instalar)
      return resolve({ ok: false, estado: antes, motivo: antes.motivo });

    const py = estado().python;
    const amb = Object.assign({}, process.env, {
      PYTHONIOENCODING: 'utf-8',
      JEV_FERRAMENTAS: ferramentas(),
      JEV_IA_MODELOS: pasta('ferramentas', 'ia-modelos')
    });

    /* um passo de cada vez, contando qual é — um download de 8 GB sem recado
       na tela é indistinguível de um programa travado */
    const passos = IA_PACOTES.map((p, i) => ({
      texto: 'instalando ' + p.nome + ' (' + (i + 1) + ' de ' + (IA_PACOTES.length + 1) + ')',
      args: ['-m', 'pip', 'install', '--no-input', ...p.args]
    }));
    passos.push({
      texto: 'baixando o modelo de vídeo — uns 8 GB, uma vez só',
      args: ['-c',
        'import sys;from huggingface_hub import snapshot_download;' +
        'snapshot_download(sys.argv[1], local_dir=sys.argv[2]);print("baixado")',
        'Lightricks/LTX-Video', pasta('ferramentas', 'ia-modelos')]
    });

    let i = 0;
    const erros = [];
    const seguir = () => {
      if (i >= passos.length) {
        rodando = null;
        const depois = iaEstado();
        av({ tipo: 'passo', pct: 100,
             texto: depois.pronto ? 'IA de vídeo pronta' : 'faltou alguma coisa' });
        return resolve({ ok: !!depois.pronto, estado: depois,
                         motivo: depois.pronto ? '' : (erros.join(' · ') || depois.motivo) });
      }
      const passo = passos[i];
      av({ tipo: 'passo', pct: Math.round(i / passos.length * 100), texto: passo.texto });
      const p = spawn(py, passo.args, { env: amb });
      rodando = p;
      let ultimo = '';
      const olhar = d => {
        const t = String(d).trim();
        if (t) { ultimo = t.split(/\r?\n/).pop(); av({ tipo: 'linha', texto: ultimo }); }
      };
      p.stdout.on('data', olhar);
      p.stderr.on('data', olhar);
      p.on('error', err => { erros.push(passo.texto + ': ' + (err && err.message)); i++; seguir(); });
      p.on('close', code => {
        if (code !== 0) erros.push(passo.texto + ' falhou: ' + (ultimo || 'código ' + code));
        i++; seguir();
      });
    };
    seguir();
  });
}

/* apaga só os pesos da IA — são gigabytes, e às vezes é isso que o dono quer
   de volta no disco, sem perder o resto das ferramentas */
function iaLimpar() {
  try { fs.rmSync(pasta('ferramentas', 'ia-modelos'), { recursive: true, force: true }); return true; }
  catch (e) { return false; }
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
  pastaDaFabrica, ehDentroDoAsar, candidatosFabrica,
  escolherArquivos, midiaDoProduto, extrairMidia,
  baixarMidias, midiasGuardadas, limparMidias, chaveDePasta, midiaPelaJanela,
  iaEstado, iaInstalar, iaLimpar, iaLocalPy,
  raiz, fabricaPy, cortesPy, baixar
};

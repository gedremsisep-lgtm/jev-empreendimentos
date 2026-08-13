/* =========================================================================
   O estúdio de verdade: baixa mídia de um servidor de mentira, chama a
   fábrica de verdade e confere se saiu VÍDEO MESMO — com a duração e o
   tamanho de tela certos. Nada aqui é simulado com boneco.

   Rodar:  xvfb-run -a ./node_modules/.bin/electron --no-sandbox test_estudio.js
   ========================================================================= */
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawnSync } = require('child_process');
const { app } = require('electron');

const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-estudio-'));
process.env.JEV_ESTUDIO = TEMP;

/* O Electron fecha o programa sozinho quando a última janela some. Como este
   teste abre e fecha uma janela para conferir o player, sem isto ele morreria
   no meio e as últimas conferências nunca rodariam — passando a impressão de
   que tudo correu bem. */
app.on('window-all-closed', () => {});

let falhas = 0;
const ok = (t, v) => {
  if (v === true) console.log('  OK    ' + t);
  else { falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v).slice(0, 300)); }
};

function ffprobe(arquivo, campo) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', campo, '-of', 'default=nw=1:nk=1', arquivo], { encoding: 'utf8' });
  return String(r.stdout || '').trim();
}

/* --------- uma loja de mentira, para não depender da internet de ninguém */
function fazerFoto(cor, destino) {
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi',
    '-i', 'color=c=' + cor + ':s=900x900', '-frames:v', '1', destino]);
}
function fazerVideo(destino, seg) {
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=640x1136:rate=30:duration=' + seg,
    '-f', 'lavfi', '-i', 'sine=frequency=280:duration=' + seg,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', destino]);
}

const LOJA = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-loja-'));
fazerFoto('0x2a6f4f', path.join(LOJA, 'a.jpg'));
fazerFoto('0x8f3b2a', path.join(LOJA, 'b.jpg'));
fazerFoto('0x2b3f8f', path.join(LOJA, 'c.jpg'));
fazerVideo(path.join(LOJA, 'demo.mp4'), 10);

let porta = 0;
const servidor = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/produto') {
    const b = 'http://127.0.0.1:' + porta;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<!doctype html><html><head>
      <meta property="og:image" content="${b}/a.jpg">
      <meta property="og:video" content="${b}/demo.mp4">
      <script type="application/ld+json">
      {"@type":"Product","name":"Pano multiuso","image":["${b}/b.jpg","${b}/c.jpg"]}
      </script></head><body>produto</body></html>`);
  }
  if (url === '/vazia') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<html><body>nada aqui</body></html>');
  }
  if (url === '/gigante') {
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': String(900 * 1024 * 1024) });
    return res.end(Buffer.alloc(1024));
  }
  const arq = path.join(LOJA, path.basename(url));
  if (fs.existsSync(arq)) {
    res.writeHead(200, { 'Content-Type': url.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg' });
    return res.end(fs.readFileSync(arq));
  }
  res.writeHead(404); res.end('nao');
});

const ROTEIRO = {
  titulo: 'Pano multiuso vale a pena',
  formato: '9:16 (vertical)',
  duracao: 30,
  cenas: [
    { n: 1, fala: 'Olha esse achado que custou trinta e quatro reais.', tela: 'Achado' },
    { n: 2, fala: 'Ele resolve a bancada engordurada em uma passada.', tela: 'Resolve' },
    { n: 3, fala: 'O link esta na descricao, com o preco de hoje.', tela: 'Link' }
  ],
  legenda: 'Pano multiuso — vale a pena?',
  hashtags: ['#achadinhos', '#casa'],
  produtos: [{ nome: 'Pano', url: 'https://www.amazon.com.br/dp/B0CX1234AB?tag=jev-20' }]
};

app.whenReady().then(async () => {
  const estudio = require('./estudio');
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  porta = servidor.address().port;
  const base = 'http://127.0.0.1:' + porta;
  console.log('loja de mentira em ' + base + '\n');

  /* ================================================= 1) as ferramentas */
  console.log('1) as ferramentas');
  const e1 = estudio.estado();
  ok('o estúdio tem uma pasta só dele, dentro dos dados do programa',
    e1.pasta === TEMP ? true : e1.pasta);
  ok('achou o Python', !!e1.python ? true : e1);
  ok('achou o FFmpeg', !!e1.ffmpeg ? true : e1);
  ok('a fábrica veio junto no pacote', e1.fabrica === true ? true : estudio.fabricaPy());
  ok('e o conjunto se declara pronto', e1.pronto === true ? true : e1);

  const passos = [];
  const inst = await estudio.instalar(p => passos.push(p));
  ok('a instalação termina bem', inst.ok === true ? true : inst);
  ok('e conta o que fez', passos.length > 0 ? true : passos);

  /* ============================ 1b) o atalho da Loja da Microsoft
     No Windows existe um python.exe falso dentro de WindowsApps: ele não roda
     nada, só manda instalar pela Loja. Foi ele que quebrou a montagem na
     máquina do dono. Aqui eu planto um igualzinho e exijo que seja recusado. */
  console.log('\n1b) o Python falso do Windows');
  const falso = path.join(TEMP, 'ferramentas', 'python3');
  fs.mkdirSync(path.dirname(falso), { recursive: true });
  fs.writeFileSync(falso,
    '#!/bin/sh\n' +
    'echo "Python was not found; run without arguments to install from the Microsoft Store, ' +
    'or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases."\n' +
    'exit 9009\n');
  fs.chmodSync(falso, 0o755);

  ok('o atalho falso é reprovado na pergunta', estudio.pythonServe(falso) === false ? true : 'passou');
  ok('e um Python de verdade é aprovado',
    estudio.pythonServe(e1.python) === true ? true : e1.python);
  ok('caminho que não existe também é reprovado',
    estudio.pythonServe('/nao/existe/python') === false ? true : 'passou');

  const escolhido = estudio.acharPython(true);
  ok('com o falso plantado na nossa pasta, ele NÃO é escolhido',
    escolhido !== falso && !!escolhido ? true : { escolhido, falso });
  ok('e o programa continua se dando por pronto',
    estudio.estado({ fresco: true }).pronto === true ? true : estudio.estado({ fresco: true }));

  /* um Python bom dentro da nossa pasta tem preferência sobre o do sistema */
  const bom = path.join(TEMP, 'ferramentas', 'python');
  fs.writeFileSync(bom, '#!/bin/sh\nexec ' + e1.python + ' "$@"\n');
  fs.chmodSync(bom, 0o755);
  ok('o Python que nós instalamos tem preferência sobre o da máquina',
    estudio.acharPython(true) === bom ? true : { achou: estudio.acharPython(true), esperado: bom });

  fs.unlinkSync(falso); fs.unlinkSync(bom);
  estudio.esquecerFerramentas();
  ok('depois de limpar, volta a achar o Python do sistema',
    estudio.acharPython(true) === e1.python ? true : estudio.acharPython(true));

  /* ================= 1c) a fábrica presa dentro do pacote do programa
     Quando o aplicativo é instalado, tudo vira um arquivo só (app.asar). O
     Node enxerga lá dentro, mas o Python não — e a montagem morre com
     "can't open file ...app.asar\fabrica\fabrica.py". Aqui eu monto uma
     pasta chamada app.asar igualzinha e exijo que o programa saia de lá. */
  console.log('\n1c) a fábrica presa dentro do pacote');
  ok('reconhece um caminho de dentro do pacote',
    estudio.ehDentroDoAsar('C:\\Program Files\\JeV\\resources\\app.asar\\fabrica\\fabrica.py') === true
      ? true : 'não reconheceu');
  ok('e não confunde com uma pasta comum',
    estudio.ehDentroDoAsar('C:\\JeV\\fabrica\\fabrica.py') === false ? true : 'confundiu');

  const presa = path.join(TEMP, 'recursos', 'app.asar', 'fabrica');
  fs.mkdirSync(presa, { recursive: true });
  const origemReal = path.dirname(estudio.fabricaPy());
  for (const nome of ['fabrica.py', 'cortes.py'])
    fs.copyFileSync(path.join(origemReal, nome), path.join(presa, nome));

  const solta = estudio.pastaDaFabrica([presa]);
  ok('quando só existe a cópia presa, ela é solta para fora',
    !estudio.ehDentroDoAsar(solta) && fs.existsSync(path.join(solta, 'fabrica.py'))
      ? true : solta);
  ok('e o cortes.py vem junto', fs.existsSync(path.join(solta, 'cortes.py')) ? true : solta);
  ok('a cópia solta é o arquivo inteiro, não um pedaço',
    fs.statSync(path.join(solta, 'fabrica.py')).size ===
    fs.statSync(path.join(presa, 'fabrica.py')).size ? true : 'tamanho diferente');

  /* e a prova final: o Python de verdade consegue abrir o que foi solto */
  const provaPy = spawnSync(e1.python, [path.join(solta, 'fabrica.py'), '--ajuda-inexistente'],
                            { encoding: 'utf8', timeout: 30000 });
  ok('o Python consegue abrir o arquivo solto',
    !/can't open file|No such file/i.test(String(provaPy.stderr || '') + String(provaPy.stdout || ''))
      ? true : String(provaPy.stderr || '').slice(0, 200));

  const daPasta = path.join(TEMP, 'fora'); fs.mkdirSync(daPasta, { recursive: true });
  fs.copyFileSync(path.join(presa, 'fabrica.py'), path.join(daPasta, 'fabrica.py'));
  ok('havendo uma cópia solta e uma presa, a solta ganha',
    estudio.pastaDaFabrica([presa, daPasta]) === daPasta ? true : estudio.pastaDaFabrica([presa, daPasta]));

  ok('o empacotador foi mandado deixar a fábrica fora do pacote',
    (require('./package.json').build.asarUnpack || []).some(x => /fabrica/.test(x))
      ? true : 'faltou o asarUnpack');

  /* ============================================ 2) ler a mídia da página */
  console.log('\n2) achar as fotos e o vídeo do anúncio');
  const m = await estudio.midiaDoProduto(base + '/produto');
  ok('leu a página do produto', m.ok === true ? true : m);
  ok('pegou a foto da capa (og:image)',
    m.fotos.includes(base + '/a.jpg') ? true : m.fotos);
  ok('e também a galeria da ficha estruturada',
    m.fotos.includes(base + '/b.jpg') && m.fotos.includes(base + '/c.jpg') ? true : m.fotos);
  ok('achou o vídeo do vendedor', m.videos.includes(base + '/demo.mp4') ? true : m.videos);
  ok('não repete o mesmo endereço', new Set(m.fotos).size === m.fotos.length ? true : m.fotos);

  const vazia = await estudio.midiaDoProduto(base + '/vazia');
  ok('página sem mídia não inventa foto', vazia.ok === false && !vazia.fotos.length ? true : vazia);
  ok('e explica o que fazer em vez de dar erro seco',
    /painel de afiliado/i.test(vazia.motivo) ? true : vazia.motivo);
  const naoEhUrl = await estudio.midiaDoProduto('isso não é endereço');
  ok('texto que não é endereço é recusado na hora', naoEhUrl.ok === false ? true : naoEhUrl);
  const morta = await estudio.midiaDoProduto(base + '/nao-existe');
  ok('página que não existe não derruba nada', morta.ok === false ? true : morta);

  /* endereços relativos e escapados */
  const rel = estudio.extrairMidia(
    '<meta property="og:image" content="/fotos/x.jpg?a=1&amp;b=2">', base + '/p/1');
  ok('endereço relativo vira endereço completo',
    rel.fotos[0] === base + '/fotos/x.jpg?a=1&b=2' ? true : rel.fotos);
  const lixo = estudio.extrairMidia('<meta property="og:image" content="javascript:alert(1)">', base);
  ok('endereço que não é http é jogado fora', lixo.fotos.length === 0 ? true : lixo.fotos);

  /* ==================================================== 3) limite de tamanho */
  console.log('\n3) o que vem da internet tem limite');
  let barrou = false;
  try { await estudio.baixar(base + '/gigante', path.join(TEMP, 'g.jpg'), 5 * 1024 * 1024); }
  catch (err) { barrou = /grande demais/.test(String(err.message)); }
  ok('arquivo grande demais é recusado antes de encher o disco', barrou === true ? true : barrou);

  /* ============ 3b) o FFmpeg mora só na NOSSA pasta, fora do PATH
     É a situação real do Windows: o FFmpeg que baixamos fica na pasta de
     dados do usuário e não entra no PATH do sistema. A fábrica, que mora
     dentro do programa, não tem como adivinhar esse lugar — o aplicativo
     precisa dizer. Aqui eu apago o PATH para provar que a fábrica acha o
     FFmpeg mesmo assim, só pelo que o aplicativo mandou. */
  console.log('\n3b) o FFmpeg só na nossa pasta, sem PATH');
  const ffNosso = path.join(TEMP, 'ferramentas', 'ffmpeg');
  fs.mkdirSync(ffNosso, { recursive: true });
  for (const nome of ['ffmpeg', 'ffprobe']) {
    const alvo = path.join(ffNosso, nome);
    if (!fs.existsSync(alvo)) fs.symlinkSync(spawnSync('which', [nome], { encoding: 'utf8' }).stdout.trim(), alvo);
  }
  estudio.esquecerFerramentas();
  const comNosso = estudio.estado({ fresco: true });
  ok('o aplicativo passa a usar o FFmpeg da nossa pasta',
    comNosso.ffmpeg === path.join(ffNosso, 'ffmpeg') ? true : comNosso.ffmpeg);
  ok('e acha o ffprobe do lado dele',
    comNosso.ffprobe === path.join(ffNosso, 'ffprobe') ? true : comNosso.ffprobe);

  const pathAntigo = process.env.PATH;
  process.env.PATH = '/caminho/que/nao/existe';
  const semPath = await estudio.criar({ roteiro: {
    titulo: 'Sem PATH', formato: '9:16',
    cenas: [{ n: 1, fala: 'Uma frase curta para o teste.', tela: 'oi' }]
  } });
  process.env.PATH = pathAntigo;
  ok('a fábrica monta o vídeo mesmo com o PATH vazio',
    semPath.ok === true ? true : semPath);
  ok('e ninguém reclamou de FFmpeg faltando',
    !/não encontrei o FFmpeg/i.test(String(semPath.motivo || '')) ? true : semPath.motivo);
  if (semPath.ok)
    ok('o arquivo saiu no tamanho de tela certo',
      ffprobe(semPath.arquivos[0].caminho, 'stream=width') === '1080' ? true : semPath.arquivos);

  /* ================================================= 4) montar o vídeo */
  console.log('\n4) montar o vídeo de verdade (demora um pouco)');
  const eventos = [];
  const r = await estudio.criar({
    roteiro: ROTEIRO,
    fotos: [base + '/a.jpg', base + '/b.jpg'],
    videos: [base + '/demo.mp4'],
    arquivos: [],
    trilha: null
  }, ev => eventos.push(ev));

  ok('a montagem terminou bem', r.ok === true ? true : r);
  if (r.ok) {
    ok('saíram os três formatos', (r.arquivos || []).length === 3 ? true : r.arquivos);
    const vert = r.arquivos.find(a => a.formato === '9:16');
    const hori = r.arquivos.find(a => a.formato === '16:9');
    const quad = r.arquivos.find(a => a.formato === '1:1');
    ok('a versão em pé é 1080 por 1920',
      vert && ffprobe(vert.caminho, 'stream=width') === '1080'
           && ffprobe(vert.caminho, 'stream=height') === '1920' ? true : vert);
    ok('a deitada é 1920 por 1080',
      hori && ffprobe(hori.caminho, 'stream=width') === '1920' ? true : hori);
    ok('a quadrada é 1080 por 1080',
      quad && ffprobe(quad.caminho, 'stream=height') === '1080' ? true : quad);
    ok('o arquivo tem tamanho de vídeo, não de rascunho',
      vert && vert.tamanho > 20000 ? true : (vert && vert.tamanho));
    const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', vert.caminho], { encoding: 'utf8' }).stdout);
    ok('e dura mais que os 3 segundos das três cenas juntas', dur > 3 ? true : dur);
    ok('todos os arquivos existem mesmo no disco',
      r.arquivos.every(a => fs.existsSync(a.caminho)) ? true : r.arquivos);
  }

  const pcts = eventos.filter(e => typeof e.pct === 'number').map(e => e.pct);
  ok('o andamento foi contado do começo ao fim', pcts.length > 4 ? true : pcts);
  ok('e a barra só anda para frente',
    pcts.every((p, i) => i === 0 || p >= pcts[i - 1]) ? true : pcts);
  ok('a barra chega aos 100', Math.max(...pcts) === 100 ? true : Math.max(...pcts));
  ok('as linhas da fábrica também chegam',
    eventos.some(e => e.tipo === 'linha') ? true : 'nenhuma linha');

  /* a mídia baixada foi mesmo usada */
  const dirMid = path.join(r.trabalho, 'midia');
  const usados = fs.readdirSync(dirMid);
  ok('as duas fotos e o vídeo do anúncio foram baixados para o trabalho',
    usados.length === 3 ? true : usados);
  ok('e o vídeo do vendedor veio inteiro',
    usados.some(a => a.endsWith('.mp4') && fs.statSync(path.join(dirMid, a)).size > 10000) ? true : usados);

  /* ====================================== 5) sem mídia nenhuma ainda sai vídeo */
  console.log('\n5) sem foto nenhuma');
  const semNada = await estudio.criar({ roteiro: {
    titulo: 'Sem foto', formato: '9:16', cenas: [{ n: 1, fala: 'Uma frase curta.', tela: 'oi' }]
  } });
  ok('mesmo sem foto o vídeo sai', semNada.ok === true ? true : semNada);
  ok('e no tamanho certo de tela',
    semNada.ok && ffprobe(semNada.arquivos[0].caminho, 'stream=width') === '1080' ? true : semNada.arquivos);

  /* ======================== 6) o vídeo toca dentro do aplicativo
     Aqui está a prova que o navegador de teste não consegue dar: o Electron
     tem os codecs de verdade, então se este MP4 abrir aqui, ele abre na tela
     do sistema do mesmo jeito. */
  console.log('\n6) o vídeo toca dentro do aplicativo');
  if (r.ok) {
    const { BrowserWindow } = require('electron');
    const vert = r.arquivos.find(a => a.formato === '9:16');
    const janela = new BrowserWindow({ show: false, width: 400, height: 400 });
    /* a página de teste fica ao lado do vídeo: uma página data: teria origem
       opaca e o Electron não deixaria ela ler um arquivo do disco */
    const pagina = path.join(path.dirname(vert.caminho), 'teste-player.html');
    fs.writeFileSync(pagina,
      '<!doctype html><meta charset="utf-8">' +
      '<video id="v" src="' + encodeURIComponent(path.basename(vert.caminho)) + '" preload="metadata"></video>');
    await janela.loadFile(pagina);
    const info = await janela.webContents.executeJavaScript(`
      new Promise(r => {
        const v = document.getElementById('v');
        const responde = () => r({ dur: v.duration, larg: v.videoWidth, alt: v.videoHeight, erro: !!v.error });
        if (v.readyState >= 1) return responde();
        v.addEventListener('loadedmetadata', responde, { once: true });
        v.addEventListener('error', () => r({ erro: true }), { once: true });
        setTimeout(() => r({ estourou: true }), 8000);
      })`);
    ok('o MP4 montado abre no player do aplicativo', info && !info.erro && info.dur > 0 ? true : info);
    ok('com a imagem em pé (mais alto que largo)',
      info && info.alt > info.larg ? true : info);
    janela.destroy();
  }

  /* ================= 6a) baixar a mídia do anúncio e guardar no produto
     Aqui é o passo que o dono pediu: um botão que traz as fotos e o vídeo
     da página de onde o produto foi garimpado, guarda no computador, e daí
     em diante o vídeo é montado com ESSES arquivos.                       */
  console.log('\n6a) baixar a mídia do anúncio para a pasta do produto');
  const alvo = 'http://127.0.0.1:' + porta + '/produto';
  const bx = await estudio.baixarMidias({ chave: 'p7 Pano/multi:uso', nome: 'Pano', urls: [alvo] });
  ok('baixou o material do anúncio', bx.ok === true ? true : bx);
  ok('e trouxe as três fotos e o vídeo do vendedor',
    bx.arquivos.length === 4 ? true : bx.arquivos.map(a => a.nome));
  ok('o vídeo do vendedor encabeça a lista',
    bx.arquivos[0] && bx.arquivos[0].tipo === 'video' ? true : bx.arquivos.map(a => a.tipo));
  ok('os arquivos existem mesmo no disco, com tamanho',
    bx.arquivos.every(a => fs.existsSync(a.caminho) && a.tamanho > 0) ? true : bx.arquivos);
  ok('e a pasta não herda barra nem dois-pontos do nome do produto',
    !/[\\/:]/.test(path.basename(bx.pasta)) ? true : bx.pasta);

  const guardadas = estudio.midiasGuardadas('p7 Pano/multi:uso');
  ok('perguntar de novo devolve o que já está guardado',
    guardadas.length === 4 ? true : guardadas.length);

  /* o teste que importa: o vídeo montado com o que foi baixado */
  const comBaixado = await estudio.criar({
    roteiro: { titulo: 'Com o material baixado',
               cenas: [{ fala: 'primeira' }, { fala: 'segunda' }, { fala: 'terceira' }] },
    arquivos: guardadas.map(a => a.caminho)
  });
  ok('o vídeo é montado com o material baixado', comBaixado.ok === true ? true : comBaixado);
  if (comBaixado.ok) {
    const vert = comBaixado.arquivos.find(a => a.formato === '9:16');
    ok('e sai em pé, no tamanho das plataformas',
      ffprobe(vert.caminho, 'stream=width') === '1080' &&
      ffprobe(vert.caminho, 'stream=height') === '1920' ? true : vert);
  }

  const bloqueada = await estudio.baixarMidias({ chave: 'bloqueada', urls: [
    'http://127.0.0.1:' + porta + '/vazia'] });
  ok('página que não publica nada é recusada', bloqueada.ok === false ? true : bloqueada);
  ok('com o motivo escrito e o caminho da saída',
    /painel do vendedor/i.test(bloqueada.motivo || '') ? true : bloqueada.motivo);

  const semEndereco = await estudio.baixarMidias({ chave: 'sem-endereco', urls: [] });
  ok('produto sem endereço do anúncio também é recusado sem quebrar',
    semEndereco.ok === false && !!semEndereco.motivo ? true : semEndereco);

  ok('apagar o material baixado libera a pasta',
    estudio.limparMidias('p7 Pano/multi:uso') === true &&
    estudio.midiasGuardadas('p7 Pano/multi:uso').length === 0 ? true : 'não apagou');

  /* ====================== 6b) a IA de vídeo local, examinada de verdade
     Esta máquina de teste não tem placa NVIDIA — que é exatamente o caso
     mais comum na casa de quem vai usar o programa. O que precisa ser
     provado aqui é que o não vem RÁPIDO e por escrito, e que o programa não
     tenta baixar 8 GB para uma máquina que não vai rodar nada.            */
  console.log('\n6b) a IA de vídeo local');
  const ia = estudio.iaEstado();
  ok('o exame da máquina responde alguma coisa', ia && typeof ia === 'object' ? true : ia);
  ok('e sempre diz por escrito o que viu', !!ia.motivo ? true : ia);
  ok('nesta máquina sem placa NVIDIA, ela não se diz pronta',
    ia.pronto === false ? true : ia);
  ok('e não se oferece para instalar o que não vai funcionar',
    ia.pode_instalar === false ? true : ia);

  const tentou = await estudio.iaInstalar();
  ok('mandar instalar mesmo assim é recusado, sem baixar nada',
    tentou.ok === false ? true : tentou);
  ok('e a recusa explica o motivo', !!tentou.motivo ? true : tentou);

  ok('a peça de IA foi junto no pacote, fora do app.asar',
    fs.existsSync(estudio.iaLocalPy()) ? true : estudio.iaLocalPy());

  /* o vídeo tem que sair do mesmo jeito com a IA pedida e indisponível:
     ela é um extra, nunca um pedágio */
  const comIaPedida = await estudio.criar({
    roteiro: { titulo: 'Com IA pedida', cenas: [{ fala: 'primeira' }, { fala: 'segunda' }] },
    arquivos: [path.join(LOJA, 'a.jpg')], ia: true
  });
  ok('pedir a IA numa máquina que não tem placa não derruba a montagem',
    comIaPedida.ok === true ? true : comIaPedida);

  /* ================================================ 7) recusas e limpeza */
  console.log('\n7) recusas e limpeza');
  const semCena = await estudio.criar({ roteiro: { titulo: 'Vazio', cenas: [] } });
  ok('roteiro sem cena não vira vídeo', semCena.ok === false ? true : semCena);
  ok('e diz por quê', !!semCena.motivo ? true : semCena);

  ok('parar sem nada rodando não quebra', estudio.parar() === false ? true : 'devolveu true');

  const antes = fs.readdirSync(path.join(TEMP, 'trabalhos')).length;
  const apagados = estudio.faxina(1);
  const depois = fs.readdirSync(path.join(TEMP, 'trabalhos')).length;
  ok('a faxina apaga trabalho antigo e guarda o mais novo',
    depois === 1 && apagados === antes - 1 ? true : { antes, depois, apagados });

  console.log('');
  console.log(falhas ? falhas + ' FALHA(S)' : 'Tudo certo — o estúdio monta vídeo de verdade.');
  servidor.close();
  try { fs.rmSync(TEMP, { recursive: true, force: true }); } catch (e) {}
  try { fs.rmSync(LOJA, { recursive: true, force: true }); } catch (e) {}
  app.exit(falhas ? 1 : 0);
}).catch(e => {
  console.error('EXPLODIU:', e);
  app.exit(1);
});

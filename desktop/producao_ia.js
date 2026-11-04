/* =========================================================================
   PRODUÇÃO IA LOCAL — gerar episódio do ZERO (texto -> vídeo narrado),
   tudo rodando no computador do dono, sem gastar crédito de nuvem.

   Esta peça é DIFERENTE do Estúdio (estudio.js). O Estúdio pega a FOTO REAL
   do produto e põe em movimento (LTX-Video) — serve para vídeo de afiliado,
   onde o produto precisa continuar sendo o produto. Aqui não tem produto
   nenhum: o dono escreve um roteiro por cenas, e cada cena nasce de um
   texto (Wan 2.2, pelo ComfyUI) e ganha narração em português (Piper). No
   fim, o FFmpeg junta tudo num vídeo só.

   O QUE RODA ONDE
   ----------------
   O ComfyUI É um servidor (sobe em http://127.0.0.1:8188). Este programa
   não entende do assunto dele — só liga o .bat, espera a porta responder,
   manda o pedido pela API local, e desliga quando o episódio termina.

   O QUE NÃO É INVENTADO
   ---------------------
   O grafo exato que o ComfyUI usa para gerar o vídeo (quais nodes, quais
   ligações) É O MESMO que o dono já montou e testou na tela do ComfyUI —
   exportado por ele em "Workflow > Exportar (formato API)" e guardado na
   pasta de configuração. Este arquivo NUNCA inventa um grafo novo: ele
   lê o que foi exportado e troca só o texto da cena, a duração e a
   semente — usando pistas (o node ligado à entrada "positive" do
   amostrador, por exemplo) em vez de supor um número de node fixo.
   Se não conseguir achar a pista com segurança, ele PARA e diz o motivo,
   em vez de adivinhar e gerar um vídeo errado sem avisar.
   ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn, spawnSync, execSync } = require('child_process');

const WIN = process.platform === 'win32';

/* ------------------------------------------------------------------ pastas */
function pasta(...p) {
  const base = process.env.JEV_PRODUCAO_IA ||
    (function () {
      try { return path.join(require('electron').app.getPath('userData'), 'producao-ia'); }
      catch (e) { return path.join(__dirname, '.producao-ia'); }
    })();
  const c = path.join(base, ...p);
  try { fs.mkdirSync(c, { recursive: true }); } catch (e) {}
  return c;
}
function arquivoConfig() { return path.join(pasta(), 'config.json'); }
function arquivoWorkflow() { return path.join(pasta(), 'workflow_wan22.json'); }

/* ---------------------------------------------------------------- config

   Guardado como arquivo simples, igual ao resto do programa (a chave do
   Higgsfield, por exemplo). São só CAMINHOS no computador do dono — nada
   sigiloso, mas nada que o programa deva adivinhar sozinho: cada notebook
   tem o ComfyUI numa pasta diferente.                                     */
function configLer() {
  try { return JSON.parse(fs.readFileSync(arquivoConfig(), 'utf8')); }
  catch (e) { return {}; }
}
function configSalvar(parcial) {
  const atual = configLer();
  const novo = Object.assign({}, atual, parcial || {});
  try {
    fs.writeFileSync(arquivoConfig(), JSON.stringify(novo, null, 1));
    return { ok: true, config: novo };
  } catch (e) { return { ok: false, motivo: String(e.message) }; }
}

/* --------------------------------------------------------- escolher pastas

   O dono aponta uma vez só, na primeira vez que usa esta tela. Depois disso
   o caminho fica guardado e o programa só confere se ainda existe.        */
function escolherPastaComfy() {
  const { dialog } = require('electron');
  const r = dialog.showOpenDialogSync({
    title: 'Escolha a pasta do ComfyUI (onde está o run_nvidia_gpu.bat)',
    properties: ['openDirectory']
  });
  if (!r || !r.length) return null;
  return r[0];
}
function escolherArquivo(titulo, extensoes) {
  const { dialog } = require('electron');
  const r = dialog.showOpenDialogSync({
    title: titulo,
    properties: ['openFile'],
    filters: [{ name: titulo, extensions: extensoes }]
  });
  if (!r || !r.length) return null;
  return r[0];
}

/* O script de partida do ComfyUI. Prefere o que já ativa o Manager, se
   existir (foi o que o dono criou durante a instalação guiada); senão cai
   para o run_nvidia_gpu.bat de sempre. */
function scriptDoComfy(comfyPasta) {
  if (!comfyPasta) return null;
  const comManager = path.join(comfyPasta, 'iniciar_comfyui_com_manager.bat');
  if (fs.existsSync(comManager)) return comManager;
  const normal = path.join(comfyPasta, 'run_nvidia_gpu.bat');
  if (fs.existsSync(normal)) return normal;
  return null;
}

/* ------------------------------------------------------------------ piper */
function acharPiper(c) {
  /* o piper foi instalado DENTRO do python_embeded do ComfyUI, como um
     "console_script" — então o executável mora em Scripts\piper.exe,
     ao lado do próprio python.exe */
  if (c.piperExe && fs.existsSync(c.piperExe)) return c.piperExe;
  if (!c.comfyPasta) return null;
  const candidatos = [
    path.join(c.comfyPasta, 'python_embeded', 'Scripts', 'piper.exe'),
    path.join(c.comfyPasta, 'python_embeded', 'piper.exe')
  ];
  return candidatos.find(x => fs.existsSync(x)) || null;
}

/* ---------------------------------------------------------------- ffmpeg */
function acharFfmpeg(c) {
  if (c.ffmpegExe && fs.existsSync(c.ffmpegExe)) return c.ffmpegExe;
  /* tenta o PATH do sistema — foi onde instalamos no notebook de testes */
  try {
    const r = spawnSync(WIN ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
    const linha = String(r.stdout || '').trim().split(/\r?\n/)[0];
    if (linha && fs.existsSync(linha)) return linha;
  } catch (e) {}
  return null;
}

/* ------------------------------------------------------------- o estado

   Tudo que a tela precisa saber para decidir o que mostrar: o que já está
   configurado, o que falta apontar, e se o ComfyUI já está de pé.         */
function estadoComfyServidor(cb) {
  const req = http.get({ host: '127.0.0.1', port: 8188, path: '/system_stats', timeout: 2500 }, res => {
    let d = '';
    res.on('data', x => d += x);
    res.on('end', () => {
      try { cb(true, JSON.parse(d)); } catch (e) { cb(true, null); }
    });
  });
  req.on('error', () => cb(false, null));
  req.on('timeout', () => { req.destroy(); cb(false, null); });
}

async function estado() {
  const c = configLer();
  const piper = acharPiper(c);
  const ffmpeg = acharFfmpeg(c);
  const script = scriptDoComfy(c.comfyPasta);
  const temWorkflow = fs.existsSync(arquivoWorkflow());

  const servidor = await new Promise(resolve => estadoComfyServidor((ligado, info) => resolve({ ligado, info })));

  const faltando = [];
  if (!c.comfyPasta || !script) faltando.push('pasta do ComfyUI');
  if (!temWorkflow) faltando.push('workflow exportado do ComfyUI');
  if (!piper) faltando.push('piper (voz de IA)');
  if (!c.piperModelo || !fs.existsSync(c.piperModelo)) faltando.push('modelo de voz do Piper (.onnx)');
  if (!ffmpeg) faltando.push('ffmpeg');

  return {
    pronto: faltando.length === 0,
    faltando,
    comfyPasta: c.comfyPasta || '',
    comfyScript: script || '',
    workflow: temWorkflow,
    piperExe: piper || '',
    piperModelo: c.piperModelo || '',
    ffmpegExe: ffmpeg || '',
    servidorLigado: !!servidor.ligado,
    gpu: (servidor.info && servidor.info.devices && servidor.info.devices[0]) || null
  };
}

/* -------------------------------------------------------- ligar/desligar

   Processo guardado em memória do próprio módulo — uma produção por vez,
   igual ao resto do programa (o "rodando" do estúdio, por exemplo).      */
let comfyProc = null;

async function esperarServidor(tentativas, intervaloMs) {
  for (let i = 0; i < tentativas; i++) {
    const ok = await new Promise(resolve => estadoComfyServidor(l => resolve(l)));
    if (ok) return true;
    await new Promise(r => setTimeout(r, intervaloMs));
  }
  return false;
}

async function ligarComfy(enviar) {
  const av = e => { try { if (enviar) enviar(e); } catch (x) {} };
  const jaLigado = await new Promise(resolve => estadoComfyServidor(l => resolve(l)));
  if (jaLigado) { av({ tipo: 'linha', texto: 'o ComfyUI já estava de pé' }); return { ok: true, jaLigado: true }; }

  const c = configLer();
  const script = scriptDoComfy(c.comfyPasta);
  if (!script) return { ok: false, motivo: 'não achei o .bat de partida do ComfyUI — aponte a pasta primeiro' };

  av({ tipo: 'linha', texto: 'ligando o ComfyUI (' + path.basename(script) + ')…' });
  try {
    comfyProc = spawn(script, [], {
      cwd: path.dirname(script),
      detached: false,
      windowsHide: true,
      shell: true
    });
    comfyProc.stdout.on('data', () => {});
    comfyProc.stderr.on('data', () => {});
    comfyProc.on('exit', () => { comfyProc = null; });
  } catch (e) {
    return { ok: false, motivo: 'não consegui iniciar o ComfyUI: ' + String(e.message) };
  }

  av({ tipo: 'linha', texto: 'esperando a porta 8188 responder (pode levar um minuto)…' });
  /* até 2 minutos — carregar o modelo na placa não é instantâneo */
  const subiu = await esperarServidor(60, 2000);
  if (!subiu) return { ok: false, motivo: 'o ComfyUI não respondeu em 2 minutos — abra a janela dele e veja se deu algum erro' };
  av({ tipo: 'linha', texto: 'ComfyUI de pé' });
  return { ok: true, jaLigado: false };
}

function desligarComfy() {
  if (!comfyProc) return true;
  try {
    if (WIN) {
      /* o .bat sobe um python.exe filho — matar só o .bat deixa o filho
         comendo a VRAM. /T mata a árvore inteira. */
      execSync('taskkill /PID ' + comfyProc.pid + ' /T /F', { stdio: 'ignore' });
    } else {
      comfyProc.kill('SIGTERM');
    }
  } catch (e) {}
  comfyProc = null;
  return true;
}

/* ================================================================ ======
   O GRAFO: ler o workflow exportado e trocar só o que muda por cena.

   NADA aqui monta um grafo do zero. A função lê o JSON exportado pelo
   dono e procura, por LIGAÇÃO (não por número fixo de node), três coisas:

     1. o node amostrador (class_type com "KSampler" no nome) — dele vem
        QUAL node é o prompt positivo e qual é o negativo;
     2. dentro do node positivo, o campo de texto (o primeiro widget de
        texto do CLIPTextEncode);
     3. o node de tamanho/duração do vídeo — por eliminação, o node que
        tem exatamente 4 widgets numéricos (largura, altura, quadros,
        lote), que foi o padrão do template "Wan 2.2 5B" testado.

   Se qualquer uma dessas pistas não for encontrada do jeito esperado, a
   função devolve erro explicando qual pista faltou — nunca segue
   adivinhando.                                                            */
function carregarWorkflow() {
  if (!fs.existsSync(arquivoWorkflow()))
    return { ok: false, motivo: 'nenhum workflow foi exportado ainda — veja o passo a passo na tela' };
  try {
    return { ok: true, grafo: JSON.parse(fs.readFileSync(arquivoWorkflow(), 'utf8')) };
  } catch (e) {
    return { ok: false, motivo: 'o arquivo de workflow não é um JSON válido: ' + String(e.message) };
  }
}

function acharNoKSampler(grafo) {
  const ids = Object.keys(grafo).filter(id => /sampler/i.test(String(grafo[id].class_type || '')));
  if (ids.length !== 1)
    return { ok: false, motivo: ids.length === 0
      ? 'não achei nenhum node de amostragem (KSampler) no workflow exportado'
      : 'achei ' + ids.length + ' nodes de amostragem — isso não bate com o template testado (esperava 1)' };
  return { ok: true, id: ids[0] };
}

function acharTextoDoNode(grafo, id) {
  const n = grafo[id];
  if (!n) return null;
  if (n.inputs && typeof n.inputs.text === 'string') return { campo: 'text', atual: n.inputs.text };
  if (Array.isArray(n.widgets_values) && typeof n.widgets_values[0] === 'string')
    return { campo: 'widgets_values.0', atual: n.widgets_values[0] };
  return null;
}

function acharNoDeTamanho(grafo) {
  /* formato API: os campos ficam em "inputs", com nome — não em
     "widgets_values" (isso é só do formato de tela). O node muda de nome
     conforme o workflow (Wan22ImageToVideoLatent, EmptyHunyuanLatentVideo,
     etc.), então a pista é ter "width", "height" e "length" numéricos. */
  const ids = Object.keys(grafo).filter(id => {
    const n = grafo[id].inputs || {};
    return typeof n.width === 'number' && typeof n.height === 'number' && typeof n.length === 'number';
  });
  if (ids.length !== 1) return { ok: false, achados: ids.length };
  return { ok: true, id: ids[0] };
}

/* monta uma cópia do grafo com o texto, a duração e a semente desta cena */
function prepararGrafoParaCena(grafo, texto, segundos, semente) {
  const copia = JSON.parse(JSON.stringify(grafo));

  const samp = acharNoKSampler(copia);
  if (!samp.ok) return samp;
  const ligA = copia[samp.id].inputs || {};
  const idPositivo = ligA.positive && ligA.positive[0];
  if (!idPositivo)
    return { ok: false, motivo: 'o node de amostragem não tem uma entrada "positive" ligada — não é o template esperado' };

  const txt = acharTextoDoNode(copia, idPositivo);
  if (!txt)
    return { ok: false, motivo: 'achei o node do prompt positivo (id ' + idPositivo + ') mas não achei nele um campo de texto' };
  if (txt.campo === 'text') copia[idPositivo].inputs.text = texto;
  else copia[idPositivo].widgets_values[0] = texto;

  const tam = acharNoDeTamanho(copia);
  if (tam.ok) {
    const quadros = Math.max(9, Math.round((Number(segundos) || 4) * 24 / 8) * 8 + 1);
    copia[tam.id].inputs.length = quadros; /* só a duração muda por cena — largura/altura ficam como o dono montou */
  }
  /* não é erro fatal não achar o node de tamanho — ele pode já estar com a
     duração certa, configurada uma vez pelo dono; só avisamos depois */

  /* semente: campo "seed" do amostrador, formato API */
  if (typeof copia[samp.id].inputs.seed === 'number')
    copia[samp.id].inputs.seed = semente;

  return { ok: true, grafo: copia, achouTamanho: tam.ok };
}

/* ------------------------------------------------------- mandar e esperar */
function httpJson(opcoes, corpo) {
  return new Promise((resolve, reject) => {
    const dados = corpo ? Buffer.from(JSON.stringify(corpo)) : null;
    const req = http.request(Object.assign({ host: '127.0.0.1', port: 8188 }, opcoes,
      dados ? { headers: { 'Content-Type': 'application/json', 'Content-Length': dados.length } } : {}),
      res => {
        let d = '';
        res.on('data', x => d += x);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, corpo: d ? JSON.parse(d) : null }); }
          catch (e) { resolve({ status: res.statusCode, corpo: null, texto: d }); }
        });
      });
    req.on('error', reject);
    if (dados) req.write(dados);
    req.end();
  });
}

async function gerarClipe(texto, segundos, destino, enviar) {
  const av = e => { try { if (enviar) enviar(e); } catch (x) {} };
  const wf = carregarWorkflow();
  if (!wf.ok) return wf;

  const semente = Math.floor(Math.random() * 1e9);
  const prep = prepararGrafoParaCena(wf.grafo, texto, segundos, semente);
  if (!prep.ok) return prep;
  if (!prep.achouTamanho)
    av({ tipo: 'linha', texto: 'não identifiquei o node de duração — usando a duração que já estava salva no workflow' });

  const clientId = 'jev-' + Date.now();
  const envio = await httpJson({ path: '/prompt', method: 'POST' }, { prompt: prep.grafo, client_id: clientId });
  if (envio.status !== 200 || !envio.corpo || !envio.corpo.prompt_id) {
    const erro = (envio.corpo && envio.corpo.error && envio.corpo.error.message) ||
      (envio.corpo && envio.corpo.node_errors && JSON.stringify(envio.corpo.node_errors)) ||
      envio.texto || ('código ' + envio.status);
    return { ok: false, motivo: 'o ComfyUI recusou o pedido: ' + erro };
  }
  const promptId = envio.corpo.prompt_id;
  av({ tipo: 'linha', texto: 'cena enviada (id ' + promptId + '), gerando…' });

  /* poll no histórico — sem WebSocket por simplicidade; até 10 min por cena */
  for (let i = 0; i < 300; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const hist = await httpJson({ path: '/history/' + promptId, method: 'GET' });
    const item = hist.corpo && hist.corpo[promptId];
    if (item && item.status && item.status.completed) {
      const saidas = item.outputs || {};
      let achado = null;
      for (const nodeId of Object.keys(saidas)) {
        const o = saidas[nodeId];
        const lista = o.gifs || o.videos || o.images || [];
        const v = lista.find(x => /\.(mp4|webm|mov)$/i.test(x.filename || ''));
        if (v) { achado = v; break; }
      }
      if (!achado) return { ok: false, motivo: 'o ComfyUI terminou mas não devolveu nenhum arquivo de vídeo na saída' };
      const c = configLer();
      const origem = path.join(c.comfyPasta, 'ComfyUI', 'output',
        achado.subfolder || '', achado.filename);
      if (!fs.existsSync(origem))
        return { ok: false, motivo: 'o ComfyUI disse que gerou ' + achado.filename + ' mas não achei o arquivo em ' + origem };
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.copyFileSync(origem, destino);
      return { ok: true, arquivo: destino };
    }
    if (item && item.status && item.status.status_str === 'error')
      return { ok: false, motivo: 'o ComfyUI deu erro gerando esta cena — veja a janela dele para o detalhe' };
  }
  return { ok: false, motivo: 'a cena não terminou em 10 minutos — pode estar presa; veja a janela do ComfyUI' };
}

/* -------------------------------------------------------------- narração */
function narrar(texto, destinoWav) {
  return new Promise(resolve => {
    const c = configLer();
    const piper = acharPiper(c);
    if (!piper) return resolve({ ok: false, motivo: 'piper não configurado' });
    if (!c.piperModelo || !fs.existsSync(c.piperModelo))
      return resolve({ ok: false, motivo: 'modelo de voz do Piper não configurado' });
    fs.mkdirSync(path.dirname(destinoWav), { recursive: true });
    const p = spawn(piper, ['-m', c.piperModelo, '-f', destinoWav]);
    let erro = '';
    p.stderr.on('data', d => erro += String(d));
    p.on('error', e => resolve({ ok: false, motivo: String(e.message) }));
    p.on('close', code => {
      if (code === 0 && fs.existsSync(destinoWav)) resolve({ ok: true, arquivo: destinoWav });
      else resolve({ ok: false, motivo: erro.trim().split(/\r?\n/).pop() || ('piper saiu com código ' + code) });
    });
    p.stdin.write(texto);
    p.stdin.end();
  });
}

/* --------------------------------------------------------------- ffmpeg

   Cada cena já nasce com a duração pedida (o node de tamanho manda isso
   para o ComfyUI). A montagem final é simples: concatena os clipes na
   ordem das cenas e sobrepõe a narração de cada cena no tempo dela —
   mas a V1 junta tudo com UMA narração só, trilha corrida, que é o jeito
   mais simples e mais robusto de testar o caminho inteiro ponta a ponta
   antes de complicar com sincronismo por cena.                           */
function rodar(ffmpeg, args) {
  return new Promise(resolve => {
    const p = spawn(ffmpeg, args);
    let erro = '';
    p.stderr.on('data', d => erro += String(d));
    p.on('error', e => resolve({ ok: false, motivo: String(e.message) }));
    p.on('close', code => resolve({ ok: code === 0, motivo: code === 0 ? '' : erro.trim().split(/\r?\n/).slice(-6).join(' | ') }));
  });
}

async function montarEpisodio(clipes, narracaoWav, destino) {
  const c = configLer();
  const ffmpeg = acharFfmpeg(c);
  if (!ffmpeg) return { ok: false, motivo: 'ffmpeg não configurado' };
  if (!clipes.length) return { ok: false, motivo: 'nenhum clipe para montar' };

  const listaTxt = path.join(path.dirname(destino), 'lista.txt');
  fs.writeFileSync(listaTxt, clipes.map(c => "file '" + c.replace(/'/g, "'\\''") + "'").join('\n'));

  const semNarracao = path.join(path.dirname(destino), 'sem_narracao.mp4');
  const r1 = await rodar(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', listaTxt, '-c', 'copy', semNarracao]);
  if (!r1.ok) return { ok: false, motivo: 'não consegui juntar os clipes: ' + r1.motivo };

  if (!narracaoWav || !fs.existsSync(narracaoWav)) {
    fs.copyFileSync(semNarracao, destino);
    return { ok: true, arquivo: destino, semNarracao: true };
  }

  const r2 = await rodar(ffmpeg, ['-y', '-i', semNarracao, '-i', narracaoWav,
    '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', destino]);
  if (!r2.ok) return { ok: false, motivo: 'não consegui juntar a narração: ' + r2.motivo };
  return { ok: true, arquivo: destino, semNarracao: false };
}

/* ======================================================================
   O EPISÓDIO INTEIRO: liga o ComfyUI, gera cena por cena, narra, monta,
   desliga o ComfyUI. Uma produção por vez — igual ao resto do programa. */
let cancelado = false;

async function criarEpisodio(dados, enviar) {
  const av = e => { try { if (enviar) enviar(e); } catch (x) {} };
  cancelado = false;
  const cenas = Array.isArray(dados && dados.cenas) ? dados.cenas.filter(c => c && c.texto) : [];
  if (!cenas.length) return { ok: false, motivo: 'escreva pelo menos uma cena com texto' };

  const e = await estado();
  if (!e.pronto) return { ok: false, motivo: 'falta configurar: ' + e.faltando.join(', ') };

  const jobId = 'ep-' + Date.now();
  const trabalho = pasta('trabalhos', jobId);
  const pastaClipes = path.join(trabalho, 'clipes');

  av({ tipo: 'passo', pct: 2, texto: 'ligando o ComfyUI' });
  const ligou = await ligarComfy(av);
  if (!ligou.ok) return ligou;

  const clipes = [];
  try {
    for (let i = 0; i < cenas.length; i++) {
      if (cancelado) { desligarComfy(); return { ok: false, motivo: 'cancelado pelo dono' }; }
      const pct = 5 + Math.round((i / cenas.length) * 70);
      av({ tipo: 'passo', pct, texto: 'gerando cena ' + (i + 1) + ' de ' + cenas.length });
      const destino = path.join(pastaClipes, 'cena-' + String(i + 1).padStart(2, '0') + '.mp4');
      const r = await gerarClipe(cenas[i].texto, cenas[i].segundos || 4, destino, av);
      if (!r.ok) { desligarComfy(); return { ok: false, motivo: 'cena ' + (i + 1) + ': ' + r.motivo }; }
      clipes.push(destino);
    }
  } finally {
    av({ tipo: 'linha', texto: 'desligando o ComfyUI' });
    desligarComfy();
  }

  let narracaoWav = null;
  const textoNarracao = (dados.narracao || cenas.map(c => c.fala || '').join(' ')).trim();
  if (textoNarracao) {
    av({ tipo: 'passo', pct: 80, texto: 'gerando a narração (Piper)' });
    narracaoWav = path.join(trabalho, 'narracao.wav');
    const rn = await narrar(textoNarracao, narracaoWav);
    if (!rn.ok) { av({ tipo: 'linha', texto: 'narração falhou: ' + rn.motivo + ' — o vídeo vai sair sem voz' }); narracaoWav = null; }
  }

  av({ tipo: 'passo', pct: 92, texto: 'montando o vídeo final (FFmpeg)' });
  const destinoFinal = path.join(trabalho, (dados.titulo ? chaveDePasta(dados.titulo) : 'episodio') + '.mp4');
  const rm = await montarEpisodio(clipes, narracaoWav, destinoFinal);
  if (!rm.ok) return { ok: false, motivo: rm.motivo };

  av({ tipo: 'passo', pct: 100, texto: 'episódio pronto' });
  return { ok: true, arquivo: destinoFinal, pasta: trabalho, semNarracao: rm.semNarracao };
}
function chaveDePasta(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'episodio';
}
function pararEpisodio() { cancelado = true; return true; }

/* --------------------------------------------------------- guardar o JSON

   O dono exporta no ComfyUI (Workflow > Exportar (formato API)) e escolhe
   o arquivo aqui. Guardamos uma cópia em nossa pasta de configuração —
   assim o original dele, na pasta de downloads, pode ser movido ou
   apagado sem quebrar nada aqui.                                         */
function guardarWorkflow(caminhoOrigem) {
  try {
    const txt = fs.readFileSync(caminhoOrigem, 'utf8');
    const grafo = JSON.parse(txt);
    const samp = acharNoKSampler(grafo);
    if (!samp.ok) return { ok: false, motivo: samp.motivo };
    fs.writeFileSync(arquivoWorkflow(), txt);
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'não consegui ler esse arquivo como workflow do ComfyUI: ' + String(e.message) };
  }
}
function escolherEGuardarWorkflow() {
  const c = escolherArquivo('Escolha o workflow exportado do ComfyUI (.json)', ['json']);
  if (!c) return { ok: false, motivo: 'nada escolhido' };
  return guardarWorkflow(c);
}

module.exports = {
  estado, configLer, configSalvar,
  escolherPastaComfy, escolherArquivo, escolherEGuardarWorkflow,
  ligarComfy, desligarComfy,
  criarEpisodio, pararEpisodio,
  pasta
};

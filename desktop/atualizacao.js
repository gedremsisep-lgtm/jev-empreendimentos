/* =========================================================================
   JeV Empreendimentos — motor de versões do sistema
   -------------------------------------------------------------------------
   O sistema inteiro é um arquivo só (index.html). Atualizar, portanto, é
   trocar esse arquivo — não precisa reinstalar o programa.

   Como fica gravado no computador (dentro da pasta de dados do aplicativo):

     sistema/
       atual/      index.html + ficha.json   ← é este que abre
       anterior/   index.html + ficha.json   ← guardado para voltar atrás
       pendente/   index.html + ficha.json   ← baixado, ainda não usado
       estado.json                           ← em que pé está a atualização
       historico.json                        ← o que já foi aplicado

   A regra de segurança: uma versão nova só vira "a boa" depois de o sistema
   reiniciar com ela e passar no autoteste. Se ela não abrir, ou se o
   autoteste reprovar, o programa volta sozinho para a anterior.
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const FONTE_PADRAO_DONO = 'gedremsisep-lgtm';
const FONTE_PADRAO_REPO = 'jev-empreendimentos';

let RAIZ = null;          // <userData>/sistema
let EMBUTIDO = null;      // <app>/app/index.html
let VERSAO_APP = '0.0.0'; // versão do programa (package.json)

/* ---------------------------------------------------------------- utilidades */
function lerJson(arq, padrao) {
  try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (e) { return padrao; }
}
function gravarJson(arq, obj) {
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, JSON.stringify(obj, null, 2));
}
function cmpVer(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
  return 0;
}
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function agora() { return new Date().toISOString(); }

function pasta(nome) { return path.join(RAIZ, nome); }
function arqIndex(nome) { return path.join(RAIZ, nome, 'index.html'); }
function ficha(nome) { return lerJson(path.join(RAIZ, nome, 'ficha.json'), null); }
function existe(nome) { return fs.existsSync(arqIndex(nome)); }

function apagar(nome) {
  try { fs.rmSync(pasta(nome), { recursive: true, force: true }); } catch (e) {}
}
function mover(de, para) {
  apagar(para);
  try { fs.renameSync(pasta(de), pasta(para)); }
  catch (e) { fs.cpSync(pasta(de), pasta(para), { recursive: true }); apagar(de); }
}
function guardar(nome, html, meta) {
  apagar(nome);
  fs.mkdirSync(pasta(nome), { recursive: true });
  fs.writeFileSync(arqIndex(nome), html);
  gravarJson(path.join(RAIZ, nome, 'ficha.json'), meta);
}

/* ---------------------------------------------------------------- estado */
const ESTADO_ZERO = {
  fase: 'ok',            // 'ok' | 'testando'
  tentativas: 0,
  emTeste: null,
  recado: null,          // aviso para mostrar assim que a tela abrir
  fonte: '',
  automatico: true,
  ultimaChecagem: 0
};
function lerEstado() { return Object.assign({}, ESTADO_ZERO, lerJson(path.join(RAIZ, 'estado.json'), {})); }
function gravarEstado(e) { gravarJson(path.join(RAIZ, 'estado.json'), e); return e; }
function mexerEstado(fn) { const e = lerEstado(); fn(e); return gravarEstado(e); }

function anotarHistorico(item) {
  const arq = path.join(RAIZ, 'historico.json');
  const h = lerJson(arq, []);
  h.unshift(Object.assign({ quando: agora() }, item));
  gravarJson(arq, h.slice(0, 40));
}
function historico() { return lerJson(path.join(RAIZ, 'historico.json'), []); }

/* ---------------------------------------------------------------- endereço da fonte */
function fonteDeOndeVemAsAtualizacoes(pacote) {
  const e = lerEstado();
  if (e.fonte) return e.fonte.replace(/\/*$/, '/');
  let dono = FONTE_PADRAO_DONO, repo = FONTE_PADRAO_REPO;
  try {
    const url = (pacote.repository && pacote.repository.url) || '';
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
    if (m && !/SEU-USUARIO/i.test(m[1])) { dono = m[1]; repo = m[2]; }
  } catch (err) {}
  return `https://raw.githubusercontent.com/${dono}/${repo}/main/atualizacao/`;
}

/* ---------------------------------------------------------------- baixar */
function baixar(url, saltos) {
  saltos = saltos == null ? 6 : saltos;
  return new Promise((ok, err) => {
    if (saltos < 0) return err(new Error('endereço redireciona demais'));
    /* http só serve para uma cópia na rede de casa; na internet é sempre https */
    const via = /^http:/i.test(url) ? http : https;
    const req = via.get(url, {
      headers: { 'User-Agent': 'JeV-Empreendimentos', 'Cache-Control': 'no-cache' },
      timeout: 45000
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return ok(baixar(new URL(res.headers.location, url).href, saltos - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return err(new Error('o servidor respondeu ' + res.statusCode));
      }
      const partes = [];
      res.on('data', d => partes.push(d));
      res.on('end', () => ok(Buffer.concat(partes)));
    });
    req.on('timeout', () => { req.destroy(new Error('a internet demorou demais para responder')); });
    req.on('error', err);
  });
}

/* =========================================================================
   ARRANQUE — decide qual index.html abrir
   ========================================================================= */
function preparar(opcoes) {
  RAIZ = path.join(opcoes.pastaDados, 'sistema');
  EMBUTIDO = opcoes.embutido;
  VERSAO_APP = opcoes.versaoApp;
  fs.mkdirSync(RAIZ, { recursive: true });

  const e = lerEstado();

  /* 1. primeira vez, ou o programa foi reinstalado com um sistema mais novo
        dentro: a cópia que vem no instalador vira a versão atual.          */
  const fAtual = ficha('atual');
  if (!existe('atual') || !fAtual || cmpVer(VERSAO_APP, fAtual.versao) > 0) {
    if (existe('atual')) mover('atual', 'anterior');
    guardar('atual', fs.readFileSync(EMBUTIDO), {
      versao: VERSAO_APP, origem: 'instalador', quando: agora(),
      notas: ['Sistema que veio junto com o programa instalado.']
    });
    e.fase = 'ok'; e.tentativas = 0; e.emTeste = null;
    gravarEstado(e);
    anotarHistorico({ acao: 'instalada', versao: VERSAO_APP, origem: 'instalador' });
  }

  /* 2. a última abertura estava em teste e não confirmou: a versão nova
        travou o sistema. Damos uma segunda chance e, se repetir, voltamos. */
  if (e.fase === 'testando') {
    e.tentativas = (e.tentativas || 0) + 1;
    if (e.tentativas >= 3 && existe('anterior')) {
      const alvo = ficha('anterior');
      const ruim = e.emTeste || ficha('atual');
      mover('anterior', 'atual');
      apagar('pendente');
      e.fase = 'ok'; e.tentativas = 0; e.emTeste = null;
      e.recado = {
        tipo: 'revertido',
        versao: ruim && ruim.versao,
        voltouPara: alvo && alvo.versao,
        motivo: 'o sistema não terminou de abrir com essa versão'
      };
      gravarEstado(e);
      anotarHistorico({ acao: 'revertida', versao: ruim && ruim.versao, para: alvo && alvo.versao,
                        motivo: 'não abriu' });
      return { caminho: arqIndex('atual') };
    }
    gravarEstado(e);
    return { caminho: arqIndex('atual') };
  }

  /* 3. tem versão baixada esperando: entra em teste a partir de agora. */
  if (existe('pendente')) {
    const nova = ficha('pendente') || {};
    const velha = ficha('atual') || {};
    mover('atual', 'anterior');
    mover('pendente', 'atual');
    e.fase = 'testando'; e.tentativas = 1; e.emTeste = nova; e.recado = null;
    gravarEstado(e);
    anotarHistorico({ acao: 'aplicada', versao: nova.versao, deixando: velha.versao });
  }

  return { caminho: arqIndex('atual') };
}

/* =========================================================================
   AÇÕES
   ========================================================================= */
async function procurar(pacote) {
  const base = fonteDeOndeVemAsAtualizacoes(pacote);
  const bruto = await baixar(base + 'versao.json?t=' + Date.now());
  let info;
  try { info = JSON.parse(bruto.toString('utf8')); }
  catch (err) { throw new Error('o arquivo de versão veio corrompido'); }
  if (!info.versao || !info.arquivo) throw new Error('o arquivo de versão está incompleto');

  mexerEstado(e => { e.ultimaChecagem = Date.now(); });

  const atual = ficha('atual') || { versao: VERSAO_APP };
  const pend = existe('pendente') ? ficha('pendente') : null;
  return {
    temNova: cmpVer(info.versao, atual.versao) > 0 && (!pend || cmpVer(info.versao, pend.versao) > 0),
    info,
    versaoAtual: atual.versao,
    jaBaixada: pend ? pend.versao : null
  };
}

async function baixarVersao(pacote, info) {
  const base = fonteDeOndeVemAsAtualizacoes(pacote);
  const url = /^https?:/i.test(info.arquivo) ? info.arquivo : base + info.arquivo;
  const html = await baixar(url);

  if (html.length < 50000 || !/JeV/i.test(html.slice(0, 8000).toString('utf8'))) {
    throw new Error('o arquivo baixado não parece ser o sistema');
  }
  if (info.sha256) {
    const conferido = sha256(html);
    if (conferido !== String(info.sha256).toLowerCase()) {
      throw new Error('o arquivo baixado chegou diferente do publicado — download recusado');
    }
  }
  guardar('pendente', html, {
    versao: info.versao, quando: agora(), origem: 'internet',
    notas: info.notas || [], sha256: info.sha256 || sha256(html), tamanho: html.length
  });
  return { versao: info.versao, tamanho: html.length };
}

/* opcoes.descartar = true quando a versão que sai está com defeito: ela é
   jogada fora, e não guardada como "versão para voltar" — senão o botão de
   reverter poderia levar o usuário de volta para dentro do problema.       */
function reverter(motivo, opcoes) {
  opcoes = opcoes || {};
  if (!existe('anterior')) return { ok: false, erro: 'não há versão anterior guardada' };
  const saindo = ficha('atual') || {};
  const voltando = ficha('anterior') || {};
  if (opcoes.descartar) {
    apagar('atual');
    mover('anterior', 'atual');
  } else {
    /* troca as duas: dá para desfazer a reversão depois */
    fs.renameSync(pasta('atual'), pasta('__troca'));
    fs.renameSync(pasta('anterior'), pasta('atual'));
    fs.renameSync(pasta('__troca'), pasta('anterior'));
  }
  apagar('pendente');
  mexerEstado(e => {
    e.fase = 'ok'; e.tentativas = 0; e.emTeste = null;
    e.recado = { tipo: 'revertido', versao: saindo.versao, voltouPara: voltando.versao, motivo: motivo || '' };
  });
  anotarHistorico({ acao: 'revertida', versao: saindo.versao, para: voltando.versao,
                    motivo: motivo || '', descartada: !!opcoes.descartar });
  return { ok: true, versao: voltando.versao, saiu: saindo.versao };
}

function validar(ok, detalhes) {
  const e = lerEstado();
  if (e.fase !== 'testando') return { ok: true, jaValidada: true };
  const emTeste = e.emTeste || ficha('atual') || {};
  if (ok) {
    mexerEstado(x => {
      x.fase = 'ok'; x.tentativas = 0; x.emTeste = null;
      x.recado = { tipo: 'validada', versao: emTeste.versao, notas: emTeste.notas || [] };
    });
    anotarHistorico({ acao: 'validada', versao: emTeste.versao });
    return { ok: true, versao: emTeste.versao };
  }
  const r = reverter('o autoteste reprovou: ' + (detalhes || 'inconsistência no sistema'), { descartar: true });
  return { ok: false, reverteu: r };
}

function estado(pacote) {
  const e = lerEstado();
  return {
    versaoPrograma: VERSAO_APP,
    atual: ficha('atual'),
    anterior: existe('anterior') ? ficha('anterior') : null,
    pendente: existe('pendente') ? ficha('pendente') : null,
    fase: e.fase,
    emTeste: e.emTeste,
    recado: e.recado,
    automatico: e.automatico !== false,
    fonte: fonteDeOndeVemAsAtualizacoes(pacote),
    fonteCustomizada: !!e.fonte,
    ultimaChecagem: e.ultimaChecagem || 0,
    historico: historico().slice(0, 12)
  };
}

function limparRecado() { mexerEstado(e => { e.recado = null; }); return true; }

function configurar(cfg) {
  mexerEstado(e => {
    if (typeof cfg.automatico === 'boolean') e.automatico = cfg.automatico;
    if (typeof cfg.fonte === 'string') e.fonte = cfg.fonte.trim();
  });
  return true;
}

function guardarBackup(nome, texto) {
  const dir = path.join(path.dirname(RAIZ), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const limpo = String(nome || 'backup').replace(/[^\w.\-]+/g, '_');
  const arq = path.join(dir, limpo);
  fs.writeFileSync(arq, texto);
  /* guarda no máximo 10 backups automáticos */
  try {
    const antigos = fs.readdirSync(dir).filter(f => f.startsWith('antes-'))
      .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t).slice(10);
    antigos.forEach(x => fs.unlinkSync(path.join(dir, x.f)));
  } catch (err) {}
  return arq;
}

function precisaTestar() { return lerEstado().fase === 'testando'; }

module.exports = {
  preparar, procurar, baixarVersao, reverter, validar, estado,
  limparRecado, configurar, guardarBackup, precisaTestar, historico, cmpVer
};

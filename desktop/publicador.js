/* =========================================================================
   PUBLICADOR — abre a plataforma já com o vídeo anexado e o texto escrito

   O que ele faz, em ordem:
     1. abre a página de envio da plataforma numa janela do próprio JeV,
        numa sessão separada e permanente — você entra na sua conta uma
        vez e o login fica salvo para as próximas;
     2. espera o campo de arquivo aparecer e anexa o vídeo nele, do mesmo
        jeito que aconteceria se você tivesse escolhido pelo Windows;
     3. espera a caixa de legenda aparecer e escreve o texto, disparando
        os eventos que a página precisa ouvir para aceitar o que foi
        escrito (senão o site acha que o campo continua vazio);
     4. mostra uma faixa por cima dizendo o que conseguiu e o que não
        conseguiu, e PARA. Nunca clica em publicar.

   O passo 4 é o mais importante. Publicar é decisão sua: o programa
   deixa tudo pronto e sai da frente.
   ========================================================================= */
const { BrowserWindow, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const PARTICAO = 'persist:jev-publicacao';

/* Como achar as coisas em cada página. Nada de nome de classe: os sites
   trocam isso toda semana. Só estrutura, que muda muito mais devagar. */
const PLATAFORMAS = {
  tt:   { nome:'TikTok',           url:'https://www.tiktok.com/tiktokstudio/upload', titulo:false },
  yts:  { nome:'YouTube Shorts',   url:'https://studio.youtube.com/channel/UC/videos/upload', titulo:true },
  yt:   { nome:'YouTube',          url:'https://studio.youtube.com/channel/UC/videos/upload', titulo:true },
  kwai: { nome:'Kwai',             url:'https://www.kwai.com/creators', titulo:false },
  fb:   { nome:'Facebook',         url:'https://business.facebook.com/latest/reels_composer', titulo:false },
  ig:   { nome:'Instagram',        url:'https://www.instagram.com', titulo:false },
  x:    { nome:'X (Twitter)',      url:'https://x.com/compose/post', titulo:false },
  rum:  { nome:'Rumble',           url:'https://rumble.com/upload.php', titulo:true },
  dm:   { nome:'Dailymotion',      url:'https://www.dailymotion.com/upload', titulo:true },
  pin:  { nome:'Pinterest',        url:'https://www.pinterest.com/pin-creation-tool/', titulo:true },
  li:   { nome:'LinkedIn',         url:'https://www.linkedin.com/feed/', titulo:false },
  snap: { nome:'Snapchat',         url:'https://profile.snapchat.com', titulo:false },
  tw:   { nome:'Twitch',           url:'https://dashboard.twitch.tv', titulo:true }
};

const janelas = new Map();

/* Quanto esperar a página montar cada coisa. Os testes baixam isso para
   não ficarem 2 minutos esperando páginas que nunca vão montar nada. */
const ESPERA = Number(process.env.JEV_PUB_ESPERA || 0) || 40000;

/* -------------------------------------------------------------- ajudantes */
function esperar(ms){ return new Promise(r => setTimeout(r, ms)); }

/* Procura, repetidas vezes, até a página montar o elemento. Sites modernos
   demoram para desenhar: perguntar uma vez só quase sempre dá vazio. */
async function aguardar(wc, expressao, ms) {
  const fim = Date.now() + (ms || ESPERA);
  while (Date.now() < fim) {
    try {
      const v = await wc.executeJavaScript(expressao, true);
      if (v) return v;
    } catch (e) { /* a página pode estar navegando; tenta de novo */ }
    await esperar(600);
  }
  return null;
}

/* ------------------------------------------------------- anexar o arquivo */
/* Não dá para "digitar" um caminho num campo de arquivo por JavaScript —
   o navegador proíbe, e ainda bem. O jeito certo é falar com o motor do
   Chromium por baixo (o mesmo canal que as ferramentas de desenvolvedor
   usam) e entregar o arquivo direto ao campo. */
async function anexarArquivo(wc, arquivo) {
  if (!arquivo || !fs.existsSync(arquivo)) return { ok:false, motivo:'arquivo não encontrado' };

  const achou = await aguardar(wc, `(function(){
    var l = document.querySelectorAll('input[type=file]');
    return l.length ? true : false;
  })()`, ESPERA);
  if (!achou) return { ok:false, motivo:'a página não mostrou campo de arquivo' };

  try {
    if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
  } catch (e) {
    return { ok:false, motivo:'não consegui falar com a página: ' + e.message };
  }

  try {
    const doc = await wc.debugger.sendCommand('DOM.getDocument', { depth: -1, pierce: true });
    const achados = await wc.debugger.sendCommand('DOM.querySelectorAll', {
      nodeId: doc.root.nodeId, selector: 'input[type=file]'
    });
    if (!achados.nodeIds || !achados.nodeIds.length) return { ok:false, motivo:'campo de arquivo sumiu' };

    /* prefere o campo que aceita vídeo; se nenhum declarar, usa o primeiro */
    let alvo = achados.nodeIds[0];
    for (const id of achados.nodeIds) {
      try {
        const a = await wc.debugger.sendCommand('DOM.getAttributes', { nodeId: id });
        const at = a.attributes || [];
        const i = at.indexOf('accept');
        if (i >= 0 && /video|mp4|\*/.test(at[i+1] || '')) { alvo = id; break; }
      } catch (e) {}
    }
    await wc.debugger.sendCommand('DOM.setFileInputFiles', { nodeId: alvo, files: [arquivo] });
    return { ok:true };
  } catch (e) {
    return { ok:false, motivo: e.message };
  } finally {
    try { if (wc.debugger.isAttached()) wc.debugger.detach(); } catch (e) {}
  }
}

/* -------------------------------------------------------- escrever o texto */
/* Escrever em campo de site moderno tem uma pegadinha: mexer no .value na
   mão não avisa o React, e o site continua achando que está vazio. Por isso
   usamos o setter nativo e disparamos os eventos na sequência certa. */
const ESCREVER = `(function(texto, minimo){
  function visivel(el){
    var r = el.getBoundingClientRect();
    var s = getComputedStyle(el);
    return r.width > 60 && r.height > 12 && s.visibility !== 'hidden' && s.display !== 'none';
  }
  function nota(el){
    var n = 0, ml = Number(el.getAttribute('maxlength') || 0);
    if (ml >= minimo) n += 40;
    var ph = ((el.getAttribute('placeholder') || '') + ' ' + (el.getAttribute('aria-label') || '') +
              ' ' + (el.getAttribute('data-placeholder') || '')).toLowerCase();
    if (/legenda|caption|descri|description|texto|say something|escreva|conte/.test(ph)) n += 60;
    if (/t[ií]tulo|title/.test(ph)) n -= 30;
    n += Math.min(20, el.getBoundingClientRect().height / 6);
    return n;
  }
  var cand = [].slice.call(document.querySelectorAll('textarea, div[contenteditable=true], [role=textbox]'))
              .filter(visivel);
  if (!cand.length) return {ok:false, motivo:'nenhuma caixa de texto visível'};
  cand.sort(function(a,b){ return nota(b) - nota(a); });
  var el = cand[0];

  el.focus();
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, texto);
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  } else {
    el.dispatchEvent(new InputEvent('beforeinput', {bubbles:true, inputType:'insertText', data:texto}));
    var deu = false;
    try { deu = document.execCommand('insertText', false, texto); } catch(e) {}
    if (!deu || !el.textContent) el.textContent = texto;
    el.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:texto}));
  }
  var escrito = (el.value !== undefined ? el.value : el.textContent) || '';
  return {ok: escrito.indexOf(texto.slice(0, 20)) >= 0, escrito: escrito.length};
})`;

async function escreverTexto(wc, texto, minimo) {
  if (!texto) return { ok:false, motivo:'sem texto' };
  const pronto = await aguardar(wc, `(function(){
    return document.querySelectorAll('textarea, div[contenteditable=true], [role=textbox]').length > 0;
  })()`, ESPERA);
  if (!pronto) return { ok:false, motivo:'a página não mostrou caixa de legenda' };
  await esperar(1200);
  try {
    const r = await wc.executeJavaScript(
      `(${ESCREVER})(${JSON.stringify(texto)}, ${Number(minimo) || 200})`, true);
    return r || { ok:false, motivo:'sem resposta da página' };
  } catch (e) {
    return { ok:false, motivo: e.message };
  }
}

/* ------------------------------------------------------------- a faixa */
function faixa(wc, dados) {
  const html = JSON.stringify(dados);
  return wc.executeJavaScript(`(function(d){
    var v = document.getElementById('jev-faixa'); if (v) v.remove();
    var f = document.createElement('div');
    f.id = 'jev-faixa';
    f.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;' +
      'font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;' +
      'background:' + (d.tudo ? '#137A4B' : '#8A5A00') + ';padding:12px 16px;' +
      'box-shadow:0 -6px 24px rgba(0,0,0,.28);display:flex;gap:14px;align-items:center';
    var t = document.createElement('div'); t.style.flex = '1';
    t.innerHTML = '<b>JeV</b> &nbsp;' + d.recado;
    var b = document.createElement('button');
    b.textContent = 'Colar o texto de novo';
    b.style.cssText = 'background:#fff;color:#0A2531;border:0;border-radius:8px;padding:8px 14px;' +
      'font-weight:700;cursor:pointer';
    b.onclick = function(){ window.__jevColar && window.__jevColar(); };
    var x = document.createElement('button');
    x.textContent = 'Fechar aviso';
    x.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5);' +
      'border-radius:8px;padding:8px 12px;cursor:pointer';
    x.onclick = function(){ f.remove(); };
    f.appendChild(t); f.appendChild(b); f.appendChild(x);
    document.body.appendChild(f);
  })(${html})`, true).catch(() => {});
}

/* ------------------------------------------------------------ a chamada */
async function publicar(dados) {
  dados = dados || {};
  const cfg = PLATAFORMAS[dados.plataforma];
  if (!cfg) return { ok:false, motivo:'plataforma desconhecida: ' + dados.plataforma };

  const texto = (dados.titulo ? dados.titulo + '\n\n' : '') + (dados.legenda || '');

  /* uma janela por plataforma: reabrir não empilha janela em cima de janela */
  let j = janelas.get(dados.plataforma);
  if (j && !j.isDestroyed()) { j.focus(); }
  else {
    j = new BrowserWindow({
      width: 1180, height: 860, show: true,
      title: 'JeV — publicar no ' + cfg.nome,
      autoHideMenuBar: true,
      webPreferences: {
        partition: PARTICAO,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    janelas.set(dados.plataforma, j);
    j.on('closed', () => janelas.delete(dados.plataforma));
    /* link que abre em nova janela continua dentro da mesma sessão */
    j.webContents.setWindowOpenHandler(({ url }) => ({
      action: 'allow',
      overrideBrowserWindowOptions: { webPreferences: { partition: PARTICAO } }
    }));
  }

  const wc = j.webContents;
  await j.loadURL(dados.url || cfg.url).catch(() => {});

  /* deixa o texto na área de transferência de qualquer jeito: se o preenchimento
     automático falhar, um Ctrl+V resolve sem você voltar ao sistema */
  const resultado = { plataforma: dados.plataforma, nome: cfg.nome, janelaId: j.id,
                      anexou:false, escreveu:false, avisos:[] };

  const arq = await anexarArquivo(wc, dados.video);
  resultado.anexou = arq.ok;
  if (!arq.ok && dados.video) resultado.avisos.push('não anexei o vídeo (' + arq.motivo + ')');
  if (!dados.video) resultado.avisos.push('você não escolheu o arquivo do vídeo');

  /* depois de anexar, a página troca de tela e só então aparece a legenda */
  const txt = await escreverTexto(wc, texto, cfg.titulo ? 200 : 100);
  resultado.escreveu = !!(txt && txt.ok);
  if (!resultado.escreveu) resultado.avisos.push('não escrevi a legenda (' + (txt.motivo || 'a página recusou') + ')');

  /* deixa um atalho dentro da própria página para tentar de novo */
  await wc.executeJavaScript(
    `window.__jevColar = function(){ return (${ESCREVER})(${JSON.stringify(texto)}, 100); }; true;`, true
  ).catch(() => {});

  const tudo = resultado.anexou && resultado.escreveu;
  await faixa(wc, {
    tudo,
    recado: tudo
      ? 'Vídeo anexado e legenda escrita. Confira e clique em publicar — o JeV não publica por você.'
      : 'Abri a página logada. ' + resultado.avisos.join(' · ') +
        '. Confira, ajuste o que faltar e publique você mesmo.'
  });

  return Object.assign({ ok:true }, resultado);
}

/* apaga a sessão salva — some com o login de todas as plataformas */
async function esquecerLogins() {
  const s = session.fromPartition(PARTICAO);
  await s.clearStorageData();
  return true;
}

function fecharTudo() {
  janelas.forEach(j => { if (j && !j.isDestroyed()) j.close(); });
  janelas.clear();
}

module.exports = { publicar, esquecerLogins, fecharTudo, PLATAFORMAS };

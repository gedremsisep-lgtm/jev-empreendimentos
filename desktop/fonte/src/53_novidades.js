/* =========================================================================
   NOVIDADES (19/11/2026) — Editor de Vídeo, Máquina de Vendas, Central de
   Canais e o Comandante falando com a Central.

   COMO ENTRA NO SISTEMA, SEM MEXER NAS TELAS QUE JÁ FUNCIONAM
   ----------------------------------------------------------
   As três telas novas moram num programa à parte, no computador do dono
   (C:\JeV\fabrica-reels, servidor em 127.0.0.1:3140). Aqui elas viram abas
   do menu Mídia que mostram esse programa dentro do JeV. Se ele estiver
   desligado, o aplicativo liga sozinho; no navegador, a tela explica o que
   fazer em vez de mostrar uma página quebrada.

   O SELO "NOVO" E O BALÃO
   -----------------------
   Toda aba nova ganha o selo NOVO. Na primeira vez que a pessoa abre a aba,
   um balão aponta para ela e explica, em duas frases, o que ela faz. Clicou
   em "Entendi", o selo some e o balão não volta. O cartão "Novidades" do
   Início lista tudo o que ainda não foi visto.                            */

const NOV_URL = 'http://127.0.0.1:3140';
const NOVIDADES = [
  { id: 'nov-edit', aba: 'edit', grupo: 'fazer', nome: 'Editor de vídeo', ic: 'ti-movie', caminho: '/editor',
    titulo: 'Editor de Vídeo — grave e solte',
    texto: 'Solte o vídeo que você gravou e o Editor corta silêncios, “ãh” e frases repetidas, põe legenda, música baixa e gráficos no seu estilo.',
    como: 'Revise a estrutura frase por frase, peça ajustes em palavras simples (“legenda menor”) e exporte em 1080x1920.' },
  { id: 'nov-mvend', aba: 'mvend', grupo: 'fazer', nome: 'Máquina de Vendas', ic: 'ti-shopping-cart', caminho: '/',
    titulo: 'Máquina de Vendas — produto vira vídeo de afiliado',
    texto: 'Cole o link do produto (Shopee, Mercado Livre, Amazon ou Shein), arraste as fotos e saem 3 vídeos com narração, legenda, preço e o seu link de afiliado.',
    como: 'Copie o texto pronto de cada rede, poste e marque as vendas: a Máquina passa a usar o formato que mais vende.' },
  { id: 'nov-ccan', aba: 'ccan', grupo: 'publicar', nome: 'Central de Canais', ic: 'ti-brand-youtube', caminho: '/central',
    titulo: 'Central de Canais — todos os canais e redes num lugar',
    texto: 'Pesquisa o nicho, cria a identidade, escreve pautas e roteiros com fatos conferidos, produz vídeo longo, shorts e capas, e agenda no YouTube, Instagram, TikTok, Facebook, Pinterest e Kwai.',
    como: 'Converse com ela em português (“faz um vídeo sobre…”, “posta às 20h”). Nada vai ao ar sem o seu OK.' },
  { id: 'nov-ctl', alvo: 'ctl', nome: 'Comandante', ic: 'ti-settings-automation',
    titulo: 'O Comandante agora fala com a Central de Canais',
    texto: 'Peça ao Comandante “faz um vídeo sobre…” ou “como estão os canais?” e ele repassa para a Central de Canais.',
    como: 'Ele também avisa quantos vídeos esperam o seu OK e as próximas postagens.' }
];

function novVistas(){ try { return JSON.parse(localStorage.getItem('jev_novidades_vistas') || '[]'); } catch(e){ return []; } }
function novVista(id){ return novVistas().includes(id); }
function novMarcar(id){ const v = novVistas(); if(!v.includes(id)){ v.push(id); try{ localStorage.setItem('jev_novidades_vistas', JSON.stringify(v)); }catch(e){} } }
const NOV_SELO = '<span class="nov-selo">NOVO</span>';

/* ---------------------------------------------------- estilo do selo e do balão */
(function(){
  const css = document.createElement('style');
  css.textContent =
    '.nov-selo{display:inline-block;margin-left:6px;background:#F97316;color:#fff;font-size:9.5px;font-weight:900;letter-spacing:.04em;' +
      'border-radius:9px;padding:1px 6px;line-height:14px;vertical-align:middle;animation:novPulsa 1.6s ease-in-out infinite}' +
    '@keyframes novPulsa{50%{box-shadow:0 0 0 4px rgba(249,115,22,.25)}}' +
    '.nov-balao{position:fixed;z-index:9999;max-width:340px;background:#123B4E;color:#fff;border-radius:14px;padding:14px 16px 12px;' +
      'box-shadow:0 14px 40px rgba(0,0,0,.35);font-size:13px;line-height:1.45}' +
    '.nov-balao b.t{display:block;font-size:14.5px;margin-bottom:6px;color:#FFD9BF}' +
    '.nov-balao .como{margin-top:6px;color:#CFE3EA}' +
    '.nov-balao .seta{position:absolute;width:14px;height:14px;background:#123B4E;transform:rotate(45deg)}' +
    '.nov-balao .acoes{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}' +
    '.nov-balao button{border:0;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer;font-size:12.5px}' +
    '.nov-balao .ok{background:#F97316;color:#fff}.nov-balao .depois{background:transparent;color:#CFE3EA}' +
    '.nov-frame{width:100%;height:calc(100vh - 215px);min-height:520px;border:0;border-radius:14px;background:#0e0d0c}';
  document.head.appendChild(css);
})();

/* ---------------------------------------------------- o balão */
function novBalao(id, alvo){
  const n = NOVIDADES.find(x => x.id === id);
  if(!n || novVista(id)) return;
  document.querySelectorAll('.nov-balao').forEach(b => b.remove());
  const el = typeof alvo === 'string' ? document.querySelector(alvo) : alvo;
  const b = document.createElement('div');
  b.className = 'nov-balao';
  b.innerHTML = '<span class="seta"></span><b class="t"><i class="ti ' + n.ic + '"></i> ' + esc(n.titulo) + '</b>' +
    '<div>' + esc(n.texto) + '</div><div class="como">' + esc(n.como) + '</div>' +
    '<div class="acoes"><button class="depois">Depois</button><button class="ok">Entendi</button></div>';
  document.body.appendChild(b);
  const seta = b.querySelector('.seta');
  const pos = () => {
    if(el && el.isConnected){
      const r = el.getBoundingClientRect();
      let x = Math.min(window.innerWidth - b.offsetWidth - 12, Math.max(12, r.left + r.width/2 - b.offsetWidth/2));
      const embaixo = r.bottom + b.offsetHeight + 16 < window.innerHeight;
      b.style.left = x + 'px';
      b.style.top = (embaixo ? r.bottom + 12 : r.top - b.offsetHeight - 12) + 'px';
      seta.style.left = Math.max(14, Math.min(b.offsetWidth - 28, r.left + r.width/2 - x - 7)) + 'px';
      seta.style.top = embaixo ? '-7px' : ''; seta.style.bottom = embaixo ? '' : '-7px';
    } else { b.style.right = '22px'; b.style.bottom = '22px'; seta.style.display = 'none'; }
  };
  pos();
  window.addEventListener('resize', pos, { once: true });
  b.querySelector('.ok').onclick = () => {
    novMarcar(id); b.remove();
    if(n.aba){
      document.querySelectorAll('button[onclick="midStab(\'' + n.aba + '\')"] .nov-selo').forEach(x => x.remove());
      if(!NOVIDADES.some(x => x.grupo === n.grupo && x.aba && !novVista(x.id)))
        document.querySelectorAll('button[onclick="menuIrGrupo(\'' + n.grupo + '\')"] .nov-selo').forEach(x => x.remove());
    }
    novAtualizarSelos();
  };
  b.querySelector('.depois').onclick = () => b.remove();
}

/* selo NOVO no botão do Controle (topo) */
function novAtualizarSelos(){
  const ctl = document.querySelector('.top .tbt[onclick="go(\'ctl\')"]');
  if(ctl){
    let s = ctl.querySelector('.nov-selo');
    if(!novVista('nov-ctl') && !s){ s = document.createElement('span'); s.className = 'nov-selo'; s.textContent = 'NOVO';
      s.style.cssText = 'position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);margin:0;font-size:8px;padding:0 4px'; ctl.appendChild(s); }
    if(novVista('nov-ctl') && s) s.remove();
  }
  const neg = document.getElementById('mn-neg');
  if(neg){
    const falta = NOVIDADES.some(n => n.aba && !novVista(n.id));
    let s = neg.querySelector('.nov-selo');
    if(falta && !s) neg.insertAdjacentHTML('beforeend', NOV_SELO);
    if(!falta && s) s.remove();
  }
}

/* ---------------------------------------------------- abas novas no menu Mídia */
(function(){
  if(typeof MENU_GRUPOS === 'undefined') return;
  NOVIDADES.filter(n => n.aba).forEach(n => {
    const g = MENU_GRUPOS.find(x => x.id === n.grupo);
    if(g && !g.abas.some(a => a.id === n.aba)){
      if(n.aba === 'ccan') g.abas.unshift({ id: n.aba, nome: n.nome, ic: n.ic });
      else g.abas.splice(n.aba === 'edit' ? 2 : 3, 0, { id: n.aba, nome: n.nome, ic: n.ic });
    }
  });
})();

/* o selo entra no desenho da barra sem reescrever a barra */
if(typeof menuBarraHTML === 'function'){
  const _novBarra = menuBarraHTML;
  menuBarraHTML = function(atual){
    let h = _novBarra(atual);
    NOVIDADES.filter(n => n.aba && !novVista(n.id)).forEach(n => {
      h = h.replace(new RegExp('(onclick="midStab\\(\'' + n.aba + '\'\\)">[\\s\\S]*?)</button>'), '$1' + NOV_SELO + '</button>');
      const g = MENU_GRUPOS.find(x => x.id === n.grupo);
      if(g && n.aba !== atual) h = h.replace(new RegExp('(onclick="menuIrGrupo\\(\'' + g.id + '\'\\)">[\\s\\S]*?)</button>'),
        (m, a) => a.includes('nov-selo') ? m : a + NOV_SELO + '</button>');
    });
    return h;
  };
}

/* as telas novas: o programa da fábrica, dentro do JeV */
async function novPing(){
  try { await fetch(NOV_URL + '/api/estado?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }); return true; }
  catch(e){ return false; }
}

async function novLocalRender(aba){
  const n = NOVIDADES.find(x => x.aba === aba);
  const body = document.getElementById('mid-body');
  if(!n || !body) return;
  body.innerHTML = '<div class="card tw"><div class="bd"><i class="ti ti-loader-2"></i> Abrindo ' + esc(n.nome) + '…</div></div>';
  let noAr = await novPing();
  const app = (window.JeVDesktop && window.JeVDesktop.ehAplicativo && window.JeVDesktop.ccGarantir) ? window.JeVDesktop : null;
  if(!noAr && app){
    body.innerHTML = '<div class="card tw"><div class="bd"><i class="ti ti-loader-2"></i> Ligando a fábrica de vídeos (uns segundos)…</div></div>';
    try { const r = await app.ccGarantir(); noAr = !!(r && r.ok); if(!noAr && r && r.motivo) n._motivo = r.motivo; } catch(e){ n._motivo = String(e.message || e); }
  }
  if(MID_TAB !== aba) return;
  if(!noAr){
    body.innerHTML = '<div class="card tw"><div class="hd"><i class="ti ' + n.ic + '"></i>' + esc(n.nome) + '</div><div class="bd">' +
      '<p>' + esc(n.texto) + '</p>' +
      '<div class="al aw"><i class="ti ti-info-circle"></i><div><b>O programa da fábrica está desligado.</b><br>' +
      (n._motivo ? esc(n._motivo) + '<br>' : '') +
      'Dê dois cliques em <b>C:\\JeV\\fabrica-reels\\CENTRAL-DE-CANAIS</b> (ou em <b>C:\\JeV\\INICIAR-TUDO</b>, que liga também os agentes) e clique em Tentar de novo.</div></div>' +
      '<button class="btn" style="margin-top:12px" onclick="novLocalRender(\'' + aba + '\')"><i class="ti ti-refresh"></i>Tentar de novo</button></div></div>';
  } else {
    body.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin:2px 0 10px">' +
        '<span class="tt" style="flex:1">' + esc(n.texto) + '</span>' +
        '<button class="btn xs gh" onclick="window.open(\'' + NOV_URL + n.caminho + '\',\'_blank\')"><i class="ti ti-external-link"></i>Abrir em janela própria</button></div>' +
      '<iframe class="nov-frame" src="' + NOV_URL + n.caminho + '" title="' + esc(n.nome) + '"></iframe>';
  }
  setTimeout(() => novBalao(n.id, '.tabs .chip.on'), 350);
}

if(typeof midiaRender === 'function'){
  const _novMidia = midiaRender;
  midiaRender = async function(){
    await _novMidia.apply(this, arguments);
    if(NOVIDADES.some(n => n.aba === MID_TAB)) await novLocalRender(MID_TAB);
    else {
      const prox = NOVIDADES.find(n => n.aba && !novVista(n.id));
      if(prox) setTimeout(() => { const el = document.querySelector('.tabs button[onclick="midStab(\'' + prox.aba + '\')"]'); if(el) novBalao(prox.id, el); }, 500);
    }
    novAtualizarSelos();
  };
}

/* o Controle: balão sobre o Comandante */
if(typeof controleRender === 'function'){
  const _novCtl = controleRender;
  controleRender = async function(){
    await _novCtl.apply(this, arguments);
    setTimeout(() => novBalao('nov-ctl', '.top .tbt[onclick="go(\'ctl\')"]'), 600);
  };
}

/* ---------------------------------------------------- cartão "Novidades" no Início */
function novIr(id){
  const n = NOVIDADES.find(x => x.id === id);
  if(!n) return;
  if(n.alvo){ go(n.alvo); return; }
  go('midia'); midStab(n.aba);
}

if(typeof hubRender === 'function'){
  const _novHub = hubRender;
  hubRender = async function(){
    await _novHub.apply(this, arguments);
    const faltam = NOVIDADES.filter(n => !novVista(n.id));
    const root = document.getElementById('hub-root');
    if(!faltam.length || !root || root.querySelector('#nov-cartao')) { novAtualizarSelos(); return; }
    const c = document.createElement('div');
    c.id = 'nov-cartao';
    c.className = 'card';
    c.style.cssText = 'border:2px solid #F97316;margin-bottom:14px';
    c.innerHTML = '<div class="hd"><i class="ti ti-sparkles" style="color:#F97316"></i>Novidades no seu JeV <span class="nov-selo">' + faltam.length + '</span></div>' +
      '<div class="bd" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">' +
      faltam.map(n => '<div style="background:var(--bg3);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px">' +
        '<b><i class="ti ' + n.ic + '" style="color:#F97316"></i> ' + esc(n.nome) + '</b>' +
        '<span class="tt">' + esc(n.texto) + '</span>' +
        '<button class="btn xs" style="align-self:flex-start;margin-top:auto" onclick="novIr(\'' + n.id + '\')">Conhecer <i class="ti ti-arrow-right"></i></button></div>').join('') +
      '</div>';
    root.insertBefore(c, root.firstChild);
    novAtualizarSelos();
  };
}

document.addEventListener('DOMContentLoaded', () => setTimeout(novAtualizarSelos, 800));
setTimeout(novAtualizarSelos, 1500);

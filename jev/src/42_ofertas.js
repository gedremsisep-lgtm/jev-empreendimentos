/* =========================================================================
   O GRUPO DE OFERTAS — UMA A CADA 4 HORAS

   O QUE ELE PEDIU
   ---------------
   "Um grupo de ofertas com meu link de afiliado de várias plataformas, e
   que mandem ofertas a cada 4 horas."

   O QUE MUDA POR SER GRUPO, E NÃO CANAL
   -------------------------------------
   Para GRUPO existe um caminho que para canal não existe: o endereço
   api.whatsapp.com/send?text=... abre o WhatsApp com a mensagem JÁ ESCRITA
   e você só escolhe o grupo e aperta enviar. Não é envio automático — é o
   mesmo último clique de sempre — mas corta o copiar-e-colar. Por isso, no
   grupo, a oferta sai em dois toques.

   O QUE "A CADA 4 HORAS" PODE E NÃO PODE SER
   ------------------------------------------
   Não pode ser envio sozinho: o WhatsApp não deixa, e quem promete isso
   usa gambiarra que derruba número. Pode ser tudo o resto, que é onde o
   trabalho realmente mora: o sistema escolhe o produto da vez, escreve a
   oferta, monta o link, e te chama na hora certa. Você confere e envia.

   O RODÍZIO
   ---------
   Seis ofertas por dia queimam um catálogo pequeno em uma semana. Então:
   nenhum produto se repete dentro de 30 dias; a loja da oferta anterior é
   evitada na seguinte (para o grupo não virar um feed de uma loja só); e
   quando a fila encurta, o sistema garimpa sozinho para reabastecer.

   ONDE O REABASTECIMENTO É HONESTO E ONDE NÃO É
   ---------------------------------------------
   Garimpar produto novo é fácil e o sistema faz. Gerar o LINK DE AFILIADO
   dele nem sempre é: só a Amazon publica a fórmula (endereço + a sua tag),
   e essa o sistema monta sozinho. Shopee, Mercado Livre e TikTok Shop
   geram um link curto e embaralhado dentro do painel — não existe fórmula,
   e quem diz que monta está inventando. Para essas, o produto entra na
   fila esperando você colar o link uma vez.

   Isso está escrito na tela, com o número na frente, para você nunca achar
   que a fila está cheia quando na verdade está esperando por você.
   ========================================================================= */

const OF = { relogio: null, agora: null, aberto: false, editandoGrupo: false };

const OF_PADRAO = { ligado: false, aCada: 4, base: 8, pularMadrugada: true,
                    diasSemRepetir: 30, grupos: [], enviadas: [], garimpoEm: null };

function ofCfg(){ return Object.assign({}, OF_PADRAO, (CFG && CFG.ofertas) || {}); }
async function ofSalvar(c){
  CFG = Object.assign({}, CFG, { ofertas: c });
  await cfgSalvar();
}
function ofChave(x){
  const n = (x && (x.nome || x.produto || (x.ficha && x.ficha.produto))) || '';
  return String(n).trim().toLowerCase();
}

/* ------------------------------------------------------------- os horários */
/* A grade sai do horário-base e do intervalo. Base 8h de 4 em 4 horas dá
   8, 12, 16, 20, 0 e 4 — seis por dia, que foi o pedido. */
function ofSlots(c){
  const cfg = c || ofCfg();
  const passo = Math.max(1, Math.min(12, Number(cfg.aCada) || 4));
  const base = Math.max(0, Math.min(23, Number(cfg.base) || 0));
  const horas = [];
  for (let h = 0; h < 24; h += passo) horas.push((base + h) % 24);
  horas.sort(function(a, b){ return a - b; });
  /* Madrugada: 4h da manhã é o jeito mais rápido de esvaziar um grupo de
     ofertas. Fica ligado por padrão, mas é uma chave à vista, não uma
     decisão minha escondida no código. */
  return cfg.pularMadrugada ? horas.filter(function(h){ return h >= 7 && h <= 22; }) : horas;
}

/* o horário da grade que já chegou e ainda não foi despachado hoje */
function ofSlotDevido(c, agora){
  const cfg = c || ofCfg();
  const d = agora || new Date();
  const hoje = d.toISOString().slice(0, 10);
  const feitos = {};
  (cfg.enviadas || []).forEach(function(e){
    if (String(e.dia) === hoje) feitos[e.slot] = true;
  });
  const passados = ofSlots(cfg).filter(function(h){
    return h < d.getHours() || (h === d.getHours());
  });
  for (let i = passados.length - 1; i >= 0; i--)
    if (!feitos[passados[i]]) return passados[i];
  return null;
}

function ofProximoSlot(c, agora){
  const cfg = c || ofCfg();
  const d = agora || new Date();
  const s = ofSlots(cfg);
  const adiante = s.filter(function(h){ return h > d.getHours(); });
  return adiante.length ? adiante[0] : (s.length ? s[0] : null);
}
function ofHora(h){ return String(h).padStart(2, '0') + ':00'; }

/* ---------------------------------------------------------- os candidatos */
async function ofCandidatos(){
  const c = ofCfg();
  const f = await zapFila();
  const corte = Date.now() - (Number(c.diasSemRepetir) || 30) * 86400000;
  const ultima = {};
  (c.enviadas || []).forEach(function(e){
    const t = Date.parse(e.em) || 0;
    if (t > (ultima[e.chave] || 0)) ultima[e.chave] = t;
  });
  const livres = f.prontos.filter(function(p){ return (ultima[ofChave(p)] || 0) < corte; });
  return { livres: livres, todos: f.prontos, semLink: f.semLink, ultima: ultima };
}

/* Quem vai agora. Duas regras, nesta ordem: quem está livre do descanso de
   30 dias, e de preferência de uma loja diferente da última. */
async function ofProxima(){
  const c = ofCfg();
  const cand = await ofCandidatos();
  let pool = cand.livres.length ? cand.livres : cand.todos;
  if (!pool.length) return null;

  const ultimaEnviada = (c.enviadas || [])[0];
  const ultimaLoja = ultimaEnviada && ultimaEnviada.plataforma;
  const deOutraLoja = pool.filter(function(p){
    return String(p.ficha.plataforma || '') !== String(ultimaLoja || '');
  });
  if (deOutraLoja.length) pool = deOutraLoja;

  pool = pool.slice().sort(function(a, b){
    return (cand.ultima[ofChave(a)] || 0) - (cand.ultima[ofChave(b)] || 0);
  });
  const escolhido = pool[0];
  return Object.assign({}, escolhido,
    { texto: zapMensagem(escolhido.ficha, escolhido.produto, { loja: true }) });
}

/* ------------------------------------------------------- o reabastecimento */
/* Só a Amazon tem fórmula pública de link. Onde dá para montar, monta; onde
   não dá, o produto entra na fila esperando o dono colar — e o número de
   quantos estão esperando vai para a tela. */
function ofTentarMontarLink(ficha, produto){
  if (typeof afilMontar !== 'function') return '';
  const loja = String(ficha.plataforma || '').toLowerCase();
  if (!/amazon/.test(loja)) return '';
  const url = (produto && produto.links && produto.links[0] && produto.links[0].url) || '';
  if (!url) return '';
  try {
    const r = afilMontar('amazon', url);
    return r && r.ok ? r.url : '';
  } catch (e) { return ''; }
}

async function ofReabastecer(forcado){
  const c = ofCfg();
  /* no automático, no máximo uma vez a cada 12 horas — garimpar a cada
     minuto seria bater na loja sem motivo nenhum */
  if (!forcado && c.garimpoEm && (Date.now() - (Date.parse(c.garimpoEm) || 0)) < 12 * 3600000)
    return { garimpados: 0, comLink: 0, esperando: 0, pulou: true };

  let achados = [];
  try { achados = (typeof garEscolher === 'function' ? garEscolher(GAR) : []) || []; }
  catch (e) { achados = []; }
  if (!achados.length) {
    await ofSalvar(Object.assign({}, c, { garimpoEm: new Date().toISOString() }));
    return { garimpados: 0, comLink: 0, esperando: 0 };
  }

  try { if (typeof pautaDoGarimpo === 'function') await pautaDoGarimpo(achados); } catch (e) {}
  let novas = 0;
  try {
    const r = await prepSalvarFichas(achados);
    novas = r.novas || 0;
  } catch (e) {}

  /* onde existe fórmula, o link já sai montado */
  let comLink = 0;
  try {
    const progs = await dbGetAll('programas');
    for (const f of progs){
      if (f.url) continue;
      const prod = achados.find(function(a){
        return String(a.n || '').trim().toLowerCase() === String(f.produto || '').trim().toLowerCase();
      });
      const url = ofTentarMontarLink(f, prod);
      if (url){ await dbPut('programas', Object.assign({}, f, { url: url })); comLink++; }
    }
  } catch (e) {}

  /* E a Shopee, que tem API oficial: gera os links dos produtos novos dela
     sem pedir nada a ninguém. É esta linha que transforma "reabastece" em
     "reabastece de verdade" — sem ela, produto novo da Shopee entrava na
     fila para ficar parado esperando o dono colar. */
  let daShopee = 0;
  try {
    if (typeof shTem === 'function' && shTem()){
      const antes = (await shSemLink()).length;
      if (antes){
        await shGerarFaltantes();
        const depois = (await shSemLink()).length;
        daShopee = Math.max(0, antes - depois);
      }
    }
  } catch (e) {}
  comLink += daShopee;

  await ofSalvar(Object.assign({}, ofCfg(), { garimpoEm: new Date().toISOString() }));
  const cand = await ofCandidatos();
  return { garimpados: novas, comLink: comLink, daShopee: daShopee,
           esperando: cand.semLink.length };
}

/* ------------------------------------------------------------- os grupos */
function ofGrupos(){ return ofCfg().grupos || []; }
function ofLinkDeGrupoValido(u){
  return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{6,}/.test(String(u || '').trim());
}
async function ofAddGrupo(){
  const nome = (val('of-gnome') || '').trim();
  const link = (val('of-glink') || '').trim();
  if (!nome){ toast('Dê um nome ao grupo.', 'aw'); return; }
  if (link && !ofLinkDeGrupoValido(link)){
    if (typeof zapLinkValido === 'function' && zapLinkValido(link)){
      toast('Esse é o link de um CANAL, não de um grupo. O do grupo começa ' +
            'com chat.whatsapp.com/.', 'aw');
      return;
    }
    toast('O link de convite do grupo é assim: https://chat.whatsapp.com/XXXXXXXX. ' +
          'Você pega em Dados do grupo → Convidar por link.', 'aw');
    return;
  }
  const c = ofCfg();
  await ofSalvar(Object.assign({}, c, {
    grupos: (c.grupos || []).concat([{ nome: nome, link: link }])
  }));
  OF.editandoGrupo = false;
  toast('Grupo guardado.', 'ag');
  midiaRender();
}
async function ofTirarGrupo(i){
  const c = ofCfg();
  const g = (c.grupos || []).slice();
  g.splice(Number(i), 1);
  await ofSalvar(Object.assign({}, c, { grupos: g }));
  midiaRender();
}
function ofAbrirGrupo(i){
  const g = ofGrupos()[Number(i)];
  if (g && g.link) window.open(g.link, '_blank', 'noopener');
}

/* --------------------------------------------------------- ligar/desligar */
async function ofLigar(){
  const c = ofCfg();
  if (!c.ligado && !ofGrupos().length){
    toast('Cadastre o grupo primeiro — é para onde a oferta vai.', 'aw');
    return;
  }
  await ofSalvar(Object.assign({}, c, { ligado: !c.ligado }));
  if (!c.ligado){ ofPedirPermissao(); ofRelogio(); toast('Ligado. Eu te chamo de ' + c.aCada + ' em ' + c.aCada + ' horas.', 'ag'); }
  else toast('Desligado. Nada mais te interrompe.', 'aw');
  midiaRender();
}
async function ofMudar(campo, valor){
  const c = ofCfg();
  const novo = Object.assign({}, c);
  novo[campo] = valor;
  await ofSalvar(novo);
  midiaRender();
}

/* ------------------------------------------------------------- o chamado */
/* Três caminhos, do melhor para o que sempre funciona:
     1. a ponte do aplicativo do Windows (aviso do sistema, com o programa
        até minimizado) — existe a partir do instalador que traz esta peça;
     2. a notificação do navegador, quando o dono permitiu;
     3. o quadro dentro do programa, que não depende de permissão nenhuma.
   O item 3 nunca é pulado: ele é o que garante que a oferta não se perca
   se os dois de cima falharem em silêncio.                              */
function ofPedirPermissao(){
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default')
      Notification.requestPermission();
  } catch (e) {}
}

function ofAvisar(titulo, corpo){
  const d = window.JeVDesktop;
  if (d && typeof d.avisar === 'function'){
    try { d.avisar(titulo, corpo); return 'aplicativo'; } catch (e) {}
  }
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted'){
      const n = new Notification(titulo, { body: corpo, tag: 'jev-oferta' });
      n.onclick = function(){ try { window.focus(); } catch (e) {} ofAbrirAgora(); };
      return 'navegador';
    }
  } catch (e) {}
  return 'quadro';
}

function ofAbrirAgora(){
  OF.aberto = true;
  if (typeof go === 'function') go('midia');
  if (typeof midStab === 'function') midStab('afil');
  else midiaRender();
}

/* ---------------------------------------------------------------- o relógio */
let OF_CONFERINDO = false;
function ofRelogio(){
  if (OF.relogio) return;
  OF.relogio = setInterval(ofConferir, 60000);
  ofConferir();
}
function ofPararRelogio(){
  if (OF.relogio){ clearInterval(OF.relogio); OF.relogio = null; }
}

async function ofConferir(){
  if (OF_CONFERINDO) return;
  const c = ofCfg();
  if (!c.ligado){ OF.agora = null; return; }
  OF_CONFERINDO = true;
  try {
    const slot = ofSlotDevido(c, new Date());
    if (slot === null){ OF.agora = null; return; }
    if (OF.agora && OF.agora.slot === slot) return;   /* já está na tela */

    const cand = await ofCandidatos();
    if (cand.livres.length < 2){
      try { await ofReabastecer(false); } catch (e) {}
    }

    const of = await ofProxima();
    if (!of){ OF.agora = null; return; }

    OF.agora = { slot: slot, oferta: of, em: new Date().toISOString() };
    const como = ofAvisar('Oferta das ' + ofHora(slot),
      of.nome + ' — ' + (of.ficha.plataforma || '') + '. Clique para despachar.');
    OF.agora.como = como;
    if (typeof toast === 'function' && como === 'quadro')
      toast('Está na hora da oferta das ' + ofHora(slot) + ': ' + of.nome, 'ag');
    if (typeof midiaRender === 'function' &&
        document.getElementById('mid-body')) midiaRender();
  } finally { OF_CONFERINDO = false; }
}

/* --------------------------------------------------------------- despachar */
function ofEndereco(texto){
  return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(texto);
}

async function ofDespachar(){
  const a = OF.agora;
  if (!a || !a.oferta) return;
  const of = a.oferta;

  /* o texto também vai para a área de transferência: se o WhatsApp abrir
     numa conversa errada, ou o dono quiser colar em outro lugar, ele não
     precisa voltar aqui para buscar */
  try { await navigator.clipboard.writeText(of.texto); } catch (e) {}
  window.open(ofEndereco(of.texto), '_blank', 'noopener');

  const c = ofCfg();
  const enviadas = [{ chave: ofChave(of), nome: of.nome,
                      plataforma: of.ficha.plataforma || '',
                      slot: a.slot, dia: new Date().toISOString().slice(0, 10),
                      em: new Date().toISOString() }]
                   .concat(c.enviadas || []).slice(0, 300);
  await ofSalvar(Object.assign({}, c, { enviadas: enviadas }));
  OF.agora = null;
  toast('WhatsApp aberto com a oferta escrita. Escolha o grupo e aperte enviar. ' +
        'Dei esta por despachada.', 'ag');
  midiaRender();
}

/* "não enviei" — devolve para a fila sem deixar rastro de que foi enviada */
async function ofDevolver(){
  const c = ofCfg();
  const enviadas = (c.enviadas || []).slice(1);
  await ofSalvar(Object.assign({}, c, { enviadas: enviadas }));
  toast('Devolvida para a fila. Ela volta a aparecer no próximo horário.', 'aw');
  midiaRender();
}

async function ofPular(){
  const a = OF.agora;
  if (!a) return;
  const of = a.oferta;
  const c = ofCfg();
  /* pular marca o HORÁRIO como resolvido, mas não gasta o produto: ele
     continua livre para a próxima vez */
  const enviadas = [{ chave: '', nome: '(pulado)', plataforma: '',
                      slot: a.slot, dia: new Date().toISOString().slice(0, 10),
                      em: new Date().toISOString(), pulado: true }]
                   .concat(c.enviadas || []).slice(0, 300);
  await ofSalvar(Object.assign({}, c, { enviadas: enviadas }));
  OF.agora = null;
  toast('Pulei as ' + ofHora(a.slot) + '. ' + (of ? of.nome + ' continua na fila.' : ''), 'aw');
  midiaRender();
}

/* -------------------------------------------------------------------- tela */
function ofGruposHTML(){
  const gs = ofGrupos();
  let h = '';
  if (gs.length)
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px">' +
      gs.map(function(g, i){
        return '<span class="chip">' + '<i class="ti ti-users"></i> ' + esc(g.nome) +
          (g.link ? ' <a href="#" onclick="ofAbrirGrupo(' + i + ');return false" ' +
                    'title="Abrir o grupo"><i class="ti ti-external-link"></i></a>' : '') +
          ' <a href="#" onclick="ofTirarGrupo(' + i + ');return false" ' +
          'title="Tirar"><i class="ti ti-x"></i></a></span>';
      }).join('') + '</div>';

  if (!gs.length || OF.editandoGrupo){
    h += '<div class="tt" style="margin-bottom:8px">' +
      '<b>O grupo você cria no WhatsApp</b>, no celular ou no WhatsApp Web — nenhum ' +
      'programa pode criar por você. Depois entre em <b>Dados do grupo → Convidar por ' +
      'link</b> e copie. O link é opcional: serve só para eu abrir o grupo com um clique.</div>' +
      '<div class="fr">' +
        '<div class="fg"><label>Nome do grupo</label>' +
          '<input id="of-gnome" placeholder="Ofertas JeV"></div>' +
        '<div class="fg"><label>Link de convite (opcional)</label>' +
          '<input id="of-glink" placeholder="https://chat.whatsapp.com/XXXXXXXX"></div>' +
      '</div>' +
      '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn gn" onclick="ofAddGrupo()"><i class="ti ti-plus"></i>Guardar o grupo</button>' +
        (gs.length ? '<button class="btn gh" onclick="OF.editandoGrupo=false;midiaRender()">Cancelar</button>' : '') +
      '</div>';
  } else {
    h += '<button class="btn xs gh" onclick="OF.editandoGrupo=true;midiaRender()">' +
      '<i class="ti ti-plus"></i>Outro grupo</button>';
  }
  return h;
}

function ofAgoraHTML(){
  const a = OF.agora;
  if (!a || !a.oferta) return '';
  const of = a.oferta;
  return '<div class="al ag" style="margin-top:12px"><i class="ti ti-bell-ringing"></i><div>' +
    '<b>Está na hora da oferta das ' + ofHora(a.slot) + '</b> — ' + esc(of.nome) +
    (of.ficha.plataforma ? ' <span class="st s-nt">' + esc(of.ficha.plataforma) + '</span>' : '') +
    '<textarea readonly rows="9" style="width:100%;box-sizing:border-box;margin-top:8px;' +
      'font-size:12.5px;white-space:pre-wrap">' + esc(of.texto) + '</textarea>' +
    '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button class="btn gn" onclick="ofDespachar()">' +
        '<i class="ti ti-brand-whatsapp"></i>Abrir o WhatsApp com esta oferta</button>' +
      '<button class="btn xs gh" onclick="ofPular()">' +
        '<i class="ti ti-player-skip-forward"></i>Pular este horário</button>' +
      '<span class="tt">O WhatsApp abre com o texto escrito. Você escolhe o grupo ' +
        'e aperta enviar — esse clique é seu.</span>' +
    '</div></div></div>';
}

async function ofSecaoHTML(){
  const c = ofCfg();
  const cand = await ofCandidatos();
  const slots = ofSlots(c);
  const prox = ofProximoSlot(c, new Date());
  const hoje = new Date().toISOString().slice(0, 10);
  const feitasHoje = (c.enviadas || []).filter(function(e){ return e.dia === hoje && !e.pulado; });

  let h = '<div class="card tw" style="margin-bottom:14px">' +
    '<div class="hd"><i class="ti ti-clock-play" style="color:#25D366"></i>' +
    'Grupo de ofertas — uma a cada ' + c.aCada + ' horas' +
    (c.ligado ? '<span class="st s-ok">ligado</span>' : '<span class="st s-nt">desligado</span>') +
    (c.ligado ? '<span class="st s-nt">' + feitasHoje.length + ' de ' + slots.length + ' hoje</span>' : '') +
    '<span class="sp"></span>' +
    '<button class="btn sm ' + (c.ligado ? 'gh' : 'gn') + '" onclick="ofLigar()">' +
      '<i class="ti ti-' + (c.ligado ? 'player-pause' : 'player-play') + '"></i>' +
      (c.ligado ? 'Desligar' : 'Ligar') + '</button>' +
    '</div><div class="bd">';

  h += ofGruposHTML();

  /* a grade, com o próximo horário destacado */
  h += '<div class="sh" style="margin-top:12px"><i class="ti ti-calendar-time"></i>A grade do dia</div>' +
    '<div class="chips" style="margin-bottom:8px">' +
      slots.map(function(s){
        const feito = feitasHoje.some(function(e){ return e.slot === s; });
        const agora = prox === s;
        return '<span class="chip"' +
          (feito ? ' style="opacity:.55"' : agora ? ' style="background:var(--green);color:#fff"' : '') +
          '><i class="ti ti-' + (feito ? 'check' : 'clock') + '"></i> ' + ofHora(s) + '</span>';
      }).join('') +
    '</div>';

  h += '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
    '<label class="tt" style="display:flex;gap:6px;align-items:center">' +
      '<input type="checkbox" ' + (c.pularMadrugada ? 'checked' : '') + ' ' +
      'onchange="ofMudar(\'pularMadrugada\', this.checked)"> ' +
      'Pular a madrugada</label>' +
    '<span class="tt">Com a madrugada ligada são ' +
      ofSlots(Object.assign({}, c, { pularMadrugada: false })).length +
      ' por dia; sem ela, ' + ofSlots(Object.assign({}, c, { pularMadrugada: true })).length +
      '. Oferta às 4 da manhã é o jeito mais rápido de esvaziar um grupo.</span>' +
    '</div>';

  /* o estoque, com o número que impede a falsa sensação de fila cheia */
  h += '<div class="al ' + (cand.livres.length ? 'ai' : 'aw') + '" style="margin-top:12px">' +
    '<i class="ti ti-' + (cand.livres.length ? 'package' : 'package-off') + '"></i><div>' +
    '<b>' + cand.livres.length + ' oferta(s) prontas para rodar</b>' +
    ' — dá para ' + (slots.length ? Math.floor(cand.livres.length / slots.length) : 0) +
    ' dia(s) inteiro(s) sem repetir.' +
    (cand.semLink.length
      ? ' <b>' + cand.semLink.length + ' produto(s) estão parados esperando o seu link de afiliado</b> — ' +
        'Amazon eu monto pela fórmula e Shopee eu gero pela API oficial; ' +
        'Mercado Livre e TikTok Shop só saem do painel deles, e não existe jeito ' +
        'honesto de adivinhar. Para essas duas, cole em lote na carteira aqui embaixo.'
      : '') +
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn xs gh" onclick="ofReabastecerAgora()">' +
        '<i class="ti ti-pick"></i>Garimpar mais agora</button>' +
      '<button class="btn xs gh" onclick="ofVerFila()">' +
        '<i class="ti ti-list"></i>Ver a ordem da fila</button>' +
    '</div></div></div>';

  h += '<div class="tt" style="margin-top:9px">Nenhum programa envia no WhatsApp por você — ' +
    'nem este, nem os que prometem. O que eu faço é escolher o produto, escrever a oferta ' +
    'com o seu link e te chamar na hora. O enviar é seu.</div>';

  h += ofAgoraHTML();
  h += '</div></div>';
  return h;
}

async function ofReabastecerAgora(){
  toast('Garimpando…', 'ai');
  const r = await ofReabastecer(true);
  toast(r.garimpados
    ? r.garimpados + ' produto(s) novos. ' +
      (r.comLink ? r.comLink + ' já com link pronto' +
        (r.daShopee ? ' (' + r.daShopee + ' gerados pela Shopee)' : ' (Amazon)') + '. ' : '') +
      (r.esperando ? r.esperando + ' esperando o seu link — cole em lote na carteira.' : '')
    : 'Nenhum produto novo bateu com as suas condições do Garimpo.',
    r.garimpados ? 'ag' : 'aw');
  midiaRender();
}

async function ofVerFila(){
  const cand = await ofCandidatos();
  const linhas = cand.livres.slice(0, 20).map(function(p, i){
    return '<tr><td class="c n">' + (i + 1) + '</td><td><b>' + esc(p.nome) + '</b></td>' +
      '<td>' + esc(p.ficha.plataforma || '') + '</td>' +
      '<td class="r n">' + (p.ficha.preco ? moeda(p.ficha.preco) : '—') + '</td></tr>';
  }).join('');
  confirmar('A ordem da fila',
    (linhas
      ? '<table><thead><tr><th class="c">#</th><th>Produto</th><th>Loja</th>' +
        '<th class="r">Preço</th></tr></thead><tbody>' + linhas + '</tbody></table>'
      : '<p>A fila está vazia — nenhum produto com link de afiliado e fora do descanso.</p>') +
    (cand.livres.length > 20 ? '<p class="tt">… e mais ' + (cand.livres.length - 20) + '</p>' : '') +
    '<p class="tt">A ordem muda sozinha: quem foi enviado há mais tempo vai na frente, ' +
    'e a loja da oferta anterior é evitada na seguinte, para o grupo não virar ' +
    'um feed de uma loja só.</p>',
    function(){});
}

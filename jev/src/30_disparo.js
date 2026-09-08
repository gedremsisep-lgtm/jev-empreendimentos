/* =========================================================================
   PUBLICAR — dispara o mesmo vídeo em várias plataformas de uma vez

   O botão abre a lista das 13 plataformas do catálogo, já com as que pagam
   por view no Brasil marcadas. Para cada uma o sistema corta o texto no
   limite dela, escolhe quantas hashtags cabem e monta o título quando a
   plataforma pede título.

   "Simultâneo" aqui significa: um clique abre a página de envio de todas as
   plataformas marcadas ao mesmo tempo, cada uma com o texto pronto do lado
   para copiar. Ninguém posta por você sem a sua conta conectada — e nenhuma
   dessas plataformas abre a porta para isso sem conta de desenvolvedor
   aprovada. O que dá para tirar do seu caminho é a repetição, e é isso que
   este disparo faz.
   ========================================================================= */

const DISP = {
  i: null,          /* índice do achado no garimpo */
  plats: null,      /* plataformas marcadas */
  link: '',         /* o link de afiliado que vai na legenda */
  estilo: 'ugc',
  feitas: {},
  ultimoDisparo: null,
  video: null,      /* {caminho, nome, tamanho} — só existe no aplicativo do Windows */
  pautaId: null,    /* de qual item da pauta este disparo veio */
  auto: {}          /* resultado do preenchimento automático, por plataforma */
};

function dispPagam(){ return PLATAFORMAS_VIDEO.filter(p=>p.ganho && p.br); }
function dispPadrao(){ return dispPagam().map(p=>p.id); }

/* ---------------------------------------------------------- o conteúdo */
function dispFonte(){
  const p = (DISP.i != null) ? garAchado(DISP.i) : null;
  if(!p) return null;
  return {
    produto: p,
    titulo:  p.n,
    gancho:  p.gancho || p.n,
    preco:   p.preco,
    de:      p.de,
    vend:    p.vend,
    nota:    p.nota,
    hashtags: anHashtags(p),
    paginaProduto: (p.links && p.links.length) ? (p.links.find(l=>l.loja==='tiktok') || p.links[0]).url : ''
  };
}

/* o texto de uma plataforma, já cortado no limite dela */
function dispTexto(pid){
  const f = dispFonte();
  const p = plat(pid);
  if(!f || !p) return {titulo:null, texto:'', usados:0, limite:0, sobra:0};

  const link = DISP.link || f.paginaProduto || '';
  const hs   = f.hashtags.slice(0, p.hashRec || 4).join(' ');
  const ficha = f.titulo + ' — ' + moeda(f.preco) + (f.de ? ' (de ' + moeda(f.de) + ')' : '');
  const aviso = 'Publicidade — ganho comissão por venda.';

  let corpo;
  if(p.id === 'x' || p.id === 'pin' || p.id === 'snap' || p.id === 'tw'){
    /* plataformas de texto curto: só o gancho, o link e o aviso */
    corpo = f.gancho + (link ? '\n' + link : '') + '\n' + aviso;
  }else{
    corpo = f.gancho + '\n\n' + ficha + '\n' +
            (link ? link + '\n' : '') + aviso;
  }
  const texto = cortar((corpo + (hs ? '\n\n' + hs : '')).trim(), p.leg);
  const titulo = p.tit ? cortar(f.gancho, p.tit) : null;
  return {
    titulo, texto,
    usados: texto.length,
    limite: p.leg || 0,
    sobra: (p.leg || 0) - texto.length
  };
}

/* checagem honesta: a plataforma aceita este vídeo do jeito que ele está? */
function dispAvisos(pid, duracao){
  const p = plat(pid);
  const av = [];
  if(!p) return av;
  const d = num(duracao) || 32;
  if(p.durMin && d < p.durMin) av.push('exige pelo menos ' + p.durMin + 's — o seu tem ' + d + 's');
  if(p.durMax && d > p.durMax) av.push('aceita no máximo ' + p.durMax + 's');
  if(p.id === 'tt' && d < 60)  av.push('só conta para o fundo de criadores acima de 1 minuto');
  if(!p.ganho || !p.br)        av.push('não paga por view no Brasil — serve de vitrine para vender por afiliado');
  return av;
}

/* ------------------------------------------------------------ a janela */
async function dispAbrir(i){
  if(!garAchado(i)) return;
  DISP.i = i;
  if(!DISP.plats) DISP.plats = dispPadrao();
  /* se o produto já foi cadastrado como afiliado, puxa o link de lá */
  if(!DISP.link){
    try{
      const nome = garAchado(i).n.toLowerCase();
      const progs = await dbGetAll('programas');
      const achado = progs.find(x=>String(x.produto||'').toLowerCase() === nome);
      if(achado && achado.url) DISP.link = achado.url;
    }catch(e){}
  }
  dispRender();
}
function dispTogglar(pid){
  const k = DISP.plats.indexOf(pid);
  if(k >= 0) DISP.plats.splice(k,1); else DISP.plats.push(pid);
  dispRender();
}
function dispTodas(quais){
  if(quais === 'pagam')  DISP.plats = dispPadrao();
  if(quais === 'todas')  DISP.plats = PLATAFORMAS_VIDEO.map(p=>p.id);
  if(quais === 'nenhuma')DISP.plats = [];
  dispRender();
}
function dispLink(v){ DISP.link = v; }

function dispRender(){
  const f = dispFonte();
  if(!f) return;
  const dur = (AN.pacote && AN.pacote.duracao) || 32;
  const marcadas = PLATAFORMAS_VIDEO.filter(p=>DISP.plats.includes(p.id));
  const pagando  = marcadas.filter(p=>p.ganho && p.br).length;

  let h = `<div class="al ai" style="margin-top:0"><i class="ti ti-send"></i><div>
    Um clique abre a página de envio de <b>todas</b> as plataformas marcadas, ao mesmo tempo.
    O texto de cada uma já está cortado no limite dela — é copiar, colar e anexar o vídeo.
    <b>Nenhuma postagem sai sem você confirmar dentro da plataforma</b>, e nenhuma senha passa por aqui.</div></div>

  <div class="fg"><label>Seu link de afiliado <span class="rq">*</span></label>
    <input id="dp-link" value="${esc(DISP.link)}" oninput="dispLink(this.value)"
      placeholder="Cole aqui o link rastreável que a plataforma gerou para você">
    <div class="hint">${DISP.link ? 'É este link que entra na legenda de todas as plataformas.'
      : 'Sem ele a venda não é contada como sua. Enquanto estiver vazio, entra o endereço da página do produto.'}</div></div>

  ${dispTemApp() ? `
  <div class="card tw" style="margin-bottom:12px"><div class="bd">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <i class="ti ti-video" style="font-size:20px"></i>
      <div style="flex:1;min-width:220px">
        <b>Arquivo do vídeo</b>
        <div class="tt">${DISP.video
          ? esc(DISP.video.nome) + ' · ' + qtd(DISP.video.tamanho/1048576,1) + ' MB'
          : 'Escolha o arquivo e o programa anexa sozinho em cada plataforma.'}</div>
      </div>
      <button class="btn sm ${DISP.video?'gh':'bl'}" onclick="dispEscolherVideo()">
        <i class="ti ti-folder-open"></i>${DISP.video?'Trocar o vídeo':'Escolher o vídeo'}</button>
      <button class="btn sm gh" onclick="dispEsquecerLogins()" title="Apaga os logins guardados na janela de publicação">
        <i class="ti ti-logout"></i>Sair das plataformas</button>
    </div>
  </div></div>` : `
  <div class="al aw" style="margin-bottom:12px"><i class="ti ti-info-circle"></i><div>
    Você está no sistema pelo navegador. O preenchimento automático — abrir a plataforma
    com o vídeo já anexado e a legenda escrita — só funciona no <b>aplicativo do Windows</b>,
    porque um arquivo aberto no navegador não tem permissão para mexer na página de outro site.
    Aqui os botões copiam o texto e abrem a página, que é o que dá para fazer com honestidade.</div></div>`}

  <div style="display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 12px">
    <button class="btn xs gh" onclick="dispTodas('pagam')"><i class="ti ti-cash"></i>Só as que pagam</button>
    <button class="btn xs gh" onclick="dispTodas('todas')"><i class="ti ti-check"></i>Todas as ${PLATAFORMAS_VIDEO.length}</button>
    <button class="btn xs gh" onclick="dispTodas('nenhuma')"><i class="ti ti-x"></i>Nenhuma</button>
  </div>

  <div class="kg" style="margin-bottom:14px">
    <div class="kc br"><div class="lb"><i class="ti ti-world"></i>Marcadas</div>
      <div class="vl">${marcadas.length}</div><div class="sb">de ${PLATAFORMAS_VIDEO.length}</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-cash"></i>Pagam por view</div>
      <div class="vl">${pagando}</div><div class="sb">das marcadas</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-clock"></i>Vídeo</div>
      <div class="vl">${dur}s</div><div class="sb">duração planejada</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-tag"></i>Produto</div>
      <div class="vl">${moeda(f.preco)}</div><div class="sb">no anúncio</div></div>
  </div>`;

  PLATAFORMAS_VIDEO.forEach(p=>{
    const on = DISP.plats.includes(p.id);
    const t  = dispTexto(p.id);
    const av = dispAvisos(p.id, dur);
    const paga = p.ganho && p.br;
    h += `<div class="card" style="border-left:4px solid ${p.cor};${on?'':'opacity:.55'}">
      <div class="hd" style="cursor:pointer" onclick="dispTogglar('${p.id}')">
        <input type="checkbox" ${on?'checked':''} style="width:16px;height:16px;pointer-events:none">
        <i class="ti ${p.ic}" style="color:${p.cor}"></i>${esc(p.nome)}
        <span class="st ${paga?'s-ok':'s-nt'}" style="margin-left:6px">${paga?'paga por view':'vitrine'}</span>
        <span class="tt" style="margin-left:8px">${esc(p.formato)}</span>
        <span class="sp"></span>
        <span class="tt">${t.usados}/${t.limite||'—'}</span></div>
      ${on?`<div class="bd">
        ${av.length?`<div class="al aw" style="margin-bottom:8px"><i class="ti ti-alert-triangle"></i>
          <div>${av.map(esc).join(' · ')}</div></div>`:''}
        ${t.titulo!==null?`<div class="fg"><label>Título (limite ${p.tit})</label>
          <input id="dp-tit-${p.id}" value="${esc(t.titulo)}"></div>`:''}
        <div class="fg"><label>Legenda (limite ${p.leg})</label>
          <textarea id="dp-txt-${p.id}" rows="5">${esc(t.texto)}</textarea></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" class="no-print">
          ${dispTemApp()?`<button class="btn xs pu" onclick="dispPreencher('${p.id}')">
            <i class="ti ti-wand"></i>Abrir já preenchido</button>`:''}
          <button class="btn xs bl" onclick="dispCopiar('${p.id}')"><i class="ti ti-copy"></i>Copiar</button>
          <button class="btn xs gh" onclick="abrirFora('${p.url}')"><i class="ti ti-external-link"></i>Abrir ${esc(p.nome)}</button>
          <button class="btn xs gn" onclick="dispMarcar('${p.id}')"><i class="ti ti-check"></i>Publiquei</button>
          ${dispSelo(p.id)}
        </div></div>`:''}
    </div>`;
  });

  modal('Publicar — ' + f.titulo, 'ti-send', h,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn gh" onclick="dispCopiarTudo()"><i class="ti ti-copy"></i>Copiar todos os textos</button>
     <button class="btn bl" onclick="dispBaixar()"><i class="ti ti-download"></i>Baixar</button>
     ${dispTemApp()
       ? `<button class="btn gn" onclick="dispPreencherTodas()"><i class="ti ti-rocket"></i>Abrir as ${marcadas.length} já preenchidas</button>`
       : `<button class="btn gn" onclick="dispDisparar()"><i class="ti ti-rocket"></i>Abrir as ${marcadas.length} plataformas</button>`}`,
    'lg');
}

/* mostra, no cartão, como foi o preenchimento automático daquela plataforma */
function dispSelo(pid){
  const r = DISP.auto[pid];
  if(!r) return '';
  if(r.ok && r.anexou && r.escreveu)
    return `<span class="st s-ok"><i class="ti ti-check"></i>pronto: é só clicar em publicar lá</span>`;
  if(r.ok)
    return `<span class="st s-wn"><i class="ti ti-alert-triangle"></i>${esc((r.avisos||['faltou algo']).join(' · '))}</span>`;
  return `<span class="st s-bl"><i class="ti ti-x"></i>${esc(r.motivo || 'não abriu')}</span>`;
}

/* ------------------------------------------------------------- o disparo */
function dispCampos(pid){
  const tit = document.getElementById('dp-tit-'+pid);
  const txt = document.getElementById('dp-txt-'+pid);
  const t = dispTexto(pid);
  return { titulo: tit ? tit.value : t.titulo, texto: txt ? txt.value : t.texto };
}
async function dispCopiar(pid){
  const p = plat(pid), c = dispCampos(pid);
  const t = (c.titulo ? c.titulo + '\n\n' : '') + c.texto;
  try{ await navigator.clipboard.writeText(t); toast('Texto do ' + p.nome + ' copiado. Agora é colar lá.','ag'); }
  catch(e){ toast('Não consegui copiar. Selecione o texto e use Ctrl+C.','aw'); }
}
function dispBlocoTudo(){
  const f = dispFonte();
  return 'PUBLICAR: ' + f.titulo + '\n' +
    'Link usado: ' + (DISP.link || f.paginaProduto || '(nenhum)') + '\n\n' +
    PLATAFORMAS_VIDEO.filter(p=>DISP.plats.includes(p.id)).map(p=>{
      const c = dispCampos(p.id);
      return '=== ' + p.nome + ' (' + p.formato + ') ===\n' +
             (c.titulo ? 'Título: ' + c.titulo + '\n' : '') +
             c.texto + '\nEnviar em: ' + p.url;
    }).join('\n\n');
}
async function dispCopiarTudo(){
  try{ await navigator.clipboard.writeText(dispBlocoTudo()); toast('Todos os textos copiados, separados por plataforma.','ag'); }
  catch(e){ toast('Não consegui copiar.','aw'); }
}
function dispBaixar(){
  const f = dispFonte();
  baixarArquivo(dispBlocoTudo(), 'publicar-' + garSlug(f.titulo) + '.txt', 'text/plain;charset=utf-8');
}

/* abre todas de uma vez e registra o disparo */
async function dispDisparar(){
  const f = dispFonte();
  const alvo = PLATAFORMAS_VIDEO.filter(p=>DISP.plats.includes(p.id));
  if(!alvo.length){ toast('Marque pelo menos uma plataforma.','aw'); return; }

  /* copia o texto da primeira para a área de transferência: é por ela que se começa */
  await dispCopiar(alvo[0].id);

  /* No aplicativo do Windows o window.open sempre devolve null porque o
     endereço é entregue ao navegador do sistema — ali não existe bloqueio. */
  const noApp = (typeof APP === 'function') && !!APP();
  let bloqueadas = 0;
  alvo.forEach(p=>{
    const w = window.open(p.url, '_blank', 'noopener');
    if(!noApp && !w) bloqueadas++;
  });

  const quando = new Date().toISOString();
  DISP.ultimoDisparo = { quando, plataformas: alvo.map(p=>p.id), bloqueadas };
  try{
    await dbAdd('garimpos', {
      quando, tipo:'disparo', produto: f.titulo,
      link: DISP.link || f.paginaProduto || '',
      plataformas: alvo.map(p=>p.id)
    });
  }catch(e){}

  if(bloqueadas){
    toast(bloqueadas + ' aba(s) o navegador bloqueou. Libere as janelas para este endereço ' +
          'ou use o botão Abrir de cada plataforma.','aw');
  }else{
    toast(alvo.length + ' plataforma(s) abertas. O texto do ' + alvo[0].nome +
          ' já está copiado — cole lá e depois use Copiar em cada uma.','ag');
  }
  dispRender();
}

/* ---------------------------------------------------------------------
   PREENCHIMENTO AUTOMÁTICO — só existe no aplicativo do Windows, porque
   um arquivo HTML aberto no navegador não tem permissão para mexer na
   página de outro site. No navegador, os botões continuam sendo copiar
   e abrir, que é o que dá para fazer com honestidade lá.
   --------------------------------------------------------------------- */
function dispTemApp(){ return (typeof APP === 'function') && !!APP(); }

async function dispEscolherVideo(){
  const d = APP();
  if(!d || !d.pubEscolherVideo){ toast('Isto só funciona no aplicativo do Windows.','aw'); return; }
  try{
    const v = await d.pubEscolherVideo();
    if(v){ DISP.video = v; toast('Vídeo escolhido: ' + v.nome,'ag'); dispRender(); }
  }catch(e){ toast('Não consegui abrir a janela de arquivos.','aw'); }
}

async function dispPreencher(pid){
  const d = APP();
  const p = plat(pid);
  if(!d || !d.pubPublicar){ toast('Isto só funciona no aplicativo do Windows.','aw'); return; }
  if(!DISP.video){ toast('Escolha primeiro o arquivo do vídeo, lá em cima.','aw'); return; }
  const c = dispCampos(pid);
  toast('Abrindo o ' + p.nome + ' e preenchendo…');
  let r;
  try{
    r = await d.pubPublicar({ plataforma: pid, url: p.url, video: DISP.video.caminho,
                              titulo: c.titulo || '', legenda: c.texto });
  }catch(e){ r = {ok:false, motivo:String(e && e.message || e)}; }
  DISP.auto[pid] = r;
  if(r && r.ok && r.anexou && r.escreveu){
    toast(p.nome + ': vídeo anexado e legenda escrita. Confira e clique em publicar lá.','ag');
  }else if(r && r.ok){
    toast(p.nome + ': abri a página logada, mas ' + ((r.avisos||[]).join(' · ') || 'algo não coube') +
          '. Termine na mão.','aw');
  }else{
    toast(p.nome + ': não consegui abrir — ' + ((r && r.motivo) || 'motivo desconhecido'),'aw');
  }
  dispRender();
}

async function dispPreencherTodas(){
  if(!dispTemApp()){ dispDisparar(); return; }
  if(!DISP.video){ toast('Escolha primeiro o arquivo do vídeo.','aw'); return; }
  const alvo = PLATAFORMAS_VIDEO.filter(p=>DISP.plats.includes(p.id));
  if(!alvo.length){ toast('Marque pelo menos uma plataforma.','aw'); return; }
  for(const p of alvo){ await dispPreencher(p.id); }
  const okey = alvo.filter(p=>{ const r = DISP.auto[p.id]; return r && r.anexou && r.escreveu; }).length;
  toast(okey + ' de ' + alvo.length + ' ficaram prontas para você só clicar em publicar.',
        okey===alvo.length ? 'ag' : 'aw');
}

async function dispEsquecerLogins(){
  const d = APP();
  if(!d || !d.pubEsquecerLogins) return;
  confirmar('Sair de todas as plataformas',
    'Isto apaga os logins guardados dentro da janela de publicação do JeV. ' +
    'Nada é apagado nas plataformas — você só vai precisar entrar de novo aqui.',
    async()=>{ await d.pubEsquecerLogins(); toast('Logins esquecidos.','aw'); });
}

/* marca como publicado e guarda para o acompanhamento de resultado */
async function dispMarcar(pid){
  const f = dispFonte();
  const p = plat(pid);
  const c = dispCampos(pid);
  await dbAdd('publicacoes', {
    roteiroId: 0, origem:'garimpo', produto: f.titulo,
    plataforma: pid, titulo: f.titulo, tituloPlat: c.titulo || '',
    texto: c.texto, url:'', link: DISP.link || f.paginaProduto || '',
    dtPub: hoje(), views:0, receita:0, cliques:0, vendas:0, comissao:0
  });
  DISP.feitas[pid] = true;
  /* veio da pauta? então a linha lá também muda de situação */
  if(DISP.pautaId){
    try{
      const item = await dbGet('videos', DISP.pautaId);
      if(item) await dbPut('videos', {...item, status:'Publicado', dtPub: hoje()});
    }catch(e){}
  }
  toast(p.nome + ' marcado como publicado. Depois volte na aba Publicar para anotar o resultado.','ag');
}

/* =========================================================================
   POSTAR — abre a SUA página, no lugar exato de subir o vídeo

   O botão fica em cada canal, na aba Canais. Ele não abre a home da
   plataforma: monta o endereço da tela de envio a partir do endereço do
   canal que você cadastrou.

   Uma coisa importante sobre honestidade aqui. Em algumas plataformas dá
   para apontar o dedo no canal certo (o YouTube aceita o código do canal
   dentro do endereço; o Facebook aceita o número da página). Em outras a
   tela de envio é uma só, e quem decide de qual conta é o login — nesses
   casos o sistema diz isso na cara, em vez de fingir precisão que não tem.

   E existe a saída definitiva: o campo "Endereço exato para postar" no
   cadastro do canal. O que estiver ali manda em tudo. Assim, no dia em que
   uma plataforma mudar de endereço, você conserta sem depender de mim.
   ========================================================================= */

const POST_PLAT = {
  'YouTube': {
    pid:'yt', ic:'ti-brand-youtube', cor:'#C0392B',
    /* studio.youtube.com aceita o código do canal (UC…) no meio do endereço.
       Sem o código, o "UC" sozinho faz o Studio resolver a conta logada. */
    montar(u){
      const m = String(u||'').match(/\/channel\/(UC[\w-]{10,})/);
      if(m) return { url:'https://studio.youtube.com/channel/'+m[1]+'/videos/upload',
                     exato:true, como:'pelo código do canal ('+m[1]+')' };
      return { url:'https://studio.youtube.com/channel/UC/videos/upload',
               exato:false, como:'cai no canal que estiver logado no YouTube Studio' };
    },
    dica:'Para acertar em cheio, cadastre o endereço no formato youtube.com/channel/UC…, que aparece em Studio → Configurações → Canal → Configurações avançadas.'
  },
  'TikTok': {
    pid:'tt', ic:'ti-brand-tiktok', cor:'#111827',
    montar(u){
      const m = String(u||'').match(/@([\w.\-]+)/);
      return { url:'https://www.tiktok.com/tiktokstudio/upload',
               exato:false,
               como: m ? 'a tela de envio é uma só — confira se está logado como @'+m[1]
                       : 'a tela de envio é uma só; quem decide a conta é o login' };
    },
    dica:'O TikTok Studio tem um endereço só para todas as contas. Se você usa mais de uma, confira o nome no canto antes de subir.'
  },
  'Instagram': {
    pid:'ig', ic:'ti-brand-instagram', cor:'#B03A83',
    montar(u){
      const m = String(u||'').match(/instagram\.com\/([\w.]+)/i);
      if(m && m[1] && !/^(p|reel|reels|explore|accounts)$/i.test(m[1]))
        return { url:'https://www.instagram.com/'+m[1]+'/',
                 exato:false, como:'abre o seu perfil @'+m[1]+' — o envio é pelo + no topo' };
      return { url:'https://www.instagram.com/', exato:false,
               como:'o Instagram não tem endereço direto de envio; use o + no topo' };
    },
    dica:'No computador, o Instagram só deixa criar pelo botão + no topo da tela. Não existe endereço que abra o envio direto.'
  },
  'Kwai': {
    pid:'kwai', ic:'ti-video', cor:'#D97706',
    montar(){ return { url:'https://creator.kwai.com/', exato:false,
                       como:'abre a central do criador, onde fica o envio' }; },
    dica:'O envio do Kwai fica na central do criador. Se pedir login, entre uma vez e ele fica salvo.'
  },
  'Facebook': {
    pid:'fb', ic:'ti-brand-facebook', cor:'#1F5FA8',
    /* O Meta Business Suite aceita o número da página no endereço. Com o
       número, cai na página certa mesmo quem administra várias. */
    montar(u){
      const m = String(u||'').match(/(?:facebook\.com\/)(?:profile\.php\?id=)?(\d{8,})/);
      if(m) return { url:'https://business.facebook.com/latest/reels_composer?asset_id='+m[1],
                     exato:true, como:'pelo número da página ('+m[1]+')' };
      return { url:'https://business.facebook.com/latest/reels_composer',
               exato:false, como:'cai na página que o Business Suite abrir por último' };
    },
    dica:'Para acertar a página certa, cadastre o endereço que contém o número dela (facebook.com/1234567890…). O número aparece em Meta Business Suite → Configurações.'
  },
  'Outra': {
    pid:null, ic:'ti-device-tv', cor:'#5B6260',
    montar(u){
      const url = String(u||'').trim();
      if(/^https?:\/\//i.test(url)) return { url, exato:true, como:'o endereço que você cadastrou' };
      return { url:'', exato:false, como:'sem endereço cadastrado' };
    },
    dica:'Para esta plataforma, cadastre no canal o endereço exato da tela de envio.'
  }
};

/* o destino de um canal: o campo manual manda em tudo */
function postDestino(c){
  if(!c) return { url:'', exato:false, como:'canal não encontrado', plat:POST_PLAT['Outra'] };
  const plat = POST_PLAT[c.plataforma] || POST_PLAT['Outra'];
  const manual = String(c.urlPostar||'').trim();
  if(/^https?:\/\//i.test(manual))
    return { url:manual, exato:true, como:'o endereço exato que você cadastrou neste canal', plat, manual:true };
  const d = plat.montar(c.url);
  return Object.assign({ plat, manual:false }, d);
}

/* --------------------------------------------------------------- a tela */
const POST = { canalId:null, video:null, legenda:'', titulo:'', resultado:null };

async function postAbrir(id, ev){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  POST.canalId = Number(id);
  POST.resultado = null;
  await postRender();
}
function postCampo(k, v){ POST[k] = v; }

async function postRender(){
  const c = await dbGet('canais', POST.canalId);
  if(!c) return;
  const d = postDestino(c);
  const noApp = (typeof APP === 'function') && !!APP();
  const roteiros = (await dbGetAll('roteiros')).sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,15);

  const b = `
  <div class="al ${d.url?'ai':'ae'}" style="margin-top:0"><i class="ti ti-${d.url?'target-arrow':'alert-circle'}"></i><div>
    ${d.url ? `Vai abrir <b>${esc(d.plat.pid==='yt'?'o YouTube Studio':'a tela de envio')}</b> ${esc(d.como)}.`
            : 'Este canal ainda não tem endereço cadastrado, então não sei para onde te levar.'}
  </div></div>

  <div class="card tw" style="margin-bottom:12px"><div class="bd">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <div class="oi" style="background:${d.plat.cor}1A;color:${d.plat.cor};width:38px;height:38px;border-radius:10px;
        display:flex;align-items:center;justify-content:center"><i class="ti ${d.plat.ic}"></i></div>
      <div style="flex:1;min-width:220px">
        <b>${esc(c.nome)}</b> <span class="st ${d.exato?'s-ok':'s-wn'}">${d.exato?'endereço exato':'aproximado'}</span>
        <div class="tt mono" style="word-break:break-all">${esc(d.url || '—')}</div>
      </div>
    </div>
    ${!d.exato && d.plat.dica ? `<div class="tt" style="margin-top:8px"><i class="ti ti-bulb"></i> ${esc(d.plat.dica)}</div>` : ''}
  </div></div>

  ${noApp?`
  <div class="card tw" style="margin-bottom:12px"><div class="bd">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <i class="ti ti-video" style="font-size:20px"></i>
      <div style="flex:1;min-width:220px"><b>Arquivo do vídeo</b>
        <div class="tt">${POST.video ? esc(POST.video.nome) + ' · ' + qtd(POST.video.tamanho/1048576,1) + ' MB'
          : 'Escolha e o programa anexa sozinho, deixando só o clique de publicar para você.'}</div></div>
      <button class="btn sm ${POST.video?'gh':'bl'}" onclick="postEscolherVideo()">
        <i class="ti ti-folder-open"></i>${POST.video?'Trocar':'Escolher o vídeo'}</button>
    </div>
  </div></div>`:`
  <div class="al aw" style="margin-bottom:12px"><i class="ti ti-info-circle"></i><div>
    Pelo navegador, o botão abre a página no lugar certo. Anexar o vídeo e escrever a legenda
    sozinho só acontece no <b>aplicativo do Windows</b>.</div></div>`}

  ${roteiros.length?`<div class="fg"><label>Aproveitar a legenda de um vídeo já montado</label>
    <select onchange="postPuxarRoteiro(this.value)">
      <option value="">— escrever na mão —</option>
      ${roteiros.map(r=>`<option value="${r.id}">${esc(r.titulo)}</option>`).join('')}
    </select></div>`:''}

  <div class="fg"><label>Título (quando a plataforma pedir)</label>
    <input id="pt-tit" value="${esc(POST.titulo)}" oninput="postCampo('titulo',this.value)"></div>
  <div class="fg"><label>Legenda</label>
    <textarea id="pt-leg" rows="6" oninput="postCampo('legenda',this.value)">${esc(POST.legenda)}</textarea>
    <div class="hint">Não esqueça o seu link de afiliado e o aviso de publicidade.</div></div>

  ${POST.resultado?`<div class="al ${POST.resultado.tudo?'ag':'aw'}"><i class="ti ti-${POST.resultado.tudo?'check':'alert-triangle'}"></i>
    <div>${esc(POST.resultado.recado)}</div></div>`:''}`;

  modal('Postar — ' + c.nome, 'ti-send', b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn gh" onclick="canalForm(${c.id})"><i class="ti ti-edit"></i>Ajustar o endereço</button>
     ${POST.legenda?`<button class="btn bl" onclick="postCopiar()"><i class="ti ti-copy"></i>Copiar a legenda</button>`:''}
     ${noApp
       ? `<button class="btn gn" onclick="postIr(true)"><i class="ti ti-wand"></i>Abrir já preenchido</button>`
       : `<button class="btn gn" onclick="postIr(false)"><i class="ti ti-external-link"></i>Abrir o local de postagem</button>`}`);
}

async function postPuxarRoteiro(id){
  if(!id){ return; }
  const r = await dbGet('roteiros', Number(id));
  if(!r) return;
  POST.titulo  = r.titulo || '';
  POST.legenda = r.legenda || (r.gancho ? r.gancho + '\n\n' : '') + (r.hashtags||[]).join(' ');
  postRender();
}

async function postEscolherVideo(){
  const d = APP();
  if(!d || !d.pubEscolherVideo){ toast('Isto só funciona no aplicativo do Windows.','aw'); return; }
  try{
    const v = await d.pubEscolherVideo();
    if(v){ POST.video = v; toast('Vídeo escolhido: '+v.nome,'ag'); postRender(); }
  }catch(e){ toast('Não consegui abrir a janela de arquivos.','aw'); }
}

async function postCopiar(){
  const t = (POST.titulo ? POST.titulo + '\n\n' : '') + POST.legenda;
  try{ await navigator.clipboard.writeText(t); toast('Legenda copiada.','ag'); }
  catch(e){ toast('Não consegui copiar.','aw'); }
}

/* o clique principal */
async function postIr(preencher){
  const c = await dbGet('canais', POST.canalId);
  const d = postDestino(c);
  if(!d.url){
    toast('Cadastre o endereço do canal para eu saber para onde ir.','aw');
    canalForm(POST.canalId);
    return;
  }
  const app = (typeof APP === 'function') ? APP() : null;

  /* fora do aplicativo, ou sem vídeo escolhido: abre a página e pronto */
  if(!preencher || !app || !app.pubPublicar || !POST.video || !d.plat.pid){
    abrirFora(d.url);
    if(POST.legenda) await postCopiar();
    POST.resultado = { tudo:false,
      recado:'Abri a página' + (POST.legenda?' e copiei a legenda — é só colar lá':'') + '.' };
    postRender();
    return;
  }

  toast('Abrindo e preenchendo…');
  let r;
  try{
    r = await app.pubPublicar({ plataforma:d.plat.pid, url:d.url, video:POST.video.caminho,
                                titulo:POST.titulo, legenda:POST.legenda });
  }catch(e){ r = {ok:false, motivo:String(e && e.message || e)}; }

  if(r && r.ok && r.anexou && r.escreveu){
    POST.resultado = { tudo:true, recado:'Vídeo anexado e legenda escrita. Confira na janela que abriu e clique em publicar.' };
    toast('Pronto: falta só o seu clique em publicar.','ag');
  }else if(r && r.ok){
    POST.resultado = { tudo:false, recado:'Abri a página logada, mas ' +
      ((r.avisos||[]).join(' · ') || 'algo não coube') + '. Termine na mão.' };
  }else{
    POST.resultado = { tudo:false, recado:'Não consegui abrir: ' + ((r && r.motivo) || 'motivo desconhecido') };
  }
  postRender();
}

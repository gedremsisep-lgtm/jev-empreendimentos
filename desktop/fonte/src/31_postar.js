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

/* --------------------------------------------------- as redes novas */
POST_PLAT['YouTube Shorts'] = Object.assign({}, POST_PLAT['YouTube'], {
  dica:'O Short sobe pela mesma tela do YouTube Studio. Para acertar o canal, cadastre o endereço no formato youtube.com/channel/UC….'
});
POST_PLAT['Pinterest'] = {
  pid:null, ic:'ti-brand-pinterest', cor:'#BD081C',
  montar(){ return { url:'https://www.pinterest.com/pin-creation-tool/', exato:false,
                     como:'o criador de Pins da conta que estiver logada' }; },
  dica:'O criador de Pins é um só; quem decide a conta é o login.'
};
POST_PLAT['WhatsApp'] = {
  pid:null, ic:'ti-brand-whatsapp', cor:'#1F8A4C',
  montar(){ return { url:'https://web.whatsapp.com/', exato:false,
                     como:'o WhatsApp Web — os Canais ficam no ícone ao lado de Conversas' }; },
  dica:'O WhatsApp não tem endereço que abra o seu canal direto. Na primeira vez, leia o QR Code com o celular.'
};
POST_PLAT['X (Twitter)'] = {
  pid:null, ic:'ti-brand-x', cor:'#0F1419',
  montar(){ return { url:'https://x.com/compose/post', exato:false,
                     como:'a caixa de novo post da conta logada' }; },
  dica:'A caixa de post é uma só; quem decide a conta é o login.'
};
POST_PLAT['LinkedIn'] = {
  pid:null, ic:'ti-brand-linkedin', cor:'#0A66C2',
  montar(){ return { url:'https://www.linkedin.com/feed/?shareActive=true', exato:false,
                     como:'a caixa de publicação do LinkedIn' }; },
  dica:'Para publicar como página de empresa, troque o autor no topo da caixa de publicação.'
};

/* ===================================================================
   AS AÇÕES DE CADA REDE

   Cada rede tem um botão principal (o que você mais faz nela) e ações
   extras, cada uma com o seu formulário. Cada ação sabe:
     campos   — o que pedir (titulo, legenda, link)
     limite   — quantos caracteres a rede aceita
     upload   — se é envio de vídeo (aí o app do Windows pode anexar)
     mobile   — se só existe no app do celular (aí não fingimos endereço)
     destino  — para onde ir; sem ele, vale o endereço do canal (postDestino)
   =================================================================== */
function ytBase(c){
  const m = String(c&&c.url||'').match(/youtube\.com\/(@[\w.\-]+|channel\/UC[\w-]{10,})/i);
  return m ? 'https://www.youtube.com/'+m[1] : '';
}
function ytStudio(c, resto){
  const m = String(c&&c.url||'').match(/\/channel\/(UC[\w-]{10,})/);
  return 'https://studio.youtube.com/channel/'+(m?m[1]:'UC')+resto;
}
function fbPagina(c){
  const m = String(c&&c.url||'').match(/(?:facebook\.com\/)(?:profile\.php\?id=)?(\d{8,})/);
  return m ? m[1] : '';
}

const REDE_ACOES = {
  'YouTube': [
    {k:'longo', n:'Publicar vídeo longo', ic:'ti-video-plus', principal:true, upload:true, campos:['titulo','legenda'],
     dica:'Título de até 100 caracteres. Na descrição, ponha o link nas duas primeiras linhas — é o que aparece sem clicar em "mais".'},
    {k:'short', n:'Short', ic:'ti-device-mobile', upload:true, campos:['titulo','legenda'],
     dica:'Vídeo em pé (9:16) com até 3 minutos: o YouTube reconhece sozinho como Short, pela mesma tela de envio.'},
    {k:'comunidade', n:'Comunidade', ic:'ti-message', campos:['legenda','link'],
     destino(c){ const b = ytBase(c);
       return b ? { url:b+'/posts', exato:true, como:'a aba de posts (comunidade) do seu canal' }
                : { url:'https://www.youtube.com/', exato:false,
                    como:'o YouTube — cadastre o endereço do canal (youtube.com/@seucanal) para cair direto na aba de posts' }; },
     dica:'Bom para enquete, foto de bastidor e aviso de vídeo novo.'},
    {k:'thumb', n:'Thumbnail', ic:'ti-photo', campos:[],
     destino(c){ return { url:ytStudio(c,'/videos'), exato:false, como:'a lista de vídeos no YouTube Studio' }; },
     dica:'Abra o vídeo → Detalhes → Miniatura → Enviar arquivo. Tamanho ideal 1280×720.'}
  ],
  'YouTube Shorts': [
    {k:'short', n:'Publicar Short', ic:'ti-video-plus', principal:true, upload:true, campos:['titulo','legenda'],
     dica:'Vídeo em pé (9:16), até 3 minutos. Os 2 primeiros segundos decidem se a pessoa fica.'},
    {k:'relacionado', n:'Vídeo relacionado', ic:'ti-link', upload:true, campos:[],
     dica:'Link na descrição do Short não é clicável. No envio, em "Vídeo relacionado", escolha um vídeo longo do canal — é o caminho que leva o público adiante.'}
  ],
  'TikTok': [
    {k:'video', n:'Postar no TikTok', ic:'ti-brand-tiktok', principal:true, upload:true, campos:['legenda'], limite:4000,
     dica:'Legenda curta com 3 a 5 hashtags do nicho. No envio, escolha como capa o quadro mais forte.'},
    {k:'shop', n:'Produto da Shop', ic:'ti-shopping-bag', upload:true, campos:['legenda'], limite:4000,
     dica:'Na tela de envio, em "Adicionar link" → Produto, escolha o item da vitrine. Só aparece para conta com TikTok Shop ou afiliado ativo.'},
    {k:'live', n:'Live', ic:'ti-player-play', mobile:true, campos:['titulo'],
     dica:'A live abre pelo app: botão + → LIVE. Escreva aqui o título e eu copio para você colar.'}
  ],
  'Instagram': [
    {k:'reels', n:'Postar Reels', ic:'ti-movie', principal:true, upload:true, campos:['legenda'], limite:2200,
     dica:'3 a 5 hashtags bem escolhidas rendem mais que 30. Link na legenda não é clicável: mande o público para a bio.'},
    {k:'story', n:'Story', ic:'ti-photo-plus', mobile:true, campos:['legenda','link'],
     dica:'Story com a figurinha "Link" é o único link clicável fora da bio. No app: + → Story → figurinhas → Link.'},
    {k:'carrossel', n:'Carrossel', ic:'ti-layout-columns', campos:['legenda'], limite:2200,
     dica:'Pelo + no topo → Publicação → marque várias fotos (até 20). A primeira é a capa.'},
    {k:'bio', n:'Link na bio', ic:'ti-link', campos:['link'],
     destino(){ return { url:'https://www.instagram.com/accounts/edit/', exato:true,
                         como:'a tela de editar perfil, onde fica o link da bio' }; },
     dica:'Troque o link da bio pelo produto da semana e avise nos Reels: "link na bio".'}
  ],
  'Facebook': [
    {k:'post', n:'Postar na Página', ic:'ti-pencil', principal:true, campos:['legenda','link'],
     destino(c){ const id = fbPagina(c);
       return id ? { url:'https://business.facebook.com/latest/composer?asset_id='+id, exato:true, como:'o Business Suite, pelo número da página ('+id+')' }
                 : { url:'https://business.facebook.com/latest/composer', exato:false, como:'o Business Suite, na página que ele abrir por último' }; },
     dica:'No Facebook o link na publicação é clicável: ponha o link direto no texto.'},
    {k:'reels', n:'Reels', ic:'ti-movie', upload:true, campos:['legenda'],
     dica:'O mesmo vídeo do Instagram pode subir aqui — sem a marca d\'água de outra rede.'},
    {k:'grupo', n:'Grupo', ic:'ti-users-group', campos:['legenda','link'],
     destino(){ return { url:'https://www.facebook.com/groups/feed/', exato:false,
                         como:'os seus grupos — escolha o grupo e cole o texto' }; },
     dica:'Leia as regras do grupo antes: muitos proíbem link de venda e removem quem posta.'},
    {k:'marketplace', n:'Marketplace', ic:'ti-shopping-cart', campos:['titulo','legenda'],
     destino(){ return { url:'https://www.facebook.com/marketplace/create/item', exato:true,
                         como:'o formulário de novo anúncio do Marketplace' }; },
     dica:'Serve para vender o que é seu (ex.: peças 3D). Link de afiliado no Marketplace não é permitido.'}
  ],
  'Kwai': [
    {k:'video', n:'Postar no Kwai', ic:'ti-video-plus', principal:true, upload:true, campos:['legenda'],
     dica:'Vídeo em pé, legenda curta e 3 hashtags. Regularidade conta mais que volume.'},
    {k:'missoes', n:'Bônus e missões', ic:'ti-trophy', mobile:true, campos:[],
     dica:'As missões e o bônus de criador ficam no app: Perfil → Central do criador. Vale conferir toda semana.'}
  ],
  'Pinterest': [
    {k:'pin', n:'Criar Pin', ic:'ti-brand-pinterest', principal:true, campos:['titulo','legenda','link'], limite:500,
     dica:'Título até 100 caracteres, descrição até 500 e o link no campo de destino — no Pinterest o link é clicável e o Pin rende por meses.'},
    {k:'pinvideo', n:'Pin de vídeo', ic:'ti-video', upload:true, campos:['titulo','legenda','link'], limite:500,
     dica:'Mesmo criador de Pins: arraste o vídeo em pé e preencha o link de destino.'},
    {k:'pasta', n:'Pasta', ic:'ti-folder', campos:[],
     destino(c){ const u = String(c&&c.url||'').trim();
       return /pinterest\./i.test(u) ? { url:u, exato:true, como:'o seu perfil, onde ficam as pastas' }
                                      : { url:'https://www.pinterest.com/', exato:false,
                                          como:'o Pinterest — cadastre o endereço do perfil para cair direto nas pastas' }; },
     dica:'Uma pasta por categoria (ex.: Cozinha, Ferramentas): Pins organizados são mais distribuídos.'}
  ],
  'WhatsApp': [
    {k:'canal', n:'Enviar ao Canal', ic:'ti-send', principal:true, campos:['legenda','link'],
     dica:'No WhatsApp Web, abra Canais (ícone ao lado de Conversas), escolha o seu canal e cole — o texto já vai copiado.'},
    {k:'status', n:'Status', ic:'ti-photo-plus', mobile:true, campos:['legenda','link'],
     dica:'Status pelo app: aba Atualizações → câmera. O link no status é clicável.'},
    {k:'oferta', n:'Oferta p/ contatos', ic:'ti-users', campos:['legenda','link'],
     destino(c,t){ return { url:'https://wa.me/?text='+encodeURIComponent(t||''), exato:true,
                            como:'o WhatsApp já com o texto — você escolhe para quem mandar' }; },
     dica:'Em lista de transmissão, só recebe quem tem o seu número salvo.'}
  ],
  'X (Twitter)': [
    {k:'post', n:'Publicar post', ic:'ti-pencil', principal:true, campos:['legenda','link'], limite:280,
     destino(c,t){ return { url:'https://x.com/intent/post?text='+encodeURIComponent(t||''), exato:true,
                            como:'a caixa de post já com o texto escrito' }; },
     dica:'Até 280 caracteres, e todo link conta como 23.'},
    {k:'thread', n:'Thread', ic:'ti-list-numbers', campos:['legenda'],
     dica:'Separe as partes com uma linha em branco; na caixa do X, use o + para emendar cada parte.'},
    {k:'video', n:'Vídeo', ic:'ti-video', upload:true, campos:['legenda'], limite:280,
     dica:'Conta gratuita aceita vídeo de até 2min20s.'}
  ],
  'LinkedIn': [
    {k:'post', n:'Publicar no perfil/página', ic:'ti-pencil', principal:true, campos:['legenda','link'], limite:3000,
     destino(c,t){ return { url:'https://www.linkedin.com/feed/?shareActive=true&text='+encodeURIComponent(t||''), exato:true,
                            como:'a caixa de publicação já com o texto (para página de empresa, troque o autor no topo)' }; },
     dica:'As 3 primeiras linhas decidem se a pessoa clica em "ver mais".'},
    {k:'artigo', n:'Artigo', ic:'ti-file-text', campos:['titulo','legenda'],
     destino(){ return { url:'https://www.linkedin.com/article/new/', exato:true, como:'o editor de artigos do LinkedIn' }; },
     dica:'O artigo fica no perfil e aparece no Google. Bom para conteúdo de obra e gestão.'},
    {k:'carrossel', n:'Carrossel PDF', ic:'ti-file-upload', campos:['titulo','legenda'],
     dica:'Na caixa de publicação, clique em "Adicionar documento" e suba o PDF: cada página vira um slide.'}
  ],
  'Outra': [
    {k:'post', n:'Postar', ic:'ti-send', principal:true, upload:true, campos:['titulo','legenda','link']}
  ]
};
function redeAcoes(c){ return REDE_ACOES[c && c.plataforma] || REDE_ACOES['Outra']; }
function redePrincipal(c){ const l = redeAcoes(c); return l.find(a=>a.principal) || l[0]; }
function redeAcao(c, k){ return redeAcoes(c).find(a=>a.k===k) || redePrincipal(c); }

/* para onde vai cada ação. O endereço manual do canal manda no botão principal. */
function acaoDestino(c, a, texto){
  const plat = (c && POST_PLAT[c.plataforma]) || POST_PLAT['Outra'];
  if(a.mobile) return { url:'', exato:false, como:'só existe no app do celular', plat, mobile:true };
  const manual = String(c && c.urlPostar || '').trim();
  if(a.principal && /^https?:\/\//i.test(manual))
    return { url:manual, exato:true, como:'o endereço exato que você cadastrou neste canal', plat, manual:true };
  if(a.destino) return Object.assign({ plat, manual:false }, a.destino(c, texto));
  return postDestino(c);
}

/* --------------------------------------------------------------- a tela */
const POST = { canalId:null, acao:null, campos:[], video:null, legenda:'', titulo:'', link:'', resultado:null };

async function postAbrir(id, ev, acao){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  POST.canalId = Number(id);
  POST.acao = acao || null;
  POST.resultado = null;
  await postRender();
}
function postTrocar(k){ POST.acao = k; POST.resultado = null; postRender(); }
function postTexto(){
  const cs = POST.campos || [];
  return [cs.includes('titulo') ? POST.titulo : '',
          cs.includes('legenda') ? POST.legenda : '',
          cs.includes('link') ? POST.link : ''].map(x=>String(x||'').trim()).filter(Boolean).join('\n\n');
}
function postCampo(k, v){ POST[k] = v; postConta(); }
function postConta(){
  const el = document.getElementById('pt-conta');
  if(!el) return;
  const n = postTexto().length, lim = Number(el.getAttribute('data-lim')) || 0;
  el.textContent = n + ' / ' + lim + ' caracteres';
  el.style.color = n > lim ? 'var(--red)' : '';
}

async function postRender(){
  const c = await dbGet('canais', POST.canalId);
  if(!c) return;
  const a = redeAcao(c, POST.acao);
  POST.acao = a.k; POST.campos = a.campos || [];
  const cs = POST.campos;
  const d = acaoDestino(c, a, postTexto());
  const pi = platInfo(c.plataforma);
  const noApp = (typeof APP === 'function') && !!APP();
  const roteiros = cs.includes('legenda')
    ? (await dbGetAll('roteiros')).sort((x,y)=>Number(y.id)-Number(x.id)).slice(0,15) : [];
  const vaiPreencher = noApp && a.upload && !a.destino && !!d.plat.pid;
  const urlCurta = d.url ? (d.url.length > 110 ? d.url.slice(0,110)+'…' : d.url) : '—';

  const b = `
  <div class="chips" style="margin-bottom:10px">
    ${redeAcoes(c).map(x=>`<span class="chip ${x.k===a.k?'on':''}" onclick="postTrocar('${x.k}')">
      <i class="ti ${x.ic}"></i> ${esc(x.n)}</span>`).join('')}</div>

  ${d.mobile
    ? `<div class="al aw" style="margin-top:0"><i class="ti ti-device-mobile"></i><div>
         <b>${esc(a.n)}</b> só existe no app do celular. Deixo o texto pronto aqui para você copiar e colar lá.</div></div>`
    : `<div class="al ${d.url?'ai':'ae'}" style="margin-top:0"><i class="ti ti-${d.url?'target-arrow':'alert-circle'}"></i><div>
         ${d.url ? `Vai abrir ${esc(d.como)}.`
                 : 'Este canal ainda não tem endereço cadastrado, então não sei para onde te levar.'}
       </div></div>`}

  <div class="card tw" style="margin-bottom:12px"><div class="bd">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <div class="oi" style="background:${pi.cor}1A;color:${pi.cor};width:38px;height:38px;border-radius:10px;
        display:flex;align-items:center;justify-content:center"><i class="ti ${pi.ic}"></i></div>
      <div style="flex:1;min-width:220px">
        <b>${esc(c.nome)}</b> <span class="tt">· ${esc(c.plataforma)} · ${esc(a.n)}</span>
        ${d.mobile ? '' : `<span class="st ${d.exato?'s-ok':'s-wn'}">${d.exato?'endereço exato':'aproximado'}</span>
        <div class="tt mono" style="word-break:break-all">${esc(urlCurta)}</div>`}
      </div>
    </div>
    ${a.dica ? `<div class="tt" style="margin-top:8px"><i class="ti ti-bulb"></i> ${esc(a.dica)}</div>` : ''}
    ${!d.mobile && !d.exato && d.plat.dica && !a.destino ? `<div class="tt" style="margin-top:6px"><i class="ti ti-info-circle"></i> ${esc(d.plat.dica)}</div>` : ''}
  </div></div>

  ${vaiPreencher ? `
  <div class="card tw" style="margin-bottom:12px"><div class="bd">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <i class="ti ti-video" style="font-size:20px"></i>
      <div style="flex:1;min-width:220px"><b>Arquivo do vídeo</b>
        <div class="tt">${POST.video ? esc(POST.video.nome) + ' · ' + qtd(POST.video.tamanho/1048576,1) + ' MB'
          : 'Escolha e o programa anexa sozinho, deixando só o clique de publicar para você.'}</div></div>
      <button class="btn sm ${POST.video?'gh':'bl'}" onclick="postEscolherVideo()">
        <i class="ti ti-folder-open"></i>${POST.video?'Trocar':'Escolher o vídeo'}</button>
    </div>
  </div></div>` : (a.upload && !noApp && d.plat.pid ? `
  <div class="al aw" style="margin-bottom:12px"><i class="ti ti-info-circle"></i><div>
    Pelo navegador, o botão abre a página no lugar certo. Anexar o vídeo e escrever a legenda
    sozinho só acontece no <b>aplicativo do Windows</b>.</div></div>` : '')}

  ${roteiros.length?`<div class="fg"><label>Aproveitar a legenda de um vídeo já montado</label>
    <select onchange="postPuxarRoteiro(this.value)">
      <option value="">— escrever na mão —</option>
      ${roteiros.map(r=>`<option value="${r.id}">${esc(r.titulo)}</option>`).join('')}
    </select></div>`:''}

  ${cs.includes('titulo')?`<div class="fg"><label>Título</label>
    <input id="pt-tit" value="${esc(POST.titulo)}" oninput="postCampo('titulo',this.value)"></div>`:''}
  ${cs.includes('legenda')?`<div class="fg"><label>${a.k==='thread'?'Texto da thread (uma linha em branco entre as partes)':'Texto / legenda'}</label>
    <textarea id="pt-leg" rows="6" oninput="postCampo('legenda',this.value)">${esc(POST.legenda)}</textarea></div>`:''}
  ${cs.includes('link')?`<div class="fg"><label>Link (afiliado, produto ou vídeo)</label>
    <input id="pt-link" value="${esc(POST.link)}" placeholder="https://" oninput="postCampo('link',this.value)"></div>`:''}
  ${a.limite?`<div class="hint" id="pt-conta" data-lim="${a.limite}"></div>`:''}
  ${cs.includes('legenda')||cs.includes('link')?`<div class="hint">Se for link de afiliado, não esqueça o aviso de publicidade.</div>`:''}

  ${POST.resultado?`<div class="al ${POST.resultado.tudo?'ag':'aw'}"><i class="ti ti-${POST.resultado.tudo?'check':'alert-triangle'}"></i>
    <div>${esc(POST.resultado.recado)}</div></div>`:''}`;

  modal(a.n + ' — ' + c.nome, a.ic, b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     ${d.mobile ? '' : `<button class="btn gh" onclick="canalForm(${c.id})"><i class="ti ti-edit"></i>Ajustar o endereço</button>`}
     ${cs.length?`<button class="btn bl" onclick="postCopiar()"><i class="ti ti-copy"></i>Copiar o texto</button>`:''}
     ${d.mobile ? ''
       : vaiPreencher
       ? `<button class="btn gn" onclick="postIr(true)"><i class="ti ti-wand"></i>Abrir já preenchido</button>`
       : `<button class="btn gn" onclick="postIr(false)"><i class="ti ${a.ic}"></i>${esc(a.n)}</button>`}`);
  postConta();
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

async function postCopiar(silencio){
  const t = postTexto();
  if(!t){ if(!silencio) toast('Não há texto para copiar.','aw'); return false; }
  try{ await navigator.clipboard.writeText(t); if(!silencio) toast('Texto copiado.','ag'); return true; }
  catch(e){ if(!silencio) toast('Não consegui copiar.','aw'); return false; }
}

/* o clique principal */
async function postIr(preencher){
  const c = await dbGet('canais', POST.canalId);
  const a = redeAcao(c, POST.acao);
  const d = acaoDestino(c, a, postTexto());
  if(!d.url){
    toast('Cadastre o endereço do canal para eu saber para onde ir.','aw');
    canalForm(POST.canalId);
    return;
  }
  const app = (typeof APP === 'function') ? APP() : null;

  /* fora do aplicativo, sem vídeo escolhido, ou ação que não é envio de
     vídeo: abre a página certa e deixa o texto copiado */
  if(!preencher || !app || !app.pubPublicar || !POST.video || !d.plat.pid || !a.upload || a.destino){
    abrirFora(d.url);
    const textoNaUrl = !!(a.destino && /[?&]text=/.test(d.url) && postTexto());
    const copiou = await postCopiar(true);
    POST.resultado = { tudo:false,
      recado: textoNaUrl ? 'Abri a página já com o texto escrito — confira e publique.'
                         : 'Abri a página' + (copiou ? ' e copiei o texto — é só colar lá' : '') + '.' };
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

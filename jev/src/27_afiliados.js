/* =========================================================================
   AFILIADOS, GERAÇÃO DE VÍDEO E PUBLICAÇÃO EM TODAS AS PLATAFORMAS_VIDEO
   -------------------------------------------------------------------------
   Três coisas ligadas entre si:
     1. os produtos que você divulga como afiliado, com link e comissão;
     2. o pacote de produção do vídeo, montado a partir desses produtos —
        gancho, cenas, textos de tela, legenda e hashtags;
     3. a central que adapta esse texto para cada plataforma, respeitando o
        limite de caracteres de cada uma, e controla onde já foi publicado.

   Os dados de requisitos e limites foram levantados nas páginas oficiais
   das plataformas em agosto de 2026. Regras mudam: confira antes de contar
   com um número para tomar decisão. Os valores de ganho por mil views são
   estimativas de mercado — nenhuma plataforma publica isso oficialmente.
   ========================================================================= */

/* ---------------------------------------------------------------- plataformas
   ganho: faixa estimada em R$ por mil visualizações no Brasil (null = não paga)
   tit/leg: limite de caracteres · hashMax/hashRec: hashtags                  */
const PLATAFORMAS_VIDEO = [
  { id:'yt', nome:'YouTube', tipo:'Vídeo longo', ic:'ti-brand-youtube', cor:'#C0392B', br:true,
    req:'500 inscritos + 3.000 h de exibição (fundos de fãs) · 1.000 inscritos + 4.000 h para anúncios',
    paga:'Divisão da receita de anúncios (55% para o criador), Premium, membros e Super Thanks',
    ganho:[1,50], formato:'16:9 (aceita vertical)', durMin:35, durMax:43200,
    tit:100, titVis:70, leg:5000, legVis:157, hashMax:15, hashRec:4,
    url:'https://studio.youtube.com', ajuda:'https://support.google.com/youtube/answer/72851?hl=pt-BR' },

  { id:'yts', nome:'YouTube Shorts', tipo:'Vídeo curto', ic:'ti-brand-youtube', cor:'#E74C3C', br:true,
    req:'500 inscritos + 3 milhões de views de Shorts em 90 dias · 1.000 + 10 milhões para anúncios',
    paga:'Fatia do bolo de anúncios do feed de Shorts (45% do que sobra) e Super Thanks',
    ganho:[0.3,2], formato:'9:16 · 1080x1920', durMin:5, durMax:180,
    tit:100, titVis:40, leg:5000, legVis:100, hashMax:15, hashRec:4,
    url:'https://studio.youtube.com', ajuda:'https://support.google.com/youtube/answer/72851?hl=pt-BR' },

  { id:'tt', nome:'TikTok', tipo:'Vídeo curto', ic:'ti-brand-tiktok', cor:'#111111', br:true,
    req:'10.000 seguidores + 100.000 views em 30 dias · 18 anos · Brasil está na lista oficial',
    paga:'Fundo de criadores por views qualificadas — só contam vídeos acima de 1 minuto',
    ganho:[2,7.5], formato:'9:16 · 1080x1920', durMin:60, durMax:3600,
    tit:null, leg:4000, legVis:100, hashMax:30, hashRec:4,
    url:'https://www.tiktok.com/tiktokstudio/upload',
    ajuda:'https://www.tiktok.com/creator-academy/article/creator-rewards-program/?lang=pt-BR',
    nota:'Para monetizar, o vídeo precisa passar de 1 minuto.' },

  { id:'ig', nome:'Instagram Reels', tipo:'Vídeo curto', ic:'ti-brand-instagram', cor:'#C13584', br:true,
    req:'Bônus apenas por convite — não existe monetização aberta por visualização',
    paga:'Bônus por convite, assinaturas, selo (gorjeta) e publicidade com marcas',
    ganho:null, formato:'9:16 · 1080x1920', durMin:5, durMax:900,
    tit:null, leg:2200, legVis:125, hashMax:30, hashRec:5,
    url:'https://www.instagram.com',
    nota:'Não paga por view no Brasil. Vale como vitrine e para vender por afiliado.' },

  { id:'fb', nome:'Facebook', tipo:'Reels e vídeo', ic:'ti-brand-facebook', cor:'#1877F2', br:true,
    req:'Programa unificado de monetização, em abertura gradual — perfil profissional dentro das políticas',
    paga:'Divisão de receita por desempenho — vale para vídeo, Reels, foto e texto. Estrelas e assinaturas',
    ganho:[0.25,20], formato:'9:16 (Reels) ou 16:9', durMin:5, durMax:14400,
    tit:null, leg:2200, legVis:125, hashMax:30, hashRec:3,
    url:'https://business.facebook.com/latest/reels_composer',
    ajuda:'https://www.facebook.com/business/help/1049081556813520',
    nota:'Única que paga também por foto e texto. Vídeo de 3+ min rende bem mais que Reels.' },

  { id:'kwai', nome:'Kwai', tipo:'Vídeo curto', ic:'ti-video', cor:'#FF6B00', br:true,
    req:'Cerca de 1.000 seguidores (a plataforma não publica os requisitos oficialmente)',
    paga:'Fundo por visualização, tarefas pagas, presentes na live. Saque por Pix, valor mínimo baixo',
    ganho:[0.5,3], formato:'9:16', durMin:15, durMax:300,
    tit:null, leg:1000, legVis:80, hashMax:10, hashRec:4,
    url:'https://www.kwai.com/creators',
    nota:'Barreira de entrada baixa e saque por Pix, mas o envio é pelo aplicativo do celular.' },

  { id:'snap', nome:'Snapchat Spotlight', tipo:'Vídeo curto', ic:'ti-brand-snapchat', cor:'#F1C40F', br:true,
    req:'50.000 seguidores + 15.000 h de exibição em 28 dias, sendo 3.000 h de Spotlight · ser Snap Star',
    paga:'Divisão da receita dos anúncios nas Stories e no Spotlight. Saque a partir de US$ 100',
    ganho:null, formato:'9:16 tela cheia', durMin:30, durMax:180,
    tit:null, leg:250, legVis:80, hashMax:5, hashRec:2,
    url:'https://profile.snapchat.com',
    ajuda:'https://help.snapchat.com/hc/en-us/articles/14669003687444',
    nota:'Precisa de no mínimo 30 segundos para monetizar. Barreira alta.' },

  { id:'x', nome:'X (Twitter)', tipo:'Vídeo e texto', ic:'ti-brand-x', cor:'#0F1419', br:true,
    req:'Assinatura X Premium ativa + 500 seguidores + cerca de 5 milhões de impressões em 3 meses',
    paga:'Divisão de receita baseada no engajamento de usuários Premium, não em views brutas',
    ganho:null, formato:'vertical ou horizontal', durMin:5, durMax:8400,
    tit:null, leg:25000, legVis:280, hashMax:5, hashRec:2,
    url:'https://x.com/compose/post',
    nota:'Você paga o Premium antes de ganhar, e o modelo premia audiência Premium — rara no Brasil.' },

  { id:'rum', nome:'Rumble', tipo:'Vídeo longo', ic:'ti-player-play', cor:'#85C742', br:false,
    req:'100 seguidores + 1 h transmitida + Rumble Premium — mas o BRASIL NÃO ESTÁ na lista de países pagos',
    paga:'Parcela do lucro das assinaturas Premium por minutos assistidos',
    ganho:null, formato:'16:9 até 4K', durMin:5, durMax:43200,
    tit:100, leg:5000, hashMax:10, hashRec:5,
    url:'https://rumble.com/upload.php',
    nota:'Aceita seu envio do Brasil, mas não paga aqui. Só vale como vitrine.' },

  { id:'dm', nome:'Dailymotion', tipo:'Vídeo longo', ic:'ti-player-play', cor:'#0066DC', br:true,
    req:'Ser Creator e acumular 1.000 visualizações no perfil',
    paga:'Divisão da receita de anúncios. Pagamento mensal ao chegar em US$ 100',
    ganho:null, formato:'16:9, 9:16 ou 4:3', durMin:5, durMax:7200,
    tit:255, leg:3000, hashMax:10, hashRec:6,
    url:'https://www.dailymotion.com/upload',
    nota:'Barreira baixa, mas o tráfego orgânico é pequeno.' },

  { id:'pin', nome:'Pinterest', tipo:'Vitrine', ic:'ti-brand-pinterest', cor:'#E60023', br:true,
    req:'Não monetiza por visualização — o programa de recompensas foi encerrado',
    paga:'Nada de forma nativa. O valor está no tráfego que ele manda para os seus links',
    ganho:null, formato:'9:16 · 1000x1500', durMin:4, durMax:900,
    tit:100, titVis:40, leg:500, legVis:50, hashMax:5, hashRec:3,
    url:'https://www.pinterest.com/pin-creation-tool/',
    nota:'Aceita link de afiliado direto. Ótimo para levar gente para a loja.' },

  { id:'li', nome:'LinkedIn', tipo:'Vídeo e texto', ic:'ti-brand-linkedin', cor:'#0A66C2', br:true,
    req:'Programa de anúncios em vídeo apenas por curadoria — não há monetização aberta',
    paga:'Nada por view. A renda vem de publicidade, consultoria e captação de clientes',
    ganho:null, formato:'9:16 ou 16:9', durMin:3, durMax:900,
    tit:70, leg:3000, legVis:210, hashMax:10, hashRec:4,
    url:'https://www.linkedin.com/feed/',
    nota:'Faz sentido para obra, imóveis e serviços — público de decisão, não de entretenimento.' },

  { id:'tw', nome:'Twitch', tipo:'Ao vivo', ic:'ti-brand-twitch', cor:'#9146FF', br:true,
    req:'Afiliado: 50 seguidores + 8 h transmitidas + 7 dias de live + média de 3 espectadores em 30 dias',
    paga:'Assinaturas (metade para você), Bits, anúncios e gorjetas — por audiência ao vivo, não por view',
    ganho:null, formato:'16:9 ao vivo', durMin:600, durMax:86400,
    tit:140, leg:300, hashMax:10, hashRec:5,
    url:'https://dashboard.twitch.tv',
    nota:'Barreira de entrada baixíssima, mas exige transmitir ao vivo com regularidade.' }
];

/* ---------------------------------------------------------------- afiliados
   Catálogo de programas para o cadastro sair mais rápido. A comissão é a
   faixa típica; quem manda é o painel de cada plataforma.                   */
const PROG_CATALOGO = [
  { n:'Hotmart',        t:'Infoproduto',   com:[20,80], prazo:'cartão ~30 dias',            url:'https://hotmart.com/pt-br/afiliados' },
  { n:'Kiwify',         t:'Infoproduto',   com:[40,70], prazo:'Pix 7 dias · cartão 15 dias', url:'https://dashboard.kiwify.com.br/' },
  { n:'Monetizze',      t:'Infoproduto',   com:[20,70], prazo:'Pix D+2 · cartão D+30',       url:'https://www.monetizze.com.br/afiliados/' },
  { n:'Eduzz',          t:'Infoproduto',   com:[20,70], prazo:'saque mínimo R$ 100',         url:'https://www.eduzz.com/' },
  { n:'Braip',          t:'Digital/Físico',com:[30,80], prazo:'Pix 24 h · cartão 30 dias',   url:'https://braip.com' },
  { n:'Perfect Pay',    t:'Infoproduto',   com:[20,70], prazo:'após a garantia de 30 dias',  url:'https://www.perfectpay.com.br/' },
  { n:'Ticto',          t:'Infoproduto',   com:[20,70], prazo:'varia com o meio de pagamento', url:'https://www.ticto.com.br/' },
  { n:'Amazon',         t:'Físico',        com:[7,13],  prazo:'60 dias após o mês da venda', url:'https://associados.amazon.com.br/' },
  { n:'Shopee',         t:'Físico',        com:[4,30],  prazo:'dia 10 (PF) · dia 30 (PJ)',   url:'https://affiliate.shopee.com.br/' },
  { n:'Mercado Livre',  t:'Físico',        com:[4,16],  prazo:'até 60 dias no Mercado Pago', url:'https://www.mercadolivre.com.br/l/registro-afiliados' },
  { n:'Magalu',         t:'Físico',        com:[2,12],  prazo:'dias 4 e 19 · mínimo R$ 50',  url:'https://www.parceiromagalu.com.br/' },
  { n:'AliExpress',     t:'Físico',        com:[3,9],   prazo:'saque a partir de ~US$ 16',   url:'https://portals.aliexpress.com/' },
  { n:'Shein',          t:'Físico',        com:[8,20],  prazo:'mensal',                      url:'https://br.shein.com/' },
  { n:'Temu',           t:'Físico',        com:[5,20],  prazo:'após a janela de devolução',  url:'https://www.temu.com/br/affiliate_influencer_program.html' },
  { n:'TikTok Shop',    t:'Físico',        com:[10,30], prazo:'após entrega + devolução',    url:'https://seller-br.tiktok.com/' },
  { n:'Kwai Shop',      t:'Físico',        com:[5,20],  prazo:'não publicado',               url:'https://seller-shop.kwai.com/pages/home' },
  { n:'Awin',           t:'Rede',          com:[2,15],  prazo:'dias 1 e 15',                 url:'https://www.awin.com/us/publishers/content-creator-influencer' },
  { n:'Rakuten',        t:'Rede',          com:[3,13],  prazo:'PF no início do mês',         url:'https://rakutenadvertising.com/' },
  { n:'Netshoes',       t:'Físico',        com:[5,13],  prazo:'pela Rakuten',                url:'https://www.netshoes.com.br/sub/afiliados' },
  { n:'Centauro',       t:'Físico',        com:[3,10],  prazo:'pela Awin',                   url:'https://ui.awin.com/merchant-profile/17806' },
  { n:'Casas Bahia',    t:'Físico',        com:[2,3],   prazo:'pela Awin · só CNPJ',         url:'https://www.casasbahia.com.br/l/afiliados.aspx' },
  { n:'Americanas',     t:'Físico',        com:[1,8],   prazo:'não publicado',               url:'https://www.americanas.com.br/especial/afiliados' },
  { n:'Gumroad',        t:'Infoproduto',   com:[20,50], prazo:'toda sexta · mínimo US$ 10',  url:'https://gumroad.com/' },
  { n:'Payhip',         t:'Infoproduto',   com:[20,50], prazo:'o vendedor paga na mão',      url:'https://payhip.com/partner-program' },
  { n:'Shopify',        t:'Serviço',       com:[0,0],   prazo:'até US$ 150 por indicação',   url:'https://www.shopify.com/br/afiliados' },
  { n:'Nuvemshop',      t:'Serviço',       com:[75,100],prazo:'1ª e 2ª mensalidade',         url:'https://www.nuvemshop.com.br/parceiros' },
  { n:'Loja Integrada', t:'Serviço',       com:[35,35], prazo:'até 30 dias · só CNPJ',       url:'https://lojaintegrada.com.br/seja-um-parceiro/' },
  { n:'Cartpanda',      t:'Serviço',       com:[0,0],   prazo:'2x a mensalidade + 0,5%',     url:'https://cartpanda.com.br/recursos/afiliados' },
  { n:'Produto próprio',t:'Próprio',       com:[100,100],prazo:'na hora',                    url:'' }
];

const TIPOS_PROG = ['Infoproduto','Físico','Digital/Físico','Serviço','Rede','Próprio'];

function progCat(nome){ return PROG_CATALOGO.find(p=>p.n===nome) || null; }
function plat(id){ return PLATAFORMAS_VIDEO.find(p=>p.id===id) || null; }
function platGanho(p){
  if(!p.ganho) return '—';
  return 'R$ ' + qtd(p.ganho[0],2).replace(',00','') + ' a ' + qtd(p.ganho[1],2).replace(',00','');
}

/* =========================================================================
   ABA 1 — AFILIADOS: programas, produtos e links
   ========================================================================= */
async function midTabAfiliados(){
  const body = document.getElementById('mid-body');
  const progs = await dbGetAll('programas');
  const pubs  = await dbGetAll('publicacoes');
  const ativos = progs.filter(p=>p.ativo!==false);
  const vendas = progs.reduce((s,p)=>s+num(p.vendas),0);
  const ganho  = progs.reduce((s,p)=>s+num(p.ganhoTotal),0);

  /* O CANAL VEM PRIMEIRO NESTA TELA.

     Ele pediu o canal de promoções "em afiliados". Se o canal nascesse
     embaixo do aviso e dos quatro quadradinhos, ele teria que rolar a tela
     para achar a coisa que veio buscar — e essa foi exatamente a reclamação
     dele na tela anterior. */
  let h = await ofSecaoHTML() + await mlSecaoHTML() + await linkSecaoHTML() + await zapSecaoHTML();

  h += `<div class="al ai"><i class="ti ti-link"></i><div>
    Cadastre aqui cada produto que você divulga como afiliado, com o <b>link rastreável</b> e a comissão.
    Depois, na aba <b>Gerar vídeo</b>, você escolhe os produtos e o sistema monta o roteiro em cima deles.</div></div>

  <div class="kg" style="margin-bottom:14px">
    <div class="kc br"><div class="lb"><i class="ti ti-link"></i>Produtos</div><div class="vl">${ativos.length}</div>
      <div class="sb">${progs.length-ativos.length} pausado(s)</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-building-store"></i>Plataformas</div>
      <div class="vl">${new Set(ativos.map(p=>p.plataforma)).size}</div>
      <div class="sb">programas diferentes</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-shopping-cart"></i>Vendas</div><div class="vl">${vendas}</div>
      <div class="sb">atribuídas aos seus vídeos</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-cash"></i>Comissão ganha</div><div class="vl">${moedaK(ganho)}</div>
      <div class="sb">${vendas?moeda(ganho/vendas)+' por venda':'—'}</div></div>
  </div>

  ` + afilCodigosHTML() + `

  <div class="card"><div class="hd"><i class="ti ti-link"></i>Meus produtos de afiliado<span class="sp"></span>
    <button class="btn sm" onclick="progForm()"><i class="ti ti-plus"></i>Novo produto</button></div><div class="bd">`;

  if(!progs.length){
    h += `<div class="empty"><i class="ti ti-link"></i><b>Nenhum produto cadastrado</b>
      <p>Comece pelo que você já divulga. Se ainda não é afiliado de nada, o quadro abaixo mostra
      onde se cadastrar — os programas com comissão maior são os de infoproduto; os que vendem
      mais fácil são os marketplaces de produto físico.</p>
      <button class="btn gn" onclick="progForm()"><i class="ti ti-plus"></i>Cadastrar o primeiro</button></div>`;
  }else{
    h += `<table><thead><tr><th>Produto</th><th>Plataforma</th><th class="c">Tipo</th>
      <th class="r">Comissão</th><th class="r">Preço</th><th class="r">Ganho/venda</th>
      <th class="c">Vendas</th><th class="c no-print"></th></tr></thead><tbody>`;
    progs.sort((a,b)=>String(a.produto||'').localeCompare(String(b.produto||''))).forEach(p=>{
      const porVenda = num(p.preco)*num(p.comissao)/100;
      h += `<tr style="${p.ativo===false?'opacity:.5':''}">
        <td><b>${esc(p.produto)}</b>${p.url?`<div class="tt mono" style="max-width:280px;overflow:hidden;text-overflow:ellipsis">${esc(p.url)}</div>`:''}</td>
        <td>${esc(p.plataforma)}</td>
        <td class="c"><span class="st s-nt">${esc(p.tipo||'—')}</span></td>
        <td class="r n">${qtd(p.comissao,1)}%</td>
        <td class="r n">${p.preco?moeda(p.preco):'—'}</td>
        <td class="r n"><b>${porVenda?moeda(porVenda):'—'}</b></td>
        <td class="c n">${num(p.vendas)||0}</td>
        <td class="c no-print nowrap">
          ${p.url?`<button class="ib bl" title="Copiar link" onclick="progCopiar(${p.id})"><i class="ti ti-copy"></i></button>`:''}
          <button class="ib" title="Editar" onclick="progForm(${p.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" title="Excluir" onclick="progDel(${p.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table>`;
  }
  h += `</div></div>`;

  /* quadro de onde se cadastrar */
  h += `<div class="card tw"><div class="hd"><i class="ti ti-building-store"></i>Onde se cadastrar como afiliado</div><div class="bd">
    <div class="tt" style="margin-bottom:10px">As comissões são faixas típicas — quem define é o produtor ou a categoria do
      produto. Confira sempre no painel da plataforma antes de contar com o número.</div>
    <table><thead><tr><th>Programa</th><th class="c">Vende</th><th class="r">Comissão típica</th>
      <th>Quando o dinheiro cai</th><th class="c no-print">Cadastro</th></tr></thead><tbody>
    ${PROG_CATALOGO.filter(c=>c.url).map(c=>`<tr>
      <td><b>${esc(c.n)}</b></td><td class="c"><span class="st s-nt">${esc(c.t)}</span></td>
      <td class="r n">${c.com[0]===c.com[1] ? (c.com[0]?qtd(c.com[0],0)+'%':'—')
                                            : qtd(c.com[0],0)+'% a '+qtd(c.com[1],0)+'%'}</td>
      <td class="tt">${esc(c.prazo)}</td>
      <td class="c no-print"><button class="btn xs gh" onclick="abrirFora('${c.url}')">
        <i class="ti ti-external-link"></i>Abrir</button></td></tr>`).join('')}
    </tbody></table></div></div>`;

  body.innerHTML = h;
}

function abrirFora(url){ if(url) window.open(url,'_blank'); }

async function progForm(id){
  const p = id ? await dbGet('programas',id) : null;
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Produto <span class="rq">*</span></label>
        <input id="pg-prod" value="${esc(p?p.produto:'')}" placeholder="Nome do produto como você fala dele no vídeo"></div>
      <div class="fg"><label>Plataforma <span class="rq">*</span></label>
        <input id="pg-plat" list="pg-plats" value="${esc(p?p.plataforma:'')}" onchange="progSugerir()" placeholder="Hotmart, Amazon...">
        <datalist id="pg-plats">${PROG_CATALOGO.map(c=>`<option value="${esc(c.n)}">`).join('')}</datalist></div>
    </div>
    <div class="fg"><label>Link de afiliado</label>
      <input id="pg-url" value="${esc(p?p.url:'')}" placeholder="https://... — o link rastreável que a plataforma gerou para você">
      <div class="hint">É este link que entra na legenda de cada plataforma, na hora de publicar.</div></div>
    <div class="fr4">
      <div class="fg"><label>Tipo</label><select id="pg-tipo">
        ${TIPOS_PROG.map(t=>`<option ${p&&p.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="fg"><label>Comissão (%)</label><input id="pg-com" type="number" step="0.1" value="${p?p.comissao:''}" oninput="progPreview()"></div>
      <div class="fg"><label>Preço do produto (R$)</label><input id="pg-preco" type="number" step="0.01" value="${p?p.preco:''}" oninput="progPreview()"></div>
      <div class="fg"><label>Ganho por venda</label><input id="pg-ganho" readonly value="—"></div>
    </div>
    <div class="fr3">
      <div class="fg"><label>Nicho / público</label><input id="pg-nicho" value="${esc(p?p.nicho:'')}" placeholder="Obra, casa, ferramentas, finanças..."></div>
      <div class="fg"><label>Vendas já feitas</label><input id="pg-vendas" type="number" value="${p?(p.vendas||0):0}"></div>
      <div class="fg"><label>Comissão acumulada (R$)</label><input id="pg-gt" type="number" step="0.01" value="${p?(p.ganhoTotal||0):0}"></div>
    </div>
    <div class="fg"><label>O que este produto resolve</label>
      <textarea id="pg-benef" placeholder="Em uma frase: qual problema ele resolve para quem assiste. É daqui que sai o roteiro do vídeo.">${esc(p?p.beneficio:'')}</textarea></div>
    <label style="display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer">
      <input type="checkbox" id="pg-ativo" ${p&&p.ativo===false?'':'checked'} style="width:16px;height:16px">
      Ativo — aparece na hora de montar um vídeo</label>
    <div id="pg-err"></div>`;
  modal(id?'Editar produto':'Novo produto de afiliado','ti-link',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="progSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
  progPreview();
}
function progSugerir(){
  const c = progCat(val('pg-plat'));
  if(!c) return;
  if(!val('pg-com') && c.com[0]) setVal('pg-com', c.com[0]);
  const sel = document.getElementById('pg-tipo');
  if(sel && TIPOS_PROG.includes(c.t)) sel.value = c.t;
  progPreview();
  toast(`${c.n}: comissão típica ${c.com[0]}%–${c.com[1]}% · ${c.prazo}.`);
}
function progPreview(){
  const g = num(val('pg-preco'))*num(val('pg-com'))/100;
  setVal('pg-ganho', g? moeda(g) : '—');
}
async function progSave(id){
  const produto = val('pg-prod'), plataforma = val('pg-plat');
  if(!produto || !plataforma){
    document.getElementById('pg-err').innerHTML =
      `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o produto e a plataforma.</div>`; return;
  }
  const d = {produto, plataforma, url:val('pg-url'), tipo:val('pg-tipo'),
             comissao:num(val('pg-com')), preco:num(val('pg-preco')), nicho:val('pg-nicho'),
             vendas:num(val('pg-vendas')), ganhoTotal:num(val('pg-gt')),
             beneficio:val('pg-benef'), ativo:document.getElementById('pg-ativo').checked};
  if(id){ const o = await dbGet('programas',id); await dbPut('programas',{...o,...d}); }
  else await dbAdd('programas',d);
  closeModal('mk-form'); toast('Produto salvo.'); midiaRender();
}
function progDel(id){
  confirmar('Excluir produto','O produto sai da lista. Os vídeos já criados não são afetados.',
    async()=>{ await dbDel('programas',id); toast('Removido.','aw'); midiaRender(); });
}
async function progCopiar(id){
  const p = await dbGet('programas',id);
  if(!p || !p.url) return;
  try{ await navigator.clipboard.writeText(p.url); toast('Link copiado.','ag'); }
  catch(e){ toast('Copie manualmente: '+p.url,'aw'); }
}

/* =========================================================================
   ABA 2 — GERAR VÍDEO: o pacote de produção
   ========================================================================= */
const ANGULOS = {
  'Review honesto':   {ic:'ti-star', desc:'Você usou e conta o que achou — o que é bom e o que não é'},
  'Comparativo':      {ic:'ti-arrows-left-right', desc:'Este contra o que a pessoa já usa hoje'},
  'Antes e depois':   {ic:'ti-transform', desc:'Mostra o resultado antes de explicar o produto'},
  'Lista rápida':     {ic:'ti-list-numbers', desc:'Três a cinco itens, um atrás do outro'},
  'Erro comum':       {ic:'ti-alert-triangle', desc:'Começa pelo erro que quase todo mundo comete'},
  'Passo a passo':    {ic:'ti-checklist', desc:'Ensina a fazer, e o produto entra no meio do caminho'}
};

const GANCHOS = {
  'Review honesto': [
    '{p}: comprei pra testar de verdade. E tem um detalhe que ninguém conta.',
    '{p}: testei por 30 dias. Se você tá pensando em comprar, assiste até o fim.',
    'Isso aqui é {p}. Em {d} segundos você decide se vale o seu dinheiro.',
    'Ninguém me avisou disso antes de eu comprar {p}.'
  ],
  'Comparativo': [
    '{p} ou o de sempre? A diferença aparece já na primeira semana.',
    'Antes de gastar com {p}, olha essa comparação lado a lado.',
    'Paguei mais caro em {p}. Vou te mostrar se compensou.',
    'Os dois fazem a mesma coisa. Só que um deles economiza o seu tempo.'
  ],
  'Antes e depois': [
    'Era assim. Ficou assim. E custou menos do que você imagina.',
    'Olha o antes. Agora olha o depois. A diferença foi {p}.',
    'Esse resultado aqui levou um fim de semana. Só isso.',
    'Não precisa refazer tudo pra mudar isso aqui.'
  ],
  'Lista rápida': [
    '{n} coisas que mudaram depois que eu comecei a usar {p}.',
    'Se você trabalha com isso, esses {n} itens deviam estar na sua lista.',
    '{n} itens que eu queria ter conhecido antes.',
    'Anota esses {n}. O terceiro é o que mais gente erra.'
  ],
  'Erro comum': [
    'O erro que quase todo mundo comete — e como {p} resolve isso.',
    'Para de fazer isso. Sério. Tem um jeito muito mais simples.',
    'Isso aqui custa caro e quase ninguém percebe a tempo.',
    'Se você faz isso, você está jogando dinheiro fora.'
  ],
  'Passo a passo': [
    'Como resolver isso em {d} segundos, na prática.',
    'Passo a passo do jeito que eu faço aqui. Sem enrolação.',
    'Vou te mostrar do começo ao fim. Salva esse vídeo.',
    'Faz assim que funciona — e no fim eu digo o que eu uso.'
  ]
};

const CTAS = [
  'O link está aqui embaixo. Se ficou com dúvida, comenta que eu respondo.',
  'Deixei o link na descrição. Qualquer dúvida, é só chamar nos comentários.',
  'Link na descrição. Salva o vídeo pra não perder quando precisar.',
  'Tá tudo no link aqui embaixo. Segue o perfil que vem mais coisa dessas.',
  'Se isso te ajudou, compartilha com quem também precisa. Link na descrição.'
];

const HASH_BASE = {
  'Infoproduto':['#curso','#aprender','#dicas','#rendaextra'],
  'Físico':['#achadinhos','#vale a pena','#dica','#compras'],
  'Digital/Físico':['#dica','#novidade','#vale a pena'],
  'Serviço':['#negocios','#empreender','#dica'],
  'Rede':['#dica','#economia'],
  'Próprio':['#trabalho','#servico']
};

let GER = null;   // pacote sendo montado na tela

async function midTabGerar(){
  const body = document.getElementById('mid-body');
  const progs = (await dbGetAll('programas')).filter(p=>p.ativo!==false);
  const roteiros = (await dbGetAll('roteiros')).sort((a,b)=>Number(b.id)-Number(a.id));

  if(!progs.length){
    /* Sem produto de afiliado cadastrado não dá para montar um roteiro NOVO aqui.
       Mas quem chegou desta tela vindo de um produto garimpado já tem vídeo para
       assistir — e mandar essa pessoa cadastrar produto seria um beco sem saída. */
    body.innerHTML =
      (EST.resultado ? estResultadoHTML(EST.resultado) : '') +
      `<div class="empty"><i class="ti ti-wand"></i><b>Cadastre um produto para montar um roteiro novo</b>
      <p>O roteiro é montado em cima dos produtos que você divulga. Cadastre um
      na aba <b>Afiliados</b> — ou use o <b>Garimpo</b>, que já manda os produtos
      para a aba <b>Vídeos e pauta</b> com o roteiro pronto.</p>
      <div class="brow" style="justify-content:center">
        <button class="btn gn" onclick="midStab('afil')"><i class="ti ti-link"></i>Ir para Afiliados</button>
        <button class="btn" onclick="midStab('gar')"><i class="ti ti-pick"></i>Ir para o Garimpo</button>
      </div></div>`;
    return;
  }

  if(!GER) GER = {produtos:[], angulo:'Review honesto', duracao:60, formato:'9:16 (vertical)',
                  plataformas:['yts','tt','ig','fb'], variante:0, pacote:null};

  let h = `<div class="card"><div class="hd"><i class="ti ti-wand"></i>Montar um vídeo</div><div class="bd">
    <div class="sh" style="margin-top:0"><i class="ti ti-link"></i>1. Quais produtos entram no vídeo</div>
    <div class="chips" style="margin-bottom:12px">
      ${progs.map(p=>`<span class="chip ${GER.produtos.includes(p.id)?'on':''}" onclick="gerTogglarProduto(${p.id})">
        ${esc(p.produto)} <span class="tt">· ${esc(p.plataforma)}</span></span>`).join('')}
    </div>

    <div class="sh"><i class="ti ti-bulb"></i>2. Que tipo de vídeo</div>
    <div class="chips" style="margin-bottom:12px">
      ${Object.entries(ANGULOS).map(([k,v])=>`<span class="chip ${GER.angulo===k?'on':''}" onclick="gerCampo('angulo','${k}')">
        <i class="ti ${v.ic}"></i> ${k}</span>`).join('')}
    </div>
    <div class="tt" style="margin-bottom:14px">${esc(ANGULOS[GER.angulo].desc)}.</div>

    <div class="fr3">
      <div class="fg"><label>Duração do vídeo (segundos)</label>
        <input id="ge-dur" type="number" min="15" max="1800" value="${GER.duracao}" onchange="gerCampo('duracao',num(this.value))">
        <div class="hint">Para monetizar no TikTok, precisa passar de 60.</div></div>
      <div class="fg"><label>Formato</label><select id="ge-fmt" onchange="gerCampo('formato',this.value)">
        ${['9:16 (vertical)','16:9 (horizontal)','1:1 (quadrado)'].map(f=>`<option ${GER.formato===f?'selected':''}>${f}</option>`).join('')}</select></div>
      <div class="fg"><label>&nbsp;</label>
        <button class="btn gn blk" onclick="gerMontar()"><i class="ti ti-wand"></i>Montar o vídeo</button></div>
    </div>

    <div class="sh"><i class="ti ti-share"></i>3. Onde vai ser publicado</div>
    <div class="tt" style="margin-bottom:8px">O texto é adaptado ao limite de cada uma. As que não pagam por
      visualização estão marcadas — ainda assim valem, porque é por elas que sai a venda de afiliado.</div>
    <div class="chips">
      ${PLATAFORMAS_VIDEO.map(p=>`<span class="chip ${GER.plataformas.includes(p.id)?'on':''}" onclick="gerTogglarPlat('${p.id}')"
        title="${esc(p.req)}"><i class="ti ${p.ic}"></i> ${esc(p.nome)}
        ${p.ganho?'':'<span class="tt">· não paga por view</span>'}</span>`).join('')}
    </div>
  </div></div>`;

  if(GER.pacote) h += gerPacoteHTML(GER.pacote);

  /* o estúdio: montar o vídeo aqui dentro, sem arrastar arquivo nenhum */
  if(GER.pacote && !EST.urlProduto) EST.urlProduto = estUrlDoRoteiro(GER.pacote);
  if(estTem() && !EST.ferramentas) await estFerramentas();
  h += estCartaoHTML();
  h += await estGuardadasHTML();

  if(roteiros.length){
    h += `<div class="card tw"><div class="hd"><i class="ti ti-history"></i>Roteiros já montados</div><div class="bd">
      <table><thead><tr><th>Título</th><th class="c">Tipo</th><th class="c">Duração</th>
        <th class="c">Plataformas</th><th>Quando</th><th class="c no-print"></th></tr></thead><tbody>
      ${roteiros.slice(0,20).map(r=>`<tr>
        <td><b>${esc(r.titulo)}</b><div class="tt">${esc((r.produtos||[]).map(p=>p.nome).join(' · '))}</div></td>
        <td class="c"><span class="st s-nt">${esc(r.angulo)}</span></td>
        <td class="c n">${r.duracao}s</td>
        <td class="c n">${(r.plataformas||[]).length}</td>
        <td class="tt">${esc(String(r.criadoEm||'').slice(0,10).split('-').reverse().join('/'))}</td>
        <td class="c no-print nowrap">
          <button class="ib bl" title="Abrir" onclick="roteiroAbrir(${r.id})"><i class="ti ti-eye"></i></button>
          <button class="ib" title="Publicar" onclick="roteiroPublicar(${r.id})"><i class="ti ti-send"></i></button>
          <button class="ib rd" title="Excluir" onclick="roteiroDel(${r.id})"><i class="ti ti-trash"></i></button></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  body.innerHTML = h;
}

function gerCampo(k,v){ GER[k] = v; if(k!=='duracao') midiaRender(); }
function gerTogglarProduto(id){
  const i = GER.produtos.indexOf(id);
  if(i>=0) GER.produtos.splice(i,1); else GER.produtos.push(id);
  midiaRender();
}
function gerTogglarPlat(id){
  const i = GER.plataformas.indexOf(id);
  if(i>=0) GER.plataformas.splice(i,1); else GER.plataformas.push(id);
  midiaRender();
}

/* ---------------- o gerador ---------------- */
function troca(t, d){
  return String(t).replace(/\{p\}/g, d.p).replace(/\{d\}/g, d.d).replace(/\{n\}/g, d.n);
}
function escolher(lista, i){ return lista[i % lista.length]; }

async function gerMontar(){
  if(!GER.produtos.length){ toast('Escolha pelo menos um produto.','aw'); return; }
  if(!GER.plataformas.length){ toast('Escolha pelo menos uma plataforma.','aw'); return; }
  GER.duracao = clamp(num(val('ge-dur')) || num(GER.duracao) || 60, 15, 1800);

  const todos = await dbGetAll('programas');
  const prods = GER.produtos.map(id=>todos.find(p=>Number(p.id)===Number(id))).filter(Boolean);
  GER.pacote = gerPacote(prods, GER.angulo, GER.duracao, GER.formato, GER.plataformas, GER.variante);

  const id = await dbAdd('roteiros', {...GER.pacote, criadoEm:new Date().toISOString()});
  GER.pacote.id = id;
  toast('Roteiro montado e guardado.','ag');
  midiaRender();
}

function gerPacote(prods, angulo, duracao, formato, plataformas, variante){
  const p1 = prods[0];
  const dados = {p: p1.produto, d: duracao, n: prods.length>1 ? prods.length : 3};
  const gancho = troca(escolher(GANCHOS[angulo], variante), dados);
  const cta    = escolher(CTAS, variante);

  /* proporção das partes, ajustada à duração escolhida */
  const partes = [
    {nome:'Gancho',        peso:0.12, acao:'Rosto na câmera ou o produto em close, já em movimento'},
    {nome:'O problema',    peso:0.18, acao:'Mostre a situação chata que a pessoa vive hoje'},
    {nome:'A solução',     peso:0.30, acao:'Apresente o produto funcionando, sem enrolar'},
    {nome:'A prova',       peso:0.25, acao:'Resultado, número, comparação ou o antes e depois'},
    {nome:'A chamada',     peso:0.15, acao:'Olhe para a câmera e aponte para a descrição'}
  ];
  let t = 0;
  const cenas = partes.map((x,i)=>{
    const seg = Math.max(3, Math.round(duracao * x.peso));
    const ini = t; t += seg;
    let fala = '', tela = '';
    if(x.nome==='Gancho'){ fala = gancho; tela = gancho.length>42 ? gancho.slice(0,40)+'…' : gancho; }
    if(x.nome==='O problema'){
      fala = 'Conte, em uma frase, a dor que você tinha antes — a situação que fez você procurar solução.'
           + (p1.beneficio ? ` (O produto promete resolver: ${p1.beneficio}.)` : '');
      tela = 'O problema';
    }
    if(x.nome==='A solução'){
      fala = prods.map(p=>`${p.produto}: ${p.beneficio || 'diga em uma frase o que ele resolve'}.`).join(' ');
      tela = prods.length>1 ? prods.map(p=>p.produto).join(' · ') : p1.produto;
    }
    if(x.nome==='A prova'){
      fala = 'Mostre funcionando. Se tiver número, fale o número. Se não tiver, mostre o antes e o depois.';
      tela = 'Resultado';
    }
    if(x.nome==='A chamada'){ fala = cta; tela = 'Link na descrição'; }
    return {n:i+1, ini, seg, parte:x.nome, acao:x.acao, fala, tela};
  });

  const titulo = troca(escolher([
    '{p}: vale a pena?', '{p} — o que ninguém te conta', 'Testei o {p} — resultado real',
    '{p}: antes e depois', 'O que mudou depois do {p}'
  ], variante), dados);

  const legenda = [
    gancho, '',
    ...prods.map(p=>`▸ ${p.produto}${p.beneficio?' — '+p.beneficio:''}${p.url?'\n'+p.url:''}`),
    '', cta,
    prods.some(p=>p.url) ? '\n⚠️ Os links acima são de afiliado: você paga o mesmo preço e eu ganho uma comissão.' : ''
  ].filter(x=>x!==undefined).join('\n');

  /* hashtags: nicho do produto + base do tipo + a palavra do produto */
  const limpa = s => '#'+String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
                        .replace(/[^a-z0-9]+/g,'').slice(0,24);
  const brutas = [];
  prods.forEach(p=>{
    if(p.nicho) String(p.nicho).split(/[,;/]/).forEach(x=>{ if(x.trim()) brutas.push(limpa(x)); });
    brutas.push(limpa(p.produto.split(' ')[0]));
    (HASH_BASE[p.tipo]||[]).forEach(x=>brutas.push(limpa(x.replace('#',''))));
  });
  const hashtags = [...new Set(brutas)].filter(x=>x.length>3);

  return {titulo, angulo, duracao, formato, plataformas,
          produtos: prods.map(p=>({id:p.id, nome:p.produto, url:p.url||'', com:num(p.comissao),
                                   preco:num(p.preco), plataforma:p.plataforma})),
          gancho, cta, cenas, legenda, hashtags, variante};
}

function gerOutraVersao(){
  GER.variante = (GER.variante||0)+1;
  gerMontar();
}

/* ---------------- como o pacote aparece na tela ---------------- */
function gerPacoteHTML(k){
  const ganhoPrev = k.produtos.reduce((s,p)=>s + p.preco*p.com/100, 0);
  return `<div class="card" style="border-color:var(--green)">
    <div class="hd" style="background:var(--green-bg)"><i class="ti ti-movie"></i>${esc(k.titulo)}
      <span class="sp"></span>
      <button class="btn sm gh" onclick="gerOutraVersao()"><i class="ti ti-refresh"></i>Outra versão</button>
      <button class="btn sm gh" onclick="roteiroCopiar()"><i class="ti ti-copy"></i>Copiar tudo</button>
      <button class="btn sm gh" onclick="roteiroParaFabrica()"><i class="ti ti-download"></i>Baixar para a fábrica</button>
      <button class="btn sm gh" onclick="roteiroImprimir()"><i class="ti ti-printer"></i>Imprimir</button>
      <button class="btn sm" onclick="roteiroPublicar(${k.id||'null'})"><i class="ti ti-send"></i>Publicar</button></div>
    <div class="bd">
      <div class="kg" style="margin-bottom:14px">
        <div class="kc br"><div class="lb"><i class="ti ti-clock"></i>Duração</div><div class="vl">${k.duracao}s</div>
          <div class="sb">${esc(k.formato)}</div></div>
        <div class="kc bl"><div class="lb"><i class="ti ti-share"></i>Plataformas</div><div class="vl">${k.plataformas.length}</div>
          <div class="sb">${k.plataformas.map(id=>plat(id)?plat(id).nome:'').filter(Boolean).slice(0,3).join(', ')}${k.plataformas.length>3?'…':''}</div></div>
        <div class="kc gd"><div class="lb"><i class="ti ti-cash"></i>Ganho por venda</div><div class="vl">${moedaK(ganhoPrev)}</div>
          <div class="sb">somando os produtos do vídeo</div></div>
      </div>

      <div class="sh" style="margin-top:0"><i class="ti ti-bolt"></i>Gancho — os 3 primeiros segundos</div>
      <div class="al ag"><i class="ti ti-quote"></i><div style="font-size:15px;font-weight:700">${esc(k.gancho)}</div></div>

      <div class="sh"><i class="ti ti-list-numbers"></i>As cenas</div>
      <table><thead><tr><th class="c">#</th><th class="c">Tempo</th><th>Parte</th>
        <th>O que gravar</th><th>O que falar</th><th>Texto na tela</th></tr></thead><tbody>
      ${k.cenas.map(c=>`<tr>
        <td class="c n"><b>${c.n}</b></td>
        <td class="c mono">${String(Math.floor(c.ini/60)).padStart(2,'0')}:${String(c.ini%60).padStart(2,'0')}
          <div class="tt">${c.seg}s</div></td>
        <td><b>${esc(c.parte)}</b></td>
        <td class="tt">${esc(c.acao)}</td>
        <td style="font-size:12.5px">${esc(c.fala)}</td>
        <td><span class="st s-nt">${esc(c.tela)}</span></td></tr>`).join('')}
      </tbody></table>

      <div class="sh"><i class="ti ti-message"></i>Legenda base</div>
      <textarea id="ge-leg" rows="9" style="font-size:12.5px;width:100%;box-sizing:border-box">${esc(k.legenda)}</textarea>
      <div class="tt">Esta é a base. Na hora de publicar, ela é cortada no limite de cada plataforma.</div>

      <div class="sh"><i class="ti ti-hash"></i>Hashtags sugeridas</div>
      <div class="chips">${k.hashtags.map(x=>`<span class="chip">${esc(x)}</span>`).join('') || '<span class="tt">nenhuma — preencha o nicho dos produtos</span>'}</div>

      <div class="al aw" style="margin-top:14px"><i class="ti ti-alert-triangle"></i><div>
        O roteiro é um ponto de partida, não um texto para ler decorado. Fale com as suas palavras —
        o algoritmo e o público percebem leitura. E <b>declare que o link é de afiliado</b>: além de ser
        exigência da Amazon e de outras plataformas, é o que mantém a confiança de quem assiste.</div></div>
    </div></div>`;
}


/* ---------------- exportar para a fábrica de vídeo ----------------
   A fábrica é um programa que roda no seu computador e monta o vídeo
   sozinho a partir deste arquivo. Nada sai daqui para a internet.   */
function roteiroParaFabrica(){
  const k = GER && GER.pacote;
  if(!k){ toast('Monte um vídeo primeiro.','aw'); return; }
  const limpo = String(k.titulo).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                  .replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-').slice(0,50) || 'roteiro';
  baixarArquivo(JSON.stringify(k, null, 1), 'roteiro-'+limpo+'.json', 'application/json');
  toast('Arquivo baixado. Coloque ele na pasta "roteiros" da fábrica e rode o MONTAR-VIDEO.','ag');
}

async function roteiroCopiar(){
  const k = GER && GER.pacote; if(!k) return;
  const t = [
    k.titulo, '', 'GANCHO: '+k.gancho, '',
    'CENAS:',
    ...k.cenas.map(c=>`${c.n}. [${c.seg}s] ${c.parte} — ${c.acao}\n   Falar: ${c.fala}\n   Tela: ${c.tela}`),
    '', 'LEGENDA:', k.legenda, '', 'HASHTAGS: '+k.hashtags.join(' ')
  ].join('\n');
  try{ await navigator.clipboard.writeText(t); toast('Roteiro copiado.','ag'); }
  catch(e){ toast('Não consegui copiar — use o botão de imprimir.','aw'); }
}

function roteiroImprimir(){
  const k = GER && GER.pacote; if(!k) return;
  printar(`<h2>${esc(k.titulo)}</h2>
    <p><b>${esc(k.angulo)}</b> · ${k.duracao} segundos · ${esc(k.formato)}</p>
    <p style="font-size:15px;padding:10px;background:#eee;border-radius:6px"><b>Gancho:</b> ${esc(k.gancho)}</p>
    <table><thead><tr><th>#</th><th>Tempo</th><th>Parte</th><th>O que gravar</th><th>O que falar</th><th>Tela</th></tr></thead><tbody>
    ${k.cenas.map(c=>`<tr><td>${c.n}</td><td>${c.seg}s</td><td>${esc(c.parte)}</td><td>${esc(c.acao)}</td>
      <td>${esc(c.fala)}</td><td>${esc(c.tela)}</td></tr>`).join('')}
    </tbody></table>
    <h3>Legenda</h3><pre style="white-space:pre-wrap;font-family:inherit">${esc(k.legenda)}</pre>
    <h3>Hashtags</h3><p>${esc(k.hashtags.join(' '))}</p>`);
}

async function roteiroAbrir(id){
  const r = await dbGet('roteiros', id);
  if(!r) return;
  GER = {produtos:(r.produtos||[]).map(p=>p.id), angulo:r.angulo, duracao:r.duracao,
         formato:r.formato, plataformas:r.plataformas||[], variante:r.variante||0, pacote:r};
  MID_TAB = 'gerar'; midiaRender();
}
function roteiroDel(id){
  confirmar('Excluir roteiro','O roteiro sai da lista. As publicações já registradas continuam.',
    async()=>{ await dbDel('roteiros',id); toast('Removido.','aw'); midiaRender(); });
}

/* =========================================================================
   ABA 3 — PUBLICAR: um texto, todas as plataformas
   ========================================================================= */
let PUB = null;

async function roteiroPublicar(id){
  const r = id ? await dbGet('roteiros', id) : (GER && GER.pacote);
  if(!r){ toast('Monte um vídeo primeiro.','aw'); return; }
  PUB = {roteiro:r, feitas:{}};
  MID_TAB = 'pub'; midiaRender();
}

/* corta no limite sem quebrar palavra */
function cortar(t, lim){
  t = String(t||'');
  if(!lim || t.length<=lim) return t;
  const c = t.slice(0, lim-1);
  const e = c.lastIndexOf(' ');
  return (e>lim*0.6 ? c.slice(0,e) : c) + '…';
}

function pubTexto(k, p){
  const links = k.produtos.filter(x=>x.url).map(x=>x.url);
  const hash  = k.hashtags.slice(0, p.hashRec || 4).join(' ');
  let corpo = k.legenda;
  /* o X é curto: só o gancho, um link e duas hashtags */
  if(p.id==='x') corpo = k.gancho + (links[0]?'\n'+links[0]:'');
  if(p.id==='pin') corpo = k.gancho;
  const texto = (corpo + (hash?'\n\n'+hash:'')).trim();
  return {
    titulo: p.tit ? cortar(k.titulo, p.tit) : null,
    texto:  cortar(texto, p.leg),
    hash,
    links
  };
}

async function midTabPublicar(){
  const body = document.getElementById('mid-body');
  const roteiros = (await dbGetAll('roteiros')).sort((a,b)=>Number(b.id)-Number(a.id));
  const pubs = (await dbGetAll('publicacoes')).sort((a,b)=>Number(b.id)-Number(a.id));

  if(!roteiros.length){
    body.innerHTML = `<div class="empty"><i class="ti ti-send"></i><b>Nenhum vídeo montado ainda</b>
      <p>A central de publicação trabalha em cima de um roteiro. Monte um na aba <b>Gerar vídeo</b>.</p>
      <button class="btn gn" onclick="midStab('gerar')"><i class="ti ti-wand"></i>Ir para Gerar vídeo</button></div>`;
    return;
  }
  if(!PUB) PUB = {roteiro: roteiros[0], feitas:{}};
  const k = PUB.roteiro;

  let h = `<div class="card"><div class="hd"><i class="ti ti-send"></i>Central de publicação</div><div class="bd">
    <div class="fr3" style="align-items:end">
      <div class="fg" style="grid-column:span 2"><label>Vídeo a publicar</label>
        <select onchange="pubTrocar(this.value)">
          ${roteiros.map(r=>`<option value="${r.id}" ${Number(r.id)===Number(k.id)?'selected':''}>${esc(r.titulo)} · ${r.duracao}s</option>`).join('')}</select></div>
      <div class="fg"><div class="tt">${(k.plataformas||[]).length} plataforma(s) escolhida(s) neste vídeo</div></div>
    </div>
    <div class="al ai"><i class="ti ti-info-circle"></i><div>Para cada plataforma o sistema já cortou o texto no limite dela.
      Clique em <b>Copiar</b>, depois em <b>Abrir</b>: a página de envio abre no navegador e você cola. Ao terminar,
      marque <b>Publiquei</b> — é assim que o sistema controla onde o vídeo já está no ar.</div></div>
  </div></div>`;

  const escolhidas = PLATAFORMAS_VIDEO.filter(p=>(k.plataformas||[]).includes(p.id));
  escolhidas.forEach((p,i)=>{
    const t = pubTexto(k, p);
    const jaFeita = pubs.find(x=>Number(x.roteiroId)===Number(k.id) && x.plataforma===p.id);
    h += `<div class="card" style="border-left:4px solid ${p.cor}">
      <div class="hd"><i class="ti ${p.ic}" style="color:${p.cor}"></i>${esc(p.nome)}
        <span class="tt" style="margin-left:8px">${esc(p.tipo)} · ${esc(p.formato)}</span>
        <span class="sp"></span>
        ${jaFeita ? `<span class="st s-ok"><i class="ti ti-check"></i>publicado em ${esc(String(jaFeita.dtPub).split('-').reverse().join('/'))}</span>`
                  : `<span class="st s-nt">pendente</span>`}</div>
      <div class="bd">
        <div class="tt" style="margin-bottom:8px">
          ${p.ganho ? `<b>Paga por view:</b> ${platGanho(p)} por mil (estimativa) · ` : `<b>Não paga por visualização.</b> `}
          ${esc(p.req)}</div>
        ${p.nota?`<div class="al aw" style="padding:8px 11px;margin-bottom:9px"><i class="ti ti-alert-triangle"></i><div>${esc(p.nota)}</div></div>`:''}
        ${p.durMin && k.duracao < p.durMin ? `<div class="al ae" style="padding:8px 11px;margin-bottom:9px">
          <i class="ti ti-clock-exclamation"></i><div>Seu vídeo tem ${k.duracao}s e esta plataforma pede
          no mínimo <b>${p.durMin}s</b>${p.id==='tt'?' para monetizar':''}.</div></div>`:''}

        ${t.titulo!==null ? `<div class="fg"><label>Título <span class="tt">${t.titulo.length} de ${p.tit} caracteres${p.titVis?` · aparecem ~${p.titVis}`:''}</span></label>
          <input id="pb-tit-${p.id}" value="${esc(t.titulo)}"></div>` : ''}
        <div class="fg"><label>${t.titulo!==null?'Descrição':'Legenda'}
          <span class="tt">${t.texto.length} de ${p.leg} caracteres${p.legVis?` · aparecem ~${p.legVis} antes do "mais"`:''}
          · até ${p.hashMax} hashtags, ${p.hashRec} é o recomendado</span></label>
          <textarea id="pb-txt-${p.id}" rows="7" style="font-size:12.5px;width:100%;box-sizing:border-box">${esc(t.texto)}</textarea></div>
        <div class="brow">
          <button class="btn gn sm" onclick="pubCopiar('${p.id}')"><i class="ti ti-copy"></i>Copiar o texto</button>
          <button class="btn gh sm" onclick="abrirFora('${p.url}')"><i class="ti ti-external-link"></i>Abrir ${esc(p.nome)}</button>
          ${t.links.length?`<button class="btn gh sm" onclick="pubCopiarLinks('${p.id}')"><i class="ti ti-link"></i>Copiar só os links</button>`:''}
          ${jaFeita ? `<button class="btn gh sm" onclick="pubDesfazer(${jaFeita.id})"><i class="ti ti-arrow-back-up"></i>Desmarcar</button>`
                    : `<button class="btn sm" onclick="pubMarcar('${p.id}')"><i class="ti ti-check"></i>Publiquei</button>`}
        </div>
      </div></div>`;
  });

  if(pubs.length){
    h += `<div class="card tw"><div class="hd"><i class="ti ti-history"></i>Publicações registradas</div><div class="bd">
      <table><thead><tr><th>Vídeo</th><th>Plataforma</th><th>Quando</th><th class="r">Views</th>
        <th class="r">Receita</th><th class="c no-print"></th></tr></thead><tbody>
      ${pubs.slice(0,30).map(x=>{ const p = plat(x.plataforma);
        return `<tr><td>${esc(x.titulo||'—')}</td>
          <td><i class="ti ${p?p.ic:'ti-world'}" style="color:${p?p.cor:''}"></i> ${esc(p?p.nome:x.plataforma)}</td>
          <td class="tt">${esc(String(x.dtPub).split('-').reverse().join('/'))}</td>
          <td class="r n">${num(x.views).toLocaleString('pt-BR')}</td>
          <td class="r n">${moeda(x.receita)}</td>
          <td class="c no-print"><button class="ib bl" onclick="pubEditar(${x.id})"><i class="ti ti-edit"></i></button></td></tr>`;
      }).join('')}
      </tbody></table></div></div>`;
  }
  body.innerHTML = h;
}

async function pubTrocar(id){
  PUB = {roteiro: await dbGet('roteiros', Number(id)), feitas:{}};
  midiaRender();
}
async function pubCopiar(pid){
  const p = plat(pid);
  const tit = document.getElementById('pb-tit-'+pid);
  const txt = document.getElementById('pb-txt-'+pid);
  const t = (tit? tit.value+'\n\n':'') + (txt? txt.value : '');
  try{ await navigator.clipboard.writeText(t); toast(`Texto do ${p.nome} copiado. Agora clique em Abrir e cole.`,'ag'); }
  catch(e){ toast('Não consegui copiar. Selecione o texto e use Ctrl+C.','aw'); }
}
async function pubCopiarLinks(pid){
  const links = (PUB.roteiro.produtos||[]).filter(x=>x.url).map(x=>x.url).join('\n');
  try{ await navigator.clipboard.writeText(links); toast('Links copiados.','ag'); }
  catch(e){ toast(links,'aw'); }
}
async function pubMarcar(pid){
  const k = PUB.roteiro, p = plat(pid);
  const tit = document.getElementById('pb-tit-'+pid);
  const txt = document.getElementById('pb-txt-'+pid);
  await dbAdd('publicacoes', {roteiroId:k.id, plataforma:pid, titulo:k.titulo,
    texto: txt?txt.value:'', tituloPlat: tit?tit.value:'', dtPub:hoje(), views:0, receita:0});
  toast(`${p.nome} marcado como publicado.`,'ag');
  midiaRender();
}
function pubDesfazer(id){
  confirmar('Desmarcar publicação','O registro sai da lista. Nada é publicado ou apagado nas plataformas.',
    async()=>{ await dbDel('publicacoes',id); toast('Desmarcado.','aw'); midiaRender(); });
}
async function pubEditar(id){
  const x = await dbGet('publicacoes', id);
  const p = plat(x.plataforma);
  const b = `<div class="al ai"><i class="ti ti-info-circle"></i><div>Depois de alguns dias, volte aqui e anote
      como foi. É assim que você descobre qual plataforma vale o seu tempo.</div></div>
    <div class="fr3">
      <div class="fg"><label>Plataforma</label><input value="${esc(p?p.nome:x.plataforma)}" readonly></div>
      <div class="fg"><label>Data da publicação</label><input id="pe-dt" type="date" value="${esc(x.dtPub)}"></div>
      <div class="fg"><label>Endereço do vídeo</label><input id="pe-url" value="${esc(x.url||'')}" placeholder="https://"></div>
    </div>
    <div class="fr3">
      <div class="fg"><label>Visualizações</label><input id="pe-views" type="number" value="${num(x.views)}" oninput="pubRpm()"></div>
      <div class="fg"><label>Receita da plataforma (R$)</label><input id="pe-rec" type="number" step="0.01" value="${num(x.receita)}" oninput="pubRpm()"></div>
      <div class="fg"><label>Ganho por mil views</label><input id="pe-rpm" readonly value="—"></div>
    </div>
    <div class="fr3">
      <div class="fg"><label>Cliques no link</label><input id="pe-cliq" type="number" value="${num(x.cliques)}"></div>
      <div class="fg"><label>Vendas por afiliado</label><input id="pe-vend" type="number" value="${num(x.vendas)}"></div>
      <div class="fg"><label>Comissão recebida (R$)</label><input id="pe-com" type="number" step="0.01" value="${num(x.comissao)}"></div>
    </div>`;
  modal('Resultado da publicação','ti-chart-bar',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn gn" onclick="pubResultadoSalvar(${id})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
  pubRpm();
}
function pubRpm(){
  const v = num(val('pe-views')), r = num(val('pe-rec'));
  setVal('pe-rpm', v? moeda(r/v*1000) : '—');
}
async function pubResultadoSalvar(id){
  const x = await dbGet('publicacoes', id);
  await dbPut('publicacoes', {...x, dtPub:val('pe-dt'), url:val('pe-url'), views:num(val('pe-views')),
    receita:num(val('pe-rec')), cliques:num(val('pe-cliq')), vendas:num(val('pe-vend')),
    comissao:num(val('pe-com'))});
  closeModal('mk-form'); toast('Resultado salvo.'); midiaRender();
}

/* =========================================================================
   ABA 4 — PLATAFORMAS_VIDEO: onde dá para ganhar, e o que cada uma exige
   ========================================================================= */
async function midTabPlataformas(){
  const body = document.getElementById('mid-body');
  const pagam = PLATAFORMAS_VIDEO.filter(p=>p.ganho && p.br);
  const nao   = PLATAFORMAS_VIDEO.filter(p=>!p.ganho || !p.br);

  const linha = p => `<tr>
    <td><i class="ti ${p.ic}" style="color:${p.cor};font-size:18px"></i> <b>${esc(p.nome)}</b>
      <div class="tt">${esc(p.tipo)} · ${esc(p.formato)}</div></td>
    <td style="font-size:12px">${esc(p.req)}</td>
    <td style="font-size:12px">${esc(p.paga)}</td>
    <td class="r n">${p.ganho?`<b>${platGanho(p)}</b><div class="tt">por mil views</div>`:'<span class="tt">não paga</span>'}</td>
    <td class="c n" style="font-size:11.5px">
      ${p.tit?`título ${p.tit}<br>`:''}legenda ${p.leg}<br>${p.hashRec} hashtags</td>
    <td class="c no-print"><button class="btn xs gh" onclick="abrirFora('${p.url}')">
      <i class="ti ti-external-link"></i>Abrir</button></td></tr>`;

  body.innerHTML = `
    <div class="al ai"><i class="ti ti-info-circle"></i><div>Levantado nas páginas oficiais em <b>agosto de 2026</b>.
      Requisitos mudam com frequência — confira antes de tomar decisão em cima de um número. Os valores por mil
      visualizações são <b>estimativas de mercado</b>: nenhuma plataforma publica isso.</div></div>

    <div class="card tw"><div class="hd"><i class="ti ti-cash"></i>Pagam por visualização no Brasil</div><div class="bd">
      <table><thead><tr><th>Plataforma</th><th>O que exige para monetizar</th><th>Como paga</th>
        <th class="r">Estimativa</th><th class="c">Limites</th><th class="c no-print"></th></tr></thead>
        <tbody>${pagam.map(linha).join('')}</tbody></table>
    </div></div>

    <div class="card tw"><div class="hd"><i class="ti ti-eye"></i>Não pagam por visualização — mas valem pela venda</div><div class="bd">
      <div class="tt" style="margin-bottom:9px">Publicar aqui não gera receita de anúncio, mas gera <b>clique no seu link
        de afiliado</b> — e é daí que costuma sair o dinheiro de verdade para quem está começando.</div>
      <table><thead><tr><th>Plataforma</th><th>Situação</th><th>Como se ganha</th>
        <th class="r">Por view</th><th class="c">Limites</th><th class="c no-print"></th></tr></thead>
        <tbody>${nao.map(linha).join('')}</tbody></table>
    </div></div>

    <div class="card"><div class="hd"><i class="ti ti-bulb"></i>Por onde começar</div><div class="bd">
      <div style="font-size:12.5px;line-height:1.85;color:var(--text2)">
        <b>1. YouTube longo</b> é de longe o melhor pagamento por visualização em reais, e a barreira é alcançável.<br>
        <b>2. TikTok</b> é o segundo, com o Brasil na lista oficial — mas exige vídeo acima de 1 minuto.<br>
        <b>3. Facebook</b> é o único que paga também por foto e texto, não só vídeo.<br>
        <b>4. Kwai</b> tem a barreira mais baixa de todas e saca por Pix, mas paga pouco.<br>
        <b>5. Instagram e Pinterest</b> não pagam por view — publique neles pela venda de afiliado, não pela monetização.<br>
        <b>Cuidado:</b> o Rumble aceita o seu envio, mas o Brasil não está na lista de países que ele paga.
      </div>
    </div></div>`;
}

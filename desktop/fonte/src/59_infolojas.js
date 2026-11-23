/* =========================================================================
   INFOPRODUTOS — LOJAS E ANÚNCIOS (aba "Lojas e anúncios")

   Para cada infoproduto: em que pé ele está na Hotmart, no Amazon KDP e na
   loja (Shopify/Nuvemshop), com o link; e um gerador de anúncios que escreve
   3 ângulos (dor, resultado, prova) para Meta, Google, TikTok e YouTube,
   cortando cada texto no limite da rede. Os agentes do setor Infoprodutos
   refinam esses textos todo dia no piloto; este gerador é o ponto de partida
   que funciona até sem a sede ligada.
   ========================================================================= */
const INFO_LOJAS = [
  { id:'hotmart', nome:'Hotmart', ic:'ti-device-laptop', taxa:'9,9% + R$ 2,49 por venda', url:'https://app-vlc.hotmart.com/products' },
  { id:'kdp', nome:'Amazon KDP', ic:'ti-brand-amazon', taxa:'70% de royalties com KDP Select (R$ 5,99 a R$ 31,99)', url:'https://kdp.amazon.com/pt_BR/bookshelf' },
  { id:'loja', nome:'Shopify / Nuvemshop', ic:'ti-building-store', taxa:'Shopify: US$ 29 a 39/mês + 2%', url:'https://admin.shopify.com' },
];
const INFO_ST = ['Não começou', 'Rascunho', 'Em revisão', 'À venda'];
const INFO_ST_CLS = { 'Não começou':'s-nt', 'Rascunho':'s-pd', 'Em revisão':'s-wn', 'À venda':'s-ok' };
const ANUNCIO_REDES = [
  { id:'meta', nome:'Meta Ads (Facebook e Instagram)', ic:'ti-brand-facebook', campos:[['Texto principal',125],['Título',40],['Descrição',30]] },
  { id:'google', nome:'Google Ads', ic:'ti-search', campos:[['Título 1',30],['Título 2',30],['Título 3',30],['Descrição 1',90],['Descrição 2',90]] },
  { id:'tiktok', nome:'TikTok Ads', ic:'ti-brand-tiktok', campos:[['Texto do anúncio',100]] },
  { id:'youtube', nome:'YouTube (anúncio em vídeo)', ic:'ti-brand-youtube', campos:[['Título',100],['Chamada',15]] },
];
let INFO_AN = null;

async function infoTabLojas(un, prods){
  const body = document.getElementById('prd-body-'+un); if(!body) return;
  let h = `<div class="al ai" style="margin-top:0"><i class="ti ti-info-circle"></i><div>A escada do plano: um <b>e-book barato na Amazon</b> traz o leitor e o <b>curso na Hotmart</b> dá o lucro. Só pague anúncio para um produto depois da primeira venda sem anúncio. Hotmart abaixo de R$ 10 cobra 20%: nada abaixo de R$ 19.</div></div>`;
  if(!prods.length){
    body.innerHTML = h + `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-device-laptop"></i><b>Nenhum infoproduto cadastrado</b>Cadastre em "Novo infoproduto". Sugestões do plano: curso "Renda com impressão 3D" (R$ 197), planilha "Finanças para um Juvenil" (R$ 47), e-book "Ovos caipiras em meio hectare" (R$ 24,90).</div></div></div>`;
    return;
  }
  h += `<div class="card tw"><div class="hd"><i class="ti ti-building-store"></i>Onde cada produto está à venda</div><div class="bd"><table>
    <thead><tr><th>Infoproduto</th><th class="r">Preço</th>${INFO_LOJAS.map(l => `<th title="${esc(l.taxa)}"><i class="ti ${l.ic}"></i> ${esc(l.nome)}</th>`).join('')}<th></th></tr></thead><tbody>
    ${prods.map(p => { const lj = p.lojas || {};
      return `<tr><td><b>${esc(p.nome)}</b>${p.cat?`<br><span class="tt">${esc(p.cat)}</span>`:''}</td><td class="r n">${moeda(p.preco)}</td>
        ${INFO_LOJAS.map(l => { const s = (lj[l.id] || {}).status || 'Não começou'; const u = (lj[l.id] || {}).url;
          return `<td><span class="st ${INFO_ST_CLS[s]||'s-nt'}" style="cursor:pointer" onclick="infoLojaForm(${p.id},'${l.id}')">${esc(s)}</span>${u?` <a class="ib bl" href="${esc(u)}" target="_blank" rel="noopener" title="Abrir"><i class="ti ti-external-link"></i></a>`:''}</td>`; }).join('')}
        <td class="r nowrap"><button class="btn xs bl" onclick="infoAnuncios(${p.id})"><i class="ti ti-sparkles"></i>Gerar anúncios</button></td></tr>`; }).join('')}
    </tbody></table>
    <div class="tt" style="padding:8px 12px">Clique na situação para mudar e guardar o link. Taxas de 2026: ${INFO_LOJAS.map(l => `${esc(l.nome)} — ${esc(l.taxa)}`).join(' · ')}.</div></div></div>`;
  body.innerHTML = h;
}

async function infoLojaForm(id, loja){
  const p = await dbGet('produtos', id); if(!p) return;
  const L = INFO_LOJAS.find(x => x.id === loja), atual = (p.lojas || {})[loja] || {};
  modal(`${L.nome} — ${p.nome}`, L.ic,
    `<div class="fg"><label>Situação</label><select id="il-st">${INFO_ST.map(s => `<option ${s===(atual.status||'Não começou')?'selected':''}>${s}</option>`).join('')}</select></div>
     <div class="fg"><label>Link do produto nessa plataforma</label><input id="il-url" value="${esc(atual.url||'')}" placeholder="https://..."></div>
     <div class="hint">${esc(L.taxa)}. <a href="${esc(L.url)}" target="_blank" rel="noopener">Abrir o painel da ${esc(L.nome)}</a>.</div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="infoLojaSalvar(${id},'${loja}')"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function infoLojaSalvar(id, loja){
  const p = await dbGet('produtos', id); if(!p) return;
  const lojas = { ...(p.lojas || {}), [loja]: { status: val('il-st'), url: val('il-url'), em: hoje() } };
  await dbPut('produtos', { ...p, lojas }); closeModal('mk-form'); toast('Salvo.'); infoRender();
}

/* ------------------------------------------------------ gerador de anúncios */
const AN_SOLTAS = /\s+(e|ou|no|na|nos|nas|de|do|da|dos|das|com|para|pra|o|a|os|as|em|um|uma|que|por|seu|sua|ao|à)$/i;
function anCorta(t, max){
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if(t.length <= max) return { t, cortou:false };
  let c = t.slice(0, max);
  /* prefere terminar numa frase inteira */
  const fim = Math.max(c.lastIndexOf('. '), c.lastIndexOf('? '), c.lastIndexOf('! '), /[.?!]$/.test(c) ? c.length - 1 : -1);
  if(fim >= max * 0.5) return { t: c.slice(0, fim + 1).trim(), cortou:true };
  const i = c.lastIndexOf(' ');
  c = (i > max * 0.5 ? c.slice(0, i) : c).replace(/[\s,;:\-–—]+$/, '');
  while(AN_SOLTAS.test(c)) c = c.replace(AN_SOLTAS, '');
  return { t: c, cortou:true };
}
function anPreco(v){ return v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) : ''; }
function anCap(s){ s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; }
function anGerar(p, b){
  /* nome curto nos textos: o nome inteiro de um curso estoura qualquer limite */
  const nome = anCorta(p.nome, 30).t, preco = anPreco(p.preco), comPreco = preco ? ' por ' + preco : '';
  const pub = b.publico || 'quem está começando', dor = b.dor || 'não sabe por onde começar';
  const res = b.resultado || 'dar o primeiro passo com segurança', prova = b.prova || 'passo a passo testado na prática';
  const ang = {
    dor:       { tag:'Dor',
      meta:[`Você ${dor}? O ${nome} mostra o caminho, passo a passo, para ${pub}.`, anCap(res), nome],
      google:[nome, 'Passo a passo completo', 'Acesso imediato', `Você ${dor}? Aprenda com o ${nome}.`, `${anCap(prova)}. Acesso imediato${comPreco}.`],
      tiktok:[`Você ${dor}? Conheça o ${nome}. Link na bio.`],
      youtube:[`Você ${dor}? Veja como ${res}.`, 'Saiba mais'] },
    resultado: { tag:'Resultado',
      meta:[`Quer ${res}? O ${nome} foi feito para ${pub}. ${anCap(prova)}.`, anCap(res), `Acesso imediato${preco ? ' · ' + preco : ''}`],
      google:[anCap(res), nome, 'Comece hoje mesmo', `${nome}: para ${pub} que quer ${res}.`, `${anCap(prova)}. Comece hoje${comPreco}.`],
      tiktok:[`Quer ${res}? O ${nome} mostra como. Link na bio.`],
      youtube:[`Como ${res}: ${nome}`, 'Comece hoje'] },
    prova:     { tag:'Prova',
      meta:[`${anCap(prova)}. O ${nome} junta tudo em um só lugar para ${pub}.`, anCap(prova), nome],
      google:[anCap(prova), nome, 'Sem enrolação', `${nome}: ${prova}. Direto ao ponto.`, `Acesso imediato e 7 dias para pedir o dinheiro de volta${comPreco ? '.' + comPreco.replace(' por', ' Valor:') : ''}.`],
      tiktok:[`${anCap(prova)}. Conheça o ${nome}. Link na bio.`],
      youtube:[`${nome}: ${prova}`, 'Ver agora'] },
  };
  return Object.values(ang).map(a => ({ tag: a.tag, redes: ANUNCIO_REDES.map(r => ({ ...r, textos: r.campos.map(([rot, max], i) => ({ rot, max, ...anCorta((a[r.id] || [])[i] || '', max) })) })) }));
}

async function infoAnuncios(id){
  const p = await dbGet('produtos', id); if(!p) return;
  const b = p.anuncio || {};
  INFO_AN = { id };
  modal('Anúncios — ' + p.nome, 'ti-sparkles',
    `<div class="fr2"><div class="fg"><label>Para quem é</label><input id="an-pub" value="${esc(b.publico||'')}" placeholder="quem tem uma impressora 3D parada"></div>
      <div class="fg"><label>A dor (o que a pessoa sente hoje)</label><input id="an-dor" value="${esc(b.dor||'')}" placeholder="não sabe o que imprimir para vender"></div></div>
     <div class="fr2"><div class="fg"><label>O resultado (sem prometer ganho)</label><input id="an-res" value="${esc(b.resultado||'')}" placeholder="vender as primeiras peças na Shopee"></div>
      <div class="fg"><label>A prova (por que acreditar)</label><input id="an-prova" value="${esc(b.prova||'')}" placeholder="feito por quem imprime e vende todo dia"></div></div>
     <div style="margin:6px 0 10px"><button class="btn sm bl" onclick="infoAnunciosGerar()"><i class="ti ti-sparkles"></i>Gerar</button></div>
     <div id="an-out"></div>
     <div class="hint">Regras das redes: nada de promessa de ganho garantido, antes/depois de dinheiro ou "fique rico". Confira antes de subir; os agentes do setor Infoprodutos melhoram estes textos no piloto.</div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`, 'lg');
  if(b.publico || b.dor) infoAnunciosGerar();
}
async function infoAnunciosGerar(){
  if(!INFO_AN) return;
  const p = await dbGet('produtos', INFO_AN.id); if(!p) return;
  const b = { publico: val('an-pub'), dor: val('an-dor'), resultado: val('an-res'), prova: val('an-prova') };
  await dbPut('produtos', { ...p, anuncio: { ...b, em: hoje() } });
  const V = anGerar(p, b); INFO_AN.v = V;
  document.getElementById('an-out').innerHTML = V.map((a, ai) => `<div class="card" style="margin-bottom:10px"><div class="hd"><i class="ti ti-sparkles"></i>Ângulo: ${esc(a.tag)}</div><div class="bd">
    ${a.redes.map((r, ri) => `<div style="padding:6px 0;border-bottom:1px solid var(--bg3)"><b style="font-size:13px"><i class="ti ${r.ic}"></i> ${esc(r.nome)}</b>
      <button class="btn xs gh" style="float:right" onclick="infoAnCopiar(${ai},${ri})"><i class="ti ti-copy"></i>Copiar</button>
      ${r.textos.map(t => `<div style="display:flex;gap:8px;align-items:baseline;font-size:13px;margin-top:3px"><span class="tt" style="min-width:96px">${esc(t.rot)}</span><span style="flex:1">${esc(t.t)}</span><span class="tt" style="color:${t.t.length>t.max?'var(--red)':t.cortou?'var(--amber)':'var(--text3)'}" title="${t.cortou?'cortado para caber no limite':''}">${t.t.length}/${t.max}</span></div>`).join('')}</div>`).join('')}
    </div></div>`).join('');
}
async function infoAnCopiar(ai, ri){
  const r = INFO_AN && INFO_AN.v && INFO_AN.v[ai] && INFO_AN.v[ai].redes[ri]; if(!r) return;
  const txt = r.textos.map(t => `${t.rot}: ${t.t}`).join('\n');
  try { await navigator.clipboard.writeText(txt); toast('Copiado.'); } catch(e){ toast(txt, 'aw'); }
}

/* =========================================================================
   MÓDULO: MATERIAIS E COMPRAS — requisição, cotação, pedido, entrega e estoque
   ========================================================================= */
let MAT_TAB = 'req';
let CART = [];   // itens em edição na requisição

const ST_COMPRA = {
  'Requisitado':'s-nt','Aguardando cotação':'s-wn','Cotado':'s-pu','Pedido emitido':'s-pd',
  'Entregue':'s-ok','Cancelado':'s-bl'
};

function matStab(t){ MAT_TAB = t; matRender(); }

async function matRender(){
  const root = document.getElementById('mat-root');
  const o = await obraAtual();
  if(!o){ root.innerHTML = semObra(); return; }
  const compras = (await dbByObra('compras',o.id)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const mov = await dbByObra('estoque',o.id);

  const totPedido  = compras.filter(c=>c.status!=='Cancelado').reduce((s,c)=>s+num(c.total),0);
  const totEntregue= compras.filter(c=>c.status==='Entregue').reduce((s,c)=>s+num(c.total),0);
  const abertas    = compras.filter(c=>['Requisitado','Aguardando cotação','Cotado','Pedido emitido'].includes(c.status));

  let html = `<div class="ph"><div class="ic"><i class="ti ti-package"></i></div>
    <div><h1>Materiais e Compras</h1><p>${esc(o.cod)} — ${esc(o.nome)}</p></div>
    <div class="sp"></div>
    <button class="btn" onclick="compraForm()"><i class="ti ti-plus"></i>Nova requisição</button></div>`;

  html += `<div class="kg" style="margin-bottom:14px">
    <div class="kc bl"><div class="lb"><i class="ti ti-file-invoice"></i>Requisições</div><div class="vl">${compras.length}</div>
      <div class="sb">${abertas.length} em aberto</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-shopping-cart"></i>Valor solicitado</div><div class="vl">${moedaK(totPedido)}</div><div class="sb">todas as requisições ativas</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-truck-delivery"></i>Entregue</div><div class="vl">${moedaK(totEntregue)}</div>
      <div class="sb">${totPedido?pct(totEntregue/totPedido*100)+' do solicitado':'—'}</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-box"></i>Estoque no canteiro</div><div class="vl">${moedaK(estoqueValor(mov))}</div>
      <div class="sb">${estoqueItens(mov).length} itens com saldo</div></div>
  </div>`;

  html += `<div class="tabs">
    <button class="tab ${MAT_TAB==='req'?'on':''}" onclick="matStab('req')"><i class="ti ti-file-invoice"></i>Requisições e pedidos</button>
    <button class="tab ${MAT_TAB==='est'?'on':''}" onclick="matStab('est')"><i class="ti ti-box"></i>Estoque do canteiro</button>
    <button class="tab ${MAT_TAB==='nec'?'on':''}" onclick="matStab('nec')"><i class="ti ti-clipboard-list"></i>Necessidade x comprado</button>
  </div><div id="mat-body"></div>`;
  root.innerHTML = html;

  if(MAT_TAB==='req') await matTabReq(o,compras);
  if(MAT_TAB==='est') await matTabEstoque(o,mov);
  if(MAT_TAB==='nec') await matTabNecessidade(o);
}

function estoqueItens(mov){
  const m = {};
  mov.forEach(x=>{
    const k = x.cod+'|'+x.desc+'|'+x.und;
    if(!m[k]) m[k] = {cod:x.cod,desc:x.desc,und:x.und,ent:0,sai:0,valor:0};
    if(x.tipo==='Entrada'){ m[k].ent += num(x.qtd); m[k].valor += num(x.qtd)*num(x.vunit); }
    else m[k].sai += num(x.qtd);
  });
  return Object.values(m).map(x=>({...x,saldo:x.ent-x.sai,
    vunit: x.ent? x.valor/x.ent : 0})).filter(x=>Math.abs(x.saldo)>0.0001);
}
function estoqueValor(mov){ return estoqueItens(mov).reduce((s,x)=>s+x.saldo*x.vunit,0); }

/* ---------------- Aba: requisições ---------------- */
async function matTabReq(o,compras){
  const body = document.getElementById('mat-body');
  if(!compras.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-shopping-cart-off"></i>
      <b>Nenhuma requisição</b>Crie uma requisição de compra, colete cotações de fornecedores, emita o pedido
      e registre a entrega. Ao registrar a entrega o sistema lança o custo na obra e dá entrada no estoque do canteiro automaticamente.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="compraForm()"><i class="ti ti-plus"></i>Nova requisição</button></div></div></div></div>`;
    return;
  }
  let h = `<div class="card tw"><div class="bd"><table>
    <thead><tr><th>Nº</th><th>Data</th><th>Etapa</th><th>Itens</th><th>Fornecedor</th><th class="c">Status</th>
      <th class="c">Entrega</th><th class="r">Valor</th><th class="c no-print">Ações</th></tr></thead><tbody>`;
  compras.forEach(c=>{
    h += `<tr><td class="mono"><b>${esc(c.num)}</b></td><td class="n">${dbr(c.data)}</td>
      <td class="tt">${esc(c.etapa||'—')}</td>
      <td>${(c.itens||[]).length} item(ns)<br><span class="tt">${esc((c.itens||[]).slice(0,2).map(i=>i.desc).join(', ').slice(0,46))}${(c.itens||[]).length>2?'…':''}</span></td>
      <td class="tt">${esc(c.fornecedor||'—')}</td>
      <td class="c"><span class="st ${ST_COMPRA[c.status]||'s-nt'}">${esc(c.status)}</span></td>
      <td class="c n tt">${c.status==='Entregue'?dbr(c.dtEntrega):dbr(c.prevEntrega)}</td>
      <td class="r n"><b>${moeda(c.total)}</b></td>
      <td class="c no-print nowrap">
        <button class="ib bl" title="Ver / editar" onclick="compraForm(${c.id})"><i class="ti ti-edit"></i></button>
        <button class="ib" title="Imprimir" onclick="printCompra(${c.id})"><i class="ti ti-printer"></i></button>
        ${c.status!=='Entregue'&&c.status!=='Cancelado'?`<button class="ib bl" title="Registrar entrega" onclick="compraEntregar(${c.id})"><i class="ti ti-truck-delivery"></i></button>`:''}
        <button class="ib rd" title="Excluir" onclick="compraDel(${c.id})"><i class="ti ti-trash"></i></button></td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan="7">TOTAL</td><td class="r n">${moeda(compras.filter(c=>c.status!=='Cancelado').reduce((s,c)=>s+num(c.total),0))}</td>
    <td class="no-print"></td></tr></tfoot></table></div></div>`;
  body.innerHTML = h;
}

/* ---------------- Formulário de requisição ---------------- */
async function compraForm(id){
  const o = await obraAtual();
  const c = id ? await dbGet('compras',id) : null;
  const compras = await dbGetAll('compras');
  const ano = String(new Date().getFullYear()).slice(-2);
  const prox = 'REQ-' + String(compras.reduce((m,x)=>{
      const mt = String(x.num||'').match(/REQ-(\d+)\/(\d+)/); return mt&&mt[2]===ano?Math.max(m,parseInt(mt[1])):m; },0)+1).padStart(3,'0') + '/' + ano;
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  const forn = await dbGetAll('pessoas');
  const insumos = (await dbGetAll('insumos')).sort((a,b)=>a.desc.localeCompare(b.desc));
  CART = c ? JSON.parse(JSON.stringify(c.itens||[])) : [];

  const b = `
   <div class="fr4">
     <div class="fg"><label>Número</label><input id="cp-num" value="${esc(c?c.num:prox)}" readonly></div>
     <div class="fg"><label>Data</label><input id="cp-data" type="date" value="${c?c.data:hoje()}"></div>
     <div class="fg"><label>Status</label><select id="cp-status">
       ${Object.keys(ST_COMPRA).map(s=>`<option ${c&&c.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
     <div class="fg"><label>Previsão de entrega</label><input id="cp-prev" type="date" value="${c?c.prevEntrega:addDias(hoje(),7)}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Etapa de destino</label><select id="cp-etapa"><option value="">— geral —</option>
       ${etapas.map(e=>`<option ${c&&c.etapa===e.nome?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></div>
     <div class="fg"><label>Fornecedor escolhido</label><input id="cp-forn" list="cp-forn-l" value="${esc(c?c.fornecedor:'')}">
       <datalist id="cp-forn-l">${forn.map(f=>`<option value="${esc(f.nome)}">`).join('')}</datalist></div>
     <div class="fg"><label>Solicitante</label><input id="cp-sol" value="${esc(c?c.solicitante:(PERFIS[CU].nome||''))}"></div>
   </div>

   <div class="sh"><i class="ti ti-list"></i>Itens da requisição</div>
   <div class="fcard" style="background:var(--bg3);padding:11px">
     <div class="fr4" style="margin-bottom:0">
       <div class="fg" style="grid-column:span 2"><label>Insumo</label>
         <select id="ci-ins"><option value="">— selecione —</option>
           ${insumos.map(i=>`<option value="${i.cod}">${esc(i.cod)} · ${esc(i.desc)} (${esc(i.und)})</option>`).join('')}</select></div>
       <div class="fg"><label>Quantidade</label><input id="ci-qtd" type="number" step="0.01" placeholder="0"></div>
       <div class="fg"><label>&nbsp;</label><button class="btn blk" onclick="cartAdd()"><i class="ti ti-plus"></i>Adicionar</button></div>
     </div>
   </div>
   <div id="cart-box"></div>

   <div class="sh"><i class="ti ti-currency-dollar"></i>Cotações de fornecedores</div>
   <div id="cot-box"></div>

   <div class="fg" style="margin-top:11px"><label>Observações</label><textarea id="cp-obs">${esc(c?c.obs:'')}</textarea></div>
   <div id="cp-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    ${id?`<button class="btn gh" onclick="printCompra(${id})"><i class="ti ti-printer"></i>Imprimir</button>`:''}
    <button class="btn gn" onclick="compraSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Requisição '+c.num:'Nova requisição de compra','ti-file-invoice',b,f,'lg');
  window.__COT = c ? JSON.parse(JSON.stringify(c.cotacoes||[])) : [];
  cartRender(); cotRender();
}

async function cartAdd(){
  const cod = val('ci-ins'), q = num(val('ci-qtd'));
  if(!cod || q<=0){ toast('Selecione o insumo e informe a quantidade.','ae'); return; }
  const ins = (await dbGetAll('insumos')).find(i=>i.cod===cod);
  const ex = CART.find(i=>i.cod===cod);
  if(ex) ex.qtd = num(ex.qtd)+q;
  else CART.push({cod:ins.cod,desc:ins.desc,und:ins.und,cat:ins.cat,qtd:q,vunit:num(ins.custo)});
  setVal('ci-qtd',''); document.getElementById('ci-ins').value='';
  cartRender();
}
function cartDel(i){ CART.splice(i,1); cartRender(); }
function cartSet(i,campo,v){ CART[i][campo] = num(v); cartRender(); }
function cartRender(){
  const box = document.getElementById('cart-box');
  if(!box) return;
  if(!CART.length){ box.innerHTML = `<div class="al ai"><i class="ti ti-info-circle"></i>Nenhum item adicionado ainda.</div>`; return; }
  const tot = CART.reduce((s,i)=>s+num(i.qtd)*num(i.vunit),0);
  box.innerHTML = `<div class="card tw" style="margin-top:9px"><div class="bd"><table>
    <thead><tr><th>Cód.</th><th>Descrição</th><th class="c">Und</th><th class="r" style="width:96px">Qtd</th>
      <th class="r" style="width:112px">V. Unit.</th><th class="r">Total</th><th class="c"></th></tr></thead><tbody>
    ${CART.map((i,ix)=>`<tr><td class="mono">${esc(i.cod)}</td><td>${esc(i.desc)}</td><td class="c">${esc(i.und)}</td>
      <td><input type="number" step="0.01" value="${i.qtd}" onchange="cartSet(${ix},'qtd',this.value)" style="width:88px;text-align:right;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
      <td><input type="number" step="0.01" value="${i.vunit}" onchange="cartSet(${ix},'vunit',this.value)" style="width:104px;text-align:right;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
      <td class="r n"><b>${moeda(num(i.qtd)*num(i.vunit))}</b></td>
      <td class="c"><button class="ib rd" onclick="cartDel(${ix})"><i class="ti ti-trash"></i></button></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="5">TOTAL DA REQUISIÇÃO</td><td class="r n">${moeda(tot)}</td><td></td></tr></tfoot></table></div></div>`;
}

function cotAdd(){
  window.__COT = window.__COT||[];
  window.__COT.push({fornecedor:'',valor:0,prazo:'',cond:'',escolhida:false});
  cotRender();
}
function cotSet(i,campo,v){ window.__COT[i][campo] = campo==='valor'?num(v):v; if(campo!=='escolhida') return; cotRender(); }
function cotEscolher(i){ window.__COT.forEach((c,ix)=>c.escolhida = ix===i); const f=window.__COT[i]; setVal('cp-forn',f.fornecedor); cotRender(); }
function cotDel(i){ window.__COT.splice(i,1); cotRender(); }
function cotRender(){
  const box = document.getElementById('cot-box');
  if(!box) return;
  const C = window.__COT||[];
  let h = '';
  if(!C.length) h = `<div class="al ai"><i class="ti ti-info-circle"></i>Registre ao menos 3 cotações para comparar preços antes de fechar o pedido.</div>`;
  else{
    const min = Math.min(...C.map(c=>num(c.valor)||Infinity));
    h = `<div class="card tw"><div class="bd"><table><thead><tr><th>Fornecedor</th><th class="r">Valor total</th>
      <th class="c">Prazo</th><th>Condição de pagamento</th><th class="c">Escolhida</th><th class="c"></th></tr></thead><tbody>
      ${C.map((c,i)=>`<tr style="${num(c.valor)===min&&min!==Infinity?'background:var(--green-bg)':''}">
        <td><input value="${esc(c.fornecedor)}" onchange="cotSet(${i},'fornecedor',this.value)" style="width:100%;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
        <td><input type="number" step="0.01" value="${c.valor||''}" onchange="cotSet(${i},'valor',this.value);cotRender()" style="width:108px;text-align:right;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
        <td><input value="${esc(c.prazo)}" placeholder="5 dias" onchange="cotSet(${i},'prazo',this.value)" style="width:82px;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
        <td><input value="${esc(c.cond)}" placeholder="30/60 dias" onchange="cotSet(${i},'cond',this.value)" style="width:100%;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
        <td class="c"><button class="ib ${c.escolhida?'bl':''}" onclick="cotEscolher(${i})" title="Marcar como vencedora">
          <i class="ti ti-${c.escolhida?'circle-check-filled':'circle'}" style="${c.escolhida?'color:var(--green)':''}"></i></button></td>
        <td class="c"><button class="ib rd" onclick="cotDel(${i})"><i class="ti ti-trash"></i></button></td></tr>`).join('')}
      </tbody></table></div></div>`;
    if(C.filter(c=>num(c.valor)>0).length>1){
      const vals = C.filter(c=>num(c.valor)>0).map(c=>num(c.valor));
      const mx = Math.max(...vals), mn = Math.min(...vals);
      h += `<div class="al ag"><i class="ti ti-discount"></i><div>Diferença entre a maior e a menor cotação:
        <b>${moeda(mx-mn)}</b> (${pct((mx-mn)/mx*100)}). Escolher a mais barata economiza esse valor na obra.</div></div>`;
    }
  }
  h += `<div class="brow"><button class="btn gh sm" onclick="cotAdd()"><i class="ti ti-plus"></i>Adicionar cotação</button></div>`;
  box.innerHTML = h;
}

async function compraSave(id){
  const o = await obraAtual();
  if(!CART.length){ document.getElementById('cp-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Adicione ao menos um item à requisição.</div>`; return; }
  const total = CART.reduce((s,i)=>s+num(i.qtd)*num(i.vunit),0);
  const d = {obraId:o.id, num:val('cp-num'), data:val('cp-data'), status:val('cp-status'),
             prevEntrega:val('cp-prev'), etapa:val('cp-etapa'), fornecedor:val('cp-forn'),
             solicitante:val('cp-sol'), itens:JSON.parse(JSON.stringify(CART)),
             cotacoes:JSON.parse(JSON.stringify(window.__COT||[])), total, obs:val('cp-obs')};
  if(id){ const old = await dbGet('compras',id); await dbPut('compras',{...old,...d}); }
  else await dbAdd('compras',d);
  closeModal('mk-form'); toast('Requisição salva.'); matRender();
}

async function compraEntregar(id){
  const c = await dbGet('compras',id);
  const b = `<div class="al ai"><i class="ti ti-info-circle"></i><div>Ao confirmar a entrega o sistema vai:
    <b>lançar ${moeda(c.total)} como custo realizado</b> da obra e <b>dar entrada dos ${(c.itens||[]).length} itens no estoque do canteiro</b>.</div></div>
   <div class="fr2">
     <div class="fg"><label>Data da entrega</label><input id="ce-data" type="date" value="${hoje()}"></div>
     <div class="fg"><label>Nota fiscal / documento</label><input id="ce-doc" placeholder="NF nº"></div></div>
   <div class="fr2">
     <div class="fg"><label>Fornecedor</label><input id="ce-forn" value="${esc(c.fornecedor)}"></div>
     <div class="fg"><label>Valor efetivo (R$)</label><input id="ce-valor" type="number" step="0.01" value="${num(c.total)}">
       <span class="hint">Ajuste se o valor da nota diferiu do pedido.</span></div></div>
   <div class="fg"><label>Recebido por</label><input id="ce-rec" value="${esc(PERFIS[CU].nome||'')}"></div>
   <div class="card tw" style="margin-top:9px"><div class="bd"><table><thead><tr><th>Item</th><th class="c">Und</th><th class="r">Qtd</th></tr></thead><tbody>
     ${(c.itens||[]).map(i=>`<tr><td>${esc(i.desc)}</td><td class="c">${esc(i.und)}</td><td class="r n">${qtd(i.qtd,2)}</td></tr>`).join('')}
   </tbody></table></div></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="compraEntregarSave(${id})"><i class="ti ti-truck-delivery"></i>Confirmar entrega</button>`;
  modal('Registrar entrega — '+c.num,'ti-truck-delivery',b,f);
}
async function compraEntregarSave(id){
  const c = await dbGet('compras',id);
  const data = val('ce-data'), valor = num(val('ce-valor'));
  await dbPut('compras',{...c, status:'Entregue', dtEntrega:data, doc:val('ce-doc'),
    fornecedor:val('ce-forn'), recebidoPor:val('ce-rec'), total:valor});
  const obraC = await dbGet('obras',c.obraId);
  await finAdd({tipo:'despesa', un:'obras', refTipo:'obra', refId:c.obraId,
    refNome:(obraC?obraC.cod+' — '+obraC.nome:''), data, venc:data, dtPag:data, status:'Pago',
    desc:`Compra ${c.num} — ${(c.itens||[]).length} item(ns)`, etapa:c.etapa||'',
    cat:'Material de construção', valor, pessoa:val('ce-forn'), doc:val('ce-doc'),
    contaId:CFG.contaPadrao||null, auto:true, compraId:c.id, origem:'Entrega de compra '+c.num});
  for(const i of (c.itens||[])){
    await dbAdd('estoque',{obraId:c.obraId, data, tipo:'Entrada', cod:i.cod, desc:i.desc, und:i.und,
      qtd:num(i.qtd), vunit:num(i.vunit), origem:'Compra '+c.num});
  }
  closeModal('mk-form'); toast('Entrega registrada: custo lançado e estoque atualizado.'); matRender();
}
function compraDel(id){
  confirmar('Excluir requisição','A requisição será removida. Lançamentos de custo e movimentos de estoque já gerados por ela <b>não</b> serão apagados automaticamente.',
    async()=>{ await dbDel('compras',id); toast('Requisição removida.','aw'); matRender(); });
}

/* ---------------- Aba: estoque ---------------- */
async function matTabEstoque(o,mov){
  const body = document.getElementById('mat-body');
  const itens = estoqueItens(mov).sort((a,b)=>b.saldo*b.vunit - a.saldo*a.vunit);
  let h = `<div class="card"><div class="hd"><i class="ti ti-box"></i>Saldo de materiais no canteiro<span class="sp"></span>
    <button class="btn sm gh" onclick="estMovForm('Entrada')"><i class="ti ti-arrow-down-circle"></i>Entrada manual</button>
    <button class="btn sm" onclick="estMovForm('Saída')"><i class="ti ti-arrow-up-circle"></i>Registrar consumo</button></div><div class="bd">`;
  if(!itens.length){
    h += `<div class="empty"><i class="ti ti-box-off"></i><b>Estoque vazio</b>
      As entradas são criadas automaticamente ao registrar a entrega de uma compra. Registre as saídas conforme o material é consumido na obra.</div>`;
    h += `</div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Cód.</th><th>Material</th><th class="c">Und</th><th class="r">Entradas</th><th class="r">Saídas</th>
      <th class="r">Saldo</th><th class="r">V. médio</th><th class="r">Valor em estoque</th></tr></thead><tbody>`;
    itens.forEach(x=>{
      h += `<tr><td class="mono">${esc(x.cod)}</td><td>${esc(x.desc)}</td><td class="c">${esc(x.und)}</td>
        <td class="r n">${qtd(x.ent,2)}</td><td class="r n">${qtd(x.sai,2)}</td>
        <td class="r n"><b style="color:${x.saldo<0?'var(--red)':'var(--green)'}">${qtd(x.saldo,2)}</b></td>
        <td class="r n">${moeda(x.vunit)}</td><td class="r n"><b>${moeda(x.saldo*x.vunit)}</b></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="7">VALOR TOTAL EM ESTOQUE</td><td class="r n">${moeda(estoqueValor(mov))}</td></tr></tfoot></table></div></div>`;
  }
  // movimentações
  if(mov.length){
    h += `<div class="card tw"><div class="hd"><i class="ti ti-history"></i>Movimentações</div><div class="bd"><table>
      <thead><tr><th>Data</th><th class="c">Tipo</th><th>Material</th><th class="r">Qtd</th><th>Origem / destino</th><th class="c no-print"></th></tr></thead><tbody>`;
    mov.sort((a,b)=>String(b.data).localeCompare(String(a.data))).slice(0,40).forEach(m=>{
      h += `<tr><td class="n">${dbr(m.data)}</td>
        <td class="c"><span class="st ${m.tipo==='Entrada'?'s-ok':'s-wn'}">${esc(m.tipo)}</span></td>
        <td>${esc(m.desc)}</td><td class="r n">${qtd(m.qtd,2)} ${esc(m.und)}</td><td class="tt">${esc(m.origem||'—')}</td>
        <td class="c no-print"><button class="ib rd" onclick="estMovDel(${m.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  }
  body.innerHTML = h;
}

async function estMovForm(tipo){
  const o = await obraAtual();
  const insumos = (await dbGetAll('insumos')).sort((a,b)=>a.desc.localeCompare(b.desc));
  const mov = await dbByObra('estoque',o.id);
  const saldos = {}; estoqueItens(mov).forEach(x=>saldos[x.cod]=x.saldo);
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  const b = `<div class="fr2">
      <div class="fg"><label>Data</label><input id="em-data" type="date" value="${hoje()}"></div>
      <div class="fg"><label>Tipo</label><input id="em-tipo" value="${tipo}" readonly></div></div>
    <div class="fg"><label>Material</label><select id="em-ins" onchange="estMovInfo()">
      <option value="">— selecione —</option>
      ${insumos.map(i=>`<option value="${i.cod}">${esc(i.desc)} (${esc(i.und)})${saldos[i.cod]?' — saldo '+qtd(saldos[i.cod],2):''}</option>`).join('')}
    </select></div>
    <div id="em-info"></div>
    <div class="fr2">
      <div class="fg"><label>Quantidade</label><input id="em-qtd" type="number" step="0.01"></div>
      <div class="fg"><label>${tipo==='Saída'?'Etapa que consumiu':'Origem'}</label>
        ${tipo==='Saída'?`<select id="em-org"><option value="">— não informado —</option>${etapas.map(e=>`<option>${esc(e.nome)}</option>`).join('')}</select>`
                        :`<input id="em-org" placeholder="Ex.: doação, transferência de outra obra">`}</div></div>
    ${tipo==='Entrada'?`<div class="fg"><label>Valor unitário (R$)</label><input id="em-vu" type="number" step="0.01"></div>`:''}
    <div id="em-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="estMovSave('${tipo}')"><i class="ti ti-device-floppy"></i>Registrar</button>`;
  modal(tipo==='Entrada'?'Entrada manual em estoque':'Registrar consumo de material','ti-box',b,f,'sm');
  window.__SALDOS = saldos;
}
async function estMovInfo(){
  const cod = val('em-ins'); const s = (window.__SALDOS||{})[cod];
  document.getElementById('em-info').innerHTML = s!=null
    ? `<div class="al ai"><i class="ti ti-box"></i>Saldo atual no canteiro: <b>${qtd(s,2)}</b></div>` : '';
}
async function estMovSave(tipo){
  const o = await obraAtual();
  const cod = val('em-ins'), q = num(val('em-qtd'));
  if(!cod||q<=0){ document.getElementById('em-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Selecione o material e informe a quantidade.</div>`; return; }
  const ins = (await dbGetAll('insumos')).find(i=>i.cod===cod);
  await dbAdd('estoque',{obraId:o.id, data:val('em-data'), tipo, cod:ins.cod, desc:ins.desc, und:ins.und,
    qtd:q, vunit: tipo==='Entrada'?num(val('em-vu'))||num(ins.custo):num(ins.custo), origem:val('em-org')||(tipo==='Entrada'?'Entrada manual':'Consumo na obra')});
  closeModal('mk-form'); toast('Movimento registrado.'); matRender();
}
function estMovDel(id){
  confirmar('Excluir movimento','Remover este movimento de estoque?',async()=>{ await dbDel('estoque',id); toast('Movimento removido.','aw'); matRender(); });
}

/* ---------------- Aba: necessidade x comprado ---------------- */
async function matTabNecessidade(o){
  const body = document.getElementById('mat-body');
  const orc = await dbByObra('orcamento',o.id);
  const compras = (await dbByObra('compras',o.id)).filter(c=>c.status!=='Cancelado');
  const nec = {};
  orc.filter(x=>!['Mão de obra','Serviços'].includes(x.cat)).forEach(x=>{
    const k = x.cod;
    if(!nec[k]) nec[k] = {cod:x.cod,desc:x.desc,und:x.und,cat:x.cat,prev:0,vunit:num(x.vunit),comp:0,vcomp:0};
    nec[k].prev += num(x.qtd);
  });
  compras.forEach(c=>(c.itens||[]).forEach(i=>{
    if(!nec[i.cod]) nec[i.cod] = {cod:i.cod,desc:i.desc,und:i.und,cat:i.cat,prev:0,vunit:num(i.vunit),comp:0,vcomp:0};
    nec[i.cod].comp += num(i.qtd); nec[i.cod].vcomp += num(i.qtd)*num(i.vunit);
  }));
  const lista = Object.values(nec).filter(x=>x.prev>0||x.comp>0)
    .sort((a,b)=>(b.prev*b.vunit)-(a.prev*a.vunit));
  if(!lista.length){ body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-clipboard-off"></i>
    <b>Sem dados</b>Gere o orçamento da obra para comparar o previsto com o efetivamente comprado.</div></div></div>`; return; }
  let h = `<div class="al ai"><i class="ti ti-info-circle"></i><div>Compara a <b>quantidade prevista no orçamento</b> com o que já foi
    <b>requisitado/comprado</b>. Saldo negativo indica compra acima do orçado — investigue desperdício, retrabalho ou erro de quantitativo.</div></div>
   <div class="card tw"><div class="bd"><table>
    <thead><tr><th>Cód.</th><th>Material</th><th class="c">Und</th><th class="r">Previsto</th><th class="r">Comprado</th>
      <th class="r">Saldo a comprar</th><th class="c" style="min-width:110px">% comprado</th><th class="c">Situação</th><th class="c no-print"></th></tr></thead><tbody>`;
  lista.forEach(x=>{
    const saldo = x.prev - x.comp;
    const p = x.prev? x.comp/x.prev*100 : 100;
    const st = x.prev===0 ? ['s-pu','Fora do orçamento'] : p>110 ? ['s-bl','Acima do previsto'] : p>=99 ? ['s-ok','Completo'] : p>0 ? ['s-pd','Parcial'] : ['s-nt','A comprar'];
    h += `<tr><td class="mono">${esc(x.cod)}</td><td>${esc(x.desc)}</td><td class="c">${esc(x.und)}</td>
      <td class="r n">${qtd(x.prev,2)}</td><td class="r n">${qtd(x.comp,2)}</td>
      <td class="r n"><b style="color:${saldo<0?'var(--red)':'var(--text)'}">${qtd(saldo,2)}</b></td>
      <td><div class="prow"><div class="pb" style="flex:1"><div class="pf ${p>110?'rd':p>=99?'gn':'am'}" style="width:${clamp(p,0,100)}%"></div></div><span>${qtd(p,0)}%</span></div></td>
      <td class="c"><span class="st ${st[0]}">${st[1]}</span></td>
      <td class="c no-print">${saldo>0?`<button class="ib bl" title="Requisitar saldo" onclick="reqRapida('${esc(x.cod)}',${saldo.toFixed(2)})"><i class="ti ti-shopping-cart-plus"></i></button>`:''}</td></tr>`;
  });
  h += `</tbody></table></div></div>`;
  body.innerHTML = h;
}
async function reqRapida(cod,q){
  await compraForm();
  setTimeout(async()=>{
    const s = document.getElementById('ci-ins'); if(s){ s.value = cod; setVal('ci-qtd',q); await cartAdd(); }
  },120);
}

/* ---------------- Impressão da requisição ---------------- */
async function printCompra(id){
  const c = await dbGet('compras',id);
  const o = await dbGet('obras',c.obraId);
  const titulo = c.status==='Entregue' ? 'Comprovante de Entrega de Materiais'
               : c.status==='Pedido emitido' ? 'Pedido de Compra' : 'Solicitação de Compra de Materiais';
  let h = prnHead(titulo, c.num + ' — emitida em ' + dbr(c.data));
  h += prnObraInfo(o);
  h += `<div class="pinf"><div><span>Etapa de destino:</span> <b>${esc(c.etapa||'Geral')}</b></div>
    <div><span>Fornecedor:</span> <b>${esc(c.fornecedor||'a definir')}</b></div>
    <div><span>Situação:</span> <b>${esc(c.status)}</b></div>
    <div><span>Solicitante:</span> <b>${esc(c.solicitante||'—')}</b></div>
    <div><span>Previsão de entrega:</span> <b>${dbr(c.prevEntrega)}</b></div>
    <div><span>Documento:</span> <b>${esc(c.doc||'—')}</b></div></div>`;
  h += `<div class="psec">Itens solicitados</div>
    <table><thead><tr><th>Item</th><th>Cód.</th><th>Descrição</th><th>Und</th><th>Qtd</th><th>V. Unit.</th><th>Total</th></tr></thead><tbody>`;
  (c.itens||[]).forEach((i,ix)=>{ h += `<tr><td>${ix+1}</td><td>${esc(i.cod)}</td><td>${esc(i.desc)}</td><td>${esc(i.und)}</td>
    <td style="text-align:right">${qtd(i.qtd,2)}</td><td style="text-align:right">${moeda(i.vunit)}</td>
    <td style="text-align:right">${moeda(num(i.qtd)*num(i.vunit))}</td></tr>`; });
  h += `</tbody><tfoot><tr><td colspan="6">TOTAL</td><td style="text-align:right">${moeda(c.total)}</td></tr></tfoot></table>`;
  if((c.cotacoes||[]).length){
    h += `<div class="psec">Cotações recebidas</div><table><thead><tr><th>Fornecedor</th><th>Valor</th><th>Prazo</th><th>Pagamento</th><th>Escolhida</th></tr></thead><tbody>`;
    c.cotacoes.forEach(k=>{ h += `<tr><td>${esc(k.fornecedor)}</td><td style="text-align:right">${moeda(k.valor)}</td>
      <td>${esc(k.prazo||'—')}</td><td>${esc(k.cond||'—')}</td><td style="text-align:center">${k.escolhida?'SIM':''}</td></tr>`; });
    h += `</tbody></table>`;
  }
  if(c.obs) h += `<div class="psec">Observações</div><div style="font-size:9.5px;padding:6px 2px">${esc(c.obs)}</div>`;
  h += prnSig(c.solicitante||'Solicitante','Responsável pela obra',
              c.status==='Entregue'?(c.recebidoPor||'Recebedor'):'Autorização', c.status==='Entregue'?'Recebi os materiais acima':'Gestor / Proprietário');
  h += prnFoot();
  printar(h);
}

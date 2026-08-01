/* =========================================================================
   NEGÓCIOS: PRODUTOS FÍSICOS E INFOPRODUTOS (mesmo módulo, contextos diferentes)
   ========================================================================= */
let PRD_TAB = {produtos:'cat', info:'cat'};
function prdStab(un,t){ PRD_TAB[un] = t; un==='info'?infoRender():produtosRender(); }
async function produtosRender(){ return prodRender('produtos'); }
async function infoRender(){ return prodRender('info'); }
const ehInfo = un => un==='info';

async function prodRender(un){
  const root = document.getElementById(un+'-root');
  await finLoad();
  const U = unInfo(un);
  const todos = await dbGetAll('produtos');
  const prods = todos.filter(p=> ehInfo(un) ? p.tipo==='Infoproduto' : p.tipo!=='Infoproduto');
  const vendas = (await dbGetAll('vendas')).filter(v=>v.un===un);
  const mk = mesAtual();
  const doMes = vendas.filter(v=>String(v.data).slice(0,7)===mk && v.status!=='Cancelada');
  const fatMes = doMes.reduce((s,v)=>s+num(v.total),0);
  const custoMes = doMes.reduce((s,v)=>s+num(v.custo)+num(v.taxa),0);
  const estoqueValor = prods.reduce((s,p)=>s+num(p.estoque)*num(p.custo),0);
  const semEstoque = prods.filter(p=>!ehInfo(un) && num(p.estoque)<=num(p.estoqueMin));
  const rec12 = FIN.filter(l=>finVale(l)&&l.un===un&&l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const des12 = FIN.filter(l=>finVale(l)&&l.un===un&&l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
  const tab = PRD_TAB[un];

  let h = `<div class="ph"><div class="ic" style="background:${U.bg};color:${U.cor}"><i class="ti ${U.ic}"></i></div>
    <div><h1>${esc(U.nome)}</h1><p>${ehInfo(un)?'Cursos, e-books e materiais digitais por plataforma':'Catálogo, estoque, pedidos e margem'}</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="vendaForm(null,'${un}')"><i class="ti ti-shopping-cart-plus"></i>Nova venda</button>
    <button class="btn" style="background:${U.cor}" onclick="prodForm(null,'${un}')"><i class="ti ti-plus"></i>${ehInfo(un)?'Novo infoproduto':'Novo produto'}</button></div>`;

  h += `<div class="kg" style="margin-bottom:16px">
    <div class="kc br"><div class="lb"><i class="ti ${U.ic}"></i>${ehInfo(un)?'Infoprodutos':'Produtos'}</div>
      <div class="vl">${prods.length}</div><div class="sb">${prods.filter(p=>p.ativo!==false).length} ativo(s)</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-receipt"></i>Faturamento do mês</div><div class="vl">${moedaK(fatMes)}</div>
      <div class="sb">${doMes.length} venda(s) em ${dmesL(mk)}</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-percentage"></i>${ehInfo(un)?'Taxas e custos':'Custo das vendas'}</div>
      <div class="vl">${moedaK(custoMes)}</div>
      <div class="sb">${fatMes?pct(custoMes/fatMes*100)+' do faturamento':'—'}</div></div>
    <div class="kc tl"><div class="lb"><i class="ti ti-report-money"></i>Margem do mês</div><div class="vl">${moedaK(fatMes-custoMes)}</div>
      <div class="sb">${fatMes?pct((fatMes-custoMes)/fatMes*100)+' de margem':'—'}</div></div>
    ${ehInfo(un)
      ? `<div class="kc pu"><div class="lb"><i class="ti ti-sum"></i>Faturamento acumulado</div><div class="vl">${moedaK(rec12)}</div>
          <div class="sb">desde o início</div></div>
         <div class="kc gd"><div class="lb"><i class="ti ti-trophy"></i>Resultado acumulado</div><div class="vl">${moedaK(rec12-des12)}</div>
          <div class="sb">receitas menos custos e tráfego</div></div>`
      : `<div class="kc pu"><div class="lb"><i class="ti ti-box"></i>Valor em estoque</div><div class="vl">${moedaK(estoqueValor)}</div>
          <div class="sb">${prods.reduce((s,p)=>s+num(p.estoque),0).toLocaleString('pt-BR')} unidade(s)</div></div>
         <div class="kc ${semEstoque.length?'rd':'gn'}"><div class="lb"><i class="ti ti-alert-triangle"></i>Estoque baixo</div>
          <div class="vl">${semEstoque.length}</div><div class="sb">produto(s) para repor</div></div>`}
  </div>`;

  if(semEstoque.length && tab==='cat'){
    h += `<div class="al aw"><i class="ti ti-alert-triangle"></i><div><b>Repor estoque:</b>
      ${semEstoque.map(p=>`${esc(p.nome)} (${qtd(p.estoque,0)} ${esc(p.und||'un')})`).join(' · ')}</div></div>`;
  }

  h += `<div class="tabs">
    <button class="tab ${tab==='cat'?'on':''}" onclick="prdStab('${un}','cat')"><i class="ti ti-list"></i>${ehInfo(un)?'Infoprodutos':'Catálogo e estoque'}</button>
    <button class="tab ${tab==='ven'?'on':''}" onclick="prdStab('${un}','ven')"><i class="ti ti-shopping-cart"></i>Vendas</button>
    <button class="tab ${tab==='ana'?'on':''}" onclick="prdStab('${un}','ana')"><i class="ti ti-chart-bar"></i>Desempenho</button>
  </div><div id="prd-body-${un}"></div>`;
  root.innerHTML = h;

  if(tab==='cat') await prodTabCatalogo(un,prods,vendas);
  if(tab==='ven') await prodTabVendas(un,prods,vendas);
  if(tab==='ana') await prodTabAnalise(un,prods,vendas);
}

async function prodTabCatalogo(un,prods,vendas){
  const body = document.getElementById('prd-body-'+un);
  const U = unInfo(un);
  if(!prods.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-package-off"></i>
      <b>Nenhum ${ehInfo(un)?'infoproduto':'produto'} cadastrado</b>
      ${ehInfo(un)?'Cadastre cursos, e-books, mentorias e planilhas com o preço e a plataforma de venda.'
                  :'Cadastre os produtos com preço de venda, custo e quantidade em estoque.'}
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" style="background:${U.cor}" onclick="prodForm(null,'${un}')"><i class="ti ti-plus"></i>Cadastrar</button></div></div></div></div>`;
    return;
  }
  let h = `<div class="card tw"><div class="bd"><table>
    <thead><tr><th>${ehInfo(un)?'Infoproduto':'Produto'}</th><th>Categoria</th>
    ${ehInfo(un)?'<th>Plataforma</th>':'<th class="c">Estoque</th>'}
    <th class="r">Custo</th><th class="r">Preço</th><th class="r">Margem</th><th class="r">Vendidos</th>
    <th class="r">Faturamento</th><th class="c no-print"></th></tr></thead><tbody>`;
  prods.sort((a,b)=>String(a.nome).localeCompare(String(b.nome))).forEach(p=>{
    const vs = vendas.filter(v=>Number(v.produtoId)===Number(p.id) && v.status!=='Cancelada');
    const qv = vs.reduce((s,v)=>s+num(v.qtd),0);
    const fat = vs.reduce((s,v)=>s+num(v.total),0);
    const marg = num(p.preco)? (num(p.preco)-num(p.custo))/num(p.preco)*100 : 0;
    const baixo = !ehInfo(un) && num(p.estoque)<=num(p.estoqueMin);
    h += `<tr><td><b>${esc(p.nome)}</b>${p.sku?`<br><span class="tt mono">${esc(p.sku)}</span>`:''}
        ${p.ativo===false?'<span class="st s-nt">inativo</span>':''}</td>
      <td class="tt">${esc(p.cat||'—')}</td>
      ${ehInfo(un)?`<td class="tt">${esc(p.plataforma||'—')}</td>`
        :`<td class="c n"><b style="color:${baixo?'var(--red)':'var(--text)'}">${qtd(p.estoque,0)}</b>
           <span class="tt">${esc(p.und||'un')}</span></td>`}
      <td class="r n">${moeda(p.custo)}</td><td class="r n"><b>${moeda(p.preco)}</b></td>
      <td class="r n" style="color:${marg>=30?'var(--green)':marg>=10?'var(--amber)':'var(--red)'}">${pct(marg)}</td>
      <td class="r n">${qtd(qv,0)}</td><td class="r n">${moeda(fat)}</td>
      <td class="c no-print nowrap">
        ${!ehInfo(un)?`<button class="ib gn" title="Entrada em estoque" onclick="prodEstoque(${p.id})"><i class="ti ti-package-import"></i></button>`:''}
        <button class="ib bl" title="Vender" onclick="vendaForm(null,'${un}',${p.id})"><i class="ti ti-shopping-cart"></i></button>
        <button class="ib" onclick="prodForm(${p.id},'${un}')"><i class="ti ti-edit"></i></button>
        <button class="ib rd" onclick="prodDel(${p.id},'${un}')"><i class="ti ti-trash"></i></button></td></tr>`;
  });
  h += `</tbody></table></div></div>`;
  body.innerHTML = h;
}
async function prodForm(id,un){
  const p = id ? await dbGet('produtos',id) : null;
  const info = ehInfo(un);
  const b = `<input type="hidden" id="pr-un" value="${un}">
    <div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Nome <span class="rq">*</span></label>
        <input id="pr-nome" value="${esc(p?p.nome:'')}" placeholder="${info?'Ex.: Curso de gestão de obras':'Ex.: Mel silvestre 500 g'}"></div>
      <div class="fg"><label>Código / SKU</label><input id="pr-sku" value="${esc(p?p.sku:'')}"></div></div>
    <div class="fr3">
      <div class="fg"><label>Tipo</label><select id="pr-tipo">
        ${TIPOS_PRODUTO.filter(t=>info?t==='Infoproduto'||t==='Assinatura'||t==='Serviço':t!=='Infoproduto')
          .map(t=>`<option ${p&&p.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="fg"><label>Categoria</label><select id="pr-cat">${CAT_PRODUTO.map(c=>`<option ${p&&p.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="fg"><label>Plataforma principal</label><select id="pr-plat">${PLATAFORMAS.map(c=>`<option ${p&&p.plataforma===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
    <div class="fr4">
      <div class="fg"><label>Preço de venda (R$) <span class="rq">*</span></label><input id="pr-preco" type="number" step="0.01" value="${p?p.preco:''}" oninput="prodMargem()"></div>
      <div class="fg"><label>${info?'Custo por venda (R$)':'Custo unitário (R$)'}</label><input id="pr-custo" type="number" step="0.01" value="${p?p.custo:''}" oninput="prodMargem()"></div>
      <div class="fg"><label>Margem</label><input id="pr-marg" readonly value="—"></div>
      <div class="fg"><label>Taxa da plataforma (%)</label><input id="pr-taxa" type="number" step="0.01" value="${p?p.taxaPerc:(info?10:0)}"></div></div>
    ${info?'':`<div class="fr3">
      <div class="fg"><label>Estoque atual</label><input id="pr-est" type="number" step="0.01" value="${p?p.estoque:0}"></div>
      <div class="fg"><label>Estoque mínimo</label><input id="pr-estmin" type="number" step="0.01" value="${p?p.estoqueMin:0}"></div>
      <div class="fg"><label>Unidade</label><select id="pr-und">
        ${['un','kg','g','L','ml','caixa','dúzia','pacote','m'].map(u=>`<option ${p&&p.und===u?'selected':''}>${u}</option>`).join('')}</select></div></div>`}
    <div class="fr2">
      <div class="fg"><label>Link de venda</label><input id="pr-link" value="${esc(p?p.link:'')}" placeholder="https://"></div>
      <div class="fg"><label style="display:flex;gap:8px;align-items:center;margin-top:22px;cursor:pointer">
        <input type="checkbox" id="pr-ativo" ${!p||p.ativo!==false?'checked':''} style="width:16px;height:16px">Produto ativo</label></div></div>
    <div class="fg"><label>Descrição / observações</label><textarea id="pr-obs">${esc(p?p.obs:'')}</textarea></div>
    <div id="pr-err"></div>`;
  modal(id?'Editar':(info?'Novo infoproduto':'Novo produto'), info?'ti-device-laptop':'ti-shopping-bag', b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="prodSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
  prodMargem();
}
function prodMargem(){
  const p = num(val('pr-preco')), c = num(val('pr-custo'));
  setVal('pr-marg', p? pct((p-c)/p*100) : '—');
}
async function prodSave(id){
  const nome = val('pr-nome'), preco = num(val('pr-preco'));
  if(!nome||preco<=0){ document.getElementById('pr-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome e o preço de venda.</div>`; return; }
  const un = val('pr-un');
  const d = {nome, sku:val('pr-sku'), tipo:val('pr-tipo'), cat:val('pr-cat'), plataforma:val('pr-plat'),
             preco, custo:num(val('pr-custo')), taxaPerc:num(val('pr-taxa')),
             estoque:num(val('pr-est')), estoqueMin:num(val('pr-estmin')), und:val('pr-und')||'un',
             link:val('pr-link'), ativo:chk('pr-ativo'), obs:val('pr-obs'), un};
  if(id){ const old = await dbGet('produtos',id); await dbPut('produtos',{...old,...d}); }
  else await dbAdd('produtos',d);
  closeModal('mk-form'); toast('Salvo.'); un==='info'?infoRender():produtosRender();
}
function prodDel(id,un){
  confirmar('Excluir','O histórico de vendas é mantido.',
    async()=>{ await dbDel('produtos',id); toast('Removido.','aw'); un==='info'?infoRender():produtosRender(); });
}
async function prodEstoque(id){
  const p = await dbGet('produtos',id);
  const b = `<div class="al ai"><i class="ti ti-package"></i><div><b>${esc(p.nome)}</b> — estoque atual:
      <b>${qtd(p.estoque,0)} ${esc(p.und||'un')}</b></div></div>
    <div class="fr3">
      <div class="fg"><label>Movimento</label><select id="pe-tipo"><option value="entrada">Entrada (compra/produção)</option>
        <option value="saida">Saída (perda/uso próprio)</option><option value="ajuste">Ajuste de inventário</option></select></div>
      <div class="fg"><label>Quantidade</label><input id="pe-qtd" type="number" step="0.01"></div>
      <div class="fg"><label>Custo total (R$)</label><input id="pe-valor" type="number" step="0.01">
        <span class="hint">Só para entradas — vira despesa.</span></div></div>
    <div class="fr2">
      <div class="fg"><label>Data</label><input id="pe-data" type="date" value="${hoje()}"></div>
      <div class="fg"><label>Fornecedor / origem</label><input id="pe-forn"></div></div>
    <div class="fg"><label>Observação</label><input id="pe-obs"></div>`;
  modal('Movimentar estoque','ti-package',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="prodEstoqueSave(${id})"><i class="ti ti-check"></i>Registrar</button>`,'sm');
}
async function prodEstoqueSave(id){
  const p = await dbGet('produtos',id);
  const t = val('pe-tipo'), q = num(val('pe-qtd')), v = num(val('pe-valor'));
  if(q<=0){ toast('Informe a quantidade.','ae'); return; }
  let novo = num(p.estoque);
  if(t==='entrada') novo += q; else if(t==='saida') novo -= q; else novo = q;
  await dbPut('produtos',{...p, estoque:novo, custo: (t==='entrada'&&v>0)? +(v/q).toFixed(2) : num(p.custo)});
  if(t==='entrada' && v>0){
    await finAdd({tipo:'despesa', un:p.un||'produtos', refTipo:'produto', refId:id, refNome:p.nome,
      desc:`Compra de estoque — ${p.nome} (${qtd(q,0)} ${p.und||'un'})`, valor:v,
      cat:'Custo do produto vendido', data:val('pe-data'), venc:val('pe-data'), dtPag:val('pe-data'),
      status:'Pago', pessoa:val('pe-forn'), contaId:CFG.contaPadrao||null, auto:true, origem:'Entrada de estoque'});
  }
  closeModal('mk-form'); toast('Estoque atualizado.');
  (p.un==='info')?infoRender():produtosRender();
}

/* ---------------- Vendas ---------------- */
async function prodTabVendas(un,prods,vendas){
  const body = document.getElementById('prd-body-'+un);
  const mapP = {}; prods.forEach(p=>mapP[p.id]=p);
  const lista = vendas.sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  let h = `<div class="card"><div class="hd"><i class="ti ti-shopping-cart"></i>Vendas registradas<span class="sp"></span>
    <button class="btn sm gn" onclick="vendaForm(null,'${un}')"><i class="ti ti-plus"></i>Nova venda</button></div><div class="bd">`;
  if(!lista.length){
    h += `<div class="empty"><i class="ti ti-shopping-cart-off"></i><b>Nenhuma venda registrada</b>
      Cada venda registrada gera a receita no financeiro${ehInfo(un)?', desconta a taxa da plataforma':' e baixa o estoque'} automaticamente.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Data</th><th>${ehInfo(un)?'Infoproduto':'Produto'}</th><th>Cliente</th><th>Plataforma</th>
      <th class="r">Qtd</th><th class="r">Bruto</th><th class="r">Taxas</th><th class="r">Líquido</th>
      <th class="c">Situação</th><th class="c no-print"></th></tr></thead><tbody>`;
    lista.slice(0,200).forEach(v=>{
      h += `<tr><td class="n">${dbr(v.data)}</td>
        <td><b>${esc(mapP[v.produtoId]?mapP[v.produtoId].nome:(v.produto||'—'))}</b></td>
        <td class="tt">${esc(v.cliente||'—')}</td><td class="tt">${esc(v.plataforma||'—')}</td>
        <td class="r n">${qtd(v.qtd,0)}</td><td class="r n">${moeda(v.total)}</td>
        <td class="r n" style="color:var(--red)">${moeda(num(v.taxa)+num(v.custo))}</td>
        <td class="r n"><b style="color:var(--green)">${moeda(num(v.total)-num(v.taxa)-num(v.custo))}</b></td>
        <td class="c"><span class="st ${ST_VENDA[v.status]||'s-nt'}">${esc(v.status)}</span></td>
        <td class="c no-print nowrap"><button class="ib bl" onclick="vendaForm(${v.id},'${un}')"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="vendaDel(${v.id},'${un}')"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    const tb = lista.filter(v=>v.status!=='Cancelada').reduce((s,v)=>s+num(v.total),0);
    const tt = lista.filter(v=>v.status!=='Cancelada').reduce((s,v)=>s+num(v.taxa)+num(v.custo),0);
    h += `</tbody><tfoot><tr><td colspan="5">TOTAL — ${lista.length} venda(s)</td>
      <td class="r n">${moeda(tb)}</td><td class="r n">${moeda(tt)}</td><td class="r n">${moeda(tb-tt)}</td>
      <td colspan="2"></td></tr></tfoot></table></div></div>`;
  }
  body.innerHTML = h;
}
async function vendaForm(id,un,produtoId){
  const v = id ? await dbGet('vendas',id) : null;
  un = v?v.un:un;
  const prods = (await dbGetAll('produtos')).filter(p=> ehInfo(un)? p.tipo==='Infoproduto' : p.tipo!=='Infoproduto');
  if(!prods.length){ toast('Cadastre um produto antes de registrar a venda.','aw'); prodForm(null,un); return; }
  const pessoas = await dbGetAll('pessoas');
  const b = `<input type="hidden" id="vd-un" value="${un}">
    <div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>${ehInfo(un)?'Infoproduto':'Produto'} <span class="rq">*</span></label>
        <select id="vd-prod" onchange="vendaPreencher()">
          ${prods.map(p=>`<option value="${p.id}" ${((v&&Number(v.produtoId)===Number(p.id))||Number(produtoId)===Number(p.id))?'selected':''}>
            ${esc(p.nome)} — ${moeda(p.preco)}${!ehInfo(un)?` (estoque ${qtd(p.estoque,0)})`:''}</option>`).join('')}</select></div>
      <div class="fg"><label>Data</label><input id="vd-data" type="date" value="${v?v.data:hoje()}"></div></div>
    <div class="fr4">
      <div class="fg"><label>Quantidade</label><input id="vd-qtd" type="number" step="0.01" value="${v?v.qtd:1}" oninput="vendaCalc()"></div>
      <div class="fg"><label>Preço unitário (R$)</label><input id="vd-preco" type="number" step="0.01" value="${v?v.preco:''}" oninput="vendaCalc()"></div>
      <div class="fg"><label>Desconto (R$)</label><input id="vd-desc" type="number" step="0.01" value="${v?v.desconto:0}" oninput="vendaCalc()"></div>
      <div class="fg"><label>Total bruto</label><input id="vd-total" readonly value="R$ 0,00"></div></div>
    <div class="fr4">
      <div class="fg"><label>Taxa da plataforma (%)</label><input id="vd-taxap" type="number" step="0.01" value="${v?v.taxaPerc:0}" oninput="vendaCalc()"></div>
      <div class="fg"><label>Taxa em R$</label><input id="vd-taxa" readonly value="R$ 0,00"></div>
      <div class="fg"><label>Custo do produto (R$)</label><input id="vd-custo" type="number" step="0.01" value="${v?v.custo:''}" oninput="vendaCalc()"></div>
      <div class="fg"><label>Líquido</label><input id="vd-liq" readonly value="R$ 0,00"></div></div>
    <div class="fr3">
      <div class="fg"><label>Cliente</label><input id="vd-cli" list="vd-cl" value="${esc(v?v.cliente:'')}">
        <datalist id="vd-cl">${pessoas.map(p=>`<option value="${esc(p.nome)}">`).join('')}</datalist></div>
      <div class="fg"><label>Plataforma / canal</label><select id="vd-plat">${PLATAFORMAS.map(p=>`<option ${v&&v.plataforma===p?'selected':''}>${p}</option>`).join('')}</select></div>
      <div class="fg"><label>Situação</label><select id="vd-status">${Object.keys(ST_VENDA).map(s=>`<option ${v&&v.status===s?'selected':(!v&&s==='Paga'?'selected':'')}>${s}</option>`).join('')}</select></div></div>
    <div class="fg"><label>Observações</label><input id="vd-obs" value="${esc(v?v.obs:'')}"></div>
    <div id="vd-res" class="al ag"></div><div id="vd-err"></div>`;
  modal(id?'Editar venda':'Registrar venda','ti-shopping-cart',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="vendaSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
  if(!v) vendaPreencher(); else vendaCalc();
}
async function vendaPreencher(){
  const p = await dbGet('produtos',val('vd-prod'));
  if(!p) return;
  setVal('vd-preco',p.preco); setVal('vd-custo',p.custo); setVal('vd-taxap',p.taxaPerc||0);
  const s = document.getElementById('vd-plat'); if(s && p.plataforma) s.value = p.plataforma;
  vendaCalc();
}
function vendaCalc(){
  const q = num(val('vd-qtd')), pr = num(val('vd-preco')), d = num(val('vd-desc'));
  const total = Math.max(q*pr - d, 0);
  const taxa = total*num(val('vd-taxap'))/100;
  const custo = num(val('vd-custo'))*q;
  setVal('vd-total',moeda(total)); setVal('vd-taxa',moeda(taxa)); setVal('vd-liq',moeda(total-taxa-custo));
  const box = document.getElementById('vd-res');
  if(box) box.innerHTML = `<i class="ti ti-calculator"></i><div>Bruto <b>${moeda(total)}</b> −
    taxas <b>${moeda(taxa)}</b> − custo <b>${moeda(custo)}</b> =
    <b style="color:${total-taxa-custo>=0?'var(--green)':'var(--red)'}">${moeda(total-taxa-custo)}</b>
    ${total?` · margem <b>${pct((total-taxa-custo)/total*100)}</b>`:''}</div>`;
}
async function vendaSave(id){
  const un = val('vd-un');
  const p = await dbGet('produtos',val('vd-prod'));
  const q = num(val('vd-qtd')), pr = num(val('vd-preco')), d = num(val('vd-desc'));
  const total = Math.max(q*pr-d,0);
  if(!p || q<=0 || total<=0){ document.getElementById('vd-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Verifique produto, quantidade e preço.</div>`; return; }
  const taxa = total*num(val('vd-taxap'))/100;
  const custo = num(val('vd-custo'))*q;
  const dados = {un, produtoId:p.id, produto:p.nome, data:val('vd-data'), qtd:q, preco:pr, desconto:d,
                 total, taxaPerc:num(val('vd-taxap')), taxa, custo, cliente:val('vd-cli'),
                 plataforma:val('vd-plat'), status:val('vd-status'), obs:val('vd-obs')};
  if(id){
    const old = await dbGet('vendas',id);
    await dbPut('vendas',{...old,...dados});
    const lan = FIN.find(l=>Number(l.vendaId)===Number(id) && l.tipo==='receita');
    if(lan) await dbPut('financeiro',{...lan, valor:total, data:dados.data, desc:`Venda — ${p.nome}`, pessoa:dados.cliente});
    await finLoad();
  }else{
    const vid = await dbAdd('vendas',dados);
    const pago = ['Paga','Entregue'].includes(dados.status);
    await finAdd({tipo:'receita', un, refTipo:'produto', refId:p.id, refNome:p.nome,
      desc:`Venda — ${p.nome}${q>1?` (${qtd(q,0)} un)`:''}`, valor:total,
      cat: ehInfo(un)?'Venda de infoproduto':'Venda de produtos', data:dados.data, venc:dados.data,
      status: pago?'Pago':'Pendente', dtPag: pago?dados.data:'', pessoa:dados.cliente,
      contaId:CFG.contaPadrao||null, vendaId:vid, auto:true, origem:'Venda registrada'});
    if(taxa>0) await finAdd({tipo:'despesa', un, refTipo:'produto', refId:p.id, refNome:p.nome,
      desc:`Taxa ${dados.plataforma} — ${p.nome}`, valor:taxa, cat:'Comissões pagas',
      data:dados.data, venc:dados.data, dtPag:dados.data, status:'Pago',
      contaId:CFG.contaPadrao||null, vendaId:vid, auto:true, origem:'Taxa de plataforma'});
    if(!ehInfo(un) && custo>0) await finAdd({tipo:'despesa', un, refTipo:'produto', refId:p.id, refNome:p.nome,
      desc:`Custo do produto vendido — ${p.nome}`, valor:custo, cat:'Custo do produto vendido',
      data:dados.data, venc:dados.data, dtPag:dados.data, status:'Pago',
      contaId:CFG.contaPadrao||null, vendaId:vid, auto:true, origem:'CPV da venda'});
    if(!ehInfo(un)) await dbPut('produtos',{...p, estoque:num(p.estoque)-q});
  }
  closeModal('mk-form'); toast('Venda registrada.');
  un==='info'?infoRender():produtosRender();
}
function vendaDel(id,un){
  confirmar('Excluir venda','Os lançamentos financeiros gerados por ela também serão removidos.',async()=>{
    await finLoad();
    for(const l of FIN.filter(x=>Number(x.vendaId)===Number(id))) await dbDel('financeiro',l.id);
    const v = await dbGet('vendas',id);
    if(v && !ehInfo(v.un)){
      const p = await dbGet('produtos',v.produtoId);
      if(p) await dbPut('produtos',{...p, estoque:num(p.estoque)+num(v.qtd)});
    }
    await dbDel('vendas',id); await finLoad();
    toast('Venda removida.','aw');
    un==='info'?infoRender():produtosRender();
  });
}

/* ---------------- Desempenho ---------------- */
async function prodTabAnalise(un,prods,vendas){
  const body = document.getElementById('prd-body-'+un);
  const ativas = vendas.filter(v=>v.status!=='Cancelada');
  if(!ativas.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-chart-bar"></i>
      <b>Sem vendas para analisar</b>Registre vendas para ver o que mais vende e o que dá mais margem.</div></div></div>`;
    return;
  }
  const PAL = ['#B0842B','#7B3FA0','#1F5FA8','#2E7D32','#C0392B','#0E6E70','#B4531F','#5B6260','#4B4FA3','#8A5108'];
  const porProd = {}, porPlat = {}, porMes = {};
  ativas.forEach(v=>{
    const k = v.produto||'—';
    if(!porProd[k]) porProd[k] = {fat:0,qtd:0,liq:0};
    porProd[k].fat += num(v.total); porProd[k].qtd += num(v.qtd);
    porProd[k].liq += num(v.total)-num(v.taxa)-num(v.custo);
    porPlat[v.plataforma||'—'] = (porPlat[v.plataforma||'—']||0)+num(v.total);
    porMes[String(v.data).slice(0,7)] = (porMes[String(v.data).slice(0,7)]||0)+num(v.total);
  });
  const meses = Object.keys(porMes).sort();
  const tot = ativas.reduce((s,v)=>s+num(v.total),0);
  const liq = ativas.reduce((s,v)=>s+num(v.total)-num(v.taxa)-num(v.custo),0);
  const ticket = tot/ativas.length;

  let h = `<div class="kg" style="margin-bottom:14px">
    <div class="kc br"><div class="lb"><i class="ti ti-receipt"></i>Faturamento total</div><div class="vl">${moedaK(tot)}</div>
      <div class="sb">${ativas.length} venda(s)</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-cash"></i>Líquido</div><div class="vl">${moedaK(liq)}</div>
      <div class="sb">${pct(liq/tot*100)} de margem média</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-ticket"></i>Ticket médio</div><div class="vl">${moedaK(ticket)}</div>
      <div class="sb">por venda</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-package"></i>Unidades vendidas</div>
      <div class="vl">${qtd(ativas.reduce((s,v)=>s+num(v.qtd),0),0)}</div><div class="sb">no total</div></div>
  </div>
  <div class="chg">
    <div class="card"><div class="hd"><i class="ti ti-chart-line"></i>Faturamento por mês</div><div class="bd">
      ${lineChart([{name:'Faturamento',pts:meses.map(m=>porMes[m]),color:unInfo(un).cor,area:true}],
        meses.map(m=>dmes(m+'-01')),{money:true,h:220})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>Vendas por plataforma</div><div class="bd">
      ${donutChart(Object.entries(porPlat).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,val:v,color:PAL[i%PAL.length]})),
        {centerLabel:'FATURAMENTO',centerVal:moedaK(tot)})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-trophy"></i>Mais vendidos (faturamento)</div><div class="bd">
      ${hbarChart(Object.entries(porProd).sort((a,b)=>b[1].fat-a[1].fat).slice(0,10)
        .map(([k,v],i)=>({label:k,val:v.fat,color:PAL[i%PAL.length]})))}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-coin"></i>Quem deixa mais dinheiro no bolso</div><div class="bd">
      ${hbarChart(Object.entries(porProd).sort((a,b)=>b[1].liq-a[1].liq).slice(0,10)
        .map(([k,v])=>({label:k,val:v.liq,color:v.liq>=0?'#1F7A44':'#A8291F'})))}</div></div>
  </div>
  <div class="card tw"><div class="hd"><i class="ti ti-table"></i>Detalhamento por produto</div><div class="bd"><table>
    <thead><tr><th>Produto</th><th class="r">Qtd vendida</th><th class="r">Faturamento</th><th class="r">Líquido</th>
    <th class="r">Margem</th><th class="r">% do faturamento</th></tr></thead><tbody>
    ${Object.entries(porProd).sort((a,b)=>b[1].fat-a[1].fat).map(([k,v])=>`<tr>
      <td><b>${esc(k)}</b></td><td class="r n">${qtd(v.qtd,0)}</td><td class="r n">${moeda(v.fat)}</td>
      <td class="r n"><b style="color:${v.liq>=0?'var(--green)':'var(--red)'}">${moeda(v.liq)}</b></td>
      <td class="r n">${v.fat?pct(v.liq/v.fat*100):'—'}</td><td class="r n">${pct(v.fat/tot*100)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  body.innerHTML = h;
}

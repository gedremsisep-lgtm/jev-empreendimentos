/* =========================================================================
   MÓDULO FINANCEIRO — o coração do sistema
   Todas as unidades de negócio lançam receitas e despesas aqui.
   ========================================================================= */
let FIN_TAB = 'vis';
let FIN_MES = '';
let FIN_FILTRO = {un:'',cat:'',tipo:'',status:'',busca:''};

async function finLoad(){ FIN = await dbGetAll('financeiro'); return FIN; }

/* Lança um movimento financeiro a partir de qualquer módulo */
async function finAdd(d){
  const reg = {tipo:'despesa', status:'Pendente', data:hoje(), venc:d.venc||d.data||hoje(),
               un:'geral', refTipo:'', refId:null, refNome:'', cat:'Outras despesas',
               contaId:CFG.contaPadrao||null, forma:'', doc:'', pessoa:'', obs:'', ...d};
  const id = await dbAdd('financeiro',reg);
  await finLoad();
  return id;
}
async function finDelPor(campo,valor){
  const alvo = FIN.filter(l=>l[campo]!=null && String(l[campo])===String(valor));
  for(const l of alvo) await dbDel('financeiro',l.id);
  await finLoad();
}
function finStatus(l){
  if(l.status==='Cancelado') return {t:'Cancelado',c:'s-nt'};
  if(l.status==='Pago') return {t: l.tipo==='receita'?'Recebido':'Pago', c:'s-ok'};
  if(l.venc && l.venc < hoje()) return {t:'Atrasado',c:'s-bl'};
  return {t:'Pendente',c:'s-wn'};
}
function finAtrasado(l){ return l.status==='Pendente' && l.venc && l.venc < hoje(); }
function finVale(l){ return l.status!=='Cancelado' && !l.transf; }

/* ---- agregações ---- */
function finDoMes(mk,filtro){
  return FIN.filter(l=>String(l.data).slice(0,7)===mk && finVale(l) && (!filtro||filtro(l)));
}
function somaFin(lista,tipo,soPagos){
  return lista.filter(l=>l.tipo===tipo && finVale(l) && (!soPagos||l.status==='Pago'))
              .reduce((s,l)=>s+num(l.valor),0);
}
function resultadoUn(un,mk){
  const l = FIN.filter(x=>finVale(x) && x.un===un && (!mk || String(x.data).slice(0,7)===mk));
  const r = somaFin(l,'receita'), d = somaFin(l,'despesa');
  return {receita:r, despesa:d, resultado:r-d, margem: r? (r-d)/r*100 : 0};
}
async function saldoContas(){
  const contas = await dbGetAll('contas');
  return contas.map(c=>{
    const mov = FIN.filter(l=>Number(l.contaId)===Number(c.id) && l.status==='Pago' && l.status!=='Cancelado');
    const ent = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
    const sai = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
    return {...c, entradas:ent, saidas:sai, saldo: num(c.saldoInicial)+ent-sai};
  });
}

/* =================== PÁGINA =================== */
function finStab(t){ FIN_TAB = t; finRender(); }

async function finRender(){
  const root = document.getElementById('fin-root');
  await finLoad();
  if(!FIN_MES) FIN_MES = mesAtual();
  const contas = await saldoContas();
  const saldoTotal = contas.reduce((s,c)=>s+c.saldo,0);
  const doMes = finDoMes(FIN_MES);
  const rec = somaFin(doMes,'receita'), des = somaFin(doMes,'despesa');
  const aPagar = FIN.filter(l=>l.tipo==='despesa' && l.status==='Pendente' && finVale(l));
  const aReceber = FIN.filter(l=>l.tipo==='receita' && l.status==='Pendente' && finVale(l));
  const vencidos = aPagar.filter(finAtrasado), inad = aReceber.filter(finAtrasado);

  let h = `<div class="ph"><div class="ic"><i class="ti ti-wallet"></i></div>
    <div><h1>Financeiro</h1><p>Caixa, contas a pagar e a receber, despesas e resultado de todos os negócios</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="finLancForm(null,{tipo:'receita'})"><i class="ti ti-arrow-down-circle"></i>Receita</button>
    <button class="btn" onclick="finLancForm(null,{tipo:'despesa'})"><i class="ti ti-arrow-up-circle"></i>Despesa</button></div>`;

  h += `<div class="kg" style="margin-bottom:16px">
    <div class="kc br"><div class="lb"><i class="ti ti-building-bank"></i>Saldo em caixa</div><div class="vl">${moedaK(saldoTotal)}</div>
      <div class="sb">${contas.length} conta(s) cadastrada(s)</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-trending-up"></i>Receitas do mês</div><div class="vl">${moedaK(rec)}</div>
      <div class="sb">${dmesL(FIN_MES)}</div></div>
    <div class="kc rd"><div class="lb"><i class="ti ti-trending-down"></i>Despesas do mês</div><div class="vl">${moedaK(des)}</div>
      <div class="sb">${doMes.filter(l=>l.tipo==='despesa').length} lançamento(s)</div></div>
    <div class="kc ${rec-des>=0?'tl':'rd'}"><div class="lb"><i class="ti ti-report-money"></i>Resultado do mês</div>
      <div class="vl">${moedaK(rec-des)}</div><div class="sb">${rec?pct((rec-des)/rec*100)+' de margem':'sem receita no mês'}</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-file-invoice"></i>A pagar</div>
      <div class="vl">${moedaK(aPagar.reduce((s,l)=>s+num(l.valor),0))}</div>
      <div class="sb">${vencidos.length?`<b style="color:var(--red)">${vencidos.length} vencida(s)</b>`:'nenhuma vencida'}</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-cash"></i>A receber</div>
      <div class="vl">${moedaK(aReceber.reduce((s,l)=>s+num(l.valor),0))}</div>
      <div class="sb">${inad.length?`<b style="color:var(--red)">${inad.length} em atraso</b>`:'em dia'}</div></div>
  </div>`;

  h += `<div class="tabs">
    <button class="tab ${FIN_TAB==='vis'?'on':''}" onclick="finStab('vis')"><i class="ti ti-chart-area"></i>Visão geral</button>
    <button class="tab ${FIN_TAB==='lan'?'on':''}" onclick="finStab('lan')"><i class="ti ti-list"></i>Lançamentos</button>
    <button class="tab ${FIN_TAB==='pag'?'on':''}" onclick="finStab('pag')"><i class="ti ti-file-invoice"></i>A pagar${vencidos.length?` <span class="st s-bl">${vencidos.length}</span>`:''}</button>
    <button class="tab ${FIN_TAB==='receb'?'on':''}" onclick="finStab('receb')"><i class="ti ti-cash"></i>A receber${inad.length?` <span class="st s-bl">${inad.length}</span>`:''}</button>
    <button class="tab ${FIN_TAB==='rec'?'on':''}" onclick="finStab('rec')"><i class="ti ti-repeat"></i>Despesas fixas</button>
    <button class="tab ${FIN_TAB==='cta'?'on':''}" onclick="finStab('cta')"><i class="ti ti-building-bank"></i>Contas</button>
    <button class="tab ${FIN_TAB==='dre'?'on':''}" onclick="finStab('dre')"><i class="ti ti-table"></i>Resultado por negócio</button>
  </div><div id="fin-body"></div>`;
  root.innerHTML = h;

  if(FIN_TAB==='vis')   await finTabVisao(contas,saldoTotal);
  if(FIN_TAB==='lan')   await finTabLancamentos();
  if(FIN_TAB==='pag')   await finTabPendentes('despesa');
  if(FIN_TAB==='receb') await finTabPendentes('receita');
  if(FIN_TAB==='rec')   await finTabRecorrentes();
  if(FIN_TAB==='cta')   await finTabContas(contas,saldoTotal);
  if(FIN_TAB==='dre')   await finTabDRE();
}

/* ---------------- Visão geral ---------------- */
async function finTabVisao(contas,saldoTotal){
  const body = document.getElementById('fin-body');
  const meses = listaMeses(addMeses(mesAtual()+'-01',-11).slice(0,7), mesAtual());
  const serie = meses.map(mk=>{
    const l = finDoMes(mk);
    return {label:dmes(mk+'-01'), a:somaFin(l,'receita'), b:somaFin(l,'despesa')};
  });
  const doMes = finDoMes(FIN_MES);
  const PAL = ['#123B4E','#1F5FA8','#4B4FA3','#2E7D32','#B0842B','#7B3FA0','#C0392B','#5B6260','#0E6E70','#B4531F'];

  // resultado por unidade no mês
  const porUn = [...UNIDADES.map(u=>u.id),'geral'].map((id,i)=>{
    const r = resultadoUn(id,FIN_MES);
    const u = unInfo(id);
    return {id, nome:u.curto, cor:u.cor||PAL[i%PAL.length], ...r};
  }).filter(x=>x.receita||x.despesa);

  // despesas por categoria no mês
  const cats = {};
  doMes.filter(l=>l.tipo==='despesa').forEach(l=>{ cats[l.cat||'Outras despesas'] = (cats[l.cat||'Outras despesas']||0)+num(l.valor); });
  const catData = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([k,v],i)=>({label:k,val:v,color:PAL[i%PAL.length]}));

  // fluxo projetado 90 dias
  const proj = [];
  let acum = saldoTotal;
  for(let k=0;k<4;k++){
    const mk = addMeses(mesAtual()+'-01',k).slice(0,7);
    const prev = FIN.filter(l=>finVale(l) && l.status==='Pendente' && String(l.venc||l.data).slice(0,7)===mk);
    const e = prev.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
    const s = prev.filter(l=>l.tipo==='despesa').reduce((s2,l)=>s2+num(l.valor),0);
    acum += e-s;
    proj.push({mk, e, s, saldo:acum});
  }

  let h = `<div class="sbar"><div class="fg" style="max-width:240px"><label>Mês de referência</label>
      <input type="month" value="${FIN_MES}" onchange="FIN_MES=this.value;finRender()"></div>
    <button class="btn gh sm" onclick="finImprimir()"><i class="ti ti-printer"></i>Imprimir resumo</button>
    <button class="btn gh sm" onclick="finExportar()"><i class="ti ti-file-spreadsheet"></i>Exportar CSV</button></div>`;

  h += `<div class="card"><div class="hd"><i class="ti ti-chart-bar"></i>Receitas e despesas nos últimos 12 meses</div>
    <div class="bd">${barChart2(serie,{h:250})}</div></div>`;

  h += `<div class="chg">
    <div class="card"><div class="hd"><i class="ti ti-briefcase"></i>Resultado por negócio em ${dmesL(FIN_MES)}</div><div class="bd">
      ${porUn.length? `<table><thead><tr><th>Negócio</th><th class="r">Receita</th><th class="r">Despesa</th><th class="r">Resultado</th><th class="r">Margem</th></tr></thead><tbody>
        ${porUn.sort((a,b)=>b.resultado-a.resultado).map(u=>`<tr>
          <td><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${u.cor};margin-right:6px"></span><b>${esc(u.nome)}</b></td>
          <td class="r n">${moeda(u.receita)}</td><td class="r n">${moeda(u.despesa)}</td>
          <td class="r n"><b style="color:${u.resultado>=0?'var(--green)':'var(--red)'}">${moeda(u.resultado)}</b></td>
          <td class="r n">${u.receita?pct(u.margem):'—'}</td></tr>`).join('')}
      </tbody></table>` : `<div class="empty"><i class="ti ti-briefcase-off"></i>Nenhum movimento neste mês</div>`}
    </div></div>
    <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>Para onde foi o dinheiro</div><div class="bd">
      ${donutChart(catData,{centerLabel:'DESPESAS',centerVal:moedaK(somaFin(doMes,'despesa'))})}</div></div>
  </div>`;

  h += `<div class="chg">
    <div class="card"><div class="hd"><i class="ti ti-building-bank"></i>Saldo por conta</div><div class="bd">
      ${contas.length? hbarChart(contas.map((c,i)=>({label:c.nome,val:c.saldo,color:PAL[i%PAL.length]})))
        : `<div class="empty"><i class="ti ti-building-bank"></i><b>Nenhuma conta cadastrada</b>
           Cadastre suas contas para acompanhar o saldo real.
           <div class="brow" style="justify-content:center"><button class="btn sm" onclick="finStab('cta')">Cadastrar conta</button></div></div>`}
    </div></div>
    <div class="card tw"><div class="hd"><i class="ti ti-calendar-dollar"></i>Projeção de caixa — próximos 4 meses</div><div class="bd">
      <table><thead><tr><th>Mês</th><th class="r">A receber</th><th class="r">A pagar</th><th class="r">Saldo projetado</th></tr></thead><tbody>
      ${proj.map(p=>`<tr><td><b>${dmes(p.mk+'-01')}</b></td><td class="r n" style="color:var(--green)">${moeda(p.e)}</td>
        <td class="r n" style="color:var(--red)">${moeda(p.s)}</td>
        <td class="r n"><b style="color:${p.saldo>=0?'var(--brand)':'var(--red)'}">${moeda(p.saldo)}</b></td></tr>`).join('')}
      </tbody></table>
      <div class="tt" style="padding:10px 12px">Parte do saldo atual (${moeda(saldoTotal)}) mais tudo que está lançado como pendente.
      ${proj.some(p=>p.saldo<0)?'<b style="color:var(--red)"> Atenção: há previsão de caixa negativo.</b>':''}</div>
    </div></div>
  </div>`;
  body.innerHTML = h;
}

/* ---------------- Lançamentos ---------------- */
async function finTabLancamentos(){
  const body = document.getElementById('fin-body');
  const f = FIN_FILTRO;
  let lista = FIN.filter(l=>{
    if(f.tipo && l.tipo!==f.tipo) return false;
    if(f.un && l.un!==f.un) return false;
    if(f.cat && l.cat!==f.cat) return false;
    if(f.status==='pend' && l.status!=='Pendente') return false;
    if(f.status==='pago' && l.status!=='Pago') return false;
    if(f.status==='atras' && !finAtrasado(l)) return false;
    if(f.busca){
      const t = (l.desc+' '+(l.pessoa||'')+' '+(l.doc||'')+' '+(l.refNome||'')).toLowerCase();
      if(!t.includes(f.busca.toLowerCase())) return false;
    }
    return true;
  }).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const totR = lista.filter(l=>l.tipo==='receita'&&finVale(l)).reduce((s,l)=>s+num(l.valor),0);
  const totD = lista.filter(l=>l.tipo==='despesa'&&finVale(l)).reduce((s,l)=>s+num(l.valor),0);
  const contas = await dbGetAll('contas');
  const mapC = {}; contas.forEach(c=>mapC[c.id]=c.nome);

  let h = `<div class="card"><div class="bd">
    <div class="sbar">
      <div class="srch"><i class="ti ti-search"></i>
        <input type="search" placeholder="Buscar descrição, pessoa, documento..." value="${esc(f.busca)}"
          oninput="FIN_FILTRO.busca=this.value;clearTimeout(window.__fb);window.__fb=setTimeout(finRender,400)"></div>
      <div class="fg"><label>Tipo</label><select onchange="FIN_FILTRO.tipo=this.value;finRender()">
        <option value="">Tudo</option><option value="receita" ${f.tipo==='receita'?'selected':''}>Receitas</option>
        <option value="despesa" ${f.tipo==='despesa'?'selected':''}>Despesas</option></select></div>
      <div class="fg"><label>Negócio</label><select onchange="FIN_FILTRO.un=this.value;finRender()">
        <option value="">Todos</option>${[...UNIDADES,UN_GERAL].map(u=>`<option value="${u.id}" ${f.un===u.id?'selected':''}>${esc(u.curto)}</option>`).join('')}</select></div>
      <div class="fg"><label>Situação</label><select onchange="FIN_FILTRO.status=this.value;finRender()">
        <option value="">Todas</option><option value="pend" ${f.status==='pend'?'selected':''}>Pendentes</option>
        <option value="pago" ${f.status==='pago'?'selected':''}>Liquidados</option>
        <option value="atras" ${f.status==='atras'?'selected':''}>Em atraso</option></select></div>
      <button class="btn gh sm" onclick="FIN_FILTRO={un:'',cat:'',tipo:'',status:'',busca:''};finRender()"><i class="ti ti-filter-off"></i>Limpar</button>
    </div></div></div>`;

  if(!lista.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-receipt-off"></i>
      <b>Nenhum lançamento encontrado</b>Registre a primeira entrada ou saída de dinheiro.
      <div class="brow" style="justify-content:center;margin-top:14px">
        <button class="btn gn" onclick="finLancForm(null,{tipo:'receita'})"><i class="ti ti-plus"></i>Nova receita</button>
        <button class="btn rd" onclick="finLancForm(null,{tipo:'despesa'})"><i class="ti ti-plus"></i>Nova despesa</button></div></div></div></div>`;
  }else{
    h += `<div class="card tw"><div class="bd"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Negócio</th><th>Categoria</th><th>Conta</th>
      <th class="c">Vencimento</th><th class="c">Situação</th><th class="r">Valor</th><th class="c no-print"></th></tr></thead><tbody>`;
    lista.slice(0,300).forEach(l=>{
      const st = finStatus(l), u = unInfo(l.un);
      h += `<tr><td class="n">${dbr(l.data)}</td>
        <td><b>${esc(l.desc)}</b>${l.refNome?`<br><span class="tt">${esc(l.refNome)}</span>`:''}${l.pessoa?`<br><span class="tt">${esc(l.pessoa)}</span>`:''}</td>
        <td><span class="st" style="background:${u.bg};color:${u.cor}">${esc(u.curto)}</span></td>
        <td class="tt">${esc(l.cat||'—')}</td><td class="tt">${esc(mapC[l.contaId]||'—')}</td>
        <td class="c n tt">${dbr(l.venc)}</td>
        <td class="c"><span class="st ${st.c}">${st.t}</span></td>
        <td class="r n"><b style="color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${l.tipo==='receita'?'+':'−'} ${moeda(l.valor)}</b></td>
        <td class="c no-print nowrap">
          ${l.status==='Pendente'?`<button class="ib gn" title="Dar baixa" onclick="finBaixar(${l.id})"><i class="ti ti-circle-check"></i></button>`:''}
          <button class="ib bl" title="Editar" onclick="finLancForm(${l.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" title="Excluir" onclick="finDel(${l.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="7">${lista.length} lançamento(s)${lista.length>300?' — mostrando os 300 mais recentes':''}</td>
      <td class="r n">${moedaK(totR-totD)}</td><td class="no-print"></td></tr></tfoot></table></div></div>
      <div class="al ai"><i class="ti ti-info-circle"></i><div>Total filtrado: receitas <b style="color:var(--green)">${moeda(totR)}</b>
        · despesas <b style="color:var(--red)">${moeda(totD)}</b> · resultado <b>${moeda(totR-totD)}</b></div></div>`;
  }
  body.innerHTML = h;
}

/* ---------------- Formulário de lançamento ---------------- */
async function finLancForm(id,pre){
  pre = pre||{};
  const l = id ? await dbGet('financeiro',id) : null;
  const tipo = l ? l.tipo : (pre.tipo||'despesa');
  const contas = await dbGetAll('contas');
  const pessoas = await dbGetAll('pessoas');
  const cats = tipo==='receita'?CAT_REC:CAT_DESP;
  const unSel = l?l.un:(pre.un||'geral');
  const refs = await refsDaUnidade(unSel);

  const b = `
   <input type="hidden" id="fl-tipo" value="${tipo}">
   <div class="al ${tipo==='receita'?'ag':'ae'}" style="margin-top:0">
     <i class="ti ti-${tipo==='receita'?'arrow-down-circle':'arrow-up-circle'}"></i>
     <div><b>${tipo==='receita'?'Entrada de dinheiro':'Saída de dinheiro'}</b> —
       ${tipo==='receita'?'venda, aluguel, medição, monetização...':'compra, salário, conta de luz, combustível...'}</div></div>
   <div class="fr3">
     <div class="fg" style="grid-column:span 2"><label>Descrição <span class="rq">*</span></label>
       <input id="fl-desc" value="${esc(l?l.desc:(pre.desc||''))}" placeholder="${tipo==='receita'?'Ex.: Aluguel de agosto — Casa Rua das Flores':'Ex.: Conta de energia da chácara'}"></div>
     <div class="fg"><label>Valor (R$) <span class="rq">*</span></label>
       <input id="fl-valor" type="number" step="0.01" value="${l?l.valor:(pre.valor||'')}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Negócio <span class="rq">*</span></label>
       <select id="fl-un" onchange="finTrocarUn(this.value)">
         ${[...UNIDADES,UN_GERAL].map(u=>`<option value="${u.id}" ${unSel===u.id?'selected':''}>${esc(u.nome)}</option>`).join('')}</select></div>
     <div class="fg"><label>Vinculado a</label><select id="fl-ref">
       <option value="">— nada específico —</option>
       ${refs.map(r=>`<option value="${r.tipo}:${r.id}" ${l&&l.refId==r.id&&l.refTipo===r.tipo?'selected':''}>${esc(r.nome)}</option>`).join('')}</select>
       <span class="hint">Obra, imóvel, veículo, lote, produto ou canal.</span></div>
     <div class="fg"><label>Categoria</label><select id="fl-cat">
       ${cats.map(c=>`<option ${l&&l.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
   </div>
   <div class="fr4">
     <div class="fg"><label>Competência <span class="rq">*</span></label><input id="fl-data" type="date" value="${l?l.data:hoje()}">
       <span class="hint">Mês a que se refere.</span></div>
     <div class="fg"><label>Vencimento</label><input id="fl-venc" type="date" value="${l?(l.venc||''):hoje()}"></div>
     <div class="fg"><label>Situação</label><select id="fl-status" onchange="finFormStatus()">
       <option value="Pendente" ${l&&l.status==='Pendente'?'selected':''}>Pendente</option>
       <option value="Pago" ${!l||l.status==='Pago'?'selected':''}>${tipo==='receita'?'Recebido':'Pago'}</option>
       <option value="Cancelado" ${l&&l.status==='Cancelado'?'selected':''}>Cancelado</option></select></div>
     <div class="fg"><label>Data do pagamento</label><input id="fl-dtpag" type="date" value="${l?(l.dtPag||hoje()):hoje()}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Conta</label><select id="fl-conta">
       <option value="">— não informada —</option>
       ${contas.map(c=>`<option value="${c.id}" ${(l&&Number(l.contaId)===Number(c.id))||(!l&&Number(CFG.contaPadrao)===Number(c.id))?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div>
     <div class="fg"><label>Forma de pagamento</label><select id="fl-forma">
       ${FORMAS.map(x=>`<option ${l&&l.forma===x?'selected':''}>${x}</option>`).join('')}</select></div>
     <div class="fg"><label>${tipo==='receita'?'Cliente / pagador':'Fornecedor / beneficiário'}</label>
       <input id="fl-pessoa" list="fl-pl" value="${esc(l?l.pessoa:'')}">
       <datalist id="fl-pl">${pessoas.map(p=>`<option value="${esc(p.nome)}">`).join('')}</datalist></div>
   </div>
   <div class="fr2">
     <div class="fg"><label>Documento (NF, recibo, boleto)</label><input id="fl-doc" value="${esc(l?l.doc:'')}"></div>
     <div class="fg"><label>Observações</label><input id="fl-obs" value="${esc(l?l.obs:'')}"></div>
   </div>
   ${id?'':`<label style="display:flex;gap:9px;align-items:flex-start;font-size:13px;cursor:pointer;margin-top:6px">
     <input type="checkbox" id="fl-rep" style="margin-top:3px;width:16px;height:16px" onchange="document.getElementById('fl-repbox').style.display=this.checked?'':'none'">
     <span><b>Repetir este lançamento</b><br><span class="tt">Cria automaticamente nos próximos meses — para contas fixas como energia, internet e salários.</span></span></label>
   <div id="fl-repbox" style="display:none" class="fr3">
     <div class="fg"><label>Quantas vezes</label><input id="fl-repn" type="number" min="2" max="60" value="12"></div>
     <div class="fg"><label>A cada</label><select id="fl-repp">${PERIODICIDADES.map(p=>`<option value="${p[2]}">${p[1]}</option>`).join('')}</select></div>
     <div class="fg"><label>&nbsp;</label><div class="tt" style="padding-top:9px">As parcelas seguintes ficam como <b>pendentes</b>.</div></div>
   </div>`}
   <div id="fl-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    ${id?`<button class="btn rd" onclick="finDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
    <button class="btn ${tipo==='receita'?'gn':''}" onclick="finLancSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Editar lançamento':(tipo==='receita'?'Nova receita':'Nova despesa'),
        tipo==='receita'?'ti-arrow-down-circle':'ti-arrow-up-circle',b,f);
  finFormStatus();
}
function finFormStatus(){
  const s = val('fl-status');
  const e = document.getElementById('fl-dtpag');
  if(e) e.closest('.fg').style.opacity = s==='Pago'?1:.4;
}
async function refsDaUnidade(un){
  const out = [];
  if(un==='obras') (await dbGetAll('obras')).forEach(o=>out.push({tipo:'obra',id:o.id,nome:o.cod+' — '+o.nome}));
  if(un==='imoveis') (await dbGetAll('imoveis')).forEach(o=>out.push({tipo:'imovel',id:o.id,nome:o.cod+' — '+o.nome}));
  if(un==='veiculos') (await dbGetAll('veiculos')).forEach(o=>out.push({tipo:'veiculo',id:o.id,nome:o.placa+' — '+o.modelo}));
  if(un==='chacara'){
    (await dbGetAll('lotes')).forEach(o=>out.push({tipo:'lote',id:o.id,nome:'Lote: '+o.nome}));
    (await dbGetAll('ciclos')).forEach(o=>out.push({tipo:'ciclo',id:o.id,nome:'Ciclo: '+o.nome}));
  }
  if(un==='produtos'||un==='info') (await dbGetAll('produtos')).filter(p=>un==='info'?p.tipo==='Infoproduto':p.tipo!=='Infoproduto')
    .forEach(o=>out.push({tipo:'produto',id:o.id,nome:o.nome}));
  if(un==='midia') (await dbGetAll('canais')).forEach(o=>out.push({tipo:'canal',id:o.id,nome:o.nome+' ('+o.plataforma+')'}));
  return out;
}
async function finTrocarUn(un){
  const refs = await refsDaUnidade(un);
  const s = document.getElementById('fl-ref');
  if(s) s.innerHTML = `<option value="">— nada específico —</option>` +
    refs.map(r=>`<option value="${r.tipo}:${r.id}">${esc(r.nome)}</option>`).join('');
}
async function finLancSave(id){
  const desc = val('fl-desc'), v = num(val('fl-valor'));
  if(!desc || v<=0){ document.getElementById('fl-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe a descrição e um valor maior que zero.</div>`; return; }
  const ref = val('fl-ref');
  let refTipo='', refId=null, refNome='';
  if(ref){ const [t,i] = ref.split(':'); refTipo=t; refId=Number(i);
    const opt = document.querySelector(`#fl-ref option[value="${ref}"]`); refNome = opt?opt.textContent:''; }
  const status = val('fl-status');
  const d = {tipo:val('fl-tipo'), desc, valor:v, un:val('fl-un'), refTipo, refId, refNome,
             cat:val('fl-cat'), data:val('fl-data'), venc:val('fl-venc'), status,
             dtPag: status==='Pago'?val('fl-dtpag'):'', contaId: val('fl-conta')?Number(val('fl-conta')):null,
             forma:val('fl-forma'), pessoa:val('fl-pessoa'), doc:val('fl-doc'), obs:val('fl-obs')};
  if(id){ const old = await dbGet('financeiro',id); await dbPut('financeiro',{...old,...d}); }
  else{
    await dbAdd('financeiro',d);
    if(chk('fl-rep')){
      const n = clamp(num(val('fl-repn')),2,60), p = num(val('fl-repp'))||1;
      for(let k=1;k<n;k++){
        await dbAdd('financeiro',{...d, data:addMeses(d.data,k*p), venc:d.venc?addMeses(d.venc,k*p):'',
          status:'Pendente', dtPag:'', origem:'Parcela '+(k+1)+'/'+n});
      }
      toast(`${n} lançamentos criados (parcelado).`);
    }
  }
  await finLoad();
  closeModal('mk-form');
  if(!chk('fl-rep')) toast('Lançamento salvo.');
  finRender();
}
async function finBaixar(id){
  const l = await dbGet('financeiro',id);
  const contas = await dbGetAll('contas');
  const b = `<div class="al ${l.tipo==='receita'?'ag':'ai'}"><i class="ti ti-circle-check"></i>
      <div><b>${esc(l.desc)}</b><br>${l.tipo==='receita'?'Recebimento':'Pagamento'} de <b>${moeda(l.valor)}</b>
      ${l.venc?` — vencimento ${dbr(l.venc)}`:''}</div></div>
    <div class="fr3">
      <div class="fg"><label>Data do ${l.tipo==='receita'?'recebimento':'pagamento'}</label><input id="fb-data" type="date" value="${hoje()}"></div>
      <div class="fg"><label>Valor efetivo (R$)</label><input id="fb-valor" type="number" step="0.01" value="${num(l.valor)}">
        <span class="hint">Ajuste se houve juros ou desconto.</span></div>
      <div class="fg"><label>Conta</label><select id="fb-conta"><option value="">— não informada —</option>
        ${contas.map(c=>`<option value="${c.id}" ${Number(l.contaId)===Number(c.id)?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div>
    </div>
    <div class="fg"><label>Forma</label><select id="fb-forma">${FORMAS.map(x=>`<option ${l.forma===x?'selected':''}>${x}</option>`).join('')}</select></div>`;
  modal('Dar baixa','ti-circle-check',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="finBaixarSave(${id})"><i class="ti ti-check"></i>Confirmar</button>`,'sm');
}
async function finBaixarSave(id){
  const l = await dbGet('financeiro',id);
  await dbPut('financeiro',{...l, status:'Pago', dtPag:val('fb-data'), valor:num(val('fb-valor')),
    contaId: val('fb-conta')?Number(val('fb-conta')):null, forma:val('fb-forma')});
  await finLoad();
  closeModal('mk-form');
  toast(l.tipo==='receita'?'Recebimento registrado.':'Pagamento registrado.');
  finRender();
}
function finDel(id){
  confirmar('Excluir lançamento','O movimento será removido do financeiro e do resultado do negócio.',
    async()=>{ await dbDel('financeiro',id); await finLoad(); closeModal('mk-form'); toast('Lançamento removido.','aw');
      if(PG==='fin') finRender(); else go(PG); });
}

/* ---------------- A pagar / a receber ---------------- */
async function finTabPendentes(tipo){
  const body = document.getElementById('fin-body');
  const lista = FIN.filter(l=>l.tipo===tipo && l.status==='Pendente' && finVale(l))
    .sort((a,b)=>String(a.venc||a.data).localeCompare(String(b.venc||b.data)));
  const hj = hoje(), sem = addDias(hj,7), mes = addDias(hj,30);
  const grupos = [
    ['Vencidos', lista.filter(l=>(l.venc||l.data)<hj), 'ae','ti-alert-circle'],
    ['Vencem em 7 dias', lista.filter(l=>(l.venc||l.data)>=hj && (l.venc||l.data)<=sem), 'aw','ti-clock'],
    ['Vencem em 30 dias', lista.filter(l=>(l.venc||l.data)>sem && (l.venc||l.data)<=mes), 'ai','ti-calendar'],
    ['Mais adiante', lista.filter(l=>(l.venc||l.data)>mes), 'ai','ti-calendar-plus']
  ];
  const tot = lista.reduce((s,l)=>s+num(l.valor),0);
  let h = `<div class="al ${grupos[0][1].length?'ae':'ai'}"><i class="ti ti-${tipo==='despesa'?'file-invoice':'cash'}"></i>
    <div>Total ${tipo==='despesa'?'a pagar':'a receber'}: <b>${moeda(tot)}</b> em ${lista.length} lançamento(s).
    ${grupos[0][1].length?`<b style="color:var(--red)"> ${grupos[0][1].length} já ${tipo==='despesa'?'vencido(s)':'em atraso'}, somando ${moeda(grupos[0][1].reduce((s,l)=>s+num(l.valor),0))}.</b>`:' Nada vencido.'}</div></div>
    <div class="brow" style="margin-bottom:12px">
      <button class="btn ${tipo==='receita'?'gn':''}" onclick="finLancForm(null,{tipo:'${tipo}'})"><i class="ti ti-plus"></i>
        Nova ${tipo==='despesa'?'despesa':'receita'}</button>
      ${lista.length?`<button class="btn gh" onclick="finImprimirPend('${tipo}')"><i class="ti ti-printer"></i>Imprimir lista</button>`:''}
    </div>`;
  if(!lista.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-circle-check"></i>
      <b>Tudo em dia</b>Não há ${tipo==='despesa'?'contas a pagar':'valores a receber'} em aberto.</div></div></div>`;
  }
  grupos.forEach(([nome,its,cls,ic])=>{
    if(!its.length) return;
    h += `<div class="card tw"><div class="hd"><i class="ti ${ic}"></i>${nome}
      <span class="sp"></span><span class="st ${cls==='ae'?'s-bl':cls==='aw'?'s-wn':'s-pd'}">${its.length} · ${moeda(its.reduce((s,l)=>s+num(l.valor),0))}</span></div>
      <div class="bd"><table><thead><tr><th class="c">Vencimento</th><th>Descrição</th><th>Negócio</th>
        <th>${tipo==='despesa'?'Fornecedor':'Cliente'}</th><th class="c">Atraso</th><th class="r">Valor</th><th class="c no-print"></th></tr></thead><tbody>`;
    its.forEach(l=>{
      const dias = diasEntre(l.venc||l.data,hj);
      const u = unInfo(l.un);
      h += `<tr><td class="c n"><b>${dbr(l.venc||l.data)}</b></td>
        <td><b>${esc(l.desc)}</b>${l.refNome?`<br><span class="tt">${esc(l.refNome)}</span>`:''}</td>
        <td><span class="st" style="background:${u.bg};color:${u.cor}">${esc(u.curto)}</span></td>
        <td class="tt">${esc(l.pessoa||'—')}</td>
        <td class="c">${dias>0?`<span class="st s-bl">${dias} d</span>`:'<span class="tt">—</span>'}</td>
        <td class="r n"><b>${moeda(l.valor)}</b></td>
        <td class="c no-print nowrap">
          <button class="ib gn" title="Dar baixa" onclick="finBaixar(${l.id})"><i class="ti ti-circle-check"></i></button>
          <button class="ib bl" onclick="finLancForm(${l.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="finDel(${l.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  });
  body.innerHTML = h;
}

/* ---------------- Despesas fixas / recorrentes ---------------- */
async function finTabRecorrentes(){
  const body = document.getElementById('fin-body');
  const recs = await dbGetAll('recorrencias');
  const ativas = recs.filter(r=>r.ativo!==false);
  const mensal = ativas.reduce((s,r)=>s+num(r.valor)*(1/(num(r.periodo)||1)),0);
  let h = `<div class="al ai"><i class="ti ti-repeat"></i><div>
    Cadastre aqui o que se repete todo mês: energia, água, internet, salários, contador, seguro, financiamento, assinaturas.
    O sistema <b>gera os lançamentos automaticamente</b> como contas a pagar, sem você precisar lembrar.</div></div>
   <div class="kg" style="margin-bottom:14px">
     <div class="kc rd"><div class="lb"><i class="ti ti-repeat"></i>Custo fixo mensal</div><div class="vl">${moedaK(mensal)}</div>
       <div class="sb">${ativas.length} despesa(s) fixa(s) ativa(s)</div></div>
     <div class="kc am"><div class="lb"><i class="ti ti-calendar-repeat"></i>Custo fixo anual</div><div class="vl">${moedaK(mensal*12)}</div>
       <div class="sb">o que sai todo ano independente de vender</div></div>
     <div class="kc gn"><div class="lb"><i class="ti ti-check"></i>Receitas fixas</div>
       <div class="vl">${moedaK(ativas.filter(r=>r.tipo==='receita').reduce((s,r)=>s+num(r.valor)/(num(r.periodo)||1),0))}</div>
       <div class="sb">aluguéis e assinaturas recorrentes</div></div>
   </div>
   <div class="card"><div class="hd"><i class="ti ti-repeat"></i>Lançamentos recorrentes<span class="sp"></span>
     <button class="btn sm gh" onclick="recGerar(true)"><i class="ti ti-refresh"></i>Gerar agora</button>
     <button class="btn sm" onclick="recForm()"><i class="ti ti-plus"></i>Nova recorrência</button></div><div class="bd">`;
  if(!recs.length){
    h += `<div class="empty"><i class="ti ti-repeat-off"></i><b>Nenhuma despesa fixa cadastrada</b>
      Comece pelas contas que você paga todo mês — em um minuto o sistema passa a lembrar por você.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Descrição</th><th class="c">Tipo</th><th>Negócio</th><th>Categoria</th><th class="c">Periodicidade</th>
      <th class="c">Dia</th><th class="c">Vigência</th><th class="r">Valor</th><th class="c">Situação</th><th class="c no-print"></th></tr></thead><tbody>`;
    recs.sort((a,b)=>num(b.valor)-num(a.valor)).forEach(r=>{
      const u = unInfo(r.un);
      const per = PERIODICIDADES.find(p=>num(p[2])===num(r.periodo));
      h += `<tr><td><b>${esc(r.desc)}</b></td>
        <td class="c"><span class="st ${r.tipo==='receita'?'s-ok':'s-bl'}">${r.tipo==='receita'?'Receita':'Despesa'}</span></td>
        <td><span class="st" style="background:${u.bg};color:${u.cor}">${esc(u.curto)}</span></td>
        <td class="tt">${esc(r.cat)}</td><td class="c tt">${per?per[1]:'Mensal'}</td>
        <td class="c n">${r.dia||'—'}</td>
        <td class="c tt">${dmes(r.inicio)}${r.fim?' a '+dmes(r.fim):' em diante'}</td>
        <td class="r n"><b>${moeda(r.valor)}</b></td>
        <td class="c"><span class="st ${r.ativo===false?'s-nt':'s-ok'}">${r.ativo===false?'Pausada':'Ativa'}</span></td>
        <td class="c no-print nowrap"><button class="ib bl" onclick="recForm(${r.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="recDel(${r.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  }
  body.innerHTML = h;
}
async function recForm(id){
  const r = id ? await dbGet('recorrencias',id) : null;
  const contas = await dbGetAll('contas');
  const tipo = r?r.tipo:'despesa';
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Descrição <span class="rq">*</span></label>
        <input id="rc-desc" value="${esc(r?r.desc:'')}" placeholder="Ex.: Energia elétrica da chácara"></div>
      <div class="fg"><label>Valor (R$) <span class="rq">*</span></label><input id="rc-valor" type="number" step="0.01" value="${r?r.valor:''}"></div>
    </div>
    <div class="fr4">
      <div class="fg"><label>Tipo</label><select id="rc-tipo" onchange="recTrocaTipo(this.value)">
        <option value="despesa" ${tipo==='despesa'?'selected':''}>Despesa</option>
        <option value="receita" ${tipo==='receita'?'selected':''}>Receita</option></select></div>
      <div class="fg"><label>Negócio</label><select id="rc-un">
        ${[...UNIDADES,UN_GERAL].map(u=>`<option value="${u.id}" ${r&&r.un===u.id?'selected':''}>${esc(u.curto)}</option>`).join('')}</select></div>
      <div class="fg"><label>Categoria</label><select id="rc-cat">
        ${(tipo==='receita'?CAT_REC:CAT_DESP).map(c=>`<option ${r&&r.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="fg"><label>Conta</label><select id="rc-conta"><option value="">—</option>
        ${contas.map(c=>`<option value="${c.id}" ${r&&Number(r.contaId)===Number(c.id)?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div>
    </div>
    <div class="fr4">
      <div class="fg"><label>Periodicidade</label><select id="rc-per">
        ${PERIODICIDADES.map(p=>`<option value="${p[2]}" ${r&&num(r.periodo)===num(p[2])?'selected':''}>${p[1]}</option>`).join('')}</select></div>
      <div class="fg"><label>Dia do vencimento</label><input id="rc-dia" type="number" min="1" max="31" value="${r?r.dia:10}"></div>
      <div class="fg"><label>Começa em</label><input id="rc-ini" type="month" value="${r?String(r.inicio).slice(0,7):mesAtual()}"></div>
      <div class="fg"><label>Termina em (opcional)</label><input id="rc-fim" type="month" value="${r&&r.fim?String(r.fim).slice(0,7):''}"></div>
    </div>
    <label style="display:flex;gap:9px;align-items:center;font-size:13px;cursor:pointer">
      <input type="checkbox" id="rc-ativo" ${!r||r.ativo!==false?'checked':''} style="width:16px;height:16px">
      Recorrência ativa (gerando lançamentos automaticamente)</label>
    <div class="fg" style="margin-top:10px"><label>Observações</label><input id="rc-obs" value="${esc(r?r.obs:'')}"></div>
    <div id="rc-err"></div>`;
  modal(id?'Editar recorrência':'Nova despesa ou receita fixa','ti-repeat',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="recSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
function recTrocaTipo(t){
  const s = document.getElementById('rc-cat');
  if(s) s.innerHTML = (t==='receita'?CAT_REC:CAT_DESP).map(c=>`<option>${c}</option>`).join('');
}
async function recSave(id){
  const desc = val('rc-desc'), v = num(val('rc-valor'));
  if(!desc||v<=0){ document.getElementById('rc-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe a descrição e o valor.</div>`; return; }
  const d = {desc, valor:v, tipo:val('rc-tipo'), un:val('rc-un'), cat:val('rc-cat'),
             contaId: val('rc-conta')?Number(val('rc-conta')):null, periodo:num(val('rc-per'))||1,
             dia:clamp(num(val('rc-dia'))||10,1,31), inicio:val('rc-ini')+'-01',
             fim: val('rc-fim')? val('rc-fim')+'-01':'', ativo:chk('rc-ativo'), obs:val('rc-obs')};
  if(id){ const old = await dbGet('recorrencias',id); await dbPut('recorrencias',{...old,...d}); }
  else await dbAdd('recorrencias',d);
  closeModal('mk-form');
  await recGerar(false);
  toast('Recorrência salva e lançamentos gerados.');
  finRender();
}
function recDel(id){
  confirmar('Excluir recorrência','Os lançamentos já gerados continuam no financeiro. Só para de gerar novos.',
    async()=>{ await dbDel('recorrencias',id); toast('Recorrência removida.','aw'); finRender(); });
}
/* Gera os lançamentos pendentes das recorrências até o mês seguinte */
async function recGerar(avisar){
  const recs = (await dbGetAll('recorrencias')).filter(r=>r.ativo!==false);
  await finLoad();
  const limite = addMeses(mesAtual()+'-01',1).slice(0,7);
  let n = 0;
  for(const r of recs){
    const per = num(r.periodo)||1;
    let mk = String(r.inicio).slice(0,7);
    let guarda = 0;
    while(mk <= limite && guarda++ < 200){
      if(r.fim && mk > String(r.fim).slice(0,7)) break;
      const ja = FIN.some(l=>Number(l.recorrenteId)===Number(r.id) && String(l.data).slice(0,7)===mk);
      if(!ja){
        const dia = String(clamp(num(r.dia)||10,1,28)).padStart(2,'0');
        await dbAdd('financeiro',{tipo:r.tipo, desc:r.desc, valor:num(r.valor), un:r.un, cat:r.cat,
          refTipo:'', refId:null, refNome:'', data:mk+'-01', venc:mk+'-'+dia, status:'Pendente',
          contaId:r.contaId, forma:'', pessoa:'', doc:'', obs:r.obs||'', recorrenteId:r.id,
          auto:true, origem:'Recorrência automática'});
        n++;
      }
      mk = addMeses(mk+'-01',per).slice(0,7);
    }
  }
  await finLoad();
  if(avisar) toast(n? `${n} lançamento(s) gerados.` : 'Nada novo a gerar — tudo já estava lançado.', n?'ag':'ai');
  if(avisar) finRender();
  return n;
}

/* ---------------- Contas bancárias ---------------- */
async function finTabContas(contas,saldoTotal){
  const body = document.getElementById('fin-body');
  let h = `<div class="card"><div class="hd"><i class="ti ti-building-bank"></i>Contas e caixa<span class="sp"></span>
    <button class="btn sm gh" onclick="transfForm()"><i class="ti ti-arrows-exchange"></i>Transferir entre contas</button>
    <button class="btn sm" onclick="contaForm()"><i class="ti ti-plus"></i>Nova conta</button></div><div class="bd">`;
  if(!contas.length){
    h += `<div class="empty"><i class="ti ti-building-bank"></i><b>Nenhuma conta cadastrada</b>
      Cadastre o banco, o dinheiro em espécie e a carteira digital para o sistema mostrar seu saldo real.</div></div></div>`;
  }else{
    h += `</div></div><div class="mgrid">`;
    contas.forEach(c=>{
      h += `<div class="ocard" onclick="contaForm(${c.id})">
        <div class="oh"><div class="oi" style="background:var(--brand-bg);color:var(--brand)"><i class="ti ti-${c.tipo==='Caixa em dinheiro'?'cash':c.tipo==='Cartão de crédito'?'credit-card':'building-bank'}"></i></div>
          <div style="flex:1"><b style="font-size:14px">${esc(c.nome)}</b><div class="tt">${esc(c.tipo)}${c.banco?' · '+esc(c.banco):''}</div></div></div>
        <div class="ob">
          <div class="row"><span>Saldo inicial</span><b>${moeda(c.saldoInicial)}</b></div>
          <div class="row"><span>Entradas</span><b style="color:var(--green)">+ ${moeda(c.entradas)}</b></div>
          <div class="row"><span>Saídas</span><b style="color:var(--red)">− ${moeda(c.saidas)}</b></div>
          <div style="border-top:1px solid var(--bg3);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--text2);font-weight:700">Saldo atual</span>
            <b style="font-size:17px;color:${c.saldo>=0?'var(--brand)':'var(--red)'}">${moeda(c.saldo)}</b></div>
        </div></div>`;
    });
    h += `</div><div class="al ai"><i class="ti ti-wallet"></i><div>Saldo consolidado de todas as contas:
      <b style="font-size:15px">${moeda(saldoTotal)}</b>. Só entram os lançamentos já liquidados.</div></div>`;
  }
  body.innerHTML = h;
}
async function contaForm(id){
  const c = id ? await dbGet('contas',id) : null;
  const b = `<div class="fr2">
      <div class="fg"><label>Nome da conta <span class="rq">*</span></label><input id="ct-nome" value="${esc(c?c.nome:'')}" placeholder="Ex.: Banco do Brasil — PJ"></div>
      <div class="fg"><label>Tipo</label><select id="ct-tipo">${TIPOS_CONTA.map(t=>`<option ${c&&c.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div></div>
    <div class="fr3">
      <div class="fg"><label>Banco / instituição</label><input id="ct-banco" value="${esc(c?c.banco:'')}"></div>
      <div class="fg"><label>Agência / conta</label><input id="ct-num" value="${esc(c?c.numero:'')}"></div>
      <div class="fg"><label>Saldo inicial (R$)</label><input id="ct-saldo" type="number" step="0.01" value="${c?c.saldoInicial:0}">
        <span class="hint">Saldo do dia em que você começou a usar o sistema.</span></div></div>
    <div class="fg"><label>Observações</label><input id="ct-obs" value="${esc(c?c.obs:'')}"></div>
    <div id="ct-err"></div>`;
  modal(id?'Editar conta':'Nova conta','ti-building-bank',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     ${id?`<button class="btn rd" onclick="contaDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
     <button class="btn gn" onclick="contaSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`,'sm');
}
async function contaSave(id){
  const nome = val('ct-nome');
  if(!nome){ document.getElementById('ct-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome da conta.</div>`; return; }
  const d = {nome, tipo:val('ct-tipo'), banco:val('ct-banco'), numero:val('ct-num'),
             saldoInicial:num(val('ct-saldo')), obs:val('ct-obs')};
  if(id){ const old = await dbGet('contas',id); await dbPut('contas',{...old,...d}); }
  else{ const nid = await dbAdd('contas',d); if(!CFG.contaPadrao){ CFG.contaPadrao = nid; await cfgSalvar(); } }
  closeModal('mk-form'); toast('Conta salva.'); finRender();
}
function contaDel(id){
  confirmar('Excluir conta','Os lançamentos vinculados continuam existindo, mas ficam sem conta.',
    async()=>{ await dbDel('contas',id); closeModal('mk-form'); toast('Conta removida.','aw'); finRender(); });
}
async function transfForm(){
  const contas = await dbGetAll('contas');
  if(contas.length<2){ toast('Cadastre pelo menos duas contas para transferir.','aw'); return; }
  const b = `<div class="al ai"><i class="ti ti-arrows-exchange"></i>A transferência não entra no resultado dos negócios —
      é apenas dinheiro mudando de lugar.</div>
    <div class="fr2">
      <div class="fg"><label>Sai de</label><select id="tf-de">${contas.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></div>
      <div class="fg"><label>Entra em</label><select id="tf-para">${contas.map((c,i)=>`<option value="${c.id}" ${i===1?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div></div>
    <div class="fr2">
      <div class="fg"><label>Valor (R$)</label><input id="tf-valor" type="number" step="0.01"></div>
      <div class="fg"><label>Data</label><input id="tf-data" type="date" value="${hoje()}"></div></div>
    <div class="fg"><label>Descrição</label><input id="tf-desc" value="Transferência entre contas"></div>
    <div id="tf-err"></div>`;
  modal('Transferência entre contas','ti-arrows-exchange',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="transfSave()"><i class="ti ti-check"></i>Transferir</button>`,'sm');
}
async function transfSave(){
  const de = Number(val('tf-de')), para = Number(val('tf-para')), v = num(val('tf-valor'));
  if(de===para){ document.getElementById('tf-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Escolha contas diferentes.</div>`; return; }
  if(v<=0){ document.getElementById('tf-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o valor.</div>`; return; }
  const base = {data:val('tf-data'), venc:val('tf-data'), dtPag:val('tf-data'), status:'Pago',
                un:'geral', cat:'Tarifas bancárias', transf:true, forma:'Transferência', desc:val('tf-desc')};
  await dbAdd('financeiro',{...base, tipo:'despesa', valor:v, contaId:de});
  await dbAdd('financeiro',{...base, tipo:'receita', valor:v, contaId:para});
  await finLoad(); closeModal('mk-form'); toast('Transferência registrada.'); finRender();
}

/* ---------------- Resultado por negócio (DRE) ---------------- */
async function finTabDRE(){
  const body = document.getElementById('fin-body');
  const meses = listaMeses(addMeses(mesAtual()+'-01',-11).slice(0,7), mesAtual());
  const uns = [...UNIDADES.map(u=>u.id),'geral'];
  const dados = uns.map(id=>{
    const u = unInfo(id);
    const linha = meses.map(mk=>resultadoUn(id,mk).resultado);
    const ano = FIN.filter(l=>finVale(l)&&l.un===id&&String(l.data).slice(0,7)>=meses[0]);
    const r = somaFin(ano,'receita'), d = somaFin(ano,'despesa');
    return {id, nome:u.nome, curto:u.curto, cor:u.cor, ic:u.ic, linha, receita:r, despesa:d, res:r-d, margem:r?(r-d)/r*100:0};
  }).filter(x=>x.receita||x.despesa);
  const totR = dados.reduce((s,x)=>s+x.receita,0), totD = dados.reduce((s,x)=>s+x.despesa,0);

  let h = `<div class="al ai"><i class="ti ti-info-circle"></i><div>Resultado dos últimos 12 meses
    (${dmes(meses[0]+'-01')} a ${dmes(meses[meses.length-1]+'-01')}), separado por negócio. É aqui que se enxerga
    <b>o que sustenta a família e o que só dá trabalho</b>.</div></div>`;

  if(!dados.length){
    body.innerHTML = h + `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-table"></i>
      <b>Sem movimentos ainda</b>Lance receitas e despesas para ver o resultado de cada negócio.</div></div></div>`;
    return;
  }

  h += `<div class="card tw"><div class="hd"><i class="ti ti-table"></i>Demonstrativo por unidade de negócio
      <span class="sp"></span><button class="btn sm gh" onclick="finImprimirDRE()"><i class="ti ti-printer"></i>Imprimir</button></div>
    <div class="bd"><table><thead><tr><th>Negócio</th><th class="r">Receita</th><th class="r">Despesa</th>
      <th class="r">Resultado</th><th class="r">Margem</th><th class="c" style="min-width:120px">Evolução mensal</th>
      <th class="r">% do lucro</th></tr></thead><tbody>`;
  const lucroTot = dados.filter(x=>x.res>0).reduce((s,x)=>s+x.res,0)||1;
  dados.sort((a,b)=>b.res-a.res).forEach(x=>{
    const mx = Math.max(...x.linha.map(Math.abs),1);
    h += `<tr><td><div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:8px;background:${x.cor}1F;color:${x.cor};
          display:flex;align-items:center;justify-content:center;font-size:15px"><i class="ti ${x.ic}"></i></div>
        <b>${esc(x.nome)}</b></div></td>
      <td class="r n" style="color:var(--green)">${moeda(x.receita)}</td>
      <td class="r n" style="color:var(--red)">${moeda(x.despesa)}</td>
      <td class="r n"><b style="color:${x.res>=0?'var(--green)':'var(--red)'};font-size:13.5px">${moeda(x.res)}</b></td>
      <td class="r n">${x.receita?pct(x.margem):'—'}</td>
      <td><div class="mini">${x.linha.map(v=>`<i class="${v>=0?'on':''}" style="height:${Math.max(2,Math.abs(v)/mx*34)}px;background:${v>=0?x.cor:'#A8291F'}" title="${moeda(v)}"></i>`).join('')}</div></td>
      <td class="r n">${x.res>0?pct(x.res/lucroTot*100):'—'}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td>TOTAL DA FAMÍLIA</td><td class="r n">${moeda(totR)}</td><td class="r n">${moeda(totD)}</td>
    <td class="r n">${moeda(totR-totD)}</td><td class="r n">${totR?pct((totR-totD)/totR*100):'—'}</td><td colspan="2"></td></tr></tfoot></table></div></div>`;

  h += `<div class="chg">
    <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>De onde vem a receita</div><div class="bd">
      ${donutChart(dados.filter(x=>x.receita>0).map(x=>({label:x.curto,val:x.receita,color:x.cor})),{centerLabel:'RECEITA 12M',centerVal:moedaK(totR)})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>Onde está a despesa</div><div class="bd">
      ${donutChart(dados.filter(x=>x.despesa>0).map(x=>({label:x.curto,val:x.despesa,color:x.cor})),{centerLabel:'DESPESA 12M',centerVal:moedaK(totD)})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-trophy"></i>Resultado por negócio</div><div class="bd">
      ${hbarChart(dados.map(x=>({label:x.curto,val:x.res,color:x.res>=0?x.cor:'#A8291F'})))}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-percentage"></i>Margem de cada negócio</div><div class="bd">
      ${barChart(dados.filter(x=>x.receita>0).map(x=>({label:x.curto,val:x.margem,fmt:qtd(x.margem,0)+'%',color:x.margem>=0?x.cor:'#A8291F'})),{h:210})}</div></div>
  </div>`;
  body.innerHTML = h;
  window.__DRE = {dados,totR,totD,meses};
}

/* ---------------- Impressões e exportações ---------------- */
async function finImprimir(){
  const doMes = finDoMes(FIN_MES);
  const rec = somaFin(doMes,'receita'), des = somaFin(doMes,'despesa');
  const contas = await saldoContas();
  let h = prnHead('Resumo Financeiro','Competência '+dmesL(FIN_MES));
  h += `<div class="pkg">
    <div class="pkc"><div class="l">Receitas</div><div class="v">${moedaK(rec)}</div></div>
    <div class="pkc"><div class="l">Despesas</div><div class="v">${moedaK(des)}</div></div>
    <div class="pkc"><div class="l">Resultado</div><div class="v">${moedaK(rec-des)}</div></div>
    <div class="pkc"><div class="l">Saldo em caixa</div><div class="v">${moedaK(contas.reduce((s,c)=>s+c.saldo,0))}</div></div></div>`;
  h += `<div class="psec">Resultado por negócio</div><table><thead><tr><th>Negócio</th><th>Receita</th><th>Despesa</th><th>Resultado</th></tr></thead><tbody>`;
  [...UNIDADES.map(u=>u.id),'geral'].forEach(id=>{
    const r = resultadoUn(id,FIN_MES);
    if(!r.receita && !r.despesa) return;
    h += `<tr><td>${esc(unInfo(id).nome)}</td><td style="text-align:right">${moeda(r.receita)}</td>
      <td style="text-align:right">${moeda(r.despesa)}</td><td style="text-align:right">${moeda(r.resultado)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td>TOTAL</td><td style="text-align:right">${moeda(rec)}</td>
    <td style="text-align:right">${moeda(des)}</td><td style="text-align:right">${moeda(rec-des)}</td></tr></tfoot></table>`;
  h += `<div class="psec">Lançamentos do mês</div><table><thead><tr><th>Data</th><th>Descrição</th><th>Negócio</th>
    <th>Categoria</th><th>Situação</th><th>Valor</th></tr></thead><tbody>`;
  doMes.sort((a,b)=>String(a.data).localeCompare(String(b.data))).forEach(l=>{
    h += `<tr><td>${dbr(l.data)}</td><td>${esc(l.desc)}</td><td>${esc(unInfo(l.un).curto)}</td>
      <td>${esc(l.cat)}</td><td>${finStatus(l).t}</td>
      <td style="text-align:right">${l.tipo==='receita'?'+':'−'} ${moeda(l.valor)}</td></tr>`;
  });
  h += `</tbody></table>`;
  h += `<div class="psec">Saldo das contas</div><table><thead><tr><th>Conta</th><th>Tipo</th><th>Saldo</th></tr></thead><tbody>
    ${contas.map(c=>`<tr><td>${esc(c.nome)}</td><td>${esc(c.tipo)}</td><td style="text-align:right">${moeda(c.saldo)}</td></tr>`).join('')}
    </tbody></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}
async function finImprimirPend(tipo){
  const lista = FIN.filter(l=>l.tipo===tipo && l.status==='Pendente' && finVale(l))
    .sort((a,b)=>String(a.venc||a.data).localeCompare(String(b.venc||b.data)));
  let h = prnHead(tipo==='despesa'?'Contas a Pagar':'Contas a Receber','Posição em '+dbr(hoje()));
  h += `<table><thead><tr><th>Vencimento</th><th>Descrição</th><th>Negócio</th><th>Categoria</th>
    <th>${tipo==='despesa'?'Fornecedor':'Cliente'}</th><th>Atraso</th><th>Valor</th></tr></thead><tbody>`;
  lista.forEach(l=>{
    const d = diasEntre(l.venc||l.data,hoje());
    h += `<tr><td>${dbr(l.venc||l.data)}</td><td>${esc(l.desc)}</td><td>${esc(unInfo(l.un).curto)}</td>
      <td>${esc(l.cat)}</td><td>${esc(l.pessoa||'—')}</td><td style="text-align:center">${d>0?d+' d':'—'}</td>
      <td style="text-align:right">${moeda(l.valor)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan="6">TOTAL</td><td style="text-align:right">${moeda(lista.reduce((s,l)=>s+num(l.valor),0))}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}
async function finImprimirDRE(){
  const {dados,totR,totD,meses} = window.__DRE||{};
  if(!dados) return;
  let h = prnHead('Resultado por Unidade de Negócio',
                  `Período de ${dmes(meses[0]+'-01')} a ${dmes(meses[meses.length-1]+'-01')}`);
  h += `<div class="pkg"><div class="pkc"><div class="l">Receita total</div><div class="v">${moedaK(totR)}</div></div>
    <div class="pkc"><div class="l">Despesa total</div><div class="v">${moedaK(totD)}</div></div>
    <div class="pkc"><div class="l">Resultado</div><div class="v">${moedaK(totR-totD)}</div></div>
    <div class="pkc"><div class="l">Margem</div><div class="v">${totR?pct((totR-totD)/totR*100):'—'}</div></div></div>`;
  h += `<table><thead><tr><th>Negócio</th><th>Receita</th><th>Despesa</th><th>Resultado</th><th>Margem</th></tr></thead><tbody>`;
  dados.forEach(x=>{ h += `<tr><td>${esc(x.nome)}</td><td style="text-align:right">${moeda(x.receita)}</td>
    <td style="text-align:right">${moeda(x.despesa)}</td><td style="text-align:right">${moeda(x.res)}</td>
    <td style="text-align:right">${x.receita?pct(x.margem):'—'}</td></tr>`; });
  h += `</tbody><tfoot><tr><td>TOTAL</td><td style="text-align:right">${moeda(totR)}</td>
    <td style="text-align:right">${moeda(totD)}</td><td style="text-align:right">${moeda(totR-totD)}</td>
    <td style="text-align:right">${totR?pct((totR-totD)/totR*100):'—'}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}
async function finExportar(){
  const contas = await dbGetAll('contas');
  const mapC = {}; contas.forEach(c=>mapC[c.id]=c.nome);
  const linhas = [['Data','Vencimento','Pagamento','Tipo','Descricao','Negocio','Vinculo','Categoria','Pessoa',
                   'Conta','Forma','Documento','Situacao','Valor']];
  FIN.slice().sort((a,b)=>String(a.data).localeCompare(String(b.data))).forEach(l=>{
    linhas.push([dbr(l.data),dbr(l.venc),dbr(l.dtPag),l.tipo,l.desc,unInfo(l.un).nome,l.refNome,l.cat,l.pessoa,
      mapC[l.contaId]||'',l.forma,l.doc,finStatus(l).t,
      String((l.tipo==='receita'?1:-1)*num(l.valor).toFixed(2)).replace('.',',')]);
  });
  exportCSV(linhas,'financeiro_jev.csv');
}

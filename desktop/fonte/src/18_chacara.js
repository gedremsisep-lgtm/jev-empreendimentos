/* =========================================================================
   NEGÓCIO: PRODUÇÃO DA CHÁCARA
   ========================================================================= */
let CHA_TAB = 'lotes';
function chaStab(t){ CHA_TAB = t; chacaraRender(); }

function finDoRef(refTipo,refId,tipo){
  return FIN.filter(l=>finVale(l) && l.refTipo===refTipo && Number(l.refId)===Number(refId)
                    && (!tipo || l.tipo===tipo));
}

async function chacaraRender(){
  const root = document.getElementById('chacara-root');
  await finLoad();
  const lotes = await dbGetAll('lotes');
  const ciclos = await dbGetAll('ciclos');
  const ativos = ciclos.filter(c=>c.status==='Em andamento');
  const mk = mesAtual();
  const rec = FIN.filter(l=>finVale(l)&&l.un==='chacara'&&l.tipo==='receita'&&String(l.data).slice(0,7)===mk).reduce((s,l)=>s+num(l.valor),0);
  const des = FIN.filter(l=>finVale(l)&&l.un==='chacara'&&l.tipo==='despesa'&&String(l.data).slice(0,7)===mk).reduce((s,l)=>s+num(l.valor),0);
  const areaTotal = lotes.reduce((s,l)=>s+num(l.area),0);
  const recAno = FIN.filter(l=>finVale(l)&&l.un==='chacara'&&l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const desAno = FIN.filter(l=>finVale(l)&&l.un==='chacara'&&l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);

  let h = `<div class="ph"><div class="ic" style="background:#E8F4E9;color:#2E7D32"><i class="ti ti-plant-2"></i></div>
    <div><h1>Produção da Chácara</h1><p>Lotes, ciclos de produção, colheita e custo de custeio</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="cicloForm()"><i class="ti ti-seeding"></i>Novo ciclo</button>
    <button class="btn gn" onclick="loteForm()"><i class="ti ti-plus"></i>Novo lote</button></div>`;

  h += `<div class="kg" style="margin-bottom:16px">
    <div class="kc gn"><div class="lb"><i class="ti ti-map-2"></i>Lotes e áreas</div><div class="vl">${lotes.length}</div>
      <div class="sb">${qtd(areaTotal,2)} ${lotes[0]?esc(lotes[0].und||'ha'):'ha'} no total</div></div>
    <div class="kc br"><div class="lb"><i class="ti ti-seeding"></i>Ciclos em andamento</div><div class="vl">${ativos.length}</div>
      <div class="sb">${ciclos.filter(c=>c.status==='Colhido').length} colhido(s) · ${ciclos.length} no total</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-trending-down"></i>Custeio do mês</div><div class="vl">${moedaK(des)}</div>
      <div class="sb">insumos, ração, mão de obra</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-trending-up"></i>Receita do mês</div><div class="vl">${moedaK(rec)}</div>
      <div class="sb">${dmesL(mk)}</div></div>
    <div class="kc ${recAno-desAno>=0?'tl':'rd'}"><div class="lb"><i class="ti ti-report-money"></i>Resultado acumulado</div>
      <div class="vl">${moedaK(recAno-desAno)}</div><div class="sb">desde o início dos registros</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-scale"></i>Produção colhida</div>
      <div class="vl">${qtd(ciclos.reduce((s,c)=>s+num(c.prodReal),0),0)}</div>
      <div class="sb">soma das colheitas registradas</div></div>
  </div>`;

  h += `<div class="tabs">
    <button class="tab ${CHA_TAB==='lotes'?'on':''}" onclick="chaStab('lotes')"><i class="ti ti-map-2"></i>Lotes e áreas</button>
    <button class="tab ${CHA_TAB==='ciclos'?'on':''}" onclick="chaStab('ciclos')"><i class="ti ti-seeding"></i>Ciclos de produção</button>
    <button class="tab ${CHA_TAB==='res'?'on':''}" onclick="chaStab('res')"><i class="ti ti-chart-bar"></i>Resultado por ciclo</button>
  </div><div id="cha-body"></div>`;
  root.innerHTML = h;

  if(CHA_TAB==='lotes')  await chaTabLotes(lotes,ciclos);
  if(CHA_TAB==='ciclos') await chaTabCiclos(lotes,ciclos);
  if(CHA_TAB==='res')    await chaTabResultado(lotes,ciclos);
}

async function chaTabLotes(lotes,ciclos){
  const body = document.getElementById('cha-body');
  if(!lotes.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-map-off"></i>
      <b>Nenhum lote cadastrado</b>Divida a chácara em áreas: talhão de lavoura, pomar, horta, pastagem,
      curral, viveiro. Depois cada ciclo de produção fica ligado a um lote e o custo aparece separado.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn gn" onclick="loteForm()"><i class="ti ti-plus"></i>Cadastrar lote</button></div></div></div></div>`;
    return;
  }
  let h = `<div class="mgrid">`;
  lotes.forEach(l=>{
    const cs = ciclos.filter(c=>Number(c.loteId)===Number(l.id));
    const ativo = cs.find(c=>c.status==='Em andamento');
    const rec = finDoRef('lote',l.id,'receita').reduce((s,x)=>s+num(x.valor),0)
              + cs.reduce((s,c)=>s+finDoRef('ciclo',c.id,'receita').reduce((a,x)=>a+num(x.valor),0),0);
    const des = finDoRef('lote',l.id,'despesa').reduce((s,x)=>s+num(x.valor),0)
              + cs.reduce((s,c)=>s+finDoRef('ciclo',c.id,'despesa').reduce((a,x)=>a+num(x.valor),0),0);
    h += `<div class="ocard" onclick="loteForm(${l.id})">
      <div class="oh"><div class="oi" style="background:#E8F4E9;color:#2E7D32"><i class="ti ti-${l.tipo&&l.tipo.includes('Curral')?'cow':l.tipo==='Pomar'?'apple':l.tipo==='Açude'?'fish':'plant-2'}"></i></div>
        <div style="flex:1;min-width:0"><b style="display:block;font-size:13.5px">${esc(l.nome)}</b>
          <span class="tt">${esc(l.tipo)}</span></div>
        ${ativo?`<span class="st s-pd">Em produção</span>`:`<span class="st s-nt">Livre</span>`}</div>
      <div class="ob">
        <div class="row"><span>Área</span><b>${qtd(l.area,2)} ${esc(l.und||'ha')}</b></div>
        <div class="row"><span>Cultura atual</span><b>${esc(ativo?ativo.cultura:(l.cultura||'—'))}</b></div>
        <div class="row"><span>Ciclos registrados</span><b>${cs.length}</b></div>
        <div class="row"><span>Receita</span><b style="color:var(--green)">${moedaK(rec)}</b></div>
        <div class="row"><span>Custo</span><b style="color:var(--red)">${moedaK(des)}</b></div>
        <div style="border-top:1px solid var(--bg3);margin-top:6px;padding-top:7px;display:flex;justify-content:space-between">
          <span style="font-size:12px;color:var(--text2);font-weight:700">Resultado</span>
          <b style="color:${rec-des>=0?'var(--green)':'var(--red)'}">${moedaK(rec-des)}</b></div>
      </div></div>`;
  });
  h += `</div>`;
  body.innerHTML = h;
}
async function loteForm(id){
  const l = id ? await dbGet('lotes',id) : null;
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Nome do lote <span class="rq">*</span></label>
        <input id="lo-nome" value="${esc(l?l.nome:'')}" placeholder="Ex.: Talhão 1 — fundo da chácara"></div>
      <div class="fg"><label>Tipo</label><select id="lo-tipo">${TIPOS_LOTE.map(t=>`<option ${l&&l.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div></div>
    <div class="fr3">
      <div class="fg"><label>Área / capacidade</label><input id="lo-area" type="number" step="0.01" value="${l?l.area:''}"></div>
      <div class="fg"><label>Unidade</label><select id="lo-und">
        ${['ha','m²','alqueire','cabeças','unidades'].map(u=>`<option ${l&&l.und===u?'selected':''}>${u}</option>`).join('')}</select></div>
      <div class="fg"><label>Cultura / criação principal</label><select id="lo-cult">
        <option value="">—</option>${CULTURAS.map(c=>`<option ${l&&l.cultura===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
    <div class="fg"><label>Observações (solo, irrigação, cercas, benfeitorias)</label><textarea id="lo-obs">${esc(l?l.obs:'')}</textarea></div>
    <div id="lo-err"></div>`;
  modal(id?'Editar lote':'Novo lote','ti-map-2',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     ${id?`<button class="btn rd" onclick="loteDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
     <button class="btn gn" onclick="loteSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`,'sm');
}
async function loteSave(id){
  const nome = val('lo-nome');
  if(!nome){ document.getElementById('lo-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome do lote.</div>`; return; }
  const d = {nome, tipo:val('lo-tipo'), area:num(val('lo-area')), und:val('lo-und'), cultura:val('lo-cult'), obs:val('lo-obs')};
  if(id){ const old = await dbGet('lotes',id); await dbPut('lotes',{...old,...d}); }
  else await dbAdd('lotes',d);
  closeModal('mk-form'); toast('Lote salvo.'); chacaraRender();
}
function loteDel(id){
  confirmar('Excluir lote','Os ciclos vinculados ficam sem lote. Os lançamentos financeiros são mantidos.',
    async()=>{ await dbDel('lotes',id); closeModal('mk-form'); toast('Lote removido.','aw'); chacaraRender(); });
}

async function chaTabCiclos(lotes,ciclos){
  const body = document.getElementById('cha-body');
  const mapL = {}; lotes.forEach(l=>mapL[l.id]=l);
  let h = `<div class="card"><div class="hd"><i class="ti ti-seeding"></i>Ciclos de produção<span class="sp"></span>
    <button class="btn sm gn" onclick="cicloForm()"><i class="ti ti-plus"></i>Novo ciclo</button></div><div class="bd">`;
  if(!ciclos.length){
    h += `<div class="empty"><i class="ti ti-seeding-off"></i><b>Nenhum ciclo registrado</b>
      Um ciclo é um plantio, uma engorda ou uma safra: tem data de início, custo de insumos, colheita e venda.
      É assim que se descobre se aquela cultura deu lucro.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Ciclo</th><th>Lote</th><th>Cultura</th><th class="c">Período</th><th class="c">Situação</th>
      <th class="r">Produção</th><th class="r">Custo</th><th class="r">Receita</th><th class="r">Resultado</th><th class="c no-print"></th></tr></thead><tbody>`;
    ciclos.sort((a,b)=>String(b.dtIni).localeCompare(String(a.dtIni))).forEach(c=>{
      const custo = finDoRef('ciclo',c.id,'despesa').reduce((s,x)=>s+num(x.valor),0);
      const rec = finDoRef('ciclo',c.id,'receita').reduce((s,x)=>s+num(x.valor),0);
      h += `<tr><td><b>${esc(c.nome)}</b></td><td class="tt">${esc(mapL[c.loteId]?mapL[c.loteId].nome:'—')}</td>
        <td>${esc(c.cultura)}</td>
        <td class="c n tt">${dbr(c.dtIni)}<br>${c.dtColheita?'colhido '+dbr(c.dtColheita):'prev. '+dbr(c.dtPrev)}</td>
        <td class="c"><span class="st ${ST_CICLO[c.status]||'s-nt'}">${esc(c.status)}</span></td>
        <td class="r n">${c.prodReal?qtd(c.prodReal,0)+' '+esc(c.und||''):(c.prodPrev?'prev. '+qtd(c.prodPrev,0):'—')}</td>
        <td class="r n" style="color:var(--red)">${moeda(custo)}</td>
        <td class="r n" style="color:var(--green)">${moeda(rec)}</td>
        <td class="r n"><b style="color:${rec-custo>=0?'var(--green)':'var(--red)'}">${moeda(rec-custo)}</b></td>
        <td class="c no-print nowrap">
          <button class="ib gn" title="Lançar custo" onclick="cicloCusto(${c.id})"><i class="ti ti-shopping-cart"></i></button>
          <button class="ib bl" title="Registrar colheita/venda" onclick="cicloColheita(${c.id})"><i class="ti ti-basket"></i></button>
          <button class="ib" onclick="cicloForm(${c.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="cicloDel(${c.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  }
  body.innerHTML = h;
}
async function cicloForm(id){
  const c = id ? await dbGet('ciclos',id) : null;
  const lotes = await dbGetAll('lotes');
  if(!lotes.length){ toast('Cadastre ao menos um lote antes de criar um ciclo.','aw'); loteForm(); return; }
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Nome do ciclo <span class="rq">*</span></label>
        <input id="ci-nome" value="${esc(c?c.nome:'')}" placeholder="Ex.: Milho safrinha 2026 — Talhão 1"></div>
      <div class="fg"><label>Situação</label><select id="ci-status">
        ${Object.keys(ST_CICLO).map(s=>`<option ${c&&c.status===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="fr3">
      <div class="fg"><label>Lote <span class="rq">*</span></label><select id="ci-lote">
        ${lotes.map(l=>`<option value="${l.id}" ${c&&Number(c.loteId)===Number(l.id)?'selected':''}>${esc(l.nome)}</option>`).join('')}</select></div>
      <div class="fg"><label>Cultura / criação</label><select id="ci-cult">
        ${CULTURAS.map(x=>`<option ${c&&c.cultura===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="fg"><label>Área / quantidade trabalhada</label><input id="ci-area" type="number" step="0.01" value="${c?c.area:''}"></div></div>
    <div class="fr4">
      <div class="fg"><label>Início <span class="rq">*</span></label><input id="ci-ini" type="date" value="${c?c.dtIni:hoje()}"></div>
      <div class="fg"><label>Previsão de colheita</label><input id="ci-prev" type="date" value="${c?c.dtPrev:addDias(hoje(),120)}"></div>
      <div class="fg"><label>Produção prevista</label><input id="ci-pprev" type="number" step="0.01" value="${c?c.prodPrev:''}"></div>
      <div class="fg"><label>Unidade</label><select id="ci-und">${UND_PROD.map(u=>`<option ${c&&c.und===u?'selected':''}>${u}</option>`).join('')}</select></div></div>
    <div class="fr3">
      <div class="fg"><label>Custo previsto (R$)</label><input id="ci-custo" type="number" step="0.01" value="${c?c.custoPrev:''}"></div>
      <div class="fg"><label>Preço esperado por unidade (R$)</label><input id="ci-preco" type="number" step="0.01" value="${c?c.precoPrev:''}"></div>
      <div class="fg"><label>Data da colheita</label><input id="ci-colh" type="date" value="${c?c.dtColheita:''}"></div></div>
    <div class="fg"><label>Observações (variedade, adubação, clima, ocorrências)</label><textarea id="ci-obs">${esc(c?c.obs:'')}</textarea></div>
    <div id="ci-err"></div>`;
  modal(id?'Editar ciclo':'Novo ciclo de produção','ti-seeding',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="cicloSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function cicloSave(id){
  const nome = val('ci-nome');
  if(!nome){ document.getElementById('ci-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome do ciclo.</div>`; return; }
  const d = {nome, status:val('ci-status'), loteId:Number(val('ci-lote')), cultura:val('ci-cult'),
             area:num(val('ci-area')), dtIni:val('ci-ini'), dtPrev:val('ci-prev'),
             prodPrev:num(val('ci-pprev')), und:val('ci-und'), custoPrev:num(val('ci-custo')),
             precoPrev:num(val('ci-preco')), dtColheita:val('ci-colh'), obs:val('ci-obs')};
  if(id){ const old = await dbGet('ciclos',id); await dbPut('ciclos',{...old,...d}); }
  else await dbAdd('ciclos',{...d, prodReal:0});
  closeModal('mk-form'); toast('Ciclo salvo.'); chacaraRender();
}
function cicloDel(id){
  confirmar('Excluir ciclo','Os lançamentos financeiros vinculados são mantidos no histórico.',
    async()=>{ await dbDel('ciclos',id); toast('Ciclo removido.','aw'); chacaraRender(); });
}
async function cicloCusto(id){
  const c = await dbGet('ciclos',id);
  finLancForm(null,{tipo:'despesa', un:'chacara', desc:'', refTipo:'ciclo', refId:id});
  setTimeout(()=>{
    const s = document.getElementById('fl-ref'); if(s) s.value = 'ciclo:'+id;
    setVal('fl-desc','Insumos — '+c.nome);
    const cat = document.getElementById('fl-cat'); if(cat) cat.value = 'Insumos agrícolas';
  },160);
}
async function cicloColheita(id){
  const c = await dbGet('ciclos',id);
  const custo = finDoRef('ciclo',c.id,'despesa').reduce((s,x)=>s+num(x.valor),0);
  const b = `<div class="al ai"><i class="ti ti-basket"></i><div>Ciclo <b>${esc(c.nome)}</b> —
      custo já lançado: <b>${moeda(custo)}</b>${c.prodPrev?`, produção prevista ${qtd(c.prodPrev,0)} ${esc(c.und)}`:''}.</div></div>
    <div class="fr3">
      <div class="fg"><label>Data da colheita</label><input id="co-data" type="date" value="${c.dtColheita||hoje()}"></div>
      <div class="fg"><label>Produção colhida</label><input id="co-prod" type="number" step="0.01" value="${c.prodReal||c.prodPrev||''}" oninput="coCalc(${custo})"></div>
      <div class="fg"><label>Unidade</label><input id="co-und" value="${esc(c.und||'kg')}" readonly></div></div>
    <div class="fr3">
      <div class="fg"><label>Quantidade vendida</label><input id="co-vend" type="number" step="0.01" value="" oninput="coCalc(${custo})"></div>
      <div class="fg"><label>Preço por unidade (R$)</label><input id="co-preco" type="number" step="0.01" value="${c.precoPrev||''}" oninput="coCalc(${custo})"></div>
      <div class="fg"><label>Receita da venda</label><input id="co-total" readonly value="R$ 0,00"></div></div>
    <div class="fr3">
      <div class="fg"><label>Comprador</label><input id="co-comp" placeholder="Quem comprou"></div>
      <div class="fg"><label>Situação do recebimento</label><select id="co-status">
        <option value="Pago">Já recebido</option><option value="Pendente">A receber</option></select></div>
      <div class="fg"><label>Data do recebimento</label><input id="co-dtpag" type="date" value="${hoje()}"></div></div>
    <div id="co-res" class="al ag"></div>`;
  modal('Registrar colheita e venda','ti-basket',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="cicloColheitaSave(${id})"><i class="ti ti-check"></i>Registrar</button>`);
  coCalc(custo);
}
function coCalc(custo){
  const q = num(val('co-vend')), p = num(val('co-preco'));
  const tot = q*p;
  setVal('co-total', moeda(tot));
  const prod = num(val('co-prod'));
  const box = document.getElementById('co-res');
  if(box) box.innerHTML = `<i class="ti ti-calculator"></i><div>
    Custo do ciclo <b>${moeda(custo)}</b> · receita <b>${moeda(tot)}</b> ·
    resultado <b style="color:${tot-custo>=0?'var(--green)':'var(--red)'}">${moeda(tot-custo)}</b>
    ${prod?` · custo por ${esc(val('co-und'))}: <b>${moeda(custo/prod)}</b>`:''}
    ${prod&&p?` · margem: <b>${pct((p-(custo/prod))/p*100)}</b>`:''}</div>`;
}
async function cicloColheitaSave(id){
  const c = await dbGet('ciclos',id);
  const prod = num(val('co-prod')), q = num(val('co-vend')), p = num(val('co-preco'));
  await dbPut('ciclos',{...c, prodReal:prod, dtColheita:val('co-data'),
    status: q>0?'Vendido':'Colhido', precoReal:p});
  if(q>0 && p>0){
    await finAdd({tipo:'receita', un:'chacara', refTipo:'ciclo', refId:id, refNome:c.nome,
      desc:`Venda da produção — ${c.nome} (${qtd(q,0)} ${c.und||''})`, valor:q*p,
      cat: (c.cultura==='Bovinos'||c.cultura==='Suínos'||c.cultura==='Aves / frango')?'Venda de animais':'Venda da produção',
      data:val('co-data'), venc:val('co-dtpag'), status:val('co-status'),
      dtPag: val('co-status')==='Pago'?val('co-dtpag'):'', pessoa:val('co-comp'),
      contaId:CFG.contaPadrao||null, auto:true, origem:'Colheita e venda'});
  }
  closeModal('mk-form'); toast('Colheita registrada.'); chacaraRender();
}

async function chaTabResultado(lotes,ciclos){
  const body = document.getElementById('cha-body');
  if(!ciclos.length){ body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-chart-bar"></i>
    <b>Sem ciclos</b>Registre ciclos de produção para comparar o resultado de cada cultura.</div></div></div>`; return; }
  const mapL = {}; lotes.forEach(l=>mapL[l.id]=l);
  const dados = ciclos.map(c=>{
    const custo = finDoRef('ciclo',c.id,'despesa').reduce((s,x)=>s+num(x.valor),0);
    const rec = finDoRef('ciclo',c.id,'receita').reduce((s,x)=>s+num(x.valor),0);
    return {...c, custo, rec, res:rec-custo,
      custoUn: num(c.prodReal)? custo/num(c.prodReal):0,
      prodArea: num(c.area)? num(c.prodReal)/num(c.area):0,
      margem: rec? (rec-custo)/rec*100 : 0};
  });
  const porCultura = {};
  dados.forEach(d=>{
    if(!porCultura[d.cultura]) porCultura[d.cultura] = {rec:0,custo:0,prod:0,n:0};
    porCultura[d.cultura].rec += d.rec; porCultura[d.cultura].custo += d.custo;
    porCultura[d.cultura].prod += num(d.prodReal); porCultura[d.cultura].n++;
  });
  const PAL = ['#2E7D32','#B0842B','#1F5FA8','#7B3FA0','#C0392B','#0E6E70','#B4531F','#5B6260'];
  let h = `<div class="card tw"><div class="hd"><i class="ti ti-table"></i>Resultado de cada ciclo
      <span class="sp"></span><button class="btn sm gh" onclick="chaImprimir()"><i class="ti ti-printer"></i>Imprimir</button></div>
    <div class="bd"><table><thead><tr><th>Ciclo</th><th>Cultura</th><th>Lote</th><th class="r">Produção</th>
      <th class="r">Custo</th><th class="r">Custo/un.</th><th class="r">Receita</th><th class="r">Resultado</th><th class="r">Margem</th></tr></thead><tbody>
      ${dados.sort((a,b)=>b.res-a.res).map(d=>`<tr>
        <td><b>${esc(d.nome)}</b><br><span class="tt">${dbr(d.dtIni)}${d.dtColheita?' a '+dbr(d.dtColheita):''}</span></td>
        <td>${esc(d.cultura)}</td><td class="tt">${esc(mapL[d.loteId]?mapL[d.loteId].nome:'—')}</td>
        <td class="r n">${d.prodReal?qtd(d.prodReal,0)+' '+esc(d.und||''):'—'}</td>
        <td class="r n" style="color:var(--red)">${moeda(d.custo)}</td>
        <td class="r n">${d.custoUn?moeda(d.custoUn):'—'}</td>
        <td class="r n" style="color:var(--green)">${moeda(d.rec)}</td>
        <td class="r n"><b style="color:${d.res>=0?'var(--green)':'var(--red)'}">${moeda(d.res)}</b></td>
        <td class="r n">${d.rec?pct(d.margem):'—'}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">TOTAL</td>
      <td class="r n">${moeda(dados.reduce((s,d)=>s+d.custo,0))}</td><td></td>
      <td class="r n">${moeda(dados.reduce((s,d)=>s+d.rec,0))}</td>
      <td class="r n">${moeda(dados.reduce((s,d)=>s+d.res,0))}</td><td></td></tr></tfoot></table></div></div>
    <div class="chg">
      <div class="card"><div class="hd"><i class="ti ti-plant"></i>Resultado por cultura</div><div class="bd">
        ${hbarChart(Object.entries(porCultura).map(([k,v],i)=>({label:k+' ('+v.n+' ciclo'+(v.n>1?'s':'')+')',
          val:v.rec-v.custo, color:(v.rec-v.custo)>=0?PAL[i%PAL.length]:'#A8291F'})))}</div></div>
      <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>Custo de custeio por cultura</div><div class="bd">
        ${donutChart(Object.entries(porCultura).filter(([,v])=>v.custo>0).map(([k,v],i)=>({label:k,val:v.custo,color:PAL[i%PAL.length]})),
          {centerLabel:'CUSTEIO',centerVal:moedaK(dados.reduce((s,d)=>s+d.custo,0))})}</div></div>
    </div>`;
  body.innerHTML = h;
  window.__CHA = {dados,mapL};
}
async function chaImprimir(){
  const {dados,mapL} = window.__CHA||{};
  if(!dados) return;
  let h = prnHead('Resultado da Produção — Chácara','Posição em '+dbr(hoje()));
  const tc = dados.reduce((s,d)=>s+d.custo,0), tr = dados.reduce((s,d)=>s+d.rec,0);
  h += `<div class="pkg"><div class="pkc"><div class="l">Ciclos</div><div class="v">${dados.length}</div></div>
    <div class="pkc"><div class="l">Custeio total</div><div class="v">${moedaK(tc)}</div></div>
    <div class="pkc"><div class="l">Receita total</div><div class="v">${moedaK(tr)}</div></div>
    <div class="pkc"><div class="l">Resultado</div><div class="v">${moedaK(tr-tc)}</div></div></div>`;
  h += `<table><thead><tr><th>Ciclo</th><th>Cultura</th><th>Lote</th><th>Período</th><th>Produção</th>
    <th>Custo</th><th>Receita</th><th>Resultado</th></tr></thead><tbody>`;
  dados.forEach(d=>{ h += `<tr><td>${esc(d.nome)}</td><td>${esc(d.cultura)}</td>
    <td>${esc(mapL[d.loteId]?mapL[d.loteId].nome:'—')}</td>
    <td>${dbr(d.dtIni)}${d.dtColheita?' a '+dbr(d.dtColheita):''}</td>
    <td style="text-align:right">${d.prodReal?qtd(d.prodReal,0)+' '+(d.und||''):'—'}</td>
    <td style="text-align:right">${moeda(d.custo)}</td><td style="text-align:right">${moeda(d.rec)}</td>
    <td style="text-align:right">${moeda(d.res)}</td></tr>`; });
  h += `</tbody><tfoot><tr><td colspan="5">TOTAL</td><td style="text-align:right">${moeda(tc)}</td>
    <td style="text-align:right">${moeda(tr)}</td><td style="text-align:right">${moeda(tr-tc)}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}

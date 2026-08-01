/* =========================================================================
   MÓDULO: OBRAS — cadastro, cartões, ficha e seleção da obra ativa
   ========================================================================= */

async function refreshObraSelect(){
  const obras = await dbGetAll('obras');
  const ativas = obras.filter(o=>o.status!=='Entregue');
  const lista = ativas.length?ativas:obras;
  if(!OBRA || !lista.some(o=>Number(o.id)===Number(OBRA))) OBRA = lista.length?lista[0].id:null;
  const sel = document.getElementById('obra-ativa');
  if(!sel) return;
  sel.innerHTML = lista.length
    ? lista.map(o=>`<option value="${o.id}">${esc(o.cod)} — ${esc(o.nome)}</option>`).join('')
    : `<option value="">— nenhuma obra cadastrada —</option>`;
  if(OBRA) sel.value = OBRA;
}
function setObraAtiva(id){
  OBRA = id ? Number(id) : null;
  go(PG);
}
async function obraAtual(){ return OBRA ? await dbGet('obras',OBRA) : null; }

function semObra(msg){
  return `<div class="card"><div class="bd"><div class="empty">
    <i class="ti ti-building-estate"></i><b>Nenhuma obra selecionada</b>
    ${esc(msg||'Cadastre uma obra para começar a usar este módulo.')}
    <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="go('obras')"><i class="ti ti-plus"></i>Ir para Obras</button></div>
  </div></div></div>`;
}

/* lançamentos financeiros de uma obra */
function finDaObra(obraId,tipo){
  return FIN.filter(l=>finVale(l) && l.un==='obras' && Number(l.refId)===Number(obraId)
                    && l.tipo===(tipo||'despesa'));
}
function prnObraInfo(o){
  if(!o) return '';
  return `<div class="pinf">
    <div><span>Obra:</span> <b>${esc(o.nome)}</b></div>
    <div><span>Código:</span> <b>${esc(o.cod)}</b></div>
    <div><span>Tipo:</span> <b>${esc(o.tipo)}</b></div>
    <div><span>Cliente:</span> <b>${esc(o.cliente||'—')}</b></div>
    <div><span>Endereço:</span> <b>${esc(o.endereco||'—')}</b></div>
    <div><span>Cidade:</span> <b>${esc(o.cidade||'—')}</b></div>
    <div><span>Área construída:</span> <b>${qtd(o.area,2)} m²</b></div>
    <div><span>Início:</span> <b>${dbr(o.dtInicio)}</b></div>
    <div><span>Previsão de término:</span> <b>${dbr(o.dtPrevFim)}</b></div>
  </div>`;
}

/* ---------- Cálculos consolidados de uma obra ---------- */
async function obraResumo(obraId){
  const [etapas,orc,med] = await Promise.all([
    dbByObra('etapas',obraId), dbByObra('orcamento',obraId), dbByObra('medicoes',obraId)
  ]);
  const lanc = finDaObra(obraId);
  const orcado    = orc.reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
  const realizado = lanc.reduce((s,x)=>s+num(x.valor),0);
  const pesoTot   = etapas.reduce((s,e)=>s+num(e.peso),0) || 100;
  const avanco    = etapas.reduce((s,e)=>s+num(e.peso)*num(e.avanco)/100,0)/pesoTot*100;
  // avanço planejado até hoje (linha de base do cronograma)
  const hj = hoje();
  let plan = 0;
  etapas.forEach(e=>{
    if(!e.dtIni||!e.dtFim){ return; }
    let f = 0;
    if(hj>=e.dtFim) f = 1;
    else if(hj>e.dtIni){ const tot=diasEntre(e.dtIni,e.dtFim)||1; f = clamp(diasEntre(e.dtIni,hj)/tot,0,1); }
    plan += num(e.peso)*f;
  });
  plan = plan/pesoTot*100;
  const medido = med.reduce((s,m)=>s+num(m.valor),0);
  return {etapas,orc,lanc,med,orcado,realizado,avanco,plan,medido,
          saldo:orcado-realizado, desvio:orcado?((realizado-orcado)/orcado*100):0};
}

/* ---------- Lista de obras ---------- */
async function obrasRender(){
  const obras = await dbGetAll('obras');
  const root  = document.getElementById('obras-root');
  const resumos = {};
  for(const o of obras) resumos[o.id] = await obraResumo(o.id);

  const totOrc = obras.reduce((s,o)=>s+resumos[o.id].orcado,0);
  const totRea = obras.reduce((s,o)=>s+resumos[o.id].realizado,0);
  const totCon = obras.reduce((s,o)=>s+num(o.valorContrato),0);
  const totArea= obras.reduce((s,o)=>s+num(o.area),0);

  let html = `<div class="ph"><div class="ic"><i class="ti ti-building-community"></i></div>
    <div><h1>Obras</h1><p>Cadastro e acompanhamento de todas as obras da empresa</p></div>
    <div class="sp"></div>
    <button class="btn" onclick="obraForm()"><i class="ti ti-plus"></i>Nova Obra</button></div>`;

  html += `<div class="kg">
    <div class="kc bl"><div class="lb"><i class="ti ti-building"></i>Obras</div><div class="vl">${obras.length}</div>
      <div class="sb">${obras.filter(o=>o.status==='Em andamento').length} em andamento · ${obras.filter(o=>o.status==='Concluída'||o.status==='Entregue').length} concluídas</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-ruler-2"></i>Área total</div><div class="vl">${qtd(totArea,0)} m²</div><div class="sb">soma das áreas construídas</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-file-dollar"></i>Contratado</div><div class="vl">${moedaK(totCon)}</div><div class="sb">valor de contrato com clientes</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-calculator"></i>Orçado</div><div class="vl">${moedaK(totOrc)}</div><div class="sb">custo previsto das obras</div></div>
    <div class="kc rd"><div class="lb"><i class="ti ti-cash"></i>Realizado</div><div class="vl">${moedaK(totRea)}</div>
      <div class="sb">${totOrc?pct(totRea/totOrc*100):'0,0%'} do orçado</div></div>
  </div>`;

  if(!obras.length){
    html += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-home-plus"></i>
      <b>Nenhuma obra cadastrada</b>Comece cadastrando sua primeira obra. O sistema já cria o cronograma
      com as 14 etapas padrão de edificação e pode gerar o orçamento automático a partir da área construída.
      <div class="brow" style="justify-content:center;margin-top:14px"><button class="btn" onclick="obraForm()"><i class="ti ti-plus"></i>Cadastrar primeira obra</button>
      <button class="btn gh" onclick="seedDemo()"><i class="ti ti-flask"></i>Carregar dados de exemplo</button></div></div></div></div>`;
  } else {
    html += `<div class="sh"><i class="ti ti-layout-grid"></i>Carteira de obras</div><div class="mgrid">`;
    obras.forEach(o=>{
      const r = resumos[o.id], ti = tipoInfo(o.tipo);
      const atraso = r.avanco - r.plan;
      const corAv = atraso < -8 ? 'rd' : atraso < -2 ? 'am' : 'gn';
      html += `<div class="ocard" onclick="obraDetalhe(${o.id})">
        <div class="oh"><div class="oi" style="background:${ti.cor}1A;color:${ti.cor}"><i class="ti ${ti.ic}"></i></div>
          <div style="flex:1;min-width:0"><b style="display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.nome)}</b>
            <span class="tt">${esc(o.cod)} · ${esc(o.tipo)}</span></div>
          <span class="st ${ST_OBRA[o.status]||'s-nt'}">${esc(o.status)}</span></div>
        <div class="ob">
          <div class="row"><span>Cliente</span><b>${esc((o.cliente||'—').slice(0,22))}</b></div>
          <div class="row"><span>Área</span><b>${qtd(o.area,0)} m²</b></div>
          <div class="row"><span>Orçado</span><b>${moedaK(r.orcado)}</b></div>
          <div class="row"><span>Realizado</span><b style="color:${r.realizado>r.orcado&&r.orcado?'var(--red)':'var(--text)'}">${moedaK(r.realizado)}</b></div>
          <div class="row"><span>Prev. término</span><b>${dbr(o.dtPrevFim)}</b></div>
          <div style="margin-top:9px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
              <span style="color:var(--text2);font-weight:700">Avanço físico</span>
              <span style="font-weight:800">${pct(r.avanco)} <span style="color:var(--text3);font-weight:600">/ ${pct(r.plan)} prev.</span></span></div>
            <div class="pb"><div class="pf ${corAv}" style="width:${clamp(r.avanco,0,100)}%"></div></div>
          </div>
        </div></div>`;
    });
    html += `</div>`;
  }
  root.innerHTML = html;
  await refreshObraSelect();
}

/* ---------- Formulário de obra ---------- */
async function obraForm(id){
  const o = id ? await dbGet('obras',id) : null;
  const obras = await dbGetAll('obras');
  const prox = 'OB-' + String(obras.reduce((m,x)=>Math.max(m,parseInt(String(x.cod||'').replace(/\D/g,''))||0),0)+1).padStart(3,'0');
  const b = `
   <div class="fr3">
     <div class="fg"><label>Código</label><input id="ob-cod" value="${esc(o?o.cod:prox)}" readonly></div>
     <div class="fg" style="grid-column:span 2"><label>Nome da obra <span class="rq">*</span></label>
       <input id="ob-nome" placeholder="Ex.: Residência Silva — Jardim Itália" value="${esc(o?o.nome:'')}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Tipo <span class="rq">*</span></label><select id="ob-tipo">
       ${TIPOS_OBRA.map(t=>`<option ${o&&o.tipo===t.v?'selected':''}>${t.v}</option>`).join('')}</select></div>
     <div class="fg"><label>Status</label><select id="ob-status">
       ${Object.keys(ST_OBRA).map(s=>`<option ${o&&o.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
     <div class="fg"><label>Responsável técnico</label><input id="ob-resp" value="${esc(o?o.respTec:(CFG.respTec||''))}" placeholder="Engenheiro / Arquiteto"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Cliente / Proprietário</label><input id="ob-cli" value="${esc(o?o.cliente:'')}"></div>
     <div class="fg"><label>Telefone</label><input id="ob-tel" value="${esc(o?o.telefone:'')}" placeholder="(00) 00000-0000"></div>
     <div class="fg"><label>Nº da ART / RRT</label><input id="ob-art" value="${esc(o?o.art:'')}"></div>
   </div>
   <div class="fr3">
     <div class="fg" style="grid-column:span 2"><label>Endereço da obra</label><input id="ob-end" value="${esc(o?o.endereco:'')}" placeholder="Rua, nº, bairro / lote e quadra"></div>
     <div class="fg"><label>Cidade / UF</label><input id="ob-cid" value="${esc(o?o.cidade:'')}"></div>
   </div>
   <div class="fr4">
     <div class="fg"><label>Área construída (m²) <span class="rq">*</span></label><input id="ob-area" type="number" step="0.01" value="${o?o.area:''}"></div>
     <div class="fg"><label>Área do terreno (m²)</label><input id="ob-terreno" type="number" step="0.01" value="${o?(o.terreno||''):''}"></div>
     <div class="fg"><label>Pavimentos</label><input id="ob-pav" type="number" min="1" value="${o?(o.pavimentos||1):1}"></div>
     <div class="fg"><label>Unidades (condomínio)</label><input id="ob-und" type="number" min="1" value="${o?(o.unidades||1):1}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Data de início <span class="rq">*</span></label><input id="ob-ini" type="date" value="${o?o.dtInicio:hoje()}"></div>
     <div class="fg"><label>Previsão de término <span class="rq">*</span></label><input id="ob-fim" type="date" value="${o?o.dtPrevFim:addDias(hoje(),270)}"></div>
     <div class="fg"><label>Valor do contrato (R$)</label><input id="ob-vc" type="number" step="0.01" value="${o?o.valorContrato:''}"></div>
   </div>
   <div class="fg"><label>Observações</label><textarea id="ob-obs" placeholder="Particularidades do terreno, exigências do cliente, restrições da prefeitura...">${esc(o?o.obs:'')}</textarea></div>
   ${o?'':`
   <div class="divider"></div>
   <div class="sh"><i class="ti ti-wand"></i>Geração automática ao salvar</div>
   <label style="display:flex;gap:9px;align-items:flex-start;font-size:13px;margin-bottom:9px;cursor:pointer">
     <input type="checkbox" id="ob-genCrono" checked style="margin-top:3px;width:16px;height:16px">
     <span><b>Criar cronograma padrão</b><br><span class="tt">14 etapas de edificação com datas distribuídas entre início e término.</span></span></label>
   <label style="display:flex;gap:9px;align-items:flex-start;font-size:13px;cursor:pointer">
     <input type="checkbox" id="ob-genOrc" checked style="margin-top:3px;width:16px;height:16px">
     <span><b>Gerar orçamento estimado</b><br><span class="tt">Aplica as composições padrão por m² sobre a área construída. É uma <b>estimativa inicial</b> — revise item a item antes de apresentar ao cliente.</span></span></label>`}
   <div id="ob-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    ${id?`<button class="btn rd" onclick="obraDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
    <button class="btn gn" onclick="obraSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Editar obra':'Nova obra','ti-home-plus',b,f);
}

async function obraSave(id){
  const err = document.getElementById('ob-err');
  const nome = val('ob-nome'), area = num(val('ob-area'));
  const ini = val('ob-ini'), fim = val('ob-fim');
  if(!nome){ err.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome da obra.</div>`; return; }
  if(area<=0){ err.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe a área construída em m².</div>`; return; }
  if(!ini||!fim||fim<=ini){ err.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Verifique as datas: o término deve ser posterior ao início.</div>`; return; }
  const dados = {
    cod:val('ob-cod'), nome, tipo:val('ob-tipo'), status:val('ob-status'), respTec:val('ob-resp'),
    cliente:val('ob-cli'), telefone:val('ob-tel'), art:val('ob-art'),
    endereco:val('ob-end'), cidade:val('ob-cid'),
    area, terreno:num(val('ob-terreno')), pavimentos:num(val('ob-pav'))||1, unidades:num(val('ob-und'))||1,
    dtInicio:ini, dtPrevFim:fim, valorContrato:num(val('ob-vc')), obs:val('ob-obs')
  };
  if(id){
    const old = await dbGet('obras',id);
    await dbPut('obras',{...old,...dados});
    toast('Obra atualizada.');
  }else{
    const novoId = await dbAdd('obras',dados);
    const genC = document.getElementById('ob-genCrono')?.checked;
    const genO = document.getElementById('ob-genOrc')?.checked;
    if(genC) await gerarCronograma(novoId,ini,fim);
    if(genO) await gerarOrcamento(novoId,area);
    OBRA = novoId;
    toast('Obra criada'+(genC?' com cronograma':'')+(genO?' e orçamento estimado':'')+'.');
  }
  closeModal('mk-form');
  await refreshObraSelect();
  go('obras');
}

async function obraDel(id){
  confirmar('Excluir obra','Todos os dados vinculados (cronograma, orçamento, custos, compras, apontamentos, diários, medições e projetos) serão apagados. Deseja continuar?', async ()=>{
    for(const s of ['etapas','orcamento','compras','estoque','apontamentos','rdo','projetos','medicoes']){
      const its = await dbByObra(s,id);
      for(const it of its) await dbDel(s,it.id);
    }
    for(const l of FIN.filter(x=>x.un==='obras' && Number(x.refId)===Number(id))) await dbDel('financeiro',l.id);
    await finLoad();
    await dbDel('obras',id);
    if(Number(OBRA)===Number(id)) OBRA = null;
    closeModal('mk-form');
    toast('Obra excluída.','aw');
    await refreshObraSelect();
    go('obras');
  });
}

/* ---------- Geração automática de cronograma e orçamento ---------- */
async function gerarCronograma(obraId,ini,fim){
  const total = Math.max(diasEntre(ini,fim),14);
  const durTot = ETAPAS_PADRAO.reduce((s,e)=>s+e.dur,0);
  let acc = 0;
  for(const e of ETAPAS_PADRAO){
    const d0 = Math.round(acc/durTot*total);
    acc += e.dur;
    const d1 = Math.round(acc/durTot*total);
    await dbAdd('etapas',{obraId, ordem:e.ord, nome:e.nome, peso:e.peso, grupo:e.grupo, cor:e.cor,
      dtIni:addDias(ini,d0), dtFim:addDias(ini,Math.max(d1,d0+1)), avanco:0, status:'Não iniciada', obs:''});
  }
}

async function gerarOrcamento(obraId,area){
  const insumos = await dbGetAll('insumos');
  const map = {}; insumos.forEach(i=>map[i.cod]=i);
  for(const et of ETAPAS_PADRAO){
    const comp = COMP_PADRAO[et.nome]||[];
    for(const c of comp){
      const ins = map[c.cod]; if(!ins) continue;
      const q = +(c.coef*area).toFixed(4);
      if(q<=0) continue;
      await dbAdd('orcamento',{obraId, etapa:et.nome, cod:ins.cod, desc:ins.desc, und:ins.und,
        cat:ins.cat, qtd:q, vunit:num(ins.custo), origem:'Composição padrão'});
    }
  }
}

/* ---------- Ficha detalhada da obra ---------- */
async function obraDetalhe(id){
  const o = await dbGet('obras',id);
  if(!o) return;
  const r = await obraResumo(id);
  const ti = tipoInfo(o.tipo);
  const atraso = r.avanco - r.plan;
  const diasRest = diasEntre(hoje(),o.dtPrevFim);
  const porEtapa = r.etapas.sort((a,b)=>a.ordem-b.ordem).map(e=>{
    const orcE = r.orc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
    const reaE = r.lanc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.valor),0);
    return {...e,orcE,reaE};
  });
  const b = `
   <div class="kg" style="margin-bottom:14px">
     <div class="kc bl"><div class="lb"><i class="ti ti-progress"></i>Avanço físico</div><div class="vl">${pct(r.avanco)}</div>
       <div class="sb">planejado ${pct(r.plan)} · ${atraso>=0?'<b style="color:var(--green)">adiantado</b>':'<b style="color:var(--red)">atrasado</b>'} ${pct(Math.abs(atraso))}</div></div>
     <div class="kc gn"><div class="lb"><i class="ti ti-calculator"></i>Orçado</div><div class="vl">${moedaK(r.orcado)}</div>
       <div class="sb">${o.area?moeda(r.orcado/num(o.area)):'—'} / m²</div></div>
     <div class="kc ${r.realizado>r.orcado&&r.orcado?'rd':'am'}"><div class="lb"><i class="ti ti-cash"></i>Realizado</div><div class="vl">${moedaK(r.realizado)}</div>
       <div class="sb">${r.orcado?pct(r.realizado/r.orcado*100)+' do orçado':'sem orçamento'}</div></div>
     <div class="kc pu"><div class="lb"><i class="ti ti-calendar"></i>Prazo</div><div class="vl">${diasRest>=0?diasRest+' d':'+'+Math.abs(diasRest)+' d'}</div>
       <div class="sb">${diasRest>=0?'restantes até '+dbr(o.dtPrevFim):'em atraso desde '+dbr(o.dtPrevFim)}</div></div>
   </div>
   <div class="card"><div class="hd"><i class="ti ti-info-circle"></i>Dados cadastrais</div><div class="bd">
     <div class="fr3" style="gap:9px 16px">
       ${[['Código',o.cod],['Tipo',o.tipo],['Status',o.status],['Cliente',o.cliente],['Telefone',o.telefone],
          ['Resp. técnico',o.respTec],['ART/RRT',o.art],['Endereço',o.endereco],['Cidade',o.cidade],
          ['Área construída',qtd(o.area,2)+' m²'],['Área do terreno',o.terreno?qtd(o.terreno,2)+' m²':'—'],
          ['Pavimentos',o.pavimentos],['Unidades',o.unidades],['Início',dbr(o.dtInicio)],['Prev. término',dbr(o.dtPrevFim)],
          ['Valor do contrato',moeda(o.valorContrato)],['Margem prevista',o.valorContrato?moeda(num(o.valorContrato)-r.orcado):'—'],
          ['Custo / m² orçado',o.area?moeda(r.orcado/num(o.area)):'—']]
        .map(([k,v])=>`<div style="font-size:12.5px"><span class="tt" style="display:block">${k}</span><b>${esc(v||'—')}</b></div>`).join('')}
     </div>
     ${o.obs?`<div class="al ai" style="margin-top:12px"><i class="ti ti-note"></i><div>${esc(o.obs)}</div></div>`:''}
   </div></div>
   <div class="card tw"><div class="hd"><i class="ti ti-list-check"></i>Etapas — físico e financeiro</div><div class="bd">
     <table><thead><tr><th>#</th><th>Etapa</th><th class="c">Peso</th><th style="min-width:118px">Avanço</th>
       <th class="r">Orçado</th><th class="r">Realizado</th><th class="r">Desvio</th><th class="c">Período</th></tr></thead><tbody>
       ${porEtapa.map(e=>{
         const dv = e.orcE?((e.reaE-e.orcE)/e.orcE*100):0;
         return `<tr><td class="c">${e.ordem}</td><td><b>${esc(e.nome)}</b></td>
           <td class="c n">${qtd(e.peso,0)}%</td>
           <td><div class="prow"><div class="pb"><div class="pf ${e.avanco>=100?'gn':''}" style="width:${clamp(e.avanco,0,100)}%"></div></div><span>${qtd(e.avanco,0)}%</span></div></td>
           <td class="r n">${moeda(e.orcE)}</td><td class="r n">${moeda(e.reaE)}</td>
           <td class="r n" style="color:${dv>5?'var(--red)':dv<-5?'var(--green)':'var(--text2)'}">${e.orcE?(dv>0?'+':'')+pct(dv):'—'}</td>
           <td class="c n tt">${dbr(e.dtIni)} → ${dbr(e.dtFim)}</td></tr>`;
       }).join('')}
     </tbody></table>
   </div></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
    <button class="btn dk" onclick="closeModal('mk-form');setObraAtiva(${id});go('crono')"><i class="ti ti-calendar-stats"></i>Cronograma</button>
    <button class="btn pu" onclick="closeModal('mk-form');setObraAtiva(${id});go('orc')"><i class="ti ti-calculator"></i>Orçamento</button>
    <button class="btn am" onclick="printFichaObra(${id})"><i class="ti ti-printer"></i>Imprimir ficha</button>
    <button class="btn" onclick="obraForm(${id})"><i class="ti ti-edit"></i>Editar</button>`;
  modal(o.nome,'ti-'+ti.ic.replace('ti-',''),b,f,'lg');
}

async function printFichaObra(id){
  const o = await dbGet('obras',id);
  const r = await obraResumo(id);
  const porEtapa = r.etapas.sort((a,b)=>a.ordem-b.ordem);
  let h = prnHead('Ficha Técnica da Obra','Situação física e financeira consolidada — posição em '+dbr(hoje()));
  h += prnObraInfo(o);
  h += `<div class="pkg">
    <div class="pkc"><div class="l">Avanço físico</div><div class="v">${pct(r.avanco)}</div></div>
    <div class="pkc"><div class="l">Avanço planejado</div><div class="v">${pct(r.plan)}</div></div>
    <div class="pkc"><div class="l">Custo orçado</div><div class="v">${moedaK(r.orcado)}</div></div>
    <div class="pkc"><div class="l">Custo realizado</div><div class="v">${moedaK(r.realizado)}</div></div></div>`;
  h += `<div class="psec">Etapas da obra</div>
    <table><thead><tr><th>#</th><th>Etapa</th><th>Peso</th><th>Início</th><th>Término</th><th>Avanço</th><th>Orçado</th><th>Realizado</th></tr></thead><tbody>`;
  porEtapa.forEach(e=>{
    const orcE = r.orc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
    const reaE = r.lanc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.valor),0);
    h += `<tr><td>${e.ordem}</td><td>${esc(e.nome)}</td><td>${qtd(e.peso,0)}%</td><td>${dbr(e.dtIni)}</td>
      <td>${dbr(e.dtFim)}</td><td>${qtd(e.avanco,0)}%</td><td style="text-align:right">${moeda(orcE)}</td>
      <td style="text-align:right">${moeda(reaE)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan="6">TOTAL</td><td style="text-align:right">${moeda(r.orcado)}</td>
    <td style="text-align:right">${moeda(r.realizado)}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}

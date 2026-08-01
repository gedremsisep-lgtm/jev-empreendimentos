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
    <button class="btn gh" onclick="conjuntoForm()"><i class="ti ti-home-plus"></i>Conjunto de casas</button>
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
      <button class="btn gh" onclick="conjuntoForm()"><i class="ti ti-home-plus"></i>Várias casas de uma vez</button>
      <button class="btn gh" onclick="seedDemo()"><i class="ti ti-flask"></i>Carregar dados de exemplo</button></div></div></div></div>`;
  } else {
    /* as obras saem agrupadas: primeiro cada conjunto de casas, depois as avulsas */
    const grupos = {};
    obras.forEach(o=>{ const g = o.conjunto || ''; (grupos[g] = grupos[g] || []).push(o); });
    const nomesConj = Object.keys(grupos).filter(Boolean).sort();

    const cartao = o=>{
      const r = resumos[o.id], ti = tipoInfo(o.tipo);
      const atraso = r.avanco - r.plan;
      const corAv = atraso < -8 ? 'rd' : atraso < -2 ? 'am' : 'gn';
      const vr = o.variacao ? (VARIACOES[o.variacao] || null) : null;
      return `<div class="ocard" onclick="obraDetalhe(${o.id})">
        <div class="oh"><div class="oi" style="background:${ti.cor}1A;color:${ti.cor}"><i class="ti ${ti.ic}"></i></div>
          <div style="flex:1;min-width:0"><b style="display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.nome)}</b>
            <span class="tt">${esc(o.cod)} · ${esc(o.tipo)}${o.modelo?' · '+esc(o.modelo):''}</span></div>
          <span class="st ${ST_OBRA[o.status]||'s-nt'}">${esc(o.status)}</span></div>
        ${vr?`<div style="padding:0 12px 2px"><span class="st" style="background:${vr.cor}1A;color:${vr.cor}">
          <i class="ti ${vr.ic}"></i>${esc(o.variacao)}</span></div>`:''}
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
    };

    nomesConj.forEach(nome=>{
      const gs = grupos[nome];
      const t = gs.reduce((a,o)=>({area:a.area+num(o.area), con:a.con+num(o.valorContrato),
        orc:a.orc+resumos[o.id].orcado, rea:a.rea+resumos[o.id].realizado,
        av:a.av+resumos[o.id].avanco}),{area:0,con:0,orc:0,rea:0,av:0});
      const avMed = t.av/gs.length;
      html += `<div class="sh"><i class="ti ti-home-plus"></i>${esc(nome)}
        <span class="tt" style="font-weight:600;text-transform:none;letter-spacing:0">
          &nbsp;· ${gs.length} casa(s) · ${qtd(t.area,0)} m² · contratado ${moedaK(t.con)}
          · realizado ${moedaK(t.rea)} · avanço médio ${pct(avMed)}</span>
        <span class="sp"></span>
        <a onclick="conjuntoDetalhe('${esc(nome).replace(/'/g,"\\'")}')"
           style="cursor:pointer">ver o conjunto</a></div>
        <div class="mgrid">${gs.map(cartao).join('')}</div>`;
    });

    if((grupos['']||[]).length){
      html += `<div class="sh"><i class="ti ti-layout-grid"></i>${nomesConj.length?'Obras avulsas':'Carteira de obras'}</div>
        <div class="mgrid">${grupos[''].map(cartao).join('')}</div>`;
    }
  }
  root.innerHTML = html;
  await refreshObraSelect();
}

/* ---------- Formulário de obra ---------- */
async function obraForm(id){
  const o = id ? await dbGet('obras',id) : null;
  const obras = await dbGetAll('obras');
  const conjuntos = [...new Set(obras.map(x=>x.conjunto).filter(Boolean))].sort();
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
   <div class="fr3">
     <div class="fg"><label>Conjunto</label>
       <input id="ob-conj" list="ob-conjs" value="${esc(o?(o.conjunto||''):'')}" placeholder="Deixe vazio se for obra avulsa">
       <datalist id="ob-conjs">${conjuntos.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
       <div class="hint">Liga esta casa às outras do mesmo grupo, sem virar condomínio.</div></div>
     <div class="fg"><label>Modelo / tipologia</label>
       <input id="ob-modelo" value="${esc(o?(o.modelo||''):'')}" placeholder="Ex.: Tipo A"></div>
     <div class="fg"><label>Variação da planta</label><select id="ob-var">
       ${['','Idêntica','Espelhada','Individual'].map(v=>`<option value="${v}" ${o&&o.variacao===v?'selected':''}>${v||'— não se aplica —'}</option>`).join('')}</select></div>
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
    dtInicio:ini, dtPrevFim:fim, valorContrato:num(val('ob-vc')), obs:val('ob-obs'),
    conjunto:val('ob-conj'), modelo:val('ob-modelo'), variacao:val('ob-var'),
    espelhada: val('ob-var')==='Espelhada'
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

/* =========================================================================
   CONJUNTO DE CASAS
   Várias casas individuais criadas de uma vez. Cada casa vira uma obra
   independente — com o próprio cronograma, orçamento e custo — mas todas
   carregam o nome do conjunto, para você ver o resultado somado quando
   quiser. Não é condomínio: é um punhado de obras separadas que nasceram
   juntas.

   Cada casa aponta para um MODELO (a tipologia do projeto) e diz como ela
   se relaciona com ele:
     Idêntica  — mesma planta, mesma área, mesmo orçamento
     Espelhada — a mesma planta virada; muda a implantação, não o custo
     Individual— projeto próprio, com área e valor dela
   ========================================================================= */

const VARIACOES = {
  'Idêntica':  {ic:'ti-copy',           cor:'var(--blue)',  desc:'mesma planta do modelo'},
  'Espelhada': {ic:'ti-flip-horizontal',cor:'var(--purple)',desc:'planta do modelo, virada'},
  'Individual':{ic:'ti-pencil',         cor:'var(--amber)', desc:'projeto próprio'}
};

let CONJ = null;   // {modelos:[{nome,area,pav,valor}], casas:[{nome,modelo,variacao,area,valor}]}

async function conjuntoForm(){
  const obras = await dbGetAll('obras');
  const conjuntos = [...new Set(obras.map(o=>o.conjunto).filter(Boolean))];
  CONJ = {
    modelos: [{nome:'Tipo A', area:0, pav:1, valor:0}],
    casas: []
  };
  const b = `
   <div class="al ai"><i class="ti ti-home-plus"></i><div>
     Use isto quando forem <b>casas individuais</b> construídas juntas — cada uma com o próprio
     cronograma, orçamento e custo. Elas ficam ligadas pelo nome do conjunto, mas o sistema
     <b>não</b> as trata como um condomínio.</div></div>

   <div class="sh"><i class="ti ti-map-pin"></i>Dados que valem para todas</div>
   <div class="fr3">
     <div class="fg" style="grid-column:span 2"><label>Nome do conjunto <span class="rq">*</span></label>
       <input id="cj-nome" list="cj-nomes" placeholder="Ex.: Vila Alvorada, Rua das Acácias, Loteamento Bela Vista">
       <datalist id="cj-nomes">${conjuntos.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
       <div class="hint">Aparece na frente do nome de cada casa: “Vila Alvorada — Casa 01”.</div></div>
     <div class="fg"><label>Tipo das obras</label><select id="cj-tipo">
       ${TIPOS_OBRA.map(t=>`<option ${t.v==='Casa Residencial'?'selected':''}>${t.v}</option>`).join('')}</select></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Cliente / Proprietário</label><input id="cj-cli" placeholder="Se for o mesmo para todas"></div>
     <div class="fg"><label>Telefone</label><input id="cj-tel" placeholder="(00) 00000-0000"></div>
     <div class="fg"><label>Responsável técnico</label><input id="cj-resp" value="${esc(CFG.respTec||'')}"></div>
   </div>
   <div class="fr3">
     <div class="fg" style="grid-column:span 2"><label>Endereço / loteamento</label>
       <input id="cj-end" placeholder="Rua, quadra, loteamento"></div>
     <div class="fg"><label>Cidade / UF</label><input id="cj-cid" value="${esc(CFG.cidade||'')}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Início da primeira casa <span class="rq">*</span></label>
       <input id="cj-ini" type="date" value="${hoje()}"></div>
     <div class="fg"><label>Prazo de cada casa (dias)</label>
       <input id="cj-prazo" type="number" min="30" value="240">
       <div class="hint">Conta do início de cada uma até a entrega dela.</div></div>
     <div class="fg"><label>Começar uma a cada (dias)</label>
       <input id="cj-esc" type="number" min="0" value="0">
       <div class="hint">Zero = todas começam no mesmo dia. Use 30, 60… quando a equipe for tocando uma de cada vez.</div></div>
   </div>

   <div class="divider"></div>
   <div class="sh"><i class="ti ti-layout-board-split"></i>Modelos de casa (tipologias)</div>
   <div class="tt" style="margin-bottom:9px">Cadastre aqui cada planta diferente. Se todas as casas
     forem iguais, basta um modelo. O orçamento e a área de cada casa vêm do modelo dela.</div>
   <div id="cj-modelos"></div>

   <div class="divider"></div>
   <div class="sh"><i class="ti ti-list-numbers"></i>As casas</div>
   <div class="fr3" style="align-items:end">
     <div class="fg"><label>Nome base</label><input id="cj-base" value="Casa"></div>
     <div class="fg"><label>Quantas casas</label><input id="cj-qtd" type="number" min="1" max="60" value="3"></div>
     <div class="fg"><button class="btn gh blk" onclick="conjuntoGerarLista()">
       <i class="ti ti-wand"></i>Montar a lista</button></div>
   </div>
   <div id="cj-casas"></div>

   <div class="divider"></div>
   <label style="display:flex;gap:9px;align-items:flex-start;font-size:13px;margin-bottom:9px;cursor:pointer">
     <input type="checkbox" id="cj-genCrono" checked style="margin-top:3px;width:16px;height:16px">
     <span><b>Criar o cronograma padrão em cada casa</b><br>
       <span class="tt">As 14 etapas de edificação, com as datas distribuídas dentro do prazo de cada uma.</span></span></label>
   <label style="display:flex;gap:9px;align-items:flex-start;font-size:13px;cursor:pointer">
     <input type="checkbox" id="cj-genOrc" checked style="margin-top:3px;width:16px;height:16px">
     <span><b>Gerar o orçamento estimado em cada casa</b><br>
       <span class="tt">Calculado sobre a área do modelo. Casas iguais saem com o mesmo orçamento —
       é uma <b>estimativa inicial</b>, revise antes de apresentar ao cliente.</span></span></label>
   <div id="cj-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="conjuntoSave()"><i class="ti ti-home-plus"></i>Criar as casas</button>`;
  modal('Conjunto de casas','ti-home-plus',b,f,'lg');
  conjuntoModelosRender();
  conjuntoGerarLista();
}

/* ---------------- modelos ---------------- */
function conjuntoModelosRender(){
  const box = document.getElementById('cj-modelos');
  if(!box) return;
  box.innerHTML = `<div class="card tw"><div class="bd"><table>
    <thead><tr><th>Modelo</th><th class="r">Área (m²)</th><th class="c">Pavimentos</th>
      <th class="r">Valor de contrato</th><th class="c"></th></tr></thead><tbody>
    ${CONJ.modelos.map((m,i)=>`<tr>
      <td><input value="${esc(m.nome)}" onchange="CONJ.modelos[${i}].nome=this.value;conjuntoCasasRender()"
        style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:5px 7px"></td>
      <td class="r"><input type="number" step="0.01" value="${m.area||''}" placeholder="0,00"
        onchange="CONJ.modelos[${i}].area=num(this.value);conjuntoCasasRender()"
        style="width:110px;text-align:right;border:1px solid var(--border2);border-radius:6px;padding:5px 7px"></td>
      <td class="c"><input type="number" min="1" value="${m.pav||1}"
        onchange="CONJ.modelos[${i}].pav=num(this.value)||1"
        style="width:70px;text-align:center;border:1px solid var(--border2);border-radius:6px;padding:5px 7px"></td>
      <td class="r"><input type="number" step="0.01" value="${m.valor||''}" placeholder="0,00"
        onchange="CONJ.modelos[${i}].valor=num(this.value);conjuntoCasasRender()"
        style="width:130px;text-align:right;border:1px solid var(--border2);border-radius:6px;padding:5px 7px"></td>
      <td class="c">${CONJ.modelos.length>1?`<button class="ib rd" onclick="conjuntoDelModelo(${i})"><i class="ti ti-trash"></i></button>`:''}</td>
    </tr>`).join('')}
    </tbody></table>
    <div class="brow"><button class="btn gh sm" onclick="conjuntoAddModelo()">
      <i class="ti ti-plus"></i>Acrescentar modelo</button></div>
  </div></div>`;
}
function conjuntoAddModelo(){
  const letra = String.fromCharCode(65+CONJ.modelos.length);
  CONJ.modelos.push({nome:'Tipo '+letra, area:0, pav:1, valor:0});
  conjuntoModelosRender(); conjuntoCasasRender();
}
function conjuntoDelModelo(i){
  const nome = CONJ.modelos[i].nome;
  CONJ.modelos.splice(i,1);
  CONJ.casas.forEach(c=>{ if(c.modelo===nome) c.modelo = CONJ.modelos[0].nome; });
  conjuntoModelosRender(); conjuntoCasasRender();
}

/* ---------------- lista de casas ---------------- */
function conjuntoGerarLista(){
  const base = val('cj-base') || 'Casa';
  const qtd  = clamp(num(val('cj-qtd'))||1, 1, 60);
  const antigas = CONJ.casas;
  CONJ.casas = [];
  for(let i=1;i<=qtd;i++){
    const velha = antigas[i-1];
    CONJ.casas.push(velha ? {...velha, nome: velha.nome || `${base} ${String(i).padStart(2,'0')}`}
                          : {nome:`${base} ${String(i).padStart(2,'0')}`,
                             modelo: CONJ.modelos[0].nome, variacao:'Idêntica', area:0, valor:0});
  }
  conjuntoCasasRender();
}
function conjuntoCasasRender(){
  const box = document.getElementById('cj-casas');
  if(!box) return;
  if(!CONJ.casas.length){ box.innerHTML=''; return; }
  const opts = CONJ.modelos.map(m=>m.nome);
  box.innerHTML = `
    <div class="brow" style="margin:0 0 10px">
      <button class="btn gh xs" onclick="conjuntoTodasModelo()"><i class="ti ti-copy"></i>Todas iguais ao 1º modelo</button>
      <button class="btn gh xs" onclick="conjuntoAlternarEspelho()"><i class="ti ti-flip-horizontal"></i>Alternar idêntica / espelhada</button>
      <button class="btn gh xs" onclick="conjuntoTodasIndividuais()"><i class="ti ti-pencil"></i>Todas individuais</button>
    </div>
    <div class="card tw"><div class="bd"><table>
      <thead><tr><th>Casa</th><th>Modelo</th><th>Variação</th>
        <th class="r">Área (m²)</th><th class="r">Valor de contrato</th></tr></thead><tbody>
      ${CONJ.casas.map((c,i)=>{
        const ind = c.variacao==='Individual';
        const m = CONJ.modelos.find(x=>x.nome===c.modelo) || CONJ.modelos[0];
        const area = ind ? c.area : m.area;
        const valor= ind ? c.valor: m.valor;
        const v = VARIACOES[c.variacao];
        return `<tr>
          <td><input value="${esc(c.nome)}" onchange="CONJ.casas[${i}].nome=this.value"
            style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:5px 7px"></td>
          <td><select onchange="CONJ.casas[${i}].modelo=this.value;conjuntoCasasRender()"
            style="border:1px solid var(--border2);border-radius:6px;padding:5px 7px">
            ${opts.map(o=>`<option ${c.modelo===o?'selected':''}>${esc(o)}</option>`).join('')}</select></td>
          <td><select onchange="CONJ.casas[${i}].variacao=this.value;conjuntoCasasRender()"
            style="border:1px solid var(--border2);border-radius:6px;padding:5px 7px;color:${v.cor};font-weight:700">
            ${Object.keys(VARIACOES).map(o=>`<option ${c.variacao===o?'selected':''}>${o}</option>`).join('')}</select>
            <div class="tt">${v.desc}</div></td>
          <td class="r">${ind
            ? `<input type="number" step="0.01" value="${c.area||''}" onchange="CONJ.casas[${i}].area=num(this.value)"
                 style="width:110px;text-align:right;border:1px solid var(--border2);border-radius:6px;padding:5px 7px">`
            : `<span class="n">${qtd(area,2)}</span><div class="tt">do modelo</div>`}</td>
          <td class="r">${ind
            ? `<input type="number" step="0.01" value="${c.valor||''}" onchange="CONJ.casas[${i}].valor=num(this.value)"
                 style="width:130px;text-align:right;border:1px solid var(--border2);border-radius:6px;padding:5px 7px">`
            : `<span class="n">${moeda(valor)}</span><div class="tt">do modelo</div>`}</td>
        </tr>`;
      }).join('')}
      </tbody>
      <tfoot><tr><td>${CONJ.casas.length} casa(s)</td><td colspan="2"></td>
        <td class="r n">${qtd(conjuntoTotais().area,2)} m²</td>
        <td class="r n">${moeda(conjuntoTotais().valor)}</td></tr></tfoot>
    </table></div></div>`;
}
function conjuntoTotais(){
  let area=0, valor=0;
  CONJ.casas.forEach(c=>{
    const m = CONJ.modelos.find(x=>x.nome===c.modelo) || CONJ.modelos[0];
    const ind = c.variacao==='Individual';
    area  += ind ? num(c.area)  : num(m.area);
    valor += ind ? num(c.valor) : num(m.valor);
  });
  return {area, valor};
}
function conjuntoTodasModelo(){
  const m = CONJ.modelos[0].nome;
  CONJ.casas.forEach(c=>{ c.modelo=m; c.variacao='Idêntica'; });
  conjuntoCasasRender();
}
function conjuntoAlternarEspelho(){
  CONJ.casas.forEach((c,i)=>{ c.variacao = i%2 ? 'Espelhada' : 'Idêntica'; });
  conjuntoCasasRender();
}
function conjuntoTodasIndividuais(){
  CONJ.casas.forEach(c=>{
    const m = CONJ.modelos.find(x=>x.nome===c.modelo) || CONJ.modelos[0];
    if(!num(c.area))  c.area  = num(m.area);
    if(!num(c.valor)) c.valor = num(m.valor);
    c.variacao='Individual';
  });
  conjuntoCasasRender();
}

/* ---------------- gravar ---------------- */
async function conjuntoSave(){
  const err = document.getElementById('cj-err');
  const falha = m=>{ err.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>${m}</div>`;
                     err.scrollIntoView({behavior:'smooth',block:'center'}); };
  const conjunto = val('cj-nome');
  const ini = val('cj-ini');
  const prazo = num(val('cj-prazo'))||240;
  const esc0 = num(val('cj-esc'))||0;

  if(!conjunto) return falha('Dê um nome ao conjunto — é ele que liga as casas umas às outras.');
  if(!ini) return falha('Informe a data de início da primeira casa.');
  if(!CONJ.casas.length) return falha('Monte a lista das casas antes de salvar.');

  for(const c of CONJ.casas){
    const m = CONJ.modelos.find(x=>x.nome===c.modelo) || CONJ.modelos[0];
    const area = c.variacao==='Individual' ? num(c.area) : num(m.area);
    if(area<=0) return falha(`Falta a área construída de <b>${esc(c.nome)}</b>` +
      (c.variacao==='Individual' ? '.' : ` — preencha a área do modelo <b>${esc(m.nome)}</b>.`));
    if(!c.nome) return falha('Toda casa precisa de um nome.');
  }

  err.innerHTML = `<div class="al ai"><i class="ti ti-loader-2"></i>Criando as casas…</div>`;

  const obras = await dbGetAll('obras');
  let seq = obras.reduce((mx,x)=>Math.max(mx,parseInt(String(x.cod||'').replace(/\D/g,''))||0),0);
  const genC = document.getElementById('cj-genCrono')?.checked;
  const genO = document.getElementById('cj-genOrc')?.checked;
  const tipo = val('cj-tipo'), cliente = val('cj-cli'), telefone = val('cj-tel');
  const respTec = val('cj-resp'), endereco = val('cj-end'), cidade = val('cj-cid');

  const criadas = [];
  for(let i=0;i<CONJ.casas.length;i++){
    const c = CONJ.casas[i];
    const m = CONJ.modelos.find(x=>x.nome===c.modelo) || CONJ.modelos[0];
    const ind  = c.variacao==='Individual';
    const area = ind ? num(c.area)  : num(m.area);
    const valor= ind ? num(c.valor) : num(m.valor);
    const dtIni = addDias(ini, esc0*i);
    const dtFim = addDias(dtIni, prazo);
    seq++;
    const dados = {
      cod:'OB-'+String(seq).padStart(3,'0'),
      nome:`${conjunto} — ${c.nome}`,
      conjunto, modelo: ind ? '' : m.nome, variacao: c.variacao, espelhada: c.variacao==='Espelhada',
      tipo, status:'Planejamento', respTec, cliente, telefone, art:'',
      endereco: endereco ? `${endereco} — ${c.nome}` : c.nome, cidade,
      area, terreno:0, pavimentos: ind ? 1 : (num(m.pav)||1), unidades:1,
      dtInicio:dtIni, dtPrevFim:dtFim, valorContrato:valor,
      obs: c.variacao==='Espelhada' ? 'Planta espelhada do modelo '+m.nome+'.' : ''
    };
    const novoId = await dbAdd('obras',dados);
    if(genC) await gerarCronograma(novoId,dtIni,dtFim);
    if(genO) await gerarOrcamento(novoId,area);
    criadas.push(novoId);
  }

  OBRA = criadas[0];
  closeModal('mk-form');
  await refreshObraSelect();
  toast(`${criadas.length} casa(s) criada(s) no conjunto ${conjunto}.`);
  go('obras');
}

/* ---------------- visão consolidada de um conjunto ---------------- */
async function conjuntoDetalhe(nome){
  const obras = (await dbGetAll('obras')).filter(o=>o.conjunto===nome);
  if(!obras.length) return;
  const res = {};
  for(const o of obras) res[o.id] = await obraResumo(o.id);
  const tot = obras.reduce((a,o)=>({
    area:a.area+num(o.area), con:a.con+num(o.valorContrato),
    orc:a.orc+res[o.id].orcado, rea:a.rea+res[o.id].realizado,
    av:a.av+res[o.id].avanco
  }),{area:0,con:0,orc:0,rea:0,av:0});
  const avMed = tot.av/obras.length;

  const b = `
   <div class="kg" style="margin-bottom:14px">
     <div class="kc bl"><div class="lb"><i class="ti ti-home"></i>Casas</div><div class="vl">${obras.length}</div>
       <div class="sb">${qtd(tot.area,0)} m² no total</div></div>
     <div class="kc am"><div class="lb"><i class="ti ti-file-dollar"></i>Contratado</div>
       <div class="vl">${moedaK(tot.con)}</div><div class="sb">soma das casas</div></div>
     <div class="kc gn"><div class="lb"><i class="ti ti-calculator"></i>Orçado</div>
       <div class="vl">${moedaK(tot.orc)}</div><div class="sb">custo previsto</div></div>
     <div class="kc rd"><div class="lb"><i class="ti ti-cash"></i>Realizado</div>
       <div class="vl">${moedaK(tot.rea)}</div>
       <div class="sb">${tot.orc?pct(tot.rea/tot.orc*100):'0,0%'} do orçado</div></div>
     <div class="kc pu"><div class="lb"><i class="ti ti-progress"></i>Avanço médio</div>
       <div class="vl">${pct(avMed)}</div><div class="sb">média simples das casas</div></div>
   </div>
   <div class="card tw"><div class="bd"><table>
     <thead><tr><th>Casa</th><th>Modelo</th><th class="c">Situação</th><th class="r">Área</th>
       <th class="r">Contrato</th><th class="r">Orçado</th><th class="r">Realizado</th>
       <th class="r">Avanço</th></tr></thead><tbody>
     ${obras.map(o=>{
       const r = res[o.id];
       const v = VARIACOES[o.variacao] || VARIACOES['Individual'];
       return `<tr style="cursor:pointer" onclick="closeModal('mk-form');obraDetalhe(${o.id})">
         <td><b>${esc(o.nome.replace(nome+' — ',''))}</b><div class="tt">${esc(o.cod)}</div></td>
         <td><i class="ti ${v.ic}" style="color:${v.cor};margin-right:6px"></i>${esc(o.modelo||'—')}
           <div class="tt">${esc(o.variacao||'Individual')}</div></td>
         <td class="c"><span class="st ${ST_OBRA[o.status]||'s-nt'}">${esc(o.status)}</span></td>
         <td class="r n">${qtd(o.area,0)} m²</td>
         <td class="r n">${moedaK(o.valorContrato)}</td>
         <td class="r n">${moedaK(r.orcado)}</td>
         <td class="r n" style="color:${r.realizado>r.orcado&&r.orcado?'var(--red)':'var(--text)'}">${moedaK(r.realizado)}</td>
         <td class="r n">${pct(r.avanco)}</td></tr>`;
     }).join('')}
     </tbody>
     <tfoot><tr><td colspan="3">Total do conjunto</td>
       <td class="r n">${qtd(tot.area,0)} m²</td>
       <td class="r n">${moedaK(tot.con)}</td>
       <td class="r n">${moedaK(tot.orc)}</td>
       <td class="r n">${moedaK(tot.rea)}</td>
       <td class="r n">${pct(avMed)}</td></tr></tfoot>
   </table></div></div>
   <div class="al ai"><i class="ti ti-info-circle"></i><div>
     Cada casa é uma obra independente: tem cronograma, orçamento, compras e diário próprios.
     Esta tela só soma o que já está lançado em cada uma.</div></div>`;
  modal('Conjunto — '+nome,'ti-home-plus',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn gd" onclick="closeModal('mk-form');printarConjunto('${esc(nome).replace(/'/g,"\\'")}')">
       <i class="ti ti-printer"></i>Imprimir resumo</button>`,'lg');
}

async function printarConjunto(nome){
  const obras = (await dbGetAll('obras')).filter(o=>o.conjunto===nome);
  const res = {}; for(const o of obras) res[o.id] = await obraResumo(o.id);
  const tot = obras.reduce((a,o)=>({area:a.area+num(o.area), con:a.con+num(o.valorContrato),
    orc:a.orc+res[o.id].orcado, rea:a.rea+res[o.id].realizado, av:a.av+res[o.id].avanco}),
    {area:0,con:0,orc:0,rea:0,av:0});
  printar(prnHead('Conjunto de casas — '+nome, `${obras.length} casas · ${qtd(tot.area,0)} m² construídos`) +
    `<table><thead><tr><th>Casa</th><th>Modelo</th><th>Situação</th><th class="r">Área</th>
      <th class="r">Contrato</th><th class="r">Orçado</th><th class="r">Realizado</th><th class="r">Avanço</th></tr></thead><tbody>
     ${obras.map(o=>{const r=res[o.id];return `<tr><td>${esc(o.nome)}</td><td>${esc(o.modelo||'—')} ${esc(o.variacao||'')}</td>
       <td>${esc(o.status)}</td><td class="r">${qtd(o.area,0)} m²</td><td class="r">${moeda(o.valorContrato)}</td>
       <td class="r">${moeda(r.orcado)}</td><td class="r">${moeda(r.realizado)}</td><td class="r">${pct(r.avanco)}</td></tr>`;}).join('')}
     </tbody><tfoot><tr><td colspan="3">Total</td><td class="r">${qtd(tot.area,0)} m²</td>
       <td class="r">${moeda(tot.con)}</td><td class="r">${moeda(tot.orc)}</td><td class="r">${moeda(tot.rea)}</td>
       <td class="r">${pct(tot.av/obras.length)}</td></tr></tfoot></table>` +
    prnSig(CFG.respTec||'', 'Responsável técnico', '', 'Cliente') + prnFoot());
}

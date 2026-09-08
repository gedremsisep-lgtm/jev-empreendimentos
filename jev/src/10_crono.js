/* =========================================================================
   MÓDULO: CRONOGRAMA FÍSICO-FINANCEIRO (Gantt + Curva S)
   ========================================================================= */

async function cronoRender(){
  const root = document.getElementById('crono-root');
  const o = await obraAtual();
  if(!o){ root.innerHTML = semObra(); return; }
  const r = await obraResumo(o.id);
  const etapas = r.etapas.sort((a,b)=>a.ordem-b.ordem);

  let html = `<div class="ph"><div class="ic"><i class="ti ti-calendar-stats"></i></div>
    <div><h1>Cronograma</h1><p>${esc(o.cod)} — ${esc(o.nome)} · ${dbr(o.dtInicio)} a ${dbr(o.dtPrevFim)}</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="printCronograma()"><i class="ti ti-printer"></i>Imprimir</button>
    <button class="btn gh" onclick="cronoEtapaForm()"><i class="ti ti-plus"></i>Nova etapa</button>
    ${etapas.length?'':`<button class="btn" onclick="cronoGerar()"><i class="ti ti-wand"></i>Gerar cronograma padrão</button>`}</div>`;

  if(!etapas.length){
    root.innerHTML = html + `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-calendar-off"></i>
      <b>Cronograma vazio</b>Gere as 14 etapas padrão de edificação com datas distribuídas automaticamente
      entre ${dbr(o.dtInicio)} e ${dbr(o.dtPrevFim)}, ou crie etapas manualmente.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="cronoGerar()"><i class="ti ti-wand"></i>Gerar cronograma padrão</button></div></div></div></div>`;
    return;
  }

  const dif = r.avanco - r.plan;
  const diasRest = diasEntre(hoje(),o.dtPrevFim);
  const emAndamento = etapas.filter(e=>num(e.avanco)>0 && num(e.avanco)<100);
  const atrasadas = etapas.filter(e=>e.dtFim < hoje() && num(e.avanco)<100);

  html += `<div class="kg" style="margin-bottom:14px">
    <div class="kc bl"><div class="lb"><i class="ti ti-progress"></i>Avanço real</div><div class="vl">${pct(r.avanco)}</div><div class="sb">medido pelas etapas</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-target"></i>Avanço planejado</div><div class="vl">${pct(r.plan)}</div><div class="sb">linha de base até hoje</div></div>
    <div class="kc ${dif<-5?'rd':dif<0?'am':'gn'}"><div class="lb"><i class="ti ti-arrows-diff"></i>Desvio de prazo</div>
      <div class="vl">${dif>=0?'+':''}${pct(dif)}</div><div class="sb">${dif>=0?'adiantado ou no prazo':'atrasado em relação ao plano'}</div></div>
    <div class="kc ${diasRest<0?'rd':'tl'}"><div class="lb"><i class="ti ti-calendar"></i>Prazo</div>
      <div class="vl">${diasRest>=0?diasRest:'+'+Math.abs(diasRest)} d</div><div class="sb">${diasRest>=0?'até o término previsto':'de atraso sobre a previsão'}</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-alert-triangle"></i>Etapas vencidas</div><div class="vl">${atrasadas.length}</div><div class="sb">passaram do prazo sem concluir</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-tool"></i>Em execução</div><div class="vl">${emAndamento.length}</div><div class="sb">etapas iniciadas e não concluídas</div></div>
  </div>`;

  if(atrasadas.length){
    html += `<div class="al aw"><i class="ti ti-clock-exclamation"></i><div><b>Etapas fora do prazo:</b>
      ${atrasadas.map(e=>`${esc(e.nome)} (${qtd(e.avanco,0)}% — venceu ${dbr(e.dtFim)})`).join(' · ')}</div></div>`;
  }

  // ---------- Gantt ----------
  const ini = etapas.reduce((m,e)=>e.dtIni&&e.dtIni<m?e.dtIni:m, o.dtInicio || hoje());
  const fim = etapas.reduce((m,e)=>e.dtFim&&e.dtFim>m?e.dtFim:m, o.dtPrevFim || addDias(o.dtInicio||hoje(),180));
  const tot = Math.max(diasEntre(ini,fim),1);
  const meses = [];
  let cur = ini.slice(0,7);
  while(cur <= fim.slice(0,7)){
    meses.push(cur);
    let [y,m] = cur.split('-').map(Number); m++; if(m>12){m=1;y++;}
    cur = `${y}-${String(m).padStart(2,'0')}`;
  }
  const posHoje = clamp(diasEntre(ini,hoje())/tot*100,0,100);
  html += `<div class="card"><div class="hd"><i class="ti ti-timeline"></i>Diagrama de Gantt
    <span class="sp"></span><span class="tt">Barra clara = planejado · barra cheia = executado · linha vermelha = hoje</span></div>
    <div class="bd" style="overflow-x:auto"><div class="gantt">
      <div class="gh"><div class="gl">Etapa</div><div class="gtk">${meses.map(m=>`<span>${dmes(m+'-01')}</span>`).join('')}</div></div>
      <div class="gwrap"><div class="gover"><div class="today" style="left:${posHoje}%"></div></div>`;
  etapas.forEach(e=>{
    const x0 = clamp(diasEntre(ini,e.dtIni)/tot*100,0,100);
    const w  = clamp(diasEntre(e.dtIni,e.dtFim)/tot*100,0.8,100-x0);
    const av = clamp(num(e.avanco),0,100);
    const vencida = e.dtFim < hoje() && av < 100;
    html += `<div class="gr" style="cursor:pointer" onclick="cronoEtapaForm(${e.id})">
      <div class="gl" title="${esc(e.nome)}"><span style="color:${e.cor||'#15599E'}">●</span> ${esc(e.nome)}</div>
      <div class="gt"><div class="gbar" style="left:${x0}%;width:${w}%;background:${vencida?'#F3C9C4':(e.cor||'#15599E')}33">
        <div class="gf" style="width:${av}%;background:${vencida&&av<100?'#A8291F':(e.cor||'#15599E')}"></div></div>
        ${w>7&&av>4?`<span style="position:absolute;left:calc(${x0}% + 5px);top:8px;font-size:9.5px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.45);pointer-events:none">${qtd(av,0)}%</span>`:''}
      </div></div>`;
  });
  html += `</div></div></div></div>`;

  // ---------- Curva S ----------
  const pesoTot = etapas.reduce((s,e)=>s+num(e.peso),0)||100;
  const labels = meses.map(m=>dmes(m+'-01'));
  const planPts = [], custoPts = [];
  const lancPorMes = {};
  r.lanc.forEach(l=>{ const k=String(l.data).slice(0,7); lancPorMes[k]=(lancPorMes[k]||0)+num(l.valor); });
  let accCusto = 0;
  meses.forEach(mk=>{
    const ref = mk+'-28';
    let p = 0;
    etapas.forEach(e=>{
      if(!e.dtIni||!e.dtFim) return;
      let f = 0;
      if(ref>=e.dtFim) f=1; else if(ref>e.dtIni){ const t=diasEntre(e.dtIni,e.dtFim)||1; f=clamp(diasEntre(e.dtIni,ref)/t,0,1); }
      p += num(e.peso)*f;
    });
    planPts.push(p/pesoTot*100);
    accCusto += (lancPorMes[mk]||0);
    custoPts.push(r.orcado? accCusto/r.orcado*100 : 0);
  });
  // curva real física: só até o mês corrente, interpolando linearmente até o avanço atual
  const idxHoje = meses.findIndex(m=>m===hoje().slice(0,7));
  const nReal = idxHoje>=0 ? idxHoje+1 : meses.length;
  const realFis = [];
  for(let i=0;i<nReal;i++) realFis.push(planPts[i]===0?0: r.avanco * (planPts[i]/(planPts[nReal-1]||1)));
  html += `<div class="chg">
    <div class="card"><div class="hd"><i class="ti ti-chart-line"></i>Curva S — avanço físico</div><div class="bd">
      ${lineChart([{name:'Planejado (%)',pts:planPts,color:'#4B3FA3',area:true},
                   {name:'Realizado (%)',pts:realFis,color:'#1F7A44'}],labels,{h:230})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-chart-area"></i>Curva S — desembolso financeiro</div><div class="bd">
      ${lineChart([{name:'Previsto (%)',pts:planPts,color:'#B26A0C',dash:'5,4'},
                   {name:'Desembolsado (%)',pts:custoPts,color:'#15599E',area:true}],labels,{h:230})}</div></div>
  </div>`;

  // ---------- Tabela de etapas ----------
  html += `<div class="card tw"><div class="hd"><i class="ti ti-list-check"></i>Etapas — clique para medir o avanço</div><div class="bd"><table>
    <thead><tr><th class="c">#</th><th>Etapa</th><th class="c">Peso</th><th class="c">Início</th><th class="c">Término</th>
      <th class="c">Dur.</th><th style="min-width:130px">Avanço</th><th class="c">Situação</th><th class="c no-print">Ações</th></tr></thead><tbody>`;
  etapas.forEach(e=>{
    const av = num(e.avanco);
    const vencida = e.dtFim < hoje() && av<100;
    const st = av>=100 ? ['s-ok','Concluída'] : av>0 ? (vencida?['s-bl','Atrasada']:['s-pd','Em execução'])
              : (e.dtIni<=hoje()? (vencida?['s-bl','Atrasada']:['s-wn','A iniciar']) : ['s-nt','Programada']);
    html += `<tr><td class="c tt">${e.ordem}</td>
      <td><b style="color:${e.cor||'inherit'}">${esc(e.nome)}</b>${e.obs?`<br><span class="tt">${esc(e.obs)}</span>`:''}</td>
      <td class="c n">${qtd(e.peso,0)}%</td><td class="c n">${dbr(e.dtIni)}</td><td class="c n">${dbr(e.dtFim)}</td>
      <td class="c n">${diasEntre(e.dtIni,e.dtFim)}d</td>
      <td><div class="prow"><div class="pb" style="flex:1"><div class="pf ${av>=100?'gn':vencida?'rd':''}" style="width:${clamp(av,0,100)}%"></div></div><span>${qtd(av,0)}%</span></div></td>
      <td class="c"><span class="st ${st[0]}">${st[1]}</span></td>
      <td class="c no-print nowrap">
        <button class="ib bl" title="Medir avanço" onclick="cronoMedir(${e.id})"><i class="ti ti-ruler-measure"></i></button>
        <button class="ib" title="Editar" onclick="cronoEtapaForm(${e.id})"><i class="ti ti-edit"></i></button>
        <button class="ib rd" title="Excluir" onclick="cronoEtapaDel(${e.id})"><i class="ti ti-trash"></i></button></td></tr>`;
  });
  html += `</tbody><tfoot><tr><td colspan="2">TOTAL — ${etapas.length} etapas</td><td class="c n">${qtd(pesoTot,0)}%</td>
    <td class="c n">${dbr(ini)}</td><td class="c n">${dbr(fim)}</td><td class="c n">${tot}d</td>
    <td><div class="prow"><div class="pb" style="flex:1"><div class="pf" style="width:${clamp(r.avanco,0,100)}%"></div></div><span>${qtd(r.avanco,0)}%</span></div></td>
    <td colspan="2"></td></tr></tfoot></table></div></div>`;
  root.innerHTML = html;
}

async function cronoGerar(){
  const o = await obraAtual();
  const at = await dbByObra('etapas',o.id);
  confirmar('Gerar cronograma padrão',
    at.length? `Já existem ${at.length} etapas. Elas serão <b>substituídas</b> pelas 14 etapas padrão. Os avanços medidos serão perdidos. Continuar?`
             : `Serão criadas as 14 etapas padrão de edificação, com datas distribuídas entre <b>${dbr(o.dtInicio)}</b> e <b>${dbr(o.dtPrevFim)}</b>.`,
    async()=>{
      for(const e of at) await dbDel('etapas',e.id);
      await gerarCronograma(o.id,o.dtInicio,o.dtPrevFim);
      toast('Cronograma gerado.'); cronoRender();
    });
}

async function cronoEtapaForm(id){
  const o = await obraAtual();
  const e = id ? await dbGet('etapas',id) : null;
  const etapas = await dbByObra('etapas',o.id);
  const b = `
   <div class="fr3">
     <div class="fg"><label>Ordem</label><input id="et-ord" type="number" value="${e?e.ordem:(etapas.length+1)}"></div>
     <div class="fg" style="grid-column:span 2"><label>Nome da etapa <span class="rq">*</span></label>
       <input id="et-nome" list="et-nomes" value="${esc(e?e.nome:'')}">
       <datalist id="et-nomes">${ETAPAS_PADRAO.map(x=>`<option value="${esc(x.nome)}">`).join('')}</datalist></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Peso no avanço (%) <span class="rq">*</span></label><input id="et-peso" type="number" step="0.1" value="${e?e.peso:5}">
       <span class="hint">Participação da etapa no avanço físico total.</span></div>
     <div class="fg"><label>Início</label><input id="et-ini" type="date" value="${e?e.dtIni:o.dtInicio}"></div>
     <div class="fg"><label>Término</label><input id="et-fim" type="date" value="${e?e.dtFim:o.dtPrevFim}"></div>
   </div>
   <div class="fr2">
     <div class="fg"><label>Avanço executado (%)</label><input id="et-av" type="number" min="0" max="100" step="1" value="${e?e.avanco:0}"></div>
     <div class="fg"><label>Cor no gráfico</label><input id="et-cor" type="color" value="${e&&e.cor?e.cor:'#15599E'}" style="height:38px;padding:3px"></div>
   </div>
   <div class="fg"><label>Observações</label><textarea id="et-obs">${esc(e?e.obs:'')}</textarea></div>
   <div id="et-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="cronoEtapaSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Editar etapa':'Nova etapa','ti-list-check',b,f);
}
async function cronoEtapaSave(id){
  const o = await obraAtual();
  const nome = val('et-nome');
  if(!nome){ document.getElementById('et-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome da etapa.</div>`; return; }
  const d = {obraId:o.id, ordem:num(val('et-ord')), nome, peso:num(val('et-peso')),
             dtIni:val('et-ini'), dtFim:val('et-fim'), avanco:clamp(num(val('et-av')),0,100),
             cor:val('et-cor'), obs:val('et-obs')};
  if(id){ const old = await dbGet('etapas',id); await dbPut('etapas',{...old,...d}); }
  else { const p = ETAPAS_PADRAO.find(x=>x.nome===nome); await dbAdd('etapas',{...d,grupo:p?p.grupo:'acabamento'}); }
  closeModal('mk-form'); toast('Etapa salva.'); cronoRender();
}
function cronoEtapaDel(id){
  confirmar('Excluir etapa','A etapa será removida do cronograma. Itens de orçamento e custos vinculados a ela continuarão existindo, mas ficarão sem etapa correspondente.',
    async()=>{ await dbDel('etapas',id); toast('Etapa removida.','aw'); cronoRender(); });
}

/* ---------- Medição rápida de avanço (uso em campo) ---------- */
async function cronoMedir(id){
  const e = await dbGet('etapas',id);
  const b = `<div style="text-align:center;margin-bottom:14px">
      <div style="font-size:15px;font-weight:800;color:${e.cor||'var(--blue)'}">${esc(e.nome)}</div>
      <div class="tt">${dbr(e.dtIni)} a ${dbr(e.dtFim)} · peso ${qtd(e.peso,0)}% da obra</div></div>
    <div class="fg"><label>Percentual executado</label>
      <input id="md-range" type="range" min="0" max="100" step="5" value="${num(e.avanco)}" oninput="document.getElementById('md-val').value=this.value;document.getElementById('md-lbl').textContent=this.value+'%'"
        style="width:100%;height:34px"></div>
    <div style="text-align:center;font-size:38px;font-weight:800;color:var(--blue);margin:4px 0 12px" id="md-lbl">${qtd(e.avanco,0)}%</div>
    <div class="chips" style="justify-content:center">
      ${[0,25,50,75,90,100].map(v=>`<button class="chip" onclick="cronoMedirSet(${v})">${v}%</button>`).join('')}</div>
    <div class="fr2">
      <div class="fg"><label>Percentual (%)</label><input id="md-val" type="number" min="0" max="100" value="${num(e.avanco)}"
        oninput="document.getElementById('md-range').value=this.value;document.getElementById('md-lbl').textContent=this.value+'%'"></div>
      <div class="fg"><label>Data da medição</label><input id="md-data" type="date" value="${hoje()}"></div></div>
    <div class="fg"><label>Observação da medição</label><textarea id="md-obs" placeholder="O que foi executado no período..."></textarea></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="cronoMedirSave(${id})"><i class="ti ti-check"></i>Registrar avanço</button>`;
  modal('Medir avanço da etapa','ti-ruler-measure',b,f,'sm');
}
function cronoMedirSet(v){
  setVal('md-val',v); setVal('md-range',v);
  document.getElementById('md-lbl').textContent = v+'%';
}
async function cronoMedirSave(id){
  const e = await dbGet('etapas',id);
  const novo = clamp(num(val('md-val')),0,100);
  const obs = val('md-obs');
  await dbPut('etapas',{...e, avanco:novo, status: novo>=100?'Concluída':novo>0?'Em execução':'Não iniciada',
    obs: obs ? `${dbr(val('md-data'))}: ${obs}` : e.obs});
  closeModal('mk-form'); toast(`${e.nome}: avanço registrado em ${novo}%.`);
  cronoRender();
}

async function printCronograma(){
  const o = await obraAtual();
  const r = await obraResumo(o.id);
  const etapas = r.etapas.sort((a,b)=>a.ordem-b.ordem);
  let h = prnHead('Cronograma Físico-Financeiro','Situação das etapas em '+dbr(hoje()));
  h += prnObraInfo(o);
  h += `<div class="pkg">
    <div class="pkc"><div class="l">Avanço real</div><div class="v">${pct(r.avanco)}</div></div>
    <div class="pkc"><div class="l">Avanço planejado</div><div class="v">${pct(r.plan)}</div></div>
    <div class="pkc"><div class="l">Desvio</div><div class="v">${(r.avanco-r.plan>=0?'+':'')+pct(r.avanco-r.plan)}</div></div>
    <div class="pkc"><div class="l">Prazo restante</div><div class="v">${diasEntre(hoje(),o.dtPrevFim)} d</div></div></div>`;
  h += `<table><thead><tr><th>#</th><th>Etapa</th><th>Peso</th><th>Início</th><th>Término</th><th>Dur.</th>
    <th>Avanço</th><th>Situação</th><th>Orçado</th><th>Realizado</th></tr></thead><tbody>`;
  etapas.forEach(e=>{
    const av = num(e.avanco);
    const orcE = r.orc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
    const reaE = r.lanc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.valor),0);
    const st = av>=100?'Concluída':av>0?'Em execução':(e.dtFim<hoje()?'Atrasada':'Programada');
    h += `<tr><td>${e.ordem}</td><td>${esc(e.nome)}</td><td>${qtd(e.peso,0)}%</td><td>${dbr(e.dtIni)}</td>
      <td>${dbr(e.dtFim)}</td><td>${diasEntre(e.dtIni,e.dtFim)}d</td><td>${qtd(av,0)}%</td><td>${st}</td>
      <td style="text-align:right">${moeda(orcE)}</td><td style="text-align:right">${moeda(reaE)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan="6">TOTAL</td><td>${pct(r.avanco)}</td><td></td>
    <td style="text-align:right">${moeda(r.orcado)}</td><td style="text-align:right">${moeda(r.realizado)}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}

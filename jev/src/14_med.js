/* =========================================================================
   MÓDULO: MEDIÇÕES — boletins de medição para faturamento ao cliente
   ========================================================================= */

async function medRender(){
  const root = document.getElementById('med-root');
  const o = await obraAtual();
  if(!o){ root.innerHTML = semObra(); return; }
  const meds = (await dbByObra('medicoes',o.id)).sort((a,b)=>num(a.num)-num(b.num));
  const r = await obraResumo(o.id);
  const medido = meds.filter(m=>m.status!=='Cancelada').reduce((s,m)=>s+num(m.valor),0);
  const recebido = meds.filter(m=>m.status==='Paga').reduce((s,m)=>s+num(m.valor),0);
  const vc = num(o.valorContrato);
  const aMedir = vc*r.avanco/100 - medido;

  let html = `<div class="ph"><div class="ic"><i class="ti ti-ruler-measure"></i></div>
    <div><h1>Medições</h1><p>${esc(o.cod)} — ${esc(o.nome)} · faturamento por avanço físico</p></div>
    <div class="sp"></div>
    <button class="btn" onclick="medNova()"><i class="ti ti-plus"></i>Nova medição</button></div>`;

  if(!vc){
    html += `<div class="al aw"><i class="ti ti-alert-triangle"></i><div>Esta obra não tem <b>valor de contrato</b> informado.
      As medições são calculadas sobre o valor contratado — informe-o no cadastro da obra para usar este módulo.
      <button class="btn xs gh" style="margin-left:8px" onclick="obraForm(${o.id})">Editar obra</button></div></div>`;
  }

  html += `<div class="kg" style="margin-bottom:14px">
    <div class="kc pu"><div class="lb"><i class="ti ti-file-dollar"></i>Contrato</div><div class="vl">${moedaK(vc)}</div><div class="sb">valor total contratado</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-progress"></i>Avanço físico</div><div class="vl">${pct(r.avanco)}</div>
      <div class="sb">equivale a ${moedaK(vc*r.avanco/100)}</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-receipt"></i>Já medido</div><div class="vl">${moedaK(medido)}</div>
      <div class="sb">${meds.length} boletim(ns) · ${vc?pct(medido/vc*100):'—'} do contrato</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-cash-banknote"></i>Recebido</div><div class="vl">${moedaK(recebido)}</div>
      <div class="sb">${moedaK(medido-recebido)} a receber</div></div>
    <div class="kc ${aMedir>0?'tl':'nt'}"><div class="lb"><i class="ti ti-hourglass"></i>A medir</div><div class="vl">${moedaK(Math.max(aMedir,0))}</div>
      <div class="sb">avanço executado ainda não faturado</div></div>
    <div class="kc rd"><div class="lb"><i class="ti ti-report-money"></i>Resultado</div><div class="vl">${moedaK(medido-r.realizado)}</div>
      <div class="sb">medido menos custo realizado</div></div>
  </div>`;

  if(!meds.length){
    html += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-ruler-off"></i>
      <b>Nenhuma medição emitida</b>O boletim de medição compara o avanço físico acumulado das etapas com o
      da medição anterior e calcula quanto faturar no período. Atualize o avanço das etapas no Cronograma antes de medir.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="medNova()"><i class="ti ti-plus"></i>Emitir primeira medição</button>
      <button class="btn gh" onclick="go('crono')"><i class="ti ti-calendar-stats"></i>Atualizar avanços</button></div></div></div></div>`;
  }else{
    html += `<div class="card tw"><div class="bd"><table>
      <thead><tr><th>Nº</th><th>Período</th><th class="c">Avanço acum.</th><th class="c">Δ período</th>
      <th class="r">Valor</th><th class="c">Status</th><th class="c">Vencimento</th><th class="c no-print"></th></tr></thead><tbody>`;
    meds.forEach(m=>{
      const st = m.status==='Paga'?'s-ok':m.status==='Cancelada'?'s-bl':m.status==='Aprovada'?'s-pd':'s-wn';
      html += `<tr><td class="mono"><b>${esc(String(m.num).padStart(2,'0'))}</b></td>
        <td class="n">${dbr(m.dtIni)} a ${dbr(m.dtFim)}</td>
        <td class="c n">${pct(m.avancoAcum)}</td><td class="c n"><b>${pct(m.avancoDelta)}</b></td>
        <td class="r n"><b>${moeda(m.valor)}</b></td>
        <td class="c"><span class="st ${st}">${esc(m.status)}</span></td>
        <td class="c n tt">${dbr(m.venc)}</td>
        <td class="c no-print nowrap"><button class="ib" onclick="printMedicao(${m.id})"><i class="ti ti-printer"></i></button>
          <button class="ib bl" onclick="medEditar(${m.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="medDel(${m.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    html += `</tbody><tfoot><tr><td colspan="4">TOTAL MEDIDO</td><td class="r n">${moeda(medido)}</td><td colspan="3"></td></tr></tfoot></table></div></div>`;

    // curva de faturamento x custo
    const labels = meds.map(m=>'Med. '+String(m.num).padStart(2,'0'));
    let acc=0; const fat = meds.map(m=>{acc+=num(m.valor);return acc;});
    const custos = [];
    let accC = 0;
    for(const m of meds){
      accC = r.lanc.filter(l=>l.data<=m.dtFim).reduce((s,l)=>s+num(l.valor),0);
      custos.push(accC);
    }
    html += `<div class="chg"><div class="card"><div class="hd"><i class="ti ti-chart-line"></i>Faturamento x custo acumulado</div><div class="bd">
      ${lineChart([{name:'Medido (receita)',pts:fat,color:'#1F7A44',area:true},
                   {name:'Custo realizado',pts:custos,color:'#A8291F'}],labels,{money:true,h:220})}</div></div>
      <div class="card"><div class="hd"><i class="ti ti-cash"></i>Situação financeira do contrato</div><div class="bd">
      ${hbarChart([
        {label:'Valor do contrato',val:vc,color:'#4B3FA3'},
        {label:'Medido acumulado',val:medido,color:'#1F7A44'},
        {label:'Recebido',val:recebido,color:'#0E6E70'},
        {label:'Custo realizado',val:r.realizado,color:'#A8291F'},
        {label:'Saldo do contrato',val:Math.max(vc-medido,0),color:'#B26A0C'}
      ])}</div></div></div>`;
  }
  root.innerHTML = html;
}

async function medNova(){
  const o = await obraAtual();
  const meds = (await dbByObra('medicoes',o.id)).sort((a,b)=>num(a.num)-num(b.num));
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  if(!etapas.length){ toast('Gere o cronograma da obra antes de medir.','aw'); go('crono'); return; }
  const ant = meds.filter(m=>m.status!=='Cancelada').slice(-1)[0];
  const base = {}; if(ant) (ant.itens||[]).forEach(i=>base[i.etapa]=num(i.acum));
  const vc = num(o.valorContrato);
  const pesoTot = etapas.reduce((s,e)=>s+num(e.peso),0)||100;
  const itens = etapas.map(e=>{
    const acum = clamp(num(e.avanco),0,100);
    const antAc = base[e.nome]||0;
    return {etapa:e.nome, peso:num(e.peso), ant:antAc, acum, delta:Math.max(acum-antAc,0),
            valor: vc*(num(e.peso)/pesoTot)*Math.max(acum-antAc,0)/100};
  });
  window.__MED = {itens, vc, pesoTot};
  const total = itens.reduce((s,i)=>s+i.valor,0);
  const avAcum = itens.reduce((s,i)=>s+i.peso*i.acum,0)/pesoTot;
  const avDelta= itens.reduce((s,i)=>s+i.peso*i.delta,0)/pesoTot;

  const b = `<div class="fr4">
      <div class="fg"><label>Nº da medição</label><input id="me-num" type="number" value="${(meds.length?num(meds[meds.length-1].num):0)+1}"></div>
      <div class="fg"><label>Início do período</label><input id="me-ini" type="date" value="${ant?addDias(ant.dtFim,1):o.dtInicio}"></div>
      <div class="fg"><label>Fim do período</label><input id="me-fim" type="date" value="${hoje()}"></div>
      <div class="fg"><label>Vencimento</label><input id="me-venc" type="date" value="${addDias(hoje(),15)}"></div></div>
    <div class="fr2">
      <div class="fg"><label>Status</label><select id="me-status">${['Emitida','Aprovada','Paga','Cancelada'].map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="fg"><label>Retenção / desconto (R$)</label><input id="me-ret" type="number" step="0.01" value="0" oninput="medRecalc()"></div></div>
    <div class="al ai"><i class="ti ti-info-circle"></i><div>Valores calculados sobre o contrato de <b>${moeda(vc)}</b>,
      pela diferença entre o avanço atual das etapas e o da medição anterior. Ajuste o % desta medição se necessário.</div></div>
    <div class="card tw"><div class="bd"><table><thead><tr><th>Etapa</th><th class="c">Peso</th>
      <th class="r">% anterior</th><th class="r" style="width:104px">% atual</th><th class="r">Δ período</th><th class="r">Valor</th></tr></thead><tbody>
      ${itens.map((i,ix)=>`<tr><td><b>${esc(i.etapa)}</b></td><td class="c n">${qtd(i.peso,0)}%</td>
        <td class="r n">${qtd(i.ant,1)}%</td>
        <td><input type="number" min="0" max="100" step="0.1" value="${i.acum}" onchange="medSet(${ix},this.value)"
          style="width:96px;text-align:right;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
        <td class="r n" id="me-d-${ix}">${qtd(i.delta,1)}%</td>
        <td class="r n" id="me-v-${ix}"><b>${moeda(i.valor)}</b></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">TOTAL DA MEDIÇÃO</td><td class="r n" id="me-td">${qtd(avDelta,1)}%</td>
      <td class="r n" id="me-tv">${moeda(total)}</td></tr></tfoot></table></div></div>
    <div class="fg"><label>Observações do boletim</label><textarea id="me-obs" placeholder="Serviços executados no período, pendências, condições de pagamento..."></textarea></div>
    <div id="me-resumo" class="al ag"><i class="ti ti-receipt"></i><div>Avanço acumulado: <b>${pct(avAcum)}</b> ·
      Valor bruto: <b>${moeda(total)}</b> · Valor líquido: <b>${moeda(total)}</b></div></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="medSave()"><i class="ti ti-device-floppy"></i>Emitir medição</button>`;
  modal('Nova medição','ti-ruler-measure',b,f,'lg');
}
function medSet(ix,v){
  const M = window.__MED;
  const i = M.itens[ix];
  i.acum = clamp(num(v),0,100);
  i.delta = Math.max(i.acum - i.ant,0);
  i.valor = M.vc*(i.peso/M.pesoTot)*i.delta/100;
  document.getElementById('me-d-'+ix).textContent = qtd(i.delta,1)+'%';
  document.getElementById('me-v-'+ix).innerHTML = '<b>'+moeda(i.valor)+'</b>';
  medRecalc();
}
function medRecalc(){
  const M = window.__MED;
  const total = M.itens.reduce((s,i)=>s+i.valor,0);
  const avAcum = M.itens.reduce((s,i)=>s+i.peso*i.acum,0)/M.pesoTot;
  const avDelta= M.itens.reduce((s,i)=>s+i.peso*i.delta,0)/M.pesoTot;
  const ret = num(val('me-ret'));
  document.getElementById('me-td').textContent = qtd(avDelta,1)+'%';
  document.getElementById('me-tv').textContent = moeda(total);
  document.getElementById('me-resumo').innerHTML =
    `<i class="ti ti-receipt"></i><div>Avanço acumulado: <b>${pct(avAcum)}</b> · Valor bruto: <b>${moeda(total)}</b>
     · Retenção: <b>${moeda(ret)}</b> · Valor líquido: <b>${moeda(total-ret)}</b></div>`;
}
async function medSave(){
  const o = await obraAtual();
  const M = window.__MED;
  const total = M.itens.reduce((s,i)=>s+i.valor,0);
  const ret = num(val('me-ret'));
  const avAcum = M.itens.reduce((s,i)=>s+i.peso*i.acum,0)/M.pesoTot;
  const avDelta= M.itens.reduce((s,i)=>s+i.peso*i.delta,0)/M.pesoTot;
  if(total<=0){
    toast('Não há avanço novo desde a medição anterior — atualize os percentuais das etapas no Cronograma.','aw');
    return;
  }
  const medId = await dbAdd('medicoes',{obraId:o.id, num:num(val('me-num')), dtIni:val('me-ini'), dtFim:val('me-fim'),
    venc:val('me-venc'), status:val('me-status'), retencao:ret, bruto:total, valor:total-ret,
    avancoAcum:avAcum, avancoDelta:avDelta, itens:JSON.parse(JSON.stringify(M.itens)), obs:val('me-obs')});
  const st = val('me-status');
  await finAdd({tipo:'receita', un:'obras', refTipo:'obra', refId:o.id, refNome:o.cod+' — '+o.nome,
    desc:`Medição nº ${String(num(val('me-num'))).padStart(2,'0')} — ${o.nome}`,
    valor:total-ret, cat:'Medição de obra', data:val('me-fim'), venc:val('me-venc'),
    status: st==='Paga'?'Pago':'Pendente', dtPag: st==='Paga'?val('me-venc'):'',
    pessoa:o.cliente||'', contaId:CFG.contaPadrao||null, medicaoId:medId,
    auto:true, origem:'Boletim de medição'});
  closeModal('mk-form'); toast('Medição emitida.'); medRender();
}
async function medEditar(id){
  const m = await dbGet('medicoes',id);
  const b = `<div class="fr2">
      <div class="fg"><label>Status</label><select id="mz-status">
        ${['Emitida','Aprovada','Paga','Cancelada'].map(s=>`<option ${m.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="fg"><label>Vencimento</label><input id="mz-venc" type="date" value="${m.venc||''}"></div></div>
    <div class="fr2">
      <div class="fg"><label>Data do pagamento</label><input id="mz-pg" type="date" value="${m.dtPag||''}"></div>
      <div class="fg"><label>Valor líquido (R$)</label><input id="mz-valor" type="number" step="0.01" value="${num(m.valor)}"></div></div>
    <div class="fg"><label>Observações</label><textarea id="mz-obs">${esc(m.obs||'')}</textarea></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="medEditarSave(${id})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal('Medição nº '+String(m.num).padStart(2,'0'),'ti-edit',b,f,'sm');
}
async function medEditarSave(id){
  const m = await dbGet('medicoes',id);
  await dbPut('medicoes',{...m, status:val('mz-status'), venc:val('mz-venc'), dtPag:val('mz-pg'),
    valor:num(val('mz-valor')), obs:val('mz-obs')});
  const lan = FIN.find(l=>Number(l.medicaoId)===Number(id));
  if(lan){
    const st = val('mz-status');
    await dbPut('financeiro',{...lan, valor:num(val('mz-valor')), venc:val('mz-venc'),
      status: st==='Paga'?'Pago':st==='Cancelada'?'Cancelado':'Pendente',
      dtPag: st==='Paga'?(val('mz-pg')||hoje()):''});
    await finLoad();
  }
  closeModal('mk-form'); toast('Medição atualizada.'); medRender();
}
function medDel(id){
  confirmar('Excluir medição','O boletim será removido. As medições seguintes continuarão usando os percentuais que já foram gravados.',
    async()=>{ await dbDel('medicoes',id);
      const lan = FIN.find(l=>Number(l.medicaoId)===Number(id));
      if(lan) await dbDel('financeiro',lan.id);
      await finLoad(); toast('Medição removida.','aw'); medRender(); });
}

async function printMedicao(id){
  const m = await dbGet('medicoes',id);
  const o = await dbGet('obras',m.obraId);
  let h = prnHead('Boletim de Medição nº '+String(m.num).padStart(2,'0'),
                  'Período de '+dbr(m.dtIni)+' a '+dbr(m.dtFim));
  h += prnObraInfo(o);
  h += `<div class="pkg">
    <div class="pkc"><div class="l">Avanço acumulado</div><div class="v">${pct(m.avancoAcum)}</div></div>
    <div class="pkc"><div class="l">Avanço no período</div><div class="v">${pct(m.avancoDelta)}</div></div>
    <div class="pkc"><div class="l">Valor bruto</div><div class="v">${moedaK(m.bruto)}</div></div>
    <div class="pkc"><div class="l">Valor líquido</div><div class="v">${moedaK(m.valor)}</div></div></div>`;
  h += `<div class="psec">Demonstrativo por etapa</div><table>
    <thead><tr><th>Etapa</th><th>Peso</th><th>% anterior</th><th>% atual</th><th>Δ período</th><th>Valor a faturar</th></tr></thead><tbody>`;
  (m.itens||[]).forEach(i=>{ h += `<tr><td>${esc(i.etapa)}</td><td style="text-align:center">${qtd(i.peso,0)}%</td>
    <td style="text-align:right">${qtd(i.ant,1)}%</td><td style="text-align:right">${qtd(i.acum,1)}%</td>
    <td style="text-align:right">${qtd(i.delta,1)}%</td><td style="text-align:right">${moeda(i.valor)}</td></tr>`; });
  h += `</tbody><tfoot><tr><td colspan="5">VALOR BRUTO DA MEDIÇÃO</td><td style="text-align:right">${moeda(m.bruto)}</td></tr>
    ${num(m.retencao)?`<tr><td colspan="5">(–) Retenção / desconto</td><td style="text-align:right">${moeda(m.retencao)}</td></tr>`:''}
    <tr><td colspan="5">VALOR LÍQUIDO A PAGAR</td><td style="text-align:right">${moeda(m.valor)}</td></tr></tfoot></table>`;
  h += `<div class="pinf" style="margin-top:10px"><div><span>Vencimento:</span> <b>${dbr(m.venc)}</b></div>
    <div><span>Situação:</span> <b>${esc(m.status)}</b></div>
    <div><span>Contrato:</span> <b>${moeda(o.valorContrato)}</b></div></div>`;
  if(m.obs) h += `<div class="psec">Observações</div><div style="font-size:9.5px;padding:6px 3px">${esc(m.obs)}</div>`;
  h += prnSig(CFG.respTec||'Responsável Técnico',CFG.crea||'CREA/CAU', o.cliente||'Contratante','Aprovo a medição acima');
  h += prnFoot();
  printar(h);
}

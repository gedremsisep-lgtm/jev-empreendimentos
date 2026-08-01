/* =========================================================================
   TELA INICIAL — hub de negócios da família
   ========================================================================= */

async function hubRender(){
  const root = document.getElementById('hub-root');
  await finLoad();
  const contas = await saldoContas();
  const saldo = contas.reduce((s,c)=>s+c.saldo,0);
  const mk = mesAtual();
  const doMes = finDoMes(mk);
  const rec = somaFin(doMes,'receita'), des = somaFin(doMes,'despesa');
  const aPagar = FIN.filter(l=>l.tipo==='despesa'&&l.status==='Pendente'&&finVale(l));
  const aReceber = FIN.filter(l=>l.tipo==='receita'&&l.status==='Pendente'&&finVale(l));
  const vencidos = aPagar.filter(finAtrasado);
  const inad = aReceber.filter(finAtrasado);
  const venc7 = aPagar.filter(l=>!finAtrasado(l) && (l.venc||l.data)<=addDias(hoje(),7));

  const nome = CFG.empresa || 'JeV Empreendimentos';
  const hora = new Date().getHours();
  const saud = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite';

  let h = `<div class="hero">
    <h1>${saud}! Este é o painel da ${esc(nome)}</h1>
    <p>${dbr(hoje())} · visão de ${dmesL(mk)}</p>
    <div class="hgrid">
      <div class="hg gold"><div class="l"><i class="ti ti-building-bank"></i>Saldo em caixa</div>
        <div class="v">${moedaK(saldo)}</div><div class="s">${contas.length} conta(s)</div></div>
      <div class="hg pos"><div class="l"><i class="ti ti-trending-up"></i>Receitas do mês</div>
        <div class="v">${moedaK(rec)}</div><div class="s">${doMes.filter(l=>l.tipo==='receita').length} entrada(s)</div></div>
      <div class="hg neg"><div class="l"><i class="ti ti-trending-down"></i>Despesas do mês</div>
        <div class="v">${moedaK(des)}</div><div class="s">${doMes.filter(l=>l.tipo==='despesa').length} saída(s)</div></div>
      <div class="hg ${rec-des>=0?'pos':'neg'}"><div class="l"><i class="ti ti-report-money"></i>Resultado do mês</div>
        <div class="v">${moedaK(rec-des)}</div><div class="s">${rec?pct((rec-des)/rec*100)+' de margem':'—'}</div></div>
    </div></div>`;

  // ------- avisos -------
  const avisos = [];
  if(vencidos.length) avisos.push(['ae','ti-alert-circle',
    `<b>${vencidos.length} conta(s) vencida(s)</b> somando <b>${moeda(vencidos.reduce((s,l)=>s+num(l.valor),0))}</b>.`,
    `<button class="btn xs rd" onclick="FIN_TAB='pag';go('fin')">Ver contas a pagar</button>`]);
  if(venc7.length) avisos.push(['aw','ti-clock',
    `${venc7.length} conta(s) vencem nos próximos 7 dias — <b>${moeda(venc7.reduce((s,l)=>s+num(l.valor),0))}</b>.`,
    `<button class="btn xs gh" onclick="FIN_TAB='pag';go('fin')">Conferir</button>`]);
  if(inad.length) avisos.push(['aw','ti-user-exclamation',
    `${inad.length} recebimento(s) em atraso — <b>${moeda(inad.reduce((s,l)=>s+num(l.valor),0))}</b> a cobrar.`,
    `<button class="btn xs gh" onclick="FIN_TAB='receb';go('fin')">Ver a receber</button>`]);
  if(!contas.length) avisos.push(['ai','ti-building-bank',
    `Cadastre suas contas bancárias para o sistema mostrar o saldo real do caixa.`,
    `<button class="btn xs" onclick="FIN_TAB='cta';go('fin')">Cadastrar conta</button>`]);
  if(!CFG.empresa) avisos.push(['ai','ti-settings',
    `Preencha os dados da empresa para os relatórios saírem com o timbre da JeV.`,
    `<button class="btn xs" onclick="go('cfg')">Configurar</button>`]);
  const alertasUn = await avisosNegocios();
  avisos.push(...alertasUn);
  if(avisos.length){
    h += `<div class="sh"><i class="ti ti-bell"></i>Precisa da sua atenção<span class="sp"></span></div>`;
    avisos.slice(0,6).forEach(([c,i,t,b])=>{
      h += `<div class="al ${c}"><i class="ti ${i}"></i><div style="flex:1">${t}</div>${b||''}</div>`;
    });
  }

  // ------- cards de negócio -------
  h += `<div class="sh"><i class="ti ti-briefcase"></i>Seus negócios<span class="sp"></span>
    <span class="tt">Toque em um card para entrar</span></div><div class="ugrid">`;
  for(const u of UNIDADES){
    if(!PERMS[CU].includes(u.pg)) continue;
    const r12 = resultadoUn(u.id,null);
    const rm = resultadoUn(u.id,mk);
    const ind = await indicadoresUn(u.id);
    h += `<div class="ucard" style="--uc:${u.cor};--ucb:${u.bg}" onclick="go('${u.pg}')">
      <div class="bar"></div>
      <div class="top2"><div class="ico"><i class="ti ${u.ic}"></i></div>
        <div style="flex:1;min-width:0"><h3>${esc(u.curto)}</h3><div class="sub">${esc(u.desc)}</div></div></div>
      <div class="body">
        ${ind.map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}
        <div class="kv"><span>Receita do mês</span><b style="color:var(--green)">${moedaK(rm.receita)}</b></div>
        <div class="kv"><span>Despesa do mês</span><b style="color:var(--red)">${moedaK(rm.despesa)}</b></div>
        <div class="foot">
          <div><div class="tt">Resultado do mês</div>
            <div class="res" style="color:${rm.resultado>=0?'var(--green)':'var(--red)'}">${moedaK(rm.resultado)}</div></div>
          <div class="go">Abrir <i class="ti ti-arrow-right"></i></div></div>
      </div></div>`;
  }
  h += `</div>`;

  // ------- atalhos -------
  h += `<div class="sh"><i class="ti ti-bolt"></i>Atalhos rápidos</div>
   <div class="mgrid">
    ${[['Lançar despesa','ti-arrow-up-circle','var(--red)',"finLancForm(null,{tipo:'despesa'})"],
       ['Lançar receita','ti-arrow-down-circle','var(--green)',"finLancForm(null,{tipo:'receita'})"],
       ['Contas a pagar','ti-file-invoice','var(--amber)',"FIN_TAB='pag';go('fin')"],
       ['Registrar diário de obra','ti-notebook','var(--brand)',"go('rdo')"],
       ['Receber aluguéis do mês','ti-home-dollar','var(--blue)',"go('imoveis')"],
       ['Resultado por negócio','ti-table','var(--purple)',"FIN_TAB='dre';go('fin')"]]
      .map(([t,i,c,f])=>`<div class="ocard" onclick="${f}" style="padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:11px;background:${c}18;color:${c};display:flex;
          align-items:center;justify-content:center;font-size:21px"><i class="ti ${i}"></i></div>
        <b style="font-size:13.5px">${t}</b></div>`).join('')}
   </div>`;

  // ------- últimos movimentos -------
  const ult = FIN.filter(finVale).sort((a,b)=>String(b.data).localeCompare(String(a.data))).slice(0,8);
  if(ult.length){
    h += `<div class="sh"><i class="ti ti-history"></i>Últimos movimentos</div>
      <div class="card tw"><div class="bd"><table><thead><tr><th>Data</th><th>Descrição</th><th>Negócio</th>
      <th class="c">Situação</th><th class="r">Valor</th></tr></thead><tbody>`;
    ult.forEach(l=>{
      const u = unInfo(l.un), st = finStatus(l);
      h += `<tr style="cursor:pointer" onclick="finLancForm(${l.id})"><td class="n">${dbr(l.data)}</td>
        <td><b>${esc(l.desc)}</b>${l.refNome?`<br><span class="tt">${esc(l.refNome)}</span>`:''}</td>
        <td><span class="st" style="background:${u.bg};color:${u.cor}">${esc(u.curto)}</span></td>
        <td class="c"><span class="st ${st.c}">${st.t}</span></td>
        <td class="r n"><b style="color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${l.tipo==='receita'?'+':'−'} ${moeda(l.valor)}</b></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  } else {
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-rocket"></i>
      <b>Vamos começar?</b>Cadastre suas contas, lance as despesas fixas e escolha um negócio para configurar.
      Se quiser ver o sistema funcionando primeiro, carregue os dados de exemplo.
      <div class="brow" style="justify-content:center;margin-top:14px">
        <button class="btn" onclick="go('cfg')"><i class="ti ti-settings"></i>Configurar empresa</button>
        <button class="btn gh" onclick="seedDemo()"><i class="ti ti-flask"></i>Carregar dados de exemplo</button></div>
      </div></div></div>`;
  }
  root.innerHTML = h;
}

/* indicadores curtos por unidade, mostrados no card do hub */
async function indicadoresUn(id){
  try{
    if(id==='obras'){
      const obras = await dbGetAll('obras');
      const ativas = obras.filter(o=>o.status==='Em andamento');
      let av = 0;
      for(const o of ativas){ const r = await obraResumo(o.id); av += r.avanco; }
      return [['Obras em andamento', ativas.length+' de '+obras.length],
              ['Avanço médio', ativas.length?pct(av/ativas.length):'—']];
    }
    if(id==='imoveis'){
      const im = await dbGetAll('imoveis');
      const alug = im.filter(x=>x.status==='Alugado').length;
      return [['Imóveis', String(im.length)],
              ['Ocupação', im.length?pct(alug/im.length*100):'—']];
    }
    if(id==='veiculos'){
      const v = await dbGetAll('veiculos');
      return [['Veículos', String(v.length)],
              ['Locados agora', String(v.filter(x=>x.status==='Locado').length)]];
    }
    if(id==='chacara'){
      const l = await dbGetAll('lotes'), c = await dbGetAll('ciclos');
      return [['Lotes / áreas', String(l.length)],
              ['Ciclos em andamento', String(c.filter(x=>x.status==='Em andamento').length)]];
    }
    if(id==='produtos'||id==='info'){
      const p = (await dbGetAll('produtos')).filter(x=>id==='info'?x.tipo==='Infoproduto':x.tipo!=='Infoproduto');
      const vd = await dbGetAll('vendas');
      const mk = mesAtual();
      const vm = vd.filter(x=>String(x.data).slice(0,7)===mk && x.un===id);
      return [[id==='info'?'Infoprodutos':'Produtos', String(p.length)],
              ['Vendas no mês', String(vm.length)]];
    }
    if(id==='midia'){
      const c = await dbGetAll('canais'), v = await dbGetAll('videos');
      const insc = c.reduce((s,x)=>s+num(x.inscritos),0);
      return [['Canais', String(c.length)],
              ['Inscritos', insc.toLocaleString('pt-BR')],
              ['Vídeos publicados', String(v.filter(x=>x.status==='Publicado').length)]];
    }
  }catch(e){ console.warn('indicadores',id,e); }
  return [];
}

/* alertas específicos de cada negócio para o painel inicial */
async function avisosNegocios(){
  const out = [];
  try{
    const obras = await dbGetAll('obras');
    for(const o of obras.filter(x=>x.status==='Em andamento')){
      const r = await obraResumo(o.id);
      if(r.avanco - r.plan < -8)
        out.push(['aw','ti-crane',`Obra <b>${esc(o.nome)}</b> está ${pct(Math.abs(r.avanco-r.plan))} atrás do cronograma.`,
          `<button class="btn xs gh" onclick="OBRA=${o.id};go('crono')">Ver cronograma</button>`]);
    }
    const contratos = await dbGetAll('contratos');
    const venc = contratos.filter(c=>c.status==='Ativo' && c.fim && diasEntre(hoje(),c.fim)<=60 && diasEntre(hoje(),c.fim)>=0);
    if(venc.length) out.push(['ai','ti-file-text',
      `${venc.length} contrato(s) de locação vencem nos próximos 60 dias — hora de renovar ou reajustar.`,
      `<button class="btn xs gh" onclick="go('imoveis')">Ver contratos</button>`]);
    const veic = await dbGetAll('veiculos');
    const manut = veic.filter(v=>v.proxRevisao && diasEntre(hoje(),v.proxRevisao)<=15);
    if(manut.length) out.push(['aw','ti-car-crash',
      `${manut.length} veículo(s) com revisão ou documento vencendo.`,
      `<button class="btn xs gh" onclick="go('veiculos')">Ver frota</button>`]);
  }catch(e){ console.warn('avisos',e); }
  return out;
}

/* busca global rápida */
async function buscaGlobal(){
  modal('Buscar no sistema','ti-search',
    `<div class="srch" style="margin-bottom:12px"><i class="ti ti-search"></i>
      <input id="bg-q" type="search" placeholder="Digite obra, imóvel, veículo, pessoa, lançamento..." oninput="buscaGlobalRun(this.value)" autofocus></div>
     <div id="bg-res"><div class="tt">Digite pelo menos 2 letras.</div></div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`,'sm');
  setTimeout(()=>document.getElementById('bg-q')?.focus(),120);
}
async function buscaGlobalRun(q){
  const box = document.getElementById('bg-res');
  q = String(q||'').trim().toLowerCase();
  if(q.length<2){ box.innerHTML = `<div class="tt">Digite pelo menos 2 letras.</div>`; return; }
  const res = [];
  const push = (ic,cor,tit,sub,fn)=>res.push({ic,cor,tit,sub,fn});
  (await dbGetAll('obras')).filter(o=>(o.nome+o.cod+(o.cliente||'')).toLowerCase().includes(q))
    .forEach(o=>push('ti-crane','#B4531F',o.nome,'Obra '+o.cod,`OBRA=${o.id};closeModal('mk-form');go('obras')`));
  (await dbGetAll('imoveis')).filter(o=>(o.nome+(o.endereco||'')).toLowerCase().includes(q))
    .forEach(o=>push('ti-home','#1F5FA8',o.nome,'Imóvel '+(o.cod||''),`closeModal('mk-form');go('imoveis')`));
  (await dbGetAll('veiculos')).filter(o=>(o.modelo+o.placa).toLowerCase().includes(q))
    .forEach(o=>push('ti-car','#4B4FA3',o.modelo,'Veículo '+o.placa,`closeModal('mk-form');go('veiculos')`));
  (await dbGetAll('pessoas')).filter(o=>(o.nome+(o.doc||'')+(o.tel||'')).toLowerCase().includes(q))
    .forEach(o=>push('ti-user','#123B4E',o.nome,(o.papeis||[]).join(', '),`closeModal('mk-form');go('pes')`));
  (await dbGetAll('produtos')).filter(o=>o.nome.toLowerCase().includes(q))
    .forEach(o=>push('ti-shopping-bag','#B0842B',o.nome,o.tipo,`closeModal('mk-form');go('${o.tipo==='Infoproduto'?'info':'produtos'}')`));
  FIN.filter(l=>(l.desc+(l.pessoa||'')).toLowerCase().includes(q)).slice(0,8)
    .forEach(l=>push(l.tipo==='receita'?'ti-arrow-down-circle':'ti-arrow-up-circle',
      l.tipo==='receita'?'#1F7A44':'#A8291F', l.desc, dbr(l.data)+' · '+moeda(l.valor), `closeModal('mk-form');finLancForm(${l.id})`));
  box.innerHTML = res.length ? res.slice(0,14).map(r=>
    `<div onclick="${r.fn}" style="display:flex;align-items:center;gap:11px;padding:9px;border-radius:9px;cursor:pointer"
       onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
       <div style="width:32px;height:32px;border-radius:9px;background:${r.cor}1A;color:${r.cor};display:flex;
         align-items:center;justify-content:center;font-size:17px"><i class="ti ${r.ic}"></i></div>
       <div><b style="font-size:13px;display:block">${esc(r.tit)}</b><span class="tt">${esc(r.sub)}</span></div></div>`).join('')
    : `<div class="tt">Nada encontrado para "${esc(q)}".</div>`;
}

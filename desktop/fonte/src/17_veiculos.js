/* =========================================================================
   NEGÓCIO: LOCAÇÃO DE VEÍCULOS E FROTA
   ========================================================================= */
let VEI_TAB = 'lista';
function veiStab(t){ VEI_TAB = t; veiculosRender(); }

async function veiculosRender(){
  const root = document.getElementById('veiculos-root');
  await finLoad();
  const veic = await dbGetAll('veiculos');
  const contratos = (await dbGetAll('contratos')).filter(c=>c.tipo==='veiculo');
  const ativos = contratos.filter(c=>c.status==='Ativo');
  const mk = mesAtual();
  const rec = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&l.tipo==='receita'&&String(l.data).slice(0,7)===mk).reduce((s,l)=>s+num(l.valor),0);
  const des = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&l.tipo==='despesa'&&String(l.data).slice(0,7)===mk).reduce((s,l)=>s+num(l.valor),0);
  const frota = veic.reduce((s,v)=>s+num(v.valorFipe),0);
  const alertas = veic.filter(v=>(v.proxRevisao && diasEntre(hoje(),v.proxRevisao)<=15) ||
                                 (v.vencSeguro && diasEntre(hoje(),v.vencSeguro)<=30) ||
                                 (v.vencLicenc && diasEntre(hoje(),v.vencLicenc)<=30));

  let h = `<div class="ph"><div class="ic" style="background:#ECEDF9;color:#4B4FA3"><i class="ti ti-car"></i></div>
    <div><h1>Locação de Veículos</h1><p>Frota, contratos, manutenção e documentação</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="veiGerarMes()"><i class="ti ti-calendar-plus"></i>Gerar locações do mês</button>
    <button class="btn pu" onclick="veicForm()"><i class="ti ti-plus"></i>Novo veículo</button></div>`;

  h += `<div class="kg" style="margin-bottom:16px">
    <div class="kc pu"><div class="lb"><i class="ti ti-car"></i>Frota</div><div class="vl">${veic.length}</div>
      <div class="sb">${veic.filter(v=>v.status==='Locado').length} locado(s) · ${veic.filter(v=>v.status==='Disponível').length} disponível(is)</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-currency-real"></i>Valor da frota</div><div class="vl">${moedaK(frota)}</div>
      <div class="sb">soma dos valores FIPE informados</div></div>
    <div class="kc br"><div class="lb"><i class="ti ti-file-text"></i>Locação contratada</div>
      <div class="vl">${moedaK(ativos.reduce((s,c)=>s+num(c.valor),0))}</div>
      <div class="sb">${ativos.length} contrato(s) ativo(s)</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-trending-up"></i>Receita do mês</div><div class="vl">${moedaK(rec)}</div>
      <div class="sb">${dmesL(mk)}</div></div>
    <div class="kc rd"><div class="lb"><i class="ti ti-trending-down"></i>Custo do mês</div><div class="vl">${moedaK(des)}</div>
      <div class="sb">manutenção, combustível, impostos</div></div>
    <div class="kc ${alertas.length?'am':'tl'}"><div class="lb"><i class="ti ti-alert-triangle"></i>Alertas</div>
      <div class="vl">${alertas.length}</div><div class="sb">revisão, seguro ou licenciamento perto de vencer</div></div>
  </div>`;

  if(alertas.length && VEI_TAB==='lista'){
    h += `<div class="al aw"><i class="ti ti-alert-triangle"></i><div><b>Atenção na frota:</b>
      ${alertas.map(v=>{
        const p=[];
        if(v.proxRevisao && diasEntre(hoje(),v.proxRevisao)<=15) p.push('revisão em '+dbr(v.proxRevisao));
        if(v.vencSeguro && diasEntre(hoje(),v.vencSeguro)<=30) p.push('seguro vence '+dbr(v.vencSeguro));
        if(v.vencLicenc && diasEntre(hoje(),v.vencLicenc)<=30) p.push('licenciamento vence '+dbr(v.vencLicenc));
        return `<b>${esc(v.placa)}</b> (${p.join(', ')})`;
      }).join(' · ')}</div></div>`;
  }

  h += `<div class="tabs">
    <button class="tab ${VEI_TAB==='lista'?'on':''}" onclick="veiStab('lista')"><i class="ti ti-car"></i>Frota</button>
    <button class="tab ${VEI_TAB==='ctr'?'on':''}" onclick="veiStab('ctr')"><i class="ti ti-file-text"></i>Contratos</button>
    <button class="tab ${VEI_TAB==='loc'?'on':''}" onclick="veiStab('loc')"><i class="ti ti-cash"></i>Locações do mês</button>
    <button class="tab ${VEI_TAB==='man'?'on':''}" onclick="veiStab('man')"><i class="ti ti-tool"></i>Manutenção</button>
    <button class="tab ${VEI_TAB==='cus'?'on':''}" onclick="veiStab('cus')"><i class="ti ti-chart-bar"></i>Custo por veículo</button>
  </div><div id="vei-body"></div>`;
  root.innerHTML = h;

  if(VEI_TAB==='lista') await veiTabLista(veic,contratos);
  if(VEI_TAB==='ctr')   await veiTabContratos(veic,contratos);
  if(VEI_TAB==='loc')   await veiTabLocacoes();
  if(VEI_TAB==='man')   await manutTab('veiculo','vei-body',veic);
  if(VEI_TAB==='cus')   await veiTabCusto(veic);
}

async function veiTabLista(veic,contratos){
  const body = document.getElementById('vei-body');
  if(!veic.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-car-off"></i>
      <b>Nenhum veículo cadastrado</b>Cadastre carros, caminhonetes, caminhões, tratores ou máquinas.
      Depois registre o contrato de locação e o sistema gera as cobranças automaticamente.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn pu" onclick="veicForm()"><i class="ti ti-plus"></i>Cadastrar veículo</button></div></div></div></div>`;
    return;
  }
  let h = `<div class="mgrid">`;
  veic.forEach(v=>{
    const ct = contratos.find(c=>Number(c.refId)===Number(v.id) && c.status==='Ativo');
    const rec = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&Number(l.refId)===Number(v.id)&&l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
    const des = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&Number(l.refId)===Number(v.id)&&l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
    h += `<div class="ocard" onclick="veicDetalhe(${v.id})">
      <div class="oh"><div class="oi" style="background:#ECEDF9;color:#4B4FA3">
        <i class="ti ti-${v.tipo==='Moto'?'motorbike':v.tipo==='Caminhão'?'truck':v.tipo==='Trator'||v.tipo==='Máquina'?'tractor':'car'}"></i></div>
        <div style="flex:1;min-width:0"><b style="display:block;font-size:13.5px">${esc(v.modelo)}</b>
          <span class="tt mono">${esc(v.placa)} · ${esc(v.ano||'')}</span></div>
        <span class="st ${ST_VEICULO[v.status]||'s-nt'}">${esc(v.status)}</span></div>
      <div class="ob">
        <div class="row"><span>Locatário</span><b>${esc(ct?String(ct.pessoa).slice(0,20):'—')}</b></div>
        <div class="row"><span>Valor da locação</span><b>${ct?moeda(ct.valor):'—'}</b></div>
        <div class="row"><span>Quilometragem</span><b>${v.km?qtd(v.km,0)+' km':'—'}</b></div>
        <div class="row"><span>Próxima revisão</span><b>${dbr(v.proxRevisao)}</b></div>
        <div class="row"><span>Receita acumulada</span><b style="color:var(--green)">${moedaK(rec)}</b></div>
        <div class="row"><span>Custo acumulado</span><b style="color:var(--red)">${moedaK(des)}</b></div>
        <div style="border-top:1px solid var(--bg3);margin-top:6px;padding-top:7px;display:flex;justify-content:space-between">
          <span style="font-size:12px;color:var(--text2);font-weight:700">Resultado</span>
          <b style="color:${rec-des>=0?'var(--green)':'var(--red)'}">${moedaK(rec-des)}</b></div>
      </div></div>`;
  });
  h += `</div>`;
  body.innerHTML = h;
}

async function veicForm(id){
  const v = id ? await dbGet('veiculos',id) : null;
  const b = `<div class="fr4">
      <div class="fg"><label>Placa <span class="rq">*</span></label><input id="ve-placa" value="${esc(v?v.placa:'')}" placeholder="ABC-1D23" style="text-transform:uppercase"></div>
      <div class="fg" style="grid-column:span 2"><label>Marca e modelo <span class="rq">*</span></label>
        <input id="ve-modelo" value="${esc(v?v.modelo:'')}" placeholder="Ex.: Toyota Hilux SRV 4x4"></div>
      <div class="fg"><label>Tipo</label><select id="ve-tipo">${TIPOS_VEICULO.map(t=>`<option ${v&&v.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div></div>
    <div class="fr4">
      <div class="fg"><label>Ano / modelo</label><input id="ve-ano" value="${esc(v?v.ano:'')}" placeholder="2022/2023"></div>
      <div class="fg"><label>Cor</label><input id="ve-cor" value="${esc(v?v.cor:'')}"></div>
      <div class="fg"><label>Combustível</label><select id="ve-comb">${COMBUSTIVEIS.map(c=>`<option ${v&&v.combustivel===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="fg"><label>Situação</label><select id="ve-status">${Object.keys(ST_VEICULO).map(s=>`<option ${v&&v.status===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="fr4">
      <div class="fg"><label>RENAVAM</label><input id="ve-renavam" value="${esc(v?v.renavam:'')}"></div>
      <div class="fg"><label>Chassi</label><input id="ve-chassi" value="${esc(v?v.chassi:'')}"></div>
      <div class="fg"><label>Quilometragem atual</label><input id="ve-km" type="number" value="${v?v.km:''}"></div>
      <div class="fg"><label>Diária sugerida (R$)</label><input id="ve-diaria" type="number" step="0.01" value="${v?v.diaria:''}"></div></div>
    <div class="fr4">
      <div class="fg"><label>Valor de compra (R$)</label><input id="ve-compra" type="number" step="0.01" value="${v?v.valorCompra:''}"></div>
      <div class="fg"><label>Valor FIPE atual (R$)</label><input id="ve-fipe" type="number" step="0.01" value="${v?v.valorFipe:''}"></div>
      <div class="fg"><label>IPVA anual (R$)</label><input id="ve-ipva" type="number" step="0.01" value="${v?v.ipva:''}"></div>
      <div class="fg"><label>Seguro anual (R$)</label><input id="ve-seguro" type="number" step="0.01" value="${v?v.seguro:''}"></div></div>
    <div class="fr3">
      <div class="fg"><label>Próxima revisão</label><input id="ve-rev" type="date" value="${v?v.proxRevisao:''}"></div>
      <div class="fg"><label>Vencimento do seguro</label><input id="ve-vseg" type="date" value="${v?v.vencSeguro:''}"></div>
      <div class="fg"><label>Vencimento do licenciamento</label><input id="ve-vlic" type="date" value="${v?v.vencLicenc:''}"></div></div>
    <div class="fg"><label>Observações</label><textarea id="ve-obs">${esc(v?v.obs:'')}</textarea></div>
    <div id="ve-err"></div>`;
  modal(id?'Editar veículo':'Novo veículo','ti-car',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     ${id?`<button class="btn rd" onclick="veicDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
     <button class="btn pu" onclick="veicSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function veicSave(id){
  const placa = val('ve-placa').toUpperCase(), modelo = val('ve-modelo');
  if(!placa||!modelo){ document.getElementById('ve-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe a placa e o modelo.</div>`; return; }
  const d = {placa, modelo, tipo:val('ve-tipo'), ano:val('ve-ano'), cor:val('ve-cor'),
             combustivel:val('ve-comb'), status:val('ve-status'), renavam:val('ve-renavam'),
             chassi:val('ve-chassi'), km:num(val('ve-km')), diaria:num(val('ve-diaria')),
             valorCompra:num(val('ve-compra')), valorFipe:num(val('ve-fipe')),
             ipva:num(val('ve-ipva')), seguro:num(val('ve-seguro')),
             proxRevisao:val('ve-rev'), vencSeguro:val('ve-vseg'), vencLicenc:val('ve-vlic'), obs:val('ve-obs')};
  if(id){ const old = await dbGet('veiculos',id); await dbPut('veiculos',{...old,...d}); }
  else await dbAdd('veiculos',d);
  closeModal('mk-form'); toast('Veículo salvo.'); veiculosRender();
}
function veicDel(id){
  confirmar('Excluir veículo','O veículo, seus contratos e manutenções serão removidos. Os lançamentos financeiros ficam no histórico.',
    async()=>{
      for(const c of (await dbGetAll('contratos')).filter(x=>x.tipo==='veiculo'&&Number(x.refId)===Number(id))) await dbDel('contratos',c.id);
      for(const m of (await dbGetAll('manutencoes')).filter(x=>x.refTipo==='veiculo'&&Number(x.refId)===Number(id))) await dbDel('manutencoes',m.id);
      await dbDel('veiculos',id); closeModal('mk-form'); toast('Veículo removido.','aw'); veiculosRender();
    });
}
async function veicDetalhe(id){
  const v = await dbGet('veiculos',id);
  const mov = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&Number(l.refId)===Number(id))
                 .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const rec = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const des = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
  const man = (await dbGetAll('manutencoes')).filter(m=>m.refTipo==='veiculo'&&Number(m.refId)===Number(id))
                .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const b = `<div class="kg" style="margin-bottom:14px">
      <div class="kc gn"><div class="lb">Receita acumulada</div><div class="vl">${moedaK(rec)}</div></div>
      <div class="kc rd"><div class="lb">Custo acumulado</div><div class="vl">${moedaK(des)}</div></div>
      <div class="kc br"><div class="lb">Resultado</div><div class="vl">${moedaK(rec-des)}</div></div>
      <div class="kc gd"><div class="lb">Retorno sobre a FIPE</div>
        <div class="vl">${v.valorFipe?pct((rec-des)/num(v.valorFipe)*100):'—'}</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-info-circle"></i>Dados do veículo</div><div class="bd">
      <div class="fr3" style="gap:9px 16px">
        ${[['Placa',v.placa],['Modelo',v.modelo],['Tipo',v.tipo],['Ano',v.ano],['Cor',v.cor],['Combustível',v.combustivel],
           ['RENAVAM',v.renavam],['Chassi',v.chassi],['Quilometragem',v.km?qtd(v.km,0)+' km':'—'],
           ['Valor de compra',v.valorCompra?moeda(v.valorCompra):'—'],['Valor FIPE',v.valorFipe?moeda(v.valorFipe):'—'],
           ['Diária sugerida',v.diaria?moeda(v.diaria):'—'],['IPVA',v.ipva?moeda(v.ipva):'—'],
           ['Seguro',v.seguro?moeda(v.seguro):'—'],['Próxima revisão',dbr(v.proxRevisao)],
           ['Venc. do seguro',dbr(v.vencSeguro)],['Venc. licenciamento',dbr(v.vencLicenc)],['Situação',v.status]]
          .map(([k,x])=>`<div style="font-size:12.5px"><span class="tt" style="display:block">${k}</span><b>${esc(x||'—')}</b></div>`).join('')}
      </div>${v.obs?`<div class="al ai" style="margin-bottom:0"><i class="ti ti-note"></i><div>${esc(v.obs)}</div></div>`:''}</div></div>
    ${man.length?`<div class="card tw"><div class="hd"><i class="ti ti-tool"></i>Histórico de manutenção</div><div class="bd"><table>
      <thead><tr><th>Data</th><th>Serviço</th><th>Oficina</th><th class="r">KM</th><th class="r">Valor</th></tr></thead><tbody>
      ${man.map(m=>`<tr><td class="n">${dbr(m.data)}</td><td>${esc(m.desc)}</td><td class="tt">${esc(m.prestador||'—')}</td>
        <td class="r n">${m.km?qtd(m.km,0):'—'}</td><td class="r n">${moeda(m.valor)}</td></tr>`).join('')}
      </tbody></table></div></div>`:''}
    <div class="card tw"><div class="hd"><i class="ti ti-history"></i>Movimentos financeiros</div><div class="bd"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th></tr></thead><tbody>
      ${mov.slice(0,25).map(l=>`<tr><td class="n">${dbr(l.data)}</td><td>${esc(l.desc)}</td><td class="tt">${esc(l.cat)}</td>
        <td class="r n"><b style="color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${l.tipo==='receita'?'+':'−'} ${moeda(l.valor)}</b></td></tr>`).join('')
        || `<tr><td colspan="4" class="c tt" style="padding:20px">Nenhum movimento</td></tr>`}
      </tbody></table></div></div>`;
  modal(v.modelo+' — '+v.placa,'ti-car',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn pu" onclick="ctrForm(null,'veiculo',${id})"><i class="ti ti-file-plus"></i>Novo contrato</button>
     <button class="btn gh" onclick="manutForm(null,'veiculo')"><i class="ti ti-tool"></i>Manutenção</button>
     <button class="btn" onclick="veicForm(${id})"><i class="ti ti-edit"></i>Editar</button>`,'lg');
}

async function veiTabContratos(veic,contratos){
  const body = document.getElementById('vei-body');
  const mapV = {}; veic.forEach(v=>mapV[v.id]=v);
  let h = `<div class="card"><div class="hd"><i class="ti ti-file-text"></i>Contratos de locação<span class="sp"></span>
    <button class="btn sm pu" onclick="ctrForm(null,'veiculo')"><i class="ti ti-plus"></i>Novo contrato</button></div><div class="bd">`;
  if(!contratos.length){
    h += `<div class="empty"><i class="ti ti-file-off"></i><b>Nenhum contrato de locação</b>
      Registre quem está com o veículo, por quanto tempo e por qual valor.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Veículo</th><th>Locatário</th><th class="c">Vigência</th><th class="c">Periodicidade</th>
      <th class="c">Dia venc.</th><th class="r">Valor</th><th class="c">Situação</th><th class="c no-print"></th></tr></thead><tbody>`;
    contratos.sort((a,b)=>String(b.inicio).localeCompare(String(a.inicio))).forEach(c=>{
      const v = mapV[c.refId]||{};
      const per = PERIODICIDADES.find(p=>num(p[2])===num(c.periodo));
      h += `<tr><td><b>${esc(v.modelo||'—')}</b><br><span class="tt mono">${esc(v.placa||'')}</span></td>
        <td>${esc(c.pessoa)}${c.tel?`<br><span class="tt">${esc(c.tel)}</span>`:''}</td>
        <td class="c n">${dbr(c.inicio)}<br><span class="tt">até ${dbr(c.fim)}</span></td>
        <td class="c tt">${per?per[1]:'Mensal'}</td><td class="c n">${c.diaVenc||'—'}</td>
        <td class="r n"><b>${moeda(c.valor)}</b></td>
        <td class="c"><span class="st ${c.status==='Ativo'?'s-ok':c.status==='Encerrado'?'s-nt':'s-wn'}">${esc(c.status)}</span></td>
        <td class="c no-print nowrap"><button class="ib" onclick="ctrImprimir(${c.id})"><i class="ti ti-printer"></i></button>
          <button class="ib bl" onclick="ctrForm(${c.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="ctrDel(${c.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="5">TOTAL CONTRATADO (ativos)</td>
      <td class="r n">${moeda(contratos.filter(c=>c.status==='Ativo').reduce((s,c)=>s+num(c.valor),0))}</td>
      <td colspan="2"></td></tr></tfoot></table></div></div>`;
  }
  body.innerHTML = h;
}
async function veiGerarMes(){
  const contratos = (await dbGetAll('contratos')).filter(c=>c.tipo==='veiculo' && c.status==='Ativo');
  if(!contratos.length){ toast('Nenhum contrato de veículo ativo.','aw'); return; }
  const mk = mesAtual();
  const veic = await dbGetAll('veiculos');
  const mapV = {}; veic.forEach(v=>mapV[v.id]=v);
  confirmar('Gerar locações do mês',
    `Serão criadas cobranças de <b>${dmesL(mk)}</b> para <b>${contratos.length} contrato(s)</b>,
     totalizando <b>${moeda(contratos.reduce((s,c)=>s+num(c.valor),0))}</b>.`,
    async()=>{
      await finLoad();
      let n = 0;
      for(const c of contratos){
        if(FIN.some(l=>Number(l.contratoId)===Number(c.id) && String(l.data).slice(0,7)===mk)) continue;
        const v = mapV[c.refId]||{};
        await finAdd({tipo:'receita', un:'veiculos', refTipo:'veiculo', refId:c.refId,
          refNome:`${v.modelo||''} — ${v.placa||''}`, desc:`Locação ${dmes(mk+'-01')} — ${v.placa||''}`,
          valor:num(c.valor), cat:'Locação de veículo', data:mk+'-01',
          venc:`${mk}-${String(clamp(num(c.diaVenc)||10,1,28)).padStart(2,'0')}`,
          status:'Pendente', pessoa:c.pessoa, contratoId:c.id, contaId:CFG.contaPadrao||null,
          auto:true, origem:'Geração mensal de locações'});
        n++;
      }
      toast(n?`${n} cobrança(s) gerada(s).`:'Já estavam lançadas.', n?'ag':'ai');
      veiculosRender();
    });
}
async function veiTabLocacoes(){
  const body = document.getElementById('vei-body');
  const mk = FIN_MES||mesAtual();
  const doMes = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&l.tipo==='receita'&&String(l.data).slice(0,7)===mk)
                   .sort((a,b)=>String(a.venc).localeCompare(String(b.venc)));
  const receb = doMes.filter(l=>l.status==='Pago').reduce((s,l)=>s+num(l.valor),0);
  const aberto = doMes.filter(l=>l.status==='Pendente').reduce((s,l)=>s+num(l.valor),0);
  let h = `<div class="sbar"><div class="fg" style="max-width:230px"><label>Mês</label>
      <input type="month" value="${mk}" onchange="FIN_MES=this.value;veiculosRender()"></div>
    <button class="btn gh sm" onclick="veiGerarMes()"><i class="ti ti-calendar-plus"></i>Gerar do mês</button></div>
   <div class="kg" style="margin-bottom:14px">
     <div class="kc gn"><div class="lb">Recebido</div><div class="vl">${moedaK(receb)}</div></div>
     <div class="kc am"><div class="lb">Em aberto</div><div class="vl">${moedaK(aberto)}</div></div>
     <div class="kc br"><div class="lb">Previsto</div><div class="vl">${moedaK(receb+aberto)}</div></div></div>`;
  if(!doMes.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-cash-off"></i>
      <b>Nada lançado em ${dmesL(mk)}</b>Gere as cobranças dos contratos ativos.</div></div></div>`;
  }else{
    h += `<div class="card tw"><div class="bd"><table>
      <thead><tr><th>Veículo</th><th>Locatário</th><th class="c">Vencimento</th><th class="c">Situação</th>
      <th class="r">Valor</th><th class="c no-print"></th></tr></thead><tbody>
      ${doMes.map(l=>{const st=finStatus(l);return `<tr><td><b>${esc(l.refNome)}</b></td><td>${esc(l.pessoa||'—')}</td>
        <td class="c n">${dbr(l.venc)}</td><td class="c"><span class="st ${st.c}">${st.t}</span></td>
        <td class="r n"><b>${moeda(l.valor)}</b></td>
        <td class="c no-print">${l.status==='Pendente'?`<button class="ib gn" onclick="finBaixar(${l.id})"><i class="ti ti-circle-check"></i></button>`:''}
          <button class="ib bl" onclick="finLancForm(${l.id})"><i class="ti ti-edit"></i></button></td></tr>`;}).join('')}
      </tbody><tfoot><tr><td colspan="4">TOTAL</td><td class="r n">${moeda(receb+aberto)}</td><td class="no-print"></td></tr></tfoot></table></div></div>`;
  }
  body.innerHTML = h;
}
async function veiTabCusto(veic){
  const body = document.getElementById('vei-body');
  if(!veic.length){ body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-chart-bar"></i>Cadastre veículos primeiro.</div></div></div>`; return; }
  const dados = veic.map(v=>{
    const mov = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&Number(l.refId)===Number(v.id));
    const r = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
    const d = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
    return {...v, rec:r, des:d, res:r-d, custoKm: v.km? d/num(v.km) : 0};
  }).sort((a,b)=>b.res-a.res);
  let h = `<div class="al ai"><i class="ti ti-info-circle"></i><div>Cada veículo é um pequeno negócio: compare
    quanto ele traz de receita com quanto consome de manutenção, combustível e impostos.</div></div>
   <div class="card tw"><div class="bd"><table>
     <thead><tr><th>Veículo</th><th class="c">Situação</th><th class="r">Receita</th><th class="r">Custo</th>
     <th class="r">Resultado</th><th class="r">KM</th><th class="r">Custo por km</th><th class="r">Retorno / FIPE</th></tr></thead><tbody>
     ${dados.map(v=>`<tr><td><b>${esc(v.modelo)}</b><br><span class="tt mono">${esc(v.placa)}</span></td>
       <td class="c"><span class="st ${ST_VEICULO[v.status]||'s-nt'}">${esc(v.status)}</span></td>
       <td class="r n" style="color:var(--green)">${moeda(v.rec)}</td>
       <td class="r n" style="color:var(--red)">${moeda(v.des)}</td>
       <td class="r n"><b style="color:${v.res>=0?'var(--green)':'var(--red)'}">${moeda(v.res)}</b></td>
       <td class="r n">${v.km?qtd(v.km,0):'—'}</td>
       <td class="r n">${v.custoKm?moeda(v.custoKm):'—'}</td>
       <td class="r n">${v.valorFipe?pct(v.res/num(v.valorFipe)*100):'—'}</td></tr>`).join('')}
   </tbody><tfoot><tr><td colspan="2">TOTAL DA FROTA</td>
     <td class="r n">${moeda(dados.reduce((s,v)=>s+v.rec,0))}</td>
     <td class="r n">${moeda(dados.reduce((s,v)=>s+v.des,0))}</td>
     <td class="r n">${moeda(dados.reduce((s,v)=>s+v.res,0))}</td><td colspan="3"></td></tr></tfoot></table></div></div>
   <div class="chg">
     <div class="card"><div class="hd"><i class="ti ti-chart-bar"></i>Resultado por veículo</div><div class="bd">
       ${hbarChart(dados.map(v=>({label:v.placa+' — '+v.modelo,val:v.res,color:v.res>=0?'#4B4FA3':'#A8291F'})))}</div></div>
     <div class="card"><div class="hd"><i class="ti ti-gas-station"></i>Custo acumulado por veículo</div><div class="bd">
       ${hbarChart(dados.map(v=>({label:v.placa,val:v.des,color:'#A8291F'})))}</div></div>
   </div>`;
  body.innerHTML = h;
}

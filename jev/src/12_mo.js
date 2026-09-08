/* =========================================================================
   MÓDULO: MÃO DE OBRA — equipe, empreiteiros, apontamento de diárias/horas
   ========================================================================= */
let MO_TAB = 'apt';
let MO_MES = '';

function moStab(t){ MO_TAB = t; moRender(); }

async function moRender(){
  const root = document.getElementById('mo-root');
  const o = await obraAtual();
  if(!o){ root.innerHTML = semObra(); return; }
  if(!MO_MES) MO_MES = hoje().slice(0,7);
  const equipe = await dbGetAll('equipe');
  const apts = (await dbByObra('apontamentos',o.id)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const doMes = apts.filter(a=>String(a.data).slice(0,7)===MO_MES);
  const custoMes = doMes.reduce((s,a)=>s+num(a.valor),0);
  const custoTot = apts.reduce((s,a)=>s+num(a.valor),0);
  const efetivoMes = new Set(doMes.map(a=>a.nome)).size;
  const hhMes = doMes.reduce((s,a)=>s+num(a.quant)*(a.und==='dia'?8:1),0);

  let html = `<div class="ph"><div class="ic"><i class="ti ti-users"></i></div>
    <div><h1>Mão de Obra</h1><p>${esc(o.cod)} — ${esc(o.nome)}</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="printFolha()"><i class="ti ti-printer"></i>Folha do mês</button>
    <button class="btn" onclick="aptForm()"><i class="ti ti-plus"></i>Apontar</button></div>`;

  html += `<div class="kg" style="margin-bottom:14px">
    <div class="kc bl"><div class="lb"><i class="ti ti-users"></i>Efetivo no mês</div><div class="vl">${efetivoMes}</div>
      <div class="sb">${equipe.filter(e=>e.ativo!==false).length} cadastrados no total</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-clock"></i>Homem-hora no mês</div><div class="vl">${qtd(hhMes,0)} h</div>
      <div class="sb">${doMes.length} apontamento(s)</div></div>
    <div class="kc rd"><div class="lb"><i class="ti ti-cash"></i>Custo do mês</div><div class="vl">${moedaK(custoMes)}</div>
      <div class="sb">${dmes(MO_MES+'-01')}</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-sum"></i>Custo acumulado</div><div class="vl">${moedaK(custoTot)}</div>
      <div class="sb">mão de obra desde o início</div></div>
  </div>`;

  html += `<div class="tabs">
    <button class="tab ${MO_TAB==='apt'?'on':''}" onclick="moStab('apt')"><i class="ti ti-clipboard-check"></i>Apontamentos</button>
    <button class="tab ${MO_TAB==='eq'?'on':''}" onclick="moStab('eq')"><i class="ti ti-address-book"></i>Equipe cadastrada</button>
    <button class="tab ${MO_TAB==='an'?'on':''}" onclick="moStab('an')"><i class="ti ti-chart-bar"></i>Análise de custo</button>
  </div><div id="mo-body"></div>`;
  root.innerHTML = html;

  if(MO_TAB==='apt') await moTabApt(o,apts);
  if(MO_TAB==='eq')  await moTabEquipe(equipe);
  if(MO_TAB==='an')  await moTabAnalise(o,apts);
}

async function moTabApt(o,apts){
  const body = document.getElementById('mo-body');
  const meses = [...new Set(apts.map(a=>String(a.data).slice(0,7)))].sort().reverse();
  if(!meses.includes(MO_MES)) meses.unshift(MO_MES);
  const doMes = apts.filter(a=>String(a.data).slice(0,7)===MO_MES);
  let h = `<div class="sbar"><div class="fg" style="max-width:220px"><label>Competência</label>
      <select onchange="MO_MES=this.value;moRender()">${meses.map(m=>`<option ${m===MO_MES?'selected':''} value="${m}">${dmes(m+'-01')}</option>`).join('')}</select></div>
    <button class="btn gh sm" onclick="aptLote()"><i class="ti ti-users-plus"></i>Apontar equipe do dia</button></div>`;
  if(!doMes.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-clipboard-off"></i>
      <b>Nenhum apontamento em ${dmes(MO_MES+'-01')}</b>Registre as diárias e horas trabalhadas por profissional.
      Cada apontamento gera automaticamente o custo de mão de obra da etapa.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="aptForm()"><i class="ti ti-plus"></i>Novo apontamento</button></div></div></div></div>`;
  }else{
    h += `<div class="card tw"><div class="bd"><table>
      <thead><tr><th>Data</th><th>Profissional</th><th>Função</th><th>Vínculo</th><th>Etapa</th>
      <th class="c">Qtd</th><th class="r">V. Unit.</th><th class="r">Total</th><th class="c no-print"></th></tr></thead><tbody>`;
    let ultData = null;
    doMes.forEach(a=>{
      if(a.data!==ultData){ ultData = a.data;
        const dia = doMes.filter(x=>x.data===a.data);
        h += `<tr style="background:var(--bg3)"><td colspan="9" style="font-weight:800;font-size:11.5px">
          <i class="ti ti-calendar"></i> ${dbr(a.data)} — ${dia.length} profissional(is) · ${moeda(dia.reduce((s,x)=>s+num(x.valor),0))}</td></tr>`;
      }
      h += `<tr><td class="n tt">${dbr(a.data)}</td><td><b>${esc(a.nome)}</b></td><td class="tt">${esc(a.funcao||'—')}</td>
        <td><span class="st ${a.vinculo==='Empreiteiro'?'s-pu':a.vinculo==='Diarista'?'s-wn':'s-pd'}">${esc(a.vinculo||'—')}</span></td>
        <td class="tt">${esc(a.etapa||'—')}</td>
        <td class="c n">${qtd(a.quant,a.und==='h'?1:1)} ${esc(a.und)}</td>
        <td class="r n">${moeda(a.vunit)}</td><td class="r n"><b>${moeda(a.valor)}</b></td>
        <td class="c no-print nowrap"><button class="ib bl" onclick="aptForm(${a.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="aptDel(${a.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="7">TOTAL DE ${dmes(MO_MES+'-01').toUpperCase()}</td>
      <td class="r n">${moeda(doMes.reduce((s,a)=>s+num(a.valor),0))}</td><td class="no-print"></td></tr></tfoot></table></div></div>`;
  }
  body.innerHTML = h;
}

async function moTabEquipe(equipe){
  const body = document.getElementById('mo-body');
  let h = `<div class="card"><div class="hd"><i class="ti ti-address-book"></i>Profissionais e empreiteiros<span class="sp"></span>
    <button class="btn sm" onclick="eqForm()"><i class="ti ti-plus"></i>Cadastrar</button></div><div class="bd">`;
  if(!equipe.length){
    h += `<div class="empty"><i class="ti ti-user-off"></i><b>Nenhum profissional cadastrado</b>
      Cadastre pedreiros, serventes, encanadores, eletricistas e empreiteiros com o valor da diária ou hora.
      O cadastro é compartilhado entre todas as obras.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Nome</th><th>Função</th><th>Vínculo</th><th>Telefone</th><th>Chave Pix / conta</th>
      <th class="r">Valor</th><th class="c">Situação</th><th class="c no-print"></th></tr></thead><tbody>`;
    equipe.sort((a,b)=>String(a.nome).localeCompare(String(b.nome))).forEach(e=>{
      h += `<tr><td><b>${esc(e.nome)}</b></td><td>${esc(e.funcao)}</td>
        <td><span class="st ${e.vinculo==='Empreiteiro'?'s-pu':e.vinculo==='Diarista'?'s-wn':'s-pd'}">${esc(e.vinculo)}</span></td>
        <td class="tt">${esc(e.tel||'—')}</td><td class="tt">${esc(e.pix||'—')}</td>
        <td class="r n">${moeda(e.valor)} / ${esc(e.und||'dia')}</td>
        <td class="c"><span class="st ${e.ativo===false?'s-nt':'s-ok'}">${e.ativo===false?'Inativo':'Ativo'}</span></td>
        <td class="c no-print nowrap"><button class="ib bl" onclick="eqForm(${e.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="eqDel(${e.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  }
  body.innerHTML = h;
}

async function moTabAnalise(o,apts){
  const body = document.getElementById('mo-body');
  if(!apts.length){ body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-chart-bar-off"></i><b>Sem dados</b>Registre apontamentos para ver a análise.</div></div></div>`; return; }
  const porFuncao = {}, porEtapa = {}, porMes = {}, porPessoa = {};
  apts.forEach(a=>{
    porFuncao[a.funcao||'—'] = (porFuncao[a.funcao||'—']||0)+num(a.valor);
    porEtapa[a.etapa||'Sem etapa'] = (porEtapa[a.etapa||'Sem etapa']||0)+num(a.valor);
    porMes[String(a.data).slice(0,7)] = (porMes[String(a.data).slice(0,7)]||0)+num(a.valor);
    porPessoa[a.nome] = (porPessoa[a.nome]||0)+num(a.valor);
  });
  const ks = Object.keys(porMes).sort();
  const PAL = ['#15599E','#1F7A44','#B26A0C','#A8291F','#4B3FA3','#0E6E70','#8E44AD','#5A6070'];
  const tot = apts.reduce((s,a)=>s+num(a.valor),0);
  const orc = await dbByObra('orcamento',o.id);
  const orcMO = orc.filter(x=>x.cat==='Mão de obra').reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
  let h = '';
  if(orcMO) h += `<div class="al ${tot>orcMO?'aw':'ag'}"><i class="ti ti-scale"></i><div>
    Mão de obra orçada: <b>${moeda(orcMO)}</b> · realizada até agora: <b>${moeda(tot)}</b>
    (${pct(tot/orcMO*100)} do previsto).</div></div>`;
  h += `<div class="chg">
    <div class="card"><div class="hd"><i class="ti ti-chart-line"></i>Custo mensal de mão de obra</div><div class="bd">
      ${lineChart([{name:'Custo do mês',pts:ks.map(k=>porMes[k]),color:'#A8291F',area:true}],ks.map(k=>dmes(k+'-01')),{money:true,h:210})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>Distribuição por função</div><div class="bd">
      ${donutChart(Object.entries(porFuncao).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,val:v,color:PAL[i%PAL.length]})),{centerLabel:'MÃO DE OBRA',centerVal:moedaK(tot)})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-list-check"></i>Custo por etapa</div><div class="bd">
      ${hbarChart(Object.entries(porEtapa).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,val:v,color:etapaCor(k)})))}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-user-dollar"></i>Custo por profissional</div><div class="bd">
      ${hbarChart(Object.entries(porPessoa).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v],i)=>({label:k,val:v,color:PAL[i%PAL.length]})))}</div></div>
  </div>`;
  body.innerHTML = h;
}

/* ---------------- Cadastro de profissionais ---------------- */
const FUNCOES = ['Pedreiro','Servente','Carpinteiro','Armador','Encanador','Eletricista','Pintor',
                 'Gesseiro','Azulejista','Mestre de obras','Encarregado','Vigia','Operador','Empreiteiro','Outro'];
async function eqForm(id){
  const e = id ? await dbGet('equipe',id) : null;
  const b = `<div class="fr2">
      <div class="fg"><label>Nome <span class="rq">*</span></label><input id="eq-nome" value="${esc(e?e.nome:'')}"></div>
      <div class="fg"><label>Função</label><select id="eq-func">${FUNCOES.map(f=>`<option ${e&&e.funcao===f?'selected':''}>${f}</option>`).join('')}</select></div></div>
    <div class="fr3">
      <div class="fg"><label>Vínculo</label><select id="eq-vinc">
        ${['CLT','Diarista','Empreiteiro','Autônomo'].map(v=>`<option ${e&&e.vinculo===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="fg"><label>Valor</label><input id="eq-valor" type="number" step="0.01" value="${e?e.valor:''}"></div>
      <div class="fg"><label>Unidade</label><select id="eq-und">
        ${['dia','h','mês','vb'].map(u=>`<option ${e&&e.und===u?'selected':''}>${u}</option>`).join('')}</select></div></div>
    <div class="fr3">
      <div class="fg"><label>Telefone</label><input id="eq-tel" value="${esc(e?e.tel:'')}"></div>
      <div class="fg"><label>CPF / CNPJ</label><input id="eq-doc" value="${esc(e?e.doc:'')}"></div>
      <div class="fg"><label>Chave Pix</label><input id="eq-pix" value="${esc(e?e.pix:'')}"></div></div>
    <div class="fg"><label style="display:flex;gap:8px;align-items:center;cursor:pointer">
      <input type="checkbox" id="eq-ativo" ${!e||e.ativo!==false?'checked':''} style="width:16px;height:16px">Profissional ativo</label></div>
    <div class="fg"><label>Observações</label><textarea id="eq-obs">${esc(e?e.obs:'')}</textarea></div>
    <div id="eq-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="eqSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Editar profissional':'Cadastrar profissional','ti-user-plus',b,f);
}
async function eqSave(id){
  const nome = val('eq-nome');
  if(!nome){ document.getElementById('eq-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome.</div>`; return; }
  const d = {nome, funcao:val('eq-func'), vinculo:val('eq-vinc'), valor:num(val('eq-valor')), und:val('eq-und'),
             tel:val('eq-tel'), doc:val('eq-doc'), pix:val('eq-pix'),
             ativo:document.getElementById('eq-ativo').checked, obs:val('eq-obs')};
  if(id){ const old = await dbGet('equipe',id); await dbPut('equipe',{...old,...d}); }
  else await dbAdd('equipe',d);
  closeModal('mk-form'); toast('Profissional salvo.'); moRender();
}
function eqDel(id){
  confirmar('Excluir profissional','Os apontamentos já lançados serão mantidos. Continuar?',
    async()=>{ await dbDel('equipe',id); toast('Removido.','aw'); moRender(); });
}

/* ---------------- Apontamento ---------------- */
async function aptForm(id){
  const o = await obraAtual();
  const a = id ? await dbGet('apontamentos',id) : null;
  const equipe = (await dbGetAll('equipe')).filter(e=>e.ativo!==false).sort((x,y)=>x.nome.localeCompare(y.nome));
  const etapas = (await dbByObra('etapas',o.id)).sort((x,y)=>x.ordem-y.ordem);
  const b = `<div class="fr2">
      <div class="fg"><label>Data <span class="rq">*</span></label><input id="ap-data" type="date" value="${a?a.data:hoje()}"></div>
      <div class="fg"><label>Profissional</label><select id="ap-pes" onchange="aptPreencher(this.value)">
        <option value="">— digitar manualmente —</option>
        ${equipe.map(e=>`<option value="${e.id}" ${a&&a.equipeId==e.id?'selected':''}>${esc(e.nome)} — ${esc(e.funcao)} (${moeda(e.valor)}/${esc(e.und)})</option>`).join('')}
      </select></div></div>
    <div class="fr3">
      <div class="fg"><label>Nome <span class="rq">*</span></label><input id="ap-nome" value="${esc(a?a.nome:'')}"></div>
      <div class="fg"><label>Função</label><select id="ap-func">${FUNCOES.map(f=>`<option ${a&&a.funcao===f?'selected':''}>${f}</option>`).join('')}</select></div>
      <div class="fg"><label>Vínculo</label><select id="ap-vinc">${['CLT','Diarista','Empreiteiro','Autônomo'].map(v=>`<option ${a&&a.vinculo===v?'selected':''}>${v}</option>`).join('')}</select></div></div>
    <div class="fr4">
      <div class="fg"><label>Quantidade <span class="rq">*</span></label><input id="ap-qtd" type="number" step="0.5" value="${a?a.quant:1}" oninput="aptTotal()"></div>
      <div class="fg"><label>Unidade</label><select id="ap-und" onchange="aptTotal()">${['dia','h','mês','vb'].map(u=>`<option ${a&&a.und===u?'selected':''}>${u}</option>`).join('')}</select></div>
      <div class="fg"><label>Valor unitário</label><input id="ap-vu" type="number" step="0.01" value="${a?a.vunit:''}" oninput="aptTotal()"></div>
      <div class="fg"><label>Total</label><input id="ap-tot" readonly value="${a?moeda(a.valor):'R$ 0,00'}"></div></div>
    <div class="fr2">
      <div class="fg"><label>Etapa executada</label><select id="ap-etapa"><option value="">— não vinculada —</option>
        ${etapas.map(e=>`<option ${a&&a.etapa===e.nome?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></div>
      <div class="fg"><label>Serviço executado</label><input id="ap-srv" value="${esc(a?a.servico:'')}" placeholder="Ex.: assentamento de blocos — pav. térreo"></div></div>
    <div id="ap-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="aptSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Editar apontamento':'Novo apontamento','ti-clipboard-check',b,f);
}
async function aptPreencher(eid){
  if(!eid) return;
  const e = await dbGet('equipe',eid);
  if(!e) return;
  setVal('ap-nome',e.nome); setVal('ap-vu',e.valor);
  const sf = document.getElementById('ap-func'); if(sf) sf.value = e.funcao;
  const sv = document.getElementById('ap-vinc'); if(sv) sv.value = e.vinculo;
  const su = document.getElementById('ap-und'); if(su) su.value = e.und||'dia';
  aptTotal();
}
function aptTotal(){ setVal('ap-tot', moeda(num(val('ap-qtd'))*num(val('ap-vu')))); }
async function aptSave(id){
  const o = await obraAtual();
  const nome = val('ap-nome'), q = num(val('ap-qtd')), vu = num(val('ap-vu'));
  if(!nome||q<=0){ document.getElementById('ap-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o profissional e a quantidade.</div>`; return; }
  const d = {obraId:o.id, data:val('ap-data'), equipeId:val('ap-pes')||null, nome, funcao:val('ap-func'),
             vinculo:val('ap-vinc'), quant:q, und:val('ap-und'), vunit:vu, valor:q*vu,
             etapa:val('ap-etapa'), servico:val('ap-srv')};
  if(id){
    const old = await dbGet('apontamentos',id);
    await dbPut('apontamentos',{...old,...d});
    const lan = FIN.find(l=>Number(l.aptId)===Number(id));
    if(lan) await dbPut('financeiro',{...lan, data:d.data, venc:d.data, dtPag:d.data, valor:d.valor,
      etapa:d.etapa, desc:`Mão de obra — ${d.nome} (${qtd(d.quant,1)} ${d.und})`});
    await finLoad();
  }else{
    const aptId = await dbAdd('apontamentos',d);
    await finAdd({tipo:'despesa', un:'obras', refTipo:'obra', refId:o.id, refNome:o.cod+' — '+o.nome,
      data:d.data, venc:d.data, dtPag:d.data, status:'Pago',
      desc:`Mão de obra — ${d.nome} (${qtd(d.quant,1)} ${d.und})`, etapa:d.etapa,
      cat:'Mão de obra e empreiteiros', valor:d.valor, pessoa:d.nome,
      contaId:CFG.contaPadrao||null, auto:true, aptId, origem:'Apontamento de mão de obra'});
  }
  closeModal('mk-form'); toast('Apontamento salvo e custo lançado.'); moRender();
}
function aptDel(id){
  confirmar('Excluir apontamento','O custo correspondente também será removido do realizado da obra.',async()=>{
    const a = await dbGet('apontamentos',id);
    const lan = FIN.find(l=>Number(l.aptId)===Number(id));
    if(lan) await dbDel('financeiro',lan.id);
    await finLoad();
    await dbDel('apontamentos',id);
    toast('Apontamento removido.','aw'); moRender();
  });
}

/* ---------------- Apontamento em lote (equipe do dia) ---------------- */
async function aptLote(){
  const o = await obraAtual();
  const equipe = (await dbGetAll('equipe')).filter(e=>e.ativo!==false).sort((a,b)=>a.nome.localeCompare(b.nome));
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  if(!equipe.length){ toast('Cadastre a equipe antes de apontar em lote.','aw'); moStab('eq'); return; }
  const b = `<div class="fr2">
      <div class="fg"><label>Data</label><input id="al-data" type="date" value="${hoje()}"></div>
      <div class="fg"><label>Etapa executada</label><select id="al-etapa"><option value="">— não vinculada —</option>
        ${etapas.map(e=>`<option>${esc(e.nome)}</option>`).join('')}</select></div></div>
    <div class="al ai"><i class="ti ti-info-circle"></i>Marque quem trabalhou e ajuste a quantidade. Um clique registra todos.</div>
    <div class="card tw"><div class="bd"><table><thead><tr><th class="c" style="width:40px"></th><th>Profissional</th>
      <th>Função</th><th class="r" style="width:92px">Qtd</th><th class="c">Und</th><th class="r">V. Unit.</th></tr></thead><tbody>
      ${equipe.map(e=>`<tr><td class="c"><input type="checkbox" id="al-c-${e.id}" style="width:17px;height:17px"></td>
        <td><b>${esc(e.nome)}</b></td><td class="tt">${esc(e.funcao)}</td>
        <td><input type="number" step="0.5" id="al-q-${e.id}" value="1" style="width:84px;text-align:right;padding:4px 6px;border:1px solid var(--border2);border-radius:5px"></td>
        <td class="c">${esc(e.und||'dia')}</td><td class="r n">${moeda(e.valor)}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="fg"><label>Serviço executado</label><input id="al-srv" placeholder="Ex.: concretagem da laje do pavimento térreo"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="aptLoteSave()"><i class="ti ti-check"></i>Registrar equipe</button>`;
  modal('Apontar equipe do dia','ti-users-plus',b,f,'lg');
}
async function aptLoteSave(){
  const o = await obraAtual();
  const equipe = (await dbGetAll('equipe')).filter(e=>e.ativo!==false);
  const data = val('al-data'), etapa = val('al-etapa'), srv = val('al-srv');
  let n = 0;
  for(const e of equipe){
    const c = document.getElementById('al-c-'+e.id);
    if(!c || !c.checked) continue;
    const q = num(document.getElementById('al-q-'+e.id).value);
    if(q<=0) continue;
    const d = {obraId:o.id, data, equipeId:e.id, nome:e.nome, funcao:e.funcao, vinculo:e.vinculo,
               quant:q, und:e.und||'dia', vunit:num(e.valor), valor:q*num(e.valor), etapa, servico:srv};
    const aptId = await dbAdd('apontamentos',d);
    await finAdd({tipo:'despesa', un:'obras', refTipo:'obra', refId:o.id, refNome:o.cod+' — '+o.nome,
      data, venc:data, dtPag:data, status:'Pago',
      desc:`Mão de obra — ${e.nome} (${qtd(q,1)} ${e.und||'dia'})`, etapa,
      cat:'Mão de obra e empreiteiros', valor:d.valor, pessoa:e.nome,
      contaId:CFG.contaPadrao||null, auto:true, aptId, origem:'Apontamento em lote'});
    n++;
  }
  closeModal('mk-form');
  toast(n? `${n} apontamento(s) registrados.` : 'Nenhum profissional marcado.', n?'ag':'aw');
  moRender();
}

/* ---------------- Impressão da folha ---------------- */
async function printFolha(){
  const o = await obraAtual();
  const apts = (await dbByObra('apontamentos',o.id)).filter(a=>String(a.data).slice(0,7)===MO_MES);
  const porPessoa = {};
  apts.forEach(a=>{
    if(!porPessoa[a.nome]) porPessoa[a.nome] = {nome:a.nome,funcao:a.funcao,vinculo:a.vinculo,und:a.und,qtd:0,valor:0};
    porPessoa[a.nome].qtd += num(a.quant); porPessoa[a.nome].valor += num(a.valor);
  });
  const lista = Object.values(porPessoa).sort((a,b)=>b.valor-a.valor);
  const tot = lista.reduce((s,x)=>s+x.valor,0);
  let h = prnHead('Folha de Mão de Obra','Competência '+dmes(MO_MES+'-01'));
  h += prnObraInfo(o);
  h += `<div class="pkg">
    <div class="pkc"><div class="l">Profissionais</div><div class="v">${lista.length}</div></div>
    <div class="pkc"><div class="l">Apontamentos</div><div class="v">${apts.length}</div></div>
    <div class="pkc"><div class="l">Competência</div><div class="v" style="font-size:11px">${dmes(MO_MES+'-01')}</div></div>
    <div class="pkc"><div class="l">Total a pagar</div><div class="v">${moedaK(tot)}</div></div></div>`;
  h += `<div class="psec">Resumo por profissional</div><table>
    <thead><tr><th>Profissional</th><th>Função</th><th>Vínculo</th><th>Qtd</th><th>Und</th><th>Total</th><th style="width:130px">Assinatura</th></tr></thead><tbody>`;
  lista.forEach(p=>{ h += `<tr><td>${esc(p.nome)}</td><td>${esc(p.funcao)}</td><td>${esc(p.vinculo)}</td>
    <td style="text-align:right">${qtd(p.qtd,1)}</td><td>${esc(p.und)}</td>
    <td style="text-align:right">${moeda(p.valor)}</td><td></td></tr>`; });
  h += `</tbody><tfoot><tr><td colspan="5">TOTAL</td><td style="text-align:right">${moeda(tot)}</td><td></td></tr></tfoot></table>`;
  h += `<div class="psec">Detalhamento dos apontamentos</div><table>
    <thead><tr><th>Data</th><th>Profissional</th><th>Etapa</th><th>Serviço</th><th>Qtd</th><th>Valor</th></tr></thead><tbody>`;
  apts.sort((a,b)=>String(a.data).localeCompare(String(b.data))).forEach(a=>{
    h += `<tr><td>${dbr(a.data)}</td><td>${esc(a.nome)}</td><td>${esc(a.etapa||'—')}</td><td>${esc(a.servico||'—')}</td>
      <td style="text-align:right">${qtd(a.quant,1)} ${esc(a.und)}</td><td style="text-align:right">${moeda(a.valor)}</td></tr>`;
  });
  h += `</tbody></table>` + prnSig(CFG.respTec||'Responsável Técnico',CFG.crea||'CREA/CAU','Mestre de Obras','Conferência do efetivo') + prnFoot();
  printar(h);
}

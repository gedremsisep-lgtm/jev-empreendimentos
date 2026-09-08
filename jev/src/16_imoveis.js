/* =========================================================================
   NEGÓCIO: LOCAÇÃO DE IMÓVEIS
   ========================================================================= */
let IMO_TAB = 'lista';
function imoStab(t){ IMO_TAB = t; imoveisRender(); }

async function imoveisRender(){
  const root = document.getElementById('imoveis-root');
  await finLoad();
  const imoveis = await dbGetAll('imoveis');
  const contratos = (await dbGetAll('contratos')).filter(c=>c.tipo==='imovel');
  const ativos = contratos.filter(c=>c.status==='Ativo');
  const alugados = imoveis.filter(i=>i.status==='Alugado').length;
  const receitaMes = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&l.tipo==='receita'&&String(l.data).slice(0,7)===mesAtual())
                        .reduce((s,l)=>s+num(l.valor),0);
  const despesaMes = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&l.tipo==='despesa'&&String(l.data).slice(0,7)===mesAtual())
                        .reduce((s,l)=>s+num(l.valor),0);
  const inad = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&l.tipo==='receita'&&finAtrasado(l));
  const patrimonio = imoveis.reduce((s,i)=>s+num(i.valorMercado),0);
  const contratado = ativos.reduce((s,c)=>s+num(c.valor),0);

  let h = `<div class="ph"><div class="ic" style="background:#E8F1FB;color:#1F5FA8"><i class="ti ti-home"></i></div>
    <div><h1>Locação de Imóveis</h1><p>Imóveis, contratos, aluguéis e manutenção</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="imoGerarMes()"><i class="ti ti-calendar-plus"></i>Gerar aluguéis do mês</button>
    <button class="btn bl" onclick="imovForm()"><i class="ti ti-plus"></i>Novo imóvel</button></div>`;

  h += `<div class="kg" style="margin-bottom:16px">
    <div class="kc bl"><div class="lb"><i class="ti ti-home"></i>Imóveis</div><div class="vl">${imoveis.length}</div>
      <div class="sb">${alugados} alugado(s) · ${imoveis.filter(i=>i.status==='Vago').length} vago(s)</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-percentage"></i>Ocupação</div>
      <div class="vl">${imoveis.length?pct(alugados/imoveis.length*100):'—'}</div>
      <div class="sb">${ativos.length} contrato(s) ativo(s)</div></div>
    <div class="kc br"><div class="lb"><i class="ti ti-file-text"></i>Aluguel contratado</div><div class="vl">${moedaK(contratado)}</div>
      <div class="sb">por mês, somando os contratos</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-building-estate"></i>Patrimônio</div><div class="vl">${moedaK(patrimonio)}</div>
      <div class="sb">valor de mercado informado</div></div>
    <div class="kc tl"><div class="lb"><i class="ti ti-report-money"></i>Resultado do mês</div><div class="vl">${moedaK(receitaMes-despesaMes)}</div>
      <div class="sb">${moedaK(receitaMes)} recebidos − ${moedaK(despesaMes)} de custo</div></div>
    <div class="kc ${inad.length?'rd':'gn'}"><div class="lb"><i class="ti ti-user-exclamation"></i>Inadimplência</div>
      <div class="vl">${moedaK(inad.reduce((s,l)=>s+num(l.valor),0))}</div>
      <div class="sb">${inad.length} aluguel(éis) em atraso</div></div>
  </div>`;

  h += `<div class="tabs">
    <button class="tab ${IMO_TAB==='lista'?'on':''}" onclick="imoStab('lista')"><i class="ti ti-home"></i>Imóveis</button>
    <button class="tab ${IMO_TAB==='ctr'?'on':''}" onclick="imoStab('ctr')"><i class="ti ti-file-text"></i>Contratos</button>
    <button class="tab ${IMO_TAB==='alu'?'on':''}" onclick="imoStab('alu')"><i class="ti ti-cash"></i>Aluguéis${inad.length?` <span class="st s-bl">${inad.length}</span>`:''}</button>
    <button class="tab ${IMO_TAB==='man'?'on':''}" onclick="imoStab('man')"><i class="ti ti-tool"></i>Manutenção</button>
  </div><div id="imo-body"></div>`;
  root.innerHTML = h;

  if(IMO_TAB==='lista') await imoTabLista(imoveis,contratos);
  if(IMO_TAB==='ctr')   await imoTabContratos(imoveis,contratos);
  if(IMO_TAB==='alu')   await imoTabAlugueis(imoveis,contratos);
  if(IMO_TAB==='man')   await manutTab('imovel','imo-body',imoveis);
}

async function imoTabLista(imoveis,contratos){
  const body = document.getElementById('imo-body');
  if(!imoveis.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-home-off"></i>
      <b>Nenhum imóvel cadastrado</b>Cadastre casas, apartamentos, salas, barracões ou terrenos.
      Depois crie o contrato com o inquilino e o sistema passa a gerar os aluguéis todo mês.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn bl" onclick="imovForm()"><i class="ti ti-plus"></i>Cadastrar imóvel</button></div></div></div></div>`;
    return;
  }
  let h = `<div class="mgrid">`;
  for(const i of imoveis){
    const ct = contratos.find(c=>Number(c.refId)===Number(i.id) && c.status==='Ativo');
    const rec12 = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&Number(l.refId)===Number(i.id)&&l.tipo==='receita')
                     .reduce((s,l)=>s+num(l.valor),0);
    const des12 = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&Number(l.refId)===Number(i.id)&&l.tipo==='despesa')
                     .reduce((s,l)=>s+num(l.valor),0);
    h += `<div class="ocard" onclick="imovDetalhe(${i.id})">
      <div class="oh"><div class="oi" style="background:#E8F1FB;color:#1F5FA8"><i class="ti ti-${i.tipo==='Terreno'?'map-pin':i.tipo==='Galpão'?'building-warehouse':i.tipo==='Sala comercial'||i.tipo==='Loja'?'building-store':'home'}"></i></div>
        <div style="flex:1;min-width:0"><b style="display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.nome)}</b>
          <span class="tt">${esc(i.cod||'')} · ${esc(i.tipo)}</span></div>
        <span class="st ${ST_IMOVEL[i.status]||'s-nt'}">${esc(i.status)}</span></div>
      <div class="ob">
        <div class="row"><span>Endereço</span><b style="font-size:11.5px">${esc(String(i.endereco||'—').slice(0,26))}</b></div>
        <div class="row"><span>Inquilino</span><b>${esc(ct?String(ct.pessoa).slice(0,22):'—')}</b></div>
        <div class="row"><span>Aluguel</span><b>${ct?moeda(ct.valor):(i.aluguelBase?moeda(i.aluguelBase)+' (sugerido)':'—')}</b></div>
        <div class="row"><span>Contrato até</span><b>${ct?dbr(ct.fim):'—'}</b></div>
        <div class="row"><span>Recebido acumulado</span><b style="color:var(--green)">${moedaK(rec12)}</b></div>
        <div class="row"><span>Custos acumulados</span><b style="color:var(--red)">${moedaK(des12)}</b></div>
        ${i.valorMercado?`<div class="row" style="border-top:1px solid var(--bg3);margin-top:6px;padding-top:7px">
          <span>Rentabilidade anual</span><b style="color:var(--brand)">${ct?pct(num(ct.valor)*12/num(i.valorMercado)*100):'—'}</b></div>`:''}
      </div></div>`;
  }
  h += `</div>`;
  body.innerHTML = h;
}

async function imovForm(id){
  const i = id ? await dbGet('imoveis',id) : null;
  const todos = await dbGetAll('imoveis');
  const prox = 'IM-'+String(todos.reduce((m,x)=>Math.max(m,parseInt(String(x.cod||'').replace(/\D/g,''))||0),0)+1).padStart(3,'0');
  const b = `<div class="fr3">
      <div class="fg"><label>Código</label><input id="im-cod" value="${esc(i?i.cod:prox)}" readonly></div>
      <div class="fg" style="grid-column:span 2"><label>Identificação <span class="rq">*</span></label>
        <input id="im-nome" value="${esc(i?i.nome:'')}" placeholder="Ex.: Casa 2 — Rua das Flores"></div></div>
    <div class="fr3">
      <div class="fg"><label>Tipo</label><select id="im-tipo">${TIPOS_IMOVEL.map(t=>`<option ${i&&i.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="fg"><label>Situação</label><select id="im-status">${Object.keys(ST_IMOVEL).map(t=>`<option ${i&&i.status===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="fg"><label>Aluguel sugerido (R$)</label><input id="im-alug" type="number" step="0.01" value="${i?i.aluguelBase:''}"></div></div>
    <div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Endereço</label><input id="im-end" value="${esc(i?i.endereco:'')}"></div>
      <div class="fg"><label>Cidade / UF</label><input id="im-cid" value="${esc(i?i.cidade:'')}"></div></div>
    <div class="fr4">
      <div class="fg"><label>Área (m²)</label><input id="im-area" type="number" step="0.01" value="${i?i.area:''}"></div>
      <div class="fg"><label>Quartos</label><input id="im-qtos" type="number" value="${i?i.quartos:''}"></div>
      <div class="fg"><label>Valor de mercado (R$)</label><input id="im-vm" type="number" step="0.01" value="${i?i.valorMercado:''}"></div>
      <div class="fg"><label>IPTU anual (R$)</label><input id="im-iptu" type="number" step="0.01" value="${i?i.iptu:''}"></div></div>
    <div class="fr3">
      <div class="fg"><label>Matrícula do registro</label><input id="im-mat" value="${esc(i?i.matricula:'')}"></div>
      <div class="fg"><label>Inscrição / cadastro na prefeitura</label><input id="im-insc" value="${esc(i?i.inscricao:'')}"></div>
      <div class="fg"><label>Nº da energia / água</label><input id="im-uc" value="${esc(i?i.uc:'')}"></div></div>
    <div class="fg"><label>Observações</label><textarea id="im-obs">${esc(i?i.obs:'')}</textarea></div>
    <div id="im-err"></div>`;
  modal(id?'Editar imóvel':'Novo imóvel','ti-home',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     ${id?`<button class="btn rd" onclick="imovDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
     <button class="btn bl" onclick="imovSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function imovSave(id){
  const nome = val('im-nome');
  if(!nome){ document.getElementById('im-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe a identificação do imóvel.</div>`; return; }
  const d = {cod:val('im-cod'), nome, tipo:val('im-tipo'), status:val('im-status'),
             aluguelBase:num(val('im-alug')), endereco:val('im-end'), cidade:val('im-cid'),
             area:num(val('im-area')), quartos:num(val('im-qtos')), valorMercado:num(val('im-vm')),
             iptu:num(val('im-iptu')), matricula:val('im-mat'), inscricao:val('im-insc'), uc:val('im-uc'), obs:val('im-obs')};
  if(id){ const old = await dbGet('imoveis',id); await dbPut('imoveis',{...old,...d}); }
  else await dbAdd('imoveis',d);
  closeModal('mk-form'); toast('Imóvel salvo.'); imoveisRender();
}
function imovDel(id){
  confirmar('Excluir imóvel','O imóvel, seus contratos e as manutenções serão removidos. Os lançamentos financeiros são mantidos no histórico.',
    async()=>{
      for(const c of (await dbGetAll('contratos')).filter(x=>x.tipo==='imovel'&&Number(x.refId)===Number(id))) await dbDel('contratos',c.id);
      for(const m of (await dbGetAll('manutencoes')).filter(x=>x.refTipo==='imovel'&&Number(x.refId)===Number(id))) await dbDel('manutencoes',m.id);
      await dbDel('imoveis',id); closeModal('mk-form'); toast('Imóvel removido.','aw'); imoveisRender();
    });
}
async function imovDetalhe(id){
  const i = await dbGet('imoveis',id);
  const ct = (await dbGetAll('contratos')).filter(c=>c.tipo==='imovel'&&Number(c.refId)===Number(id));
  const mov = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&Number(l.refId)===Number(id))
                 .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const rec = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const des = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
  const b = `<div class="kg" style="margin-bottom:14px">
      <div class="kc gn"><div class="lb">Recebido</div><div class="vl">${moedaK(rec)}</div></div>
      <div class="kc rd"><div class="lb">Custos</div><div class="vl">${moedaK(des)}</div></div>
      <div class="kc br"><div class="lb">Resultado</div><div class="vl">${moedaK(rec-des)}</div></div>
      <div class="kc gd"><div class="lb">Valor de mercado</div><div class="vl">${moedaK(i.valorMercado)}</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-info-circle"></i>Dados do imóvel</div><div class="bd">
      <div class="fr3" style="gap:9px 16px">
        ${[['Código',i.cod],['Tipo',i.tipo],['Situação',i.status],['Endereço',i.endereco],['Cidade',i.cidade],
           ['Área',i.area?qtd(i.area,2)+' m²':'—'],['Quartos',i.quartos||'—'],['IPTU anual',i.iptu?moeda(i.iptu):'—'],
           ['Matrícula',i.matricula],['Inscrição',i.inscricao],['Unidade consumidora',i.uc],
           ['Aluguel sugerido',i.aluguelBase?moeda(i.aluguelBase):'—']]
          .map(([k,v])=>`<div style="font-size:12.5px"><span class="tt" style="display:block">${k}</span><b>${esc(v||'—')}</b></div>`).join('')}
      </div>${i.obs?`<div class="al ai" style="margin-bottom:0"><i class="ti ti-note"></i><div>${esc(i.obs)}</div></div>`:''}
    </div></div>
    ${ct.length?`<div class="card tw"><div class="hd"><i class="ti ti-file-text"></i>Contratos</div><div class="bd"><table>
      <thead><tr><th>Inquilino</th><th>Vigência</th><th class="r">Valor</th><th class="c">Situação</th></tr></thead><tbody>
      ${ct.map(c=>`<tr><td><b>${esc(c.pessoa)}</b></td><td class="n">${dbr(c.inicio)} a ${dbr(c.fim)}</td>
        <td class="r n">${moeda(c.valor)}</td><td class="c"><span class="st ${c.status==='Ativo'?'s-ok':'s-nt'}">${esc(c.status)}</span></td></tr>`).join('')}
      </tbody></table></div></div>`:''}
    <div class="card tw"><div class="hd"><i class="ti ti-history"></i>Movimentos financeiros</div><div class="bd"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="c">Situação</th><th class="r">Valor</th></tr></thead><tbody>
      ${mov.slice(0,30).map(l=>{const st=finStatus(l);return `<tr><td class="n">${dbr(l.data)}</td><td>${esc(l.desc)}</td>
        <td class="tt">${esc(l.cat)}</td><td class="c"><span class="st ${st.c}">${st.t}</span></td>
        <td class="r n"><b style="color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${l.tipo==='receita'?'+':'−'} ${moeda(l.valor)}</b></td></tr>`;}).join('')
        || `<tr><td colspan="5" class="c tt" style="padding:20px">Nenhum movimento registrado</td></tr>`}
      </tbody></table></div></div>`;
  modal(i.nome,'ti-home',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn bl" onclick="ctrForm(null,'imovel',${id})"><i class="ti ti-file-plus"></i>Novo contrato</button>
     <button class="btn" onclick="imovForm(${id})"><i class="ti ti-edit"></i>Editar</button>`,'lg');
}

/* ---------------- Contratos (imóveis e veículos) ---------------- */
async function imoTabContratos(imoveis,contratos){
  const body = document.getElementById('imo-body');
  const mapI = {}; imoveis.forEach(i=>mapI[i.id]=i);
  let h = `<div class="card"><div class="hd"><i class="ti ti-file-text"></i>Contratos de locação<span class="sp"></span>
    <button class="btn sm bl" onclick="ctrForm(null,'imovel')"><i class="ti ti-plus"></i>Novo contrato</button></div><div class="bd">`;
  if(!contratos.length){
    h += `<div class="empty"><i class="ti ti-file-off"></i><b>Nenhum contrato</b>
      O contrato liga o imóvel ao inquilino e define valor, vigência, dia de vencimento e reajuste.
      A partir dele o sistema gera os aluguéis todo mês.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Imóvel</th><th>Inquilino</th><th class="c">Vigência</th><th class="c">Dia venc.</th>
      <th>Reajuste</th><th class="r">Valor</th><th class="c">Situação</th><th class="c no-print"></th></tr></thead><tbody>`;
    contratos.sort((a,b)=>String(b.inicio).localeCompare(String(a.inicio))).forEach(c=>{
      const im = mapI[c.refId]||{};
      const dias = c.fim?diasEntre(hoje(),c.fim):null;
      h += `<tr><td><b>${esc(im.nome||'—')}</b><br><span class="tt">${esc(im.cod||'')}</span></td>
        <td>${esc(c.pessoa)}${c.tel?`<br><span class="tt">${esc(c.tel)}</span>`:''}</td>
        <td class="c n">${dbr(c.inicio)}<br><span class="tt">até ${dbr(c.fim)}${dias!=null&&dias>=0&&dias<=60?` <b style="color:var(--amber)">(${dias}d)</b>`:''}</span></td>
        <td class="c n">${c.diaVenc||'—'}</td>
        <td class="tt">${esc(c.indice||'—')}${c.indice==='Percentual fixo'?' '+qtd(c.percReajuste,1)+'%':''}<br>
          <span class="tt">${c.proxReajuste?'próximo: '+dmes(c.proxReajuste):''}</span></td>
        <td class="r n"><b>${moeda(c.valor)}</b></td>
        <td class="c"><span class="st ${c.status==='Ativo'?'s-ok':c.status==='Encerrado'?'s-nt':'s-wn'}">${esc(c.status)}</span></td>
        <td class="c no-print nowrap">
          <button class="ib" title="Imprimir" onclick="ctrImprimir(${c.id})"><i class="ti ti-printer"></i></button>
          <button class="ib gn" title="Reajustar" onclick="ctrReajustar(${c.id})"><i class="ti ti-trending-up"></i></button>
          <button class="ib bl" onclick="ctrForm(${c.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="ctrDel(${c.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="5">TOTAL MENSAL CONTRATADO (ativos)</td>
      <td class="r n">${moeda(contratos.filter(c=>c.status==='Ativo').reduce((s,c)=>s+num(c.valor),0))}</td>
      <td colspan="2"></td></tr></tfoot></table></div></div>`;
  }
  body.innerHTML = h;
}

async function ctrForm(id,tipo,refId){
  const c = id ? await dbGet('contratos',id) : null;
  tipo = c?c.tipo:(tipo||'imovel');
  const bens = tipo==='imovel' ? await dbGetAll('imoveis') : await dbGetAll('veiculos');
  const pessoas = await dbGetAll('pessoas');
  const nomeBem = b => tipo==='imovel' ? `${b.cod||''} — ${b.nome}` : `${b.placa} — ${b.modelo}`;
  const b = `<input type="hidden" id="cr-tipo" value="${tipo}">
    <div class="fr3">
      <div class="fg"><label>${tipo==='imovel'?'Imóvel':'Veículo'} <span class="rq">*</span></label><select id="cr-ref">
        ${bens.map(x=>`<option value="${x.id}" ${(c&&Number(c.refId)===Number(x.id))||Number(refId)===Number(x.id)?'selected':''}>${esc(nomeBem(x))}</option>`).join('')}</select></div>
      <div class="fg"><label>${tipo==='imovel'?'Inquilino':'Locatário'} <span class="rq">*</span></label>
        <input id="cr-pessoa" list="cr-pl" value="${esc(c?c.pessoa:'')}">
        <datalist id="cr-pl">${pessoas.map(p=>`<option value="${esc(p.nome)}">`).join('')}</datalist></div>
      <div class="fg"><label>Telefone / contato</label><input id="cr-tel" value="${esc(c?c.tel:'')}"></div></div>
    <div class="fr4">
      <div class="fg"><label>CPF / CNPJ</label><input id="cr-doc" value="${esc(c?c.doc:'')}"></div>
      <div class="fg"><label>Início <span class="rq">*</span></label><input id="cr-ini" type="date" value="${c?c.inicio:hoje()}"></div>
      <div class="fg"><label>Término</label><input id="cr-fim" type="date" value="${c?c.fim:addDias(hoje(),365)}"></div>
      <div class="fg"><label>Situação</label><select id="cr-status">
        ${['Ativo','Encerrado','Suspenso','Em renovação'].map(s=>`<option ${c&&c.status===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="fr4">
      <div class="fg"><label>Valor ${tipo==='imovel'?'do aluguel':'da locação'} (R$) <span class="rq">*</span></label>
        <input id="cr-valor" type="number" step="0.01" value="${c?c.valor:''}"></div>
      <div class="fg"><label>Periodicidade</label><select id="cr-per">
        ${PERIODICIDADES.map(p=>`<option value="${p[2]}" ${c&&num(c.periodo)===num(p[2])?'selected':''}>${p[1]}</option>`).join('')}</select></div>
      <div class="fg"><label>Dia do vencimento</label><input id="cr-dia" type="number" min="1" max="28" value="${c?c.diaVenc:10}"></div>
      <div class="fg"><label>Caução / garantia (R$)</label><input id="cr-cauc" type="number" step="0.01" value="${c?c.caucao:''}"></div></div>
    <div class="fr3">
      <div class="fg"><label>Índice de reajuste</label><select id="cr-indice">
        ${INDICES.map(x=>`<option ${c&&c.indice===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="fg"><label>Percentual fixo (%)</label><input id="cr-perc" type="number" step="0.01" value="${c?c.percReajuste:''}">
        <span class="hint">Usado quando o índice é percentual fixo.</span></div>
      <div class="fg"><label>Próximo reajuste</label><input id="cr-prox" type="month" value="${c&&c.proxReajuste?String(c.proxReajuste).slice(0,7):addMeses(hoje(),12).slice(0,7)}"></div></div>
    <div class="fg"><label>Observações do contrato</label><textarea id="cr-obs" placeholder="Condições combinadas, quem paga IPTU e condomínio, reformas autorizadas...">${esc(c?c.obs:'')}</textarea></div>
    <div id="cr-err"></div>`;
  modal(id?'Editar contrato':'Novo contrato de locação','ti-file-text',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="ctrSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function ctrSave(id){
  const pessoa = val('cr-pessoa'), v = num(val('cr-valor')), ref = val('cr-ref');
  if(!pessoa || v<=0 || !ref){ document.getElementById('cr-err').innerHTML =
    `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o bem, o locatário e o valor.</div>`; return; }
  const tipo = val('cr-tipo');
  const d = {tipo, refId:Number(ref), pessoa, tel:val('cr-tel'), doc:val('cr-doc'),
             inicio:val('cr-ini'), fim:val('cr-fim'), status:val('cr-status'), valor:v,
             periodo:num(val('cr-per'))||1, diaVenc:clamp(num(val('cr-dia'))||10,1,28),
             caucao:num(val('cr-cauc')), indice:val('cr-indice'), percReajuste:num(val('cr-perc')),
             proxReajuste: val('cr-prox')? val('cr-prox')+'-01':'', obs:val('cr-obs')};
  if(id){ const old = await dbGet('contratos',id); await dbPut('contratos',{...old,...d}); }
  else await dbAdd('contratos',d);
  // atualiza a situação do bem
  if(tipo==='imovel'){
    const im = await dbGet('imoveis',d.refId);
    if(im) await dbPut('imoveis',{...im, status: d.status==='Ativo'?'Alugado':'Vago'});
  }else{
    const ve = await dbGet('veiculos',d.refId);
    if(ve) await dbPut('veiculos',{...ve, status: d.status==='Ativo'?'Locado':'Disponível'});
  }
  closeModal('mk-form'); toast('Contrato salvo.');
  go(tipo==='imovel'?'imoveis':'veiculos');
}
function ctrDel(id){
  confirmar('Excluir contrato','Os aluguéis já lançados no financeiro continuam no histórico.',
    async()=>{ const c = await dbGet('contratos',id); await dbDel('contratos',id);
      toast('Contrato removido.','aw'); go(c.tipo==='imovel'?'imoveis':'veiculos'); });
}
async function ctrReajustar(id){
  const c = await dbGet('contratos',id);
  const b = `<div class="al ai"><i class="ti ti-trending-up"></i><div>Contrato de <b>${esc(c.pessoa)}</b>,
      valor atual <b>${moeda(c.valor)}</b>. Informe o percentual acumulado do índice no período.</div></div>
    <div class="fr2">
      <div class="fg"><label>Percentual de reajuste (%)</label>
        <input id="rj-p" type="number" step="0.01" value="${c.percReajuste||4.5}" oninput="ctrReajPrev(${num(c.valor)})"></div>
      <div class="fg"><label>Novo valor</label><input id="rj-novo" readonly value="${moeda(num(c.valor)*1.045)}"></div></div>
    <div class="fr2">
      <div class="fg"><label>Vigente a partir de</label><input id="rj-data" type="month" value="${mesAtual()}"></div>
      <div class="fg"><label>Próximo reajuste</label><input id="rj-prox" type="month" value="${addMeses(hoje(),12).slice(0,7)}"></div></div>`;
  modal('Reajustar contrato','ti-trending-up',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="ctrReajSave(${id})"><i class="ti ti-check"></i>Aplicar reajuste</button>`,'sm');
  ctrReajPrev(num(c.valor));
}
function ctrReajPrev(base){ setVal('rj-novo', moeda(base*(1+num(val('rj-p'))/100))); }
async function ctrReajSave(id){
  const c = await dbGet('contratos',id);
  const p = num(val('rj-p'));
  const novo = num(c.valor)*(1+p/100);
  await dbPut('contratos',{...c, valor:+novo.toFixed(2), percReajuste:p,
    proxReajuste: val('rj-prox')+'-01', ultReajuste: val('rj-data')+'-01',
    historico:[...(c.historico||[]),{data:val('rj-data')+'-01', de:num(c.valor), para:+novo.toFixed(2), perc:p}]});
  closeModal('mk-form');
  toast(`Reajuste aplicado: ${moeda(c.valor)} → ${moeda(novo)}.`);
  go(c.tipo==='imovel'?'imoveis':'veiculos');
}
async function ctrImprimir(id){
  const c = await dbGet('contratos',id);
  const bem = c.tipo==='imovel' ? await dbGet('imoveis',c.refId) : await dbGet('veiculos',c.refId);
  const mov = FIN.filter(l=>finVale(l)&&Number(l.contratoId)===Number(id))
                 .sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  let h = prnHead(c.tipo==='imovel'?'Ficha do Contrato de Locação de Imóvel':'Ficha do Contrato de Locação de Veículo',
                  'Emitida em '+dbr(hoje()));
  h += `<div class="pinf">
    <div><span>${c.tipo==='imovel'?'Imóvel:':'Veículo:'}</span> <b>${esc(c.tipo==='imovel'?(bem?bem.nome:''):(bem?bem.modelo+' — '+bem.placa:''))}</b></div>
    <div><span>${c.tipo==='imovel'?'Inquilino:':'Locatário:'}</span> <b>${esc(c.pessoa)}</b></div>
    <div><span>CPF/CNPJ:</span> <b>${esc(c.doc||'—')}</b></div>
    <div><span>Contato:</span> <b>${esc(c.tel||'—')}</b></div>
    <div><span>Vigência:</span> <b>${dbr(c.inicio)} a ${dbr(c.fim)}</b></div>
    <div><span>Situação:</span> <b>${esc(c.status)}</b></div>
    <div><span>Valor:</span> <b>${moeda(c.valor)}</b></div>
    <div><span>Vencimento:</span> <b>dia ${c.diaVenc}</b></div>
    <div><span>Reajuste:</span> <b>${esc(c.indice||'—')}</b></div>
    ${c.tipo==='imovel'&&bem?`<div><span>Endereço:</span> <b>${esc(bem.endereco||'—')}</b></div>`:''}
    <div><span>Caução:</span> <b>${moeda(c.caucao)}</b></div>
    <div><span>Próximo reajuste:</span> <b>${c.proxReajuste?dmes(c.proxReajuste):'—'}</b></div></div>`;
  if((c.historico||[]).length){
    h += `<div class="psec">Histórico de reajustes</div><table><thead><tr><th>Data</th><th>De</th><th>Para</th><th>%</th></tr></thead><tbody>
      ${c.historico.map(x=>`<tr><td>${dbr(x.data)}</td><td style="text-align:right">${moeda(x.de)}</td>
        <td style="text-align:right">${moeda(x.para)}</td><td style="text-align:right">${qtd(x.perc,2)}%</td></tr>`).join('')}</tbody></table>`;
  }
  if(mov.length){
    h += `<div class="psec">Pagamentos lançados</div><table><thead><tr><th>Competência</th><th>Vencimento</th><th>Pagamento</th><th>Situação</th><th>Valor</th></tr></thead><tbody>
      ${mov.map(l=>`<tr><td>${dmes(l.data)}</td><td>${dbr(l.venc)}</td><td>${dbr(l.dtPag)||'—'}</td>
        <td>${finStatus(l).t}</td><td style="text-align:right">${moeda(l.valor)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="4">TOTAL</td><td style="text-align:right">${moeda(mov.reduce((s,l)=>s+num(l.valor),0))}</td></tr></tfoot></table>`;
  }
  if(c.obs) h += `<div class="psec">Observações</div><div style="font-size:9.5px;padding:6px 3px">${esc(c.obs)}</div>`;
  h += prnSig(CFG.empresa||'Locador','Proprietário', c.pessoa, c.tipo==='imovel'?'Inquilino':'Locatário') + prnFoot();
  printar(h);
}

/* ---------------- Aluguéis do mês ---------------- */
async function imoTabAlugueis(imoveis,contratos){
  const body = document.getElementById('imo-body');
  const mapI = {}; imoveis.forEach(i=>mapI[i.id]=i);
  const lanc = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&l.tipo==='receita')
                  .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const mk = FIN_MES||mesAtual();
  const doMes = lanc.filter(l=>String(l.data).slice(0,7)===mk);
  const recebido = doMes.filter(l=>l.status==='Pago').reduce((s,l)=>s+num(l.valor),0);
  const aberto = doMes.filter(l=>l.status==='Pendente').reduce((s,l)=>s+num(l.valor),0);

  let h = `<div class="sbar"><div class="fg" style="max-width:230px"><label>Mês</label>
      <input type="month" value="${mk}" onchange="FIN_MES=this.value;imoveisRender()"></div>
    <button class="btn gh sm" onclick="imoGerarMes()"><i class="ti ti-calendar-plus"></i>Gerar aluguéis deste mês</button>
    <button class="btn gh sm" onclick="imoRecibo()"><i class="ti ti-receipt"></i>Recibos do mês</button></div>
   <div class="kg" style="margin-bottom:14px">
     <div class="kc gn"><div class="lb"><i class="ti ti-check"></i>Recebido</div><div class="vl">${moedaK(recebido)}</div>
       <div class="sb">${doMes.filter(l=>l.status==='Pago').length} aluguel(éis)</div></div>
     <div class="kc am"><div class="lb"><i class="ti ti-clock"></i>Em aberto</div><div class="vl">${moedaK(aberto)}</div>
       <div class="sb">${doMes.filter(l=>l.status==='Pendente').length} a receber</div></div>
     <div class="kc br"><div class="lb"><i class="ti ti-sum"></i>Previsto no mês</div><div class="vl">${moedaK(recebido+aberto)}</div>
       <div class="sb">${dmesL(mk)}</div></div>
   </div>`;
  if(!doMes.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-cash-off"></i>
      <b>Nenhum aluguel lançado em ${dmesL(mk)}</b>
      Clique em "Gerar aluguéis deste mês" e o sistema cria uma cobrança para cada contrato ativo.</div></div></div>`;
  }else{
    h += `<div class="card tw"><div class="bd"><table>
      <thead><tr><th>Imóvel</th><th>Inquilino</th><th class="c">Vencimento</th><th class="c">Situação</th>
      <th class="r">Valor</th><th class="c no-print"></th></tr></thead><tbody>`;
    doMes.sort((a,b)=>String(a.venc).localeCompare(String(b.venc))).forEach(l=>{
      const st = finStatus(l);
      h += `<tr><td><b>${esc(l.refNome||'—')}</b></td><td>${esc(l.pessoa||'—')}</td>
        <td class="c n">${dbr(l.venc)}</td><td class="c"><span class="st ${st.c}">${st.t}</span></td>
        <td class="r n"><b>${moeda(l.valor)}</b></td>
        <td class="c no-print nowrap">
          ${l.status==='Pendente'?`<button class="ib gn" title="Registrar recebimento" onclick="finBaixar(${l.id})"><i class="ti ti-circle-check"></i></button>`:''}
          <button class="ib" title="Recibo" onclick="imoReciboUm(${l.id})"><i class="ti ti-receipt"></i></button>
          <button class="ib bl" onclick="finLancForm(${l.id})"><i class="ti ti-edit"></i></button></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="4">TOTAL DO MÊS</td><td class="r n">${moeda(recebido+aberto)}</td><td class="no-print"></td></tr></tfoot></table></div></div>`;
  }
  // histórico de recebimento por mês
  const meses = listaMeses(addMeses(mesAtual()+'-01',-11).slice(0,7), mesAtual());
  const serie = meses.map(m=>({label:dmes(m+'-01'),
    a: lanc.filter(l=>String(l.data).slice(0,7)===m && l.status==='Pago').reduce((s,l)=>s+num(l.valor),0),
    b: lanc.filter(l=>String(l.data).slice(0,7)===m && l.status!=='Pago').reduce((s,l)=>s+num(l.valor),0)}));
  h += `<div class="card"><div class="hd"><i class="ti ti-chart-bar"></i>Recebimento nos últimos 12 meses</div><div class="bd">
    ${barChart2(serie,{h:230,nomeA:'Recebido',nomeB:'Em aberto',corA:'#1F7A44',corB:'#B26A0C'})}</div></div>`;
  body.innerHTML = h;
}

async function imoGerarMes(){
  const contratos = (await dbGetAll('contratos')).filter(c=>c.tipo==='imovel' && c.status==='Ativo');
  if(!contratos.length){ toast('Nenhum contrato ativo para gerar aluguéis.','aw'); return; }
  const mk = FIN_MES||mesAtual();
  const imoveis = await dbGetAll('imoveis');
  const mapI = {}; imoveis.forEach(i=>mapI[i.id]=i);
  confirmar('Gerar aluguéis',
    `Serão criadas cobranças de <b>${dmesL(mk)}</b> para os <b>${contratos.length} contratos ativos</b>,
     no valor total de <b>${moeda(contratos.reduce((s,c)=>s+num(c.valor),0))}</b>.
     Contratos que já têm aluguel lançado neste mês são ignorados.`,
    async()=>{
      await finLoad();
      let n = 0;
      for(const c of contratos){
        if(c.inicio && mk < String(c.inicio).slice(0,7)) continue;
        if(c.fim && mk > String(c.fim).slice(0,7)) continue;
        const ja = FIN.some(l=>Number(l.contratoId)===Number(c.id) && String(l.data).slice(0,7)===mk);
        if(ja) continue;
        const im = mapI[c.refId]||{};
        await finAdd({tipo:'receita', un:'imoveis', refTipo:'imovel', refId:c.refId,
          refNome:im.nome||'', desc:`Aluguel ${dmes(mk+'-01')} — ${im.nome||''}`,
          valor:num(c.valor), cat:'Aluguel de imóvel', data:mk+'-01',
          venc:`${mk}-${String(clamp(num(c.diaVenc)||10,1,28)).padStart(2,'0')}`,
          status:'Pendente', pessoa:c.pessoa, contratoId:c.id,
          contaId:CFG.contaPadrao||null, auto:true, origem:'Geração mensal de aluguéis'});
        n++;
      }
      toast(n? `${n} aluguel(éis) gerado(s).` : 'Todos os aluguéis deste mês já estavam lançados.', n?'ag':'ai');
      imoveisRender();
    });
}
async function imoReciboUm(id){
  const l = await dbGet('financeiro',id);
  let h = prnHead('Recibo de Aluguel', dmesL(String(l.data).slice(0,7)));
  h += `<div style="font-size:12px;line-height:2;padding:18px 6px">
    Recebemos de <b>${esc(l.pessoa||'—')}</b> a importância de <b>${moeda(l.valor)}</b>,
    referente ao aluguel do imóvel <b>${esc(l.refNome||'—')}</b>, competência <b>${dmesL(String(l.data).slice(0,7))}</b>,
    com vencimento em <b>${dbr(l.venc)}</b>${l.dtPag?`, pago em <b>${dbr(l.dtPag)}</b>`:''}.
    <br><br>Para clareza, firmamos o presente recibo.</div>`;
  h += prnSig(CFG.empresa||'JeV Empreendimentos','Locador', l.pessoa||'Inquilino','Locatário') + prnFoot();
  printar(h);
}
async function imoRecibo(){
  const mk = FIN_MES||mesAtual();
  const doMes = FIN.filter(l=>finVale(l)&&l.un==='imoveis'&&l.tipo==='receita'&&String(l.data).slice(0,7)===mk)
                   .sort((a,b)=>String(a.venc).localeCompare(String(b.venc)));
  if(!doMes.length){ toast('Não há aluguéis lançados neste mês.','aw'); return; }
  let h = prnHead('Relação de Aluguéis', dmesL(mk));
  h += `<table><thead><tr><th>Imóvel</th><th>Inquilino</th><th>Vencimento</th><th>Situação</th><th>Pagamento</th><th>Valor</th></tr></thead><tbody>`;
  doMes.forEach(l=>{ h += `<tr><td>${esc(l.refNome)}</td><td>${esc(l.pessoa)}</td><td>${dbr(l.venc)}</td>
    <td>${finStatus(l).t}</td><td>${dbr(l.dtPag)||'—'}</td><td style="text-align:right">${moeda(l.valor)}</td></tr>`; });
  h += `</tbody><tfoot><tr><td colspan="5">TOTAL</td><td style="text-align:right">${moeda(doMes.reduce((s,l)=>s+num(l.valor),0))}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}

/* ---------------- Manutenção (imóveis e veículos) ---------------- */
async function manutTab(refTipo,boxId,bens){
  const body = document.getElementById(boxId);
  const lista = (await dbGetAll('manutencoes')).filter(m=>m.refTipo===refTipo)
                  .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const mapB = {}; bens.forEach(b=>mapB[b.id]=b);
  const nomeB = b => refTipo==='imovel' ? (b?b.nome:'—') : (b?`${b.modelo} — ${b.placa}`:'—');
  const total = lista.reduce((s,m)=>s+num(m.valor),0);
  let h = `<div class="card"><div class="hd"><i class="ti ti-tool"></i>
      ${refTipo==='imovel'?'Manutenções e reformas':'Manutenções, revisões e despesas da frota'}<span class="sp"></span>
      <button class="btn sm ${refTipo==='imovel'?'bl':'pu'}" onclick="manutForm(null,'${refTipo}')"><i class="ti ti-plus"></i>Registrar</button></div><div class="bd">`;
  if(!lista.length){
    h += `<div class="empty"><i class="ti ti-tool"></i><b>Nenhum registro</b>
      Anote aqui trocas, consertos, pinturas e revisões. Cada registro vira uma despesa do negócio.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Data</th><th>${refTipo==='imovel'?'Imóvel':'Veículo'}</th><th>Serviço</th><th>Prestador</th>
      ${refTipo==='veiculo'?'<th class="r">KM</th>':''}<th class="c">Situação</th><th class="r">Valor</th><th class="c no-print"></th></tr></thead><tbody>`;
    lista.forEach(m=>{
      h += `<tr><td class="n">${dbr(m.data)}</td><td><b>${esc(nomeB(mapB[m.refId]))}</b></td>
        <td>${esc(m.desc)}${m.obs?`<br><span class="tt">${esc(m.obs)}</span>`:''}</td>
        <td class="tt">${esc(m.prestador||'—')}</td>
        ${refTipo==='veiculo'?`<td class="r n">${m.km?qtd(m.km,0):'—'}</td>`:''}
        <td class="c"><span class="st ${m.status==='Concluída'?'s-ok':m.status==='Agendada'?'s-pd':'s-wn'}">${esc(m.status)}</span></td>
        <td class="r n"><b>${moeda(m.valor)}</b></td>
        <td class="c no-print nowrap"><button class="ib bl" onclick="manutForm(${m.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="manutDel(${m.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="${refTipo==='veiculo'?5:4}">TOTAL GASTO</td>
      <td class="r n" colspan="2">${moeda(total)}</td><td class="no-print"></td></tr></tfoot></table></div></div>`;
  }
  body.innerHTML = h;
}
async function manutForm(id,refTipo){
  const m = id ? await dbGet('manutencoes',id) : null;
  refTipo = m?m.refTipo:refTipo;
  const bens = refTipo==='imovel' ? await dbGetAll('imoveis') : await dbGetAll('veiculos');
  const nomeB = b => refTipo==='imovel' ? `${b.cod||''} — ${b.nome}` : `${b.placa} — ${b.modelo}`;
  const b = `<input type="hidden" id="mn-tipo" value="${refTipo}">
    <div class="fr3">
      <div class="fg"><label>${refTipo==='imovel'?'Imóvel':'Veículo'} <span class="rq">*</span></label>
        <select id="mn-ref">${bens.map(x=>`<option value="${x.id}" ${m&&Number(m.refId)===Number(x.id)?'selected':''}>${esc(nomeB(x))}</option>`).join('')}</select></div>
      <div class="fg"><label>Data</label><input id="mn-data" type="date" value="${m?m.data:hoje()}"></div>
      <div class="fg"><label>Situação</label><select id="mn-status">
        ${['Agendada','Em execução','Concluída'].map(s=>`<option ${m&&m.status===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="fg"><label>Serviço executado <span class="rq">*</span></label>
      <input id="mn-desc" value="${esc(m?m.desc:'')}" placeholder="${refTipo==='imovel'?'Ex.: Pintura interna e troca de torneiras':'Ex.: Revisão de 40.000 km e troca de pneus'}"></div>
    <div class="fr4">
      <div class="fg"><label>Prestador / oficina</label><input id="mn-prest" value="${esc(m?m.prestador:'')}"></div>
      <div class="fg"><label>Valor (R$) <span class="rq">*</span></label><input id="mn-valor" type="number" step="0.01" value="${m?m.valor:''}"></div>
      ${refTipo==='veiculo'?`<div class="fg"><label>Quilometragem</label><input id="mn-km" type="number" value="${m?m.km:''}"></div>
      <div class="fg"><label>Próxima revisão</label><input id="mn-prox" type="date" value="${m?m.prox:''}"></div>`
      :`<div class="fg"><label>Categoria</label><select id="mn-cat">
          ${['Manutenção e reparos','Material de construção','Mão de obra e empreiteiros','IPTU e taxas','Outras despesas']
            .map(c=>`<option ${m&&m.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="fg"><label>Documento</label><input id="mn-doc" value="${esc(m?m.doc:'')}"></div>`}</div>
    <div class="fg"><label>Observações</label><textarea id="mn-obs">${esc(m?m.obs:'')}</textarea></div>
    ${id?'':`<label style="display:flex;gap:9px;align-items:center;font-size:13px;cursor:pointer">
      <input type="checkbox" id="mn-fin" checked style="width:16px;height:16px">
      Lançar como despesa paga no financeiro</label>`}
    <div id="mn-err"></div>`;
  modal(id?'Editar manutenção':'Registrar manutenção','ti-tool',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="manutSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function manutSave(id){
  const desc = val('mn-desc'), v = num(val('mn-valor'));
  if(!desc||v<=0){ document.getElementById('mn-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o serviço e o valor.</div>`; return; }
  const refTipo = val('mn-tipo');
  const d = {refTipo, refId:Number(val('mn-ref')), data:val('mn-data'), status:val('mn-status'),
             desc, prestador:val('mn-prest'), valor:v, obs:val('mn-obs'),
             km:num(val('mn-km')), prox:val('mn-prox'), cat:val('mn-cat'), doc:val('mn-doc')};
  if(id){ const old = await dbGet('manutencoes',id); await dbPut('manutencoes',{...old,...d}); }
  else{
    const mid = await dbAdd('manutencoes',d);
    if(chk('mn-fin')){
      const bem = refTipo==='imovel' ? await dbGet('imoveis',d.refId) : await dbGet('veiculos',d.refId);
      await finAdd({tipo:'despesa', un: refTipo==='imovel'?'imoveis':'veiculos', refTipo, refId:d.refId,
        refNome: refTipo==='imovel'?(bem?bem.nome:''):(bem?bem.modelo+' — '+bem.placa:''),
        desc:`${refTipo==='imovel'?'Manutenção':'Manutenção do veículo'} — ${desc}`, valor:v,
        cat: d.cat || 'Manutenção e reparos', data:d.data, venc:d.data, dtPag:d.data, status:'Pago',
        pessoa:d.prestador, doc:d.doc||'', contaId:CFG.contaPadrao||null, manutId:mid,
        auto:true, origem:'Registro de manutenção'});
    }
    if(refTipo==='veiculo' && d.prox){
      const ve = await dbGet('veiculos',d.refId);
      if(ve) await dbPut('veiculos',{...ve, proxRevisao:d.prox, km: Math.max(num(ve.km),num(d.km))});
    }
  }
  closeModal('mk-form'); toast('Manutenção registrada.');
  go(refTipo==='imovel'?'imoveis':'veiculos');
}
function manutDel(id){
  confirmar('Excluir registro','A despesa lançada no financeiro também será removida.',async()=>{
    await finLoad();
    const l = FIN.find(x=>Number(x.manutId)===Number(id));
    if(l) await dbDel('financeiro',l.id);
    const m = await dbGet('manutencoes',id);
    await dbDel('manutencoes',id); await finLoad();
    toast('Registro removido.','aw');
    go(m.refTipo==='imovel'?'imoveis':'veiculos');
  });
}

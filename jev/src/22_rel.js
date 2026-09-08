/* =========================================================================
   RELATÓRIOS CONSOLIDADOS
   ========================================================================= */
async function relRender(){
  const root = document.getElementById('rel-root');
  await finLoad();
  const obras = await dbGetAll('obras');

  const grupos = [
    ['Financeiro','ti-wallet','var(--brand)',[
      ['Resumo financeiro do mês','Receitas, despesas, resultado por negócio e saldo das contas.','finImprimir()'],
      ['Resultado por unidade de negócio','Os últimos 12 meses de cada negócio, com margem e participação.','relDREdireto()'],
      ['Contas a pagar','Tudo que está em aberto, ordenado por vencimento.',"finImprimirPend('despesa')"],
      ['Contas a receber','Cobranças pendentes e inadimplência.',"finImprimirPend('receita')"],
      ['Fluxo de caixa consolidado','Entradas, saídas e saldo mês a mês no ano.','relFluxo()']
    ]],
    ['Obras','ti-crane','#B4531F',[
      ['Carteira de obras','Contratado, orçado, realizado e avanço de todas as obras.','relCarteiraObras()'],
      ['Ficha técnica da obra','Situação física e financeira da obra selecionada.','printFichaObra(OBRA)'],
      ['Orçamento analítico','Planilha orçamentária completa por etapa.','printOrcamento()'],
      ['Cronograma físico-financeiro','Etapas, prazos, avanço e desvio.','printCronograma()'],
      ['Relatório fotográfico','Fotos do diário de obra em folha institucional.','relFoto()'],
      ['Acompanhamento para o cliente','Documento resumido para enviar ao proprietário.','relCliente()']
    ]],
    ['Locações','ti-home','#1F5FA8',[
      ['Relação de aluguéis do mês','Imóveis, inquilinos, vencimentos e situação.','imoRecibo()'],
      ['Carteira de imóveis','Todos os imóveis, ocupação, aluguel e rentabilidade.','relImoveis()'],
      ['Frota de veículos','Veículos, contratos, custos e resultado por veículo.','relFrota()']
    ]],
    ['Produção e vendas','ti-plant-2','#2E7D32',[
      ['Resultado da produção da chácara','Ciclos, custeio, colheita e margem por cultura.','chaImprimirDireto()'],
      ['Vendas de produtos e infoprodutos','Faturamento, taxas, margem e ranking.','relVendas()'],
      ['Desempenho dos canais de vídeo','Inscritos, views, receita e RPM por canal.','relMidia()']
    ]]
  ];

  let h = `<div class="ph"><div class="ic"><i class="ti ti-file-analytics"></i></div>
    <div><h1>Relatórios</h1><p>Documentos em A4 com o timbre da JeV, prontos para imprimir ou salvar em PDF</p></div></div>`;

  if(!CFG.empresa){
    h += `<div class="al aw"><i class="ti ti-alert-triangle"></i><div>Preencha os dados da empresa em
      <b>Configurações</b> para os relatórios saírem com o timbre correto.
      <button class="btn xs gh" style="margin-left:8px" onclick="go('cfg')">Configurar</button></div></div>`;
  }

  grupos.forEach(([nome,ic,cor,itens])=>{
    h += `<div class="sh"><i class="ti ${ic}" style="color:${cor}"></i>${nome}</div><div class="mgrid">`;
    itens.forEach(([tit,desc,fn])=>{
      const bloq = (nome==='Obras' && tit!=='Carteira de obras' && !obras.length);
      h += `<div class="ocard" ${bloq?'style="opacity:.5;cursor:not-allowed"':`onclick="${fn.replace(/"/g,'&quot;')}"`}>
        <div class="oh"><div class="oi" style="background:${cor}18;color:${cor}"><i class="ti ti-file-text"></i></div>
          <div style="flex:1"><b style="font-size:13.5px">${tit}</b></div>
          <i class="ti ti-printer" style="color:var(--text3);font-size:18px"></i></div>
        <div class="ob"><div style="font-size:12.5px;color:var(--text2);line-height:1.5">${desc}</div></div></div>`;
    });
    h += `</div>`;
  });

  h += `<div class="sh"><i class="ti ti-file-export"></i>Exportar para Excel</div>
    <div class="card"><div class="bd"><div class="brow">
      <button class="btn gh" onclick="finExportar()"><i class="ti ti-file-spreadsheet"></i>Todo o financeiro</button>
      <button class="btn gh" onclick="relObrasCSV()"><i class="ti ti-file-spreadsheet"></i>Carteira de obras</button>
      <button class="btn gh" onclick="orcExportCSV()"><i class="ti ti-file-spreadsheet"></i>Orçamento da obra ativa</button>
      <button class="btn gh" onclick="pesExportar()"><i class="ti ti-file-spreadsheet"></i>Cadastros</button>
      <button class="btn gh" onclick="relVendasCSV()"><i class="ti ti-file-spreadsheet"></i>Vendas</button>
      <button class="btn gn" onclick="exportBackup()"><i class="ti ti-database-export"></i>Backup completo (.json)</button>
    </div><div class="tt" style="margin-top:10px">Arquivos CSV abrem direto no Excel e no Google Planilhas.</div></div></div>`;
  root.innerHTML = h;
}

async function relDREdireto(){ FIN_TAB='dre'; await finLoad(); await finTabDREsilencioso(); finImprimirDRE(); }
async function finTabDREsilencioso(){
  const meses = listaMeses(addMeses(mesAtual()+'-01',-11).slice(0,7), mesAtual());
  const dados = [...UNIDADES.map(u=>u.id),'geral'].map(id=>{
    const u = unInfo(id);
    const ano = FIN.filter(l=>finVale(l)&&l.un===id&&String(l.data).slice(0,7)>=meses[0]);
    const r = somaFin(ano,'receita'), d = somaFin(ano,'despesa');
    return {id, nome:u.nome, curto:u.curto, cor:u.cor, ic:u.ic, receita:r, despesa:d, res:r-d, margem:r?(r-d)/r*100:0};
  }).filter(x=>x.receita||x.despesa);
  window.__DRE = {dados, totR:dados.reduce((s,x)=>s+x.receita,0), totD:dados.reduce((s,x)=>s+x.despesa,0), meses};
}

async function relFluxo(){
  const meses = listaMeses(addMeses(mesAtual()+'-01',-11).slice(0,7), mesAtual());
  const contas = await saldoContas();
  let h = prnHead('Fluxo de Caixa Consolidado',
    `De ${dmesL(meses[0])} a ${dmesL(meses[meses.length-1])}`);
  let acum = 0;
  h += `<table><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Resultado</th><th>Acumulado</th></tr></thead><tbody>`;
  meses.forEach(mk=>{
    const l = finDoMes(mk);
    const r = somaFin(l,'receita'), d = somaFin(l,'despesa');
    acum += r-d;
    h += `<tr><td>${dmesL(mk)}</td><td style="text-align:right">${moeda(r)}</td>
      <td style="text-align:right">${moeda(d)}</td><td style="text-align:right">${moeda(r-d)}</td>
      <td style="text-align:right">${moeda(acum)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td>TOTAL DO PERÍODO</td>
    <td style="text-align:right">${moeda(meses.reduce((s,m)=>s+somaFin(finDoMes(m),'receita'),0))}</td>
    <td style="text-align:right">${moeda(meses.reduce((s,m)=>s+somaFin(finDoMes(m),'despesa'),0))}</td>
    <td style="text-align:right">${moeda(acum)}</td><td></td></tr></tfoot></table>`;
  h += `<div class="psec">Saldo das contas hoje</div><table><thead><tr><th>Conta</th><th>Tipo</th><th>Saldo</th></tr></thead><tbody>
    ${contas.map(c=>`<tr><td>${esc(c.nome)}</td><td>${esc(c.tipo)}</td><td style="text-align:right">${moeda(c.saldo)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="2">SALDO CONSOLIDADO</td>
    <td style="text-align:right">${moeda(contas.reduce((s,c)=>s+c.saldo,0))}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}

async function relCarteiraObras(){
  const obras = await dbGetAll('obras');
  if(!obras.length){ toast('Nenhuma obra cadastrada.','aw'); return; }
  const R = {}; for(const o of obras) R[o.id] = await obraResumo(o.id);
  const totCon = obras.reduce((s,o)=>s+num(o.valorContrato),0);
  const totOrc = obras.reduce((s,o)=>s+R[o.id].orcado,0);
  const totRea = obras.reduce((s,o)=>s+R[o.id].realizado,0);
  let h = prnHead('Carteira de Obras','Posição consolidada em '+dbr(hoje()));
  h += `<div class="pkg"><div class="pkc"><div class="l">Obras</div><div class="v">${obras.length}</div></div>
    <div class="pkc"><div class="l">Contratado</div><div class="v">${moedaK(totCon)}</div></div>
    <div class="pkc"><div class="l">Orçado</div><div class="v">${moedaK(totOrc)}</div></div>
    <div class="pkc"><div class="l">Realizado</div><div class="v">${moedaK(totRea)}</div></div></div>`;
  h += `<table><thead><tr><th>Cód.</th><th>Obra</th><th>Tipo</th><th>Cliente</th><th>Situação</th><th>Área</th>
    <th>Contrato</th><th>Orçado</th><th>Realizado</th><th>Avanço</th><th>Término</th></tr></thead><tbody>`;
  obras.forEach(o=>{ const r = R[o.id];
    h += `<tr><td>${esc(o.cod)}</td><td>${esc(o.nome)}</td><td>${esc(o.tipo)}</td><td>${esc(o.cliente||'—')}</td>
      <td>${esc(o.status)}</td><td style="text-align:right">${qtd(o.area,0)} m²</td>
      <td style="text-align:right">${moeda(o.valorContrato)}</td><td style="text-align:right">${moeda(r.orcado)}</td>
      <td style="text-align:right">${moeda(r.realizado)}</td><td style="text-align:center">${qtd(r.avanco,0)}%</td>
      <td style="text-align:center">${dbr(o.dtPrevFim)}</td></tr>`; });
  h += `</tbody><tfoot><tr><td colspan="6">TOTAL</td><td style="text-align:right">${moeda(totCon)}</td>
    <td style="text-align:right">${moeda(totOrc)}</td><td style="text-align:right">${moeda(totRea)}</td>
    <td colspan="2"></td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}
async function relObrasCSV(){
  const obras = await dbGetAll('obras');
  const linhas = [['Codigo','Obra','Tipo','Situacao','Cliente','Cidade','Area m2','Contrato','Orcado','Realizado','Avanco %','Inicio','Previsao termino']];
  for(const o of obras){
    const r = await obraResumo(o.id);
    linhas.push([o.cod,o.nome,o.tipo,o.status,o.cliente,o.cidade,String(num(o.area)).replace('.',','),
      String(num(o.valorContrato).toFixed(2)).replace('.',','), String(r.orcado.toFixed(2)).replace('.',','),
      String(r.realizado.toFixed(2)).replace('.',','), String(r.avanco.toFixed(1)).replace('.',','),
      dbr(o.dtInicio), dbr(o.dtPrevFim)]);
  }
  exportCSV(linhas,'carteira_obras_jev.csv');
}

async function relImoveis(){
  const imoveis = await dbGetAll('imoveis');
  if(!imoveis.length){ toast('Nenhum imóvel cadastrado.','aw'); return; }
  const contratos = (await dbGetAll('contratos')).filter(c=>c.tipo==='imovel');
  let h = prnHead('Carteira de Imóveis','Posição em '+dbr(hoje()));
  const alug = imoveis.filter(i=>i.status==='Alugado').length;
  const patr = imoveis.reduce((s,i)=>s+num(i.valorMercado),0);
  const mens = contratos.filter(c=>c.status==='Ativo').reduce((s,c)=>s+num(c.valor),0);
  h += `<div class="pkg"><div class="pkc"><div class="l">Imóveis</div><div class="v">${imoveis.length}</div></div>
    <div class="pkc"><div class="l">Ocupação</div><div class="v">${imoveis.length?pct(alug/imoveis.length*100):'—'}</div></div>
    <div class="pkc"><div class="l">Aluguel mensal</div><div class="v">${moedaK(mens)}</div></div>
    <div class="pkc"><div class="l">Patrimônio</div><div class="v">${moedaK(patr)}</div></div></div>`;
  h += `<table><thead><tr><th>Cód.</th><th>Imóvel</th><th>Tipo</th><th>Endereço</th><th>Situação</th>
    <th>Inquilino</th><th>Aluguel</th><th>Valor de mercado</th><th>Rentab. anual</th></tr></thead><tbody>`;
  imoveis.forEach(i=>{
    const c = contratos.find(x=>Number(x.refId)===Number(i.id) && x.status==='Ativo');
    h += `<tr><td>${esc(i.cod||'')}</td><td>${esc(i.nome)}</td><td>${esc(i.tipo)}</td><td>${esc(i.endereco||'—')}</td>
      <td>${esc(i.status)}</td><td>${esc(c?c.pessoa:'—')}</td>
      <td style="text-align:right">${c?moeda(c.valor):'—'}</td>
      <td style="text-align:right">${moeda(i.valorMercado)}</td>
      <td style="text-align:right">${c&&i.valorMercado?pct(num(c.valor)*12/num(i.valorMercado)*100):'—'}</td></tr>`;
  });
  h += `</tbody></table>` + prnSig() + prnFoot();
  printar(h);
}
async function relFrota(){
  const veic = await dbGetAll('veiculos');
  if(!veic.length){ toast('Nenhum veículo cadastrado.','aw'); return; }
  await finLoad();
  let h = prnHead('Relatório da Frota','Posição em '+dbr(hoje()));
  h += `<table><thead><tr><th>Placa</th><th>Modelo</th><th>Tipo</th><th>Ano</th><th>Situação</th><th>KM</th>
    <th>Receita</th><th>Custo</th><th>Resultado</th></tr></thead><tbody>`;
  let tr=0, td2=0;
  veic.forEach(v=>{
    const mov = FIN.filter(l=>finVale(l)&&l.un==='veiculos'&&Number(l.refId)===Number(v.id));
    const r = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
    const d = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
    tr+=r; td2+=d;
    h += `<tr><td>${esc(v.placa)}</td><td>${esc(v.modelo)}</td><td>${esc(v.tipo)}</td><td>${esc(v.ano||'—')}</td>
      <td>${esc(v.status)}</td><td style="text-align:right">${v.km?qtd(v.km,0):'—'}</td>
      <td style="text-align:right">${moeda(r)}</td><td style="text-align:right">${moeda(d)}</td>
      <td style="text-align:right">${moeda(r-d)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan="6">TOTAL</td><td style="text-align:right">${moeda(tr)}</td>
    <td style="text-align:right">${moeda(td2)}</td><td style="text-align:right">${moeda(tr-td2)}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}
async function chaImprimirDireto(){
  const lotes = await dbGetAll('lotes'), ciclos = await dbGetAll('ciclos');
  if(!ciclos.length){ toast('Nenhum ciclo de produção registrado.','aw'); return; }
  await finLoad();
  const mapL = {}; lotes.forEach(l=>mapL[l.id]=l);
  const dados = ciclos.map(c=>{
    const custo = finDoRef('ciclo',c.id,'despesa').reduce((s,x)=>s+num(x.valor),0);
    const rec = finDoRef('ciclo',c.id,'receita').reduce((s,x)=>s+num(x.valor),0);
    return {...c, custo, rec, res:rec-custo};
  });
  window.__CHA = {dados,mapL};
  chaImprimir();
}
async function relVendas(){
  const vendas = await dbGetAll('vendas');
  if(!vendas.length){ toast('Nenhuma venda registrada.','aw'); return; }
  const ativas = vendas.filter(v=>v.status!=='Cancelada');
  let h = prnHead('Vendas de Produtos e Infoprodutos','Posição em '+dbr(hoje()));
  const tot = ativas.reduce((s,v)=>s+num(v.total),0);
  const liq = ativas.reduce((s,v)=>s+num(v.total)-num(v.taxa)-num(v.custo),0);
  h += `<div class="pkg"><div class="pkc"><div class="l">Vendas</div><div class="v">${ativas.length}</div></div>
    <div class="pkc"><div class="l">Faturamento</div><div class="v">${moedaK(tot)}</div></div>
    <div class="pkc"><div class="l">Líquido</div><div class="v">${moedaK(liq)}</div></div>
    <div class="pkc"><div class="l">Margem média</div><div class="v">${tot?pct(liq/tot*100):'—'}</div></div></div>`;
  h += `<table><thead><tr><th>Data</th><th>Produto</th><th>Negócio</th><th>Cliente</th><th>Plataforma</th>
    <th>Qtd</th><th>Bruto</th><th>Taxas e custos</th><th>Líquido</th></tr></thead><tbody>`;
  ativas.sort((a,b)=>String(b.data).localeCompare(String(a.data))).forEach(v=>{
    h += `<tr><td>${dbr(v.data)}</td><td>${esc(v.produto)}</td><td>${esc(unInfo(v.un).curto)}</td>
      <td>${esc(v.cliente||'—')}</td><td>${esc(v.plataforma||'—')}</td>
      <td style="text-align:right">${qtd(v.qtd,0)}</td><td style="text-align:right">${moeda(v.total)}</td>
      <td style="text-align:right">${moeda(num(v.taxa)+num(v.custo))}</td>
      <td style="text-align:right">${moeda(num(v.total)-num(v.taxa)-num(v.custo))}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan="6">TOTAL</td><td style="text-align:right">${moeda(tot)}</td>
    <td style="text-align:right">${moeda(tot-liq)}</td><td style="text-align:right">${moeda(liq)}</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}
async function relVendasCSV(){
  const vendas = await dbGetAll('vendas');
  const linhas = [['Data','Negocio','Produto','Cliente','Plataforma','Qtd','Preco','Desconto','Bruto','Taxa','Custo','Liquido','Situacao']];
  vendas.forEach(v=>linhas.push([dbr(v.data),unInfo(v.un).nome,v.produto,v.cliente,v.plataforma,
    String(num(v.qtd)).replace('.',','), String(num(v.preco).toFixed(2)).replace('.',','),
    String(num(v.desconto).toFixed(2)).replace('.',','), String(num(v.total).toFixed(2)).replace('.',','),
    String(num(v.taxa).toFixed(2)).replace('.',','), String(num(v.custo).toFixed(2)).replace('.',','),
    String((num(v.total)-num(v.taxa)-num(v.custo)).toFixed(2)).replace('.',','), v.status]));
  exportCSV(linhas,'vendas_jev.csv');
}
async function relMidia(){
  const canais = await dbGetAll('canais'), videos = await dbGetAll('videos');
  if(!canais.length){ toast('Nenhum canal cadastrado.','aw'); return; }
  await finLoad();
  let h = prnHead('Desempenho dos Canais de Vídeo','Posição em '+dbr(hoje()));
  h += `<table><thead><tr><th>Canal</th><th>Plataforma</th><th>Inscritos</th><th>Vídeos</th><th>Views</th>
    <th>Receita</th><th>Custo</th><th>Resultado</th><th>RPM</th></tr></thead><tbody>`;
  canais.forEach(c=>{
    const vs = videos.filter(v=>Number(v.canalId)===Number(c.id) && v.status==='Publicado');
    const views = vs.reduce((s,v)=>s+num(v.views),0);
    const rec = finDoRef('canal',c.id,'receita').reduce((s,l)=>s+num(l.valor),0);
    const des = finDoRef('canal',c.id,'despesa').reduce((s,l)=>s+num(l.valor),0);
    h += `<tr><td>${esc(c.nome)}</td><td>${esc(c.plataforma)}</td>
      <td style="text-align:right">${num(c.inscritos).toLocaleString('pt-BR')}</td>
      <td style="text-align:right">${vs.length}</td><td style="text-align:right">${views.toLocaleString('pt-BR')}</td>
      <td style="text-align:right">${moeda(rec)}</td><td style="text-align:right">${moeda(des)}</td>
      <td style="text-align:right">${moeda(rec-des)}</td>
      <td style="text-align:right">${views?moeda(rec/views*1000):'—'}</td></tr>`;
  });
  h += `</tbody></table>`;
  const pub = videos.filter(v=>v.status==='Publicado').sort((a,b)=>num(b.views)-num(a.views)).slice(0,20);
  if(pub.length){
    h += `<div class="psec">Vídeos mais vistos</div><table><thead><tr><th>Título</th><th>Publicação</th>
      <th>Views</th><th>Curtidas</th><th>Receita</th></tr></thead><tbody>
      ${pub.map(v=>`<tr><td>${esc(v.titulo)}</td><td>${dbr(v.dtPub)}</td>
        <td style="text-align:right">${num(v.views).toLocaleString('pt-BR')}</td>
        <td style="text-align:right">${num(v.likes).toLocaleString('pt-BR')}</td>
        <td style="text-align:right">${moeda(v.receita)}</td></tr>`).join('')}</tbody></table>`;
  }
  h += prnSig() + prnFoot();
  printar(h);
}

/* --------- relatórios de obras que continuam no módulo de obras --------- */
async function relFoto(){
  const o = await obraAtual();
  if(!o){ toast('Selecione uma obra.','aw'); return; }
  const regs = (await dbByObra('rdo',o.id)).filter(r=>(r.fotos||[]).length)
    .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  if(!regs.length){ toast('Nenhuma foto registrada no diário desta obra.','aw'); return; }
  const r = await obraResumo(o.id);
  let h = prnHead('Relatório Fotográfico da Obra','Registro visual do andamento — '+dbr(hoje()));
  h += prnObraInfo(o);
  h += `<div class="pkg"><div class="pkc"><div class="l">Avanço físico</div><div class="v">${pct(r.avanco)}</div></div>
    <div class="pkc"><div class="l">Registros com foto</div><div class="v">${regs.length}</div></div>
    <div class="pkc"><div class="l">Total de fotos</div><div class="v">${regs.reduce((s,x)=>s+x.fotos.length,0)}</div></div>
    <div class="pkc"><div class="l">Período</div><div class="v" style="font-size:10px">${dbr(regs[regs.length-1].data)} a ${dbr(regs[0].data)}</div></div></div>`;
  regs.slice(0,12).forEach((reg,ix)=>{
    h += `${ix>0&&ix%2===0?'<div class="pg-break"></div>':''}
      <div class="psec">${dbr(reg.data)} — ${esc((reg.etapas||[]).join(', ')||'serviços do dia')}</div>
      <div style="font-size:9.5px;margin-bottom:5px">${esc(reg.atividades||'')}</div><div class="pfg">`;
    reg.fotos.forEach((f,i)=>{ h += `<div class="pf1"><img src="${f.src}"><div class="cap">Foto ${String.fromCharCode(65+i)} — ${esc(f.leg||dbr(reg.data))}</div></div>`; });
    h += `</div>`;
  });
  h += prnSig() + prnFoot();
  printar(h);
}
async function relCliente(){
  const o = await obraAtual();
  if(!o){ toast('Selecione uma obra.','aw'); return; }
  const r = await obraResumo(o.id);
  const meds = (await dbByObra('medicoes',o.id)).filter(m=>m.status!=='Cancelada');
  const medido = meds.reduce((s,m)=>s+num(m.valor),0);
  const etapas = r.etapas.sort((a,b)=>a.ordem-b.ordem);
  const rdos = (await dbByObra('rdo',o.id)).sort((a,b)=>String(b.data).localeCompare(String(a.data))).slice(0,6);
  let h = prnHead('Relatório de Acompanhamento de Obra','Documento para o contratante — '+dbr(hoje()));
  h += prnObraInfo(o);
  h += `<div class="pkg">
    <div class="pkc"><div class="l">Avanço físico</div><div class="v">${pct(r.avanco)}</div></div>
    <div class="pkc"><div class="l">Previsto para hoje</div><div class="v">${pct(r.plan)}</div></div>
    <div class="pkc"><div class="l">Prazo restante</div><div class="v">${diasEntre(hoje(),o.dtPrevFim)} d</div></div>
    <div class="pkc"><div class="l">Medido acumulado</div><div class="v">${moedaK(medido)}</div></div></div>`;
  h += `<div class="psec">Situação das etapas</div><table><thead><tr><th>Etapa</th><th>Período previsto</th>
    <th>Avanço</th><th>Situação</th></tr></thead><tbody>`;
  etapas.forEach(e=>{ const av = num(e.avanco);
    h += `<tr><td>${esc(e.nome)}</td><td>${dbr(e.dtIni)} a ${dbr(e.dtFim)}</td>
      <td style="text-align:right">${qtd(av,0)}%</td>
      <td>${av>=100?'Concluída':av>0?'Em execução':(e.dtFim<hoje()?'Pendente':'Programada')}</td></tr>`; });
  h += `</tbody></table>`;
  if(meds.length){
    h += `<div class="psec">Medições emitidas</div><table><thead><tr><th>Nº</th><th>Período</th><th>Avanço</th>
      <th>Valor</th><th>Situação</th></tr></thead><tbody>
      ${meds.map(m=>`<tr><td>${String(m.num).padStart(2,'0')}</td><td>${dbr(m.dtIni)} a ${dbr(m.dtFim)}</td>
        <td style="text-align:right">${pct(m.avancoDelta)}</td><td style="text-align:right">${moeda(m.valor)}</td>
        <td>${esc(m.status)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3">TOTAL MEDIDO</td><td style="text-align:right">${moeda(medido)}</td><td></td></tr></tfoot></table>`;
  }
  if(rdos.length){
    h += `<div class="psec">Últimos registros do diário</div><table><thead><tr><th>Data</th><th>Clima</th>
      <th>Efetivo</th><th>Serviços executados</th></tr></thead><tbody>
      ${rdos.map(x=>`<tr><td>${dbr(x.data)}</td><td>${esc(x.climaM)}/${esc(x.climaT)}</td>
        <td style="text-align:center">${num(x.efetivoTotal)}</td><td>${esc(String(x.atividades||'').slice(0,150))}</td></tr>`).join('')}
      </tbody></table>`;
  }
  const fotos = [];
  (await dbByObra('rdo',o.id)).sort((a,b)=>String(b.data).localeCompare(String(a.data)))
    .forEach(x=>(x.fotos||[]).forEach(f=>{ if(fotos.length<4) fotos.push({...f,data:x.data}); }));
  if(fotos.length){
    h += `<div class="psec">Registro fotográfico recente</div><div class="pfg">
      ${fotos.map(f=>`<div class="pf1"><img src="${f.src}"><div class="cap">${dbr(f.data)} — ${esc(f.leg||'')}</div></div>`).join('')}</div>`;
  }
  h += prnSig(CFG.respTec||'Responsável Técnico',CFG.crea||'CREA/CAU', o.cliente||'Contratante','Ciente do andamento') + prnFoot();
  printar(h);
}

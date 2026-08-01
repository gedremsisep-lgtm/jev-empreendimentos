/* =========================================================================
   MÓDULO: ORÇAMENTO E CUSTOS
   Abas: Orçamento (previsto) · Custos realizados · Previsto x Realizado · Curva ABC
   ========================================================================= */
let ORC_TAB = 'orc';
let ORC_FILTRO_ETAPA = '';

function orcStab(t){ ORC_TAB = t; orcRender(); }

async function orcRender(){
  const root = document.getElementById('orc-root');
  const o = await obraAtual();
  if(!o){ root.innerHTML = semObra(); return; }
  const r = await obraResumo(o.id);

  let html = `<div class="ph"><div class="ic"><i class="ti ti-calculator"></i></div>
    <div><h1>Orçamento e Custos</h1><p>${esc(o.cod)} — ${esc(o.nome)} · ${qtd(o.area,2)} m²</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="printOrcamento()"><i class="ti ti-printer"></i>Imprimir</button>
    <button class="btn gh" onclick="orcExportCSV()"><i class="ti ti-file-spreadsheet"></i>CSV</button>
    </div>`;

  html += `<div class="kg" style="margin-bottom:14px">
    <div class="kc gn"><div class="lb"><i class="ti ti-calculator"></i>Orçado</div><div class="vl">${moedaK(r.orcado)}</div>
      <div class="sb">${o.area?moeda(r.orcado/num(o.area))+' / m²':''}</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-cash"></i>Realizado</div><div class="vl">${moedaK(r.realizado)}</div>
      <div class="sb">${r.orcado?pct(r.realizado/r.orcado*100)+' do orçado':'—'}</div></div>
    <div class="kc ${r.saldo<0?'rd':'bl'}"><div class="lb"><i class="ti ti-wallet"></i>Saldo</div><div class="vl">${moedaK(r.saldo)}</div>
      <div class="sb">${r.saldo<0?'orçamento estourado':'disponível'}</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-file-dollar"></i>Contrato</div><div class="vl">${moedaK(o.valorContrato)}</div>
      <div class="sb">margem: ${moedaK(num(o.valorContrato)-r.orcado)}</div></div>
  </div>`;

  html += `<div class="tabs">
    <button class="tab ${ORC_TAB==='orc'?'on':''}" onclick="orcStab('orc')"><i class="ti ti-list-numbers"></i>Orçamento</button>
    <button class="tab ${ORC_TAB==='real'?'on':''}" onclick="orcStab('real')"><i class="ti ti-cash"></i>Custos realizados</button>
    <button class="tab ${ORC_TAB==='comp'?'on':''}" onclick="orcStab('comp')"><i class="ti ti-scale"></i>Previsto x Realizado</button>
    <button class="tab ${ORC_TAB==='abc'?'on':''}" onclick="orcStab('abc')"><i class="ti ti-chart-arrows"></i>Curva ABC</button>
  </div><div id="orc-body"></div>`;
  root.innerHTML = html;

  if(ORC_TAB==='orc')  await orcTabOrcamento(o,r);
  if(ORC_TAB==='real') await orcTabRealizado(o,r);
  if(ORC_TAB==='comp') await orcTabComparativo(o,r);
  if(ORC_TAB==='abc')  await orcTabABC(o,r);
}

/* ---------------- Aba 1: Orçamento previsto ---------------- */
async function orcTabOrcamento(o,r){
  const body = document.getElementById('orc-body');
  const etapasNomes = [...new Set([...r.etapas.map(e=>e.nome), ...r.orc.map(x=>x.etapa)])].filter(Boolean);
  const itens = ORC_FILTRO_ETAPA ? r.orc.filter(x=>x.etapa===ORC_FILTRO_ETAPA) : r.orc;
  const porEtapa = {};
  r.orc.forEach(x=>{ porEtapa[x.etapa] = (porEtapa[x.etapa]||0) + num(x.qtd)*num(x.vunit); });

  let h = `<div class="card"><div class="hd"><i class="ti ti-list-numbers"></i>Itens do orçamento<span class="sp"></span>
      <button class="btn sm gh" onclick="orcRegerar()"><i class="ti ti-wand"></i>Gerar por m²</button>
      <button class="btn sm" onclick="orcItemForm()"><i class="ti ti-plus"></i>Novo item</button></div><div class="bd">
    <div class="sbar">
      <div class="fg"><label>Filtrar por etapa</label><select onchange="ORC_FILTRO_ETAPA=this.value;orcRender()">
        <option value="">Todas as etapas (${r.orc.length} itens)</option>
        ${etapasNomes.map(e=>`<option ${ORC_FILTRO_ETAPA===e?'selected':''} value="${esc(e)}">${esc(e)} — ${moedaK(porEtapa[e]||0)}</option>`).join('')}
      </select></div></div>`;

  if(!r.orc.length){
    h += `<div class="empty"><i class="ti ti-calculator-off"></i><b>Orçamento vazio</b>
      Gere automaticamente a partir da área construída (${qtd(o.area,2)} m²) e depois ajuste item a item,
      ou lance os itens manualmente.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="orcRegerar()"><i class="ti ti-wand"></i>Gerar orçamento por m²</button>
      <button class="btn gh" onclick="orcItemForm()"><i class="ti ti-plus"></i>Lançar item</button></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Cód.</th><th>Descrição</th><th>Etapa</th><th>Categoria</th><th class="c">Und</th>
      <th class="r">Qtd</th><th class="r">V. Unit.</th><th class="r">Total</th><th class="c no-print">Ações</th></tr></thead><tbody>`;
    let ult = null;
    itens.sort((a,b)=>String(a.etapa).localeCompare(String(b.etapa))||String(a.cod).localeCompare(String(b.cod)))
      .forEach(x=>{
        if(x.etapa!==ult && !ORC_FILTRO_ETAPA){
          ult = x.etapa;
          h += `<tr style="background:var(--bg3)"><td colspan="9" style="font-weight:800;font-size:11.5px;color:${etapaCor(x.etapa)}">
            <i class="ti ti-folder"></i> ${esc(x.etapa)} — ${moeda(porEtapa[x.etapa]||0)} (${r.orcado?pct((porEtapa[x.etapa]||0)/r.orcado*100):'0%'})</td></tr>`;
        }
        h += `<tr><td class="mono">${esc(x.cod)}</td><td>${esc(x.desc)}</td>
          <td class="tt">${esc(x.etapa)}</td><td class="tt">${esc(x.cat||'—')}</td><td class="c">${esc(x.und)}</td>
          <td class="r n">${qtd(x.qtd,x.qtd<1?3:2)}</td><td class="r n">${moeda(x.vunit)}</td>
          <td class="r n"><b>${moeda(num(x.qtd)*num(x.vunit))}</b></td>
          <td class="c no-print nowrap"><button class="ib bl" onclick="orcItemForm(${x.id})"><i class="ti ti-edit"></i></button>
            <button class="ib rd" onclick="orcItemDel(${x.id})"><i class="ti ti-trash"></i></button></td></tr>`;
      });
    const subtotal = itens.reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
    h += `</tbody><tfoot><tr><td colspan="7">TOTAL${ORC_FILTRO_ETAPA?' — '+esc(ORC_FILTRO_ETAPA):''}</td>
      <td class="r n">${moeda(subtotal)}</td><td class="no-print"></td></tr></tfoot></table>`;
  }
  h += `</div></div>`;

  // resumo por etapa
  if(r.orc.length){
    const dados = Object.entries(porEtapa).sort((a,b)=>b[1]-a[1])
      .map(([k,v])=>({label:k,val:v,color:etapaCor(k)}));
    h += `<div class="chg">
      <div class="card"><div class="hd"><i class="ti ti-chart-bar"></i>Custo orçado por etapa</div><div class="bd">${hbarChart(dados)}</div></div>
      <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>Composição por categoria</div><div class="bd">${
        (()=>{ const c={}; r.orc.forEach(x=>{c[x.cat||'Outros']=(c[x.cat||'Outros']||0)+num(x.qtd)*num(x.vunit)});
          const PAL=['#15599E','#1F7A44','#B26A0C','#A8291F','#4B3FA3','#0E6E70','#8E44AD','#5A6070','#C0392B','#2E9E5B','#7A3E12','#8B93A3','#D9861A','#2A3549'];
          return donutChart(Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,val:v,color:PAL[i%PAL.length]})),{centerLabel:'ORÇADO',centerVal:moedaK(r.orcado)}); })()
      }</div></div></div>`;
  }
  body.innerHTML = h;
}

async function orcRegerar(){
  const o = await obraAtual();
  const atuais = await dbByObra('orcamento',o.id);
  const msg = atuais.length
    ? `Já existem <b>${atuais.length} itens</b> no orçamento desta obra. A geração automática vai <b>substituir</b> todos os itens de origem "Composição padrão" e manter os lançados manualmente. Continuar?`
    : `Será gerado um orçamento estimado aplicando as composições padrão sobre <b>${qtd(o.area,2)} m²</b> de área construída.<br><br>
       <span style="color:var(--red)"><b>Atenção:</b></span> é uma estimativa de partida com preços de referência do sistema. Revise quantidades e preços antes de apresentar ao cliente.`;
  confirmar('Gerar orçamento por m²',msg,async()=>{
    for(const it of atuais) if(it.origem==='Composição padrão') await dbDel('orcamento',it.id);
    await gerarOrcamento(o.id,num(o.area));
    toast('Orçamento estimado gerado.');
    orcRender();
  });
}

async function orcItemForm(id){
  const o = await obraAtual();
  const it = id ? await dbGet('orcamento',id) : null;
  const insumos = (await dbGetAll('insumos')).sort((a,b)=>a.desc.localeCompare(b.desc));
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  const b = `
   <div class="fg"><label>Insumo do catálogo</label>
     <select id="oi-ins" onchange="orcItemPreencher(this.value)">
       <option value="">— digitar manualmente —</option>
       ${insumos.map(i=>`<option value="${i.cod}" ${it&&it.cod===i.cod?'selected':''}>${esc(i.cod)} · ${esc(i.desc)} (${esc(i.und)}) — ${moeda(i.custo)}</option>`).join('')}
     </select><span class="hint">Selecionar preenche descrição, unidade, categoria e preço de referência.</span></div>
   <div class="fr3">
     <div class="fg"><label>Código</label><input id="oi-cod" value="${esc(it?it.cod:'')}"></div>
     <div class="fg" style="grid-column:span 2"><label>Descrição <span class="rq">*</span></label><input id="oi-desc" value="${esc(it?it.desc:'')}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Etapa <span class="rq">*</span></label><select id="oi-etapa">
       ${etapas.map(e=>`<option ${it&&it.etapa===e.nome?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></div>
     <div class="fg"><label>Categoria</label><select id="oi-cat">
       ${CATS.map(c=>`<option ${it&&it.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
     <div class="fg"><label>Unidade</label><input id="oi-und" value="${esc(it?it.und:'un')}"></div>
   </div>
   <div class="fr3">
     <div class="fg"><label>Quantidade <span class="rq">*</span></label><input id="oi-qtd" type="number" step="0.0001" value="${it?it.qtd:''}" oninput="orcItemTotal()"></div>
     <div class="fg"><label>Valor unitário (R$) <span class="rq">*</span></label><input id="oi-vu" type="number" step="0.01" value="${it?it.vunit:''}" oninput="orcItemTotal()"></div>
     <div class="fg"><label>Total</label><input id="oi-tot" readonly value="${it?moeda(num(it.qtd)*num(it.vunit)):'R$ 0,00'}"></div>
   </div>
   <div id="oi-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="orcItemSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Editar item do orçamento':'Novo item do orçamento','ti-list-numbers',b,f);
}
async function orcItemPreencher(cod){
  if(!cod) return;
  const ins = (await dbGetAll('insumos')).find(i=>i.cod===cod);
  if(!ins) return;
  setVal('oi-cod',ins.cod); setVal('oi-desc',ins.desc); setVal('oi-und',ins.und); setVal('oi-vu',ins.custo);
  const s = document.getElementById('oi-cat'); if(s) s.value = ins.cat;
  orcItemTotal();
}
function orcItemTotal(){ setVal('oi-tot', moeda(num(val('oi-qtd'))*num(val('oi-vu')))); }

async function orcItemSave(id){
  const o = await obraAtual();
  const desc = val('oi-desc'), q = num(val('oi-qtd')), vu = num(val('oi-vu'));
  if(!desc || q<=0){ document.getElementById('oi-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe a descrição e uma quantidade maior que zero.</div>`; return; }
  const dados = {obraId:o.id, cod:val('oi-cod')||'—', desc, etapa:val('oi-etapa'), cat:val('oi-cat'),
                 und:val('oi-und')||'un', qtd:q, vunit:vu, origem:'Manual'};
  if(id){ const old = await dbGet('orcamento',id); await dbPut('orcamento',{...old,...dados}); }
  else await dbAdd('orcamento',dados);
  closeModal('mk-form'); toast('Item salvo.'); orcRender();
}
function orcItemDel(id){
  confirmar('Excluir item','Remover este item do orçamento?',async()=>{ await dbDel('orcamento',id); toast('Item removido.','aw'); orcRender(); });
}

/* ---------------- Aba 2: Custos realizados ---------------- */
async function orcTabRealizado(o,r){
  const body = document.getElementById('orc-body');
  const lanc = r.lanc.sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  let h = `<div class="card"><div class="hd"><i class="ti ti-cash"></i>Lançamentos de custo<span class="sp"></span>
    <button class="btn sm" onclick="lancForm()"><i class="ti ti-plus"></i>Lançar custo</button></div><div class="bd">`;
  if(!lanc.length){
    h += `<div class="empty"><i class="ti ti-receipt-off"></i><b>Nenhum custo lançado</b>
      Registre aqui notas fiscais de material, pagamento de empreiteiros, diárias, locações e taxas.
      Compras marcadas como "Entregue" e apontamentos de mão de obra também geram lançamentos automáticos.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Etapa</th><th>Categoria</th><th>Fornecedor</th><th>Documento</th>
      <th class="r">Valor</th><th class="c no-print">Ações</th></tr></thead><tbody>`;
    lanc.forEach(l=>{
      h += `<tr><td class="n">${dbr(l.data)}</td><td><b>${esc(l.desc)}</b>${l.origem?`<br><span class="tt">${esc(l.origem)}</span>`:''}</td>
        <td class="tt">${esc(l.etapa||'—')}</td><td><span class="st s-nt">${esc(l.cat||'—')}</span></td>
        <td class="tt">${esc(l.pessoa||'—')}</td><td class="mono">${esc(l.doc||'—')}</td>
        <td class="r n"><b>${moeda(l.valor)}</b></td>
        <td class="c no-print nowrap">${l.auto?'<span class="tt">auto</span>':
          `<button class="ib bl" onclick="lancForm(${l.id})"><i class="ti ti-edit"></i></button>
           <button class="ib rd" onclick="finDel(${l.id})"><i class="ti ti-trash"></i></button>`}</td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="6">TOTAL REALIZADO</td><td class="r n">${moeda(r.realizado)}</td><td class="no-print"></td></tr></tfoot></table></div></div>`;
    // evolução mensal
    const meses = {};
    lanc.forEach(l=>{ const k=String(l.data).slice(0,7); meses[k]=(meses[k]||0)+num(l.valor); });
    const ks = Object.keys(meses).sort();
    let acc=0; const cum = ks.map(k=>{acc+=meses[k];return acc;});
    h += `<div class="chg">
      <div class="card"><div class="hd"><i class="ti ti-chart-line"></i>Desembolso mensal e acumulado</div><div class="bd">
        ${lineChart([{name:'Acumulado',pts:cum,color:'#15599E',area:true},{name:'No mês',pts:ks.map(k=>meses[k]),color:'#B26A0C'}],
                    ks.map(k=>dmes(k+'-01')),{money:true,h:220})}</div></div>
      <div class="card"><div class="hd"><i class="ti ti-chart-donut"></i>Realizado por etapa</div><div class="bd">${
        (()=>{const c={};lanc.forEach(l=>{c[l.etapa||'Sem etapa']=(c[l.etapa||'Sem etapa']||0)+num(l.valor)});
          return hbarChart(Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,val:v,color:etapaCor(k)})));})()
      }</div></div></div>`;
  }
  body.innerHTML = h;
}

async function lancForm(id){
  const o = await obraAtual();
  if(id) return finLancForm(id);
  finLancForm(null,{tipo:'despesa', un:'obras', desc:'', refTipo:'obra', refId:o.id});
}

/* ---------------- Aba 3: Previsto x Realizado ---------------- */
async function orcTabComparativo(o,r){
  const body = document.getElementById('orc-body');
  const etapas = r.etapas.sort((a,b)=>a.ordem-b.ordem);
  const linhas = etapas.map(e=>{
    const prev = r.orc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
    const real = r.lanc.filter(x=>x.etapa===e.nome).reduce((s,x)=>s+num(x.valor),0);
    const prevAj = prev*num(e.avanco)/100;   // previsto proporcional ao executado
    return {nome:e.nome, avanco:num(e.avanco), prev, real, prevAj, desvio:prevAj?((real-prevAj)/prevAj*100):0, cor:e.cor};
  });
  const semEtapa = r.lanc.filter(x=>!x.etapa).reduce((s,x)=>s+num(x.valor),0);
  let h = `<div class="al ai"><i class="ti ti-info-circle"></i><div>
    <b>Como ler:</b> o <b>Previsto proporcional</b> é o valor orçado da etapa ajustado pelo percentual já executado.
    Comparado ao realizado, mostra se a etapa está gastando mais ou menos do que o orçamento previa <i>para o que já foi feito</i>.</div></div>
   <div class="card tw"><div class="bd"><table>
    <thead><tr><th>Etapa</th><th class="c">Avanço</th><th class="r">Orçado total</th><th class="r">Previsto proporcional</th>
      <th class="r">Realizado</th><th class="r">Desvio</th><th class="c">Situação</th></tr></thead><tbody>`;
  linhas.forEach(l=>{
    const st = !l.real ? ['s-nt','Sem gasto'] : l.desvio>10 ? ['s-bl','Acima do orçado'] : l.desvio<-10 ? ['s-ok','Economia'] : ['s-pd','Dentro do previsto'];
    h += `<tr><td><b style="color:${l.cor}">${esc(l.nome)}</b></td>
      <td class="c n">${qtd(l.avanco,0)}%</td>
      <td class="r n">${moeda(l.prev)}</td><td class="r n">${moeda(l.prevAj)}</td>
      <td class="r n"><b>${moeda(l.real)}</b></td>
      <td class="r n" style="color:${l.desvio>10?'var(--red)':l.desvio<-10?'var(--green)':'var(--text2)'}">${l.prevAj?(l.desvio>0?'+':'')+pct(l.desvio):'—'}</td>
      <td class="c"><span class="st ${st[0]}">${st[1]}</span></td></tr>`;
  });
  if(semEtapa) h += `<tr><td colspan="4"><i>Custos sem etapa vinculada</i></td><td class="r n"><b>${moeda(semEtapa)}</b></td><td colspan="2"></td></tr>`;
  h += `</tbody><tfoot><tr><td colspan="2">TOTAL</td><td class="r n">${moeda(r.orcado)}</td>
    <td class="r n">${moeda(linhas.reduce((s,l)=>s+l.prevAj,0))}</td><td class="r n">${moeda(r.realizado)}</td><td colspan="2"></td></tr></tfoot></table></div></div>`;

  h += `<div class="chg"><div class="card"><div class="hd"><i class="ti ti-chart-bar"></i>Orçado x Realizado por etapa</div><div class="bd">
    <div style="display:flex;flex-direction:column;gap:11px">` +
    linhas.filter(l=>l.prev||l.real).map(l=>{
      const mx = Math.max(l.prev,l.real,1);
      return `<div><div style="font-size:11.5px;font-weight:700;margin-bottom:4px">${esc(l.nome)}</div>
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px"><span class="tt" style="width:62px">Orçado</span>
          <div class="pb" style="flex:1"><div class="pf" style="width:${l.prev/mx*100}%;background:#1F7A44"></div></div>
          <b style="font-size:11px;width:88px;text-align:right">${moedaK(l.prev)}</b></div>
        <div style="display:flex;align-items:center;gap:7px"><span class="tt" style="width:62px">Realizado</span>
          <div class="pb" style="flex:1"><div class="pf" style="width:${l.real/mx*100}%;background:${l.real>l.prev?'#A8291F':'#B26A0C'}"></div></div>
          <b style="font-size:11px;width:88px;text-align:right">${moedaK(l.real)}</b></div></div>`;
    }).join('') + `</div></div></div></div>`;
  body.innerHTML = h;
}

/* ---------------- Aba 4: Curva ABC ---------------- */
async function orcTabABC(o,r){
  const body = document.getElementById('orc-body');
  if(!r.orc.length){ body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-chart-arrows"></i><b>Sem orçamento</b>Gere ou lance itens no orçamento para calcular a curva ABC.</div></div></div>`; return; }
  const agg = {};
  r.orc.forEach(x=>{
    const k = x.cod+'|'+x.desc+'|'+x.und;
    if(!agg[k]) agg[k] = {cod:x.cod,desc:x.desc,und:x.und,cat:x.cat,qtd:0,valor:0,vunit:num(x.vunit)};
    agg[k].qtd += num(x.qtd); agg[k].valor += num(x.qtd)*num(x.vunit);
  });
  const lista = Object.values(agg).sort((a,b)=>b.valor-a.valor);
  const tot = lista.reduce((s,x)=>s+x.valor,0);
  let acc = 0;
  lista.forEach(x=>{ acc += x.valor; x.acum = acc/tot*100; x.classe = x.acum<=80?'A':x.acum<=95?'B':'C'; });
  const cA = lista.filter(x=>x.classe==='A'), cB = lista.filter(x=>x.classe==='B'), cC = lista.filter(x=>x.classe==='C');

  let h = `<div class="al ai"><i class="ti ti-info-circle"></i><div>
    A curva ABC ordena os insumos pelo peso no custo. Os itens <b>classe A</b> concentram ~80% do valor da obra —
    é neles que negociar preço e controlar desperdício traz resultado real.</div></div>
   <div class="kg" style="margin-bottom:14px">
    <div class="kc rd"><div class="lb"><i class="ti ti-letter-a"></i>Classe A</div><div class="vl">${cA.length}</div>
      <div class="sb">${moedaK(cA.reduce((s,x)=>s+x.valor,0))} · ${pct(cA.reduce((s,x)=>s+x.valor,0)/tot*100)}</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-letter-b"></i>Classe B</div><div class="vl">${cB.length}</div>
      <div class="sb">${moedaK(cB.reduce((s,x)=>s+x.valor,0))} · ${pct(cB.reduce((s,x)=>s+x.valor,0)/tot*100)}</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-letter-c"></i>Classe C</div><div class="vl">${cC.length}</div>
      <div class="sb">${moedaK(cC.reduce((s,x)=>s+x.valor,0))} · ${pct(cC.reduce((s,x)=>s+x.valor,0)/tot*100)}</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-package"></i>Insumos</div><div class="vl">${lista.length}</div><div class="sb">itens distintos no orçamento</div></div>
   </div>
   <div class="card tw"><div class="hd"><i class="ti ti-chart-arrows"></i>Curva ABC de insumos<span class="sp"></span>
     <button class="btn sm gh" onclick="printABC()"><i class="ti ti-printer"></i>Imprimir</button></div><div class="bd"><table>
    <thead><tr><th class="c">#</th><th class="c">Classe</th><th>Cód.</th><th>Insumo</th><th>Categoria</th><th class="c">Und</th>
      <th class="r">Qtd</th><th class="r">V. Unit.</th><th class="r">Total</th><th class="r">% </th><th class="r">% acum.</th></tr></thead><tbody>`;
  lista.forEach((x,i)=>{
    const cls = x.classe==='A'?'s-bl':x.classe==='B'?'s-wn':'s-ok';
    h += `<tr><td class="c tt">${i+1}</td><td class="c"><span class="st ${cls}">${x.classe}</span></td>
      <td class="mono">${esc(x.cod)}</td><td>${esc(x.desc)}</td><td class="tt">${esc(x.cat||'—')}</td>
      <td class="c">${esc(x.und)}</td><td class="r n">${qtd(x.qtd,2)}</td><td class="r n">${moeda(x.vunit)}</td>
      <td class="r n"><b>${moeda(x.valor)}</b></td><td class="r n">${pct(x.valor/tot*100)}</td><td class="r n">${pct(x.acum)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan="8">TOTAL</td><td class="r n">${moeda(tot)}</td><td colspan="2"></td></tr></tfoot></table></div></div>
   <div class="card"><div class="hd"><i class="ti ti-target"></i>Top 10 — foco de negociação</div><div class="bd">
     ${hbarChart(lista.slice(0,10).map(x=>({label:x.desc,val:x.valor,color:x.classe==='A'?'#A8291F':'#B26A0C'})))}</div></div>`;
  body.innerHTML = h;
  window.__ABC = {lista,tot};
}

async function printABC(){
  const o = await obraAtual();
  const {lista,tot} = window.__ABC||{lista:[],tot:0};
  let h = prnHead('Curva ABC de Insumos','Orçamento da obra ordenado por relevância de custo');
  h += prnObraInfo(o);
  h += `<table><thead><tr><th>#</th><th>Cl.</th><th>Cód.</th><th>Insumo</th><th>Und</th><th>Qtd</th><th>V.Unit</th><th>Total</th><th>%</th><th>% ac.</th></tr></thead><tbody>`;
  lista.forEach((x,i)=>{ h += `<tr><td>${i+1}</td><td>${x.classe}</td><td>${esc(x.cod)}</td><td>${esc(x.desc)}</td>
    <td>${esc(x.und)}</td><td style="text-align:right">${qtd(x.qtd,2)}</td><td style="text-align:right">${moeda(x.vunit)}</td>
    <td style="text-align:right">${moeda(x.valor)}</td><td style="text-align:right">${pct(x.valor/tot*100)}</td>
    <td style="text-align:right">${pct(x.acum)}</td></tr>`; });
  h += `</tbody><tfoot><tr><td colspan="7">TOTAL</td><td style="text-align:right">${moeda(tot)}</td><td colspan="2"></td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}

/* ---------------- Impressão e exportação do orçamento ---------------- */
async function printOrcamento(){
  const o = await obraAtual();
  const r = await obraResumo(o.id);
  const etapas = [...new Set(r.orc.map(x=>x.etapa))];
  let h = prnHead('Orçamento Analítico da Obra','Planilha orçamentária por etapa construtiva');
  h += prnObraInfo(o);
  h += `<div class="pkg">
    <div class="pkc"><div class="l">Custo total orçado</div><div class="v">${moedaK(r.orcado)}</div></div>
    <div class="pkc"><div class="l">Custo por m²</div><div class="v">${o.area?moeda(r.orcado/num(o.area)):'—'}</div></div>
    <div class="pkc"><div class="l">Valor do contrato</div><div class="v">${moedaK(o.valorContrato)}</div></div>
    <div class="pkc"><div class="l">Margem prevista</div><div class="v">${moedaK(num(o.valorContrato)-r.orcado)}</div></div></div>`;
  etapas.forEach(et=>{
    const its = r.orc.filter(x=>x.etapa===et);
    const sub = its.reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
    h += `<div class="psec">${esc(et)} — ${moeda(sub)} (${r.orcado?pct(sub/r.orcado*100):'0%'})</div>
      <table><thead><tr><th>Cód.</th><th>Descrição</th><th>Und</th><th>Qtd</th><th>V. Unit.</th><th>Total</th></tr></thead><tbody>`;
    its.forEach(x=>{ h += `<tr><td>${esc(x.cod)}</td><td>${esc(x.desc)}</td><td>${esc(x.und)}</td>
      <td style="text-align:right">${qtd(x.qtd,3)}</td><td style="text-align:right">${moeda(x.vunit)}</td>
      <td style="text-align:right">${moeda(num(x.qtd)*num(x.vunit))}</td></tr>`; });
    h += `</tbody><tfoot><tr><td colspan="5">SUBTOTAL</td><td style="text-align:right">${moeda(sub)}</td></tr></tfoot></table>`;
  });
  h += `<div class="psec">Resumo geral</div><table><thead><tr><th>Etapa</th><th>Valor</th><th>Participação</th></tr></thead><tbody>`;
  etapas.forEach(et=>{ const sub = r.orc.filter(x=>x.etapa===et).reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
    h += `<tr><td>${esc(et)}</td><td style="text-align:right">${moeda(sub)}</td><td style="text-align:right">${r.orcado?pct(sub/r.orcado*100):'—'}</td></tr>`; });
  h += `</tbody><tfoot><tr><td>TOTAL GERAL</td><td style="text-align:right">${moeda(r.orcado)}</td><td style="text-align:right">100,0%</td></tr></tfoot></table>`;
  h += prnSig() + prnFoot();
  printar(h);
}

async function orcExportCSV(){
  const o = await obraAtual();
  const orc = await dbByObra('orcamento',o.id);
  const linhas = [['Etapa','Codigo','Descricao','Categoria','Unidade','Quantidade','Valor Unitario','Total']];
  orc.forEach(x=>linhas.push([x.etapa,x.cod,x.desc,x.cat,x.und,String(num(x.qtd)).replace('.',','),
    String(num(x.vunit).toFixed(2)).replace('.',','),String((num(x.qtd)*num(x.vunit)).toFixed(2)).replace('.',',')]));
  baixarArquivo(linhas.map(l=>l.map(c=>`"${String(c==null?'':c).replace(/"/g,'""')}"`).join(';')).join('\r\n'),
    `orcamento_${o.cod}.csv`,'text/csv;charset=utf-8');
  toast('CSV exportado — abra no Excel.');
}
function baixarArquivo(conteudo,nome,mime){
  const blob = new Blob(['﻿'+conteudo],{type:mime||'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

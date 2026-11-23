/* =========================================================================
   CHÁCARA — PLANO DE MEIO HECTARE (aba "Plano 0,5 ha")

   Calculadora das quatro fontes de renda que cabem em 5.000 m²: ovos caipiras,
   alface hidropônica, cestas da horta e eventos/day use. Os valores padrão vêm
   do plano (documento "Plano de Renda") e são ESTIMATIVAS para a região de
   Campo Grande (MS): mude cada número para o seu. "Adotar este plano" grava
   em CFG.chacaraPlano — é o que a sede lê no retrato da meta.
   ========================================================================= */
const CHP_PADRAO = {
  aves: 300, postura: 80, precoDuzia: 11, racaoKg: 0.115, precoRacao: 2.5, embDuzia: 0.55, fixoAves: 300,
  pes: 2000, precoPe: 2.8, custoPe: 1.3,
  cestas: 15, precoCesta: 40, custoCesta: 18,
  eventos: 0, diaria: 800, custoEvento: 250,
};
const CHP_AREAS = [
  ['Galinhas: galpão e piquete', 250, 'R$ 15 a 25 mil', 'mês 2 com frangas prontas; mês 5 com pintinhas'],
  ['Estufa de hidroponia (7 × 18 m) e corredor', 200, 'R$ 30 a 55 mil', 'mês 3'],
  ['Canteiros de folhas, temperos e legumes', 1500, 'R$ 3 a 6 mil (gotejamento)', 'mês 2'],
  ['Compostagem e minhocário', 100, 'R$ 1 mil', 'mês 4'],
  ['Frutíferas nas bordas', 1500, 'R$ 2 a 4 mil', 'mês 9 a 18'],
  ['Casa, acesso, água e lazer', 1450, '—', '—'],
];

function chpParams(){ return { ...CHP_PADRAO, ...((CFG.chacaraPlano && CFG.chacaraPlano.params) || {}) }; }
function chpCalc(p){
  const duzias = p.aves * (p.postura / 100) * 30 / 12;
  const ovos = { rec: duzias * p.precoDuzia, cus: p.aves * p.racaoKg * 30 * p.precoRacao + duzias * p.embDuzia + (p.aves ? p.fixoAves : 0) };
  const hidro = { rec: p.pes * p.precoPe, cus: p.pes * p.custoPe };
  const cestas = { rec: p.cestas * 4.33 * p.precoCesta, cus: p.cestas * 4.33 * p.custoCesta };
  const ev = { rec: p.eventos * p.diaria, cus: p.eventos * p.custoEvento };
  const linhas = [
    { id:'ovos', nome:'Ovos caipiras', qtd: Math.round(duzias), und:'dúzias/mês', ...ovos },
    { id:'hidro', nome:'Alface hidropônica', qtd: p.pes, und:'pés/mês', ...hidro },
    { id:'cestas', nome:'Cestas da horta', qtd: Math.round(p.cestas * 4.33), und:'cestas/mês', ...cestas },
    { id:'eventos', nome:'Eventos e day use', qtd: p.eventos, und:'eventos/mês', ...ev },
  ].map(l => ({ ...l, lucro: l.rec - l.cus }));
  const rec = linhas.reduce((s,l)=>s+l.rec,0), cus = linhas.reduce((s,l)=>s+l.cus,0);
  return { linhas, rec, cus, lucro: rec - cus };
}

async function chaTabPlano(){
  const body = document.getElementById('cha-body'); if(!body) return;
  const p = chpParams(), C = chpCalc(p), ad = CFG.chacaraPlano;
  const campo = (id, rot, v, passo, suf) => `<div class="fg"><label>${rot}${suf?` <span class="tt">(${suf})</span>`:''}</label><input id="chp-${id}" type="number" step="${passo||1}" min="0" value="${v}" oninput="chpAtualizar()"></div>`;
  let h = `<div class="al ai" style="margin-top:0"><i class="ti ti-info-circle"></i><div>Plano para <b>meio hectare (5.000 m²)</b> com quatro fontes de renda o ano todo. Os números padrão são estimativas para Campo Grande (MS). Troque cada um pelo seu: o lucro recalcula na hora. ${ad?`<b>Plano adotado em ${esc(dbr(ad.em))}</b>, com lucro estimado de ${moeda(ad.lucro)} por mês.`:''}</div></div>
  <div id="chp-res">${chpResultadoHTML(C)}</div>
  <div class="fr2" style="align-items:start">
    <div class="card"><div class="hd"><i class="ti ti-basket"></i>Ovos caipiras</div><div class="bd"><div class="fr3">
      ${campo('aves','Galinhas poedeiras',p.aves)}${campo('postura','Postura','' + p.postura,1,'% por dia')}${campo('precoDuzia','Preço da dúzia (R$)',p.precoDuzia,0.5)}</div><div class="fr3">
      ${campo('racaoKg','Ração por ave','' + p.racaoKg,0.005,'kg/dia')}${campo('precoRacao','Preço da ração (R$/kg)',p.precoRacao,0.1)}${campo('embDuzia','Embalagem por dúzia (R$)',p.embDuzia,0.05)}</div>
      ${campo('fixoAves','Outros custos do aviário (R$/mês)',p.fixoAves,50)}
      <div class="hint">Cada ave come de 110 a 120 g de ração por dia; ração é o maior custo.</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-plant"></i>Alface hidropônica</div><div class="bd"><div class="fr3">
      ${campo('pes','Pés vendidos por mês',p.pes,100)}${campo('precoPe','Preço por pé (R$)',p.precoPe,0.1)}${campo('custoPe','Custo por pé (R$)',p.custoPe,0.05)}</div>
      <div class="hint">O preço supõe venda direta (restaurantes, feira, cestas). No atacado, o pé sai por bem menos.</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-shopping-bag"></i>Cestas da horta</div><div class="bd"><div class="fr3">
      ${campo('cestas','Cestas por semana',p.cestas)}${campo('precoCesta','Preço da cesta (R$)',p.precoCesta,1)}${campo('custoCesta','Custo da cesta (R$)',p.custoCesta,1)}</div>
      <div class="hint">Assinatura semanal pelo WhatsApp: o Vendedor da Chácara monta a mensagem toda segunda.</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-home"></i>Eventos e day use</div><div class="bd"><div class="fr3">
      ${campo('eventos','Eventos por mês',p.eventos)}${campo('diaria','Diária (R$)',p.diaria,50)}${campo('custoEvento','Custo por evento (R$)',p.custoEvento,10)}</div>
      <div class="hint">Só vale com área coberta, banheiros e piscina. Em Campo Grande há anúncios de R$ 550 a R$ 2.100 a diária.</div></div></div>
  </div>
  <div class="card tw" style="margin-top:12px"><div class="hd"><i class="ti ti-map-2"></i>Como dividir os 5.000 m²</div><div class="bd"><table>
    <thead><tr><th>Uso</th><th class="r">Área (m²)</th><th>Investimento (estimado)</th><th>Começa a render</th></tr></thead><tbody>
    ${CHP_AREAS.map(a => `<tr><td>${esc(a[0])}</td><td class="r n">${a[1].toLocaleString('pt-BR')}</td><td>${esc(a[2])}</td><td class="tt">${esc(a[3])}</td></tr>`).join('')}
    <tr style="background:var(--bg2)"><td><b>Total</b></td><td class="r n"><b>${CHP_AREAS.reduce((s,a)=>s+a[1],0).toLocaleString('pt-BR')}</b></td><td colspan="2"></td></tr></tbody></table>
    <div class="tt" style="padding:8px 12px">Ordem sugerida: galinhas e canteiros primeiro (retorno mais rápido). A estufa entra quando os ovos já tiverem clientes fixos.</div></div></div>
  <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
    <button class="btn gh" onclick="chpPadrao()"><i class="ti ti-refresh"></i>Voltar aos números do plano</button>
    <button class="btn gn" onclick="chpAdotar()"><i class="ti ti-check"></i>Adotar este plano</button></div>`;
  body.innerHTML = h;
}
function chpResultadoHTML(C){
  return `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-calculator"></i>Resultado estimado por mês<span class="sp"></span><b style="color:${C.lucro>=0?'var(--green)':'var(--red)'};font-size:16px">${moeda(C.lucro)}</b></div><div class="bd"><table>
    <thead><tr><th>Fonte</th><th class="r">Produção</th><th class="r">Receita</th><th class="r">Custo</th><th class="r">Lucro</th></tr></thead><tbody>
    ${C.linhas.map(l => `<tr><td><b>${esc(l.nome)}</b></td><td class="r n">${Math.round(l.qtd).toLocaleString('pt-BR')} ${esc(l.und)}</td><td class="r n">${moeda(l.rec)}</td><td class="r n">${moeda(l.cus)}</td><td class="r n"><b style="color:${l.lucro>=0?'var(--green)':'var(--red)'}">${moeda(l.lucro)}</b></td></tr>`).join('')}
    <tr style="background:var(--bg2)"><td><b>Total</b></td><td></td><td class="r n"><b>${moeda(C.rec)}</b></td><td class="r n"><b>${moeda(C.cus)}</b></td><td class="r n"><b>${moeda(C.lucro)}</b></td></tr></tbody></table>
    <div class="tt" style="padding:8px 12px">Sem mão de obra contratada, frete e impostos. A meta da chácara no plano é de R$ 7 mil de lucro por mês no mês 12.</div></div></div>`;
}
function chpLerCampos(){
  const p = { ...CHP_PADRAO };
  Object.keys(CHP_PADRAO).forEach(k => { const el = document.getElementById('chp-'+k); if(el) p[k] = num(el.value); });
  return p;
}
function chpAtualizar(){ const el = document.getElementById('chp-res'); if(el) el.innerHTML = chpResultadoHTML(chpCalc(chpLerCampos())); }
async function chpAdotar(){
  const params = chpLerCampos(), C = chpCalc(params);
  CFG.chacaraPlano = { em: hoje(), params, receita: Math.round(C.rec), custo: Math.round(C.cus), lucro: Math.round(C.lucro),
    itens: C.linhas.map(l => ({ id: l.id, nome: l.nome, qtd: Math.round(l.qtd), und: l.und, lucro: Math.round(l.lucro) })) };
  await cfgSalvar(); toast('Plano da chácara adotado.'); chaTabPlano();
}
function chpPadrao(){
  Object.entries(CHP_PADRAO).forEach(([k,v]) => { const el = document.getElementById('chp-'+k); if(el) el.value = v; });
  chpAtualizar();
}

/* =========================================================================
   VEÍCULOS — PLANO DE FROTA (aba "Plano de frota")

   O plano de 23/11/2026: de 1 caminhão para 5 carros pequenos (aluguel para
   motorista de aplicativo), 1 retroescavadeira e um 2º pesado, em 12 meses.
   Cada compra tem um GATILHO — se o gatilho não foi cumprido, a compra
   espera; o calendário não manda sozinho.

   Guarda em CFG.frotaPlano (sem mexer no banco). A Meta R$ 50 mil lê daqui
   a meta da frente "Veículos e máquinas"; a sede lê pelo retrato da meta.
   Números padrão = estimativas do documento "Plano de frota" (Campo Grande-MS).
   ========================================================================= */
const FROTA_DOC = 'https://claude.ai/artifact/AaYVtYtNmeEkA9unrBUnAn';
const FROTA_PADRAO = {
  semanal: 650, seguro: 400, manut: 300, ipva: 180, rastreador: 60, reservaPct: 10,
  precoCarro: 52000, deprecPct: 7.6,
  finEntradaPct: 20, finTaxaMes: 1.5, finMeses: 48,
  maqValor: 200000, maqAluguel: 13000, maqCustoPct: 35, maqTaxaAno: 12, maqMeses: 60,
  basculante: 3500,
};
const FROTA_MARCOS = [
  { id:'reajuste', mes:1, tipo:'Ação',    nome:'Reajustar o aluguel do basculante', gatilho:'Próximo vencimento do contrato do caminhão' },
  { id:'carro1',   mes:1, tipo:'Carro',   nome:'Carro 1 (Kwid ou Mobi 2022–2023)', gatilho:'Contrato, seguro de uso comercial e rastreador prontos antes da chave' },
  { id:'carro2',   mes:1, tipo:'Carro',   nome:'Carro 2 (Kwid ou Mobi 2022–2023)', gatilho:'Igual ao carro 1' },
  { id:'retro',    mes:3, tipo:'Máquina', nome:'Retroescavadeira usada', gatilho:'Contrato de 6 meses ou mais assinado com um cliente' },
  { id:'carro3',   mes:6, tipo:'Carro',   nome:'Carro 3', gatilho:'Os 2 carros alugados 3 meses seguidos, sem atraso' },
  { id:'carro4',   mes:9, tipo:'Carro',   nome:'Carro 4', gatilho:'Os 3 carros alugados 3 meses seguidos, sem atraso' },
  { id:'pesado2',  mes:9, tipo:'Máquina', nome:'2º basculante ou minicarregadeira', gatilho:'Retroescavadeira ocupada 80% ou mais e contrato novo assinado' },
  { id:'carro5',   mes:12, tipo:'Carro',  nome:'Carro 5', gatilho:'Reserva em caixa de 1 mês de custos da frota inteira' },
];
const FROTA_STATUS = ['Planejado', 'Em andamento', 'Feito', 'Adiado'];
const FROTA_ST_CLS = { 'Planejado':'s-nt', 'Em andamento':'s-pd', 'Feito':'s-ok', 'Adiado':'s-wn' };
const FROTA_PROTECAO = [
  ['contrato','Contrato escrito para cada veículo: prazo mínimo, pagamento adiantado, limite de km, multa e devolução'],
  ['caucao','Caução de R$ 1.200 a R$ 2.000 por carro'],
  ['seguro','Seguro de uso comercial (o seguro de passeio pode negar cobertura em aplicativo)'],
  ['rastreador','Rastreador com bloqueio remoto em todos os carros e máquinas'],
  ['triagem','Triagem do motorista: CNH com EAR, nota no aplicativo e antecedentes'],
  ['vistoria','Vistoria com fotos na entrega e na devolução'],
  ['maquinas','Máquinas: contrato seco ou com operador, horímetro e quem paga a prancha'],
];

function frotaPlano(){
  const p = CFG.frotaPlano || {};
  return { inicio: p.inicio || (CFG.metaInicio || mesAtual()), params: { ...FROTA_PADRAO, ...(p.params || {}) },
           marcos: p.marcos || {}, protecao: p.protecao || {} };
}
async function frotaGravar(fp){ CFG.frotaPlano = fp; await cfgSalvar(); }
function frotaMesDoPlano(fp, mk){
  const [a0,m0] = fp.inicio.split('-').map(Number), [a1,m1] = (mk||mesAtual()).split('-').map(Number);
  return Math.max(1, (a1-a0)*12 + (m1-m0) + 1);
}
function frotaMesCal(fp, n){ const [a,m] = fp.inicio.split('-').map(Number); const d = new Date(a, m - 1 + n - 1, 1); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }

/* conta de um carro */
function frotaCarro(P){
  const bruto = P.semanal * 52 / 12;
  const reserva = bruto * P.reservaPct / 100;
  const custos = P.seguro + P.manut + P.ipva + P.rastreador + reserva;
  const liquido = bruto - custos;
  const deprec = P.precoCarro * P.deprecPct / 100 / 12;
  const fin = P.precoCarro * (1 - P.finEntradaPct / 100), i = P.finTaxaMes / 100;
  const parcela = i ? fin * i / (1 - Math.pow(1 + i, -P.finMeses)) : fin / P.finMeses;
  return { bruto, reserva, custos, liquido, deprec, resultado: liquido - deprec, parcela, sobraFin: liquido - parcela,
           retornoAno: (liquido - deprec) * 12 / P.precoCarro * 100 };
}
function frotaMaquina(P){
  const liquido = P.maqAluguel * (1 - P.maqCustoPct / 100);
  const i = Math.pow(1 + P.maqTaxaAno / 100, 1/12) - 1;
  const parcela = i ? P.maqValor * i / (1 - Math.pow(1 + i, -P.maqMeses)) : P.maqValor / P.maqMeses;
  return { liquido, parcela, sobra: liquido - parcela, payback: liquido > 0 ? P.maqValor / liquido : null };
}
/* meta da frente Veículos e máquinas no mês n do plano (o que o plano prevê, não o que já entrou) */
function frotaMetaMes(n){
  const fp = frotaPlano(), P = fp.params, c = frotaCarro(P), m = frotaMaquina(P);
  const carros = n >= 12 ? 5 : n >= 9 ? 4 : n >= 6 ? 3 : 2;
  return Math.round(P.basculante + carros * c.liquido + (n >= 4 ? m.liquido : 0));
}

async function veiTabPlano(){
  const body = document.getElementById('vei-body'); if(!body) return;
  const fp = frotaPlano(), P = fp.params, C = frotaCarro(P), M = frotaMaquina(P);
  const n = frotaMesDoPlano(fp), veic = await dbGetAll('veiculos').catch(()=>[]);
  const st = id => (fp.marcos[id] || {}).status || 'Planejado';
  const feitosCarros = FROTA_MARCOS.filter(x => x.tipo === 'Carro' && st(x.id) === 'Feito').length;
  const atrasados = FROTA_MARCOS.filter(x => x.mes < n && !['Feito','Adiado'].includes(st(x.id)));
  const campo = (id, rot, v, passo, suf) => `<div class="fg"><label>${rot}${suf?` <span class="tt">(${suf})</span>`:''}</label><input id="fr-${id}" type="number" step="${passo||1}" min="0" value="${v}" oninput="frotaRecalc()"></div>`;

  let h = `<div class="al ai" style="margin-top:0"><i class="ti ti-info-circle"></i><div style="flex:1">Plano de 12 meses: <b>5 carros pequenos</b> para motorista de aplicativo, <b>1 retroescavadeira</b> e um <b>2º pesado</b>. Cada compra só acontece quando o gatilho estiver cumprido. Mês ${n} do plano (início ${esc(dmesL(fp.inicio))}).</div>
      <a class="btn xs gh" href="${FROTA_DOC}" target="_blank" rel="noopener"><i class="ti ti-file-text"></i>Ver o plano</a></div>`;
  if(atrasados.length) h += `<div class="al aw"><i class="ti ti-alert-triangle"></i><div><b>Passou do mês previsto:</b> ${atrasados.map(x => esc(x.nome)).join(' · ')}. Confira o gatilho: se ainda não foi cumprido, marque "Adiado".</div></div>`;

  h += `<div class="kg" style="margin-bottom:12px">
    <div class="kc pu"><div class="lb"><i class="ti ti-car"></i>Frota cadastrada</div><div class="vl">${veic.length}</div><div class="sb">${veic.filter(v=>v.status==='Locado').length} locado(s)</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-checklist"></i>Carros do plano</div><div class="vl">${feitosCarros}/5</div><div class="sb">comprados e alugados</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-report-money"></i>Líquido por carro</div><div class="vl">${moedaK(C.liquido)}</div><div class="sb">${C.retornoAno.toFixed(0)}% ao ano depois da depreciação</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-target"></i>Meta da frota neste mês</div><div class="vl">${moedaK(frotaMetaMes(n))}</div><div class="sb">basculante + carros + máquina previstos</div></div>
  </div>`;

  h += `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-calendar-event"></i>Linha do tempo e gatilhos</div><div class="bd"><table>
    <thead><tr><th>Mês</th><th>Item</th><th>Gatilho para comprar</th><th>Situação</th></tr></thead><tbody>
    ${FROTA_MARCOS.map(x => { const s = st(x.id), ob = (fp.marcos[x.id] || {}).obs || '';
      const atraso = x.mes < n && !['Feito','Adiado'].includes(s);
      return `<tr style="${s==='Feito'?'opacity:.7':''}"><td class="n"><b>${x.mes}</b><br><span class="tt">${esc(dmesL(frotaMesCal(fp, x.mes)))}</span></td>
        <td><span class="st ${x.tipo==='Máquina'?'s-pu':x.tipo==='Ação'?'s-wn':'s-bl'}">${esc(x.tipo)}</span> <b>${esc(x.nome)}</b>${ob?`<br><span class="tt">${esc(ob)}</span>`:''}</td>
        <td class="tt">${esc(x.gatilho)}</td>
        <td><select onchange="frotaMarco('${x.id}',this.value)" style="${atraso?'border-color:var(--amber)':''}">${FROTA_STATUS.map(o => `<option ${o===s?'selected':''}>${o}</option>`).join('')}</select>
          <button class="ib" title="Anotação" onclick="frotaObs('${x.id}')"><i class="ti ti-pencil"></i></button></td></tr>`; }).join('')}
    </tbody></table></div></div>`;

  h += `<div class="fr2" style="align-items:start">
    <div class="card"><div class="hd"><i class="ti ti-car"></i>Conta de um carro pequeno</div><div class="bd">
      <div class="fr3">${campo('semanal','Aluguel por semana (R$)',P.semanal,10)}${campo('seguro','Seguro comercial (R$/mês)',P.seguro,10)}${campo('manut','Manutenção e pneus (R$/mês)',P.manut,10)}</div>
      <div class="fr3">${campo('ipva','IPVA e licenciamento (R$/mês)',P.ipva,10)}${campo('rastreador','Rastreador (R$/mês)',P.rastreador,5)}${campo('reservaPct','Reserva para parado/atraso','' + P.reservaPct,1,'%')}</div>
      <div class="fr3">${campo('precoCarro','Preço do carro (R$)',P.precoCarro,1000)}${campo('deprecPct','Depreciação',P.deprecPct,0.1,'% ao ano')}</div>
      <div class="fr3">${campo('finEntradaPct','Entrada se financiar',P.finEntradaPct,5,'%')}${campo('finTaxaMes','Juro do financiamento',P.finTaxaMes,0.1,'% ao mês')}${campo('finMeses','Parcelas',P.finMeses,6)}</div>
      <div id="fr-res-carro">${frotaResCarro(C)}</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-tools"></i>Máquina (retroescavadeira)</div><div class="bd">
      <div class="fr3">${campo('maqValor','Preço (R$)',P.maqValor,5000)}${campo('maqAluguel','Aluguel por mês (R$)',P.maqAluguel,500)}${campo('maqCustoPct','Custos (manutenção, seguro, prancha)',P.maqCustoPct,1,'% do aluguel')}</div>
      <div class="fr3">${campo('maqTaxaAno','Juro BNDES + banco',P.maqTaxaAno,0.5,'% ao ano')}${campo('maqMeses','Parcelas',P.maqMeses,6)}${campo('basculante','Basculante atual (R$/mês)',P.basculante,100)}</div>
      <div id="fr-res-maq">${frotaResMaq(M)}</div>
      <div class="hint">Regra do plano: <b>primeiro o contrato, depois a máquina</b>. Máquina parada dá prejuízo alto.</div></div></div>
  </div>
  <div style="margin:8px 0 12px;display:flex;gap:8px;justify-content:flex-end">
    <button class="btn gh" onclick="frotaPadrao()"><i class="ti ti-refresh"></i>Voltar aos números do plano</button>
    <button class="btn gn" onclick="frotaSalvarParams()"><i class="ti ti-device-floppy"></i>Salvar números</button></div>`;

  h += `<div class="card"><div class="hd"><i class="ti ti-shield-check"></i>Proteção antes da primeira chave (${FROTA_PROTECAO.filter(([k]) => fp.protecao[k]).length}/${FROTA_PROTECAO.length})</div><div class="bd">
    ${FROTA_PROTECAO.map(([k,t]) => `<label style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:13px;cursor:pointer"><input type="checkbox" ${fp.protecao[k]?'checked':''} onchange="frotaProtecao('${k}',this.checked)"><span style="${fp.protecao[k]?'color:var(--text3);text-decoration:line-through':''}">${esc(t)}</span></label>`).join('')}
    </div></div>`;
  body.innerHTML = h;
}
function frotaResCarro(C){
  const l = (r, v, b) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bg3);font-size:13px"><span class="tt">${r}</span>${b?`<b>${v}</b>`:`<span>${v}</span>`}</div>`;
  return l('Aluguel por mês', moeda(C.bruto)) + l('Custos (com reserva)', '− ' + moeda(C.custos)) + l('<b>Líquido</b>', moeda(C.liquido), 1)
    + l('Depreciação', '− ' + moeda(C.deprec)) + l('<b>Resultado</b>', moeda(C.resultado), 1)
    + l('Se financiar: parcela', moeda(C.parcela)) + l('Se financiar: sobra por mês', `<span style="color:${C.sobraFin>=0?'var(--green)':'var(--red)'}">${moeda(C.sobraFin)}</span>`, 1);
}
function frotaResMaq(M){
  const l = (r, v, b) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bg3);font-size:13px"><span class="tt">${r}</span>${b?`<b>${v}</b>`:`<span>${v}</span>`}</div>`;
  return l('<b>Líquido por mês</b>', moeda(M.liquido), 1) + l('Parcela do financiamento', moeda(M.parcela))
    + l('<b>Sobra por mês, financiada</b>', `<span style="color:${M.sobra>=0?'var(--green)':'var(--red)'}">${moeda(M.sobra)}</span>`, 1)
    + l('À vista, se paga em', M.payback ? Math.ceil(M.payback) + ' meses' : '—');
}
function frotaLerCampos(){
  const P = { ...frotaPlano().params };
  Object.keys(FROTA_PADRAO).forEach(k => { const el = document.getElementById('fr-'+k); if(el) P[k] = num(el.value); });
  return P;
}
function frotaRecalc(){
  const P = frotaLerCampos();
  const a = document.getElementById('fr-res-carro'), b = document.getElementById('fr-res-maq');
  if(a) a.innerHTML = frotaResCarro(frotaCarro(P)); if(b) b.innerHTML = frotaResMaq(frotaMaquina(P));
}
async function frotaSalvarParams(){ const fp = frotaPlano(); fp.params = frotaLerCampos(); await frotaGravar(fp); toast('Números da frota salvos.'); veiTabPlano(); }
function frotaPadrao(){ Object.entries(FROTA_PADRAO).forEach(([k,v]) => { const el = document.getElementById('fr-'+k); if(el) el.value = v; }); frotaRecalc(); }
async function frotaMarco(id, status){
  const fp = frotaPlano(); fp.marcos[id] = { ...(fp.marcos[id] || {}), status, em: hoje() };
  await frotaGravar(fp); toast('Situação atualizada.'); veiTabPlano();
}
function frotaObs(id){
  const fp = frotaPlano(), x = FROTA_MARCOS.find(m => m.id === id);
  modal('Anotação — ' + x.nome, 'ti-pencil',
    `<div class="fg"><label>Anotação (cotação, cliente, placa, data)</label><textarea id="fr-obs" rows="3">${esc((fp.marcos[id] || {}).obs || '')}</textarea></div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="frotaObsSalvar('${id}')"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function frotaObsSalvar(id){
  const fp = frotaPlano(); fp.marcos[id] = { ...(fp.marcos[id] || {}), obs: val('fr-obs') };
  await frotaGravar(fp); closeModal('mk-form'); veiTabPlano();
}
async function frotaProtecao(k, v){ const fp = frotaPlano(); fp.protecao[k] = !!v; await frotaGravar(fp); veiTabPlano(); }

/* resumo para o retrato da meta (sede) */
function frotaRetrato(){
  const fp = frotaPlano(), n = frotaMesDoPlano(fp), C = frotaCarro(fp.params);
  const L = ['## Plano de frota', '', `Mês ${n} do plano. Líquido estimado por carro: ${moeda(C.liquido)}. Meta da frota neste mês: ${moeda(frotaMetaMes(n))}.`, ''];
  FROTA_MARCOS.forEach(x => { const m = fp.marcos[x.id] || {}; L.push(`- Mês ${x.mes} · ${x.nome} · ${m.status || 'Planejado'} · gatilho: ${x.gatilho}${m.obs ? ' · obs: ' + m.obs : ''}`); });
  L.push('', 'Proteção: ' + FROTA_PROTECAO.map(([k,t]) => `${fp.protecao[k] ? '[x]' : '[ ]'} ${t.split(':')[0]}`).join('; '));
  return L.join('\n');
}

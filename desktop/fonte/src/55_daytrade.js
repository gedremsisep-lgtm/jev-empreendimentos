/* =========================================================================
   DAY-TRADE — bolsa (mini-índice e mini-dólar) e cripto (BTC, ETH, SOL)

   O que esta tela É: o painel do dono sobre o motor que mora na sede dos
   agentes (C:\JeV\jev-agentes\engine\daytrade). Ela não calcula nada sozinha:
   pede o estado ao motor e manda os comandos do dono (travar, mudar fase,
   anotar uma ordem executada). Uma fonte só da verdade.

   O que ela NÃO é: um robô que mexe no seu dinheiro. Na simulação o dinheiro é
   fictício. Nas fases reais o motor PREPARA a ordem e quem executa, na sua
   corretora, é você. Isso não tem chave para desligar.

   Como cartão, mora ao lado do Escritório e do Software e, como eles, fica
   FORA de UNIDADES — não entra no rateio do financeiro.
   ========================================================================= */
const DAYTRADE = {
  id:'daytrade', pg:'dt', nome:'Day-Trade', curto:'Day-Trade',
  ic:'ti-chart-line', cor:'#8B1E3F', bg:'#F7E8EE',
  desc:'Bolsa e cripto: laboratório, simulação e risco',
  tabs:[['dt','Day-Trade','ti-chart-line']]
};
const DT_ABAS = [['bolsa','Bolsa','ti-building-bank'],['cripto','Cripto','ti-coin'],['lab','Laboratório','ti-flask'],
                 ['imposto','Imposto','ti-receipt'],['como','Como funciona','ti-info-circle']];
const DT_FASES = { laboratorio:['Só laboratório','s-nt'], simulacao:['Simulação ao vivo','s-pd'], real_pequeno:['Real pequeno','s-wn'], real:['Real','s-bl'] };
const DT_VEREDITO = { forte:['Forte','s-ok','passou no teste e no Sharpe deflacionado'], fraca_mas_positiva:['Fraca — pode ser sorte','s-wn','passou no teste, mas o Sharpe deflacionado está abaixo de 90%'], reprovada:['Reprovada','s-bl',''], nenhuma:['Nenhuma','s-nt',''] };
let DT_ABA = 'bolsa';
let DT_EST = null;          /* último estado recebido do motor */
let DT_OCUPADO = false;

function dtApp(){ const a = (typeof APP === 'function') ? APP() : null; return a && a.dtRodar ? a : null; }
async function dtPedir(cmd, arg){
  const a = dtApp(); if(!a) return { ok:false, erro:'O Day-Trade roda no aplicativo do Windows, junto com a sede dos agentes.' };
  try { return await a.dtRodar(cmd, arg); } catch(e){ return { ok:false, erro: String(e && e.message || e) }; }
}
async function dtCarregar(){
  const r = await dtPedir('estado');
  if(r && r.bolsa) { DT_EST = r; return r; }
  DT_EST = { erro: (r && r.erro) || 'sem resposta do motor' }; return DT_EST;
}
const dtR = v => moeda(Number(v)||0);
const dtCor = v => (Number(v)||0) >= 0 ? 'var(--green)' : 'var(--red)';
function dtNomeEst(id){ return (DT_EST && DT_EST.estrategias && DT_EST.estrategias[id] && DT_EST.estrategias[id].nome) || id || '—'; }
function dtParams(p){ return esc(Object.entries(p||{}).map(([k,v])=>`${k} ${v}`).join(' · ')); }

/* ------------------------------------------------ o cartão da página inicial */
function dtCardHub(){
  const u = DAYTRADE;
  return `<div class="ucard" style="--uc:${u.cor};--ucb:${u.bg}" onclick="go('${u.pg}')">
      <div class="bar"></div>
      <div class="top2"><div class="ico"><i class="ti ${u.ic}"></i></div>
        <div style="flex:1;min-width:0"><h3>${esc(u.curto)}</h3><div class="sub">${esc(u.desc)}</div></div></div>
      <div class="body">
        <div class="kv"><span>Bolsa</span><b data-dt="bolsa">—</b></div>
        <div class="kv"><span>Cripto</span><b data-dt="cripto">—</b></div>
        <div class="kv"><span>Resultado do mês (bolsa)</span><b data-dt="mesb">—</b></div>
        <div class="kv"><span>Resultado do mês (cripto)</span><b data-dt="mesc">—</b></div>
        <div class="foot">
          <div><div class="tt">Travas</div><div class="res" data-dt="trava" style="color:var(--text3)">—</div></div>
          <div class="go">Abrir <i class="ti ti-arrow-right"></i></div></div>
      </div></div>`;
}
async function dtPreencherHub(){
  const put = (k, t, c) => { const el = document.querySelector(`[data-dt="${k}"]`); if(el){ el.textContent = t; el.style.color = c || ''; } };
  if(!dtApp()){ put('bolsa','no app do Windows'); put('cripto','no app do Windows'); return; }
  const e = await dtCarregar();
  if(e.erro){ put('bolsa','sede fechada'); put('cripto','—'); put('trava','—'); return; }
  const fase = m => (DT_FASES[m.fase]||[m.fase])[0] + (m.estrategia ? '' : ' · de fora');
  put('bolsa', fase(e.bolsa)); put('cripto', fase(e.cripto));
  put('mesb', moedaK(e.bolsa.mes.resultadoBRL), dtCor(e.bolsa.mes.resultadoBRL));
  put('mesc', moedaK(e.cripto.mes.resultadoBRL), dtCor(e.cripto.mes.resultadoBRL));
  const tr = [e.bolsa, e.cripto].filter(m => m.trava && m.trava.ativa).length;
  put('trava', tr ? tr + ' mercado(s) travado(s)' : 'nenhuma', tr ? 'var(--red)' : 'var(--green)');
}

/* --------------------------------------------------------------- a tela */
function dtAba(a){ DT_ABA = a; dtDesenhar(); }

async function dtRender(){
  const root = document.getElementById('dt-root'); if(!root) return;
  root.innerHTML = dtCabecalho() + `<div class="card"><div class="bd"><div class="tt"><i class="ti ti-loader"></i> Perguntando ao motor da sede…</div></div></div>`;
  if(!dtApp()){ root.innerHTML = dtCabecalho() + `<div class="al ai"><i class="ti ti-info-circle"></i><div>O Day-Trade roda no <b>aplicativo do Windows</b>, junto com a sede dos agentes. Pelo navegador dá para ler a aba <a href="#" onclick="dtAba('como');return false">Como funciona</a>.</div></div>` + (DT_ABA==='como' ? dtAbaComo() : ''); return; }
  await dtCarregar();
  dtDesenhar();
}

function dtCabecalho(){
  return `<div class="ph"><div class="ic" style="background:${DAYTRADE.bg};color:${DAYTRADE.cor}"><i class="ti ${DAYTRADE.ic}"></i></div>
    <div><h1>Day-Trade</h1><p>Bolsa e cripto — o laboratório testa, a simulação prova, o dinheiro real é decisão sua</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="dtRender()"><i class="ti ti-refresh"></i>Atualizar</button></div>
    <div class="chips" style="margin-bottom:14px">${DT_ABAS.map(([k,n,i])=>`<span class="chip ${DT_ABA===k?'on':''}" onclick="dtAba('${k}')"><i class="ti ${i}"></i> ${n}</span>`).join('')}</div>`;
}

function dtDesenhar(){
  const root = document.getElementById('dt-root'); if(!root) return;
  let h = dtCabecalho();
  if(DT_ABA === 'como'){ root.innerHTML = h + dtAbaComo(); return; }
  if(!DT_EST || DT_EST.erro){
    root.innerHTML = h + `<div class="al ae"><i class="ti ti-alert-circle"></i><div><b>Não consegui falar com o motor do Day-Trade.</b><br>${esc((DT_EST&&DT_EST.erro)||'')}<br>
      Confira se a pasta da sede (C:\\JeV\\jev-agentes) está no lugar — o botão "Verificar Agentes" do Início mostra onde ela está.</div></div>`; return;
  }
  if(DT_ABA === 'bolsa' || DT_ABA === 'cripto') h += dtAbaMercado(DT_ABA);
  if(DT_ABA === 'lab') h += dtAbaLab();
  if(DT_ABA === 'imposto') h += dtAbaImposto();
  root.innerHTML = h;
}

/* ---- curva de resultado acumulado (SVG simples) ---- */
function dtCurva(diario){
  const ops = (diario||[]).filter(o => o.resultadoBRL != null);
  if(ops.length < 2) return `<div class="tt" style="padding:10px 0">A curva aparece depois das primeiras operações.</div>`;
  let acc = 0; const pts = ops.map(o => (acc += Number(o.resultadoBRL)||0));
  const W = 600, H = 110, mn = Math.min(0, ...pts), mx = Math.max(0, ...pts), rg = (mx - mn) || 1;
  const x = i => (i / (pts.length - 1)) * W, y = v => H - ((v - mn) / rg) * H;
  const d = pts.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const cor = acc >= 0 ? 'var(--green)' : 'var(--red)';
  return `<svg viewBox="0 0 ${W} ${H+4}" style="width:100%;height:120px" preserveAspectRatio="none">
    <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--border)" stroke-dasharray="4 4"/>
    <path d="${d}" fill="none" stroke="${cor}" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>
    <div class="tt">Últimas ${ops.length} operações · acumulado ${dtR(acc)}</div>`;
}

function dtAbaMercado(m){
  const e = DT_EST[m], cripto = m === 'cripto';
  const [nomeFase, clsFase] = DT_FASES[e.fase] || [e.fase,'s-nt'];
  const real = e.fase === 'real' || e.fase === 'real_pequeno';
  let h = '';
  if(e.trava && e.trava.ativa) h += `<div class="al ae" style="margin-top:0"><i class="ti ti-lock"></i><div style="flex:1"><b>Mercado travado:</b> ${esc(e.trava.motivo)}</div>
      <button class="btn xs gh" onclick="dtDestravar('${m}')">Destravar</button></div>`;
  if(real) h += `<div class="al aw" style="margin-top:0"><i class="ti ti-alert-triangle"></i><div><b>Fase real.</b> O motor prepara as ordens e quem executa na corretora é você. Coloque sempre o stop junto (ordem OCO).</div></div>`;
  else h += `<div class="al ai" style="margin-top:0"><i class="ti ti-info-circle"></i><div>Dinheiro <b>fictício</b>. ${cripto?'Preços reais da Binance':'Preços reais do Ibovespa e do dólar, com atraso, espelhando o mini-índice e o mini-dólar'} — o resultado é uma aproximação.</div></div>`;

  h += `<div class="kg" style="margin-bottom:14px">
    <div class="kc pu"><div class="lb"><i class="ti ti-route"></i>Fase</div><div class="vl" style="font-size:18px"><span class="st ${clsFase}">${esc(nomeFase)}</span></div>
      <div class="sb">desde ${dbr(e.faseDesde)} · capital ${moedaK(e.capital)}${real?'':' fictício'}</div></div>
    <div class="kc ${e.dia.resultadoBRL>=0?'gn':'rd'}"><div class="lb"><i class="ti ti-clock"></i>Hoje</div><div class="vl" style="color:${dtCor(e.dia.resultadoBRL)}">${moedaK(e.dia.resultadoBRL)}</div>
      <div class="sb">${e.dia.operacoes} operação(ões) · semana ${moedaK(e.semana.resultadoBRL)}</div></div>
    <div class="kc ${e.mes.resultadoBRL>=0?'gn':'rd'}"><div class="lb"><i class="ti ti-calendar"></i>Mês</div><div class="vl" style="color:${dtCor(e.mes.resultadoBRL)}">${moedaK(e.mes.resultadoBRL)}</div>
      <div class="sb">${e.mes.operacoes} operação(ões) · total ${moedaK(e.total.resultadoBRL)}</div></div>
    <div class="kc ${e.podeAbrir.pode?'gn':'am'}"><div class="lb"><i class="ti ti-shield-lock"></i>Pode entrar agora?</div><div class="vl" style="font-size:18px">${e.podeAbrir.pode?'Sim':'Não'}</div>
      <div class="sb">${esc(e.podeAbrir.pode ? 'travas livres' : e.podeAbrir.motivos[0] || '')}</div></div></div>`;

  /* estratégia */
  const es = e.estrategia;
  h += `<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-target"></i>Estratégia em uso<span class="sp"></span>
      <button class="btn xs gh" onclick="dtComando('ciclo','${m}')"><i class="ti ti-player-play"></i>Rodar ciclo agora</button></div><div class="bd">`;
  if(es){
    const [vn, vc, vd] = DT_VEREDITO[es.veredito] || ['—','s-nt',''];
    const t = es.testeResumo || {};
    h += `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font-size:14px">${esc(dtNomeEst(es.id))}</b><span class="st ${vc}" title="${esc(vd)}">${esc(vn)}</span></div>
      <div class="tt" style="margin-top:4px">${dtParams(es.parametros)} · em uso desde ${dbr(String(es.desde).slice(0,10))}</div>
      <div class="tt" style="margin-top:4px">No teste do laboratório (dados que ela não viu): ${t.operacoes||0} operações, ${dtR(t.resultadoBRL)}, ganhos ${t.fatorLucro!=null?t.fatorLucro:'—'}× as perdas${t.dsr!=null?`, Sharpe deflacionado ${(t.dsr*100).toFixed(0)}%`:''}.</div>`;
  } else {
    h += `<div class="al aw" style="margin:0"><i class="ti ti-alert-triangle"></i><div><b>De fora do mercado.</b> O laboratório ainda não achou uma estratégia que se sustente com custos em dados que ela não viu. Não operar também é decisão — e costuma ser a mais barata.
      <div style="margin-top:6px"><button class="btn xs bl" onclick="dtAba('lab')"><i class="ti ti-flask"></i>Ver o laboratório</button></div></div></div>`;
  }
  h += `</div></div>`;

  /* ordens reais esperando o dono */
  if(real || (e.ordensPendentes||[]).length){
    h += `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-list-check"></i>Ordens para você (${(e.ordensPendentes||[]).length})</div><div class="bd">`;
    h += (e.ordensPendentes||[]).length ? `<table><thead><tr><th>Ativo</th><th>Lado</th><th class="r">Qtd</th><th class="r">Entrada</th><th class="r">Stop</th><th class="r">Alvo</th><th>Situação</th><th></th></tr></thead><tbody>
      ${e.ordensPendentes.map(o=>`<tr><td><b>${esc(o.ativo)}</b><br><span class="tt">${esc(o.motivo||'')}</span></td><td>${esc(o.lado)}</td><td class="r n">${o.qtd}</td>
        <td class="r n">${Number(o.entrada||o.entradaRef).toFixed(2)}</td><td class="r n">${Number(o.stop).toFixed(2)}</td><td class="r n">${Number(o.alvo).toFixed(2)}</td>
        <td>${o.estado==='preparada'?`vale até ${new Date(o.validaAte).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'executada'}</td>
        <td class="r">${o.estado==='preparada'
          ? `<button class="btn xs gn" onclick="dtOrdem('${m}','${o.id}','executada')">Executei</button> <button class="btn xs gh" onclick="dtOrdem('${m}','${o.id}','ignorada')">Não executei</button>`
          : `<button class="btn xs bl" onclick="dtOrdem('${m}','${o.id}','encerrada')">Encerrei</button>`}</td></tr>`).join('')}
      </tbody></table>` : `<div class="tt" style="padding:12px">Nenhuma ordem esperando você.</div>`;
    h += `</div></div>`;
  }

  /* posições simuladas */
  if((e.posicoes||[]).length){
    h += `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-player-play"></i>Posições simuladas abertas</div><div class="bd"><table>
      <thead><tr><th>Ativo</th><th>Lado</th><th class="r">Qtd</th><th class="r">Entrada</th><th class="r">Stop</th><th class="r">Alvo</th><th>Por quê</th></tr></thead><tbody>
      ${e.posicoes.map(p=>`<tr><td><b>${esc(p.ativo)}</b></td><td>${esc(p.lado)}</td><td class="r n">${p.qtd}</td><td class="r n">${Number(p.entrada).toFixed(2)}</td><td class="r n">${Number(p.stop).toFixed(2)}</td><td class="r n">${Number(p.alvo).toFixed(2)}</td><td class="tt">${esc(p.motivo||'')}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }

  /* curva e diário */
  h += `<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-chart-line"></i>Resultado acumulado</div><div class="bd">${dtCurva(e.diario)}</div></div>`;
  const ult = (e.diario||[]).slice(-20).reverse();
  h += `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-history"></i>Últimas operações</div><div class="bd"><table>
    <thead><tr><th>Quando</th><th>Ativo</th><th>Lado</th><th>Saída por</th><th class="c">Tipo</th><th class="r">Resultado</th></tr></thead><tbody>
    ${ult.map(o=>`<tr><td class="n">${dbr(String(o.em).slice(0,10))} ${String(o.em).slice(11,16)}</td><td><b>${esc(o.ativo)}</b></td><td>${esc(o.lado||'')}</td><td class="tt">${esc(o.motivo||'')}</td>
      <td class="c"><span class="st ${o.real?'s-bl':'s-nt'}">${o.real?'real':'simulada'}</span></td><td class="r n"><b style="color:${dtCor(o.resultadoBRL)}">${dtR(o.resultadoBRL)}</b></td></tr>`).join('')
      || `<tr><td colspan="6" class="c tt" style="padding:16px">Nenhuma operação ainda.</td></tr>`}
    </tbody></table></div></div>`;

  /* limites e caminho até o real */
  const L = e.limites, pc = v => (v*100).toFixed(2).replace('.',',') + '%';
  h += `<div class="fr3" style="align-items:start">
    <div class="card" style="grid-column:span 1"><div class="hd"><i class="ti ti-shield-lock"></i>Travas de risco<span class="sp"></span>
      <button class="btn xs gh" onclick="dtFormLimites('${m}')"><i class="ti ti-pencil"></i>Ajustar</button></div><div class="bd">
      ${dtLinha('Risco por operação', pc(L.riscoPorOperacaoPct) + ' do capital')}
      ${dtLinha('Perda máxima do dia', pc(L.perdaMaxDiariaPct) + ' → trava')}
      ${dtLinha('Perda máxima da semana', pc(L.perdaMaxSemanalPct) + ' → trava')}
      ${dtLinha('Operações por dia', L.maxOperacoesDia)}
      ${dtLinha('Posições ao mesmo tempo', L.maxPosicoesAbertas)}
      <div style="margin-top:8px">${e.trava&&e.trava.ativa?'':`<button class="btn xs rd" onclick="dtTravar('${m}')"><i class="ti ti-lock"></i>Travar agora</button>`}</div>
    </div></div>
    <div class="card" style="grid-column:span 2"><div class="hd"><i class="ti ti-route"></i>Caminho até o dinheiro real<span class="sp"></span>
      <button class="btn xs gh" onclick="dtFormFase('${m}')"><i class="ti ti-pencil"></i>Mudar fase</button></div><div class="bd">
      <div class="tt" style="margin-bottom:6px">Para sair da simulação, a estratégia precisa provar ao vivo, com dinheiro fictício:</div>
      ${(e.criteriosReal.itens||[]).map(i=>`<div style="display:flex;gap:8px;align-items:center;padding:3px 0"><i class="ti ti-${i.ok?'check':'x'}" style="color:${i.ok?'var(--green)':'var(--red)'}"></i><span style="font-size:13px">${esc(i.texto)}</span></div>`).join('')}
      <div class="tt" style="margin-top:8px">${e.criteriosReal.atende?'<b style="color:var(--green)">Critérios atendidos.</b> A decisão continua sendo sua.':'Ainda não atende. Ir para o real assim exige você escrever ENTENDO O RISCO.'}</div>
      ${cripto?`<div class="fg" style="margin-top:10px"><label>Onde você opera cripto (muda o imposto)</label><select onchange="dtComando('acao',{acao:'regime_cripto',mercado:'cripto',regime:this.value})">
        <option value="nacional" ${e.regimeCripto!=='exterior'?'selected':''}>Corretora nacional — isento até R$ 35 mil vendidos no mês</option>
        <option value="exterior" ${e.regimeCripto==='exterior'?'selected':''}>Corretora no exterior — 15% sem isenção</option></select></div>`:''}
    </div></div></div>`;

  if((e.avisos||[]).length) h += `<div class="card"><div class="hd"><i class="ti ti-bell"></i>Avisos do motor</div><div class="bd">
    ${e.avisos.slice().reverse().map(a=>`<div class="tt" style="padding:3px 0">${dbr(String(a.em).slice(0,10))} ${String(a.em).slice(11,16)} — ${esc(a.texto)}</div>`).join('')}</div></div>`;
  return h;
}
function dtLinha(r, v){ return `<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--bg3);font-size:13px"><span class="tt">${r}</span><b>${v}</b></div>`; }

/* ---- laboratório ---- */
function dtAbaLab(){
  const L = DT_EST.laboratorio;
  let h = `<div class="al ai" style="margin-top:0"><i class="ti ti-flask"></i><div>Toda semana o laboratório baixa o histórico real e testa as estratégias: escolhe a melhor nos primeiros 2/3 dos dias (<b>treino</b>) e só aprova se ela também ganhar no último 1/3, que ela nunca viu (<b>teste</b>), já pagando custos.
    O limite é de <b>${L.limiteSemana} tentativas por semana</b> por mercado — testar mais do que isso no mesmo histórico fabrica resultado bonito por acaso.</div></div>`;
  for(const m of ['bolsa','cripto']){
    const u = L.ultimo[m], usado = (L.tentativas||{})[m] || 0;
    h += `<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-${m==='bolsa'?'building-bank':'coin'}"></i>${m==='bolsa'?'Bolsa':'Cripto'} · semana ${esc(L.semana||'')} · ${usado}/${L.limiteSemana} tentativas<span class="sp"></span>
      <button class="btn xs bl" onclick="dtLabAgora('${m}')"><i class="ti ti-player-play"></i>Rodar agora</button></div><div class="bd">`;
    if(!u) h += `<div class="tt">Ainda não rodou. Roda sozinho no domingo às 20h, ou agora pelo botão.</div>`;
    else if(u.erro) h += `<div class="al ae" style="margin:0"><i class="ti ti-alert-circle"></i><div>${esc(u.erro)}<div class="tt">${dbr(String(u.em).slice(0,10))}</div></div></div>`;
    else {
      const [vn, vc] = DT_VEREDITO[u.veredito] || ['—','s-nt'];
      h += `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="st ${vc}">${esc(vn)}</span><b>${esc(u.decisao)}</b></div>
        <div class="tt" style="margin:4px 0 8px">Rodou em ${dbr(String(u.em).slice(0,10))} · histórico ${esc(u.periodo)} · ${u.diasTreino} dias de treino, ${u.diasTeste} de teste · ${u.tentativas} variações testadas${u.cortadas?` (${u.cortadas} ficaram para a próxima semana)`:''}</div>
        ${(u.motivos||[]).map(x=>`<div style="font-size:13px;padding:2px 0">${esc(x)}</div>`).join('')}
        <div class="tt" style="margin-top:6px">Simulação ao vivo da estratégia que estava em uso: ${u.aoVivo.operacoes} operações, ${dtR(u.aoVivo.resultadoBRL)}.</div>`;
      if((u.ranking||[]).length) h += `<div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Estratégia</th><th>Parâmetros</th><th class="r">Treino</th><th class="r">Teste</th><th class="r">Ops teste</th><th class="r">Ganho/perda</th></tr></thead><tbody>
        ${u.ranking.slice(0,8).map(r=>`<tr><td>${esc(dtNomeEst(r.estrategia))}${/proposta/.test(r.origem||'')?' <span class="st s-pu">proposta</span>':''}</td><td class="tt">${dtParams(r.parametros)}</td>
          <td class="r n" style="color:${dtCor(r.treino.resultadoBRL)}">${moedaK(r.treino.resultadoBRL)}</td><td class="r n"><b style="color:${dtCor(r.teste.resultadoBRL)}">${moedaK(r.teste.resultadoBRL)}</b></td>
          <td class="r n">${r.teste.operacoes}</td><td class="r n">${Number(r.teste.fatorLucro).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    const cand = (L.candidata||{})[m];
    if(cand) h += `<div class="al aw" style="margin-top:10px"><i class="ti ti-bulb"></i><div style="flex:1"><b>Candidata nova esperando você:</b> ${esc(dtNomeEst(cand.id))} (${dtParams(cand.parametros)}). O mercado está em fase real, então nada troca sozinho.</div>
      <button class="btn xs gn" onclick="dtAplicarCandidata('${m}')">Usar esta</button></div>`;
    h += `</div></div>`;
  }
  const props = L.propostas || [];
  h += `<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-bulb"></i>Ideias dos agentes para a próxima rodada (${props.length})</div><div class="bd">
    ${props.length ? props.map(p=>`<div style="padding:6px 0;border-bottom:1px solid var(--bg3)"><b>${esc(dtNomeEst(p.estrategia))}</b> · ${esc(p.mercado)} · <span class="tt">${dtParams(p.parametros)}</span>
      <div class="tt">${esc(p.motivo||'')} — ${esc(p.de||'')}, ${dbr(String(p.em).slice(0,10))}</div></div>`).join('')
      : '<div class="tt">Nenhuma. O Pesquisador Quant e o Auditor propõem na revisão de segunda-feira, com base no que o laboratório e a simulação mostraram.</div>'}</div></div>`;
  const hist = (L.historico||[]).slice().reverse();
  if(hist.length) h += `<div class="card tw"><div class="hd"><i class="ti ti-history"></i>Histórico das rodadas</div><div class="bd"><table>
    <thead><tr><th>Quando</th><th>Mercado</th><th>Melhor no treino</th><th class="r">Teste</th><th>Decisão</th></tr></thead><tbody>
    ${hist.map(x=>`<tr><td class="n">${dbr(String(x.em).slice(0,10))}</td><td>${esc(x.mercado)}</td><td>${x.melhor?esc(dtNomeEst(x.melhor.estrategia)):'—'}</td>
      <td class="r n">${x.melhor?`<b style="color:${dtCor(x.melhor.teste.resultadoBRL)}">${moedaK(x.melhor.teste.resultadoBRL)}</b>`:'—'}</td><td class="tt">${esc(x.decisao)}</td></tr>`).join('')}</tbody></table></div></div>`;
  return h;
}

/* ---- imposto ---- */
function dtAbaImposto(){
  let h = `<div class="al aw" style="margin-top:0"><i class="ti ti-receipt"></i><div>Estimativa a partir das operações <b>reais</b> que você marcou como encerradas. Confira sempre com a nota de corretagem e, se precisar, com um contador.</div></div>`;
  const b = DT_EST.bolsa.imposto, c = DT_EST.cripto.imposto;
  h += `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-building-bank"></i>Bolsa — ${esc(b.regra)}</div><div class="bd"><table>
    <thead><tr><th>Mês</th><th class="r">Lucro líquido</th><th class="r">Prejuízo compensado</th><th class="r">IR 20%</th><th class="r">IR retido (1%)</th><th class="r">DARF 6015</th><th>Vence</th></tr></thead><tbody>
    ${b.meses.slice().reverse().map(l=>`<tr><td>${esc(l.mes)}</td><td class="r n" style="color:${dtCor(l.lucroLiquidoBRL)}">${dtR(l.lucroLiquidoBRL)}</td><td class="r n">${dtR(l.prejuizoCompensadoBRL)}</td>
      <td class="r n">${dtR(l.irBRL)}</td><td class="r n">${dtR(l.irrfBRL)}</td><td class="r n"><b>${dtR(l.darfBRL)}</b>${l.acumulaProximoBRL?`<br><span class="tt">abaixo de R$ 10: soma no próximo</span>`:''}</td><td class="n">${l.vencimento?dbr(l.vencimento):'—'}</td></tr>`).join('')
      || `<tr><td colspan="7" class="c tt" style="padding:14px">Nenhuma operação real ainda.</td></tr>`}</tbody></table></div></div>`;
  h += `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-coin"></i>Cripto — ${esc(c.regra)}</div><div class="bd"><table>
    <thead><tr><th>Mês</th><th class="r">Vendido</th><th class="r">Resultado</th><th class="r">Imposto</th><th>Observação</th></tr></thead><tbody>
    ${c.meses.slice().reverse().map(l=>`<tr><td>${esc(l.mes)}</td><td class="r n">${dtR(l.vendidoBRL)}</td><td class="r n" style="color:${dtCor(l.resultadoLiquidoBRL)}">${dtR(l.resultadoLiquidoBRL)}</td><td class="r n"><b>${dtR(l.impostoBRL)}</b></td><td class="tt">${esc(l.obs)}</td></tr>`).join('')
      || `<tr><td colspan="5" class="c tt" style="padding:14px">Nenhuma operação real ainda.</td></tr>`}</tbody></table></div></div>`;
  const sb = DT_EST.bolsa.impostoSeFosseReal, sc = DT_EST.cripto.impostoSeFosseReal;
  h += `<div class="card"><div class="hd"><i class="ti ti-calculator"></i>Se a simulação deste mês fosse real</div><div class="bd">
    ${dtLinha('Bolsa: DARF estimado', sb ? dtR(sb.darfBRL) + ` sobre ${dtR(sb.lucroLiquidoBRL)} de resultado` : 'sem operações no mês')}
    ${dtLinha('Cripto: imposto estimado', sc ? dtR(sc.impostoBRL) + ` — ${esc(sc.obs)}` : 'sem operações no mês')}
    <div class="tt" style="margin-top:6px">Serve para você ver quanto do lucro fica com a Receita antes de decidir ir para o real.</div></div></div>`;
  return h;
}

/* ---- como funciona (texto fixo, também no navegador) ---- */
function dtAbaComo(){
  const it = (t, x) => `<div style="padding:6px 0;border-bottom:1px solid var(--bg3)"><b>${t}</b><div style="font-size:13px">${x}</div></div>`;
  return `<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-alert-triangle"></i>A verdade antes de tudo</div><div class="bd">
    ${it('A maioria perde', 'Estudo da FGV com dados da CVM: de quem fez day trade de mini-índice por mais de 300 pregões, 91% teve prejuízo; só 13 de 1.558 pessoas ganharam mais de R$ 300 por dia. Na pandemia, quase 1 milhão de pessoas perderam juntas R$ 9,9 bilhões.')}
    ${it('Em cripto também', 'O Banco de Compensações Internacionais (BIS) estimou que cerca de três em cada quatro investidores de varejo perderam dinheiro com Bitcoin.')}
    ${it('IA não é atalho', 'Testes ao vivo de agentes de IA operando mostraram que nota alta em ranking não vira lucro, e frotas de agentes com dinheiro real ficaram atrás da referência.')}
    ${it('Por isso este módulo', 'Ninguém aqui promete lucro. O sistema só deixa uma estratégia avançar depois de provar com números, corta o prejuízo antes que cresça e fica de fora quando não há vantagem medida.')}
  </div></div>
  <div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-route"></i>As quatro fases</div><div class="bd">
    ${it('1. Laboratório', 'Toda semana testa as estratégias no histórico real, com custos: escolhe no treino e só aprova se ganhar também no teste, em dias que ela nunca viu. No máximo 45 tentativas por semana por mercado.')}
    ${it('2. Simulação ao vivo', 'A estratégia aprovada opera com dinheiro fictício, em tempo real, a cada 15 minutos. Se ao vivo ela for bem pior que no teste, era sorte — o Auditor avisa.')}
    ${it('3. Real pequeno', 'Só você liga. Precisa de pelo menos 30 operações simuladas em 20 dias, ganhos de 1,2× as perdas e resultado positivo — ou você escreve ENTENDO O RISCO. O motor prepara a ordem; você executa na corretora.')}
    ${it('4. Real', 'Mesmas regras, com o capital que você definir.')}
  </div></div>
  <div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-shield-lock"></i>Travas que nenhum agente afrouxa</div><div class="bd">
    ${it('Por operação', 'Perde no máximo 0,75% do capital se o stop for atingido (você pode mudar).')}
    ${it('Por dia e por semana', 'Perdeu 2,5% no dia ou 6% na semana: o mercado trava até você destravar.')}
    ${it('Agentes', 'Podem travar e apertar limites. Afrouxar, destravar trava de perda e colocar dinheiro real é só você.')}
    ${it('Day trade de verdade', 'Toda posição é zerada no fim do dia. Na bolsa, antes do fim do pregão; na cripto, no fim do dia.')}
  </div></div>
  <div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-receipt"></i>Custos e imposto (2026)</div><div class="bd">
    ${it('Bolsa', 'Day trade paga 20% sobre o lucro líquido do mês, sem isenção, por DARF 6015. Mini-índice: margem mínima de R$ 155 por contrato; emolumentos e taxa de registro na entrada e na saída.')}
    ${it('Cripto em corretora nacional', 'Isento se vender até R$ 35 mil no mês; acima disso, 15% sobre o ganho.')}
    ${it('Cripto em corretora no exterior', '15% sobre o ganho, sem isenção.')}
    ${it('Corretoras de cripto', 'Desde fevereiro de 2026 precisam de autorização do Banco Central para atender no Brasil.')}
  </div></div>
  <div class="card"><div class="hd"><i class="ti ti-users"></i>A equipe na sede</div><div class="bd">
    ${it('Gerente de Day-Trade', 'Coordena e entrega ao Comandante o resumo semanal com números.')}
    ${it('Analista de Bolsa e Analista de Cripto', 'Agenda de eventos que mexem com o preço e explicação do que a simulação fez.')}
    ${it('Pesquisador Quant', 'Aperfeiçoamento contínuo: propõe até 5 variações por semana, com evidência, para o laboratório testar.')}
    ${it('Gestão de Risco', 'Trava e aperta limites quando o risco sobe.')}
    ${it('Preparador de Ordens', 'Nas fases reais, monta a ficha de cada ordem para você executar.')}
    ${it('Auditor de Desempenho', 'Compara teste com simulação ao vivo e com não ter feito nada; diz quando é hora de ficar de fora.')}
  </div></div>`;
}

/* ---------------------------------------------------------- ações do dono */
async function dtComando(cmd, arg){
  if(DT_OCUPADO){ toast('O motor ainda está trabalhando…','aw'); return; }
  DT_OCUPADO = true; toast(cmd === 'laboratorio' ? 'Laboratório rodando — pode levar alguns minutos…' : 'Falando com o motor…', 'ai');
  const r = await dtPedir(cmd, arg); DT_OCUPADO = false;
  const erro = r && (r.erro || (r.ok === false && r.erro));
  if(erro){ toast(erro, 'ae'); }
  else if(cmd === 'ciclo') toast((r.log && r.log.length) ? r.log.slice(-1)[0] : 'Ciclo feito: nada a fazer agora.', 'ag');
  else if(cmd === 'laboratorio'){ const x = r[arg] || r; toast(x.ok === false ? x.erro : ('Laboratório: ' + (x.decisao || 'pronto')), x.ok === false ? 'aw' : 'ag'); }
  else toast((r && r.msg) || 'Feito.', 'ag');
  await dtCarregar(); dtDesenhar();
  return r;
}
function dtTravar(m){ confirmar('Travar ' + m, 'Nenhuma entrada nova até você destravar. Posições abertas seguem com stop e alvo.', () => dtComando('acao', { acao:'travar', mercado:m, motivo:'travado pelo dono no JeV' })); }
function dtDestravar(m){ confirmar('Destravar ' + m, 'O mercado volta a aceitar entradas, dentro das travas de risco. Se a trava foi por perda, pense se o motivo passou.', () => dtComando('acao', { acao:'destravar', mercado:m })); }
function dtLabAgora(m){
  const usado = ((DT_EST && DT_EST.laboratorio.tentativas) || {})[m] || 0;
  confirmar('Rodar o laboratório agora', `Baixa o histórico real e testa as estratégias de ${m}. Usa tentativas do limite da semana (${usado} de ${DT_EST.laboratorio.limiteSemana} já usadas). Pode levar alguns minutos.`, () => dtComando('laboratorio', m));
}
function dtAplicarCandidata(m){ confirmar('Trocar a estratégia', 'O mercado está em fase real: a partir de agora as ordens preparadas para você seguem a estratégia nova.', () => dtComando('acao', { acao:'aplicar_candidata', mercado:m })); }

function dtOrdem(m, id, estado){
  const o = (DT_EST[m].ordensPendentes||[]).find(x => x.id === id); if(!o) return;
  if(estado === 'ignorada') return dtComando('acao', { acao:'ordem_ignorada', mercado:m, id });
  const exec = estado === 'executada';
  modal(exec ? 'Anotar ordem executada' : 'Anotar saída da operação', 'ti-list-check',
    `<div class="tt" style="margin-bottom:8px">${esc(o.lado)} ${o.qtd} de <b>${esc(o.ativo)}</b> · stop ${Number(o.stop).toFixed(2)} · alvo ${Number(o.alvo).toFixed(2)}</div>
     <div class="fr3"><div class="fg"><label>${exec?'Preço em que executou':'Preço de saída'}</label><input id="dto-preco" type="number" step="0.0001" value="${exec?Number(o.entradaRef).toFixed(2):''}"></div>
     ${exec?`<div class="fg"><label>Quantidade</label><input id="dto-qtd" type="number" step="0.00000001" value="${o.qtd}"></div>`:`<div class="fg"><label>Resultado da nota (opcional)</label><input id="dto-res" type="number" step="0.01" placeholder="em branco = calcular"></div>`}</div>
     <div class="hint">${exec?'Só anote se você realmente executou na sua corretora.':'O resultado vai para o diário e para a conta do imposto.'}</div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="dtOrdemSalvar('${m}','${id}','${estado}')"><i class="ti ti-device-floppy"></i>Anotar</button>`);
}
async function dtOrdemSalvar(m, id, estado){
  const preco = num(val('dto-preco')); if(!(preco > 0)){ toast('Informe o preço.','aw'); return; }
  const a = { acao: estado === 'executada' ? 'ordem_executada' : 'ordem_encerrada', mercado:m, id, preco };
  if(estado === 'executada') a.qtd = num(val('dto-qtd'));
  else { const r = val('dto-res'); if(r !== '') a.resultadoBRL = num(r); }
  closeModal('mk-form'); await dtComando('acao', a);
}

function dtFormLimites(m){
  const L = DT_EST[m].limites, p = v => +(v*100).toFixed(3);
  modal('Travas de risco — ' + m, 'ti-shield-lock',
    `<div class="fr3">
      <div class="fg"><label>Risco por operação (%)</label><input id="dtl-r" type="number" step="0.05" value="${p(L.riscoPorOperacaoPct)}"></div>
      <div class="fg"><label>Perda máxima do dia (%)</label><input id="dtl-d" type="number" step="0.1" value="${p(L.perdaMaxDiariaPct)}"></div>
      <div class="fg"><label>Perda máxima da semana (%)</label><input id="dtl-s" type="number" step="0.1" value="${p(L.perdaMaxSemanalPct)}"></div></div>
     <div class="fr3">
      <div class="fg"><label>Operações por dia</label><input id="dtl-o" type="number" min="1" value="${L.maxOperacoesDia}"></div>
      <div class="fg"><label>Posições ao mesmo tempo</label><input id="dtl-p" type="number" min="1" value="${L.maxPosicoesAbertas}"></div>
      <div class="fg"><label>Capital da simulação (R$)</label><input id="dtl-c" type="number" step="100" value="${DT_EST[m].capitalSimulacao}"></div></div>
     <div class="hint">Risco por operação acima de 3% não é aceito. Quem passa de 1% por operação costuma quebrar numa sequência ruim normal.</div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="dtSalvarLimites('${m}')"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function dtSalvarLimites(m){
  const lim = { riscoPorOperacaoPct: num(val('dtl-r'))/100, perdaMaxDiariaPct: num(val('dtl-d'))/100, perdaMaxSemanalPct: num(val('dtl-s'))/100,
                maxOperacoesDia: num(val('dtl-o')), maxPosicoesAbertas: num(val('dtl-p')) };
  const cap = num(val('dtl-c'));
  closeModal('mk-form');
  await dtComando('acao', { acao:'limites', mercado:m, limites:lim });
  if(cap !== DT_EST[m].capitalSimulacao) await dtComando('acao', { acao:'capital_simulacao', mercado:m, valor:cap });
}

function dtFormFase(m){
  const e = DT_EST[m];
  modal('Fase do mercado — ' + m, 'ti-route',
    `<div class="fg"><label>Fase</label><select id="dtf-f" onchange="document.getElementById('dtf-real').style.display=/real/.test(this.value)?'':'none'">
      ${Object.entries(DT_FASES).map(([k,[n]])=>`<option value="${k}" ${e.fase===k?'selected':''}>${n}</option>`).join('')}</select></div>
     <div id="dtf-real" style="${/real/.test(e.fase)?'':'display:none'}">
      <div class="al aw"><i class="ti ti-alert-triangle"></i><div>Dinheiro de verdade. O motor prepara as ordens e <b>você</b> executa na corretora, sempre com o stop junto. A maioria das pessoas físicas perde no day trade.</div></div>
      <div class="fr3"><div class="fg"><label>Capital real que aceito arriscar (R$)</label><input id="dtf-cap" type="number" step="100" value="${e.capitalReal||''}"></div>
      <div class="fg" style="grid-column:span 2"><label>${e.criteriosReal.atende?'Confirmação (opcional)':'A simulação ainda não provou: escreva ENTENDO O RISCO'}</label><input id="dtf-ok" placeholder="ENTENDO O RISCO"></div></div></div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="dtSalvarFase('${m}')"><i class="ti ti-device-floppy"></i>Mudar</button>`);
}
async function dtSalvarFase(m){
  const fase = val('dtf-f'); const a = { acao:'fase', mercado:m, fase };
  if(/real/.test(fase)){ a.capitalRealBRL = num(val('dtf-cap')); a.cienteDoRisco = String(val('dtf-ok')||'').trim().toUpperCase(); }
  closeModal('mk-form'); await dtComando('acao', a);
}

/* =========================================================================
   CONTROLE — a equipe de agentes, vista de dentro do sistema

   NÃO CONFUNDIR COM "VIGIAS". Vigias são vinte leituras do seu próprio
   banco, que apontam conta vencida e etapa atrasada. Aqui é outra coisa:
   são os agentes de IA que EXECUTAM trabalho na sua máquina — Radar,
   Roteirista, Produtor, Guardião — cada um com rotina, tarefa e horário.

   DE ONDE VEM O QUE APARECE AQUI
   ------------------------------
   Da pasta workspace/ do Mission Control, que é a fonte de verdade. Esta
   tela LÊ; quem escreve são os agentes. O sistema não guarda uma cópia:
   guardar cópia criaria duas verdades, e um dia ninguém saberia qual vale.

   DUAS PONTES, PORQUE SÃO DOIS MUNDOS
   -----------------------------------
   1. No aplicativo instalado: JeVDesktop.ctl* → o módulo desktop/controle.js
      lê os arquivos direto do disco. É o caminho normal.
   2. No navegador: fetch em http://127.0.0.1:3020 — o server.js do painel
      avulso, que responde com CORS liberado para a máquina local.
   Nenhuma das duas existindo, a tela DIZ isso e ensina como ligar. Tela em
   branco sem explicação é o pior defeito que um painel pode ter.

   O QUE ESTA TELA NÃO FAZ
   -----------------------
   Não publica em plataforma nenhuma. Não cria agente sozinha. Não apaga
   nada. Os únicos dois comandos que ela tem são mudar a etapa de uma
   tarefa e mandar uma rotina rodar agora — e os dois pedem confirmação.
   ========================================================================= */

const CTL_URL = 'http://127.0.0.1:3020';

const CTL = {aba:'painel', dados:null, carregando:false, erro:'', arquivo:null};

const CTL_ABAS = [
  ['painel',   'Painel',   'ti-layout-grid'],
  ['agentes',  'Agentes',  'ti-users'],
  ['tarefas',  'Tarefas',  'ti-list-check'],
  ['rotinas',  'Rotinas',  'ti-clock'],
  ['projetos', 'Projetos', 'ti-target'],
  ['esteira',  'Esteira',  'ti-arrow-right'],
  ['memorias', 'Memórias', 'ti-bulb'],
  ['docs',     'Documentos', 'ti-file-text'],
];

/* estado do agente → como mostrar. O vocabulário é o do workspace; traduzir
   aqui evita espalhar string solta pela tela inteira. */
const CTL_STATUS = {
  online:  {rot:'De pé',      pill:'s-ok', ic:'ti-circle-check'},
  busy:    {rot:'Trabalhando',pill:'s-pd', ic:'ti-player-play'},
  idle:    {rot:'Parado',     pill:'s-nt', ic:'ti-clock'},
  paused:  {rot:'Pausado',    pill:'s-wn', ic:'ti-x'},
  offline: {rot:'Desligado',  pill:'s-nt', ic:'ti-x'},
  error:   {rot:'Com erro',   pill:'s-bl', ic:'ti-alert-triangle'},
};
const CTL_ETAPAS = {
  backlog:     'Na fila',
  planejada:   'Planejada',
  em_execucao: 'Em execução',
  revisao:     'Esperando você',
  bloqueada:   'Travada',
  concluida:   'Pronta',
};

/* ------------------------------------------------------------- a ponte */
function ctlNoApp(){ return !!(window.JeVDesktop && window.JeVDesktop.ctlEstado); }

/* No aplicativo vai pelo módulo; no navegador tenta o servidor do painel.
   O `fetch` leva um prazo curto: servidor desligado tem de falhar rápido e
   virar explicação, não deixar a tela girando. */
async function ctlPedir(caminho, opc){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), 2500);
  try {
    const r = await fetch(CTL_URL + caminho, {...(opc||{}), signal:ctrl.signal});
    const txt = await r.text();
    let corpo = {};
    try { corpo = txt ? JSON.parse(txt) : {}; } catch { throw new Error('resposta que não é JSON'); }
    if(!r.ok) throw new Error(corpo.error || ('erro ' + r.status));
    return corpo;
  } finally { clearTimeout(t); }
}

async function ctlEstado(){
  if(ctlNoApp()) return await window.JeVDesktop.ctlEstado();
  try {
    const s = await ctlPedir('/api/state');
    return {disponivel:true, pelaWeb:true, ...s};
  } catch(e){
    return {disponivel:false, pelaWeb:true, motivo:e.message};
  }
}
async function ctlMudarTarefa(id, dados){
  if(ctlNoApp()) return await window.JeVDesktop.ctlMudarTarefa(id, dados);
  return await ctlPedir('/api/tasks/'+encodeURIComponent(id),
    {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(dados)});
}
async function ctlMudarRotina(id, dados){
  if(ctlNoApp()) return await window.JeVDesktop.ctlMudarRotina(id, dados);
  return await ctlPedir('/api/cron/'+encodeURIComponent(id),
    {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(dados)});
}
async function ctlRodarAgora(id){
  if(ctlNoApp()) return await window.JeVDesktop.ctlRodarAgora(id);
  return await ctlPedir('/api/cron/'+encodeURIComponent(id)+'/run', {method:'POST'});
}
async function ctlArquivo(rel){
  if(ctlNoApp()) return await window.JeVDesktop.ctlArquivo(rel);
  return await ctlPedir('/api/file?path='+encodeURIComponent(rel));
}

/* ------------------------------------------------------------- ajudas */
function ctlQuando(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(isNaN(d)) return String(iso);
  const min = Math.round((Date.now() - d.getTime())/60000);
  if(min < 1)    return 'agora';
  if(min < 60)   return `há ${min} min`;
  if(min < 1440) return `há ${Math.round(min/60)} h`;
  return d.toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
}
function ctlFuturo(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(isNaN(d)) return String(iso);
  const min = Math.round((d.getTime() - Date.now())/60000);
  if(min < 0)  return 'passou';
  if(min < 60) return `em ${min} min`;
  if(min < 1440) return `em ${Math.round(min/60)} h`;
  return d.toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
}
function ctlAgenteNome(d, id){
  const a = ((d.agents && d.agents.agents) || []).find(x=>x.id===id);
  return a ? a.name : (id || '—');
}

/* o que exige o dono: tarefa esperando ele, tarefa travada, agente com erro.
   É este número que aparece no botão do menu. */
function ctlPendencias(d){
  if(!d || !d.disponivel) return 0;
  const tarefas = (d.tasks && d.tasks.tasks) || [];
  const agentes = (d.agents && d.agents.agents) || [];
  return tarefas.filter(t=>['revisao','bloqueada'].includes(t.stage)).length
       + agentes.filter(a=>a.status==='error').length;
}

async function ctlBadge(){
  const el = document.querySelector('[data-ctl-badge]');
  if(!el) return;
  let n = 0;
  try { n = ctlPendencias(await ctlEstado()); } catch { n = 0; }
  el.textContent = n > 99 ? '99+' : String(n);
  el.classList.toggle('hide', n === 0);
}

/* ======================================================== A TELA ====== */
async function controleRender(){
  const root = document.getElementById('ctl-root');
  root.innerHTML = `<div class="card"><div class="bd"><div class="empty">
    <i class="ti ti-refresh"></i><b>Falando com o Controle…</b></div></div></div>`;

  const d = await ctlEstado();
  CTL.dados = d;

  if(!d.disponivel){ root.innerHTML = ctlSemControle(d); return; }

  const pend = ctlPendencias(d);
  let h = `<div class="ph">
      <div class="ic" style="background:var(--brand-bg);color:var(--brand)"><i class="ti ti-settings-automation"></i></div>
      <div><h1>Controle</h1>
        <p>A equipe de agentes que trabalha na máquina${d.pasta?' · '+esc(d.pasta):''}</p></div>
      <div class="sp"></div>
      <button class="btn gh" onclick="controleRender()"><i class="ti ti-refresh"></i>Atualizar</button>
      <button class="btn gh" onclick="ctlAbrir3D()"><i class="ti ti-external-link"></i>Escritório 3D</button>
      ${ctlNoApp()?`<button class="btn gh" onclick="ctlTrocarPasta()"><i class="ti ti-folder"></i>Pasta</button>`:''}
    </div>`;

  if((d.errors||[]).length){
    h += `<div class="card"><div class="bd" style="border-left:4px solid var(--red)">
      <b style="color:var(--red)">Arquivo do workspace com problema:</b>
      <div class="tt" style="margin-top:6px;line-height:1.6">${d.errors.map(esc).join('<br>')}</div>
    </div></div>`;
  }
  if(pend){
    h += `<div class="al aw" style="margin-bottom:14px"><i class="ti ti-bell-ringing"></i>
      <div><b>${pend} ${pend>1?'coisas esperam':'coisa espera'} por você.</b>
      Tarefa parada em revisão, tarefa travada ou agente com erro — está na aba Tarefas.</div></div>`;
  }

  h += `<div class="chips">${CTL_ABAS.map(([v,rot,ic])=>
    `<div class="chip ${CTL.aba===v?'on':''}" onclick="ctlAba('${v}')">
      <i class="ti ${ic}"></i> ${rot}</div>`).join('')}</div>`;

  const pintar = {painel:ctlPainel, agentes:ctlAgentes, tarefas:ctlTarefas,
                  rotinas:ctlRotinas, projetos:ctlProjetos, esteira:ctlEsteira,
                  memorias:ctlMemorias, docs:ctlDocs};
  h += (pintar[CTL.aba] || ctlPainel)(d);

  root.innerHTML = h;
  ctlBadge();
}

function ctlAba(v){ CTL.aba = v; CTL.arquivo = null; controleRender(); }

/* ------------------------------------------- quando não há Controle --- */
/* Esta tela é a mais importante do módulo. Painel que não liga e não
   explica vira chamado de suporte; painel que não liga e ensina a ligar
   resolve sozinho. */
function ctlSemControle(d){
  const app = ctlNoApp();
  return `<div class="ph">
      <div class="ic" style="background:var(--bg4);color:var(--text2)"><i class="ti ti-settings-automation"></i></div>
      <div><h1>Controle</h1><p>A equipe de agentes que trabalha na máquina</p></div>
    </div>
    <div class="card"><div class="bd">
      <div class="al aw"><i class="ti ti-alert-triangle"></i>
        <div><b>O Controle não está respondendo.</b><br>
        ${esc(d.motivo || 'motivo não informado')}</div></div>

      <div style="margin-top:16px;line-height:1.75;font-size:13.5px">
        <b>O que é isto.</b> O Controle mostra a equipe de agentes que trabalha na sua
        máquina — quem está de pé, o que cada um está fazendo, quais rotinas rodam e a
        que horas. Essa equipe mora numa pasta chamada <b>MissionControl</b>, fora do
        sistema. É de propósito: assim o painel avulso e o JeV leem exatamente a mesma
        coisa, e não existem duas verdades.
      </div>

      <div style="margin-top:15px">
        <b style="font-size:13.5px">Para ligar</b>
        <div class="tt" style="margin-top:7px;line-height:1.75">
        ${app
          ? `1. Confira se a pasta <b>MissionControl</b> está no lugar. Se você a moveu,
             clique em <b>Apontar a pasta</b> aqui embaixo e escolha onde ela está.<br>
             2. Se a pasta sumiu, ela pode ser restaurada do backup do Guardião — os
             backups antigos ficam em <b>_antigos</b> e nada é apagado.`
          : `Você está vendo o sistema pelo navegador, e o navegador não lê pasta do disco.
             Há dois caminhos:<br>
             1. Abrir o JeV pelo <b>aplicativo instalado</b> — é o caminho normal, e aí o
             Controle lê a pasta direto.<br>
             2. Ou ligar o painel avulso (o <b>INICIAR.bat</b> dentro da pasta
             MissionControl) e recarregar esta tela: ele responde em
             <span class="mono">127.0.0.1:3020</span>.`}
        </div>
      </div>

      <div class="brow">
        <button class="btn gh" onclick="controleRender()"><i class="ti ti-refresh"></i>Tentar de novo</button>
        ${app?`<button class="btn" onclick="ctlTrocarPasta()"><i class="ti ti-folder"></i>Apontar a pasta</button>`:''}
      </div>
    </div></div>`;
}

async function ctlTrocarPasta(){
  if(!ctlNoApp()){ toast('Só o aplicativo instalado consegue escolher pasta.','aw'); return; }
  try {
    const r = await window.JeVDesktop.ctlEscolherPasta();
    if(r && r.cancelado) return;
    if(r && r.ok) toast('Pasta apontada. Lendo o Controle de novo.','ag');
    else toast((r && r.motivo) || 'não consegui usar essa pasta','ae');
  } catch(e){ toast(e.message,'ae'); }
  controleRender();
}

async function ctlAbrir3D(){
  /* o 3D vive no painel avulso: o Three.js pesa 691 KB e embutir faria a
     família baixar isso em toda atualização do sistema, para ver bonequinho */
  if(ctlNoApp()){
    try {
      const r = await window.JeVDesktop.ctlSubirServidor();
      if(!r || !r.ok){ toast((r&&r.motivo)||'não consegui subir o painel','ae'); return; }
    } catch(e){ toast(e.message,'ae'); return; }
  }
  window.open(CTL_URL, '_blank');
}

/* ------------------------------------------------------------- painel */
function ctlPainel(d){
  const ag = (d.agents && d.agents.agents) || [];
  const tf = (d.tasks && d.tasks.tasks) || [];
  const jb = (d.cron && d.cron.jobs) || [];
  const dePe   = ag.filter(a=>['online','busy'].includes(a.status)).length;
  const comErro= ag.filter(a=>a.status==='error').length;
  const emExec = tf.filter(t=>t.stage==='em_execucao').length;
  const espera = tf.filter(t=>['revisao','bloqueada'].includes(t.stage)).length;
  const ligadas= jb.filter(j=>j.enabled).length;
  const proxima= jb.filter(j=>j.enabled && j.nextRun).sort((a,b)=>String(a.nextRun).localeCompare(String(b.nextRun)))[0];

  let h = `<div class="kg">
    ${ctlKpi('Agentes de pé', dePe+' de '+ag.length, comErro?comErro+' com erro':'nenhum com erro', comErro?'var(--red)':'var(--green)')}
    ${ctlKpi('Em execução', emExec, 'tarefas andando agora', 'var(--blue)')}
    ${ctlKpi('Esperando você', espera, 'revisão ou travada', espera?'var(--amber)':'var(--text3)')}
    ${ctlKpi('Rotinas ligadas', ligadas+' de '+jb.length, proxima?('próxima '+ctlFuturo(proxima.nextRun)):'nenhuma agendada', 'var(--brand)')}
  </div>`;

  if(d.status){
    h += `<div class="card"><div class="hd"><i class="ti ti-file-text"></i>O dia, pelo Guardião
      <span class="sp"></span><span class="tt">STATUS.md</span></div>
      <div class="bd"><div class="mono" style="white-space:pre-wrap;font-size:12.5px;line-height:1.65">${esc(d.status)}</div></div></div>`;
  }

  const recentes = tf.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,5);
  if(recentes.length){
    h += `<div class="card"><div class="hd"><i class="ti ti-history"></i>Mexeram nisto por último</div><div class="bd">
      ${recentes.map(t=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border)">
        <span class="st ${ctlPillEtapa(t.stage)}">${esc(CTL_ETAPAS[t.stage]||t.stage)}</span>
        <div style="flex:1;min-width:180px">
          <div style="font-weight:620;font-size:13.5px">${esc(t.title||t.id)}</div>
          <div class="tt">${esc(ctlAgenteNome(d,t.owner))} · ${ctlQuando(t.updatedAt)}</div>
        </div></div>`).join('')}
    </div></div>`;
  }
  return h;
}
function ctlKpi(lb, vl, sb, cor){
  return `<div class="kc"><div class="lb">${esc(lb)}</div>
    <div class="vl" style="color:${cor}">${esc(String(vl))}</div>
    <div class="sb">${esc(sb)}</div></div>`;
}
function ctlPillEtapa(e){
  return {concluida:'s-ok', em_execucao:'s-pd', revisao:'s-wn',
          bloqueada:'s-bl', planejada:'s-br', backlog:'s-nt'}[e] || 's-nt';
}

/* ------------------------------------------------------------ agentes */
function ctlAgentes(d){
  const ag = (d.agents && d.agents.agents) || [];
  const hb = (d.heartbeat && d.heartbeat.agents) || {};
  const limite = (d.heartbeat && d.heartbeat.staleAfterMinutes) || 60;
  if(!ag.length) return ctlVazio('Nenhum agente cadastrado ainda.','ti-users');
  return `<div class="kg" style="grid-template-columns:repeat(auto-fill,minmax(310px,1fr))">
    ${ag.map(a=>{
      const s = CTL_STATUS[a.status] || CTL_STATUS.offline;
      const bat = hb[a.id];
      /* batimento velho é sinal de agente morto sem ninguém ter percebido */
      const velho = bat && bat.lastSeen &&
        ((Date.now() - new Date(bat.lastSeen).getTime())/60000 > limite);
      const st = a.stats || {};
      return `<div class="card" style="border-left:4px solid ${esc(a.color||'var(--brand)')}"><div class="bd">
        <div style="display:flex;align-items:center;gap:9px">
          <div style="width:11px;height:11px;border-radius:50%;background:${esc(a.color||'#888')};flex:none"></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14.5px">${esc(a.name||a.id)}</div>
            <div class="tt">${esc(a.role||'')}</div>
          </div>
          <span class="st ${s.pill}">${s.rot}</span>
        </div>
        ${a.description?`<div class="tt" style="margin-top:9px;line-height:1.55">${esc(a.description)}</div>`:''}
        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
          ${(a.skills||[]).slice(0,4).map(k=>`<span class="st s-nt">${esc(k)}</span>`).join('')}
        </div>
        <div class="tt" style="margin-top:10px;line-height:1.7">
          ${a.currentTask?`Agora em <b>${esc(a.currentTask)}</b><br>`:''}
          Último sinal de vida: ${ctlQuando(a.lastHeartbeat)}
          ${velho?` <span style="color:var(--red)">— passou de ${limite} min sem dar sinal</span>`:''}<br>
          ${num(st.tasksDone)||0} concluídas · ${num(st.tasksFailed)||0} com falha
        </div>
      </div></div>`;
    }).join('')}</div>`;
}

/* ------------------------------------------------------------ tarefas */
function ctlTarefas(d){
  const tf = (d.tasks && d.tasks.tasks) || [];
  if(!tf.length) return ctlVazio('Nenhuma tarefa na lista.','ti-list-check');
  const ordem = ['bloqueada','revisao','em_execucao','planejada','backlog','concluida'];
  const lista = tf.slice().sort((a,b)=>
    (ordem.indexOf(a.stage)-ordem.indexOf(b.stage)) ||
    String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  return lista.map(t=>{
    const p = clamp(num(t.progress),0,100);
    return `<div class="card"><div class="bd">
      <div style="display:flex;gap:11px;align-items:flex-start;flex-wrap:wrap">
        <span class="st ${ctlPillEtapa(t.stage)}">${esc(CTL_ETAPAS[t.stage]||t.stage)}</span>
        <div style="flex:1;min-width:240px">
          <div style="font-weight:680;font-size:14px;line-height:1.35">${esc(t.title||t.id)}</div>
          <div class="tt" style="margin-top:3px">${esc(t.id)} · ${esc(ctlAgenteNome(d,t.owner))}
            ${t.eta?' · prazo '+ctlFuturo(t.eta):''} · mexido ${ctlQuando(t.updatedAt)}</div>
        </div>
        <button class="btn gh sm" onclick="ctlMoverTarefa('${esc(t.id)}')">
          <i class="ti ti-arrow-right"></i>Mudar etapa</button>
      </div>
      <div class="pb" style="margin-top:10px"><div class="pf" style="width:${p}%"></div></div>
      <div class="tt" style="margin-top:4px">${p}%</div>
      ${t.evidence?`<div style="margin-top:10px;background:var(--bg3);border-radius:var(--radius);
        padding:10px 12px;font-size:12.5px;line-height:1.6">
        <b>De onde saiu o número:</b> ${esc(t.evidence)}</div>`:
        (t.stage==='em_execucao'?`<div class="tt" style="margin-top:10px;color:var(--amber)">
          Em execução sem evidência registrada — o agente devia ter dito onde está o resultado.</div>`:'')}
      ${t.blockedBy?`<div class="al ae" style="margin-top:10px"><i class="ti ti-alert-triangle"></i>
        <div><b>Travada:</b> ${esc(t.blockedBy)}</div></div>`:''}
      ${t.nextStep?`<div class="tt" style="margin-top:8px"><b>Próximo passo:</b> ${esc(t.nextStep)}</div>`:''}
    </div></div>`;
  }).join('');
}

function ctlMoverTarefa(id){
  const t = ((CTL.dados.tasks && CTL.dados.tasks.tasks) || []).find(x=>x.id===id);
  if(!t) return;
  /* a escolha vem ANTES do pedido: um clique só, nada de mandar e perguntar
     depois. É isso que impede uma tarefa mudar de etapa por engano. */
  modal('Mudar a etapa de '+t.id, 'ti-arrow-right',
    `<div style="font-size:13.5px;line-height:1.6;margin-bottom:12px">${esc(t.title||'')}</div>
     ${Object.entries(CTL_ETAPAS).map(([k,rot])=>
       `<div onclick="ctlAplicarEtapa('${esc(id)}','${k}')"
          style="display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:var(--radius);
          cursor:pointer;border:1px solid var(--border);margin-bottom:7px;
          ${t.stage===k?'background:var(--bg3);font-weight:700':''}">
          <span class="st ${ctlPillEtapa(k)}">${rot}</span>
          ${t.stage===k?'<span class="tt">é a de agora</span>':''}
        </div>`).join('')}`, null, 'sm');
}
async function ctlAplicarEtapa(id, etapa){
  closeModal('mk-form');
  try {
    await ctlMudarTarefa(id, {stage:etapa});
    toast('Etapa alterada.','ag');
  } catch(e){ toast(e.message,'ae'); }
  controleRender();
}

/* ------------------------------------------------------------ rotinas */
function ctlRotinas(d){
  const jb = (d.cron && d.cron.jobs) || [];
  const tz = (d.cron && d.cron.timezone) || '';
  if(!jb.length) return ctlVazio('Nenhuma rotina cadastrada.','ti-clock');
  return `<div class="card"><div class="bd"><div class="tt">
      Horários no fuso ${esc(tz||'do computador')}. Rotina sem comando é só um lembrete:
      ela aparece aqui mas não executa nada.</div></div></div>` +
    jb.map(j=>{
      const st = j.lastStatus==='ok' ? 's-ok' : j.lastStatus==='erro' ? 's-bl'
               : j.lastStatus==='running' ? 's-pd' : 's-nt';
      const rot = j.lastStatus==='ok' ? 'Última: ok' : j.lastStatus==='erro' ? 'Última: com erro'
                : j.lastStatus==='running' ? 'Rodando' : 'Nunca rodou';
      const semComando = !j.run;
      return `<div class="card"><div class="bd">
        <div style="display:flex;gap:11px;align-items:flex-start;flex-wrap:wrap">
          <i class="ti ti-clock" style="font-size:20px;color:var(--text2);margin-top:2px"></i>
          <div style="flex:1;min-width:230px">
            <div style="font-weight:680;font-size:14px">${esc(j.name||j.id)}</div>
            <div class="tt" style="margin-top:3px">${esc(j.humanSchedule||j.schedule||'')}
              ${j.agent?' · '+esc(ctlAgenteNome(d,j.agent)):''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span class="st ${st}">${rot}</span>
            <span class="st ${j.enabled?'s-ok':'s-nt'}">${j.enabled?'Ligada':'Desligada'}</span>
          </div>
        </div>
        ${j.description?`<div class="tt" style="margin-top:8px;line-height:1.6">${esc(j.description)}</div>`:''}
        <div class="tt" style="margin-top:8px;line-height:1.7">
          Rodou ${ctlQuando(j.lastRun)}${j.enabled&&j.nextRun?` · próxima ${ctlFuturo(j.nextRun)}`:''}
          ${semComando?'<br><b>Sem comando para executar</b> — esta rotina é só informativa.':''}
          ${j.pausedReason?'<br>Pausada: '+esc(j.pausedReason):''}
        </div>
        ${j.lastError?`<div class="al ae" style="margin-top:9px"><i class="ti ti-alert-triangle"></i>
          <div>${esc(j.lastError)}</div></div>`:''}
        <div class="brow">
          <button class="btn gh sm" onclick="ctlLigarRotina('${esc(j.id)}',${j.enabled?'false':'true'})">
            <i class="ti ${j.enabled?'ti-x':'ti-circle-check'}"></i>${j.enabled?'Desligar':'Ligar'}</button>
          ${semComando?'':`<button class="btn gh sm" ${j.rodandoAgora?'disabled':''}
            onclick="ctlPedirRodar('${esc(j.id)}')">
            <i class="ti ti-player-play"></i>${j.rodandoAgora?'Já está rodando':'Rodar agora'}</button>`}
        </div>
      </div></div>`;
    }).join('');
}
async function ctlLigarRotina(id, ligar){
  try { await ctlMudarRotina(id, {enabled:ligar}); toast(ligar?'Rotina ligada.':'Rotina desligada.','ai'); }
  catch(e){ toast(e.message,'ae'); }
  controleRender();
}
function ctlPedirRodar(id){
  const j = ((CTL.dados.cron && CTL.dados.cron.jobs) || []).find(x=>x.id===id);
  confirmar('Rodar agora?',
    `<b>${esc(j?j.name:id)}</b> vai executar neste instante, fora do horário dela.<br><br>
     <span style="color:var(--text2)">O comando roda na sua máquina. Nada é publicado em
     plataforma nenhuma — o resultado fica no workspace para você conferir.</span>`,
    async ()=>{
      try { await ctlRodarAgora(id); toast('Mandei rodar. Acompanhe o estado aqui.','ag'); }
      catch(e){ toast(e.message,'ae'); }
      setTimeout(controleRender, 1200);
    });
}

/* ----------------------------------------------------------- projetos */
function ctlProjetos(d){
  const pr = (d.projects && d.projects.projects) || [];
  if(!pr.length) return ctlVazio('Nenhuma frente de trabalho cadastrada.','ti-target');
  return pr.map(p=>{
    const pg = clamp(num(p.progress),0,100);
    const ms = p.milestones || [];
    const feitos = ms.filter(m=>m.done).length;
    return `<div class="card"><div class="hd"><i class="ti ti-target"></i>${esc(p.name||p.id)}
      <span class="sp"></span><span class="st ${p.status==='ativo'?'s-ok':'s-nt'}">${esc(p.status||'')}</span></div>
      <div class="bd">
        ${p.goal?`<div style="font-size:13.5px;line-height:1.6">${esc(p.goal)}</div>`:''}
        <div class="pb" style="margin-top:11px"><div class="pf" style="width:${pg}%"></div></div>
        <div class="tt" style="margin-top:4px">${pg}%${ms.length?` · ${feitos} de ${ms.length} marcos`:''}
          ${p.deadline?' · prazo '+esc(p.deadline):''}</div>
        ${ms.length?`<div style="margin-top:12px">${ms.map(m=>
          `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;font-size:13px">
            <i class="ti ${m.done?'ti-circle-check':'ti-clock'}"
               style="color:${m.done?'var(--green)':'var(--text3)'}"></i>
            <span style="${m.done?'color:var(--text2)':''}">${esc(m.title||'')}</span>
            ${m.date?`<span class="sp"></span><span class="tt">${esc(m.date)}</span>`:''}
          </div>`).join('')}</div>`:''}
        ${(p.agents||[]).length?`<div class="tt" style="margin-top:10px">Equipe:
          ${(p.agents||[]).map(a=>esc(ctlAgenteNome(d,a))).join(', ')}</div>`:''}
      </div></div>`;
  }).join('');
}

/* ------------------------------------------------------------ esteira */
function ctlEsteira(d){
  const pl = d.pipeline || {};
  const etapas = pl.stages || [];
  const itens  = pl.items || [];
  if(!itens.length) return ctlVazio('A esteira está vazia.','ti-arrow-right');
  return `<div class="kg" style="grid-template-columns:repeat(auto-fit,minmax(215px,1fr))">
    ${etapas.map(e=>{
      const meus = itens.filter(i=>i.stage===e.id);
      return `<div class="card"><div class="hd" style="font-size:13px">${esc(e.label||e.id)}
        <span class="sp"></span><span class="st s-nt">${meus.length}</span></div>
        <div class="bd" style="padding:10px 12px">
        ${meus.length?meus.map(i=>
          `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:13px;font-weight:620;line-height:1.35">${esc(i.title||i.id)}</div>
            <div class="tt" style="margin-top:2px">${esc(i.id)}${i.format?' · '+esc(i.format):''}
              ${i.channel?' · '+esc(i.channel):''}
              ${i.views!=null?' · '+qtd(num(i.views),0)+' views':''}</div>
          </div>`).join(''):'<div class="tt">vazio</div>'}
        </div></div>`;
    }).join('')}</div>`;
}

/* -------------------------------------------------- memórias e docs --- */
function ctlMemorias(d){ return ctlListaMd(d.memory||[], 'Nenhuma memória guardada.', 'ti-bulb'); }
function ctlDocs(d){     return ctlListaMd(d.docs||[],   'Nenhum documento na base.',  'ti-file-text'); }

function ctlListaMd(lista, vazio, ic){
  if(!lista.length) return ctlVazio(vazio, ic);
  let h = lista.map(f=>`<div class="card"><div class="bd">
      <div style="display:flex;gap:11px;align-items:flex-start;flex-wrap:wrap">
        <i class="ti ${ic}" style="font-size:19px;color:var(--text2);margin-top:2px"></i>
        <div style="flex:1;min-width:210px">
          <div style="font-weight:680;font-size:14px">${esc(f.title||f.name)}</div>
          <div class="tt" style="margin-top:3px">${esc(f.file)} · ${ctlQuando(f.updated)}</div>
          ${f.preview?`<div class="tt" style="margin-top:6px;line-height:1.55">${esc(f.preview)}…</div>`:''}
        </div>
        <button class="btn gh sm" onclick="ctlVerArquivo('${esc(f.file)}')">
          <i class="ti ti-eye"></i>Ler</button>
      </div></div></div>`).join('');
  if(CTL.arquivo){
    h += `<div class="card"><div class="hd"><i class="ti ti-file-text"></i>${esc(CTL.arquivo.file)}
      <span class="sp"></span><button class="btn gh sm" onclick="CTL.arquivo=null;controleRender()">
      <i class="ti ti-x"></i>Fechar</button></div>
      <div class="bd"><div class="mono" style="white-space:pre-wrap;font-size:12.5px;line-height:1.7">${esc(CTL.arquivo.content||'')}</div></div></div>`;
  }
  return h;
}
async function ctlVerArquivo(rel){
  try { CTL.arquivo = await ctlArquivo(rel); }
  catch(e){ toast(e.message,'ae'); return; }
  controleRender();
}

function ctlVazio(msg, ic){
  return `<div class="card"><div class="bd"><div class="empty">
    <i class="ti ${ic}"></i><b>${esc(msg)}</b>
    Quem escreve aqui são os agentes, na pasta do Mission Control.
  </div></div></div>`;
}

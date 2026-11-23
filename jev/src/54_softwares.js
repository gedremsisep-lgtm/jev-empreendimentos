/* =========================================================================
   SOFTWARE — gestão dos sistemas que você mantém para outras empresas

   Mora ao lado do Escritório na página inicial e, como ele, NÃO é unidade de
   negócio: fica fora de UNIDADES para não entrar no rateio do financeiro.
   Entra só na navegação (unidadeDaPagina e menu Negócios, no 03_core.js).

   Onde ficam os dados: em CFG.sistemas, na mesma configuração da empresa —
   assim sincroniza com a nuvem junto com ela e não precisa de tabela nova
   (tabela nova obrigaria a subir o DB_VERSION).

   Os endereços que já se conhecem vêm de fábrica; o resto você cadastra.
   ========================================================================= */
const SOFTWARE = {
  id:'software', pg:'soft', nome:'Software', curto:'Software',
  ic:'ti-devices', cor:'#3B4CB8', bg:'#ECEEFB',
  desc:'Sistemas que você mantém para outras empresas',
  tabs:[['soft','Sistemas','ti-devices']]
};

const SOFT_STATUS = {
  'Em produção':        's-ok',
  'Em desenvolvimento': 's-pd',
  'Pausado':            's-wn',
  'Encerrado':          's-bl'
};
const SOFT_ICONES = ['ti-device-desktop','ti-building','ti-building-skyscraper','ti-crane','ti-route',
                     'ti-camera','ti-map-2','ti-truck-delivery','ti-tools','ti-briefcase'];
const SOFT_CORES  = ['#2D6CDF','#16253B','#7C4DBE','#C0392B','#B0842B','#E67E22','#1F7A44','#0E6E70'];

/* os de fábrica — só valem enquanto você não salvar a lista pela primeira vez */
const SOFTWARES = [
  { id:'funchal',   nome:'Funchal',               ic:'ti-route',               cor:'#2D6CDF',
    desc:'Tapa Buraco e Obras — pavimentação e drenagem',
    repo:'gedremsisep-lgtm/funchal-app' },
  { id:'ssconpav',  nome:'SSCONPAV',              ic:'ti-device-desktop',      cor:'#16253B',
    desc:'Software de escritório e APK de campo',
    url:'https://ssconpavbkp-boop.github.io/ssconpav-software/sistema.html',
    app:'https://ssconpavbkp-boop.github.io/ssconpav-apk/',
    repo:'ssconpavbkp-boop/ssconpav-software' },
  { id:'sete',      nome:'Sete Engenharia',       ic:'ti-building',            cor:'#7C4DBE',
    desc:'Sistema da Sete Engenharia' },
  { id:'rrbarros',  nome:'RR Barros',             ic:'ti-camera',              cor:'#C0392B',
    desc:'Relatório fotográfico e app de campo',
    url:'https://gedremsisep-lgtm.github.io/rr-barros-app/sistema.html',
    app:'https://gedremsisep-lgtm.github.io/rr-barros-app/',
    repo:'gedremsisep-lgtm/rr-barros-app' },
  { id:'santacruz', nome:'Santa Cruz Engenharia', ic:'ti-crane',               cor:'#B0842B',
    desc:'Construções e terraplenagem',
    supabase:'https://wfcblpogqfbdamhbdahy.supabase.co' },
  { id:'fenix',     nome:'Fenix Engenharia',      ic:'ti-building-skyscraper', cor:'#E67E22',
    desc:'Sistema da Fenix Engenharia' }
];

/* A lista que vale. Na primeira vez, monta a partir da fábrica e aproveita os
   endereços que você já tinha cadastrado no bloco antigo (CFG.softwares). */
function softLista(){
  if(Array.isArray(CFG.sistemas)) return CFG.sistemas;
  const antigos = CFG.softwares || {};
  const mapa = {funchal:'funchal', ssconpav:'ssconpav', sete:'sete', rrbarros:'rrbarros', santacruz:'santacruz', fenix:'fenix'};
  return SOFTWARES.map(s=>{
    const a = antigos[mapa[s.id]] || {};
    return Object.assign({ status:'Em produção', cliente:s.nome, versao:'', atualizado:'',
                           mensalidade:0, diaVenc:'', contato:'', obs:'', url:'', app:'', repo:'', supabase:'' },
                         s,
                         a.url ? {url:a.url} : {}, a.app ? {app:a.app} : {});
  });
}
async function softGravar(lista){
  CFG.sistemas = lista;
  await cfgSalvar();
}

/* recebimentos do mês: o lançamento sai com este texto, e é por ele que se acha */
function softDescRec(s){ return 'Mensalidade do sistema ' + s.nome; }
function softRecebidoMes(s, mk){
  return FIN.filter(l=>finVale(l) && l.tipo==='receita' && String(l.data).slice(0,7)===mk &&
                       String(l.desc||'').indexOf(softDescRec(s))===0)
            .reduce((t,l)=>t+num(l.valor),0);
}
function softLinkRepo(r){
  r = String(r||'').trim();
  if(!r) return '';
  if(/^https?:\/\//i.test(r)) return r;
  return 'https://github.com/' + r.replace(/^\/+/,'');
}
function softLinkSupa(u){
  const m = String(u||'').match(/https?:\/\/([a-z0-9]{10,})\.supabase\.co/i);
  return m ? 'https://supabase.com/dashboard/project/' + m[1] : '';
}
/* ===================================================================
   CONTROLE DE CADA SISTEMA
   Tudo o que se guarda de um sistema fica dentro dele, em CFG.sistemas:
     atividades[] — o diário: atualização, pagamento, suporte, erro, reunião…
     consumo{}    — banco e arquivos no Supabase (você lê no painel dele e
                    anota) e o tamanho do programa publicado (medido sozinho)
   Os pagamentos NÃO ficam aqui: são os lançamentos do financeiro com o texto
   "Mensalidade do sistema <nome>". Uma fonte só, para não divergir.
   =================================================================== */
const SOFT_TIPOS = {
  'Atualização':   {ic:'ti-refresh-dot',   cor:'#2D6CDF'},
  'Suporte':       {ic:'ti-help-circle',   cor:'#7C4DBE'},
  'Erro corrigido':{ic:'ti-tool',          cor:'#C0392B'},
  'Reunião':       {ic:'ti-users',         cor:'#0E6E70'},
  'Pagamento':     {ic:'ti-cash',          cor:'#1F7A44'},
  'Verificação':   {ic:'ti-eye-check',     cor:'#5B6260'},
  'Outro':         {ic:'ti-note',          cor:'#B0842B'}
};
const SOFT_MAX_ATIV = 300;   /* por sistema — a configuração viaja inteira para a nuvem */

function softPorId(id){ return softLista().find(x=>x.id===id); }
function softAtivs(s){ return Array.isArray(s && s.atividades) ? s.atividades : []; }

/* grava uma mudança num sistema só, sem perder o resto da lista */
async function softAlterar(id, fn){
  const lista = softLista().map(x=>Object.assign({}, x));
  const i = lista.findIndex(x=>x.id===id);
  if(i<0) return null;
  fn(lista[i]);
  await softGravar(lista);
  return lista[i];
}
function softAnotar(s, tipo, texto, extra){
  const a = softAtivs(s).slice();
  a.unshift(Object.assign({ id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),
                            data:hoje(), tipo, texto }, extra||{}));
  s.atividades = a.slice(0, SOFT_MAX_ATIV);
}

/* ---------------------------------------------------------- datas */
function softDiasEntre(a, b){   /* b - a, em dias, com datas AAAA-MM-DD */
  const d = x => { const [y,m,dd] = String(x).split('-').map(Number); return Date.UTC(y,m-1,dd); };
  return Math.round((d(b) - d(a)) / 86400000);
}
function softDataDoMes(mk, dia){
  const [y,m] = mk.split('-').map(Number);
  const ult = new Date(y, m, 0).getDate();
  return mk + '-' + String(Math.min(Math.max(1, Number(dia)||1), ult)).padStart(2,'0');
}
function softMesSeguinte(mk){
  let [y,m] = mk.split('-').map(Number); m++; if(m>12){ m=1; y++; }
  return y + '-' + String(m).padStart(2,'0');
}

/* A situação da mensalidade. Se o mês já foi pago, olha o vencimento do mês
   que vem; se não, conta os dias até (ou desde) o vencimento deste mês. */
function softVenc(s){
  const mens = num(s.mensalidade);
  if(!mens || !s.diaVenc || s.status!=='Em produção') return null;
  const mk = mesAtual(), hj = hoje();
  const pago = softRecebidoMes(s, mk) >= mens;
  const data = pago ? softDataDoMes(softMesSeguinte(mk), s.diaVenc) : softDataDoMes(mk, s.diaVenc);
  const dias = softDiasEntre(hj, data);
  let txt, cor, cls;
  if(pago){ txt = 'Pago · próxima em ' + dias + ' dia(s)'; cor = 'var(--green)'; cls = 's-ok'; }
  else if(dias > 5){ txt = 'Vence em ' + dias + ' dias'; cor = 'var(--text)'; cls = 's-nt'; }
  else if(dias > 0){ txt = 'Vence em ' + dias + ' dia(s)'; cor = 'var(--amber)'; cls = 's-wn'; }
  else if(dias === 0){ txt = 'Vence hoje'; cor = 'var(--amber)'; cls = 's-wn'; }
  else { txt = 'Atrasado há ' + (-dias) + ' dia(s)'; cor = 'var(--red)'; cls = 's-bl'; }
  return { pago, data, dias, txt, cor, cls, atrasado: !pago && dias < 0, logo: !pago && dias >= 0 && dias <= 7 };
}

/* a última atualização que se sabe: a anotada no cadastro ou a mais nova do diário */
function softUltAtualizacao(s){
  const doDiario = softAtivs(s).filter(a=>a.tipo==='Atualização').map(a=>a.data).sort().pop() || '';
  const c = [s.atualizado||'', doDiario].sort().pop();
  return c || '';
}

/* pagamentos: os lançamentos do financeiro deste sistema */
function softPagamentos(s){
  return FIN.filter(l=>finVale(l) && l.tipo==='receita' && String(l.desc||'').indexOf(softDescRec(s))===0)
            .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
}

/* consumo: percentuais para as barras */
function softConsumo(s){
  const c = s.consumo || {};
  const db  = num(c.dbMB), dbL = num(c.dbLim) || 500;
  const st  = num(c.stMB), stL = num(c.stLim) || 1024;
  return { c, db, dbL, st, stL,
           dbP: db ? Math.min(100, db/dbL*100) : 0, stP: st ? Math.min(100, st/stL*100) : 0,
           tem: !!(db || st), alto: (db && db/dbL >= .8) || (st && st/stL >= .8) };
}
function softLinha(rot, valor){
  return `<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--bg3);font-size:13px">
    <span class="tt">${rot}</span><b>${valor}</b></div>`;
}
const SOFT_MES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function softMesCurto(mk){ const [y,m] = mk.split('-'); return SOFT_MES_CURTO[Number(m)-1] + '/' + y.slice(2); }
function softBarra(p, rot){
  const cor = p >= 90 ? 'var(--red)' : p >= 80 ? 'var(--amber)' : 'var(--green)';
  return `<div style="margin:4px 0 8px"><div style="display:flex;justify-content:space-between;font-size:12px">
      <span class="tt">${rot}</span><b>${p.toFixed(0)}%</b></div>
    <div style="height:7px;background:var(--bg3);border-radius:5px;overflow:hidden">
      <div style="height:100%;width:${p.toFixed(1)}%;background:${cor}"></div></div></div>`;
}

function softResumo(){
  const l = softLista(), mk = mesAtual();
  const ativos = l.filter(s=>s.status==='Em produção');
  const prev = ativos.reduce((t,s)=>t+num(s.mensalidade),0);
  const receb = l.reduce((t,s)=>t+softRecebidoMes(s,mk),0);
  const vs = l.map(softVenc).filter(Boolean);
  return { total:l.length, ativos:ativos.length,
           dev:l.filter(s=>s.status==='Em desenvolvimento').length,
           semEnd:l.filter(s=>!s.url && s.status!=='Encerrado').length,
           prev, receb,
           atrasados: vs.filter(v=>v.atrasado).length,
           logo: vs.filter(v=>v.logo).length,
           aReceber: vs.filter(v=>!v.pago).length,
           consumoAlto: l.filter(s=>softConsumo(s).alto).length };
}

/* ------------------------------------------------ o cartão da página inicial */
function softCardHub(){
  const u = SOFTWARE, r = softResumo();
  return `<div class="ucard" style="--uc:${u.cor};--ucb:${u.bg}" onclick="go('${u.pg}')">
      <div class="bar"></div>
      <div class="top2"><div class="ico"><i class="ti ${u.ic}"></i></div>
        <div style="flex:1;min-width:0"><h3>${esc(u.curto)}</h3><div class="sub">${esc(u.desc)}</div></div></div>
      <div class="body">
        <div class="kv"><span>Em produção</span><b>${r.ativos}</b></div>
        <div class="kv"><span>Mensalidades atrasadas</span><b style="color:${r.atrasados?'var(--red)':''}">${r.atrasados}</b></div>
        <div class="kv"><span>Vencendo em 7 dias</span><b style="color:${r.logo?'var(--amber)':''}">${r.logo}</b></div>
        <div class="kv"><span>Consumo acima de 80%</span><b style="color:${r.consumoAlto?'var(--red)':''}">${r.consumoAlto}</b></div>
        <div class="foot">
          <div><div class="tt">Receita mensal prevista</div>
            <div class="res" style="color:var(--green)">${moedaK(r.prev)}</div></div>
          <div class="go">Abrir <i class="ti ti-arrow-right"></i></div></div>
      </div></div>`;
}

/* --------------------------------------------------------------- a tela */
let SOFT_FILTRO = 'todos';
function softFiltrar(f){ SOFT_FILTRO = f; softRender(); }

async function softRender(){
  const root = document.getElementById('soft-root');
  if(!root) return;
  await finLoad();
  const lista = softLista(), r = softResumo(), mk = mesAtual();
  const vis = lista.filter(s=>SOFT_FILTRO==='todos' || s.status===SOFT_FILTRO);

  let h = `<div class="ph"><div class="ic" style="background:${SOFTWARE.bg};color:${SOFTWARE.cor}"><i class="ti ${SOFTWARE.ic}"></i></div>
    <div><h1>Software</h1><p>Os sistemas que você mantém para outras empresas</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="softVerificarTodos(this)" title="Abre o endereço de cada sistema e lê a versão e o tamanho publicados">
      <i class="ti ti-refresh"></i>Verificar todos</button>
    <button class="btn rd" onclick="softForm()"><i class="ti ti-plus"></i>Novo sistema</button></div>

  <div class="kg" style="margin-bottom:16px">
    <div class="kc bl"><div class="lb"><i class="ti ti-devices"></i>Sistemas</div><div class="vl">${r.total}</div>
      <div class="sb">${r.ativos} em produção · ${r.dev} em desenvolvimento</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-calendar-dollar"></i>Receita mensal prevista</div><div class="vl">${moedaK(r.prev)}</div>
      <div class="sb">recebido em ${esc(dmesL(mk))}: ${moedaK(r.receb)}</div></div>
    <div class="kc ${r.atrasados?'rd':'am'}"><div class="lb"><i class="ti ti-clock-exclamation"></i>Vencimentos</div>
      <div class="vl">${r.atrasados}</div><div class="sb">atrasado(s) · ${r.logo} vencendo em 7 dias</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-database"></i>Consumo alto</div><div class="vl">${r.consumoAlto}</div>
      <div class="sb">sistema(s) acima de 80% do limite</div></div>
  </div>

  <div class="chips" style="margin-bottom:14px">
    ${['todos',...Object.keys(SOFT_STATUS)].map(f=>{
      const n = f==='todos' ? lista.length : lista.filter(s=>s.status===f).length;
      return `<span class="chip ${SOFT_FILTRO===f?'on':''}" onclick="softFiltrar('${f}')">${f==='todos'?'Todos':esc(f)} (${n})</span>`;
    }).join('')}</div>`;

  if(!vis.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-devices"></i>
      <b>Nenhum sistema aqui</b>${SOFT_FILTRO==='todos'?'Cadastre o primeiro sistema que você mantém.':'Nenhum sistema com esta situação.'}
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn rd" onclick="softForm()"><i class="ti ti-plus"></i>Novo sistema</button></div></div></div></div>`;
    root.innerHTML = h; return;
  }

  h += `<div class="ugrid">` + vis.map(s=>{
    const v = softVenc(s), ult = softUltAtualizacao(s), co = softConsumo(s);
    const at30 = softAtivs(s).filter(a=>softDiasEntre(a.data, hoje()) <= 30).length;
    return `<div class="ucard" style="--uc:${s.cor};--ucb:${s.cor}14" onclick="softDetalhe('${s.id}')">
      <div class="bar"></div>
      <div class="top2"><div class="ico"><i class="ti ${s.ic}"></i></div>
        <div style="flex:1;min-width:0"><h3>${esc(s.nome)}</h3><div class="sub">${esc(s.desc||'')}</div></div>
        <span class="st ${SOFT_STATUS[s.status]||'s-nt'}">${esc(s.status)}</span></div>
      <div class="body">
        <div class="kv"><span>Mensalidade</span><b>${num(s.mensalidade)?moeda(s.mensalidade):'—'}</b></div>
        <div class="kv"><span>Vencimento</span><b style="color:${v?v.cor:''}">${v?esc(v.txt):(num(s.mensalidade)?'informe o dia':'—')}</b></div>
        <div class="kv"><span>Última atualização</span><b>${ult?dbr(ult)+' · há '+softDiasEntre(ult,hoje())+' d':'—'}</b></div>
        <div class="kv"><span>Versão no ar</span><b>${esc(s.versao||'—')}</b></div>
        <div class="kv"><span>Atividades (30 dias)</span><b>${at30}</b></div>
        ${co.tem ? softBarra(Math.max(co.dbP, co.stP), 'Consumo do Supabase (o maior)') :
          `<div class="kv"><span>Consumo</span><b style="color:var(--text3)">${s.consumo&&s.consumo.arqKB?qtd(s.consumo.arqKB,0)+' KB publicados':'não medido'}</b></div>`}
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap" onclick="event.stopPropagation()">
          ${s.url
            ? `<button class="btn sm" style="flex:1;background:${s.cor};border-color:${s.cor};color:#fff"
                 onclick="softAbrir('${s.id}','url')"><i class="ti ti-device-desktop"></i>Abrir sistema</button>`
            : `<button class="btn sm gh" style="flex:1" onclick="softForm('${s.id}')">
                 <i class="ti ti-link-plus"></i>Cadastrar endereço</button>`}
          <button class="btn sm gh" style="flex:1" onclick="softDetalhe('${s.id}')"><i class="ti ti-list-check"></i>Controle</button>
        </div>
      </div></div>`;
  }).join('') + `</div>`;
  root.innerHTML = h;
}

function softAbrir(id, qual){
  const s = softPorId(id);
  if(!s) return;
  const u = qual==='url' ? s.url : qual==='app' ? s.app : qual==='repo' ? softLinkRepo(s.repo) : softLinkSupa(s.supabase);
  if(u) abrirFora(u);
}

function softReceber(id){
  const s = softPorId(id);
  if(!s) return;
  finLancForm(null, { tipo:'receita', desc:softDescRec(s) + ' — ' + dmesL(mesAtual()),
                      valor:num(s.mensalidade) || '' });
}

/* =================================================== a ficha de um sistema */
let SOFT_DET = { id:null, aba:'resumo' };
function softDetalhe(id, aba){
  SOFT_DET = { id, aba: aba || 'resumo' };
  softDetRender();
}
function softDetAba(aba){ SOFT_DET.aba = aba; softDetRender(); }

async function softDetRender(){
  await finLoad();
  const s = softPorId(SOFT_DET.id);
  if(!s) return;
  const abas = [['resumo','Resumo','ti-layout-grid'],['pag','Pagamentos','ti-cash'],
                ['atu','Atualizações','ti-refresh-dot'],['cons','Consumo','ti-database'],
                ['ativ','Atividades','ti-history']];
  const A = SOFT_DET.aba;
  let b = `<div class="chips" style="margin-bottom:12px">
    ${abas.map(([k,n,i])=>`<span class="chip ${A===k?'on':''}" onclick="softDetAba('${k}')"><i class="ti ${i}"></i> ${n}</span>`).join('')}</div>`;
  if(A==='resumo') b += softAbaResumo(s);
  if(A==='pag')    b += softAbaPag(s);
  if(A==='atu')    b += softAbaAtu(s);
  if(A==='cons')   b += softAbaCons(s);
  if(A==='ativ')   b += softAbaAtiv(s);
  b += `<div id="sd-msg"></div>`;

  const repo = softLinkRepo(s.repo), supa = softLinkSupa(s.supabase);
  modal(s.nome + ' — controle', s.ic, b,
    `<button class="btn gh" onclick="closeModal('mk-form');softRender()">Fechar</button>
     ${repo?`<button class="btn gh" onclick="softAbrir('${s.id}','repo')"><i class="ti ti-file-code"></i>GitHub</button>`:''}
     ${supa?`<button class="btn gh" onclick="softAbrir('${s.id}','supa')"><i class="ti ti-database"></i>Supabase</button>`:''}
     ${s.app?`<button class="btn gh" onclick="softAbrir('${s.id}','app')"><i class="ti ti-device-mobile"></i>App de campo</button>`:''}
     ${s.url?`<button class="btn bl" onclick="softAbrir('${s.id}','url')"><i class="ti ti-device-desktop"></i>Abrir sistema</button>`:''}
     <button class="btn" onclick="softForm('${s.id}')"><i class="ti ti-pencil"></i>Editar cadastro</button>`, 'lg');
}

/* ---- Resumo */
function softAbaResumo(s){
  const v = softVenc(s), ult = softUltAtualizacao(s), co = softConsumo(s);
  const pags = softPagamentos(s);
  const ano = String(hoje()).slice(0,4);
  const noAno = pags.filter(l=>String(l.data).slice(0,4)===ano).reduce((t,l)=>t+num(l.valor),0);
  const ats = softAtivs(s);
  const a30 = ats.filter(a=>softDiasEntre(a.data, hoje()) <= 30);
  const porTipo = {};
  a30.forEach(a=>{ porTipo[a.tipo] = (porTipo[a.tipo]||0) + 1; });

  return `<div class="kg" style="margin-bottom:12px">
      <div class="kc ${v&&v.atrasado?'rd':v&&v.pago?'gn':'am'}"><div class="lb"><i class="ti ti-calendar-dollar"></i>Mensalidade</div>
        <div class="vl" style="font-size:18px">${v?esc(v.txt):(num(s.mensalidade)?'Sem dia de vencimento':'Sem mensalidade')}</div>
        <div class="sb">${num(s.mensalidade)?moeda(s.mensalidade)+(s.diaVenc?' · todo dia '+esc(s.diaVenc):''):'cadastre no Editar'}</div></div>
      <div class="kc bl"><div class="lb"><i class="ti ti-refresh-dot"></i>Última atualização</div>
        <div class="vl" style="font-size:18px">${ult?dbr(ult):'—'}</div>
        <div class="sb">${ult?'há '+softDiasEntre(ult,hoje())+' dia(s)':'nenhuma registrada'}${s.versao?' · versão '+esc(s.versao):''}</div></div>
      <div class="kc pu"><div class="lb"><i class="ti ti-database"></i>Consumo</div>
        <div class="vl" style="font-size:18px">${co.tem?Math.max(co.dbP,co.stP).toFixed(0)+'%':'—'}</div>
        <div class="sb">${co.tem?'do limite do Supabase (o maior)':'anote na aba Consumo'}</div></div>
      <div class="kc gd"><div class="lb"><i class="ti ti-cash"></i>Recebido em ${ano}</div>
        <div class="vl" style="font-size:18px">${moeda(noAno)}</div>
        <div class="sb">${pags.length} pagamento(s) no total</div></div>
    </div>

    <div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-history"></i>Resumo das atividades — últimos 30 dias</div><div class="bd">
      ${a30.length ? `<div class="chips" style="margin-bottom:8px">
          ${Object.entries(porTipo).map(([t,n])=>`<span class="chip"><i class="ti ${(SOFT_TIPOS[t]||SOFT_TIPOS.Outro).ic}"></i> ${esc(t)}: ${n}</span>`).join('')}</div>
        ${softListaAtiv(a30.slice(0,5), s, false)}`
      : `<div class="tt" style="padding:6px 0">Nenhuma atividade anotada nos últimos 30 dias.
          <a href="#" onclick="softDetAba('ativ');return false">Anotar agora</a></div>`}
    </div></div>

    <div class="card"><div class="bd">
      ${softLinha('Cliente', esc(s.cliente||'—'))}
      ${softLinha('Contato', esc(s.contato||'—'))}
      ${softLinha('Situação', esc(s.status))}
      ${s.obs?`<div class="tt" style="margin-top:6px"><i class="ti ti-note"></i> ${esc(s.obs)}</div>`:''}
    </div></div>`;
}

/* ---- Pagamentos */
function softAbaPag(s){
  const v = softVenc(s), pags = softPagamentos(s), mens = num(s.mensalidade);
  /* os últimos 12 meses, mês a mês: pago, parcial ou em aberto */
  const meses = [];
  let mk = mesAtual();
  for(let i=0;i<12;i++){
    meses.push(mk);
    let [y,m] = mk.split('-').map(Number); m--; if(m<1){ m=12; y--; }
    mk = y + '-' + String(m).padStart(2,'0');
  }
  return `${v?`<div class="al ${v.atrasado?'ae':v.pago?'ag':'aw'}" style="margin-top:0"><i class="ti ti-calendar-dollar"></i>
      <div><b>${esc(v.txt)}</b> — vencimento ${dbr(v.data)}${mens?' · '+moeda(mens):''}</div>
      ${!v.pago?`<button class="btn xs gn" onclick="softReceber('${s.id}')"><i class="ti ti-cash"></i>Lançar recebimento</button>`:''}</div>`
    : `<div class="al ai" style="margin-top:0"><i class="ti ti-info-circle"></i><div>
        ${mens?'Informe o dia do vencimento no Editar cadastro para o sistema contar os dias.':'Este sistema não tem mensalidade cadastrada.'}</div></div>`}

    ${mens?`<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-calendar-stats"></i>Últimos 12 meses</div><div class="bd">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px">
      ${meses.map(m=>{
        const r = softRecebidoMes(s, m);
        const st = r>=mens ? ['s-ok','Pago'] : r>0 ? ['s-wn','Parcial'] : ['s-bl','Em aberto'];
        return `<div style="border:1px solid var(--border);border-radius:9px;padding:7px;text-align:center">
          <div class="tt" style="font-size:11.5px;font-weight:700">${softMesCurto(m)}</div>
          <span class="st ${st[0]}" style="margin-top:4px;display:inline-block">${st[1]}</span></div>`;
      }).join('')}</div></div></div>`:''}

    <div class="card tw"><div class="hd"><i class="ti ti-cash"></i>Pagamentos recebidos
      <span class="sp"></span><button class="btn xs gn" onclick="softReceber('${s.id}')"><i class="ti ti-plus"></i>Lançar</button></div>
      <div class="bd"><table><thead><tr><th>Data</th><th>Descrição</th><th class="c">Situação</th><th class="r">Valor</th></tr></thead><tbody>
      ${pags.map(l=>`<tr style="cursor:pointer" onclick="finLancForm(${l.id})"><td class="n">${dbr(l.data)}</td><td>${esc(l.desc)}</td>
        <td class="c"><span class="st ${finStatus(l).c}">${finStatus(l).t}</span></td><td class="r n"><b style="color:var(--green)">${moeda(l.valor)}</b></td></tr>`).join('')
        || `<tr><td colspan="4" class="c tt" style="padding:18px">Nenhum pagamento lançado ainda.</td></tr>`}
      </tbody></table>
      <div class="hint" style="margin-top:6px">Os pagamentos são os lançamentos do Financeiro que começam com "${esc(softDescRec(s))}".</div>
      </div></div>`;
}

/* ---- Atualizações */
function softAbaAtu(s){
  const atus = softAtivs(s).filter(a=>a.tipo==='Atualização' || a.tipo==='Verificação');
  const c = s.consumo || {};
  return `<div class="card" style="margin-bottom:12px"><div class="bd">
      ${softLinha('Versão no ar', esc(s.versao||'—'))}
      ${softLinha('Última atualização', softUltAtualizacao(s)?dbr(softUltAtualizacao(s)):'—')}
      ${softLinha('Última verificação', c.verificado?dbr(c.verificado):'nunca')}
      <div class="brow" style="margin-top:10px;gap:8px;flex-wrap:wrap">
        <button class="btn bl" onclick="softVerificar('${s.id}')" ${s.url?'':'disabled'}><i class="ti ti-refresh"></i>Verificar versão no ar</button>
        <span class="tt">${s.url?'Abre o endereço do sistema e lê a versão e a data de publicação.':'Cadastre o endereço do sistema para poder verificar.'}</span></div>
    </div></div>

    <div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-plus"></i>Registrar uma atualização</div><div class="bd">
      <div class="fr3">
        <div class="fg"><label>Data</label><input id="sd-adata" type="date" value="${hoje()}"></div>
        <div class="fg"><label>Versão</label><input id="sd-aver" placeholder="Ex.: 20261123-001"></div>
        <div class="fg" style="display:flex;align-items:flex-end"><button class="btn gn" style="width:100%" onclick="softRegAtualizacao('${s.id}')">
          <i class="ti ti-device-floppy"></i>Registrar</button></div></div>
      <div class="fg"><label>O que mudou</label><input id="sd-atxt" placeholder="Ex.: módulo Obras com boletim de equipamentos"></div>
    </div></div>

    <div class="card"><div class="hd"><i class="ti ti-history"></i>Histórico de versões</div><div class="bd">
      ${atus.length ? softListaAtiv(atus, s, true) : `<div class="tt">Nenhuma atualização registrada.</div>`}</div></div>`;
}

/* ---- Consumo */
function softAbaCons(s){
  const co = softConsumo(s), c = co.c;
  return `<div class="al ai" style="margin-top:0"><i class="ti ti-info-circle"></i><div>
      O tamanho do programa publicado é medido sozinho no <b>Verificar</b>. O uso do banco e dos arquivos
      só o painel do Supabase mostra (Project Settings → Usage): leia lá e anote aqui. O plano gratuito
      tem 500 MB de banco e 1 GB de arquivos.</div></div>

    ${co.tem ? `<div class="card" style="margin-bottom:12px"><div class="bd">
      ${co.db ? softBarra(co.dbP, 'Banco de dados: ' + qtd(co.db,1) + ' de ' + qtd(co.dbL,0) + ' MB') : ''}
      ${co.st ? softBarra(co.stP, 'Arquivos (Storage): ' + qtd(co.st,1) + ' de ' + qtd(co.stL,0) + ' MB') : ''}
      ${co.alto ? `<div class="al ae" style="margin:6px 0 0"><i class="ti ti-alert-triangle"></i><div>Acima de 80%: hora de limpar fotos antigas ou mudar de plano.</div></div>` : ''}
    </div></div>` : ''}

    <div class="card"><div class="hd"><i class="ti ti-pencil"></i>Anotar o consumo${c.medido?' — última leitura em '+dbr(c.medido):''}</div><div class="bd">
      <div class="fr3">
        <div class="fg"><label>Banco usado (MB)</label><input id="sd-db" type="number" step="0.1" value="${c.dbMB||''}"></div>
        <div class="fg"><label>Limite do banco (MB)</label><input id="sd-dbl" type="number" value="${c.dbLim||500}"></div>
        <div class="fg"><label>Programa publicado</label><input value="${c.arqKB?qtd(c.arqKB,0)+' KB':'— (use Verificar)'}" disabled></div></div>
      <div class="fr3">
        <div class="fg"><label>Arquivos usados (MB)</label><input id="sd-st" type="number" step="0.1" value="${c.stMB||''}"></div>
        <div class="fg"><label>Limite de arquivos (MB)</label><input id="sd-stl" type="number" value="${c.stLim||1024}"></div>
        <div class="fg" style="display:flex;align-items:flex-end;gap:6px">
          ${softLinkSupa(s.supabase)?`<button class="btn gh" onclick="softAbrir('${s.id}','supa')"><i class="ti ti-external-link"></i>Painel</button>`:''}
          <button class="btn gn" style="flex:1" onclick="softSalvarConsumo('${s.id}')"><i class="ti ti-device-floppy"></i>Salvar</button></div></div>
    </div></div>`;
}

/* ---- Atividades */
function softAbaAtiv(s){
  const ats = softAtivs(s);
  return `<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-plus"></i>Anotar atividade</div><div class="bd">
      <div class="fr3">
        <div class="fg"><label>Data</label><input id="sd-dt" type="date" value="${hoje()}"></div>
        <div class="fg"><label>Tipo</label><select id="sd-tipo">
          ${Object.keys(SOFT_TIPOS).filter(t=>t!=='Verificação').map(t=>`<option>${t}</option>`).join('')}</select></div>
        <div class="fg" style="display:flex;align-items:flex-end"><button class="btn gn" style="width:100%" onclick="softRegAtividade('${s.id}')">
          <i class="ti ti-device-floppy"></i>Anotar</button></div></div>
      <div class="fg"><label>O que foi feito</label><input id="sd-txt" placeholder="Ex.: atendi o cliente sobre o relatório de medição"></div>
    </div></div>
    <div class="card"><div class="hd"><i class="ti ti-history"></i>Todas as atividades (${ats.length})</div><div class="bd">
      ${ats.length ? softListaAtiv(ats, s, true) : `<div class="tt">Nada anotado ainda.</div>`}</div></div>`;
}

function softListaAtiv(lista, s, apagar){
  return `<div>${lista.map(a=>{
    const t = SOFT_TIPOS[a.tipo] || SOFT_TIPOS.Outro;
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--bg3)">
      <div style="width:28px;height:28px;border-radius:8px;background:${t.cor}18;color:${t.cor};display:flex;align-items:center;
        justify-content:center;flex-shrink:0"><i class="ti ${t.ic}"></i></div>
      <div style="flex:1;min-width:0"><b style="font-size:13px">${esc(a.tipo)}${a.versao?' · '+esc(a.versao):''}</b>
        <span class="tt"> · ${dbr(a.data)}</span><div style="font-size:13px">${esc(a.texto||'')}</div></div>
      ${apagar?`<button class="btn xs gh" title="Apagar" onclick="softApagarAtiv('${s.id}','${a.id}')"><i class="ti ti-trash"></i></button>`:''}
    </div>`;
  }).join('')}</div>`;
}

/* ---------------------------------------------------------- ações da ficha */
function softMsg(cls, t){
  const el = document.getElementById('sd-msg');
  if(el) el.innerHTML = `<div class="al ${cls}"><i class="ti ti-${cls==='ae'?'alert-circle':'check'}"></i><div>${t}</div></div>`;
}
async function softRegAtividade(id){
  const txt = val('sd-txt').trim();
  if(!txt) return softMsg('ae','Escreva o que foi feito.');
  await softAlterar(id, s=>softAnotar(s, val('sd-tipo'), txt, { data: val('sd-dt') || hoje() }));
  toast('Atividade anotada.'); softDetRender();
}
async function softRegAtualizacao(id){
  const txt = val('sd-atxt').trim(), ver = val('sd-aver').trim(), dt = val('sd-adata') || hoje();
  if(!txt && !ver) return softMsg('ae','Informe a versão ou o que mudou.');
  await softAlterar(id, s=>{
    softAnotar(s, 'Atualização', txt || 'Nova versão publicada', { data:dt, versao:ver });
    if(ver) s.versao = ver;
    if(!s.atualizado || dt > s.atualizado) s.atualizado = dt;
  });
  toast('Atualização registrada.'); softDetRender();
}
async function softApagarAtiv(id, aid){
  await softAlterar(id, s=>{ s.atividades = softAtivs(s).filter(a=>a.id!==aid); });
  softDetRender();
}
async function softSalvarConsumo(id){
  await softAlterar(id, s=>{
    s.consumo = Object.assign({}, s.consumo||{}, {
      dbMB:num(val('sd-db')), dbLim:num(val('sd-dbl'))||500,
      stMB:num(val('sd-st')), stLim:num(val('sd-stl'))||1024, medido:hoje() });
  });
  toast('Consumo anotado.'); softDetRender();
}

/* -------------------------------------------- verificar a versão publicada
   Lê o endereço do sistema e procura a versão em dois lugares: dentro do
   próprio arquivo (SYSTEM_VERSION, APP_VERSION…) e num versao.json ao lado.
   Se não achar, diz que não achou — não inventa. A data vem do cabeçalho
   Last-Modified que o GitHub Pages manda.                                   */
function softAcharVersao(txt){
  const m = String(txt||'').match(/\b(?:SYSTEM_VERSION|APP_VERSION|SISTEMA_VERSAO|VERSAO_SISTEMA|VERSAO|APP_VER|VERSION)\s*[:=]\s*['"`]([\w.\-]{3,40})['"`]/);
  return m ? m[1] : '';
}
function softAcharVersaoJson(j){
  if(!j || typeof j!=='object') return '';
  for(const k of ['sistema','versao','version','SYSTEM_VERSION','app','v'])
    if(typeof j[k]==='string' && j[k].trim()) return j[k].trim();
  return '';
}
async function softLer(url){
  const r = await fetch(url, { cache:'no-store' });
  if(!r.ok) throw new Error('o endereço respondeu ' + r.status);
  const txt = await r.text();
  const lm = r.headers.get('last-modified');
  let data = '';
  if(lm){ const d = new Date(lm); if(!isNaN(d)) data = d.toISOString().slice(0,10); }
  return { txt, data, kb: new Blob([txt]).size / 1024 };
}
async function softVerificarUm(id){
  const s = softPorId(id);
  if(!s || !s.url) return { ok:false, motivo:'sem endereço' };
  let lido;
  try{ lido = await softLer(s.url); }
  catch(e){ return { ok:false, motivo:'não consegui abrir: ' + (e && e.message || e) }; }
  let versao = softAcharVersao(lido.txt);
  if(!versao){
    try{
      const base = s.url.replace(/[^\/]*$/, '');
      const r = await fetch(base + 'versao.json', { cache:'no-store' });
      if(r.ok) versao = softAcharVersaoJson(await r.json());
    }catch(e){ /* sem versao.json: segue sem versão */ }
  }
  let mudou = false;
  await softAlterar(id, x=>{
    x.consumo = Object.assign({}, x.consumo||{}, { arqKB: lido.kb, verificado: hoje() });
    if(versao && versao !== x.versao){
      mudou = !!x.versao;
      softAnotar(x, mudou ? 'Atualização' : 'Verificação',
                 (mudou ? 'Versão nova detectada no ar (antes: ' + x.versao + ')' : 'Versão lida no ar'),
                 { versao, data: lido.data || hoje() });
      x.versao = versao;
      if(lido.data && (!x.atualizado || lido.data > x.atualizado)) x.atualizado = lido.data;
    } else if(lido.data && (!x.atualizado || lido.data > x.atualizado)){
      x.atualizado = lido.data;
    }
  });
  return { ok:true, versao, data:lido.data, kb:lido.kb, mudou };
}
async function softVerificar(id){
  softMsg('ai', 'Verificando…');
  const r = await softVerificarUm(id);
  if(!r.ok){ softMsg('ae', 'Não deu para verificar: ' + esc(r.motivo) + '.'); return; }
  await softDetRender();
  softMsg('ag', (r.versao ? 'Versão no ar: <b>' + esc(r.versao) + '</b>' + (r.mudou ? ' (nova!)' : '') : 'Não achei o número da versão no arquivo')
    + (r.data ? ' · publicado em ' + dbr(r.data) : '') + ' · ' + qtd(r.kb,0) + ' KB.');
}
async function softVerificarTodos(btn){
  const ids = softLista().filter(s=>s.url && s.status!=='Encerrado').map(s=>s.id);
  if(!ids.length){ toast('Nenhum sistema com endereço para verificar.','aw'); return; }
  if(btn) btn.disabled = true;
  let ok = 0, novas = 0, falhas = [];
  for(const id of ids){
    const r = await softVerificarUm(id);
    if(r.ok){ ok++; if(r.mudou) novas++; } else falhas.push((softPorId(id)||{}).nome);
  }
  if(btn) btn.disabled = false;
  toast(ok + ' verificado(s)' + (novas ? ' · ' + novas + ' versão(ões) nova(s)' : '') +
        (falhas.length ? ' · falhou: ' + falhas.join(', ') : ''), falhas.length ? 'aw' : 'ag');
  softRender();
}

/* ---------------------------------------------------- cadastro / edição */
function softForm(id){
  const s = id ? softPorId(id) : null;
  const v = (k, d) => esc(s && s[k] != null ? s[k] : (d||''));
  const icAt = s ? s.ic : SOFT_ICONES[0], corAt = s ? s.cor : SOFT_CORES[0];
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Nome do sistema <span class="rq">*</span></label>
        <input id="sw-nome" value="${v('nome')}" placeholder="Ex.: Sete Engenharia"></div>
      <div class="fg"><label>Situação</label><select id="sw-status">
        ${Object.keys(SOFT_STATUS).map(k=>`<option ${(s?s.status:'Em produção')===k?'selected':''}>${k}</option>`).join('')}</select></div></div>
    <div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Para que serve</label>
        <input id="sw-desc" value="${v('desc')}" placeholder="Ex.: Relatório fotográfico e app de campo"></div>
      <div class="fg"><label>Cliente (empresa)</label><input id="sw-cli" value="${v('cliente')}"></div></div>
    <div class="fg"><label>Endereço do sistema do escritório</label>
      <input id="sw-url" value="${v('url')}" placeholder="https://…/sistema.html"></div>
    <div class="fg"><label>Endereço do app de campo (opcional)</label>
      <input id="sw-app" value="${v('app')}" placeholder="https://…"></div>
    <div class="fr3">
      <div class="fg"><label>Repositório GitHub</label><input id="sw-repo" value="${v('repo')}" placeholder="conta/repositório"></div>
      <div class="fg" style="grid-column:span 2"><label>Projeto Supabase</label>
        <input id="sw-supa" value="${v('supabase')}" placeholder="https://xxxx.supabase.co"></div></div>
    <div class="fr3">
      <div class="fg"><label>Versão no ar</label><input id="sw-ver" value="${v('versao')}" placeholder="Ex.: 20261123-001"></div>
      <div class="fg"><label>Última atualização</label><input id="sw-atu" type="date" value="${v('atualizado')}"></div>
      <div class="fg"><label>Contato no cliente</label><input id="sw-cont" value="${v('contato')}" placeholder="Nome e telefone"></div></div>
    <div class="fr3">
      <div class="fg"><label>Mensalidade (R$)</label><input id="sw-mens" type="number" step="0.01" value="${s?num(s.mensalidade)||'':''}"></div>
      <div class="fg"><label>Dia do vencimento</label><input id="sw-dia" type="number" min="1" max="31" value="${v('diaVenc')}"></div>
      <div class="fg"><label>Cor e ícone</label>
        <div style="display:flex;gap:5px;flex-wrap:wrap" id="sw-cores">
          ${SOFT_CORES.map(c=>`<span onclick="softEscolher('cor','${c}')" data-v="${c}" style="width:20px;height:20px;border-radius:6px;
            background:${c};cursor:pointer;outline:${c===corAt?'2px solid var(--text)':'none'};outline-offset:1px"></span>`).join('')}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px" id="sw-icones">
          ${SOFT_ICONES.map(i=>`<span onclick="softEscolher('ic','${i}')" data-v="${i}" style="width:26px;height:26px;border-radius:7px;
            display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid ${i===icAt?'var(--text)':'var(--border)'}">
            <i class="ti ${i}"></i></span>`).join('')}</div>
        <input type="hidden" id="sw-cor" value="${esc(corAt)}"><input type="hidden" id="sw-ic" value="${esc(icAt)}"></div></div>
    <div class="fg"><label>Observações (o que falta, combinados, pendências)</label><textarea id="sw-obs">${v('obs')}</textarea></div>
    <div id="sw-err"></div>`;
  modal(s ? 'Editar — ' + s.nome : 'Novo sistema', 'ti-devices', b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     ${s?`<button class="btn rd" onclick="softExcluir('${s.id}')"><i class="ti ti-trash"></i>Excluir</button>`:''}
     <button class="btn gn" onclick="softSalvar(${s?`'${s.id}'`:'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`, 'lg');
}
function softEscolher(campo, valor){
  setVal(campo==='cor' ? 'sw-cor' : 'sw-ic', valor);
  const cx = document.getElementById(campo==='cor' ? 'sw-cores' : 'sw-icones');
  if(cx) Array.from(cx.children).forEach(el=>{
    const on = el.getAttribute('data-v')===valor;
    if(campo==='cor') el.style.outline = on ? '2px solid var(--text)' : 'none';
    else el.style.border = '1px solid ' + (on ? 'var(--text)' : 'var(--border)');
  });
}

async function softSalvar(id){
  const err = t => { document.getElementById('sw-err').innerHTML =
    `<div class="al ae"><i class="ti ti-alert-circle"></i>${t}</div>`; };
  const nome = val('sw-nome').trim();
  if(!nome) return err('Informe o nome do sistema.');
  const d = { nome, status:val('sw-status'), desc:val('sw-desc').trim(), cliente:val('sw-cli').trim(),
              url:val('sw-url').trim(), app:val('sw-app').trim(), repo:val('sw-repo').trim(),
              supabase:val('sw-supa').trim(), versao:val('sw-ver').trim(), atualizado:val('sw-atu'),
              contato:val('sw-cont').trim(), mensalidade:num(val('sw-mens')), diaVenc:val('sw-dia').trim(),
              cor:val('sw-cor'), ic:val('sw-ic'), obs:val('sw-obs').trim() };
  const ruim = [d.url, d.app, d.supabase].find(u=>u && !/^https?:\/\//i.test(u));
  if(ruim) return err('Endereço precisa começar com https:// — confira: ' + esc(ruim));
  const dia = Number(d.diaVenc);
  if(d.diaVenc && !(dia>=1 && dia<=31)) return err('O dia do vencimento vai de 1 a 31.');
  const lista = softLista().map(x=>Object.assign({}, x));
  if(id){
    const i = lista.findIndex(x=>x.id===id);
    if(i>=0) lista[i] = Object.assign(lista[i], d);
  } else {
    lista.push(Object.assign({ id:'s' + Date.now().toString(36), atividades:[] }, d));
  }
  await softGravar(lista);
  closeModal('mk-form'); toast('Sistema salvo.'); softRender();
}

function softExcluir(id){
  const s = softPorId(id);
  confirmar('Excluir sistema', 'Tira "' + (s?s.nome:'') + '" da lista, com o histórico de atividades. Os lançamentos do financeiro continuam.',
    async()=>{
      await softGravar(softLista().filter(x=>x.id!==id));
      closeModal('mk-form'); toast('Sistema removido.','aw'); softRender();
    });
}

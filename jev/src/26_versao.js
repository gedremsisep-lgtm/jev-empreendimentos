/* =========================================================================
   ATUALIZAÇÕES DO SISTEMA
   -------------------------------------------------------------------------
   O sistema é um arquivo só. Atualizar é trocar esse arquivo — nada de
   reinstalar. A regra: versão nova só vira oficial depois de reiniciar e
   passar no autoteste. Se não passar, o programa volta sozinho para a
   anterior. E o botão "Reverter" fica sempre à mão.
   ========================================================================= */

const APP = () => (window.JeVDesktop && window.JeVDesktop.ehAplicativo) ? window.JeVDesktop : null;
/* servido pela internet (GitHub Pages) — dá para instalar pelo navegador
   e se atualizar sozinho, sem instalador nenhum */
const NAWEB = () => location.protocol === 'http:' || location.protocol === 'https:';
const INSTALADO = () => window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
const FONTE_PADRAO = 'https://raw.githubusercontent.com/gedremsisep-lgtm/jev-empreendimentos/main/atualizacao/';

let VS = { estado:null, achada:null, ocupado:false, testando:false };

function verFonte(){
  return (localStorage.getItem('jev_fonte_atualizacao') || FONTE_PADRAO).replace(/\/*$/,'/');
}


/* ------------------------------------------------- instalar no Windows
   Busca a versão mais nova publicada e manda o navegador baixar o
   instalador. Se não conseguir falar com o GitHub (sem internet, por
   exemplo), abre a página das versões para o download ser feito à mão. */
const JEV_REPO = 'gedremsisep-lgtm/jev-empreendimentos';
const JEV_VERSOES = 'https://github.com/' + JEV_REPO + '/releases/latest';

async function instalarWindows(btn){
  const antes = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i>Procurando a versão mais nova…'; }
  let destino = null, etiqueta = '';
  /* 1ª tentativa: perguntar ao GitHub qual é o instalador da versão mais nova */
  try{
    const r = await fetch('https://api.github.com/repos/' + JEV_REPO + '/releases/latest',
                          {headers:{Accept:'application/vnd.github+json'}, cache:'no-store'});
    if(r.ok){
      const rel = await r.json();
      const exe = (rel.assets||[]).find(a=>/\.exe$/i.test(a.name||''));
      if(exe){ destino = exe.browser_download_url; etiqueta = rel.tag_name || ''; }
    }
  }catch(e){ /* sem internet ou bloqueado: cai no endereço fixo abaixo */ }

  if(destino){
    window.open(destino, '_blank');
    toast('Baixando o instalador ' + etiqueta + '. Acompanhe na lista de downloads do navegador (Ctrl+J). ' +
          'Se o Chrome bloquear, clique nos três pontinhos ao lado do arquivo e escolha "Manter".');
  }else{
    /* sem conseguir perguntar ao GitHub, abre a página das versões — ela
       sempre existe, e o instalador está listado em "Assets", no fim */
    window.open(JEV_VERSOES, '_blank');
    toast('Abri a página das versões. Role até o fim, em "Assets", e clique no arquivo terminado em .exe.','aw');
  }
  if(btn){ btn.disabled = false; btn.innerHTML = antes; }
}

function abrirVersoesJeV(){ window.open(JEV_VERSOES, '_blank'); }

function abrirSistemaNaInternet(){
  window.open('https://gedremsisep-lgtm.github.io/jev-empreendimentos/sistema/', '_blank');
}


/* ------------------------------------------------- relógio de verificação
   Fica aqui, no sistema, e não no programa instalado: assim dá para mudar o
   ritmo publicando uma versão nova, sem ninguém ter que reinstalar nada.   */
const VS_MIN_PADRAO = 10;                 // minutos — fase de desenvolvimento
let VS_RELOGIO = null;

function verIntervalo(){
  const n = num(localStorage.getItem('jev_intervalo_min'));
  return n >= 1 ? Math.min(n, 720) : VS_MIN_PADRAO;
}
function verDefinirIntervalo(min){
  const n = Math.max(1, Math.min(num(min) || VS_MIN_PADRAO, 720));
  localStorage.setItem('jev_intervalo_min', String(n));
  verLigarRelogio();
  return n;
}

function verLigarRelogio(){
  if(VS_RELOGIO){ clearInterval(VS_RELOGIO); VS_RELOGIO = null; }
  /* aberto direto do arquivo não há de onde buscar — não adianta relógio */
  if(!APP() && !NAWEB()) return;
  const ms = verIntervalo() * 60000;
  VS_RELOGIO = setInterval(()=>verEspiada().catch(()=>{}), ms);
}

/* uma olhada discreta: se saiu versão nova, baixa em segundo plano */
async function verEspiada(){
  const app = APP();
  try{
    if(app){
      const e = await app.vsEstado();
      if(e.automatico === false || e.fase !== 'ok' || e.pendente) return;
      const r = await app.vsProcurar();
      if(r.ok && r.temNova){ VS.achada = r.info; await verBaixar(true); }
    }else if(NAWEB()){
      const r = await fetch('./versao.json?t='+Date.now(), {cache:'no-store'});
      if(!r.ok) return;
      const info = await r.json();
      if(verCmp(info.versao, SISTEMA_VERSAO) > 0){
        VS.achada = info;
        verFaixa(`<i class="ti ti-download" style="font-size:19px"></i>
          <span>Saiu a versão <b>${esc(info.versao)}</b>. Basta recarregar para entrar nela.</span>
          <span style="flex:1"></span>
          <button class="btn sm" style="background:#fff;color:#123B4E" onclick="location.reload()">Recarregar agora</button>
          <button class="ib" style="color:#fff;background:transparent;border-color:rgba(255,255,255,.45)" onclick="verFecharFaixa()"><i class="ti ti-x"></i></button>`,
          'var(--brand)');
      }
    }
  }catch(e){ /* sem internet: tenta de novo no próximo ciclo */ }
}

/* ---------------------------------------------------------------- carimbo
   Antes de aplicar uma versão nova guardamos quantos registros existiam.
   Depois de reiniciar, o autoteste confere se nada sumiu. */
async function verCarimbar(){
  const c = {};
  for(const s of STORES){ try{ c[s] = (await dbGetAll(s)).length; }catch(e){ c[s] = -1; } }
  localStorage.setItem('jev_carimbo', JSON.stringify({quando:Date.now(), versao:SISTEMA_VERSAO, contagens:c}));
  return c;
}
function verLerCarimbo(){
  try{ return JSON.parse(localStorage.getItem('jev_carimbo')||'null'); }catch(e){ return null; }
}

/* ---------------------------------------------------------------- autoteste */
async function verAutoteste(){
  const falhas = [];
  const errosDeTela = [];
  const pegador = e => errosDeTela.push(String((e.error && e.error.message) || e.message || e));
  window.addEventListener('error', pegador);

  try{
    /* 1. banco aberto e na versão certa */
    if(!db) falhas.push('o banco de dados não abriu');
    else{
      if(db.version !== DB_VERSION) falhas.push(`o banco abriu na versão ${db.version}, esperava ${DB_VERSION}`);
      const faltando = STORES.filter(s=>!db.objectStoreNames.contains(s));
      if(faltando.length) falhas.push('faltam tabelas no banco: '+faltando.join(', '));
    }

    /* 2. as funções essenciais existem */
    const essenciais = ['go','dbGetAll','dbAdd','dbPut','hubRender','finRender','obrasRender',
                        'exportBackup','importBackup','celRender','nuvemRender','cfgRender'];
    const sumiram = essenciais.filter(f=>typeof window[f] !== 'function');
    if(sumiram.length) falhas.push('faltam funções do sistema: '+sumiram.join(', '));

    /* 3. nenhum dado a menos do que antes da atualização */
    const carimbo = verLerCarimbo();
    if(carimbo && carimbo.contagens && !falhas.length){
      const perdas = [];
      for(const s of Object.keys(carimbo.contagens)){
        const antes = carimbo.contagens[s];
        if(antes <= 0) continue;
        let depois = -1;
        try{ depois = (await dbGetAll(s)).length; }catch(e){ depois = -1; }
        if(depois < antes) perdas.push(`${s}: tinha ${antes}, ficou ${depois}`);
      }
      if(perdas.length) falhas.push('registros a menos depois da atualização — '+perdas.join('; '));
    }

    /* 4. todas as telas abrem sem estourar erro */
    if(!falhas.length){
      const guardaPg = PG, guardaCU = CU;
      CU = 'g';
      for(const p of PERMS.g){
        try{
          const R = {hub:hubRender, fin:finRender, obras:obrasRender, orc:orcRender, crono:cronoRender,
                     proj:projRender, mat:matRender, mo:moRender, rdo:rdoRender, med:medRender,
                     imoveis:imoveisRender, veiculos:veiculosRender, chacara:chacaraRender,
                     produtos:produtosRender, info:infoRender, midia:midiaRender, pes:pesRender,
                     rel:relRender, cel:celRender, nuvem:nuvemRender, cfg:cfgRender, ver:verRender};
          if(typeof R[p] === 'function') await R[p]();
        }catch(err){
          falhas.push('a tela "'+p+'" deu erro: '+((err && err.message) || err));
        }
        await new Promise(r=>setTimeout(r,15));
      }
      CU = guardaCU;
      if(typeof destruir3D === 'function') try{ destruir3D(); }catch(e){}
      go(guardaPg || 'hub');
    }

    await new Promise(r=>setTimeout(r,200));
    if(errosDeTela.length) falhas.push('erro de programação na tela: '+errosDeTela[0]);
  }catch(err){
    falhas.push('o autoteste não conseguiu terminar: '+((err && err.message) || err));
  }finally{
    window.removeEventListener('error', pegador);
  }
  return { ok: falhas.length === 0, falhas };
}

/* ---------------------------------------------------------------- faixa de aviso */
/* a faixa entra como primeiro elemento da área de conteúdo: aparece em
   qualquer tela, sem brigar com a barra do topo nem com a de contexto */
function verFaixa(html, cor){
  let f = document.getElementById('verbar');
  if(!html){ if(f) f.remove(); return; }
  if(!f){
    f = document.createElement('div');
    f.id = 'verbar';
    f.style.cssText = 'padding:12px 16px;margin-bottom:16px;border-radius:var(--radius);display:flex;'+
      'align-items:center;gap:12px;font-size:13.2px;font-weight:600;color:#fff;flex-wrap:wrap;'+
      'box-shadow:var(--sh2)';
    const w = document.querySelector('.wrap');
    w.insertBefore(f, w.firstChild);
  }
  f.style.background = cor || 'var(--brand)';
  f.innerHTML = html;
  window.scrollTo(0,0);
}
function verFecharFaixa(){ verFaixa(null); if(APP()) APP().vsLimparRecado(); }

/* ------------------------------------------------- aplicativo pelo navegador */
let VS_INSTALAR = null;   // convite do navegador para instalar

function verRegistrarSW(){
  if(!NAWEB() || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault(); VS_INSTALAR = e;
    if(PG === 'ver') verRender();
  });
  window.addEventListener('appinstalled', ()=>{
    VS_INSTALAR = null;
    toast('JeV Empreendimentos instalado. Ele agora abre como um programa.','ag');
  });
}

async function verInstalarApp(){
  if(!VS_INSTALAR){
    toast('Use o menu do navegador (três pontinhos) → "Instalar JeV Empreendimentos".','aw');
    return;
  }
  VS_INSTALAR.prompt();
  try{ await VS_INSTALAR.userChoice; }catch(e){}
  VS_INSTALAR = null; verRender();
}

/* no modo internet, procurar atualização é buscar o arquivo novo e reabrir */
async function verAtualizarWeb(){
  toast('Procurando versão nova…');
  try{
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg) await reg.update();
    }
    const r = await fetch('./versao.json?t='+Date.now(), {cache:'no-store'});
    const info = r.ok ? await r.json() : null;
    if(info && verCmp(info.versao, SISTEMA_VERSAO) > 0){
      toast('Versão '+info.versao+' encontrada. Reabrindo…','ag');
      setTimeout(()=>location.reload(), 900);
    }else{
      toast('Você já está na versão mais nova.','ag');
    }
  }catch(e){ toast('Não consegui verificar agora: '+(e.message||e),'ae'); }
}

/* ---------------------------------------------------------------- arranque */
async function verIniciar(){
  const app = APP();
  verRegistrarSW();
  verLigarRelogio();
  setTimeout(()=>verEspiada().catch(()=>{}), 20000);   // uma olhada logo depois de abrir

  if(app && app.aoSistema){
    app.aoSistema(d=>{
      if(d.fase === 'abrir-tela') return go('ver');
      if(d.fase === 'encontrada'){
        VS.achada = d.info;
        /* com a verificação automática ligada ele já baixa sozinho, em segundo
           plano — você não precisa fazer nada, nem parar o que está fazendo */
        if(d.automatico){ verBaixar(true); return; }
        verFaixa(`<i class="ti ti-download" style="font-size:19px"></i>
          <span>Existe uma versão nova do sistema — <b>${esc(d.info.versao)}</b>.</span>
          <span style="flex:1"></span>
          <button class="btn sm" style="background:#fff;color:#123B4E" onclick="go('ver')">Ver o que mudou</button>
          <button class="btn sm" style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.6);color:#fff" onclick="verBaixar()">Baixar agora</button>`,
          'var(--brand)');
      }
    });
  }

  if(!app) return;                       // no navegador não há o que testar

  let e = null;
  try{ e = await app.vsEstado(); }catch(err){ return; }
  VS.estado = e;

  /* a) acabou de reiniciar com uma versão nova: testa antes de aprovar */
  if(e.fase === 'testando'){
    VS.testando = true;
    const nova = (e.emTeste && e.emTeste.versao) || (e.atual && e.atual.versao) || SISTEMA_VERSAO;
    verFaixa(`<i class="ti ti-flask" style="font-size:19px"></i>
      <span>Conferindo a versão <b>${esc(nova)}</b>…</span>`, 'var(--amber)');

    const r = await verAutoteste();
    if(r.ok){
      await app.vsValidar(true, 'autoteste ok');
      VS.testando = false;
      VS.estado = await app.vsEstado();
      const notas = (e.emTeste && e.emTeste.notas) || [];
      verFaixa(`<i class="ti ti-circle-check" style="font-size:19px"></i>
        <span>Versão <b>${esc(nova)}</b> aplicada e conferida${notas.length?' — '+esc(notas[0]):'.'}</span>
        <span style="flex:1"></span>
        <button class="btn sm" style="background:#fff;color:#0F5132" onclick="go('ver')">O que mudou</button>
        <button class="btn sm" style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.6);color:#fff" onclick="verReverter()">Não era isso — reverter</button>
        <button class="ib" style="color:#fff;background:transparent;border-color:rgba(255,255,255,.45)" onclick="verFecharFaixa()"><i class="ti ti-x"></i></button>`,
        'var(--green)');
      toast('Versão '+nova+' conferida e aplicada.','ag');
    }else{
      verFaixa(`<i class="ti ti-alert-triangle" style="font-size:19px"></i>
        <span>A versão <b>${esc(nova)}</b> não passou no teste. Voltando para a anterior…</span>`, 'var(--red)');
      await app.vsValidar(false, r.falhas.join(' · '));
    }
    return;
  }

  /* b) recado deixado pelo programa (voltou atrás, ou validou na abertura passada) */
  if(e.recado && e.recado.tipo === 'revertido'){
    verFaixa(`<i class="ti ti-arrow-back-up" style="font-size:19px"></i>
      <span>A atualização <b>${esc(e.recado.versao||'')}</b> foi desfeita — você está de volta na
        <b>${esc(e.recado.voltouPara||'')}</b>.${e.recado.motivo?' Motivo: '+esc(e.recado.motivo)+'.':''}
        Seus dados não foram tocados.</span>
      <span style="flex:1"></span>
      <button class="btn sm" style="background:#fff;color:#7A4A00" onclick="go('ver')">Ver detalhes</button>
      <button class="ib" style="color:#fff;background:transparent;border-color:rgba(255,255,255,.45)" onclick="verFecharFaixa()"><i class="ti ti-x"></i></button>`,
      'var(--amber)');
    return;
  }

  /* c) tem versão baixada esperando o reinício */
  if(e.pendente){
    verFaixa(`<i class="ti ti-refresh" style="font-size:19px"></i>
      <span>A versão <b>${esc(e.pendente.versao)}</b> já está baixada e conferida.
        <b>Ela entra sozinha</b> na próxima vez que você fechar e abrir o sistema — não precisa instalar nada.</span>
      <span style="flex:1"></span>
      <button class="btn sm" style="background:#fff;color:#123B4E" onclick="verAplicar()">Aplicar agora (2 segundos)</button>
      <button class="ib" style="color:#fff;background:transparent;border-color:rgba(255,255,255,.45)" onclick="verFecharFaixa()"><i class="ti ti-x"></i></button>`,
      'var(--brand)');
  }
}

/* ---------------------------------------------------------------- ações */
async function verProcurar(silencioso){
  const app = APP();
  VS.ocupado = true; if(!silencioso) verRender();
  try{
    if(app){
      const r = await app.vsProcurar();
      if(!r.ok) throw new Error(r.erro);
      VS.achada = r.temNova ? r.info : null;
      VS.estado = await app.vsEstado();
      if(!silencioso) toast(r.temNova ? 'Versão '+r.info.versao+' disponível.' : 'Você já está na versão mais nova.', r.temNova?'':'ag');
    }else{
      const resp = await fetch(verFonte()+'versao.json?t='+Date.now(), {cache:'no-store'});
      if(!resp.ok) throw new Error('o servidor respondeu '+resp.status);
      const info = await resp.json();
      VS.achada = verCmp(info.versao, SISTEMA_VERSAO) > 0 ? info : null;
      if(!silencioso) toast(VS.achada ? 'Versão '+info.versao+' disponível.' : 'Você já está na versão mais nova.', VS.achada?'':'ag');
    }
  }catch(err){
    if(!silencioso) toast('Não consegui verificar: '+(err.message||err),'ae');
  }
  VS.ocupado = false;
  if(PG === 'ver') verRender();
}

async function verBaixar(discreto){
  const app = APP();
  if(!VS.achada){ if(!discreto) toast('Nada para baixar.','aw'); return; }
  if(!app){
    /* no navegador: abre o arquivo novo para o usuário salvar por cima */
    const url = /^https?:/i.test(VS.achada.arquivo) ? VS.achada.arquivo : verFonte()+VS.achada.arquivo;
    window.open(url,'_blank');
    toast('Baixe o arquivo e abra ele no lugar do atual. Seus dados continuam onde estão.');
    return;
  }
  VS.ocupado = true; if(!discreto) verRender();
  const r = await app.vsBaixar(VS.achada);
  VS.ocupado = false;
  if(!r.ok){ if(!discreto) toast('Não consegui baixar: '+r.erro,'ae'); verRender(); return; }
  /* antes de qualquer troca: carimbo do que existe hoje e um backup completo,
     guardado na pasta do aplicativo. Vale mesmo se você só fechar e abrir. */
  await verGuardarRede(r.versao);
  VS.estado = await app.vsEstado();
  if(!discreto) toast('Versão '+r.versao+' baixada.','ag');
  if(PG === 'ver') verRender();
  verFaixa(`<i class="ti ti-refresh" style="font-size:19px"></i>
    <span>Versão <b>${esc(r.versao)}</b> baixada e conferida.
      <b>Ela entra sozinha</b> na próxima vez que você fechar e abrir o sistema — não precisa instalar nada.</span>
    <span style="flex:1"></span>
    <button class="btn sm" style="background:#fff;color:#123B4E" onclick="verAplicar()">Aplicar agora (2 segundos)</button>
    <button class="ib" style="color:#fff;background:transparent;border-color:rgba(255,255,255,.45)" onclick="verFecharFaixa()"><i class="ti ti-x"></i></button>`, 'var(--brand)');
}

/* rede de proteção: carimbo das contagens + backup completo em arquivo */
async function verGuardarRede(versaoAlvo){
  const app = APP(); if(!app) return;
  try{
    await verCarimbar();
    const dump = {_sistema:'JEV', _versao:DB_VERSION, _data:new Date().toISOString(), dados:{}};
    for(const s of STORES) dump.dados[s] = await dbGetAll(s);
    await app.vsBackup('antes-da-'+(versaoAlvo||'nova')+'-'+hoje()+'.json', JSON.stringify(dump));
  }catch(e){ console.error('backup automático:',e); }
}

async function verAplicar(){
  const app = APP(); if(!app) return;
  toast('Guardando um backup antes de trocar de versão…');
  const alvo = (VS.estado && VS.estado.pendente && VS.estado.pendente.versao) || 'nova';
  await verGuardarRede(alvo);
  await app.vsAplicar();
}

function verReverter(){
  const app = APP();
  if(!app){ toast('A volta atrás automática só existe no aplicativo instalado.','aw'); return; }
  const ant = VS.estado && VS.estado.anterior;
  if(!ant){ toast('Não há versão anterior guardada.','aw'); return; }
  confirmar('Reverter para a versão '+ant.versao,
    `O sistema volta para a versão <b>${esc(ant.versao)}</b> e reabre em alguns segundos.<br><br>
     <b>Seus dados não são afetados</b> — só o programa volta ao que era. Depois dá para avançar
     de novo por esta mesma tela.`,
    async ()=>{
      const r = await app.vsReverter('pedido pelo usuário');
      if(!r.ok) toast('Não consegui reverter: '+r.erro,'ae');
    });
}

function verCmp(a,b){
  const pa=String(a||'0').split('.').map(n=>parseInt(n,10)||0), pb=String(b||'0').split('.').map(n=>parseInt(n,10)||0);
  for(let i=0;i<3;i++){ if((pa[i]||0)!==(pb[i]||0)) return (pa[i]||0)-(pb[i]||0); }
  return 0;
}
function verQuando(iso){
  if(!iso) return '—';
  const d = new Date(iso); if(isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
async function verSalvarAjustes(){
  const app = APP();
  const fonte = document.getElementById('vs-fonte').value.trim();
  const auto = document.getElementById('vs-auto').checked;
  const min = verDefinirIntervalo(document.getElementById('vs-min').value);
  localStorage.setItem('jev_fonte_atualizacao', fonte);
  if(app){ await app.vsConfigurar({fonte, automatico:auto}); VS.estado = await app.vsEstado(); }
  toast(`Ajustes salvos. O sistema vai procurar versão nova a cada ${min} minuto(s).`,'ag');
  verRender();
}

/* ---------------------------------------------------------------- tela */
async function verRender(){
  const root = document.getElementById('ver-root');
  const app = APP();
  if(app){ try{ VS.estado = await app.vsEstado(); }catch(e){} }
  const e = VS.estado || {};
  const atual = (e.atual && e.atual.versao) || SISTEMA_VERSAO;
  const hist = e.historico || [];

  const soArquivo = !app && !NAWEB();
  const cabeca = `<div class="ph"><div class="ic"><i class="ti ti-refresh-dot"></i></div>
    <div><h1>Atualizações</h1><p>${soArquivo ? 'Versão do sistema, backup e como chega uma versão nova'
                                              : 'Versão do sistema, teste automático e volta atrás'}</p></div>
    <div class="sp"></div>
    ${soArquivo ? '' : `<button class="btn gh" onclick="verProcurar(false)" ${VS.ocupado?'disabled':''}>
      <i class="ti ti-${VS.ocupado?'loader-2':'search'}"></i>${VS.ocupado?'Verificando…':'Procurar atualização'}</button>`}</div>`;

  /* ---- cartão da versão em uso ---- */
  const emUso = `<div class="card"><div class="hd"><i class="ti ti-versions"></i>Versão em uso</div><div class="bd">
    <div class="kg">
      <div class="kc br"><div class="lb"><i class="ti ti-app-window"></i>Sistema</div><div class="vl">${esc(atual)}</div>
        <div class="sb">${e.atual?verQuando(e.atual.quando):'arquivo aberto com dois cliques'}</div></div>
      ${soArquivo ? `
      <div class="kc gn"><div class="lb"><i class="ti ti-database"></i>Onde ficam os dados</div>
        <div class="vl" style="font-size:17px">Neste computador</div>
        <div class="sb">no navegador, fora do arquivo</div></div>
      <div class="kc am"><div class="lb"><i class="ti ti-wifi-off"></i>Internet</div>
        <div class="vl" style="font-size:17px">Não precisa</div>
        <div class="sb">funciona no canteiro e na chácara</div></div>` : `
      <div class="kc bl"><div class="lb"><i class="ti ti-device-desktop"></i>Programa</div><div class="vl">${esc(e.versaoPrograma||'—')}</div>
        <div class="sb">${app?'aplicativo instalado':'sem aplicativo — modo navegador'}</div></div>
      <div class="kc gn"><div class="lb"><i class="ti ti-clock-check"></i>Última verificação</div>
        <div class="vl" style="font-size:17px">${e.ultimaChecagem?new Date(e.ultimaChecagem).toLocaleDateString('pt-BR'):'—'}</div>
        <div class="sb">${e.automatico===false?'verificação automática desligada':'verifica sozinho a cada '+verIntervalo()+' min'}</div></div>`}
    </div>
    ${(e.atual && (e.atual.notas||[]).length)?`<div class="sh"><i class="ti ti-list-check"></i>O que veio nesta versão</div>
      <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.85;color:var(--text2)">
      ${e.atual.notas.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}
  </div></div>`;

  /* ---- versão nova encontrada ---- */
  const achada = VS.achada ? `<div class="card" style="border-color:var(--brand)">
    <div class="hd" style="background:var(--brand-bg)"><i class="ti ti-download"></i>Versão ${esc(VS.achada.versao)} disponível</div>
    <div class="bd">
      ${VS.achada.data?`<div class="tt" style="margin-bottom:8px">Publicada em ${esc(VS.achada.data)}</div>`:''}
      ${(VS.achada.notas||[]).length?`<ul style="margin:0 0 12px;padding-left:20px;font-size:13px;line-height:1.85">
        ${VS.achada.notas.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}
      <div class="brow">
        <button class="btn gn" onclick="verBaixar()" ${VS.ocupado?'disabled':''}>
          <i class="ti ti-download"></i>${app?'Baixar agora':'Baixar o arquivo novo'}</button>
      </div>
      <div class="tt" style="margin-top:9px">${app
        ? 'A versão baixada só entra no ar quando você reiniciar — e mesmo assim ela passa por um teste antes de virar oficial.'
        : 'No modo navegador, salve o arquivo baixado no lugar do atual. Os dados ficam no navegador e não se perdem.'}</div>
    </div></div>` : '';

  /* ---- versão baixada esperando reinício ---- */
  const pendente = (e.pendente) ? `<div class="card" style="border-color:var(--brand)">
    <div class="hd" style="background:var(--brand-bg)"><i class="ti ti-clock-play"></i>
      Versão ${esc(e.pendente.versao)} baixada, esperando o reinício</div><div class="bd">
      <div class="al ai"><i class="ti ti-info-circle"></i><div>Não precisa fazer nada: da próxima vez que você
        <b>fechar e abrir</b> o sistema, ele já abre na versão nova. Não há instalador, não há espera.<br>
        Ao abrir, ele faz o <b>autoteste</b> — confere o banco de dados, o número de registros e todas as telas.
        Passou, vira oficial. Não passou, ele volta sozinho para a ${esc(atual)}.</div></div>
      <div class="brow"><button class="btn gn" onclick="verAplicar()"><i class="ti ti-refresh"></i>Aplicar agora, sem esperar</button></div>
      <div class="tt" style="margin-top:8px">O botão acima só adianta as coisas: fecha e abre o sistema em uns 2 segundos.</div>
    </div></div>` : '';

  /* ---- reverter ---- */
  const reverter = !app ? '' : `<div class="card"><div class="hd"><i class="ti ti-arrow-back-up"></i>Reverter atualização</div><div class="bd">
    ${e.anterior ? `
      <div class="al aw"><i class="ti ti-alert-triangle"></i><div>Se alguma coisa não ficou como você pediu, volte para a
        versão anterior. <b>Os dados não são afetados</b> — só o programa volta ao que era.</div></div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px">
        <div><div class="tt">Você está usando</div><b style="font-size:17px">${esc(atual)}</b></div>
        <i class="ti ti-arrow-right" style="color:var(--text3)"></i>
        <div><div class="tt">Volta para</div><b style="font-size:17px">${esc(e.anterior.versao)}</b>
          <div class="tt">guardada em ${verQuando(e.anterior.quando)}</div></div>
      </div>
      <button class="btn rd" onclick="verReverter()"><i class="ti ti-arrow-back-up"></i>Reverter para a ${esc(e.anterior.versao)}</button>
      <div class="tt" style="margin-top:9px">Reverter é reversível: a versão que sai fica guardada no lugar da que entra,
        então dá para avançar de novo por aqui.</div>`
    : `<div class="al ai"><i class="ti ti-info-circle"></i><div>Ainda não há versão anterior guardada${app?'':' — e no modo navegador a volta atrás automática não existe'}.
        ${app?'Assim que a primeira atualização for aplicada, o botão de reverter aparece aqui.'
             :'Guarde uma cópia do arquivo atual do sistema antes de trocar por um novo.'}</div></div>`}
  </div></div>`;

  /* ---- histórico ---- */
  const rotulos = {instalada:'veio no instalador', aplicada:'aplicada', validada:'conferida e aprovada',
                   revertida:'revertida'};
  const cores = {instalada:'var(--text3)', aplicada:'var(--blue)', validada:'var(--green)', revertida:'var(--amber)'};
  const historico = hist.length ? `<div class="card tw"><div class="hd"><i class="ti ti-history"></i>Histórico</div><div class="bd">
    <table><thead><tr><th>Quando</th><th>Versão</th><th>O que aconteceu</th><th>Observação</th></tr></thead><tbody>
    ${hist.map(h=>`<tr><td class="tt">${verQuando(h.quando)}</td><td><b>${esc(h.versao||'—')}</b></td>
      <td><span style="color:${cores[h.acao]||'var(--text2)'};font-weight:700">${rotulos[h.acao]||esc(h.acao)}</span></td>
      <td class="tt">${esc(h.motivo || (h.para?'voltou para a '+h.para:'') || (h.deixando?'saindo da '+h.deixando:'') || '')}</td></tr>`).join('')}
    </tbody></table></div></div>` : '';

  /* ---- como funciona + ajustes ---- */
  const ajustes = (!app && !NAWEB()) ? '' : `<div class="card"><div class="hd"><i class="ti ti-settings-automation"></i>Como as atualizações chegam</div><div class="bd">
    <div style="font-size:12.5px;line-height:1.8;color:var(--text2);margin-bottom:12px">
      O sistema inteiro é um arquivo só. Quando sai uma melhoria, o aplicativo <b>baixa sozinho, em segundo plano</b>,
      sem atrapalhar o que você está fazendo, e guarda de lado. A troca acontece <b>na próxima vez que você fechar e
      abrir o sistema</b> — nunca no meio do trabalho, e nunca com instalador.
      Hoje ele olha a cada <b>${verIntervalo()} minutos</b>.<br>
      Ao abrir, ele confere sozinho o banco de dados, o número de registros e todas as telas. Se algo estiver errado —
      ou se o sistema nem abrir — ele volta para a versão anterior sem você pedir. A versão que sai fica guardada, e o
      botão de reverter acima desfaz a troca a qualquer momento.
    </div>
    <div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>De onde vêm as atualizações</label>
        <input id="vs-fonte" value="${esc(e.fonte || verFonte())}" placeholder="${esc(FONTE_PADRAO)}"></div>
      <div class="fg"><label>Procurar a cada (minutos)</label>
        <input id="vs-min" type="number" min="1" max="720" value="${verIntervalo()}">
        <div class="hint">${verIntervalo()<=15
          ? 'Ritmo de desenvolvimento: as melhorias chegam quase na hora.'
          : 'Depois que o sistema estabilizar, 180 (3 horas) é suficiente.'}</div></div>
    </div>
    <label style="display:flex;align-items:center;gap:9px;padding:4px 0 10px;font-weight:600;font-size:13px">
      <input type="checkbox" id="vs-auto" ${e.automatico===false?'':'checked'} style="width:17px;height:17px">
      Procurar e baixar a versão nova sozinho, em segundo plano</label>
    <button class="btn gh" onclick="verSalvarAjustes()"><i class="ti ti-device-floppy"></i>Salvar ajustes</button>
  </div></div>`;

  let semApp = '';
  if(!app && NAWEB()){
    semApp = `<div class="card" style="border-color:var(--green)">
      <div class="hd" style="background:var(--green-bg)"><i class="ti ti-cloud-check"></i>
        ${INSTALADO() ? 'Aplicativo instalado pelo navegador' : 'Instale como aplicativo, sem instalador'}</div><div class="bd">
      ${INSTALADO()
        ? `<div class="al ag"><i class="ti ti-circle-check"></i><div>Este é o JeV Empreendimentos rodando como
             <b>programa próprio</b>, com janela e ícone. Ele <b>se atualiza sozinho</b>: toda vez que você abre
             com internet, já abre na versão mais nova. Não existe instalador, nem aviso do Windows, nem nada
             para baixar.</div></div>`
        : `<div class="al ai"><i class="ti ti-info-circle"></i><div>Dá para transformar esta página em um
             <b>programa de verdade</b> — com ícone na área de trabalho e janela própria, sem barra de endereço.
             Não baixa nada, não passa pelo aviso do Windows, e depois <b>se atualiza sozinho</b> toda vez que
             você abre com internet.<br>
             Se o botão abaixo não aparecer, use o menu do Chrome (três pontinhos, no canto) →
             <b>Transmitir, salvar e compartilhar</b> → <b>Instalar página como aplicativo</b>.</div></div>`}
      <div class="brow">
        ${INSTALADO() ? '' : `<button class="btn gn" onclick="verInstalarApp()"><i class="ti ti-download"></i>Instalar como aplicativo</button>`}
        <button class="btn gh" onclick="verAtualizarWeb()"><i class="ti ti-refresh"></i>Procurar atualização agora</button>
      </div>
      <div class="tt" style="margin-top:9px">Seus dados ficam gravados neste computador, no navegador — como sempre.
        Faça o backup pelo botão do banco de dados, no alto da tela, e guarde o arquivo.</div>
    </div></div>`;
  }else if(!app){
    semApp = `<div class="card"><div class="hd"><i class="ti ti-file-code"></i>Sistema em arquivo único</div><div class="bd">
      <div class="al ai"><i class="ti ti-info-circle"></i><div>Este sistema é <b>um arquivo só</b>: você abre com dois
        cliques e pronto — sem instalar nada, sem servidor, sem internet obrigatória. Ele funciona no computador, no
        notebook e no celular, é só levar o arquivo junto.</div></div>
      <div class="sh"><i class="ti ti-refresh"></i>Como chega uma versão nova</div>
      <div style="font-size:12.5px;line-height:1.8;color:var(--text2)">
        Chega como <b>um arquivo novo</b>, com a versão no nome (por exemplo
        <span class="mono">jev_empreendimentos_v${esc(SISTEMA_VERSAO)}.html</span>). Você guarda o novo na mesma pasta e
        passa a abrir por ele — pode apagar o antigo ou deixar guardado, tanto faz.<br>
        <b>Seus dados não vão junto no arquivo e não se perdem:</b> eles ficam gravados neste computador, no navegador.
        Abrir a versão nova é abrir o mesmo sistema, com tudo o que você já lançou no lugar.
      </div>
      <div class="al aw" style="margin-top:12px"><i class="ti ti-alert-triangle"></i><div>A única coisa que você precisa
        fazer de tempos em tempos: <b>baixar o backup</b> pelo botão do banco de dados, no alto da tela, e guardar o
        arquivo no e-mail, na nuvem ou num pendrive. É ele que salva você se o computador der problema.</div></div>
      <div class="brow" style="margin-top:12px">
        <button class="btn gn" onclick="exportBackup()"><i class="ti ti-download"></i>Baixar backup agora</button>
        <button class="btn gh" onclick="openBackup()"><i class="ti ti-upload"></i>Restaurar backup</button>
      </div>
    </div></div>`;
  }

  root.innerHTML = cabeca + semApp + emUso + achada + pendente + reverter + historico + ajustes;
}

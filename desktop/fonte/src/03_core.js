/* =========================================================================
   JeV EMPREENDIMENTOS — Núcleo: banco, navegação em hub, utilitários, gráficos
   ========================================================================= */

const SISTEMA_VERSAO = '1.0.2';   // versão do sistema — trocada por ./versao.sh
const DB_NAME = 'JEV_DB';
const DB_VERSION = 3;   // v2: tabela 'guias' (celular) · v3: 'lixeira' e 'sync' (nuvem)
const STORES = [
  'config','contas','financeiro','recorrencias','pessoas',
  'obras','etapas','orcamento','insumos','compras','estoque','equipe','apontamentos','rdo','projetos','medicoes',
  'imoveis','veiculos','contratos','manutencoes',
  'lotes','ciclos','produtos','vendas','canais','videos',
  'guias','lixeira','sync'
];
let db = null;

function initDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e=>{
      const d = e.target.result;
      const trans = e.target.transaction;
      STORES.forEach(s=>{
        let st;
        if(!d.objectStoreNames.contains(s)){
          st = d.createObjectStore(s,{keyPath:'id',autoIncrement:true});
          if(['etapas','orcamento','compras','estoque','apontamentos','rdo','projetos','medicoes'].includes(s))
            st.createIndex('obraId','obraId',{unique:false});
          if(s==='financeiro'){ st.createIndex('un','un',{unique:false}); st.createIndex('data','data',{unique:false}); }
        }else{
          st = trans.objectStore(s);
        }
        // índice usado pela sincronização; entra também nas tabelas antigas
        if(!['lixeira','sync'].includes(s) && !st.indexNames.contains('_gid'))
          st.createIndex('_gid','_gid',{unique:false});
      });
    };
    req.onsuccess = e=>{ db = e.target.result; res(db); };
    req.onerror  = e=>rej(e.target.error);
  });
}
function tx(store,mode){ return db.transaction(store,mode).objectStore(store); }
function dbGetAll(store){ return new Promise((res,rej)=>{ const r=tx(store,'readonly').getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); }
function dbGet(store,id){ return new Promise((res,rej)=>{ const r=tx(store,'readonly').get(Number(id)); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function dbAdd(store,data){ return new Promise((res,rej)=>{ const r=tx(store,'readwrite').add({...data,_ts:Date.now(),_user:CU}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function dbPut(store,data){ return new Promise((res,rej)=>{ const r=tx(store,'readwrite').put({...data,_ts:Date.now()}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
/* apagar deixa um rastro na lixeira, para a nuvem saber que o registro
   sumiu e apagar também nos outros aparelhos */
async function dbDel(store,id,semRastro){
  let alvo = null;
  if(!semRastro && store!=='lixeira' && store!=='sync'){
    try{ alvo = await dbGet(store,id); }catch(e){}
  }
  await new Promise((res,rej)=>{ const r=tx(store,'readwrite').delete(Number(id)); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error); });
  if(alvo && alvo._gid){
    try{ await dbPutRaw('lixeira',{id:alvo._gid, tabela:store, _ts:Date.now()}); }catch(e){}
  }
  return true;
}
/* gravar sem mexer no carimbo de hora — usado pela sincronização,
   para não ficar reenviando o que acabou de chegar da nuvem */
function dbPutRaw(store,data){ return new Promise((res,rej)=>{ const r=tx(store,'readwrite').put(data); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function dbAddRaw(store,data){ return new Promise((res,rej)=>{ const r=tx(store,'readwrite').add(data); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function dbByObra(store,obraId){ return (await dbGetAll(store)).filter(x=>Number(x.obraId)===Number(obraId)); }

/* ---------------- Estado global ---------------- */
let CU = 'g';           // perfil atual
let PG = 'hub';         // página atual
let UNAT = null;        // unidade de negócio em contexto
let OBRA = null;        // obra ativa
let CFG = {};           // configuração da empresa
let FIN = [];           // cache de lançamentos financeiros

const PERFIS = {
  g:{nome:'Gestão',    sigla:'G', desc:'Acesso total: financeiro, todos os negócios, cadastros e configurações'},
  o:{nome:'Operação',  sigla:'O', desc:'Todos os negócios e cadastros; do financeiro vê apenas contas a pagar e receber'},
  c:{nome:'Campo',     sigla:'C', desc:'Foco na execução: obras, chácara, diário e compras — sem valores consolidados'}
};
const PERMS = {
  g:['hub','fin','obras','orc','crono','proj','mat','mo','rdo','med','imoveis','veiculos','chacara','produtos','info','midia','pes','rel','cel','nuvem','cfg','ver'],
  o:['hub','fin','obras','orc','crono','proj','mat','mo','rdo','med','imoveis','veiculos','chacara','produtos','info','midia','pes','rel','cel','nuvem','ver'],
  c:['hub','obras','crono','mat','mo','rdo','proj','chacara','pes','cel']
};

/* ---------------- Navegação ---------------- */
function go(pg){
  if(!PERMS[CU].includes(pg)){ toast('Seu perfil não tem acesso a esta área.','ae'); return; }
  if(typeof destruir3D === 'function' && pg !== 'proj') destruir3D();
  fecharDrops();
  PG = pg;
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-'+pg)?.classList.add('on');
  document.querySelectorAll('.mnav button').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.bnav .b').forEach(b=>b.classList.remove('on'));
  const u = unidadeDaPagina(pg);
  UNAT = u ? u.id : null;
  document.getElementById(u?'mn-neg':'mn-'+pg)?.classList.add('on');
  document.getElementById('bn-'+pg)?.classList.add('on');
  renderCtxBar(u);
  window.scrollTo(0,0);
  const R = {hub:hubRender, fin:finRender, obras:obrasRender, orc:orcRender, crono:cronoRender, proj:projRender,
             mat:matRender, mo:moRender, rdo:rdoRender, med:medRender, imoveis:imoveisRender,
             veiculos:veiculosRender, chacara:chacaraRender, produtos:produtosRender, info:infoRender,
             midia:midiaRender, pes:pesRender, rel:relRender, cel:celRender, nuvem:nuvemRender, cfg:cfgRender,
             ver:verRender};
  safeRender(R[pg], pg);
}
async function safeRender(fn,pg){
  if(!fn) return;
  try{ await fn(); }
  catch(err){
    console.error('Erro em '+pg+':',err);
    const el = document.getElementById(pg+'-root');
    if(el) el.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i><div>
      <b>Não foi possível carregar esta área.</b><br>${esc(err.message||String(err))}
      <br><small>Recarregue a página. Se continuar, restaure o último backup.</small></div></div>`;
  }
}
function unidadeDaPagina(pg){ return UNIDADES.find(u=>u.pg===pg || (u.tabs||[]).some(t=>t[0]===pg)); }

function renderCtxBar(u){
  const bar = document.getElementById('ctxbar');
  const main = document.getElementById('main');
  if(!u || !(u.tabs||[]).length){
    bar.classList.remove('on'); main.classList.remove('ctx'); return;
  }
  bar.style.setProperty('--unc',u.cor);
  bar.style.setProperty('--unbg',u.bg);
  bar.innerHTML = `<button class="ctxback" onclick="go('hub')"><i class="ti ti-arrow-left"></i>
      <i class="ti ${u.ic}"></i>${esc(u.curto)}</button>` +
    u.tabs.filter(t=>PERMS[CU].includes(t[0]))
      .map(t=>`<button class="cb ${PG===t[0]?'on':''}" onclick="go('${t[0]}')"><i class="ti ${t[2]}"></i>${esc(t[1])}</button>`).join('') +
    (u.id==='obras' ? `<div style="flex:1;min-width:10px"></div>
      <div class="obsel"><i class="ti ti-building-community"></i>
        <select id="obra-ativa" onchange="setObraAtiva(this.value)"></select></div>` : '');
  bar.classList.add('on'); main.classList.add('ctx');
  if(u.id==='obras' && typeof refreshObraSelect==='function') refreshObraSelect();
}

function menuNegocios(el){
  const d = document.getElementById('dropneg');
  if(d.style.display==='block'){ fecharDrops(); return; }
  d.innerHTML = UNIDADES.filter(u=>PERMS[CU].includes(u.pg)).map(u=>
    `<div onclick="go('${u.pg}')" style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;cursor:pointer"
       onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
       <div style="width:32px;height:32px;border-radius:9px;background:${u.bg};color:${u.cor};display:flex;align-items:center;justify-content:center;font-size:18px">
         <i class="ti ${u.ic}"></i></div>
       <div><b style="font-size:13px;display:block">${esc(u.nome)}</b><span class="tt">${esc(u.desc)}</span></div></div>`).join('');
  const r = el.getBoundingClientRect();
  d.style.display = 'block';
  const w = 280;
  d.style.left = Math.max(8, Math.min(window.innerWidth-w-8, r.left)) + 'px';
  d.style.top  = (r.bottom < window.innerHeight/2 ? r.bottom+6 : r.top - d.offsetHeight - 6) + 'px';
}
function menuMais(el){
  const d = document.getElementById('dropneg');
  if(d.style.display==='block'){ fecharDrops(); return; }
  const its = [['cel','Celular da equipe','ti-device-mobile'],['nuvem','Nuvem da JeV','ti-cloud'],['pes','Cadastros','ti-address-book'],['cfg','Configurações','ti-settings'],
               ['ver','Atualizações','ti-refresh-dot'],
               ['__bkp','Backup e restauração','ti-database-export'],['__perf','Trocar perfil de acesso','ti-user-cog']];
  d.innerHTML = its.filter(i=>i[0].startsWith('__')||PERMS[CU].includes(i[0])).map(i=>
    `<div onclick="${i[0]==='__bkp'?'fecharDrops();openBackup()':i[0]==='__perf'?'fecharDrops();trocarPerfil()':`go('${i[0]}')`}"
       style="display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:9px;cursor:pointer;font-size:13.5px;font-weight:600">
       <i class="ti ${i[2]}" style="font-size:19px;color:var(--text2)"></i>${i[1]}</div>`).join('');
  const r = el.getBoundingClientRect();
  d.style.display = 'block';
  d.style.left = Math.max(8, Math.min(window.innerWidth-268, r.left-90)) + 'px';
  d.style.top  = (r.top - d.offsetHeight - 8) + 'px';
}
function fecharDrops(){ const d=document.getElementById('dropneg'); if(d) d.style.display='none'; }
document.addEventListener('click',e=>{
  const d = document.getElementById('dropneg');
  if(d && d.style.display==='block' && !d.contains(e.target) && !e.target.closest('#mn-neg') && !e.target.closest('.bnav')) fecharDrops();
});

function setU(u){
  CU = u;
  document.getElementById('perf-av').textContent = PERFIS[u].sigla;
  document.getElementById('perf-nm').textContent = PERFIS[u].nome;
  if(!PERMS[u].includes(PG)) go('hub'); else go(PG);
}
function trocarPerfil(){
  modal('Perfil de acesso','ti-user-cog',
    `<div class="al ai"><i class="ti ti-info-circle"></i>O perfil simplifica a tela de cada pessoa da equipe.
      Não é senha: qualquer um pode trocar. Serve para quem está no campo não se perder em telas que não usa.</div>` +
    Object.entries(PERFIS).map(([k,p])=>`
      <div onclick="setU('${k}');closeModal('mk-form')" style="display:flex;gap:12px;align-items:center;padding:13px;
        border:2px solid ${CU===k?'var(--brand)':'var(--border)'};border-radius:12px;margin-bottom:9px;cursor:pointer;
        background:${CU===k?'var(--brand-bg)':'var(--bg2)'}">
        <div style="width:40px;height:40px;border-radius:50%;background:${CU===k?'var(--brand)':'var(--bg4)'};
          color:${CU===k?'#fff':'var(--text2)'};display:flex;align-items:center;justify-content:center;font-weight:900">${p.sigla}</div>
        <div><b style="font-size:14px">${p.nome}</b><div class="tt" style="line-height:1.45">${p.desc}</div></div>
      </div>`).join(''),
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`,'sm');
}

/* ---------------- Utilitários ---------------- */
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_L = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function num(v){ const n=parseFloat(v); return isNaN(n)?0:n; }
function moeda(v){ return 'R$ '+num(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function moedaK(v){
  v = num(v);
  const s = v<0?'-':'';
  const a = Math.abs(v);
  if(a>=1e6) return s+'R$ '+(a/1e6).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' M';
  if(a>=1e3) return s+'R$ '+(a/1e3).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' mil';
  return moeda(v);
}
function qtd(v,d){ return num(v).toLocaleString('pt-BR',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d}); }
function pct(v){ return num(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'; }
function hoje(){ return new Date().toISOString().slice(0,10); }
function mesAtual(){ return hoje().slice(0,7); }
function dbr(iso){ if(!iso) return '—'; const p=String(iso).slice(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso; }
function dmes(iso){ if(!iso) return '—'; const p=String(iso).slice(0,7).split('-'); return `${MESES[parseInt(p[1])-1]}/${p[0].slice(2)}`; }
function dmesL(mk){ const p=String(mk).split('-'); return `${MESES_L[parseInt(p[1])-1]} de ${p[0]}`; }
function diasEntre(a,b){ if(!a||!b) return 0; return Math.round((new Date(b)-new Date(a))/864e5); }
function addDias(iso,n){ const d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function addMeses(iso,n){
  const [y,m,d] = String(iso).slice(0,10).split('-').map(Number);
  const dt = new Date(y, m-1+n, 1);
  const ult = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();
  dt.setDate(Math.min(d,ult));
  return dt.toISOString().slice(0,10);
}
function mesesEntre(a,b){ const [y1,m1]=a.split('-').map(Number), [y2,m2]=b.split('-').map(Number); return (y2-y1)*12+(m2-m1); }
function listaMeses(de,ate){ const out=[]; let c=de; while(c<=ate && out.length<120){ out.push(c); const [y,m]=c.split('-').map(Number); const n=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`; c=n; } return out; }
function val(id){ const e=document.getElementById(id); return e?String(e.value).trim():''; }
function setVal(id,v){ const e=document.getElementById(id); if(e) e.value = v==null?'':v; }
function chk(id){ const e=document.getElementById(id); return e?e.checked:false; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function iniciais(n){ return String(n||'').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase(); }

function toast(msg,cls){
  const w = document.getElementById('toast-wrap');
  const map = {ag:['#1F7A44','ti-circle-check'],ae:['#A8291F','ti-alert-circle'],ai:['#123B4E','ti-info-circle'],aw:['#B26A0C','ti-alert-triangle']};
  const [bg,ic] = map[cls||'ag']||map.ag;
  const d = document.createElement('div');
  d.style.cssText = `background:${bg};color:#fff;padding:11px 17px;border-radius:11px;font-size:13px;font-weight:600;
    box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;gap:9px;align-items:center;max-width:90vw`;
  d.innerHTML = `<i class="ti ${ic}" style="font-size:18px"></i><span>${esc(msg)}</span>`;
  w.appendChild(d);
  setTimeout(()=>{ d.style.transition='opacity .3s'; d.style.opacity='0'; setTimeout(()=>d.remove(),300); },3200);
}
function openModal(id){ document.getElementById(id).classList.add('on'); document.body.style.overflow='hidden'; }
function closeModal(id){ document.getElementById(id).classList.remove('on'); document.body.style.overflow=''; }
function modal(title,icon,body,foot,size){
  document.getElementById('mkf-title').textContent = title;
  document.getElementById('mkf-ic').className = 'ti '+(icon||'ti-edit');
  document.getElementById('mkf-body').innerHTML = body;
  document.getElementById('mkf-foot').innerHTML = foot||`<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`;
  document.getElementById('mkf-w').className = 'mw'+(size?' '+size:'');
  openModal('mk-form');
}
function confirmar(titulo,texto,fn){
  document.getElementById('mkc-title').textContent = titulo;
  document.getElementById('mkc-body').innerHTML = `<div style="font-size:13.5px;line-height:1.6">${texto}</div>`;
  document.getElementById('mkc-ok').onclick = async()=>{ closeModal('mk-conf'); await fn(); };
  openModal('mk-conf');
}
function printar(html){ document.getElementById('mkp-body').innerHTML = html; openModal('mk-print'); }

function baixarArquivo(conteudo,nome,mime){
  const blob = new Blob(['﻿'+conteudo],{type:mime||'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function exportCSV(linhas,nome){
  baixarArquivo(linhas.map(l=>l.map(c=>`"${String(c==null?'':c).replace(/"/g,'""')}"`).join(';')).join('\r\n'),
    nome,'text/csv;charset=utf-8');
  toast('CSV exportado — abra no Excel.');
}
function comprimirImagem(file,maxW,q){
  return new Promise((res,rej)=>{
    const fr = new FileReader();
    fr.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const sc = Math.min(1,(maxW||1280)/img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width*sc); c.height = Math.round(img.height*sc);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        res(c.toDataURL('image/jpeg',q||0.72));
      };
      img.onerror = rej; img.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}

/* ---------------- Impressão institucional ---------------- */
function prnHead(titulo,subtitulo){
  const c = CFG||{};
  const logo = c.logo ? `<img src="${c.logo}" style="width:58px;height:58px;object-fit:contain">`
                      : `<div class="lg"><svg viewBox="0 0 54 54" width="54" height="54" xmlns="http://www.w3.org/2000/svg" aria-label="JeV" style="display:block"><defs><linearGradient id="fprn" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#1C5872"/><stop offset="1" stop-color="#123B4E"/></linearGradient><linearGradient id="mprn" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#E09659"/><stop offset="1" stop-color="#C2703D"/></linearGradient></defs><g><rect x="0.00" y="0.00" width="54" height="54" rx="12.69" fill="url(#fprn)"/><g fill="url(#mprn)"><path d="M13.874220000000001 12.890070000000001V26.957610000000003Q13.874220000000001 30.22434 12.034845 31.990140000000004Q10.19547 33.75594 7.075889999999999 33.75594Q3.8091599999999994 33.75594 1.837349999999999 31.901850000000003Q-0.13446000000000147 30.047760000000004 -0.13446000000000147 26.63388H4.868639999999999Q4.868639999999999 27.928800000000003 5.3983799999999995 28.590975Q5.92812 29.25315 6.9287399999999995 29.25315Q7.84107 29.25315 8.341380000000001 28.664550000000002Q8.84169 28.075950000000002 8.84169 26.957610000000003V12.890070000000001Z M32.91543 26.545590000000004H21.52602Q21.64374 28.075950000000002 22.511925 28.885275Q23.380110000000002 29.6946 24.6456 29.6946Q26.52912 29.6946 27.264870000000002 28.105380000000004H32.62113Q32.20911 29.724030000000003 31.134915000000003 31.018950000000004Q30.060720000000003 32.31387 28.44207 33.049620000000004Q26.82342 33.78537 24.822180000000003 33.78537Q22.408920000000002 33.78537 20.5254 32.75532Q18.64188 31.725270000000002 17.5824 29.812320000000003Q16.52292 27.899370000000005 16.52292 25.33896Q16.52292 22.778550000000003 17.567684999999997 20.8656Q18.61245 18.95265 20.49597 17.9226Q22.37949 16.89255 24.822180000000003 16.89255Q27.20601 16.89255 29.0601 17.89317Q30.91419 18.893790000000003 31.958955000000003 20.747880000000002Q33.00372 22.60197 33.00372 25.07409Q33.00372 25.780410000000003 32.91543 26.545590000000004ZM27.85347 23.749740000000003Q27.85347 22.45482 26.970570000000002 21.689640000000004Q26.087670000000003 20.924460000000003 24.76332 20.924460000000003Q23.49783 20.924460000000003 22.629645 21.660210000000003Q21.76146 22.395960000000002 21.55545 23.749740000000003Z M54.63477 12.890070000000001 47.3067 33.54993H41.00868L33.68061 12.890070000000001H39.03687L44.15769 28.487970000000004L49.30794 12.890070000000001Z"/><rect x="12.96" y="38.95" width="5.51" height="3.24" rx="1.62"/><rect x="19.98" y="38.95" width="7.77" height="3.24" rx="1.62"/><rect x="29.26" y="38.95" width="11.78" height="3.24" rx="1.62"/></g></g></svg></div>`;
  return `<div class="prn"><div class="phd">${logo}
    <div class="tx">
      <b>${esc(c.empresa||'JeV Empreendimentos')}</b>
      <span>${esc(c.cnpj?'CNPJ: '+c.cnpj:'')}${c.cnpj&&c.endereco?' — ':''}${esc(c.endereco||'')}</span>
      <span>${esc(c.cidade||'')}${c.cidade&&c.tel?' — ':''}${esc(c.tel?'Fone: '+c.tel:'')}${c.tel&&c.email?' — ':''}${esc(c.email||'')}</span>
      <span>${esc(c.respTec?'Responsável técnico: '+c.respTec:'')}${c.respTec&&c.crea?' — '+esc(c.crea):''}</span>
    </div></div>
    <div class="ptt">${esc(titulo)}</div><div class="pst">${esc(subtitulo||'')}</div>`;
}
function prnSig(l1,r1,l2,r2){
  return `<div class="psig">
    <div><div class="ln">${esc(l1||CFG.respTec||'JeV Empreendimentos')}</div><div class="rl">${esc(r1||'Responsável')}</div></div>
    <div><div class="ln">${esc(l2||'Ciente')}</div><div class="rl">${esc(r2||'Data e assinatura')}</div></div></div>`;
}
function prnFoot(){
  const d = new Date();
  return `<div class="pft"><span>${esc(CFG.empresa||'JeV Empreendimentos')} — documento gerado pelo sistema de gestão</span>
    <span>Emitido em ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div></div>`;
}

/* ---------------- Gráficos SVG ---------------- */
function barChart(data,opt){
  opt = opt||{};
  const h = opt.h||200, pad=28, n=data.length;
  if(!n) return `<div class="empty"><i class="ti ti-chart-bar"></i>Sem dados no período</div>`;
  const max = Math.max(...data.map(d=>Math.abs(num(d.val))),1);
  const bw = Math.max(24, Math.min(60, 380/n));
  const w = Math.max(290, n*(bw+14)+pad*2);
  let bars='';
  data.forEach((d,i)=>{
    const bh = Math.max(2,(Math.abs(num(d.val))/max)*(h-54));
    const x = pad+i*(bw+14), y = h-32-bh;
    bars += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${d.color||'#123B4E'}"><title>${esc(d.label)}: ${esc(d.fmt||qtd(d.val))}</title></rect>
      <text x="${x+bw/2}" y="${y-5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#5B6260">${esc(d.fmt||qtd(d.val,0))}</text>
      <text x="${x+bw/2}" y="${h-15}" text-anchor="middle" font-size="9.5" fill="#8E9491">${esc(String(d.label).slice(0,11))}</text>`;
  });
  return `<div class="cwrap"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="max-width:none">
    <line x1="${pad-6}" y1="${h-32}" x2="${w-pad+6}" y2="${h-32}" stroke="#E2DFD6"/>${bars}</svg></div>`;
}
function barChart2(data,opt){   // barras agrupadas receita x despesa
  opt = opt||{};
  const h = opt.h||220, pad=34, n=data.length;
  if(!n) return `<div class="empty"><i class="ti ti-chart-bar"></i>Sem dados no período</div>`;
  const max = Math.max(...data.flatMap(d=>[Math.abs(num(d.a)),Math.abs(num(d.b))]),1);
  const gw = Math.max(38, Math.min(80, 460/n));
  const w = Math.max(300, n*(gw+12)+pad*2);
  let g='';
  data.forEach((d,i)=>{
    const x = pad+i*(gw+12), bw=(gw-4)/2;
    [[num(d.a),opt.corA||'#1F7A44',0],[num(d.b),opt.corB||'#A8291F',bw+4]].forEach(([v,c,dx])=>{
      const bh = Math.max(1,(Math.abs(v)/max)*(h-56));
      g += `<rect x="${x+dx}" y="${h-34-bh}" width="${bw}" height="${bh}" rx="3" fill="${c}"><title>${esc(d.label)}: ${moeda(v)}</title></rect>`;
    });
    g += `<text x="${x+gw/2}" y="${h-16}" text-anchor="middle" font-size="9.5" fill="#8E9491">${esc(d.label)}</text>`;
    const res = num(d.a)-num(d.b);
    if(num(d.a) || num(d.b)){
      g += `<text x="${x+gw/2}" y="${h-46-((Math.max(Math.abs(num(d.a)),Math.abs(num(d.b)))/max)*(h-56))}" text-anchor="middle"
        font-size="9" font-weight="800" fill="${res>=0?'#1F7A44':'#A8291F'}">${moedaK(res).replace('R$ ','')}</text>`;
    }
  });
  return `<div class="cwrap"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="max-width:none">
    <line x1="${pad-6}" y1="${h-34}" x2="${w-pad+6}" y2="${h-34}" stroke="#E2DFD6"/>${g}</svg></div>
    <div class="lgd"><div class="li"><span class="dt" style="background:${opt.corA||'#1F7A44'}"></span>${esc(opt.nomeA||'Receitas')}</div>
    <div class="li"><span class="dt" style="background:${opt.corB||'#A8291F'}"></span>${esc(opt.nomeB||'Despesas')}</div>
    <div class="li"><span class="dt" style="background:#8E9491"></span>número acima = resultado do mês</div></div>`;
}
function donutChart(data,opt){
  opt = opt||{};
  const tot = data.reduce((s,d)=>s+Math.abs(num(d.val)),0);
  if(!tot) return `<div class="empty"><i class="ti ti-chart-pie"></i>Sem dados no período</div>`;
  const R=68,r=42,cx=80,cy=80;
  let ang=-Math.PI/2, paths='';
  data.forEach(d=>{
    const frac = Math.abs(num(d.val))/tot, a2 = ang+frac*Math.PI*2, big = frac>0.5?1:0;
    const p=(rad,a)=>[cx+rad*Math.cos(a),cy+rad*Math.sin(a)];
    const [x1,y1]=p(R,ang),[x2,y2]=p(R,a2),[x3,y3]=p(r,a2),[x4,y4]=p(r,ang);
    if(frac>0.9999) paths += `<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none" stroke="${d.color}" stroke-width="${R-r}"><title>${esc(d.label)}</title></circle>`;
    else paths += `<path d="M${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${big} 0 ${x4} ${y4} Z" fill="${d.color}"><title>${esc(d.label)}: ${(frac*100).toFixed(1)}%</title></path>`;
    ang = a2;
  });
  const lgd = data.filter(d=>Math.abs(num(d.val))>0).map(d=>
    `<div class="li"><span class="dt" style="background:${d.color}"></span>${esc(d.label)}
     <b style="margin-left:auto">${(Math.abs(num(d.val))/tot*100).toFixed(1)}%</b></div>`).join('');
  return `<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
    <svg width="160" height="160" viewBox="0 0 160 160" style="flex:none">${paths}
      <text x="80" y="76" text-anchor="middle" font-size="10" fill="#8E9491" font-weight="700">${esc(opt.centerLabel||'TOTAL')}</text>
      <text x="80" y="92" text-anchor="middle" font-size="12" fill="#1C1F1D" font-weight="800">${esc(opt.centerVal||moedaK(tot))}</text></svg>
    <div style="flex:1;min-width:158px;font-size:11.5px;display:flex;flex-direction:column;gap:4px">${lgd}</div></div>`;
}
function lineChart(series,labels,opt){
  opt = opt||{};
  const w = Math.max(320, labels.length*56+64), h = opt.h||215, pl=50,pr=14,pt=14,pb=30;
  const all = series.flatMap(s=>s.pts.filter(v=>v!=null));
  const max = Math.max(...all,1), min = Math.min(...all,0);
  const X = i=> pl + (labels.length<2?0:i*(w-pl-pr)/(labels.length-1));
  const Y = v=> pt+(h-pt-pb) - ((v-min)/((max-min)||1))*(h-pt-pb);
  let g='',gl='';
  for(let k=0;k<=4;k++){
    const v = min+(max-min)*k/4, y=Y(v);
    gl += `<line x1="${pl}" y1="${y}" x2="${w-pr}" y2="${y}" stroke="#EFEDE7"/>
      <text x="${pl-6}" y="${y+3}" text-anchor="end" font-size="9" fill="#8E9491">${opt.money?moedaK(v).replace('R$ ',''):qtd(v,0)}</text>`;
  }
  series.forEach(s=>{
    const pts = s.pts.map((v,i)=>[i,v]).filter(p=>p[1]!=null);
    if(!pts.length) return;
    const d = pts.map((p,i)=>`${i?'L':'M'}${X(p[0])} ${Y(p[1])}`).join(' ');
    if(s.area) g += `<path d="${d} L${X(pts[pts.length-1][0])} ${Y(min)} L${X(pts[0][0])} ${Y(min)} Z" fill="${s.color}" opacity=".10"/>`;
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.3" stroke-linejoin="round" stroke-dasharray="${s.dash||''}"/>`;
    pts.forEach(p=>{ g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${esc(s.name)} — ${esc(labels[p[0]])}: ${opt.money?moeda(p[1]):qtd(p[1],1)}</title></circle>`; });
  });
  const xl = labels.map((l,i)=>`<text x="${X(i)}" y="${h-10}" text-anchor="middle" font-size="9" fill="#8E9491">${esc(l)}</text>`).join('');
  return `<div class="cwrap"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="max-width:none">${gl}${g}${xl}</svg></div>
    <div class="lgd">${series.map(s=>`<div class="li"><span class="dt" style="background:${s.color}"></span>${esc(s.name)}</div>`).join('')}</div>`;
}
function hbarChart(data,opt){
  opt = opt||{};
  if(!data.length) return `<div class="empty"><i class="ti ti-chart-bar"></i>Sem dados no período</div>`;
  const max = Math.max(...data.map(d=>Math.abs(num(d.val))),1);
  return `<div style="display:flex;flex-direction:column;gap:9px">` + data.map(d=>{
    const p = Math.abs(num(d.val))/max*100;
    return `<div><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
      <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%">${esc(d.label)}</span>
      <b style="color:${d.color||'var(--brand)'};font-variant-numeric:tabular-nums">${esc(d.fmt||moeda(d.val))}</b></div>
      <div class="pb"><div class="pf" style="width:${p}%;background:${d.color||'var(--brand)'}"></div></div></div>`;
  }).join('') + `</div>`;
}

/* =========================================================================
   MÓDULO: PROJETOS E 3D
   Abas: Arquivos de projeto · Planta 2D (DXF) · Modelo 3D · Quantitativo BIM (IFC)
   ========================================================================= */
let PROJ_TAB = 'arq';
let V3D = null;     // estado do visualizador 3D
let DXFV = null;    // estado do visualizador DXF

function projStab(t){ destruir3D(); PROJ_TAB = t; projRender(); }

async function projRender(){
  const root = document.getElementById('proj-root');
  const o = await obraAtual();
  if(!o){ root.innerHTML = semObra(); return; }
  const arqs = await dbByObra('projetos',o.id);

  let html = `<div class="ph"><div class="ic"><i class="ti ti-3d-cube-sphere"></i></div>
    <div><h1>Projetos e 3D</h1><p>${esc(o.cod)} — ${esc(o.nome)}</p></div>
    <div class="sp"></div>
    <button class="btn" onclick="projForm()"><i class="ti ti-plus"></i>Registrar projeto</button></div>`;

  html += `<div class="tabs">
    <button class="tab ${PROJ_TAB==='arq'?'on':''}" onclick="projStab('arq')"><i class="ti ti-folders"></i>Arquivos e revisões</button>
    <button class="tab ${PROJ_TAB==='dxf'?'on':''}" onclick="projStab('dxf')"><i class="ti ti-vector"></i>Planta 2D (DXF)</button>
    <button class="tab ${PROJ_TAB==='3d'?'on':''}" onclick="projStab('3d')"><i class="ti ti-cube"></i>Modelo 3D</button>
    <button class="tab ${PROJ_TAB==='ifc'?'on':''}" onclick="projStab('ifc')"><i class="ti ti-topology-star"></i>Quantitativo BIM (IFC)</button>
  </div><div id="proj-body"></div>`;
  root.innerHTML = html;

  if(PROJ_TAB==='arq') await projTabArquivos(o,arqs);
  if(PROJ_TAB==='dxf') await projTabDXF(o,arqs);
  if(PROJ_TAB==='3d')  await projTab3D(o);
  if(PROJ_TAB==='ifc') await projTabIFC(o,arqs);
}

/* ================= Aba 1: registro de arquivos ================= */
async function projTabArquivos(o,arqs){
  const body = document.getElementById('proj-body');
  let h = `<div class="al ai"><i class="ti ti-info-circle"></i><div>
    Registre aqui cada prancha e revisão dos projetos. Arquivos <b>.dxf</b> (AutoCAD / Revit → Exportar CAD),
    <b>.ifc</b> (Revit → Exportar IFC) e <b>.obj</b> podem ser anexados e abertos direto no sistema, nas outras abas.
    Arquivos nativos <b>.rvt</b> e <b>.dwg</b> só podem ser registrados como referência — nenhum navegador abre esses formatos.</div></div>`;

  h += `<div class="card"><div class="hd"><i class="ti ti-folders"></i>Projetos registrados<span class="sp"></span>
    <button class="btn sm" onclick="projForm()"><i class="ti ti-plus"></i>Registrar</button></div><div class="bd">`;
  if(!arqs.length){
    h += `<div class="empty"><i class="ti ti-file-off"></i><b>Nenhum projeto registrado</b>
      Controle as revisões de arquitetura, estrutura, hidráulica, elétrica e aprovação da prefeitura em um só lugar.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Disciplina</th><th>Prancha / descrição</th><th class="c">Rev.</th><th class="c">Data</th>
      <th>Autor</th><th class="c">Situação</th><th class="c">Arquivo</th><th class="c no-print"></th></tr></thead><tbody>`;
    arqs.sort((a,b)=>String(a.disciplina).localeCompare(String(b.disciplina))||String(b.data).localeCompare(String(a.data)))
      .forEach(p=>{
      const st = p.status==='Aprovado'?'s-ok':p.status==='Em análise'?'s-wn':p.status==='Obsoleto'?'s-nt':'s-pd';
      h += `<tr><td><b>${esc(p.disciplina)}</b></td><td>${esc(p.nome)}${p.obs?`<br><span class="tt">${esc(p.obs)}</span>`:''}</td>
        <td class="c mono">R${esc(p.revisao||'00')}</td><td class="c n">${dbr(p.data)}</td>
        <td class="tt">${esc(p.autor||'—')}</td>
        <td class="c"><span class="st ${st}">${esc(p.status)}</span></td>
        <td class="c">${p.arquivo?`<span class="st s-pu">${esc(p.ext.toUpperCase())} · ${qtd(p.tam/1024,0)} KB</span>`:'<span class="tt">só referência</span>'}</td>
        <td class="c no-print nowrap">
          ${p.ext==='dxf'?`<button class="ib bl" title="Abrir planta" onclick="abrirDXF(${p.id})"><i class="ti ti-vector"></i></button>`:''}
          ${p.ext==='ifc'?`<button class="ib bl" title="Ler quantitativo" onclick="abrirIFC(${p.id})"><i class="ti ti-topology-star"></i></button>`:''}
          ${p.ext==='obj'?`<button class="ib bl" title="Ver em 3D" onclick="abrirOBJ(${p.id})"><i class="ti ti-cube"></i></button>`:''}
          ${p.arquivo?`<button class="ib" title="Baixar" onclick="projBaixar(${p.id})"><i class="ti ti-download"></i></button>`:''}
          <button class="ib bl" onclick="projForm(${p.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="projDel(${p.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  }

  h += `<div class="card"><div class="hd"><i class="ti ti-help-circle"></i>Como trazer seus projetos do Revit e do AutoCAD</div><div class="bd">
    <div class="fr2">
      <div><div class="sh" style="margin-top:0"><i class="ti ti-vector-triangle"></i>AutoCAD</div>
        <div style="font-size:12.5px;line-height:1.7;color:var(--text2)">
          <b>Planta 2D:</b> Arquivo → Salvar Como → <b>DXF (*.dxf)</b>, versão 2013 ou anterior.<br>
          Abra o arquivo na aba <b>Planta 2D</b> para visualizar, medir distâncias e conferir camadas em qualquer celular.</div></div>
      <div><div class="sh" style="margin-top:0"><i class="ti ti-topology-star"></i>Revit</div>
        <div style="font-size:12.5px;line-height:1.7;color:var(--text2)">
          <b>Quantitativo:</b> Arquivo → Exportar → <b>IFC</b>. A aba <b>Quantitativo BIM</b> lê o arquivo e conta
          paredes, portas, janelas, lajes, pilares e pavimentos — e joga isso no orçamento.<br>
          <b>Planta 2D:</b> Arquivo → Exportar → CAD → <b>DXF</b>.</div></div>
    </div>
    <div class="al aw" style="margin-bottom:0"><i class="ti ti-alert-triangle"></i><div>
      Nenhum navegador abre <b>.rvt</b> ou <b>.dwg</b> nativamente — são formatos proprietários e fechados.
      Exportar para DXF/IFC é o caminho aberto e gratuito. Se um dia precisar abrir o RVT/DWG original dentro do sistema,
      isso exige um serviço pago da Autodesk (Autodesk Platform Services) rodando em servidor.</div></div>
  </div></div>`;
  body.innerHTML = h;
}

async function projForm(id){
  const o = await obraAtual();
  const p = id ? await dbGet('projetos',id) : null;
  const b = `<div class="fr2">
      <div class="fg"><label>Disciplina <span class="rq">*</span></label><select id="pj-disc">
        ${DISCIPLINAS.map(d=>`<option ${p&&p.disciplina===d?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="fg"><label>Prancha / descrição <span class="rq">*</span></label><input id="pj-nome" value="${esc(p?p.nome:'')}" placeholder="Ex.: Planta baixa pav. térreo"></div></div>
    <div class="fr4">
      <div class="fg"><label>Revisão</label><input id="pj-rev" value="${esc(p?p.revisao:'00')}"></div>
      <div class="fg"><label>Data</label><input id="pj-data" type="date" value="${p?p.data:hoje()}"></div>
      <div class="fg"><label>Autor / projetista</label><input id="pj-autor" value="${esc(p?p.autor:'')}"></div>
      <div class="fg"><label>Situação</label><select id="pj-status">
        ${['Em elaboração','Em análise','Aprovado','Obsoleto'].map(s=>`<option ${p&&p.status===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="fg"><label>Observações</label><textarea id="pj-obs">${esc(p?p.obs:'')}</textarea></div>
    <div class="sh"><i class="ti ti-paperclip"></i>Arquivo</div>
    <div class="drop" id="pj-drop" onclick="document.getElementById('pj-file').click()">
      <i class="ti ti-cloud-upload"></i><b id="pj-fname">${p&&p.arquivo?esc(p.nomeArq)+' ('+qtd(p.tam/1024,0)+' KB)':'Toque para escolher o arquivo'}</b>
      <small>DXF, IFC e OBJ abrem no sistema · PDF, DWG, RVT ficam só como registro (limite 12 MB)</small></div>
    <input type="file" id="pj-file" accept=".dxf,.ifc,.obj,.pdf,.dwg,.rvt,.png,.jpg" class="hide" onchange="projArquivo(this)">
    <div id="pj-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    <button class="btn gn" onclick="projSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`;
  modal(id?'Editar projeto':'Registrar projeto','ti-file-text',b,f);
  window.__PJARQ = p ? {arquivo:p.arquivo, ext:p.ext, tam:p.tam, nomeArq:p.nomeArq} : null;
}
async function projArquivo(inp){
  const f = inp.files[0]; if(!f) return;
  if(f.size > 12*1024*1024){ toast('Arquivo maior que 12 MB — registre apenas como referência.','ae'); inp.value=''; return; }
  const ext = (f.name.split('.').pop()||'').toLowerCase();
  const texto = ['dxf','ifc','obj'].includes(ext);
  const dados = texto ? await f.text() : await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(f); });
  window.__PJARQ = {arquivo:dados, ext, tam:f.size, nomeArq:f.name};
  document.getElementById('pj-fname').textContent = f.name+' ('+qtd(f.size/1024,0)+' KB)';
  document.getElementById('pj-drop').classList.add('dg');
}
async function projSave(id){
  const o = await obraAtual();
  const nome = val('pj-nome');
  if(!nome){ document.getElementById('pj-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe a descrição da prancha.</div>`; return; }
  const a = window.__PJARQ||{};
  const d = {obraId:o.id, disciplina:val('pj-disc'), nome, revisao:val('pj-rev'), data:val('pj-data'),
             autor:val('pj-autor'), status:val('pj-status'), obs:val('pj-obs'),
             arquivo:a.arquivo||null, ext:a.ext||'', tam:a.tam||0, nomeArq:a.nomeArq||''};
  if(id){ const old = await dbGet('projetos',id); await dbPut('projetos',{...old,...d}); }
  else await dbAdd('projetos',d);
  closeModal('mk-form'); toast('Projeto registrado.'); projRender();
}
function projDel(id){
  confirmar('Excluir projeto','O registro e o arquivo anexado serão removidos.',
    async()=>{ await dbDel('projetos',id); toast('Removido.','aw'); projRender(); });
}
async function projBaixar(id){
  const p = await dbGet('projetos',id);
  if(!p.arquivo) return;
  if(['dxf','ifc','obj'].includes(p.ext)) baixarArquivo(p.arquivo,p.nomeArq,'text/plain');
  else{ const a=document.createElement('a'); a.href=p.arquivo; a.download=p.nomeArq; a.click(); }
}

/* ================= Aba 2: visualizador DXF ================= */
async function projTabDXF(o,arqs){
  const body = document.getElementById('proj-body');
  const dxfs = arqs.filter(p=>p.ext==='dxf');
  let h = `<div class="card"><div class="hd"><i class="ti ti-vector"></i>Planta 2D — arquivos DXF<span class="sp"></span>
      <button class="btn sm gh" onclick="document.getElementById('dxf-file').click()"><i class="ti ti-upload"></i>Abrir DXF do dispositivo</button></div>
    <div class="bd">
      <div class="fr2">
        <div class="fg"><label>Projeto registrado</label><select id="dxf-sel" onchange="abrirDXF(this.value)">
          <option value="">— selecione —</option>
          ${dxfs.map(p=>`<option value="${p.id}">${esc(p.disciplina)} — ${esc(p.nome)} (R${esc(p.revisao)})</option>`).join('')}</select></div>
        <div class="fg"><label>Escala do desenho</label><input id="dxf-esc" value="1 unidade = 1 metro" readonly></div>
      </div>
      <input type="file" id="dxf-file" accept=".dxf" class="hide" onchange="dxfDoArquivo(this)">
      ${dxfs.length?'':`<div class="al ai"><i class="ti ti-info-circle"></i>Nenhum DXF registrado nesta obra ainda.
        Exporte do AutoCAD (Salvar como → DXF) ou do Revit (Exportar → CAD → DXF) e envie pelo botão acima.</div>`}
    </div></div>
    <div class="vwrap" id="dxf-wrap">
      <div class="vtool">
        <button onclick="dxfZoomFit()"><i class="ti ti-zoom-scan"></i>Enquadrar</button>
        <button onclick="dxfZoom(1.3)"><i class="ti ti-zoom-in"></i></button>
        <button onclick="dxfZoom(0.77)"><i class="ti ti-zoom-out"></i></button>
        <button id="dxf-btn-med" onclick="dxfToggleMedir()"><i class="ti ti-ruler-measure"></i>Medir</button>
      </div>
      <div class="vlgd" id="dxf-layers"></div>
      <canvas id="dxf-canvas"></canvas>
      <div class="vinfo" id="dxf-info">Selecione um arquivo DXF para visualizar</div>
    </div>`;
  body.innerHTML = h;
  dxfInit();
}

function dxfInit(){
  const cv = document.getElementById('dxf-canvas');
  const wrap = document.getElementById('dxf-wrap');
  cv.width = wrap.clientWidth; cv.height = wrap.clientHeight;
  DXFV = {cv, ctx:cv.getContext('2d'), ents:[], layers:{}, off:{x:0,y:0}, zoom:1, medindo:false, pts:[], bounds:null};
  let drag = null;
  const pos = e=>{ const r=cv.getBoundingClientRect();
    const t = e.touches?e.touches[0]:e; return {x:t.clientX-r.left, y:t.clientY-r.top}; };
  cv.addEventListener('pointerdown',e=>{
    const p = pos(e);
    if(DXFV.medindo){
      const w = dxfTela2Mundo(p.x,p.y);
      DXFV.pts.push(w); if(DXFV.pts.length>2) DXFV.pts = [w];
      dxfDraw(); return;
    }
    drag = {x:e.clientX,y:e.clientY,ox:DXFV.off.x,oy:DXFV.off.y}; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove',e=>{
    if(drag){ DXFV.off.x = drag.ox + (e.clientX-drag.x); DXFV.off.y = drag.oy + (e.clientY-drag.y); dxfDraw(); }
    else if(DXFV.bounds){
      const p = pos(e), w = dxfTela2Mundo(p.x,p.y);
      const inf = document.getElementById('dxf-info');
      if(inf && !DXFV.medindo) inf.innerHTML = `X: ${qtd(w.x,2)} · Y: ${qtd(w.y,2)} · ${DXFV.ents.length} entidades · zoom ${qtd(DXFV.zoom*100,0)}%`;
    }
  });
  cv.addEventListener('pointerup',e=>{ drag=null; });
  cv.addEventListener('pointercancel',()=>{ drag=null; });
  cv.addEventListener('wheel',e=>{ e.preventDefault(); dxfZoom(e.deltaY<0?1.12:0.89, pos(e)); },{passive:false});
}
/* um único listener global de redimensionamento para os dois visualizadores */
window.addEventListener('resize',()=>{
  const cv = document.getElementById('dxf-canvas'), wr = document.getElementById('dxf-wrap');
  if(DXFV && cv && wr){ cv.width = wr.clientWidth; cv.height = wr.clientHeight; dxfDraw(); }
  const w2 = document.getElementById('v3-wrap');
  if(V3D && w2 && document.getElementById('v3-canvas')){
    V3D.camera.aspect = w2.clientWidth/w2.clientHeight;
    V3D.camera.updateProjectionMatrix();
    V3D.renderer.setSize(w2.clientWidth, w2.clientHeight, false);
  }
});

function dxfTela2Mundo(px,py){
  return {x:(px-DXFV.off.x)/DXFV.zoom, y:-(py-DXFV.off.y)/DXFV.zoom};
}
function dxfZoom(f,centro){
  if(!DXFV) return;
  const c = centro||{x:DXFV.cv.width/2,y:DXFV.cv.height/2};
  const antes = dxfTela2Mundo(c.x,c.y);
  DXFV.zoom *= f;
  DXFV.off.x = c.x - antes.x*DXFV.zoom;
  DXFV.off.y = c.y + antes.y*DXFV.zoom;
  dxfDraw();
}
function dxfZoomFit(){
  if(!DXFV||!DXFV.bounds) return;
  const b = DXFV.bounds, cv = DXFV.cv;
  const w = b.maxX-b.minX||1, h = b.maxY-b.minY||1;
  DXFV.zoom = Math.min(cv.width/w, cv.height/h)*0.88;
  DXFV.off.x = cv.width/2 - (b.minX+w/2)*DXFV.zoom;
  DXFV.off.y = cv.height/2 + (b.minY+h/2)*DXFV.zoom;
  dxfDraw();
}
function dxfToggleMedir(){
  DXFV.medindo = !DXFV.medindo; DXFV.pts = [];
  document.getElementById('dxf-btn-med').classList.toggle('on',DXFV.medindo);
  document.getElementById('dxf-info').textContent = DXFV.medindo
    ? 'Toque em dois pontos para medir a distância' : 'Arraste para mover · role para dar zoom';
  dxfDraw();
}

async function abrirDXF(id){
  if(!id) return;
  const p = await dbGet('projetos',id);
  if(!p||!p.arquivo){ toast('Este registro não tem arquivo anexado.','aw'); return; }
  if(PROJ_TAB!=='dxf'){ PROJ_TAB='dxf'; await projRender(); }
  const sel = document.getElementById('dxf-sel'); if(sel) sel.value = id;
  dxfCarregar(p.arquivo, p.nome);
}
async function dxfDoArquivo(inp){
  const f = inp.files[0]; if(!f) return;
  dxfCarregar(await f.text(), f.name);
  inp.value='';
}

/* ---------- Parser DXF ---------- */
function parseDXF(txt){
  const linhas = txt.split(/\r\n|\r|\n/);
  const pares = [];
  for(let i=0;i+1<linhas.length;i+=2){
    const c = parseInt(linhas[i].trim());
    if(isNaN(c)) continue;
    pares.push([c, linhas[i+1]]);
  }
  const ents = [];
  let i = 0;
  // localizar seção ENTITIES
  while(i<pares.length && !(pares[i][0]===2 && pares[i][1].trim()==='ENTITIES')) i++;
  i++;
  let atual = null, poly = null;
  const push = ()=>{ if(atual) ents.push(atual); atual = null; };
  for(; i<pares.length; i++){
    const [c,v] = pares[i];
    const s = String(v).trim();
    if(c===0){
      if(s==='ENDSEC'){ push(); break; }
      if(s==='VERTEX' && poly){ poly.pts.push({x:0,y:0}); atual = {tipo:'VERTEX', ref:poly}; continue; }
      if(s==='SEQEND'){ push(); poly = null; continue; }
      push();
      if(s==='POLYLINE'){ poly = {tipo:'LWPOLYLINE', layer:'0', pts:[], fechada:false}; ents.push(poly); atual=null; continue; }
      atual = {tipo:s, layer:'0', pts:[]};
      if(s==='LWPOLYLINE'){ atual.fechada=false; }
      continue;
    }
    if(!atual) continue;
    const alvo = atual.tipo==='VERTEX' ? atual.ref : atual;
    const n = parseFloat(v);
    switch(c){
      case 8: alvo.layer = s; if(atual.tipo!=='VERTEX') atual.layer = s; break;
      case 10:
        if(atual.tipo==='VERTEX'){ alvo.pts[alvo.pts.length-1].x = n; }
        else if(atual.tipo==='LWPOLYLINE'){ atual.pts.push({x:n,y:0}); }
        else atual.x1 = n;
        break;
      case 20:
        if(atual.tipo==='VERTEX'){ alvo.pts[alvo.pts.length-1].y = n; }
        else if(atual.tipo==='LWPOLYLINE'){ if(atual.pts.length) atual.pts[atual.pts.length-1].y = n; }
        else atual.y1 = n;
        break;
      case 11: atual.x2 = n; break;
      case 21: atual.y2 = n; break;
      case 40: atual.r = n; break;
      case 50: atual.a1 = n; break;
      case 51: atual.a2 = n; break;
      case 70: if(atual.tipo==='LWPOLYLINE') atual.fechada = (parseInt(v)&1)===1; break;
      case 1:  atual.texto = v; break;
      case 62: atual.cor = parseInt(v); break;
    }
  }
  push();
  return ents.filter(e=>['LINE','LWPOLYLINE','CIRCLE','ARC','TEXT','MTEXT','POINT'].includes(e.tipo));
}

const DXF_CORES = ['#FFFFFF','#FF5555','#FFD24A','#7CE07C','#5BE1E1','#6FA8FF','#E17CE1','#FFFFFF'];
function dxfCarregar(txt,nome){
  try{
    const ents = parseDXF(txt);
    if(!ents.length){ toast('Não foi possível ler entidades desse DXF. Tente exportar como DXF R2013 ou anterior.','ae'); return; }
    const layers = {};
    ents.forEach(e=>{ if(!layers[e.layer]) layers[e.layer] = {nome:e.layer, n:0, on:true,
      cor: DXF_CORES[Object.keys(layers).length % DXF_CORES.length]}; layers[e.layer].n++; });
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const upd = (x,y)=>{ if(x==null||y==null||isNaN(x)||isNaN(y))return; minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y); };
    ents.forEach(e=>{
      if(e.tipo==='LINE'){ upd(e.x1,e.y1); upd(e.x2,e.y2); }
      else if(e.tipo==='LWPOLYLINE'){ e.pts.forEach(p=>upd(p.x,p.y)); }
      else if(e.tipo==='CIRCLE'||e.tipo==='ARC'){ upd(e.x1-e.r,e.y1-e.r); upd(e.x1+e.r,e.y1+e.r); }
      else upd(e.x1,e.y1);
    });
    DXFV.ents = ents; DXFV.layers = layers;
    DXFV.bounds = isFinite(minX)?{minX,minY,maxX,maxY}:null;
    dxfLayersRender();
    dxfZoomFit();
    const larg = DXFV.bounds?(DXFV.bounds.maxX-DXFV.bounds.minX):0;
    const alt  = DXFV.bounds?(DXFV.bounds.maxY-DXFV.bounds.minY):0;
    document.getElementById('dxf-info').innerHTML =
      `<b>${esc(nome||'DXF')}</b> · ${ents.length} entidades · ${Object.keys(layers).length} camadas<br>
       Extensão do desenho: ${qtd(larg,2)} × ${qtd(alt,2)} unidades`;
    toast(`Planta carregada: ${ents.length} entidades.`);
  }catch(err){
    console.error(err);
    toast('Erro ao ler o DXF: '+(err.message||err),'ae');
  }
}
function dxfLayersRender(){
  const box = document.getElementById('dxf-layers');
  const L = Object.values(DXFV.layers).sort((a,b)=>b.n-a.n);
  box.innerHTML = `<div style="font-weight:800;margin-bottom:5px;color:#fff">CAMADAS</div>` +
    L.map(l=>`<div class="li" style="cursor:pointer;opacity:${l.on?1:.4}" onclick="dxfToggleLayer('${esc(l.nome).replace(/'/g,"\\'")}')">
      <span class="dt" style="background:${l.cor}"></span>${esc(l.nome.slice(0,18))} <span style="margin-left:auto;opacity:.6">${l.n}</span></div>`).join('');
}
function dxfToggleLayer(n){
  const l = DXFV.layers[n]; if(!l) return;
  l.on = !l.on; dxfLayersRender(); dxfDraw();
}
function dxfDraw(){
  if(!DXFV) return;
  const {ctx,cv} = DXFV;
  ctx.fillStyle = '#111722'; ctx.fillRect(0,0,cv.width,cv.height);
  const T = (x,y)=>[x*DXFV.zoom + DXFV.off.x, -y*DXFV.zoom + DXFV.off.y];
  ctx.lineWidth = 1;
  DXFV.ents.forEach(e=>{
    const l = DXFV.layers[e.layer];
    if(l && !l.on) return;
    ctx.strokeStyle = l?l.cor:'#FFF';
    ctx.beginPath();
    if(e.tipo==='LINE'){ const a=T(e.x1,e.y1), b=T(e.x2,e.y2); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); }
    else if(e.tipo==='LWPOLYLINE'){
      e.pts.forEach((p,i)=>{ const q=T(p.x,p.y); i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]); });
      if(e.fechada) ctx.closePath();
      ctx.stroke();
    }
    else if(e.tipo==='CIRCLE'){ const c=T(e.x1,e.y1); ctx.arc(c[0],c[1],e.r*DXFV.zoom,0,Math.PI*2); ctx.stroke(); }
    else if(e.tipo==='ARC'){ const c=T(e.x1,e.y1);
      ctx.arc(c[0],c[1],e.r*DXFV.zoom, -(e.a2||0)*Math.PI/180, -(e.a1||0)*Math.PI/180); ctx.stroke(); }
    else if(e.tipo==='POINT'){ const c=T(e.x1,e.y1); ctx.fillStyle=l?l.cor:'#FFF'; ctx.fillRect(c[0]-1,c[1]-1,2.5,2.5); }
    else if((e.tipo==='TEXT'||e.tipo==='MTEXT') && e.texto && DXFV.zoom>0.6){
      const c=T(e.x1,e.y1); ctx.fillStyle = l?l.cor:'#FFF';
      ctx.font = Math.max(8,Math.min(20,(e.r||2.5)*DXFV.zoom))+'px sans-serif';
      ctx.fillText(String(e.texto).replace(/\\[A-Za-z0-9|.;]+/g,'').slice(0,60), c[0], c[1]);
    }
  });
  // medição
  if(DXFV.pts.length){
    ctx.strokeStyle = '#F0A431'; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
    ctx.beginPath();
    DXFV.pts.forEach((p,i)=>{ const q=T(p.x,p.y); i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);
      ctx.fillStyle='#F0A431'; ctx.fillRect(q[0]-3,q[1]-3,6,6); });
    ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    if(DXFV.pts.length===2){
      const d = Math.hypot(DXFV.pts[1].x-DXFV.pts[0].x, DXFV.pts[1].y-DXFV.pts[0].y);
      document.getElementById('dxf-info').innerHTML = `<b style="color:#F0A431">Distância: ${qtd(d,3)} unidades</b>
        (${qtd(d*100,1)} cm se o desenho estiver em metros)`;
    }
  }
}

/* ================= Aba 3: modelo 3D ================= */
async function projTab3D(o){
  const body = document.getElementById('proj-body');
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  const arqs = (await dbByObra('projetos',o.id)).filter(p=>p.ext==='obj');
  body.innerHTML = `
    <div class="al ai"><i class="ti ti-info-circle"></i><div>
      Modelo volumétrico gerado a partir dos dados da obra (<b>${qtd(o.area,0)} m²</b>, ${o.pavimentos} pavimento(s)),
      <b>colorido pelo avanço real de cada etapa</b>: cinza translúcido = não executado, cor cheia = concluído.
      É a maneira mais rápida de mostrar ao cliente onde a obra está. Você também pode carregar um modelo <b>.obj</b>
      exportado do SketchUp, Blender ou 3ds Max.</div></div>
    <div class="fr2">
      <div class="fg"><label>Modelo exibido</label><select id="v3-src" onchange="v3Trocar(this.value)">
        <option value="param">Modelo de avanço da obra (gerado)</option>
        ${arqs.map(p=>`<option value="${p.id}">Arquivo OBJ — ${esc(p.nome)}</option>`).join('')}
      </select></div>
      <div class="fg"><label>Carregar OBJ do dispositivo</label>
        <button class="btn gh blk" onclick="document.getElementById('obj-file').click()"><i class="ti ti-upload"></i>Escolher arquivo .obj</button>
        <input type="file" id="obj-file" accept=".obj" class="hide" onchange="objDoArquivo(this)"></div>
    </div>
    <div class="vwrap" id="v3-wrap">
      <div class="vtool">
        <button onclick="v3Reset()"><i class="ti ti-home"></i>Vista inicial</button>
        <button onclick="v3Vista('topo')"><i class="ti ti-square"></i>Topo</button>
        <button onclick="v3Vista('frente')"><i class="ti ti-rectangle"></i>Frente</button>
        <button id="v3-btn-corte" onclick="v3ToggleCorte()"><i class="ti ti-layout-rows"></i>Explodir</button>
      </div>
      <div class="vlgd" id="v3-lgd"></div>
      <canvas id="v3-canvas"></canvas>
      <div class="vinfo">Arraste para girar · dois dedos ou roda para zoom · segure shift para deslocar</div>
    </div>
    <div class="card" style="margin-top:14px"><div class="hd"><i class="ti ti-list-check"></i>Avanço por grupo construtivo</div><div class="bd">
      ${['fundacao','estrutura','alvenaria','cobertura','instalacao','esquadria','acabamento'].map(g=>{
        const es = etapas.filter(e=>(e.grupo||'')===g);
        if(!es.length) return '';
        const pw = es.reduce((s,e)=>s+num(e.peso),0)||1;
        const av = es.reduce((s,e)=>s+num(e.peso)*num(e.avanco),0)/pw;
        const nomes = {fundacao:'Fundação',estrutura:'Estrutura',alvenaria:'Alvenaria e vedação',cobertura:'Cobertura',
                       instalacao:'Instalações',esquadria:'Esquadrias',acabamento:'Acabamentos'};
        return `<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <b>${nomes[g]}</b><span style="font-weight:800">${qtd(av,0)}%</span></div>
          <div class="pb"><div class="pf ${av>=100?'gn':''}" style="width:${clamp(av,0,100)}%;background:${es[0].cor||'#15599E'}"></div></div></div>`;
      }).join('')}
    </div></div>`;
  await v3Init(o,etapas);
}

function destruir3D(){
  if(V3D){ cancelAnimationFrame(V3D.raf); try{ V3D.renderer.dispose(); }catch(e){} V3D = null; }
  DXFV = null;
}

async function v3Init(o,etapas){
  const cv = document.getElementById('v3-canvas');
  const wrap = document.getElementById('v3-wrap');
  if(!cv || typeof THREE==='undefined'){
    if(wrap) wrap.innerHTML = `<div style="color:#94A3B8;padding:30px;text-align:center">
      A biblioteca 3D não pôde ser carregada. Verifique a conexão com a internet e recarregue a página.</div>`;
    return;
  }
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(W,H,false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111722);
  scene.fog = new THREE.Fog(0x111722, 60, 220);
  const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 1000);
  scene.add(new THREE.AmbientLight(0xffffff,0.62));
  const dl = new THREE.DirectionalLight(0xffffff,0.85); dl.position.set(22,32,18); scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0x88aaff,0.28); dl2.position.set(-18,12,-16); scene.add(dl2);

  const grupo = new THREE.Group(); scene.add(grupo);
  const grid = new THREE.GridHelper(80,40,0x2A3549,0x1B2536); scene.add(grid);

  V3D = {renderer,scene,camera,grupo,raf:0,dist:36,theta:Math.PI*0.28,phi:Math.PI*0.32,alvo:new THREE.Vector3(0,2.4,0),corte:false,partes:[]};
  construirModelo(o,etapas);
  v3Reset();

  // controles
  let drag=null, pinch=null;
  const canv = cv;
  canv.addEventListener('pointerdown',e=>{ drag={x:e.clientX,y:e.clientY,t:V3D.theta,p:V3D.phi,shift:e.shiftKey,ax:V3D.alvo.x,az:V3D.alvo.z}; canv.setPointerCapture(e.pointerId); });
  canv.addEventListener('pointermove',e=>{
    if(!drag) return;
    const dx = e.clientX-drag.x, dy = e.clientY-drag.y;
    if(drag.shift){ V3D.alvo.x = drag.ax - dx*0.03; V3D.alvo.z = drag.az - dy*0.03; }
    else { V3D.theta = drag.t - dx*0.008; V3D.phi = clamp(drag.p - dy*0.006, 0.08, Math.PI/2-0.04); }
    v3Cam();
  });
  canv.addEventListener('pointerup',()=>drag=null);
  canv.addEventListener('pointercancel',()=>drag=null);
  canv.addEventListener('wheel',e=>{ e.preventDefault(); V3D.dist = clamp(V3D.dist*(e.deltaY>0?1.1:0.9),6,160); v3Cam(); },{passive:false});
  canv.addEventListener('touchmove',e=>{
    if(e.touches.length===2){
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      if(pinch) V3D.dist = clamp(V3D.dist*(pinch/d),6,160);
      pinch = d; v3Cam();
    }
  },{passive:false});
  canv.addEventListener('touchend',()=>pinch=null);

  (function loop(){ if(!V3D) return; V3D.raf = requestAnimationFrame(loop); V3D.renderer.render(V3D.scene,V3D.camera); })();
}
function v3Cam(){
  if(!V3D) return;
  const {camera,alvo,dist,theta,phi} = V3D;
  camera.position.set(alvo.x + dist*Math.cos(phi)*Math.sin(theta),
                      alvo.y + dist*Math.sin(phi),
                      alvo.z + dist*Math.cos(phi)*Math.cos(theta));
  camera.lookAt(alvo);
}
function v3Reset(){ if(!V3D)return; V3D.theta=Math.PI*0.28; V3D.phi=Math.PI*0.30; V3D.dist=36; v3Cam(); }
function v3Vista(v){
  if(!V3D) return;
  if(v==='topo'){ V3D.phi = Math.PI/2-0.05; V3D.theta = 0; }
  if(v==='frente'){ V3D.phi = 0.10; V3D.theta = 0; }
  v3Cam();
}
function v3ToggleCorte(){
  if(!V3D) return;
  V3D.corte = !V3D.corte;
  document.getElementById('v3-btn-corte')?.classList.toggle('on',V3D.corte);
  V3D.partes.forEach(p=>{ p.mesh.position.y = p.y0 + (V3D.corte ? p.ordem*2.6 : 0); });
}

function matDe(cor,avanco){
  const a = clamp(num(avanco),0,100)/100;
  if(a<=0.02) return new THREE.MeshLambertMaterial({color:0x5A6070, transparent:true, opacity:0.16});
  const c = new THREE.Color(cor);
  const cinza = new THREE.Color(0x6B7280);
  return new THREE.MeshLambertMaterial({color: cinza.clone().lerp(c,a), transparent:a<0.99, opacity: 0.34+0.66*a});
}
function avGrupo(etapas,g){
  const es = etapas.filter(e=>(e.grupo||'')===g);
  if(!es.length) return 0;
  const pw = es.reduce((s,e)=>s+num(e.peso),0)||1;
  return es.reduce((s,e)=>s+num(e.peso)*num(e.avanco),0)/pw;
}

function construirModelo(o,etapas){
  const G = V3D.grupo;
  while(G.children.length) G.remove(G.children[0]);
  V3D.partes = [];
  const pav = Math.max(1,num(o.pavimentos)||1);
  const areaPav = Math.max(num(o.area)/pav, 20);
  const L = Math.sqrt(areaPav/1.45);          // largura
  const C = areaPav/L;                         // comprimento
  const hPav = 2.9, esp = 0.18;
  const cores = {
    fundacao: ETAPAS_PADRAO.find(e=>e.grupo==='fundacao').cor,
    estrutura:ETAPAS_PADRAO.find(e=>e.grupo==='estrutura').cor,
    alvenaria:ETAPAS_PADRAO.find(e=>e.grupo==='alvenaria').cor,
    cobertura:ETAPAS_PADRAO.find(e=>e.grupo==='cobertura').cor,
    esquadria:ETAPAS_PADRAO.find(e=>e.grupo==='esquadria').cor,
    instalacao:ETAPAS_PADRAO.find(e=>e.grupo==='instalacao').cor,
    acabamento:ETAPAS_PADRAO.find(e=>e.grupo==='acabamento').cor
  };
  const add = (geo,mat,x,y,z,ordem)=>{
    const m = new THREE.Mesh(geo,mat); m.position.set(x,y,z); G.add(m);
    V3D.partes.push({mesh:m,y0:y,ordem:ordem||0}); return m;
  };
  // terreno
  const terr = new THREE.Mesh(new THREE.BoxGeometry(C+8,0.3,L+8), new THREE.MeshLambertMaterial({color:0x223046}));
  terr.position.y = -0.15; G.add(terr);

  // fundação / baldrame
  const avF = avGrupo(etapas,'fundacao');
  add(new THREE.BoxGeometry(C+0.5,0.6,L+0.5), matDe(cores.fundacao,avF), 0, 0.3, 0, 0);

  const avE = avGrupo(etapas,'estrutura');
  const avA = avGrupo(etapas,'alvenaria');
  const avC = avGrupo(etapas,'cobertura');
  const avQ = avGrupo(etapas,'esquadria');
  const avI = avGrupo(etapas,'instalacao');
  const avAc= avGrupo(etapas,'acabamento');

  for(let p=0;p<pav;p++){
    const y0 = 0.6 + p*hPav;
    // laje
    add(new THREE.BoxGeometry(C,0.20,L), matDe(cores.estrutura,avE), 0, y0+0.10, 0, p+1);
    // pilares nos cantos e meios
    const px = [-C/2+0.2, 0, C/2-0.2], pz = [-L/2+0.2, 0, L/2-0.2];
    px.forEach(x=>pz.forEach(z=>{
      add(new THREE.BoxGeometry(0.28,hPav-0.2,0.28), matDe(cores.estrutura,avE), x, y0+0.2+(hPav-0.2)/2, z, p+1);
    }));
    // paredes externas (4 painéis)
    const hp = hPav-0.35;
    const yP = y0+0.2+hp/2;
    add(new THREE.BoxGeometry(C,hp,esp), matDe(cores.alvenaria,avA), 0, yP, -L/2+esp/2, p+1);
    add(new THREE.BoxGeometry(C,hp,esp), matDe(cores.alvenaria,avA), 0, yP,  L/2-esp/2, p+1);
    add(new THREE.BoxGeometry(esp,hp,L), matDe(cores.alvenaria,avA), -C/2+esp/2, yP, 0, p+1);
    add(new THREE.BoxGeometry(esp,hp,L), matDe(cores.alvenaria,avA),  C/2-esp/2, yP, 0, p+1);
    // divisórias internas
    add(new THREE.BoxGeometry(C*0.98,hp,esp*0.7), matDe(cores.alvenaria,avA), 0, yP, L*0.12, p+1);
    add(new THREE.BoxGeometry(esp*0.7,hp,L*0.55), matDe(cores.alvenaria,avA), C*0.10, yP, -L*0.2, p+1);
    // instalações (tubulação simbólica)
    if(avI>2){
      add(new THREE.BoxGeometry(0.12,hp*0.9,0.12), matDe(cores.instalacao,avI), C*0.12+0.25, yP, L*0.12+0.2, p+1);
      add(new THREE.BoxGeometry(C*0.5,0.1,0.1), matDe(cores.instalacao,avI), -C*0.2, y0+0.35, L*0.12+0.2, p+1);
    }
    // esquadrias: janelas nas 4 faces + porta na frente
    const jw = Math.min(1.4,C/4), jh = 1.1, jy = y0+0.2+1.55;
    [-C*0.28, C*0.28].forEach(x=>{
      add(new THREE.BoxGeometry(jw,jh,0.06), matDe(cores.esquadria,avQ), x, jy, -L/2+0.02, p+1);
      add(new THREE.BoxGeometry(jw,jh,0.06), matDe(cores.esquadria,avQ), x, jy,  L/2-0.02, p+1);
    });
    [-L*0.26, L*0.26].forEach(z=>{
      add(new THREE.BoxGeometry(0.06,jh,jw), matDe(cores.esquadria,avQ), -C/2+0.02, jy, z, p+1);
      add(new THREE.BoxGeometry(0.06,jh,jw), matDe(cores.esquadria,avQ),  C/2-0.02, jy, z, p+1);
    });
    if(p===0) add(new THREE.BoxGeometry(0.9,2.1,0.08), matDe(cores.esquadria,avQ), 0, y0+0.2+1.05, -L/2+0.02, 1);
    // piso / acabamento
    if(avAc>2) add(new THREE.BoxGeometry(C-0.4,0.05,L-0.4), matDe(cores.acabamento,avAc), 0, y0+0.24, 0, p+1);
  }
  // cobertura em duas águas
  const yT = 0.6 + pav*hPav;
  const geo = new THREE.BufferGeometry();
  const hT = Math.min(L*0.28, 2.6);
  const v = [
    -C/2-0.4,yT,-L/2-0.4,  C/2+0.4,yT,-L/2-0.4,  C/2+0.4,yT+hT,0,
    -C/2-0.4,yT,-L/2-0.4,  C/2+0.4,yT+hT,0,     -C/2-0.4,yT+hT,0,
    -C/2-0.4,yT, L/2+0.4,  C/2+0.4,yT, L/2+0.4,  C/2+0.4,yT+hT,0,
    -C/2-0.4,yT, L/2+0.4,  C/2+0.4,yT+hT,0,     -C/2-0.4,yT+hT,0
  ];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v,3));
  geo.computeVertexNormals();
  const telhado = new THREE.Mesh(geo, (()=>{ const m = matDe(cores.cobertura,avC); m.side = THREE.DoubleSide; return m; })());
  G.add(telhado); V3D.partes.push({mesh:telhado,y0:0,ordem:pav+2});

  // legenda
  const lg = document.getElementById('v3-lgd');
  if(lg){
    const nomes = {fundacao:['Fundação',avF],estrutura:['Estrutura',avE],alvenaria:['Alvenaria',avA],
                   cobertura:['Cobertura',avC],instalacao:['Instalações',avI],esquadria:['Esquadrias',avQ],acabamento:['Acabamentos',avAc]};
    lg.innerHTML = `<div style="font-weight:800;margin-bottom:5px;color:#fff">AVANÇO</div>` +
      Object.entries(nomes).map(([k,[n,a]])=>`<div class="li"><span class="dt" style="background:${cores[k]};opacity:${0.25+0.75*a/100}"></span>${n}
        <span style="margin-left:auto;font-weight:800">${qtd(a,0)}%</span></div>`).join('') +
      `<div style="margin-top:6px;font-size:9.5px;opacity:.65">${qtd(C,1)} × ${qtd(L,1)} m · ${pav} pav.</div>`;
  }
  V3D.alvo.set(0, yT/2, 0);
}

async function v3Trocar(v){
  const o = await obraAtual();
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  if(v==='param'){ construirModelo(o,etapas); v3Reset(); return; }
  const p = await dbGet('projetos',v);
  if(p && p.arquivo) carregarOBJ(p.arquivo, p.nome);
}
async function objDoArquivo(inp){
  const f = inp.files[0]; if(!f) return;
  carregarOBJ(await f.text(), f.name);
  inp.value = '';
}
function parseOBJ(txt){
  const pos = [], idx = [];
  txt.split(/\r?\n/).forEach(l=>{
    const p = l.trim().split(/\s+/);
    if(p[0]==='v'){ pos.push(+p[1],+p[2],+p[3]); }
    else if(p[0]==='f'){
      const vs = p.slice(1).map(s=>{ const n = parseInt(s.split('/')[0]); return n<0 ? pos.length/3+n : n-1; });
      for(let i=1;i+1<vs.length;i++) idx.push(vs[0],vs[i],vs[i+1]);
    }
  });
  return {pos,idx};
}
function carregarOBJ(txt,nome){
  if(!V3D){ toast('Visualizador 3D não iniciado.','ae'); return; }
  try{
    const {pos,idx} = parseOBJ(txt);
    if(!pos.length){ toast('Nenhum vértice encontrado no arquivo OBJ.','ae'); return; }
    const G = V3D.grupo;
    while(G.children.length) G.remove(G.children[0]);
    V3D.partes = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    if(idx.length) geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const bb = geo.boundingBox, c = new THREE.Vector3(); bb.getCenter(c);
    const tam = new THREE.Vector3(); bb.getSize(tam);
    const escala = 20/Math.max(tam.x,tam.y,tam.z,0.001);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color:0x9AB4D6, side:THREE.DoubleSide}));
    mesh.scale.setScalar(escala);
    mesh.position.set(-c.x*escala, -bb.min.y*escala, -c.z*escala);
    G.add(mesh);
    const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:0x15599E, wireframe:true, transparent:true, opacity:.16}));
    wire.scale.copy(mesh.scale); wire.position.copy(mesh.position); G.add(wire);
    V3D.alvo.set(0, tam.y*escala/2, 0); V3D.dist = 40; v3Cam();
    const lg = document.getElementById('v3-lgd');
    if(lg) lg.innerHTML = `<div style="font-weight:800;color:#fff">${esc(nome)}</div>
      <div style="margin-top:4px">${(pos.length/3).toLocaleString('pt-BR')} vértices<br>${(idx.length/3).toLocaleString('pt-BR')} faces</div>`;
    toast('Modelo 3D carregado.');
  }catch(err){ console.error(err); toast('Erro ao ler o OBJ: '+(err.message||err),'ae'); }
}
async function abrirOBJ(id){
  const p = await dbGet('projetos',id);
  if(PROJ_TAB!=='3d'){ PROJ_TAB='3d'; await projRender(); }
  setTimeout(()=>{ const s=document.getElementById('v3-src'); if(s) s.value=id; carregarOBJ(p.arquivo,p.nome); },300);
}

/* ================= Aba 4: quantitativo IFC ================= */
const IFC_TIPOS = [
  ['IFCWALLSTANDARDCASE','Paredes (padrão)','Alvenaria e Vedações','AV-01'],
  ['IFCWALL','Paredes','Alvenaria e Vedações','AV-01'],
  ['IFCDOOR','Portas','Esquadrias (Portas e Janelas)','ES-01'],
  ['IFCWINDOW','Janelas','Esquadrias (Portas e Janelas)','ES-03'],
  ['IFCSLAB','Lajes e pisos','Estrutura de Concreto','CC-01'],
  ['IFCCOLUMN','Pilares','Estrutura de Concreto','CC-01'],
  ['IFCBEAM','Vigas','Estrutura de Concreto','CC-01'],
  ['IFCSTAIR','Escadas','Estrutura de Concreto','CC-01'],
  ['IFCRAILING','Guarda-corpos','Serviços Complementares e Limpeza',''],
  ['IFCROOF','Coberturas','Cobertura e Telhado','CB-01'],
  ['IFCCOVERING','Revestimentos e forros','Revestimentos Internos e Gesso','RV-07'],
  ['IFCFOOTING','Fundações','Fundações','CC-01'],
  ['IFCPILE','Estacas','Fundações','CC-01'],
  ['IFCFURNISHINGELEMENT','Mobiliário','',''],
  ['IFCSANITARYTERMINAL','Louças sanitárias','Louças, Metais e Bancadas','LM-01'],
  ['IFCFLOWSEGMENT','Tubulações e eletrodutos','Instalações Hidrossanitárias','HD-03'],
  ['IFCLIGHTFIXTURE','Luminárias','Instalações Elétricas e Dados','EL-08'],
  ['IFCBUILDINGSTOREY','Pavimentos','','']
];

async function projTabIFC(o,arqs){
  const body = document.getElementById('proj-body');
  const ifcs = arqs.filter(p=>p.ext==='ifc');
  body.innerHTML = `
    <div class="al ai"><i class="ti ti-info-circle"></i><div>
      Envie o <b>IFC exportado do Revit</b> (Arquivo → Exportar → IFC) e o sistema extrai o <b>quantitativo de elementos</b>
      do modelo: paredes, portas, janelas, lajes, pilares, vigas, pavimentos e áreas. Depois é possível
      <b>enviar essas quantidades direto para o orçamento</b> da obra.</div></div>
    <div class="card"><div class="bd"><div class="fr2">
      <div class="fg"><label>Arquivo IFC registrado</label><select id="ifc-sel" onchange="abrirIFC(this.value)">
        <option value="">— selecione —</option>
        ${ifcs.map(p=>`<option value="${p.id}">${esc(p.nome)} (R${esc(p.revisao)})</option>`).join('')}</select></div>
      <div class="fg"><label>Carregar do dispositivo</label>
        <button class="btn gh blk" onclick="document.getElementById('ifc-file').click()"><i class="ti ti-upload"></i>Escolher arquivo .ifc</button>
        <input type="file" id="ifc-file" accept=".ifc" class="hide" onchange="ifcDoArquivo(this)"></div>
    </div></div></div>
    <div id="ifc-res">${ifcs.length?'':`<div class="card"><div class="bd"><div class="empty"><i class="ti ti-topology-star"></i>
      <b>Nenhum modelo IFC nesta obra</b>Registre o IFC na aba "Arquivos e revisões" ou carregue direto do dispositivo.</div></div></div>`}</div>`;
}
async function abrirIFC(id){
  if(!id) return;
  const p = await dbGet('projetos',id);
  if(!p||!p.arquivo){ toast('Sem arquivo anexado.','aw'); return; }
  if(PROJ_TAB!=='ifc'){ PROJ_TAB='ifc'; await projRender(); }
  setTimeout(()=>{ const s=document.getElementById('ifc-sel'); if(s) s.value=id; ifcAnalisar(p.arquivo,p.nome); },200);
}
async function ifcDoArquivo(inp){
  const f = inp.files[0]; if(!f) return;
  ifcAnalisar(await f.text(), f.name);
  inp.value='';
}

function parseIFC(txt){
  const res = {tipos:{}, pavimentos:[], projeto:'', predio:'', areas:0, volumes:0, unidade:'', linhas:0};
  const linhas = txt.split(/;\s*\r?\n?/);
  res.linhas = linhas.length;
  const reTipo = /=\s*([A-Z0-9_]+)\s*\(/;
  linhas.forEach(l=>{
    const m = l.match(reTipo);
    if(!m) return;
    const t = m[1];
    res.tipos[t] = (res.tipos[t]||0)+1;
    if(t==='IFCBUILDINGSTOREY'){
      const nm = l.match(/'([^']*)'\s*,\s*\$?[^,]*,\s*'?([^',]*)'?/);
      const nome = (l.match(/,\s*'([^']+)'/)||[])[1];
      if(nome) res.pavimentos.push(nome);
    }
    if(t==='IFCPROJECT'){ const nm = (l.match(/,\s*'([^']+)'/)||[])[1]; if(nm) res.projeto = nm; }
    if(t==='IFCBUILDING'){ const nm = (l.match(/,\s*'([^']+)'/)||[])[1]; if(nm) res.predio = nm; }
    if(t==='IFCQUANTITYAREA'){ const v = l.match(/,\s*([\d.]+)\s*\)/); if(v) res.areas += parseFloat(v[1])||0; }
    if(t==='IFCQUANTITYVOLUME'){ const v = l.match(/,\s*([\d.]+)\s*\)/); if(v) res.volumes += parseFloat(v[1])||0; }
  });
  return res;
}

function ifcAnalisar(txt,nome){
  const box = document.getElementById('ifc-res');
  try{
    const r = parseIFC(txt);
    const totalEnt = Object.values(r.tipos).reduce((s,v)=>s+v,0);
    if(!totalEnt){ box.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Não foi possível interpretar este arquivo como IFC (formato STEP).</div>`; return; }
    const linhas = IFC_TIPOS.map(([t,label,etapa,cod])=>({t,label,etapa,cod,n:r.tipos[t]||0})).filter(x=>x.n>0);
    window.__IFC = {r, linhas, nome};
    let h = `<div class="kg" style="margin-bottom:14px">
      <div class="kc bl"><div class="lb"><i class="ti ti-box-multiple"></i>Elementos</div><div class="vl">${totalEnt.toLocaleString('pt-BR')}</div><div class="sb">entidades no modelo</div></div>
      <div class="kc pu"><div class="lb"><i class="ti ti-stack-2"></i>Pavimentos</div><div class="vl">${r.pavimentos.length||(r.tipos.IFCBUILDINGSTOREY||0)}</div>
        <div class="sb">${esc(r.pavimentos.slice(0,3).join(', ')||'—')}</div></div>
      <div class="kc gn"><div class="lb"><i class="ti ti-ruler-2"></i>Área declarada</div><div class="vl">${qtd(r.areas,0)}</div><div class="sb">soma das quantidades de área (m²)</div></div>
      <div class="kc am"><div class="lb"><i class="ti ti-cube"></i>Volume declarado</div><div class="vl">${qtd(r.volumes,1)}</div><div class="sb">soma das quantidades de volume (m³)</div></div>
    </div>
    <div class="card tw"><div class="hd"><i class="ti ti-list-numbers"></i>Quantitativo de elementos — ${esc(nome||'modelo IFC')}
      <span class="sp"></span><button class="btn sm" onclick="ifcParaOrcamento()"><i class="ti ti-arrow-right"></i>Enviar ao orçamento</button></div>
      <div class="bd"><table><thead><tr><th class="c"><input type="checkbox" checked onchange="document.querySelectorAll('.ifc-ck').forEach(c=>c.checked=this.checked)"></th>
        <th>Elemento</th><th class="mono">Tipo IFC</th><th class="r">Quantidade</th><th>Etapa sugerida</th><th>Insumo vinculado</th></tr></thead><tbody>`;
    linhas.forEach((x,i)=>{
      h += `<tr><td class="c"><input type="checkbox" class="ifc-ck" data-i="${i}" ${x.cod?'checked':''}></td>
        <td><b>${esc(x.label)}</b></td><td class="mono tt">${esc(x.t)}</td>
        <td class="r n"><b>${x.n.toLocaleString('pt-BR')}</b></td>
        <td class="tt">${esc(x.etapa||'—')}</td><td class="mono tt">${esc(x.cod||'—')}</td></tr>`;
    });
    h += `</tbody></table></div></div>`;
    if(r.pavimentos.length){
      h += `<div class="card"><div class="hd"><i class="ti ti-stack-2"></i>Pavimentos do modelo</div><div class="bd">
        <div class="chips">${r.pavimentos.map(p=>`<span class="chip on">${esc(p)}</span>`).join('')}</div></div></div>`;
    }
    const outros = Object.entries(r.tipos).filter(([t])=>!IFC_TIPOS.some(x=>x[0]===t))
      .sort((a,b)=>b[1]-a[1]).slice(0,18);
    h += `<div class="card tw"><div class="hd"><i class="ti ti-list"></i>Demais entidades do arquivo</div><div class="bd"><table>
      <thead><tr><th>Tipo IFC</th><th class="r">Ocorrências</th></tr></thead><tbody>
      ${outros.map(([t,n])=>`<tr><td class="mono">${esc(t)}</td><td class="r n">${n.toLocaleString('pt-BR')}</td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="al aw"><i class="ti ti-alert-triangle"></i><div>Este leitor extrai a <b>contagem de elementos e as quantidades declaradas</b>
      no IFC. Ele não reconstrói a geometria 3D do modelo — para isso seria preciso um motor BIM completo rodando em servidor.
      Confira sempre o quantitativo contra o projeto antes de orçar.</div></div>`;
    box.innerHTML = h;
    toast(`IFC lido: ${totalEnt.toLocaleString('pt-BR')} entidades.`);
  }catch(err){ console.error(err); box.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Erro ao ler o IFC: ${esc(err.message||err)}</div>`; }
}

async function ifcParaOrcamento(){
  const o = await obraAtual();
  const {linhas} = window.__IFC||{};
  if(!linhas) return;
  const sel = [...document.querySelectorAll('.ifc-ck')].filter(c=>c.checked).map(c=>linhas[+c.dataset.i]).filter(x=>x&&x.cod);
  if(!sel.length){ toast('Selecione ao menos um elemento com insumo vinculado.','aw'); return; }
  const insumos = await dbGetAll('insumos');
  const corpo = `<div class="al ai"><i class="ti ti-info-circle"></i>Serão criados itens no orçamento da obra
    <b>${esc(o.nome)}</b> a partir da contagem do modelo BIM. Ajuste as quantidades depois, item a item.</div>
    <table style="width:100%;font-size:12.5px"><thead><tr><th style="text-align:left">Elemento</th><th>Qtd IFC</th><th>Insumo</th></tr></thead><tbody>
    ${sel.map(x=>{ const i = insumos.find(y=>y.cod===x.cod);
      return `<tr><td>${esc(x.label)}</td><td style="text-align:center"><b>${x.n}</b></td><td>${esc(i?i.desc:x.cod)}</td></tr>`;}).join('')}
    </tbody></table>`;
  modal('Enviar quantitativo ao orçamento','ti-arrow-right',corpo,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="ifcParaOrcamentoConfirm()"><i class="ti ti-check"></i>Criar ${sel.length} item(ns)</button>`,'sm');
  window.__IFCSEL = sel;
}
async function ifcParaOrcamentoConfirm(){
  const o = await obraAtual();
  const sel = window.__IFCSEL||[];
  const insumos = await dbGetAll('insumos');
  for(const x of sel){
    const i = insumos.find(y=>y.cod===x.cod);
    if(!i) continue;
    await dbAdd('orcamento',{obraId:o.id, etapa:x.etapa, cod:i.cod, desc:i.desc+' (do modelo BIM: '+x.label+')',
      und:i.und, cat:i.cat, qtd:x.n, vunit:num(i.custo), origem:'Modelo IFC'});
  }
  closeModal('mk-form');
  toast(`${sel.length} item(ns) adicionados ao orçamento.`);
}

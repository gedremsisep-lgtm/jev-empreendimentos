/* =========================================================================
   MÓDULO: DIÁRIO DE OBRA (RDO) — registro diário com fotos
   ========================================================================= */
let RDO_FOTOS = [];   // [{src, leg}]

const CLIMAS = ['Bom','Nublado','Chuvoso','Chuva forte','Impraticável'];

async function rdoRender(){
  const root = document.getElementById('rdo-root');
  const o = await obraAtual();
  if(!o){ root.innerHTML = semObra(); return; }
  const regs = (await dbByObra('rdo',o.id)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const ultimos30 = regs.filter(r=>diasEntre(r.data,hoje())<=30);
  const diasChuva = ultimos30.filter(r=>['Chuvoso','Chuva forte','Impraticável'].includes(r.climaM)||['Chuvoso','Chuva forte','Impraticável'].includes(r.climaT)).length;
  const efetivoMedio = ultimos30.length ? ultimos30.reduce((s,r)=>s+num(r.efetivoTotal),0)/ultimos30.length : 0;
  const jaHoje = regs.some(r=>r.data===hoje());

  let html = `<div class="ph"><div class="ic"><i class="ti ti-notebook"></i></div>
    <div><h1>Diário de Obra</h1><p>${esc(o.cod)} — ${esc(o.nome)}</p></div>
    <div class="sp"></div>
    <button class="btn ${jaHoje?'gh':''}" onclick="rdoForm()"><i class="ti ti-plus"></i>${jaHoje?'Novo registro':'Registrar hoje'}</button></div>`;

  html += `<div class="kg" style="margin-bottom:14px">
    <div class="kc bl"><div class="lb"><i class="ti ti-notebook"></i>Registros</div><div class="vl">${regs.length}</div>
      <div class="sb">${ultimos30.length} nos últimos 30 dias</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-users"></i>Efetivo médio</div><div class="vl">${qtd(efetivoMedio,1)}</div><div class="sb">pessoas/dia no último mês</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-cloud-rain"></i>Dias de chuva</div><div class="vl">${diasChuva}</div><div class="sb">nos últimos 30 dias</div></div>
    <div class="kc ${jaHoje?'gn':'rd'}"><div class="lb"><i class="ti ti-calendar-check"></i>Hoje</div>
      <div class="vl" style="font-size:15px">${jaHoje?'Registrado':'Pendente'}</div><div class="sb">${dbr(hoje())}</div></div>
  </div>`;

  if(!regs.length){
    html += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-notebook-off"></i>
      <b>Nenhum registro no diário</b>O RDO documenta o que aconteceu na obra a cada dia: clima, efetivo,
      serviços executados, materiais recebidos, visitas e ocorrências — com fotos.
      É a principal defesa da empresa em qualquer discussão de prazo ou qualidade.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="rdoForm()"><i class="ti ti-plus"></i>Primeiro registro</button></div></div></div></div>`;
  }else{
    html += `<div class="sh"><i class="ti ti-history"></i>Registros</div><div class="tline">`;
    regs.slice(0,60).forEach(r=>{
      const chuva = ['Chuvoso','Chuva forte','Impraticável'].includes(r.climaM)||['Chuvoso','Chuva forte','Impraticável'].includes(r.climaT);
      html += `<div class="tev"><div class="card" style="margin-bottom:0"><div class="hd">
        <i class="ti ti-calendar-event"></i><b>${dbr(r.data)}</b>
        <span class="st ${chuva?'s-wn':'s-ok'}">${esc(r.climaM)} / ${esc(r.climaT)}</span>
        <span class="st s-pd">${num(r.efetivoTotal)} pessoas</span>
        ${r.paralisada?'<span class="st s-bl">Obra paralisada</span>':''}
        <span class="sp"></span>
        <button class="ib" onclick="printRDO(${r.id})" title="Imprimir"><i class="ti ti-printer"></i></button>
        <button class="ib bl" onclick="rdoForm(${r.id})" title="Editar"><i class="ti ti-edit"></i></button>
        <button class="ib rd" onclick="rdoDel(${r.id})" title="Excluir"><i class="ti ti-trash"></i></button></div>
        <div class="bd">
          ${r.atividades?`<div style="margin-bottom:9px"><span class="tt" style="font-weight:800">SERVIÇOS EXECUTADOS</span>
            <div style="font-size:13px;white-space:pre-wrap;margin-top:2px">${esc(r.atividades)}</div></div>`:''}
          ${r.etapas&&r.etapas.length?`<div class="chips" style="margin-bottom:9px">${r.etapas.map(e=>`<span class="chip on" style="background:${etapaCor(e)}">${esc(e)}</span>`).join('')}</div>`:''}
          ${r.ocorrencias?`<div class="al aw" style="margin:0 0 9px"><i class="ti ti-alert-triangle"></i><div><b>Ocorrências:</b> ${esc(r.ocorrencias)}</div></div>`:''}
          ${r.materiais?`<div class="tt" style="margin-bottom:6px"><b>Materiais recebidos:</b> ${esc(r.materiais)}</div>`:''}
          ${r.visitas?`<div class="tt" style="margin-bottom:6px"><b>Visitas:</b> ${esc(r.visitas)}</div>`:''}
          ${(r.fotos&&r.fotos.length)?`<div class="fgrid" style="margin-top:9px">${r.fotos.map((f,i)=>
            `<div class="fslot" onclick="verFoto(${r.id},${i})"><img src="${f.src}"><div class="tg">${esc(f.leg||'Foto '+(i+1))}</div></div>`).join('')}</div>`:''}
          <div class="tt" style="margin-top:9px;text-align:right">Registrado por ${esc(r.responsavel||'—')}</div>
        </div></div></div>`;
    });
    html += `</div>`;
  }
  root.innerHTML = html;
}

async function verFoto(rid,i){
  const r = await dbGet('rdo',rid);
  const f = r.fotos[i];
  modal(dbr(r.data)+' — '+(f.leg||'Foto '+(i+1)),'ti-photo',
    `<img src="${f.src}" style="width:100%;border-radius:8px">`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`,'lg');
}

/* ---------- Formulário ---------- */
async function rdoForm(id){
  const o = await obraAtual();
  const r = id ? await dbGet('rdo',id) : null;
  const etapas = (await dbByObra('etapas',o.id)).sort((a,b)=>a.ordem-b.ordem);
  const apts = await dbByObra('apontamentos',o.id);
  const dataRef = r?r.data:hoje();
  const efetDia = apts.filter(a=>a.data===dataRef);
  RDO_FOTOS = r ? JSON.parse(JSON.stringify(r.fotos||[])) : [];
  const sel = r?(r.etapas||[]):etapas.filter(e=>num(e.avanco)>0&&num(e.avanco)<100).map(e=>e.nome);

  const b = `
   <div class="fr4">
     <div class="fg"><label>Data <span class="rq">*</span></label><input id="rd-data" type="date" value="${dataRef}"></div>
     <div class="fg"><label>Clima manhã</label><select id="rd-cm">${CLIMAS.map(c=>`<option ${r&&r.climaM===c?'selected':''}>${c}</option>`).join('')}</select></div>
     <div class="fg"><label>Clima tarde</label><select id="rd-ct">${CLIMAS.map(c=>`<option ${r&&r.climaT===c?'selected':''}>${c}</option>`).join('')}</select></div>
     <div class="fg"><label>Efetivo total</label><input id="rd-ef" type="number" value="${r?r.efetivoTotal:(efetDia.length||'')}">
       <span class="hint">${efetDia.length?efetDia.length+' apontados neste dia':'pessoas na obra'}</span></div>
   </div>
   <div class="fg"><label>Etapas trabalhadas hoje</label>
     <div class="chips" id="rd-chips">${etapas.map(e=>`<span class="chip ${sel.includes(e.nome)?'on':''}" data-et="${esc(e.nome)}"
       onclick="this.classList.toggle('on')">${esc(e.nome)}</span>`).join('')}</div></div>
   <div class="fg"><label>Serviços executados <span class="rq">*</span></label>
     <textarea id="rd-at" style="min-height:88px" placeholder="Ex.: Concretagem da laje do pavimento térreo (48 m³). Assentamento de blocos nas paredes do setor B. Instalação de eletrodutos no teto.">${esc(r?r.atividades:'')}</textarea></div>
   <div class="fr2">
     <div class="fg"><label>Materiais recebidos</label><textarea id="rd-mat" placeholder="Ex.: 60 sacos de cimento — NF 4521">${esc(r?r.materiais:'')}</textarea></div>
     <div class="fg"><label>Visitas / fiscalização</label><textarea id="rd-vis" placeholder="Ex.: visita do proprietário às 14h; fiscal da prefeitura">${esc(r?r.visitas:'')}</textarea></div>
   </div>
   <div class="fg"><label>Ocorrências, impedimentos e não conformidades</label>
     <textarea id="rd-oc" placeholder="Ex.: chuva das 13h às 16h impediu a concretagem; falta de areia paralisou o reboco">${esc(r?r.ocorrencias:'')}</textarea></div>
   <div class="fr2">
     <div class="fg"><label>Responsável pelo registro</label><input id="rd-resp" value="${esc(r?r.responsavel:(CFG.respTec||PERFIS[CU].nome))}"></div>
     <div class="fg"><label style="display:flex;gap:8px;align-items:center;margin-top:22px;cursor:pointer">
       <input type="checkbox" id="rd-par" ${r&&r.paralisada?'checked':''} style="width:16px;height:16px">Obra paralisada neste dia</label></div>
   </div>
   <div class="sh"><i class="ti ti-camera"></i>Registro fotográfico (até 6 fotos)</div>
   <div id="rd-fotos"></div>
   <input type="file" id="rd-file" accept="image/*" capture="environment" class="hide" multiple onchange="rdoAddFotos(this)">
   <div id="rd-err"></div>`;
  const f = `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
    ${id?`<button class="btn gh" onclick="printRDO(${id})"><i class="ti ti-printer"></i>Imprimir</button>`:''}
    <button class="btn gn" onclick="rdoSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar registro</button>`;
  modal(id?'Editar RDO — '+dbr(r.data):'Relatório Diário de Obra','ti-notebook',b,f,'lg');
  rdoFotosRender();
}

function rdoFotosRender(){
  const box = document.getElementById('rd-fotos');
  if(!box) return;
  let h = `<div class="fgrid">`;
  for(let i=0;i<6;i++){
    const f = RDO_FOTOS[i];
    h += f
      ? `<div class="fslot"><img src="${f.src}">
           <button class="del" onclick="event.stopPropagation();rdoDelFoto(${i})"><i class="ti ti-trash"></i></button>
           <input class="tg" value="${esc(f.leg||'')}" placeholder="Legenda da foto ${i+1}" onchange="RDO_FOTOS[${i}].leg=this.value"
             style="border:0;outline:none;width:100%"></div>`
      : `<div class="fslot" onclick="document.getElementById('rd-file').click()">
           <i class="ti ti-camera-plus"></i><span>Foto ${i+1}</span></div>`;
  }
  h += `</div><div class="tt" style="margin-top:6px">As fotos são reduzidas automaticamente antes de gravar, para não pesar o banco de dados.</div>`;
  box.innerHTML = h;
}
function rdoDelFoto(i){ RDO_FOTOS.splice(i,1); rdoFotosRender(); }
async function rdoAddFotos(inp){
  const files = [...inp.files].slice(0,6-RDO_FOTOS.length);
  for(const f of files){
    try{ RDO_FOTOS.push({src: await comprimirImagem(f,1280,0.72), leg:''}); }
    catch(e){ toast('Não foi possível ler '+f.name,'ae'); }
  }
  inp.value = '';
  rdoFotosRender();
}
async function rdoSave(id){
  const o = await obraAtual();
  const at = val('rd-at');
  if(!at){ document.getElementById('rd-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Descreva os serviços executados no dia.</div>`; return; }
  const etapasSel = [...document.querySelectorAll('#rd-chips .chip.on')].map(c=>c.dataset.et);
  const d = {obraId:o.id, data:val('rd-data'), climaM:val('rd-cm'), climaT:val('rd-ct'),
             efetivoTotal:num(val('rd-ef')), etapas:etapasSel, atividades:at,
             materiais:val('rd-mat'), visitas:val('rd-vis'), ocorrencias:val('rd-oc'),
             responsavel:val('rd-resp'), paralisada:document.getElementById('rd-par').checked,
             fotos:JSON.parse(JSON.stringify(RDO_FOTOS))};
  if(id){ const old = await dbGet('rdo',id); await dbPut('rdo',{...old,...d}); }
  else await dbAdd('rdo',d);
  closeModal('mk-form'); toast('Registro do dia salvo.'); rdoRender();
}
function rdoDel(id){
  confirmar('Excluir registro','O RDO deste dia, incluindo as fotos, será apagado.',
    async()=>{ await dbDel('rdo',id); toast('Registro removido.','aw'); rdoRender(); });
}

async function printRDO(id){
  const r = await dbGet('rdo',id);
  const o = await dbGet('obras',r.obraId);
  const apts = (await dbByObra('apontamentos',o.id)).filter(a=>a.data===r.data);
  let h = prnHead('Relatório Diário de Obra — RDO','Registro do dia '+dbr(r.data));
  h += prnObraInfo(o);
  h += `<div class="pinf"><div><span>Clima manhã:</span> <b>${esc(r.climaM)}</b></div>
    <div><span>Clima tarde:</span> <b>${esc(r.climaT)}</b></div>
    <div><span>Efetivo total:</span> <b>${num(r.efetivoTotal)} pessoas</b></div>
    <div><span>Situação:</span> <b>${r.paralisada?'OBRA PARALISADA':'Obra em execução'}</b></div>
    <div><span>Responsável:</span> <b>${esc(r.responsavel||'—')}</b></div>
    <div><span>Etapas:</span> <b>${esc((r.etapas||[]).join(', ')||'—')}</b></div></div>`;
  h += `<div class="psec">Serviços executados</div>
    <div style="font-size:10px;white-space:pre-wrap;padding:6px 3px;border:1px solid #CCC;border-radius:4px;min-height:46px">${esc(r.atividades||'')}</div>`;
  if(apts.length){
    h += `<div class="psec">Efetivo apontado</div><table><thead><tr><th>Profissional</th><th>Função</th><th>Qtd</th><th>Serviço</th></tr></thead><tbody>`;
    apts.forEach(a=>{ h += `<tr><td>${esc(a.nome)}</td><td>${esc(a.funcao)}</td><td>${qtd(a.quant,1)} ${esc(a.und)}</td><td>${esc(a.servico||'—')}</td></tr>`; });
    h += `</tbody></table>`;
  }
  h += `<div class="psec">Materiais recebidos</div><div style="font-size:10px;padding:5px 3px;border:1px solid #CCC;border-radius:4px;min-height:26px">${esc(r.materiais||'Nenhum')}</div>
    <div class="psec">Visitas e fiscalização</div><div style="font-size:10px;padding:5px 3px;border:1px solid #CCC;border-radius:4px;min-height:26px">${esc(r.visitas||'Nenhuma')}</div>
    <div class="psec">Ocorrências e impedimentos</div><div style="font-size:10px;padding:5px 3px;border:1px solid #CCC;border-radius:4px;min-height:34px">${esc(r.ocorrencias||'Sem ocorrências')}</div>`;
  if((r.fotos||[]).length){
    h += `<div class="psec">Registro fotográfico</div><div class="pfg">`;
    r.fotos.forEach((f,i)=>{ h += `<div class="pf1"><img src="${f.src}"><div class="cap">Foto ${String.fromCharCode(65+i)} — ${esc(f.leg||'')}</div></div>`; });
    h += `</div>`;
  }
  h += prnSig(r.responsavel||'Responsável pelo registro','Encarregado / Mestre de obras', CFG.respTec||'Responsável Técnico', CFG.crea||'CREA/CAU');
  h += prnFoot();
  printar(h);
}

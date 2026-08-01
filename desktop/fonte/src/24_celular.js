/* =========================================================================
   CELULAR — Caixa de entrada das guias do JeV Mobile e preparo do catálogo
   Transferência sem servidor: arquivo .jev, código colado, QR Code ou WhatsApp.
   Formato do pacote:  JEV1.<tipo>[z].<base64url(gzip(JSON))>
     cat = catálogo que vai do computador para o celular
     gui = guias que vêm do celular para o computador
     rec = recibo que volta para o celular confirmando o que foi lançado
   ========================================================================= */

/* ---------------- pacote ---------------- */
function b64urlEnc(bytes){
  let s=''; const CH=0x8000;
  for(let i=0;i<bytes.length;i+=CH) s+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDec(str){
  const s=String(str).replace(/-/g,'+').replace(/_/g,'/');
  const bin=atob(s+'==='.slice((s.length+3)%4));
  const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
async function gzipBytes(u8){
  if(typeof CompressionStream==='undefined') return {z:false,d:u8};
  const cs=new CompressionStream('gzip');
  const buf=await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer();
  return {z:true,d:new Uint8Array(buf)};
}
async function gunzipBytes(u8){
  if(typeof DecompressionStream==='undefined') return u8;
  const ds=new DecompressionStream('gzip');
  const buf=await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}
async function pacoteCriar(tipo,obj){
  const json=new TextEncoder().encode(JSON.stringify(obj));
  const {z,d}=await gzipBytes(json);
  return `JEV1.${tipo}${z?'z':''}.${b64urlEnc(d)}`;
}
async function pacoteLer(txt){
  const s=String(txt||'').trim().replace(/\s+/g,'');
  const m=s.match(/^JEV1\.([a-z]+?)(z?)\.([A-Za-z0-9\-_]+)$/);
  if(!m) throw new Error('Este conteúdo não é um pacote da JeV. O texto precisa começar com JEV1.');
  let bytes=b64urlDec(m[3]);
  if(m[2]==='z') bytes=await gunzipBytes(bytes);
  return {tipo:m[1], obj:JSON.parse(new TextDecoder().decode(bytes))};
}

/* ---------------- tipos de guia (espelho do celular) ---------------- */
const GUIA_TIPOS = {
  rdo:        {nome:'Diário de obra',        ic:'ti-notebook',        cor:'#B4531F', un:'obras',   destino:'Diário de obra'},
  apont:      {nome:'Mão de obra do dia',    ic:'ti-users',           cor:'#B4531F', un:'obras',   destino:'Mão de obra + custo no financeiro'},
  medicao:    {nome:'Avanço de etapa',       ic:'ti-ruler-measure',   cor:'#B4531F', un:'obras',   destino:'Percentual da etapa no cronograma'},
  requisicao: {nome:'Requisição de material',ic:'ti-shopping-cart',   cor:'#8A5108', un:'obras',   destino:'Requisição em Materiais e compras'},
  despesa:    {nome:'Despesa / gasto',       ic:'ti-arrow-up-circle', cor:'#B3261E', un:'*',       destino:'Lançamento no financeiro'},
  receita:    {nome:'Recebimento',           ic:'ti-arrow-down-circle',cor:'#177A46',un:'*',       destino:'Lançamento no financeiro'},
  producao:   {nome:'Produção da chácara',   ic:'ti-plant-2',         cor:'#2E7D32', un:'chacara', destino:'Ciclo da chácara + financeiro'},
  ocorrencia: {nome:'Ocorrência / aviso',    ic:'ti-alert-triangle',  cor:'#8A5108', un:'*',       destino:'Aviso — fica arquivado aqui'}
};
const ST_GUIA_D = {'Recebida':'s-wn','Lançada':'s-ok','Descartada':'s-nt'};
const UN_NOMES_D = {obras:'Obras',imoveis:'Imóveis',veiculos:'Veículos',chacara:'Chácara',
                    produtos:'Produtos',info:'Infoprodutos',midia:'Mídia',geral:'Geral'};

let CEL_ABA = 'entrada';
let GUIAS_D = [];

async function celLoad(){
  GUIAS_D = (await dbGetAll('guias')).sort((a,b)=>String(b.recebido||'').localeCompare(String(a.recebido||'')));
  return GUIAS_D;
}
async function celPendentes(){
  if(!GUIAS_D.length) await celLoad();
  return GUIAS_D.filter(g=>g.status==='Recebida').length;
}

/* =========================================================================
   TELA
   ========================================================================= */
async function celRender(){
  await celLoad();
  const pend = GUIAS_D.filter(g=>g.status==='Recebida');
  const lanc = GUIAS_D.filter(g=>g.status==='Lançada');
  const desc = GUIAS_D.filter(g=>g.status==='Descartada');

  let h = `<div class="ph"><div class="ic" style="background:var(--brand-bg);color:var(--brand)">
      <i class="ti ti-device-mobile"></i></div>
    <div><h1>Celular da equipe</h1><p>Receba as guias preenchidas no campo e prepare o catálogo do JeV Mobile</p></div>
    <div class="sp"></div>
    <button class="btn gh sm" onclick="celComoUsar()"><i class="ti ti-help-circle"></i>Como funciona</button></div>`;

  h += `<div class="tabs">
    <button class="tab ${CEL_ABA==='entrada'?'on':''}" onclick="celAba('entrada')">
      <i class="ti ti-inbox"></i>Caixa de entrada${pend.length?` (${pend.length})`:''}</button>
    <button class="tab ${CEL_ABA==='historico'?'on':''}" onclick="celAba('historico')">
      <i class="ti ti-history"></i>Já lançadas (${lanc.length})</button>
    <button class="tab ${CEL_ABA==='preparar'?'on':''}" onclick="celAba('preparar')">
      <i class="ti ti-device-mobile-share"></i>Preparar celular</button>
  </div><div id="cel-body"></div>`;

  document.getElementById('cel-root').innerHTML = h;
  celBody();
}
function celAba(a){ CEL_ABA=a; celRender(); }

function celBody(){
  const box = document.getElementById('cel-body');
  if(CEL_ABA==='preparar'){ box.innerHTML = celPrepararHTML(); return; }
  if(CEL_ABA==='historico'){ box.innerHTML = celListaHTML(['Lançada','Descartada']); return; }
  box.innerHTML = celReceberHTML() + celListaHTML(['Recebida']);
}

/* ---------------- receber ---------------- */
function celReceberHTML(){
  return `
  <div class="fr2">
    <div class="card"><div class="hd"><i class="ti ti-download"></i>Receber guias do celular</div><div class="bd">
      <div class="drop" id="cel-drop"
        ondragover="event.preventDefault();this.classList.add('dg')"
        ondragleave="this.classList.remove('dg')"
        ondrop="celSolta(event)"
        onclick="document.getElementById('cel-file').click()">
        <i class="ti ti-file-upload"></i>
        <b>Arraste aqui o arquivo .jev</b>
        <small>ou clique para escolher — é o arquivo que o celular gerou em “Encaminhar”</small>
      </div>
      <input type="file" id="cel-file" accept=".jev,.json,.txt,text/plain" multiple class="hide" onchange="celArquivo(this)">
      <div class="divider"></div>
      <div class="fg"><label>Ou cole o código que veio pelo WhatsApp</label>
        <textarea id="cel-txt" rows="3" placeholder="JEV1.guiz.…" style="font-family:ui-monospace,monospace;font-size:11.5px"></textarea></div>
      <div class="brow">
        <button class="btn gn sm" onclick="celImportarTexto(document.getElementById('cel-txt').value)">
          <i class="ti ti-download"></i>Importar código</button>
        <button class="btn gh sm" onclick="celLerQR()"><i class="ti ti-qrcode"></i>Ler QR pela câmera</button>
      </div>
      <div id="cel-imp"></div>
    </div></div>

    <div class="card"><div class="hd"><i class="ti ti-info-circle"></i>Como chega até aqui</div><div class="bd">
      <div class="al ai"><i class="ti ti-route"></i><div>
        No celular a pessoa preenche a guia, toca em <b>Concluir</b> e depois em <b>Encaminhar</b>.
        O aplicativo gera um pacote — arquivo, código de texto ou QR Code — que você recebe aqui,
        confere e só então lança no sistema. Nada é gravado sem a sua aprovação.</div></div>
      <div class="al ag"><i class="ti ti-wifi-off"></i><div>
        Funciona sem internet no celular: ele guarda tudo e encaminha quando pegar sinal ou wi-fi.</div></div>
      <div class="al aw"><i class="ti ti-photo"></i><div>
        Guias com foto ficam grandes demais para QR. Nesses casos use o arquivo <b>.jev</b> pelo WhatsApp.</div></div>
    </div></div>
  </div>`;
}

function celSolta(ev){
  ev.preventDefault();
  document.getElementById('cel-drop').classList.remove('dg');
  const fs = [...(ev.dataTransfer.files||[])];
  if(fs.length) celLerArquivos(fs);
}
function celArquivo(inp){ const fs=[...inp.files]; inp.value=''; celLerArquivos(fs); }
async function celLerArquivos(files){
  for(const f of files){
    try{ await celImportarTexto(await f.text(), f.name); }
    catch(e){ celAviso('Não consegui ler '+f.name+': '+e.message,'ae'); }
  }
}
function celAviso(msg,cls){
  const b=document.getElementById('cel-imp');
  if(b) b.innerHTML = `<div class="al ${cls||'ag'}" style="margin-top:10px">
    <i class="ti ${cls==='ae'?'ti-alert-circle':cls==='aw'?'ti-alert-triangle':'ti-circle-check'}"></i><div>${msg}</div></div>`;
}

async function celImportarTexto(txt,nomeArq){
  if(!String(txt||'').trim()){ celAviso('Cole o código ou escolha o arquivo primeiro.','aw'); return; }
  let p;
  try{ p = await pacoteLer(txt); }
  catch(e){ celAviso(esc(e.message),'ae'); return; }

  if(p.tipo!=='gui'){
    celAviso(p.tipo==='cat'
      ? 'Este é um pacote de <b>catálogo</b> — ele vai do computador para o celular, não o contrário.'
      : 'Pacote do tipo <b>'+esc(p.tipo)+'</b> não é lido nesta tela.','aw');
    return;
  }
  const lista = p.obj.guias||[];
  if(!lista.length){ celAviso('O pacote veio sem nenhuma guia.','aw'); return; }

  await celLoad();
  const jaTem = new Set(GUIAS_D.map(g=>g.ref));
  let novas=0, repetidas=0;
  for(const g of lista){
    if(g.ref && jaTem.has(g.ref)){ repetidas++; continue; }
    await dbAdd('guias',{
      ref: g.ref || ('r'+Date.now()+Math.random().toString(36).slice(2,6)),
      tipo: g.tipo, dados: g.dados||{},
      autor: g.autor||p.obj.usuario||'', funcao: g.funcao||'',
      aparelho: p.obj.aparelho||'', criado: g.criado||'', alterado: g.alterado||'',
      recebido: new Date().toISOString(), arquivo: nomeArq||'', status:'Recebida', destinos:[]
    });
    novas++;
  }
  await celLoad();
  celAviso(`<b>${novas} guia(s) recebida(s)</b> de ${esc(p.obj.usuario||'celular')}${p.obj.aparelho?' ('+esc(p.obj.aparelho)+')':''}.` +
           (repetidas?` ${repetidas} já tinha(m) sido importada(s) antes e foram ignoradas.`:''),'ag');
  toast(`${novas} guia(s) na caixa de entrada.`);
  setVal('cel-txt','');
  CEL_ABA='entrada';
  celRender();
  celMarcarBadge();
}

/* ---------------- lista ---------------- */
function celListaHTML(status){
  const gs = GUIAS_D.filter(g=>status.includes(g.status));
  if(!gs.length) return `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-inbox"></i>
    <b>${status.includes('Recebida')?'Nenhuma guia esperando conferência':'Nada por aqui ainda'}</b>
    ${status.includes('Recebida')?'Quando o celular encaminhar, as guias aparecem nesta lista.':''}</div></div></div>`;

  const pend = status.includes('Recebida');
  let h = '';
  if(pend && gs.length>1){
    h += `<div class="brow" style="margin-bottom:11px">
      <button class="btn gn sm" onclick="celAprovarTodas()"><i class="ti ti-checks"></i>Conferir e lançar todas (${gs.length})</button>
      <button class="btn gh sm" onclick="celRecibo()"><i class="ti ti-receipt"></i>Gerar recibo para o celular</button></div>`;
  }
  if(!pend){
    h += `<div class="brow" style="margin-bottom:11px">
      <button class="btn gh sm" onclick="celRecibo()"><i class="ti ti-receipt"></i>Gerar recibo para o celular</button></div>`;
  }
  h += `<div class="card tw"><div class="bd"><table>
    <thead><tr><th>Recebida</th><th>Tipo</th><th>Resumo</th><th>Quem enviou</th>
      <th class="r">Valor</th><th class="c">Situação</th><th class="c">Ações</th></tr></thead><tbody>`;
  gs.forEach(g=>{
    const t = GUIA_TIPOS[g.tipo]||{nome:g.tipo,ic:'ti-file',cor:'var(--text2)'};
    const v = celValor(g);
    h += `<tr>
      <td class="n">${dbr(g.recebido)}<div class="tt">${String(g.recebido||'').slice(11,16)}</div></td>
      <td><span style="display:inline-flex;align-items:center;gap:7px">
        <i class="ti ${t.ic}" style="color:${t.cor};font-size:17px"></i><b>${esc(t.nome)}</b></span></td>
      <td>${esc(celResumo(g))}${g.dados&&celFotos(g).length?` <i class="ti ti-photo" title="tem foto" style="color:var(--text3)"></i>`:''}</td>
      <td>${esc(g.autor||'—')}<div class="tt">${esc(g.funcao||g.aparelho||'')}</div></td>
      <td class="r n">${v?moeda(v):'—'}</td>
      <td class="c"><span class="st ${ST_GUIA_D[g.status]||'s-nt'}">${esc(g.status)}</span></td>
      <td class="c nowrap">
        <button class="ib bl" title="Conferir" onclick="celVer(${g.id})"><i class="ti ti-eye"></i></button>
        ${g.status==='Recebida'?`<button class="ib gn" title="Aprovar e lançar" onclick="celAprovar(${g.id})"><i class="ti ti-check"></i></button>`:''}
        <button class="ib rd" title="Excluir da caixa" onclick="celExcluir(${g.id})"><i class="ti ti-trash"></i></button>
      </td></tr>`;
  });
  h += `</tbody></table></div></div>`;
  return h;
}

function celFotos(g){
  const out=[];
  Object.values(g.dados||{}).forEach(v=>{
    if(Array.isArray(v)) v.forEach(x=>{ if(typeof x==='string' && x.startsWith('data:image')) out.push(x); });
  });
  return out;
}
function celValor(g){
  const d=g.dados||{};
  if(g.tipo==='despesa'||g.tipo==='receita'||g.tipo==='producao') return num(d.valor);
  if(g.tipo==='apont') return (d.equipe||[]).reduce((s,p)=>s+num(p.qtd)*num(p.valor),0);
  return 0;
}
function celNomeRef(store,id){
  const c = CEL_CACHE[store]||[];
  const x = c.find(y=>String(y.id)===String(id));
  if(!x) return '—';
  if(store==='veiculos') return `${x.placa||''} ${x.modelo||''}`.trim();
  return `${x.cod?x.cod+' — ':''}${x.nome||x.modelo||''}`;
}
let CEL_CACHE = {};
async function celCache(){
  for(const s of ['obras','etapas','equipe','pessoas','imoveis','veiculos','ciclos','produtos','canais','insumos'])
    CEL_CACHE[s] = await dbGetAll(s);
}
function celResumo(g){
  const d=g.dados||{};
  switch(g.tipo){
    case 'rdo':        return `${celNomeRef('obras',d.obraId)} · ${dbr(d.data)}`;
    case 'apont':      return `${celNomeRef('obras',d.obraId)} · ${(d.equipe||[]).length} profissional(is) · ${dbr(d.data)}`;
    case 'medicao':    return `${celNomeRef('obras',d.obraId)} · ${d.etapa||''} a ${qtd(d.avanco,0)}%`;
    case 'requisicao': return `${celNomeRef('obras',d.obraId)} · ${(d.itens||[]).length} item(ns) · ${d.urgencia||''}`;
    case 'despesa':    return `${d.desc||''}`;
    case 'receita':    return `${d.desc||''}`;
    case 'producao':   return `${d.acao||''} · ${celNomeRef('ciclos',d.cicloId)}`;
    case 'ocorrencia': return `${d.titulo||''} · ${d.gravidade||''}`;
  }
  return '';
}

/* ---------------- conferir uma guia ---------------- */
async function celVer(id){
  await celCache();
  const g = GUIAS_D.find(x=>Number(x.id)===Number(id));
  if(!g) return;
  const t = GUIA_TIPOS[g.tipo]||{nome:g.tipo,ic:'ti-file',destino:''};
  const d = g.dados||{};
  const fotos = celFotos(g);

  const linha = (l,v)=> (v===''||v==null||v===false) ? '' :
    `<tr><td style="width:230px;color:var(--text2)">${esc(l)}</td><td><b>${v}</b></td></tr>`;
  let tb = '';
  switch(g.tipo){
    case 'rdo':
      tb = linha('Obra', esc(celNomeRef('obras',d.obraId))) + linha('Data', dbr(d.data)) +
           linha('Clima', esc([d.climaM,d.climaT].filter(Boolean).join(' / '))) +
           linha('Pessoas no dia', d.efetivo?qtd(d.efetivo,0):'') +
           linha('Obra paralisada', d.paralisada?'Sim':'') +
           linha('Etapas', esc((d.etapas||[]).join(', '))) +
           linha('Serviços executados', esc(d.atividades).replace(/\n/g,'<br>')) +
           linha('Materiais recebidos', esc(d.materiais).replace(/\n/g,'<br>')) +
           linha('Ocorrências', esc(d.ocorrencias).replace(/\n/g,'<br>'));
      break;
    case 'apont':
      tb = linha('Obra', esc(celNomeRef('obras',d.obraId))) + linha('Data', dbr(d.data)) +
           linha('Etapa', esc(d.etapa)) + linha('Serviço', esc(d.servico)) +
           linha('Profissionais', `<table style="margin-top:5px"><thead><tr><th>Nome</th><th>Função</th>
             <th class="r">Qtd</th><th class="r">Unitário</th><th class="r">Total</th></tr></thead><tbody>` +
             (d.equipe||[]).map(p=>`<tr><td>${esc(p.nome)}</td><td>${esc(p.funcao||'')}</td>
               <td class="r n">${qtd(p.qtd,1)} ${esc(p.und||'')}</td><td class="r n">${moeda(p.valor)}</td>
               <td class="r n">${moeda(num(p.qtd)*num(p.valor))}</td></tr>`).join('') +
             `</tbody></table>`);
      break;
    case 'medicao':
      tb = linha('Obra', esc(celNomeRef('obras',d.obraId))) + linha('Etapa', esc(d.etapa)) +
           linha('Avanço informado', `<span style="font-size:20px;color:var(--brand)">${qtd(d.avanco,0)}%</span>`) +
           linha('Data', dbr(d.data)) + linha('Observação', esc(d.obs).replace(/\n/g,'<br>'));
      break;
    case 'requisicao':
      tb = linha('Obra', esc(celNomeRef('obras',d.obraId))) + linha('Etapa', esc(d.etapa)) +
           linha('Urgência', esc(d.urgencia)) + linha('Precisa até', dbr(d.prevEntrega)) +
           linha('Itens', `<table style="margin-top:5px"><thead><tr><th>Material</th><th class="r">Qtd</th><th class="c">Un.</th></tr></thead>
             <tbody>${(d.itens||[]).map(i=>`<tr><td>${esc(i.desc)}</td><td class="r n">${qtd(i.qtd,2)}</td>
               <td class="c">${esc(i.und||'')}</td></tr>`).join('')}</tbody></table>`) +
           linha('Observações', esc(d.obs).replace(/\n/g,'<br>'));
      break;
    case 'despesa': case 'receita':
      tb = linha('Negócio', esc(UN_NOMES_D[d.un]||d.un)) +
           linha('Vinculado a', d.refId?esc(celNomeRef(celStoreDaUn(d.un),d.refId)):'') +
           linha('Descrição', esc(d.desc)) +
           linha('Valor', `<span style="font-size:20px;color:${g.tipo==='receita'?'var(--green)':'var(--red)'}">${moeda(d.valor)}</span>`) +
           linha('Data', dbr(d.data)) + linha('Categoria', esc(d.cat)) +
           linha(g.tipo==='receita'?'Quem pagou':'Fornecedor', esc(d.pessoa)) +
           linha('Forma', esc(d.forma)) +
           linha('Situação', d.pago?(g.tipo==='receita'?'Já recebido':'Já pago'):'Ainda em aberto') +
           linha('Documento', esc(d.doc));
      break;
    case 'producao':
      tb = linha('Ciclo', esc(celNomeRef('ciclos',d.cicloId))) + linha('Data', dbr(d.data)) +
           linha('O que aconteceu', esc(d.acao)) +
           linha('Quantidade', d.quant?`${qtd(d.quant,2)} ${esc(d.und||'')}`:'') +
           linha('Valor', num(d.valor)?moeda(d.valor):'') +
           linha('Comprador / fornecedor', esc(d.pessoa)) +
           linha('Observações', esc(d.obs).replace(/\n/g,'<br>'));
      break;
    case 'ocorrencia':
      tb = linha('Negócio', esc(UN_NOMES_D[d.un]||d.un)) +
           linha('Assunto', esc(d.titulo)) + linha('Gravidade', esc(d.gravidade)) +
           linha('Data', dbr(d.data)) + linha('Relato', esc(d.texto).replace(/\n/g,'<br>'));
      break;
  }

  const b = `
    <div class="al ai"><i class="ti ${t.ic}"></i><div>
      <b>${esc(t.nome)}</b> — enviada por <b>${esc(g.autor||'—')}</b>${g.funcao?' ('+esc(g.funcao)+')':''}
      ${g.aparelho?' · '+esc(g.aparelho):''}<br>
      Preenchida em ${dbr(g.criado)} · recebida aqui em ${dbr(g.recebido)}.
      ${g.status==='Recebida'?`<br>Ao aprovar, vira: <b>${esc(t.destino)}</b>.`:`<br>Situação: <b>${esc(g.status)}</b>.`}</div></div>
    <div class="card tw"><div class="bd"><table><tbody>${tb}</tbody></table></div></div>
    ${fotos.length?`<div class="sh"><i class="ti ti-photo"></i>Fotos (${fotos.length})</div>
      <div class="fgrid">${fotos.map((f,i)=>`<div class="fslot"><img src="${f}" onclick="celZoom(${i},${g.id})"></div>`).join('')}</div>`:''}
    ${g.status==='Recebida'?`<div class="fg" style="margin-top:13px"><label>Observação da conferência (opcional)</label>
      <input id="cel-obs" placeholder="Ex.: conferido com a nota fiscal"></div>`:''}
    ${g.obsRev?`<div class="al ai"><i class="ti ti-message"></i><div>Observação da conferência: <b>${esc(g.obsRev)}</b></div></div>`:''}`;

  const f = g.status==='Recebida'
    ? `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
       <button class="btn rd" onclick="celDescartar(${g.id})"><i class="ti ti-x"></i>Descartar</button>
       <button class="btn gn" onclick="celAprovar(${g.id},true)"><i class="ti ti-check"></i>Aprovar e lançar</button>`
    : `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`;
  modal('Conferir guia do celular', t.ic, b, f, 'lg');
}
function celStoreDaUn(un){
  return {obras:'obras',imoveis:'imoveis',veiculos:'veiculos',chacara:'ciclos',
          produtos:'produtos',info:'produtos',midia:'canais',geral:''}[un]||'';
}
function celZoom(i,gid){
  const g=GUIAS_D.find(x=>Number(x.id)===Number(gid));
  const f=celFotos(g)[i];
  if(f) window.open().document.write(`<title>Foto da guia</title><body style="margin:0;background:#111">
    <img src="${f}" style="max-width:100%;display:block;margin:auto">`);
}

/* =========================================================================
   APROVAR — transforma a guia em registro de verdade
   ========================================================================= */
async function celAprovar(id, fecharModal){
  const g = GUIAS_D.find(x=>Number(x.id)===Number(id));
  if(!g || g.status!=='Recebida') return;
  const obs = fecharModal ? val('cel-obs') : '';
  try{
    const destinos = await celLancar(g);
    await dbPut('guias',{...g, status:'Lançada', lancado:new Date().toISOString(), destinos, obsRev:obs});
  }catch(e){
    toast('Não consegui lançar: '+e.message,'ae');
    return;
  }
  if(fecharModal) closeModal('mk-form');
  await celLoad(); celRender(); celMarcarBadge();
  toast('Guia lançada no sistema.');
}
async function celAprovarTodas(){
  const pend = GUIAS_D.filter(g=>g.status==='Recebida');
  confirmar('Lançar todas as guias',
    `As <b>${pend.length}</b> guias da caixa de entrada serão lançadas de uma vez, do jeito que foram preenchidas.
     Se preferir conferir uma a uma, cancele e use o botão da lupa em cada linha.`,
    async()=>{
      let ok=0, erro=0;
      for(const g of pend){
        try{
          const destinos = await celLancar(g);
          await dbPut('guias',{...g, status:'Lançada', lancado:new Date().toISOString(), destinos});
          ok++;
        }catch(e){ console.error(e); erro++; }
      }
      await celLoad(); celRender(); celMarcarBadge();
      toast(`${ok} guia(s) lançada(s).${erro?' '+erro+' com problema — confira uma a uma.':''}`, erro?'aw':'');
    });
}

async function celLancar(g){
  const d = g.dados||{};
  const destinos = [];
  const fotos = celFotos(g);
  await celCache();

  const obraDe = ()=>{
    const o = (CEL_CACHE.obras||[]).find(x=>String(x.id)===String(d.obraId));
    if(!o) throw new Error('a obra desta guia não existe mais no sistema');
    return o;
  };
  const marca = `Celular — ${g.autor||'campo'}`;

  switch(g.tipo){
    case 'rdo': {
      const o = obraDe();
      const id = await dbAdd('rdo',{obraId:o.id, data:d.data||hoje(), climaM:d.climaM||'', climaT:d.climaT||'',
        efetivoTotal:num(d.efetivo), etapas:d.etapas||[], atividades:d.atividades||'',
        materiais:d.materiais||'', visitas:'', ocorrencias:d.ocorrencias||'',
        responsavel:g.autor||'', paralisada:!!d.paralisada,
        fotos:fotos.map(src=>({src,leg:''})), origem:marca, guiaRef:g.ref});
      destinos.push({store:'rdo', id, nome:'Diário de obra'});
      break;
    }
    case 'apont': {
      const o = obraDe();
      for(const p of (d.equipe||[])){
        const quant = num(p.qtd), vunit = num(p.valor), valor = quant*vunit;
        const reg = {obraId:o.id, data:d.data||hoje(), equipeId:celEquipeId(p.nome), nome:p.nome||'',
                     funcao:p.funcao||'', vinculo:'Diarista', quant, und:p.und||'dia', vunit, valor,
                     etapa:d.etapa||'', servico:d.servico||'', origem:marca, guiaRef:g.ref};
        const aptId = await dbAdd('apontamentos',reg);
        destinos.push({store:'apontamentos', id:aptId, nome:'Apontamento — '+reg.nome});
        if(valor>0){
          await finAdd({tipo:'despesa', un:'obras', refTipo:'obra', refId:o.id, refNome:o.cod+' — '+o.nome,
            data:reg.data, venc:reg.data, dtPag:reg.data, status:'Pago',
            desc:`Mão de obra — ${reg.nome} (${qtd(quant,1)} ${reg.und})`, etapa:reg.etapa,
            cat:'Mão de obra e empreiteiros', valor, pessoa:reg.nome,
            contaId:CFG.contaPadrao||null, auto:true, aptId, origem:marca});
        }
      }
      break;
    }
    case 'medicao': {
      const o = obraDe();
      const et = (CEL_CACHE.etapas||[]).find(e=>Number(e.obraId)===Number(o.id) && e.nome===d.etapa);
      if(!et) throw new Error(`a etapa “${d.etapa}” não existe no cronograma desta obra`);
      const novo = clamp(num(d.avanco),0,100);
      await dbPut('etapas',{...et, avanco:novo,
        status: novo>=100?'Concluída':novo>0?'Em execução':'Não iniciada',
        medObs: d.obs||'', medData: d.data||hoje(), medOrigem: marca});
      destinos.push({store:'etapas', id:et.id, nome:'Etapa '+et.nome+' → '+qtd(novo,0)+'%'});
      if(fotos.length){
        const rid = await dbAdd('rdo',{obraId:o.id, data:d.data||hoje(), atividades:`Avanço de ${et.nome} para ${qtd(novo,0)}%. ${d.obs||''}`.trim(),
          etapas:[et.nome], efetivoTotal:0, responsavel:g.autor||'', fotos:fotos.map(src=>({src,leg:'Comprovação do avanço'})),
          origem:marca, guiaRef:g.ref});
        destinos.push({store:'rdo', id:rid, nome:'Fotos guardadas no diário'});
      }
      break;
    }
    case 'requisicao': {
      const o = obraDe();
      const comp = (await dbGetAll('compras')).filter(c=>Number(c.obraId)===Number(o.id));
      const itens = (d.itens||[]).map(i=>({desc:i.desc||'', qtd:num(i.qtd), und:i.und||'un', vunit:0}));
      const id = await dbAdd('compras',{obraId:o.id, num:'RQ-'+String(comp.length+1).padStart(3,'0'),
        data:hoje(), status:'Solicitada', prevEntrega:d.prevEntrega||'', etapa:d.etapa||'',
        fornecedor:'', solicitante:g.autor||'', itens, cotacoes:[], total:0,
        obs:[d.urgencia?('Urgência: '+d.urgencia):'', d.obs||''].filter(Boolean).join(' — '),
        origem:marca, guiaRef:g.ref});
      destinos.push({store:'compras', id, nome:'Requisição de material'});
      break;
    }
    case 'despesa': case 'receita': {
      const receita = g.tipo==='receita';
      const store = celStoreDaUn(d.un);
      const ref = store && d.refId ? (CEL_CACHE[store]||[]).find(x=>String(x.id)===String(d.refId)) : null;
      const id = await finAdd({
        tipo: receita?'receita':'despesa',
        un: d.un||'geral',
        refTipo: ref ? {obras:'obra',imoveis:'imovel',veiculos:'veiculo',ciclos:'ciclo',produtos:'produto',canais:'canal'}[store]||'' : '',
        refId: ref? ref.id : null,
        refNome: ref ? celNomeRef(store,ref.id) : '',
        desc: d.desc||'', valor: num(d.valor),
        data: d.data||hoje(), venc: d.data||hoje(),
        status: d.pago ? (receita?'Recebido':'Pago') : 'Pendente',
        dtPag: d.pago ? (d.data||hoje()) : '',
        cat: d.cat || (receita?'Outras receitas':'Outras despesas'),
        pessoa: d.pessoa||'', forma: d.forma||'', doc: d.doc||'',
        contaId: CFG.contaPadrao||null,
        anexos: fotos.map(src=>({src,leg:'Comprovante do celular'})),
        obs: `Enviado pelo celular por ${g.autor||'campo'}${g.aparelho?' ('+g.aparelho+')':''}.`,
        origem: marca, guiaRef: g.ref});
      destinos.push({store:'financeiro', id, nome: receita?'Recebimento':'Despesa'});
      break;
    }
    case 'producao': {
      const c = (CEL_CACHE.ciclos||[]).find(x=>String(x.id)===String(d.cicloId));
      if(!c) throw new Error('o ciclo desta guia não existe mais no sistema');
      const q = num(d.quant), v = num(d.valor);
      if(d.acao==='Colheita' && q>0){
        await dbPut('ciclos',{...c, prodReal:num(c.prodReal)+q, dtColheita:d.data||c.dtColheita});
        destinos.push({store:'ciclos', id:c.id, nome:`Colheita +${qtd(q,2)} ${d.und||''}`});
      }
      if(v>0){
        const venda = d.acao==='Venda da produção' || d.acao==='Colheita';
        const id = await finAdd({
          tipo: venda?'receita':'despesa', un:'chacara', refTipo:'ciclo', refId:c.id, refNome:c.nome,
          desc: `${d.acao} — ${c.nome}${q?` (${qtd(q,2)} ${d.und||''})`:''}`,
          valor: v, data: d.data||hoje(), venc: d.data||hoje(),
          status: venda?'Recebido':'Pago', dtPag: d.data||hoje(),
          cat: venda?'Venda da produção':'Insumos agrícolas',
          pessoa: d.pessoa||'', contaId:CFG.contaPadrao||null,
          anexos: fotos.map(src=>({src,leg:'Foto do celular'})),
          origem:marca, guiaRef:g.ref});
        destinos.push({store:'financeiro', id, nome: venda?'Receita da produção':'Custo de custeio'});
      }
      if(!destinos.length) destinos.push({store:'', id:null, nome:'Registrado apenas como histórico'});
      break;
    }
    case 'ocorrencia': {
      if(d.un==='obras' && d.refId){
        const o = (CEL_CACHE.obras||[]).find(x=>String(x.id)===String(d.refId));
        if(o){
          const id = await dbAdd('rdo',{obraId:o.id, data:d.data||hoje(), atividades:'(ocorrência registrada pelo celular)',
            ocorrencias:`${d.titulo||''} — ${d.texto||''}`, etapas:[], efetivoTotal:0,
            responsavel:g.autor||'', fotos:fotos.map(src=>({src,leg:''})), origem:marca, guiaRef:g.ref});
          destinos.push({store:'rdo', id, nome:'Ocorrência lançada no diário da obra'});
          break;
        }
      }
      destinos.push({store:'', id:null, nome:'Aviso arquivado na caixa de entrada'});
      break;
    }
    default: throw new Error('tipo de guia desconhecido: '+g.tipo);
  }
  return destinos;
}
function celEquipeId(nome){
  const p=(CEL_CACHE.equipe||[]).find(x=>x.nome===nome);
  return p?p.id:null;
}

function celDescartar(id){
  confirmar('Descartar guia',
    'A guia sai da fila de conferência e <b>não</b> vira lançamento. Ela continua guardada no histórico.',
    async()=>{
      const g = GUIAS_D.find(x=>Number(x.id)===Number(id));
      await dbPut('guias',{...g, status:'Descartada', obsRev:val('cel-obs')||'', lancado:new Date().toISOString()});
      closeModal('mk-form'); await celLoad(); celRender(); celMarcarBadge();
      toast('Guia descartada.','aw');
    });
}
function celExcluir(id){
  const g = GUIAS_D.find(x=>Number(x.id)===Number(id));
  confirmar('Excluir da caixa de entrada',
    g.status==='Lançada'
      ? 'A guia sai desta lista, mas <b>os lançamentos que ela gerou continuam</b> no sistema.'
      : 'A guia será apagada. Se ainda existir no celular, dá para encaminhar de novo.',
    async()=>{ await dbDel('guias',id); await celLoad(); celRender(); celMarcarBadge(); toast('Guia removida da caixa.'); });
}

/* ---------------- recibo de volta para o celular ---------------- */
async function celRecibo(){
  const refs = GUIAS_D.filter(g=>g.status==='Lançada'||g.status==='Descartada').map(g=>g.ref).filter(Boolean);
  if(!refs.length){ toast('Ainda não há guias lançadas para confirmar.','aw'); return; }
  const cod = await pacoteCriar('rec',{v:1, em:new Date().toISOString(), refs});
  celMostrarPacote('Recibo para o celular', cod, `jev-recibo-${hoje()}.jev`,
    `Mande este recibo de volta para quem enviou. No celular ele entra em
     <b>Ajustes → Colar o código</b> e as guias ficam marcadas como <b>Recebida</b> —
     aí a pessoa pode apagar com segurança.`);
}

/* =========================================================================
   PREPARAR CELULAR — catálogo que vai do computador para o aparelho
   ========================================================================= */
function celPrepararHTML(){
  return `
  <div class="fr2">
    <div class="card"><div class="hd"><i class="ti ti-package-export"></i>Catálogo para o celular</div><div class="bd">
      <div class="al ai"><i class="ti ti-info-circle"></i><div>
        O catálogo leva para o celular a lista de obras e suas etapas, imóveis, veículos, ciclos da chácara,
        produtos, canais, equipe, fornecedores, materiais e as categorias do financeiro.
        Com ele a pessoa escolhe tudo em lista, em vez de digitar. Gere um novo sempre que cadastrar algo novo.</div></div>
      <div id="cel-cat-res"></div>
      <div class="brow">
        <button class="btn gn" onclick="celGerarCatalogo()"><i class="ti ti-package"></i>Gerar catálogo</button>
      </div>
    </div></div>

    <div class="card"><div class="hd"><i class="ti ti-device-mobile-cog"></i>Instalar o JeV Mobile</div><div class="bd">
      <div class="al ag"><i class="ti ti-download"></i><div>
        No celular, abra o endereço do <b>JeV Mobile</b> pelo navegador e escolha
        <b>Instalar aplicativo</b> (Android) ou <b>Compartilhar → Adicionar à Tela de Início</b> (iPhone).
        Ele passa a abrir como aplicativo e funciona sem internet.</div></div>
      <div class="fg"><label>Endereço do JeV Mobile</label>
        <input id="cel-url" value="${esc(CFG.urlMobile||'')}" placeholder="https://seuusuario.github.io/jev-mobile/">
        <div class="hint">Você recebe este endereço ao publicar o aplicativo (GitHub Pages). Guarde aqui para não esquecer.</div></div>
      <div class="brow">
        <button class="btn gh sm" onclick="celSalvarURL()"><i class="ti ti-device-floppy"></i>Guardar endereço</button>
        <button class="btn gh sm" onclick="celQRdoApp()"><i class="ti ti-qrcode"></i>QR para abrir no celular</button>
      </div>
    </div></div>
  </div>

  <div class="card"><div class="hd"><i class="ti ti-list-check"></i>Passo a passo com a equipe</div><div class="bd">
    <div class="fr2">
      <div>
        <div class="sh"><i class="ti ti-number-1"></i>No computador</div>
        <div class="tt" style="line-height:1.7">
          Gere o catálogo aqui e mande o arquivo <b>.jev</b> pelo WhatsApp para quem vai usar o celular.<br>
          Repita sempre que cadastrar uma obra, etapa, pessoa ou material novo.</div>
        <div class="sh" style="margin-top:14px"><i class="ti ti-number-2"></i>No celular</div>
        <div class="tt" style="line-height:1.7">
          A pessoa abre o JeV Mobile → <b>Ajustes</b> → <b>Importar arquivo do catálogo</b>,
          coloca o nome dela e já pode preencher as guias — mesmo sem sinal.</div>
      </div>
      <div>
        <div class="sh"><i class="ti ti-number-3"></i>Encaminhar</div>
        <div class="tt" style="line-height:1.7">
          No fim do dia ela toca em <b>Enviar → Encaminhar todas</b> e escolhe
          WhatsApp, arquivo ou QR Code.</div>
        <div class="sh" style="margin-top:14px"><i class="ti ti-number-4"></i>De volta aqui</div>
        <div class="tt" style="line-height:1.7">
          Você recebe na <b>Caixa de entrada</b>, confere e clica em <b>Aprovar e lançar</b>.
          Só então vira diário, custo, medição ou lançamento no financeiro.</div>
      </div>
    </div>
  </div></div>`;
}

function celSalvarURL(){
  CFG.urlMobile = val('cel-url');
  dbPut('config',{...CFG,id:1}).then(()=>toast('Endereço guardado.'));
}
function celQRdoApp(){
  const url = val('cel-url');
  if(!url){ toast('Escreva primeiro o endereço do JeV Mobile.','aw'); return; }
  let svg='';
  try{ const q=qrcode(0,'M'); q.addData(url); q.make(); svg=q.createSvgTag({cellSize:6,margin:8,scalable:true}); }
  catch(e){ toast('Não consegui gerar o QR.','ae'); return; }
  modal('Abrir o JeV Mobile no celular','ti-qrcode',
    `<div style="background:#fff;padding:18px;border-radius:12px;max-width:330px;margin:0 auto">${svg}</div>
     <div class="tt" style="text-align:center;margin-top:12px">Aponte a câmera do celular para este código.<br>
       <span class="mono">${esc(url)}</span></div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`,'sm');
}

async function celGerarCatalogo(){
  const [obras,etapas,imoveis,veiculos,ciclos,produtos,canais,equipe,pessoas,insumos] = await Promise.all(
    ['obras','etapas','imoveis','veiculos','ciclos','produtos','canais','equipe','pessoas','insumos'].map(dbGetAll));

  const cat = {
    v:1, em:new Date().toISOString(), origem:`JeV Empreendimentos${CFG.empresa?' — '+CFG.empresa:''}`,
    obras: obras.filter(o=>o.status!=='Concluída' && o.status!=='Cancelada').map(o=>({
      id:o.id, cod:o.cod||'', nome:o.nome, status:o.status||'',
      etapas: etapas.filter(e=>Number(e.obraId)===Number(o.id))
                    .sort((a,b)=>num(a.ordem)-num(b.ordem))
                    .map(e=>({nome:e.nome, avanco:num(e.avanco)}))
    })),
    imoveis: imoveis.map(i=>({id:i.id, cod:i.cod||'', nome:i.nome, tipo:i.tipo||'', status:i.status||''})),
    veiculos: veiculos.map(v=>({id:v.id, placa:v.placa||'', modelo:v.modelo||'', nome:v.modelo||'', tipo:v.tipo||'', status:v.status||''})),
    ciclos: ciclos.filter(c=>c.status!=='Encerrado').map(c=>({id:c.id, nome:c.nome, cultura:c.cultura||'', status:c.status||''})),
    produtos: produtos.map(p=>({id:p.id, nome:p.nome, tipo:p.tipo||'', preco:num(p.preco)})),
    canais: canais.map(c=>({id:c.id, nome:c.nome, plataforma:c.plataforma||''})),
    equipe: equipe.filter(e=>e.ativo!==false).map(e=>({id:e.id, nome:e.nome, funcao:e.funcao||'',
              valor:num(e.valor), und:e.und||'dia'})),
    pessoas: pessoas.map(p=>({id:p.id, nome:p.nome, tipo:p.tipo||'', fone:p.fone||''})),
    insumos: insumos.map(i=>({id:i.id, desc:i.desc, und:i.und||'un', categoria:i.categoria||''})),
    catsDesp: CAT_DESP, catsRec: CAT_REC
  };
  const cod = await pacoteCriar('cat',cat);
  const res = document.getElementById('cel-cat-res');
  if(res) res.innerHTML = `<div class="al ag"><i class="ti ti-circle-check"></i><div>
    Catálogo gerado: <b>${cat.obras.length}</b> obra(s) com
    <b>${cat.obras.reduce((s,o)=>s+o.etapas.length,0)}</b> etapa(s), <b>${cat.equipe.length}</b> na equipe,
    <b>${cat.insumos.length}</b> material(is), <b>${cat.pessoas.length}</b> pessoa(s).
    Tamanho: <b>${Math.max(1,Math.round(cod.length/1024))} KB</b>.</div></div>`;
  celMostrarPacote('Catálogo do JeV Mobile', cod, `jev-catalogo-${hoje()}.jev`,
    `Mande este arquivo para o celular pelo WhatsApp. Lá: <b>Ajustes → Importar arquivo do catálogo</b>.`);
}

/* ---------------- caixa com as formas de enviar um pacote ---------------- */
let CEL_PACOTE = null;
function celMostrarPacote(titulo, cod, nome, explica){
  CEL_PACOTE = {cod, nome};
  const cabeQR = cod.length <= 2200;
  const b = `<div class="al ai"><i class="ti ti-info-circle"></i><div>${explica}</div></div>
    <div class="brow">
      <button class="btn gn" onclick="celBaixarPacote()"><i class="ti ti-download"></i>Baixar arquivo .jev</button>
      <button class="btn gh" onclick="celCopiarPacote()"><i class="ti ti-copy"></i>Copiar o código</button>
      <button class="btn gh" onclick="celWhats()"><i class="ti ti-brand-whatsapp"></i>Abrir WhatsApp</button>
      ${cabeQR?`<button class="btn gh" onclick="celQRPacote()"><i class="ti ti-qrcode"></i>Mostrar QR</button>`:''}
    </div>
    ${cabeQR?'':`<div class="al aw"><i class="ti ti-alert-triangle"></i><div>
      Este pacote tem <b>${Math.round(cod.length/1024)} KB</b> — grande demais para caber em um QR Code.
      Use o arquivo ou o WhatsApp.</div></div>`}
    <div class="fg" style="margin-top:12px"><label>Código do pacote</label>
      <textarea readonly rows="4" id="cel-pac-txt" style="font-family:ui-monospace,monospace;font-size:11px">${esc(cod)}</textarea></div>
    <div id="cel-pac-qr"></div>`;
  modal(titulo,'ti-package',b,`<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`,'lg');
}
function celBaixarPacote(){ baixarArquivo(CEL_PACOTE.cod, CEL_PACOTE.nome, 'text/plain;charset=utf-8'); }
function celCopiarPacote(){
  const t=document.getElementById('cel-pac-txt');
  t.select(); t.setSelectionRange(0,999999);
  navigator.clipboard.writeText(CEL_PACOTE.cod)
    .then(()=>toast('Código copiado — cole no WhatsApp.'))
    .catch(()=>{ try{ document.execCommand('copy'); toast('Código copiado.'); }
                 catch(e){ toast('Selecione o texto e copie com Ctrl+C.','aw'); } });
}
function celWhats(){
  if(CEL_PACOTE.cod.length > 6000){
    toast('Pacote grande: baixe o arquivo .jev e anexe no WhatsApp.','aw');
    celBaixarPacote(); return;
  }
  window.open('https://wa.me/?text='+encodeURIComponent(CEL_PACOTE.cod),'_blank');
}
function celQRPacote(){
  const box=document.getElementById('cel-pac-qr');
  try{
    const q=qrcode(0,'L'); q.addData(CEL_PACOTE.cod); q.make();
    box.innerHTML = `<div style="background:#fff;padding:16px;border-radius:12px;max-width:360px;margin:12px auto 0">
      ${q.createSvgTag({cellSize:4,margin:8,scalable:true})}</div>
      <div class="tt" style="text-align:center;margin-top:8px">No celular, aponte a câmera para este código.</div>`;
  }catch(e){ box.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Não foi possível gerar o QR: ${esc(e.message)}</div>`; }
}

/* ---------------- ler QR pela câmera ---------------- */
let CEL_CAM = null;
function celLerQR(){
  const b = `<div class="al ai"><i class="ti ti-camera"></i><div>
      Aponte a câmera para o QR Code que aparece na tela do celular. A leitura é automática.</div></div>
    <div style="background:#111;border-radius:12px;overflow:hidden;position:relative">
      <video id="cel-cam" playsinline muted style="width:100%;display:block;max-height:52vh;object-fit:cover"></video>
      <div style="position:absolute;inset:16%;border:3px solid rgba(255,255,255,.8);border-radius:14px;pointer-events:none"></div>
    </div>
    <canvas id="cel-cvs" class="hide"></canvas>
    <div id="cel-qr-st" class="tt" style="text-align:center;margin-top:9px">Abrindo a câmera…</div>`;
  modal('Ler QR Code do celular','ti-qrcode',b,
    `<button class="btn gh" onclick="celPararCam();closeModal('mk-form')">Fechar</button>`,'sm');
  celIniciarCam();
}
async function celIniciarCam(){
  const st = document.getElementById('cel-qr-st');
  if(typeof jsQR === 'undefined'){ st.innerHTML = 'O leitor de QR não está disponível nesta versão.'; return; }
  try{
    CEL_CAM = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
  }catch(e){
    st.innerHTML = `<span style="color:var(--red)">Não consegui abrir a câmera (${esc(e.name||'erro')}).
      Use o arquivo .jev ou cole o código.</span>`;
    return;
  }
  const v = document.getElementById('cel-cam');
  v.srcObject = CEL_CAM; await v.play();
  st.textContent = 'Procurando o código…';
  const cvs = document.getElementById('cel-cvs'), ctx = cvs.getContext('2d',{willReadFrequently:true});
  const tick = ()=>{
    if(!CEL_CAM) return;
    if(v.readyState === v.HAVE_ENOUGH_DATA){
      cvs.width = v.videoWidth; cvs.height = v.videoHeight;
      ctx.drawImage(v,0,0,cvs.width,cvs.height);
      const img = ctx.getImageData(0,0,cvs.width,cvs.height);
      const r = jsQR(img.data, img.width, img.height, {inversionAttempts:'dontInvert'});
      if(r && r.data){
        celPararCam(); closeModal('mk-form');
        celImportarTexto(r.data,'QR Code');
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function celPararCam(){
  if(CEL_CAM){ CEL_CAM.getTracks().forEach(t=>t.stop()); CEL_CAM=null; }
}

/* ---------------- ajuda ---------------- */
function celComoUsar(){
  modal('Como funciona o celular da equipe','ti-help-circle',
   `<div class="al ai"><i class="ti ti-info-circle"></i><div>
      O <b>JeV Mobile</b> é o aplicativo que a equipe instala no celular. Ele não fala direto com este computador:
      a informação anda em <b>pacotes</b> que você manda e recebe por WhatsApp, arquivo ou QR Code.
      Isso funciona em obra sem internet e não depende de nenhum servidor.</div></div>
    <div class="sh"><i class="ti ti-arrow-right"></i>Do computador para o celular</div>
    <div class="tt" style="line-height:1.75">Aba <b>Preparar celular</b> → <b>Gerar catálogo</b> →
      manda o arquivo. O celular passa a conhecer suas obras, etapas, equipe e materiais.</div>
    <div class="sh" style="margin-top:14px"><i class="ti ti-arrow-left"></i>Do celular para o computador</div>
    <div class="tt" style="line-height:1.75">A equipe preenche as guias e encaminha. Você recebe na
      <b>Caixa de entrada</b>, confere e aprova. Só aí vira registro no sistema.</div>
    <div class="sh" style="margin-top:14px"><i class="ti ti-refresh"></i>Confirmação de volta</div>
    <div class="tt" style="line-height:1.75">Depois de lançar, gere o <b>recibo</b> e mande de volta:
      o celular marca as guias como recebidas e a pessoa pode apagar sem medo de perder nada.</div>
    <div class="divider"></div>
    <div class="sh"><i class="ti ti-arrows-transfer-down"></i>O que cada guia vira aqui</div>
    <div class="card tw"><div class="bd"><table><thead><tr><th>Guia do celular</th><th>Vira aqui</th></tr></thead><tbody>
      ${Object.entries(GUIA_TIPOS).map(([k,t])=>`<tr>
        <td><i class="ti ${t.ic}" style="color:${t.cor};margin-right:7px"></i>${esc(t.nome)}</td>
        <td>${esc(t.destino)}</td></tr>`).join('')}
    </tbody></table></div></div>`,
   `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`,'lg');
}

/* ---------------- aviso no menu ---------------- */
async function celMarcarBadge(){
  const n = await celPendentes();
  document.querySelectorAll('[data-cel-badge]').forEach(e=>{
    e.textContent = n;
    e.classList.toggle('hide', n===0);
  });
}

/* =========================================================================
   PONTE COM O APLICATIVO DE JANELA (Electron)
   Só entra em ação quando o sistema está rodando pelo instalador do Windows.
   No navegador comum nada disso acontece e tudo continua funcionando igual.
   ========================================================================= */
let APP_VERSAO = '';
function celLigarDesktop(){
  if(!window.JeVDesktop) return;

  /* abrir um arquivo .jev com dois cliques cai direto na caixa de entrada */
  window.JeVDesktop.aoReceberArquivo(({nome,texto})=>{
    go('cel');
    setTimeout(()=>{ CEL_ABA='entrada'; celRender(); setTimeout(()=>celImportarTexto(texto,nome),250); },250);
  });

  /* avisos da atualização automática */
  window.JeVDesktop.aoAtualizar(d=>{
    if(!d) return;
    if(d.fase==='baixando') toast(`Baixando a versão ${d.versao} em segundo plano…`,'ai');
    if(d.fase==='pronta')   toast(`Versão ${d.versao} pronta para instalar.`,'ag');
    if(d.fase==='erro')     toast('Não consegui verificar a atualização agora.','aw');
  });

  window.JeVDesktop.versao().then(v=>{
    APP_VERSAO = v;
    const el = document.querySelector('.lgt span');
    if(el) el.textContent = 'Gestão integrada · versão '+v;
  }).catch(()=>{});
}

/* =========================================================================
   CADASTROS — pessoas (clientes, inquilinos, fornecedores, funcionários)
   ========================================================================= */
let PES_FILTRO = '';
let PES_BUSCA = '';

async function pesRender(){
  const root = document.getElementById('pes-root');
  await finLoad();
  const pessoas = await dbGetAll('pessoas');
  const lista = pessoas.filter(p=>{
    if(PES_FILTRO && !(p.papeis||[]).includes(PES_FILTRO)) return false;
    if(PES_BUSCA){
      const t = (p.nome+' '+(p.doc||'')+' '+(p.tel||'')+' '+(p.email||'')+' '+(p.cidade||'')).toLowerCase();
      if(!t.includes(PES_BUSCA.toLowerCase())) return false;
    }
    return true;
  }).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));

  let h = `<div class="ph"><div class="ic"><i class="ti ti-address-book"></i></div>
    <div><h1>Cadastros</h1><p>Clientes, inquilinos, locatários, fornecedores, funcionários e prestadores — tudo em um lugar</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="pesExportar()"><i class="ti ti-file-spreadsheet"></i>Exportar</button>
    <button class="btn" onclick="pesForm()"><i class="ti ti-plus"></i>Nova pessoa</button></div>`;

  h += `<div class="card"><div class="bd">
    <div class="sbar">
      <div class="srch"><i class="ti ti-search"></i>
        <input type="search" placeholder="Buscar por nome, documento, telefone ou cidade" value="${esc(PES_BUSCA)}"
          oninput="PES_BUSCA=this.value;clearTimeout(window.__pb);window.__pb=setTimeout(pesRender,350)"></div>
    </div>
    <div class="chips"><span class="chip ${PES_FILTRO?'':'on'}" onclick="PES_FILTRO='';pesRender()">Todos (${pessoas.length})</span>
      ${PAPEIS.map(p=>{ const n = pessoas.filter(x=>(x.papeis||[]).includes(p)).length;
        return n? `<span class="chip ${PES_FILTRO===p?'on':''}" onclick="PES_FILTRO='${p}';pesRender()">${p} (${n})</span>`:''; }).join('')}
    </div></div></div>`;

  if(!pessoas.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-user-off"></i>
      <b>Nenhuma pessoa cadastrada</b>Cadastre uma vez e use em toda a JeV: o mesmo cadastro serve como
      cliente de obra, inquilino, fornecedor ou prestador.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn" onclick="pesForm()"><i class="ti ti-plus"></i>Cadastrar pessoa</button></div></div></div></div>`;
  }else if(!lista.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-search-off"></i>
      <b>Nada encontrado</b>Ajuste a busca ou o filtro.</div></div></div>`;
  }else{
    h += `<div class="mgrid">`;
    lista.forEach(p=>{
      const mov = FIN.filter(l=>finVale(l) && String(l.pessoa||'').toLowerCase()===String(p.nome).toLowerCase());
      const rec = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
      const des = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
      const pend = mov.filter(l=>l.status==='Pendente');
      h += `<div class="ocard" onclick="pesDetalhe(${p.id})">
        <div class="oh"><div class="oi" style="background:var(--brand-bg);color:var(--brand);font-size:13px;font-weight:900">${esc(iniciais(p.nome))}</div>
          <div style="flex:1;min-width:0"><b style="display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nome)}</b>
            <span class="tt">${esc((p.papeis||[]).join(' · ')||'sem papel definido')}</span></div></div>
        <div class="ob">
          ${p.tel?`<div class="row"><span>Telefone</span><b>${esc(p.tel)}</b></div>`:''}
          ${p.doc?`<div class="row"><span>Documento</span><b>${esc(p.doc)}</b></div>`:''}
          ${p.cidade?`<div class="row"><span>Cidade</span><b>${esc(p.cidade)}</b></div>`:''}
          ${rec?`<div class="row"><span>Recebido dela</span><b style="color:var(--green)">${moedaK(rec)}</b></div>`:''}
          ${des?`<div class="row"><span>Pago a ela</span><b style="color:var(--red)">${moedaK(des)}</b></div>`:''}
          ${pend.length?`<div class="row"><span>Em aberto</span><b style="color:var(--amber)">${moedaK(pend.reduce((s,l)=>s+num(l.valor),0))}</b></div>`:''}
        </div></div>`;
    });
    h += `</div>`;
  }
  root.innerHTML = h;
}

async function pesForm(id){
  const p = id ? await dbGet('pessoas',id) : null;
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Nome / razão social <span class="rq">*</span></label>
        <input id="pe-nome" value="${esc(p?p.nome:'')}"></div>
      <div class="fg"><label>CPF / CNPJ</label><input id="pe-doc" value="${esc(p?p.doc:'')}"></div></div>
    <div class="fg"><label>Papéis (marque todos que se aplicam)</label>
      <div class="chips" id="pe-papeis">${PAPEIS.map(x=>
        `<span class="chip ${p&&(p.papeis||[]).includes(x)?'on':''}" data-p="${x}" onclick="this.classList.toggle('on')">${x}</span>`).join('')}</div></div>
    <div class="fr3">
      <div class="fg"><label>Telefone / WhatsApp</label><input id="pe-tel" value="${esc(p?p.tel:'')}"></div>
      <div class="fg"><label>E-mail</label><input id="pe-email" value="${esc(p?p.email:'')}"></div>
      <div class="fg"><label>Chave Pix</label><input id="pe-pix" value="${esc(p?p.pix:'')}"></div></div>
    <div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Endereço</label><input id="pe-end" value="${esc(p?p.endereco:'')}"></div>
      <div class="fg"><label>Cidade / UF</label><input id="pe-cid" value="${esc(p?p.cidade:'')}"></div></div>
    <div class="fr2">
      <div class="fg"><label>Ramo / função</label><input id="pe-ramo" value="${esc(p?p.ramo:'')}" placeholder="Ex.: material de construção, pedreiro"></div>
      <div class="fg"><label>Data de nascimento / fundação</label><input id="pe-nasc" type="date" value="${p?p.nasc:''}"></div></div>
    <div class="fg"><label>Observações</label><textarea id="pe-obs">${esc(p?p.obs:'')}</textarea></div>
    <div id="pe-err"></div>`;
  modal(id?'Editar cadastro':'Nova pessoa','ti-user-plus',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     ${id?`<button class="btn rd" onclick="pesDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
     <button class="btn gn" onclick="pesSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function pesSave(id){
  const nome = val('pe-nome');
  if(!nome){ document.getElementById('pe-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome.</div>`; return; }
  const papeis = [...document.querySelectorAll('#pe-papeis .chip.on')].map(c=>c.dataset.p);
  const d = {nome, doc:val('pe-doc'), papeis, tel:val('pe-tel'), email:val('pe-email'), pix:val('pe-pix'),
             endereco:val('pe-end'), cidade:val('pe-cid'), ramo:val('pe-ramo'), nasc:val('pe-nasc'), obs:val('pe-obs')};
  if(id){ const old = await dbGet('pessoas',id); await dbPut('pessoas',{...old,...d}); }
  else await dbAdd('pessoas',d);
  closeModal('mk-form'); toast('Cadastro salvo.'); pesRender();
}
function pesDel(id){
  confirmar('Excluir cadastro','O histórico financeiro continua no sistema.',
    async()=>{ await dbDel('pessoas',id); closeModal('mk-form'); toast('Removido.','aw'); pesRender(); });
}
async function pesDetalhe(id){
  const p = await dbGet('pessoas',id);
  const mov = FIN.filter(l=>finVale(l) && String(l.pessoa||'').toLowerCase()===String(p.nome).toLowerCase())
                 .sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const rec = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const des = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
  const pend = mov.filter(l=>l.status==='Pendente');
  const contratos = (await dbGetAll('contratos')).filter(c=>String(c.pessoa||'').toLowerCase()===String(p.nome).toLowerCase());
  const b = `<div class="kg" style="margin-bottom:14px">
      <div class="kc gn"><div class="lb">Recebido</div><div class="vl">${moedaK(rec)}</div></div>
      <div class="kc rd"><div class="lb">Pago</div><div class="vl">${moedaK(des)}</div></div>
      <div class="kc am"><div class="lb">Em aberto</div><div class="vl">${moedaK(pend.reduce((s,l)=>s+num(l.valor),0))}</div>
        <div class="sb">${pend.length} lançamento(s)</div></div>
      <div class="kc br"><div class="lb">Movimentos</div><div class="vl">${mov.length}</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-user"></i>Dados cadastrais</div><div class="bd">
      <div class="fr3" style="gap:9px 16px">
        ${[['Documento',p.doc],['Telefone',p.tel],['E-mail',p.email],['Pix',p.pix],['Endereço',p.endereco],
           ['Cidade',p.cidade],['Ramo / função',p.ramo],['Papéis',(p.papeis||[]).join(', ')],['Nascimento',dbr(p.nasc)]]
          .map(([k,v])=>`<div style="font-size:12.5px"><span class="tt" style="display:block">${k}</span><b>${esc(v||'—')}</b></div>`).join('')}
      </div>${p.obs?`<div class="al ai" style="margin-bottom:0"><i class="ti ti-note"></i><div>${esc(p.obs)}</div></div>`:''}</div></div>
    ${contratos.length?`<div class="card tw"><div class="hd"><i class="ti ti-file-text"></i>Contratos</div><div class="bd"><table>
      <thead><tr><th>Tipo</th><th>Vigência</th><th class="r">Valor</th><th class="c">Situação</th></tr></thead><tbody>
      ${contratos.map(c=>`<tr><td>${c.tipo==='imovel'?'Locação de imóvel':'Locação de veículo'}</td>
        <td class="n">${dbr(c.inicio)} a ${dbr(c.fim)}</td><td class="r n">${moeda(c.valor)}</td>
        <td class="c"><span class="st ${c.status==='Ativo'?'s-ok':'s-nt'}">${esc(c.status)}</span></td></tr>`).join('')}
      </tbody></table></div></div>`:''}
    <div class="card tw"><div class="hd"><i class="ti ti-history"></i>Histórico financeiro</div><div class="bd"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Negócio</th><th class="c">Situação</th><th class="r">Valor</th></tr></thead><tbody>
      ${mov.slice(0,40).map(l=>{const st=finStatus(l),u=unInfo(l.un);return `<tr><td class="n">${dbr(l.data)}</td>
        <td>${esc(l.desc)}</td><td><span class="st" style="background:${u.bg};color:${u.cor}">${esc(u.curto)}</span></td>
        <td class="c"><span class="st ${st.c}">${st.t}</span></td>
        <td class="r n"><b style="color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${l.tipo==='receita'?'+':'−'} ${moeda(l.valor)}</b></td></tr>`;}).join('')
        || `<tr><td colspan="5" class="c tt" style="padding:20px">Nenhum movimento vinculado</td></tr>`}
      </tbody></table></div></div>`;
  modal(p.nome,'ti-user',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     ${p.tel?`<a class="btn gn" href="https://wa.me/55${String(p.tel).replace(/\D/g,'')}" target="_blank"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>`:''}
     <button class="btn" onclick="pesForm(${id})"><i class="ti ti-edit"></i>Editar</button>`,'lg');
}
async function pesExportar(){
  const ps = await dbGetAll('pessoas');
  const linhas = [['Nome','Documento','Papeis','Telefone','Email','Pix','Endereco','Cidade','Ramo','Observacoes']];
  ps.forEach(p=>linhas.push([p.nome,p.doc,(p.papeis||[]).join(', '),p.tel,p.email,p.pix,p.endereco,p.cidade,p.ramo,p.obs]));
  exportCSV(linhas,'cadastros_jev.csv');
}

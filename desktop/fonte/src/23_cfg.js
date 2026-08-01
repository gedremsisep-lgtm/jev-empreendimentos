/* =========================================================================
   CONFIGURAÇÕES, BACKUP E DADOS DE EXEMPLO
   ========================================================================= */
let CFG_TAB = 'emp';
let CFG_CAT = '';
function cfgStab(t){ CFG_TAB = t; cfgRender(); }

async function cfgRender(){
  const root = document.getElementById('cfg-root');
  root.innerHTML = `<div class="ph"><div class="ic"><i class="ti ti-settings"></i></div>
      <div><h1>Configurações</h1><p>Dados da empresa, catálogos de apoio e segurança dos dados</p></div></div>
    <div class="tabs">
      <button class="tab ${CFG_TAB==='emp'?'on':''}" onclick="cfgStab('emp')"><i class="ti ti-building-store"></i>Empresa</button>
      <button class="tab ${CFG_TAB==='ins'?'on':''}" onclick="cfgStab('ins')"><i class="ti ti-package"></i>Insumos de obra</button>
      <button class="tab ${CFG_TAB==='eqp'?'on':''}" onclick="cfgStab('eqp')"><i class="ti ti-users"></i>Equipe de obra</button>
      <button class="tab ${CFG_TAB==='sis'?'on':''}" onclick="cfgStab('sis')"><i class="ti ti-device-desktop-cog"></i>Sistema e backup</button>
    </div><div id="cfg-body"></div>`;
  if(CFG_TAB==='emp') await cfgTabEmpresa();
  if(CFG_TAB==='ins') await cfgTabInsumos();
  if(CFG_TAB==='eqp') await cfgTabEquipe();
  if(CFG_TAB==='sis') await cfgTabSistema();
}

async function cfgTabEmpresa(){
  const body = document.getElementById('cfg-body');
  const contas = await dbGetAll('contas');
  body.innerHTML = `<div class="fcard">
    <div class="sh" style="margin-top:0"><i class="ti ti-building-store"></i>Dados que aparecem no timbre dos documentos</div>
    <div class="fr2">
      <div class="fg"><label>Nome da empresa</label><input id="cf-emp" value="${esc(CFG.empresa||'JeV Empreendimentos')}"></div>
      <div class="fg"><label>CNPJ / CPF</label><input id="cf-cnpj" value="${esc(CFG.cnpj||'')}"></div></div>
    <div class="fr2">
      <div class="fg"><label>Endereço</label><input id="cf-end" value="${esc(CFG.endereco||'')}"></div>
      <div class="fg"><label>Cidade / UF</label><input id="cf-cid" value="${esc(CFG.cidade||'')}"></div></div>
    <div class="fr3">
      <div class="fg"><label>Telefone / WhatsApp</label><input id="cf-tel" value="${esc(CFG.tel||'')}"></div>
      <div class="fg"><label>E-mail</label><input id="cf-email" value="${esc(CFG.email||'')}"></div>
      <div class="fg"><label>Site / Instagram</label><input id="cf-site" value="${esc(CFG.site||'')}"></div></div>
    <div class="fr3">
      <div class="fg"><label>Responsável técnico (obras)</label><input id="cf-resp" value="${esc(CFG.respTec||'')}" placeholder="Eng. / Arq. nome completo"></div>
      <div class="fg"><label>Registro CREA / CAU</label><input id="cf-crea" value="${esc(CFG.crea||'')}"></div>
      <div class="fg"><label>Conta padrão dos lançamentos</label><select id="cf-conta">
        <option value="">— não definida —</option>
        ${contas.map(c=>`<option value="${c.id}" ${Number(CFG.contaPadrao)===Number(c.id)?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div></div>
    <div class="sh"><i class="ti ti-photo"></i>Logotipo da JeV</div>
    <div class="fr2">
      <div><div class="drop" onclick="document.getElementById('cf-logo-f').click()">
        <i class="ti ti-photo-plus"></i><b>Enviar logotipo</b><small>PNG ou JPG — reduzido automaticamente</small></div>
        <input type="file" id="cf-logo-f" accept="image/*" class="hide" onchange="cfgLogo(this)"></div>
      <div style="display:flex;align-items:center;justify-content:center;background:var(--bg3);border-radius:var(--radius);min-height:130px" id="cf-logo-prev">
        ${CFG.logo?`<img src="${CFG.logo}" style="max-width:190px;max-height:115px;object-fit:contain">`:'<span class="tt">Sem logotipo — os documentos usam o monograma JeV</span>'}</div></div>
    <div class="brow">
      <button class="btn gn" onclick="cfgSalvarForm()"><i class="ti ti-device-floppy"></i>Salvar configuração</button>
      ${CFG.logo?`<button class="btn gh" onclick="CFG.logo=null;cfgSalvar();cfgRender()"><i class="ti ti-trash"></i>Remover logotipo</button>`:''}
      <button class="btn gh" onclick="finImprimir()"><i class="ti ti-eye"></i>Ver como fica impresso</button></div>
  </div>`;
}
async function cfgLogo(inp){
  const f = inp.files[0]; if(!f) return;
  CFG.logo = await comprimirImagem(f,440,0.9);
  document.getElementById('cf-logo-prev').innerHTML = `<img src="${CFG.logo}" style="max-width:190px;max-height:115px;object-fit:contain">`;
  toast('Logotipo carregado — clique em Salvar.');
}
async function cfgSalvarForm(){
  CFG = {...CFG, empresa:val('cf-emp'), cnpj:val('cf-cnpj'), endereco:val('cf-end'), cidade:val('cf-cid'),
         tel:val('cf-tel'), email:val('cf-email'), site:val('cf-site'), respTec:val('cf-resp'),
         crea:val('cf-crea'), contaPadrao: val('cf-conta')?Number(val('cf-conta')):null};
  await cfgSalvar();
  toast('Configuração salva.');
  cfgRender();
}
async function cfgSalvar(){
  const all = await dbGetAll('config');
  if(all.length) await dbPut('config',{...all[0],...CFG, id:all[0].id});
  else { const id = await dbAdd('config',CFG); CFG.id = id; }
}
async function carregarConfig(){
  const cfg = await dbGetAll('config');
  CFG = cfg.length ? cfg[0] : {};
}

/* ---------------- Insumos de obra ---------------- */
async function cfgTabInsumos(){
  const body = document.getElementById('cfg-body');
  const ins = await dbGetAll('insumos');
  const lista = CFG_CAT ? ins.filter(i=>i.cat===CFG_CAT) : ins;
  let h = `<div class="al aw"><i class="ti ti-alert-triangle"></i><div>
    Os preços que vieram com o sistema são <b>valores de referência</b> para partida. Antes de fechar orçamento,
    atualize com os preços reais dos seus fornecedores. Use o reajuste em massa quando o mercado subir.</div></div>
   <div class="card"><div class="hd"><i class="ti ti-package"></i>Catálogo de insumos<span class="sp"></span>
     <button class="btn sm gh" onclick="admReajuste()"><i class="ti ti-percentage"></i>Reajuste em massa</button>
     <button class="btn sm" onclick="insForm()"><i class="ti ti-plus"></i>Novo insumo</button></div><div class="bd">
     <div class="chips"><span class="chip ${CFG_CAT?'':'on'}" onclick="CFG_CAT='';cfgRender()">Todas (${ins.length})</span>
       ${CATS.map(c=>{ const n = ins.filter(i=>i.cat===c).length;
         return n?`<span class="chip ${CFG_CAT===c?'on':''}" onclick="CFG_CAT='${c}';cfgRender()">${c} (${n})</span>`:''; }).join('')}</div>
   </div></div>
   <div class="card tw"><div class="bd"><table>
     <thead><tr><th>Código</th><th>Descrição</th><th>Categoria</th><th class="c">Und</th><th class="r">Custo unitário</th><th class="c no-print"></th></tr></thead><tbody>`;
  lista.sort((a,b)=>String(a.cod).localeCompare(String(b.cod))).forEach(i=>{
    h += `<tr><td class="mono"><b>${esc(i.cod)}</b></td><td>${esc(i.desc)}</td>
      <td><span class="st s-nt">${esc(i.cat)}</span></td><td class="c">${esc(i.und)}</td>
      <td class="r n"><b>${moeda(i.custo)}</b></td>
      <td class="c no-print nowrap"><button class="ib bl" onclick="insForm(${i.id})"><i class="ti ti-edit"></i></button>
        <button class="ib rd" onclick="insDel(${i.id})"><i class="ti ti-trash"></i></button></td></tr>`;
  });
  h += `</tbody></table></div></div>`;
  body.innerHTML = h;
}
async function insForm(id){
  const i = id ? await dbGet('insumos',id) : null;
  const b = `<div class="fr2">
      <div class="fg"><label>Código <span class="rq">*</span></label><input id="in-cod" value="${esc(i?i.cod:'')}"></div>
      <div class="fg"><label>Unidade</label><input id="in-und" value="${esc(i?i.und:'un')}" placeholder="m², m³, kg, sc, un, h, dia"></div></div>
    <div class="fg"><label>Descrição <span class="rq">*</span></label><input id="in-desc" value="${esc(i?i.desc:'')}"></div>
    <div class="fr2">
      <div class="fg"><label>Categoria</label><select id="in-cat">${CATS.map(c=>`<option ${i&&i.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="fg"><label>Custo unitário (R$)</label><input id="in-custo" type="number" step="0.01" value="${i?i.custo:''}"></div></div>
    <div id="in-err"></div>`;
  modal(id?'Editar insumo':'Novo insumo','ti-package',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="insSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`,'sm');
}
async function insSave(id){
  const cod = val('in-cod'), desc = val('in-desc');
  if(!cod||!desc){ document.getElementById('in-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe código e descrição.</div>`; return; }
  const d = {cod, desc, und:val('in-und')||'un', cat:val('in-cat'), custo:num(val('in-custo'))};
  if(id){ const old = await dbGet('insumos',id); await dbPut('insumos',{...old,...d}); }
  else await dbAdd('insumos',d);
  closeModal('mk-form'); toast('Insumo salvo.'); cfgRender();
}
function insDel(id){
  confirmar('Excluir insumo','Itens de orçamento já lançados são mantidos.',
    async()=>{ await dbDel('insumos',id); toast('Removido.','aw'); cfgRender(); });
}
function admReajuste(){
  modal('Reajuste de preços','ti-percentage',
    `<div class="al ai"><i class="ti ti-info-circle"></i>Aplica um percentual sobre o custo de todos os insumos da categoria escolhida.</div>
     <div class="fr2">
       <div class="fg"><label>Categoria</label><select id="rj-cat"><option value="">Todas</option>
         ${CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
       <div class="fg"><label>Percentual (%)</label><input id="rj-pct" type="number" step="0.1" placeholder="Ex.: 8 ou -5"></div></div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="admReajusteAplicar()"><i class="ti ti-check"></i>Aplicar</button>`,'sm');
}
async function admReajusteAplicar(){
  const cat = val('rj-cat'), p = num(val('rj-pct'));
  if(!p){ toast('Informe o percentual.','ae'); return; }
  const ins = await dbGetAll('insumos');
  let n = 0;
  for(const i of ins){ if(cat && i.cat!==cat) continue;
    await dbPut('insumos',{...i, custo:+(num(i.custo)*(1+p/100)).toFixed(2)}); n++; }
  closeModal('mk-form'); toast(`${n} insumo(s) reajustados em ${p}%.`); cfgRender();
}

/* ---------------- Equipe de obra ---------------- */
async function cfgTabEquipe(){
  const body = document.getElementById('cfg-body');
  const eq = await dbGetAll('equipe');
  let h = `<div class="al ai"><i class="ti ti-info-circle"></i><div>Pedreiros, serventes, empreiteiros e prestadores usados
    no apontamento de mão de obra das obras. Contatos gerais ficam em <b>Cadastros</b>.</div></div>
   <div class="card"><div class="hd"><i class="ti ti-users"></i>Profissionais<span class="sp"></span>
     <button class="btn sm" onclick="eqForm()"><i class="ti ti-plus"></i>Cadastrar</button></div><div class="bd">`;
  if(!eq.length){
    h += `<div class="empty"><i class="ti ti-user-off"></i><b>Nenhum profissional cadastrado</b>
      Cadastre com o valor da diária ou hora para agilizar o apontamento no canteiro.</div></div></div>`;
  }else{
    h += `</div></div><div class="card tw"><div class="bd"><table>
      <thead><tr><th>Nome</th><th>Função</th><th>Vínculo</th><th>Telefone</th><th>Pix</th>
      <th class="r">Valor</th><th class="c">Situação</th><th class="c no-print"></th></tr></thead><tbody>`;
    eq.sort((a,b)=>String(a.nome).localeCompare(String(b.nome))).forEach(e=>{
      h += `<tr><td><b>${esc(e.nome)}</b></td><td>${esc(e.funcao)}</td>
        <td><span class="st ${e.vinculo==='Empreiteiro'?'s-pu':e.vinculo==='Diarista'?'s-wn':'s-pd'}">${esc(e.vinculo)}</span></td>
        <td class="tt">${esc(e.tel||'—')}</td><td class="tt">${esc(e.pix||'—')}</td>
        <td class="r n">${moeda(e.valor)} / ${esc(e.und||'dia')}</td>
        <td class="c"><span class="st ${e.ativo===false?'s-nt':'s-ok'}">${e.ativo===false?'Inativo':'Ativo'}</span></td>
        <td class="c no-print nowrap"><button class="ib bl" onclick="eqForm(${e.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="eqDel(${e.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  }
  body.innerHTML = h;
}

/* ---------------- Sistema, backup e exemplo ---------------- */
async function cfgTabSistema(){
  const body = document.getElementById('cfg-body');
  const cont = {};
  for(const s of STORES) cont[s] = (await dbGetAll(s)).length;
  const nomes = {config:'Configuração',contas:'Contas bancárias',financeiro:'Lançamentos financeiros',
    recorrencias:'Despesas e receitas fixas',pessoas:'Pessoas cadastradas',obras:'Obras',etapas:'Etapas de cronograma',
    orcamento:'Itens de orçamento',insumos:'Insumos de obra',compras:'Requisições de compra',estoque:'Movimentos de estoque',
    equipe:'Profissionais de obra',apontamentos:'Apontamentos de mão de obra',rdo:'Registros do diário',
    projetos:'Arquivos de projeto',medicoes:'Boletins de medição',imoveis:'Imóveis',veiculos:'Veículos',
    contratos:'Contratos de locação',manutencoes:'Manutenções',lotes:'Lotes da chácara',ciclos:'Ciclos de produção',
    produtos:'Produtos e infoprodutos',vendas:'Vendas',canais:'Canais de vídeo',videos:'Vídeos'};
  const total = Object.values(cont).reduce((s,v)=>s+v,0);

  body.innerHTML = `
    <div class="card"><div class="hd"><i class="ti ti-users-group"></i>Perfis de acesso</div><div class="bd">
      <div class="al ai"><i class="ti ti-info-circle"></i>O perfil simplifica a tela de cada pessoa da família ou da equipe.
        Não é senha — serve para quem está no campo não se perder em telas que não usa.</div>
      ${Object.entries(PERFIS).map(([k,p])=>`<div style="display:flex;gap:12px;align-items:center;padding:11px;
        border:2px solid ${CU===k?'var(--brand)':'var(--border)'};border-radius:12px;margin-bottom:8px;cursor:pointer;
        background:${CU===k?'var(--brand-bg)':'var(--bg2)'}" onclick="setU('${k}')">
        <div style="width:38px;height:38px;border-radius:50%;background:${CU===k?'var(--brand)':'var(--bg4)'};
          color:${CU===k?'#fff':'var(--text2)'};display:flex;align-items:center;justify-content:center;font-weight:900">${p.sigla}</div>
        <div style="flex:1"><b>${p.nome}</b><div class="tt">${p.desc}</div></div>
        <span class="tt">${PERMS[k].length} de ${PERMS.g.length} áreas</span></div>`).join('')}
    </div></div>

    <div class="card"><div class="hd"><i class="ti ti-shield-check"></i>Backup e segurança dos dados</div><div class="bd">
      <div class="al aw"><i class="ti ti-alert-triangle"></i><div>Os dados ficam gravados <b>apenas neste navegador</b>.
        Limpar os dados do navegador, trocar de celular ou formatar o computador apaga tudo.
        <b>Baixe o backup toda semana</b> e guarde no e-mail, no WhatsApp ou na nuvem.</div></div>
      <div class="brow">
        <button class="btn gn" onclick="exportBackup()"><i class="ti ti-download"></i>Baixar backup agora</button>
        <button class="btn gh" onclick="openBackup()"><i class="ti ti-upload"></i>Restaurar backup</button>
        <button class="btn gh" onclick="seedDemo()"><i class="ti ti-flask"></i>Carregar dados de exemplo</button>
      </div>
      <div class="tt" style="margin-top:10px">Para usar em outro aparelho: baixe o backup aqui, mande o arquivo para o
        outro aparelho, abra o mesmo arquivo do sistema lá e use "Restaurar backup". Backups do sistema antigo de obras
        (SISEP OBRAS) também são aceitos — o sistema converte os dados sozinho.</div>
    </div></div>

    <div class="card tw"><div class="hd"><i class="ti ti-database"></i>Dados armazenados — ${total} registros</div><div class="bd">
      <table><thead><tr><th>Tabela</th><th class="r">Registros</th></tr></thead><tbody>
      ${STORES.filter(s=>cont[s]>0).map(s=>`<tr><td>${nomes[s]||s}</td><td class="r n"><b>${cont[s]}</b></td></tr>`).join('')
        || `<tr><td colspan="2" class="c tt" style="padding:20px">Nenhum dado gravado ainda</td></tr>`}
      </tbody></table></div></div>

    <div class="card"><div class="hd"><i class="ti ti-info-circle"></i>Sobre o sistema</div><div class="bd">
      <div style="font-size:12.5px;line-height:1.75;color:var(--text2)">
        <b>JeV Empreendimentos</b> — sistema de gestão integrada para a família: financeiro completo,
        obras e edificações, locação de imóveis, locação de veículos, produção da chácara, produtos,
        infoprodutos e canais de vídeo.<br>
        Arquivo único, sem instalação e sem servidor. A fonte de ícones e a biblioteca 3D estão embutidas,
        então <b>funciona sem internet</b>, inclusive no canteiro e na chácara.<br>
        Versão do sistema: <b>${SISTEMA_VERSAO}</b> · Banco de dados local: IndexedDB
        (<span class="mono">${DB_NAME}</span> v${DB_VERSION}), ${STORES.length} tabelas.</div>
      <div class="brow" style="margin-top:12px">
        <button class="btn gh" onclick="go('ver')"><i class="ti ti-refresh-dot"></i>Atualizações e volta atrás</button></div>
    </div></div>`;
}

/* ---------------- Backup ---------------- */
async function openBackup(){
  let total = 0; const cont = {};
  for(const s of STORES){ cont[s] = (await dbGetAll(s)).length; total += cont[s]; }
  document.getElementById('bkp-stat').innerHTML =
    `<div class="al ${total>1?'ag':'aw'}"><i class="ti ti-database"></i><div><b>${total} registros</b> gravados —
      ${cont.financeiro} lançamento(s) financeiro(s), ${cont.obras} obra(s), ${cont.imoveis} imóvel(is),
      ${cont.veiculos} veículo(s), ${cont.produtos} produto(s).</div></div>`;
  openModal('mk-bkp');
}
async function exportBackup(){
  const dump = {_sistema:'JEV', _versao:DB_VERSION, _data:new Date().toISOString(), dados:{}};
  for(const s of STORES) dump.dados[s] = await dbGetAll(s);
  baixarArquivo(JSON.stringify(dump), `backup_jev_${hoje()}.json`,'application/json');
  toast('Backup baixado. Guarde o arquivo em local seguro.');
}
async function importBackup(inp){
  const f = inp.files[0]; if(!f) return;
  const txt = await f.text(); inp.value = '';
  let dump;
  try{ dump = JSON.parse(txt); }catch(e){ toast('Arquivo inválido.','ae'); return; }
  if(!dump.dados){ toast('Este arquivo não é um backup reconhecido.','ae'); return; }
  const antigo = dump._sistema === 'SISEP_OBRAS';
  const n = Object.values(dump.dados).reduce((s,a)=>s+(a?a.length:0),0);
  confirmar('Restaurar backup',
    `Backup de <b>${dbr(String(dump._data||'').slice(0,10))}</b> com <b>${n} registros</b>${antigo?' — <b>formato do sistema antigo de obras</b>, será convertido automaticamente':''}.
     Todos os dados atuais deste navegador serão <b>substituídos</b>. Continuar?`,
    async()=>{
      for(const s of STORES){
        const at = await dbGetAll(s);
        for(const it of at) await dbDel(s,it.id);
      }
      for(const s of STORES){
        for(const it of (dump.dados[s]||[])) await dbPut(s,it);
      }
      if(antigo) await migrarSisep(dump.dados);
      await carregarConfig(); await finLoad();
      closeModal('mk-bkp'); toast('Backup restaurado.'); go('hub');
    });
}
/* converte um backup do sistema antigo (SISEP OBRAS) para o formato da JeV */
async function migrarSisep(dados){
  // lançamentos de obra viram movimentos financeiros da unidade "obras"
  const obras = await dbGetAll('obras');
  const mapO = {}; obras.forEach(o=>mapO[o.id]=o);
  for(const l of (dados.lancamentos||[])){
    const o = mapO[l.obraId];
    await dbAdd('financeiro',{tipo:'despesa', un:'obras', refTipo:'obra', refId:l.obraId,
      refNome:o?`${o.cod} — ${o.nome}`:'', desc:l.desc||'Custo de obra', valor:num(l.valor),
      cat: l.cat==='Mão de obra'?'Mão de obra e empreiteiros':'Material de construção',
      data:l.data, venc:l.data, dtPag:l.data, status:'Pago', etapa:l.etapa||'',
      pessoa:l.fornecedor||'', doc:l.doc||'', forma:l.forma||'', aptId:l.aptId,
      auto:true, origem:'Migrado do sistema antigo'});
  }
  // fornecedores antigos viram pessoas
  for(const f of (dados.fornecedores||[])){
    await dbAdd('pessoas',{nome:f.nome, papeis:['Fornecedor'], doc:f.cnpj||'', tel:f.tel||'',
      email:f.email||'', endereco:f.endereco||'', cidade:f.cidade||'', ramo:f.ramo||'', obs:f.obs||''});
  }
  // medições viram receitas
  for(const m of (dados.medicoes||[])){
    const o = mapO[m.obraId];
    if(num(m.valor)<=0) continue;
    await dbAdd('financeiro',{tipo:'receita', un:'obras', refTipo:'obra', refId:m.obraId,
      refNome:o?`${o.cod} — ${o.nome}`:'', desc:`Medição nº ${String(m.num).padStart(2,'0')}`,
      valor:num(m.valor), cat:'Medição de obra', data:m.dtFim, venc:m.venc,
      status: m.status==='Paga'?'Pago':'Pendente', dtPag: m.status==='Paga'?m.venc:'',
      pessoa:o?o.cliente:'', medicaoId:m.id, auto:true, origem:'Migrado do sistema antigo'});
  }
  // configuração antiga
  const cfgAnt = (dados.config||[])[0];
  if(cfgAnt){
    CFG = {...CFG, empresa:cfgAnt.empresa||'JeV Empreendimentos', cnpj:cfgAnt.cnpj, endereco:cfgAnt.endereco,
           cidade:cfgAnt.cidade, tel:cfgAnt.tel, email:cfgAnt.email, respTec:cfgAnt.respTec,
           crea:cfgAnt.crea, logo:cfgAnt.logo};
    await cfgSalvar();
  }
  toast('Dados do sistema antigo convertidos para a JeV.');
}
async function wipeAll(){
  for(const s of STORES){ const at = await dbGetAll(s); for(const it of at) await dbDel(s,it.id); }
  OBRA = null; CFG = {}; FIN = [];
  await seedBase(); await carregarConfig();
  closeModal('mk-bkp'); toast('Todos os dados foram apagados.','aw'); go('hub');
}

async function seedBase(){
  const ins = await dbGetAll('insumos');
  const existentes = new Set(ins.map(i=>i.cod));
  for(const i of INSUMOS_PADRAO) if(!existentes.has(i.cod)) await dbAdd('insumos',i);
  const cfg = await dbGetAll('config');
  if(!cfg.length){ const id = await dbAdd('config',{empresa:'JeV Empreendimentos'}); CFG = {id, empresa:'JeV Empreendimentos'}; }
}

/* ---------------- Dados de exemplo ---------------- */
async function seedDemo(){
  confirmar('Carregar dados de exemplo',
    `Serão criados dados fictícios em <b>todos os negócios</b> — contas, despesas fixas, duas obras,
     imóveis alugados, veículos, ciclos da chácara, produtos, infoprodutos e canais de vídeo —
     para você experimentar o sistema. Seus dados atuais são mantidos.`,
    async()=>{
      await seedBase();
      const d = n=>{ const x = new Date(); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
      const m = n=> addMeses(mesAtual()+'-01',n).slice(0,7);

      // ---- contas
      const c1 = await dbAdd('contas',{nome:'Banco — conta principal',tipo:'Conta corrente',banco:'Banco do Brasil',saldoInicial:42000});
      const c2 = await dbAdd('contas',{nome:'Dinheiro em caixa',tipo:'Caixa em dinheiro',saldoInicial:3500});
      CFG.contaPadrao = c1; CFG.empresa = CFG.empresa||'JeV Empreendimentos';
      CFG.cidade = CFG.cidade||'Campo Grande/MS'; CFG.respTec = CFG.respTec||'Eng. responsável JeV';
      await cfgSalvar();

      // ---- pessoas
      const pessoas = [
        {nome:'Marcelo Silva',papeis:['Cliente'],tel:'(67) 99900-1122',cidade:'Campo Grande/MS'},
        {nome:'Ana Paula Moreira',papeis:['Cliente','Inquilino'],tel:'(67) 99900-3344',cidade:'Campo Grande/MS'},
        {nome:'Depósito Center Materiais',papeis:['Fornecedor'],ramo:'Material de construção',tel:'(67) 3321-4400'},
        {nome:'Concreteira Forte Ltda',papeis:['Fornecedor'],ramo:'Concreteira',tel:'(67) 3345-1200'},
        {nome:'Roberto Nunes',papeis:['Inquilino'],tel:'(67) 99811-2233'},
        {nome:'Transportes Aguiar',papeis:['Locatário de veículo'],tel:'(67) 99755-8899'},
        {nome:'Antônio Carlos Reis',papeis:['Funcionário'],ramo:'Mestre de obras',tel:'(67) 99911-0055'}
      ];
      for(const p of pessoas) await dbAdd('pessoas',p);

      // ---- equipe de obra
      const equipe = [
        {nome:'João Batista Souza',funcao:'Pedreiro',vinculo:'Diarista',valor:220,und:'dia',ativo:true},
        {nome:'Pedro Henrique Alves',funcao:'Servente',vinculo:'Diarista',valor:140,und:'dia',ativo:true},
        {nome:'Antônio Carlos Reis',funcao:'Mestre de obras',vinculo:'CLT',valor:5200,und:'mês',ativo:true},
        {nome:'Elias Ferreira',funcao:'Eletricista',vinculo:'Autônomo',valor:280,und:'dia',ativo:true}
      ];
      for(const e of equipe) await dbAdd('equipe',e);

      // ---- despesas fixas
      const recs = [
        {desc:'Energia elétrica — chácara',valor:640,tipo:'despesa',un:'chacara',cat:'Energia elétrica',periodo:1,dia:12},
        {desc:'Internet e telefone',valor:220,tipo:'despesa',un:'geral',cat:'Internet e telefone',periodo:1,dia:8},
        {desc:'Contador',valor:680,tipo:'despesa',un:'geral',cat:'Contabilidade e serviços',periodo:1,dia:10},
        {desc:'Salário do mestre de obras',valor:5200,tipo:'despesa',un:'obras',cat:'Salários e encargos',periodo:1,dia:5},
        {desc:'Tráfego pago — infoprodutos',valor:900,tipo:'despesa',un:'info',cat:'Marketing e tráfego pago',periodo:1,dia:15}
      ];
      for(const r of recs) await dbAdd('recorrencias',{...r, contaId:c1, inicio:m(-5)+'-01', ativo:true});
      await recGerar(false);
      // liquida os meses passados
      await finLoad();
      for(const l of FIN.filter(x=>x.recorrenteId && String(x.data).slice(0,7) < mesAtual())){
        await dbPut('financeiro',{...l, status:'Pago', dtPag:l.venc, contaId:c1});
      }

      // ---- obras
      const demoObras = [
        {nome:'Residência Silva — Jardim Itália',tipo:'Casa Residencial',cliente:'Marcelo Silva',area:186,
         ini:d(-150),fim:d(90),vc:820000,av:[100,100,100,100,95,80,60,55,20,10,0,0,0,0]},
        {nome:'Chácara Recanto Verde — Sede',tipo:'Chácara / Sítio',cliente:'Ana Paula Moreira',area:240,
         ini:d(-70),fim:d(200),vc:1150000,av:[100,100,90,55,20,0,0,0,0,0,0,0,0,0]}
      ];
      let seq = (await dbGetAll('obras')).length;
      for(const dm of demoObras){
        seq++;
        const obraId = await dbAdd('obras',{cod:'OB-'+String(seq).padStart(3,'0'), nome:dm.nome, tipo:dm.tipo,
          status:'Em andamento', cliente:dm.cliente, telefone:'(67) 99900-0000',
          endereco:'Endereço da obra', cidade:'Campo Grande/MS', area:dm.area, terreno:dm.area*2,
          pavimentos:1, unidades:1, dtInicio:dm.ini, dtPrevFim:dm.fim, valorContrato:dm.vc,
          respTec:'Eng. responsável JeV', art:'ART '+(1000000+seq), obs:'Obra de demonstração.'});
        await gerarCronograma(obraId,dm.ini,dm.fim);
        await gerarOrcamento(obraId,dm.area);
        const ets = (await dbByObra('etapas',obraId)).sort((a,b)=>a.ordem-b.ordem);
        const orc = await dbByObra('orcamento',obraId);
        for(let i=0;i<ets.length;i++){
          const av = dm.av[i]||0;
          await dbPut('etapas',{...ets[i], avanco:av, status:av>=100?'Concluída':av>0?'Em execução':'Não iniciada'});
          if(!av) continue;
          const prev = orc.filter(x=>x.etapa===ets[i].nome).reduce((s,x)=>s+num(x.qtd)*num(x.vunit),0);
          const valor = prev*av/100*(0.93+(i%4)*0.06);
          if(valor<=0) continue;
          const dtd = ets[i].dtFim < hoje() ? ets[i].dtFim : hoje();
          await dbAdd('financeiro',{tipo:'despesa', un:'obras', refTipo:'obra', refId:obraId,
            refNome:'OB-'+String(seq).padStart(3,'0')+' — '+dm.nome, desc:'Custos da etapa — '+ets[i].nome,
            etapa:ets[i].nome, cat: i<4?'Material de construção':i<9?'Mão de obra e empreiteiros':'Material de construção',
            valor:+valor.toFixed(2), data:dtd, venc:dtd, dtPag:dtd, status:'Pago',
            pessoa:'Depósito Center Materiais', contaId:c1, auto:true, origem:'Dados de exemplo'});
        }
        // uma medição paga
        const pesoTot = ets.reduce((s,e)=>s+num(e.peso),0)||100;
        const itens = ets.map((e,i)=>({etapa:e.nome, peso:num(e.peso), ant:0, acum:(dm.av[i]||0)*0.6,
          delta:(dm.av[i]||0)*0.6, valor: dm.vc*(num(e.peso)/pesoTot)*((dm.av[i]||0)*0.6)/100}));
        const bruto = itens.reduce((s,i)=>s+i.valor,0);
        if(bruto>0){
          const medId = await dbAdd('medicoes',{obraId, num:1, dtIni:dm.ini, dtFim:d(-30), venc:d(-15),
            status:'Paga', retencao:0, bruto, valor:bruto,
            avancoAcum: itens.reduce((s,i)=>s+i.peso*i.acum,0)/pesoTot,
            avancoDelta: itens.reduce((s,i)=>s+i.peso*i.delta,0)/pesoTot, itens, obs:'Medição de exemplo.'});
          await dbAdd('financeiro',{tipo:'receita', un:'obras', refTipo:'obra', refId:obraId,
            refNome:dm.nome, desc:'Medição nº 01 — '+dm.nome, valor:bruto, cat:'Medição de obra',
            data:d(-30), venc:d(-15), status:'Pago', dtPag:d(-15), pessoa:dm.cliente,
            contaId:c1, medicaoId:medId, auto:true, origem:'Dados de exemplo'});
        }
        // diário
        for(let k=1;k<=3;k++){
          await dbAdd('rdo',{obraId, data:d(-k*4), climaM:'Bom', climaT:k===2?'Chuvoso':'Nublado',
            efetivoTotal:4+(k%3), etapas:[ets[4].nome],
            atividades:'Execução dos serviços previstos para a etapa em andamento.',
            materiais: k%2?'Recebimento de 40 sacos de cimento':'', visitas:'', ocorrencias:'',
            responsavel:'Antônio Carlos Reis', paralisada:false, fotos:[]});
        }
      }

      // ---- imóveis e contratos
      const imv = [
        {cod:'IM-001',nome:'Casa 1 — Rua das Flores',tipo:'Casa',endereco:'Rua das Flores, 120',cidade:'Campo Grande/MS',
         area:90,quartos:3,valorMercado:380000,aluguelBase:1800,status:'Alugado',iptu:1200,inq:'Roberto Nunes',aluguel:1800},
        {cod:'IM-002',nome:'Kitnet 2 — Centro',tipo:'Kitnet',endereco:'Rua 14 de Julho, 880 — fundos',cidade:'Campo Grande/MS',
         area:32,quartos:1,valorMercado:145000,aluguelBase:900,status:'Alugado',iptu:480,inq:'Ana Paula Moreira',aluguel:950},
        {cod:'IM-003',nome:'Sala comercial — Av. Afonso Pena',tipo:'Sala comercial',endereco:'Av. Afonso Pena, 2100 sl 5',
         cidade:'Campo Grande/MS',area:48,quartos:0,valorMercado:290000,aluguelBase:2200,status:'Vago',iptu:1600,inq:null}
      ];
      for(const i of imv){
        const iid = await dbAdd('imoveis',{...i, matricula:'', inscricao:'', uc:'', obs:''});
        if(i.inq){
          await dbAdd('contratos',{tipo:'imovel', refId:iid, pessoa:i.inq, tel:'(67) 99800-0000', doc:'',
            inicio:d(-400), fim:d(330), status:'Ativo', valor:i.aluguel, periodo:1, diaVenc:10,
            caucao:i.aluguel*2, indice:'IGP-M', percReajuste:0, proxReajuste:addMeses(hoje(),4).slice(0,7)+'-01', obs:''});
        }
      }
      // aluguéis dos últimos 5 meses
      const ctsI = (await dbGetAll('contratos')).filter(c=>c.tipo==='imovel');
      const imoveisAll = await dbGetAll('imoveis');
      for(let k=-4;k<=0;k++){
        const mk = m(k);
        for(const c of ctsI){
          const im = imoveisAll.find(x=>Number(x.id)===Number(c.refId))||{};
          await dbAdd('financeiro',{tipo:'receita', un:'imoveis', refTipo:'imovel', refId:c.refId,
            refNome:im.nome||'', desc:`Aluguel ${dmes(mk+'-01')} — ${im.nome||''}`, valor:num(c.valor),
            cat:'Aluguel de imóvel', data:mk+'-01', venc:mk+'-10',
            status: k<0?'Pago':'Pendente', dtPag: k<0?mk+'-10':'', pessoa:c.pessoa,
            contratoId:c.id, contaId:c1, auto:true, origem:'Dados de exemplo'});
        }
      }
      await dbAdd('manutencoes',{refTipo:'imovel', refId:1, data:d(-45), status:'Concluída',
        desc:'Pintura interna e troca de torneiras', prestador:'Pintor autônomo', valor:2400, obs:''});
      await dbAdd('financeiro',{tipo:'despesa', un:'imoveis', refTipo:'imovel', refId:1, refNome:'Casa 1 — Rua das Flores',
        desc:'Manutenção — Pintura interna e troca de torneiras', valor:2400, cat:'Manutenção e reparos',
        data:d(-45), venc:d(-45), dtPag:d(-45), status:'Pago', contaId:c1, auto:true, origem:'Dados de exemplo'});

      // ---- veículos
      const vei = [
        {placa:'ABC-1D23',modelo:'Toyota Hilux SRV 4x4',tipo:'Caminhonete',ano:'2021/2022',cor:'Prata',
         combustivel:'Diesel',status:'Locado',km:78000,diaria:420,valorCompra:210000,valorFipe:230000,
         ipva:5200,seguro:4800,proxRevisao:d(10),vencSeguro:d(120),vencLicenc:d(200),loc:'Transportes Aguiar',valorLoc:4800},
        {placa:'XYZ-4E56',modelo:'Fiat Strada Freedom',tipo:'Caminhonete',ano:'2020/2021',cor:'Branco',
         combustivel:'Flex',status:'Disponível',km:112000,diaria:220,valorCompra:78000,valorFipe:82000,
         ipva:1900,seguro:2600,proxRevisao:d(60),vencSeguro:d(45),vencLicenc:d(150),loc:null},
        {placa:'JEV-7G89',modelo:'Massey Ferguson 4275',tipo:'Trator',ano:'2018',cor:'Vermelho',
         combustivel:'Diesel',status:'Uso próprio',km:4200,diaria:0,valorCompra:180000,valorFipe:165000,
         ipva:0,seguro:3200,proxRevisao:d(35),vencSeguro:d(210),vencLicenc:'',loc:null}
      ];
      for(const v of vei){
        const vid = await dbAdd('veiculos',{...v, renavam:'', chassi:'', obs:''});
        if(v.loc){
          const cid = await dbAdd('contratos',{tipo:'veiculo', refId:vid, pessoa:v.loc, tel:'(67) 99755-8899',
            inicio:d(-180), fim:d(180), status:'Ativo', valor:v.valorLoc, periodo:1, diaVenc:5,
            caucao:0, indice:'Sem reajuste', obs:''});
          for(let k=-4;k<=0;k++){
            const mk = m(k);
            await dbAdd('financeiro',{tipo:'receita', un:'veiculos', refTipo:'veiculo', refId:vid,
              refNome:`${v.modelo} — ${v.placa}`, desc:`Locação ${dmes(mk+'-01')} — ${v.placa}`,
              valor:v.valorLoc, cat:'Locação de veículo', data:mk+'-01', venc:mk+'-05',
              status:k<0?'Pago':'Pendente', dtPag:k<0?mk+'-05':'', pessoa:v.loc, contratoId:cid,
              contaId:c1, auto:true, origem:'Dados de exemplo'});
          }
        }
        await dbAdd('financeiro',{tipo:'despesa', un:'veiculos', refTipo:'veiculo', refId:vid,
          refNome:`${v.modelo} — ${v.placa}`, desc:`Combustível e manutenção — ${v.placa}`,
          valor:900+Math.round(num(v.km)/200), cat:'Combustível', data:d(-20), venc:d(-20), dtPag:d(-20),
          status:'Pago', contaId:c1, auto:true, origem:'Dados de exemplo'});
      }

      // ---- chácara
      const l1 = await dbAdd('lotes',{nome:'Talhão 1 — fundo',tipo:'Talhão de lavoura',area:4,und:'ha',cultura:'Milho',obs:''});
      const l2 = await dbAdd('lotes',{nome:'Pomar da frente',tipo:'Pomar',area:1.5,und:'ha',cultura:'Banana',obs:''});
      const l3 = await dbAdd('lotes',{nome:'Curral e pastagem',tipo:'Pastagem',area:12,und:'ha',cultura:'Bovinos',obs:''});
      const cic = [
        {nome:'Milho safrinha 2026',loteId:l1,cultura:'Milho',area:4,dtIni:d(-140),dtPrev:d(-20),dtColheita:d(-18),
         prodPrev:240,prodReal:262,und:'saca',status:'Vendido',custo:16800,preco:78},
        {nome:'Banana — ciclo contínuo',loteId:l2,cultura:'Banana',area:1.5,dtIni:d(-300),dtPrev:d(60),
         prodPrev:9000,prodReal:0,und:'kg',status:'Em andamento',custo:4200,preco:2.4},
        {nome:'Engorda de bovinos — lote 12',loteId:l3,cultura:'Bovinos',area:12,dtIni:d(-210),dtPrev:d(30),
         prodPrev:22,prodReal:0,und:'cabeça',status:'Em andamento',custo:31000,preco:3900}
      ];
      for(const c of cic){
        const cid = await dbAdd('ciclos',{nome:c.nome,loteId:c.loteId,cultura:c.cultura,area:c.area,
          dtIni:c.dtIni,dtPrev:c.dtPrev,dtColheita:c.dtColheita||'',prodPrev:c.prodPrev,prodReal:c.prodReal,
          und:c.und,status:c.status,custoPrev:c.custo,precoPrev:c.preco,obs:''});
        await dbAdd('financeiro',{tipo:'despesa', un:'chacara', refTipo:'ciclo', refId:cid, refNome:c.nome,
          desc:'Insumos e custeio — '+c.nome, valor:c.custo, cat: c.cultura==='Bovinos'?'Ração e veterinário':'Insumos agrícolas',
          data:c.dtIni, venc:c.dtIni, dtPag:c.dtIni, status:'Pago', contaId:c1, auto:true, origem:'Dados de exemplo'});
        if(c.status==='Vendido'){
          await dbAdd('financeiro',{tipo:'receita', un:'chacara', refTipo:'ciclo', refId:cid, refNome:c.nome,
            desc:`Venda da produção — ${c.nome} (${c.prodReal} ${c.und})`, valor:c.prodReal*c.preco,
            cat:'Venda da produção', data:c.dtColheita, venc:c.dtColheita, dtPag:c.dtColheita,
            status:'Pago', pessoa:'Cerealista local', contaId:c1, auto:true, origem:'Dados de exemplo'});
        }
      }

      // ---- produtos e infoprodutos
      const prods = [
        {nome:'Mel silvestre 500 g',tipo:'Produto da chácara',cat:'Alimentos',preco:38,custo:14,estoque:120,estoqueMin:20,und:'un',plataforma:'Venda direta',un:'produtos',taxaPerc:0},
        {nome:'Banana caturra — caixa 20 kg',tipo:'Produto da chácara',cat:'Alimentos',preco:65,custo:28,estoque:35,estoqueMin:10,und:'caixa',plataforma:'Feira / presencial',un:'produtos',taxaPerc:0},
        {nome:'Ovos caipira — dúzia',tipo:'Produto da chácara',cat:'Alimentos',preco:18,custo:7,estoque:60,estoqueMin:24,und:'dúzia',plataforma:'WhatsApp',un:'produtos',taxaPerc:0},
        {nome:'Curso: Gestão de Obras na Prática',tipo:'Infoproduto',cat:'Curso online',preco:497,custo:0,plataforma:'Hotmart',un:'info',taxaPerc:9.9},
        {nome:'E-book: Planilha de Orçamento de Obra',tipo:'Infoproduto',cat:'Planilha / template',preco:97,custo:0,plataforma:'Kiwify',un:'info',taxaPerc:8.5},
        {nome:'Mentoria individual — 1 h',tipo:'Infoproduto',cat:'Mentoria',preco:350,custo:0,plataforma:'Site próprio',un:'info',taxaPerc:5}
      ];
      const pIds = [];
      for(const p of prods) pIds.push(await dbAdd('produtos',{...p, ativo:true, sku:'', link:'', obs:''}));
      const produtosAll = await dbGetAll('produtos');
      for(let k=-3;k<=0;k++){
        const mk = m(k);
        for(let j=0;j<produtosAll.length;j++){
          const p = produtosAll[j];
          const q = p.un==='info' ? (1+((j+Math.abs(k))%4)) : (3+((j*2+Math.abs(k))%9));
          const total = q*num(p.preco);
          const taxa = total*num(p.taxaPerc)/100;
          const custo = num(p.custo)*q;
          const data = mk+'-'+String(8+j).padStart(2,'0');
          const vid = await dbAdd('vendas',{un:p.un, produtoId:p.id, produto:p.nome, data, qtd:q,
            preco:num(p.preco), desconto:0, total, taxaPerc:num(p.taxaPerc), taxa, custo,
            cliente:'Cliente '+(j+1), plataforma:p.plataforma, status:'Paga', obs:''});
          await dbAdd('financeiro',{tipo:'receita', un:p.un, refTipo:'produto', refId:p.id, refNome:p.nome,
            desc:`Venda — ${p.nome} (${q} un)`, valor:total,
            cat: p.un==='info'?'Venda de infoproduto':'Venda de produtos', data, venc:data, dtPag:data,
            status:'Pago', pessoa:'Cliente '+(j+1), contaId:c1, vendaId:vid, auto:true, origem:'Dados de exemplo'});
          if(taxa>0) await dbAdd('financeiro',{tipo:'despesa', un:p.un, refTipo:'produto', refId:p.id, refNome:p.nome,
            desc:`Taxa ${p.plataforma} — ${p.nome}`, valor:taxa, cat:'Comissões pagas', data, venc:data,
            dtPag:data, status:'Pago', contaId:c1, vendaId:vid, auto:true, origem:'Dados de exemplo'});
          if(custo>0) await dbAdd('financeiro',{tipo:'despesa', un:p.un, refTipo:'produto', refId:p.id, refNome:p.nome,
            desc:`Custo do produto vendido — ${p.nome}`, valor:custo, cat:'Custo do produto vendido', data,
            venc:data, dtPag:data, status:'Pago', contaId:c1, vendaId:vid, auto:true, origem:'Dados de exemplo'});
        }
      }

      // ---- canais de vídeo
      const canais = [
        {nome:'JeV Construção na Prática',plataforma:'YouTube',nicho:'Obras e reformas',inscritos:18400,monetizado:true},
        {nome:'Vida na Chácara JeV',plataforma:'Instagram',nicho:'Vida no campo',inscritos:9200,monetizado:false},
        {nome:'JeV Cortes',plataforma:'TikTok',nicho:'Cortes e dicas rápidas',inscritos:24700,monetizado:true}
      ];
      const titulos = ['Como fazer o orçamento da sua casa','5 erros que encarecem a obra','Tour pela chácara',
        'Quanto custa levantar uma parede','Colheita do milho passo a passo','Montamos o telhado em 1 dia',
        'O que ninguém conta sobre alugar imóvel','Rotina de um mestre de obras'];
      for(let i=0;i<canais.length;i++){
        const cid = await dbAdd('canais',{...canais[i], dtInicio:d(-700), url:'', obs:''});
        for(let k=0;k<4;k++){
          const idx = (i*3+k)%titulos.length;
          const views = 4200+((i+1)*(k+2)*1900);
          await dbAdd('videos',{canalId:cid, titulo:titulos[idx], status: k===3?'Editado':'Publicado',
            dtPrev:d(-60+k*14), dtPub: k===3?'':d(-60+k*14), duracao:8+k*2, views: k===3?0:views,
            likes: k===3?0:Math.round(views*0.045), comentarios: k===3?0:Math.round(views*0.006),
            inscritosGanhos: k===3?0:Math.round(views*0.012),
            receita: (canais[i].monetizado && k<3)? +(views/1000*7.4).toFixed(2) : 0,
            custo:180, tema:canais[i].nicho, url:'', obs:''});
        }
        if(canais[i].monetizado){
          for(let k=-3;k<=-1;k++){
            const mk = m(k);
            await dbAdd('financeiro',{tipo:'receita', un:'midia', refTipo:'canal', refId:cid,
              refNome:canais[i].nome+' ('+canais[i].plataforma+')',
              desc:`Monetização da plataforma — ${canais[i].nome} (${dmes(mk+'-01')})`,
              valor: 800+i*430+Math.abs(k)*120, cat:'Monetização de vídeos', data:mk+'-01', venc:mk+'-15',
              status:'Pago', dtPag:mk+'-15', contaId:c1, auto:true, origem:'Dados de exemplo'});
          }
        }
        await dbAdd('financeiro',{tipo:'despesa', un:'midia', refTipo:'canal', refId:cid,
          refNome:canais[i].nome, desc:'Edição de vídeos — '+canais[i].nome, valor:600,
          cat:'Marketing e tráfego pago', data:d(-25), venc:d(-25), dtPag:d(-25), status:'Pago',
          contaId:c1, auto:true, origem:'Dados de exemplo'});
      }

      await finLoad();
      toast('Dados de exemplo carregados em todos os negócios.');
      go('hub');
    });
}

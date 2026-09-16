/* =========================================================================
   Importar obra de um arquivo (.jevobra)
   -------------------------------------------------------------------------
   POR QUE ISTO EXISTE, E POR QUE NÃO É O BACKUP:
   o "Restaurar backup" de Configurações APAGA TUDO antes de gravar. Serve
   para trocar de máquina, não para trazer uma obra nova. Quem usasse o
   backup para adicionar uma obra perderia o resto do sistema.

   Este importador é ADITIVO: ele só cria. Nunca apaga, nunca sobrescreve
   uma obra que já existe. Se o código da obra já estiver cadastrado, ele
   para e avisa, em vez de duplicar em silêncio.

   Um arquivo .jevobra é um JSON assim:
     { _tipo:'JEV_OBRA', _versao:1,
       obra:{...}, etapas:[...], orcamento:[...], projetos:[...] }
   As etapas, os itens de orçamento e os projetos NÃO trazem obraId: ele é
   carimbado na hora, com o id que a obra receber aqui dentro.

   Em "projetos" vai o registro de pranchas e cadernos. Se o item vier sem
   o campo "arquivo", ele entra como REFERÊNCIA — o sistema mostra a prancha
   na lista e diz de onde ela veio, sem carregar o PDF para dentro do banco.
   É de propósito: um loteamento tem centenas de megabytes de prancha, e o
   IndexedDB do navegador não é lugar para isso.
   ========================================================================= */

const OBRA_IMP_TIPO = 'JEV_OBRA';
let OBRA_IMP = null;          // o que foi lido do arquivo, à espera de confirmação

/* ---------- leitura e conferência do arquivo ---------- */

/* Devolve {ok:true, dados} ou {ok:false, motivo}. Nada é gravado aqui. */
function obraImpConferir(txt){
  let d;
  try{ d = JSON.parse(txt); }
  catch(e){ return {ok:false, motivo:'O arquivo não é um JSON válido.'}; }

  if(!d || d._tipo !== OBRA_IMP_TIPO)
    return {ok:false, motivo:'Este arquivo não é uma obra da JeV. Um arquivo de obra começa com _tipo:"JEV_OBRA".'};
  if(!d.obra || !d.obra.nome)
    return {ok:false, motivo:'O arquivo não traz a obra, ou a obra está sem nome.'};

  const etapas = Array.isArray(d.etapas) ? d.etapas : [];
  const orc    = Array.isArray(d.orcamento) ? d.orcamento : [];
  const projs  = Array.isArray(d.projetos) ? d.projetos : [];

  /* datas coerentes — o formulário de obra exige isso, o importador também */
  if(d.obra.dtInicio && d.obra.dtPrevFim && d.obra.dtPrevFim <= d.obra.dtInicio)
    return {ok:false, motivo:'A data de término da obra não é posterior à de início.'};

  return {ok:true, dados:{obra:d.obra, etapas, orcamento:orc, projetos:projs}};
}

/* soma do orçamento que vem no arquivo */
function obraImpTotal(orc){
  return (orc||[]).reduce((s,i)=>s + num(i.qtd)*num(i.vunit), 0);
}

/* ---------- a tela ---------- */

async function obraImportarArquivo(inp){
  const f = inp.files && inp.files[0];
  inp.value = '';
  if(!f) return;

  const r = obraImpConferir(await f.text());
  if(!r.ok){ toast(r.motivo,'ae'); return; }

  /* já existe uma obra com este código? */
  const jaTem = (await dbGetAll('obras')).find(o =>
    o.cod && r.dados.obra.cod && String(o.cod).trim() === String(r.dados.obra.cod).trim());

  OBRA_IMP = r.dados;
  const o = r.dados.obra, tot = obraImpTotal(r.dados.orcamento);

  const aviso = jaTem
    ? `<div class="al ae"><i class="ti ti-alert-circle"></i><div>Já existe a obra
        <b>${esc(jaTem.cod)} — ${esc(jaTem.nome)}</b> com este mesmo código.
        Importar de novo criaria uma segunda obra igual. Troque o código no arquivo,
        ou exclua a obra antiga antes.</div></div>`
    : `<div class="al ag"><i class="ti ti-circle-check"></i><div>Nada do que já está
        no sistema será tocado. A importação <b>só adiciona</b>.</div></div>`;

  document.getElementById('oimp-corpo').innerHTML = `
    ${aviso}
    <div class="pinf" style="margin-top:12px">
      ${[['Obra', `${o.cod?o.cod+' — ':''}${o.nome}`],
         ['Tipo', o.tipo||'—'],
         ['Cliente', o.cliente||'—'],
         ['Endereço', o.endereco||'—'],
         ['Cidade', o.cidade||'—'],
         ['Responsável técnico', o.respTec||'—'],
         ['Área', o.area?`${qtd(o.area,2)} m²`:'—'],
         ['Unidades', o.unidades||'—'],
         ['Prazo', (o.dtInicio&&o.dtPrevFim)?`${dbr(o.dtInicio)} a ${dbr(o.dtPrevFim)}`:'—']]
        .map(([k,v])=>`<div><span>${k}:</span> <b>${esc(String(v))}</b></div>`).join('')}
    </div>
    <div class="kg" style="margin-top:14px">
      <div class="kc bl"><div class="lb"><i class="ti ti-calendar-stats"></i>Etapas</div>
        <div class="vl">${OBRA_IMP.etapas.length}</div><div class="sb">vão para o cronograma</div></div>
      <div class="kc gn"><div class="lb"><i class="ti ti-calculator"></i>Itens de orçamento</div>
        <div class="vl">${OBRA_IMP.orcamento.length}</div><div class="sb">${moeda(tot)}</div></div>
      <div class="kc pu"><div class="lb"><i class="ti ti-file-text"></i>Projetos</div>
        <div class="vl">${OBRA_IMP.projetos.length}</div><div class="sb">pranchas e cadernos registrados</div></div>
    </div>`;

  document.getElementById('oimp-ok').disabled = !!jaTem;
  openModal('mk-oimp');
}

/* ---------- a gravação ---------- */

async function obraImpGravar(){
  if(!OBRA_IMP){ closeModal('mk-oimp'); return; }
  const {obra, etapas, orcamento, projetos} = OBRA_IMP;

  /* a obra primeiro: é dela que sai o id que carimba o resto */
  const dados = {...obra};
  delete dados.id;
  const obraId = await dbAdd('obras', dados);

  let nE = 0, nO = 0;
  for(const e of etapas){
    const et = {...e}; delete et.id;
    await dbAdd('etapas', {...et, obraId,
      avanco: num(et.avanco), status: et.status || 'Não iniciada', obs: et.obs || ''});
    nE++;
  }
  for(const i of orcamento){
    const oi = {...i}; delete oi.id;
    await dbAdd('orcamento', {...oi, obraId,
      qtd: num(oi.qtd), vunit: num(oi.vunit),
      und: oi.und || 'un', cod: oi.cod || '—',
      origem: oi.origem || 'Importado de arquivo'});
    nO++;
  }

  let nP = 0;
  for(const p of (projetos || [])){
    const pj = {...p}; delete pj.id;
    await dbAdd('projetos', {...pj, obraId,
      disciplina: pj.disciplina || 'Outro',
      revisao: pj.revisao || '00',
      data: pj.data || hoje(),
      status: pj.status || 'Aprovado',
      /* sem arquivo o registro entra como referência, e a tela já sabe mostrar isso */
      arquivo: pj.arquivo || null, ext: pj.ext || '', tam: num(pj.tam), nomeArq: pj.nomeArq || ''});
    nP++;
  }

  OBRA_IMP = null;
  OBRA = obraId;
  closeModal('mk-oimp');
  toast(`Obra importada: ${nE} etapa(s), ${nO} item(ns) de orçamento e ${nP} projeto(s).`);
  await refreshObraSelect();
  await obraDetalhe(obraId);
}

/* ---------- exportar uma obra, para levar para outra máquina ---------- */

async function obraExportar(id){
  const o = await dbGet('obras', id);
  if(!o){ toast('Obra não encontrada.','ae'); return; }
  const etapas = (await dbByObra('etapas', id)).map(e=>{
    const c = {...e}; delete c.id; delete c.obraId; delete c._gid; delete c._ts; delete c._user; return c;
  });
  const orcamento = (await dbByObra('orcamento', id)).map(i=>{
    const c = {...i}; delete c.id; delete c.obraId; delete c._gid; delete c._ts; delete c._user; return c;
  });
  const projetos = (await dbByObra('projetos', id)).map(p=>{
    const c = {...p}; delete c.id; delete c.obraId; delete c._gid; delete c._ts; delete c._user;
    /* o PDF embutido NÃO vai junto: o arquivo de obra tem de continuar leve
       o bastante para mandar por WhatsApp. Vai o registro, não o anexo. */
    delete c.arquivo; delete c.tam; delete c.nomeArq; delete c.ext;
    return c;
  });
  const limpa = {...o};
  delete limpa.id; delete limpa._gid; delete limpa._ts; delete limpa._user;

  const dump = {_tipo:OBRA_IMP_TIPO, _versao:1, _data:new Date().toISOString(),
                obra:limpa, etapas, orcamento, projetos};
  const base = String(o.cod || o.nome).replace(/[^\w\-]+/g,'_').slice(0,40);
  baixarArquivo(JSON.stringify(dump, null, 1), `obra_${base}.jevobra`, 'application/json');
  toast('Obra exportada. O arquivo só adiciona quando for importado — nunca apaga nada.');
}

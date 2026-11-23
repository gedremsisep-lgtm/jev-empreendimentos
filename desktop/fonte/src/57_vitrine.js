/* =========================================================================
   VITRINE DE AFILIADOS — Produtos → Vitrine de afiliados

   Cada item de afiliado (a ficha do store 'programas', a mesma do Canal de
   Afiliado) com: onde é vendido, o link, onde está sendo divulgado, cliques,
   vendas e comissão.

   "Onde está sendo divulgado" junta duas fontes:
     - automática: as publicações marcadas na Central (vídeo cujo roteiro leva
       o produto), por rede;
     - manual: os canais que você marcar (grupo de WhatsApp, Telegram etc.).
   Cliques, vendas e comissão vêm do relatório CSV que a Shopee e o Mercado
   Livre deixam baixar (Importar relatório) ou são digitados à mão.
   ========================================================================= */
const VIT_CANAIS = [
  ['WhatsApp','ti-brand-whatsapp','#25D366'], ['YouTube','ti-brand-youtube','#C0392B'], ['YouTube Shorts','ti-brand-youtube','#E5484D'],
  ['TikTok','ti-brand-tiktok','#111827'], ['Instagram','ti-brand-instagram','#C13584'], ['Facebook','ti-brand-facebook','#1877F2'],
  ['Kwai','ti-video','#FF7A00'], ['Pinterest','ti-brand-pinterest','#E60023'], ['Telegram','ti-send','#229ED9'], ['X (Twitter)','ti-brand-x','#111111'],
];
let VIT_IMPORT = null;    /* prévia do relatório importado */

function vitNorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
function vitCanal(nome){ return VIT_CANAIS.find(c => c[0] === nome) || [nome,'ti-share','#59636A']; }

/* publicações marcadas na Central, por produto (via o roteiro que leva o produto) */
async function vitPublicacoes(){
  const pubs = await dbGetAll('publicacoes').catch(()=>[]);
  const rots = await dbGetAll('roteiros').catch(()=>[]);
  const rotPorId = {}; rots.forEach(r => rotPorId[r.id] = r);
  const porProd = {};
  pubs.forEach(p => {
    const r = rotPorId[p.roteiroId]; if(!r) return;
    const nomeRede = (typeof plat === 'function' && plat(p.plataforma)) ? plat(p.plataforma).nome : String(p.plataforma||'');
    (r.produtos || []).forEach(x => {
      const k = vitNorm(x.nome || x.produto || x.n || '');
      if(!k) return;
      (porProd[k] = porProd[k] || {});
      porProd[k][nomeRede] = (porProd[k][nomeRede] || 0) + 1;
    });
  });
  return porProd;
}

function vitNumeros(p){
  const r = p.rel || {};
  return { cliques: num(r.cliques != null ? r.cliques : p.cliques), vendas: num(r.vendas != null ? r.vendas : p.vendas),
           ganho: num(r.comissao != null ? r.comissao : p.ganhoTotal) };
}

async function prodTabVitrine(un){
  const body = document.getElementById('prd-body-'+un); if(!body) return;
  const progs = (await dbGetAll('programas')).filter(p => p.produto).sort((a,b) => vitNumeros(b).ganho - vitNumeros(a).ganho || String(a.produto).localeCompare(String(b.produto)));
  const pubs = await vitPublicacoes();
  const ativos = progs.filter(p => p.ativo !== false);
  const tot = ativos.reduce((s,p) => { const n = vitNumeros(p); s.c += n.cliques; s.v += n.vendas; s.g += n.ganho; return s; }, {c:0, v:0, g:0});

  let h = `<div class="kg" style="margin-bottom:12px">
    <div class="kc br"><div class="lb"><i class="ti ti-link"></i>Itens ativos</div><div class="vl">${ativos.length}</div><div class="sb">${ativos.filter(p=>p.url).length} com link · ${ativos.filter(p=>!p.url).length} sem link</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-eye"></i>Cliques</div><div class="vl">${tot.c.toLocaleString('pt-BR')}</div><div class="sb">do último relatório</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-shopping-cart"></i>Vendas</div><div class="vl">${tot.v.toLocaleString('pt-BR')}</div><div class="sb">${tot.c?((tot.v/tot.c)*100).toFixed(1).replace('.',',')+'% dos cliques':'—'}</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-coin"></i>Comissão</div><div class="vl">${moedaK(tot.g)}</div><div class="sb">soma dos itens</div></div>
  </div>
  <div class="card tw"><div class="hd"><i class="ti ti-building-store"></i>Vitrine de afiliados<span class="sp"></span>
    <button class="btn sm gh" onclick="vitImportar('${un}')"><i class="ti ti-upload"></i>Importar relatório (CSV)</button>
    <button class="btn sm gn" onclick="progForm(null)"><i class="ti ti-plus"></i>Novo item</button></div><div class="bd">`;
  if(!progs.length){
    h += `<div class="empty"><i class="ti ti-link-off"></i><b>Nenhum item de afiliado ainda</b>Clique em "Novo item", ou importe o relatório de comissões da Shopee ou do Mercado Livre.</div>`;
  } else {
    h += `<table><thead><tr><th>Produto</th><th>Vende em</th><th class="c">Link</th><th class="r">Comissão</th><th>Divulgado em</th><th class="r">Cliques</th><th class="r">Vendas</th><th class="r">Ganho</th><th></th></tr></thead><tbody>
      ${progs.map(p => {
        const n = vitNumeros(p);
        const auto = pubs[vitNorm(p.produto)] || {};
        const canais = [...new Set([...(p.canais || []), ...Object.keys(auto)])];
        return `<tr style="${p.ativo===false?'opacity:.55':''}"><td><b>${esc(p.produto)}</b>${p.nicho?`<br><span class="tt">${esc(p.nicho)}</span>`:''}</td>
          <td>${esc(p.plataforma||'—')}</td>
          <td class="c">${p.url?`<a class="ib bl" title="Abrir o link" href="${esc(p.url)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i></a>`:'<span class="st s-wn">sem link</span>'}</td>
          <td class="r n">${p.comissao?String(p.comissao).replace('.',',')+'%':'—'}</td>
          <td>${canais.length ? canais.map(c => { const [nm, ic, cor] = vitCanal(c); const a = auto[c]; return `<span class="chip" style="padding:3px 8px;margin:1px" title="${esc(nm)}${a?` · ${a} publicação(ões) marcadas na Central`:' · marcado à mão'}"><i class="ti ${ic}" style="color:${cor}"></i> ${esc(nm)}${a?` ${a}`:''}</span>`; }).join('') : '<span class="tt">em nenhum canal</span>'}</td>
          <td class="r n">${n.cliques.toLocaleString('pt-BR')}</td><td class="r n">${n.vendas.toLocaleString('pt-BR')}</td>
          <td class="r n"><b style="color:${n.ganho>0?'var(--green)':'var(--text3)'}">${moeda(n.ganho)}</b>${p.rel&&p.rel.em?`<br><span class="tt">relatório ${esc(dbr(p.rel.em))}</span>`:''}</td>
          <td class="r nowrap"><button class="ib" title="Divulgação e números" onclick="vitEditar(${p.id},'${un}')"><i class="ti ti-pencil"></i></button>
            <button class="ib" title="Ficha completa" onclick="progForm(${p.id})"><i class="ti ti-file-text"></i></button></td></tr>`;
      }).join('')}</tbody></table>
      <div class="tt" style="padding:8px 12px">"Divulgado em" junta os canais que você marcou com as publicações marcadas na Central (Mídia → Afiliados). O número ao lado da rede é quantas publicações foram marcadas lá.</div>`;
  }
  h += `</div></div>`;
  body.innerHTML = h;
}

async function vitEditar(id, un){
  const p = await dbGet('programas', id); if(!p) return;
  const n = vitNumeros(p), canais = p.canais || [];
  modal('Divulgação — ' + p.produto, 'ti-building-store',
    `<div class="fg"><label>Link de afiliado</label><input id="vt-url" value="${esc(p.url||'')}" placeholder="https://..."></div>
     <div class="fg"><label>Onde você está divulgando</label><div style="display:flex;flex-wrap:wrap;gap:6px">
      ${VIT_CANAIS.map(([nm, ic, cor], i) => `<label class="chip" style="cursor:pointer;display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="vt-c${i}" ${canais.includes(nm)?'checked':''}><i class="ti ${ic}" style="color:${cor}"></i>${esc(nm)}</label>`).join('')}</div></div>
     <div class="fr3"><div class="fg"><label>Cliques</label><input id="vt-cli" type="number" min="0" value="${n.cliques}"></div>
      <div class="fg"><label>Vendas</label><input id="vt-ven" type="number" min="0" value="${n.vendas}"></div>
      <div class="fg"><label>Comissão recebida (R$)</label><input id="vt-com" type="number" step="0.01" min="0" value="${n.ganho}"></div></div>
     <div class="hint">Os números aqui substituem os do último relatório importado. Para lançar a comissão no Financeiro, use a categoria "Comissão de afiliado": é assim que ela entra na Meta R$ 50 mil.</div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="vitSalvar(${id},'${un}')"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function vitSalvar(id, un){
  const p = await dbGet('programas', id); if(!p) return;
  const canais = VIT_CANAIS.filter((c, i) => document.getElementById('vt-c'+i)?.checked).map(c => c[0]);
  const rel = { ...(p.rel || {}), cliques: num(val('vt-cli')), vendas: num(val('vt-ven')), comissao: num(val('vt-com')), em: (p.rel && p.rel.em) || hoje(), manual: true };
  await dbPut('programas', { ...p, url: val('vt-url'), canais, rel, vendas: rel.vendas, ganhoTotal: rel.comissao });
  closeModal('mk-form'); toast('Vitrine atualizada.'); prodTabVitrine(un);
}

/* ---------------------------------------------------------- relatório CSV */
function vitImportar(un){
  VIT_IMPORT = null;
  modal('Importar relatório de comissões', 'ti-upload',
    `<div class="fg"><label>Arquivo CSV baixado do painel de afiliados</label><input id="vt-arq" type="file" accept=".csv,text/csv" onchange="vitLerArquivo('${un}')"></div>
     <div class="hint">Shopee: Painel de afiliados → Relatório de conversões → Exportar. Mercado Livre: Afiliados → Relatórios → Baixar. O JeV procura as colunas de produto, cliques, pedidos e comissão e junta tudo por produto.</div>
     <div id="vt-prev"></div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" id="vt-apl" disabled onclick="vitAplicar('${un}')"><i class="ti ti-check"></i>Aplicar</button>`, 'lg');
}
function vitCsv(txt){
  txt = String(txt||'').replace(/^﻿/, '');
  const primeira = txt.split(/\r?\n/)[0] || '';
  const sep = (primeira.match(/;/g)||[]).length > (primeira.match(/,/g)||[]).length ? ';' : (primeira.includes('\t') ? '\t' : ',');
  const linhas = []; let campo = '', linha = [], aspas = false;
  for(let i = 0; i < txt.length; i++){
    const c = txt[i];
    if(aspas){ if(c === '"'){ if(txt[i+1] === '"'){ campo += '"'; i++; } else aspas = false; } else campo += c; continue; }
    if(c === '"') aspas = true;
    else if(c === sep){ linha.push(campo); campo = ''; }
    else if(c === '\n'){ linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if(c !== '\r') campo += c;
  }
  if(campo !== '' || linha.length){ linha.push(campo); linhas.push(linha); }
  return linhas.filter(l => l.some(x => String(x).trim() !== ''));
}
function vitNumBR(v){
  let s = String(v||'').replace(/[^\d,.\-]/g,'');
  if(s.includes(',') && s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',', '.');
  else s = s.replace(/,/g,'');
  const n = parseFloat(s); return isFinite(n) ? n : 0;
}
function vitColunas(cab){
  const acha = re => cab.findIndex(h => re.test(vitNorm(h)));
  return {
    produto: acha(/(nome do (item|produto)|item name|produto|product|^item$|titulo)/),
    cliques: acha(/(clique|click)/),
    vendas: acha(/(qtd|quantidade|pedido|venda|order|conversao|conversion)/),
    comissao: acha(/(comissao total|comissao do afiliado|comissao estimada|comissao|commission|ganho|receita)/),
  };
}
async function vitLerArquivo(un){
  const f = document.getElementById('vt-arq')?.files?.[0]; if(!f) return;
  const linhas = vitCsv(await f.text());
  const prev = document.getElementById('vt-prev');
  if(linhas.length < 2){ prev.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i><div>O arquivo não tem linhas de dados.</div></div>`; return; }
  const cab = linhas[0], col = vitColunas(cab);
  if(col.produto < 0 || (col.comissao < 0 && col.vendas < 0 && col.cliques < 0)){
    prev.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i><div>Não reconheci as colunas. Cabeçalho encontrado: ${esc(cab.join(' | '))}</div></div>`; return;
  }
  const agg = {};
  linhas.slice(1).forEach(l => {
    const nome = String(l[col.produto] || '').trim(); if(!nome) return;
    const k = vitNorm(nome); const a = agg[k] = agg[k] || { nome, cliques:0, vendas:0, comissao:0, linhas:0 };
    a.linhas++;
    if(col.cliques >= 0) a.cliques += vitNumBR(l[col.cliques]);
    if(col.vendas >= 0) a.vendas += (vitNumBR(l[col.vendas]) || 1); else a.vendas += 1;
    if(col.comissao >= 0) a.comissao += vitNumBR(l[col.comissao]);
  });
  const progs = await dbGetAll('programas');
  const itens = Object.values(agg).map(a => {
    const k = vitNorm(a.nome);
    const alvo = progs.find(p => vitNorm(p.produto) === k)
      || progs.find(p => { const q = vitNorm(p.produto); return q.length >= 6 && (k.includes(q) || q.includes(k.slice(0, 30))); });
    return { ...a, progId: alvo ? alvo.id : null, progNome: alvo ? alvo.produto : null };
  }).sort((x,y) => y.comissao - x.comissao);
  VIT_IMPORT = { arquivo: f.name, itens, col: Object.fromEntries(Object.entries(col).map(([k,i]) => [k, i >= 0 ? cab[i] : '—'])) };
  const casados = itens.filter(i => i.progId).length;
  prev.innerHTML = `<div class="tt" style="margin:8px 0">Colunas usadas: produto = <b>${esc(VIT_IMPORT.col.produto)}</b>, cliques = <b>${esc(VIT_IMPORT.col.cliques)}</b>, vendas = <b>${esc(VIT_IMPORT.col.vendas)}</b>, comissão = <b>${esc(VIT_IMPORT.col.comissao)}</b>.
      ${itens.length} produto(s); ${casados} ligado(s) a itens da vitrine.</div>
    <div class="fg"><label><input type="checkbox" id="vt-novos" checked> Criar na vitrine os produtos que ainda não estão lá</label>
      <select id="vt-plat"><option>Shopee</option><option>Mercado Livre</option><option>Amazon</option><option>TikTok Shop</option><option>Shein</option><option>Outra</option></select></div>
    <div style="max-height:300px;overflow:auto"><table><thead><tr><th>Produto no relatório</th><th>Na vitrine</th><th class="r">Cliques</th><th class="r">Vendas</th><th class="r">Comissão</th></tr></thead><tbody>
    ${itens.slice(0, 200).map(i => `<tr><td>${esc(i.nome)}</td><td>${i.progNome ? esc(i.progNome) : '<span class="st s-pd">novo</span>'}</td><td class="r n">${i.cliques}</td><td class="r n">${i.vendas}</td><td class="r n">${moeda(i.comissao)}</td></tr>`).join('')}
    </tbody></table></div>`;
  const b = document.getElementById('vt-apl'); if(b) b.disabled = false;
}
async function vitAplicar(un){
  if(!VIT_IMPORT) return;
  const criar = document.getElementById('vt-novos')?.checked, plat = val('vt-plat') || 'Shopee';
  let at = 0, nv = 0;
  for(const i of VIT_IMPORT.itens){
    const rel = { cliques: i.cliques, vendas: i.vendas, comissao: Math.round(i.comissao * 100) / 100, arquivo: VIT_IMPORT.arquivo, em: hoje() };
    if(i.progId){ const p = await dbGet('programas', i.progId); await dbPut('programas', { ...p, rel, vendas: rel.vendas, ganhoTotal: rel.comissao }); at++; }
    else if(criar){ await dbAdd('programas', { produto: i.nome, plataforma: plat, url: '', tipo: 'Físico', comissao: 0, preco: 0, nicho: '', vendas: rel.vendas, ganhoTotal: rel.comissao, beneficio: '', ativo: true, rel, canais: [] }); nv++; }
  }
  closeModal('mk-form'); VIT_IMPORT = null;
  toast(`Relatório aplicado: ${at} atualizado(s), ${nv} novo(s).`); prodTabVitrine(un);
}

/* =========================================================================
   META R$ 50 MIL — o painel do plano de renda e o "comando único"

   O que mede: o lucro do mês (receitas menos despesas do Financeiro, pela data
   de competência) de cada frente do plano, contra a meta do mês do plano.
   O que comanda: o piloto automático da sede (engine/renda/piloto.js) — "Rodar
   tudo agora" e o piloto diário. A sede prepara; publicar, pagar e enviar
   continuam com o dono (a fila do dono aparece aqui).

   Mora fora de UNIDADES, como Escritório, Software e Day-Trade.
   ========================================================================= */
const META = {
  id:'meta', pg:'meta', nome:'Meta R$ 50 mil', curto:'Meta R$ 50 mil',
  ic:'ti-target', cor:'#1F7A44', bg:'#E7F4EC',
  desc:'Plano de renda: placar por frente e o comando único',
  tabs:[['meta','Meta R$ 50 mil','ti-target']]
};
const META_ALVO = 50000;
const META_DOC = 'https://claude.ai/artifact/18ie5XgKkXfamkDTPT5ujG';
/* metas de LUCRO por mês no mês 3, 6 e 12 do plano (o documento explica de onde vêm) */
const META_FRENTES = [
  { id:'infoprodutos', nome:'Infoprodutos',    ic:'ti-device-laptop',  uns:['info'],           m:[500, 4000, 12000], piloto:'infoprodutos' },
  { id:'afiliados',    nome:'Afiliados',       ic:'ti-link',           uns:[], afil:true,      m:[500, 3000, 10000], piloto:'afiliados' },
  { id:'imp3d',        nome:'Impressão 3D',    ic:'ti-3d-cube-sphere', uns:['imp3d'],          m:[1500, 4000, 8000], piloto:'imp3d' },
  { id:'chacara',      nome:'Chácara',         ic:'ti-plant-2',        uns:['chacara'],        m:[1000, 4000, 7000], piloto:'chacara' },
  { id:'midia',        nome:'Mídia (anúncio)', ic:'ti-share',          uns:['midia'],          m:[0, 500, 3500],     piloto:'midia' },
  { id:'imoveis',      nome:'Imóveis',         ic:'ti-home',           uns:['imoveis'],        fixo:'imoveis',         piloto:'cobrancas' },
  { id:'frota',        nome:'Veículos e máquinas', ic:'ti-car',        uns:['veiculos'],       fixo:'frota',           piloto:'frota' },
  { id:'obras',        nome:'Obras',           ic:'ti-crane',          uns:['obras'],          m:null },
];
/* o que já entra: 6 aluguéis de R$ 1.300 e 1 de R$ 1.400, menos 10% da imobiliária (informado em 23/11/2026) */
const META_IMOVEIS_PADRAO = 6 * 1300 * 0.9 + 1400 * 0.9;
const META_CONTAS = [
  ['shopee','Shopee Afiliados: dados fiscais, pagamento e pedido do Open API'],
  ['ml','Mercado Livre: Programa de Afiliados e Criadores'],
  ['amazon','Amazon Associados'],
  ['hotmart','Hotmart: conta de produtor'],
  ['kdp','Amazon KDP: conta de autor com dados fiscais'],
  ['loja','Shopify ou Nuvemshop: loja da J&V Artigos 3D'],
  ['vendedor','Shopee e Mercado Livre como vendedor (peças 3D)'],
  ['tiktok','TikTok: 1.000 seguidores e TikTok Shop de afiliado'],
  ['pinterest','Pinterest: conta comercial ligada à Shopee'],
  ['zap','WhatsApp: número reserva próprio para os grupos de ofertas'],
];
let META_EST = null;      /* último estado do piloto vindo da sede */
let META_POLL = null;

function metaApp(){ const a = (typeof APP === 'function') ? APP() : null; return a && a.pilotoRodar ? a : null; }
async function metaPiloto(cmd, arg){
  const a = metaApp(); if(!a) return { ok:false, erro:'O piloto roda no aplicativo do Windows, junto com a sede dos agentes.' };
  try { return await a.pilotoRodar(cmd, arg); } catch(e){ return { ok:false, erro:String(e && e.message || e) }; }
}

/* mês do plano: 1 no mês em que o plano começou */
function metaInicio(){ return CFG.metaInicio || mesAtual(); }
function metaMesDoPlano(mk){
  const [a0,m0] = metaInicio().split('-').map(Number), [a1,m1] = (mk||mesAtual()).split('-').map(Number);
  return Math.max(1, (a1-a0)*12 + (m1-m0) + 1);
}
/* meta interpolada entre (0,0) (3,m3) (6,m6) (12,m12); depois do 12 fica no m12 */
function metaDoMes(m3m6m12, n){
  if(!m3m6m12) return null;
  const pts = [[0,0],[3,m3m6m12[0]],[6,m3m6m12[1]],[12,m3m6m12[2]]];
  if(n >= 12) return m3m6m12[2];
  for(let i=1;i<pts.length;i++){ const [x0,y0]=pts[i-1], [x1,y1]=pts[i];
    if(n <= x1) return Math.round(y0 + (y1-y0)*(n-x0)/(x1-x0)); }
  return m3m6m12[2];
}
/* metas das frentes que já existem: imóveis = o que os contratos rendem; frota = o plano de frota */
function metaFixa(f, n){
  if(f.fixo === 'imoveis') return Math.round(num(CFG.metaImoveis) || META_IMOVEIS_PADRAO);
  if(f.fixo === 'frota') return (typeof frotaMetaMes === 'function') ? frotaMetaMes(n) : null;
  return null;
}

/* lançamentos de comissão de afiliado: marcados pela categoria ou pela descrição */
function metaEhAfiliado(l){ return /afiliad|comiss[aã]o/i.test(String(l.cat||'') + ' ' + String(l.desc||'')); }
function metaLucroFrente(f, mk){
  const doMes = FIN.filter(l => finVale(l) && String(l.data||'').slice(0,7) === mk);
  let ls;
  if(f.afil) ls = doMes.filter(metaEhAfiliado);
  else ls = doMes.filter(l => f.uns.includes(l.un) && !metaEhAfiliado(l));
  const rec = ls.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const des = ls.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
  return { rec, des, lucro: rec - des };
}
function metaPlacar(mk){
  mk = mk || mesAtual();
  const n = metaMesDoPlano(mk);
  const linhas = META_FRENTES.map(f => {
    const r = metaLucroFrente(f, mk);
    const meta = f.m ? metaDoMes(f.m, n) : metaFixa(f, n);
    return { ...f, ...r, meta };
  });
  const lucro = linhas.reduce((s,l)=>s+l.lucro,0);
  const metaMes = linhas.reduce((s,l)=>s+(l.meta||0),0);
  return { mk, n, linhas, lucro, metaMes };
}

/* ------------------------------------------------ cartão da página inicial */
function metaCardHub(){
  const u = META, P = metaPlacar();
  const pc = Math.max(0, Math.min(100, P.lucro / META_ALVO * 100));
  return `<div class="ucard" style="--uc:${u.cor};--ucb:${u.bg}" onclick="go('${u.pg}')">
      <div class="bar"></div>
      <div class="top2"><div class="ico"><i class="ti ${u.ic}"></i></div>
        <div style="flex:1;min-width:0"><h3>${esc(u.curto)}</h3><div class="sub">${esc(u.desc)}</div></div></div>
      <div class="body">
        <div class="kv"><span>Mês do plano</span><b>${P.n} de 12</b></div>
        <div class="kv"><span>Lucro do mês (frentes)</span><b style="color:${P.lucro>=0?'var(--green)':'var(--red)'}">${moedaK(P.lucro)}</b></div>
        <div class="kv"><span>Meta deste mês</span><b>${moedaK(P.metaMes)}</b></div>
        <div style="height:8px;border-radius:6px;background:var(--bg3);overflow:hidden;margin:8px 0 2px"><div style="height:100%;width:${pc.toFixed(1)}%;background:${u.cor}"></div></div>
        <div class="foot">
          <div><div class="tt">Caminho até os R$ 50 mil</div><div class="res">${pc.toFixed(0)}%</div></div>
          <div class="go">Abrir <i class="ti ti-arrow-right"></i></div></div>
      </div></div>`;
}

/* ------------------------------------------------ retrato que vai para a sede */
async function metaRetrato(){
  const P = metaPlacar();
  const progs = await dbGetAll('programas').catch(()=>[]);
  const prods = await dbGetAll('produtos').catch(()=>[]);
  const contas = CFG.metaContas || {};
  const L = [];
  L.push(`# Retrato da meta — ${dmesL ? dmesL(P.mk) : P.mk}`, '');
  L.push(`Gerado pelo JeV em ${new Date().toLocaleString('pt-BR')}. Mês ${P.n} do plano (início ${metaInicio()}). Meta final: R$ 50.000 de lucro por mês.`, '');
  L.push('| Frente | Lucro no mês | Meta do mês |', '|---|---|---|');
  P.linhas.forEach(l => L.push(`| ${l.nome} | ${moeda(l.lucro)} | ${l.meta==null?'—':moeda(l.meta)} |`));
  L.push(`| **Total** | **${moeda(P.lucro)}** | **${moeda(P.metaMes)}** |`, '');
  L.push('## Contas do dono', '');
  META_CONTAS.forEach(([k,t]) => L.push(`- [${contas[k]?'x':' '}] ${t}`));
  L.push('', '## Vitrine de afiliados', '');
  const ativos = progs.filter(p=>p.ativo!==false);
  L.push(`${ativos.length} item(ns) ativo(s), ${ativos.filter(p=>p.url).length} com link.`);
  ativos.slice(0,30).forEach(p => L.push(`- ${p.produto} · ${p.plataforma||'?'} · ${p.url?'com link':'SEM LINK'} · divulgado em: ${(p.canais||[]).join(', ')||'nenhum canal'}${p.rel?` · relatório: ${p.rel.vendas||0} vendas, ${moeda(p.rel.comissao||0)}`:''}`));
  L.push('', '## Infoprodutos', '');
  const infos = prods.filter(p=>p.tipo==='Infoproduto');
  if(!infos.length) L.push('Nenhum infoproduto cadastrado ainda.');
  infos.forEach(p => { const lj = p.lojas || {}; L.push(`- ${p.nome} (${moeda(p.preco)}) · ${Object.entries(lj).map(([k,v])=>`${k}: ${v.status||'—'}`).join(', ') || 'nenhuma loja'}`); });
  const cp = CFG.chacaraPlano;
  L.push('', '## Plano da chácara', '');
  L.push(cp ? `Adotado em ${cp.em}: lucro estimado ${moeda(cp.lucro)} por mês. ${cp.itens.map(i=>`${i.nome}: ${i.qtd} ${i.und}`).join('; ')}.` : 'Ainda não adotado no JeV.');
  if(typeof frotaRetrato === 'function') L.push('', frotaRetrato());
  return L.join('\n');
}

/* ------------------------------------------------ a tela */
async function metaRender(){
  const root = document.getElementById('meta-root'); if(!root) return;
  await finLoad();
  if(!CFG.metaInicio){ CFG.metaInicio = mesAtual(); await cfgSalvar(); }
  const P = metaPlacar();
  const app = metaApp();
  if(app){ META_EST = await metaPiloto('estado'); } else META_EST = null;
  const E = META_EST && META_EST.ok ? META_EST : null;
  const pc = Math.max(0, Math.min(100, P.lucro / META_ALVO * 100));

  let h = `<div class="ph"><div class="ic" style="background:${META.bg};color:${META.cor}"><i class="ti ti-target"></i></div>
    <div><h1>Meta R$ 50 mil por mês</h1><p>Mês ${P.n} do plano · lucro de cada frente pelo Financeiro · a sede prepara, você publica</p></div>
    <div class="sp"></div>
    <a class="btn gh" href="${META_DOC}" target="_blank" rel="noopener"><i class="ti ti-file-text"></i>Ver o plano</a></div>`;

  h += `<div class="kg" style="margin-bottom:14px">
    <div class="kc gn"><div class="lb"><i class="ti ti-report-money"></i>Lucro do mês</div><div class="vl" style="color:${P.lucro>=0?'var(--green)':'var(--red)'}">${moedaK(P.lucro)}</div><div class="sb">soma das frentes em ${esc(dmesL(P.mk))}</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-target"></i>Meta deste mês</div><div class="vl">${moedaK(P.metaMes)}</div><div class="sb">mês ${P.n} do plano de 12</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-trophy"></i>Até os R$ 50 mil</div><div class="vl">${pc.toFixed(0)}%</div><div class="sb">faltam ${moedaK(Math.max(0, META_ALVO - P.lucro))}</div></div>
    <div class="kc ${E && E.ligado ? 'gn' : 'am'}"><div class="lb"><i class="ti ti-clock"></i>Piloto diário</div><div class="vl" style="font-size:18px">${!app ? 'no app' : E ? (E.ligado ? 'Ligado' : 'Desligado') : 'sede fechada'}</div><div class="sb">${E && E.horario ? esc(E.horario) : '—'}</div></div>
  </div>`;

  /* o comando único */
  h += `<div class="card" style="margin-bottom:12px;border:2px solid ${META.cor}"><div class="bd" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <div style="flex:1;min-width:260px"><b style="font-size:15px">Comando único</b>
      <div class="tt" style="margin-top:3px">Manda à sede uma missão para cada frente do dia (mídia, afiliados, infoprodutos, impressão 3D, chácara, cobranças e placar). Os agentes pesquisam, escrevem e preparam; no fim, o que precisa de você aparece na fila abaixo.</div>
      ${E && E.rodando ? `<div class="al ai" style="margin:8px 0 0"><i class="ti ti-loader"></i><div>Rodando desde ${esc(String(E.rodando.desde).slice(11,16))}${E.rodando.atual?` — agora: <b>${esc(E.rodando.atual)}</b>`:''}.</div></div>` : ''}
      ${E && E.teto ? `<div class="tt" style="margin-top:6px">Gasto com IA hoje: ${moeda(E.teto.gastoHojeBRL)} de ${moeda(E.teto.tetoDiarioBRL)} (teto diário da sede).</div>` : ''}</div>
    <button class="btn" style="background:${META.cor};font-size:15px;padding:12px 18px" ${!app || (E && E.rodando) ? 'disabled' : ''} onclick="metaRodar(false)"><i class="ti ti-player-play"></i>Rodar tudo agora</button>
    ${app && E ? `<button class="btn gh" onclick="metaLigar(${E.ligado?'false':'true'})"><i class="ti ti-${E.ligado?'x':'clock'}"></i>${E.ligado?'Desligar piloto diário':'Ligar piloto diário'}</button>` : ''}
  </div>${!app ? `<div class="bd" style="padding-top:0"><div class="al ai" style="margin:0"><i class="ti ti-info-circle"></i><div>O comando roda no <b>aplicativo do Windows</b>, junto com a sede dos agentes. Aqui no navegador dá para ver o placar e marcar as contas.</div></div></div>` : ''}
  ${app && META_EST && !META_EST.ok ? `<div class="bd" style="padding-top:0"><div class="al ae" style="margin:0"><i class="ti ti-alert-circle"></i><div>${esc(META_EST.erro||'')}</div></div></div>` : ''}</div>`;

  /* placar */
  h += `<div class="card tw" style="margin-bottom:12px"><div class="hd"><i class="ti ti-chart-bar"></i>Placar de ${esc(dmesL(P.mk))}</div><div class="bd"><table>
    <thead><tr><th>Frente</th><th class="r">Receita</th><th class="r">Despesa</th><th class="r">Lucro</th><th class="r">Meta do mês</th><th style="width:22%">Andamento</th><th>Sede</th></tr></thead><tbody>
    ${P.linhas.map(l => {
      const fr = E ? E.frentes.find(x => x.id === l.piloto) : null;
      const pcl = l.meta ? Math.max(0, Math.min(100, l.lucro / l.meta * 100)) : null;
      return `<tr><td><i class="ti ${l.ic}" style="color:var(--text3)"></i> <b>${esc(l.nome)}</b></td>
        <td class="r n">${moeda(l.rec)}</td><td class="r n">${moeda(l.des)}</td>
        <td class="r n"><b style="color:${l.lucro>=0?'var(--green)':'var(--red)'}">${moeda(l.lucro)}</b></td>
        <td class="r n">${l.meta==null?'<span class="tt">sem meta</span>':moeda(l.meta)}</td>
        <td>${pcl==null?'':`<div style="height:7px;border-radius:5px;background:var(--bg3);overflow:hidden"><div style="height:100%;width:${pcl.toFixed(0)}%;background:${pcl>=100?'var(--green)':META.cor}"></div></div><span class="tt">${pcl.toFixed(0)}%</span>`}</td>
        <td>${fr ? `<label style="display:flex;gap:6px;align-items:center;font-size:12px;cursor:pointer"><input type="checkbox" ${fr.ligada?'checked':''} onchange="metaFrente('${fr.id}',this.checked)"> ${fr.missao?`<span class="st ${fr.missao.etapa==='concluida'?'s-ok':fr.missao.etapa==='bloqueada'?'s-bl':'s-pd'}" title="${esc(fr.missao.resultado||'')}">${esc(fr.missao.id)} ${esc(fr.missao.etapa)}</span>`:'<span class="tt">ainda não rodou</span>'}</label>` : '<span class="tt">—</span>'}</td></tr>`;
    }).join('')}
    <tr style="background:var(--bg2)"><td><b>Total</b></td><td></td><td></td><td class="r n"><b>${moeda(P.lucro)}</b></td><td class="r n"><b>${moeda(P.metaMes)}</b></td><td colspan="2"></td></tr>
    </tbody></table>
    <div class="tt" style="padding:8px 12px">Afiliados: entram os lançamentos com categoria ou descrição "afiliado" ou "comissão". As outras frentes contam pela unidade do lançamento, na data de competência.</div></div></div>`;

  /* fila do dono */
  if(E){
    h += `<div class="card" style="margin-bottom:12px"><div class="hd"><i class="ti ti-list-check"></i>Fila do dono (${E.fila.reduce((s,f)=>s+f.itens.filter(i=>!i.feito).length,0)})<span class="sp"></span>
      ${metaApp() && metaApp().agAbrir ? `<button class="btn xs gh" onclick="APP().agAbrir()"><i class="ti ti-external-link"></i>Abrir a sede</button>` : ''}</div><div class="bd">
      ${E.fila.length ? E.fila.map(f => `<div style="padding:6px 0;border-bottom:1px solid var(--bg3)"><b>${esc(f.titulo.replace(/^Fila do dono\s*[—-]\s*/,''))}</b> <span class="tt">${esc(dbr(f.dia))}</span>
        ${f.itens.map(i => `<div style="display:flex;gap:8px;padding:3px 0 0 4px;font-size:13px"><i class="ti ti-${i.feito?'check':'square'}" style="color:${i.feito?'var(--green)':'var(--text3)'}"></i><span>${esc(i.texto)}</span></div>`).join('')}
        <div class="tt" style="padding-left:4px">${esc(f.arquivo)}</div></div>`).join('')
        : '<div class="tt">Nada esperando você. Depois do primeiro "Rodar tudo", o que precisa de um clique seu aparece aqui.</div>'}
    </div></div>`;
  }

  /* contas */
  const contas = CFG.metaContas || {};
  const feitas = META_CONTAS.filter(([k]) => contas[k]).length;
  h += `<div class="fr2" style="align-items:start">
    <div class="card"><div class="hd"><i class="ti ti-users"></i>Contas a abrir (${feitas}/${META_CONTAS.length})</div><div class="bd">
      ${META_CONTAS.map(([k,t]) => `<label style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:13px;cursor:pointer"><input type="checkbox" ${contas[k]?'checked':''} onchange="metaConta('${k}',this.checked)"><span style="${contas[k]?'color:var(--text3);text-decoration:line-through':''}">${esc(t)}</span></label>`).join('')}
      <div class="tt" style="margin-top:6px">Sem essas contas, os agentes trabalham, mas o dinheiro não tem por onde entrar.</div></div></div>
    <div class="card"><div class="hd"><i class="ti ti-info-circle"></i>Como ler este painel</div><div class="bd" style="font-size:13px">
      <p style="margin:0 0 8px">A meta de cada frente nova cresce mês a mês até o mês 12 (o plano explica cada número). Imóveis têm meta fixa no que os contratos rendem; Veículos e máquinas seguem o Plano de frota (Veículos → Plano de frota).</p>
      <p style="margin:0 0 8px">Day-Trade fica fora: não tem retorno esperado até provar na simulação.</p>
      <p style="margin:0">Início do plano: <b>${esc(dmesL(metaInicio()))}</b> · Imóveis: <b>${moeda(num(CFG.metaImoveis) || META_IMOVEIS_PADRAO)}</b> por mês · <a href="#" onclick="metaMudarInicio();return false">mudar</a></p></div></div></div>`;

  root.innerHTML = h;
  clearTimeout(META_POLL);
  if(E && E.rodando) META_POLL = setTimeout(() => { if(document.getElementById('meta-root') && document.querySelector('#pg-meta.on')) metaRender(); }, 15000);
}

async function metaRodar(forcar){
  confirmar('Rodar tudo agora',
    'A sede abre uma missão para cada frente do dia e trabalha nelas uma a uma. Pode levar de minutos a algumas horas, e o gasto com IA fica dentro do teto diário da sede. Nada é publicado, pago ou enviado sem você.',
    async () => {
      toast('Montando o retrato da meta…', 'ai');
      const retrato = await metaRetrato();
      const r = await metaPiloto('rodar', { retrato, forcar: !!forcar });
      toast(r.ok ? (r.msg || 'Piloto rodando.') : r.erro, r.ok ? 'ag' : 'ae');
      setTimeout(metaRender, 2500);
    });
}
async function metaLigar(sim){
  const r = await metaPiloto(sim ? 'ligar' : 'desligar');
  toast(r.ok ? r.msg : r.erro, r.ok ? 'ag' : 'ae'); metaRender();
}
async function metaFrente(id, ligada){
  const r = await metaPiloto('acao', { tipo:'frente', id, ligada });
  toast(r.ok ? r.msg : r.erro, r.ok ? 'ag' : 'ae');
}
async function metaConta(k, v){
  CFG.metaContas = { ...(CFG.metaContas || {}), [k]: !!v }; await cfgSalvar(); metaRender();
}
function metaMudarInicio(){
  modal('Início do plano', 'ti-calendar',
    `<div class="fg"><label>Mês em que o plano começou</label><input id="meta-ini" type="month" value="${esc(metaInicio())}"></div>
     <div class="fg"><label>Quanto os imóveis rendem por mês, líquido da imobiliária (R$)</label><input id="meta-imov" type="number" step="10" value="${Math.round(num(CFG.metaImoveis) || META_IMOVEIS_PADRAO)}"></div>
     <div class="hint">A meta de cada frente é contada a partir deste mês. O valor dos imóveis é a meta da linha Imóveis.</div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="metaSalvarInicio()"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function metaSalvarInicio(){
  const v = val('meta-ini'); if(!/^\d{4}-\d{2}$/.test(v)){ toast('Escolha um mês.','aw'); return; }
  CFG.metaInicio = v; CFG.metaImoveis = num(val('meta-imov')) || META_IMOVEIS_PADRAO; await cfgSalvar(); closeModal('mk-form'); metaRender();
}

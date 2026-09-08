/* =========================================================================
   CANAL DE AFILIADO — do produto garimpado ao link que paga

   O canal de afiliado tem uma regra que o de cortes não tem: o vídeo só
   vale dinheiro se o link for o SEU. Link errado, ou link de outra pessoa,
   e a venda acontece mas a comissão vai para outro.

   Por isso este arquivo cuida de três coisas:

     1. o seu código em cada programa, guardado uma vez só;
     2. o link — e aqui vem a parte que quase todo tutorial mente:
        · na Amazon o link de afiliado é o endereço do produto com a sua
          tag no fim. Isso o sistema MONTA sozinho, e monta certo.
        · no Mercado Livre, na Shopee e no TikTok Shop o link é gerado
          dentro do painel deles e é curto e embaralhado. NÃO existe
          fórmula: quem disser que existe está inventando. O sistema abre
          o painel certo, no produto certo, e você cola o link de volta.
     3. o aviso de publicidade, que a Amazon exige por contrato e as
        outras exigem na prática — e que é, no fim, o que mantém a
        confiança de quem assiste.
   ========================================================================= */

const AFIL_PROG = {
  amazon: {
    nome: 'Amazon Associados', ic:'ti-brand-amazon', cor:'#E67E22',
    com: [7, 13],
    painel: 'https://associados.amazon.com.br/',
    campo: 'Sua tag (termina com -20)', exemplo: 'jevempreend-20',
    monta: true,
    como: 'O link é o endereço do produto com a sua tag no fim. Eu monto sozinho.'
  },
  tiktok: {
    nome: 'TikTok Shop Afiliado', ic:'ti-brand-tiktok', cor:'#111827',
    com: [10, 30],
    painel: 'https://affiliate-br.tiktok.com/',
    campo: 'Seu apelido de criador (@)', exemplo: '@jevempreendimentos',
    monta: false,
    como: 'O link sai do painel, dentro de "Meus produtos". É curto e embaralhado — não tem fórmula.'
  },
  shopee: {
    nome: 'Shopee Afiliados', ic:'ti-shopping-bag', cor:'#EE4D2D',
    com: [4, 30],
    painel: 'https://affiliate.shopee.com.br/',
    campo: 'Seu identificador de afiliado', exemplo: '17300000000',
    monta: false,
    como: 'A Shopee gera um link curto (shope.ee/…) no painel. Cole aqui depois de gerar.'
  },
  ml: {
    nome: 'Mercado Livre Afiliados', ic:'ti-shopping-cart', cor:'#F1C40F',
    com: [4, 16],
    painel: 'https://www.mercadolivre.com.br/afiliados/linkbuilder',
    campo: 'Seu apelido no Mercado Livre', exemplo: 'JEVEMPREEND',
    monta: false,
    como: 'O Mercado Livre encurta para mercadolivre.com/sec/… no Link Builder. Cole aqui depois de gerar.'
  }
};
const AFIL_IDS = ['tiktok', 'amazon', 'shopee', 'ml'];

/* a loja do garimpo corresponde a qual programa */
const AFIL_DA_LOJA = { amazon:'amazon', tiktok:'tiktok', shopee:'shopee', ml:'ml' };

/* ------------------------------------------------------------ o código */
function afilCodigos(){
  return (typeof CFG === 'object' && CFG && CFG.afiliado) ? CFG.afiliado : {};
}
function afilCodigo(id){
  return String(afilCodigos()[id] || '').trim();
}

/* ---------------------------------------------------- a tag da Amazon
   Uma tag válida é letra/número com hífens, e a brasileira termina em -20.
   Aceito sem o -20 (a pessoa pode ter tag de outro país), mas aviso.     */
function afilTagValida(tag){
  return /^[a-z0-9][a-z0-9-]{2,18}$/i.test(String(tag || '').trim());
}
/* o código do produto na Amazon: dez caracteres depois de /dp/ ou /gp/product/ */
function afilAsin(url){
  const u = String(url == null ? '' : url);
  const m = u.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?![A-Z0-9])/i);
  if (m) return m[1].toUpperCase();
  const q = u.match(/[?&]asin=([A-Z0-9]{10})(?![A-Z0-9])/i);
  return q ? q[1].toUpperCase() : '';
}

/* ------------------------------------------------------------- o link
   Devolve sempre um objeto com o mesmo formato, para a tela não precisar
   saber de qual programa se trata:
     {ok, url, montado, painel, recado}                                    */
function afilMontar(programaId, urlProduto, codigo){
  const p = AFIL_PROG[programaId];
  if (!p) return { ok:false, url:'', montado:false, painel:'', recado:'Programa desconhecido.' };
  const cod = String(codigo == null ? afilCodigo(programaId) : codigo).trim();

  if (!p.monta){
    return { ok:false, url:'', montado:false, painel:p.painel,
      recado: p.nome + ': ' + p.como };
  }

  /* daqui para baixo é só a Amazon, a única com fórmula pública */
  if (!cod)
    return { ok:false, url:'', montado:false, painel:p.painel,
      recado:'Falta a sua tag da Amazon. Ela aparece no painel, no canto de cima.' };
  if (!afilTagValida(cod))
    return { ok:false, url:'', montado:false, painel:p.painel,
      recado:'Essa tag não parece válida. A da Amazon Brasil é algo como "' + p.exemplo + '".' };

  const asin = afilAsin(urlProduto);
  if (!asin)
    return { ok:false, url:'', montado:false, painel:p.painel,
      recado:'Esse endereço não é a página de um produto da Amazon — preciso de um que tenha /dp/ no meio.' };

  const url = 'https://www.amazon.com.br/dp/' + asin + '?tag=' + encodeURIComponent(cod);
  return { ok:true, url:url, montado:true, painel:p.painel, asin:asin,
    recado: cod.slice(-3) === '-20'
      ? 'Link montado com a sua tag.'
      : 'Link montado — mas atenção: a tag da Amazon Brasil normalmente termina em "-20".' };
}

/* o aviso obrigatório, curto o bastante para caber em qualquer legenda */
function afilAviso(programaId){
  const p = AFIL_PROG[programaId];
  const nome = p ? p.nome.split(' ')[0] : 'afiliado';
  return 'Publicidade: link de afiliado. Você paga o mesmo preço e eu ganho uma comissão' +
         (programaId === 'amazon' ? ' como associado ' + nome : '') + '.';
}
/* põe o aviso na legenda sem repetir, se já estiver lá */
function afilComAviso(legenda, programaId){
  const t = String(legenda == null ? '' : legenda);
  if (/publicidade|link de afiliado|ganho uma comiss/i.test(t)) return t.trim();
  return (t.trim() + '\n\n' + afilAviso(programaId)).trim();
}

/* ------------------------------------------------- do garimpo para o cadastro */
function afilDoGarimpo(i){
  const p = GAR && GAR.achados && GAR.achados[Number(i)];
  if (!p){ toast('Garimpe primeiro.', 'aw'); return null; }
  const loja = (p.links || []).find(function(l){ return l.loja === 'tiktok' && p.tt; })
            || (p.links || [])[0] || null;
  const progId = loja ? (AFIL_DA_LOJA[loja.loja] || '') : '';
  const prog = AFIL_PROG[progId];
  const dados = {
    produto: p.n,
    plataforma: prog ? (progId === 'ml' ? 'Mercado Livre' : progId === 'amazon' ? 'Amazon'
                        : progId === 'shopee' ? 'Shopee' : 'TikTok Shop') : '',
    programaId: progId,
    urlLoja: loja ? loja.url : '',
    preco: p.preco,
    comissao: p.comissao,
    nicho: garNicho(p.g).n,
    tipo: 'Físico',
    beneficio: p.gancho || ''
  };
  return dados;
}

/* abre o cadastro de produto já preenchido com o que o garimpo achou */
async function afilCadastrarGarimpo(i){
  const d = afilDoGarimpo(i);
  if (!d) return;
  const m = afilMontar(d.programaId, d.urlLoja);
  await progForm();
  setVal('pg-prod', d.produto);
  setVal('pg-plat', d.plataforma);
  setVal('pg-com', d.comissao);
  setVal('pg-preco', d.preco);
  setVal('pg-nicho', d.nicho);
  setVal('pg-benef', d.beneficio);
  if (m.ok) setVal('pg-url', m.url);
  progPreview();
  toast(m.ok ? 'Link de afiliado montado com a sua tag.' : m.recado, m.ok ? 'ag' : 'aw');
  if (!m.ok && m.painel){
    const alvo = document.getElementById('pg-err');
    if (alvo) alvo.innerHTML =
      '<div class="al aw"><i class="ti ti-key"></i><div>' + esc(m.recado) +
      ' <button class="btn xs gh" onclick="abrirFora(\'' + m.painel + '\')">' +
      '<i class="ti ti-external-link"></i>Abrir o painel</button>' +
      (d.urlLoja ? ' <button class="btn xs gh" onclick="abrirFora(\'' + d.urlLoja + '\')">' +
       '<i class="ti ti-package"></i>Abrir o produto</button>' : '') +
      '</div></div>';
  }
}

/* ------------------------------------------------------------- a telinha
   Um cartão que entra na aba Afiliados, com os quatro programas que você
   escolheu e o campo do seu código em cada um.                           */
function afilCodigosHTML(){
  const c = afilCodigos();
  let h = '<div class="card"><div class="hd"><i class="ti ti-key"></i>Meus códigos de afiliado' +
    '<span class="sp"></span><button class="btn sm gn" onclick="afilSalvarCodigos()">' +
    '<i class="ti ti-device-floppy"></i>Salvar os códigos</button></div><div class="bd">' +
    '<div class="tt" style="margin-bottom:11px">Guarde aqui uma vez só. Depois, cada produto que o ' +
    '<b>Garimpo</b> achar já vem com o link certo — e onde não dá para montar link por fórmula, ' +
    'eu abro o painel no lugar certo em vez de fingir que montei.</div><table>' +
    '<thead><tr><th>Programa</th><th class="r">Comissão</th><th>Seu código</th><th>Como o link funciona</th>' +
    '<th class="c no-print">Painel</th></tr></thead><tbody>';
  AFIL_IDS.forEach(function(id){
    const p = AFIL_PROG[id];
    h += '<tr><td><b><i class="ti ' + p.ic + '"></i> ' + esc(p.nome) + '</b>' +
      (p.monta ? ' <span class="st s-ok">monta sozinho</span>' : ' <span class="st s-nt">colar do painel</span>') + '</td>' +
      '<td class="r n">' + p.com[0] + '–' + p.com[1] + '%</td>' +
      '<td><input id="af-' + id + '" value="' + esc(c[id] || '') + '" placeholder="' + esc(p.exemplo) + '" ' +
        'style="width:100%;box-sizing:border-box"><div class="hint">' + esc(p.campo) + '</div></td>' +
      '<td class="tt">' + esc(p.como) + '</td>' +
      '<td class="c no-print"><button class="btn xs gh" onclick="abrirFora(\'' + p.painel + '\')">' +
        '<i class="ti ti-external-link"></i>Abrir</button></td></tr>';
  });
  h += '</tbody></table>' +
    '<div class="al aw" style="margin-top:11px"><i class="ti ti-alert-triangle"></i><div>' +
    'Só a Amazon publica a fórmula do link (endereço do produto + a sua tag). ' +
    'Mercado Livre, Shopee e TikTok Shop geram um link curto e embaralhado dentro do painel — ' +
    'não existe jeito honesto de adivinhar. Se algum site prometer gerar esses links para você, ' +
    'desconfie: ou não paga, ou o dinheiro vai para a conta de outra pessoa.</div></div>' +
    '</div></div>';
  return h;
}

async function afilSalvarCodigos(){
  const novo = {};
  AFIL_IDS.forEach(function(id){ novo[id] = val('af-' + id); });
  CFG.afiliado = novo;
  await cfgSalvar();
  const tag = String(novo.amazon || '').trim();
  if (tag && !afilTagValida(tag)) toast('Salvei, mas confira a tag da Amazon — parece fora do formato.', 'aw');
  else toast('Códigos guardados.', 'ag');
  midiaRender();
}

/* ---------------------------------------------------- montar link avulso
   Serve para quando você já tem o endereço de um produto na mão.        */
function afilLinkAvulso(programaId, url){
  const r = afilMontar(programaId, url);
  if (r.ok){
    navigator.clipboard.writeText(r.url).then(function(){ toast('Link de afiliado copiado.', 'ag'); },
                                              function(){ toast(r.url, 'ag'); });
  } else {
    toast(r.recado, 'aw');
    if (r.painel) abrirFora(r.painel);
  }
  return r;
}

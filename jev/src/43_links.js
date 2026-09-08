/* =========================================================================
   A CARTEIRA DE LINKS DE AFILIADO

   O PEDIDO
   --------
   "Quero que essas ofertas peguem meus links de afiliados para sempre
   estarem postando."

   O PROBLEMA REAL, EM UMA FRASE
   -----------------------------
   O grupo consome 4 a 6 ofertas por dia. Cada oferta precisa de um link de
   afiliado. Se cada link exigir uma visita ao painel, o grupo para no dia
   em que ele estiver ocupado. O gargalo nunca foi escrever a mensagem: era
   o link.

   AS QUATRO LOJAS DELE, E O QUE CADA UMA PERMITE
   ----------------------------------------------
     Amazon        → fórmula pública (endereço + tag). O sistema monta
                     sozinho, sempre, sem pedir nada. Já funcionava.
     Shopee        → tem Open API oficial. Com a chave guardada, o sistema
                     gera o link de todo produto Shopee sozinho, para
                     sempre. É a peça 44_shopee / desktop/shopee.js.
     Mercado Livre → não tem API de afiliado. É reclamação antiga e pública
                     dos afiliados. Só o Link Builder do painel gera.
     TikTok Shop   → link sai de "Meus produtos" no painel de criador.
                     Sem fórmula, sem API.

   Para as duas últimas sobra um caminho, e ele é bom: COLAR EM LOTE. O
   painel deixa gerar vários links de uma vez. Ele cola o bolo inteiro numa
   caixa — do jeito que veio, bagunçado — e esta peça separa, reconhece a
   loja pelo endereço, e casa cada link com o produto certo.

   POR QUE O CASAMENTO É POR NOME, E POR QUE ELE PERDOA
   ----------------------------------------------------
   O link curto da Shopee e do ML não tem o nome do produto dentro; é um
   código embaralhado. Então o que casa é o texto que veio JUNTO do link no
   que ele colou. Esse texto vem sujo: com "R$", com "12% comissão", com
   emoji, cortado no meio. Um casamento exato falharia em quase tudo.

   Por isso a comparação normaliza (tira acento, pontuação, palavra curta) e
   aceita a partir de 60% de palavras em comum. E quando não acha ninguém,
   NÃO joga fora: cria uma ficha nova com o que deu para entender. Link
   descartado em silêncio é comissão perdida em silêncio.
   ========================================================================= */

const LINK = { texto: '', previa: null, chaveAberta: false, gerando: false, recado: '' };

/* --------------------------------------------- de qual loja é este endereço */
const LINK_LOJAS = [
  { id: 'shopee',  nome: 'Shopee',        re: /(^|\/\/|\.)(s\.shopee\.com\.br|shopee\.com\.br|shp\.ee)\// },
  { id: 'amazon',  nome: 'Amazon',        re: /(^|\/\/|\.)(amazon\.com\.br|amzn\.to)\// },
  { id: 'ml',      nome: 'Mercado Livre', re: /(^|\/\/|\.)(mercadolivre\.com|mercadolibre\.com|mercadolivre\.com\.br)\// },
  { id: 'tiktok',  nome: 'TikTok Shop',   re: /(^|\/\/|\.)(vt\.tiktok\.com|vm\.tiktok\.com|tiktok\.com|shop\.tiktok\.com)\// },
  { id: 'magalu',  nome: 'Magalu',        re: /(^|\/\/|\.)(magazinevoce\.com\.br|magazineluiza\.com\.br)\// },
  { id: 'ali',     nome: 'AliExpress',    re: /(^|\/\/|\.)(aliexpress\.com|s\.click\.aliexpress\.com)\// }
];
function linkLojaDe(url){
  const u = String(url || '');
  for (const l of LINK_LOJAS) if (l.re.test(u)) return l;
  return null;
}

/* --------------------------------------------------- normalizar para casar */
/* Tira acento, deixa minúsculo, joga fora tudo que não é letra ou número, e
   descarta palavra de até 2 letras e as palavras que aparecem em metade dos
   anúncios ("kit", "para", "com"). O que sobra é o esqueleto do nome. */
const LINK_VAZIAS = ['kit','com','para','de','da','do','em','uma','um','the','and',
                     'novo','nova','original','frete','gratis','promocao','oferta',
                     'comissao','desconto','cupom','unidades','unidade'];
function linkPalavras(s){
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(function(p){ return p.length > 2 && LINK_VAZIAS.indexOf(p) < 0; });
}

/* quanto dois nomes se parecem, de 0 a 1 */
function linkParecido(a, b){
  const pa = linkPalavras(a), pb = linkPalavras(b);
  if (!pa.length || !pb.length) return 0;
  const menor = pa.length <= pb.length ? pa : pb;
  const maior = pa.length <= pb.length ? pb : pa;
  let juntos = 0;
  menor.forEach(function(p){ if (maior.indexOf(p) >= 0) juntos++; });
  return juntos / menor.length;
}

/* ------------------------------------------------------------ o separador */
/* Recebe o bolo colado e devolve uma lista de {url, nome, loja}.

   A regra do nome: o texto da MESMA linha do link; se a linha só tem o
   link, olha a linha cheia anterior. É assim que os painéis mostram — nome
   em cima, link embaixo — e é assim que sai quando se copia a tabela. */
function linkSeparar(texto){
  const linhas = String(texto || '').split(/\r?\n/);
  const achados = [];
  let anterior = '';

  linhas.forEach(function(linha){
    const urls = linha.match(/https?:\/\/[^\s<>"')\]]+/g);
    if (!urls || !urls.length){
      const limpo = linha.trim();
      if (limpo) anterior = limpo;
      return;
    }
    /* o que sobra da linha depois de tirar os endereços é o nome dela */
    let resto = linha;
    urls.forEach(function(u){ resto = resto.replace(u, ' '); });
    resto = resto
      .replace(/[|\t;–—]+/g, ' ')
      .replace(/R\$\s*[\d.,]+/g, ' ')
      .replace(/\d+(\.\d+)?\s*%/g, ' ')
      /* sobras de coluna de painel: "de comissão", "off", "de desconto" */
      .replace(/\b(de\s+)?(comiss[ãa]o|desconto|cupom|off)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '')
      .trim();

    urls.forEach(function(u){
      const url = u.replace(/[.,;)]+$/, '');
      achados.push({ url: url, nome: (resto || anterior || '').slice(0, 120),
                     loja: linkLojaDe(url) });
    });

    /* A LINHA QUE JÁ TEM LINK NÃO EMPRESTA O NOME DELA PARA A PRÓXIMA.

       Isto era um defeito de verdade, e apareceu na primeira foto da tela:
       um link do TikTok sozinho numa linha herdou o nome do Tapete da linha
       de cima, e a tela ofereceu com toda a confiança gravar o link errado
       no produto errado. Comissão perdida sem sintoma nenhum.

       Emprestar só vale de uma linha SEM link — que é exatamente o formato
       "nome em cima, link embaixo" dos painéis. */
    anterior = '';
  });

  /* endereço repetido no mesmo bolo não vira duas fichas */
  const vistos = {};
  return achados.filter(function(a){
    if (vistos[a.url]) return false;
    vistos[a.url] = true;
    return true;
  });
}

/* ------------------------------------------------------------ a conferência */
/* Monta a prévia SEM gravar nada. Ele vê o que vai acontecer antes de
   acontecer — trocar o link errado no produto errado é o tipo de erro que
   só aparece semanas depois, na comissão que não veio. */
async function linkPrevia(texto){
  const achados = linkSeparar(texto);
  const fichas = await dbGetAll('programas');
  const usadas = {};

  return achados.map(function(a){
    let melhor = null, nota = 0;
    fichas.forEach(function(f){
      if (usadas[f.id]) return;
      const n = linkParecido(a.nome, f.produto);
      /* empate desempata pela loja: link da Shopee prefere ficha da Shopee */
      const mesmaLoja = a.loja && String(f.plataforma || '').toLowerCase()
                          .indexOf(a.loja.nome.toLowerCase().split(' ')[0]) >= 0;
      const ajustada = n + (mesmaLoja ? 0.15 : 0);
      if (ajustada > nota){ nota = ajustada; melhor = f; }
    });

    if (melhor && nota >= 0.6){
      usadas[melhor.id] = true;
      return { url: a.url, nome: a.nome, loja: a.loja,
               ficha: melhor, acao: melhor.url ? 'trocar' : 'preencher',
               certeza: Math.round(Math.min(1, nota) * 100) };
    }
    /* Link sem nome nenhum não é jogado fora: vira ficha com um nome
       provisório que diz de onde veio. Ele renomeia depois em dois cliques.
       Jogar fora seria perder um link que ele já gerou no painel. */
    if (!a.nome && a.loja)
      return { url: a.url, nome: 'Produto da ' + a.loja.nome + ' — renomear',
               loja: a.loja, ficha: null, acao: 'nova', certeza: 0, semNome: true };

    return { url: a.url, nome: a.nome, loja: a.loja,
             ficha: null, acao: a.nome ? 'nova' : 'sem-nome', certeza: 0 };
  });
}

async function linkConferir(){
  const t = (document.getElementById('link-caixa') || {}).value || '';
  if (!t.trim()){ toast('Cole os links primeiro.', 'aw'); return; }
  LINK.texto = t;
  LINK.previa = await linkPrevia(t);
  if (!LINK.previa.length){
    toast('Não achei nenhum endereço nesse texto.', 'aw');
    return;
  }
  midiaRender();
}

/* ------------------------------------------------------------- a gravação */
async function linkGravar(){
  const previa = LINK.previa || [];
  if (!previa.length) return;
  let trocados = 0, preenchidos = 0, novas = 0, pulados = 0;

  for (const p of previa){
    if (p.acao === 'sem-nome'){ pulados++; continue; }
    if (p.ficha){
      const atual = await dbGet('programas', p.ficha.id);
      if (!atual) continue;
      if (atual.url) trocados++; else preenchidos++;
      await dbPut('programas', Object.assign({}, atual, { url: p.url }));
    } else {
      await dbAdd('programas', {
        produto: p.nome, plataforma: p.loja ? p.loja.nome : 'Outra',
        url: p.url, tipo: 'Físico', comissao: 0, preco: 0,
        vendas: 0, ganhoTotal: 0, ativo: true, doLote: true
      });
      novas++;
    }
  }

  LINK.previa = null; LINK.texto = '';
  const partes = [];
  if (preenchidos) partes.push(preenchidos + ' produto(s) ganharam link');
  if (trocados)    partes.push(trocados + ' link(s) atualizados');
  if (novas)       partes.push(novas + ' ficha(s) novas');
  if (pulados)     partes.push(pulados + ' sem nome, ignorados');
  toast(partes.join(' · ') || 'Nada mudou.', 'ag');
  midiaRender();
}

function linkCancelar(){ LINK.previa = null; midiaRender(); }

/* =========================================================================
   A SHOPEE GERANDO SOZINHA
   ========================================================================= */
function shApp(){ return (typeof window !== 'undefined' && window.JeVDesktop) || null; }
function shTem(){ const d = shApp(); return !!(d && d.shGerar); }

const SH = { estado: null, gerando: false, passo: '' };

async function shVerEstado(){
  const d = shApp();
  if (!d || !d.shEstado){ SH.estado = { semApp: true }; return SH.estado; }
  try { SH.estado = await d.shEstado(); } catch (e) { SH.estado = { ok: false, motivo: String(e.message || e) }; }
  return SH.estado;
}

function shAbrirChave(){ LINK.chaveAberta = true; midiaRender(); }

async function shSalvarChave(){
  const d = shApp();
  const id = (val('sh-id') || '').trim();
  const seg = (document.getElementById('sh-seg') || {}).value || '';
  if (!id || !seg){ toast('Preciso do App ID e do App Secret.', 'aw'); return; }
  if (!d || !d.shGuardarChave){
    toast('A chave da Shopee só é guardada no aplicativo do Windows.', 'aw');
    return;
  }
  const r = await d.shGuardarChave(id, seg);
  /* limpa os campos na hora: o segredo não fica pendurado na tela */
  const a = document.getElementById('sh-id'); if (a) a.value = '';
  const b = document.getElementById('sh-seg'); if (b) b.value = '';
  if (!r || !r.ok){ toast((r && r.motivo) || 'Não consegui guardar.', 'aw'); return; }
  LINK.chaveAberta = false;
  toast('Chave guardada. Conferindo com a Shopee…', 'ai');
  await shVerEstado();
  midiaRender();
}

async function shEsquecerChave(){
  const d = shApp();
  if (!d || !d.shEsquecerChave) return;
  confirmar('Esquecer a chave da Shopee',
    '<p>O App ID e o App Secret saem deste computador. Os links já gerados ' +
    'continuam valendo — o que para é a geração automática de links novos.</p>',
    async function(){
      await d.shEsquecerChave();
      await shVerEstado();
      toast('Chave esquecida.', 'aw');
      midiaRender();
    });
}

/* os produtos da Shopee que estão sem link e têm endereço de produto */
async function shSemLink(){
  const progs = await dbGetAll('programas');
  const videos = await dbGetAll('videos');
  const porNome = {};
  videos.filter(function(v){ return v.origem === 'garimpo' && v.produto; })
        .forEach(function(v){ porNome[String(v.produto.n || '').trim().toLowerCase()] = v.produto; });

  return progs.filter(function(f){
    return f.ativo !== false && !f.url && /shopee/i.test(String(f.plataforma || ''));
  }).map(function(f){
    const prod = porNome[String(f.produto || '').trim().toLowerCase()];
    const url = (prod && prod.links && prod.links[0] && prod.links[0].url) || '';
    return { id: f.id, nome: f.produto, url: url };
  }).filter(function(x){ return /shopee\.com\.br/i.test(x.url); });
}

async function shGerarFaltantes(){
  const d = shApp();
  if (!shTem()){ toast('Isso só funciona no aplicativo do Windows.', 'aw'); return; }
  const lista = await shSemLink();
  if (!lista.length){
    toast('Nenhum produto da Shopee está esperando link — ou falta o endereço do anúncio.', 'aw');
    return;
  }
  SH.gerando = true; SH.passo = 'gerando ' + lista.length + ' link(s)…'; midiaRender();
  let r;
  try { r = await d.shGerar(lista, 'jev-grupo'); }
  catch (e) { r = { ok: false, motivo: String(e.message || e) }; }
  SH.gerando = false;

  if (!r || !r.ok){ toast((r && r.motivo) || 'Não consegui gerar.', 'aw'); midiaRender(); return; }

  let gravados = 0;
  for (const x of (r.resultados || [])){
    if (!x.ok || !x.link) continue;
    const f = await dbGet('programas', x.id);
    if (!f) continue;
    await dbPut('programas', Object.assign({}, f, { url: x.link }));
    gravados++;
  }
  const falhou = (r.resultados || []).filter(function(x){ return !x.ok; });
  toast(gravados + ' link(s) gerados pela Shopee.' +
        (falhou.length ? ' ' + falhou.length + ' não deram: ' + (falhou[0].motivo || '') : ''),
        gravados ? 'ag' : 'aw');
  midiaRender();
}

/* ------------------------------------------------------------------ a tela */
function linkPreviaHTML(){
  const p = LINK.previa;
  if (!p) return '';
  const conta = { trocar:0, preencher:0, nova:0, 'sem-nome':0 };
  p.forEach(function(x){ conta[x.acao] = (conta[x.acao] || 0) + 1; });

  let h = '<div class="sh" style="margin-top:12px"><i class="ti ti-eye"></i>' +
    'Confira antes de gravar — ' + p.length + ' endereço(s)</div>' +
    '<div class="tt" style="margin-bottom:8px">' +
      (conta.preencher ? '<b>' + conta.preencher + '</b> produto(s) sem link vão ganhar o seu. ' : '') +
      (conta.trocar ? '<b>' + conta.trocar + '</b> já tinham link e vão ser trocados. ' : '') +
      (conta.nova ? '<b>' + conta.nova + '</b> não bateram com nenhum produto e viram ficha nova — ' +
        'nenhum link é jogado fora. ' : '') +
      (conta['sem-nome'] ? '<b>' + conta['sem-nome'] + '</b> vieram sem nome nenhum e serão ignorados. ' : '') +
    '</div>' +
    '<div style="max-height:320px;overflow:auto"><table><thead><tr>' +
      '<th>O que veio colado</th><th>Loja</th><th>Vai para</th><th class="c">Certeza</th>' +
    '</tr></thead><tbody>';

  p.forEach(function(x){
    const cor = x.acao === 'trocar' ? 's-wn' : x.acao === 'nova' ? 's-nt'
              : x.acao === 'sem-nome' ? 's-er' : 's-ok';
    const diz = x.acao === 'trocar' ? 'troca o link de ' + x.ficha.produto
              : x.acao === 'preencher' ? x.ficha.produto
              : x.acao === 'nova' ? 'ficha nova'
              : 'ignorado — sem nome junto do link';
    h += '<tr><td><b>' + esc(x.nome || '(sem nome)') + '</b>' +
      '<div class="tt mono" style="max-width:300px;overflow:hidden;text-overflow:ellipsis">' +
      esc(x.url) + '</div></td>' +
      '<td>' + esc(x.loja ? x.loja.nome : '—') + '</td>' +
      '<td><span class="st ' + cor + '">' + esc(diz) + '</span></td>' +
      '<td class="c n">' + (x.certeza ? x.certeza + '%' : '—') + '</td></tr>';
  });

  h += '</tbody></table></div>' +
    '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn gn" onclick="linkGravar()">' +
        '<i class="ti ti-device-floppy"></i>Gravar estes links</button>' +
      '<button class="btn gh" onclick="linkCancelar()">Cancelar</button>' +
    '</div>';
  return h;
}

function shChaveHTML(){
  return '<div class="fr" style="margin-top:8px">' +
    '<div class="fg"><label>App ID</label>' +
      '<input id="sh-id" autocomplete="off" placeholder="1800300123"></div>' +
    '<div class="fg"><label>App Secret</label>' +
      '<input id="sh-seg" type="password" autocomplete="off" placeholder="cole aqui"></div>' +
    '</div>' +
    '<div class="tt" style="margin-top:6px">O segredo fica guardado só neste computador, ' +
      'num arquivo que só o seu usuário lê, e <b>nunca é enviado</b> — ele só entra no ' +
      'cálculo da assinatura de cada pedido. Eu não vejo esse segredo.</div>' +
    '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn gn" onclick="shSalvarChave()">' +
        '<i class="ti ti-key"></i>Guardar a chave</button>' +
      '<button class="btn gh" onclick="LINK.chaveAberta=false;midiaRender()">Cancelar</button>' +
    '</div>';
}

async function shSecaoHTML(){
  const e = SH.estado;
  let h = '<div class="sh" style="margin-top:14px"><i class="ti ti-bolt"></i>' +
    'Shopee — gerar os links sozinho</div>';

  if (!shTem())
    return h + '<div class="tt">A Shopee é a única das suas quatro lojas com API oficial de ' +
      'link de afiliado. Ligar isso só é possível no <b>aplicativo do Windows</b>, porque a ' +
      'chave precisa ficar guardada no computador, fora do navegador.</div>';

  if (LINK.chaveAberta) return h + shChaveHTML();

  if (!e || !e.temChave){
    h += '<div class="tt">Com a chave da Shopee guardada, todo produto Shopee que o garimpo ' +
      'achar vira link de afiliado sozinho — para sempre, sem você colar nada. ' +
      '<b>Você precisa pedir o acesso Open API</b> no painel de afiliados da Shopee; ' +
      'a liberação não é na hora e pode levar alguns dias.</div>' +
      '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn gn" onclick="shAbrirChave()">' +
          '<i class="ti ti-key"></i>Colar a minha chave da Shopee</button>' +
        '<button class="btn gh" onclick="abrirFora(\'https://affiliate.shopee.com.br/open_api\')">' +
          '<i class="ti ti-external-link"></i>Pedir o acesso Open API</button>' +
      '</div>';
    if (e && e.recado && e.temChave === false && !/liberado/.test(e.recado))
      h += '<div class="tt" style="margin-top:6px">' + esc(e.recado) + '</div>';
    return h;
  }

  h += '<div class="al ' + (e.valendo ? 'ag' : 'aw') + '">' +
    '<i class="ti ti-' + (e.valendo ? 'circle-check' : 'alert-triangle') + '"></i><div>' +
    '<b>Chave ' + esc(e.chave || '') + '</b> — ' + esc(e.recado || '') +
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
      (SH.gerando
        ? '<span class="tt"><i class="ti ti-loader"></i> ' + esc(SH.passo) + '</span>'
        : '<button class="btn xs gn" onclick="shGerarFaltantes()">' +
          '<i class="ti ti-bolt"></i>Gerar os links que faltam</button>') +
      '<button class="btn xs gh" onclick="shAbrirChave()">Trocar a chave</button>' +
      '<button class="btn xs rd" onclick="shEsquecerChave()">Esquecer</button>' +
    '</div></div></div>';
  return h;
}

async function linkSecaoHTML(){
  if (typeof shVerEstado === 'function' && !SH.estado && shTem()) { await shVerEstado(); }

  const fichas = await dbGetAll('programas');
  const semLink = fichas.filter(function(f){ return f.ativo !== false && !f.url; });

  let h = '<div class="card tw" style="margin-bottom:14px">' +
    '<div class="hd"><i class="ti ti-link-plus"></i>Carteira de links de afiliado' +
    (semLink.length ? '<span class="st s-wn">' + semLink.length + ' produto(s) sem link</span>'
                    : '<span class="st s-ok">todos com link</span>') +
    '</div><div class="bd">';

  h += '<div class="tt">Três das suas quatro lojas o sistema já resolve sozinho: ' +
    '<b>Amazon</b> pela fórmula pública, <b>Shopee</b> pela API oficial, e ' +
    '<b>Mercado Livre</b> pela janela aqui de cima. Sobra o <b>TikTok Shop</b>, que não tem ' +
    'nem fórmula nem API — o link só sai do painel de criador. Para ele, e para qualquer ' +
    'loja nova, gere vários de uma vez no painel e cole tudo aqui — do jeito que vier.</div>';

  h += '<textarea id="link-caixa" rows="6" placeholder="Cole aqui o que copiou do painel. ' +
    'Pode vir bagunçado: nome numa linha e link na outra, ou nome e link na mesma linha, ' +
    'com preço e comissão no meio. Eu separo." ' +
    'style="width:100%;box-sizing:border-box;margin-top:9px;font-size:12.5px">' +
    esc(LINK.texto || '') + '</textarea>' +
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button class="btn gn" onclick="linkConferir()">' +
        '<i class="ti ti-eye"></i>Conferir antes de gravar</button>' +
      '<span class="tt">Eu mostro o que vai acontecer com cada link. Nada é gravado ' +
        'até você aprovar.</span>' +
    '</div>';

  h += linkPreviaHTML();
  h += await shSecaoHTML();
  h += '</div></div>';
  return h;
}

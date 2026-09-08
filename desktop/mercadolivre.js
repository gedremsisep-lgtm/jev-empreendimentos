/* =========================================================================
   MERCADO LIVRE AFILIADOS — a lista com comissão e o link em lote

   O QUE ESTA PEÇA FAZ, E O QUE ELA NÃO FAZ
   ----------------------------------------
   Faz: abre uma janela do Mercado Livre onde O DONO entra na conta dele,
   lê a lista de produtos do hub de afiliados (que já vem com a comissão de
   cada um) e gera os links de afiliado dele em lote.

   NÃO faz: guardar senha, digitar senha, criar conta, comprar, publicar.
   Nenhuma credencial passa por aqui. A janela é do Mercado Livre; quem
   digita é ele; o que fica guardado é o cookie de sessão, na partição
   'persist:jev-loja' — a mesma do Kalodata, que já funciona assim.

   O ENDEREÇO INTERNO, E POR QUE ISSO PRECISA DE CUIDADO
   -----------------------------------------------------
   O Mercado Livre NÃO tem API pública de afiliado — isso é reclamação
   antiga e verdadeira. O que existe é o endereço que o próprio site usa
   quando ele clica em "Compartilhar":

     POST /affiliate-program/api/v2/affiliates/createLink

   Ele funciona, aceita vários produtos numa chamada só, e devolve o link
   curto em meli.la. Mas não é documentado: pode mudar de forma sem aviso.

   Por isso a regra desta peça, que está escrita nos testes: quando a
   resposta não vier no formato esperado, ela DIZ que não deu e manda colar
   em lote. Ela nunca inventa link, nunca devolve link pela metade, e nunca
   fica quieta. Link de afiliado errado é comissão perdida sem sintoma — o
   dono só descobriria semanas depois, na venda que não pagou.

   O PRESENTE QUE VEIO JUNTO
   -------------------------
   A resposta traz, além do link, um CÓDIGO DE BUSCA ("Cole este texto no
   buscador do Mercado Livre: CX0V3Z-J3FE"). Isso serve onde link de
   afiliado é barrado — no Instagram, por exemplo. Guardo junto.
   ========================================================================= */
/* O require do electron fica protegido: assim esta peça também CARREGA fora
   do aplicativo, e os testes conseguem provar a leitura da página e o
   formato do pedido sem precisar subir uma janela de verdade. */
let BrowserWindow = null;
try { ({ BrowserWindow } = require('electron')); } catch (e) {}

const BASE = process.env.JEV_ML_BASE || 'https://www.mercadolivre.com.br';
const HUB = '/afiliados/hub';
const ROTA_LINK = '/affiliate-program/api/v2/affiliates/createLink';
const PARTICAO = 'persist:jev-loja';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------------------------------------------------------------- a janela */
let janela = null;

async function abrir(mostrar) {
  if (!BrowserWindow) throw new Error('a janela do Mercado Livre só existe dentro do aplicativo');
  if (janela && !janela.isDestroyed()) {
    if (mostrar) { try { janela.show(); janela.focus(); } catch (e) {} }
    return janela;
  }
  janela = new BrowserWindow({
    show: !!mostrar,
    width: 1280, height: 900,
    title: 'JeV — Mercado Livre Afiliados',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      partition: PARTICAO, backgroundThrottling: false
    }
  });
  janela.on('closed', () => { janela = null; });
  await janela.loadURL(BASE + HUB, { userAgent: UA });
  await esperar(mostrar ? 1500 : 3500);
  return janela;
}

function fechar() {
  try { if (janela && !janela.isDestroyed()) janela.destroy(); } catch (e) {}
  janela = null;
  return true;
}

/* roda um trecho DENTRO da página do Mercado Livre, com os cookies dela */
async function naPagina(script) {
  const j = await abrir(false);
  return await j.webContents.executeJavaScript(script, true);
}

/* O ponto por onde o teste entra.

   Tudo que esta peça faz de arriscado é ler uma página que não é minha e
   falar com um endereço que não é documentado. Poder trocar QUEM executa o
   trecho é o que me deixa provar, sem janela e sem internet, que a leitura
   acerta e que a recusa acontece quando o formato muda. */
let executor = naPagina;
function definirExecutor(fn) { executor = fn || naPagina; }

/* ------------------------------------------------------------- o estado */
/* A pergunta é só uma: ele já entrou na conta? O hub só mostra o perfil de
   afiliado para quem está logado, então é isso que eu procuro. */
const LER_PERFIL =
  '(() => { try {' +
  '  const t = document.body ? document.body.innerText : "";' +
  '  const dentro = /Perfil de afiliado/i.test(t);' +
  '  const m = t.match(/\\b(jl\\d{10,})\\b/);' +
  '  const pediuLogin = /Iniciar sess|Entre na sua conta|Digite seu e-mail/i.test(t);' +
  '  return { dentro, tag: m ? m[1] : null, pediuLogin, endereco: location.pathname };' +
  '} catch (e) { return { erro: String(e && e.message || e) }; } })()';

async function estado() {
  let r;
  try { r = await executor(LER_PERFIL); }
  catch (e) { return { conectado: false, motivo: 'não consegui abrir o Mercado Livre: ' +
                                                 ((e && e.message) || e) }; }
  if (!r || r.erro)
    return { conectado: false, motivo: 'a página do Mercado Livre não respondeu' +
                                       (r && r.erro ? ' (' + r.erro + ')' : '') };
  if (!r.dentro)
    return { conectado: false, precisaEntrar: true,
             motivo: r.pediuLogin
               ? 'o Mercado Livre está pedindo o seu login — clique em Entrar e faça na janela dele'
               : 'você ainda não entrou na sua conta de afiliado do Mercado Livre' };

  return { conectado: true, motivo: '', tag: r.tag || '' };
}

/* --------------------------------------------------------- os produtos */
/* Lê os cartões do hub. Cada um já traz a comissão — que é o número que
   decide se vale a pena gravar um vídeo sobre aquele produto. */
const LER_PRODUTOS =
  '(() => { try {' +
  '  const num = s => s==null ? null : Number(String(s).replace(/\\./g,"").replace(",","."));' +
  '  const cards = [...document.querySelectorAll("li.poly-card")];' +
  '  const lista = cards.map(el => {' +
  '    const t = (el.textContent||"").replace(/\\s+/g," ");' +
  '    const a = el.querySelector("a[href]");' +
  '    const h = a ? a.getAttribute("href").split("?")[0] : "";' +
  '    const com = t.match(/GANHOS\\s*(?:EXTRAS\\s*)?(\\d+)%/);' +
  '    const fr = [...el.querySelectorAll(".andes-money-amount")].map(x => {' +
  '      const i = x.querySelector(".andes-money-amount__fraction");' +
  '      const c = x.querySelector(".andes-money-amount__cents");' +
  '      return i ? num(i.textContent) + (c ? num(c.textContent)/100 : 0) : null;' +
  '    }).filter(v => v);' +
  '    const vd = t.match(/\\+\\s?(\\d+)\\s?(mil|M)? vendidos/);' +
  '    let v = vd ? Number(vd[1]) : null;' +
  '    if (vd && vd[2] === "mil") v *= 1000;' +
  '    if (vd && vd[2] === "M") v *= 1000000;' +
  '    const tit = el.querySelector(".poly-component__title");' +
  '    return {' +
  '      mlb: ((h.match(/(MLB-?\\d{6,})/)||[])[1]||"").replace("-",""),' +
  '      url: h ? (h.indexOf("http")===0 ? h : location.origin + h) : "",' +
  '      n: tit ? tit.textContent.trim() : "",' +
  '      comissao: com ? Number(com[1]) : null,' +
  '      extras: /GANHOS\\s*EXTRAS/i.test(t),' +
  '      de: fr.length > 1 ? Math.max.apply(null, fr) : null,' +
  '      preco: fr.length ? Math.min.apply(null, fr) : null,' +
  '      nota: Number((t.match(/(\\d[.,]\\d)\\s*\\|/)||[])[1]) || null,' +
  '      vend: v,' +
  '      selo: (t.match(/(MAIS VENDIDO|MAIS BUSCADO|MAIS COMPARTILHADO|OFERTA IMPERD[ÍI]VEL)/)||[])[1]||null,' +
  '      capa: (el.querySelector("img")||{}).src || ""' +
  '    };' +
  '  }).filter(p => p.mlb && p.n);' +
  '  const txt = document.body ? document.body.innerText : "";' +
  '  return { lista, ehOHub: /Produtos selecionados|Perfil de afiliado/i.test(txt),' +
  '           cartoesCrus: cards.length };' +
  '} catch (e) { return { erro: String(e && e.message || e) }; } })()';

/* o ganho por venda: é o que interessa, e o site não mostra pronto */
function ganhoPorVenda(p) {
  if (!p || !p.preco || !p.comissao) return null;
  return Math.round(p.preco * p.comissao) / 100;
}

async function garimpar(opcoes) {
  const o = opcoes || {};
  const est = await estado();
  if (!est.conectado)
    return { ok: false, achados: [], precisaEntrar: true, motivo: est.motivo };

  let r;
  try { r = await executor(LER_PRODUTOS); }
  catch (e) { return { ok: false, achados: [],
                       motivo: 'não consegui ler a lista: ' + ((e && e.message) || e) }; }

  const recado = 'A página de afiliados do Mercado Livre mudou de forma e eu não ' +
    'reconheci a lista de produtos. Nada foi inventado. Use a colagem em lote na ' +
    'Carteira de links enquanto eu não me acerto com o novo formato.';

  if (!r || r.erro || !Array.isArray(r.lista))
    return { ok: false, achados: [], mudouDeForma: true, motivo: recado };

  /* O CASO SILENCIOSO, QUE É O PERIGOSO.
   *
   * Se o Mercado Livre trocar o nome das classes do HTML, a leitura devolve
   * uma lista VAZIA — que é um resultado perfeitamente válido e mentiroso.
   * O sistema diria "nenhum produto encontrado" para sempre, e o dono
   * continuaria abrindo a tela achando que o garimpo está funcionando.
   *
   * Estar no hub e não achar NENHUM cartão não é "não tem produto": é não
   * ter entendido a página. Isso tem que gritar, não emudecer. */
  if (r.ehOHub && !r.lista.length)
    return { ok: false, achados: [], mudouDeForma: true, motivo: recado };

  let achados = r.lista.map(p => Object.assign({}, p, { ganho: ganhoPorVenda(p) }));

  /* filtros que valem a pena: teto de preço e ganho mínimo por venda */
  const teto = Number(o.teto) || 0;
  const ganhoMin = Number(o.ganhoMin) || 0;
  if (teto) achados = achados.filter(p => !p.preco || p.preco <= teto);
  if (ganhoMin) achados = achados.filter(p => (p.ganho || 0) >= ganhoMin);
  if (o.soExtras) achados = achados.filter(p => p.extras);

  /* o que paga mais na frente — é a ordem que o dono usaria na mão */
  achados.sort((a, b) => (b.ganho || 0) - (a.ganho || 0));
  const quantos = Math.min(Math.max(Number(o.quantos) || 12, 1), 50);
  achados = achados.slice(0, quantos);

  return { ok: true, achados: achados, tag: est.tag || '', naPagina: r.lista.length };
}

/* ------------------------------------------------------------- os links */
/* Em lote, numa chamada só. Conferido na conta do dono: 3 produtos,
   3 links, zero erro. */
function scriptDeLinks(tag, urls) {
  return '(async () => { try {' +
    '  const r = await fetch(' + JSON.stringify(ROTA_LINK) + ', {' +
    '    method: "POST", credentials: "include",' +
    '    headers: {"Content-Type":"application/json"},' +
    '    body: JSON.stringify(' + JSON.stringify({
           tag: String(tag || ''), type: 'product',
           urls: urls, extraCommission: false
         }) + ')' +
    '  });' +
    '  const t = await r.text();' +
    '  try { return { http: r.status, corpo: JSON.parse(t) }; }' +
    '  catch (e) { return { http: r.status, texto: t.slice(0, 300) }; }' +
    '} catch (e) { return { erro: String(e && e.message || e) }; } })()';
}

async function gerarLinks(itens, tag) {
  const lista = (Array.isArray(itens) ? itens : []).filter(x => x && x.url);
  if (!lista.length) return { ok: false, motivo: 'Nenhum produto com endereço para gerar link.' };

  const est = await estado();
  if (!est.conectado)
    return { ok: false, precisaEntrar: true, motivo: est.motivo };

  const etiqueta = String(tag || est.tag || '').trim();
  if (!etiqueta)
    return { ok: false, motivo: 'Não achei a sua etiqueta de afiliado no hub do Mercado Livre. ' +
                                'Abra a janela e confira se o Perfil de afiliado aparece.' };

  /* de 20 em 20: o site aguenta o lote, mas pedido gigante é convite a
     tomar bloqueio, e um erro no meio derrubaria tudo de uma vez */
  const saida = [];
  for (let i = 0; i < lista.length; i += 20) {
    const pedaco = lista.slice(i, i + 20);
    let r;
    try { r = await executor(scriptDeLinks(etiqueta, pedaco.map(x => x.url))); }
    catch (e) { r = { erro: String((e && e.message) || e) }; }

    if (!r || r.erro || r.http !== 200 || !r.corpo || !Array.isArray(r.corpo.urls)) {
      return { ok: false, mudouDeForma: true, feitos: saida.length, resultados: saida,
               motivo: 'O gerador de links do Mercado Livre não respondeu como eu esperava' +
                       (r && r.http ? ' (respondeu ' + r.http + ')' : '') + '. ' +
                       'Como esse endereço é interno do site deles e não é documentado, ele pode ' +
                       'ter mudado. Não inventei nenhum link. Gere no painel e cole em lote na ' +
                       'Carteira de links.' };
    }

    r.corpo.urls.forEach((u, k) => {
      const dono = pedaco[k] || {};
      const curto = u && (u.short_url || u.shortUrl);
      saida.push({
        mlb: dono.mlb || '', nome: dono.n || '',
        ok: !!curto, link: curto || '',
        /* o código de busca, para onde link de afiliado é barrado */
        codigoBusca: (String((u && u.text) || '').match(/[A-Z0-9]{4,}-[A-Z0-9]{3,}/) || [''])[0],
        motivo: curto ? '' : 'o Mercado Livre não devolveu o link deste'
      });
    });
    if (i + 20 < lista.length) await esperar(400);
  }

  return { ok: true, resultados: saida, tag: etiqueta,
           feitos: saida.filter(x => x.ok).length };
}

/* garimpar e já gerar os links, que é o que o dono quer de verdade */
async function garimparComLinks(opcoes) {
  const g = await garimpar(opcoes);
  if (!g.ok) return g;
  if (!g.achados.length) return Object.assign({}, g, { comLink: 0 });

  const l = await gerarLinks(g.achados, g.tag);
  if (!l.ok) return Object.assign({}, g, { linksFalharam: true, motivoLinks: l.motivo });

  const porMlb = {};
  l.resultados.forEach(x => { if (x.ok) porMlb[x.mlb] = x; });
  const achados = g.achados.map(p => {
    const x = porMlb[p.mlb];
    return Object.assign({}, p, { link: x ? x.link : '', codigoBusca: x ? x.codigoBusca : '' });
  });
  return { ok: true, achados: achados, tag: g.tag,
           comLink: achados.filter(p => p.link).length };
}

module.exports = {
  abrir, fechar, estado, garimpar, gerarLinks, garimparComLinks,
  ganhoPorVenda, LER_PRODUTOS, LER_PERFIL, scriptDeLinks, ROTA_LINK, BASE,
  definirExecutor
};

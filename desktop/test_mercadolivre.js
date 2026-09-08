/* =========================================================================
   A PONTE COM O MERCADO LIVRE, PROVADA SEM ABRIR JANELA

   Esta peça faz duas coisas arriscadas por natureza: lê uma página que não
   é minha, e fala com um endereço interno que o Mercado Livre não
   documenta. As duas podem mudar de um dia para o outro sem aviso.

   Então o que este arquivo cobra, em ordem de importância:

     1. QUANDO O FORMATO MUDAR, ELA RECUSA E EXPLICA. Não inventa link, não
        devolve link pela metade, não fica quieta. Link de afiliado errado
        é comissão perdida sem sintoma nenhum — o dono só descobriria
        semanas depois, na venda que não pagou.
     2. A leitura da página acerta os números que decidem o trabalho:
        comissão, preço e o ganho por venda.
     3. O pedido de link sai no formato certo, com a etiqueta DELE.
     4. Nenhuma senha, nenhum login, nenhuma credencial passa por aqui.

   A leitura roda num Chromium de verdade contra um Mercado Livre de
   mentira, montado com a mesma estrutura de HTML do site real.

   Rode assim:  node desktop/test_mercadolivre.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

const ml = require(path.join(__dirname, 'mercadolivre.js'));

let falhas = 0;
function ok(nome, valor) {
  if (valor === true) { console.log('  OK    ' + nome); return; }
  falhas++;
  console.log(' FALHA  ' + nome + '  → ' + String(JSON.stringify(valor)).slice(0, 280));
}

/* ---------------------------------------------- o Mercado Livre de mentira */
function cartao(p) {
  return '<li class="andes-card poly-card poly-card--grid-card">' +
    '<a href="/' + p.slug + '/p/' + p.mlb + '?pdp_filters=x">' +
    '<img src="https://http2.mlstatic.com/' + p.mlb + '.webp"></a>' +
    '<span>' + (p.selo || '') + '</span>' +
    '<h3 class="poly-component__title">' + p.n + '</h3>' +
    '<span>' + (p.nota ? p.nota + ' | ' : '') + '+' + p.vendidos + ' vendidos</span>' +
    '<span>GANHOS ' + (p.extras ? '<i>EXTRAS</i> ' : '') + p.comissao + '%</span>' +
    (p.de ? '<span class="andes-money-amount"><span class="andes-money-amount__fraction">' +
            p.de.i + '</span><span class="andes-money-amount__cents">' + p.de.c + '</span></span>' : '') +
    '<span class="andes-money-amount"><span class="andes-money-amount__fraction">' +
      p.preco.i + '</span><span class="andes-money-amount__cents">' + p.preco.c + '</span></span>' +
    '<button>Compartilhar</button></li>';
}

const PRODUTOS = [
  { mlb:'MLB57490176', slug:'refletor', n:'Kit 2 Refletor Super Led 400w Ip67',
    selo:'MAIS VENDIDO', nota:'4.7', vendidos:'50mil', comissao:62, extras:true,
    de:{i:'99',c:'98'}, preco:{i:'43',c:'77'} },
  { mlb:'MLB50997439', slug:'guarda-roupa', n:'Guarda-Roupa Paris 8 Portas',
    selo:'MAIS VENDIDO', nota:'4.6', vendidos:'1000', comissao:12, extras:false,
    de:{i:'1.188',c:'00'}, preco:{i:'940',c:'49'} },
  { mlb:'MLB54961556', slug:'galaxy', n:'Smartphone Samsung Galaxy A07 4G 256GB',
    selo:'MAIS VENDIDO', nota:'4.9', vendidos:'50mil', comissao:5, extras:false,
    de:{i:'1.799',c:'00'}, preco:{i:'879',c:'00'} },
  { mlb:'MLB3750173337', slug:'bermuda', n:'Bermuda Shorts Legging Compressão',
    selo:'MAIS BUSCADO', nota:'4.9', vendidos:'1000', comissao:16, extras:false,
    de:null, preco:{i:'94',c:'91'} }
];

function paginaLogado() {
  return '<!doctype html><html><body>' +
    '<h2>Perfil de afiliado</h2><p>jl20260908183348982</p>' +
    '<h2>Produtos selecionados para você</h2>' +
    '<ul>' + PRODUTOS.map(cartao).join('') + '</ul></body></html>';
}
function paginaDeslogado() {
  return '<!doctype html><html><body><h1>Iniciar sessão</h1>' +
    '<p>Digite seu e-mail ou telefone</p></body></html>';
}
function paginaMudada() {
  return '<!doctype html><html><body><h2>Perfil de afiliado</h2>' +
    '<p>jl20260908183348982</p>' +
    '<div class="novo-formato-que-eu-nao-conheco">produtos aqui</div></body></html>';
}

(async () => {
  const navegador = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const pagina = await (await navegador.newContext()).newPage();

  /* o executor de teste: roda o mesmo trecho que a janela rodaria, mas na
     página de mentira — e é aqui que eu troco o Mercado Livre por um que eu
     controlo, inclusive quebrado de propósito */
  let respostaDoLink = null;
  function usar(html) {
    ml.definirExecutor(async (script) => {
      await pagina.setContent(html, { waitUntil: 'domcontentloaded' });
      if (/createLink/.test(script)) return respostaDoLink;
      return await pagina.evaluate(script);
    });
  }

  console.log('\nponte com o Mercado Livre — site de mentira, mesma estrutura\n');

  console.log('1) ele entrou na conta?');
  usar(paginaDeslogado());
  const e1 = await ml.estado();
  ok('deslogado: diz que não está conectado', e1.conectado === false ? true : e1);
  ok('e manda ele entrar na janela, sem pedir senha aqui',
    e1.precisaEntrar === true && /faça na janela dele/.test(e1.motivo) ? true : e1);

  usar(paginaLogado());
  const e2 = await ml.estado();
  ok('logado: reconhece', e2.conectado === true ? true : e2);
  ok('e acha a etiqueta de afiliado dele sozinho',
    e2.tag === 'jl20260908183348982' ? true : e2.tag);

  console.log('\n2) a leitura da lista, que é onde mora o dinheiro');
  const g = await ml.garimpar({ quantos: 10 });
  ok('achou os quatro produtos', g.ok && g.achados.length === 4 ? true : g);

  const refletor = g.achados.find(p => /Refletor/.test(p.n));
  ok('id do produto sai certo do endereço', refletor.mlb === 'MLB57490176' ? true : refletor.mlb);
  ok('e o endereço fica inteiro, para gerar o link depois',
    /\/p\/MLB57490176$/.test(refletor.url) ? true : refletor.url);
  ok('a comissão é lida', refletor.comissao === 62 ? true : refletor.comissao);
  ok('e o "GANHOS EXTRAS" é reconhecido como extra', refletor.extras === true);
  ok('o preço com centavos', refletor.preco === 43.77 ? true : refletor.preco);
  ok('o preço cheio, para mostrar o desconto', refletor.de === 99.98 ? true : refletor.de);
  ok('a nota', refletor.nota === 4.7 ? true : refletor.nota);
  ok('"50mil vendidos" vira 50000', refletor.vend === 50000 ? true : refletor.vend);
  ok('o selo', refletor.selo === 'MAIS VENDIDO' ? true : refletor.selo);

  ok('O GANHO POR VENDA — o número que decide tudo',
    refletor.ganho === 27.14 ? true : refletor.ganho);
  ok('preço com milhar não vira número errado',
    g.achados.find(p => /Guarda-Roupa/.test(p.n)).preco === 940.49 ? true :
    g.achados.find(p => /Guarda-Roupa/.test(p.n)).preco);
  ok('produto sem preço cheio não inventa desconto',
    g.achados.find(p => /Bermuda/.test(p.n)).de === null ? true : 'inventou');

  console.log('\n3) a ordem e os filtros');
  ok('o que paga mais vem na frente', g.achados[0].ganho >= g.achados[1].ganho ? true :
    g.achados.map(p => p.ganho));
  const gt = await ml.garimpar({ teto: 100 });
  ok('teto de preço corta o que é caro demais',
    gt.achados.every(p => p.preco <= 100) ? true : gt.achados.map(p => p.preco));
  /* Guarda-Roupa 940,49 x 12% = 112,86 | Galaxy 879 x 5% = 43,95 |
     Refletor 43,77 x 62% = 27,14 | Bermuda 94,91 x 16% = 15,19.
     Com o mínimo em R$ 20 só a Bermuda cai fora — eu tinha errado a conta
     na primeira versão deste teste, e o código estava certo. */
  const gm = await ml.garimpar({ ganhoMin: 20 });
  ok('ganho mínimo deixa só o que vale o trabalho',
    gm.achados.length === 3 && !gm.achados.some(p => /Bermuda/.test(p.n)) ? true :
    gm.achados.map(p => p.n + ' R$' + p.ganho));
  const gx = await ml.garimpar({ soExtras: true });
  ok('e dá para pedir só os de ganhos extras',
    gx.achados.length === 1 && gx.achados[0].extras ? true : gx.achados.length);

  console.log('\n4) o pedido do link sai no formato certo');
  const s = ml.scriptDeLinks('jl20260908183348982',
    ['https://www.mercadolivre.com.br/a/p/MLB1', 'https://www.mercadolivre.com.br/b/p/MLB2']);
  const corpo = JSON.parse(s.match(/JSON\.stringify\((\{.*?\})\)/s)[1]);
  ok('vai para o endereço certo', s.includes(ml.ROTA_LINK));
  ok('leva a etiqueta DELE', corpo.tag === 'jl20260908183348982' ? true : corpo.tag);
  ok('type = product', corpo.type === 'product');
  ok('urls é uma LISTA — é isso que faz o lote', Array.isArray(corpo.urls) && corpo.urls.length === 2);
  ok('e manda os cookies da sessão dele', /credentials: "include"/.test(s));
  ok('nenhuma senha, token ou chave no pedido',
    !/senha|password|token|secret|authorization/i.test(s) ? true : 'tem credencial no pedido');

  console.log('\n5) gerar os links de verdade');
  respostaDoLink = { http: 200, corpo: { status: 200, total_items: 4, total_success: 4,
    total_error: 0, urls: [
      { short_url: 'https://meli.la/AAA1', text: '🔍 Cole este texto no buscador do Mercado Livre: CX0V3Z-J3FE' },
      { short_url: 'https://meli.la/BBB2', text: '🔍 Cole este texto: CX0V3Z-1XCM' },
      { short_url: 'https://meli.la/CCC3', text: '' },
      { short_url: 'https://meli.la/DDD4', text: '' }
    ] } };
  const l = await ml.gerarLinks(g.achados, 'jl20260908183348982');
  ok('gerou os quatro', l.ok && l.feitos === 4 ? true : l);
  ok('cada link volta colado no produto certo',
    l.resultados[0].mlb === g.achados[0].mlb ? true :
    { link: l.resultados[0].mlb, produto: g.achados[0].mlb });
  ok('o link é o curto do Mercado Livre',
    /^https:\/\/meli\.la\//.test(l.resultados[0].link) ? true : l.resultados[0].link);
  ok('e o CÓDIGO DE BUSCA vem junto — serve onde link é barrado',
    l.resultados[0].codigoBusca === 'CX0V3Z-J3FE' ? true : l.resultados[0].codigoBusca);

  console.log('\n6) garimpar e gerar numa tacada só');
  const gl = await ml.garimparComLinks({ quantos: 4 });
  ok('volta a lista já com os links dentro',
    gl.ok && gl.comLink === 4 ? true : gl);
  ok('e cada produto ficou com o SEU link',
    gl.achados.every(p => p.link && /meli\.la/.test(p.link)) ? true :
    gl.achados.map(p => p.link));

  console.log('\n7) QUANDO O MERCADO LIVRE MUDAR — a parte que mais importa');

  usar(paginaMudada());
  const gm2 = await ml.garimpar({});
  ok('lista em formato desconhecido: NÃO devolve produto nenhum',
    gm2.ok === false && (!gm2.achados || !gm2.achados.length) ? true : gm2);
  ok('avisa que a página mudou de forma', gm2.mudouDeForma === true ? true : gm2);
  ok('e manda colar em lote enquanto isso',
    /colagem em lote|Carteira de links/i.test(gm2.motivo) ? true : gm2.motivo);

  usar(paginaLogado());
  respostaDoLink = { http: 500, texto: 'erro no servidor' };
  const l500 = await ml.gerarLinks(g.achados, 'jl2026');
  ok('gerador fora do ar: recusa em vez de inventar',
    l500.ok === false ? true : l500);
  ok('diz o número que voltou, para dar para investigar',
    /respondeu 500/.test(l500.motivo) ? true : l500.motivo);
  ok('e explica que o endereço é interno e pode ter mudado',
    /interno do site deles/.test(l500.motivo) ? true : l500.motivo);

  respostaDoLink = { http: 200, corpo: { status: 200, algumaCoisaNova: [] } };
  const lforma = await ml.gerarLinks(g.achados, 'jl2026');
  ok('resposta 200 mas em formato novo: também recusa',
    lforma.ok === false && lforma.mudouDeForma === true ? true : lforma);

  respostaDoLink = { http: 200, corpo: { status: 200, urls: [
    { short_url: 'https://meli.la/AAA1' }, { short_url: '' },
    { short_url: 'https://meli.la/CCC3' }, { short_url: '' } ] } };
  const lmeio = await ml.gerarLinks(g.achados, 'jl2026');
  ok('link faltando no meio: os bons passam, os ruins ficam marcados',
    lmeio.ok && lmeio.feitos === 2 &&
    lmeio.resultados.filter(x => !x.ok).length === 2 ? true :
    { feitos: lmeio.feitos, resultados: lmeio.resultados.map(x => x.ok) });
  ok('e o que falhou diz por quê',
    /não devolveu o link/.test((lmeio.resultados.find(x => !x.ok) || {}).motivo || '')
      ? true : 'sem motivo');

  console.log('\n8) sem etiqueta e sem login, ela não tenta');
  respostaDoLink = null;
  usar(paginaDeslogado());
  const lsem = await ml.gerarLinks(g.achados, '');
  ok('deslogado não gera link', lsem.ok === false && lsem.precisaEntrar === true ? true : lsem);
  ok('lista vazia é recusada antes de qualquer chamada',
    (await ml.gerarLinks([], 'jl2026')).ok === false ? true : 'tentou com lista vazia');

  console.log('\n9) o que esta peça NÃO faz');
  const fonte = [ml.estado, ml.garimpar, ml.gerarLinks, ml.garimparComLinks]
    .map(f => f.toString()).join('\n') + ml.LER_PERFIL + ml.LER_PRODUTOS;
  ok('não digita, não guarda e não lê senha',
    !/senha|password|\.value\s*=|type="password"/i.test(fonte) ? true : 'mexe com senha');
  ok('não compra nem finaliza pedido',
    !/comprar|checkout|finalizar|carrinho/i.test(fonte) ? true : 'tem caminho de compra');
  ok('e não publica nada em lugar nenhum',
    !/publicar|postar|share\(|submit/i.test(fonte) ? true : 'tem caminho de publicação');

  console.log('');
  console.log(falhas ? falhas + ' FALHA(S)'
    : 'Tudo certo — lê a comissão, gera o link em lote, e recusa quando o site muda.');
  await navegador.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('EXPLODIU:', e); process.exit(1); });

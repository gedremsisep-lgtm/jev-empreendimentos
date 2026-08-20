/* =========================================================================
   O prompt de PESSOA USANDO O PRODUTO.

   O que este teste protege: o vídeo antigo mostrava "um pedacinho do
   produto" e não vendia. O conserto foi um prompt que descreve alguém
   pegando, usando e reagindo — e que reconhece o TIPO do produto, porque
   protetor solar não se usa como panela nem como bicicleta.

   Rodar:  node test_pessoa.js
   ========================================================================= */
const { chromium } = require('/root/jev/node_modules/playwright');

let falhas = 0;
const erros = [];
const ok = (t, v) => {
  if (v === true) { console.log('  OK    ' + t); return; }
  falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v).slice(0, 240));
};

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await b.newPage();
  page.on('pageerror', e => erros.push(String(e.message)));
  await page.goto('file:///root/jev/jev_empreendimentos.html');
  await page.waitForTimeout(2500);

  /* =================================== 1) reconhecer o tipo pelo nome */
  console.log('\n1) o produto é reconhecido pelo próprio nome');
  const casos = [
    ['Hidrabene Protetor solar facial fps 70 Uniformizador', 'pele'],
    ['Zencial Envy Skin GHK-CU - Sérum com Peptídeos',       'pele'],
    ['GOKOCO Escova modeladora de íons negativos',           'cabelo'],
    ['Combo 3 Unidades - Magnésio & Inositol Bodyalive',     'suplemento'],
    ['Jogo de Panelas 10 Peças Antiaderente com Tampa',      'cozinha'],
    ['Air Fryer Fritadeira Elétrica 5L Digital',             'eletro'],
    ['Limpador Multiuso Desengordurante 500ml',              'limpeza'],
    ['Bicicleta Bike Ergométrica Spining Academia 120kg',    'fitness'],
    ['Calça Pantalona Cintura Alta com Amarração',           'moda'],
    ['Kit Coala Home Orquídea Negra difusor de ambiente',    'aroma'],
    ['Capa de Celular Anti-Impacto para iPhone',             'acessorio'],
    ['Organizador de Gaveta Dobrável 6 Divisórias',          'organizacao']
  ];
  const vistos = await page.evaluate(cs => cs.map(c => pessFamiliaId(c[0])), casos);
  casos.forEach((c, i) => {
    ok('"' + c[0].slice(0, 34) + '" → ' + c[1], vistos[i] === c[1] ? true : vistos[i]);
  });

  /* um nome que não bate com nada não pode quebrar */
  const desconhecido = await page.evaluate(() => pessFamiliaId('Coisa Xyz Abc 123'));
  ok('nome que não bate com nada cai num tipo válido, sem quebrar',
    !!(await page.evaluate(id => !!PESS_FAMILIAS[id], desconhecido)) ? true : desconhecido);

  /* =================================== 2) a pessoa aparece de verdade */
  console.log('\n2) o prompt descreve uma PESSOA, não só o produto');
  const t = await page.evaluate(() => pessPromptTexto(
    { n: 'Hidrabene Protetor solar facial fps 70', vend: 54265, rating: 4.8 }, '9:16 (vertical)'));

  ok('tem as cinco cenas', (t.match(/=== CENA \d de 5/g) || []).length === 5 ? true : t.slice(0, 80));
  ok('a primeira cena mostra a pessoa com o problema, antes do produto',
    /A pessoa e o problema/.test(t) ? true : 'não tem');
  ok('uma cena é ela PEGANDO o produto', /Ela pega o produto/.test(t) ? true : 'não tem');
  ok('uma cena é ela USANDO de verdade', /Ela usa de verdade/.test(t) ? true : 'não tem');
  ok('uma cena mostra o BENEFÍCIO aparecendo', /O benefício aparece/.test(t) ? true : 'não tem');
  ok('e a última é ela recomendando na câmera', /Ela recomenda/.test(t) ? true : 'não tem');

  ok('descreve uma pessoa brasileira de verdade, com textura de pele',
    /Brazilian woman/.test(t) && /real skin texture/.test(t) ? true : 'não descreve');
  ok('o rosto E as mãos entram no quadro na cena de uso',
    /Both her face and her hands are in frame/.test(t) ? true : 'não pediu rosto e mãos');
  ok('e manda a câmera acompanhar o movimento, sem corte',
    /One continuous shot, no cuts/.test(t) ? true : 'não pediu plano contínuo');

  /* =================================== 3) o manuseio é o certo para o tipo */
  console.log('\n3) o manuseio é o daquele produto, não um genérico');
  ok('protetor solar: ela espalha em círculos até sumir na pele',
    /spreads it in slow upward circles until it disappears into the skin/.test(t) ? true : 'genérico');

  const tPanela = await page.evaluate(() => pessPromptTexto({ n: 'Jogo de Panelas Antiaderente' }, '9:16 (vertical)'));
  ok('panela: ela quebra o ovo sem óleo e vira com a espátula',
    /cracks an egg straight onto the dry surface with no oil/.test(tPanela) ? true : 'genérico');
  ok('e o benefício é o ovo não grudar, visível no plano',
    /sliding freely across the surface with nothing sticking/.test(tPanela) ? true : 'não mostra');

  const tBike = await page.evaluate(() => pessPromptTexto({ n: 'Bicicleta Ergométrica Spinning' }, '9:16 (vertical)'));
  ok('bicicleta: ele pedala e o suor aparece',
    /sweat forming on the forehead/.test(tBike) ? true : 'genérico');
  ok('e é um homem que aparece, não a mesma mulher de tudo',
    /Brazilian man/.test(tBike) ? true : 'usou a mesma pessoa para tudo');

  const tSup = await page.evaluate(() => pessPromptTexto({ n: 'Magnésio Dimalato com Vitamina B6' }, '9:16 (vertical)'));
  ok('suplemento: ela toma a cápsula com água, consumindo mesmo',
    /puts them in her mouth and drinks the whole glass/.test(tSup) ? true : 'genérico');

  /* =================================== 4) os benefícios são ditos */
  console.log('\n4) os benefícios entram escritos e falados');
  ok('o prompt lista os benefícios que o vídeo precisa mostrar',
    /BENEFÍCIOS QUE O VÍDEO PRECISA MOSTRAR/.test(t) ? true : 'não lista');
  ok('e eles são do produto certo',
    /pele protegida o dia inteiro/.test(t) ? true : 'benefício errado');
  ok('a narração fala o benefício em palavra de gente',
    /Pele protegida o dia inteiro\./.test(t) ? true : 'não fala');
  ok('e usa a prova de vendas em número redondo, como se fala',
    /54 mil pessoas compraram/.test(t) ? true : 'não usou a prova');

  /* =================================== 5) segurar o produto certo */
  console.log('\n5) o produto não pode virar outro produto');
  ok('o prompt manda manter forma, cor e proporção do produto',
    /keep its shape, colour and proportions exactly/.test(t) ? true : 'não travou o produto');
  ok('e pede a foto de referência em todas as cenas',
    /use a foto do\nproduto em TODAS as cenas/.test(t) ? true : 'não pediu referência');
  ok('o negativo proíbe produto deformado e produto trocado',
    /deformed product, wrong product, changing product between shots/.test(t) ? true : 'faltou');
  ok('e proíbe cara de banco de imagens',
    /model-like face/.test(t) && /stock footage look/.test(t) ? true : 'faltou');
  ok('o nome curto não termina num caco solto',
    !/protetor solar facial fps/i.test(t.split('\n').find(l => l.includes('the real product is')) || '')
      ? true : 'cortou no meio');

  /* ============= 5b) a pessoa aparece em TODA cena, e nada sai cortado

     Os dois defeitos que o dono viu no vídeo pronto: produto cortado nas
     bordas e cena nenhuma com gente. As IAs de vídeo escorregam para
     "vitrine girando" quando o texto fala muito do objeto — por isso a
     regra tem que estar repetida em CADA cena, não só no cabeçalho.      */
  console.log('\n5b) a pessoa aparece em toda cena e o produto não sai cortado');
  const corpos = t.split(/=== CENA \d de 5[^\n]*\n/).slice(1).map(s => s.split('\n')[0]);
  const limpo = s => s.replace(/\s+/g, ' ');
  ok('o prompt tem mesmo cinco corpos de cena', corpos.length === 5 ? true : corpos.length);
  ok('TODAS as cinco cenas exigem uma pessoa visível no quadro',
    corpos.every(c => /A real person must be visible and present in this shot/.test(c))
      ? true : corpos.map((c, i) => i + ':' + /A real person/.test(c)));
  ok('e proíbem cena só de produto em todas elas',
    corpos.every(c => /never a product-only shot/.test(c)) ? true : 'faltou em alguma');
  ok('TODAS as cinco travam o produto inteiro dentro do quadro',
    corpos.every(c => /product must be FULLY inside the frame at all times/.test(limpo(c)))
      ? true : 'faltou em alguma');
  ok('e proíbem o produto encostar ou passar da borda',
    corpos.every(c => /never cropped, never touching or running past an edge/.test(limpo(c)))
      ? true : 'faltou em alguma');
  ok('e mandam a cabeça inteira no quadro',
    corpos.every(c => /head must be fully in frame/.test(limpo(c))) ? true : 'faltou');

  ok('no 9:16 avisa da faixa de botões e do rodapé do aplicativo',
    /right-hand strip and the bottom fifth/.test(limpo(t)) ? true : 'não avisou');
  ok('a cena de apresentar põe o rosto e o produto INTEIRO no mesmo quadro',
    /her face and the ENTIRE product are both clearly visible in the same frame/.test(limpo(t))
      ? true : 'não pediu os dois juntos');
  ok('e a primeira cena já abre com ela falando na câmera',
    /looking straight into the camera lens and speaking directly to the viewer/.test(limpo(t))
      ? true : 'a pessoa só aparece no fim');
  ok('o cabeçalho repete a regra da pessoa em português',
    /em TODA cena tem que aparecer uma pessoa de verdade/.test(t) ? true : 'não repetiu');
  ok('e a regra do enquadramento em português',
    /o produto aparece INTEIRO, com folga nas quatro bordas/.test(t) ? true : 'não repetiu');
  ok('o negativo proíbe produto sozinho e produto cortado',
    /product alone without a person/.test(t) && /cropped product/.test(t) &&
    /product cut off at the frame edge/.test(t) ? true : 'faltou no negativo');
  ok('e proíbe cabeça cortada em cima',
    /head cut off at the top/.test(t) ? true : 'faltou');

  const tQ = await page.evaluate(() => pessPromptTexto({ n: 'Air Fryer 5L' }, '1:1 (quadrado)'));
  ok('no quadrado não fala da faixa de botões, que ali não existe',
    !/right-hand strip/.test(tQ) && /Square 1:1 framing/.test(tQ) ? true : 'falou errado');

  /* =================================== 6) formato e integração */
  console.log('\n6) formato e ligação com a pauta');
  const tH = await page.evaluate(() => pessPromptTexto({ n: 'Air Fryer 5L' }, '16:9 (horizontal)'));
  ok('respeita o formato deitado', /Horizontal 16:9 framing/.test(tH) ? true : 'ignorou o formato');

  const daPauta = await page.evaluate(() =>
    pautaPromptTexto(null, { n: 'GOKOCO Escova modeladora de íons', vend: 25653 }));
  ok('a pauta usa este prompt como padrão',
    /TIPO RECONHECIDO: Cabelo/.test(daPauta) ? true : daPauta.slice(0, 90));
  ok('e o produto do Kalodata cai no nicho certo, não em "organização"',
    (await page.evaluate(() => kaloComoProduto({ nome: 'Protetor solar FPS 70', id: '1' }).familia)) === 'pele'
      ? true : 'nicho errado');

  console.log('');
  if (erros.length) { console.log('ERROS:'); erros.forEach(e => console.log('  ' + e)); }
  else console.log('Nenhum erro de JavaScript.');
  console.log(falhas ? falhas + ' FALHA(S)' : 'Tudo certo.');
  await b.close();
  process.exit(falhas ? 1 : 0);
})();

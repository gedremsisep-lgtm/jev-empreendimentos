/* =========================================================================
   PROMPT DE PESSOA USANDO O PRODUTO

   O problema que este arquivo resolve

   Os prompts que existiam mostravam o produto e, no máximo, um par de mãos.
   O resultado era um vídeo que mostra "um pedacinho do produto" — e vídeo
   assim não vende, porque quem assiste não se vê usando aquilo.

   O que vende é a pessoa: pegar, abrir, aplicar, provar, vestir, pedalar,
   tomar. O verbo muda tudo. "Uma mulher com um protetor solar" gera uma
   foto parada com um vidro na mão; "uma mulher espalhando o protetor na
   bochecha com dois dedos, a pele ficando com brilho úmido" gera um vídeo.

   A segunda coisa que este arquivo resolve

   Um protetor solar não se usa como uma panela, e nenhum dos dois se usa
   como uma bicicleta ergométrica. O gerador antigo mandava TODO produto
   para o mesmo cenário — um armário de quarto — porque o garimpo do
   Kalodata não separa nicho. Então aqui o produto é reconhecido pelo
   próprio nome, e cada família tem o seu jeito de ser manuseado, o seu
   ambiente, o seu benefício visível e a sua reação.

   A terceira: o BENEFÍCIO precisa aparecer na imagem, não só na legenda.
   Pele com viço, cabelo que para de armar, molho que não gruda na panela,
   suor depois do pedal. Cada família diz qual é o seu.

   Como usar: o texto sai pronto para colar em Sora, Veo, Kling, Runway ou
   Higgsfield. Uma cena de cada vez; a fábrica junta com narração e legenda.
   ========================================================================= */

/* ------------------------------------------------- quem aparece em cena
   Pessoa comum, não modelo. Pele com textura, roupa simples, casa modesta.
   É isso que faz o vídeo passar por vídeo de cliente em vez de propaganda —
   e é também o que impede a IA de gerar aquele rosto plástico de banco de
   imagens que todo mundo já aprendeu a ignorar.                          */
const PESS_GENTE = {
  f30: 'a Brazilian woman in her early thirties, natural hair, no professional makeup, ' +
       'real skin texture with visible pores and a few blemishes, plain cotton t-shirt',
  f45: 'a Brazilian woman in her mid forties, hair tied back, no professional makeup, ' +
       'real skin with fine lines, simple house clothes',
  m30: 'a Brazilian man in his early thirties, short hair, light stubble, plain t-shirt, ' +
       'real skin texture',
  f20: 'a young Brazilian woman around twenty five, natural curly hair, minimal makeup, ' +
       'real skin texture, casual top'
};

/* ----------------------------------------------------- as famílias

   Cada família responde cinco perguntas, e são elas que viram o prompt:

     onde   — o ambiente, com detalhe brasileiro real
     pega   — como a pessoa TOCA o produto na primeira vez
     usa    — o manuseio central, com o verbo específico
     mostra — o benefício aparecendo na imagem
     reage  — a reação humana que prova que funcionou
     luz    — a luz que faz o benefício ficar visível                     */
const PESS_FAMILIAS = {

  pele: {
    n: 'Cuidado com a pele',
    gente: 'f30',
    onde: 'a small Brazilian bathroom, white tiles, a mirror with a plain frame, ' +
          'toothbrush cup and a folded towel visible',
    pega: 'picks up the product from the sink, turns it once in her fingers to look at it, ' +
          'and unscrews the cap',
    usa: 'squeezes a small amount onto her fingertips, dabs it in four points across her ' +
         'cheeks and forehead, then spreads it in slow upward circles until it disappears ' +
         'into the skin',
    mostra: 'the skin turning even and lightly dewy where the product was spread, no white ' +
            'residue left, the difference visible between the treated cheek and the other side',
    reage: 'she leans closer to the mirror, touches her own cheek with the back of her fingers ' +
           'and lifts her eyebrows, pleasantly surprised by how it feels',
    luz: 'soft daylight from a frosted bathroom window on the left, one warm bulb above the mirror',
    beneficios: ['pele protegida o dia inteiro', 'toque seco, sem sensação de grude',
                 'some na pele sem deixar marca branca']
  },

  cabelo: {
    n: 'Cabelo',
    gente: 'f20',
    onde: 'a Brazilian bedroom corner used as a dressing spot, a mirror leaning on the wall, ' +
          'a socket with the cord plugged in, an unmade bed softly out of focus behind',
    pega: 'lifts the product from the bed, feels its weight, and turns it on',
    usa: 'separates one section of frizzy hair with her free hand, slides the product from the ' +
         'root to the tip in one slow continuous pass, then repeats on the same section',
    mostra: 'that single section turning smooth and shiny while the untouched hair beside it ' +
            'stays frizzy — the contrast between the two sections clearly visible in frame',
    reage: 'she runs her fingers down the treated section, feels how smooth it is, and smiles ' +
           'while looking at the mirror',
    luz: 'window daylight from the side so the shine on the treated hair is visible',
    beneficios: ['frizz baixa na primeira passada', 'brilho sem parecer oleoso',
                 'resultado de escova sem sair de casa']
  },

  suplemento: {
    n: 'Suplemento e vitamina',
    gente: 'f30',
    onde: 'a small Brazilian kitchen in the morning, a mug and a glass of water on the counter, ' +
          'daylight through a simple curtain',
    pega: 'takes the pot from the counter, twists the lid open and tips two capsules into her palm',
    usa: 'looks at the capsules in her palm, puts them in her mouth and drinks the whole glass ' +
         'of water in two swallows, tilting her head back',
    mostra: 'her shoulders dropping and her face relaxing as she lowers the empty glass, ' +
            'the pot standing on the counter in clear focus beside her',
    reage: 'she exhales, taps the lid back on the pot and gives a small satisfied nod, like ' +
           'someone who has made this part of the routine',
    luz: 'clean morning daylight from a window behind the counter',
    beneficios: ['noite de sono que realmente descansa', 'menos inchaço e menos cansaço',
                 'rotina simples, dois por dia']
  },

  cozinha: {
    n: 'Cozinha e panela',
    gente: 'f45',
    onde: 'a compact Brazilian kitchen with a laminate countertop and a four-burner stove, ' +
          'a dish towel over the oven handle',
    pega: 'lifts the pan by the handle, feels the weight, and sets it on the lit burner',
    usa: 'cracks an egg straight onto the dry surface with no oil, waits, then slides a spatula ' +
         'under it and flips it in one clean movement',
    mostra: 'the egg sliding freely across the surface with nothing sticking, the pan staying ' +
            'clean underneath it',
    reage: 'she tilts the pan so the egg slides from one side to the other and laughs quietly, ' +
           'because it did not stick at all',
    luz: 'daylight from a kitchen window plus the warm glow of the burner',
    beneficios: ['nada gruda, nem sem óleo', 'lava passando o pano',
                 'aguenta o fogo alto do dia a dia']
  },

  eletro: {
    n: 'Eletrodoméstico',
    gente: 'f30',
    onde: 'a compact Brazilian kitchen counter, a few groceries and a cutting board beside it',
    pega: 'places the appliance on the counter, plugs it in and presses the power button, ' +
          'the panel lighting up',
    usa: 'loads the food into it with both hands, closes it and turns the dial, then waits ' +
         'beside it with her hand resting on the counter',
    mostra: 'the food coming out finished and golden while she looks at it from up close',
    reage: 'she picks one piece up with her fingers, blows on it, tastes it and nods',
    luz: 'kitchen daylight, warm practical light from the appliance panel',
    beneficios: ['pronto em minutos, sem sujeira', 'menos óleo no prato',
                 'cabe na bancada apertada']
  },

  limpeza: {
    n: 'Limpeza',
    gente: 'f45',
    onde: 'a small Brazilian bathroom or kitchen with a visibly stained surface',
    pega: 'takes the product, shakes it once and points the nozzle at the dirty surface',
    usa: 'sprays it across the stain, waits a couple of seconds, then wipes with a cloth in ' +
         'two firm passes, going over the same spot',
    mostra: 'a clean stripe appearing exactly where the cloth passed, the dirt still visible on ' +
            'both sides of the stripe — the contrast inside one single shot',
    reage: 'she stops, looks at the clean stripe, and wipes a second time to widen it, ' +
           'clearly satisfied',
    luz: 'plain overhead bathroom light plus daylight, nothing staged',
    beneficios: ['sai na primeira passada, sem esfregar', 'não risca nem descolore',
                 'um produto para a casa toda']
  },

  fitness: {
    n: 'Fitness e exercício',
    gente: 'm30',
    onde: 'a corner of a Brazilian living room used for training, a small towel on a chair, ' +
          'a water bottle on the floor',
    pega: 'adjusts the equipment with both hands, sets the height and grips the handles',
    usa: 'starts training on it at a steady rhythm, breathing controlled, the movement smooth ' +
         'and continuous, muscles working visibly',
    mostra: 'sweat forming on the forehead and neck, breathing getting deeper, the equipment ' +
            'steady and silent under the effort',
    reage: 'he slows down, wipes his forehead with the towel and drinks water, tired in a good way',
    luz: 'daylight from a living room window, one warm lamp in the background',
    beneficios: ['treino em casa sem academia', 'firme e silencioso, não incomoda o vizinho',
                 'cabe num canto da sala']
  },

  moda: {
    n: 'Roupa e moda',
    gente: 'f20',
    onde: 'a Brazilian bedroom with a full-length mirror leaning against the wall, ' +
          'a wardrobe half open behind',
    pega: 'takes the garment off the hanger and holds it up in front of her body, ' +
          'looking at it in the mirror',
    usa: 'puts it on, adjusts it at the waist with both hands and smooths the fabric down ' +
         'the front with her palms',
    mostra: 'how the fabric falls and moves as she turns, the fit at the waist, the way it ' +
            'flows when she takes two steps',
    reage: 'she turns once in front of the mirror, looks over her shoulder at herself and smiles',
    luz: 'natural daylight from a bedroom window, soft and even on the fabric',
    beneficios: ['cai bem em qualquer corpo', 'tecido que não marca e não amassa',
                 'serve para o dia e para sair']
  },

  aroma: {
    n: 'Aroma e casa',
    gente: 'f30',
    onde: 'a simple Brazilian living room in the late afternoon, a sofa with a throw blanket, ' +
          'a low table',
    pega: 'opens the packaging, takes the product out and holds it close to her face',
    usa: 'places it on the table or sprays it into the room, then steps back and breathes in ' +
         'deeply with her eyes half closed',
    mostra: 'her shoulders relaxing as she breathes, the room looking warm and cared for around her',
    reage: 'she opens her eyes, looks around the room and settles onto the sofa',
    luz: 'warm golden hour light through a window, long soft shadows',
    beneficios: ['a casa cheirando bem o dia inteiro', 'o cheiro que a visita pergunta qual é',
                 'dura semanas com o mesmo frasco']
  },

  bebe: {
    n: 'Bebê e criança',
    gente: 'f30',
    onde: 'a Brazilian bedroom with a changing table, folded baby clothes stacked beside',
    pega: 'takes the product with one hand while keeping the other hand steady and safe',
    usa: 'uses it carefully and gently, unhurried movements, checking with her eyes as she goes',
    mostra: 'the child calm and comfortable, everything neat and safe around them',
    reage: 'she smiles at the child and adjusts the product once more',
    luz: 'soft warm daylight, nothing harsh',
    beneficios: ['seguro para a pele do bebê', 'prático de usar com uma mão só',
                 'facilita a rotina do dia a dia']
  },

  pet: {
    n: 'Pet',
    gente: 'f30',
    onde: 'a Brazilian living room floor with a small dog, a pet bed in the corner',
    pega: 'opens the product and calls the dog over, showing it to him',
    usa: 'uses it on the dog with calm hands while he stays still, praising him quietly',
    mostra: 'the dog relaxed and enjoying it, the visible result on the coat or in the bowl',
    reage: 'she scratches behind his ear and he leans into her hand',
    luz: 'daylight from a living room window',
    beneficios: ['o pet aceita sem estresse', 'resultado que dá para ver no pelo',
                 'rende muito e não faz sujeira']
  },

  acessorio: {
    n: 'Acessório e eletrônico',
    gente: 'f20',
    onde: 'a Brazilian bedroom desk, a notebook closed to the side, a cup of coffee',
    pega: 'takes the product out of its packaging and looks at it up close, turning it in her hands',
    usa: 'fits or connects it, presses the button, and uses it for real — checking that it works',
    mostra: 'it working in the shot, fitting exactly as it should, no gaps and no wobble',
    reage: 'she nods, uses it once more and leaves it in place, satisfied',
    luz: 'window daylight from the side, one desk lamp',
    beneficios: ['encaixa certinho, sem folga', 'protege de verdade na queda',
                 'chega e já funciona, sem instalar nada']
  },

  organizacao: {
    n: 'Organização e utilidades',
    gente: 'f45',
    onde: 'a Brazilian bedroom closet or kitchen cabinet, visibly disorganised',
    pega: 'takes the product out of the box and opens it up with both hands',
    usa: 'starts placing the scattered items into it one by one, working quickly, ' +
         'the space clearing as she goes',
    mostra: 'the same space going from piled and messy to tidy inside the shot, ' +
            'free room appearing where there was none',
    reage: 'she steps back with both hands on her hips and looks at the result',
    luz: 'plain daylight from a bedroom window, nothing staged',
    beneficios: ['cabe muito mais no mesmo espaço', 'acha tudo na hora',
                 'monta em minutos, sem ferramenta']
  }
};

/* ------------------------------------------- reconhecer o produto pelo nome

   O Kalodata devolve o título do anúncio e mais nada sobre categoria. Então
   a família sai do próprio nome, por palavra-chave em português. A ordem
   importa: o primeiro que casar ganha, e os mais específicos vêm antes.   */
const PESS_PISTAS = [
  ['pele',        /protetor solar|fps|s[eé]rum|serum|hidratante|creme facial|[aá]cido|niacinamida|vitamina c|colageno facial|anti-?idade|antissinais|sabonete facial|skincare|clareador|est[ií]as|celulite|peptídeo|peptideo|ghk/i],
  ['cabelo',      /cabelo|capilar|shampoo|xampu|condicionador|progressiva|botox capilar|escova (modeladora|alisadora|secadora)|secador|chapinha|prancha|babyliss|cronograma|antiqueda|minoxidil/i],
  ['suplemento',  /c[aá]psula|comprimido|suplemento|magn[eé]sio|inositol|creatina|whey|colágeno|colageno|vitamina|[oó]leo de|melatonina|probi[oó]tico|emagrecedor|termog[eê]nico|fibra/i],
  ['cozinha',     /panela|frigideira|caçarola|cacarola|jogo de panela|wok|assadeira|forma de|talher|faca|tábua|tabua de corte|escorredor|potes? herm[eé]tico/i],
  ['eletro',      /air ?fryer|fritadeira|liquidificador|batedeira|mixer|cafeteira|sanduicheira|panela el[eé]trica|micro-?ondas|processador|espremedor|aspirador|robô aspirador|robo aspirador/i],
  ['limpeza',     /limpador|multiuso|desengordurante|desinfetante|tira ?manchas|removedor|alvejante|sab[aã]o|amaciante|esfregão|esfregao|rodo|vassoura|pano de|esponja|limpa ?vidros/i],
  ['fitness',     /bicicleta|ergom[eé]trica|spinning|esteira|el[ií]ptico|halter|anilha|caneleira|el[aá]stico de|faixa el[aá]stica|abdominal|barra fixa|corda de pular|academia|treino|muscula[çc][aã]o/i],
  ['moda',        /cal[çc]a|blusa|camiseta|camisa|vestido|saia|short|conjunto|body|macac[aã]o|leg|legging|sutiã|sutia|cinta|biqu[ií]ni|maiô|maio|jaqueta|casaco|t[eê]nis|sapato|sand[aá]lia|chinelo|bolsa|mochila/i],
  ['aroma',       /difusor|aromatizador|home spray|vela perfumada|perfume|arom[aá]tico|essência|essencia|sachê|sache|aroma/i],
  ['bebe',        /beb[eê]|infantil|crian[çc]a|fralda|mamadeira|chupeta|berço|berco|carrinho de beb|papinha/i],
  ['pet',         /pet|cachorro|c[aã]o|gato|felino|ra[çc][aã]o|coleira|arranhador|caixa de areia|petisco/i],
  ['acessorio',   /capa de celular|capinha|pel[ií]cula|carregador|cabo|fone|headset|caixa de som|smartwatch|rel[oó]gio|suporte de|power ?bank|mouse|teclado|webcam|luminária|luminaria/i],
  ['organizacao', /organizador|caixa organizadora|cabide|prateleira|suporte|gaveteiro|cesto|nicho|arm[aá]rio|sapateira|porta-?/i]
];

function pessFamiliaId(nome){
  const t = String(nome || '');
  for (const [id, re] of PESS_PISTAS) if (re.test(t)) return id;
  return 'organizacao';
}

function pessFamilia(nome){
  return PESS_FAMILIAS[pessFamiliaId(nome)] || PESS_FAMILIAS.organizacao;
}

/* nome curto para a IA não travar num título de anúncio de 90 caracteres */
function pessNomeCurto(nome){
  const t = String(nome || '').replace(/\s+/g, ' ').trim();
  const corte = (t.split(/[-–—|,(]/)[0] || t).trim();
  let p = corte.split(' ').slice(0, 4);
  /* não terminar em pedaço solto — "protetor solar facial fps" fica pior
     que "protetor solar facial", e a IA lê melhor sem o caco */
  while (p.length > 2 && /^(de|da|do|com|para|em|e|fps|ml|kg|un|pcs|\d+)$/i.test(p[p.length - 1]))
    p.pop();
  return p.join(' ') || 'o produto';
}

/* como descrever o produto EM INGLÊS sem deixar a IA inventar outro
   O truque é dizer o que ele é, não a marca: marca a IA não conhece e
   preenche com o que quiser — e aí sai outro produto na tela. */
function pessProdutoEN(nome){
  const fam = pessFamiliaId(nome);
  const generico = {
    pele: 'a skincare bottle with a pump, plain label',
    cabelo: 'a handheld hair styling brush with a round barrel',
    suplemento: 'a supplement pot with a screw lid and capsules inside',
    cozinha: 'a non-stick frying pan with a black handle',
    eletro: 'a small countertop kitchen appliance with a digital panel',
    limpeza: 'a spray bottle of household cleaner with a trigger nozzle',
    fitness: 'an indoor exercise bike with adjustable handlebars',
    moda: 'a piece of everyday clothing',
    aroma: 'a reed diffuser bottle with rattan sticks',
    bebe: 'a baby care product',
    pet: 'a pet care product',
    acessorio: 'a small consumer electronics accessory',
    organizacao: 'a household storage organiser'
  }[fam];
  return generico + ' (the real product is "' + pessNomeCurto(nome) + '" — ' +
         'keep its shape, colour and proportions exactly as in the reference image ' +
         'if one is provided)';
}

/* ------------------------------------------------------- as cinco cenas

   A ordem não é decorativa. Ela é a ordem em que a cabeça de quem assiste
   aceita uma recomendação:

     1. a pessoa existe e tem o meu problema
     2. ela pega o produto — agora é concreto
     3. ela USA de verdade, e eu vejo como se usa
     4. o benefício aparece na imagem, não na legenda
     5. ela olha na câmera e recomenda — só agora, quando já provou       */
/* ------------------------------------------------- ENQUADRAMENTO E PESSOA

   Dois defeitos que apareceram nos vídeos prontos, e o conserto de cada um.

   1) O PRODUTO SAÍA CORTADO. A IA enche a tela com o produto e as bordas
      dele ficam de fora do quadro. Além disso, no 9:16 o TikTok desenha os
      botões de curtir na direita e a legenda embaixo, POR CIMA do vídeo —
      produto encostado ali fica atrás do dedo de quem assiste. Por isso o
      enquadramento agora manda, com todas as letras, que o produto apareça
      inteiro, com folga nas quatro bordas, e que nada importante entre na
      faixa da direita nem no rodapé.

   2) NÃO APARECIA PESSOA NENHUMA. As IAs de vídeo tendem a escorregar para
      "vitrine de produto" quando o texto da cena fala muito do objeto: sai
      um belo giro do produto sobre um fundo, sem ninguém. O conserto é uma
      regra global, repetida em TODA cena: tem que haver uma pessoa visível,
      de corpo presente, apresentando. Produto sozinho no quadro é erro.   */
var PESS_SEMPRE =
  'A real person must be visible and present in this shot, on camera, ' +
  'presenting the product to the viewer — never a product-only shot, never ' +
  'an empty room, never a floating object.';

function pessEnquadre(formato){
  const seguro = formato === '16:9 (horizontal)'
    ? 'Horizontal 16:9 framing. Keep the person and the product inside the ' +
      'middle of the frame, away from the four edges.'
    : formato === '1:1 (quadrado)'
    ? 'Square 1:1 framing. Keep the person and the product inside the middle ' +
      'of the frame, away from the four edges.'
    : 'Vertical 9:16 framing, the person in the upper two thirds of the frame. ' +
      'Leave the right-hand strip and the bottom fifth of the frame clear of ' +
      'anything important — the app draws its buttons and captions there.';
  return seguro + ' The product must be FULLY inside the frame at all times, ' +
    'complete, with breathing room on all four sides — never cropped, never ' +
    'touching or running past an edge, never cut in half. The person\'s head ' +
    'must be fully in frame, never cut off at the top.';
}

function pessCenas(produto, formato){
  const nome = (produto && (produto.n || produto.nome)) || '';
  const f = pessFamilia(nome);
  const gente = PESS_GENTE[f.gente] || PESS_GENTE.f30;
  const prod = pessProdutoEN(nome);
  const curto = pessNomeCurto(nome);
  const enq = pessEnquadre(formato);
  const base = enq + ' ' + PESS_SEMPRE + ' ' + f.onde + '.';

  return [
    { papel: 'A pessoa e o problema',
      en: base + ' Medium shot of ' + gente + ', head and shoulders fully in frame. ' +
          'She starts by looking straight into the camera lens and speaking directly to ' +
          'the viewer, like a friend opening a video, then turns to show the everyday ' +
          'problem this product solves, visibly a little annoyed by it. ' +
          'She is real and unposed, never a model pose. ' + f.luz + '. ' +
          'Handheld, small natural movements, one continuous shot.',
      pt: 'Ela abre falando na câmera, como quem começa um vídeo, e só então mostra o ' +
          'problema do dia a dia. É o plano que faz quem assiste se reconhecer.' },

    { papel: 'Ela apresenta o produto',
      en: base + ' Same person, facing the camera. She ' + f.pega + '. Then she holds it ' +
          'up beside her face, turned towards the lens, presenting it to the viewer — ' +
          'her face and the ENTIRE product are both clearly visible in the same frame at ' +
          'the same time, the product complete from top to bottom with space around it. ' +
          'The product — ' + prod + ' — is sharp and in focus, held at a natural angle in ' +
          'her hand, never floating and never duplicated. ' + f.luz + '. ' +
          'Camera holds steady at chest height. One continuous shot.',
      pt: 'Ela pega o produto e o APRESENTA na câmera, ao lado do rosto: dá para ver a ' +
          'cara dela e o produto inteiro no mesmo quadro. É aqui que ele deixa de ser ' +
          'abstrato — e é a cena que estava saindo sem ninguém.' },

    { papel: 'Ela usa de verdade',
      en: base + ' Same person, same light. She ' + f.usa + '. The movement is complete and ' +
          'unhurried so the viewer learns how to use it just by watching. Both her face and ' +
          'her hands are in frame. ' + f.luz + '. Handheld medium close-up that follows the ' +
          'movement. One continuous shot, no cuts.',
      pt: 'O manuseio de verdade, do início ao fim, com rosto e mãos no quadro. ' +
          'Quem assiste aprende a usar só de ver.' },

    { papel: 'O benefício aparece',
      en: base + ' Close-up. ' + f.mostra + '. Then ' + f.reage + '. The benefit must be ' +
          'visible in the image itself, not implied. ' + f.luz + '. Slow push-in, ' +
          'true colours, no grading tricks. One continuous shot.',
      pt: 'O benefício aparecendo na imagem e a reação humana logo em seguida. ' +
          'É esta cena que vende — e por isso ela não pode ser sugerida, tem que ser vista.' },

    { papel: 'Ela recomenda',
      en: enq + ' ' + PESS_SEMPRE + ' ' + gente + ' holding ' + prod + ' at chest height, ' +
          'the whole product visible in her hand, ' +
          'now looking straight into the camera lens, talking to a friend, ' +
          'relaxed and convinced, small honest smile. ' + f.onde + ' softly out of focus ' +
          'behind her. ' + f.luz + '. Handheld selfie distance, arm-length, ' +
          'slight natural shake. One continuous shot.',
      pt: 'Agora sim ela olha na câmera e recomenda, com o produto na mão. ' +
          'Recomendação só funciona depois da prova.' }
  ];
}

/* ------------------------------------- a narração, com os benefícios ditos

   A narração precisa dizer o benefício em palavra de gente. E quando o
   produto veio do Kalodata, ela também diz o NÚMERO — porque prova social
   real convence mais que adjetivo.                                        */
function pessNarracao(produto){
  const nome = (produto && (produto.n || produto.nome)) || '';
  const f = pessFamilia(nome);
  const b = f.beneficios;
  const curto = pessNomeCurto(nome);
  const vend = Number(produto && produto.vend) || 0;
  const rat = Number(produto && produto.rating) || 0;

  /* "54 mil pessoas" entra melhor no ouvido do que "54.265 pessoas" — e é
     assim que a narradora falaria de verdade */
  const redondo = vend >= 1000000 ? (vend / 1000000).toFixed(1).replace('.', ',') + ' milhões'
                : vend >= 1000 ? Math.round(vend / 1000) + ' mil' : String(vend);
  const prova = vend >= 1000
    ? redondo + ' pessoas compraram esse nos últimos trinta dias.'
    : (rat >= 4.6 ? 'Quem comprou deu nota ' + String(rat).replace('.', ',') + '.' : '');

  return [
    'Se você também passa por isso todo dia, presta atenção nesses trinta segundos.',
    'Achei o ' + curto + ' e resolvi testar antes de indicar para alguém.',
    'Olha como usa: é simples assim, não tem segredo nenhum.',
    (b[0] ? b[0].charAt(0).toUpperCase() + b[0].slice(1) + '.' : '') +
      (b[1] ? ' E ' + b[1] + '.' : ''),
    (prova ? prova + ' ' : '') + 'O link tá aqui embaixo, enquanto tem estoque.'
  ];
}

/* ---------------------------------------------------- o texto para colar */
function pessPromptTexto(produto, formato){
  const nome = (produto && (produto.n || produto.nome)) || '';
  const f = pessFamilia(nome);
  const cenas = pessCenas(produto, formato || '9:16 (vertical)');
  const fala = pessNarracao(produto);
  const b = f.beneficios;

  const l = [];
  l.push('PRODUTO: ' + nome);
  l.push('TIPO RECONHECIDO: ' + f.n);
  l.push('FORMATO: ' + (formato || '9:16 (vertical)') + ' · 5 cenas de 8 segundos');
  l.push('');
  l.push('BENEFÍCIOS QUE O VÍDEO PRECISA MOSTRAR:');
  b.forEach(function(x){ l.push('  · ' + x); });
  l.push('');
  l.push('A PESSOA APRESENTANDO — vale para as cinco cenas:');
  l.push('  · em TODA cena tem que aparecer uma pessoa de verdade, no quadro,');
  l.push('    apresentando o produto. Produto sozinho girando é vídeo errado.');
  l.push('  · é sempre a MESMA pessoa, com a mesma roupa e o mesmo cabelo,');
  l.push('    do começo ao fim.');
  l.push('  · ela fala com quem assiste, não com o produto.');
  l.push('');
  l.push('ENQUADRAMENTO — vale para as cinco cenas:');
  l.push('  · o produto aparece INTEIRO, com folga nas quatro bordas.');
  l.push('    Nunca cortado, nunca encostando na borda, nunca pela metade.');
  l.push('  · a cabeça da pessoa inteira no quadro, nunca cortada em cima.');
  if ((formato || '9:16 (vertical)').indexOf('9:16') === 0){
    l.push('  · deixe a faixa da direita e o quinto de baixo livres: é onde o');
    l.push('    aplicativo desenha os botões e a legenda, por cima do vídeo.');
  }
  l.push('');
  l.push('COMO USAR: gere uma cena de cada vez na sua IA de vídeo (Sora, Veo, Kling,');
  l.push('Runway, Higgsfield). Se ela aceitar imagem de referência, use a foto do');
  l.push('produto em TODAS as cenas — é o que impede a IA de inventar outro produto.');
  l.push('');
  cenas.forEach(function(c, i){
    l.push('=== CENA ' + (i + 1) + ' de 5 — ' + c.papel + ' (8s)');
    l.push(c.en);
    l.push('');
    l.push('[o que é, em português] ' + c.pt);
    if (fala[i]) l.push('[narração por cima] ' + fala[i]);
    l.push('');
  });
  l.push('NEGATIVE PROMPT (cole no campo de negativo):');
  l.push(typeof AN_NEGATIVO === 'string' ? AN_NEGATIVO : '');
  l.push('deformed product, wrong product, changing product between shots, ' +
         'floating product, two products, unreadable label, plastic skin, ' +
         'model-like face, studio backdrop, stock footage look, ' +
         'product alone without a person, empty room with no person, ' +
         'no people, faceless shot, cropped product, product cut off at the ' +
         'frame edge, product touching the edge, head cut off at the top, ' +
         'subject out of frame');
  return l.join('\n');
}

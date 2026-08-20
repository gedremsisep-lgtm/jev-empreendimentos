/* =========================================================================
   GARIMPO DE PRODUTOS — escolhe o que gravar e traz os links prontos

   Você marca as condições (loja, nicho, teto de preço, quantos quer) e o
   sistema devolve os produtos campeões de venda, já com o link de busca
   pronto em cada loja, o ângulo do vídeo e o ganho estimado por venda.

   De onde vem a lista: dos rankings públicos de "mais vendidos" de
   Casa, Móveis e Decoração, conferidos em 02/08/2026. O sistema guarda
   preço de referência, unidades vendidas e nota — e usa isso para pontuar.
   ========================================================================= */

const GAR_LOJAS = [
  { id:'ml',     n:'Mercado Livre', com:[4,16],  ic:'ti-shopping-bag',   cor:'#FFE600',
    prog:'Mercado Livre', nota:'Ranking oficial de mais vendidos por categoria.' },
  { id:'shopee', n:'Shopee',        com:[4,30],  ic:'ti-shopping-cart',  cor:'#EE4D2D',
    prog:'Shopee',        nota:'Catálogo barato e comissão boa. Ordena por vendas.' },
  { id:'amazon', n:'Amazon',        com:[7,13],  ic:'ti-brand-amazon',   cor:'#FF9900',
    prog:'Amazon',        nota:'Filtro de preço e "mais vendidos" direto na busca.' },
  { id:'magalu', n:'Magazine Luiza',com:[2,12],  ic:'ti-building-store', cor:'#0086FF',
    prog:'Magalu',        nota:'Ticket parecido com o do ML, comissão menor.' },
  { id:'tiktok', n:'TikTok Shop',   com:[10,30], ic:'ti-brand-tiktok',   cor:'#111111',
    prog:'TikTok Shop',   nota:'Maior comissão e o vídeo vende dentro do próprio app.' }
];

/* subnichos de acessórios para casa, com a categoria do ranking do Mercado Livre */
const GAR_NICHOS = [
  { id:'org', n:'Organização e utilidades', ic:'ti-box',           ml:['MLB436414'] },
  { id:'coz', n:'Cozinha',                  ic:'ti-tools-kitchen-2',ml:['MLB1618'] },
  { id:'dec', n:'Decoração e iluminação',   ic:'ti-bulb',          ml:['MLB1631','MLB1582'] },
  { id:'ban', n:'Cama, mesa e banho',       ic:'ti-bath',          ml:['MLB1613'] },
  { id:'lim', n:'Limpeza e lavanderia',     ic:'ti-spray',         ml:['MLB264051'] }
];

/* O pool. preco = preço de referência (R$), vend = unidades já vendidas,
   nota = avaliação, video = 1 a 5, o quanto o produto rende em vídeo curto. */
const GAR_POOL = [
  /* ---------------------------------------------------- organização */
  { n:'Kit 50 cabides de veludo slim', t:'kit 50 cabides veludo slim antideslizante', g:'org',
    preco:66.83, vend:100000, nota:4.9, video:5,
    ang:'Antes e depois', gancho:'Guarda-roupa lotado virando guarda-roupa com espaço sobrando',
    porque:'Ocupa metade do espaço do cabide comum. O antes e depois se explica sozinho, sem falar nada.' },
  { n:'Kit 10 sacos a vácuo com bomba', t:'kit 10 saco a vacuo com bomba organizador', g:'org',
    preco:37.00, vend:50000, nota:4.8, video:5,
    ang:'Antes e depois', gancho:'Edredom do tamanho de um travesseiro depois de sugar o ar',
    porque:'O encolhimento na frente da câmera é o vídeo inteiro. Preço baixo, decisão rápida.' },
  { n:'Kit 4 sacos a vácuo grandes com bomba', t:'kit 4 saco a vacuo 70x110 com bomba', g:'org',
    preco:37.65, vend:10000, nota:4.8, video:5,
    ang:'Antes e depois', gancho:'Mala fechando com o dobro de roupa dentro',
    porque:'Mesma mágica do anterior, com apelo de viagem — funciona o ano todo.' },
  { n:'Kit 7 colmeias organizadoras de gaveta', t:'colmeia organizadora de gaveta kit', g:'org',
    preco:53.99, vend:10000, nota:4.8, video:5,
    ang:'Antes e depois', gancho:'Gaveta bagunçada virando grade certinha em 30 segundos',
    porque:'Vídeo satisfatório de organização é o formato que mais roda em casa e decoração.' },
  { n:'Kit 4 sacos organizadores de edredom', t:'saco organizador de edredom dobravel', g:'org',
    preco:56.55, vend:10000, nota:4.7, video:4,
    ang:'Passo a passo', gancho:'Onde guardar o edredom quando o armário já está cheio',
    porque:'Resolve um problema que todo mundo tem e ninguém pensa em resolver.' },
  { n:'Escorredor de louça 20 pratos inox', t:'escorredor de louca 20 pratos inox com bandeja', g:'org',
    preco:94.05, vend:10000, nota:4.8, video:4,
    ang:'Review honesto', gancho:'A pia que nunca mais fica com louça empilhada',
    porque:'Item de uso diário, aparece bem em vídeo e tem comissão sobre um ticket maior.' },
  { n:'Caixa organizadora dobrável de roupa de cama', t:'caixa organizadora dobravel roupa de cama', g:'org',
    preco:38.00, vend:1000, nota:4.9, video:4,
    ang:'Antes e depois', gancho:'Prateleira de lençol que desmorona virando pilha certa',
    porque:'Barato, leve e o resultado visual é imediato.' },

  /* ---------------------------------------------------- cozinha */
  { n:'Kit 10 potes de vidro herméticos 640 ml', t:'kit 10 pote de vidro hermetico 640ml', g:'coz',
    preco:92.43, vend:100000, nota:4.8, video:5,
    ang:'Antes e depois', gancho:'Geladeira embaralhada virando geladeira de revista',
    porque:'É o campeão da cozinha. Serve marmita, geladeira e despensa — três vídeos do mesmo produto.' },
  { n:'Lixeira automática com sensor 16 L', t:'lixeira automatica com sensor 16l recarregavel', g:'coz',
    preco:67.42, vend:10000, nota:4.8, video:5,
    ang:'Review honesto', gancho:'A tampa abrindo sozinha quando a mão chega perto',
    porque:'Produto que se demonstra em 3 segundos. Gancho pronto para os dois primeiros segundos do vídeo.' },
  { n:'Kit 6 potes de tempero com tampa de bambu', t:'kit 6 pote de vidro tempero tampa de bambu', g:'coz',
    preco:39.97, vend:10000, nota:4.9, video:5,
    ang:'Antes e depois', gancho:'Armário de tempero em saquinho virando prateleira bonita',
    porque:'Estética + baixo preço. Converte muito em público que gosta de cozinha organizada.' },
  { n:'Frigideira de cerâmica antiaderente 24 cm', t:'frigideira ceramica antiaderente 24cm', g:'coz',
    preco:76.60, vend:500, nota:4.8, video:5,
    ang:'Review honesto', gancho:'Ovo escorregando na frigideira sem uma gota de óleo',
    porque:'A demonstração é o produto. Só grave o ovo deslizando e o vídeo está pronto.' },
  { n:'Jogo de 6 taças de cristal lapidado', t:'jogo 6 tacas cristal lapidado 340ml', g:'coz',
    preco:31.12, vend:10000, nota:4.9, video:4,
    ang:'Lista rápida', gancho:'Mesa posta bonita gastando menos de 40 reais',
    porque:'Preço de impulso e visual caro — combinação que vende em vídeo curto.' },
  { n:'Faqueiro Tramontina 24 peças inox', t:'faqueiro tramontina 24 pecas inox', g:'coz',
    preco:61.94, vend:10000, nota:4.8, video:3,
    ang:'Comparativo', gancho:'Marca conhecida pela metade do preço da loja física',
    porque:'A marca faz o trabalho de convencer. Bom para público que compra por confiança.' },
  { n:'Jogo de facas Tramontina 7 peças', t:'jogo de facas tramontina plenus 7 pecas', g:'coz',
    preco:43.02, vend:10000, nota:4.9, video:3,
    ang:'Review honesto', gancho:'As sete facas que resolvem a cozinha inteira',
    porque:'Item de reposição constante e marca com reputação pronta.' },

  /* ---------------------------------------------------- decoração e iluminação */
  { n:'Fita LED 5 m com fonte', t:'fita led 5m 300 leds com fonte', g:'dec',
    preco:23.58, vend:100000, nota:4.8, video:5,
    ang:'Antes e depois', gancho:'Quarto comum virando quarto de vídeo com a luz apagada',
    porque:'O produto de casa que mais vende no vídeo curto. Barato, instala em minutos e o efeito é imediato.' },
  { n:'Luminária projetor galáxia 360°', t:'luminaria projetor estrela galaxy 360', g:'dec',
    preco:29.99, vend:10000, nota:4.8, video:5,
    ang:'Antes e depois', gancho:'Teto do quarto virando céu estrelado',
    porque:'Formato que já viralizou muitas vezes e continua vendendo. Preço de presente.' },
  { n:'10 placas adesivas de mármore 3D', t:'placa adesiva marmore 3d autocolante 30x60', g:'dec',
    preco:36.28, vend:10000, nota:4.7, video:5,
    ang:'Antes e depois', gancho:'Parede da cozinha trocada sem obra e sem sujeira',
    porque:'Reforma sem obra é um dos temas mais fortes de casa. Fala direto com quem mora de aluguel.' },
  { n:'Kit 10 placas 3D de tijolo autocolante', t:'placa 3d tijolo autocolante parede', g:'dec',
    preco:51.90, vend:10000, nota:4.7, video:5,
    ang:'Antes e depois', gancho:'Parede branca virando parede de tijolinho em uma tarde',
    porque:'Mesmo apelo do mármore, num acabamento que o público de decoração pede muito.' },
  { n:'Fita LED COB 5 m de alto brilho', t:'fita led cob 5m 320 led alto brilho', g:'dec',
    preco:42.19, vend:1000, nota:4.8, video:4,
    ang:'Comparativo', gancho:'A fita que não mostra os pontinhos de luz',
    porque:'É o upgrade natural de quem já comprou a fita comum — bom para o segundo vídeo.' },
  { n:'Papel de parede adesivo amadeirado 10 m', t:'papel de parede adesivo madeira rolo 10 metros', g:'dec',
    preco:54.70, vend:1000, nota:4.7, video:4,
    ang:'Antes e depois', gancho:'Móvel velho virando móvel novo com um rolo',
    porque:'Serve para parede e para móvel — dois vídeos diferentes com o mesmo link.' },
  { n:'Kit 3 cestos de bambu com forro', t:'kit 3 cesto organizador de bambu com forro', g:'dec',
    preco:38.41, vend:1000, nota:4.9, video:4,
    ang:'Lista rápida', gancho:'Onde esconder a bagunça sem esconder o bom gosto',
    porque:'Junta organização com decoração — pega os dois públicos ao mesmo tempo.' },

  /* ---------------------------------------------------- cama, mesa e banho */
  { n:'Cesto de roupa suja de bambu 50 L', t:'cesto de roupa suja de bambu com tampa 50l', g:'ban',
    preco:43.38, vend:5000, nota:4.8, video:4,
    ang:'Antes e depois', gancho:'O canto do banheiro que ninguém quer mostrar, resolvido',
    porque:'Preço baixo, ocupa lugar de destaque no banheiro e aparece bem na câmera.' },
  { n:'Protetor de colchão impermeável', t:'protetor de colchao impermeavel matelado queen', g:'ban',
    preco:34.98, vend:5000, nota:4.4, video:5,
    ang:'Erro comum', gancho:'Copo de água virado em cima da cama — e o colchão seco',
    porque:'A demonstração é impossível de ignorar. Vende sozinho para quem tem criança ou pet.' },
  { n:'Tapete de banheiro antiderrapante', t:'tapete de banheiro antiderrapante absorvente 60x40', g:'ban',
    preco:18.40, vend:10000, nota:4.3, video:4,
    ang:'Lista rápida', gancho:'A água sumindo no tapete na hora',
    porque:'Item mais barato da lista. Compra por impulso e funciona bem em vídeo de lista.' },
  { n:'Kit 4 toalhas de banho gigantes', t:'kit 4 toalha de banho gigante 80x150', g:'ban',
    preco:78.99, vend:50000, nota:4.6, video:3,
    ang:'Comparativo', gancho:'A toalha que enrola no corpo inteiro',
    porque:'Volume de vendas altíssimo. Rende vídeo de comparação de tamanho.' },
  { n:'Tapete peludo 2,00 × 1,50 m', t:'tapete peludo felpudo 2,00x1,50 sala quarto', g:'ban',
    preco:59.75, vend:10000, nota:4.6, video:4,
    ang:'Antes e depois', gancho:'Sala fria virando sala aconchegante numa tomada só',
    porque:'Muda o ambiente inteiro em um único movimento de câmera.' },
  { n:'Jogo de lençol 400 fios micropercal', t:'jogo de lencol casal 400 fios micropercal', g:'ban',
    preco:30.90, vend:5000, nota:4.8, video:3,
    ang:'Review honesto', gancho:'400 fios por menos de 35 reais: será que presta?',
    porque:'O gancho da dúvida funciona bem, e o preço tira a objeção no fim do vídeo.' },
  /* ---------------------------------------------- achados reais do TikTok Shop
     Conferidos na vitrine brasileira em 03/08/2026. Preço e vendas são os que
     estavam na página; o link vai direto para o produto, não para uma busca. */
  { n:'Pano multiuso Perfex rolo com 600 panos', t:'pano multiuso perfex rolo 600 unidades', g:'lim',
    preco:34.99, de:114.75, vend:26600, nota:4.7, video:4, tt:'1734466413800032018', curto:'o pano Perfex',
    en:'a perforated roll of blue multipurpose cleaning cloths',
    v:{ local:'a compact Brazilian kitchen with a laminate countertop and a stainless sink',
        antes:'a greasy stovetop and a counter with dried food stains',
        depois:'the same stovetop and counter clean and dry, the used cloth set aside',
        acao:'tears one sheet from the roll, wipes the greasy stovetop in one pass and shows the dirt on the cloth',
        antesPt:'o fogão engordurado e a bancada manchada' },
    ang:'Comparativo', gancho:'600 panos pelo preço de dois pacotes de pano de prato',
    porque:'É o campeão de vendas de casa no TikTok Shop. O apelo é a conta: mostre o rolo inteiro e divida o preço.' },
  { n:'Jogo de tapete de banheiro 3 peças', t:'tapete jogo de banheiro 3 pecas liso', g:'ban',
    preco:31.41, de:79.90, vend:19100, nota:4.7, video:4, tt:'1731683089910760752', curto:'esse jogo de tapete',
    en:'a three-piece bathroom rug set in a soft solid colour',
    v:{ local:'a small tiled bathroom in a modest Brazilian apartment',
        antes:'a bare cold tile floor around the toilet, nothing matching, the room looks unfinished',
        depois:'the same bathroom with the matching three-piece rug set in place, warm and complete',
        acao:'lays the three pieces down one by one, around the toilet and in front of the sink',
        antesPt:'o piso frio e vazio, sem nada combinando' },
    ang:'Antes e depois', gancho:'Banheiro sem graça virando banheiro combinando em 30 segundos',
    porque:'Segundo mais vendido da casa no TikTok Shop. Troca o ambiente inteiro numa tomada só.' },
  { n:'Kit Coala Home Orquídea Negra', t:'kit coala home orquidea negra', g:'lim',
    preco:61.90, de:80.65, vend:13800, nota:4.9, video:4, tt:'1731369469580314005', curto:'o kit da Coala',
    en:'a home fragrance kit with a reed diffuser and two spray bottles',
    v:{ local:'a tidy Brazilian living room with a sideboard and a plant',
        antes:'a plain sideboard with nothing on it, flat light, the room feels unlived',
        depois:'the diffuser and bottles arranged on the sideboard, reeds catching the light, curtains moving slightly',
        acao:'places the reeds into the diffuser and sprays once into the air, the mist catching the light',
        antesPt:'o aparador vazio, sem graça' },
    ang:'Review honesto', gancho:'O cheiro que faz a visita perguntar o que você passou na casa',
    porque:'Nota 4,9 com quase 14 mil vendas. Marca conhecida, então o vídeo só precisa mostrar o resultado.' },
  { n:'Kit limpa box e blindex Ákora com luvas de microfibra', t:'kit limpeza de vaos akora limpa box blindex', g:'lim',
    preco:19.53, de:32.90, vend:6000, nota:4.6, video:5, tt:'1731701297797694681', curto:'esse limpa box',
    en:'a slim flat cleaning tool with a magenta microfibre sleeve for narrow gaps',
    v:{ local:'a small tiled bathroom with a glass shower enclosure in a Brazilian apartment',
        antes:'the shower door bottom track dark with grime, soap scum and limescale, seen in close view',
        depois:'the same track completely clean, the aluminium showing bright again, water beading off',
        acao:'slides the slim tool along the shower door track in one single pass and the grime lifts onto the microfibre',
        antesPt:'o trilho do box preto de encardido' },
    ang:'Antes e depois', gancho:'Vão do box encardido saindo limpo na primeira passada',
    porque:'Vídeo de limpeza satisfatória é o formato que mais roda. Aqui a sujeira saindo é o vídeo inteiro.' },
  { n:'Tapete de banheiro de secagem rápida super absorvente', t:'tapete de banheiro secagem rapida super absorvente', g:'ban',
    preco:12.49, de:24.99, vend:5400, nota:4.5, video:5, tt:'1734289232637167534', curto:'esse tapete',
    en:'a large soft diatomite-style bath mat in muted blue',
    v:{ local:'a small tiled bathroom in a modest Brazilian apartment, right outside the shower',
        antes:'a puddle of water spreading on the cold bathroom floor after a shower',
        depois:'the mat surface dry again seconds later, the floor around it dry too',
        acao:'pours a glass of water onto the mat and the water disappears into the surface almost instantly, then steps on it barefoot',
        antesPt:'a poça de água no chão depois do banho' },
    ang:'Antes e depois', gancho:'A poça de água sumindo debaixo do pé na hora',
    porque:'Baratíssimo e a demonstração é instantânea. Compra por impulso quase garantida.' },
  { n:'Caixa organizadora dobrável de tecido', t:'caixa de armazenamento dobravel roupa gaveta', g:'org',
    preco:20.30, de:59.00, vend:3500, nota:4.8, video:4, tt:'1732478362861667824', curto:'essa caixa organizadora',
    en:'a foldable fabric storage box with a lid',
    v:{ local:'a bedroom wardrobe with an open drawer in a Brazilian apartment',
        antes:'a drawer with underwear, socks and t-shirts thrown in a tangled heap',
        depois:'the same drawer with everything folded upright inside the fabric boxes, rows perfectly aligned',
        acao:'unfolds the box, sets it into the drawer and files the folded clothes upright one by one',
        antesPt:'a gaveta com tudo embolado' },
    ang:'Antes e depois', gancho:'Gaveta virada do avesso virando gaveta de loja',
    porque:'Nota 4,8 com 3,5 mil vendas. Serve para roupa íntima, meia e bebê — três vídeos do mesmo link.' },
  { n:'Porta temperos giratório com 12 potes de vidro', t:'porta temperos giratorio 12 potes vidro', g:'coz',
    preco:20.29, de:36.00, vend:1200, nota:4.6, video:5, tt:'1736186339134834668', curto:'esse porta temperos',
    en:'a rotating spice rack carousel with twelve glass jars and bamboo lids',
    v:{ local:'a compact Brazilian kitchen with a laminate countertop',
        antes:'spices in torn plastic bags and mismatched jars crowding a cupboard shelf',
        depois:'the twelve glass jars filled and labelled on the rotating carousel, the shelf now clear',
        acao:'fills the glass jars, sets them on the carousel and spins it slowly with one finger',
        antesPt:'os temperos em saquinho, espalhados na prateleira' },
    ang:'Antes e depois', gancho:'Armário de tempero em saquinho virando bancada de chef',
    porque:'Gira na frente da câmera e o resultado é bonito. Preço de impulso e público de cozinha é enorme.' },

  { n:'Cesto de roupas de bambu 70 L', t:'cesto de roupas de bambu 70 litros', g:'ban',
    preco:58.32, vend:10000, nota:4.9, video:3,
    ang:'Lista rápida', gancho:'Cinco coisas baratas que deixam o quarto arrumado',
    porque:'Nota altíssima e boa margem. Entra bem numa lista com outros itens.' }
];

/* estado da tela */
const GAR = {
  lojas: ['ml','shopee','amazon','magalu','tiktok'],
  nichos: ['org','coz','dec','ban','lim'],
  teto: 100,
  quantos: 7,
  comMin: 0,
  soTT: false,      /* só os produtos que eu conferi na vitrine do TikTok Shop */
  achados: null,
  quando: null
};

/* Um produto pode vir de dois lugares: do garimpo que está na tela agora,
   ou de um item que já foi para a pauta e ficou guardado. As telas de prompt
   e de publicação falam com este resolvedor, e não direto com a lista — foi
   isso que permitiu reaproveitá-las na aba Vídeos e pauta sem duplicar nada. */
const GAR_AVULSO = {};
function garGuardar(chave, produto){ GAR_AVULSO[chave] = produto; return chave; }
function garAchado(i){
  if(typeof i === 'string' && GAR_AVULSO[i]) return GAR_AVULSO[i];
  return (GAR.achados && GAR.achados[i]) || null;
}

/* ------------------------------------------------------------------ links */
function garSlug(t){
  return String(t||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function garLink(loja, termo, teto, tt){
  const q = encodeURIComponent(termo);
  const t = Math.max(1, Math.round(num(teto) || 100));
  if(loja === 'tiktok' && tt) return 'https://shop.tiktok.com/br/pdp/' + tt;
  if(loja === 'ml')     return 'https://lista.mercadolivre.com.br/' + garSlug(termo) + '_PriceRange_0-' + t;
  if(loja === 'shopee') return 'https://shopee.com.br/search?keyword=' + q + '&maxPrice=' + t + '&sortBy=sales';
  if(loja === 'amazon') return 'https://www.amazon.com.br/s?k=' + q + '&rh=p_36%3A-' + (t*100) + '&s=exact-aware-popularity-rank';
  if(loja === 'magalu') return 'https://www.magazineluiza.com.br/busca/' + q + '/?filters=price---0.00%3A' + t + '.00&sortOrder=6';
  if(loja === 'tiktok') return 'https://www.tiktok.com/search?q=' + q;
  return '';
}
function garRanking(nichoId){
  const n = GAR_NICHOS.find(x=>x.id===nichoId);
  if(!n) return '';
  return 'https://www.mercadolivre.com.br/mais-vendidos/' + n.ml[0];
}
function garNicho(id){ return GAR_NICHOS.find(n=>n.id===id) || {n:'—', ic:'ti-box'}; }
function garLoja(id){ return GAR_LOJAS.find(l=>l.id===id) || null; }

/* comissão do meio da faixa, entre as lojas escolhidas */
function garComissao(lojas){
  const ls = (lojas && lojas.length ? lojas : GAR.lojas).map(garLoja).filter(Boolean);
  if(!ls.length) return 0;
  return ls.reduce((s,l)=>s+(l.com[0]+l.com[1])/2, 0) / ls.length;
}

/* ------------------------------------------------------------- pontuação */
function garPontos(p, teto){
  const pVend  = Math.min(1, Math.log10(Math.max(p.vend,1)) / 5);   /* 100 mil = 1 */
  const pVideo = p.video / 5;
  const pNota  = Math.max(0, Math.min(1, (p.nota - 4)));            /* 4,0 = 0 · 5,0 = 1 */
  const pPreco = Math.max(0, 1 - (p.preco / Math.max(teto,1)));     /* mais barato, mais fácil */
  return 40*pVend + 30*pVideo + 15*pNota + 15*pPreco;
}

/* Escolhe os melhores respeitando as condições e espalhando entre os nichos:
   cada produto já escolhido do mesmo nicho tira 9 pontos do próximo. */
function garEscolher(cond){
  const c = cond || GAR;
  const teto = num(c.teto) || 100;
  const comMin = num(c.comMin) || 0;
  const comissao = garComissao(c.lojas);
  if(comMin && comissao < comMin) return [];

  const elegiveis = GAR_POOL
    .filter(p => !c.soTT || !!p.tt)
    .filter(p => c.nichos.includes(p.g))
    .filter(p => p.preco <= teto)
    .map(p => ({...p, base: garPontos(p, teto)}));

  const escolhidos = [];
  const porNicho = {};
  const quantos = Math.max(1, Math.min(num(c.quantos)||7, elegiveis.length));

  while(escolhidos.length < quantos){
    let melhor = null, melhorNota = -1;
    elegiveis.forEach(p=>{
      if(escolhidos.some(e=>e.t===p.t)) return;
      const nota = p.base - 9*(porNicho[p.g]||0);
      if(nota > melhorNota){ melhorNota = nota; melhor = p; }
    });
    if(!melhor) break;
    porNicho[melhor.g] = (porNicho[melhor.g]||0) + 1;
    escolhidos.push({...melhor, pontos: Math.round(melhor.base),
      comissao: Math.round(comissao*10)/10,
      ganho: Math.round(melhor.preco * comissao) / 100,
      links: (c.lojas||GAR.lojas).map(id=>({loja:id, url: garLink(id, melhor.t, teto, melhor.tt)}))});
  }
  return escolhidos;
}

/* ------------------------------------------------------------------ tela */
function garCampo(k, v){
  if(k==='teto' || k==='quantos' || k==='comMin') GAR[k] = num(v);
  else GAR[k] = v;
}
function garSoTT(v){
  GAR.soTT = !!v;
  if(GAR.soTT){
    /* os achados reais têm link do TikTok Shop, então é lá que a busca faz sentido;
       e todos os nichos entram, senão o filtro esconderia achado sem o usuário pedir */
    GAR.lojas = ['tiktok'];
    GAR.nichos = GAR_NICHOS.map(n=>n.id);
  }
  GAR.achados = null;
  midiaRender();
}
function garTogglar(qual, id){
  const lista = GAR[qual];
  const i = lista.indexOf(id);
  if(i>=0){ if(lista.length>1) lista.splice(i,1); }
  else lista.push(id);
  midiaRender();
}
async function garGarimpar(){
  const achados = garEscolher(GAR);
  if(!achados.length){
    toast('Nenhum produto bate com essas condições. Solte o teto de preço ou marque mais um nicho.','aw');
    return;
  }
  GAR.achados = achados;
  GAR.quando = new Date().toISOString();
  try{
    await dbAdd('garimpos', {
      quando: GAR.quando, lojas:[...GAR.lojas], nichos:[...GAR.nichos],
      teto: GAR.teto, quantos: GAR.quantos,
      produtos: achados.map(a=>({n:a.n, t:a.t, g:a.g, preco:a.preco, vend:a.vend,
                                 nota:a.nota, pontos:a.pontos, ganho:a.ganho}))
    });
  }catch(e){ /* histórico é opcional — nunca derruba o garimpo */ }

  /* Os achados também viram PAUTA: assim eles não somem quando você troca de
     aba, e aparecem em Vídeos e pauta já com o prompt e o botão de gerar. */
  try{
    const r = await pautaDoGarimpo(achados);
    if(r.novos) toast(r.novos + ' produto(s) foram para a aba Vídeos e pauta, com o prompt pronto.','ag');
  }catch(e){ /* se a pauta falhar, o garimpo continua valendo */ }

  midiaRender();
}
function garLimpar(){ GAR.achados = null; midiaRender(); }

async function garCopiarLinks(i){
  const p = GAR.achados && GAR.achados[i];
  if(!p) return;
  const txt = p.n + '\n' + p.links.map(l=>garLoja(l.loja).n + ': ' + l.url).join('\n');
  try{ await navigator.clipboard.writeText(txt); toast('Links copiados.','ag'); }
  catch(e){ toast('Não consegui copiar. Abra pelo botão da loja.','aw'); }
}
async function garCopiarTudo(){
  if(!GAR.achados) return;
  const txt = GAR.achados.map((p,i)=>
    (i+1) + '. ' + p.n + '  (ref. ' + moeda(p.preco) + ' · ~' + moeda(p.ganho) + ' por venda)\n' +
    '   ' + p.gancho + '\n' +
    p.links.map(l=>'   ' + garLoja(l.loja).n + ': ' + l.url).join('\n')
  ).join('\n\n');
  try{ await navigator.clipboard.writeText(txt); toast('Garimpo inteiro copiado.','ag'); }
  catch(e){ toast('Não consegui copiar.','aw'); }
}
function garBaixar(){
  if(!GAR.achados) return;
  baixarArquivo(JSON.stringify({
    sistema:'JeV Empreendimentos', quando: GAR.quando,
    condicoes:{lojas:GAR.lojas, nichos:GAR.nichos, teto:GAR.teto, quantos:GAR.quantos},
    produtos: GAR.achados
  }, null, 2), 'garimpo-' + (GAR.quando||'').slice(0,10) + '.json', 'application/json');
}

/* cadastra os achados como produtos de afiliado, sem duplicar.

   Havia DUAS funções fazendo isto, com regras de duplicata diferentes: esta
   comparava só pelo nome; o preparo automático compara por nome + loja. O
   mesmo produto entrando pelos dois caminhos virava dois cadastros — e foi
   exatamente isso que o teste acusou (12 fichas onde deviam existir 7).
   Agora existe uma implementação só, e as duas concordam por construção em
   vez de concordar por sorte. */
async function garCadastrar(){
  if(!GAR.achados) return;
  const r = (typeof prepSalvarFichas === 'function')
    ? await prepSalvarFichas(GAR.achados)
    : { novas: 0, jaTinha: 0 };
  toast(r.novas + ' produto(s) cadastrado(s)' +
        (r.jaTinha ? ' · ' + r.jaTinha + ' já existia(m)' : '') +
        '. Falta colar o seu link de afiliado em cada um.', 'ag');
  MID_TAB = 'afil';
  midiaRender();
}

/* manda os achados direto para o gerador de roteiro */
async function garParaRoteiro(){
  if(!GAR.achados) return;
  await garCadastrar();
  const progs = await dbGetAll('programas');
  const nomes = GAR.achados.map(a=>a.n.toLowerCase());
  const ids = progs.filter(p=>nomes.includes(String(p.produto||'').toLowerCase())).map(p=>p.id);
  if(!GER) GER = {produtos:[], angulo:'Review honesto', duracao:60, formato:'9:16 (vertical)',
                  plataformas:['yts','tt','ig','fb'], variante:0, pacote:null};
  GER.produtos = ids.slice(0, 5);
  const ang = GAR.achados[0].ang;
  GER.angulo = (ang && ANGULOS[ang]) ? ang : 'Antes e depois';
  GER.pacote = null;
  MID_TAB = 'gerar';
  toast('Produtos prontos no gerador. Escolha o ângulo e monte o pacote.','ag');
  midiaRender();
}

async function midTabGarimpo(){
  const body = document.getElementById('mid-body');
  const comissao = garComissao(GAR.lojas);

  /* O Kalodata vem PRIMEIRO nesta tela porque é a única fonte que alcança do
     computador do dono: o TikTok Shop está bloqueado na internet dele, e é
     de lá que vêm os produtos que a JeV promove. O garimpo das outras lojas
     continua logo abaixo, inteiro — nada foi tirado. */
  let hk = '';
  try { hk = await kaloSecaoHTML(); } catch (e) { hk = ''; }
  if (hk){
    hk = '<div class="card"><div class="hd"><i class="ti ti-chart-arrows-vertical"></i>' +
         'Kalodata — os campeões de venda do TikTok Shop</div>' +
         '<div class="bd">' + hk + '</div></div>' +
         '<div class="sh" style="margin-top:18px"><i class="ti ti-building-store"></i>' +
         'Garimpo nas outras lojas</div>';
  }

  let h = hk + `<div class="al ai"><i class="ti ti-pick"></i><div>
    Marque as condições e clique em <b>Garimpar</b>. O sistema escolhe os produtos que mais vendem
    dentro do que você pediu e abre cada loja já filtrada por preço e ordenada por mais vendidos —
    é lá que você pega o <b>seu</b> link de afiliado, que é pessoal e só existe dentro da sua conta.</div></div>

  <div class="card"><div class="hd"><i class="ti ti-adjustments"></i>Condições do garimpo</div><div class="bd">

    <div class="fg" style="margin-bottom:16px"><label>Onde procurar</label>
      <div class="chips">${GAR_LOJAS.map(l=>`
        <button class="chip ${GAR.lojas.includes(l.id)?'on':''}" onclick="garTogglar('lojas','${l.id}')"
          title="${esc(l.nota)}"><i class="ti ${l.ic}"></i>${esc(l.n)}
          <span class="tt">${l.com[0]}–${l.com[1]}%</span></button>`).join('')}</div>
      <div class="hint">Comissão média das lojas marcadas: <b>${qtd(comissao,1)}%</b>.</div></div>

    <div class="fg" style="margin-bottom:16px"><label>Nicho dentro de acessórios para casa</label>
      <div class="chips">${GAR_NICHOS.map(n=>`
        <button class="chip ${GAR.nichos.includes(n.id)?'on':''}" onclick="garTogglar('nichos','${n.id}')">
          <i class="ti ${n.ic}"></i>${esc(n.n)}</button>`).join('')}</div></div>

    <div class="fr3">
      <div class="fg"><label>Preço máximo (R$)</label>
        <input id="gar-teto" type="number" step="1" value="${GAR.teto}" oninput="garCampo('teto',this.value)">
        <div class="hint">Abaixo de R$ 100 a compra é por impulso — o vídeo não precisa convencer tanto.</div></div>
      <div class="fg"><label>Quantos produtos trazer</label>
        <input id="gar-qtd" type="number" step="1" min="1" max="20" value="${GAR.quantos}" oninput="garCampo('quantos',this.value)">
        <div class="hint">Um produto por vídeo rende mais que um vídeo com vários.</div></div>
      <div class="fg"><label>Comissão mínima (%)</label>
        <input id="gar-com" type="number" step="1" value="${GAR.comMin}" oninput="garCampo('comMin',this.value)">
        <div class="hint">Deixe em 0 para não descartar loja nenhuma.</div></div>
    </div>

    <label style="display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer;margin:2px 0 12px">
      <input type="checkbox" id="gar-sott" ${GAR.soTT?'checked':''} onchange="garSoTT(this.checked)" style="width:16px;height:16px">
      <span><b>Só os achados conferidos na vitrine do TikTok Shop</b> — produtos reais, com preço,
      nota e número de vendas que estavam na página, e link que abre direto no produto.</span></label>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      <button class="btn gn" onclick="garGarimpar()"><i class="ti ti-pick"></i>Garimpar ${GAR.quantos} produtos</button>
      ${GAR.achados?`<button class="btn gh" onclick="garLimpar()"><i class="ti ti-x"></i>Limpar</button>`:''}
      ${GAR.nichos.map(id=>`<button class="btn xs gh" onclick="abrirFora('${garRanking(id)}')">
        <i class="ti ti-trophy"></i>Ranking de ${esc(garNicho(id).n.toLowerCase())}</button>`).join('')}
    </div>
  </div></div>`;

  if(GAR.achados){
    const soma = GAR.achados.reduce((s,p)=>s+p.ganho,0);
    h += `<div class="card"><div class="hd"><i class="ti ti-diamond"></i>${GAR.achados.length} produtos escolhidos
      <span class="sp"></span>
      <button class="btn sm gh" onclick="garCopiarTudo()"><i class="ti ti-copy"></i>Copiar tudo</button>
      <button class="btn sm gh" onclick="garBaixar()"><i class="ti ti-download"></i>Baixar</button>
      <button class="btn sm bl" onclick="garCadastrar()"><i class="ti ti-link"></i>Cadastrar como produtos</button>
      <button class="btn sm gn" onclick="garParaRoteiro()"><i class="ti ti-wand"></i>Gerar roteiro</button>
      </div><div class="bd">

      <div class="kg" style="margin-bottom:14px">
        <div class="kc br"><div class="lb"><i class="ti ti-package"></i>Produtos</div>
          <div class="vl">${GAR.achados.length}</div><div class="sb">até ${moeda(GAR.teto)}</div></div>
        <div class="kc bl"><div class="lb"><i class="ti ti-percentage"></i>Comissão média</div>
          <div class="vl">${qtd(comissao,1)}%</div><div class="sb">das lojas marcadas</div></div>
        <div class="kc gn"><div class="lb"><i class="ti ti-cash"></i>Ganho por venda</div>
          <div class="vl">${moeda(soma/GAR.achados.length)}</div><div class="sb">média dos escolhidos</div></div>
        <div class="kc gd"><div class="lb"><i class="ti ti-trending-up"></i>Se vender 10 de cada</div>
          <div class="vl">${moedaK(soma*10)}</div><div class="sb">comissão somada</div></div>
      </div>`;

    GAR.achados.forEach((p,i)=>{
      h += `<div class="card tw" style="margin-bottom:10px"><div class="bd">
        <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div style="font-size:22px;font-weight:700;opacity:.35;min-width:34px">${i+1}º</div>
          <div style="flex:1;min-width:240px">
            <b style="font-size:15px">${esc(p.n)}</b>
            <div class="tt" style="margin:3px 0 6px">
              <span class="st s-nt"><i class="ti ${garNicho(p.g).ic}"></i> ${esc(garNicho(p.g).n)}</span>
              ${p.tt?`&nbsp;<span class="st s-ok"><i class="ti ti-brand-tiktok"></i> na vitrine do TikTok Shop</span>`:''}
              &nbsp;·&nbsp; ${qtd(p.vend,0)}+ vendidos &nbsp;·&nbsp; nota ${qtd(p.nota,1)}
              &nbsp;·&nbsp; ${p.tt?'':'ref. '}${moeda(p.preco)}${p.de?` <s>${moeda(p.de)}</s>`:''}
              &nbsp;·&nbsp; <b>~${moeda(p.ganho)}</b> por venda</div>
            <div style="font-size:13px"><b>Gancho:</b> ${esc(p.gancho)}</div>
            <div class="tt" style="margin-top:3px"><b>Ângulo sugerido:</b> ${esc(p.ang)} — ${esc(p.porque)}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px" class="no-print">
          ${p.links.map(l=>`<button class="btn xs ${(l.loja==='tiktok'&&p.tt)?'gn':'gh'}" onclick="abrirFora('${l.url}')">
            <i class="ti ${garLoja(l.loja).ic}"></i>${esc(garLoja(l.loja).n)}${(l.loja==='tiktok'&&p.tt)?' — o produto':''}</button>`).join('')}
          <button class="btn xs bl" onclick="garCopiarLinks(${i})"><i class="ti ti-copy"></i>Copiar links</button>
          <button class="btn xs gd" onclick="afilCadastrarGarimpo(${i})"><i class="ti ti-link"></i>Virar produto de afiliado</button>
          <button class="btn xs pu" onclick="anAbrir(${i})"><i class="ti ti-sparkles"></i>Gerar vídeo anúncio</button>
          <button class="btn xs gn" onclick="dispAbrir(${i})"><i class="ti ti-send"></i>Publicar</button>
        </div>
      </div></div>`;
    });

    h += `<div class="al aw" style="margin-top:4px"><i class="ti ti-alert-triangle"></i><div>
      Os botões verdes abrem <b>a página do produto</b> no TikTok Shop; os demais abrem a <b>busca</b>
      já filtrada por preço e ordenada por mais vendidos. Nenhum deles é o link de afiliado:
      o link que paga comissão é pessoal, gerado dentro do painel de cada programa com a sua conta.
      Gere o seu lá, volte no botão <b>Cadastrar como produtos</b> e cole em cada um.</div></div>`;

    h += `</div></div>`;
  }

  /* onde tirar o link que paga */
  h += `<div class="card tw"><div class="hd"><i class="ti ti-key"></i>Onde gerar o link que paga comissão</div><div class="bd">
    <div class="tt" style="margin-bottom:10px">Cada loja tem o seu programa. O link de afiliado é pessoal:
      ninguém pode te passar o dele, e sem ele a venda não é contada como sua.</div>
    <table><thead><tr><th>Loja</th><th class="r">Comissão</th><th>Como funciona</th>
      <th class="c no-print">Cadastro</th></tr></thead><tbody>
    ${GAR_LOJAS.map(l=>{ const c = progCat(l.prog); return `<tr>
      <td><b><i class="ti ${l.ic}"></i> ${esc(l.n)}</b></td>
      <td class="r n">${l.com[0]}–${l.com[1]}%</td>
      <td class="tt">${esc(l.nota)}${c?' · '+esc(c.prazo):''}</td>
      <td class="c no-print">${c&&c.url?`<button class="btn xs gh" onclick="abrirFora('${c.url}')">
        <i class="ti ti-external-link"></i>Abrir</button>`:'—'}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;

  body.innerHTML = h;
}

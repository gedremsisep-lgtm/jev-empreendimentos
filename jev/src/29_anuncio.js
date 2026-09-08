/* =========================================================================
   VÍDEO ANÚNCIO — monta o prompt que faz a IA gerar o vídeo de venda

   Cada produto garimpado ganha um botão. O botão abre esta tela com o
   roteiro de imagem cena a cena, escrito do jeito que as IAs de vídeo
   entendem (em inglês), com a tradução ao lado, a narração em português,
   a legenda pronta e o prompt negativo — que é o que impede a IA de
   colocar texto, marca d'água e mão com seis dedos no seu anúncio.

   Quatro estilos, porque cada produto vende de um jeito:
     ugc     — parece vídeo de cliente, gravado no celular
     antes   — começa no problema e corta para o resultado
     close   — só produto e mãos, sem rosto, dá para produzir em escala
     cine    — luz trabalhada, vende desejo em vez de solução
   ========================================================================= */

const AN_ESTILOS = [
  { id:'ugc',   n:'UGC realista',        ic:'ti-device-mobile',
    desc:'Parece vídeo de cliente comum gravado no celular. É o que menos parece propaganda — e por isso o que mais converte no vídeo curto.' },
  { id:'antes', n:'Antes e depois',      ic:'ti-transform',
    desc:'Abre no problema e corta para o resultado. Prende nos dois primeiros segundos sem precisar falar nada.' },
  { id:'close', n:'Demonstração em close',ic:'ti-zoom-in',
    desc:'Só o produto e as mãos, fundo limpo, sem rosto. Dá para produzir muitos vídeos com o mesmo padrão.' },
  { id:'cine',  n:'Cinematográfico',     ic:'ti-movie',
    desc:'Luz trabalhada e câmera lenta. Vende desejo em vez de solução — combina com decoração, aroma e cama e mesa.' }
];

/* cenário padrão por nicho, usado quando o produto não tem um escrito à mão */
const AN_CENARIO = {
  org: { local:'a small bedroom closet in a modest Brazilian apartment',
         antes:'clothes and objects piled in disorder, no free space',
         depois:'the same space tidy, everything in its place, free room visible',
         acao:'organises the items using the product, working quickly with both hands' },
  coz: { local:'a compact Brazilian kitchen with a laminate countertop',
         antes:'a cluttered counter with items scattered and no free surface',
         depois:'the same counter clean and organised, the product in place',
         acao:'arranges the items into the product and steps back to reveal the result' },
  dec: { local:'a simple bedroom in a Brazilian apartment at dusk',
         antes:'a plain, dull room with flat overhead lighting',
         depois:'the same room transformed, warm glow, magazine-like',
         acao:'installs the product and switches off the main light to reveal the effect' },
  ban: { local:'a small tiled bathroom in a modest Brazilian apartment',
         antes:'a plain, unwelcoming bathroom, cold and mismatched',
         depois:'the same bathroom matching and cosy, soft textures',
         acao:'places the product and steps back to reveal the change' },
  lim: { local:'a small Brazilian apartment, bathroom and living room',
         antes:'a visibly dirty surface, grime and stains in close view',
         depois:'the same surface spotless, reflective, water beading off',
         acao:'passes the product once over the dirty surface and the grime lifts immediately' }
};

/* ------------------------------------------------------------ utilitários */
function anCenario(p){
  return Object.assign({}, AN_CENARIO[p.g] || AN_CENARIO.org, p.v || {});
}
function anProdEN(p){
  return p.en || ('a Brazilian home product ("' + p.n + '")');
}
function anEstilo(id){ return AN_ESTILOS.find(e=>e.id===id) || AN_ESTILOS[0]; }
/* como a pessoa chama o produto falando — nome comprido no meio da frase soa robô */
function anCurto(p){ return p.curto || 'isso aqui'; }

/* trilhos comuns a todo prompt — é aqui que mora a diferença entre um vídeo
   que parece anúncio de banco de imagens e um que parece gravado por gente */
const AN_NEGATIVO =
  'text, captions, subtitles, watermark, logo, brand names, letters, numbers, ' +
  'distorted hands, extra fingers, deformed fingers, plastic skin, uncanny face, ' +
  'cgi look, 3d render, oversaturated colours, HDR halo, slow motion, ' +
  'stock footage feel, studio backdrop, empty white void, morphing objects, ' +
  'floating product, duplicated product, warped straight lines';

const AN_TECNICA = {
  ugc:  'Shot on a modern smartphone, 26mm wide, f/1.8, handheld with natural micro-shake, ' +
        'slight rolling shutter, autofocus hunting once. No colour grading, phone-native look, ' +
        'mild overexposure near the window. Photoreal, imperfect framing, not cinematic.',
  antes:'Shot on a modern smartphone, 26mm wide, f/1.8, locked-off tripod framing so the before ' +
        'and after match exactly. Same position, same light, same white balance in both halves. ' +
        'No colour grading. Photoreal documentary look.',
  close:'Macro lens, 50mm equivalent, f/2.8, shallow depth of field, camera on a slider moving ' +
        'slowly. Soft diffused key light from the left, subtle fill. Neutral grade, true colours, ' +
        'crisp texture detail. Only hands and product in frame, no face.',
  cine: 'Cinema camera look, 35mm anamorphic, f/2.0, slow dolly and gentle push-in on a gimbal. ' +
        'Golden hour light through a window, soft shadows, gentle haze, warm highlights and cool ' +
        'shadows. Shallow depth of field, filmic grain, 24fps motion blur.'
};

const AN_AUDIO = {
  ugc:  'Audio: room tone of a real apartment, the natural sound of the product being used, a ' +
        'distant street sound. No music, no voice-over in the generated clip.',
  antes:'Audio: room tone and the real sound of the action. No music, no voice-over in the clip.',
  close:'Audio: clean, close-mic sound of the material — fabric, glass, water, plastic. No music, ' +
        'no voice-over in the clip.',
  cine: 'Audio: quiet room tone and one subtle foley accent. No music, no voice-over in the clip.'
};

/* --------------------------------------------------------- as quatro cenas */
function anCenas(p, estiloId, formato){
  const c = anCenario(p);
  const prod = anProdEN(p);
  const enq = formato === '16:9 (horizontal)' ? 'horizontal 16:9 framing'
            : formato === '1:1 (quadrado)'    ? 'square 1:1 framing'
            : 'vertical 9:16 framing, subject in the upper two thirds';
  const pessoa = 'a Brazilian woman in her early thirties, no makeup, plain t-shirt, ' +
                 'natural body, real skin texture with visible pores';

  if(estiloId === 'antes') return [
    { papel:'O problema, cru',
      en:`${enq}. Static locked-off shot of ${c.antes}, inside ${c.local}. Nobody in frame yet. ` +
         `Plain daylight, nothing staged, the mess looks real and lived-in. Hold the frame still for the whole clip.`,
      pt:`Plano fixo do problema — ${c.antesPt || 'a bagunça ou sujeira de verdade'} — dentro do ambiente. Ninguém em cena ainda. Luz do dia, nada arrumado para a foto.` },
    { papel:'O produto entra',
      en:`${enq}. Same locked-off framing. A pair of hands brings ${prod} into the frame and ` +
         `${c.acao}. The change starts to appear within the shot. Real, unhurried movement.`,
      pt:`Mesmo enquadramento. Só as mãos entram com o produto e começam a usar. A mudança já aparece dentro do plano.` },
    { papel:'O resultado',
      en:`${enq}. Same locked-off framing, same light. Now showing ${c.depois}. The hands leave the ` +
         `frame. Hold on the finished result, completely still.`,
      pt:`Mesmo plano, mesma luz. Agora o resultado. As mãos saem de cena e o plano segura no que ficou pronto.` },
    { papel:'A comparação',
      en:`${enq}. Split screen: the exact same frame, ${c.antes} on the left and ${c.depois} on the ` +
         `right, identical camera position and lighting. No text, no arrows, no graphics — only the two images.`,
      pt:`Tela dividida com o antes na esquerda e o depois na direita, exatamente o mesmo enquadramento. Sem texto e sem seta: só as duas imagens.` }
  ];

  if(estiloId === 'close') return [
    { papel:'O produto',
      en:`${enq}. Macro shot of ${prod} resting on a clean neutral surface, ${c.local} softly out of ` +
         `focus behind. Slow slider move from left to right revealing the texture and the finish.`,
      pt:`Macro do produto sobre uma superfície neutra, com o ambiente desfocado atrás. Câmera desliza devagar mostrando o acabamento.` },
    { papel:'O problema em macro',
      en:`${enq}. Extreme close-up of ${c.antes}. Fill the frame with the texture of the problem so it ` +
         `is impossible to ignore. Shallow focus, one clean light.`,
      pt:`Close extremo do problema, preenchendo a tela com a textura. É o plano que faz quem assiste reconhecer o próprio caso.` },
    { papel:'A ação',
      en:`${enq}. Close-up of hands only. ${prod} in use: ${c.acao}. Follow the movement with a short ` +
         `push-in. The effect must be visible inside this single continuous shot, no cut.`,
      pt:`Close das mãos usando o produto. O efeito precisa aparecer dentro do mesmo plano, sem corte — é isso que convence.` },
    { papel:'O resultado em macro',
      en:`${enq}. Extreme close-up of ${c.depois}. Slow pull-back to reveal a little more of the ` +
         `finished scene. Clean, true colours, no grading tricks.`,
      pt:`Close extremo do resultado e a câmera abre um pouco para mostrar o conjunto pronto.` }
  ];

  if(estiloId === 'cine') return [
    { papel:'O ambiente',
      en:`${enq}. Slow dolly through ${c.local}, golden hour light raking through a window, dust ` +
         `motes in the beam. Nobody in frame. The room feels calm and aspirational but still ordinary and Brazilian.`,
      pt:`Câmera entra devagar no ambiente com luz de fim de tarde. Ninguém em cena. A casa parece bonita, mas continua sendo uma casa de verdade.` },
    { papel:'O produto como herói',
      en:`${enq}. ${prod} placed in the room, catching the warm light. Slow push-in, shallow depth of ` +
         `field, background falling out of focus. The product looks desirable, never floating or fake.`,
      pt:`O produto no ambiente, pegando a luz quente. Aproximação lenta, fundo desfocando. Ele parece caro sem parecer montagem.` },
    { papel:'O uso',
      en:`${enq}. ${pessoa}, seen mostly from behind or in profile, ${c.acao}. Unhurried, elegant ` +
         `movement. Warm rim light on her arm. Face never fully centred.`,
      pt:`Uma pessoa usando o produto, vista de costas ou de perfil, sem pressa. O rosto nunca é o centro — quem tem de brilhar é o resultado.` },
    { papel:'A casa transformada',
      en:`${enq}. Wide shot of ${c.depois}, the room now complete. Slow crane-down or gentle pull-back. ` +
         `Warm, quiet, finished. Hold on the last frame.`,
      pt:`Plano aberto da casa pronta, com a câmera descendo devagar. Quente, calmo, terminado.` }
  ];

  /* ugc — o padrão */
  return [
    { papel:'O gancho',
      en:`${enq}. ${pessoa}, standing in ${c.local}, holds ${prod} up towards the camera and talks ` +
         `straight to the lens, mid-sentence, as if replying to a friend. She is slightly off-centre, ` +
         `framing imperfect. Natural window light. Selfie-style handheld.`,
      pt:`A pessoa segura o produto e fala direto para a câmera, começando no meio da frase, como se respondesse a alguém. Enquadramento torto de propósito.` },
    { papel:'O problema',
      en:`${enq}. She turns the phone to show ${c.antes}. Handheld, quick reframe, brief autofocus ` +
         `hunt. Nothing tidied up for the camera — it must look like a real house.`,
      pt:`Ela vira o celular e mostra o problema de verdade. Nada arrumado antes de gravar: tem de parecer casa de gente.` },
    { papel:'Usando na hora',
      en:`${enq}. She ${c.acao} while the phone is propped up or held with one hand. The result appears ` +
         `during the shot, no cut, no edit. Slight camera drift because one hand is busy.`,
      pt:`Ela usa o produto com o celular apoiado ou numa mão só. O resultado aparece durante o plano, sem corte — é a prova.` },
    { papel:'O resultado e o convite',
      en:`${enq}. She shows ${c.depois} in the same handheld style, then turns the camera back to her ` +
         `face for the last two seconds, smiling, mid-sentence again. Same room, same light as scene one.`,
      pt:`Ela mostra o resultado e volta o celular para o próprio rosto nos dois segundos finais, sorrindo, já falando. Mesma sala, mesma luz do começo.` }
  ];
}

/* ------------------------------------------------------------- a narração */
function anNarracao(p, estiloId){
  const preco = moeda(p.preco);
  const curto = anCurto(p);
  const gancho = p.gancho || p.n;
  if(estiloId === 'antes') return [
    'Olha o estado disso aqui.',
    'Usei ' + curto + ' uma vez só.',
    'Ficou assim.',
    p.n + ', ' + preco + '. O link tá aqui embaixo.'
  ];
  if(estiloId === 'close') return [
    'Deixa eu te mostrar ' + curto + '.',
    'Serve pra isso — e todo mundo tem isso em casa.',
    'Repara no que acontece.',
    p.n + ', ' + preco + '. Link na descrição.'
  ];
  if(estiloId === 'cine') return [
    'Tem coisa que muda a casa inteira sem obra nenhuma.',
    'Essa é uma delas.',
    'Você põe no lugar e pronto.',
    p.n + ', ' + preco + '. Link aqui embaixo.'
  ];
  return [
    gancho + '.',
    'Deixa eu te mostrar como tava antes.',
    'Agora olha só, sem corte, sem edição.',
    'Paguei ' + preco + ' em ' + curto + '. O link tá na descrição.'
  ];
}

function anLegenda(p, estiloId){
  const e = anEstilo(estiloId);
  const base = (p.gancho || p.n) + '.\n\n' +
    p.n + ' — ' + moeda(p.preco) +
    (p.de ? ' (de ' + moeda(p.de) + ')' : '') +
    (p.vend ? ' · ' + qtd(p.vend,0) + '+ vendidos' : '') +
    (p.nota ? ' · nota ' + qtd(p.nota,1) : '') + '\n' +
    'Link na descrição. Publicidade — ganho comissão por venda.';
  return base + '\n\n' + anHashtags(p).join(' ') + '\n\n[estilo: ' + e.n + ']';
}
function anHashtags(p){
  const porNicho = {
    org:['#organização','#organizacaodecasa','#achadinhos'],
    coz:['#cozinha','#organizaçãodecozinha','#achadinhosdecozinha'],
    dec:['#decoração','#decoracaodecasa','#casanova'],
    ban:['#banheiro','#casaearrumação','#enxoval'],
    lim:['#limpeza','#faxina','#limpezasatisfatoria']
  };
  return ['#achadinhos','#casa','#dicasdecasa'].concat(porNicho[p.g] || []).concat(['#tiktokmefezcomprar']);
}

/* ------------------------------------------------------------- o pacote */
function anMontar(p, estiloId, formato){
  const est = anEstilo(estiloId);
  const cenas = anCenas(p, est.id, formato);
  const fala = anNarracao(p, est.id);
  const seg = 8;
  const lista = cenas.map((c,i)=>({
    n: i+1,
    papel: c.papel,
    segundos: seg,
    prompt_en: c.en + ' ' + AN_TECNICA[est.id] + ' ' + AN_AUDIO[est.id] +
               ' Duration ' + seg + ' seconds, single continuous shot, no cuts.',
    prompt_pt: c.pt,
    fala: fala[i] || ''
  }));
  return {
    produto: p.n,
    estilo: est.n,
    estiloId: est.id,
    formato: formato,
    duracao: cenas.length * seg,
    preco: p.preco,
    cenas: lista,
    negativo: AN_NEGATIVO,
    narracao: fala.join(' '),
    legenda: anLegenda(p, est.id),
    hashtags: anHashtags(p),
    link: (p.links && p.links.length) ? p.links[0].url : ''
  };
}

/* ------------------------------------------------------------------ tela */
const AN = { i:null, estilo:'ugc', formato:'9:16 (vertical)', pacote:null };

function anAbrir(i){
  if(!garAchado(i)) return;
  AN.i = i;
  AN.estilo = AN.estilo || 'ugc';
  anRender();
}
function anTrocar(k, v){ AN[k] = v; anRender(); }

function anRender(){
  const p = garAchado(AN.i);
  if(!p) return;
  const pac = anMontar(p, AN.estilo, AN.formato);
  AN.pacote = pac;

  const b = `
  <div class="al ai" style="margin-top:0"><i class="ti ti-sparkles"></i><div>
    Cole cada <b>prompt</b> abaixo na IA de vídeo que você usar — Sora, Veo, Kling, Higgsfield, Runway.
    São ${pac.cenas.length} cenas de ${pac.cenas[0].segundos} segundos: gere uma de cada vez e junte na
    <b>Fábrica de vídeo</b>, que também põe a narração, a legenda e a trilha.</div></div>

  <div class="sh" style="margin-top:0"><i class="ti ti-palette"></i>Estilo do anúncio</div>
  <div class="chips" style="margin-bottom:6px">
    ${AN_ESTILOS.map(e=>`<span class="chip ${AN.estilo===e.id?'on':''}" onclick="anTrocar('estilo','${e.id}')">
      <i class="ti ${e.ic}"></i> ${esc(e.n)}</span>`).join('')}
  </div>
  <div class="tt" style="margin-bottom:12px">${esc(anEstilo(AN.estilo).desc)}</div>

  <div class="sh"><i class="ti ti-crop"></i>Formato</div>
  <div class="chips" style="margin-bottom:12px">
    ${['9:16 (vertical)','16:9 (horizontal)','1:1 (quadrado)'].map(f=>`
      <span class="chip ${AN.formato===f?'on':''}" onclick="anTrocar('formato','${f}')">${f}</span>`).join('')}
  </div>

  <div class="kg" style="margin-bottom:12px">
    <div class="kc br"><div class="lb"><i class="ti ti-clapperboard"></i>Cenas</div>
      <div class="vl">${pac.cenas.length}</div><div class="sb">${pac.cenas[0].segundos}s cada</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-clock"></i>Duração</div>
      <div class="vl">${pac.duracao}s</div><div class="sb">o vídeo montado</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-crop"></i>Formato</div>
      <div class="vl" style="font-size:17px">${esc(pac.formato.split(' ')[0])}</div>
      <div class="sb">${esc(pac.formato.replace(/^\S+\s/,''))}</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-tag"></i>Preço</div>
      <div class="vl">${moeda(pac.preco)}</div><div class="sb">no anúncio</div></div>
  </div>`;

  let cenas = '';
  pac.cenas.forEach(c=>{
    cenas += `<div class="card tw" style="margin-bottom:10px"><div class="bd">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span class="st s-nt">Cena ${c.n} · ${c.segundos}s</span>
        <b style="font-size:14px">${esc(c.papel)}</b><span class="sp"></span>
        <button class="btn xs bl no-print" onclick="anCopiar(${c.n})"><i class="ti ti-copy"></i>Copiar prompt</button>
      </div>
      <div class="tt" style="margin-bottom:6px"><b>O que aparece:</b> ${esc(c.prompt_pt)}</div>
      ${c.fala?`<div class="tt" style="margin-bottom:6px"><b>Narração:</b> “${esc(c.fala)}”</div>`:''}
      <div class="mono" style="font-size:11.5px;line-height:1.55;background:var(--bg3);padding:9px 11px;
        border-radius:8px;white-space:pre-wrap">${esc(c.prompt_en)}</div>
    </div></div>`;
  });

  const extra = `
  <div class="card tw"><div class="hd"><i class="ti ti-ban"></i>Prompt negativo — cole no campo "negative prompt"
    <span class="sp"></span><button class="btn xs bl no-print" onclick="anCopiar('neg')"><i class="ti ti-copy"></i>Copiar</button></div>
    <div class="bd"><div class="tt" style="margin-bottom:6px">É isto que impede a IA de escrever texto na tela,
      inventar marca, deformar a mão de quem segura o produto e deixar tudo com cara de desenho 3D.</div>
      <div class="mono" style="font-size:11.5px;line-height:1.55;background:var(--bg3);padding:9px 11px;
        border-radius:8px;white-space:pre-wrap">${esc(pac.negativo)}</div></div></div>

  <div class="card tw"><div class="hd"><i class="ti ti-message"></i>Legenda pronta para publicar
    <span class="sp"></span><button class="btn xs bl no-print" onclick="anCopiar('leg')"><i class="ti ti-copy"></i>Copiar</button></div>
    <div class="bd"><div style="font-size:13px;white-space:pre-wrap;line-height:1.6">${esc(pac.legenda)}</div>
    ${pac.link?`<div class="tt" style="margin-top:8px">Troque pelo <b>seu</b> link de afiliado antes de publicar.
      A página do produto é: <span class="mono">${esc(pac.link)}</span></div>`:''}</div></div>`;

  modal('Vídeo anúncio — ' + p.n, 'ti-sparkles', b + cenas + extra,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn gh" onclick="anCopiar('tudo')"><i class="ti ti-copy"></i>Copiar tudo</button>
     <button class="btn bl" onclick="anBaixar()"><i class="ti ti-download"></i>Baixar o roteiro</button>
     <button class="btn gh" onclick="anParaFabrica()"><i class="ti ti-movie"></i>Mandar para a fábrica</button>
     <button class="btn gn" onclick="dispAbrir(AN.i)"><i class="ti ti-send"></i>Publicar</button>`,
    'lg');
}

function anTexto(qual){
  const pac = AN.pacote;
  if(!pac) return '';
  if(qual === 'neg')  return pac.negativo;
  if(qual === 'leg')  return pac.legenda;
  if(qual === 'tudo') return pac.produto + ' — ' + pac.estilo + ' · ' + pac.formato + ' · ' + pac.duracao + 's\n\n' +
    pac.cenas.map(c=>'CENA ' + c.n + ' (' + c.segundos + 's) — ' + c.papel +
      '\nNarração: ' + c.fala + '\nPrompt: ' + c.prompt_en).join('\n\n') +
    '\n\nPROMPT NEGATIVO\n' + pac.negativo +
    '\n\nLEGENDA\n' + pac.legenda;
  const c = pac.cenas.find(x=>x.n === Number(qual));
  return c ? c.prompt_en : '';
}
async function anCopiar(qual){
  const t = anTexto(qual);
  if(!t) return;
  try{ await navigator.clipboard.writeText(t); toast('Copiado.','ag'); }
  catch(e){ toast('Não consegui copiar automaticamente.','aw'); }
}
function anBaixar(){
  if(!AN.pacote) return;
  const nome = 'anuncio-' + garSlug(AN.pacote.produto) + '-' + AN.pacote.estiloId + '.json';
  baixarArquivo(JSON.stringify(AN.pacote, null, 2), nome, 'application/json');
}

/* manda as cenas para o formato que a fábrica de vídeo lê */
function anParaFabrica(){
  if(!AN.pacote) return;
  const pac = AN.pacote;
  const roteiro = {
    titulo: pac.produto + ' — ' + pac.estilo,
    formato: pac.formato,
    duracao: pac.duracao,
    legenda: pac.legenda,
    hashtags: pac.hashtags,
    cenas: pac.cenas.map(c=>({
      titulo: c.papel,
      segundos: c.segundos,
      fala: c.fala,
      texto: c.fala,
      imagem: c.prompt_pt,
      prompt: c.prompt_en
    }))
  };
  baixarArquivo(JSON.stringify(roteiro, null, 2),
    'roteiro-' + garSlug(pac.produto) + '.json', 'application/json');
  toast('Roteiro baixado. Ponha na pasta "roteiros" da fábrica e rode o MONTAR-VIDEO.','ag');
}

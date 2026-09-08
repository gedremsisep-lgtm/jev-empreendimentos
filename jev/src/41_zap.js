/* =========================================================================
   O CANAL DE PROMOÇÕES NO WHATSAPP

   O QUE ELE PEDIU, E O QUE O WHATSAPP DEIXA
   -----------------------------------------
   O pedido foi "um grupo de WhatsApp que coloque todas as promoções". Duas
   coisas precisam ser ditas com todas as letras, antes de qualquer botão:

   1. NENHUM PROGRAMA CRIA O CANAL POR VOCÊ. Criar é no seu celular, na sua
      conta, com o seu dedo. Isso não é limitação do JeV: é o WhatsApp, e é
      assim de propósito — se um programa pudesse criar canal e sair
      postando, o WhatsApp viraria um esgoto de propaganda em uma semana.

   2. NENHUM PROGRAMA POSTA NO CANAL POR VOCÊ. Existe uma API oficial de
      grupos da Meta, sim — mas ela exige "Official Business Account" (a
      conta verificada de empresa grande), não funciona com o WhatsApp
      Business comum, e o grupo dela aceita OITO participantes. Para um
      canal de promoções, ela não serve para nada.

   ENTÃO O QUE ESTA PEÇA FAZ
   ------------------------
   Faz o trabalho que sobra, que por acaso é todo o trabalho chato: escreve
   a promoção de cada produto no formato do WhatsApp — negrito no nome,
   preço velho riscado, preço novo em destaque, o SEU link de afiliado, e o
   aviso de publicidade que a lei exige. Depois abre o canal e vai passando
   as mensagens uma a uma, já copiadas: você cola e envia.

   Sete produtos viram sete colar-e-enviar. O que ele escolheu foi
   "todas de uma vez", e para CANAL isso é seguro — canal é transmissão,
   não conversa; não existe ali o risco de o WhatsApp achar que você está
   fazendo spam em grupo alheio. Num grupo comum eu teria desaconselhado.

   A REGRA QUE NÃO SE DOBRA
   ------------------------
   Produto sem link de afiliado NÃO entra na fila. Postar sem link é dar
   venda de graça para a loja: o seguidor compra, o produto sai, e você
   ganha zero. Eles ficam listados à parte, com o motivo escrito.
   ========================================================================= */

const ZAP = { deck: [], i: 0, aberto: false, editando: false };

/* --------------------------------------------------------------- o canal */
function zapCanal(){ return (CFG && CFG.zapCanal) || {}; }
function zapTemCanal(){ const c = zapCanal(); return !!(c.link && c.nome); }

/* O endereço de um canal é sempre https://whatsapp.com/channel/<código>.
   Conferir isso na hora de salvar evita o erro mais comum e mais chato de
   descobrir: colar o link de um GRUPO (chat.whatsapp.com) achando que é o
   do canal, e só perceber depois de montar a fila inteira. */
function zapLinkValido(u){
  return /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]{6,}/.test(String(u || '').trim());
}
function zapEhLinkDeGrupo(u){
  return /chat\.whatsapp\.com\//.test(String(u || ''));
}

async function zapSalvarCanal(){
  const nome = (val('zap-nome') || '').trim();
  const link = (val('zap-link') || '').trim();
  if (!nome) { toast('Dê um nome ao canal, para você se achar depois.', 'aw'); return; }
  if (zapEhLinkDeGrupo(link)){
    toast('Esse é o link de um GRUPO (chat.whatsapp.com), não de um canal. ' +
          'O do canal começa com whatsapp.com/channel/.', 'aw');
    return;
  }
  if (!zapLinkValido(link)){
    toast('O link do canal tem que ser assim: https://whatsapp.com/channel/XXXXXXXX', 'aw');
    return;
  }
  CFG = Object.assign({}, CFG, { zapCanal: { nome: nome, link: link,
                                             em: new Date().toISOString() } });
  await cfgSalvar();
  ZAP.editando = false;
  toast('Canal guardado. Agora dá para mandar as promoções.', 'ag');
  midiaRender();
}

function zapEditarCanal(){ ZAP.editando = true; midiaRender(); }
function zapAbrirCanal(){
  const c = zapCanal();
  if (c.link) window.open(c.link, '_blank', 'noopener');
}

/* ------------------------------------------------------- a mensagem pronta

   O WhatsApp entende quatro marcações e só quatro: *negrito*, _itálico_,
   ~riscado~ e ```mono```. É pouco, e é exatamente o suficiente para uma
   promoção ficar legível no meio de cem mensagens.                       */
function zapMensagem(f, prod, op){
  /* aceita `true` do jeito antigo e um objeto do jeito novo, para a peça das
     ofertas poder pedir a linha da loja sem duplicar esta função inteira */
  const o = (op === true) ? { convite: true } : (op || {});
  const comConvite = !!o.convite;
  const nome = f.produto || (prod && prod.n) || '';
  const preco = Number(f.preco) || Number(prod && prod.preco) || 0;
  const de = Number(prod && prod.de) || 0;
  const gancho = (prod && prod.gancho) || f.beneficio || '';
  const nota = Number(prod && prod.nota) || 0;
  const vend = Number(prod && prod.vend) || 0;

  let t = '🔥 *' + nome + '*\n';

  if (de && de > preco) t += '\nDe ~' + moeda(de) + '~ por *' + moeda(preco) + '*';
  else if (preco)       t += '\nPor *' + moeda(preco) + '*';

  const social = [];
  if (nota) social.push('⭐ ' + qtd(nota, 1).replace('.', ','));
  if (vend) social.push(qtd(vend, 0) + '+ vendidos');
  if (social.length) t += '\n' + social.join(' · ');

  /* de qual loja é a oferta. Num grupo que recebe Shopee, Amazon e Mercado
     Livre no mesmo dia, saber onde vai clicar antes de clicar é metade da
     decisão — e evita a pergunta que sempre vem no grupo. */
  if (o.loja && f.plataforma) t += '\n🛒 ' + f.plataforma;

  if (gancho) t += '\n\n' + gancho;

  if (f.url) t += '\n\n👉 ' + f.url;

  /* o aviso de publicidade vai em TODA mensagem. Não é recomendação de
     etiqueta: é o Código de Defesa do Consumidor e o CONAR. Some primeiro
     quando alguém escreve com pressa, e é justamente o que dá multa. */
  t += '\n\n_Publicidade — ganho comissão por venda._';

  const c = zapCanal();
  if (comConvite && c.link) t += '\n\nCanal de promoções: ' + c.link;

  return t;
}

/* --------------------------------------------------------------- a fila */
/* Monta a fila a partir das FICHAS DE AFILIADO — que é o que existe nesta
   tela — e enriquece cada uma com o produto garimpado, quando houver, para
   ter o gancho, o preço cheio e as vendas. */
async function zapFila(){
  const progs = await dbGetAll('programas');
  const videos = await dbGetAll('videos');
  const porNome = {};
  videos.filter(function(v){ return v.origem === 'garimpo' && v.produto; })
        .forEach(function(v){
          porNome[String(v.produto.n || '').trim().toLowerCase()] = v.produto;
        });

  const prontos = [], semLink = [];
  progs.filter(function(f){ return f.ativo !== false && f.produto; })
       .sort(function(a, b){ return String(a.produto).localeCompare(String(b.produto)); })
       .forEach(function(f){
         const prod = porNome[String(f.produto).trim().toLowerCase()] || null;
         if (!f.url) { semLink.push(f); return; }
         prontos.push({ id: f.id, nome: f.produto, ficha: f, produto: prod,
                        texto: zapMensagem(f, prod, false) });
       });
  return { prontos: prontos, semLink: semLink };
}

/* ------------------------------------------------- mandar todas de uma vez */
async function zapMandarTodas(){
  if (!zapTemCanal()){
    toast('Primeiro guarde o link do seu canal aqui em cima.', 'aw');
    return;
  }
  const f = await zapFila();
  if (!f.prontos.length){
    toast(f.semLink.length
      ? 'Nenhum produto tem link de afiliado ainda. Sem link você não ganha comissão.'
      : 'Nenhum produto de afiliado cadastrado.', 'aw');
    return;
  }
  ZAP.deck = f.prontos;
  ZAP.i = 0;
  ZAP.aberto = true;
  /* a primeira já vai copiada, para o primeiro colar não precisar de clique */
  try { await navigator.clipboard.writeText(ZAP.deck[0].texto); } catch (e) {}
  zapAbrirCanal();
  toast('Canal aberto e a 1ª promoção já copiada. Cole lá, envie, e volte ' +
        'aqui para pegar a próxima.', 'ag');
  midiaRender();
}

async function zapCopiarAtual(avancar){
  const m = ZAP.deck[ZAP.i];
  if (!m) return;
  try { await navigator.clipboard.writeText(m.texto); }
  catch (e) { toast('Não consegui copiar sozinho — selecione o texto e copie na mão.', 'aw'); return; }
  if (avancar && ZAP.i < ZAP.deck.length - 1){
    ZAP.i++;
    toast('Copiada. Cole no canal e envie — depois pegue a ' + (ZAP.i + 1) + 'ª.', 'ag');
  } else if (avancar){
    toast('Essa era a última. Cole no canal e pronto.', 'ag');
  } else {
    toast('Copiada.', 'ag');
  }
  midiaRender();
}
function zapIr(i){ ZAP.i = Math.max(0, Math.min(ZAP.deck.length - 1, i)); midiaRender(); }
function zapFechar(){ ZAP.aberto = false; ZAP.deck = []; ZAP.i = 0; midiaRender(); }

/* ------------------------------------------------------------------ a tela */
function zapFormHTML(){
  const c = zapCanal();
  return '<div class="bd">' +
    '<div class="tt" style="margin-bottom:10px">' +
      '<b>O canal você cria no celular</b> — nenhum programa pode criar por você, ' +
      'e isso é o WhatsApp que decide, não o JeV. É rápido: abra o WhatsApp, vá em ' +
      '<b>Atualizações</b>, toque no <b>+</b> ao lado de Canais, <b>Criar canal</b>. ' +
      'Depois entre no canal, toque no nome dele, e copie o <b>link do canal</b>. ' +
      'É esse link que vai aqui embaixo.</div>' +
    '<div class="fr">' +
      '<div class="fg"><label>Nome do canal</label>' +
        '<input id="zap-nome" value="' + esc(c.nome || '') + '" ' +
        'placeholder="Promoções JeV"></div>' +
      '<div class="fg"><label>Link do canal</label>' +
        '<input id="zap-link" value="' + esc(c.link || '') + '" ' +
        'placeholder="https://whatsapp.com/channel/XXXXXXXXXXXX"></div>' +
    '</div>' +
    '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn gn" onclick="zapSalvarCanal()">' +
        '<i class="ti ti-device-floppy"></i>Guardar o canal</button>' +
      (zapTemCanal()
        ? '<button class="btn gh" onclick="ZAP.editando=false;midiaRender()">Cancelar</button>' : '') +
    '</div></div>';
}

function zapDeckHTML(){
  const n = ZAP.deck.length;
  const m = ZAP.deck[ZAP.i];
  if (!m) return '';
  const ultima = ZAP.i === n - 1;
  return '<div class="bd" style="border-top:1px solid var(--bg3)">' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px">' +
      '<b style="font-size:15px">Promoção ' + (ZAP.i + 1) + ' de ' + n + '</b>' +
      '<span class="st s-nt">' + esc(m.nome) + '</span>' +
      '<span class="sp"></span>' +
      '<button class="btn xs gh" onclick="zapAbrirCanal()">' +
        '<i class="ti ti-external-link"></i>Abrir o canal</button>' +
      '<button class="btn xs gh" onclick="zapFechar()">' +
        '<i class="ti ti-x"></i>Fechar</button>' +
    '</div>' +

    '<textarea readonly rows="10" ' +
      'style="width:100%;box-sizing:border-box;font-size:12.5px;white-space:pre-wrap">' +
      esc(m.texto) + '</textarea>' +

    '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      (ZAP.i > 0
        ? '<button class="btn xs gh" onclick="zapIr(' + (ZAP.i - 1) + ')">' +
          '<i class="ti ti-chevron-left"></i>Anterior</button>' : '') +
      '<button class="btn gn" onclick="zapCopiarAtual(true)">' +
        '<i class="ti ti-copy"></i>' +
        (ultima ? 'Copiar a última' : 'Copiei e enviei — próxima') + '</button>' +
      (!ultima
        ? '<button class="btn xs gh" onclick="zapIr(' + (ZAP.i + 1) + ')">' +
          'Pular<i class="ti ti-chevron-right"></i></button>' : '') +
      '<span class="tt">Cole no canal com <b>Ctrl+V</b> e envie. ' +
        'O texto some daqui só quando você fechar.</span>' +
    '</div>' +

    '<div class="chips" style="margin-top:10px">' +
      ZAP.deck.map(function(x, i){
        const on = i === ZAP.i;
        return '<button class="chip' + (on ? ' on' : '') + '" onclick="zapIr(' + i + ')"' +
          (on ? ' style="background:var(--green);color:#fff"' : '') + '>' + (i + 1) + '</button>';
      }).join('') +
    '</div></div>';
}

async function zapSecaoHTML(){
  const c = zapCanal();
  const f = await zapFila();

  let h = '<div class="card tw" style="margin-bottom:14px">' +
    '<div class="hd"><i class="ti ti-brand-whatsapp" style="color:#25D366"></i>' +
    'Canal de promoções no WhatsApp' +
    (zapTemCanal() ? '<span class="st s-ok">' + esc(c.nome) + '</span>' : '') +
    (f.prontos.length ? '<span class="st s-nt">' + f.prontos.length + ' promoção(ões) prontas</span>' : '') +
    '<span class="sp"></span>' +
    (zapTemCanal() && !ZAP.editando
      ? '<button class="btn sm gh" onclick="zapEditarCanal()"><i class="ti ti-edit"></i>Trocar o canal</button>'
      : '') +
    '</div>';

  if (!zapTemCanal() || ZAP.editando) return h + zapFormHTML() + '</div>';

  h += '<div class="bd">';

  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<button class="btn gn" onclick="zapMandarTodas()">' +
      '<i class="ti ti-brand-whatsapp"></i>Mandar todas as promoções</button>' +
    '<button class="btn gh" onclick="zapAbrirCanal()">' +
      '<i class="ti ti-external-link"></i>Abrir o canal</button>' +
    '<span class="tt">Abro o canal e vou te passando as ' + f.prontos.length +
      ' mensagens já escritas, uma por vez. Você cola e envia.</span>' +
    '</div>';

  /* a verdade sobre o "sozinho", escrita onde ele vai clicar */
  h += '<div class="tt" style="margin-top:9px">O WhatsApp não deixa nenhum programa ' +
    'enviar por você — nem este, nem os que prometem. Quem aperta enviar é você, ' +
    'sempre. O que eu tiro do seu caminho é escrever sete promoções na mão.</div>';

  if (f.semLink.length)
    h += '<div class="al aw" style="margin-top:10px"><i class="ti ti-link-off"></i><div>' +
      '<b>' + f.semLink.length + ' produto(s) fora da fila, por falta do seu link de afiliado.</b> ' +
      'Postar sem link é entregar a venda de graça para a loja: o seguidor compra, ' +
      'você ganha zero. Gere o link no painel da plataforma e cole na ficha do produto ' +
      'aqui embaixo.<div class="tt" style="margin-top:5px">' +
      esc(f.semLink.slice(0, 6).map(function(x){ return x.produto; }).join(' · ')) +
      (f.semLink.length > 6 ? ' e mais ' + (f.semLink.length - 6) : '') +
      '</div></div></div>';

  if (!f.prontos.length && !f.semLink.length)
    h += '<div class="tt" style="margin-top:10px">Nenhum produto de afiliado cadastrado ainda. ' +
      'Garimpe um produto e ele aparece aqui sozinho.</div>';

  h += '</div>';

  if (ZAP.aberto && ZAP.deck.length) h += zapDeckHTML();

  h += '</div>';
  return h;
}

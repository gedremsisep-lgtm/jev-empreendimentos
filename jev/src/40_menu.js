/* =========================================================================
   O MENU DE MÍDIA, ARRUMADO.

   O QUE ESTAVA ERRADO — e o número que mostra
   -------------------------------------------
   Nove abas lado a lado, e cada uma abrindo uma tela cheia. Medindo a aba
   "Vídeos e pauta" com apenas DOIS produtos: 21 botões na tela, sendo 9 num
   único cartão de produto. Com os sete produtos que ele tem de verdade,
   passa de cinquenta. Ninguém escolhe entre cinquenta botões — a pessoa
   congela, ou clica em qualquer um e torce.

   O CONSERTO, EM DUAS CAMADAS
   ---------------------------
   1. As nove abas viram TRÊS, pela ordem do trabalho: fazer, publicar, ver
      o resultado. O que é cadastro (canais, afiliados, plataformas) sai da
      frente e vira um botão discreto no canto — ele é consultado uma vez por
      mês, não a cada vídeo.

   2. Dentro de cada grupo, as telas antigas continuam INTEIRAS, como
      sub-abas. Nada foi removido: só mudou de andar.

   Esta peça não reescreve nenhuma tela. Ela troca a barra de cima e chama
   exatamente as mesmas funções de antes. É por isso que ela não pode quebrar
   o que já funcionava — ela não sabe fazer o trabalho delas.               */

const MENU_GRUPOS = [
  { id: 'fazer', nome: 'Fazer vídeo', ic: 'ti-wand',
    diz: 'Do produto garimpado até o vídeo pronto no seu computador.',
    abas: [
      { id: 'gar',    nome: 'Garimpar produto', ic: 'ti-pick' },
      { id: 'videos', nome: 'Pauta e vídeos',   ic: 'ti-video' },
      { id: 'gerar',  nome: 'Montar do zero',   ic: 'ti-sparkles' },
      { id: 'cort',   nome: 'Cortes de vídeo longo', ic: 'ti-scissors' }
    ] },
  { id: 'publicar', nome: 'Publicar', ic: 'ti-send',
    diz: 'Levar o vídeo pronto para as plataformas. O último clique é sempre seu.',
    abas: [
      { id: 'pub',  nome: 'Publicar um vídeo', ic: 'ti-send' },
      { id: 'plat', nome: 'Onde publicar',     ic: 'ti-world' }
    ] },
  { id: 'resultado', nome: 'Resultados', ic: 'ti-chart-bar',
    diz: 'O que rendeu, por canal e por vídeo.',
    abas: [
      { id: 'des', nome: 'Desempenho', ic: 'ti-chart-bar' }
    ] },
  { id: 'cadastros', nome: 'Cadastros', ic: 'ti-folder', discreto: true,
    diz: 'O que você preenche uma vez e quase não mexe depois.',
    abas: [
      { id: 'canais', nome: 'Canais',    ic: 'ti-device-tv' },
      { id: 'afil',   nome: 'Afiliados', ic: 'ti-link' }
    ] }
];

/* de qual grupo é esta aba? */
function menuGrupoDe(aba){
  for (const g of MENU_GRUPOS) if (g.abas.some(a => a.id === aba)) return g;
  return MENU_GRUPOS[0];
}

function menuAbaDe(aba){
  for (const g of MENU_GRUPOS){
    const a = g.abas.find(x => x.id === aba);
    if (a) return a;
  }
  return null;
}

/* A barra inteira: grupos em cima, telas do grupo embaixo.

   A sub-barra só aparece quando o grupo tem mais de uma tela — mostrar uma
   aba sozinha é enfeite que ocupa espaço e não ajuda a escolher nada. */
function menuBarraHTML(atual){
  const g = menuGrupoDe(atual);

  const grupos = MENU_GRUPOS.filter(x => !x.discreto).map(function(x){
    const ligado = x.id === g.id;
    return '<button class="tab' + (ligado ? ' on' : '') + '" title="' + esc(x.diz) + '" ' +
      'onclick="menuIrGrupo(\'' + x.id + '\')">' +
      '<i class="ti ' + x.ic + '"></i>' + esc(x.nome) + '</button>';
  }).join('');

  /* as telas do grupo entram na MESMA linha, depois de um risco. Duas barras
     empilhadas eram dois andares de navegação antes de qualquer conteúdo. */
  let dentro = '';
  if (g.abas.length > 1)
    /* as telas do grupo entram como PASTILHAS, não como abas. Se as duas
       coisas tivessem o mesmo desenho, a linha teria dois botões acesos ao
       mesmo tempo e ninguém entenderia qual manda em qual. */
    dentro = '<span style="width:1px;height:24px;background:var(--bg3);margin:0 8px"></span>' +
      g.abas.map(function(a){
        const on = a.id === atual;
        return '<button class="chip' + (on ? ' on' : '') + '" ' +
          'style="margin:0 3px 0 0' + (on ? ';background:var(--green);color:#fff' : '') + '" ' +
          'onclick="midStab(\'' + a.id + '\')">' +
          '<i class="ti ' + a.ic + '"></i> ' + esc(a.nome) + '</button>';
      }).join('');

  const cad = MENU_GRUPOS.find(x => x.discreto);
  const cadLigado = cad && cad.id === g.id;
  const botaoCad = '<button class="tab' + (cadLigado ? ' on' : '') + '" ' +
    'style="margin-left:auto;opacity:' + (cadLigado ? '1' : '.62') + '" ' +
    'onclick="menuIrGrupo(\'' + cad.id + '\')" title="Canais e afiliados">' +
    '<i class="ti ' + cad.ic + '"></i>' + esc(cad.nome) + '</button>';

  let h = '<div class="tabs" style="display:flex;align-items:center;flex-wrap:wrap">' +
    grupos + dentro + botaoCad + '</div>';

  return h;
}

/* Clicar num grupo leva para a PRIMEIRA tela dele — a que a pessoa quer em
   nove de cada dez vezes. Se ela já estava numa tela daquele grupo, fica
   onde estava, em vez de ser jogada de volta para o começo. */
function menuIrGrupo(id){
  const g = MENU_GRUPOS.find(x => x.id === id);
  if (!g) return;
  if (g.abas.some(a => a.id === MID_TAB)) { midiaRender(); return; }
  midStab(g.abas[0].id);
}


/* =========================================================================
   O CARTÃO DO PRODUTO: UM PASSO DE CADA VEZ

   O cartão tinha NOVE botões lado a lado: ver o prompt, copiar o prompt,
   baixar as mídias, gerar o vídeo, publicar, assistir, materiais, soltar
   materiais, estúdio de prompt e a lixeira. Todos do mesmo tamanho, todos
   igualmente convidativos. Quem nunca montou um vídeo não tem como saber
   que "publicar" antes de "gerar" não faz nada, ou que "gerar" antes de
   "baixar as mídias" produz um vídeo de fundo liso com texto por cima.

   A ordem sempre existiu — ela só estava na cabeça de quem escreveu o
   programa, e não na tela. Agora está na tela: um botão grande, que é o
   próximo passo de verdade, e os outros oito atrás de "mais opções".

   E o passo que vinha sempre em par — baixar as mídias e então montar —
   virou um clique só. Ninguém quer "baixar mídias"; a pessoa quer o vídeo.
   Baixar era só o pedágio.

   Onde a corrente PARA, de propósito: antes de publicar. Publicar é o
   único passo que sai deste computador e vira uma coisa pública com o nome
   dele. Esse clique continua sendo dele, sempre.                         */

const MENU_MAIS = {};        /* cartões com "mais opções" aberto */

/* Quantos passos já foram vencidos. É lido do próprio item — nada aqui é
   guardado à parte, então não existe estado para dessincronizar. */
function menuFeito(item){
  return {
    midias:    (item.midia || []).length > 0,
    video:     (item.producao || []).length > 0,
    visto:     !!item.visto,
    publicado: item.status === 'Publicado'
  };
}

const MENU_PASSOS_N = 4;

/* O ÚNICO botão que o cartão mostra fechado. Devolve null quando o produto
   já foi até o fim — aí o cartão fica quieto, que é o certo. */
function pautaProximoPasso(item){
  const f = menuFeito(item);
  const app = (typeof estTem === 'function') && estTem();

  /* no navegador o computador não monta nada; o que ajuda é o texto */
  if (!app) return {
    id: 'prompt', n: 1, ic: 'ti-copy', cor: 'pu',
    rotulo: 'Copiar o prompt deste produto',
    acao: 'pautaCopiarPrompt(' + item.id + ')',
    diz: 'Montar o vídeo sozinho é coisa do aplicativo do Windows. Aqui no ' +
         'navegador, copie o prompt e cole na IA de vídeo que você usa.'
  };

  if (!f.video && !f.midias) return {
    id: 'corrente', n: 1, ic: 'ti-wand', cor: 'pu',
    rotulo: 'Fazer o vídeo deste produto',
    acao: 'menuCorrente(' + item.id + ')',
    diz: 'Eu busco as fotos e o vídeo na página de onde ele foi garimpado e ' +
         'monto o vídeo na sequência. Um clique só; você não precisa voltar aqui no meio.'
  };

  if (!f.video) return {
    id: 'video', n: 2, ic: 'ti-wand', cor: 'pu',
    rotulo: 'Montar o vídeo agora',
    acao: 'pautaGerar(' + item.id + ')',
    diz: 'As mídias já estão no seu computador. Falta montar.'
  };

  if (!f.visto) return {
    id: 'assistir', n: 3, ic: 'ti-player-play', cor: 'bl',
    rotulo: 'Assistir o vídeo',
    acao: 'pautaAssistir(' + item.id + ')',
    diz: 'O vídeo ficou pronto. Assista antes de publicar — é o seu nome que vai junto.'
  };

  if (!f.publicado) return {
    id: 'publicar', n: 4, ic: 'ti-send', cor: 'gn',
    rotulo: 'Publicar em todas as plataformas',
    acao: 'pautaPublicar(' + item.id + ')',
    diz: 'Abro todas as plataformas com o texto e o arquivo prontos. O clique de ' +
         'publicar em cada uma continua sendo seu.'
  };

  return null;
}

/* O bloco que substitui a fileira de nove botões. */
function menuPassoHTML(item){
  const passo = pautaProximoPasso(item);
  const mais  = !!MENU_MAIS[item.id];
  const andando = PAUTA.montando === item.id;

  let h = '<div style="margin-top:12px" class="no-print">';

  if (passo && !andando){
    h += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<button class="btn ' + passo.cor + '" onclick="' + passo.acao + '">' +
        '<i class="ti ' + passo.ic + '"></i>' + esc(passo.rotulo) + '</button>' +
      '<span class="tt">Passo ' + passo.n + ' de ' + MENU_PASSOS_N + '</span>' +
      '</div>' +
      '<div class="tt" style="margin-top:5px;max-width:56em">' + esc(passo.diz) + '</div>';
  } else if (!passo){
    h += '<div class="tt"><i class="ti ti-circle-check"></i> ' +
      'Publicado. Nada a fazer neste — o desempenho aparece em <b>Resultados</b>.</div>';
  }

  h += '<div style="margin-top:8px"><button class="btn xs gh" onclick="menuMaisOpcoes(' + item.id + ')">' +
    '<i class="ti ti-' + (mais ? 'chevron-up' : 'dots') + '"></i>' +
    (mais ? 'Esconder as opções' : 'Mais opções') + '</button></div>';

  h += '</div>';
  return h;
}

function menuMaisOpcoes(id){
  MENU_MAIS[id] = !MENU_MAIS[id];
  midiaRender();
}

/* A CORRENTE: baixar e montar num clique só.

   Se o download falhar de verdade, ela para — e para calada, porque
   pautaBaixarMidias já deixou o motivo escrito no cartão. Se vier foto mas
   não vier vídeo, ela SEGUE: um vídeo de fotos é pior que um com o vídeo do
   vendedor, mas é muito melhor que nada, e o aviso continua na tela. */
async function menuCorrente(id){
  await pautaBaixarMidias(id);
  const item = await dbGet('videos', id);
  if (!item) return;
  if (!(item.midia || []).length) return;   /* o motivo já está na tela */
  await pautaGerar(id);
}


/* =========================================================================
   TRÊS DESENHOS DIFERENTES DA MESMA TELA

   O primeiro arranjo não agradou. Em vez de mexer no mesmo desenho de novo,
   aqui estão três formas realmente distintas de mostrar os mesmos produtos,
   com as mesmas ações por trás. Ele escolhe olhando, não imaginando.

     assistente — um produto de cada vez, tela grande, nada em volta
     fila       — uma linha por produto, tudo cabendo numa tela só
     esteira    — três colunas, e o produto anda da esquerda para a direita

   O que os três têm em comum: nenhum deles mostra os seis quadrados de
   inscritos e receita no alto. Aquilo é resultado, e resultado tem aba
   própria — quem entrou aqui para fazer um vídeo não veio ler faturamento. */

let MENU_ESTILO = 'fila';
function menuEstilo(e){ MENU_ESTILO = e; midiaRender(); }

/* o seletor dos três, discreto, no alto da lista */
function menuEstiloHTML(){
  const op = [ {id:'assistente', n:'Um de cada vez', ic:'ti-focus-2'},
               {id:'fila',       n:'Lista',          ic:'ti-list'},
               {id:'esteira',    n:'Esteira',        ic:'ti-layout-columns'} ];
  /* só os três ícones, encaixados no cabeçalho do cartão. A frase "como você
     prefere ver" era uma linha inteira de tela para explicar três botõezinhos
     que se explicam sozinhos ao serem clicados. */
  return op.map(function(o){
    const on = o.id === MENU_ESTILO;
    return '<button class="btn xs ' + (on ? 'gn' : 'gh') + '" title="' + esc(o.n) + '" ' +
      'onclick="menuEstilo(\'' + o.id + '\')"><i class="ti ' + o.ic + '"></i></button>';
  }).join('');
}

/* uma linha só de identificação, igual nos três desenhos */
function menuLinhaProduto(item){
  const p = item.produto;
  return '<b style="font-size:14.5px">' + esc(p.n) + '</b>' +
    '<div class="tt" style="margin-top:2px">' +
    (p.ganho ? '<b>~' + moeda(p.ganho) + '</b> por venda' : moeda(p.preco)) +
    (p.vend ? ' · ' + qtd(p.vend, 0) + '+ vendidos' : '') + '</div>';
}

/* ---------------------------------------------- 1) UM DE CADA VEZ */
/* Só o próximo produto da fila ocupa a tela. Os outros viram um número.
   É o desenho de quem senta para trabalhar e não quer escolher nada. */
function menuAssistenteHTML(itens){
  const fila = itens.filter(i => pautaProximoPasso(i));
  const prontos = itens.length - fila.length;
  if (!fila.length)
    return '<div class="card"><div class="bd"><div class="empty">' +
      '<i class="ti ti-circle-check"></i><b>Nada na fila</b>' +
      'Os ' + itens.length + ' produtos já foram até o fim.</div></div></div>';

  const item = fila[MENU_FOCO % fila.length];
  const passo = pautaProximoPasso(item);
  const p = item.produto;

  let h = '<div class="card" style="border-color:var(--green)"><div class="bd" style="padding:22px 20px">' +
    '<div class="sh" style="margin:0 0 10px">Agora — ' + (MENU_FOCO % fila.length + 1) +
      ' de ' + fila.length + ' na fila</div>' +
    '<div style="font-size:20px;font-weight:800;line-height:1.25">' + esc(p.n) + '</div>' +
    (p.gancho ? '<div style="font-size:14px;margin-top:6px;color:var(--text2)">' +
      '<b>Gancho:</b> ' + esc(p.gancho) + '</div>' : '') +
    '<div class="tt" style="margin-top:6px">' +
      (p.ganho ? '<b>~' + moeda(p.ganho) + '</b> por venda · ' : '') +
      moeda(p.preco) + (p.vend ? ' · ' + qtd(p.vend, 0) + '+ vendidos' : '') + '</div>' +

    '<div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<button class="btn ' + passo.cor + '" style="font-size:15px;padding:12px 20px" ' +
        'onclick="' + passo.acao + '">' +
        '<i class="ti ' + passo.ic + '"></i>' + esc(passo.rotulo) + '</button>' +
      '<span class="tt">Passo ' + passo.n + ' de ' + MENU_PASSOS_N + '</span>' +
    '</div>' +
    '<div class="tt" style="margin-top:8px;max-width:52em">' + esc(passo.diz) + '</div>' +

    '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--bg3);' +
      'display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      (fila.length > 1
        ? '<button class="btn xs gh" onclick="menuPular()">' +
          '<i class="ti ti-arrow-right"></i>Este não, mostra o próximo</button>' : '') +
      '<button class="btn xs gh" onclick="menuMaisOpcoes(' + item.id + ')">' +
        '<i class="ti ti-dots"></i>Mais opções deste</button>' +
      '<span class="tt">' + (fila.length - 1) + ' esperando' +
        (prontos ? ' · ' + prontos + ' já pronto(s)' : '') + '</span>' +
    '</div>';

  h += pautaDetalhesHTML(item);
  h += '</div></div>';
  return h;
}
let MENU_FOCO = 0;
function menuPular(){ MENU_FOCO++; midiaRender(); }

/* ---------------------------------------------- 2) LISTA */
/* Uma linha por produto. Os sete cabem numa tela, e a coluna da direita é
   sempre a mesma: o botão do próximo passo. Dá para bater o olho e ver
   onde cada um parou sem abrir nada. */
function menuFilaHTML(itens){
  const CORES = { corrente:'#7C4DBE', video:'#7C4DBE', prompt:'#7C4DBE',
                  assistir:'#2D6CDF', publicar:'#1F7A44' };
  let h = '<div class="card"><div class="bd" style="padding:6px 0">';
  itens.forEach(function(item, i){
    const passo = pautaProximoPasso(item);
    const cor = passo ? (CORES[passo.id] || 'var(--green)') : 'var(--text3)';
    h += '<div id="pauta-' + item.id + '" style="display:flex;gap:12px;align-items:center;' +
      'padding:12px 16px' + (i ? ';border-top:1px solid var(--bg3)' : '') + '">' +
      '<div style="width:6px;height:34px;border-radius:3px;background:' + cor + ';flex:none"></div>' +
      '<div style="flex:1;min-width:180px">' + menuLinhaProduto(item) + '</div>' +
      '<div class="tt" style="width:96px;flex:none;text-align:right">' +
        (passo ? 'Passo ' + passo.n + ' de ' + MENU_PASSOS_N : 'publicado') + '</div>' +
      '<div style="flex:none;display:flex;gap:6px" class="no-print">' +
        (passo
          ? '<button class="btn xs ' + passo.cor + '" onclick="' + passo.acao + '">' +
            '<i class="ti ' + passo.ic + '"></i>' + esc(passo.rotulo) + '</button>'
          : '<span class="st s-ok"><i class="ti ti-check"></i>no ar</span>') +
        '<button class="btn xs gh" onclick="menuMaisOpcoes(' + item.id + ')" title="Mais opções">' +
          '<i class="ti ti-dots"></i></button>' +
      '</div></div>';
    const det = pautaDetalhesHTML(item);
    if (det) h += '<div style="padding:0 16px 14px 34px">' + det + '</div>';
  });
  h += '</div></div>';
  return h;
}

/* ---------------------------------------------- 3) ESTEIRA */
/* Três colunas fixas, e o produto anda da esquerda para a direita conforme
   vai ficando pronto. Ninguém precisa lembrar a ordem: ela está desenhada. */
const MENU_COLUNAS = [
  { id:'fazer',    n:'1. Fazer o vídeo', ic:'ti-wand',        cor:'#7C4DBE',
    diz:'ainda não tem vídeo montado' },
  { id:'conferir', n:'2. Conferir',      ic:'ti-player-play', cor:'#2D6CDF',
    diz:'tem vídeo, falta você assistir' },
  { id:'publicar', n:'3. Publicar',      ic:'ti-send',        cor:'#1F7A44',
    diz:'assistido, pronto para ir ao ar' }
];
function menuColunaDe(item){
  const p = pautaProximoPasso(item);
  if (!p) return 'publicado';
  if (p.id === 'assistir') return 'conferir';
  if (p.id === 'publicar') return 'publicar';
  return 'fazer';
}
function menuEsteiraHTML(itens){
  const publicados = itens.filter(i => menuColunaDe(i) === 'publicado');
  let h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">';
  MENU_COLUNAS.forEach(function(c){
    const dentro = itens.filter(i => menuColunaDe(i) === c.id);
    h += '<div class="card"><div class="bd" style="padding:14px 12px">' +
      '<div class="sh" style="margin:0 0 3px;color:' + c.cor + '">' +
        '<i class="ti ' + c.ic + '"></i>' + esc(c.n) + ' (' + dentro.length + ')</div>' +
      '<div class="tt" style="margin-bottom:10px">' + esc(c.diz) + '</div>';
    if (!dentro.length)
      h += '<div class="tt" style="padding:16px 0;text-align:center;opacity:.6">— vazio —</div>';
    dentro.forEach(function(item){
      const passo = pautaProximoPasso(item);
      h += '<div id="pauta-' + item.id + '" style="border:1px solid var(--bg3);border-radius:9px;' +
        'padding:10px;margin-bottom:8px">' + menuLinhaProduto(item) +
        '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap" class="no-print">' +
          '<button class="btn xs ' + passo.cor + '" onclick="' + passo.acao + '">' +
            '<i class="ti ' + passo.ic + '"></i>' + esc(passo.rotulo) + '</button>' +
          '<button class="btn xs gh" onclick="menuMaisOpcoes(' + item.id + ')" title="Mais opções">' +
            '<i class="ti ti-dots"></i></button>' +
        '</div>' +
        pautaDetalhesHTML(item) +
        '</div>';
    });
    h += '</div></div>';
  });
  h += '</div>';
  if (publicados.length)
    h += '<div class="tt" style="margin-top:10px"><i class="ti ti-check"></i> ' +
      publicados.length + ' já publicado(s) — o desempenho aparece em <b>Resultados</b>.</div>';
  return h;
}

/* o despachante dos três */
function menuListaHTML(itens){
  if (MENU_ESTILO === 'assistente') return menuAssistenteHTML(itens);
  if (MENU_ESTILO === 'esteira')    return menuEsteiraHTML(itens);
  return menuFilaHTML(itens);
}

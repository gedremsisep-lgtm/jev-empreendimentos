/* =========================================================================
   O PREPARO AUTOMÁTICO — garimpou, já sai tudo pronto.

   O QUE ESTAVA ERRADO
   -------------------
   O garimpo antigo já cadastrava o produto como afiliado sozinho. O garimpo
   pelo Kalodata, que virou a fonte principal, não fazia isso — então o dono
   garimpava sete produtos e depois preenchia sete fichas na mão, uma por
   uma: produto, plataforma, tipo, comissão, preço, nicho, o que resolve.
   Trabalho de digitação que o programa já tinha os dados para fazer.

   O CONSERTO
   ----------
   Tudo que entra na pauta passa por um funil só (pautaDoGarimpo). É ali que
   o preparo entra, então serve para o Kalodata, para o garimpo antigo e para
   qualquer fonte que venha depois — sem precisar lembrar de ligar em cada
   uma.

   O QUE ELE PREENCHE E O QUE ELE NÃO INVENTA
   ------------------------------------------
   Preenche: nome, plataforma, tipo, comissão, preço, ganho por venda, nicho
   e o que o produto resolve. Tudo isso o garimpo já sabe.

   NÃO preenche o link de afiliado, e isso é de propósito. O link rastreável
   só existe depois que VOCÊ o gera no painel da plataforma (o Link Builder
   do Mercado Livre, por exemplo). Um link chutado aqui seria pior que campo
   vazio: parece pronto, e a venda vai para outra pessoa.                   */

/* ------------------------------------------------------- a ficha de afiliado

   O nome da plataforma de afiliado sai do produto: quem veio do TikTok Shop
   é TikTok Shop, quem veio do Mercado Livre é Mercado Livre. Chutar aqui
   faria o dono procurar o link no painel errado.                          */
function prepPlataformaDe(p){
  if (!p) return 'Outra';
  if (p.tt) return 'TikTok Shop';
  const l = (p.links && p.links[0]) || null;
  const u = String((l && l.url) || '').toLowerCase();
  if (/tiktok/.test(u)) return 'TikTok Shop';
  if (/mercadoliv|mercadolibre/.test(u)) return 'Mercado Livre';
  if (/shopee/.test(u)) return 'Shopee';
  if (/amazon/.test(u)) return 'Amazon';
  if (/magazineluiza|magalu/.test(u)) return 'Magalu';
  if (/americanas/.test(u)) return 'Americanas';
  if (p.loja) return String(p.loja);
  return 'Outra';
}

function prepFicha(p){
  const preco = Number(p && p.preco) || 0;
  const com = Number(p && p.comissao) || 0;
  return {
    produto: (p && (p.n || p.nome)) || '',
    plataforma: prepPlataformaDe(p),
    url: '',                       /* só o dono gera; ver o comentário acima */
    tipo: 'Físico',
    comissao: com,
    preco: preco,
    nicho: (typeof garNicho === 'function' && p && p.g) ? garNicho(p.g).n : (p && p.familia) || '',
    vendas: 0,
    ganhoTotal: 0,
    beneficio: (p && (p.porque || p.gancho)) || '',
    ativo: true,
    doGarimpo: true
  };
}

/* A CHAVE É O NOME DO PRODUTO, e só ele.

   Eu tinha usado nome + plataforma, e um teste antigo me corrigiu: o mesmo
   produto é vendido em várias lojas ao mesmo tempo. Garimpando com o filtro
   do TikTok ele vem rotulado TikTok Shop; garimpando com todas as lojas, o
   mesmo produto vem rotulado Mercado Livre. Com a chave composta, isso
   virava duas fichas do mesmo produto — o teste acusou 12 onde deviam ser 7.

   Uma ficha por produto. A plataforma é escolhida na primeira vez e não é
   trocada depois, porque é nela que o dono foi gerar o link. */
function prepChaveFicha(f){
  return String((f && f.produto) || '').trim().toLowerCase();
}

async function prepSalvarFichas(lista){
  const produtos = Array.isArray(lista) ? lista.filter(Boolean) : [];
  if (!produtos.length) return { novas: 0, jaTinha: 0 };
  const antigos = await dbGetAll('programas');
  const vistos = {};
  antigos.forEach(function(a){ vistos[prepChaveFicha(a)] = a; });

  let novas = 0, jaTinha = 0;
  for (const p of produtos){
    const f = prepFicha(p);
    if (!f.produto) continue;
    const k = prepChaveFicha(f);
    if (vistos[k]){
      /* já existe: NÃO sobrescreve o link que o dono colou nem as vendas
         que ele anotou — só completa o que estiver em branco */
      const v = vistos[k];
      const faltando = {};
      if (!v.preco && f.preco) faltando.preco = f.preco;
      if (!v.comissao && f.comissao) faltando.comissao = f.comissao;
      if (!v.nicho && f.nicho) faltando.nicho = f.nicho;
      if (!v.beneficio && f.beneficio) faltando.beneficio = f.beneficio;
      if (Object.keys(faltando).length) await dbPut('programas', Object.assign({}, v, faltando));
      jaTinha++;
      continue;
    }
    await dbAdd('programas', f);
    vistos[k] = f;
    novas++;
  }
  return { novas: novas, jaTinha: jaTinha };
}

/* ------------------------------------------------------- a legenda de cada

   Mesma conta do disparo, mas sem depender do estado da tela: recebe o
   produto e devolve o texto de cada plataforma, já cortado no limite dela.
   Assim dá para preparar sete produtos de uma vez, sem abrir nenhum.     */
function prepTexto(p, pid, link){
  const pl = (typeof plat === 'function') ? plat(pid) : null;
  if (!pl || !p) return { id: pid, titulo: null, texto: '', usados: 0, limite: 0 };

  const gancho = p.gancho || p.n || '';
  const preco = Number(p.preco) || 0;
  const de = Number(p.de) || 0;
  const hs = (typeof anHashtags === 'function' ? anHashtags(p) : [])
               .slice(0, pl.hashRec || 4).join(' ');
  const endereco = link || ((p.links && p.links[0]) ? p.links[0].url : '');
  const ficha = (p.n || '') + (preco ? ' — ' + moeda(preco) : '') +
                (de ? ' (de ' + moeda(de) + ')' : '');
  /* o aviso de publicidade não é enfeite: é exigência das plataformas e da
     lei do consumidor, e some primeiro quando alguém escreve na pressa */
  const aviso = 'Publicidade — ganho comissão por venda.';

  const curto = (pid === 'x' || pid === 'pin' || pid === 'snap' || pid === 'tw');
  const corpo = curto
    ? gancho + (endereco ? '\n' + endereco : '') + '\n' + aviso
    : gancho + '\n\n' + ficha + '\n' + (endereco ? endereco + '\n' : '') + aviso;

  const texto = (typeof cortar === 'function')
    ? cortar((corpo + (hs ? '\n\n' + hs : '')).trim(), pl.leg)
    : (corpo + (hs ? '\n\n' + hs : '')).trim();

  return {
    id: pid, nome: pl.nome,
    titulo: pl.tit ? ((typeof cortar === 'function') ? cortar(gancho, pl.tit) : gancho) : null,
    texto: texto, usados: texto.length, limite: pl.leg || 0,
    semLink: !endereco
  };
}

/* as plataformas que valem a pena por padrão: as que pagam por visualização */
function prepPlataformasPadrao(){
  if (typeof dispPadrao === 'function') { try { return dispPadrao(); } catch (e) {} }
  return ['yts', 'tt', 'ig', 'fb'];
}

function prepLegendas(p, link, quais){
  const alvo = (quais && quais.length) ? quais : prepPlataformasPadrao();
  return alvo.map(function(pid){ return prepTexto(p, pid, link); })
             .filter(function(t){ return !!t.texto; });
}

/* --------------------------------------------------- o preparo de um item

   Guarda o anúncio pronto dentro do próprio item da pauta. Fica salvo, então
   ele não some quando a tela fecha, e o botão de abrir todas não precisa
   recalcular nada — é só ler.                                            */
async function prepDoItem(item){
  if (!item || !item.produto) return null;
  /* o link vem da ficha de afiliado, se o dono já tiver colado um */
  let link = '';
  try {
    const progs = await dbGetAll('programas');
    const f = prepFicha(item.produto);
    const k = prepChaveFicha(f);
    const achado = progs.find(function(x){ return prepChaveFicha(x) === k; });
    if (achado && achado.url) link = achado.url;
  } catch (e) {}

  const legendas = prepLegendas(item.produto, link);
  return { legendas: legendas, link: link, em: new Date().toISOString(),
           faltaLink: !link };
}

/* --------------------------------------------------- preparar tudo de uma vez */
async function prepPrepararTudo(naTela){
  const todos = await dbGetAll('videos');
  const itens = todos.filter(function(v){ return v.origem === 'garimpo' && v.produto; });
  if (!itens.length){
    if (naTela !== false) toast('Não há produto garimpado para preparar.', 'aw');
    return { itens: 0, novas: 0, jaTinha: 0 };
  }

  const fichas = await prepSalvarFichas(itens.map(function(i){ return i.produto; }));

  let semLink = 0;
  for (const item of itens){
    const anuncio = await prepDoItem(item);
    if (!anuncio) continue;
    if (anuncio.faltaLink) semLink++;
    await dbPut('videos', Object.assign({}, item, { anuncio: anuncio }));
  }

  if (naTela !== false){
    toast(itens.length + ' produto(s) com anúncio pronto · ' +
      fichas.novas + ' ficha(s) nova(s) em Afiliados' +
      (semLink ? ' · ' + semLink + ' ainda sem o seu link' : ''), 'ag');
    midiaRender();
  }
  return { itens: itens.length, novas: fichas.novas, jaTinha: fichas.jaTinha, semLink: semLink };
}

/* Chamado pelo funil do garimpo: acontece sozinho, sem o dono pedir. */
async function prepAoGarimpar(produtos){
  const lista = (produtos || []).filter(Boolean);
  if (!lista.length) return { novas: 0, jaTinha: 0 };
  try { return await prepSalvarFichas(lista); }
  catch (e) { return { novas: 0, jaTinha: 0, erro: String((e && e.message) || e) }; }
}

/* --------------------------------------------------- abrir todas para publicar

   AQUI MORA UMA REGRA QUE NÃO SE NEGOCIA: este programa NÃO aperta o botão
   de publicar de plataforma nenhuma. Ele abre a página de cada uma com a
   legenda já na área de transferência e o vídeo à mão. O último clique é do
   dono, sempre — publicação é pública, não tem desfazer, e quem responde
   pela conta é ele.                                                       */
async function prepAbrirTodas(id){
  const item = await dbGet('videos', id);
  if (!item || !item.produto) return;

  let anuncio = item.anuncio;
  if (!anuncio || !anuncio.legendas || !anuncio.legendas.length){
    anuncio = await prepDoItem(item);
    if (anuncio) await dbPut('videos', Object.assign({}, item, { anuncio: anuncio }));
  }
  if (!anuncio || !anuncio.legendas.length){
    toast('Não consegui montar as legendas deste produto.', 'aw');
    return;
  }

  if (anuncio.faltaLink){
    toast('Atenção: ainda não há link de afiliado neste produto. ' +
          'Você pode publicar assim, mas não ganha comissão.', 'aw');
  }

  /* a legenda da primeira já vai colada, que é por onde se começa */
  try { await navigator.clipboard.writeText(anuncio.legendas[0].texto); } catch (e) {}

  let abertas = 0, bloqueadas = 0;
  const noApp = (typeof APP === 'function') && !!APP();
  anuncio.legendas.forEach(function(t){
    const pl = (typeof plat === 'function') ? plat(t.id) : null;
    if (!pl || !pl.url) return;
    const j = window.open(pl.url, '_blank', 'noopener');
    if (!j && !noApp) bloqueadas++; else abertas++;
  });

  await dbPut('videos', Object.assign({}, await dbGet('videos', id),
    { anuncio: Object.assign({}, anuncio, { abertoEm: new Date().toISOString() }) }));

  toast(bloqueadas
    ? bloqueadas + ' aba(s) o navegador bloqueou. Libere as janelas para este endereço.'
    : abertas + ' plataforma(s) aberta(s). A legenda da primeira já está colada — ' +
      'confira e publique você mesmo em cada uma.',
    bloqueadas ? 'aw' : 'ag');
  midiaRender();
}

/* --------------------------------------------------------------- a tela */
function prepCartaoHTML(item){
  const a = item && item.anuncio;
  if (!a || !a.legendas || !a.legendas.length){
    return '<div style="margin-top:9px">' +
      '<button class="btn xs" onclick="prepUm(' + item.id + ')">' +
      '<i class="ti ti-wand"></i>Preparar o anúncio deste</button></div>';
  }
  const quantas = a.legendas.length;
  return '<div class="al ' + (a.faltaLink ? 'aw' : 'ag') + '" style="margin-top:9px">' +
    '<i class="ti ti-' + (a.faltaLink ? 'link-off' : 'checks') + '"></i><div>' +
    '<b>Anúncio pronto para ' + quantas + ' plataforma(s).</b> ' +
    (a.faltaLink
      ? 'Falta só o <b>seu link de afiliado</b> — sem ele você publica, mas não ganha comissão. ' +
        'Cole em Afiliados e prepare de novo.'
      : 'Legenda escrita e cortada no limite de cada uma, com o seu link dentro.') +
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn xs gn" onclick="prepAbrirTodas(' + item.id + ')">' +
        '<i class="ti ti-external-link"></i>Abrir todas para publicar</button>' +
      '<button class="btn xs" onclick="prepVerAnuncio(' + item.id + ')">' +
        '<i class="ti ti-eye"></i>Ver as legendas</button>' +
      '<button class="btn xs" onclick="prepUm(' + item.id + ')">' +
        '<i class="ti ti-refresh"></i>Refazer</button>' +
    '</div></div></div>';
}

async function prepUm(id){
  const item = await dbGet('videos', id);
  if (!item) return;
  await prepSalvarFichas([item.produto]);
  const anuncio = await prepDoItem(item);
  await dbPut('videos', Object.assign({}, item, { anuncio: anuncio }));
  toast(anuncio.faltaLink
    ? 'Anúncio pronto, mas ainda sem o seu link de afiliado.'
    : 'Anúncio pronto para todas as plataformas.', anuncio.faltaLink ? 'aw' : 'ag');
  midiaRender();
}

async function prepVerAnuncio(id){
  const item = await dbGet('videos', id);
  const a = item && item.anuncio;
  if (!a || !a.legendas) return;
  const corpo = a.legendas.map(function(t){
    return '<div class="sh"><i class="ti ti-brand-tiktok"></i>' + esc(t.nome || t.id) +
      ' <span class="tt">' + t.usados + (t.limite ? '/' + t.limite : '') + '</span></div>' +
      (t.titulo ? '<div class="tt"><b>Título:</b> ' + esc(t.titulo) + '</div>' : '') +
      '<textarea readonly rows="5" style="width:100%;box-sizing:border-box;font-size:12px">' +
      esc(t.texto) + '</textarea>';
  }).join('');
  modal('Anúncio de ' + ((item.produto && item.produto.n) || ''), 'ti-checks',
    (a.faltaLink ? '<div class="al aw"><i class="ti ti-link-off"></i><div>Sem o seu link de ' +
      'afiliado. Cole o link em <b>Afiliados</b> e clique em Refazer.</div></div>' : '') + corpo,
    '<button class="btn gh" onclick="closeModal(\'mk-form\')">Fechar</button>', 'lg');
}

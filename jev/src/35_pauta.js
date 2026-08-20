/* =========================================================================
   A PAUTA DOS PRODUTOS GARIMPADOS

   O garimpo acha os produtos. Antes, o que ele achava ficava só na tela: se
   você trocasse de aba, sumia. Agora cada achado vira uma linha de PAUTA e
   fica esperando ser trabalhado — com três coisas numa fileira só:

     1. o PROMPT pronto, escrito sozinho para aquele produto;
     2. o botão GERAR VÍDEO DO PRODUTO, que monta o vídeo no seu computador;
     3. depois de pronto, o botão PUBLICAR O VÍDEO, com todas as plataformas.

   A ordem importa: o botão de publicar só nasce depois que existe vídeo.
   Não é enfeite — é para você nunca abrir a tela de publicar sem ter o que
   publicar, e nunca publicar nada sem ter assistido antes.
   ========================================================================= */

/* --------------------------------------------------- do garimpo para a pauta */
/* a chave que identifica o produto: o termo de busca, que é único no pool */
function pautaChave(p){ return String((p && (p.t || p.n)) || '').toLowerCase(); }

/* Guarda os achados como itens de pauta. Garimpar de novo não duplica: o que
   já está lá é atualizado, e o que é novo entra. */
async function pautaDoGarimpo(achados){
  const lista = Array.isArray(achados) ? achados : [];
  if (!lista.length) return { novos: 0, atualizados: 0 };
  const antigos = await dbGetAll('videos');
  let novos = 0, atualizados = 0;

  for (const p of lista){
    const chave = pautaChave(p);
    const existe = antigos.find(v => v.origem === 'garimpo' && pautaChave(v.produto) === chave);
    const dados = {
      titulo: p.n,
      tema: (typeof garNicho === 'function' ? garNicho(p.g).n : ''),
      origem: 'garimpo',
      produto: p,
      status: (existe && existe.status) || 'Ideia',
      dtPrev: (existe && existe.dtPrev) || hoje()
    };
    if (existe){ await dbPut('videos', { ...existe, ...dados }); atualizados++; }
    else { await dbAdd('videos', { ...dados, views:0, likes:0, receita:0, custo:0 }); novos++; }
  }

  /* PREPARO AUTOMÁTICO. Este é o funil por onde TODO garimpo passa — o do
     Kalodata e o antigo. Ligando aqui, o dono nunca mais preenche ficha de
     afiliado na mão: garimpou, a ficha existe e a legenda de cada plataforma
     está escrita. Só o link continua sendo dele, porque só ele consegue
     gerar. Se o preparo falhar, o garimpo não pode falhar junto: o produto
     na pauta vale mais que o anúncio pronto. */
  let fichas = { novas: 0, jaTinha: 0 };
  try {
    if (typeof prepAoGarimpar === 'function') fichas = await prepAoGarimpar(lista);
    if (typeof prepDoItem === 'function'){
      const agora = await dbGetAll('videos');
      for (const p of lista){
        const chave = pautaChave(p);
        const item = agora.find(v => v.origem === 'garimpo' && pautaChave(v.produto) === chave);
        if (!item || item.anuncio) continue;
        const anuncio = await prepDoItem(item);
        if (anuncio) await dbPut('videos', { ...item, anuncio });
      }
    }
  } catch (e) { /* o anúncio é bônus; a pauta é o essencial */ }

  return { novos, atualizados, fichas };
}

/* ------------------------------------------------------------ o prompt pronto */
/* Devolve o pacote de prompts do produto, montado pelo gerador de anúncio.
   Guardo o produto no resolvedor para as telas de prompt e de publicação
   conseguirem abrir a partir da pauta, e não só do garimpo da vez. */
function pautaPacote(item, estilo, formato){
  const p = item && item.produto;
  if (!p) return null;
  garGuardar('p' + item.id, p);
  return anMontar(p, estilo || item.estilo || 'ugc', formato || '9:16 (vertical)');
}

/* O texto do prompt, do jeito que se cola numa IA de vídeo.

   Desde a 1.0.29 o padrão é o prompt de PESSOA USANDO O PRODUTO: ele
   reconhece o tipo de produto pelo nome e descreve alguém pegando, usando e
   reagindo — em vez de mostrar só um pedaço do produto, que era o que saía
   antes e não vendia. O prompt antigo continua disponível trocando o estilo
   no Estúdio de prompt. */
function pautaPromptTexto(pac, produto){
  if (produto && typeof pessPromptTexto === 'function')
    return pessPromptTexto(produto, (pac && pac.formato) || '9:16 (vertical)');
  if (!pac) return '';
  const linhas = [];
  linhas.push('PRODUTO: ' + pac.produto);
  linhas.push('ESTILO: ' + pac.estilo + ' · ' + pac.formato + ' · ' + pac.duracao + 's');
  linhas.push('');
  pac.cenas.forEach(c => {
    linhas.push('--- CENA ' + c.n + ' (' + c.segundos + 's) — ' + c.papel);
    linhas.push(c.prompt_en);
    if (c.fala) linhas.push('Narração: ' + c.fala);
    linhas.push('');
  });
  linhas.push('NEGATIVE PROMPT: ' + pac.negativo);
  return linhas.join('\n');
}

/* ---------------------------------------------------------------- a tela */
const PAUTA = { abertos: {}, montando: null, pct: 0, recado: '', erro: {},
                aviso: {}, reinstalar: {}, naTela: {}, semRede: {} };

function pautaAbrir(id){
  PAUTA.abertos[id] = !PAUTA.abertos[id];
  midiaRender();
}

/* O botão "Prompt da IA" do aviso: abre a ficha, que é onde o prompt mora.
   Se já estiver aberta, não fecha na cara de quem clicou pedindo para ver. */
function pautaVerPrompt(id){
  PAUTA.abertos[id] = true;
  midiaRender();
}

/* Um arquivo escolhido na mão é vídeo? É por aqui que o sistema sabe se o
   material que chegou tem chance de ter gente dentro. */
function pautaTemVideo(arquivos){
  return (arquivos || []).some(function(a){
    const c = String((a && (a.caminho || a.nome)) || a || '');
    return /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(c);
  });
}

async function pautaSecaoHTML(){
  /* a IA que põe a pessoa se apresenta uma vez por abertura da aba, e passa
     a ouvir o andamento — sem isso a barra de progresso fica parada */
  if (typeof hggVerEstado === 'function' && !HGG.estado) { await hggVerEstado(); }
  if (typeof hggEscutar === 'function') hggEscutar();

  const todos = await dbGetAll('videos');
  const itens = todos.filter(v => v.origem === 'garimpo' && v.produto)
                     .sort((a, b) => Number(b.id) - Number(a.id));
  if (!itens.length){
    return '<div class="card tw"><div class="hd"><i class="ti ti-pick"></i>Produtos garimpados</div><div class="bd">' +
      '<div class="empty"><i class="ti ti-pick"></i><b>Nada garimpado ainda</b>' +
      '<p>Vá na aba <b>Garimpo</b>, escolha as condições e clique em garimpar. ' +
      'Os produtos escolhidos caem aqui com o prompt pronto e o botão de gerar o vídeo.</p>' +
      '<button class="btn gn" onclick="midStab(\'gar\')"><i class="ti ti-pick"></i>Ir para o Garimpo</button>' +
      '</div></div></div>';
  }

  const prontos = itens.filter(i => (i.producao || []).length).length;
  const publicados = itens.filter(i => i.status === 'Publicado').length;

  let h = '<div class="card"><div class="hd"><i class="ti ti-pick"></i>Produtos garimpados — do prompt ao vídeo publicado' +
    '<span class="sp"></span><span class="st s-nt">' + itens.length + ' na pauta</span>' +
    (prontos ? '<span class="st s-ok">' + prontos + ' com vídeo</span>' : '') +
    (publicados ? '<span class="st s-ok">' + publicados + ' publicado(s)</span>' : '') +
    '</div><div class="bd">' +
    '<div class="tt" style="margin-bottom:12px">O prompt já vem escrito para cada produto. ' +
    'Você pode colar numa IA de vídeo, ou clicar em <b>Gerar o vídeo do produto</b> e deixar o ' +
    'seu próprio computador montar. O botão de publicar aparece depois que o vídeo existir.</div>';

  if (typeof hggSecaoHTML === 'function') h += hggSecaoHTML();

  /* o preparo em lote: um clique resolve os sete de uma vez */
  const semAnuncio = itens.filter(i => !i.anuncio).length;
  h += '<div class="sh" style="margin-top:12px"><i class="ti ti-checks"></i>' +
    'Anúncio pronto para todas as plataformas</div>' +
    '<div class="tt">Ao garimpar, cada produto já vira uma ficha em Afiliados e ganha a ' +
    'legenda de cada plataforma, cortada no limite dela. O que fica faltando é só o ' +
    '<b>seu link de afiliado</b> — esse só você consegue gerar no painel da plataforma.</div>' +
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button class="btn gn" onclick="prepPrepararTudo()"><i class="ti ti-wand"></i>' +
        'Preparar o anúncio de todos</button>' +
      (semAnuncio ? '<span class="tt">' + semAnuncio + ' ainda sem anúncio</span>'
                  : '<span class="tt">todos preparados</span>') +
    '</div>';

  for (const item of itens) h += await pautaItemHTML(item);
  h += '</div></div>';
  return h;
}

async function pautaItemHTML(item){
  const p = item.produto;
  const pac = pautaPacote(item);
  const chave = 'p' + item.id;
  const temVideo = (item.producao || []).length > 0;
  const aberto = !!PAUTA.abertos[item.id];
  const montando = PAUTA.montando === item.id;
  const midia = item.midia || [];
  const temMidia = midia.length > 0;

  /* o id serve de âncora: quem chega pelo botão "Criar vídeo no Higgsfield"
     é levado direto ao cartão certo, em vez de ter que caçar na lista */
  let h = '<div class="card tw" id="pauta-' + item.id + '" style="margin-bottom:10px;border-color:' +
    (temVideo ? 'var(--green)' : 'var(--bg3)') + '"><div class="bd">' +

    '<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:250px">' +
        '<b style="font-size:15px">' + esc(p.n) + '</b>' +
        '<div class="tt" style="margin:3px 0 6px">' +
          '<span class="st ' + (item.status === 'Publicado' ? 's-ok' : temVideo ? 's-wn' : 's-nt') + '">' +
            esc(item.status) + '</span>' +
          (typeof garNicho === 'function'
            ? '&nbsp;<span class="st s-nt"><i class="ti ' + garNicho(p.g).ic + '"></i> ' + esc(garNicho(p.g).n) + '</span>' : '') +
          '&nbsp;·&nbsp; ' + moeda(p.preco) +
          (p.ganho ? '&nbsp;·&nbsp; <b>~' + moeda(p.ganho) + '</b> por venda' : '') +
          (p.vend ? '&nbsp;·&nbsp; ' + qtd(p.vend, 0) + '+ vendidos' : '') +
        '</div>' +
        (p.gancho ? '<div style="font-size:13px"><b>Gancho:</b> ' + esc(p.gancho) + '</div>' : '') +
      '</div>' +
    '</div>' +

    /* ---- a fileira de botões: prompt · gerar · publicar ---- */
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px" class="no-print">' +
      '<button class="btn xs ' + (aberto ? 'bl' : 'gh') + '" onclick="pautaAbrir(' + item.id + ')">' +
        '<i class="ti ti-' + (aberto ? 'chevron-up' : 'file-text') + '"></i>' +
        (aberto ? 'Fechar o prompt' : 'Ver o prompt automático') + '</button>' +
      '<button class="btn xs gh" onclick="pautaCopiarPrompt(' + item.id + ')"><i class="ti ti-copy"></i>Copiar o prompt</button>' +
      (montando
        ? '<button class="btn xs rd" onclick="pautaParar()"><i class="ti ti-player-stop"></i>Parar</button>'
        : /* baixar vem ANTES de gerar, porque é nessa ordem que funciona */
          '<button class="btn xs ' + (temMidia ? 'gh' : 'bl') + '" ' +
          'onclick="pautaBaixarMidias(' + item.id + ')">' +
          '<i class="ti ti-download"></i>' +
          (temMidia ? 'Baixar de novo' : 'Baixar as mídias do produto') + '</button>' +
          '<button class="btn xs pu" onclick="pautaGerar(' + item.id + ')">' +
          '<i class="ti ti-wand"></i>' + (temVideo ? 'Gerar de novo' : 'Gerar o vídeo do produto') + '</button>') +
      (temVideo
        ? '<button class="btn xs gn" onclick="pautaPublicar(' + item.id + ')">' +
          '<i class="ti ti-send"></i>Publicar o vídeo</button>' +
          '<button class="btn xs bl" onclick="pautaAssistir(' + item.id + ')">' +
          '<i class="ti ti-player-play"></i>Assistir</button>'
        : '') +
      (estTem()
        ? '<button class="btn xs ' + (temMidia ? 'gn' : 'gh') + '" onclick="pautaMateriais(' + item.id + ')">' +
          '<i class="ti ti-photo-video"></i>' +
          (temMidia ? 'Materiais: ' + pautaContaMidia(midia) : 'Materiais do produto') + '</button>' +
          (temMidia ? '<button class="btn xs gh" onclick="pautaLimparMateriais(' + item.id + ')" ' +
            'title="Soltar os materiais escolhidos"><i class="ti ti-x"></i></button>' : '')
        : '') +
      '<button class="btn xs gh" onclick="anAbrir(\'' + chave + '\')"><i class="ti ti-sparkles"></i>Estúdio de prompt</button>' +
      '<button class="btn xs rd" onclick="pautaTirar(' + item.id + ')"><i class="ti ti-trash"></i></button>' +
    '</div>';

  /* o aviso que explica o vídeo com texto ANTES de você gerar e se decepcionar */
  if (estTem() && !temMidia)
    h += '<div class="al aw" style="margin-top:9px"><i class="ti ti-info-circle"></i><div>' +
      '<b>Antes de gerar, traga as mídias do produto.</b> Clique em ' +
      '<b>Baixar as mídias do produto</b>: eu busco as fotos e o vídeo na própria página de ' +
      'onde ele foi garimpado e guardo no seu computador. ' +
      'Se a loja não deixar (o TikTok Shop não deixa), baixe o vídeo do anúncio no painel do ' +
      'vendedor e use <b>Materiais do produto</b>. ' +
      'Sem material, as cenas saem em fundo liso com o texto por cima.</div></div>';

  if (temMidia)
    h += '<div class="al ag" style="margin-top:9px"><i class="ti ti-folder"></i><div>' +
      '<b>' + pautaContaMidia(midia) + '</b> guardados no seu computador. ' +
      'É com esses arquivos que o vídeo vai ser montado — o vídeo do vendedor entra primeiro, ' +
      'porque é nele que aparece a pessoa usando o produto.' +
      (item.midiaPasta
        ? ' <button class="btn xs gh" onclick="pautaAbrirPasta(' + item.id + ')">' +
          '<i class="ti ti-folder-open"></i>Ver os arquivos</button>' : '') +
      '</div></div>';

  if (montando) h += pautaBarraHTML();
  /* o caminho da IA que põe uma pessoa apresentando — vem antes do aviso,
     porque é a solução dele */
  if (typeof hggCartaoHTML === 'function') h += hggCartaoHTML(item);
  /* e o anúncio já preparado para todas as plataformas */
  if (typeof prepCartaoHTML === 'function') h += prepCartaoHTML(item);
  /* aviso não é erro: o vídeo ficou pronto e prestável, só saiu sem gente.
     Por isso é âmbar e vem com os dois caminhos para resolver, não vermelho */
  if (PAUTA.aviso[item.id])
    h += '<div class="al aw" style="margin-top:9px"><i class="ti ti-user-off"></i><div>' +
         esc(PAUTA.aviso[item.id]) +
         ' <button class="btn xs" onclick="pautaBaixarMidias(' + item.id + ')">' +
         '<i class="ti ti-download"></i>Baixar as mídias do produto</button>' +
         ' <button class="btn xs" onclick="pautaVerPrompt(' + item.id + ')">' +
         '<i class="ti ti-sparkles"></i>Prompt da IA</button>' +
         '</div></div>';
  if (PAUTA.erro[item.id])
    h += '<div class="al ae" style="margin-top:9px"><i class="ti ti-alert-circle"></i><div>' +
         esc(PAUTA.erro[item.id]) +
         (PAUTA.reinstalar[item.id]
           ? ' <button class="btn xs gn" onclick="pautaInstalar(' + item.id + ')">' +
             '<i class="ti ti-download"></i>Instalar as ferramentas</button>' : '') +
         (PAUTA.semRede[item.id]
           ? '<div style="margin-top:9px;padding-top:9px;border-top:1px solid rgba(0,0,0,.12)">' +
             '<b>Isto não é defeito do aplicativo.</b> A loja não chegou a responder — quem ' +
             'cortou foi a internet deste computador. Um teste que resolve a dúvida em um ' +
             'minuto: abra o TikTok no <b>celular, usando 4G</b> (não o Wi-Fi da casa). ' +
             'Se abrir no 4G e não abrir no Wi-Fi, o bloqueio está no seu roteador ou no ' +
             'provedor. Se não abrir em nenhum dos dois, é a conta ou a região.' +
             '<div class="tt" style="margin-top:6px">Suspeitos de sempre, nesta ordem: ' +
             'antivírus com filtro de rede (Kaspersky, Avast, ESET costumam vir com bloqueio ' +
             'de rede social ligado), DNS do provedor, bloqueio no roteador, e o arquivo ' +
             'hosts do Windows.</div></div>' : '') +
         (PAUTA.naTela[item.id]
           ? '<div style="margin-top:8px"><button class="btn xs bl" ' +
             'onclick="pautaBaixarMidias(' + item.id + ', true)">' +
             '<i class="ti ti-browser"></i>Abrir a loja na minha tela e tentar de novo</button>' +
             '<div class="tt" style="margin-top:5px">A página do produto abre numa janela. ' +
             'Se aparecer aviso de cookie ou pedido de login, resolva você mesmo — eu não ' +
             'clico em nada por você. Passados 45 segundos eu leio o que estiver na tela ' +
             'e fecho a janela.</div></div>' : '') +
         '</div></div>';

  if (temVideo){
    h += '<div class="al ag" style="margin-top:9px"><i class="ti ti-movie"></i><div>' +
      '<b>' + item.producao.length + ' versão(ões) prontas</b> — ' +
      item.producao.map(a => esc(a.formato)).join(' · ') +
      '. Assista antes de publicar.</div></div>';
  }

  if (aberto && pac){
    h += '<div class="sh"><i class="ti ti-file-text"></i>Prompt automático deste produto</div>' +
      '<div class="tt" style="margin-bottom:7px">São ' + pac.cenas.length + ' cenas de ' +
      pac.cenas[0].segundos + ' segundos. O texto em inglês é o que as IAs de vídeo entendem melhor; ' +
      'a narração em português é o que você fala por cima.</div>' +
      '<textarea readonly rows="12" style="width:100%;box-sizing:border-box;font-size:11.5px;font-family:ui-monospace,monospace">' +
      esc(pautaPromptTexto(pac, p)) + '</textarea>' +
      '<div class="sh"><i class="ti ti-message"></i>Legenda sugerida</div>' +
      '<div class="tt" style="white-space:pre-wrap">' + esc(pac.legenda) + '</div>' +
      '<div class="chips" style="margin-top:8px">' +
        pac.hashtags.map(x => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>';
  }

  h += '</div></div>';
  return h;
}

function pautaBarraHTML(){
  return '<div data-pauta-barra="1" style="margin-top:10px">' +
    '<div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700">' +
      '<span>' + esc(PAUTA.recado || 'montando…') + '</span><span>' + Math.round(PAUTA.pct) + '%</span></div>' +
    '<div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden;margin-top:6px">' +
      '<div style="height:100%;width:' + Math.round(PAUTA.pct) + '%;background:var(--green);transition:width .3s"></div>' +
    '</div></div>';
}

/* ------------------------------------------------------------ o prompt */
async function pautaCopiarPrompt(id){
  const item = await dbGet('videos', id);
  const t = pautaPromptTexto(pautaPacote(item), item && item.produto);
  if (!t){ toast('Não consegui montar o prompt deste item.', 'aw'); return; }
  try { await navigator.clipboard.writeText(t); toast('Prompt copiado.', 'ag'); }
  catch (e) { toast('Não consegui copiar — abra o prompt e copie na mão.', 'aw'); }
}

/* ------------------------------------------- gerar o vídeo do produto */
/* transforma o produto garimpado num roteiro do mesmo formato que a aba
   Gerar vídeo produz — assim a fábrica não precisa saber de onde ele veio */
function pautaRoteiro(item){
  const p = item.produto;
  const pac = pautaPacote(item);
  const prod = {
    id: item.id,
    produto: p.n,
    plataforma: (typeof garLoja === 'function' && p.links && p.links[0])
      ? (garLoja(p.links[0].loja) || {}).n || '' : '',
    url: (p.links && p.links[0]) ? p.links[0].url : '',
    comissao: num(p.comissao), preco: num(p.preco),
    nicho: (typeof garNicho === 'function' ? garNicho(p.g).n : ''),
    tipo: 'Físico',
    beneficio: p.gancho || ''
  };
  const angulo = (typeof ANGULOS === 'object' && ANGULOS[p.ang]) ? p.ang : 'Review honesto';
  const r = gerPacote([prod], angulo, 60, '9:16 (vertical)', ['yts', 'tt', 'ig', 'fb'], 0);
  /* a narração escrita para este produto é melhor que a genérica */
  if (pac && pac.cenas && pac.cenas.length){
    r.cenas.forEach((c, i) => { if (pac.cenas[i] && pac.cenas[i].fala) c.fala = pac.cenas[i].fala; });
    r.legenda = pac.legenda;
    r.hashtags = pac.hashtags;
  }
  /* As provas do produto — quantos venderam, que nota tem — viram os números
     grandes das cenas. Isso é o que salva o vídeo de um produto que só tem
     UMA foto: em vez de repetir a mesma imagem três vezes, a repetição vira
     cartela com o número real. O Kalodata é quem fornece esses números. */
  const provas = p.provas || [];
  if (provas.length){
    let k = 0;
    r.cenas.forEach(function(c, i){
      if (i === 0) return;                 /* a primeira cena é sempre o produto */
      if (k < provas.length){ c.dado = provas[k]; k++; }
    });
  }

  r.produtoGarimpo = p;
  return r;
}

async function pautaGerar(id){
  const item = await dbGet('videos', id);
  if (!item || !item.produto) return;
  PAUTA.erro[id] = ''; PAUTA.aviso[id] = '';

  const roteiro = pautaRoteiro(item);
  const idRot = await dbAdd('roteiros', { ...roteiro, criadoEm: new Date().toISOString() });
  roteiro.id = idRot;
  await dbPut('videos', { ...item, roteiroId: idRot, status: item.status === 'Ideia' ? 'Roteiro' : item.status });

  const d = (typeof estApp === 'function') ? estApp() : null;
  if (!d || !d.estCriar){
    /* pelo navegador não dá para montar: leva o roteiro para a aba onde ele
       pode ser baixado para a fábrica, em vez de fingir que vai montar */
    GER = { produtos: [], angulo: roteiro.angulo, duracao: roteiro.duracao, formato: roteiro.formato,
            plataformas: roteiro.plataformas, variante: 0, pacote: roteiro };
    EST.roteiro = roteiro;
    toast('Roteiro pronto. Montar o vídeo aqui dentro só no aplicativo do Windows.', 'aw');
    midStab('gerar');
    return;
  }

  /* As ferramentas de vídeo faltando não podem virar um beco: instalo aqui
     mesmo, com a barra do próprio cartão, e sigo para a montagem. */
  let ferr = await estFerramentas();
  if (!ferr || !ferr.pronto){
    PAUTA.montando = id; PAUTA.pct = 0;
    PAUTA.recado = 'instalando as ferramentas de vídeo — uma vez só';
    estOuvir(); midiaRender();
    let inst;
    try { inst = await d.estInstalar(); }
    catch (e) { inst = { ok:false, motivo:String((e && e.message) || e) }; }
    ferr = inst.estado || await estFerramentas();
    EST.ferramentas = ferr;
    if (!ferr || !ferr.pronto){
      PAUTA.montando = null;
      PAUTA.erro[id] = (inst && inst.motivo) || 'não consegui instalar as ferramentas de vídeo';
      toast('Faltou instalar as ferramentas de vídeo.', 'aw');
      midiaRender();
      return;
    }
  }

  /* busca sozinho a mídia do anúncio, que é de onde saem as cenas */
  PAUTA.montando = id; PAUTA.pct = 0; PAUTA.recado = 'procurando as fotos do produto';
  estOuvir();
  midiaRender();

  /* O que você escolheu na mão vale mais que o que eu adivinho da página:
     é material do painel do vendedor, em boa qualidade e com a pessoa usando
     o produto. Só saio buscando na internet quando não veio nada seu.       */
  const arquivos = (item.midia || []).slice(0, 12);
  let fotos = [], videos = [];
  if (!arquivos.length){
    const url = (item.produto.links && item.produto.links[0]) ? item.produto.links[0].url : '';
    if (url && d.estMidiaProduto){
      try{
        const m = await d.estMidiaProduto(url);
        /* três vídeos, não um: o vídeo do anúncio é a estrela agora */
        if (m && m.ok){ fotos = (m.fotos || []).slice(0, 8); videos = (m.videos || []).slice(0, 3); }
      }catch(e){}
    }
  }

  const qtdArq = arquivos.length;
  PAUTA.recado = qtdArq
    ? 'usando ' + pautaContaMidia(arquivos) + ' que você escolheu'
    : (fotos.length || videos.length
        ? 'achei ' + (fotos.length + videos.length) + ' peça(s) na página do anúncio'
        : 'sem mídia do anúncio — as cenas saem em fundo liso');
  midiaRender();

  let res;
  try { res = await d.estCriar({ roteiro, fotos, videos, arquivos, trilha: null }); }
  catch (e) { res = { ok: false, motivo: String((e && e.message) || e) }; }

  PAUTA.montando = null;
  const atual = await dbGet('videos', id);
  if (res && res.ok){
    await dbPut('videos', { ...atual, producao: res.arquivos, pastaVideo: res.pasta,
                            status: 'Editado', duracao: roteiro.duracao / 60 });
    try{
      await dbAdd('producoes', { titulo: roteiro.titulo, roteiroId: idRot, arquivos: res.arquivos,
        pasta: res.pasta, trabalho: res.trabalho, legenda: roteiro.legenda,
        hashtags: roteiro.hashtags, criadoEm: new Date().toISOString() });
    }catch(e){}
    if (!qtdArq && !fotos.length && !videos.length){
      PAUTA.erro[id] = 'O vídeo ficou pronto, mas saiu em fundo liso: nenhuma foto ou ' +
        'vídeo do produto chegou até a fábrica. Clique em "Baixar as mídias do produto" — ' +
        'e, se a loja não deixar, use "Materiais do produto" com o arquivo baixado no ' +
        'painel do vendedor. Depois gere de novo.';
      toast('Vídeo pronto, mas sem imagem do produto.', 'aw');
    } else if (!videos.length && !pautaTemVideo(arquivos)){
      /* A CONVERSA HONESTA SOBRE A PESSOA.
         Esta fábrica monta o vídeo com as fotos REAIS do produto. Ela não
         inventa gente — e não deveria mesmo, porque pessoa inventada em cima
         de produto real é propaganda enganosa. Quando só chegou foto, o vídeo
         sai bonito e sem ninguém, e o dono fica achando que quebrou. Não
         quebrou: falta material com gente. Ou ele baixa o vídeo do vendedor
         (onde quase sempre tem alguém usando), ou ele leva o prompt de pessoa
         para uma IA de vídeo, que é exatamente para isso que ele existe.    */
      PAUTA.aviso[id] = 'Este vídeo saiu só com as fotos do produto, sem ninguém aparecendo — ' +
        'a fábrica daqui monta com o material real e não inventa pessoa. Para ter alguém ' +
        'apresentando: baixe o vídeo do vendedor em "Baixar as mídias do produto" (quase ' +
        'sempre tem gente usando), ou copie o prompt em "Prompt da IA" e gere as cenas numa ' +
        'IA de vídeo.';
      toast('Vídeo pronto — só com as fotos, sem pessoa. Veja o aviso.', 'aw');
    } else {
      toast('Vídeo pronto. Assista antes de publicar.', 'ag');
    }
  }else{
    PAUTA.erro[id] = (res && res.motivo) || 'a montagem não terminou';
    /* o atalho da Loja da Microsoft se disfarça de Python: quando ele aparece,
       a saída é reinstalar as ferramentas, e o botão fica ali do lado */
    PAUTA.reinstalar[id] = !!(res && res.lojaDaMicrosoft);
    toast('Não consegui montar: ' + PAUTA.erro[id], 'aw');
  }
  midiaRender();
}

/* --------------------------------------------- os materiais do produto
   O TikTok Shop monta a vitrine por programa, então ninguém consegue ler as
   fotos da página de fora — nem eu, nem nenhum robô. Em vez de fingir que
   dá, o caminho honesto fica aqui do lado: você baixa o vídeo no painel do
   vendedor (que é o que já mostra uma pessoa usando o produto) e aponta o
   arquivo. Uma vez por produto; fica guardado.                            */
/* Baixa as fotos e o vídeo do próprio anúncio de onde o produto foi
   garimpado, e guarda no computador. Depois disso, gerar o vídeo usa esses
   arquivos — não sai mais nada em fundo liso enquanto houver material.
   É um passo separado de propósito: você vê o que veio antes de esperar a
   montagem inteira para descobrir que não veio nada. */
async function pautaBaixarMidias(id, naTela){
  const d = (typeof estApp === 'function') ? estApp() : null;
  if (!d || !d.estMidiaBaixar){
    toast('Baixar as mídias só no aplicativo do Windows.', 'aw');
    return;
  }
  const item = await dbGet('videos', id);
  if (!item || !item.produto) return;

  const urls = (item.produto.links || []).map(l => l.url).filter(Boolean);
  /* produto garimpado no Kalodata já vem com o endereço exato da capa: não
     há página para negociar, é só baixar */
  const imagens = item.produto.capa ? [item.produto.capa] : [];
  if (!urls.length && !imagens.length){
    PAUTA.erro[id] = 'Este produto não guardou o endereço do anúncio. Use ' +
      '"Materiais do produto" e aponte os arquivos na mão.';
    midiaRender();
    return;
  }

  PAUTA.erro[id] = ''; PAUTA.naTela[id] = false;
  PAUTA.montando = id; PAUTA.pct = 0;
  PAUTA.recado = naTela
    ? 'abrindo a loja na sua tela — resolva o aviso dela se aparecer'
    : 'baixando as mídias do anúncio';
  estOuvir(); midiaRender();

  let r;
  try { r = await d.estMidiaBaixar({ chave: 'p' + item.id + '-' + (item.produto.n || ''),
                                     nome: item.produto.n, urls: urls, imagens: imagens,
                                     /* com a loja na tela, dá tempo de você
                                        aceitar o aviso ou entrar na conta */
                                     mostrar: !!naTela,
                                     espera: naTela ? 45000 : 0 }); }
  catch (e) { r = { ok:false, arquivos:[], motivo:String((e && e.message) || e) }; }

  PAUTA.montando = null;
  const atual = await dbGet('videos', id);
  if (r && r.ok){
    /* entra na MESMA lista dos arquivos escolhidos na mão: daí para frente
       a montagem usa esses arquivos sem precisar saber de onde vieram */
    const caminhos = r.arquivos.map(a => a.caminho);
    await dbPut('videos', { ...atual, midia: caminhos, midiaPasta: r.pasta });
    /* veio foto mas não vídeo é meio caminho: precisa ficar escrito */
    if (!r.temVideo)
      PAUTA.erro[id] = 'Baixei ' + pautaContaMidia(caminhos) + ', mas nenhum vídeo. ' +
        'A foto mostra o produto parado; quem mostra a pessoa usando é o vídeo do ' +
        'anúncio. Baixe o vídeo no painel do vendedor e junte em "Materiais do produto".';
    toast('Baixei ' + pautaContaMidia(caminhos) + ' deste produto.', 'ag');
  }else{
    PAUTA.erro[id] = (r && r.motivo) || 'não consegui baixar as mídias deste anúncio';
    /* a loja pôs uma porta: abrir na tela é a única saída que ainda é honesta */
    PAUTA.naTela[id] = !!(r && r.podeTentarNaTela && r.barrado);
    /* a loja nem foi alcançada: o problema é a internet deste computador, e
       insistir no aplicativo só faz perder tempo */
    PAUTA.semRede[id] = !!(r && r.inalcancavel);
    toast(r && r.inalcancavel
      ? 'Este computador não alcançou a loja.'
      : 'Não deu para baixar sozinho.', 'aw');
  }
  midiaRender();
}

async function pautaMateriais(id){
  const d = (typeof estApp === 'function') ? estApp() : null;
  if (!d || !d.estEscolher){
    toast('Escolher arquivos só no aplicativo do Windows.', 'aw');
    return;
  }
  let lista = [];
  try { lista = await d.estEscolher('midia'); } catch (e) {}
  if (!lista || !lista.length) return;

  const item = await dbGet('videos', id);
  if (!item) return;
  const antes = item.midia || [];
  const caminhos = lista.map(a => a.caminho);
  /* somar, não trocar: quem escolhe o vídeo e depois as fotos não perde o vídeo */
  const juntos = antes.concat(caminhos.filter(c => antes.indexOf(c) < 0)).slice(0, 12);
  await dbPut('videos', { ...item, midia: juntos });
  toast(pautaContaMidia(juntos) + ' guardado(s) para este produto.', 'ag');
  midiaRender();
}

function pautaContaMidia(lista){
  const v = (lista || []).filter(c => /\.(mp4|mov|m4v|webm|mkv)$/i.test(c)).length;
  const f = (lista || []).length - v;
  const p = [];
  if (v) p.push(v + (v > 1 ? ' vídeos' : ' vídeo'));
  if (f) p.push(f + (f > 1 ? ' fotos' : ' foto'));
  return p.join(' e ') || 'nada';
}

async function pautaLimparMateriais(id){
  const item = await dbGet('videos', id);
  if (!item) return;
  const d = (typeof estApp === 'function') ? estApp() : null;
  /* apaga também o que foi baixado: senão o disco vai enchendo com anúncio
     de produto que você já tirou da pauta */
  if (d && d.estMidiaLimpar && item.midiaPasta){
    try { await d.estMidiaLimpar('p' + item.id + '-' + (item.produto ? item.produto.n : '')); }
    catch (e) {}
  }
  await dbPut('videos', { ...item, midia: [], midiaPasta: '' });
  toast('Materiais soltos. Pode baixar de novo quando quiser.', 'aw');
  midiaRender();
}

async function pautaAbrirPasta(id){
  const item = await dbGet('videos', id);
  const d = (typeof estApp === 'function') ? estApp() : null;
  if (!item || !item.midiaPasta || !d || !d.estAbrirPasta) return;
  const primeiro = (item.midia || [])[0] || item.midiaPasta;
  try { await d.estAbrirPasta(primeiro); } catch (e) {}
}

/* reinstala as ferramentas do zero — a saída quando o Windows entregou o
   atalho da Loja da Microsoft no lugar do Python */
async function pautaInstalar(id){
  const d = (typeof estApp === 'function') ? estApp() : null;
  if (!d || !d.estInstalar) return;
  PAUTA.erro[id] = ''; PAUTA.reinstalar[id] = false;
  PAUTA.montando = id; PAUTA.pct = 0; PAUTA.recado = 'baixando um Python só nosso';
  estOuvir(); midiaRender();
  let r;
  try { r = await d.estInstalar(); }
  catch (e) { r = { ok:false, motivo:String((e && e.message) || e) }; }
  PAUTA.montando = null;
  EST.ferramentas = r.estado || await estFerramentas();
  if (r.ok) toast('Ferramentas prontas. Pode clicar em gerar o vídeo.', 'ag');
  else { PAUTA.erro[id] = r.motivo || 'não consegui instalar'; toast('Não deu para instalar.', 'aw'); }
  midiaRender();
}

async function pautaParar(){
  const d = (typeof estApp === 'function') ? estApp() : null;
  if (d && d.estParar){ try { await d.estParar(); } catch (e) {} }
  PAUTA.montando = null; PAUTA.recado = 'interrompido por você';
  midiaRender();
}

/* --------------------------------------------------------- assistir e publicar */
async function pautaAssistir(id){
  const item = await dbGet('videos', id);
  if (!item || !(item.producao || []).length) return;
  EST.resultado = { ok: true, arquivos: item.producao, pasta: item.pastaVideo, avisos: [] };
  EST.roteiro = { titulo: item.titulo, legenda: '', hashtags: [] };
  if (item.roteiroId){
    const r = await dbGet('roteiros', item.roteiroId);
    if (r) EST.roteiro = r;
  }
  EST.vendo = 0; EST.fase = 'pronto';
  midStab('gerar');
}

/* o botão que só existe depois do vídeo: abre TODAS as plataformas */
async function pautaPublicar(id){
  const item = await dbGet('videos', id);
  if (!item || !item.produto) return;
  if (!(item.producao || []).length){
    toast('Gere o vídeo antes de publicar.', 'aw');
    return;
  }
  garGuardar('p' + item.id, item.produto);

  /* leva o arquivo em pé, que é o formato das plataformas de vídeo curto */
  const vertical = item.producao.find(a => a.formato === '9:16') || item.producao[0];
  DISP.video = { caminho: vertical.caminho, nome: vertical.nome, tamanho: vertical.tamanho };
  DISP.plats = PLATAFORMAS_VIDEO.map(p => p.id);   /* todas, com as que pagam já marcadas */
  DISP.pautaId = item.id;
  await dispAbrir('p' + item.id);
}

function pautaTirar(id){
  confirmar('Tirar da pauta',
    'O produto sai da lista. O vídeo já montado continua no seu computador.',
    async function(){ await dbDel('videos', id); toast('Removido.', 'aw'); midiaRender(); });
}

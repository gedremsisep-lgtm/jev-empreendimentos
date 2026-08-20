/* =========================================================================
   A TELA DA IA QUE PÕE UMA PESSOA APRESENTANDO O PRODUTO.

   A fábrica que roda neste computador monta o vídeo com as fotos REAIS do
   produto — e não inventa gente, nem deve. Só que o vídeo que vende tem
   alguém segurando, usando e falando. Esta tela é o caminho para isso: leva
   o prompt das cinco cenas para a IA do Higgsfield e traz os clipes de volta
   para a pasta do produto, onde a fábrica já sabe usá-los.

   TRÊS PROMESSAS QUE ESTA TELA FAZ AO DONO
   ----------------------------------------
   1. A chave é dele. Ele cria em cloud.higgsfield.ai, cola aqui uma vez, e
      ela fica no computador dele. A tela nunca mostra o segredo de volta —
      quem já tem não precisa reler, e quem estiver olhando por cima do ombro
      não deveria copiar.
   2. O preço aparece antes. Toda geração é orçada primeiro, em dólar e em
      crédito, e nada acontece sem ele clicar em confirmar. O botão diz o
      valor; não é um "gerar" que descobre o preço depois.
   3. O que falha não é cobrado, e a tela diz isso. Cena barrada e cena que
      deu errado não entram na conta — e o dono precisa saber disso na hora,
      senão ele acha que perdeu dinheiro e para de usar.                    */

const HGG = { estado: null, orcamento: null, gerando: null, passo: '',
              feito: null, erro: '', abrindoChave: false, qualidade: 'barato' };

function hggApp(){
  return (typeof window !== 'undefined' && window.JeVDesktop) ? window.JeVDesktop : null;
}

function hggTem(){
  const d = hggApp();
  return !!(d && d.hgEstado);
}

/* --------------------------------------------------------------- estado */
async function hggVerEstado(){
  const d = hggApp();
  if (!d || !d.hgEstado){ HGG.estado = { semPeca: true }; return HGG.estado; }
  try { HGG.estado = await d.hgEstado(); }
  catch (e) { HGG.estado = { ok: false, recado: String((e && e.message) || e) }; }
  return HGG.estado;
}

/* A conversão para real é uma CONTA DE GUARDANAPO, e a tela diz isso com
   todas as letras. O valor real depende da cotação do dia e do IOF do
   cartão — prometer centavo exato aqui seria mentira. */
const HGG_DOLAR = 5.40;
function hggEmReais(usd){
  const v = Number(usd) || 0;
  return 'R$ ' + (v * HGG_DOLAR).toFixed(2).replace('.', ',');
}

/* ---------------------------------------------------------------- a chave */
function hggFormChaveHTML(){
  return '<div class="cd" style="margin-top:10px">' +
    '<div class="sh"><i class="ti ti-key"></i>A chave do seu Higgsfield</div>' +
    '<div class="tt">Entre em <b>cloud.higgsfield.ai</b>, crie uma chave e cole aqui o ' +
      '<b>ID</b> e o <b>segredo</b>. Ela fica guardada só neste computador, num arquivo ' +
      'que só o seu usuário lê. Eu não vejo essa chave e ela não vai para lugar nenhum ' +
      'além do próprio Higgsfield.</div>' +
    '<div class="gr2" style="margin-top:8px">' +
      '<label>ID da chave<input id="hgg-id" autocomplete="off" spellcheck="false" ' +
        'placeholder="cole aqui o ID"></label>' +
      '<label>Segredo<input id="hgg-seg" type="password" autocomplete="off" ' +
        'spellcheck="false" placeholder="cole aqui o segredo"></label>' +
    '</div>' +
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn gn" onclick="hggSalvarChave()"><i class="ti ti-device-floppy"></i>Guardar a chave</button>' +
      '<button class="btn" onclick="hggFecharChave()">Cancelar</button>' +
    '</div>' +
  '</div>';
}

async function hggSalvarChave(){
  const d = hggApp();
  const id = (document.getElementById('hgg-id') || {}).value || '';
  const sg = (document.getElementById('hgg-seg') || {}).value || '';
  if (!d || !d.hgGuardarChave) return;
  const r = await d.hgGuardarChave(id.trim(), sg.trim());
  if (!r || !r.ok){ toast((r && r.motivo) || 'Não consegui guardar a chave.', 'aw'); return; }
  /* limpa os campos na hora: chave não fica pendurada na tela */
  const a = document.getElementById('hgg-id'), b = document.getElementById('hgg-seg');
  if (a) a.value = ''; if (b) b.value = '';
  HGG.abrindoChave = false;
  await hggVerEstado();
  toast(HGG.estado && HGG.estado.pronto ? 'Chave guardada e funcionando.'
        : ((HGG.estado && HGG.estado.recado) || 'Chave guardada.'),
        HGG.estado && HGG.estado.pronto ? 'ag' : 'aw');
  midiaRender();
}

function hggAbrirChave(){ HGG.abrindoChave = true; midiaRender(); }
function hggFecharChave(){ HGG.abrindoChave = false; midiaRender(); }

async function hggEsquecerChave(){
  const d = hggApp();
  if (!d || !d.hgEsquecerChave) return;
  await d.hgEsquecerChave();
  await hggVerEstado();
  toast('A chave saiu deste computador.', 'aw');
  midiaRender();
}

/* ------------------------------------------------------------- as cenas

   As cenas que vão para a IA são as MESMAS do prompt de pessoa: cinco, com
   a pessoa pegando, usando e recomendando. Aqui elas viram uma lista simples
   de prompts, que é o que a API entende.                                  */
function hggCenasDoProduto(produto, formato){
  if (typeof pessCenas !== 'function') return [];
  const cenas = pessCenas(produto, formato || '9:16 (vertical)');
  return cenas.map(function(c, i){
    return { n: i + 1, papel: c.papel, prompt: c.en, pt: c.pt };
  });
}

/* ------------------------------------------------------------ o orçamento */
async function hggOrcar(id){
  const d = hggApp();
  if (!d || !d.hgOrcar) return;
  const item = await dbGet('videos', id);
  if (!item || !item.produto) return;

  HGG.erro = ''; HGG.orcamento = null; HGG.gerando = id; HGG.passo = 'fazendo a conta';
  midiaRender();

  const cenas = hggCenasDoProduto(item.produto, '9:16 (vertical)');
  const r = await d.hgOrcar(cenas, { qualidade: HGG.qualidade, segundos: 5, formato: '9:16' });
  HGG.gerando = null; HGG.passo = '';
  if (!r || !r.ok){
    HGG.erro = (r && r.motivo) || 'não consegui fazer a conta';
    midiaRender();
    return;
  }
  HGG.orcamento = { id: id, cenas: cenas, conta: r.orcamento, teto: r.teto,
                    passouDoTeto: r.passouDoTeto, qualidade: r.qualidade };
  midiaRender();
}

function hggCancelarOrcamento(){ HGG.orcamento = null; midiaRender(); }

/* ------------------------------------------------------------ gerar */
async function hggConfirmarGerar(){
  const d = hggApp();
  const o = HGG.orcamento;
  if (!d || !d.hgGerar || !o) return;

  const item = await dbGet('videos', o.id);
  if (!item) return;

  /* a foto real do produto vai junto: é ela que impede a IA de desenhar
     um vidro parecido no lugar do produto de verdade */
  let foto = '';
  if (typeof pautaMateriais === 'function'){
    try {
      const mats = await pautaMateriais(o.id);
      const f = (mats || []).find(function(m){ return m.tipo === 'foto'; });
      if (f) foto = f.caminho;
    } catch (e) {}
  }

  HGG.gerando = o.id; HGG.passo = 'começando'; HGG.erro = ''; HGG.feito = null;
  HGG.orcamento = null;
  midiaRender();

  const r = await d.hgGerar(o.cenas, {
    confirmado: true, qualidade: o.qualidade, segundos: 5, formato: '9:16',
    fotoProduto: foto || null
  });

  HGG.gerando = null; HGG.passo = '';
  if (!r || !r.ok){
    HGG.erro = (r && r.motivo) || 'a geração não terminou';
    midiaRender();
    return;
  }

  /* os clipes entram como material do produto: a fábrica já sabe usar
     vídeo, e o vídeo do vendedor (agora, o da IA) entra na frente da foto */
  const caminhos = r.arquivos.map(function(a){ return a.caminho; });
  const atual = await dbGet('videos', o.id);
  await dbPut('videos', Object.assign({}, atual, {
    midia: (atual.midia || []).concat(caminhos.map(function(c){
      return { caminho: c, nome: c.split(/[\\/]/).pop(), tipo: 'video' };
    })),
    iaPasta: r.pasta
  }));
  HGG.feito = { id: o.id, quantos: r.arquivos.length, pasta: r.pasta,
                parcial: r.parcial, recado: r.recado };
  toast(r.recado + ' Agora gere o vídeo: as cenas com pessoa entram na frente.', 'ag');
  midiaRender();
}

/* ------------------------------------------------------------ a seção */
function hggSecaoHTML(){
  const e = HGG.estado;
  if (!hggTem())
    return '<div class="al aw"><i class="ti ti-info-circle"></i><div>' +
      'A IA de vídeo com pessoa só funciona no aplicativo instalado no computador. ' +
      'Pelo navegador, use o botão de copiar o prompt e gere na IA da sua preferência.' +
      '</div></div>';

  let h = '<div class="sh"><i class="ti ti-user-check"></i>Vídeo com uma pessoa apresentando</div>';

  if (!e){ h += '<div class="tt">conferindo…</div>'; return h; }
  if (e.semPeca)
    return h + '<div class="al aw"><i class="ti ti-info-circle"></i><div>' +
      'Esta peça não veio no pacote instalado. Atualize o programa.</div></div>';

  if (!e.temChave){
    h += '<div class="tt">' + esc(e.recado || '') + '</div>';
    /* o botão principal fica AQUI, no alto, junto da chave. Antes ele vivia
       lá embaixo, depois de todos os produtos garimpados — o dono rolou a
       tela inteira e não achou. Botão que precisa ser procurado não existe. */
    h += HGG.abrindoChave ? hggFormChaveHTML()
      : '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn gn" onclick="hggAbrirChave()">' +
          '<i class="ti ti-key"></i>Colar a minha chave</button>' +
        '<button class="btn gh" onclick="hggCriarVideo()">' +
          '<i class="ti ti-user-check"></i>Criar vídeo no Higgsfield</button>' +
        '</div>';
    return h;
  }

  h += '<div class="tt">' +
    (e.pronto ? '<b style="color:var(--green)">Ligada</b>' : '<b style="color:var(--amber)">Com problema</b>') +
    ' &nbsp;·&nbsp; chave ' + esc(e.chave || '') + '<br>' + esc(e.recado || '') + '</div>';
  h += '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<button class="btn gn" onclick="hggCriarVideo()">' +
      '<i class="ti ti-user-check"></i>Criar vídeo no Higgsfield</button>' +
    '<button class="btn xs" onclick="hggAbrirChave()"><i class="ti ti-refresh"></i>Trocar a chave</button>' +
    '<button class="btn xs" onclick="hggEsquecerChave()"><i class="ti ti-trash"></i>Tirar a chave deste PC</button>' +
    '</div>';
  if (HGG.abrindoChave) h += hggFormChaveHTML();
  return h;
}

/* O cartão que aparece dentro do item da pauta. */
function hggCartaoHTML(item){
  const e = HGG.estado;
  if (!hggTem() || !e || e.semPeca || !e.temChave) return '';

  let h = '';

  if (HGG.gerando === item.id){
    h += '<div class="al ai" style="margin-top:9px"><i class="ti ti-loader"></i><div>' +
      '<b>Gerando as cenas com pessoa…</b><br>' + esc(HGG.passo || 'trabalhando') +
      '<br><span class="tt">Pode demorar alguns minutos. Não feche o programa.</span>' +
      '</div></div>';
    return h;
  }

  const o = HGG.orcamento;
  if (o && o.id === item.id){
    h += '<div class="al aw" style="margin-top:9px"><i class="ti ti-cash"></i><div>' +
      '<b>Antes de gastar:</b> gerar as ' + o.cenas.length + ' cenas com pessoa custa ' +
      '<b>' + (o.conta.creditos || 0) + ' créditos</b> (cerca de US$ ' +
      (o.conta.usd || 0).toFixed(2) + ', algo como ' + hggEmReais(o.conta.usd) + ' — ' +
      'a conta em real depende da cotação do dia e do IOF do seu cartão).' +
      (o.passouDoTeto
        ? '<br><b style="color:var(--red)">Isso passa do teto de US$ ' + o.teto +
          ' que está configurado.</b>' : '') +
      '<br><span class="tt">Cena que falhar ou for barrada não é cobrada.</span>' +
      '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn gn" onclick="hggConfirmarGerar()"><i class="ti ti-check"></i>' +
          'Pode gerar por ' + (o.conta.creditos || 0) + ' créditos</button>' +
        '<button class="btn" onclick="hggCancelarOrcamento()">Agora não</button>' +
      '</div></div></div>';
    return h;
  }

  if (HGG.feito && HGG.feito.id === item.id){
    h += '<div class="al ag" style="margin-top:9px"><i class="ti ti-user-check"></i><div>' +
      esc(HGG.feito.recado) + ' Elas já entraram como material deste produto — ' +
      'clique em <b>Gerar de novo</b> que o vídeo sai com a pessoa na frente.' +
      '</div></div>';
  }

  if (HGG.erro){
    h += '<div class="al ae" style="margin-top:9px"><i class="ti ti-alert-circle"></i><div>' +
      esc(HGG.erro) + '</div></div>';
  }

  if (e.pronto){
    h += '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button class="btn gh" onclick="hggOrcar(' + item.id + ')">' +
        '<i class="ti ti-user-check"></i>Gerar com uma pessoa</button>' +
      '<select class="xs" onchange="hggQualidade(this.value)" style="max-width:220px">' +
        '<option value="barato"' + (HGG.qualidade === 'barato' ? ' selected' : '') + '>' +
          'barato primeiro (recomendado)</option>' +
        '<option value="bom"' + (HGG.qualidade === 'bom' ? ' selected' : '') + '>' +
          'no capricho (mais caro)</option>' +
      '</select>' +
      '<button class="btn xs" onclick="hggCopiarPedido(' + item.id + ')">' +
        '<i class="ti ti-clipboard"></i>Copiar o pedido completo</button>' +
      '<span class="tt">o preço aparece antes de gastar</span>' +
      '</div>';
  } else {
    /* sem chave funcionando, o pedido continua servindo: ele leva para
       qualquer outra IA sem depender deste serviço */
    h += '<div style="margin-top:9px">' +
      '<button class="btn xs" onclick="hggCopiarPedido(' + item.id + ')">' +
        '<i class="ti ti-clipboard"></i>Copiar o pedido completo</button></div>';
  }
  return h;
}

function hggQualidade(v){ HGG.qualidade = v === 'bom' ? 'bom' : 'barato'; midiaRender(); }

/* =============================== O BOTÃO "CRIAR VÍDEO NO HIGGSFIELD"

   Ele vive no alto da aba Vídeos e pauta, junto com "Novo vídeo", porque é
   ali que o dono chega quando quer um vídeo — e não dentro do cartão de um
   produto, que ele só encontra depois de rolar a tela.

   O botão não gera nada sozinho. Ele pergunta PARA QUAL produto, e cai no
   mesmo caminho de sempre: orçamento na tela, confirmação dele, e só então
   a geração. Um botão que gastasse dinheiro no primeiro clique seria uma
   armadilha, por mais bonito que fosse.                                   */
async function hggCriarVideo(){
  if (!hggTem()){
    modal('Criar vídeo no Higgsfield', 'ti-user-check',
      '<div class="tt">A IA de vídeo com pessoa só funciona no aplicativo instalado no ' +
      'computador. Pelo navegador, abra o produto na pauta e use <b>Copiar o pedido ' +
      'completo</b> — ele leva tudo pronto para a IA da sua preferência.</div>');
    return;
  }

  if (!HGG.estado) await hggVerEstado();
  const e = HGG.estado || {};

  if (e.semPeca){
    modal('Criar vídeo no Higgsfield', 'ti-user-check',
      '<div class="al aw"><i class="ti ti-info-circle"></i><div>Esta peça não veio no ' +
      'pacote instalado. Atualize o programa pelo menu Atualizações.</div></div>');
    return;
  }

  if (!e.temChave || !e.pronto){
    /* sem chave não adianta listar produto: o caminho é a chave primeiro */
    modal('Criar vídeo no Higgsfield', 'ti-key',
      '<div class="tt">' + esc(e.recado || 'A chave ainda não está configurada.') + '</div>' +
      '<div class="tt" style="margin-top:8px">Entre em <b>cloud.higgsfield.ai</b>, crie uma ' +
      'chave e cole o ID e o segredo na aba Vídeos e pauta. Ela fica só neste computador.</div>',
      '<button class="btn gn" onclick="closeModal(\'mk-form\'); midStab(\'videos\'); ' +
        'setTimeout(hggAbrirChave, 150)"><i class="ti ti-key"></i>Ir colar a chave</button>' +
      '<button class="btn gh" onclick="closeModal(\'mk-form\')">Fechar</button>');
    return;
  }

  const todos = await dbGetAll('videos');
  const itens = todos.filter(function(v){ return v.origem === 'garimpo' && v.produto; })
                     .sort(function(a, b){ return Number(b.id) - Number(a.id); });

  if (!itens.length){
    modal('Criar vídeo no Higgsfield', 'ti-user-check',
      '<div class="tt">Não há produto na pauta ainda. Vá no <b>Garimpo</b>, escolha um ' +
      'produto e ele cai aqui com o prompt pronto.</div>',
      '<button class="btn gn" onclick="closeModal(\'mk-form\'); midStab(\'gar\')">' +
        '<i class="ti ti-pick"></i>Ir para o Garimpo</button>' +
      '<button class="btn gh" onclick="closeModal(\'mk-form\')">Fechar</button>');
    return;
  }

  const linhas = itens.map(function(it){
    const nome = (it.produto && (it.produto.n || it.produto.nome)) || it.titulo || 'sem nome';
    const jaTem = (it.midia || []).some(function(m){
      return m && (m.tipo === 'video' || /\.mp4$/i.test(String(m.caminho || m.nome || '')));
    });
    return '<button class="btn" style="width:100%;justify-content:flex-start;text-align:left;' +
      'margin-bottom:6px" onclick="hggEscolherProduto(' + it.id + ')">' +
      '<i class="ti ti-user-check"></i><span><b>' + esc(nome) + '</b>' +
      (jaTem ? '<br><span class="tt">já tem cena com pessoa — gerar de novo cria outras</span>'
             : '') + '</span></button>';
  }).join('');

  modal('Criar vídeo no Higgsfield', 'ti-user-check',
    '<div class="tt" style="margin-bottom:10px">Escolha o produto. Eu monto as cinco cenas ' +
    'com uma pessoa apresentando, mostro <b>quanto vai custar</b> e só gero depois que ' +
    'você confirmar.</div>' + linhas,
    '<button class="btn gh" onclick="closeModal(\'mk-form\')">Fechar</button>', 'lg');
}

async function hggEscolherProduto(id){
  closeModal('mk-form');
  midStab('videos');
  /* abre a ficha do produto para o orçamento aparecer onde ele está olhando */
  if (typeof PAUTA !== 'undefined' && PAUTA.abertos) PAUTA.abertos[id] = true;
  await hggOrcar(id);
  setTimeout(function(){
    const alvo = document.getElementById('pauta-' + id);
    if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 250);
}

/* ================================================== O PEDIDO, NUM CLIQUE

   Um "pedido" é tudo que qualquer IA de vídeo precisa para fazer o vídeo
   deste produto: o que é o produto, onde está a foto real dele, as cinco
   cenas em inglês, a narração em português, os benefícios e o que é
   proibido. Serve para o botão daqui e serve para levar para outra IA —
   é o mesmo pacote, e o dono não fica refém de um serviço só.            */
function hggPedidoTexto(item){
  const p = item && item.produto;
  if (!p) return '';
  const cenas = hggCenasDoProduto(p, '9:16 (vertical)');
  const fala = (typeof pessNarracao === 'function') ? pessNarracao(p) : [];
  const fam = (typeof pessFamilia === 'function') ? pessFamilia(p.n || p.nome || '') : null;

  const l = [];
  l.push('PEDIDO DE VÍDEO — JeV Empreendimentos');
  l.push('PRODUTO: ' + (p.n || p.nome || ''));
  if (fam) l.push('TIPO: ' + fam.n);
  l.push('FORMATO: 9:16 vertical · ' + cenas.length + ' cenas de 5 a 8 segundos');
  if (item.midiaPasta) l.push('FOTOS REAIS DO PRODUTO: ' + item.midiaPasta);
  l.push('');
  l.push('REGRA QUE VALE PARA TODAS AS CENAS:');
  l.push('  · em toda cena tem que aparecer uma PESSOA apresentando o produto;');
  l.push('  · o produto aparece inteiro, com folga nas bordas, nunca cortado;');
  l.push('  · é sempre a mesma pessoa, com a mesma roupa, do começo ao fim;');
  l.push('  · use a foto real como referência para o produto não virar outro.');
  if (fam && fam.beneficios && fam.beneficios.length){
    l.push('');
    l.push('BENEFÍCIOS QUE O VÍDEO PRECISA MOSTRAR:');
    fam.beneficios.forEach(function(b){ l.push('  · ' + b); });
  }
  l.push('');
  cenas.forEach(function(c, i){
    l.push('=== CENA ' + c.n + ' de ' + cenas.length + ' — ' + c.papel);
    l.push(c.prompt);
    l.push('');
    l.push('[em português] ' + c.pt);
    if (fala[i]) l.push('[narração por cima] ' + fala[i]);
    l.push('');
  });
  l.push('NEGATIVE PROMPT:');
  l.push('product alone without a person, empty room with no person, no people, ' +
         'cropped product, product cut off at the frame edge, head cut off at the top, ' +
         'deformed product, wrong product, changing product between shots, ' +
         'model-like face, stock footage look');
  return l.join('\n');
}

async function hggCopiarPedido(id){
  const item = await dbGet('videos', id);
  if (!item) return;
  const txt = hggPedidoTexto(item);
  if (!txt){ toast('Este item não tem produto para montar o pedido.', 'aw'); return; }
  try {
    await navigator.clipboard.writeText(txt);
    toast('Pedido completo copiado — cole em qualquer IA de vídeo.', 'ag');
  } catch (e) {
    toast('Não consegui copiar sozinho. Abra o prompt e copie na mão.', 'aw');
  }
}

/* Ouve o andamento vindo do aplicativo, para a barra não ficar parada. */
function hggEscutar(){
  const d = hggApp();
  if (!d || !d.hgAoAndar || HGG._ouvindo) return;
  HGG._ouvindo = true;
  d.hgAoAndar(function(p){
    if (!p) return;
    HGG.passo = p.texto || HGG.passo;
    midiaRender();
  });
}

/* =========================================================================
   GARIMPO PELO KALODATA — a fonte principal de produtos

   Por que esta aba virou a principal: ela é a única que alcança do
   computador do dono. O TikTok Shop, que é onde estão os produtos que a JeV
   promove, está bloqueado na internet daquela máquina — a conexão morre
   antes de qualquer conversa, e isso nenhum programa conserta. O Kalodata
   abre normalmente, tem os mesmos produtos, tem os números de venda, e
   guarda a foto de cada produto num endereço que também abre.

   As outras lojas (Amazon, Shopee, Mercado Livre) continuam na aba do
   garimpo antigo. Nada foi tirado.

   Três coisas que esta tela faz questão de deixar claras:

     1. O LOGIN É SEU. A janela abre no site oficial e quem digita é você.
        Nenhuma senha passa por este programa.

     2. A NOTA TEM CONTA ABERTA. Cada produto mostra por que recebeu a nota
        que recebeu, em português, com os números que entraram.

     3. O QUE O PLANO NÃO LIBERA APARECE COMO NÃO LIBERADO. Se o Kalodata
        devolver preço e comissão zerados — o que acontece no plano Prova —
        a tela diz isso, em vez de mostrar "R$ 0,00 por venda" como se
        fosse informação.
   ========================================================================= */

const KALO = {
  estado: null,        /* {conectado, motivo, conta} */
  vendo: false,
  garimpando: false,
  achados: null,
  aviso: '',
  erro: '',
  periodo: null,
  quantos: 10,
  dias: 30
};

function kaloApp(){ return (typeof APP === 'function') ? APP() : null; }
function kaloTem(){ const d = kaloApp(); return !!(d && d.kaloGarimpar); }

/* --------------------------------------------------------------- tela */
async function kaloSecaoHTML(){
  if (!kaloTem()){
    return '<div class="al ai"><i class="ti ti-info-circle"></i><div>' +
      '<b>O garimpo pelo Kalodata só funciona no aplicativo do Windows.</b> ' +
      'Ele precisa abrir o site na sua conta e baixar as fotos para o seu ' +
      'computador — coisas que o navegador não deixa uma página fazer.' +
      '</div></div>';
  }

  const e = KALO.estado;
  let h = '';

  /* ---- conexão ---- */
  if (!e){
    h += '<div class="al ai"><i class="ti ti-plug"></i><div>' +
      'Ainda não conferi se você está conectado ao Kalodata. ' +
      '<div style="margin-top:8px"><button class="btn xs bl" ' +
      (KALO.vendo ? 'disabled' : '') + ' onclick="kaloVerEstado()">' +
      '<i class="ti ti-' + (KALO.vendo ? 'loader' : 'search') + '"></i>' +
      (KALO.vendo ? 'Conferindo…' : 'Conferir a conexão') + '</button></div>' +
      '</div></div>';
    return h;
  }

  if (!e.conectado){
    h += '<div class="al aw"><i class="ti ti-lock"></i><div>' +
      '<b>Você ainda não entrou na sua conta do Kalodata.</b><br>' + esc(e.motivo || '') +
      '<br><br>Clique abaixo: o site oficial abre numa janela e <b>você</b> faz o login. ' +
      'Nenhuma senha passa por este programa — eu só uso a sessão depois que ela existe. ' +
      'Feito uma vez, fica valendo nas próximas.' +
      '<div style="margin-top:8px">' +
      '<button class="btn xs gn" onclick="kaloEntrar()"><i class="ti ti-login"></i>' +
      'Abrir o Kalodata e entrar</button>' +
      '<button class="btn xs gh" onclick="kaloVerEstado()"><i class="ti ti-refresh"></i>' +
      'Já entrei, confira de novo</button></div>' +
      '</div></div>';
    return h;
  }

  h += '<div class="al ag"><i class="ti ti-check"></i><div>' +
    '<b>Conectado ao Kalodata</b>' + (e.conta ? ' — ' + esc(e.conta) : '') + '.' +
    ' Os produtos vêm do ranking do TikTok Shop Brasil dos últimos ' + KALO.dias + ' dias.' +
    '</div></div>';

  /* ---- botão de garimpar ---- */
  h += '<div class="brow" style="margin:10px 0">' +
    (KALO.garimpando
      ? '<button class="btn sm gh" disabled><i class="ti ti-loader"></i>Garimpando…</button>'
      : '<button class="btn sm pu" onclick="kaloGarimpar()"><i class="ti ti-pick"></i>' +
        'Garimpar os melhores produtos</button>') +
    (KALO.achados ? '<button class="btn sm gh" onclick="kaloLimpar()">' +
      '<i class="ti ti-eraser"></i>Limpar</button>' : '') +
    '</div>';

  if (KALO.erro)
    h += '<div class="al ae"><i class="ti ti-alert-circle"></i><div>' + esc(KALO.erro) + '</div></div>';
  if (KALO.aviso)
    h += '<div class="al aw"><i class="ti ti-info-circle"></i><div>' + esc(KALO.aviso) + '</div></div>';

  if (KALO.achados) h += kaloAchadosHTML();
  return h;
}

function kaloAchadosHTML(){
  const l = KALO.achados || [];
  if (!l.length) return '';
  let h = '<div class="sh"><i class="ti ti-trophy"></i>' + l.length +
    ' produtos, do melhor para o pior' +
    (KALO.periodo ? ' · ' + esc(KALO.periodo.startDate) + ' a ' + esc(KALO.periodo.endDate) : '') +
    '</div>';

  l.forEach(function(p, i){
    const cor = p.nota >= 70 ? 'var(--green)' : p.nota >= 45 ? 'var(--amber)' : 'var(--bg3)';
    h += '<div class="card tw" style="margin-bottom:10px;border-color:' + cor + '"><div class="bd">' +
      '<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">' +

      /* a capa que veio do Kalodata — a mesma que vai virar o vídeo */
      '<img src="' + esc(p.capa) + '" alt="" style="width:78px;height:78px;object-fit:cover;' +
      'border-radius:10px;background:var(--bg3);flex:none" ' +
      'onerror="this.style.visibility=\'hidden\'">' +

      '<div style="flex:1;min-width:240px">' +
        '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">' +
          '<span class="st" style="background:' + cor + ';color:#fff;font-weight:800">' +
          'nota ' + esc(String(p.nota)) + '</span>' +
          '<b style="font-size:14.5px">' + esc(p.nome) + '</b>' +
        '</div>' +
        '<div class="tt" style="margin:5px 0 6px">' +
          (p.preco ? moeda(p.preco) + '&nbsp;·&nbsp;' : '') +
          (p.comissao ? Math.round(p.comissao * 100) + '% de comissão&nbsp;·&nbsp;' : '') +
          (p.ganho ? '<b>~' + moeda(p.ganho) + '</b> por venda&nbsp;·&nbsp;' : '') +
          qtd(p.vendidos, 0) + ' vendidos' +
          (p.rating ? '&nbsp;·&nbsp; nota ' + String(p.rating).replace('.', ',') : '') +
        '</div>' +
        (p.porque && p.porque.length
          ? '<ul style="margin:0 0 6px 16px;padding:0;font-size:12.5px;line-height:1.7">' +
            p.porque.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'
          : '') +
      '</div></div>' +

      '<div class="brow" style="margin-top:9px">' +
        '<button class="btn xs gn" onclick="kaloParaPauta(' + i + ')">' +
        '<i class="ti ti-clipboard-plus"></i>Mandar para a pauta e gerar vídeo</button>' +
      '</div>' +
      '</div></div>';
  });

  h += '<div class="brow" style="margin-top:4px">' +
    '<button class="btn sm gn" onclick="kaloParaPauta(-1)">' +
    '<i class="ti ti-clipboard-plus"></i>Mandar TODOS para a pauta</button></div>';
  return h;
}

/* ---------------------------------------------------------- as ações */
async function kaloVerEstado(){
  const d = kaloApp();
  if (!d || !d.kaloEstado) return;
  KALO.vendo = true; midiaRender();
  let r;
  try { r = await d.kaloEstado(); }
  catch (e) { r = { conectado:false, motivo:String((e && e.message) || e) }; }
  KALO.vendo = false;
  KALO.estado = r || { conectado:false, motivo:'sem resposta' };
  midiaRender();
}

async function kaloEntrar(){
  const d = kaloApp();
  if (!d || !d.kaloEntrar) return;
  try { await d.kaloEntrar(); } catch (e) {}
  toast('Entre na sua conta na janela que abriu, depois volte e clique em "Já entrei".', 'ai');
}

async function kaloGarimpar(){
  const d = kaloApp();
  if (!d || !d.kaloGarimpar) return;
  KALO.garimpando = true; KALO.erro = ''; KALO.aviso = ''; midiaRender();
  let r;
  try { r = await d.kaloGarimpar({ quantos: KALO.quantos, dias: KALO.dias }); }
  catch (e) { r = { ok:false, achados:[], motivo:String((e && e.message) || e) }; }
  KALO.garimpando = false;

  if (r && r.ok){
    KALO.achados = r.achados;
    KALO.periodo = r.periodo;
    KALO.aviso = r.aviso || '';
    toast('Garimpei ' + r.achados.length + ' produtos, já ordenados pela nota.', 'ag');
  }else{
    KALO.achados = null;
    KALO.erro = (r && r.motivo) || 'não consegui garimpar no Kalodata';
    if (r && r.precisaEntrar) KALO.estado = { conectado:false, motivo:r.motivo };
    toast('Não deu para garimpar.', 'aw');
  }
  midiaRender();
}

function kaloLimpar(){ KALO.achados = null; KALO.aviso = ''; KALO.erro = ''; midiaRender(); }

/* Converte o achado do Kalodata para o formato que a pauta já entende.
   Assim o resto do sistema — prompt, gerar vídeo, publicar — não precisa
   saber que existe um Kalodata. */
/* O Kalodata não devolve categoria — devolve o título do anúncio. Mandar
   tudo para o mesmo nicho fazia o gerador de prompt colocar protetor solar,
   panela e bicicleta ergométrica todos dentro de um armário de quarto. O
   tipo sai do próprio nome do produto. */
const KALO_NICHO = {
  pele:'ban', cabelo:'ban', suplemento:'ban', bebe:'ban',
  cozinha:'coz', eletro:'coz',
  limpeza:'lim',
  aroma:'dec', moda:'dec', acessorio:'dec', fitness:'dec', pet:'dec',
  organizacao:'org'
};

function kaloComoProduto(p){
  const fam = (typeof pessFamiliaId === 'function') ? pessFamiliaId(p.nome) : 'organizacao';
  return {
    n: p.nome,
    t: p.nome,
    g: KALO_NICHO[fam] || 'org',
    familia: fam,                   /* o tipo de verdade, para o prompt de pessoa */
    preco: p.preco || 0,
    comissao: p.comissao || 0,
    ganho: p.ganho || 0,
    vend: p.vendidos || 0,
    nota: p.nota,
    rating: p.rating || 0,
    gancho: kaloGancho(p),
    capa: p.capa,                   /* é por aqui que a foto chega no vídeo */
    provas: p.provas || [],
    fonte: 'kalodata',
    kaloId: p.id,
    ang: 'Review honesto',
    links: [{ loja: 'tiktok', url: 'https://shop.tiktok.com/view/product/' + p.id }]
  };
}

/* O gancho sai do número mais forte que o produto tem. Número real vende
   mais que adjetivo: "54 mil pessoas compraram" bate "produto incrível". */
function kaloGancho(p){
  if ((p.vendidos || 0) >= 10000)
    return qtd(p.vendidos, 0) + ' pessoas compraram isso nos últimos 30 dias';
  if ((p.rating || 0) >= 4.8)
    return 'Nota ' + String(p.rating).replace('.', ',') + ' de quem já levou para casa';
  if ((p.ganho || 0) >= 15)
    return 'O achado que ninguém te mostrou ainda';
  return 'Esse aqui está saindo mais rápido do que repõem';
}

async function kaloParaPauta(i){
  const l = KALO.achados || [];
  const escolhidos = (i < 0 ? l : [l[i]]).filter(Boolean);
  if (!escolhidos.length) return;
  try{
    const r = await pautaDoGarimpo(escolhidos.map(kaloComoProduto));
    toast((r.novos || 0) + ' produto(s) na aba Vídeos e pauta. ' +
          'Lá é só clicar em Baixar as mídias e depois Gerar o vídeo.', 'ag');
    midStab('videos');
  }catch(e){
    toast('Não consegui mandar para a pauta: ' + ((e && e.message) || e), 'aw');
  }
}

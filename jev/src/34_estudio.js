/* =========================================================================
   ESTÚDIO — o vídeo é montado aqui dentro e você assiste antes de postar

   O caminho antigo era: baixar o roteiro, achar a pasta da fábrica, arrastar
   o arquivo, dar dois cliques num .bat, esperar, achar a pasta de saída.
   Seis passos e três chances de errar.

   Agora é um botão. O aplicativo instala as ferramentas sozinho, traz as
   fotos e o vídeo do produto, monta as três versões (em pé, deitada e
   quadrada) e toca o resultado na sua frente. Você assiste, aprova, e só
   então ele vai para a plataforma.

   Uma coisa que não mudou de propósito: NADA sobe para lugar nenhum antes
   de você ver. O botão de postar continua depois do de assistir.

   E outra: a narração é gerada por uma IA que roda no seu computador — não
   é serviço na internet. Não gasta crédito, não tem limite mensal e o seu
   texto não é enviado para servidor de ninguém.
   ========================================================================= */

const EST = {
  roteiroId: null,
  roteiro: null,
  arquivos: [],        /* fotos e vídeos escolhidos no computador */
  fotos: [],           /* endereços vindos da página do produto */
  videos: [],
  trilha: null,
  urlProduto: '',
  buscando: false,
  fase: 'parado',      /* parado · instalando · montando · pronto · erro */
  pct: 0,
  recado: '',
  registro: [],
  resultado: null,
  vendo: 0,
  ferramentas: null,
  ia: null,            /* o que a placa de vídeo deste PC aguenta */
  iaLigada: false,     /* animar as fotos com a IA local nesta montagem */
  iaExaminando: false
};

function estApp(){ return (typeof APP === 'function') ? APP() : null; }
function estTem(){ const d = estApp(); return !!(d && d.estCriar); }

/* o caminho do arquivo vira endereço que o <video> entende */
function estUrlArquivo(caminho){
  const c = String(caminho || '');
  if (!c) return '';
  if (/^[a-z]+:\/\//i.test(c)) return c;
  const barra = c.replace(/\\/g, '/');
  const comeco = /^[A-Za-z]:/.test(barra) ? 'file:///' : 'file://';
  return comeco + barra.split('/').map(encodeURIComponent).join('/').replace(/^%2F/, '/');
}
function estTamanho(b){
  const n = Number(b) || 0;
  if (n > 1048576) return qtd(n / 1048576, 1) + ' MB';
  if (n > 1024) return qtd(n / 1024, 0) + ' KB';
  return n + ' B';
}

/* ------------------------------------------------- o cartão na aba Gerar vídeo */
function estCartaoHTML(){
  if (!estTem()) return estCartaoNavegadorHTML();

  const f = EST.ferramentas;
  const pronto = f && f.pronto;
  let h = '<div class="card" style="border-color:var(--green)"><div class="hd" style="background:var(--green-bg)">' +
    '<i class="ti ti-movie"></i>Criar o vídeo agora, neste computador<span class="sp"></span>' +
    (EST.fase === 'montando'
      ? '<button class="btn sm rd" onclick="estParar()"><i class="ti ti-player-stop"></i>Parar</button>'
      : '') +
    '</div><div class="bd">';

  if (!pronto){
    h += '<div class="al aw"><i class="ti ti-download"></i><div>' +
      'Antes da primeira vez, o programa precisa baixar as ferramentas que montam o vídeo: ' +
      'o <b>FFmpeg</b> e a <b>voz de IA em português</b>. São cerca de <b>175 MB</b>, uma vez só. ' +
      'Nada é instalado no Windows — fica tudo dentro da pasta de dados do programa, e some se você ' +
      'desinstalar.</div></div>' +
      (EST.fase === 'instalando'
        ? estBarraHTML()
        : '<button class="btn gn blk" onclick="estInstalar()"><i class="ti ti-download"></i>Instalar as ferramentas</button>') +
      (f && f.motivo ? '<div class="tt" style="margin-top:8px">' + esc(f.motivo) + '</div>' : '') +
      '</div></div>';
    return h;
  }

  /* ---- de onde vem a imagem ---- */
  h += '<div class="sh" style="margin-top:0"><i class="ti ti-photo"></i>O que vai aparecer na tela</div>';

  const totalMidia = EST.arquivos.length + EST.fotos.length + EST.videos.length;
  const temFilme = EST.videos.length > 0 ||
    EST.arquivos.some(function(a){ return /\.(mp4|mov|m4v|webm|mkv)$/i.test(a.nome || a.caminho || ''); });
  h += '<div class="al ' + (totalMidia ? 'ag' : 'ai') + '"><i class="ti ti-' + (totalMidia ? 'check' : 'info-circle') + '"></i><div>' +
    (totalMidia
      ? '<b>' + totalMidia + '</b> peça(s) de mídia: ' +
        [EST.fotos.length ? EST.fotos.length + ' foto(s) do anúncio' : '',
         EST.videos.length ? EST.videos.length + ' vídeo(s) do vendedor' : '',
         EST.arquivos.length ? EST.arquivos.length + ' arquivo(s) do seu computador' : '']
          .filter(Boolean).join(' · ')
      : 'Sem foto nenhuma o vídeo sai com fundo liso e a legenda por cima. Funciona, mas vende bem menos.') +
    '</div></div>';

  /* o recado que faltava: a pessoa usando o produto vem do vídeo do anúncio */
  h += '<div class="al ' + (temFilme ? 'ag' : 'aw') + '" style="margin-top:8px">' +
    '<i class="ti ti-' + (temFilme ? 'user-check' : 'user-question') + '"></i><div>' +
    (temFilme
      ? '<b>Tem vídeo do vendedor.</b> As cenas saem com pedaços dele — é aí que aparece ' +
        'a pessoa usando o produto. As fotos entram só no que sobrar.'
      : '<b>Para aparecer uma pessoa usando o produto, é preciso o vídeo do anúncio.</b> ' +
        'O sistema não inventa gente: ele mostra o material que existe. Baixe o vídeo no ' +
        'painel do vendedor (TikTok Shop, Shopee, Mercado Livre) e clique em ' +
        '<b>Escolher do computador</b>. Só com foto, o produto aparece parado.') +
    '</div></div>';

  h += '<div class="fr3"><div class="fg" style="grid-column:span 2">' +
    '<label>Endereço do produto na loja</label>' +
    '<input id="es-url" value="' + esc(EST.urlProduto) + '" oninput="EST.urlProduto=this.value" ' +
    'placeholder="Cole aqui o endereço do anúncio — eu busco as fotos e o vídeo dele"></div>' +
    '<div class="fg"><label>&nbsp;</label>' +
    '<button class="btn bl blk" ' + (EST.buscando ? 'disabled' : '') + ' onclick="estBuscarMidia()">' +
    '<i class="ti ti-' + (EST.buscando ? 'loader' : 'search') + '"></i>' +
    (EST.buscando ? 'Buscando…' : 'Buscar a mídia') + '</button></div></div>';

  h += '<div class="brow" style="margin-bottom:10px">' +
    '<button class="btn sm gh" onclick="estEscolher(\'midia\')"><i class="ti ti-folder-open"></i>Escolher do computador</button>' +
    '<button class="btn sm gh" onclick="estEscolher(\'trilha\')"><i class="ti ti-music"></i>' +
      (EST.trilha ? 'Trocar a música' : 'Música de fundo') + '</button>' +
    (totalMidia ? '<button class="btn sm gh" onclick="estLimparMidia()"><i class="ti ti-eraser"></i>Limpar a mídia</button>' : '') +
    '</div>';

  if (EST.trilha)
    h += '<div class="tt" style="margin-bottom:8px"><i class="ti ti-music"></i> ' + esc(EST.trilha.nome) + '</div>';

  if (EST.fotos.length || EST.videos.length){
    h += '<div class="chips" style="margin-bottom:10px">' +
      EST.fotos.slice(0, 8).map(function(u, i){
        return '<span class="chip on" title="' + esc(u) + '"><i class="ti ti-photo"></i> foto ' + (i + 1) + '</span>'; }).join('') +
      EST.videos.map(function(u, i){
        return '<span class="chip on" title="' + esc(u) + '"><i class="ti ti-video"></i> vídeo ' + (i + 1) + '</span>'; }).join('') +
      '</div>';
  }
  if (EST.arquivos.length){
    h += '<div class="chips" style="margin-bottom:10px">' +
      EST.arquivos.slice(0, 10).map(function(a){
        return '<span class="chip on">' + esc(a.nome) + '</span>'; }).join('') + '</div>';
  }
  if (EST.recado && EST.fase !== 'montando')
    h += '<div class="al ' + (EST.fase === 'erro' ? 'ae' : 'aw') + '"><i class="ti ti-alert-circle"></i><div>' +
         esc(EST.recado) + '</div></div>';

  h += estIaHTML();

  /* ---- o botão ---- */
  if (EST.fase === 'montando'){
    h += estBarraHTML();
  }else{
    h += '<button class="btn gn blk" style="font-size:14px;padding:12px" onclick="estCriar()">' +
      '<i class="ti ti-wand"></i>Criar o vídeo agora</button>' +
      '<div class="tt" style="margin-top:7px">Monta as três versões — em pé, deitada e quadrada — com narração de IA ' +
      'e legenda queimada. Costuma levar de 1 a 4 minutos, dependendo do computador.</div>';
  }

  h += '</div></div>';
  if (EST.resultado) h += estResultadoHTML(EST.resultado);
  return h;
}

/* ================================================ a IA de vídeo do seu PC

   Esta parte da tela existe para dizer a verdade antes de você gastar 8 GB
   de disco e uma hora de espera. Ela pergunta à placa de vídeo o que ela
   aguenta e escreve a resposta, seja qual for.

   E deixa claro o que a IA faz, porque a expectativa costuma ser outra: ela
   não desenha uma pessoa segurando o seu produto. Ela pega a foto de verdade
   do anúncio e põe aquela foto em movimento. O primeiro quadro é a foto real
   — é isso que impede o produto de virar outro produto.                    */
function estIaHTML(){
  if (!estTem()) return '';

  const ia = EST.ia;
  let h = '<div class="sh"><i class="ti ti-cpu"></i>IA de vídeo no seu computador</div>';

  /* o sistema se atualiza sozinho pela internet, mas a fábrica e a peça de IA
     vão dentro do PROGRAMA. Quando o sistema é mais novo que o programa, esta
     parte da tela existe sem ter com quem falar — e o certo é dizer isso.   */
  const d0 = estApp();
  if (!d0 || !d0.estIaEstado){
    return h + '<div class="al aw"><i class="ti ti-refresh"></i><div>' +
      '<b>O seu aplicativo está mais antigo que o sistema.</b> A IA de vídeo local ' +
      'e a nova ordem de cenas (vídeo do vendedor na frente da foto) vêm dentro do ' +
      'programa, não da atualização automática. Baixe e instale o aplicativo mais ' +
      'novo pelo menu <b>Atualizações</b> para ter as duas coisas.' +
      '</div></div>';
  }

  if (!ia){
    return h + '<div class="al ai"><i class="ti ti-info-circle"></i><div>' +
      'Dá para pôr as fotos do produto em movimento usando a placa de vídeo deste ' +
      'computador — sem mandar nada para a internet e sem gastar crédito. ' +
      'Antes de baixar qualquer coisa, deixe eu examinar a máquina.' +
      '<div style="margin-top:8px"><button class="btn xs bl" ' +
      (EST.iaExaminando ? 'disabled' : '') + ' onclick="estIaExaminar()">' +
      '<i class="ti ti-' + (EST.iaExaminando ? 'loader' : 'search') + '"></i>' +
      (EST.iaExaminando ? 'Examinando…' : 'Ver se o meu PC aguenta') + '</button></div>' +
      '</div></div>';
  }

  /* o PC não aguenta: falar isso na cara é mais útil que um botão que falha */
  if (!ia.pronto && !ia.pode_instalar){
    return h + '<div class="al ae"><i class="ti ti-x"></i><div>' +
      '<b>Este computador não vai rodar a IA de vídeo.</b><br>' + esc(ia.motivo || '') +
      '<br><br>Não é um defeito do sistema: é o tamanho do serviço. O caminho que ' +
      'funciona aqui é o <b>vídeo do anúncio</b>, que já mostra uma pessoa usando o ' +
      'produto de verdade — e sai na hora, sem baixar nada.' +
      '</div></div>';
  }

  const placa = esc(ia.placa || 'placa NVIDIA') +
    (ia.vram_gb ? ' · ' + ia.vram_gb + ' GB' : '');

  /* dá para instalar, mas ainda falta baixar */
  if (!ia.pronto){
    return h + '<div class="al aw"><i class="ti ti-download"></i><div>' +
      '<b>' + placa + '</b> — dá para rodar. ' + esc(ia.motivo || '') +
      '<br><br><b>São uns 8 GB de download</b>, uma vez só, e depois cada foto leva ' +
      'de 1 a 3 minutos para virar clipe. Enquanto isso o computador fica pesado.' +
      (ia.apertado ? '<br><b>Aviso:</b> a memória da sua placa está no limite. Vai ' +
        'funcionar, mas devagar.' : '') +
      '<div style="margin-top:8px"><button class="btn xs gn" onclick="estIaInstalar()">' +
      '<i class="ti ti-download"></i>Baixar e instalar a IA de vídeo</button>' +
      '<button class="btn xs gh" onclick="estIaExaminar()"><i class="ti ti-refresh"></i>' +
      'Examinar de novo</button></div>' +
      '</div></div>';
  }

  /* está pronta: agora é escolha sua, montagem por montagem */
  return h + '<div class="al ag"><i class="ti ti-check"></i><div>' +
    '<b>' + placa + '</b> — a IA de vídeo está instalada.' +
    '<div style="margin-top:8px">' +
    '<label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">' +
    '<input type="checkbox" ' + (EST.iaLigada ? 'checked' : '') +
    ' onchange="EST.iaLigada=this.checked;midiaRender()" style="margin-top:3px">' +
    '<span>Animar as fotos do produto com a IA nesta montagem</span></label>' +
    '</div>' +
    '<div class="tt" style="margin-top:8px">A IA <b>não desenha uma pessoa</b>: ela põe a ' +
    'foto de verdade em movimento, e o primeiro quadro continua sendo a foto do anúncio. ' +
    'Se a foto já tem alguém usando o produto, é essa pessoa que se mexe. ' +
    'Se a foto é só o produto na mesa, o que você ganha é movimento, não uma pessoa.' +
    (EST.iaLigada ? '<br><b>Ligada: a montagem vai demorar bem mais.</b>' : '') +
    '</div>' +
    '<div style="margin-top:8px"><button class="btn xs gh" onclick="estIaExaminar()">' +
    '<i class="ti ti-refresh"></i>Examinar de novo</button>' +
    '<button class="btn xs rd" onclick="estIaLimpar()"><i class="ti ti-trash"></i>' +
    'Apagar o modelo (libera 8 GB)</button></div>' +
    '</div></div>';
}

async function estIaExaminar(){
  const d = estApp();
  if (!d || !d.estIaEstado){ toast('Isso só existe no aplicativo do Windows.', 'aw'); return; }
  EST.iaExaminando = true; midiaRender();
  let r;
  try { r = await d.estIaEstado(); }
  catch (e) { r = { pronto:false, pode_instalar:false, motivo:String((e && e.message) || e) }; }
  EST.iaExaminando = false;
  EST.ia = r || { pronto:false, pode_instalar:false, motivo:'sem resposta' };
  if (!EST.ia.pronto) EST.iaLigada = false;
  midiaRender();
}

async function estIaInstalar(){
  const d = estApp();
  if (!d || !d.estIaInstalar) return;
  confirmar('Baixar a IA de vídeo',
    'São uns 8 GB de download, uma vez só. Enquanto baixa, dá para continuar usando o ' +
    'sistema, mas não feche o aplicativo. Pode começar?',
    async function(){
      EST.fase = 'instalando'; EST.pct = 0; EST.recado = 'preparando o download'; EST.registro = [];
      estOuvir(); midiaRender();
      let r;
      try { r = await d.estIaInstalar(); }
      catch (e) { r = { ok:false, motivo:String((e && e.message) || e) }; }
      EST.fase = 'parado';
      EST.ia = r.estado || EST.ia;
      if (r.ok){ EST.recado = ''; toast('IA de vídeo instalada.', 'ag'); }
      else { EST.recado = r.motivo || 'não consegui instalar a IA de vídeo';
             toast('Não deu para instalar a IA.', 'aw'); }
      midiaRender();
    });
}

function estIaLimpar(){
  const d = estApp();
  if (!d || !d.estIaLimpar) return;
  confirmar('Apagar o modelo de IA',
    'Libera uns 8 GB no disco. Se você quiser usar de novo depois, terá que baixar tudo ' +
    'outra vez. As outras ferramentas de vídeo continuam.',
    async function(){
      try { await d.estIaLimpar(); } catch (e) {}
      EST.iaLigada = false;
      await estIaExaminar();
      toast('Modelo apagado.', 'aw');
    });
}

function estBarraHTML(){
  const ultimas = EST.registro.slice(-3);
  return '<div class="card tw" style="margin:0"><div class="bd">' +
    '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700">' +
      '<span>' + esc(EST.recado || 'trabalhando…') + '</span><span>' + Math.round(EST.pct) + '%</span></div>' +
    '<div style="height:10px;background:var(--bg3);border-radius:6px;overflow:hidden;margin-top:8px">' +
      '<div style="height:100%;width:' + Math.round(EST.pct) + '%;background:var(--green);transition:width .3s"></div></div>' +
    (ultimas.length ? '<div class="tt mono" style="margin-top:8px;line-height:1.6">' +
      ultimas.map(function(l){ return esc(l); }).join('<br>') + '</div>' : '') +
    '</div></div>';
}

function estCartaoNavegadorHTML(){
  return '<div class="card tw"><div class="hd"><i class="ti ti-cpu"></i>Criar o vídeo no seu computador</div><div class="bd">' +
    '<div class="al aw"><i class="ti ti-info-circle"></i><div>' +
    'Montar o vídeo <b>dentro do sistema</b> só funciona no <b>aplicativo do Windows</b> — o navegador ' +
    'não tem permissão para usar o processador do jeito que a montagem precisa. Pelo navegador, o caminho ' +
    'continua sendo baixar o roteiro e rodar a fábrica na mão.</div></div>' +
    '<div class="al ai"><i class="ti ti-list-numbers"></i><div>' +
    '<b>1.</b> Clique em <b>Baixar para a fábrica</b> no roteiro acima.<br>' +
    '<b>2.</b> Coloque o arquivo na pasta <span class="mono">roteiros</span> da fábrica.<br>' +
    '<b>3.</b> Coloque as fotos do produto na pasta <span class="mono">midia</span>.<br>' +
    '<b>4.</b> Dois cliques em <span class="mono">MONTAR-VIDEO.bat</span>.</div></div>' +
    '</div></div>';
}

/* ---------------------------------------------------------------- ações */
async function estFerramentas(){
  const d = estApp();
  if (!d || !d.estEstado) return null;
  try { EST.ferramentas = await d.estEstado(); } catch (e) { EST.ferramentas = { pronto:false, motivo:String(e && e.message) }; }
  return EST.ferramentas;
}

function estOuvir(){
  const d = estApp();
  if (!d || !d.aoEstudio || EST._ouvindo) return;
  EST._ouvindo = true;
  d.aoEstudio(function(ev){
    if (!ev) return;
    if (typeof ev.pct === 'number') EST.pct = ev.pct;
    if (ev.texto){
      if (ev.tipo === 'linha') EST.registro.push(ev.texto);
      else EST.recado = ev.texto;
    }
    if (EST.registro.length > 40) EST.registro = EST.registro.slice(-40);
    estPintarBarra();
  });
}

/* redesenha só a barra, para não piscar a tela inteira a cada linha */
function estPintarBarra(){
  const alvo = document.getElementById('mid-body');
  if (!alvo || (EST.fase !== 'montando' && EST.fase !== 'instalando')) return;
  const antigo = alvo.querySelector('[data-est-barra]');
  const novo = document.createElement('div');
  novo.setAttribute('data-est-barra', '1');
  novo.innerHTML = estBarraHTML();
  if (antigo) antigo.replaceWith(novo);
}

async function estInstalar(){
  const d = estApp();
  if (!d || !d.estInstalar) return;
  EST.fase = 'instalando'; EST.pct = 0; EST.recado = 'começando'; EST.registro = [];
  estOuvir(); midiaRender();
  let r;
  try { r = await d.estInstalar(); }
  catch (e) { r = { ok:false, motivo:String((e && e.message) || e) }; }
  EST.ferramentas = r.estado || await estFerramentas();
  EST.fase = r.ok ? 'parado' : 'erro';
  EST.recado = r.ok ? '' : (r.motivo || 'não consegui instalar');
  toast(r.ok ? 'Ferramentas prontas.' : 'Faltou instalar: ' + EST.recado, r.ok ? 'ag' : 'aw');
  midiaRender();
}

async function estEscolher(qual){
  const d = estApp();
  if (!d || !d.estEscolher) return;
  let lista = [];
  try { lista = await d.estEscolher(qual); } catch (e) {}
  if (!lista || !lista.length) return;
  if (qual === 'trilha') EST.trilha = lista[0];
  else EST.arquivos = EST.arquivos.concat(lista).slice(0, 30);
  midiaRender();
}

function estLimparMidia(){
  EST.arquivos = []; EST.fotos = []; EST.videos = [];
  midiaRender();
}

async function estBuscarMidia(){
  const d = estApp();
  if (!d || !d.estMidiaProduto) return;
  const url = String(EST.urlProduto || '').trim();
  if (!url){ toast('Cole o endereço do anúncio primeiro.', 'aw'); return; }
  EST.buscando = true; EST.recado = ''; midiaRender();
  let r;
  try { r = await d.estMidiaProduto(url); }
  catch (e) { r = { ok:false, motivo:String((e && e.message) || e), fotos:[], videos:[] }; }
  EST.buscando = false;
  if (r.ok){
    EST.fotos = (r.fotos || []).slice(0, 10);
    EST.videos = (r.videos || []).slice(0, 3);
    EST.recado = EST.videos.length ? ''
      : 'Achei as fotos, mas nenhum vídeo. A loja só publica a foto de capa para fora. ' +
        'Se quiser o vídeo com a pessoa usando o produto, baixe o vídeo do anúncio no ' +
        'painel do vendedor e clique em "Escolher do computador".';
    toast('Achei ' + EST.fotos.length + ' foto(s) e ' + EST.videos.length + ' vídeo(s) do anúncio.', 'ag');
  }else{
    EST.recado = (r.motivo || 'não consegui ler a página do produto') +
      ' — o caminho certo aqui é "Escolher do computador" com o material do painel do vendedor.';
    toast('Não deu para buscar sozinho.', 'aw');
  }
  midiaRender();
}

/* junta o que o roteiro já sabe: o link do produto de afiliado */
function estUrlDoRoteiro(r){
  const p = (r && r.produtos) || [];
  for (let i = 0; i < p.length; i++) if (p[i].url) return p[i].url;
  return '';
}

async function estCriar(){
  const d = estApp();
  if (!d || !d.estCriar) return;
  const r = EST.roteiro || (typeof GER !== 'undefined' && GER && GER.pacote);
  if (!r || !r.cenas || !r.cenas.length){ toast('Monte o roteiro primeiro.', 'aw'); return; }

  EST.fase = 'montando'; EST.pct = 0; EST.recado = 'começando'; EST.registro = []; EST.resultado = null;
  estOuvir(); midiaRender();

  let res;
  try{
    res = await d.estCriar({
      roteiro: r,
      arquivos: EST.arquivos.map(function(a){ return a.caminho; }),
      fotos: EST.fotos,
      videos: EST.videos,
      trilha: EST.trilha ? EST.trilha.caminho : null,
      /* só liga se a IA estiver instalada E o dono tiver marcado a caixinha */
      ia: !!(EST.iaLigada && EST.ia && EST.ia.pronto)
    });
  }catch(e){ res = { ok:false, motivo:String((e && e.message) || e) }; }

  if (res && res.ok){
    EST.fase = 'pronto'; EST.pct = 100; EST.recado = '';
    EST.resultado = res; EST.vendo = 0;
    try{
      await dbAdd('producoes', {
        titulo: r.titulo || 'Vídeo', roteiroId: r.id || null,
        arquivos: res.arquivos, pasta: res.pasta, trabalho: res.trabalho,
        legenda: r.legenda || '', hashtags: r.hashtags || [],
        criadoEm: new Date().toISOString()
      });
    }catch(e){}
    toast('Vídeo pronto. Assista antes de postar.', 'ag');
  }else{
    EST.fase = 'erro';
    EST.recado = (res && res.motivo) || 'a montagem não terminou';
    toast('Não consegui montar: ' + EST.recado, 'aw');
  }
  midiaRender();
}

async function estParar(){
  const d = estApp();
  if (d && d.estParar){ try { await d.estParar(); } catch (e) {} }
  EST.fase = 'parado'; EST.recado = 'montagem interrompida por você';
  midiaRender();
}

/* ------------------------------------------------------- assistir e aprovar */
function estResultadoHTML(res){
  const arq = (res.arquivos || [])[EST.vendo] || (res.arquivos || [])[0];
  if (!arq) return '';
  const nomeFmt = { '9:16':'Em pé — TikTok, Reels, Shorts e Kwai',
                    '16:9':'Deitada — YouTube e Facebook',
                    '1:1':'Quadrada — feed do Instagram' };
  let h = '<div class="card" style="border-color:var(--green)">' +
    '<div class="hd" style="background:var(--green-bg)"><i class="ti ti-player-play"></i>' +
    'Assista antes de postar<span class="sp"></span>' +
    '<button class="btn sm gh" onclick="estAbrirPasta()"><i class="ti ti-folder"></i>Abrir a pasta</button>' +
    '<button class="btn sm bl" onclick="estBaixar()"><i class="ti ti-download"></i>Guardar no computador</button>' +
    '<button class="btn sm gh" onclick="estRefazer()"><i class="ti ti-refresh"></i>Refazer</button>' +
    '</div><div class="bd">';

  if ((res.avisos || []).length)
    h += '<div class="al aw"><i class="ti ti-alert-triangle"></i><div>' +
      esc(res.avisos.slice(0, 3).join(' · ')) + '</div></div>';

  h += '<div class="chips" style="margin-bottom:12px">' +
    (res.arquivos || []).map(function(a, i){
      return '<span class="chip ' + (i === EST.vendo ? 'on' : '') + '" onclick="estVer(' + i + ')">' +
        '<i class="ti ti-' + (a.formato === '9:16' ? 'device-mobile' : a.formato === '16:9' ? 'device-tv' : 'square') + '"></i> ' +
        esc(a.formato) + '</span>'; }).join('') + '</div>';

  h += '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">' +
    '<video id="es-player" controls preload="metadata" ' +
      'style="max-height:460px;max-width:100%;border-radius:12px;background:#000" ' +
      'src="' + esc(estUrlArquivo(arq.caminho)) + '"></video>' +
    '<div style="flex:1;min-width:230px">' +
      '<div class="row" style="display:flex;justify-content:space-between;padding:4px 0"><span>Formato</span>' +
        '<b>' + esc(arq.formato) + '</b></div>' +
      '<div class="row" style="display:flex;justify-content:space-between;padding:4px 0"><span>Onde usar</span>' +
        '<b style="text-align:right;font-size:12px">' + esc(nomeFmt[arq.formato] || '—') + '</b></div>' +
      '<div class="row" style="display:flex;justify-content:space-between;padding:4px 0"><span>Tamanho</span>' +
        '<b>' + estTamanho(arq.tamanho) + '</b></div>' +
      '<div class="tt mono" style="margin-top:8px;word-break:break-all">' + esc(arq.nome) + '</div>' +
      '<div class="al ai" style="margin-top:12px"><i class="ti ti-eye-check"></i><div>' +
        'Assista até o fim antes de aprovar. Confira principalmente se a <b>narração combina com a imagem</b> ' +
        'e se a legenda não cobre nada importante.</div></div>' +
      '<button class="btn gn blk" style="margin-top:10px" onclick="estPostar()">' +
        '<i class="ti ti-send"></i>Aprovar e postar este</button>' +
    '</div></div>';

  h += '</div></div>';
  return h;
}

function estVer(i){ EST.vendo = Number(i) || 0; midiaRender(); }

function estArquivoAtual(){
  const r = EST.resultado;
  if (!r || !r.arquivos || !r.arquivos.length) return null;
  return r.arquivos[EST.vendo] || r.arquivos[0];
}

async function estBaixar(){
  const d = estApp(), a = estArquivoAtual();
  if (!d || !a || !d.estGuardarComo) return;
  const onde = await d.estGuardarComo(a.caminho, a.nome);
  toast(onde ? 'Guardado em ' + onde : 'Não guardei nada.', onde ? 'ag' : 'aw');
}
async function estAbrirPasta(){
  const d = estApp(), a = estArquivoAtual();
  if (d && a && d.estAbrirPasta) await d.estAbrirPasta(a.caminho);
}
function estRefazer(){
  EST.resultado = null; EST.fase = 'parado'; EST.pct = 0; EST.recado = '';
  midiaRender();
}

/* leva o vídeo aprovado direto para a tela de postar, já anexado */
async function estPostar(){
  const a = estArquivoAtual();
  if (!a){ toast('Nenhum vídeo para postar.', 'aw'); return; }
  const canais = await dbGetAll('canais');
  if (!canais.length){ toast('Cadastre um canal primeiro.', 'aw'); canalForm(); return; }

  const r = EST.roteiro || (typeof GER !== 'undefined' && GER && GER.pacote) || {};
  const preferido = canais.find(function(c){ return c.finalidade === 'afiliado'; }) || canais[0];

  POST.canalId = Number(preferido.id);
  POST.video = { caminho: a.caminho, nome: a.nome, tamanho: a.tamanho };
  POST.titulo = r.titulo || '';
  POST.legenda = (r.legenda || '') + ((r.hashtags || []).length ? '\n\n' + r.hashtags.join(' ') : '');
  POST.resultado = null;
  await postRender();
}

/* ------------------------------------------------------ produções guardadas */
async function estGuardadasHTML(){
  const lista = (await dbGetAll('producoes')).sort(function(a, b){ return Number(b.id) - Number(a.id); });
  if (!lista.length) return '';
  return '<div class="card tw"><div class="hd"><i class="ti ti-movie"></i>Vídeos já montados aqui</div><div class="bd"><table>' +
    '<thead><tr><th>Título</th><th class="c">Versões</th><th class="c">Quando</th><th class="c no-print"></th></tr></thead><tbody>' +
    lista.slice(0, 15).map(function(p){
      return '<tr><td><b>' + esc(p.titulo) + '</b>' +
        '<div class="tt mono" style="max-width:340px;overflow:hidden;text-overflow:ellipsis">' + esc(p.pasta || '') + '</div></td>' +
        '<td class="c n">' + ((p.arquivos || []).length) + '</td>' +
        '<td class="c tt">' + esc(String(p.criadoEm || '').slice(0, 10).split('-').reverse().join('/')) + '</td>' +
        '<td class="c no-print nowrap">' +
          '<button class="ib bl" title="Assistir" onclick="estAbrirGuardada(' + p.id + ')"><i class="ti ti-player-play"></i></button>' +
          '<button class="ib rd" title="Tirar da lista" onclick="estDel(' + p.id + ')"><i class="ti ti-trash"></i></button>' +
        '</td></tr>'; }).join('') +
    '</tbody></table></div></div>';
}

async function estAbrirGuardada(id){
  const p = await dbGet('producoes', id);
  if (!p) return;
  EST.resultado = { ok:true, arquivos:p.arquivos || [], pasta:p.pasta, avisos:[] };
  EST.roteiro = { titulo:p.titulo, legenda:p.legenda, hashtags:p.hashtags };
  EST.vendo = 0; EST.fase = 'pronto';
  midiaRender();
}
function estDel(id){
  confirmar('Tirar da lista', 'O vídeo sai daqui, mas o arquivo continua no computador.',
    async function(){ await dbDel('producoes', id); toast('Removido.', 'aw'); EST.resultado = null; midiaRender(); });
}

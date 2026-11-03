/* =========================================================================
   PRODUÇÃO DE IA LOCAL — episódio do ZERO, por texto, narrado, sem nuvem

   Diferença para o Estúdio (aba "Montar do zero" de cima): o Estúdio pega a
   FOTO REAL do produto e põe em movimento — é para vídeo de afiliado, onde
   o produto precisa continuar sendo o produto. Aqui não existe produto:
   você escreve as cenas, cada uma nasce de um texto (Wan 2.2, pelo
   ComfyUI) e o episódio ganha narração em português (Piper). O FFmpeg
   junta tudo. Tudo isso roda no SEU computador, com placa NVIDIA.

   A PRIMEIRA VEZ precisa de 4 apontamentos (a pasta do ComfyUI, o workflow
   exportado dele, o modelo de voz do Piper e o ffmpeg) — depois disso o
   programa lembra e só confere se ainda está tudo no lugar.             */

const PIA = {
  cenas: [{ texto: '', fala: '', segundos: 4 }],
  titulo: '',
  narracaoGeral: '',
  fase: 'parado',     /* parado · configurando · gerando · pronto · erro */
  pct: 0,
  recado: '',
  registro: [],
  resultado: null,
  config: null,
  _ouvindo: false
};

function piaApp(){ return (typeof APP === 'function') ? APP() : null; }
function piaTem(){ const d = piaApp(); return !!(d && d.piaCriar); }

async function piaTabRender(){
  const body = document.getElementById('mid-body');
  if (!piaTem()){
    body.innerHTML = '<div class="card tw"><div class="hd"><i class="ti ti-cpu"></i>Produção de IA local</div><div class="bd">' +
      '<div class="al aw"><i class="ti ti-info-circle"></i><div>Esta tela só funciona no <b>aplicativo do Windows</b> — ' +
      'ela liga o ComfyUI e roda o FFmpeg e o Piper no seu computador, e o navegador não tem essa permissão.</div></div>' +
      '</div></div>';
    return;
  }
  if (!PIA.config) await piaAtualizarEstado();
  body.innerHTML = piaConfigHTML() + piaRoteiroHTML() +
    (PIA.fase === 'gerando' || PIA.fase === 'configurando' ? piaBarraHTML() : '') +
    (PIA.resultado ? piaResultadoHTML() : '');
}

async function piaAtualizarEstado(){
  const d = piaApp();
  if (!d || !d.piaEstado) return;
  try { PIA.config = await d.piaEstado(); }
  catch (e) { PIA.config = { pronto:false, faltando:[], motivo:String((e && e.message) || e) }; }
}

/* ---------------------------------------------------- 1. a configuração */
function piaConfigHTML(){
  const c = PIA.config || { pronto:false, faltando:[] };
  const linha = (ok, rotulo, valor, acao, botao) =>
    '<div class="row" style="align-items:center">' +
      '<span><i class="ti ' + (ok ? 'ti-check text-green' : 'ti-x text-red') + '" style="margin-right:6px"></i>' + esc(rotulo) + '</span>' +
      '<span class="tt" style="flex:1;margin:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(valor || '— não apontado') + '</span>' +
      '<button class="btn xs gh" onclick="' + acao + '">' + esc(botao) + '</button></div>';

  let h = '<div class="card tw"><div class="hd"><i class="ti ti-adjustments"></i>Onde estão as ferramentas' +
    '<span class="sp"></span>' +
    '<button class="btn sm gh" onclick="piaAtualizarEstadoTela()"><i class="ti ti-refresh"></i>Conferir de novo</button></div><div class="bd">';

  h += linha(!!c.comfyScript, 'Pasta do ComfyUI', c.comfyPasta, 'piaEscolher(\'pastaComfy\')', 'Apontar pasta');
  h += linha(!!c.workflow, 'Workflow exportado do ComfyUI', c.workflow ? 'guardado' : '', 'piaEscolher(\'workflow\')', 'Escolher arquivo');
  h += linha(!!c.piperModelo, 'Modelo de voz do Piper (.onnx)', c.piperModelo, 'piaEscolher(\'piperModelo\')', 'Escolher arquivo');
  h += linha(!!c.ffmpegExe, 'FFmpeg', c.ffmpegExe, 'piaEscolher(\'ffmpeg\')', 'Escolher arquivo');

  if (!c.workflow){
    h += '<div class="al ai" style="margin-top:10px"><i class="ti ti-info-circle"></i><div>' +
      'O workflow é o grafo que você já montou e testou na tela do ComfyUI. Para exportar: no ComfyUI, ' +
      'clique no logo colorido → <b>Workflow</b> → <b>Exportar (formato API)</b> — isso baixa um arquivo ' +
      '<span class="mono">.json</span>. Escolha esse arquivo aqui no botão acima.</div></div>';
  }

  h += '<div class="row" style="margin-top:10px;border-top:1px solid var(--bg3);padding-top:10px">' +
    '<span><b>Servidor do ComfyUI</b></span><span class="tt" style="flex:1;margin:0 10px">' +
    (c.servidorLigado ? 'ligado agora' : 'desligado — o episódio liga ele sozinho e desliga no fim') + '</span>' +
    (c.gpu ? '<span class="tt">' + esc(c.gpu.name || '') + '</span>' : '') + '</div>';

  if (!c.pronto)
    h += '<div class="al aw" style="margin-top:10px"><i class="ti ti-alert-triangle"></i><div>' +
      'Falta apontar: ' + esc((c.faltando || []).join(', ')) + '.</div></div>';

  h += '</div></div>';
  return h;
}

async function piaEscolher(qual){
  const d = piaApp();
  if (!d) return;
  const mapa = {
    pastaComfy:  d.piaEscolherPastaComfy,
    piperModelo: d.piaEscolherPiperModelo,
    ffmpeg:      d.piaEscolherFfmpeg,
    workflow:    d.piaEscolherWorkflow
  };
  const fn = mapa[qual];
  if (!fn) return;
  let r;
  try { r = await fn(); } catch (e) { r = null; }
  if (qual === 'workflow'){
    if (r && r.ok) toast('Workflow guardado.', 'ag');
    else if (r && r.motivo) toast(r.motivo, 'aw');
  }
  await piaAtualizarEstado();
  midiaRender();
}
async function piaAtualizarEstadoTela(){ await piaAtualizarEstado(); midiaRender(); toast('Conferido.', 'ag'); }

/* ---------------------------------------------------------- 2. o roteiro */
function piaRoteiroHTML(){
  let h = '<div class="card tw" style="margin-top:14px"><div class="hd"><i class="ti ti-movie"></i>O episódio' +
    '<span class="sp"></span>' +
    '<button class="btn sm gh" onclick="piaAddCena()"><i class="ti ti-plus"></i>Nova cena</button></div><div class="bd">';

  h += '<div class="fg"><label>Título do episódio</label>' +
    '<input id="pia-titulo" value="' + esc(PIA.titulo) + '" oninput="PIA.titulo=this.value" placeholder="Ex.: Noé e o dilúvio — parte 1"></div>';

  PIA.cenas.forEach((c, i) => {
    h += '<div class="card" style="margin:10px 0;border-style:dashed"><div class="bd">' +
      '<div class="row" style="margin-bottom:6px"><b>Cena ' + (i + 1) + '</b><span class="sp"></span>' +
      (PIA.cenas.length > 1 ? '<button class="ib rd" onclick="piaDelCena(' + i + ')"><i class="ti ti-trash"></i></button>' : '') + '</div>' +
      '<div class="fg"><label>O que aparece na tela (descreva a cena, em poucas frases)</label>' +
      '<textarea rows="2" oninput="PIA.cenas[' + i + '].texto=this.value">' + esc(c.texto) + '</textarea></div>' +
      '<div class="fr3">' +
        '<div class="fg" style="grid-column:span 2"><label>O que a narração fala nesta cena (opcional)</label>' +
        '<input value="' + esc(c.fala) + '" oninput="PIA.cenas[' + i + '].fala=this.value"></div>' +
        '<div class="fg"><label>Duração (segundos)</label>' +
        '<input type="number" min="2" max="10" value="' + c.segundos + '" oninput="PIA.cenas[' + i + '].segundos=Number(this.value)||4"></div>' +
      '</div></div></div>';
  });

  h += '<div class="fg"><label>Narração geral (se preencher, substitui a soma das falas de cada cena)</label>' +
    '<textarea rows="3" oninput="PIA.narracaoGeral=this.value">' + esc(PIA.narracaoGeral) + '</textarea></div>';

  const podeGerar = PIA.config && PIA.config.pronto && PIA.fase !== 'gerando';
  h += '<div class="brow" style="margin-top:10px">' +
    (PIA.fase === 'gerando'
      ? '<button class="btn rd" onclick="piaParar()"><i class="ti ti-player-stop"></i>Parar</button>'
      : '<button class="btn gn blk" ' + (podeGerar ? '' : 'disabled') + ' onclick="piaGerar()"><i class="ti ti-wand"></i>Gerar episódio</button>') +
    '</div>';
  if (!podeGerar && PIA.fase !== 'gerando')
    h += '<div class="tt" style="margin-top:6px">Aponte as 4 ferramentas acima antes de gerar.</div>';

  h += '</div></div>';
  return h;
}
function piaAddCena(){ PIA.cenas.push({ texto:'', fala:'', segundos:4 }); midiaRender(); }
function piaDelCena(i){ PIA.cenas.splice(i,1); midiaRender(); }

/* ----------------------------------------------------- 3. gerar + ouvir */
function piaOuvir(){
  const d = piaApp();
  if (!d || !d.aoProducaoIa || PIA._ouvindo) return;
  PIA._ouvindo = true;
  d.aoProducaoIa(ev => {
    if (!ev) return;
    if (typeof ev.pct === 'number') PIA.pct = ev.pct;
    if (ev.texto){
      if (ev.tipo === 'linha') PIA.registro.push(ev.texto);
      else PIA.recado = ev.texto;
    }
    if (PIA.registro.length > 40) PIA.registro = PIA.registro.slice(-40);
    piaPintarBarra();
  });
}
function piaBarraHTML(){
  const ultimas = PIA.registro.slice(-4);
  return '<div class="card tw" data-pia-barra="1" style="margin-top:14px"><div class="bd">' +
    '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700">' +
      '<span>' + esc(PIA.recado || 'trabalhando…') + '</span><span>' + Math.round(PIA.pct) + '%</span></div>' +
    '<div style="height:10px;background:var(--bg3);border-radius:6px;overflow:hidden;margin-top:8px">' +
      '<div style="height:100%;width:' + Math.round(PIA.pct) + '%;background:var(--green);transition:width .3s"></div></div>' +
    (ultimas.length ? '<div class="tt mono" style="margin-top:8px;line-height:1.6">' + ultimas.map(esc).join('<br>') + '</div>' : '') +
    '</div></div>';
}
function piaPintarBarra(){
  const alvo = document.getElementById('mid-body');
  if (!alvo || PIA.fase !== 'gerando') return;
  const antigo = alvo.querySelector('[data-pia-barra]');
  const novo = document.createElement('div');
  novo.innerHTML = piaBarraHTML();
  if (antigo) antigo.replaceWith(novo.firstChild);
}

async function piaGerar(){
  const d = piaApp();
  if (!d || !d.piaCriar) return;
  const cenas = PIA.cenas.filter(c => c.texto && c.texto.trim());
  if (!cenas.length){ toast('Escreva pelo menos uma cena.', 'aw'); return; }
  PIA.fase = 'gerando'; PIA.pct = 0; PIA.recado = 'começando'; PIA.registro = []; PIA.resultado = null;
  piaOuvir(); midiaRender();
  let r;
  try {
    r = await d.piaCriar({ titulo: PIA.titulo, cenas, narracao: PIA.narracaoGeral });
  } catch (e) { r = { ok:false, motivo:String((e && e.message) || e) }; }
  PIA.fase = r.ok ? 'pronto' : 'erro';
  PIA.resultado = r.ok ? r : null;
  if (!r.ok) PIA.recado = r.motivo || 'não consegui gerar o episódio';
  toast(r.ok ? 'Episódio pronto.' : 'Falhou: ' + PIA.recado, r.ok ? 'ag' : 'aw');
  midiaRender();
}
async function piaParar(){
  const d = piaApp();
  if (!d || !d.piaParar) return;
  await d.piaParar();
  toast('Pedido de parar enviado — o ComfyUI termina a cena atual e para.', 'aw');
}

function piaResultadoHTML(){
  const r = PIA.resultado;
  if (!r) return '';
  return '<div class="card" style="margin-top:14px;border-color:var(--green)">' +
    '<div class="hd" style="background:var(--green-bg)"><i class="ti ti-circle-check"></i>Episódio pronto' +
    '<span class="sp"></span>' +
    '<button class="btn sm gh" onclick="piaAbrirPasta()"><i class="ti ti-folder"></i>Abrir pasta</button></div><div class="bd">' +
    '<video src="' + estUrlArquivo(r.arquivo) + '" controls style="width:100%;max-height:420px;background:#000;border-radius:8px"></video>' +
    (r.semNarracao ? '<div class="al aw" style="margin-top:10px"><i class="ti ti-alert-triangle"></i><div>' +
      'Saiu sem narração — a geração de voz falhou nesta rodada (veja o motivo no registro acima).</div></div>' : '') +
    '</div></div>';
}
function piaAbrirPasta(){
  const d = piaApp();
  if (d && d.piaAbrirPasta && PIA.resultado) d.piaAbrirPasta(PIA.resultado.pasta);
}

/* =========================================================================
   CANAL DE CORTES — do link do YouTube até os cortes prontos para postar

   O que este arquivo faz, em ordem:

     1. lê o endereço de um vídeo do YouTube e guarda quem autorizou o corte;
     2. monta o PEDIDO que a fábrica (no seu computador) executa: baixar,
        analisar, cortar, virar vertical e queimar a legenda;
     3. escolhe os melhores momentos — e esta parte é a alma da coisa;
     4. lê o MANIFESTO que a fábrica devolve e monta a fila de postagem.

   Sobre a escolha dos momentos. Não é chute nem "IA mágica": são três
   sinais medidos, somados com peso.

     · A CURVA DE MAIS REVISTO. O próprio YouTube publica, por baixo do
       vídeo, um gráfico de quais trechos as pessoas voltam para ver. É o
       sinal mais honesto que existe, porque é comportamento de audiência
       de verdade, não opinião. Nem todo vídeo tem essa curva.
     · A ENERGIA DO ÁUDIO. Risada, grito, ênfase e virada de tom aparecem
       como pico de volume. Sozinho engana (barulho não é conteúdo), mas
       junto com os outros dois acerta muito.
     · AS FRASES DE GANCHO. Pergunta, número, promessa, contradição — o
       texto falado, tirado da legenda, diz onde tem gancho.

   O mesmo cálculo existe, letra por letra, dentro da fábrica em Python.
   Existe um teste que roda os dois em cima do mesmo material e exige o
   MESMO resultado. Se um dia alguém mexer só de um lado, o teste quebra.
   ========================================================================= */

/* ---------------------------------------------------------------- ganchos
   Palavras e expressões que, na fala, costumam marcar um momento que
   segura a atenção. Sem acento: o texto é comparado já sem acentuação.  */
const CORT_GANCHOS = [
  'olha isso','olha so','presta atencao','preste atencao','repara','repara nisso',
  'voce sabia','sabia que','ninguem','ninguem te conta','ninguem fala',
  'segredo','a verdade','na verdade','verdade e que','mentira',
  'nunca','sempre','jamais','pela primeira vez',
  'erro','errado','cuidado','atencao','perigo','cilada','armadilha',
  'incrivel','absurdo','impressionante','inacreditavel','surreal','chocante',
  'nao acredito','nao acreditei','me surpreendeu','surpreendente',
  'o problema','o pulo do gato','o detalhe','o segredo e',
  'dica','truque','macete','jeito certo','passo a passo',
  'de graca','gratis','barato','caro','desconto','promocao',
  'dinheiro','reais','real','custou','economizei','gastei','preco',
  'antes e depois','antes','depois','resultado','funciona','resolve',
  'melhor','pior','maior','menor','mais rapido','mais facil',
  'primeiro','segundo lugar','por ultimo','no final',
  'por que','porque','como fazer','como e que','o que acontece',
  'espera','calma','pera','olha','gente','serio','de verdade',
  'imagina','pensa','repete','de novo','outra vez'
];

/* pontuação de gancho de uma frase: 0 a 1 */
function cortSemAcento(t){
  return String(t == null ? '' : t).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function cortFalaPontos(texto){
  const t = cortSemAcento(texto);
  let n = 0;
  for (let i = 0; i < CORT_GANCHOS.length; i++) if (t.indexOf(CORT_GANCHOS[i]) >= 0) n += 1;
  const bruto = String(texto == null ? '' : texto);
  if (bruto.indexOf('?') >= 0) n += 2;
  if (bruto.indexOf('!') >= 0) n += 1;
  if (/[0-9]/.test(bruto)) n += 1;
  const p = n / 4;
  return p > 1 ? 1 : p;
}

/* ------------------------------------------------------- contas de apoio */
/* leva a série para a faixa 0..1. Série toda igual vira 0,5 — nem ajuda
   nem atrapalha, que é o comportamento honesto quando não há variação. */
function cortNormalizar(a){
  const v = Array.isArray(a) ? a : [];
  if (!v.length) return [];
  let lo = v[0], hi = v[0];
  for (let i = 1; i < v.length; i++){ if (v[i] < lo) lo = v[i]; if (v[i] > hi) hi = v[i]; }
  const faixa = hi - lo;
  if (faixa < 1e-9) return v.map(function(){ return 0.5; });
  return v.map(function(x){ return (x - lo) / faixa; });
}
/* média de um pedaço da série; fora da série conta como zero */
function cortMedia(serie, ini, dur){
  if (!serie || !serie.length || dur <= 0) return 0;
  let s = 0;
  for (let i = 0; i < dur; i++){
    const k = ini + i;
    s += (k >= 0 && k < serie.length) ? serie[k] : 0;
  }
  return s / dur;
}
/* transforma as falas legendadas numa série de um valor por segundo */
function cortSerieFala(falas, n){
  const s = new Array(n);
  for (let i = 0; i < n; i++) s[i] = 0;
  const lista = Array.isArray(falas) ? falas : [];
  for (let f = 0; f < lista.length; f++){
    const p = cortFalaPontos(lista[f].texto);
    let i = Math.floor(Number(lista[f].ini) || 0);
    let j = Math.ceil(Number(lista[f].fim) || 0);
    if (i < 0) i = 0;
    if (j <= i) j = i + 1;
    if (j > n) j = n;
    for (let k = i; k < j; k++) if (s[k] < p) s[k] = p;
  }
  return s;
}

/* ------------------------------------------------------------- a escolha */
const CORT_PADRAO = { quantos:5, dur:60, passo:2, folga:5, encaixe:4,
                      sinais:{ reprise:true, audio:true, fala:true } };

function cortOpcoes(o){
  const p = o || {};
  const s = p.sinais || {};
  return {
    quantos: Math.max(1, Math.round(Number(p.quantos) || CORT_PADRAO.quantos)),
    dur:     Math.max(5, Math.round(Number(p.dur)     || CORT_PADRAO.dur)),
    passo:   Math.max(1, Math.round(Number(p.passo)   || CORT_PADRAO.passo)),
    folga:   Math.max(0, Math.round(p.folga == null ? CORT_PADRAO.folga : Number(p.folga))),
    encaixe: Math.max(0, Math.round(p.encaixe == null ? CORT_PADRAO.encaixe : Number(p.encaixe))),
    sinais: { reprise: s.reprise !== false, audio: s.audio !== false, fala: s.fala !== false }
  };
}

/* nota de uma janela que começa em `ini` e dura `dur` segundos */
function cortNota(pre, ini, o){
  const temRep = o.sinais.reprise && pre.reprise.length > 0;
  const temEne = o.sinais.audio   && pre.energia.length > 0;
  const temFal = o.sinais.fala    && pre.fala.length    > 0;

  const abertura = Math.min(8, o.dur);
  const gancho   = Math.min(10, o.dur);

  const rep  = temRep ? cortMedia(pre.reprise, ini, o.dur) : 0;
  const abre = temRep ? cortMedia(pre.reprise, ini, abertura) : 0;
  const ene  = temEne ? cortMedia(pre.energia, ini, o.dur) : 0;
  const fal  = temFal ? (0.6 * cortMedia(pre.fala, ini, o.dur)
                       + 0.4 * cortMedia(pre.fala, ini, gancho)) : 0;

  /* pesos de fábrica; os que faltam saem da conta e os outros crescem
     proporcionalmente, para a nota continuar valendo de 0 a 100 */
  let pRep = temRep ? 40 : 0, pAbre = temRep ? 15 : 0;
  let pEne = temEne ? 20 : 0, pFal  = temFal ? 25 : 0;
  const soma = pRep + pAbre + pEne + pFal;
  if (soma <= 0) return { nota:0, rep:rep, abre:abre, ene:ene, fal:fal };
  const k = 100 / soma;

  return {
    nota: k * (pRep*rep + pAbre*abre + pEne*ene + pFal*fal),
    rep: rep, abre: abre, ene: ene, fal: fal
  };
}

/* por que este pedaço foi escolhido, em português de gente */
function cortMotivos(n){
  const m = [];
  if (n.rep  >= 0.66) m.push('é dos trechos mais revistos do vídeo');
  else if (n.rep >= 0.45) m.push('tem boa taxa de reprise');
  if (n.abre >= 0.6) m.push('já começa num pico de audiência');
  if (n.ene  >= 0.66) m.push('áudio marcante — riso, ênfase ou virada de tom');
  if (n.fal  >= 0.5) m.push('a fala tem gancho logo no começo');
  else if (n.fal >= 0.3) m.push('a fala traz pergunta ou número');
  if (!m.length) m.push('foi o melhor trecho que sobrou dentro do vídeo');
  return m;
}

/* encaixa o começo do corte no início de uma frase, para não cortar
   no meio de uma palavra. Só aceita mexer até `encaixe` segundos. */
function cortEncaixar(falas, ini, o){
  if (!o.encaixe || !Array.isArray(falas) || !falas.length) return ini;
  let melhor = ini, dist = o.encaixe + 1;
  for (let i = 0; i < falas.length; i++){
    const t = Math.floor(Number(falas[i].ini) || 0);
    const d = Math.abs(t - ini);
    if (d <= o.encaixe && d < dist){ dist = d; melhor = t; }
  }
  return melhor;
}

function cortBate(a, b, dur, folga){
  return (a < b + dur + folga) && (b < a + dur + folga);
}

/* ---- a função principal: dos sinais medidos para a lista de cortes ---- */
function cortEscolher(sinais, opcoes){
  const o = cortOpcoes(opcoes);
  const s = sinais || {};
  const total = Math.max(0, Math.floor(Number(s.duracao) || 0));
  const falas = Array.isArray(s.falas) ? s.falas : [];

  const pre = {
    reprise: cortNormalizar(s.reprise),
    energia: cortNormalizar(s.energia),
    fala:    cortSerieFala(falas, total)
  };

  if (total < o.dur) return [];

  /* todas as janelas possíveis, de `passo` em `passo` segundos */
  const cands = [];
  for (let ini = 0; ini + o.dur <= total; ini += o.passo){
    const n = cortNota(pre, ini, o);
    cands.push({ ini: ini, nota: n.nota, det: n });
  }
  cands.sort(function(a, b){
    if (b.nota !== a.nota) return b.nota - a.nota;
    return a.ini - b.ini;
  });

  const pegos = [];
  for (let i = 0; i < cands.length && pegos.length < o.quantos; i++){
    const c = cands[i];
    let choca = false;
    for (let j = 0; j < pegos.length; j++)
      if (cortBate(c.ini, pegos[j].ini, o.dur, o.folga)){ choca = true; break; }
    if (choca) continue;

    /* tenta encaixar no começo de uma frase, sem criar sobreposição */
    let ini = cortEncaixar(falas, c.ini, o);
    if (ini + o.dur > total) ini = total - o.dur;
    if (ini < 0) ini = 0;
    if (ini !== c.ini){
      let ruim = false;
      for (let j = 0; j < pegos.length; j++)
        if (cortBate(ini, pegos[j].ini, o.dur, o.folga)){ ruim = true; break; }
      if (ruim) ini = c.ini;
    }
    pegos.push({ ini: ini, fim: ini + o.dur, dur: o.dur, nota: c.nota, det: c.det });
  }

  pegos.sort(function(a, b){ return a.ini - b.ini; });
  return pegos.map(function(p, i){
    return {
      n: i + 1, ini: p.ini, fim: p.fim, dur: p.dur,
      nota: Math.round(p.nota * 10) / 10,
      motivos: cortMotivos(p.det),
      fala: cortFalaDoTrecho(falas, p.ini, p.fim)
    };
  });
}

/* o texto falado dentro do trecho, para você conferir sem abrir o vídeo */
function cortFalaDoTrecho(falas, ini, fim){
  const partes = [];
  const lista = Array.isArray(falas) ? falas : [];
  for (let i = 0; i < lista.length; i++){
    const a = Number(lista[i].ini) || 0, b = Number(lista[i].fim) || 0;
    if (b > ini && a < fim && lista[i].texto) partes.push(String(lista[i].texto).trim());
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------ endereço do vídeo */
function cortYtId(url){
  const u = String(url == null ? '' : url).trim();
  if (!u) return '';
  /* o próprio código, digitado sozinho */
  if (/^[\w-]{11}$/.test(u)) return u;
  const padroes = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
    /\/live\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/v\/([\w-]{11})/
  ];
  for (let i = 0; i < padroes.length; i++){
    const m = u.match(padroes[i]);
    if (m) return m[1];
  }
  return '';
}
function cortSegundoInicial(url){
  const m = String(url == null ? '' : url).match(/[?&]t=(\d+)/);
  return m ? Number(m[1]) : 0;
}

/* ------------------------------------------------------------- o pedido
   É este arquivo que a fábrica lê. Vai junto quem autorizou o corte —
   não por burocracia: se a plataforma reclamar, a prova está guardada. */
function cortPedido(dados){
  const d = dados || {};
  const id = cortYtId(d.url);
  if (!id) return { erro:'Não reconheci esse endereço como um vídeo do YouTube.' };
  const aut = d.autorizacao || {};
  if (!String(aut.quem || '').trim())
    return { erro:'Diga quem autorizou o corte deste vídeo antes de continuar.' };

  const o = cortOpcoes(d);
  return {
    tipo: 'cortes',
    versao: 1,
    video: 'https://www.youtube.com/watch?v=' + id,
    videoId: id,
    canalId: d.canalId == null ? null : Number(d.canalId),
    quantos: o.quantos,
    duracao: o.dur,
    formato: d.formato || '9:16',
    legenda: d.legendaQueimada !== false,
    sinais: o.sinais,
    autorizacao: {
      quem: String(aut.quem).trim(),
      quando: aut.quando || (typeof hoje === 'function' ? hoje() : ''),
      prova: String(aut.prova || '').trim()
    },
    pedidoEm: new Date().toISOString()
  };
}

/* ---------------------------------------------------- ler o que a fábrica devolveu */
function cortLerManifesto(txt){
  let m;
  try { m = (typeof txt === 'string') ? JSON.parse(txt) : txt; }
  catch (e) { return { erro:'Esse arquivo não é um manifesto válido da fábrica.' }; }
  if (!m || m.tipo !== 'cortes' || !Array.isArray(m.cortes))
    return { erro:'Esse arquivo não parece ser o manifesto de cortes.' };
  const pasta = String(m.pasta || '');
  const sep = pasta.indexOf('\\') >= 0 ? '\\' : '/';
  return {
    videoId: m.videoId || '',
    titulo: m.titulo || 'Vídeo sem título',
    canal: m.canal || '',
    canalId: m.canalId == null ? null : Number(m.canalId),
    pasta: pasta,
    autorizacao: m.autorizacao || null,
    cortes: m.cortes.map(function(c, i){
      return {
        n: i + 1,
        arquivo: c.arquivo || '',
        caminho: pasta ? (pasta.replace(/[\\/]+$/, '') + sep + (c.arquivo || '')) : '',
        ini: Number(c.ini) || 0,
        fim: Number(c.fim) || 0,
        dur: Number(c.dur) || (Number(c.fim) - Number(c.ini)) || 0,
        nota: Number(c.nota) || 0,
        motivos: Array.isArray(c.motivos) ? c.motivos : [],
        fala: c.fala || '',
        titulo: c.titulo || '',
        marcado: true
      };
    })
  };
}

/* ------------------------------------------------- título e legenda do corte */
function cortTitulo(fala, videoTitulo){
  const f = String(fala || '').trim();
  if (f){
    const frases = f.split(/(?<=[.!?])\s+/);
    for (let i = 0; i < frases.length; i++){
      const x = frases[i].trim();
      if (x.length >= 20 && x.length <= 90) return x;
    }
    if (f.length > 12) return f.slice(0, 80).replace(/\s+\S*$/, '') + '…';
  }
  return String(videoTitulo || 'Corte');
}
function cortLegenda(corte, ctx){
  const c = ctx || {};
  const linhas = [];
  linhas.push(cortTitulo(corte.fala, c.titulo));
  linhas.push('');
  if (c.creditoDe) linhas.push('Corte do vídeo de ' + c.creditoDe + ', publicado com autorização.');
  if (c.videoId) linhas.push('Vídeo completo: https://youtu.be/' + c.videoId);
  if (c.hashtags && c.hashtags.length) { linhas.push(''); linhas.push(c.hashtags.join(' ')); }
  return linhas.join('\n').trim();
}
function cortTempo(s){
  const t = Math.max(0, Math.floor(Number(s) || 0));
  const m = Math.floor(t / 60), r = t % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

/* =========================================================================
   A TELA
   ========================================================================= */
const CORT = {
  canalId: null, url: '', quem: '', quando: '', prova: '',
  quantos: 5, dur: 60, sinais: { reprise:true, audio:true, fala:true },
  manifesto: null, fila: null, andando: false, erro: ''
};

async function midTabCortes(){
  const body = document.getElementById('mid-body');
  const canais = await dbGetAll('canais');
  const decortes = canais.filter(function(c){ return c.finalidade === 'cortes'; });
  const guardados = (await dbGetAll('cortes')).sort(function(a,b){ return Number(b.id) - Number(a.id); });

  if (!decortes.length){
    body.innerHTML = '<div class="empty"><i class="ti ti-scissors"></i><b>Nenhum canal de cortes ainda</b>' +
      '<p>Um canal de cortes é o que pega um vídeo longo e vira vários vídeos de um minuto. ' +
      'Marque um canal como <b>Cortes</b> no cadastro — ou crie um novo — e ele aparece aqui.</p>' +
      '<button class="btn gn" onclick="canalForm()"><i class="ti ti-plus"></i>Criar canal de cortes</button></div>';
    return;
  }
  if (!CORT.canalId || !decortes.some(function(c){ return Number(c.id) === Number(CORT.canalId); }))
    CORT.canalId = Number(decortes[0].id);
  if (!CORT.quando && typeof hoje === 'function') CORT.quando = hoje();

  let h = '<div class="al ai"><i class="ti ti-scissors"></i><div>' +
    'Cole o endereço do vídeo longo. O sistema monta o <b>pedido</b>, a fábrica baixa o vídeo no seu ' +
    'computador, mede onde a audiência mais volta, onde o áudio dispara e onde a fala tem gancho — ' +
    'e devolve os cortes já em pé, legendados e prontos para subir.</div></div>';

  h += '<div class="card"><div class="hd"><i class="ti ti-scissors"></i>Novo pedido de cortes</div><div class="bd">' +
    '<div class="fr3">' +
      '<div class="fg" style="grid-column:span 2"><label>Endereço do vídeo no YouTube <span class="rq">*</span></label>' +
        '<input id="ct-url" value="' + esc(CORT.url) + '" oninput="cortCampo(\'url\', this.value)" ' +
        'placeholder="https://www.youtube.com/watch?v=…"></div>' +
      '<div class="fg"><label>Canal onde vai ser postado</label><select onchange="cortCampo(\'canalId\', Number(this.value))">' +
        decortes.map(function(c){
          return '<option value="' + c.id + '"' + (Number(CORT.canalId) === Number(c.id) ? ' selected' : '') + '>' +
                 esc(c.nome) + ' · ' + esc(c.plataforma) + '</option>'; }).join('') +
      '</select></div></div>';

  const id = cortYtId(CORT.url);
  h += '<div class="tt" style="margin:-4px 0 12px">' +
    (CORT.url ? (id ? 'Vídeo reconhecido: <span class="mono">' + esc(id) + '</span>'
                    : '<span style="color:var(--red)">Não reconheci esse endereço como um vídeo do YouTube.</span>')
              : 'Serve o endereço normal, o encurtado (youtu.be) ou o de Shorts.') + '</div>';

  h += '<div class="sh"><i class="ti ti-license"></i>Autorização de quem fez o vídeo</div>' +
    '<div class="al aw" style="margin-bottom:10px"><i class="ti ti-alert-triangle"></i><div>' +
    'Você me disse que vai cortar vídeo de terceiros <b>com permissão</b>. Então eu guardo a permissão junto ' +
    'com o corte. Se a plataforma reclamar depois, a prova está aqui — e não na sua memória.</div></div>' +
    '<div class="fr3">' +
      '<div class="fg"><label>Quem autorizou <span class="rq">*</span></label>' +
        '<input id="ct-quem" value="' + esc(CORT.quem) + '" oninput="cortCampo(\'quem\', this.value)" ' +
        'placeholder="Nome da pessoa ou do canal"></div>' +
      '<div class="fg"><label>Quando autorizou</label>' +
        '<input id="ct-quando" type="date" value="' + esc(CORT.quando) + '" oninput="cortCampo(\'quando\', this.value)"></div>' +
      '<div class="fg"><label>Onde está a prova</label>' +
        '<input id="ct-prova" value="' + esc(CORT.prova) + '" oninput="cortCampo(\'prova\', this.value)" ' +
        'placeholder="Print do WhatsApp, e-mail, contrato…"></div></div>';

  h += '<div class="sh"><i class="ti ti-adjustments"></i>Como cortar</div>' +
    '<div class="fr3">' +
      '<div class="fg"><label>Quantos cortes</label><input type="number" min="1" max="20" value="' + CORT.quantos +
        '" onchange="cortCampo(\'quantos\', Number(this.value))"></div>' +
      '<div class="fg"><label>Duração de cada um (segundos)</label><input type="number" min="15" max="180" value="' + CORT.dur +
        '" onchange="cortCampo(\'dur\', Number(this.value))">' +
        '<div class="hint">Acima de 60 para o TikTok pagar.</div></div>' +
      '<div class="fg"><label>&nbsp;</label><button class="btn gn blk" onclick="cortBaixarPedido()">' +
        '<i class="ti ti-download"></i>Gerar o pedido</button></div></div>' +

    '<div class="sh"><i class="ti ti-wave-sine"></i>Sinais que decidem o corte</div>' +
    '<div class="chips">' +
      cortChip('reprise', 'ti-chart-area', 'Curva de mais revisto') +
      cortChip('audio',   'ti-volume',     'Picos de áudio') +
      cortChip('fala',    'ti-message',    'Frases de gancho') +
    '</div>' +
    (CORT.erro ? '<div class="al ae" style="margin-top:11px"><i class="ti ti-alert-circle"></i><div>' + esc(CORT.erro) + '</div></div>' : '') +
  '</div></div>';

  h += '<div class="card tw"><div class="hd"><i class="ti ti-cpu"></i>O caminho do pedido até os cortes prontos</div><div class="bd">' +
    '<div class="al ai"><i class="ti ti-list-numbers"></i><div>' +
      '<b>1.</b> Clique em <b>Gerar o pedido</b> — baixa um arquivo pequeno.<br>' +
      '<b>2.</b> Jogue esse arquivo na pasta <span class="mono">pedidos</span> da fábrica.<br>' +
      '<b>3.</b> Dois cliques em <span class="mono">FAZER-CORTES.bat</span>. Ele baixa o vídeo, mede tudo e corta.<br>' +
      '<b>4.</b> Volte aqui e clique em <b>Trazer os cortes</b>, escolhendo o <span class="mono">manifesto.json</span> ' +
      'que apareceu na pasta <span class="mono">saida</span>.</div></div>' +
    '<div class="brow" style="margin-top:11px">' +
      '<label class="btn bl" style="cursor:pointer"><i class="ti ti-upload"></i>Trazer os cortes' +
      '<input type="file" accept="application/json,.json" style="display:none" onchange="cortImportar(this)"></label></div>' +
  '</div></div>';

  if (CORT.manifesto) h += cortManifestoHTML(CORT.manifesto);

  if (guardados.length){
    h += '<div class="card tw"><div class="hd"><i class="ti ti-history"></i>Cortes já trazidos</div><div class="bd"><table>' +
      '<thead><tr><th>Vídeo</th><th class="c">Cortes</th><th class="c">Autorizado por</th><th class="c">Quando</th><th class="c no-print"></th></tr></thead><tbody>' +
      guardados.slice(0, 20).map(function(g){
        return '<tr><td><b>' + esc(g.titulo || '—') + '</b></td>' +
          '<td class="c n">' + ((g.cortes || []).length) + '</td>' +
          '<td class="c tt">' + esc((g.autorizacao && g.autorizacao.quem) || '—') + '</td>' +
          '<td class="c tt">' + esc(String(g.criadoEm || '').slice(0, 10).split('-').reverse().join('/')) + '</td>' +
          '<td class="c no-print nowrap">' +
            '<button class="ib bl" title="Abrir" onclick="cortAbrirGuardado(' + g.id + ')"><i class="ti ti-eye"></i></button>' +
            '<button class="ib rd" title="Excluir" onclick="cortDel(' + g.id + ')"><i class="ti ti-trash"></i></button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  body.innerHTML = h;
}

function cortChip(k, ic, nome){
  return '<span class="chip ' + (CORT.sinais[k] ? 'on' : '') + '" onclick="cortSinal(\'' + k + '\')">' +
         '<i class="ti ' + ic + '"></i> ' + nome + '</span>';
}
function cortCampo(k, v){
  CORT[k] = v; CORT.erro = '';
  if (k === 'url' || k === 'quem' || k === 'quando' || k === 'prova') return;  /* não redesenha ao digitar */
  midiaRender();
}
function cortSinal(k){
  const ligados = Object.keys(CORT.sinais).filter(function(x){ return CORT.sinais[x]; });
  if (CORT.sinais[k] && ligados.length === 1){ toast('Deixe pelo menos um sinal ligado.', 'aw'); return; }
  CORT.sinais[k] = !CORT.sinais[k];
  midiaRender();
}

function cortBaixarPedido(){
  const p = cortPedido({
    url: CORT.url, canalId: CORT.canalId, quantos: CORT.quantos, dur: CORT.dur,
    sinais: CORT.sinais,
    autorizacao: { quem: CORT.quem, quando: CORT.quando, prova: CORT.prova }
  });
  if (p.erro){ CORT.erro = p.erro; midiaRender(); return; }
  CORT.erro = '';
  baixarArquivo(JSON.stringify(p, null, 1), 'pedido-cortes-' + p.videoId + '.json', 'application/json');
  toast('Pedido baixado. Coloque na pasta "pedidos" da fábrica e rode o FAZER-CORTES.', 'ag');
}

function cortImportar(input){
  const f = input && input.files && input.files[0];
  if (!f) return;
  const leitor = new FileReader();
  leitor.onload = async function(){
    const m = cortLerManifesto(String(leitor.result));
    if (m.erro){ toast(m.erro, 'aw'); return; }
    if (m.canalId) CORT.canalId = m.canalId;
    CORT.manifesto = m;
    await dbAdd('cortes', { titulo:m.titulo, videoId:m.videoId, canalId:m.canalId, pasta:m.pasta,
                            autorizacao:m.autorizacao, cortes:m.cortes, criadoEm:new Date().toISOString() });
    toast(m.cortes.length + ' corte(s) trazido(s).', 'ag');
    midiaRender();
  };
  leitor.readAsText(f);
  input.value = '';
}

async function cortAbrirGuardado(id){
  const g = await dbGet('cortes', id);
  if (!g) return;
  CORT.manifesto = { titulo:g.titulo, videoId:g.videoId, canalId:g.canalId, pasta:g.pasta,
                     autorizacao:g.autorizacao, canal:g.canal || '',
                     cortes:(g.cortes || []).map(function(c){ return Object.assign({}, c, { marcado:true }); }) };
  if (g.canalId) CORT.canalId = Number(g.canalId);
  midiaRender();
}
function cortDel(id){
  confirmar('Excluir os cortes', 'Sai da lista daqui. Os arquivos de vídeo na pasta da fábrica continuam lá.',
    async function(){ await dbDel('cortes', id); toast('Removido.', 'aw'); CORT.manifesto = null; midiaRender(); });
}

function cortMarcar(n){
  if (!CORT.manifesto) return;
  const c = CORT.manifesto.cortes.find(function(x){ return Number(x.n) === Number(n); });
  if (c) c.marcado = !c.marcado;
  midiaRender();
}

function cortManifestoHTML(m){
  const marcados = m.cortes.filter(function(c){ return c.marcado; });
  let h = '<div class="card" style="border-color:var(--green)">' +
    '<div class="hd" style="background:var(--green-bg)"><i class="ti ti-scissors"></i>' + esc(m.titulo) +
      '<span class="sp"></span>' +
      '<button class="btn sm gh" onclick="cortMarcarTodos(true)">Marcar todos</button>' +
      '<button class="btn sm gh" onclick="cortMarcarTodos(false)">Desmarcar</button>' +
      '<button class="btn sm gn" onclick="cortAbrirFila()"><i class="ti ti-send"></i>Postar os ' + marcados.length + ' marcados</button>' +
    '</div><div class="bd">';

  if (m.autorizacao && m.autorizacao.quem)
    h += '<div class="al ag"><i class="ti ti-license"></i><div>Autorizado por <b>' + esc(m.autorizacao.quem) + '</b>' +
      (m.autorizacao.quando ? ' em ' + esc(String(m.autorizacao.quando).split('-').reverse().join('/')) : '') +
      (m.autorizacao.prova ? ' · prova: ' + esc(m.autorizacao.prova) : '') + '.</div></div>';

  h += '<table><thead><tr><th class="c">Usar</th><th class="c">#</th><th class="c">Trecho</th>' +
    '<th class="c">Nota</th><th>Por que este pedaço</th><th>O que se fala nele</th></tr></thead><tbody>';
  m.cortes.forEach(function(c){
    h += '<tr style="' + (c.marcado ? '' : 'opacity:.45') + '">' +
      '<td class="c"><input type="checkbox" ' + (c.marcado ? 'checked' : '') +
        ' onchange="cortMarcar(' + c.n + ')" style="width:16px;height:16px;cursor:pointer"></td>' +
      '<td class="c n"><b>' + c.n + '</b></td>' +
      '<td class="c mono nowrap">' + cortTempo(c.ini) + ' → ' + cortTempo(c.fim) + '<div class="tt">' + Math.round(c.dur) + 's</div></td>' +
      '<td class="c n"><b>' + qtd(c.nota, 1) + '</b></td>' +
      '<td class="tt">' + esc((c.motivos || []).join(' · ')) + '</td>' +
      '<td style="font-size:12.5px">' + esc(String(c.fala || '').slice(0, 180)) + (String(c.fala || '').length > 180 ? '…' : '') + '</td></tr>';
  });
  h += '</tbody></table>' +
    '<div class="tt" style="margin-top:9px">A nota vai de 0 a 100 e só serve para comparar os trechos ' +
    '<b>deste</b> vídeo entre si. Não é previsão de views.</div>' +
    '</div></div>';
  return h;
}
function cortMarcarTodos(v){
  if (!CORT.manifesto) return;
  CORT.manifesto.cortes.forEach(function(c){ c.marcado = !!v; });
  midiaRender();
}

/* =========================================================================
   A FILA — postar todos os cortes, um atrás do outro
   ========================================================================= */
async function cortAbrirFila(){
  const m = CORT.manifesto;
  if (!m){ toast('Traga os cortes primeiro.', 'aw'); return; }
  const marcados = m.cortes.filter(function(c){ return c.marcado; });
  if (!marcados.length){ toast('Marque pelo menos um corte.', 'aw'); return; }
  const c = await dbGet('canais', CORT.canalId);
  if (!c){ toast('Escolha o canal onde os cortes vão ser postados.', 'aw'); return; }

  const ctx = { titulo:m.titulo, videoId:m.videoId,
                creditoDe: (m.autorizacao && m.autorizacao.quem) || m.canal || '',
                hashtags: cortHashtags(c) };
  CORT.fila = {
    canalId: c.id,
    itens: marcados.map(function(x, i){
      return { n:i + 1, corte:x, titulo:cortTitulo(x.fala, m.titulo),
               legenda:cortLegenda(x, ctx), feito:false, recado:'' };
    }),
    atual: 0
  };
  await cortFilaRender();
}

function cortHashtags(canal){
  const base = ['#cortes', '#shorts', '#viral'];
  const nicho = String((canal && canal.nicho) || '').split(/[,;/]/)
    .map(function(x){ return x.trim(); }).filter(Boolean)
    .map(function(x){ return '#' + cortSemAcento(x).replace(/[^a-z0-9]+/g, ''); })
    .filter(function(x){ return x.length > 3; });
  return nicho.concat(base).slice(0, 5);
}

async function cortFilaRender(){
  const f = CORT.fila;
  if (!f) return;
  const c = await dbGet('canais', f.canalId);
  const d = postDestino(c);
  const noApp = (typeof APP === 'function') && !!APP();
  const feitos = f.itens.filter(function(x){ return x.feito; }).length;
  const atual = f.itens[f.atual];

  let b = '<div class="al ' + (d.url ? 'ai' : 'ae') + '" style="margin-top:0"><i class="ti ti-target-arrow"></i><div>' +
    (d.url ? 'Cada corte abre em <b>' + esc(c.nome) + '</b> — ' + esc(d.como) + '.'
           : 'Este canal ainda não tem endereço cadastrado.') + '</div></div>';

  b += '<div class="al ' + (noApp ? 'ag' : 'aw') + '"><i class="ti ti-' + (noApp ? 'wand' : 'info-circle') + '"></i><div>' +
    (noApp
      ? 'No aplicativo, cada corte abre <b>com o vídeo anexado e a legenda escrita</b>. ' +
        'O clique em publicar continua sendo seu — de propósito: é a sua última chance de olhar antes de ir para o mundo.'
      : 'Pelo navegador eu abro a página certa e copio a legenda de cada corte. Para anexar o arquivo sozinho, ' +
        'é preciso o <b>aplicativo do Windows</b>.') + '</div></div>';

  b += '<div class="card tw" style="margin-bottom:12px"><div class="bd">' +
    '<div class="row" style="display:flex;justify-content:space-between;font-size:13px">' +
    '<span>Progresso</span><b>' + feitos + ' de ' + f.itens.length + '</b></div>' +
    '<div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden;margin-top:7px">' +
    '<div style="height:100%;width:' + (f.itens.length ? Math.round(feitos / f.itens.length * 100) : 0) + '%;background:var(--green)"></div>' +
    '</div></div></div>';

  b += '<table><thead><tr><th class="c">#</th><th class="c">Trecho</th><th>Título</th><th class="c">Situação</th></tr></thead><tbody>';
  f.itens.forEach(function(x, i){
    b += '<tr style="' + (i === f.atual ? 'background:var(--green-bg)' : '') + '">' +
      '<td class="c n"><b>' + x.n + '</b></td>' +
      '<td class="c mono nowrap">' + cortTempo(x.corte.ini) + '</td>' +
      '<td style="font-size:12.5px">' + esc(x.titulo) + '</td>' +
      '<td class="c">' + (x.feito ? '<span class="st s-ok">aberto</span>'
                                  : (i === f.atual ? '<span class="st s-wn">o próximo</span>' : '<span class="st s-nt">na fila</span>')) +
      (x.recado ? '<div class="tt">' + esc(x.recado) + '</div>' : '') + '</td></tr>';
  });
  b += '</tbody></table>';

  if (atual){
    b += '<div class="sh"><i class="ti ti-pencil"></i>Legenda do corte ' + atual.n + '</div>' +
      '<textarea rows="6" style="width:100%;box-sizing:border-box;font-size:12.5px" ' +
      'oninput="cortFilaLegenda(this.value)">' + esc(atual.legenda) + '</textarea>' +
      (atual.corte.caminho ? '<div class="tt mono" style="margin-top:5px;word-break:break-all">' + esc(atual.corte.caminho) + '</div>' : '');
  }

  modal('Postar os cortes — ' + c.nome, 'ti-send', b,
    '<button class="btn gh" onclick="closeModal(\'mk-form\')">Fechar</button>' +
    (atual
      ? '<button class="btn bl" onclick="cortFilaPular()">Pular este</button>' +
        '<button class="btn gn" onclick="cortFilaSeguir()"><i class="ti ti-' + (noApp ? 'wand' : 'external-link') + '"></i>' +
        (noApp ? 'Abrir o corte ' + atual.n + ' já preenchido' : 'Abrir o corte ' + atual.n) + '</button>'
      : '<span class="tt">Todos os cortes já foram abertos.</span>'), 'lg');
}

function cortFilaLegenda(v){
  const f = CORT.fila; if (!f) return;
  const x = f.itens[f.atual]; if (x) x.legenda = v;
}
function cortFilaPular(){
  const f = CORT.fila; if (!f) return;
  f.atual = Math.min(f.itens.length, f.atual + 1);
  cortFilaRender();
}

/* abre o corte da vez; no aplicativo, já com o arquivo anexado */
async function cortFilaSeguir(){
  const f = CORT.fila; if (!f) return;
  const x = f.itens[f.atual]; if (!x) return;
  const c = await dbGet('canais', f.canalId);
  const d = postDestino(c);
  if (!d.url){ toast('Cadastre o endereço do canal.', 'aw'); canalForm(f.canalId); return; }

  const app = (typeof APP === 'function') ? APP() : null;
  if (app && app.pubPublicar && x.corte.caminho && d.plat.pid){
    let r;
    try{
      r = await app.pubPublicar({ plataforma:d.plat.pid, url:d.url, video:x.corte.caminho,
                                  titulo:x.titulo, legenda:x.legenda });
    }catch(e){ r = { ok:false, motivo:String((e && e.message) || e) }; }
    if (r && r.ok && r.anexou && r.escreveu) x.recado = 'anexado e escrito';
    else if (r && r.ok) x.recado = 'abriu, mas ' + ((r.avisos || []).join(' · ') || 'faltou algo');
    else x.recado = 'não abriu: ' + ((r && r.motivo) || 'motivo desconhecido');
  } else {
    abrirFora(d.url);
    try { await navigator.clipboard.writeText(x.legenda); x.recado = 'página aberta, legenda copiada'; }
    catch (e) { x.recado = 'página aberta'; }
  }
  x.feito = true;
  f.atual = Math.min(f.itens.length, f.atual + 1);
  await cortFilaRender();
}

/* =========================================================================
   46_visual.js — os visuais de número, desenhados por código.

   A REGRA QUE VALE DINHEIRO
   Vídeo gerado por IA custa 20 créditos a cada 10 segundos — um vídeo de
   10 minutos passa de 1.200 créditos. Visual de finanças e de obra não é
   filmagem: é dado desenhado. Tabela, gráfico, contador, escada e régua
   saem de uma página HTML por custo ZERO. Crédito só se gasta na narração.

   E não é só o preço: vídeo de IA é o perfil que o YouTube passou a remover
   em janeiro de 2026 como conteúdo inautêntico.

   COMO A PÁGINA FUNCIONA
   Ela NUNCA anima pelo relógio. Expõe window.TOTAL_FRAMES e window.setFrame(f),
   e quem manda no tempo é o renderizador. Animação por relógio perde quadro
   quando a máquina engasga, e o áudio descola.

   Tudo aqui é texto: visualHTML() devolve a página pronta. Quem grava o
   arquivo e fotografa é o aplicativo (desktop/quadros.js).
   ========================================================================= */

/* A identidade não muda de vídeo para vídeo. Template que varia a cada peça
   é uma das assinaturas que o YouTube usa para achar fazenda de conteúdo —
   mas o contrário também vale: cor trocada a cada peça destrói a marca. */
const VIS_CORES = {
  fundo:     '#0f1318',
  superficie:'#171c23',
  linha:     '#2a313a',
  texto:     '#e7ebef',
  secundario:'#a3adb8',
  destaque:  '#8ab4e0',
  resultado: '#6cbd96',
  subtracao: '#e69080',
  chave:     '#d9a951',
};

/* Fonte externa é bloqueada no ambiente de render: só as que existem na
   máquina. DejaVu vem com o Python portátil e com quase todo Linux; as
   outras são a escada de reserva no Windows. */
const VIS_FONTE = "'DejaVu Sans', 'Segoe UI', Arial, sans-serif";
const VIS_MONO  = "'DejaVu Sans Mono', 'Consolas', 'Courier New', monospace";

const VIS_FPS = 30;

/* ---------------------------------------------------------- utilidades --- */

function visEsc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function visNum(v, casas){
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', {minimumFractionDigits: casas==null?2:casas,
                                    maximumFractionDigits: casas==null?2:casas});
}

/* quantos quadros um trecho de N segundos ocupa */
function visQuadros(segundos, fps){
  return Math.max(1, Math.round((Number(segundos)||0) * (Number(fps)||VIS_FPS)));
}

/* A animação serve ao raciocínio, não ao enfeite: o número sobe rápido e
   desacelera, como quem chega a uma conclusão. */
function visEaseOut(t){
  const x = Math.min(1, Math.max(0, Number(t)||0));
  return 1 - Math.pow(1 - x, 3);
}

/* ------------------------------------------------------------ o esqueleto */

/* O CSS e as funções que TODA página de visual carrega. Sai como texto para
   dentro do <head>, porque a página tem de ser um arquivo só — o
   renderizador abre por file:// e nada externo carrega. */
function visBaseCSS(){
  const c = VIS_CORES;
  return `
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:1920px;height:1080px;overflow:hidden}
    body{background:${c.fundo};color:${c.texto};font-family:${VIS_FONTE};
         font-size:28px;line-height:1.4;-webkit-font-smoothing:antialiased}
    .palco{position:relative;width:1920px;height:1080px;padding:84px 104px;display:flex;
           flex-direction:column}
    .rot{font-family:${VIS_MONO};font-size:22px;letter-spacing:.22em;text-transform:uppercase;
         color:${c.secundario};font-weight:700}
    h1{font-size:64px;line-height:1.1;font-weight:700;letter-spacing:-.02em;margin-top:18px;
       max-width:1500px}
    .n{font-family:${VIS_MONO};font-variant-numeric:tabular-nums;font-weight:700}
    .neg{color:${c.subtracao}}
    .pos{color:${c.resultado}}
    .chave{color:${c.chave}}
    .dest{color:${c.destaque}}
    /* a premissa fica sempre visível: número sem premissa é número sem fonte */
    .premissa{position:absolute;left:104px;bottom:52px;font-family:${VIS_MONO};font-size:19px;
              color:${c.secundario};letter-spacing:.04em;max-width:1500px}
    .fonte{position:absolute;right:104px;bottom:52px;font-family:${VIS_MONO};font-size:19px;
           color:${c.secundario};letter-spacing:.04em;text-align:right;max-width:900px}
    .linha{height:1px;background:${c.linha};width:100%}
  `;
}

/* monta o arquivo inteiro */
function visPagina(css, corpo, script, total){
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>${visBaseCSS()}${css||''}</style></head>
<body><div class="palco" id="palco">${corpo||''}</div>
<script>
window.TOTAL_FRAMES = ${Number(total)||1};
function easeOut(t){var x=Math.min(1,Math.max(0,t));return 1-Math.pow(1-x,3);}
function nbr(v,c){c=(c==null?2:c);return Number(v||0).toLocaleString('pt-BR',
  {minimumFractionDigits:c,maximumFractionDigits:c});}
/* faixa: devolve 0..1 do trecho que começa em "ini" e dura "dur" quadros */
function faixa(f,ini,dur){ if(dur<=0) return f>=ini?1:0;
  return Math.min(1,Math.max(0,(f-ini)/dur)); }
${script||''}
if(typeof window.setFrame!=='function'){ window.setFrame=function(){}; }
window.setFrame(0);
<\/script></body></html>`;
}

/* ============================================================ os visuais ==
   Cada um recebe uma ficha e devolve {html, segundos, quadros}.
   As cinco formas cobrem o que um número precisa mostrar:
     contador  — uma manchete virando reais no bolso de alguém
     escada    — degraus comparáveis, com uma régua atravessando
     tabela    — camadas que se subtraem até o resultado
     barras    — quanto cada opção custa, lado a lado
     regua     — um valor caindo dentro ou fora de um limite
   ========================================================================= */

/* ---- contador: o número sobe e desacelera, com as etapas embaixo ------- */
function visContador(f){
  const fps = Number(f.fps)||VIS_FPS;
  const seg = Number(f.segundos)||6;
  const total = visQuadros(seg, fps);
  const etapas = Array.isArray(f.etapas) ? f.etapas : [];
  const entrada = Math.round(total*0.45);   /* o número leva 45% do tempo subindo */

  const corpo = `
    <div class="rot">${visEsc(f.rotulo||'')}</div>
    <h1>${visEsc(f.titulo||'')}</h1>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div class="n" id="vl" style="font-size:190px;letter-spacing:-.03em"></div>
      <div id="sub" style="font-size:34px;color:${VIS_CORES.secundario};margin-top:10px">${visEsc(f.legenda||'')}</div>
      <div id="etapas" style="margin-top:56px;display:flex;gap:64px">
        ${etapas.map((e,i)=>`<div class="et" data-i="${i}" style="opacity:0">
          <div class="rot" style="font-size:19px">${visEsc(e.rotulo||'')}</div>
          <div class="n ${e.cor||'chave'}" style="font-size:52px;margin-top:8px">${visEsc(e.valor||'')}</div>
        </div>`).join('')}
      </div>
    </div>
    ${f.premissa?`<div class="premissa">${visEsc(f.premissa)}</div>`:''}
    ${f.fonte?`<div class="fonte">${visEsc(f.fonte)}</div>`:''}`;

  const script = `
    var ALVO=${Number(f.valor)||0}, CASAS=${f.casas==null?2:Number(f.casas)};
    var PRE=${JSON.stringify(f.prefixo||'')}, POS=${JSON.stringify(f.sufixo||'')};
    var ENTRADA=${entrada}, TOTAL=${total}, NET=${etapas.length};
    window.setFrame=function(fr){
      var t=easeOut(faixa(fr,0,ENTRADA));
      document.getElementById('vl').textContent = PRE + nbr(ALVO*t,CASAS) + POS;
      /* as etapas entram escalonadas DEPOIS que o número fecha: primeiro o
         resultado, depois a conta que levou até ele */
      for(var i=0;i<NET;i++){
        var ini=ENTRADA+Math.round((TOTAL-ENTRADA)*0.12*(i+1));
        var o=faixa(fr,ini,Math.round(TOTAL*0.10));
        var el=document.querySelector('.et[data-i="'+i+'"]');
        if(el){ el.style.opacity=o; el.style.transform='translateY('+((1-o)*14).toFixed(1)+'px)'; }
      }
    };`;

  return {html: visPagina('', corpo, script, total), segundos: seg, quadros: total, forma:'contador'};
}

/* ---- escada: degraus em ordem, com uma linha de limite atravessando ---- */
function visEscada(f){
  const fps = Number(f.fps)||VIS_FPS;
  const seg = Number(f.segundos)||8;
  const total = visQuadros(seg, fps);
  const degraus = Array.isArray(f.degraus) ? f.degraus : [];
  const maior = Math.max(...degraus.map(d=>Number(d.valor)||0), Number(f.limite)||0, 1);

  const corpo = `
    <div class="rot">${visEsc(f.rotulo||'')}</div>
    <h1>${visEsc(f.titulo||'')}</h1>
    <div style="flex:1;position:relative;margin-top:44px">
      <div id="limite" style="position:absolute;left:0;right:0;border-top:2px dashed ${VIS_CORES.subtracao};opacity:0">
        <div class="rot" style="font-size:19px;color:${VIS_CORES.subtracao};margin-top:8px">${visEsc(f.limiteRotulo||'')}</div>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;display:flex;align-items:flex-end;gap:38px;height:100%">
        ${degraus.map((d,i)=>`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%">
          <div class="n" data-vl="${i}" style="font-size:40px;text-align:center;margin-bottom:12px;color:${d.cor||VIS_CORES.chave}"></div>
          <div data-bar="${i}" style="background:${d.cor||VIS_CORES.destaque};height:0;border-radius:4px 4px 0 0"></div>
          <div class="rot" style="font-size:18px;text-align:center;margin-top:14px;min-height:52px">${visEsc(d.rotulo||'')}</div>
        </div>`).join('')}
      </div>
    </div>
    ${f.premissa?`<div class="premissa">${visEsc(f.premissa)}</div>`:''}
    ${f.fonte?`<div class="fonte">${visEsc(f.fonte)}</div>`:''}`;

  const script = `
    var VALS=${JSON.stringify(degraus.map(d=>Number(d.valor)||0))};
    var MAIOR=${maior}, TOTAL=${total}, LIM=${Number(f.limite)||0};
    var SUF=${JSON.stringify(f.sufixo||'')}, CASAS=${f.casas==null?2:Number(f.casas)};
    var ALTURA=0;
    window.setFrame=function(fr){
      var caixa=document.querySelector('[data-bar="0"]');
      if(!ALTURA){ ALTURA = document.getElementById('palco').clientHeight - 420; }
      for(var i=0;i<VALS.length;i++){
        /* cada degrau entra um pouco depois do anterior: o olho acompanha a
           comparação em vez de receber tudo de uma vez */
        var ini=Math.round(TOTAL*0.06*i);
        var t=easeOut(faixa(fr,ini,Math.round(TOTAL*0.34)));
        var b=document.querySelector('[data-bar="'+i+'"]');
        var v=document.querySelector('[data-vl="'+i+'"]');
        if(b) b.style.height=(ALTURA*(VALS[i]/MAIOR)*t).toFixed(1)+'px';
        if(v) v.textContent=nbr(VALS[i]*t,CASAS)+SUF;
      }
      if(LIM>0){
        var el=document.getElementById('limite');
        var o=faixa(fr,Math.round(TOTAL*0.52),Math.round(TOTAL*0.12));
        el.style.opacity=o;
        el.style.bottom=(ALTURA*(LIM/MAIOR)+108).toFixed(1)+'px';
      }
    };`;

  return {html: visPagina('', corpo, script, total), segundos: seg, quadros: total, forma:'escada'};
}

/* ---- tabela: camadas que se subtraem, com o resumo recalculando -------- */
function visTabela(f){
  const fps = Number(f.fps)||VIS_FPS;
  const seg = Number(f.segundos)||10;
  const total = visQuadros(seg, fps);
  const linhas = Array.isArray(f.linhas) ? f.linhas : [];

  const corpo = `
    <div class="rot">${visEsc(f.rotulo||'')}</div>
    <h1>${visEsc(f.titulo||'')}</h1>
    <div style="flex:1;margin-top:40px;display:flex;flex-direction:column;justify-content:center">
      <table style="width:100%;border-collapse:collapse">
        ${linhas.map((l,i)=>`<tr data-lin="${i}" style="opacity:0">
          <td style="padding:16px 0;border-bottom:1px solid ${VIS_CORES.linha};font-size:36px">${visEsc(l.desc||'')}</td>
          <td class="n ${Number(l.valor)<0?'neg':''}" style="padding:16px 0;border-bottom:1px solid ${VIS_CORES.linha};
              font-size:40px;text-align:right;width:340px">${Number(l.valor)<0?'−':''}${visNum(Math.abs(Number(l.valor)||0), f.casas)}</td>
        </tr>`).join('')}
      </table>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:34px">
        <div class="rot" style="font-size:24px">${visEsc(f.resumoRotulo||'Resultado')}</div>
        <div class="n pos" id="res" style="font-size:78px"></div>
      </div>
    </div>
    ${f.premissa?`<div class="premissa">${visEsc(f.premissa)}</div>`:''}
    ${f.fonte?`<div class="fonte">${visEsc(f.fonte)}</div>`:''}`;

  const script = `
    var VALS=${JSON.stringify(linhas.map(l=>Number(l.valor)||0))};
    var TOTAL=${total}, CASAS=${f.casas==null?2:Number(f.casas)};
    var PRE=${JSON.stringify(f.prefixo||'')};
    window.setFrame=function(fr){
      var soma=0;
      for(var i=0;i<VALS.length;i++){
        var ini=Math.round(TOTAL*0.62*(i/Math.max(1,VALS.length)));
        var o=faixa(fr,ini,Math.round(TOTAL*0.10));
        var tr=document.querySelector('[data-lin="'+i+'"]');
        if(tr){ tr.style.opacity=o; }
        /* o resumo recalcula conforme a camada entra — é isso que faz o
           espectador ver a subtração acontecendo, e não só o resultado */
        soma += VALS[i]*o;
      }
      document.getElementById('res').textContent = PRE + nbr(soma,CASAS);
    };`;

  return {html: visPagina('', corpo, script, total), segundos: seg, quadros: total, forma:'tabela'};
}

/* ---- régua: um valor caindo dentro ou fora de um limite ---------------- */
function visRegua(f){
  const fps = Number(f.fps)||VIS_FPS;
  const seg = Number(f.segundos)||7;
  const total = visQuadros(seg, fps);
  const lim = Number(f.limite)||0;
  const val = Number(f.valor)||0;
  const max = Math.max(lim*2, val*1.25, 1);
  const dentro = val <= lim;

  const corpo = `
    <div class="rot">${visEsc(f.rotulo||'')}</div>
    <h1>${visEsc(f.titulo||'')}</h1>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div style="position:relative;height:96px;background:${VIS_CORES.superficie};border-radius:8px;overflow:hidden">
        <div style="position:absolute;top:0;bottom:0;left:0;width:${(lim/max*100).toFixed(2)}%;
             background:${VIS_CORES.resultado}22;border-right:3px solid ${VIS_CORES.resultado}"></div>
        <div id="pont" style="position:absolute;top:0;bottom:0;width:6px;background:${dentro?VIS_CORES.resultado:VIS_CORES.subtracao};left:0"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:20px">
        <div class="rot" style="font-size:20px;color:${VIS_CORES.resultado}">${visEsc(f.limiteRotulo||'limite')} · ${visNum(lim, f.casas)}${visEsc(f.sufixo||'')}</div>
        <div class="rot" style="font-size:20px">${visNum(max, f.casas)}${visEsc(f.sufixo||'')}</div>
      </div>
      <div style="margin-top:56px;display:flex;align-items:baseline;gap:26px">
        <div class="n ${dentro?'pos':'neg'}" id="vl" style="font-size:112px"></div>
        <div id="vered" class="rot" style="font-size:28px;opacity:0;color:${dentro?VIS_CORES.resultado:VIS_CORES.subtracao}">
          ${visEsc(dentro ? (f.dentroTexto||'dentro do limite') : (f.foraTexto||'fora do limite'))}</div>
      </div>
    </div>
    ${f.premissa?`<div class="premissa">${visEsc(f.premissa)}</div>`:''}
    ${f.fonte?`<div class="fonte">${visEsc(f.fonte)}</div>`:''}`;

  const script = `
    var VAL=${val}, MAX=${max}, TOTAL=${total}, CASAS=${f.casas==null?2:Number(f.casas)};
    var SUF=${JSON.stringify(f.sufixo||'')};
    window.setFrame=function(fr){
      var t=easeOut(faixa(fr,0,Math.round(TOTAL*0.55)));
      document.getElementById('pont').style.left=((VAL/MAX)*t*100).toFixed(3)+'%';
      document.getElementById('vl').textContent=nbr(VAL*t,CASAS)+SUF;
      document.getElementById('vered').style.opacity=faixa(fr,Math.round(TOTAL*0.62),Math.round(TOTAL*0.12));
    };`;

  return {html: visPagina('', corpo, script, total), segundos: seg, quadros: total, forma:'regua'};
}

/* ---- barras: quanto cada opção custa, lado a lado ---------------------- */
function visBarras(f){
  const fps = Number(f.fps)||VIS_FPS;
  const seg = Number(f.segundos)||8;
  const total = visQuadros(seg, fps);
  const itens = Array.isArray(f.itens) ? f.itens : [];
  const maior = Math.max(...itens.map(i=>Number(i.valor)||0), 1);

  const corpo = `
    <div class="rot">${visEsc(f.rotulo||'')}</div>
    <h1>${visEsc(f.titulo||'')}</h1>
    <div style="flex:1;margin-top:44px;display:flex;flex-direction:column;justify-content:center;gap:26px">
      ${itens.map((it,i)=>`<div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <div style="font-size:32px">${visEsc(it.rotulo||'')}</div>
          <div class="n" data-vl="${i}" style="font-size:38px;color:${it.cor||VIS_CORES.chave}"></div>
        </div>
        <div style="height:26px;background:${VIS_CORES.superficie};border-radius:4px;overflow:hidden">
          <div data-bar="${i}" style="height:100%;width:0;background:${it.cor||VIS_CORES.destaque}"></div>
        </div>
      </div>`).join('')}
    </div>
    ${f.premissa?`<div class="premissa">${visEsc(f.premissa)}</div>`:''}
    ${f.fonte?`<div class="fonte">${visEsc(f.fonte)}</div>`:''}`;

  const script = `
    var VALS=${JSON.stringify(itens.map(i=>Number(i.valor)||0))};
    var MAIOR=${maior}, TOTAL=${total}, CASAS=${f.casas==null?2:Number(f.casas)};
    var PRE=${JSON.stringify(f.prefixo||'')}, SUF=${JSON.stringify(f.sufixo||'')};
    window.setFrame=function(fr){
      for(var i=0;i<VALS.length;i++){
        var ini=Math.round(TOTAL*0.07*i);
        var t=easeOut(faixa(fr,ini,Math.round(TOTAL*0.40)));
        var b=document.querySelector('[data-bar="'+i+'"]');
        var v=document.querySelector('[data-vl="'+i+'"]');
        if(b) b.style.width=((VALS[i]/MAIOR)*t*100).toFixed(2)+'%';
        if(v) v.textContent=PRE+nbr(VALS[i]*t,CASAS)+SUF;
      }
    };`;

  return {html: visPagina('', corpo, script, total), segundos: seg, quadros: total, forma:'barras'};
}

/* ---------------------------------------------------- o despachante ----- */

const VIS_FORMAS = {
  contador: visContador,
  escada:   visEscada,
  tabela:   visTabela,
  regua:    visRegua,
  barras:   visBarras,
};

/* Devolve {ok, html, segundos, quadros, forma} ou {ok:false, motivo}. */
function visualHTML(ficha){
  if(!ficha || !ficha.forma) return {ok:false, motivo:'o visual não disse qual forma usar'};
  const fn = VIS_FORMAS[ficha.forma];
  if(!fn) return {ok:false, motivo:`forma desconhecida: ${ficha.forma}. Use ${Object.keys(VIS_FORMAS).join(', ')}.`};
  try{
    const r = fn(ficha);
    return {ok:true, ...r};
  }catch(e){
    return {ok:false, motivo:String(e && e.message || e)};
  }
}

/* Uma peça inteira: a lista de visuais do roteiro vira lista de páginas.
   Também soma o tempo, que é o que permite conferir contra a narração
   ANTES de gastar crédito gerando o áudio. */
function visualPeca(fichas){
  const lista = Array.isArray(fichas) ? fichas : [];
  const saida = [], erros = [];
  let segundos = 0;
  lista.forEach((f,i)=>{
    const r = visualHTML(f);
    if(!r.ok){ erros.push(`visual ${i+1}: ${r.motivo}`); return; }
    saida.push({html:r.html, segundos:r.segundos, quadros:r.quadros, forma:r.forma,
                titulo:f.titulo||''});
    segundos += r.segundos;
  });
  return {ok: erros.length===0, visuais:saida, segundos, erros,
          quadros: saida.reduce((s,v)=>s+v.quadros,0)};
}

/* A conta que decide se vale a pena: o que a IA cobraria por este mesmo
   vídeo, contra o que custa desenhar. Serve para a tela mostrar, porque
   número na cara é o que faz a regra ser obedecida. */
function visualEconomia(segundos){
  const s = Number(segundos)||0;
  const blocos = Math.ceil(s/10);
  const creditosIA = blocos*20;      /* 20 créditos por bloco de 10 s */
  return {segundos:s, blocos, creditosIA, creditosAqui:0, economia:creditosIA};
}

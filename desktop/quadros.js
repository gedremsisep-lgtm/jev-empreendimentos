/* =========================================================================
   quadros.js — vídeo renderizado por CÓDIGO, quadro a quadro.

   POR QUE ISTO EXISTE
   Gerar vídeo por IA custa 20 créditos a cada 10 segundos: um vídeo de 10
   minutos sai por volta de 1.260 créditos. E, pior que o preço, é exatamente
   o perfil que o YouTube passou a remover em janeiro de 2026 sob a política
   de conteúdo inautêntico.

   Visual de número — tabela, gráfico, contador, escada, régua — não precisa
   de IA nenhuma: é desenho de dado, e desenho de dado se faz com uma página
   e uma conta. Aqui a página é fotografada quadro a quadro e o ffmpeg cola.
   Custo: zero. Crédito só se gasta na narração.

   COMO A PÁGINA CONVERSA COM ESTE ARQUIVO
   A página NÃO anima sozinha, e não usa relógio. Ela expõe duas coisas:

       window.TOTAL_FRAMES   -> quantos quadros ela tem
       window.setFrame(f)    -> desenha o quadro f (0 .. TOTAL_FRAMES-1)

   Quem manda no tempo é este arquivo. Isso é o que garante que o vídeo saia
   igual em máquina rápida e em máquina lenta — animação por relógio perde
   quadro quando o computador engasga, e aí o áudio descola do vídeo.

   ARMADILHAS JÁ PAGAS (não desfaça sem ler)
   - ffmpeg dentro de laço que lê linha a linha precisa de -nostdin, senão
     ele engole a entrada do laço e só a primeira volta roda.
   - cortar cada bloco na duração exata com -t: lista de concat por duração
     de quadro acumula cerca de 0,6 s de sobra por clipe, e no fim do vídeo
     a narração já está falando a frase seguinte.
   - a janela precisa nascer com a MESMA medida do vídeo. Se a tela do
     usuário for menor que 1920x1080, uma janela visível é recortada; por
     isso ela nasce escondida e com offscreen.
   ========================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

let electron = null;
try { electron = require('electron'); } catch (e) { /* fora do app, dá para testar o resto */ }

/* ---------------------------------------------------------------- ajudas */

const LARGURA = 1920;
const ALTURA = 1080;
const FPS = 30;

function quadrosDe(segundos, fps) {
  /* pelo menos um quadro: bloco de 0 s não existe */
  return Math.max(1, Math.round(Number(segundos || 0) * Number(fps || FPS)));
}

function nomeQuadro(i) {
  /* seis dígitos dão conta de 9 horas a 30 fps, e o ffmpeg lê na ordem */
  return 'q' + String(i).padStart(6, '0') + '.png';
}

function limpar(pasta) {
  try {
    for (const a of fs.readdirSync(pasta)) {
      if (/^q\d{6}\.png$/.test(a)) fs.unlinkSync(path.join(pasta, a));
    }
  } catch (e) { /* pasta nova, nada a limpar */ }
}

/* ------------------------------------------------- fotografar uma página */

/* Abre a página, confere que ela fala a nossa língua, e devolve um PNG por
   quadro. `aoAndar` recebe (feitos, total) para a tela poder mostrar. */
async function fotografar(arquivoHtml, pastaSaida, opc = {}) {
  if (!electron || !electron.BrowserWindow)
    return { ok: false, motivo: 'esta parte só roda dentro do aplicativo' };
  if (!fs.existsSync(arquivoHtml))
    return { ok: false, motivo: 'não achei a página do visual: ' + arquivoHtml };

  const largura = Number(opc.largura) || LARGURA;
  const altura = Number(opc.altura) || ALTURA;
  const aoAndar = typeof opc.aoAndar === 'function' ? opc.aoAndar : () => {};

  fs.mkdirSync(pastaSaida, { recursive: true });
  limpar(pastaSaida);

  const janela = new electron.BrowserWindow({
    width: largura, height: altura,
    show: false,
    frame: false,
    useContentSize: true,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,   /* janela escondida senão dorme e sai quadro preto */
    },
  });

  const desistir = () => { try { janela.destroy(); } catch (e) {} };

  try {
    await janela.loadFile(arquivoHtml);

    /* a página tem de dizer quantos quadros tem. Se não disser, paramos aqui
       em vez de gravar um vídeo de um quadro só e chamar de pronto. */
    const total = await janela.webContents.executeJavaScript(
      '(typeof window.TOTAL_FRAMES === "number" && window.TOTAL_FRAMES > 0) ? window.TOTAL_FRAMES : 0'
    );
    if (!total) {
      desistir();
      return { ok: false, motivo: 'a página não declarou window.TOTAL_FRAMES — sem isso não dá para saber onde o visual termina' };
    }
    const temSetFrame = await janela.webContents.executeJavaScript(
      'typeof window.setFrame === "function"'
    );
    if (!temSetFrame) {
      desistir();
      return { ok: false, motivo: 'a página não expõe window.setFrame(f) — ela anima sozinha, e assim o vídeo sai diferente a cada máquina' };
    }

    for (let f = 0; f < total; f++) {
      /* desenha o quadro e só então fotografa. O await do executeJavaScript
         garante que o desenho terminou antes do clique. */
      await janela.webContents.executeJavaScript('window.setFrame(' + f + '); true');
      const imagem = await janela.webContents.capturePage();
      const png = imagem.toPNG();
      if (!png || !png.length) {
        desistir();
        return { ok: false, motivo: 'a janela devolveu um quadro vazio no quadro ' + f };
      }
      fs.writeFileSync(path.join(pastaSaida, nomeQuadro(f)), png);
      if (f % 15 === 0 || f === total - 1) aoAndar(f + 1, total);
    }

    desistir();
    return { ok: true, quadros: total, pasta: pastaSaida, largura, altura };
  } catch (e) {
    desistir();
    return { ok: false, motivo: String((e && e.message) || e) };
  }
}

/* ------------------------------------------------------ colar com ffmpeg */

function rodar(cmd, args, timeout) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: timeout || 600000 });
  return { ok: r.status === 0, saida: String(r.stdout || '') + String(r.stderr || ''), status: r.status };
}

/* Junta os PNGs num mp4 mudo. Sem áudio de propósito: a narração entra
   depois, uma vez só, sobre o vídeo inteiro — assim não há um ponto de
   emenda por bloco para o áudio descolar. */
function colar(pastaQuadros, destino, opc = {}) {
  const ffmpeg = opc.ffmpeg || 'ffmpeg';
  const fps = Number(opc.fps) || FPS;
  const segundos = Number(opc.segundos) || 0;

  const args = [
    '-nostdin',              /* senão engole a entrada de quem chamou */
    '-y',
    '-framerate', String(fps),
    '-i', path.join(pastaQuadros, 'q%06d.png'),
  ];
  /* duração exata, quando pedida: não confie na contagem de quadros para
     fechar o tempo, porque arredondamento de quadro vira sobra somada */
  if (segundos > 0) args.push('-t', segundos.toFixed(3));
  args.push(
    '-c:v', 'libx264',
    '-crf', '17',
    '-preset', opc.preset || 'medium',
    '-pix_fmt', 'yuv420p',   /* sem isto o vídeo não abre em player comum */
    '-movflags', '+faststart',
    destino
  );

  const r = rodar(ffmpeg, args, opc.timeout);
  if (!r.ok) return { ok: false, motivo: 'o ffmpeg recusou a colagem', detalhe: r.saida.slice(-1200) };
  if (!fs.existsSync(destino) || fs.statSync(destino).size === 0)
    return { ok: false, motivo: 'o ffmpeg disse que deu certo mas não deixou arquivo' };
  return { ok: true, arquivo: destino, bytes: fs.statSync(destino).size };
}

/* ------------------------------------------------- conferir vídeo x áudio */

function duracao(caminho, ffprobe) {
  const r = rodar(ffprobe || 'ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', caminho,
  ], 60000);
  const n = parseFloat(String(r.saida).trim());
  return isNaN(n) ? 0 : n;
}

/* A regra do canal: vídeo e áudio têm de bater em menos de 0,5 s. Passar
   disso é descolamento visível, e a correção NUNCA é acelerar o áudio —
   é reescrever a linha do roteiro. */
function conferir(video, audio, opc = {}) {
  const ff = opc.ffprobe || 'ffprobe';
  const dv = duracao(video, ff);
  const da = duracao(audio, ff);
  const dif = Math.abs(dv - da);
  const limite = Number(opc.limite) || 0.5;
  return {
    ok: dif < limite,
    video: dv, audio: da, diferenca: Number(dif.toFixed(3)), limite,
    motivo: dif < limite ? '' :
      `vídeo (${dv.toFixed(2)}s) e narração (${da.toFixed(2)}s) diferem ${dif.toFixed(2)}s. ` +
      'Não acelere o áudio para caber: reescreva a linha do roteiro.',
  };
}

/* ---------------------------------------------- a narração sobre o vídeo */

function juntarNarracao(video, audio, destino, opc = {}) {
  const ffmpeg = opc.ffmpeg || 'ffmpeg';
  const r = rodar(ffmpeg, [
    '-nostdin', '-y',
    '-i', video, '-i', audio,
    '-c:v', 'copy',          /* o vídeo já está certo, não recodifica */
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    destino,
  ], opc.timeout);
  if (!r.ok) return { ok: false, motivo: 'o ffmpeg não juntou a narração', detalhe: r.saida.slice(-1200) };
  return { ok: true, arquivo: destino, bytes: fs.statSync(destino).size };
}

/* ------------------------------------------------------- a peça completa */

/* visuais: [{html, segundos}] na ordem. Devolve um mp4 mudo por visual e,
   se vier narração, a peça inteira montada. */
async function produzir(visuais, pastaTrabalho, opc = {}) {
  if (!Array.isArray(visuais) || !visuais.length)
    return { ok: false, motivo: 'nenhum visual para renderizar' };

  const fps = Number(opc.fps) || FPS;
  const ffmpeg = opc.ffmpeg || 'ffmpeg';
  const aoAndar = typeof opc.aoAndar === 'function' ? opc.aoAndar : () => {};
  fs.mkdirSync(pastaTrabalho, { recursive: true });

  const pedacos = [];
  for (let i = 0; i < visuais.length; i++) {
    const v = visuais[i];
    aoAndar('visual ' + (i + 1) + ' de ' + visuais.length, i / visuais.length);

    const pastaQ = path.join(pastaTrabalho, 'quadros-' + i);
    const foto = await fotografar(v.html, pastaQ, {
      largura: opc.largura, altura: opc.altura,
      aoAndar: (f, t) => aoAndar('visual ' + (i + 1) + ': quadro ' + f + ' de ' + t, (i + f / t) / visuais.length),
    });
    if (!foto.ok) return { ok: false, motivo: 'visual ' + (i + 1) + ': ' + foto.motivo };

    const mp4 = path.join(pastaTrabalho, 'bloco-' + String(i).padStart(3, '0') + '.mp4');
    const segundos = Number(v.segundos) || (foto.quadros / fps);
    const col = colar(pastaQ, mp4, { ffmpeg, fps, segundos, preset: opc.preset });
    if (!col.ok) return { ok: false, motivo: 'visual ' + (i + 1) + ': ' + col.motivo, detalhe: col.detalhe };
    pedacos.push({ arquivo: mp4, segundos, quadros: foto.quadros });

    /* os PNGs de um visual pesam muito: some com eles assim que o bloco
       está colado, senão um vídeo de 10 min enche o disco do usuário */
    if (opc.guardarQuadros !== true) limpar(pastaQ);
  }

  /* emenda dos blocos */
  const lista = path.join(pastaTrabalho, 'blocos.txt');
  fs.writeFileSync(lista, pedacos.map(p => "file '" + p.arquivo.replace(/'/g, "'\\''") + "'").join('\n'));
  const mudo = path.join(pastaTrabalho, 'sem-narracao.mp4');
  const emenda = rodar(ffmpeg, ['-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', mudo], opc.timeout);
  if (!emenda.ok) return { ok: false, motivo: 'o ffmpeg não emendou os blocos', detalhe: emenda.saida.slice(-1200) };

  if (!opc.narracao) return { ok: true, arquivo: mudo, blocos: pedacos.length, comNarracao: false };

  const conf = conferir(mudo, opc.narracao, { ffprobe: opc.ffprobe, limite: opc.limite });
  if (!conf.ok && opc.exigirSincronia !== false)
    return { ok: false, motivo: conf.motivo, sincronia: conf };

  const final = path.join(pastaTrabalho, 'peca.mp4');
  const j = juntarNarracao(mudo, opc.narracao, final, { ffmpeg, timeout: opc.timeout });
  if (!j.ok) return j;
  return { ok: true, arquivo: final, blocos: pedacos.length, comNarracao: true, sincronia: conf };
}

module.exports = {
  LARGURA, ALTURA, FPS,
  quadrosDe, nomeQuadro,
  fotografar, colar, duracao, conferir, juntarNarracao, produzir,
};

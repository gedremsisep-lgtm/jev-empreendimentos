/* =========================================================================
   O PLUGIN DO HIGGSFIELD — a IA que põe uma PESSOA apresentando o produto.

   POR QUE ESTA PEÇA EXISTE
   ------------------------
   A fábrica daqui monta o vídeo com as fotos reais do produto, e não inventa
   gente — nem deveria. Só que o vídeo que vende no TikTok Shop tem alguém
   segurando, usando e falando. Esta peça é a ponte: manda o prompt de pessoa
   (o das cinco cenas) para a IA do Higgsfield e traz o vídeo de volta.

   COMO ELA GASTA O DINHEIRO DO DONO — e as três travas
   ----------------------------------------------------
   1. NADA é gerado sem a chave DELE. A chave é criada por ele em
      cloud.higgsfield.ai e colada no programa. Ela fica só no computador
      dele, num arquivo da pasta de dados. Não vai para lugar nenhum além do
      próprio Higgsfield.
   2. NADA é gerado sem o custo aparecer antes. Toda geração passa primeiro
      pelo /estimate, que devolve créditos e dólares. O programa mostra e
      espera o clique.
   3. NADA é gerado em lote sem teto. O pedido inteiro é estimado somado, e
      se passar do limite que ele configurou, para e pergunta.

   O CAMINHO, EM DUAS PERNAS
   -------------------------
   A API pública do Higgsfield hoje entrega imagem-para-vídeo. Para ter uma
   PESSOA, não basta animar a foto do produto — animar uma lata faz a lata
   girar, não faz nascer gente. Então são duas pernas:

     perna 1  soul/standard  (texto → imagem)
              cria a pessoa segurando o produto, usando a foto real como
              referência para o produto não virar outro produto

     perna 2  dop/standard ou kling (imagem → vídeo)
              põe aquela imagem em movimento: ela fala, mexe, usa

   É o mesmo desenho que o fluxo oficial de UGC deles usa — pessoa primeiro,
   movimento depois — e é o único que mantém a mesma pessoa e o mesmo produto
   de uma cena para a outra.

   Rodar por fora, para conferir:
     node higgsfield.js --estado
   ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const BASE = process.env.JEV_HIGGS_BASE || 'https://platform.higgsfield.ai';

/* Os modelos que a API pública documenta hoje. Quando eles publicarem os
   esquemas dos outros, é aqui que entram — o resto da peça não muda. */
const MODELOS = {
  pessoa:  { rota: '/higgsfield-ai/soul/standard',            tipo: 'imagem' },
  barato:  { rota: '/higgsfield-ai/dop/standard',             tipo: 'video'  },
  bom:     { rota: '/kling-video/v2.1/pro/image-to-video',    tipo: 'video'  }
};

const TETO_PADRAO_USD = 5.00;   // o freio de mão: acima disso, pergunta

/* --------------------------------------------------------------- a pasta */
function pasta() {
  const base = process.env.JEV_HIGGS ||
    (function () {
      try { return path.join(require('electron').app.getPath('userData'), 'higgsfield'); }
      catch (e) { return path.join(__dirname, '.higgsfield'); }
    })();
  try { fs.mkdirSync(base, { recursive: true }); } catch (e) {}
  return base;
}

const arquivoChave = () => path.join(pasta(), 'chave.json');

/* ---------------------------------------------------------------- a chave

   Guardada em arquivo com permissão de dono (0600 onde o sistema respeita).
   O programa NUNCA mostra o segredo de volta na tela inteiro: quem já tem a
   chave não precisa relê-la, e quem estiver olhando por cima do ombro não
   deveria conseguir copiá-la.                                             */
function guardarChave(id, segredo) {
  const i = String(id || '').trim();
  const s = String(segredo || '').trim();
  if (!i || !s) return { ok: false, motivo: 'Faltou o ID ou o segredo da chave.' };
  if (/\s/.test(i) || /\s/.test(s))
    return { ok: false, motivo: 'A chave veio com espaço no meio — copie de novo do site.' };
  try {
    fs.writeFileSync(arquivoChave(), JSON.stringify({ id: i, segredo: s }), { mode: 0o600 });
    try { fs.chmodSync(arquivoChave(), 0o600); } catch (e) {}
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'Não consegui guardar a chave: ' + (e && e.message) };
  }
}

function lerChave() {
  try {
    const j = JSON.parse(fs.readFileSync(arquivoChave(), 'utf8'));
    return (j && j.id && j.segredo) ? j : null;
  } catch (e) { return null; }
}

function esquecerChave() {
  try { fs.unlinkSync(arquivoChave()); } catch (e) {}
  return { ok: true };
}

/* Só o rabinho, para ele reconhecer qual chave está ali sem expor nada. */
function pontaDaChave() {
  const c = lerChave();
  if (!c) return '';
  const s = String(c.id);
  return s.length <= 8 ? '…' : s.slice(0, 4) + '…' + s.slice(-4);
}

/* ------------------------------------------------------------ o telefone */
function pedir(rota, corpo, metodo, cabecalhosExtras, bruto) {
  return new Promise(function (resolve) {
    const chave = lerChave();
    if (!chave) return resolve({ ok: false, semChave: true,
      motivo: 'Nenhuma chave do Higgsfield está configurada neste computador.' });

    let alvo;
    try { alvo = new URL(/^https?:/.test(rota) ? rota : BASE + rota); }
    catch (e) { return resolve({ ok: false, motivo: 'Endereço inválido: ' + rota }); }

    const dados = corpo == null ? null
      : (Buffer.isBuffer(corpo) ? corpo : Buffer.from(JSON.stringify(corpo)));

    const cab = Object.assign({
      'Authorization': 'Key ' + chave.id + ':' + chave.segredo,
      'Accept': 'application/json'
    }, cabecalhosExtras || {});
    if (dados && !cab['Content-Type']) cab['Content-Type'] = 'application/json';
    if (dados) cab['Content-Length'] = dados.length;

    /* o módulo segue o protocolo do endereço: a nuvem é https, mas o teste
       sobe um servidor http local — sem isto o caminho inteiro só poderia
       ser provado gastando crédito de verdade */
    const mod = alvo.protocol === 'http:' ? require('http') : https;
    const req = mod.request({
      protocol: alvo.protocol, hostname: alvo.hostname,
      port: alvo.port || (alvo.protocol === 'http:' ? 80 : 443),
      path: alvo.pathname + alvo.search,
      method: metodo || (dados ? 'POST' : 'GET'),
      headers: cab, timeout: 120000
    }, function (res) {
      const pedacos = [];
      res.on('data', function (d) { pedacos.push(d); });
      res.on('end', function () {
        const cru = Buffer.concat(pedacos);
        if (bruto) return resolve({ ok: res.statusCode < 300, status: res.statusCode, bytes: cru });
        let j = null;
        try { j = JSON.parse(cru.toString('utf8')); } catch (e) {}
        if (res.statusCode >= 300) {
          return resolve({ ok: false, status: res.statusCode,
            motivo: recadoDoErro(res.statusCode, j, cru.toString('utf8')) });
        }
        resolve({ ok: true, status: res.statusCode, dados: j });
      });
    });
    req.setTimeout(120000, function () { req.destroy(new Error('demorou demais')); });
    req.on('error', function (e) {
      resolve({ ok: false, motivo: recadoDeRede(e) });
    });
    if (dados) req.write(dados);
    req.end();
  });
}

/* O erro que ensina o que fazer, em vez de repetir o código HTTP. */
function recadoDoErro(status, j, texto) {
  const dele = (j && (j.message || j.detail || j.error)) || '';
  if (status === 401 || status === 403)
    return 'O Higgsfield recusou a chave. Confira se você colou o ID e o segredo certos, ' +
           'em cloud.higgsfield.ai, e se a chave não foi apagada de lá.' +
           (dele ? ' (' + dele + ')' : '');
  if (status === 402 || /credit|saldo|balance/i.test(dele))
    return 'Sem crédito na conta do Higgsfield. Nada foi gerado e nada foi cobrado. ' +
           'Recarregue lá e tente de novo.' + (dele ? ' (' + dele + ')' : '');
  if (status === 429)
    return 'O Higgsfield pediu para esperar um pouco (limite de pedidos por minuto). ' +
           'Tente de novo daqui a um minuto.';
  if (status === 404)
    return 'Esse modelo não existe mais nesse endereço. A API deles mudou — me avise ' +
           'para eu apontar para o novo.' + (dele ? ' (' + dele + ')' : '');
  return 'O Higgsfield respondeu ' + status + (dele ? ': ' + dele : '') +
         (!dele && texto ? ': ' + String(texto).slice(0, 200) : '');
}

function recadoDeRede(e) {
  const c = (e && (e.code || e.message)) || '';
  if (/ENOTFOUND|EAI_AGAIN/.test(c))
    return 'Este computador não conseguiu nem achar o endereço do Higgsfield. ' +
           'Parece internet, não o serviço: teste abrindo higgsfield.ai no navegador.';
  if (/ECONNREFUSED/.test(c))
    return 'O endereço do Higgsfield existe, mas recusou a conexão. Costuma ser ' +
           'firewall ou antivírus deste computador bloqueando o programa — ' +
           'teste abrindo higgsfield.ai no navegador para separar as duas coisas.';
  if (/ECONNRESET|ETIMEDOUT|EPIPE|demorou/.test(c))
    return 'A conexão com o Higgsfield caiu no meio. Se repetir, teste a mesma rede ' +
           'com o 4G do celular para saber se o corte é da sua internet.';
  if (/CERT|SELF_SIGNED/.test(c))
    return 'O certificado da conexão foi recusado. Antivírus ou proxy da rede costuma ' +
           'ser a causa.';
  return 'Não consegui falar com o Higgsfield: ' + c;
}

/* ---------------------------------------------------------------- estado */
async function estado() {
  const c = lerChave();
  if (!c) {
    return { ok: true, temChave: false, pronto: false,
      recado: 'Para gerar vídeo com pessoa, crie uma chave em cloud.higgsfield.ai e ' +
              'cole aqui o ID e o segredo. A chave fica só neste computador.' };
  }
  /* uma estimativa mínima serve de teste de vida: confere a chave sem gerar
     nada e sem gastar nada */
  const r = await estimar('pessoa', { prompt: 'teste', aspect_ratio: '3:4' });
  if (r.ok) {
    return { ok: true, temChave: true, pronto: true, chave: pontaDaChave(),
      recado: 'Chave funcionando. O custo aparece antes de cada geração.' };
  }
  return { ok: true, temChave: true, pronto: false, chave: pontaDaChave(),
    recado: r.motivo };
}

/* -------------------------------------------------------------- estimar

   O /estimate devolve {credits, usd} e NÃO gera nada. É a peça que permite
   a promessa "nada é gerado sem você ver o preço".                        */
async function estimar(qual, params) {
  const m = MODELOS[qual];
  if (!m) return { ok: false, motivo: 'Modelo desconhecido: ' + qual };
  const r = await pedir('/estimate' + m.rota, params || {});
  if (!r.ok) return r;
  const d = r.dados || {};
  const usd = Number(d.usd);
  const cred = Number(d.credits);
  return { ok: true, usd: isFinite(usd) ? usd : null,
           creditos: isFinite(cred) ? cred : null, bruto: d };
}

/* ------------------------------------------------------------- subir foto

   A API só aceita imagem por URL. A foto do produto está no disco do dono,
   então ela sobe primeiro e vira uma URL de uso único.                    */
function tipoPelaExtensao(caminho) {
  const e = String(caminho).toLowerCase();
  if (/\.png$/.test(e)) return 'image/png';
  if (/\.webp$/.test(e)) return 'image/webp';
  if (/\.gif$/.test(e)) return 'image/gif';
  return 'image/jpeg';
}

async function subirFoto(caminho) {
  let bytes;
  try { bytes = fs.readFileSync(caminho); }
  catch (e) { return { ok: false, motivo: 'Não achei a foto ' + caminho }; }
  if (!bytes.length) return { ok: false, motivo: 'A foto está vazia: ' + caminho };

  const tipo = tipoPelaExtensao(caminho);
  const pedido = await pedir('/files/generate-upload-url', {
    content_type: tipo, filename: path.basename(caminho)
  });
  if (!pedido.ok) return pedido;

  const d = pedido.dados || {};
  const destino = d.upload_url || d.uploadUrl;
  const publica = d.public_url || d.publicUrl;
  if (!destino || !publica)
    return { ok: false, motivo: 'O Higgsfield não devolveu o endereço para subir a foto.' };

  const envio = await pedir(destino, bytes, 'PUT',
    Object.assign({ 'Content-Type': tipo }, d.upload_headers || d.uploadHeaders || {}), true);
  if (!envio.ok)
    return { ok: false, motivo: 'A foto não subiu (o servidor respondeu ' + envio.status + ').' };
  return { ok: true, url: publica };
}

/* -------------------------------------------------------------- gerar

   Manda e devolve o número do pedido. Não espera aqui — quem espera é o
   acompanhar(), para a tela poder mostrar progresso em vez de congelar.  */
async function gerar(qual, params) {
  const m = MODELOS[qual];
  if (!m) return { ok: false, motivo: 'Modelo desconhecido: ' + qual };
  const r = await pedir(m.rota, params || {});
  if (!r.ok) return r;
  const d = r.dados || {};
  const id = d.request_id || d.id || d.requestId;
  if (!id) return { ok: false, motivo: 'O Higgsfield aceitou mas não devolveu o número do pedido.' };
  return { ok: true, id: String(id), status: d.status || 'queued' };
}

const TERMINAIS = ['completed', 'failed', 'nsfw', 'canceled'];

async function situacao(id) {
  const r = await pedir('/requests/' + encodeURIComponent(id) + '/status', null, 'GET');
  if (!r.ok) return r;
  const d = r.dados || {};
  const s = String(d.status || '').toLowerCase();
  return { ok: true, status: s, terminou: TERMINAIS.indexOf(s) >= 0,
    deuCerto: s === 'completed',
    url: d.result_url || d.resultUrl || (d.result && (d.result.url || d.result.result_url)) || '',
    motivo: s === 'nsfw'
      ? 'O Higgsfield barrou esta cena por conteúdo impróprio. Isso NÃO é cobrado. ' +
        'Costuma ser palavra ambígua no prompt — mude a descrição e gere de novo.'
      : s === 'failed'
      ? 'A geração falhou do lado deles. Isso NÃO é cobrado. Pode tentar de novo.'
      : s === 'canceled' ? 'A geração foi cancelada.' : '',
    bruto: d };
}

/* Espera educada: começa rápido e vai afrouxando, para não martelar a API. */
async function acompanhar(id, aoAndar, limiteSegundos) {
  const limite = (limiteSegundos || 600) * 1000;
  const comeco = Date.now();
  let espera = 3000;
  for (;;) {
    const s = await situacao(id);
    if (!s.ok) return s;
    if (typeof aoAndar === 'function') { try { aoAndar(s); } catch (e) {} }
    if (s.terminou) return s;
    if (Date.now() - comeco > limite)
      return { ok: false, motivo: 'A geração passou de ' + Math.round(limite / 60000) +
        ' minutos sem terminar. O pedido continua lá no Higgsfield; ' +
        'você pode conferir depois sem gerar de novo.' };
    await new Promise(function (r) { setTimeout(r, espera); });
    espera = Math.min(espera + 2000, 15000);
  }
}

/* ------------------------------------------------------------ baixar */
function baixar(url, destino) {
  return new Promise(function (resolve) {
    let alvo;
    try { alvo = new URL(url); } catch (e) { return resolve({ ok: false, motivo: 'Endereço do vídeo inválido.' }); }
    const mod = alvo.protocol === 'http:' ? require('http') : https;
    const req = mod.get(url, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(baixar(res.headers.location, destino));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve({ ok: false, motivo: 'O vídeo não veio (resposta ' + res.statusCode + ').' });
      }
      try { fs.mkdirSync(path.dirname(destino), { recursive: true }); } catch (e) {}
      const arq = fs.createWriteStream(destino);
      let bytes = 0;
      res.on('data', function (d) { bytes += d.length; });
      res.pipe(arq);
      arq.on('finish', function () {
        arq.close(function () {
          if (bytes < 1000) { try { fs.unlinkSync(destino); } catch (e) {}
            return resolve({ ok: false, motivo: 'O arquivo chegou vazio.' }); }
          resolve({ ok: true, caminho: destino, bytes: bytes });
        });
      });
      arq.on('error', function (e) { resolve({ ok: false, motivo: String(e && e.message) }); });
    });
    req.on('error', function (e) { resolve({ ok: false, motivo: recadoDeRede(e) }); });
    req.setTimeout(180000, function () { req.destroy(new Error('demorou demais')); });
  });
}

/* ================================================================ o pedido

   Um "pedido" é o vídeo inteiro: várias cenas, cada uma com a sua imagem de
   pessoa e o seu clipe. Aqui ele é orçado TODO antes de começar, para o dono
   ver a conta fechada — e não descobrir o preço somando depois.           */
function orcamentoVazio() {
  return { usd: 0, creditos: 0, itens: [] };
}

async function orcar(cenas, opcoes) {
  const o = opcoes || {};
  const qualVideo = o.qualidade === 'bom' ? 'bom' : 'barato';
  const segundos = Number(o.segundos) || 5;
  const formato = o.formato || '9:16';
  const conta = orcamentoVazio();

  for (let i = 0; i < cenas.length; i++) {
    const img = await estimar('pessoa', { prompt: cenas[i].prompt || '', aspect_ratio: formato });
    if (!img.ok) return { ok: false, motivo: img.motivo, semChave: img.semChave };
    const vid = await estimar(qualVideo, {
      prompt: cenas[i].prompt || '', image_url: 'https://exemplo/placeholder.jpg',
      duration: segundos, aspect_ratio: formato });
    if (!vid.ok) return { ok: false, motivo: vid.motivo, semChave: vid.semChave };
    conta.usd += (img.usd || 0) + (vid.usd || 0);
    conta.creditos += (img.creditos || 0) + (vid.creditos || 0);
    conta.itens.push({ cena: i + 1, usd: (img.usd || 0) + (vid.usd || 0),
                       creditos: (img.creditos || 0) + (vid.creditos || 0) });
  }
  conta.usd = Math.round(conta.usd * 100) / 100;
  conta.creditos = Math.round(conta.creditos * 100) / 100;
  const teto = Number(o.tetoUsd) || TETO_PADRAO_USD;
  return { ok: true, orcamento: conta, teto: teto, passouDoTeto: conta.usd > teto,
    qualidade: qualVideo };
}

/* Gera o vídeo inteiro. Só entra aqui depois do dono ver o orçamento e
   confirmar — quem garante isso é a tela, e o teste prova.               */
async function gerarPedido(cenas, opcoes) {
  const o = opcoes || {};
  if (!o.confirmado)
    return { ok: false, motivo: 'Nada foi gerado: falta a confirmação do orçamento.' };

  const qualVideo = o.qualidade === 'bom' ? 'bom' : 'barato';
  const segundos = Number(o.segundos) || 5;
  const formato = o.formato || '9:16';
  const destinoPasta = o.pasta || path.join(pasta(), 'saida');
  const andar = typeof o.aoAndar === 'function' ? o.aoAndar : function () {};

  let fotoUrl = '';
  if (o.fotoProduto) {
    andar({ etapa: 'foto', texto: 'subindo a foto do produto' });
    const s = await subirFoto(o.fotoProduto);
    if (!s.ok) return { ok: false, motivo: 'A foto do produto não subiu: ' + s.motivo };
    fotoUrl = s.url;
  }

  const feitos = [];
  const falhas = [];
  for (let i = 0; i < cenas.length; i++) {
    const n = i + 1;
    const prompt = cenas[i].prompt || '';
    andar({ etapa: 'pessoa', cena: n, de: cenas.length,
            texto: 'cena ' + n + ' de ' + cenas.length + ': desenhando a pessoa com o produto' });

    const paramsImg = { prompt: prompt, aspect_ratio: formato };
    if (fotoUrl) paramsImg.image_url = fotoUrl;   /* o produto tem que ser O produto */
    const gi = await gerar('pessoa', paramsImg);
    if (!gi.ok) { falhas.push({ cena: n, motivo: gi.motivo }); continue; }
    const si = await acompanhar(gi.id, null, o.limiteSegundos);
    if (!si.ok || !si.deuCerto) {
      falhas.push({ cena: n, motivo: si.motivo || 'a imagem da pessoa não saiu' });
      continue;
    }

    andar({ etapa: 'video', cena: n, de: cenas.length,
            texto: 'cena ' + n + ' de ' + cenas.length + ': pondo a pessoa em movimento' });
    const gv = await gerar(qualVideo, { prompt: prompt, image_url: si.url,
      duration: segundos, aspect_ratio: formato });
    if (!gv.ok) { falhas.push({ cena: n, motivo: gv.motivo }); continue; }
    const sv = await acompanhar(gv.id, null, o.limiteSegundos);
    if (!sv.ok || !sv.deuCerto) {
      falhas.push({ cena: n, motivo: sv.motivo || 'o vídeo da cena não saiu' });
      continue;
    }

    const destino = path.join(destinoPasta, 'cena-' + String(n).padStart(2, '0') + '.mp4');
    const b = await baixar(sv.url, destino);
    if (!b.ok) { falhas.push({ cena: n, motivo: b.motivo }); continue; }
    feitos.push({ cena: n, caminho: destino, bytes: b.bytes });
    andar({ etapa: 'pronta', cena: n, de: cenas.length, caminho: destino });
  }

  if (!feitos.length)
    return { ok: false, motivo: falhas.length
      ? 'Nenhuma cena saiu. A primeira falha foi: ' + falhas[0].motivo
      : 'Nenhuma cena foi gerada.', falhas: falhas };

  return { ok: true, arquivos: feitos, falhas: falhas, pasta: destinoPasta,
    parcial: falhas.length > 0,
    recado: falhas.length
      ? feitos.length + ' de ' + cenas.length + ' cenas ficaram prontas. ' +
        'As que falharam não foram cobradas.'
      : 'As ' + feitos.length + ' cenas ficaram prontas.' };
}

module.exports = {
  MODELOS, BASE, TETO_PADRAO_USD,
  pasta, guardarChave, lerChave, esquecerChave, pontaDaChave,
  estado, estimar, subirFoto, gerar, situacao, acompanhar, baixar,
  orcar, gerarPedido, recadoDoErro, recadoDeRede
};

/* ----------------------------------------------------------- linha de comando */
if (require.main === module) {
  (async function () {
    if (process.argv.indexOf('--estado') >= 0) {
      console.log(JSON.stringify(await estado(), null, 2));
      return;
    }
    console.log('uso: node higgsfield.js --estado');
  })();
}

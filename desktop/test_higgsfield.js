/* =========================================================================
   O teste do plugin do Higgsfield — sem gastar um centavo do dono.

   Aqui sobe um Higgsfield DE MENTIRA: um servidor local que imita o de
   verdade (chave, estimativa, upload, geração, acompanhamento) e também
   imita os jeitos dele de dar errado — chave recusada, sem saldo, cena
   barrada, conexão que cai.

   O que este teste protege, em uma frase: o programa não pode gastar o
   dinheiro do dono sem mostrar o preço e sem ele confirmar.

   Rodar:  node test_higgsfield.js
   ========================================================================= */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-higgs-'));
process.env.JEV_HIGGS = TEMP;

let falhas = 0;
const ok = (t, v) => {
  if (v === true) { console.log('  OK    ' + t); return; }
  falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v).slice(0, 220));
};

/* ------------------------------------------------- o Higgsfield de mentira */
const CHAVE_BOA = { id: 'key_abc123', segredo: 'seg_xyz789' };
const cena = { modo: 'normal' };          /* o teste muda isto para simular */
const visto = { estimativas: 0, geracoes: 0, uploads: 0, autorizacoes: [] };

function corpoDe(req) {
  return new Promise(r => { const p = []; req.on('data', d => p.push(d)); req.on('end', () => r(Buffer.concat(p))); });
}

const pedidos = {};   /* id -> quantas vezes já perguntaram */
let proximoId = 1;

const servidor = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const auth = req.headers['authorization'] || '';
  visto.autorizacoes.push(auth);
  const responder = (código, obj) => {
    res.writeHead(código, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  /* o upload da foto não usa a chave: é uma URL assinada */
  if (req.method === 'PUT' && /^\/subir\//.test(url)) {
    const b = await corpoDe(req);
    visto.uploads++;
    if (!b.length) return responder(400, { message: 'vazio' });
    res.writeHead(200); return res.end('ok');
  }

  /* O resultado pronto sai por link assinado, SEM a chave — é assim no
     Higgsfield de verdade, e é o certo: mandar a chave para um CDN seria
     espalhar o segredo do dono por onde ele não precisa passar. */
  if (/^\/(saida|publico)\//.test(url)) {
    if (auth) visto.baixouComChave = true;   /* o CDN não pode receber o segredo */
    const corpo = Buffer.alloc(/\.mp4$/.test(url) ? 40000 : 20000, 7);
    res.writeHead(200, { 'Content-Type': /\.mp4$/.test(url) ? 'video/mp4' : 'image/jpeg' });
    return res.end(corpo);
  }

  /* a chave vale? */
  if (auth !== 'Key ' + CHAVE_BOA.id + ':' + CHAVE_BOA.segredo)
    return responder(401, { message: 'invalid credentials' });

  if (cena.modo === 'sem-saldo' && /^\/(higgsfield-ai|kling-video)\//.test(url))
    return responder(402, { message: 'insufficient credits' });

  if (url === '/files/generate-upload-url') {
    const b = JSON.parse((await corpoDe(req)).toString() || '{}');
    return responder(200, {
      upload_url: 'http://127.0.0.1:' + porta + '/subir/' + encodeURIComponent(b.filename || 'x'),
      public_url: 'http://127.0.0.1:' + porta + '/publico/' + encodeURIComponent(b.filename || 'x'),
      upload_headers: { 'x-teste': '1' }
    });
  }

  if (/^\/estimate\//.test(url)) {
    visto.estimativas++;
    const ehVideo = /dop|kling/.test(url);
    return responder(200, { credits: ehVideo ? '9.000' : '1.500',
                            usd: ehVideo ? '0.560' : '0.094' });
  }

  if (/^\/(higgsfield-ai|kling-video)\//.test(url)) {
    visto.geracoes++;
    const id = 'req_' + (proximoId++);
    pedidos[id] = { vezes: 0, video: /dop|kling/.test(url) };
    return responder(200, { request_id: id, status: 'queued' });
  }

  const m = url.match(/^\/requests\/([^/]+)\/status$/);
  if (m) {
    const p = pedidos[decodeURIComponent(m[1])];
    if (!p) return responder(404, { message: 'no such request' });
    p.vezes++;
    if (cena.modo === 'barrado' && p.video)
      return responder(200, { status: 'nsfw' });
    if (p.vezes < 2) return responder(200, { status: 'in_progress' });
    return responder(200, { status: 'completed',
      result_url: 'http://127.0.0.1:' + porta + '/saida/' + (p.video ? 'v.mp4' : 'i.jpg') });
  }

  responder(404, { message: 'not found' });
});

let porta = 0;
let H;

(async () => {
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  porta = servidor.address().port;
  process.env.JEV_HIGGS_BASE = 'http://127.0.0.1:' + porta;
  H = require('./higgsfield.js');

  console.log('\nHiggsfield de mentira em http://127.0.0.1:' + porta + '\n');

  /* ================================================== 1) a chave */
  console.log('1) a chave é do dono, e fica só com ele');
  let e = await H.estado();
  ok('sem chave, o programa não se diz pronto', e.temChave === false && e.pronto === false ? true : e);
  ok('e explica onde criar a chave', /cloud\.higgsfield\.ai/.test(e.recado) ? true : e.recado);

  ok('recusa chave pela metade', H.guardarChave('so-id', '').ok === false ? true : 'aceitou');
  ok('recusa chave com espaço no meio (erro clássico de copiar)',
    H.guardarChave('abc def', 'xyz').ok === false ? true : 'aceitou');

  H.guardarChave('key_errada', 'seg_errado');
  e = await H.estado();
  ok('chave errada: diz que foi recusada, não "erro 401"',
    e.pronto === false && /recusou a chave/.test(e.recado) ? true : e);

  H.guardarChave(CHAVE_BOA.id, CHAVE_BOA.segredo);
  e = await H.estado();
  ok('chave certa: fica pronto', e.pronto === true ? true : e);
  ok('e mostra só o rabinho da chave, nunca o segredo',
    /^key_…c123$|^key_.*….*$/.test(e.chave) && !/seg_xyz789/.test(JSON.stringify(e)) ? true : e.chave);

  const noDisco = fs.readFileSync(path.join(TEMP, 'chave.json'), 'utf8');
  ok('a chave é gravada no computador do dono, e não sai daqui',
    noDisco.includes(CHAVE_BOA.segredo) ? true : 'não gravou');
  const modo = fs.statSync(path.join(TEMP, 'chave.json')).mode & 0o777;
  ok('o arquivo da chave é só do dono (0600)', modo === 0o600 ? true : modo.toString(8));

  /* ================================================== 2) o preço antes */
  console.log('\n2) o preço aparece ANTES, sempre');
  const antesEstim = visto.estimativas, antesGer = visto.geracoes;
  const orc = await H.orcar(
    [{ prompt: 'cena 1' }, { prompt: 'cena 2' }, { prompt: 'cena 3' }],
    { qualidade: 'barato', segundos: 5, formato: '9:16' });
  ok('o orçamento fecha', orc.ok === true ? true : orc);
  ok('soma as 3 cenas', orc.orcamento.itens.length === 3 ? true : orc.orcamento.itens);
  ok('em dólar e em crédito', orc.orcamento.usd > 0 && orc.orcamento.creditos > 0 ? true : orc.orcamento);
  ok('perguntou o preço 6 vezes (imagem + vídeo de cada cena)',
    visto.estimativas - antesEstim === 6 ? true : visto.estimativas - antesEstim);
  ok('e NÃO gerou nada para orçar', visto.geracoes === antesGer ? true : 'gerou sem confirmar');

  const caro = await H.orcar(Array.from({ length: 20 }, () => ({ prompt: 'x' })),
    { qualidade: 'barato', tetoUsd: 2 });
  ok('avisa quando passa do teto que o dono pôs', caro.passouDoTeto === true ? true : caro.orcamento);

  /* ================================================== 3) sem confirmar, não gera */
  console.log('\n3) sem a confirmação do dono, nada é gerado');
  const antes2 = visto.geracoes;
  const semOk = await H.gerarPedido([{ prompt: 'cena' }], { qualidade: 'barato' });
  ok('recusa gerar sem confirmação', semOk.ok === false ? true : 'gerou assim mesmo');
  ok('e diz por quê', /confirma/i.test(semOk.motivo) ? true : semOk.motivo);
  ok('nenhuma geração foi disparada', visto.geracoes === antes2 ? true : 'disparou');

  /* ================================================== 4) o caminho inteiro */
  console.log('\n4) o caminho inteiro: foto → pessoa → vídeo → arquivo no disco');
  const foto = path.join(TEMP, 'produto.jpg');
  fs.writeFileSync(foto, Buffer.alloc(5000, 3));
  const passos = [];
  const feito = await H.gerarPedido(
    [{ prompt: 'ela apresenta o produto' }, { prompt: 'ela usa o produto' }],
    { confirmado: true, qualidade: 'barato', segundos: 5, formato: '9:16',
      fotoProduto: foto, pasta: path.join(TEMP, 'saida'),
      aoAndar: p => passos.push(p.etapa) });

  ok('o pedido terminou bem', feito.ok === true ? true : feito);
  ok('saíram os 2 arquivos', (feito.arquivos || []).length === 2 ? true : feito.arquivos);
  ok('os arquivos existem mesmo no disco',
    (feito.arquivos || []).length === 2 &&
    feito.arquivos.every(a => fs.existsSync(a.caminho) && fs.statSync(a.caminho).size > 1000)
      ? true : 'arquivo vazio ou ausente');
  ok('a chave do dono NUNCA foi mandada para o endereço do vídeo pronto',
    visto.autorizacoes.filter(a => a && a.includes(CHAVE_BOA.segredo)).length > 0 &&
    !visto.baixouComChave ? true : 'a chave vazou para o CDN');
  ok('a foto do produto subiu antes, para o produto não virar outro',
    visto.uploads >= 1 && passos[0] === 'foto' ? true : { uploads: visto.uploads, passos });
  ok('a tela recebeu aviso de cada etapa',
    passos.includes('pessoa') && passos.includes('video') && passos.includes('pronta')
      ? true : passos);
  ok('a pessoa é desenhada ANTES do vídeo, não depois',
    passos.indexOf('pessoa') < passos.indexOf('video') ? true : passos);

  /* ================================================== 5) os jeitos de dar errado */
  console.log('\n5) quando dá errado, ele diz o que fazer');
  cena.modo = 'sem-saldo';
  const semSaldo = await H.gerarPedido([{ prompt: 'x' }],
    { confirmado: true, pasta: path.join(TEMP, 'saida2') });
  ok('sem saldo: recusa', semSaldo.ok === false ? true : 'gerou sem saldo');
  ok('e avisa que nada foi cobrado',
    /não foi cobrado|Sem crédito/i.test(semSaldo.motivo) ? true : semSaldo.motivo);
  ok('e manda recarregar', /[Rr]ecarregue/.test(semSaldo.motivo) ? true : semSaldo.motivo);

  cena.modo = 'barrado';
  const barrado = await H.gerarPedido([{ prompt: 'x' }],
    { confirmado: true, pasta: path.join(TEMP, 'saida3') });
  ok('cena barrada: não quebra', barrado.ok === false ? true : 'passou');
  ok('explica que barrado não é cobrado',
    /NÃO é cobrado/.test(barrado.motivo) ? true : barrado.motivo);
  ok('e ensina o conserto (mudar a descrição)',
    /mude a descrição/i.test(barrado.motivo) ? true : barrado.motivo);
  cena.modo = 'normal';

  /* ================================================== 6) sem internet */
  console.log('\n6) sem internet, a culpa é dita direito');
  const baseBoa = process.env.JEV_HIGGS_BASE;
  process.env.JEV_HIGGS_BASE = 'http://127.0.0.1:1';   /* porta que não escuta */
  delete require.cache[require.resolve('./higgsfield.js')];
  const H2 = require('./higgsfield.js');
  const semRede = await H2.estimar('pessoa', { prompt: 'x' });
  ok('não explode', semRede.ok === false ? true : 'passou');
  ok('e o recado fala de internet, não de código de erro',
    /internet|conexão|caiu|achar o endereço/i.test(semRede.motivo) ? true : semRede.motivo);
  process.env.JEV_HIGGS_BASE = baseBoa;

  /* ================================================== 7) esquecer a chave */
  console.log('\n7) o dono pode tirar a chave do computador quando quiser');
  H.esquecerChave();
  ok('o arquivo da chave some', !fs.existsSync(path.join(TEMP, 'chave.json')) ? true : 'ficou');
  const depois = await H.estado();
  ok('e o programa volta a dizer que não tem chave', depois.temChave === false ? true : depois);

  console.log('');
  console.log(falhas ? falhas + ' FALHA(S)' : 'Tudo certo — o plugin não gasta nada sem o dono ver o preço e confirmar.');
  servidor.close();
  try { fs.rmSync(TEMP, { recursive: true, force: true }); } catch (e) {}
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('EXPLODIU:', e); process.exit(1); });

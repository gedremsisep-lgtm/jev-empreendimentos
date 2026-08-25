/* =========================================================================
   SHOPEE AFILIADOS — a única das grandes com API pública de link

   POR QUE ESTA PEÇA EXISTE
   ------------------------
   O dono pediu que as ofertas "peguem meus links de afiliado para sempre
   estarem postando". Das quatro lojas em que ele é afiliado, três não têm
   como fazer isso sozinhas:

     Amazon        — tem fórmula pública (endereço + tag). Já resolvido.
     Mercado Livre — não tem API de afiliado. É reclamação antiga e pública.
     TikTok Shop   — link sai do painel de criador, sem fórmula e sem API.
     Shopee        — TEM Open API oficial, e é o que este arquivo usa.

   Com a Shopee ligada, todo produto Shopee que o garimpo achar vira link de
   afiliado sozinho, para sempre. É o mais perto de "nunca mais colo um link"
   que existe honestamente hoje.

   O QUE ELE PRECISA FAZER UMA VEZ
   -------------------------------
   Pedir o acesso Open API no painel de afiliados da Shopee e guardar aqui
   o App ID e o App Secret. A liberação não é automática e pode demorar
   alguns dias — isso está escrito na tela, não escondido aqui.

   COMO A SHOPEE ASSINA O PEDIDO
   -----------------------------
   Não é "Bearer chave". É uma assinatura calculada a cada chamada:

     Signature = sha256( AppId + Timestamp + Payload + AppSecret )

   e o cabeçalho vai assim:

     Authorization: SHA256 Credential=<AppId>, Timestamp=<ts>, Signature=<hex>

   O segredo NUNCA viaja: ele só entra no cálculo do sha256, do lado de cá.
   Quem recebe o pedido vê o AppId, o horário e o hash — e refaz a mesma
   conta para conferir. Se o segredo vazasse no cabeçalho, qualquer proxy no
   caminho poderia gerar links no nome dele.

   O RELÓGIO IMPORTA
   -----------------
   O timestamp entra na assinatura, e a Shopee recusa pedido velho. Se o
   relógio do computador estiver errado, a resposta é "assinatura inválida"
   — que não parece problema de relógio nenhum. Por isso o recado de erro
   desta peça fala do relógio antes de falar de qualquer outra coisa.
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');

const BASE = process.env.JEV_SHOPEE_BASE || 'https://open-api.affiliate.shopee.com.br/graphql';

function pasta() {
  const p = process.env.JEV_DADOS ||
    path.join(process.env.APPDATA || process.env.HOME || '.', 'jev-empreendimentos');
  try { fs.mkdirSync(p, { recursive: true }); } catch (e) {}
  return p;
}
const arquivoChave = () => path.join(pasta(), 'shopee.json');

/* 0600: só o dono do computador lê. É o mesmo cuidado da chave do
   Higgsfield — com este segredo, alguém geraria links no nome dele e
   embolsaria a comissão dele. */
function guardarChave(appId, segredo) {
  const id = String(appId || '').trim();
  const s = String(segredo || '').trim();
  if (!id || !s) return { ok: false, motivo: 'Preciso do App ID e do App Secret.' };
  try {
    fs.writeFileSync(arquivoChave(), JSON.stringify({ id: id, segredo: s }), { mode: 0o600 });
    try { fs.chmodSync(arquivoChave(), 0o600); } catch (e) {}
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'Não consegui guardar a chave: ' + e.message };
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
/* para a tela mostrar QUAL chave está guardada sem mostrar a chave */
function pontaDaChave() {
  const c = lerChave();
  if (!c) return null;
  const id = String(c.id);
  return { id: id, ponta: id.length > 6 ? id.slice(0, 4) + '…' + id.slice(-2) : id };
}

/* --------------------------------------------------------- a assinatura */
function assinar(appId, segredo, payload, agora) {
  const ts = Math.floor((agora == null ? Date.now() : agora) / 1000);
  const base = String(appId) + String(ts) + String(payload) + String(segredo);
  const assinatura = crypto.createHash('sha256').update(base, 'utf8').digest('hex');
  return {
    timestamp: ts,
    assinatura: assinatura,
    cabecalho: 'SHA256 Credential=' + appId + ', Timestamp=' + ts + ', Signature=' + assinatura
  };
}

function recadoDoErro(status, j, texto) {
  const msg = (j && (j.message || j.error || (j.errors && j.errors[0] && j.errors[0].message))) ||
              String(texto || '').slice(0, 200);
  if (status === 401 || status === 403 || /signature|unauthor|invalid.*credential/i.test(msg))
    return 'A Shopee recusou a assinatura. Nesta ordem, é quase sempre: (1) o relógio ' +
           'do computador está fora da hora certa — a assinatura leva o horário dentro; ' +
           '(2) o App Secret foi colado com um espaço a mais; (3) o acesso Open API ainda ' +
           'não foi liberado para a sua conta. Recado da Shopee: ' + msg;
  if (status === 429)
    return 'A Shopee pediu para esperar — muitos pedidos seguidos. Tente daqui a pouco.';
  if (status >= 500)
    return 'A Shopee está com problema no lado dela (' + status + '). Não é o seu computador.';
  return 'A Shopee respondeu ' + status + ': ' + msg;
}

function recadoDeRede(e) {
  const c = (e && e.code) || '';
  if (c === 'ENOTFOUND') return 'Este computador não achou o endereço da Shopee. Sem internet, ou o DNS está bloqueando.';
  if (c === 'ECONNREFUSED') return 'A conexão foi recusada. Costuma ser firewall ou antivírus com filtro de rede ligado.';
  if (c === 'ETIMEDOUT' || /timeout|demorou/i.test(String(e && e.message)))
    return 'A Shopee não respondeu a tempo. Tente de novo daqui a pouco.';
  return 'Não consegui falar com a Shopee: ' + ((e && e.message) || e);
}

/* ------------------------------------------------------------- o pedido */
function pedir(consulta, variaveis) {
  return new Promise(function (resolve) {
    const chave = lerChave();
    if (!chave) return resolve({ ok: false, semChave: true,
      motivo: 'Nenhuma chave da Shopee está configurada neste computador.' });

    const payload = JSON.stringify({ query: consulta, variables: variaveis || {} });
    const a = assinar(chave.id, chave.segredo, payload);

    let alvo;
    try { alvo = new URL(BASE); }
    catch (e) { return resolve({ ok: false, motivo: 'Endereço inválido: ' + BASE }); }

    const dados = Buffer.from(payload, 'utf8');
    /* http no teste, https na vida real — o mesmo caminho dos dois lados */
    const mod = alvo.protocol === 'http:' ? require('http') : https;
    const req = mod.request({
      protocol: alvo.protocol, hostname: alvo.hostname,
      port: alvo.port || (alvo.protocol === 'http:' ? 80 : 443),
      path: alvo.pathname + alvo.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dados.length,
        'Authorization': a.cabecalho
      },
      timeout: 30000
    }, function (res) {
      const pedacos = [];
      res.on('data', function (d) { pedacos.push(d); });
      res.on('end', function () {
        const cru = Buffer.concat(pedacos).toString('utf8');
        let j = null;
        try { j = JSON.parse(cru); } catch (e) {}
        if (res.statusCode >= 300)
          return resolve({ ok: false, status: res.statusCode,
                           motivo: recadoDoErro(res.statusCode, j, cru) });
        /* GraphQL devolve 200 mesmo quando deu errado: o erro vem no corpo */
        if (j && j.errors && j.errors.length)
          return resolve({ ok: false, status: 200,
                           motivo: recadoDoErro(200, j, cru) });
        resolve({ ok: true, status: res.statusCode, dados: j && j.data });
      });
    });
    req.setTimeout(30000, function () { req.destroy(new Error('demorou demais')); });
    req.on('error', function (e) { resolve({ ok: false, motivo: recadoDeRede(e) }); });
    req.write(dados);
    req.end();
  });
}

/* --------------------------------------------------------------- o link */
const MUT_LINK =
  'mutation($input: GenerateShortLinkInput!){ generateShortLink(input: $input){ shortLink } }';

/* Um subId é uma etiqueta que volta no relatório de comissão da Shopee.
   Marcando "jev-grupo", ele consegue ver quanto o grupo do WhatsApp rendeu
   separado do resto — sem isso, tudo vira um bolo só e não dá para saber
   se o grupo vale o trabalho. */
function limparSubId(s) {
  return String(s || 'jev').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50) || 'jev';
}

async function gerarLink(urlProduto, subId) {
  const u = String(urlProduto || '').trim();
  if (!/^https?:\/\/(www\.)?shopee\.com\.br\//i.test(u))
    return { ok: false, motivo: 'Este endereço não é de um produto da Shopee Brasil.' };

  const r = await pedir(MUT_LINK, { input: { originUrl: u, subIds: [limparSubId(subId)] } });
  if (!r.ok) return r;

  const link = r.dados && r.dados.generateShortLink && r.dados.generateShortLink.shortLink;
  if (!link) return { ok: false, motivo: 'A Shopee respondeu, mas sem o link dentro.' };
  return { ok: true, link: link };
}

async function estado() {
  const p = pontaDaChave();
  if (!p) return { ok: true, temChave: false,
    recado: 'Guarde o App ID e o App Secret do painel de afiliados da Shopee. ' +
            'O acesso Open API precisa ser liberado por eles antes de funcionar.' };
  /* uma chamada mínima só para dizer se a chave presta */
  const r = await gerarLink('https://shopee.com.br/', 'jev-teste');
  return { ok: true, temChave: true, chave: p.ponta,
           valendo: !!r.ok,
           recado: r.ok ? 'Chave conferida — a Shopee está gerando links.' : r.motivo };
}

/* gera vários de uma vez, com uma pausa entre eles para não levar 429 */
async function gerarVarios(lista, subId, aoAndar) {
  const itens = Array.isArray(lista) ? lista : [];
  const saida = [];
  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    const r = await gerarLink(it.url, subId);
    saida.push({ id: it.id, nome: it.nome, ok: !!r.ok,
                 link: r.link || '', motivo: r.motivo || '' });
    if (typeof aoAndar === 'function') { try { aoAndar(i + 1, itens.length, it.nome); } catch (e) {} }
    if (i < itens.length - 1) await new Promise(function (r2){ setTimeout(r2, 350); });
  }
  return { ok: true, resultados: saida,
           feitos: saida.filter(function (x){ return x.ok; }).length };
}

module.exports = {
  guardarChave, lerChave, esquecerChave, pontaDaChave,
  assinar, limparSubId, recadoDoErro, recadoDeRede,
  pedir, gerarLink, gerarVarios, estado, BASE
};

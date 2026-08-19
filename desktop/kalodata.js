/* =========================================================================
   GARIMPO PELO KALODATA

   POR QUE ESTA PEÇA EXISTE

   O garimpo lia a página das lojas. Funcionava na Amazon, na Shopee e no
   Mercado Livre, e NÃO funcionava no TikTok Shop — que é justamente onde
   estão os produtos que a JeV promove. Primeiro achamos que era a loja
   barrando robô. Não era: o domínio do TikTok inteiro está inalcançável do
   computador do dono (a conexão morre antes de qualquer conversa). Nenhuma
   linha de código conserta isso.

   O Kalodata resolve por um caminho lateral, e é por isso que ele virou a
   fonte principal:

     1. o site abre normalmente naquele computador — foi testado;
     2. ele já traz os números que interessam para escolher produto:
        receita, itens vendidos, comissão, nota, quantos criadores estão
        promovendo, e a tendência dos últimos 30 dias;
     3. e — o que destrava tudo — ele guarda a FOTO do produto no CDN
        dele, em endereço limpo e previsível:

            https://img.kalocdn.com/tiktok.product/<id>/cover.png

        sem token, sem assinatura, e alcançável mesmo com o TikTok fora do
        ar. Foi conferido: 5 de 5 capas baixaram.

   O QUE ESTA PEÇA NÃO FAZ

   Não faz login por você. A janela abre, VOCÊ entra na sua conta, e a
   sessão fica guardada para as próximas vezes. Senha é sua.

   Não passa por verificação de robô e não clica em nada na página. Só lê.

   E não inventa dado: se a sua conta é de nível Prova, o Kalodata devolve
   preço e comissão zerados e limita a lista a 10 produtos. Quando isso
   acontece, o programa avisa em vez de mostrar R$ 0,00 como se fosse real.
   ========================================================================= */
const { BrowserWindow } = require('electron');

const BASE = 'https://www.kalodata.com';
const CDN_CAPA = 'https://img.kalocdn.com/tiktok.product/';
const PARTICAO = 'persist:jev-loja';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function capaDoProduto(id) { return CDN_CAPA + String(id) + '/cover.png'; }

/* ------------------------------------------------------------- datas
   O Kalodata recusa o pedido quando o intervalo não cabe no que o plano
   permite ("Query exceeds span"). 30 dias é a janela que todo plano aceita,
   e é também a que dá o número mais vendável: "X vendidos em 30 dias".   */
function doisDigitos(n) { return (n < 10 ? '0' : '') + n; }

function comoData(d) {
  return d.getUTCFullYear() + '-' + doisDigitos(d.getUTCMonth() + 1) + '-' +
         doisDigitos(d.getUTCDate());
}

function janelaDeDatas(dias, agora) {
  const fim = new Date((agora || Date.now()) - 24 * 3600 * 1000);   // ontem
  const ini = new Date(fim.getTime() - (Math.max(1, dias || 30) - 1) * 24 * 3600 * 1000);
  return { startDate: comoData(ini), endDate: comoData(fim) };
}

/* ------------------------------------------------- a nota de afiliado

   Isto é o "afiliado por IA": em vez de o dono ler cinco colunas e adivinhar,
   o programa dá UMA nota de 0 a 100 e diz por que deu.

   O peso maior é do GANHO POR VENDA, não da receita da loja. Um produto que
   faturou milhões com 3% de comissão num item de R$ 20 rende sessenta
   centavos por venda — trabalho de graça. O que enche o bolso do afiliado é
   reais no bolso vezes quantidade que sai.

   Os outros sinais entram como confirmação, não como protagonista:
   quantidade vendida prova que o produto tem saída; a nota prova que não vai
   voltar em devolução; e MUITOS criadores já promovendo é sinal dividido —
   prova que converte, mas também que a briga está cheia.                  */
function nota(p) {
  const preco = Number(p.unit_price) || 0;
  const com = Number(p.commission_rate) || 0;
  const vend = Number(p.sale) || 0;
  const rat = Number(p.product_rating) || 0;
  const cri = Number(p.creator_num) || 0;
  const ganho = preco * com;

  const partes = {
    ganho: Math.min(ganho / 20, 1) * 40,        // R$ 20 por venda = nota cheia
    saida: Math.min(vend / 20000, 1) * 25,      // 20 mil vendidos = nota cheia
    comissao: Math.min(com / 0.25, 1) * 20,     // 25% = nota cheia
    aprovacao: Math.max(0, Math.min((rat - 4) / 0.9, 1)) * 10,
    concorrencia: (cri > 0 && cri < 400 ? 5 : cri >= 400 ? 2 : 0)
  };
  const total = Object.values(partes).reduce((s, x) => s + x, 0);
  return { nota: Math.round(total * 10) / 10, ganho: Math.round(ganho * 100) / 100, partes };
}

/* por que essa nota — em português, para aparecer no cartão */
function porque(p) {
  const n = nota(p);
  const vend = Number(p.sale) || 0;
  const com = Math.round((Number(p.commission_rate) || 0) * 100);
  const cri = Number(p.creator_num) || 0;
  const rat = Number(p.product_rating) || 0;
  const r = [];
  if (n.ganho >= 15) r.push('rende R$ ' + n.ganho.toFixed(2) + ' por venda, que é dinheiro de verdade');
  else if (n.ganho > 0) r.push('rende R$ ' + n.ganho.toFixed(2) + ' por venda');
  if (vend >= 20000) r.push(qtd(vend) + ' vendidos em 30 dias — tem saída provada');
  else if (vend >= 3000) r.push(qtd(vend) + ' vendidos em 30 dias');
  if (com >= 20) r.push('comissão de ' + com + '%, acima da média');
  if (rat >= 4.7) r.push('nota ' + String(rat).replace('.', ',') + ' de quem comprou, risco baixo de devolução');
  if (cri >= 400) r.push('mas já tem ' + qtd(cri) + ' criadores promovendo — a briga está cheia');
  else if (cri > 0 && cri < 400) r.push('só ' + qtd(cri) + ' criadores promovendo — ainda dá para entrar');
  return r;
}

function qtd(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' mi';
  if (n >= 1000) return Math.round(n / 1000) + ' mil';
  return String(n);
}

/* o número grande que vira cartela no vídeo */
function provaDoProduto(p) {
  const vend = Number(p.sale) || 0;
  const rat = Number(p.product_rating) || 0;
  const provas = [];
  if (vend >= 1000) provas.push({ numero: qtd(vend).toUpperCase(), rotulo: 'vendidos em 30 dias' });
  if (rat >= 4.5) provas.push({ numero: String(rat).replace('.', ','), rotulo: 'nota de quem já comprou' });
  const cri = Number(p.creator_num) || 0;
  if (cri >= 50) provas.push({ numero: qtd(cri), rotulo: 'criadores já promovendo' });
  return provas;
}

/* ------------------------------------------------------- a janela

   Uma janela só, reaproveitada. Ela carrega o Kalodata na mesma sessão
   guardada (persist:jev-loja), então o login feito uma vez continua valendo
   nas próximas aberturas — inclusive depois de fechar o programa.         */
let janela = null;

async function abrir(mostrar) {
  if (janela && !janela.isDestroyed()) {
    if (mostrar) { try { janela.show(); janela.focus(); } catch (e) {} }
    return janela;
  }
  janela = new BrowserWindow({
    show: !!mostrar,
    width: 1280, height: 900,
    title: 'JeV — Kalodata',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      partition: PARTICAO, backgroundThrottling: false
    }
  });
  janela.on('closed', () => { janela = null; });
  await janela.loadURL(BASE + '/product', { userAgent: UA });
  await esperar(mostrar ? 1500 : 3500);
  return janela;
}

function fechar() {
  try { if (janela && !janela.isDestroyed()) janela.destroy(); } catch (e) {}
  janela = null;
  return true;
}

/* roda um fetch DENTRO da página do Kalodata, com os cookies dela */
async function pedir(caminho, corpo, metodo) {
  const j = await abrir(false);
  const script =
    '(async () => { try {' +
    '  const r = await fetch(' + JSON.stringify(caminho) + ', {' +
    '    method: ' + JSON.stringify(metodo || 'POST') + ', credentials: "include",' +
    '    headers: {"Content-Type":"application/json"},' +
    (corpo ? '    body: ' + JSON.stringify(JSON.stringify(corpo)) + '' : '') +
    '  });' +
    '  const t = await r.text();' +
    '  try { return { http: r.status, corpo: JSON.parse(t) }; }' +
    '  catch (e) { return { http: r.status, texto: t.slice(0, 400) }; }' +
    '} catch (e) { return { erro: String(e && e.message || e) }; } })()';
  return await j.webContents.executeJavaScript(script, true);
}

/* ------------------------------------------------------------- estado */
async function estado() {
  let r;
  try { r = await pedir('/user/queryProfile', {}, 'POST'); }
  catch (e) { return { conectado: false, motivo: 'não consegui abrir o Kalodata: ' + (e && e.message) }; }

  if (r && r.erro)
    return { conectado: false, motivo: 'o Kalodata não respondeu (' + r.erro + ')' };
  if (!r || r.http !== 200)
    return { conectado: false, motivo: 'o Kalodata respondeu ' + (r && r.http) };

  const d = r.corpo && r.corpo.data;
  if (!d || (!d.email && !d.userId && !d.id))
    return { conectado: false, motivo: 'você ainda não entrou na sua conta do Kalodata' };

  return { conectado: true, motivo: '', conta: String(d.email || d.userName || '') };
}

/* -------------------------------------------------------- os produtos */
async function garimpar(opcoes) {
  const o = opcoes || {};
  const quantos = Math.min(Math.max(Number(o.quantos) || 10, 1), 50);
  const datas = janelaDeDatas(o.dias || 30, o.agora);

  const est = await estado();
  if (!est.conectado) return { ok: false, achados: [], precisaEntrar: true, motivo: est.motivo };

  let r;
  try { r = await pedir('/product/queryList',
    { page: 1, pageSize: quantos, startDate: datas.startDate, endDate: datas.endDate }); }
  catch (e) { return { ok: false, achados: [], motivo: String((e && e.message) || e) }; }

  if (r && r.erro) return { ok: false, achados: [], motivo: r.erro };
  const c = r && r.corpo;
  if (!c) return { ok: false, achados: [], motivo: 'o Kalodata devolveu uma resposta que eu não entendi' };

  if (!c.success) {
    let m = String(c.message || '');
    try { m = JSON.parse(m).message || m; } catch (e) {}
    const limite = /Upgrade|Exceeded|pagination/i.test(m);
    return { ok: false, achados: [], limitePlano: limite, motivo: limite
      ? 'o seu plano do Kalodata só deixa ver ' + (quantos > 10 ? 'até 10' : 'esta quantidade de') +
        ' produtos por vez (' + m + ')'
      : ('o Kalodata recusou o pedido: ' + m) };
  }

  const lista = Array.isArray(c.data) ? c.data : [];
  const achados = lista.map(p => {
    const n = nota(p);
    return {
      id: String(p.id || ''),
      nome: String(p.product_title || '').trim(),
      capa: capaDoProduto(p.id),
      preco: Number(p.unit_price) || 0,
      comissao: Number(p.commission_rate) || 0,
      ganho: n.ganho,
      vendidos: Number(p.sale) || 0,
      receita: Number(p.revenue) || 0,
      rating: Number(p.product_rating) || 0,
      criadores: Number(p.creator_num) || 0,
      lancamento: String(p.launch_date || ''),
      nota: n.nota,
      porque: porque(p),
      provas: provaDoProduto(p),
      periodo: datas
    };
  }).sort((a, b) => b.nota - a.nota);

  /* Plano Prova devolve preço e comissão zerados. Mostrar "R$ 0,00 por
     venda" como se fosse verdade seria mentira por omissão. */
  const semDinheiro = achados.length > 0 && achados.every(a => a.preco === 0 && a.comissao === 0);

  return {
    ok: achados.length > 0,
    achados, periodo: datas, semDinheiro,
    motivo: achados.length ? '' : 'o Kalodata não devolveu nenhum produto neste período',
    aviso: semDinheiro
      ? 'O seu plano do Kalodata não libera preço nem comissão — esses campos vieram zerados. ' +
        'A nota foi calculada só com o que veio: vendas, avaliação e concorrência. ' +
        'Com o plano pago, a nota fica bem melhor, porque o ganho por venda é o que mais pesa.'
      : ''
  };
}

module.exports = {
  estado, garimpar, abrir, fechar, capaDoProduto,
  nota, porque, provaDoProduto, janelaDeDatas, qtd, comoData
};

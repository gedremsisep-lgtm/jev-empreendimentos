/* =========================================================================
   test_daytrade.js — o módulo Day-Trade (Bolsa e Cripto)

   A tela não calcula nada: pede o estado ao motor da sede e manda comandos do
   dono. Os riscos que este teste trava:

   1. ENTRAR NO FINANCEIRO. Day-Trade fica fora de UNIDADES, como Software.
   2. QUEM NÃO É DONO VER. Só o perfil de gestão (g) tem a tela.
   3. A TELA MENTIR SOBRE DINHEIRO. Simulação tem de dizer "fictício"; fase
      real tem de dizer que quem executa é o dono; ir para o real sem os
      critérios tem de mandar o "ENTENDO O RISCO" ao motor.
   4. QUEBRAR NO NAVEGADOR. Sem o aplicativo, a tela explica e não chama nada.

   Usa o estado de verdade que o motor devolveu (_dt_estado.json) e um estado
   "cheio" montado a partir dele.
     node test_daytrade.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};

const VAZIO = JSON.parse(fs.readFileSync(path.join(__dirname, '_dt_estado.json'), 'utf8'));
function cheio() {
  const e = JSON.parse(JSON.stringify(VAZIO));
  const b = e.bolsa;
  b.estrategia = { id: 'rompimento', parametros: { janela: 20, alvoR: 2 }, desde: '2026-11-10T12:00:00Z', veredito: 'forte',
    testeResumo: { operacoes: 41, resultadoBRL: 812.4, fatorLucro: 1.38, dsr: 0.93 } };
  b.diario = [
    { em: '2026-11-20T13:10:00Z', ativo: 'WIN', lado: 'compra', motivo: 'alvo', resultadoBRL: 120, real: false },
    { em: '2026-11-20T15:40:00Z', ativo: 'WDO', lado: 'venda', motivo: 'stop', resultadoBRL: -60, real: false },
    { em: '2026-11-21T14:00:00Z', ativo: 'WIN', lado: 'compra', motivo: 'zeragem', resultadoBRL: 35, real: false },
  ];
  b.posicoes = [{ id: 'ps-1', ativo: 'WIN', lado: 'compra', qtd: 1, entrada: 128450, stop: 128200, alvo: 128950, motivo: 'rompeu a máxima de 20 velas' }];
  b.trava = { ativa: true, motivo: 'perdeu 2,5% no dia' };
  const c = e.cripto;
  c.fase = 'real_pequeno'; c.nomeFase = 'Real pequeno'; c.capitalReal = 2000;
  c.estrategia = { id: 'momento', parametros: { janela: 12 }, desde: '2026-11-15T00:00:00Z', veredito: 'fraca_mas_positiva', testeResumo: { operacoes: 33, resultadoBRL: 140, fatorLucro: 1.15, dsr: 0.7 } };
  c.ordensPendentes = [
    { id: 'or-a', ativo: 'BTCUSDT', lado: 'compra', qtd: 0.0021, entradaRef: 489000, stop: 485000, alvo: 497000, motivo: 'momento positivo', validaAte: '2026-11-23T20:30:00Z', estado: 'preparada' },
    { id: 'or-b', ativo: 'ETHUSDT', lado: 'compra', qtd: 0.05, entradaRef: 17800, entrada: 17790, stop: 17600, alvo: 18200, motivo: '', validaAte: '2026-11-23T20:30:00Z', estado: 'executada' },
  ];
  e.laboratorio.tentativas = { bolsa: 26, cripto: 9 };
  e.laboratorio.ultimo = {
    bolsa: { em: '2026-11-23T22:00:00Z', mercado: 'bolsa', tentativas: 26, cortadas: 0, periodo: '2026-08-25 a 2026-11-21', diasTreino: 40, diasTeste: 20,
      aprovada: true, veredito: 'forte', motivos: ['ganhou no teste com custos', 'Sharpe deflacionado 93%'], aoVivo: { operacoes: 3, resultadoBRL: 95, fatorLucro: 2.5 },
      decisao: 'trocada na simulação (dinheiro fictício)',
      ranking: [{ estrategia: 'rompimento', parametros: { janela: 20, alvoR: 2 }, origem: 'grade', treino: { resultadoBRL: 1500, operacoes: 80, fatorLucro: 1.5 }, teste: { resultadoBRL: 812.4, operacoes: 41, fatorLucro: 1.38 } },
                { estrategia: 'reversao', parametros: { z: 2 }, origem: 'proposta de pesquisador-quant', treino: { resultadoBRL: 900, operacoes: 60, fatorLucro: 1.2 }, teste: { resultadoBRL: -210, operacoes: 30, fatorLucro: 0.8 } }] },
    cripto: { em: '2026-11-23T22:05:00Z', erro: 'sem dados de mercado: Binance recusou' },
  };
  e.laboratorio.candidata = { cripto: { id: 'cruzamento', parametros: { rapida: 9, lenta: 21 } } };
  e.laboratorio.propostas = [{ estrategia: 'reversao', mercado: 'bolsa', parametros: { z: 2.5 }, motivo: 'z maior filtra ruído', de: 'pesquisador-quant', em: '2026-11-24T10:00:00Z' }];
  e.laboratorio.historico = [{ em: '2026-11-23T22:00:00Z', mercado: 'bolsa', melhor: { estrategia: 'rompimento', teste: { resultadoBRL: 812.4 } }, decisao: 'trocada na simulação' }];
  return e;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof go === 'function' && typeof dtRender === 'function', null, { timeout: 15000 });
  await page.evaluate(() => { if (typeof entrar === 'function') try { CU = 'g'; } catch (e) {} });
  await page.waitForTimeout(800);

  console.log('— lugar no sistema —');
  const lugar = await page.evaluate(() => ({
    fora: !UNIDADES.some(u => u.id === 'daytrade'),
    nav: unidadeDaPagina('dt') === DAYTRADE,
    g: PERMS.g.includes('dt'), o: PERMS.o.includes('dt'), c: (PERMS.c || []).includes('dt'),
  }));
  t('fica fora de UNIDADES (não entra no rateio)', lugar.fora);
  t('mas entra na navegação', lugar.nav);
  t('só o perfil de gestão vê', lugar.g && !lugar.o && !lugar.c, JSON.stringify(lugar));

  console.log('— no navegador, sem o aplicativo —');
  const nav = await page.evaluate(async () => {
    delete window.JeVDesktop; CU = 'g';
    await go('hub'); await new Promise(r => setTimeout(r, 500));
    const card = [...document.querySelectorAll('#hub-root .ucard')].find(c => /Day-Trade/.test(c.innerText));
    await go('dt'); await new Promise(r => setTimeout(r, 300));
    const txt = document.getElementById('dt-root').innerText;
    DT_ABA = 'como'; await dtRender();
    const como = document.getElementById('dt-root').innerText;
    DT_ABA = 'bolsa';
    return { card: !!card, cardTxt: card ? card.innerText : '', txt, como };
  });
  t('o card aparece no Início', nav.card);
  t('o card avisa que roda no app do Windows', /app do Windows/.test(nav.cardTxt), nav.cardTxt);
  t('a tela explica em vez de quebrar', /aplicativo do Windows/.test(nav.txt));
  t('a aba Como funciona abre até no navegador', /A maioria perde/.test(nav.como) && /ENTENDO O RISCO/.test(nav.como));

  /* app falso, que guarda os comandos recebidos */
  async function comApp(estado) {
    await page.evaluate((est) => {
      window.__cmds = [];
      window.__est = est;
      window.JeVDesktop = { ehAplicativo: true, dtRodar: async (cmd, arg) => { window.__cmds.push([cmd, arg]); return cmd === 'estado' ? window.__est : { ok: true, msg: 'feito' }; } };
    }, estado);
  }

  console.log('— estado real do motor (começando do zero) —');
  await comApp(VAZIO);
  const v = await page.evaluate(async () => {
    await go('hub'); await new Promise(r => setTimeout(r, 500));
    const card = [...document.querySelectorAll('#hub-root .ucard')].find(c => /Day-Trade/.test(c.innerText));
    DT_ABA = 'bolsa'; await go('dt'); await new Promise(r => setTimeout(r, 300));
    const b = document.getElementById('dt-root').innerText;
    dtAba('cripto'); const c = document.getElementById('dt-root').innerText;
    dtAba('lab'); const l = document.getElementById('dt-root').innerText;
    dtAba('imposto'); const i = document.getElementById('dt-root').innerText;
    return { card: card.innerText, b, c, l, i };
  });
  t('o card mostra a fase da bolsa', /Simulação ao vivo/.test(v.card), v.card);
  t('bolsa sem estratégia diz que está de fora', /De fora do mercado/.test(v.b));
  t('simulação diz que o dinheiro é fictício', /fictício/.test(v.b));
  t('mostra os critérios para ir ao real', /pelo menos 30 operações simuladas/.test(v.b));
  t('cripto tem a escolha de corretora nacional/exterior', /Corretora nacional/.test(v.c) && /exterior/.test(v.c));
  t('laboratório mostra o limite de tentativas', /tentativas por semana/.test(v.l));
  t('imposto sem operação real não inventa número', /Nenhuma operação real ainda/.test(v.i));

  console.log('— estado cheio —');
  await comApp(cheio());
  const f = await page.evaluate(async () => {
    DT_ABA = 'bolsa'; await dtRender();
    const r = document.getElementById('dt-root');
    const b = r.innerText, curva = !!r.querySelector('svg path');
    dtAba('cripto'); const c = document.getElementById('dt-root').innerText;
    dtAba('lab'); const l = document.getElementById('dt-root').innerText;
    return { b, curva, c, l };
  });
  t('trava aparece com o motivo', /Mercado travado/.test(f.b) && /2,5% no dia/.test(f.b));
  t('estratégia em uso com nome e veredito', /Rompimento|rompimento/i.test(f.b) && /Forte/.test(f.b));
  t('posição simulada aparece', /128450/.test(f.b.replace(/\D/g, '')) || /128450\.00/.test(f.b));
  t('a curva de resultado é desenhada', f.curva);
  t('fase real avisa que quem executa é o dono', /quem executa na corretora é você/.test(f.c));
  t('ordem preparada tem Executei e Não executei', /Executei/.test(f.c) && /Não executei/.test(f.c));
  t('ordem executada tem Encerrei', /Encerrei/.test(f.c));
  t('ranking do laboratório aparece com a proposta marcada', /proposta/.test(f.l) && /Forte/.test(f.l));
  t('erro do laboratório de cripto aparece', /Binance recusou/.test(f.l));
  t('candidata esperando o dono', /Candidata nova esperando você/.test(f.l));
  t('ideias dos agentes listadas', /z maior filtra ruído/.test(f.l));

  console.log('— comandos do dono chegam certos ao motor —');
  const cm = await page.evaluate(async () => {
    window.__cmds = [];
    dtAba('bolsa');
    dtDestravar('bolsa'); await document.getElementById('mkc-ok').onclick(); await new Promise(r => setTimeout(r, 50));
    dtAba('cripto');
    dtOrdem('cripto', 'or-a', 'executada'); document.getElementById('dto-preco').value = '489100';
    await dtOrdemSalvar('cripto', 'or-a', 'executada');
    dtAba('bolsa');
    dtFormFase('bolsa'); document.getElementById('dtf-f').value = 'real_pequeno';
    document.getElementById('dtf-cap').value = '1500'; document.getElementById('dtf-ok').value = 'entendo o risco';
    await dtSalvarFase('bolsa');
    dtFormLimites('bolsa'); document.getElementById('dtl-r').value = '0.5';
    await dtSalvarLimites('bolsa');
    return window.__cmds.filter(c => c[0] !== 'estado');
  });
  const acoes = cm.map(c => c[1] && c[1].acao);
  t('destravar manda a ação certa', acoes.includes('destravar'), JSON.stringify(acoes));
  const ex = cm.find(c => c[1] && c[1].acao === 'ordem_executada');
  t('ordem executada vai com id e preço', ex && ex[1].id === 'or-a' && ex[1].preco === 489100, JSON.stringify(ex));
  const fa = cm.find(c => c[1] && c[1].acao === 'fase');
  t('ir para o real leva capital e ENTENDO O RISCO', fa && fa[1].capitalRealBRL === 1500 && fa[1].cienteDoRisco === 'ENTENDO O RISCO', JSON.stringify(fa));
  const li = cm.find(c => c[1] && c[1].acao === 'limites');
  t('limites vão em fração (0,5% → 0.005)', li && Math.abs(li[1].limites.riscoPorOperacaoPct - 0.005) < 1e-9, JSON.stringify(li));

  console.log('— motor fora do ar —');
  await page.evaluate(() => { window.JeVDesktop = { ehAplicativo: true, dtRodar: async () => ({ ok: false, erro: 'sede não encontrada' }) }; });
  const fora = await page.evaluate(async () => { DT_ABA = 'bolsa'; await dtRender(); return document.getElementById('dt-root').innerText; });
  t('diz que não falou com o motor, com o motivo', /Não consegui falar com o motor/.test(fora) && /sede não encontrada/.test(fora));

  await comApp(cheio());
  await page.evaluate(async () => { DT_ABA = 'bolsa'; await dtRender(); });
  await page.screenshot({ path: path.join(__dirname, 'dt_bolsa.png'), fullPage: true });
  await page.evaluate(() => dtAba('cripto')); await page.screenshot({ path: path.join(__dirname, 'dt_cripto.png'), fullPage: true });
  await page.evaluate(() => dtAba('lab')); await page.screenshot({ path: path.join(__dirname, 'dt_lab.png'), fullPage: true });
  await page.evaluate(async () => { await go('hub'); }); await page.waitForTimeout(3800);
  const cardEl = await page.$('#hub-root .ucard:last-of-type'); await cardEl.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(__dirname, 'dt_hub.png') });

  t('nenhum erro de script na página', erros.length === 0, erros.join(' | '));
  await browser.close();
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

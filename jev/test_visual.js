/* =========================================================================
   test_visual.js — os visuais desenhados por código têm de desenhar mesmo.

   Não basta a página existir: ela precisa responder a setFrame(f) mudando
   o que está na tela. Um visual que devolve o mesmo pixel em todo quadro é
   um vídeo parado, e isso passa despercebido até alguém assistir.

     node test_visual.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jevvis-'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => { fail++; console.log('  FALHA erro de página: ' + e.message); });
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 20000 });

  console.log('\n— a ficha vira página —');

  const fichas = {
    contador: { forma: 'contador', rotulo: 'SELIC', titulo: 'O quinto corte vale quanto?',
      valor: 25.0, prefixo: 'R$ ', segundos: 4, legenda: 'por ano, em R$ 10 mil',
      premissa: 'Base R$ 10.000 · IR 17,5%', fonte: 'Copom 16/09/2026',
      etapas: [{ rotulo: 'por mês', valor: 'R$ 2,08' }, { rotulo: 'após IR', valor: 'R$ 1,72' }] },
    escada: { forma: 'escada', rotulo: 'CET MENSAL', titulo: 'A escada do crédito',
      segundos: 4, limite: 8, limiteRotulo: 'TETO DO CHEQUE ESPECIAL', sufixo: '%',
      degraus: [{ rotulo: 'Parcelado sem juros', valor: 0 }, { rotulo: 'Pix parcelado', valor: 12.8 },
                { rotulo: 'Rotativo', valor: 14.9 }] },
    tabela: { forma: 'tabela', rotulo: 'SUBTRAÇÃO', titulo: 'O que sobra de verdade',
      segundos: 4, prefixo: 'R$ ', resumoRotulo: 'Sobra',
      linhas: [{ desc: 'Rendimento bruto', valor: 1000 }, { desc: 'Imposto de renda', valor: -175 },
               { desc: 'Inflação', valor: -430 }] },
    regua: { forma: 'regua', rotulo: 'TESTE DE UMA LINHA', titulo: 'O consignado está dentro da lei?',
      segundos: 4, valor: 1.4, limite: 1.0, sufixo: ' p.p.', casas: 2,
      foraTexto: 'fora do que a norma autoriza' },
    barras: { forma: 'barras', rotulo: 'CUSTO EM 12X', titulo: 'R$ 1.000 em cada modalidade',
      segundos: 4, prefixo: 'R$ ',
      itens: [{ rotulo: 'Sem juros', valor: 1000 }, { rotulo: 'Pix parcelado', valor: 1592 },
              { rotulo: 'Rotativo', valor: 2140 }] },
  };

  const r = await page.evaluate((f) => {
    const saida = {};
    for (const k of Object.keys(f)) {
      const v = visualHTML(f[k]);
      saida[k] = { ok: v.ok, motivo: v.motivo, quadros: v.quadros, segundos: v.segundos,
                   forma: v.forma, tamanho: v.ok ? v.html.length : 0, html: v.ok ? v.html : '' };
    }
    saida.__ruim = visualHTML({ forma: 'inexistente' });
    saida.__vazio = visualHTML(null);
    saida.__peca = (() => { const p = visualPeca(Object.values(f));
                            return { ok: p.ok, n: p.visuais.length, segundos: p.segundos, quadros: p.quadros, erros: p.erros }; })();
    saida.__eco = visualEconomia(600);
    return saida;
  }, fichas);

  for (const k of Object.keys(fichas)) {
    t(`${k}: a ficha virou página`, r[k].ok, r[k].motivo);
    t(`${k}: ${r[k].quadros} quadros para ${r[k].segundos}s a 30fps`,
      r[k].ok && r[k].quadros === r[k].segundos * 30, r[k].quadros + ' quadros');
  }
  t('forma desconhecida é recusada com nome', r.__ruim.ok === false && /inexistente/.test(r.__ruim.motivo));
  t('ficha vazia é recusada', r.__vazio.ok === false);
  t('a peça inteira soma os 5 visuais', r.__peca.ok && r.__peca.n === 5, JSON.stringify(r.__peca.erros));
  t('a peça soma 20s e 600 quadros', r.__peca.segundos === 20 && r.__peca.quadros === 600,
    r.__peca.segundos + 's / ' + r.__peca.quadros);
  t('a economia de 10min é 1.200 créditos', r.__eco.creditosIA === 1200 && r.__eco.creditosAqui === 0,
    JSON.stringify(r.__eco));

  console.log('\n— a página RESPONDE a setFrame, num navegador de verdade —');

  for (const k of Object.keys(fichas)) {
    const arq = path.join(TMP, k + '.html');
    fs.writeFileSync(arq, r[k].html);
    const p2 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const erros = [];
    p2.on('pageerror', e => erros.push(e.message));
    await p2.goto('file://' + arq);

    const contrato = await p2.evaluate(() => ({
      total: typeof window.TOTAL_FRAMES === 'number' ? window.TOTAL_FRAMES : null,
      temSet: typeof window.setFrame === 'function',
    }));
    t(`${k}: declara TOTAL_FRAMES e setFrame`,
      contrato.total === r[k].quadros && contrato.temSet, JSON.stringify(contrato));
    t(`${k}: nenhum erro de JavaScript na página`, erros.length === 0, erros.join(' | '));

    /* três quadros: começo, meio e fim. Se os três forem iguais, o visual
       está parado — e um vídeo parado passa despercebido até alguém ver. */
    const tiros = [];
    for (const f of [0, Math.floor(contrato.total / 2), contrato.total - 1]) {
      await p2.evaluate(n => window.setFrame(n), f);
      tiros.push((await p2.screenshot({ type: 'png' })).toString('base64'));
    }
    t(`${k}: o quadro do meio difere do primeiro`, tiros[0] !== tiros[1]);
    t(`${k}: o último quadro difere do meio`, tiros[1] !== tiros[2]);

    /* o quadro final tem de mostrar o número cheio, não 40% dele */
    const fim = await p2.evaluate(() => document.body.innerText);
    if (k === 'contador') t('contador: no fim mostra R$ 25,00', /25,00/.test(fim), fim.slice(0, 120));
    if (k === 'tabela')   t('tabela: no fim a sobra é R$ 395,00', /395,00/.test(fim), fim.slice(0, 200));
    if (k === 'barras')   t('barras: no fim mostra R$ 2.140,00', /2\.140,00/.test(fim), fim.slice(0, 200));
    /* o .rot deixa maiusculo por CSS, e innerText devolve o que se ve na tela */
    if (k === 'regua')    t('régua: acusa fora do limite', /fora do que a norma/i.test(fim), fim.slice(0, 200));
    if (k === 'escada')   t('escada: mostra o teto de 8%', /TETO DO CHEQUE ESPECIAL/.test(fim), fim.slice(0, 200));

    /* a tela é 1920x1080 exatos: quadro de tamanho errado quebra o ffmpeg */
    const med = await p2.evaluate(() => ({ w: document.body.clientWidth, h: document.body.clientHeight }));
    t(`${k}: a página mede 1920x1080`, med.w === 1920 && med.h === 1080, JSON.stringify(med));
    await p2.close();
  }

  console.log('\n— a identidade é a mesma em todos —');
  const cores = await page.evaluate(() => VIS_CORES);
  t('o fundo do canal está travado', cores.fundo === '#0f1318');
  const todas = Object.keys(fichas).every(k => r[k].html.includes('#0f1318') && r[k].html.includes('DejaVu Sans'));
  t('todo visual usa o fundo e a fonte do canal', todas);
  const semExterno = Object.keys(fichas).every(k => !/https?:\/\//.test(r[k].html));
  t('nenhuma página busca nada da internet', semExterno);

  await browser.close();
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

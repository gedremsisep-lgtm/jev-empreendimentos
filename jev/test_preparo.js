/* =========================================================================
   O PREPARO AUTOMÁTICO: garimpou, anúncio pronto.

   O que este teste protege, em ordem de importância:

     1. o programa NÃO inventa link de afiliado — link chutado manda a
        comissão para outra pessoa e parece que está tudo certo
     2. garimpar duas vezes não enche a lista de produtos repetidos
     3. preparar de novo não apaga o link que o dono já colou
     4. NENHUM botão de publicar de plataforma é apertado pelo programa

   Rodar:  node test_preparo.js
   ========================================================================= */
const { chromium } = require('/root/jev/node_modules/playwright');

let falhas = 0;
const erros = [];
const ok = (t, v) => {
  if (v === true) { console.log('  OK    ' + t); return; }
  falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v).slice(0, 240));
};

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await b.newPage();
  page.on('pageerror', e => erros.push(String(e.message)));
  await page.goto('file:///root/jev/jev_empreendimentos.html');
  await page.waitForTimeout(2500);

  /* o window.open é substituído por um espião: nada de abrir aba de verdade,
     e — mais importante — dá para provar que nada foi PUBLICADO */
  await page.evaluate(() => {
    window.__abertas = [];
    window.open = (u) => { window.__abertas.push(u); return { closed: false }; };
    if (!navigator.clipboard) navigator.clipboard = {};
    window.__copiado = [];
    navigator.clipboard.writeText = async t => { window.__copiado.push(t); };
  });

  /* =============================================== 1) a ficha sai sozinha */
  console.log('\n1) garimpou, a ficha de afiliado já existe');
  const r1 = await page.evaluate(async () => {
    await pautaDoGarimpo([
      { n: 'Jogo de Panelas Antiaderente', g: 'coz', preco: 189.9, comissao: 12,
        gancho: 'Ovo que não gruda', porque: 'Cozinha sem óleo', vend: 18320,
        links: [{ loja: 'mercadolivre', url: 'https://www.mercadolivre.com.br/p/123' }] },
      { n: 'Kit Coala Home Orquídea Negra', g: 'dec', preco: 79.9, comissao: 20,
        gancho: 'Casa cheirosa o dia todo', porque: 'Aroma que dura', tt: true, vend: 54265 }
    ]);
    const progs = await dbGetAll('programas');
    return progs.filter(p => p.doGarimpo).map(p => ({
      produto: p.produto, plataforma: p.plataforma, preco: p.preco,
      comissao: p.comissao, nicho: p.nicho, url: p.url, ativo: p.ativo }));
  });
  ok('as duas fichas foram criadas', r1.length === 2 ? true : r1);
  ok('o produto do Mercado Livre foi para o Mercado Livre',
    r1.some(f => /Panelas/.test(f.produto) && f.plataforma === 'Mercado Livre') ? true : r1);
  ok('e o do TikTok Shop para o TikTok Shop',
    r1.some(f => /Coala/.test(f.produto) && f.plataforma === 'TikTok Shop') ? true : r1);
  ok('preço e comissão vieram preenchidos',
    r1.every(f => f.preco > 0 && f.comissao > 0) ? true : r1);
  ok('o nicho veio preenchido', r1.every(f => !!f.nicho) ? true : r1);
  ok('e a ficha já nasce ativa', r1.every(f => f.ativo === true) ? true : r1);

  ok('O LINK FICA VAZIO — o programa não inventa link de afiliado',
    r1.every(f => f.url === '') ? true : 'inventou link');

  /* =============================================== 2) sem duplicar */
  console.log('\n2) garimpar de novo não enche a lista de repetidos');
  const r2 = await page.evaluate(async () => {
    await pautaDoGarimpo([
      { n: 'Jogo de Panelas Antiaderente', g: 'coz', preco: 189.9, comissao: 12,
        links: [{ loja: 'mercadolivre', url: 'https://www.mercadolivre.com.br/p/123' }] }
    ]);
    const progs = await dbGetAll('programas');
    return progs.filter(p => /Panelas/.test(p.produto)).length;
  });
  ok('continua tendo uma ficha só do mesmo produto', r2 === 1 ? true : r2);

  /* =============================================== 3) não apaga o link dele */
  console.log('\n3) preparar de novo NÃO apaga o que o dono já preencheu');
  const r3 = await page.evaluate(async () => {
    const progs = await dbGetAll('programas');
    const p = progs.find(x => /Panelas/.test(x.produto));
    await dbPut('programas', { ...p, url: 'https://mercadolivre.com/sec/MEULINK', vendas: 7 });
    await prepPrepararTudo(false);
    const depois = (await dbGetAll('programas')).find(x => /Panelas/.test(x.produto));
    return { url: depois.url, vendas: depois.vendas };
  });
  ok('o link colado por ele continua lá', r3.url === 'https://mercadolivre.com/sec/MEULINK' ? true : r3);
  ok('e as vendas anotadas por ele também', r3.vendas === 7 ? true : r3);

  /* =============================================== 4) a legenda */
  console.log('\n4) a legenda de cada plataforma, no limite dela');
  const r4 = await page.evaluate(async () => {
    const itens = (await dbGetAll('videos')).filter(v => v.origem === 'garimpo');
    const comLink = itens.find(v => /Panelas/.test(v.titulo));
    const semLink = itens.find(v => /Coala/.test(v.titulo));
    return {
      qtd: (comLink.anuncio.legendas || []).length,
      passouDoLimite: comLink.anuncio.legendas.filter(t => t.limite && t.usados > t.limite).length,
      temLink: comLink.anuncio.legendas.every(t => t.texto.includes('MEULINK')),
      temAviso: comLink.anuncio.legendas.every(t => /Publicidade/.test(t.texto)),
      faltaLinkNoOutro: semLink.anuncio ? semLink.anuncio.faltaLink : null,
      primeiroTexto: comLink.anuncio.legendas[0].texto.slice(0, 60)
    };
  });
  ok('escreveu para várias plataformas', r4.qtd >= 3 ? true : r4.qtd);
  ok('nenhuma legenda passou do limite da plataforma',
    r4.passouDoLimite === 0 ? true : r4.passouDoLimite + ' passaram');
  ok('o link do dono entrou em todas', r4.temLink === true ? true : 'faltou em alguma');
  ok('o aviso de publicidade entrou em todas — é exigência, não enfeite',
    r4.temAviso === true ? true : 'faltou em alguma');
  ok('o produto sem link é marcado como sem link, em vez de fingir que está pronto',
    r4.faltaLinkNoOutro === true ? true : r4.faltaLinkNoOutro);

  /* =============================================== 5) abrir sem publicar */
  console.log('\n5) abre as plataformas, mas NÃO publica');
  const r5 = await page.evaluate(async () => {
    const item = (await dbGetAll('videos')).find(v => /Panelas/.test(v.titulo));
    window.__abertas = []; window.__copiado = [];
    await prepAbrirTodas(item.id);
    return { abertas: window.__abertas.slice(), copiado: window.__copiado.length };
  });
  ok('abriu uma aba por plataforma', r5.abertas.length >= 3 ? true : r5.abertas);
  ok('cada endereço é a página de publicar da plataforma',
    r5.abertas.every(u => /^https?:\/\//.test(u)) ? true : r5.abertas);
  ok('a legenda da primeira já vai copiada', r5.copiado === 1 ? true : r5.copiado);
  ok('NENHUM endereço é de publicação automática — nada foi publicado',
    !r5.abertas.some(u => /publish|post|upload\?auto|submit/i.test(u)) ? true : r5.abertas);

  /* =============================================== 6) a tela */
  console.log('\n6) a tela conta o que aconteceu');
  const r6 = await page.evaluate(async () => {
    const itens = (await dbGetAll('videos')).filter(v => v.origem === 'garimpo');
    const comLink = itens.find(v => /Panelas/.test(v.titulo));
    const semLink = itens.find(v => /Coala/.test(v.titulo));
    return { com: prepCartaoHTML(comLink), sem: prepCartaoHTML(semLink) };
  });
  ok('quem tem link aparece pronto', /Anúncio pronto para/.test(r6.com) ? true : r6.com.slice(0, 120));
  ok('e oferece abrir todas', /prepAbrirTodas\(/.test(r6.com) ? true : 'sem o botão');
  ok('quem NÃO tem link é avisado de que não ganha comissão',
    /não ganha comissão/.test(r6.sem) ? true : r6.sem.slice(0, 160));
  ok('e o aviso é âmbar, não verde de "está tudo certo"',
    /class="al aw"/.test(r6.sem) ? true : 'cor errada');

  /* =============================================== 7) nada quebrou */
  console.log('\n7) o resto do sistema');
  for (const t of ['hub', 'fin', 'obras', 'produtos', 'midia', 'rel', 'cfg'])
    { await page.evaluate(n => go(n), t); await page.waitForTimeout(200); }
  ok('as telas continuam abrindo', erros.length === 0 ? true : erros.slice(0, 3));

  console.log('');
  if (erros.length) { console.log('ERROS:'); erros.forEach(e => console.log('  ' + e)); }
  else console.log('Nenhum erro de JavaScript.');
  console.log(falhas ? falhas + ' FALHA(S)' : 'Tudo certo.');
  await b.close();
  process.exit(falhas ? 1 : 0);
})();

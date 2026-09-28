/* =========================================================================
   A CARTEIRA DE LINKS: o link certo no produto certo.

   O que este teste protege, em ordem de importância:

     1. a linha que JÁ TEM link não empresta o nome dela para a próxima —
        este defeito já aconteceu: um link do TikTok sozinho herdou o nome
        do Tapete da linha de cima e a tela ofereceu gravar, com toda a
        confiança, o link errado no produto errado. Comissão perdida sem
        sintoma nenhum
     2. o programa NÃO inventa link — texto sem endereço não vira link
     3. link sem nome NÃO é jogado fora — vira ficha para renomear, porque
        link descartado em silêncio é comissão perdida em silêncio
     4. a prévia não grava NADA antes de ele aprovar
     5. o mesmo endereço colado duas vezes não vira duas fichas
     6. a loja é reconhecida pelo endereço, nas seis lojas
     7. o casamento por nome perdoa nome sujo, mas não casa produto errado
     8. sem a chave da Shopee, gerar avisa e não estraga nada
     9. o App Secret não fica pendurado na tela depois de guardado
    10. NENHUM botão de publicar de plataforma é apertado pelo programa

   Rodar:  node test_links.js
   ========================================================================= */
const { chromium } = require('playwright');

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
  await page.goto('file://' + __dirname + '/jev_empreendimentos.html');
  await page.waitForTimeout(2500);

  /* espiões: nada abre aba de verdade, e dá para provar que nada foi PUBLICADO */
  await page.evaluate(() => {
    window.__abertas = [];
    window.open = (u) => { window.__abertas.push(u); return { closed: false }; };
    window.__toasts = [];
    const t0 = window.toast;
    window.toast = (m, k) => { window.__toasts.push(String(m)); if (t0) try { t0(m, k); } catch (e) {} };
    if (!navigator.clipboard) navigator.clipboard = {};
    window.__copiado = [];
    navigator.clipboard.writeText = async t => { window.__copiado.push(t); };
  });

  /* ============ 1) a linha com link não empresta o nome para a de baixo */
  console.log('\n1) o link solto NÃO herda o nome da linha de cima');
  const r1 = await page.evaluate(() => {
    const colado =
      'Tapete Antiderrapante Banheiro | R$ 49,90 | 15% de comissão https://s.shopee.com.br/AAA111\n' +
      'https://vt.tiktok.com/BBB222';
    return linkSeparar(colado).map(a => ({
      url: a.url, nome: a.nome, loja: a.loja ? a.loja.id : null }));
  });
  ok('separou os dois endereços', r1.length === 2 ? true : r1);
  ok('o da Shopee ficou com o nome do Tapete',
     /Tapete Antiderrapante Banheiro/.test(r1[0].nome) ? true : r1[0]);
  ok('o preço e a comissão saíram do nome',
     !/R\$|%|comiss/i.test(r1[0].nome) ? true : r1[0].nome);
  ok('o do TikTok ficou SEM nome — não herdou o Tapete',
     r1[1].nome === '' ? true : { herdou: r1[1].nome });

  /* ==================================== 2) o programa não inventa link */
  console.log('\n2) texto sem endereço não vira link');
  const r2 = await page.evaluate(() =>
    linkSeparar('Tapete lindo, 15% de comissão, R$ 49,90 — sem link nenhum aqui').length);
  ok('nenhum link inventado', r2 === 0 ? true : { achou: r2 });

  /* ============================= 3) link sem nome não é jogado fora */
  console.log('\n3) link sem nome vira ficha para renomear, não lixo');
  const r3 = await page.evaluate(async () => {
    const p = await linkPrevia('https://vt.tiktok.com/CCC333');
    return p.map(x => ({ acao: x.acao, nome: x.nome, semNome: !!x.semNome }));
  });
  ok('virou ficha nova, não descarte', r3[0] && r3[0].acao === 'nova' ? true : r3);
  ok('o nome provisório diz de onde veio',
     /TikTok Shop/.test(r3[0].nome) && /renomear/.test(r3[0].nome) ? true : r3[0]);

  /* ================================= 4) a prévia não grava nada */
  console.log('\n4) conferir não grava');
  const r4 = await page.evaluate(async () => {
    const antes = (await dbGetAll('programas')).length;
    await linkPrevia('Fone Bluetooth https://s.shopee.com.br/DDD444');
    const depois = (await dbGetAll('programas')).length;
    return { antes, depois };
  });
  ok('nada foi gravado na prévia', r4.antes === r4.depois ? true : r4);

  /* ================ 5) endereço repetido não vira duas fichas */
  console.log('\n5) o mesmo endereço duas vezes conta uma');
  const r5 = await page.evaluate(() => linkSeparar(
    'Fone A https://s.shopee.com.br/EEE555\nFone A de novo https://s.shopee.com.br/EEE555').length);
  ok('uma entrada só', r5 === 1 ? true : { achou: r5 });

  /* ============================ 6) a loja sai do endereço */
  console.log('\n6) as seis lojas são reconhecidas pelo endereço');
  const r6 = await page.evaluate(() => {
    const casos = {
      shopee: 'https://s.shopee.com.br/1',
      amazon: 'https://amzn.to/2',
      ml:     'https://www.mercadolivre.com.br/p/3',
      tiktok: 'https://vt.tiktok.com/4',
      magalu: 'https://www.magazinevoce.com.br/5',
      ali:    'https://s.click.aliexpress.com/6'
    };
    const fora = [];
    Object.keys(casos).forEach(id => {
      const l = linkLojaDe(casos[id]);
      if (!l || l.id !== id) fora.push({ esperado: id, veio: l ? l.id : null });
    });
    return fora;
  });
  ok('todas as seis', r6.length === 0 ? true : r6);

  /* ========== 7) casa nome sujo com o produto certo, e não com o errado */
  console.log('\n7) o casamento perdoa nome sujo mas não erra o produto');
  const r7 = await page.evaluate(async () => {
    await dbAdd('programas', { produto: 'Tapete Antiderrapante para Banheiro',
      plataforma: 'Shopee', url: '', tipo: 'Físico', comissao: 0, preco: 0,
      vendas: 0, ganhoTotal: 0, ativo: true });
    await dbAdd('programas', { produto: 'Fone de Ouvido Bluetooth',
      plataforma: 'Shopee', url: '', tipo: 'Físico', comissao: 0, preco: 0,
      vendas: 0, ganhoTotal: 0, ativo: true });

    const p = await linkPrevia(
      'Tapete Antiderrapante Banheiro 3 Peças | R$ 49,90 https://s.shopee.com.br/FFF666\n' +
      'Liquidificador Turbo 1200W | R$ 199,00 https://s.shopee.com.br/GGG777');
    return p.map(x => ({ acao: x.acao, certeza: x.certeza,
      ficha: x.ficha ? x.ficha.produto : null }));
  });
  ok('o tapete sujo achou o tapete',
     r7[0] && r7[0].ficha === 'Tapete Antiderrapante para Banheiro' ? true : r7[0]);
  ok('e com certeza alta', r7[0] && r7[0].certeza >= 60 ? true : r7[0]);
  ok('vai PREENCHER, porque a ficha estava sem link',
     r7[0] && r7[0].acao === 'preencher' ? true : r7[0]);
  ok('o liquidificador NÃO foi casado com o fone',
     r7[1] && r7[1].ficha === null && r7[1].acao === 'nova' ? true : r7[1]);

  /* ============ 8) sem a chave da Shopee, gerar avisa e não estraga */
  console.log('\n8) sem chave, a geração automática avisa e para');
  const r8 = await page.evaluate(async () => {
    const semApp = !shTem();
    const antes = (await dbGetAll('programas')).map(f => f.url || '');
    window.__toasts = [];
    await shGerarFaltantes();
    const depois = (await dbGetAll('programas')).map(f => f.url || '');
    return { semApp, mudou: JSON.stringify(antes) !== JSON.stringify(depois),
             recado: window.__toasts.join(' | ') };
  });
  ok('no navegador não há app do Windows', r8.semApp === true ? true : r8);
  ok('nenhum link foi alterado', r8.mudou === false ? true : r8);
  ok('e o recado explica onde funciona',
     /aplicativo do Windows/i.test(r8.recado) ? true : { recado: r8.recado });

  /* ============ 9) o segredo não fica pendurado na tela */
  console.log('\n9) o App Secret sai dos campos assim que é guardado');
  const r9 = await page.evaluate(async () => {
    const d = document.createElement('div');
    d.innerHTML = '<input id="sh-id"><input id="sh-seg" type="password">';
    document.body.appendChild(d);
    document.getElementById('sh-id').value = '1800300123';
    document.getElementById('sh-seg').value = 'segredo-de-teste';

    let recebeu = null;
    window.JeVDesktop = {
      shGerar: async () => ({ ok: true, resultados: [] }),
      shGuardarChave: async (id, seg) => { recebeu = { id: id, tinhaSegredo: !!seg }; return { ok: true }; },
      shEstado: async () => ({ temChave: true, valendo: true, chave: '1800…23', recado: 'liberado' })
    };
    await shSalvarChave();
    const r = {
      chegouNoApp: recebeu,
      idNaTela: document.getElementById('sh-id').value,
      segredoNaTela: document.getElementById('sh-seg').value
    };
    delete window.JeVDesktop;
    d.remove();
    return r;
  });
  ok('a chave chegou ao aplicativo',
     r9.chegouNoApp && r9.chegouNoApp.tinhaSegredo === true ? true : r9);
  ok('o campo do App ID ficou vazio', r9.idNaTela === '' ? true : r9);
  ok('o campo do App Secret ficou vazio', r9.segredoNaTela === '' ? true : r9);

  /* ============ 10) nada foi publicado em nenhuma plataforma */
  console.log('\n10) o programa não apertou botão de publicar de ninguém');
  const r10 = await page.evaluate(() => window.__abertas.slice());
  ok('nenhuma página de plataforma foi aberta', r10.length === 0 ? true : r10);

  /* =============================================== erros soltos na página */
  if (erros.length) {
    console.log('\nerros de página:');
    erros.forEach(e => console.log('   ' + e));
    falhas += erros.length;
  }

  await b.close();
  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'tudo certo') + '\n');
  process.exit(falhas ? 1 : 0);
})();

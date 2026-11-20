/* =========================================================================
   test_novidades.js — o selo NOVO, o balão e as abas novas da fábrica.

   O que este teste impede:
   1. Aba nova sem explicação: toda aba nova tem selo NOVO e, na primeira
      visita, um balão que diz o que ela faz.
   2. Selo que não some: "Entendi" apaga o selo na hora e ele não volta.
   3. Tela quebrada com a fábrica desligada: a aba explica como ligar.

     node test_novidades.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e)));
  await pg.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await espera(3500);

  t('cartão Novidades aparece no Início', await pg.locator('#nov-cartao').count() === 1);
  t('cartão lista as 4 novidades', await pg.locator('#nov-cartao button').count() === 4);
  t('selo NOVO no menu Negócios', await pg.locator('#mn-neg .nov-selo').count() === 1);
  t('selo NOVO no botão do Controle', await pg.locator('.top .tbt[onclick="go(\'ctl\')"] .nov-selo').count() === 1);

  await pg.locator('#nov-cartao button').first().click();
  await espera(3500);
  t('Conhecer leva à aba Editor de vídeo', await pg.locator('button[onclick="midStab(\'edit\')"].on').count() === 1);
  t('aba Máquina de Vendas existe', await pg.locator('button[onclick="midStab(\'mvend\')"]').count() === 1);
  t('aba Central de Canais existe no grupo Publicar', await pg.evaluate(() => MENU_GRUPOS.find(g => g.id === 'publicar').abas[0].id === 'ccan'));
  t('fábrica desligada: a tela explica como ligar', (await pg.locator('#mid-body').innerText()).includes('CENTRAL-DE-CANAIS'));
  t('balão aparece na primeira visita', await pg.locator('.nov-balao').count() === 1);
  t('balão explica o que a aba faz', (await pg.locator('.nov-balao').innerText()).includes('Editor de Vídeo'));

  await pg.click('.nov-balao .ok');
  await espera(400);
  t('Entendi fecha o balão', await pg.locator('.nov-balao').count() === 0);
  t('Entendi apaga o selo da aba na hora', await pg.locator('button[onclick="midStab(\'edit\')"] .nov-selo').count() === 0);

  await pg.click('button[onclick="midStab(\'edit\')"]');
  await espera(2500);
  t('balão não volta depois de visto', await pg.locator('.nov-balao').count() === 0);

  await pg.click('.top .tbt[onclick="go(\'ctl\')"]');
  await espera(2500);
  t('Controle mostra o balão do Comandante', (await pg.locator('.nov-balao').innerText().catch(() => '')).includes('Comandante'));

  t('nenhum erro de JavaScript', erros.length === 0, erros.slice(0, 3).join(' | '));
  await b.close();
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

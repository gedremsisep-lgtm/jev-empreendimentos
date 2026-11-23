/* =========================================================================
   test_softwares.js — Redes Sociais (31_postar / 20_midia) e Software (54)

   O que este teste trava:
   1. Toda rede da lista tem um botão principal, e toda ação tem nome, ícone
      e um destino que não é vazio — a não ser as que só existem no celular.
   2. O cartão de cada canal mostra o botão principal DA SUA REDE.
   3. O Software fica ao lado do Escritório e FORA de UNIDADES (senão entra
      no rateio do financeiro).
   4. A conta dos dias para o vencimento: a vencer, atrasado e pago.
   5. O "Verificar" lê a versão no arquivo publicado e anota no histórico,
      e não inventa versão quando não acha.

     node test_softwares.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{width:1400, height:1000} });
  page.on('pageerror', e => { fail++; console.log('  FALHA erro de página: ' + e.message); });
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 20000 });

  console.log('\n— redes sociais —');
  const redes = await page.evaluate(() => {
    const out = [];
    for (const p of PLATS_VIDEO) {
      const l = REDE_ACOES[p.v] || [];
      const pr = l.filter(a => a.principal);
      const c = { plataforma:p.v, url:'', urlPostar:'' };
      const ruins = l.filter(a => !a.n || !a.ic || (!a.mobile && !acaoDestino(c, a, 'teste').url && !!a.destino)).map(a => a.k);
      out.push({ rede:p.v, acoes:l.length, principais:pr.length, ruins });
    }
    return out;
  });
  t('são 11 redes na lista (10 + Outra)', redes.length === 11, redes.length);
  t('toda rede tem exatamente um botão principal', redes.every(r => r.principais === 1),
    redes.filter(r => r.principais !== 1).map(r => r.rede).join(', '));
  t('toda ação tem nome, ícone e destino', redes.every(r => !r.ruins.length),
    redes.filter(r => r.ruins.length).map(r => r.rede + ':' + r.ruins).join(' '));

  const x = await page.evaluate(() => acaoDestino({plataforma:'X (Twitter)'}, redeAcao({plataforma:'X (Twitter)'}, 'post'), 'oi mundo').url);
  t('o post do X já vai com o texto escrito', /intent\/post\?text=oi%20mundo/.test(x), x);
  const manual = await page.evaluate(() => {
    const c = {plataforma:'YouTube', urlPostar:'https://exemplo.com/subir'};
    return [acaoDestino(c, redePrincipal(c), '').url, acaoDestino(c, redeAcao(c,'comunidade'), '').url];
  });
  t('o endereço manual manda só no botão principal', manual[0] === 'https://exemplo.com/subir' && manual[1] !== manual[0], manual.join(' | '));

  const cartoes = await page.evaluate(async () => {
    await dbAdd('canais', {nome:'Teste TT', plataforma:'TikTok', finalidade:'proprio', inscritos:0});
    await dbAdd('canais', {nome:'Teste LI', plataforma:'LinkedIn', finalidade:'proprio', inscritos:0});
    go('midia'); await new Promise(r => setTimeout(r, 500));
    MID_TAB = 'canais'; await midiaRender();
    return document.getElementById('mid-body').innerText;
  });
  t('o cartão do TikTok mostra "Postar no TikTok"', /Postar no TikTok/.test(cartoes));
  t('o cartão do LinkedIn mostra "Publicar no perfil/página"', /Publicar no perfil\/página/.test(cartoes));
  const titulo = await page.evaluate(() => document.querySelector('#midia-root h1').textContent);
  t('a tela se chama Redes Sociais', titulo === 'Redes Sociais', titulo);

  console.log('\n— software —');
  const fora = await page.evaluate(() => ({
    fora: !UNIDADES.some(u => u.id === 'software'),
    nav: unidadeDaPagina('soft') === SOFTWARE,
    perm: PERMS.g.includes('soft') && PERMS.o.includes('soft') && !PERMS.c.includes('soft')
  }));
  t('o Software fica fora de UNIDADES', fora.fora);
  t('mas entra na navegação', fora.nav);
  t('gestão e operação veem; campo não', fora.perm);

  const hub = await page.evaluate(async () => {
    go('hub'); await new Promise(r => setTimeout(r, 700));
    return [...document.querySelectorAll('#hub-root .ugrid .ucard h3')].map(e => e.textContent);
  });
  t('o card Software vem logo depois do Escritório', hub[hub.length-1] === 'Software' && hub[hub.length-2] === 'Escritório', hub.join(', '));

  const fabrica = await page.evaluate(() => softLista().map(s => s.nome));
  t('vem com os seis sistemas de fábrica', ['Funchal','SSCONPAV','Sete Engenharia','RR Barros','Santa Cruz Engenharia','Fenix Engenharia']
    .every(n => fabrica.includes(n)), fabrica.join(', '));

  const venc = await page.evaluate(async () => {
    const hj = hoje(), dia = Number(hj.slice(8,10));
    const ult = new Date(Number(hj.slice(0,4)), Number(hj.slice(5,7)), 0).getDate();
    const L = softLista().map(x => Object.assign({}, x));
    const a = L.find(x => x.id==='ssconpav'), b = L.find(x => x.id==='rrbarros'), c = L.find(x => x.id==='sete');
    a.mensalidade = 100; a.diaVenc = String(dia);                       // vence hoje
    b.mensalidade = 100; b.diaVenc = String(dia > 1 ? dia - 1 : ult);   // ontem (ou fim do mês)
    c.mensalidade = 100; c.diaVenc = '5';
    await softGravar(L);
    await finAdd({tipo:'receita', un:'geral', data:hj, venc:hj, valor:100, status:'Pago', dtPag:hj,
                  desc:'Mensalidade do sistema Sete Engenharia — teste', cat:'Outra'});
    await finLoad();
    return { hoje:softVenc(softPorId('ssconpav')), ontem:softVenc(softPorId('rrbarros')),
             pago:softVenc(softPorId('sete')), dia };
  });
  t('vencendo hoje aparece como "Vence hoje"', venc.hoje.txt === 'Vence hoje', venc.hoje.txt);
  if (venc.dia > 1) t('vencido ontem aparece como atrasado 1 dia', venc.ontem.atrasado && /1 dia/.test(venc.ontem.txt), venc.ontem.txt);
  t('pago no mês mostra a próxima', venc.pago.pago && /próxima/.test(venc.pago.txt), venc.pago.txt);

  const ver = await page.evaluate(async () => {
    const original = window.fetch;
    window.fetch = async (u) => /versao\.json$/.test(u) ? new Response('{}', {status:404})
      : new Response('<script>const SYSTEM_VERSION = "20261121-004";</script>', {status:200,
          headers:{'last-modified':'Fri, 21 Nov 2026 14:00:00 GMT'}});
    const r1 = await softVerificarUm('ssconpav');
    window.fetch = async (u) => /versao\.json$/.test(u) ? new Response('{}', {status:404})
      : new Response('<script>const SYSTEM_VERSION = "20261123-001";</script>', {status:200});
    const r2 = await softVerificarUm('ssconpav');
    window.fetch = async () => new Response('<html>carregador</html>', {status:200});
    const r3 = await softVerificarUm('rrbarros');
    window.fetch = original;
    const s = softPorId('ssconpav');
    return { r1, r2, r3, versao:s.versao, hist:softAtivs(s).map(a => a.tipo + ':' + (a.versao||'')) , atual:s.atualizado };
  });
  t('o Verificar lê a versão no arquivo', ver.r1.versao === '20261121-004', JSON.stringify(ver.r1));
  t('e a data de publicação do cabeçalho', ver.atual >= '2026-11-21', ver.atual);
  t('versão nova vira "Atualização" no histórico', ver.r2.mudou && ver.hist[0] === 'Atualização:20261123-001', ver.hist.join(' '));
  t('sem versão no arquivo, não inventa', ver.r3.ok && ver.r3.versao === '', JSON.stringify(ver.r3));

  const ficha = await page.evaluate(async () => {
    const abas = {};
    for (const a of ['resumo','pag','atu','cons','ativ']) {
      softDetalhe('ssconpav', a); await new Promise(r => setTimeout(r, 200));
      abas[a] = document.querySelector('#mk-form') ? document.querySelector('#mk-form').innerText.length : 0;
    }
    return abas;
  });
  t('as cinco abas da ficha abrem', Object.values(ficha).every(n => n > 50), JSON.stringify(ficha));

  console.log('\n' + ok + ' passaram, ' + fail + ' falharam');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();

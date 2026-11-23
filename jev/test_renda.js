/* =========================================================================
   test_renda.js — Meta R$ 50 mil, Vitrine de afiliados, Plano da chácara,
   Lojas e anúncios dos infoprodutos.

   O que trava:
   1. o placar somar errado (frente errada, mês errado, comissão contada duas vezes);
   2. o "Rodar tudo" mandar à sede sem o retrato da meta, ou o navegador tentar rodar;
   3. a vitrine perder onde o produto foi divulgado ou ler o CSV errado;
   4. o gerador de anúncios passar do limite de caracteres de alguma rede;
   5. a chácara calcular diferente do plano.
     node test_renda.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 20000 });
  await page.waitForTimeout(800);

  console.log('— lugar no sistema —');
  const lugar = await page.evaluate(() => ({
    fora: !UNIDADES.some(u => u.id === 'meta'), nav: unidadeDaPagina('meta') === META,
    g: PERMS.g.includes('meta'), o: PERMS.o.includes('meta'), c: (PERMS.c || []).includes('meta'),
  }));
  t('Meta fica fora de UNIDADES', lugar.fora);
  t('mas entra na navegação', lugar.nav);
  t('só a gestão vê a meta', lugar.g && !lugar.o && !lugar.c, JSON.stringify(lugar));

  console.log('— placar —');
  const mk = await page.evaluate(() => mesAtual());
  const P = await page.evaluate(async (mk) => {
    CFG.metaInicio = mk;
    const add = (o) => dbAdd('financeiro', { status: 'Pago', data: mk + '-10', ...o });
    await add({ tipo: 'receita', un: 'info', desc: 'Venda Hotmart', valor: 1000 });
    await add({ tipo: 'despesa', un: 'info', desc: 'Anúncio Meta', valor: 150 });
    await add({ tipo: 'receita', un: 'chacara', desc: 'Ovos', valor: 500 });
    await add({ tipo: 'despesa', un: 'chacara', desc: 'Ração', valor: 200 });
    await add({ tipo: 'receita', un: 'produtos', cat: 'Comissão de afiliado', desc: 'Shopee outubro', valor: 300 });
    await add({ tipo: 'receita', un: 'produtos', desc: 'Venda de peça', valor: 999 });
    await add({ tipo: 'receita', un: 'imoveis', desc: 'Aluguel', valor: 2000 });
    await add({ tipo: 'receita', un: 'info', desc: 'Mês passado', valor: 5000, data: '2001-01-10' });
    await add({ tipo: 'receita', un: 'info', desc: 'Cancelada', valor: 7000, status: 'Cancelado' });
    await finLoad(true);
    const p = metaPlacar();
    const L = id => p.linhas.find(l => l.id === id);
    return { n: p.n, info: L('infoprodutos').lucro, chac: L('chacara').lucro, afil: L('afiliados').lucro, base: L('imoveis').lucro, total: p.lucro,
             metaM1: L('infoprodutos').meta, m3: metaDoMes([500, 4000, 12000], 3), m9: metaDoMes([500, 4000, 12000], 9), m20: metaDoMes([500, 4000, 12000], 20),
             metaImov: L('imoveis').meta, metaFrota1: L('frota').meta, frota12: frotaMetaMes(12), frota6: frotaMetaMes(6), obrasMeta: L('obras').meta };
  }, mk);
  t('mês 1 do plano quando começa este mês', P.n === 1, P.n);
  t('infoprodutos = receita − despesa do mês (850)', P.info === 850, P.info);
  t('chácara = 300', P.chac === 300, P.chac);
  t('afiliados contam só os lançamentos de comissão (300)', P.afil === 300, P.afil);
  t('venda de peça não vira comissão de afiliado', P.afil !== 1299);
  t('imóveis entram na linha Imóveis (2000)', P.base === 2000, P.base);
  t('meta dos imóveis = 6×1.300 + 1.400 menos 10% (8.280)', P.metaImov === 8280, P.metaImov);
  t('meta da frota no mês 1 = basculante + 2 carros (≈ 6.690)', Math.abs(P.metaFrota1 - (3500 + 2 * 1595)) <= 2, P.metaFrota1);
  t('meta da frota no mês 6 ≈ 3 carros + retro + basculante (≈ 16,8 mil)', Math.abs(P.frota6 - (3500 + 3 * 1595 + 8450)) <= 2, P.frota6);
  t('meta da frota no mês 12 ≈ 20 mil', Math.abs(P.frota12 - (3500 + 5 * 1595 + 8450)) <= 2, P.frota12);
  t('obras sem meta', P.obrasMeta === null);
  t('mês passado e lançamento cancelado ficam de fora', P.info === 850);
  t('meta interpolada: mês 3 = 500, mês 9 = 8000, depois do 12 = 12000', P.m3 === 500 && P.m9 === 8000 && P.m20 === 12000, [P.m3, P.m9, P.m20].join(','));

  console.log('— tela no navegador —');
  const nav = await page.evaluate(async () => {
    delete window.JeVDesktop; CU = 'g';
    await go('hub'); await new Promise(r => setTimeout(r, 600));
    const cards = [...document.querySelectorAll('#hub-root .ugrid .ucard h3')].map(e => e.textContent);
    await go('meta'); await new Promise(r => setTimeout(r, 400));
    const root = document.getElementById('meta-root');
    const btn = [...root.querySelectorAll('button')].find(b => /Rodar tudo/.test(b.textContent));
    return { cards, txt: root.innerText, desab: btn ? btn.disabled : null };
  });
  t('o cartão Meta R$ 50 mil está no Início', nav.cards.includes('Meta R$ 50 mil'), nav.cards.join(', '));
  t('no navegador, o Rodar tudo fica desligado e explica', nav.desab === true && /aplicativo do Windows/.test(nav.txt));
  t('o placar mostra as frentes', /Infoprodutos/.test(nav.txt) && /Chácara/.test(nav.txt) && /Veículos e máquinas/.test(nav.txt) && /Imóveis/.test(nav.txt));
  t('as contas a abrir aparecem', /Hotmart: conta de produtor/.test(nav.txt));

  console.log('— com o aplicativo —');
  const app = await page.evaluate(async () => {
    window.__cmds = [];
    const estado = { ok: true, ligado: false, horario: 'Todo dia às 6h41 (Brasília)', rodando: null, teto: { tetoDiarioBRL: 10, gastoHojeBRL: 1.2 },
      frentes: [{ id: 'midia', nome: 'Mídia', ligada: true, missao: { id: 'M-90', etapa: 'concluida', resultado: 'ok' } }, { id: 'afiliados', nome: 'Afiliados', ligada: false, missao: null }],
      fila: [{ titulo: 'Fila do dono — Afiliados', arquivo: 'docs/x.md', dia: '2026-11-23', itens: [{ feito: false, texto: 'Gerar o link do produto X na Shopee' }] }] };
    window.JeVDesktop = { ehAplicativo: true, agAbrir: () => {}, pilotoRodar: async (cmd, arg) => { window.__cmds.push([cmd, arg]); return cmd === 'estado' ? estado : { ok: true, msg: 'feito' }; } };
    await metaRender();
    const root = document.getElementById('meta-root');
    const txt = root.innerText;
    await metaRodar(false); await document.getElementById('mkc-ok').onclick(); await new Promise(r => setTimeout(r, 100));
    await metaLigar(true);
    await metaFrente('afiliados', true);
    await metaConta('hotmart', true);
    return { txt, cmds: window.__cmds.filter(c => c[0] !== 'estado'), conta: CFG.metaContas.hotmart };
  });
  t('mostra a fila do dono vinda da sede', /Gerar o link do produto X na Shopee/.test(app.txt));
  t('mostra a missão de cada frente', /M-90/.test(app.txt));
  t('mostra o gasto de IA do dia contra o teto', /R\$\s?1,20 de R\$\s?10,00/.test(app.txt), (app.txt.match(/Gasto.*/) || [''])[0]);
  const rod = app.cmds.find(c => c[0] === 'rodar');
  t('Rodar tudo manda o retrato da meta junto', rod && /Retrato da meta/.test(rod[1].retrato) && /\| Infoprodutos \|/.test(rod[1].retrato), rod && rod[1].retrato.slice(0, 120));
  t('o retrato leva as contas e a vitrine', rod && /Contas do dono/.test(rod[1].retrato) && /Vitrine de afiliados/.test(rod[1].retrato));
  t('o retrato leva o plano de frota', rod && /Plano de frota/.test(rod[1].retrato) && /Retroescavadeira usada/.test(rod[1].retrato));
  t('ligar o piloto chega à sede', app.cmds.some(c => c[0] === 'ligar'));
  t('ligar/desligar frente chega à sede', app.cmds.some(c => c[0] === 'acao' && c[1].id === 'afiliados' && c[1].ligada === true));
  t('marcar conta fica salvo', app.conta === true);

  console.log('— vitrine de afiliados —');
  const vit = await page.evaluate(async () => {
    const a = await dbAdd('programas', { produto: 'Mini Liquidificador Portátil USB', plataforma: 'Shopee', url: 'https://s.shopee.com.br/abc', comissao: 8, ativo: true, canais: ['WhatsApp'] });
    await dbAdd('programas', { produto: 'Garrafa Térmica 1L', plataforma: 'Mercado Livre', url: '', ativo: true });
    const rid = await dbAdd('roteiros', { titulo: 'r', produtos: [{ nome: 'Mini Liquidificador Portátil USB', url: '' }] });
    await dbAdd('publicacoes', { roteiroId: rid, plataforma: 'tt', titulo: 'r', dtPub: hoje() });
    await dbAdd('publicacoes', { roteiroId: rid, plataforma: 'yts', titulo: 'r', dtPub: hoje() });
    PRD_TAB.produtos = 'vit'; await go('produtos'); await new Promise(r => setTimeout(r, 500));
    return { txt: document.getElementById('prd-body-produtos').innerText, id: a };
  });
  t('a aba Vitrine de afiliados abre', /Vitrine de afiliados/.test(vit.txt));
  t('mostra onde é vendido e o item sem link', /Shopee/.test(vit.txt) && /sem link/.test(vit.txt));
  t('junta canal marcado à mão com publicação da Central', /WhatsApp/.test(vit.txt) && /TikTok/.test(vit.txt) && /YouTube Shorts/.test(vit.txt), vit.txt.slice(0, 400));

  const csv = 'Nome do Item;Cliques;Qtd;Comissão total do afiliado(R$)\n"Mini Liquidificador Portátil USB";120;3;"12,60"\nMini Liquidificador Portátil USB;30;1;4,20\nFone Bluetooth X9;50;2;"8,00"\n';
  const arq = path.join(__dirname, '_rel.csv'); fs.writeFileSync(arq, '﻿' + csv);
  await page.evaluate(() => vitImportar('produtos'));
  await page.setInputFiles('#vt-arq', arq);
  await page.waitForFunction(() => VIT_IMPORT && VIT_IMPORT.itens.length, null, { timeout: 5000 });
  const imp = await page.evaluate(() => VIT_IMPORT);
  const liq = imp.itens.find(i => /liquidificador/i.test(i.nome));
  t('lê CSV com ; e vírgula decimal', liq && liq.cliques === 150 && liq.vendas === 4 && Math.abs(liq.comissao - 16.8) < 0.001, JSON.stringify(liq));
  t('liga o produto do relatório ao item da vitrine', liq && liq.progId);
  await page.evaluate(() => vitAplicar('produtos'));
  await page.waitForTimeout(300);
  const dep = await page.evaluate(async () => { const ps = await dbGetAll('programas'); return ps.map(p => ({ n: p.produto, rel: p.rel })); });
  const l2 = dep.find(p => /Liquidificador/.test(p.n)), novo = dep.find(p => /Fone Bluetooth/.test(p.n));
  t('aplica cliques, vendas e comissão no item', l2.rel && l2.rel.comissao === 16.8 && l2.rel.vendas === 4);
  t('cria o produto que ainda não estava na vitrine', novo && novo.rel.comissao === 8);
  fs.unlinkSync(arq);

  console.log('— chácara: plano de meio hectare —');
  const ch = await page.evaluate(async () => {
    const C = chpCalc(CHP_PADRAO);
    CHA_TAB = 'plano'; await go('chacara'); await new Promise(r => setTimeout(r, 400));
    const txt = document.getElementById('cha-body').innerText;
    document.getElementById('chp-aves').value = '0'; chpAtualizar();
    const semAves = chpCalc(chpLerCampos()).linhas.find(l => l.id === 'ovos');
    chpPadrao(); await chpAdotar();
    return { lucro: C.lucro, linhas: C.linhas.map(l => [l.id, Math.round(l.lucro)]), txt, semAves, plano: CFG.chacaraPlano, area: CHP_AREAS.reduce((s, a) => s + a[1], 0) };
  });
  t('os 5.000 m² fecham', ch.area === 5000, ch.area);
  t('lucro padrão dentro da faixa do plano (R$ 6 a 8 mil)', ch.lucro >= 6000 && ch.lucro <= 8000, Math.round(ch.lucro) + ' ' + JSON.stringify(ch.linhas));
  t('zero galinha = zero receita e zero custo de ovos', ch.semAves.rec === 0 && ch.semAves.cus === 0, JSON.stringify(ch.semAves));
  t('adotar grava o plano', ch.plano && ch.plano.lucro === Math.round(ch.lucro) && ch.plano.itens.length === 4);
  t('a aba mostra a divisão da área', /Como dividir os 5\.000 m²/.test(ch.txt));

  console.log('— infoprodutos: lojas e anúncios —');
  const inf = await page.evaluate(async () => {
    const id = await dbAdd('produtos', { nome: 'Curso Renda com Impressão 3D do Zero ao Primeiro Pedido', tipo: 'Infoproduto', preco: 197, un: 'info', ativo: true });
    PRD_TAB.info = 'lojas'; await go('info'); await new Promise(r => setTimeout(r, 400));
    const txt = document.getElementById('prd-body-info').innerText;
    await infoLojaForm(id, 'hotmart'); document.getElementById('il-st').value = 'À venda'; document.getElementById('il-url').value = 'https://go.hotmart.com/x';
    await infoLojaSalvar(id, 'hotmart');
    const p = await dbGet('produtos', id);
    await infoAnuncios(id);
    document.getElementById('an-pub').value = 'quem tem uma impressora 3D parada em casa e quer começar a vender';
    document.getElementById('an-dor').value = 'não sabe o que imprimir para vender nem quanto cobrar por cada peça';
    document.getElementById('an-res').value = 'vender as primeiras peças na Shopee e no Mercado Livre com preço certo';
    document.getElementById('an-prova').value = 'feito por quem imprime e vende todos os dias numa Bambu P2S';
    await infoAnunciosGerar();
    const v = INFO_AN.v;
    const passou = []; v.forEach(a => a.redes.forEach(r => r.textos.forEach(x => { if (x.t.length > x.max) passou.push(r.id + ':' + x.rot + ':' + x.t.length); if (!x.t) passou.push(r.id + ':' + x.rot + ':vazio'); })));
    const salvo = (await dbGet('produtos', id)).anuncio;
    return { txt, loja: p.lojas.hotmart, angulos: v.length, redes: v[0].redes.length, passou, salvo, ex: v[0].redes[1].textos.map(x => x.t) };
  });
  t('a aba Lojas e anúncios lista o infoproduto', /Onde cada produto está à venda/.test(inf.txt) && /Curso Renda/.test(inf.txt));
  t('guarda situação e link da Hotmart', inf.loja && inf.loja.status === 'À venda' && /hotmart/.test(inf.loja.url));
  t('3 ângulos × 4 redes', inf.angulos === 3 && inf.redes === 4);
  t('nenhum texto passa do limite nem sai vazio', !inf.passou.length, inf.passou.join(' | '));
  t('o briefing do anúncio fica salvo no produto', inf.salvo && /impressora 3D/.test(inf.salvo.publico));

  console.log('— veículos: plano de frota —');
  const fr = await page.evaluate(async () => {
    const C = frotaCarro(FROTA_PADRAO), M = frotaMaquina(FROTA_PADRAO);
    VEI_TAB = 'plano'; await go('veiculos'); await new Promise(r => setTimeout(r, 400));
    const txt = document.getElementById('vei-body').innerText;
    await frotaMarco('carro1', 'Feito'); await new Promise(r => setTimeout(r, 300));
    const depois = document.getElementById('vei-body').innerText;
    document.getElementById('fr-semanal').value = '700'; frotaRecalc();
    const novo = document.getElementById('fr-res-carro').innerText;
    await frotaSalvarParams();
    return { C, M, txt, depois, novo, salvo: CFG.frotaPlano.params.semanal, marco: CFG.frotaPlano.marcos.carro1.status };
  });
  t('líquido por carro = R$ 1.595 com R$ 650 por semana', Math.abs(fr.C.liquido - 1595) < 0.01, fr.C.liquido);
  t('carro financiado sobra pouco (≈ R$ 375)', Math.abs(fr.C.sobraFin - 375) < 15, fr.C.sobraFin);
  t('retro: líquido R$ 8.450 e parcela ≈ R$ 4.380', Math.abs(fr.M.liquido - 8450) < 1 && Math.abs(fr.M.parcela - 4380) < 60, fr.M.liquido + ' / ' + fr.M.parcela);
  t('a aba mostra os 8 marcos com gatilho', /Retroescavadeira usada/.test(fr.txt) && /Contrato de 6 meses ou mais/.test(fr.txt) && /Carro 5/.test(fr.txt));
  t('marcar carro como feito conta 1/5', fr.marco === 'Feito' && /1\/5/.test(fr.depois));
  t('mudar o aluguel recalcula e salva', /3\.033/.test(fr.novo) && fr.salvo === 700, fr.novo.slice(0, 120));

  await page.evaluate(async () => { closeModal('mk-form'); closeModal('mk-conf'); document.getElementById('toast-wrap').innerHTML = ''; await go('meta'); }); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'r_meta.png'), fullPage: true });
  await page.evaluate(async () => { document.getElementById('toast-wrap').innerHTML = ''; PRD_TAB.produtos = 'vit'; await go('produtos'); }); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'r_vitrine.png'), fullPage: true });
  await page.evaluate(async () => { document.getElementById('toast-wrap').innerHTML = ''; CHA_TAB = 'plano'; await go('chacara'); }); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'r_chacara.png'), fullPage: true });
  await page.evaluate(async () => { document.getElementById('toast-wrap').innerHTML = ''; VEI_TAB = 'plano'; await go('veiculos'); }); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'r_frota.png'), fullPage: true });
  await page.evaluate(async () => { const ps = await dbGetAll('produtos'); await infoAnuncios(ps.find(p => p.tipo === 'Infoproduto').id); }); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'r_anuncios.png'), fullPage: true });

  t('nenhum erro de script na página', erros.length === 0, erros.join(' | '));
  await browser.close();
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

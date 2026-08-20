/* =========================================================================
   A TELA da IA que põe uma pessoa apresentando o produto.

   Aqui o aplicativo é de mentira (um JeVDesktop falso), mas a tela é a de
   verdade. O que este teste protege são as três promessas feitas ao dono:

     1. a chave é dele e a tela nunca mostra o segredo de volta
     2. o preço aparece ANTES, e nada é gerado sem ele confirmar
     3. o que falha não é cobrado — e a tela diz isso

   Rodar:  node test_higgs.js
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

  /* --------- o aplicativo de mentira, que registra tudo que recebe ------- */
  await page.evaluate(() => {
    window.__hg = { chaves: [], orcou: 0, gerou: 0, ultimoGerar: null, temChave: false };
    window.JeVDesktop = {
      ehAplicativo: true,
      hgDisponivel: async () => true,
      hgEstado: async () => window.__hg.temChave
        ? { ok: true, temChave: true, pronto: true, chave: 'key_…c123',
            recado: 'Chave funcionando. O custo aparece antes de cada geração.' }
        : { ok: true, temChave: false, pronto: false,
            recado: 'Para gerar vídeo com pessoa, crie uma chave em cloud.higgsfield.ai e cole aqui.' },
      hgGuardarChave: async (id, seg) => {
        window.__hg.chaves.push({ id, seg });
        if (!id || !seg) return { ok: false, motivo: 'Faltou o ID ou o segredo da chave.' };
        window.__hg.temChave = true; return { ok: true };
      },
      hgEsquecerChave: async () => { window.__hg.temChave = false; return { ok: true }; },
      hgOrcar: async (cenas, opcoes) => {
        window.__hg.orcou++;
        return { ok: true, teto: 5, passouDoTeto: false, qualidade: opcoes.qualidade,
          orcamento: { usd: 3.27, creditos: 52.5,
            itens: cenas.map((c, i) => ({ cena: i + 1, usd: 0.65, creditos: 10.5 })) } };
      },
      hgGerar: async (cenas, opcoes) => {
        window.__hg.gerou++; window.__hg.ultimoGerar = { cenas, opcoes };
        return { ok: true, parcial: false, pasta: 'C:\\jev\\ia',
          recado: 'As ' + cenas.length + ' cenas ficaram prontas.',
          arquivos: cenas.map((c, i) => ({ cena: i + 1, caminho: 'C:\\jev\\ia\\cena-0' + (i + 1) + '.mp4', bytes: 90000 })) };
      },
      hgAoAndar: () => {},
      estDisponivel: async () => true
    };
  });

  /* =============================================== 1) a chave */
  console.log('\n1) a chave é do dono, e a tela não a devolve');
  let sec = await page.evaluate(async () => { await hggVerEstado(); return hggSecaoHTML(); });
  ok('sem chave, a tela ensina onde criar', /cloud\.higgsfield\.ai/.test(sec) ? true : sec.slice(0, 120));
  ok('e oferece colar a chave', /hggAbrirChave\(\)/.test(sec) ? true : 'sem o botão');

  const form = await page.evaluate(() => { hggAbrirChave(); return hggSecaoHTML(); });
  ok('o campo do segredo é do tipo senha, não texto à vista',
    /id="hgg-seg" type="password"/.test(form) ? true : 'segredo aparece na tela');
  ok('o campo não guarda histórico do navegador',
    /id="hgg-id"[^>]*autocomplete="off"/.test(form) ? true : 'sem autocomplete=off');
  ok('a tela avisa que a chave fica só neste computador',
    /fica guardada só neste computador/.test(form) ? true : 'não avisou');

  const vazio = await page.evaluate(async () => {
    document.body.insertAdjacentHTML('beforeend',
      '<input id="hgg-id" value=""><input id="hgg-seg" value="">');
    await hggSalvarChave();
    return window.__hg.chaves.length;
  });
  ok('chave pela metade é recusada pelo aplicativo, e a tela não trava',
    vazio === 1 ? true : vazio);

  const guardou = await page.evaluate(async () => {
    document.getElementById('hgg-id').value = 'key_abc123';
    document.getElementById('hgg-seg').value = 'seg_supersecreto';
    await hggSalvarChave();
    return { ultima: window.__hg.chaves[window.__hg.chaves.length - 1],
             campoId: document.getElementById('hgg-id').value,
             campoSeg: document.getElementById('hgg-seg').value };
  });
  ok('a chave chega inteira no aplicativo',
    guardou.ultima.id === 'key_abc123' && guardou.ultima.seg === 'seg_supersecreto' ? true : guardou.ultima);
  ok('e os campos são limpos na hora, sem deixar o segredo pendurado na tela',
    guardou.campoId === '' && guardou.campoSeg === '' ? true : guardou);

  sec = await page.evaluate(() => hggSecaoHTML());
  ok('com chave, a tela mostra só o rabinho dela',
    /key_…c123/.test(sec) ? true : sec.slice(0, 140));
  ok('e o segredo NÃO aparece em lugar nenhum da tela',
    !/seg_supersecreto/.test(sec) ? true : 'o segredo vazou para a tela');
  ok('dá para tirar a chave do computador', /hggEsquecerChave\(\)/.test(sec) ? true : 'sem o botão');

  /* =============================================== 2) o preço antes */
  console.log('\n2) o preço aparece antes, e sem confirmar nada é gerado');
  await page.evaluate(async () => {
    await dbAdd('videos', { origem: 'garimpo', status: 'Ideia', titulo: 'Panelas',
      produto: { n: 'Jogo de Panelas Antiaderente', vend: 18320, rating: 4.7 } });
  });
  const idItem = await page.evaluate(async () =>
    (await dbGetAll('videos')).filter(v => v.origem === 'garimpo').pop().id);

  let cartao = await page.evaluate(id => hggCartaoHTML({ id }), idItem);
  ok('o botão de gerar com pessoa aparece', /hggOrcar\(/.test(cartao) ? true : cartao.slice(0, 140));
  ok('e o pedido pode ser copiado para outra IA',
    /hggCopiarPedido\(/.test(cartao) ? true : 'sem o botão do pedido');

  const depoisOrcar = await page.evaluate(async id => {
    await hggOrcar(id);
    return { html: hggCartaoHTML({ id }), orcou: window.__hg.orcou, gerou: window.__hg.gerou };
  }, idItem);
  ok('orçar não gera nada', depoisOrcar.gerou === 0 ? true : 'gerou sem confirmar');
  ok('mostra o custo em créditos', /52\.5 créditos/.test(depoisOrcar.html) ? true : depoisOrcar.html.slice(0, 200));
  ok('e em dólar', /US\$ 3\.27/.test(depoisOrcar.html) ? true : 'sem o dólar');
  ok('e uma ideia em real, dizendo que é estimativa',
    /R\$ 17,66/.test(depoisOrcar.html) && /cotação do dia/.test(depoisOrcar.html)
      ? true : 'sem o real ou sem a ressalva');
  ok('avisa que cena barrada não é cobrada',
    /não é cobrada/.test(depoisOrcar.html) ? true : 'não avisou');
  ok('o botão de confirmar diz o preço, não só "gerar"',
    /Pode gerar por 52\.5 créditos/.test(depoisOrcar.html) ? true : 'botão sem preço');
  ok('e dá para desistir', /hggCancelarOrcamento\(\)/.test(depoisOrcar.html) ? true : 'sem saída');

  const desistiu = await page.evaluate(id => { hggCancelarOrcamento(); return { html: hggCartaoHTML({ id }), gerou: window.__hg.gerou }; }, idItem);
  ok('desistir não gasta nada', desistiu.gerou === 0 ? true : 'gastou');

  /* =============================================== 3) confirmar e gerar */
  console.log('\n3) só depois do clique dele é que gera');
  const gerou = await page.evaluate(async id => {
    await hggOrcar(id);
    await hggConfirmarGerar();
    const item = (await dbGetAll('videos')).find(v => v.id === id);
    return { gerou: window.__hg.gerou, ultimo: window.__hg.ultimoGerar,
             midia: (item.midia || []).length, html: hggCartaoHTML({ id }) };
  }, idItem);
  ok('gerou uma vez só', gerou.gerou === 1 ? true : gerou.gerou);
  ok('e mandou a confirmação junto', gerou.ultimo.opcoes.confirmado === true ? true : gerou.ultimo.opcoes);
  ok('mandou as 5 cenas da pessoa', gerou.ultimo.cenas.length === 5 ? true : gerou.ultimo.cenas.length);
  ok('cada cena leva o prompt em inglês, que é o que a IA entende',
    /A real person must be visible/.test(gerou.ultimo.cenas[0].prompt) ? true : gerou.ultimo.cenas[0]);
  ok('no formato em pé', gerou.ultimo.opcoes.formato === '9:16' ? true : gerou.ultimo.opcoes.formato);
  ok('os clipes viraram material do produto', gerou.midia === 5 ? true : gerou.midia);
  ok('e a tela avisa que agora é só gerar o vídeo',
    /entraram como material deste produto/.test(gerou.html) ? true : gerou.html.slice(0, 160));

  /* =============================================== 4) o pedido completo */
  console.log('\n4) o pedido serve para qualquer IA, não só para esta');
  const pedido = await page.evaluate(async id => {
    const item = (await dbGetAll('videos')).find(v => v.id === id);
    return hggPedidoTexto(item);
  }, idItem);
  ok('diz qual é o produto', /PRODUTO: Jogo de Panelas/.test(pedido) ? true : pedido.slice(0, 90));
  ok('reconhece o tipo', /TIPO: Cozinha/.test(pedido) ? true : 'tipo errado');
  ok('traz as 5 cenas', (pedido.match(/=== CENA \d de 5/g) || []).length === 5 ? true : pedido.slice(0, 90));
  ok('exige pessoa em toda cena',
    /em toda cena tem que aparecer uma PESSOA/.test(pedido) ? true : 'não exigiu');
  ok('trava o enquadramento',
    /o produto aparece inteiro, com folga nas bordas, nunca cortado/.test(pedido) ? true : 'não travou');
  ok('traz a narração em português', /\[narração por cima\]/.test(pedido) ? true : 'sem narração');
  ok('e o negativo contra produto sozinho',
    /product alone without a person/.test(pedido) ? true : 'sem negativo');

  /* ====== 4b) o botão "Criar vídeo no Higgsfield" na aba Vídeos e pauta

     Ele fica no alto, junto com "Novo vídeo", que é onde o dono chega
     quando quer um vídeo. E não pode gastar no primeiro clique: pergunta
     o produto, mostra o preço, e só gera depois da confirmação.        */
  console.log('\n4b) o botão no alto da aba Vídeos e pauta');
  await page.evaluate(() => { go('midia'); midStab('videos'); });
  await page.waitForTimeout(900);
  const naAba = await page.evaluate(() => document.getElementById('mid-body').innerHTML);
  ok('o botão aparece na aba', /hggCriarVideo\(\)/.test(naAba) ? true : 'não achei o botão');
  ok('com o nome que o dono pediu',
    /Criar vídeo no Higgsfield/.test(naAba) ? true : 'nome diferente');

  const antesDoClique = await page.evaluate(() => window.__hg.gerou);
  const escolha = await page.evaluate(async () => {
    await hggCriarVideo();
    return { corpo: document.getElementById('mkf-body').innerHTML,
             gerou: window.__hg.gerou, orcou: window.__hg.orcou };
  });
  ok('clicar NÃO gera nada — só pergunta qual produto',
    escolha.gerou === antesDoClique ? true : 'gastou no primeiro clique');
  ok('lista o produto da pauta para escolher',
    /hggEscolherProduto\(/.test(escolha.corpo) && /Jogo de Panelas/.test(escolha.corpo)
      ? true : escolha.corpo.slice(0, 160));
  ok('e avisa que o custo aparece antes',
    /quanto vai custar/.test(escolha.corpo) ? true : 'não avisou');

  const escolheu = await page.evaluate(async id => {
    const antes = window.__hg.gerou;
    await hggEscolherProduto(id);
    return { gerou: window.__hg.gerou, antes,
             temOrcamento: !!(HGG.orcamento && HGG.orcamento.id === id),
             aberto: !!PAUTA.abertos[id] };
  }, idItem);
  ok('escolher o produto faz o orçamento, não a geração',
    escolheu.temOrcamento === true && escolheu.gerou === escolheu.antes
      ? true : escolheu);
  ok('e abre a ficha do produto, para o preço aparecer onde ele olha',
    escolheu.aberto === true ? true : 'ficha fechada');

  const ancora = await page.evaluate(async () => {
    await midiaRender();
    return !!document.getElementById('pauta-' + (window.__idItem || 0));
  });
  await page.evaluate(id => { window.__idItem = id; }, idItem);
  const temAncora = await page.evaluate(async id => {
    await midiaRender();
    return !!document.getElementById('pauta-' + id);
  }, idItem);
  ok('o cartão tem âncora, para o botão levar até ele',
    temAncora === true ? true : 'sem âncora');

  await page.evaluate(() => { hggCancelarOrcamento(); closeModal('mk-form'); });

  /* sem chave, o botão ensina o caminho em vez de listar produto */
  const semChave = await page.evaluate(async () => {
    window.__hg.temChave = false; HGG.estado = null;
    await hggCriarVideo();
    return document.getElementById('mkf-body').innerHTML;
  });
  ok('sem chave, manda criar a chave em vez de listar produto',
    /cloud\.higgsfield\.ai/.test(semChave) && !/hggEscolherProduto\(/.test(semChave)
      ? true : semChave.slice(0, 160));
  await page.evaluate(async () => {
    window.__hg.temChave = true; HGG.estado = null; await hggVerEstado();
    closeModal('mk-form');
  });

  /* =============================================== 5) sem aplicativo */
  console.log('\n5) pelo navegador, avisa em vez de oferecer o que não funciona');
  const semApp = await page.evaluate(async () => {
    delete window.JeVDesktop;
    HGG.estado = null;
    await hggVerEstado();
    return { secao: hggSecaoHTML(), cartao: hggCartaoHTML({ id: 1 }) };
  });
  ok('diz que só funciona no aplicativo instalado',
    /só funciona no aplicativo instalado/.test(semApp.secao) ? true : semApp.secao.slice(0, 140));
  ok('e não oferece botão de gastar', !/hggOrcar\(/.test(semApp.cartao) ? true : 'ofereceu');

  /* =============================================== 6) nada quebrou */
  console.log('\n6) o resto do sistema');
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

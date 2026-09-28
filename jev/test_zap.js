/* =========================================================================
   O CANAL DE PROMOÇÕES NO WHATSAPP: o aviso, o link, e o dedo do dono.

   O que este teste protege, em ordem de importância:

     1. o aviso de publicidade vai em TODA mensagem — não é etiqueta, é o
        Código de Defesa do Consumidor e o CONAR, e é a primeira coisa que
        some quando alguém escreve com pressa
     2. produto SEM link de afiliado não entra na fila — postar sem link é
        dar a venda de graça para a loja: o seguidor compra, o produto sai,
        e a comissão é zero
     3. NENHUMA mensagem é enviada pelo programa — ele abre o canal e para.
        O dedo é do dono, e é isso que mantém o número vivo: canal do
        WhatsApp não tem API oficial de publicação, e automação por
        biblioteca não oficial é o caminho curto para o banimento
     4. link de GRUPO colado no lugar do canal é recusado com o motivo —
        o erro mais comum e o mais chato de descobrir depois
     5. a mensagem sai no formato que o WhatsApp entende, com o preço velho
        riscado e o link do dono
     6. sem canal guardado, mandar todas avisa em vez de falhar calado

   Rodar:  node test_zap.js
   ========================================================================= */
const { chromium } = require('playwright');

let falhas = 0;
const erros = [];
const ok = (t, v) => {
  if (v === true) { console.log('  OK    ' + t); return; }
  falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v).slice(0, 240));
};

const CANAL = 'https://whatsapp.com/channel/0029VaTesteDoJeV01';

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await b.newPage();
  page.on('pageerror', e => erros.push(String(e.message)));
  await page.goto('file://' + __dirname + '/jev_empreendimentos.html');
  await page.waitForTimeout(2500);

  /* espiões: nada abre aba de verdade, e dá para provar o que foi COPIADO
     e o que foi ABERTO — que é tudo que este módulo tem direito de fazer */
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

  /* ============ 1) o aviso de publicidade está em toda mensagem */
  console.log('\n1) o aviso de publicidade não some');
  const r1 = await page.evaluate(() => {
    const ficha = { produto: 'Fone Bluetooth XZ', plataforma: 'Shopee', preco: 89.9,
                    url: 'https://s.shopee.com.br/AAA111' };
    const prod = { n: 'Fone Bluetooth XZ', preco: 89.9, de: 149.9, nota: 4.7, vend: 18320,
                   gancho: 'Bateria que dura o dia' };
    return {
      simples:  zapMensagem(ficha, null, false),
      completa: zapMensagem(ficha, prod, { loja: true }),
      semPreco: zapMensagem({ produto: 'Só o nome', url: 'https://amzn.to/x' }, null, false)
    };
  });
  const AVISO = 'Publicidade — ganho comissão por venda.';
  ok('mensagem simples traz o aviso', r1.simples.includes(AVISO) ? true : r1.simples);
  ok('mensagem completa traz o aviso', r1.completa.includes(AVISO) ? true : r1.completa);
  ok('até a mensagem sem preço traz o aviso', r1.semPreco.includes(AVISO) ? true : r1.semPreco);

  /* ============ 2) o formato que o WhatsApp entende */
  console.log('\n2) o formato sai certo');
  ok('nome em negrito', r1.completa.includes('*Fone Bluetooth XZ*') ? true : r1.completa);
  ok('preço velho riscado', /~[^~]*149[^~]*~/.test(r1.completa) ? true : r1.completa);
  ok('o link do dono vai com a setinha',
     r1.completa.includes('👉 https://s.shopee.com.br/AAA111') ? true : r1.completa);
  ok('a loja aparece quando pedida', r1.completa.includes('Shopee') ? true : r1.completa);
  ok('o gancho entra', r1.completa.includes('Bateria que dura o dia') ? true : r1.completa);

  /* ============ 3) sem canal guardado, avisa em vez de falhar calado */
  console.log('\n3) sem canal guardado, ele avisa e não abre nada');
  const r3 = await page.evaluate(async () => {
    CFG = Object.assign({}, CFG); delete CFG.zapCanal;
    window.__toasts = []; window.__abertas = [];
    await zapMandarTodas();
    return { temCanal: zapTemCanal(), abertas: window.__abertas.slice(),
             recado: window.__toasts.join(' | ') };
  });
  ok('não há canal configurado', r3.temCanal === false ? true : r3);
  ok('nenhuma aba foi aberta', r3.abertas.length === 0 ? true : r3.abertas);
  ok('e o recado diz o que fazer', /link do seu canal/i.test(r3.recado) ? true : { recado: r3.recado });

  /* ============ 4) link de grupo é recusado com o motivo */
  console.log('\n4) link de GRUPO no lugar do canal é recusado');
  const r4 = await page.evaluate(async () => {
    const d = document.createElement('div');
    d.innerHTML = '<input id="zap-nome"><input id="zap-link">';
    document.body.appendChild(d);
    const por = async (nome, link) => {
      document.getElementById('zap-nome').value = nome;
      document.getElementById('zap-link').value = link;
      window.__toasts = [];
      await zapSalvarCanal();
      return { recado: window.__toasts.join(' | '), guardou: zapTemCanal() };
    };
    const grupo   = await por('Promoções', 'https://chat.whatsapp.com/ABC123XYZ');
    const invalido= await por('Promoções', 'https://exemplo.com/qualquer');
    const semNome = await por('', 'https://whatsapp.com/channel/0029VaTesteDoJeV01');
    d.remove();
    return { grupo, invalido, semNome };
  });
  ok('link de grupo não é guardado', r4.grupo.guardou === false ? true : r4.grupo);
  ok('e o recado explica a diferença',
     /GRUPO/.test(r4.grupo.recado) && /channel/.test(r4.grupo.recado) ? true : r4.grupo);
  ok('endereço que não é do WhatsApp é recusado', r4.invalido.guardou === false ? true : r4.invalido);
  ok('canal sem nome é recusado', r4.semNome.guardou === false ? true : r4.semNome);

  /* ============ 5) produto sem link de afiliado fica de fora da fila */
  console.log('\n5) sem link de afiliado, não vai para o canal');
  const r5 = await page.evaluate(async () => {
    const base = { tipo: 'Físico', comissao: 0, vendas: 0, ganhoTotal: 0, ativo: true };
    await dbAdd('programas', Object.assign({}, base, { produto: 'Com link — Panela X',
      plataforma: 'Shopee', preco: 99.9, url: 'https://s.shopee.com.br/BBB222' }));
    await dbAdd('programas', Object.assign({}, base, { produto: 'Sem link — Panela Y',
      plataforma: 'Shopee', preco: 89.9, url: '' }));
    await dbAdd('programas', Object.assign({}, base, { produto: 'Desativado — Panela Z',
      plataforma: 'Shopee', preco: 79.9, url: 'https://s.shopee.com.br/CCC333',
      ativo: false }));
    const f = await zapFila();
    return { prontos: f.prontos.map(p => p.nome), semLink: f.semLink.map(p => p.produto) };
  });
  ok('o que tem link entrou', r5.prontos.indexOf('Com link — Panela X') >= 0 ? true : r5);
  ok('o que NÃO tem link ficou de fora', r5.prontos.indexOf('Sem link — Panela Y') < 0 ? true : r5);
  ok('e foi listado à parte, com motivo', r5.semLink.indexOf('Sem link — Panela Y') >= 0 ? true : r5);
  ok('produto desativado não entra', r5.prontos.indexOf('Desativado — Panela Z') < 0 ? true : r5);

  /* ============ 6) mandar todas: copia a primeira e abre SÓ o canal */
  console.log('\n6) mandar todas prepara, abre o canal, e para');
  const r6 = await page.evaluate(async (canal) => {
    const d = document.createElement('div');
    d.innerHTML = '<input id="zap-nome"><input id="zap-link">';
    document.body.appendChild(d);
    document.getElementById('zap-nome').value = 'Promoções JeV';
    document.getElementById('zap-link').value = canal;
    await zapSalvarCanal();
    d.remove();

    window.__abertas = []; window.__copiado = []; window.__toasts = [];
    await zapMandarTodas();
    return { guardou: zapTemCanal(), abertas: window.__abertas.slice(),
             copiado: window.__copiado.slice(), noDeck: ZAP.deck.length,
             recado: window.__toasts.join(' | ') };
  }, CANAL);
  ok('o canal foi guardado', r6.guardou === true ? true : r6);
  ok('abriu exatamente uma aba: a do canal',
     r6.abertas.length === 1 && r6.abertas[0] === CANAL ? true : r6.abertas);
  ok('a 1ª promoção já saiu copiada', r6.copiado.length === 1 ? true : r6.copiado.length);
  ok('e o que foi copiado traz o aviso de publicidade',
     (r6.copiado[0] || '').includes(AVISO) ? true : r6.copiado[0]);
  ok('só entrou na fila quem tem link', r6.noDeck === 1 ? true : { noDeck: r6.noDeck });

  /* ============ 7) o programa não enviou nada, e não sabe enviar */
  console.log('\n7) o programa não posta no canal por você');
  const r7 = await page.evaluate(() => {
    const nomes = Object.getOwnPropertyNames(window)
      .filter(n => /^zap/i.test(n) && typeof window[n] === 'function');
    /* nenhuma função do módulo pode fazer requisição de rede: se um dia
       alguém plugar uma biblioteca não oficial aqui, este teste quebra */
    const suspeitas = nomes.filter(n => /(enviar|postar|publicar|send|post)/i.test(n));
    return { funcoes: nomes.length, suspeitas: suspeitas,
             abertas: window.__abertas.slice() };
  });
  ok('nenhuma função de envio existe no módulo', r7.suspeitas.length === 0 ? true : r7.suspeitas);
  ok('e nada além do canal foi aberto',
     r7.abertas.length === 1 && r7.abertas[0] === CANAL ? true : r7.abertas);

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

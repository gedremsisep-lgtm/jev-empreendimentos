/* =========================================================================
   test_galeria.js — a Midiateca tem de guardar a ficha e NUNCA o arquivo.

   O erro que este teste existe para impedir: alguém achar que "guardar o
   vídeo" é gravar o vídeo dentro do IndexedDB. Um minuto em 1080p passa de
   10 MB; meia dúzia de peças e o banco não abre mais, e a sincronização da
   nuvem, que sobe registro a registro, para de funcionar.

     node test_galeria.js
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
  const page = await browser.newPage();
  page.on('pageerror', e => { fail++; console.log('  FALHA erro de página: ' + e.message); });
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 20000 });

  console.log('\n— o banco conhece a midiateca —');
  const est = await page.evaluate(() => ({
    noStores: STORES.includes('midiateca'),
    versao: DB_VERSION,
    naRota: typeof galeriaRender === 'function',
    temPagina: !!document.getElementById('galeria-root'),
    naPermGestao: PERMS.g.includes('galeria'),
    naPermCampo: PERMS.c.includes('galeria'),
    aba: (UNIDADES.find(u => u.id === 'midia').tabs || []).some(x => x[0] === 'galeria'),
  }));
  t('midiateca está na lista de tabelas', est.noStores);
  /* a midiateca nasceu na v8. Cravar "===8" fazia este teste quebrar toda vez
     que outra peça subisse a versão do banco — foi o que aconteceu quando os
     agentes de monitoramento entraram na v9. O que importa aqui é que a
     midiateca já existe, não qual é o número de hoje. */
  t('a versão do banco é 8 ou mais nova', est.versao >= 8, 'v' + est.versao);
  t('a tela existe e está na rota', est.naRota && est.temPagina);
  t('Gestão enxerga a midiateca', est.naPermGestao);
  t('Campo também enxerga, para ver o vídeo da obra dele', est.naPermCampo);
  t('virou aba dentro de Mídia', est.aba);

  console.log('\n— a ficha entra, o arquivo não —');
  const g = await page.evaluate(async () => {
    const id = await galDoEstudio('C:\\Users\\juvenil\\Videos\\obra.mp4',
      'As 9 etapas em 3D', { duracao: 60, bytes: 12582912, largura: 1920, altura: 1080, tipo: 'Vídeo da obra' });
    const f = await dbGet('midiateca', id);
    const bruto = JSON.stringify(f);
    return {
      id, titulo: f.titulo, caminho: f.caminho, nomeArq: f.nomeArq,
      duracao: f.duracao, bytes: f.bytes, origem: f.origem,
      /* o teste que importa: nada de vídeo embutido na ficha */
      temDataURL: /data:video|data:application\/octet/.test(bruto),
      tamanhoFicha: bruto.length,
    };
  });
  t('o Estúdio consegue mandar a peça para a midiateca', !!g.id);
  t('guardou o caminho do disco', g.caminho === 'C:\\Users\\juvenil\\Videos\\obra.mp4');
  t('tirou o nome do arquivo do caminho', g.nomeArq === 'obra.mp4', g.nomeArq);
  t('guardou duração e tamanho', g.duracao === 60 && g.bytes === 12582912);
  t('marcou que veio do Estúdio', g.origem === 'Estúdio');
  t('A FICHA NÃO CARREGA O VÍDEO DENTRO', !g.temDataURL);
  t('a ficha é pequena (menos de 2 KB)', g.tamanhoFicha < 2048, g.tamanhoFicha + ' bytes');

  console.log('\n— a tela mostra o que tem, e diz o que falta —');
  const tela = await page.evaluate(async () => {
    await go('galeria');
    await new Promise(r => setTimeout(r, 400));
    const html = document.getElementById('galeria-root').innerHTML;
    const texto = document.getElementById('galeria-root').innerText;
    return {
      mostraTitulo: /As 9 etapas em 3D/.test(texto),
      contaUm: /\b1\b/.test(texto),
      /* fora do aplicativo o caminho do disco não toca: a tela tem de
         dizer isso em vez de mostrar um quadro preto sem explicação */
      avisaArquivoNoutroLugar: /outro aparelho/i.test(texto),
      ofereceApontar: /Apontar o arquivo/i.test(texto),
      explicaNavegador: /navegador não deixa/i.test(texto),
      semVideoTocando: !/<video/.test(html),
      duracaoNaTela: /1:00/.test(texto),
      tamanhoNaTela: /12\.0 MB|12,0 MB/.test(texto),
    };
  });
  t('a peça aparece na lista', tela.mostraTitulo);
  t('avisa que o arquivo está em outro aparelho', tela.avisaArquivoNoutroLugar);
  t('oferece apontar o arquivo', tela.ofereceApontar);
  t('explica por que o navegador não abre sozinho', tela.explicaNavegador);
  t('não finge tocar um vídeo que não alcança', tela.semVideoTocando);
  t('mostra a duração em minutos', tela.duracaoNaTela);
  t('mostra o tamanho em MB', tela.tamanhoNaTela);

  console.log('\n— contas e filtros —');
  const c = await page.evaluate(() => ({
    d0: galDuracao(0), d59: galDuracao(59), d60: galDuracao(60), d3661: galDuracao(3661),
    t0: galTamanho(0), tk: galTamanho(2048), tm: galTamanho(12582912),
    vid: [galEhVideo('a.mp4'), galEhVideo('b.MOV'), galEhVideo('c.webm'),
          galEhVideo('d.txt'), galEhVideo('')],
  }));
  t('duração 0 vira 0:00', c.d0 === '0:00');
  t('59 s vira 0:59', c.d59 === '0:59');
  t('60 s vira 1:00', c.d60 === '1:00');
  t('3661 s vira 61:01', c.d3661 === '61:01', c.d3661);
  t('tamanho vazio vira travessão', c.t0 === '—');
  t('2 KB', c.tk === '2 KB', c.tk);
  t('12 MB', c.tm === '12.0 MB', c.tm);
  t('reconhece mp4, mov e webm; recusa txt e vazio',
    JSON.stringify(c.vid) === JSON.stringify([true, true, true, false, false]), JSON.stringify(c.vid));

  const f = await page.evaluate(async () => {
    await galDoEstudio('/tmp/produto.mp4', 'Vídeo do produto', { tipo: 'Vídeo de produto' });
    GAL.busca = 'etapas'; await galeriaRender();
    const comBusca = document.getElementById('galeria-root').innerText;
    GAL.busca = ''; GAL.tipo = 'Vídeo de produto'; await galeriaRender();
    const comTipo = document.getElementById('galeria-root').innerText;
    GAL.tipo = ''; await galeriaRender();
    return {
      buscaAchou: /As 9 etapas/.test(comBusca) && !/Vídeo do produto/.test(comBusca),
      tipoFiltrou: /Vídeo do produto/.test(comTipo) && !/As 9 etapas/.test(comTipo),
      total: (await dbGetAll('midiateca')).length,
    };
  });
  t('a busca filtra pelo título', f.buscaAchou);
  t('o filtro de tipo funciona', f.tipoFiltrou);
  t('as duas peças estão guardadas', f.total === 2, 'deu ' + f.total);

  console.log('\n— apagar tira a ficha, nunca o arquivo —');
  const d = await page.evaluate(async () => {
    const itens = await dbGetAll('midiateca');
    const alvo = itens.find(x => x.titulo === 'Vídeo do produto');
    await dbDel('midiateca', alvo.id);
    const sobrou = await dbGetAll('midiateca');
    return { n: sobrou.length, restou: sobrou[0].titulo };
  });
  t('a ficha removida sai da lista', d.n === 1 && d.restou === 'As 9 etapas em 3D');

  await browser.close();
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

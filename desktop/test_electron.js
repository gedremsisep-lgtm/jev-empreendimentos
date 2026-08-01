/* Testa o aplicativo de janela: abre o Electron de verdade, carrega o sistema,
   confere a ponte com o preload e simula a abertura de um arquivo .jev. */
const { _electron: electron } = require('/root/jev/node_modules/playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const erros = [];
  const ok = (t, v) => console.log((v === true ? '  OK  ' : ' FALHA') + '  ' + t + (v === true ? '' : '  → ' + JSON.stringify(v)));

  const app = await electron.launch({
    args: [path.join(__dirname, '.'), '--no-sandbox', '--disable-gpu'],
    executablePath: path.join(__dirname, 'node_modules/electron/dist/electron'),
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }
  });

  const page = await app.firstWindow();
  page.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push('CONSOLE: ' + m.text()); });

  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  ok('janela abriu com o título certo', (await page.title()) === 'JeV Empreendimentos — Gestão Integrada'
    || (await page.title()).includes('JeV'));
  ok('sistema carregou dentro do aplicativo', await page.evaluate(() => !!document.getElementById('hub-root').innerHTML));
  ok('ponte com o aplicativo disponível', await page.evaluate(() => !!(window.JeVDesktop && window.JeVDesktop.ehAplicativo)));

  const ver = await page.evaluate(() => window.JeVDesktop.versao());
  ok('versão informada pelo aplicativo: ' + ver, ver === '1.0.0');

  const pasta = await page.evaluate(() => window.JeVDesktop.pastaDados());
  ok('pasta de dados informada', typeof pasta === 'string' && pasta.length > 3 ? true : pasta);

  ok('rodapé do logo mostra a versão',
    await page.evaluate(() => (document.querySelector('.lgt span').textContent || '').includes('versão')));

  ok('menu em português montado', await app.evaluate(async ({ Menu }) => {
    const m = Menu.getApplicationMenu();
    return !!m && m.items.map(i => i.label).join('|') === 'Arquivo|Editar|Exibir|Ajuda';
  }));

  // --- abrir um arquivo .jev como se fosse dois cliques no Windows
  const pacote = await page.evaluate(async () => {
    const obraId = await dbAdd('obras', { cod: 'OB-77', nome: 'Obra do Electron', status: 'Em andamento',
      dtInicio: hoje(), dtPrevFim: addDias(hoje(), 120) });
    return await pacoteCriar('gui', {
      v: 1, usuario: 'Teste Electron', aparelho: 'PC', em: new Date().toISOString(),
      guias: [{ ref: 'e001', tipo: 'ocorrencia', autor: 'Teste Electron',
        dados: { un: 'obras', refId: obraId, titulo: 'Aviso pelo arquivo', gravidade: 'Informação',
                 data: hoje(), texto: 'Chegou pelo duplo clique no arquivo .jev.', fotos: [] } }]
    });
  });
  const arq = path.join(require('os').tmpdir(), 'teste-abertura.jev');
  fs.writeFileSync(arq, pacote, 'utf8');

  await app.evaluate(async ({ BrowserWindow }, dados) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.send('jev-arquivo', dados);
  }, { nome: 'teste-abertura.jev', texto: fs.readFileSync(arq, 'utf8') });

  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({ pg: PG, guias: GUIAS_D.length }));
  ok('arquivo .jev abriu a caixa de entrada e importou', st.pg === 'cel' && st.guias === 1 ? true : st);

  await page.screenshot({ path: path.join(__dirname, 's_app_janela.png') });

  console.log('\n' + (erros.length ? 'ERROS:\n' + erros.join('\n') : 'Nenhum erro de JavaScript.'));
  await app.close();
  process.exit(erros.length ? 1 : 0);
})();

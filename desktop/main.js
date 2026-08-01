/* =========================================================================
   JeV Empreendimentos — aplicativo de janela (Electron)
   Abre o sistema em janela própria, com menus em português, atalhos,
   associação com os arquivos .jev e atualização automática de versão.
   ========================================================================= */
const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const ehWindows = process.platform === 'win32';
let janela = null;
let arquivoPendente = null;      // .jev aberto com dois cliques antes de a janela existir
let checandoManual = false;

/* uma instância só — abrir um .jev com o app aberto usa a janela existente */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const arq = arquivoDaLinhaDeComando(argv);
    if (arq) enviarArquivo(arq);
    if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); }
  });
}

function arquivoDaLinhaDeComando(argv) {
  const a = (argv || []).find(x => typeof x === 'string' && x.toLowerCase().endsWith('.jev'));
  return a && fs.existsSync(a) ? a : null;
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    show: false,
    backgroundColor: '#F5F4F0',
    title: 'JeV Empreendimentos',
    icon: path.join(__dirname, 'build', ehWindows ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  janela.loadFile(path.join(__dirname, 'app', 'index.html'));

  janela.once('ready-to-show', () => {
    janela.maximize();
    janela.show();
    if (arquivoPendente) { enviarArquivo(arquivoPendente); arquivoPendente = null; }
  });

  /* links externos abrem no navegador, não dentro do sistema */
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  janela.on('closed', () => { janela = null; });
}

/* downloads (backup, planilhas, pacotes) sempre perguntam onde salvar */
function configurarDownloads() {
  session.defaultSession.on('will-download', (_e, item) => {
    item.setSaveDialogOptions({
      title: 'Salvar arquivo',
      defaultPath: path.join(app.getPath('downloads'), item.getFilename())
    });
  });
}

function enviarArquivo(caminho) {
  try {
    const texto = fs.readFileSync(caminho, 'utf8');
    if (janela) janela.webContents.send('jev-arquivo', { nome: path.basename(caminho), texto });
    else arquivoPendente = caminho;
  } catch (e) {
    dialog.showErrorBox('Não consegui abrir o arquivo', e.message);
  }
}

/* =========================================================================
   MENU EM PORTUGUÊS
   ========================================================================= */
function montarMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Abrir pacote do celular (.jev)…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const r = await dialog.showOpenDialog(janela, {
              title: 'Abrir pacote do celular',
              filters: [{ name: 'Pacote da JeV', extensions: ['jev', 'txt', 'json'] }],
              properties: ['openFile']
            });
            if (!r.canceled && r.filePaths[0]) enviarArquivo(r.filePaths[0]);
          }
        },
        { type: 'separator' },
        { label: 'Imprimir…', accelerator: 'CmdOrCtrl+P', click: () => janela && janela.webContents.print() },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', role: 'undo' },
        { label: 'Refazer', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Colar', role: 'paste' },
        { label: 'Selecionar tudo', role: 'selectAll' }
      ]
    },
    {
      label: 'Exibir',
      submenu: [
        { label: 'Recarregar', role: 'reload' },
        { type: 'separator' },
        { label: 'Aumentar zoom', role: 'zoomIn' },
        { label: 'Diminuir zoom', role: 'zoomOut' },
        { label: 'Tamanho normal', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Tela cheia', role: 'togglefullscreen' },
        { label: 'Ferramentas do desenvolvedor', role: 'toggleDevTools', visible: false }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Procurar atualização',
          click: () => {
            checandoManual = true;
            autoUpdater.checkForUpdates().catch(e => {
              checandoManual = false;
              dialog.showMessageBox(janela, {
                type: 'info', title: 'Atualização',
                message: 'Não consegui verificar agora.',
                detail: 'Confira sua conexão com a internet e tente de novo.\n\n' + (e.message || ''),
                buttons: ['Fechar']
              });
            });
          }
        },
        {
          label: 'Onde ficam meus dados',
          click: () => dialog.showMessageBox(janela, {
            type: 'info', title: 'Onde ficam meus dados',
            message: 'Tudo fica gravado neste computador.',
            detail: 'O sistema não usa servidor: os dados ficam no armazenamento local do aplicativo, ' +
                    'nesta pasta:\n\n' + app.getPath('userData') +
                    '\n\nFaça o backup pelo botão do banco de dados, no alto da tela, e guarde o arquivo ' +
                    'em nuvem ou pendrive toda semana.',
            buttons: ['Entendi']
          })
        },
        { type: 'separator' },
        {
          label: 'Sobre o JeV Empreendimentos',
          click: () => dialog.showMessageBox(janela, {
            type: 'info', title: 'Sobre',
            message: 'JeV Empreendimentos',
            detail: `Versão ${app.getVersion()}\n` +
                    `Electron ${process.versions.electron} · Chromium ${process.versions.chrome}\n\n` +
                    'Gestão de obras, imóveis, veículos, chácara, produtos, infoprodutos e mídia.\n' +
                    'Funciona sem internet. As guias do JeV Mobile entram em “Celular da equipe”.',
            buttons: ['Fechar']
          })
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

/* =========================================================================
   ATUALIZAÇÃO AUTOMÁTICA (GitHub Releases)
   ========================================================================= */
function configurarAtualizacao() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', info => {
    if (janela) janela.webContents.send('jev-atualizacao', { fase: 'baixando', versao: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    if (janela) janela.webContents.send('jev-atualizacao', { fase: 'atualizado' });
    if (checandoManual) {
      checandoManual = false;
      dialog.showMessageBox(janela, {
        type: 'info', title: 'Atualização',
        message: 'Você já está na versão mais nova.',
        detail: 'Versão instalada: ' + app.getVersion(),
        buttons: ['Fechar']
      });
    }
  });

  autoUpdater.on('download-progress', p => {
    if (janela) janela.webContents.send('jev-atualizacao', { fase: 'progresso', pct: Math.round(p.percent) });
  });

  autoUpdater.on('update-downloaded', async info => {
    checandoManual = false;
    if (janela) janela.webContents.send('jev-atualizacao', { fase: 'pronta', versao: info.version });
    const r = await dialog.showMessageBox(janela, {
      type: 'question',
      title: 'Nova versão pronta',
      message: `A versão ${info.version} do JeV Empreendimentos já foi baixada.`,
      detail: 'Quer instalar agora? O sistema fecha e abre de novo em alguns segundos. ' +
              'Seus dados não são afetados.',
      buttons: ['Instalar agora', 'Instalar quando eu fechar'],
      defaultId: 0, cancelId: 1
    });
    if (r.response === 0) { setImmediate(() => autoUpdater.quitAndInstall(false, true)); }
  });

  autoUpdater.on('error', err => {
    if (janela) janela.webContents.send('jev-atualizacao', { fase: 'erro' });
    if (checandoManual) {
      checandoManual = false;
      dialog.showMessageBox(janela, {
        type: 'warning', title: 'Atualização',
        message: 'Não consegui verificar a atualização.',
        detail: String((err && err.message) || err),
        buttons: ['Fechar']
      });
    }
  });

  // verificação silenciosa 8 segundos depois de abrir e depois a cada 6 horas
  if (app.isPackaged) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 8000);
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
  }
}

/* =========================================================================
   CICLO DE VIDA
   ========================================================================= */
ipcMain.handle('jev-versao', () => app.getVersion());
ipcMain.handle('jev-pasta-dados', () => app.getPath('userData'));
ipcMain.handle('jev-checar-atualizacao', () => {
  checandoManual = true;
  return autoUpdater.checkForUpdates().then(() => true).catch(() => false);
});

app.on('open-file', (e, caminho) => { e.preventDefault(); enviarArquivo(caminho); });

app.whenReady().then(() => {
  arquivoPendente = arquivoDaLinhaDeComando(process.argv);
  configurarDownloads();
  montarMenu();
  criarJanela();
  configurarAtualizacao();

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

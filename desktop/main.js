/* =========================================================================
   JeV Empreendimentos — aplicativo de janela (Electron)
   Abre o sistema em janela própria, com menus em português, atalhos,
   associação com os arquivos .jev, atualização do sistema (com teste e
   volta atrás) e atualização do próprio programa.
   ========================================================================= */
const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const pacote = require('./package.json');

/* O motor de versões é um arquivo à parte. Se por qualquer motivo ele não
   estiver dentro do pacote, o sistema PRECISA abrir assim mesmo — sem
   atualização automática, mas abrindo. Nunca uma tela de erro no lugar. */
/* O publicador também entra protegido: se faltar no pacote, o programa
   continua abrindo e o botão apenas avisa que não está disponível. */
let publicador = null;
try {
  publicador = require('./publicador');
} catch (e) {
  console.error('publicador indisponível:', e && e.message);
}

/* O estúdio — montar o vídeo aqui dentro — entra pela mesma porta
   protegida: se faltar no pacote, o programa abre igual e o botão
   apenas avisa que não está disponível. */
let estudio = null;
try {
  estudio = require('./estudio');
} catch (e) {
  console.error('estúdio indisponível:', e && e.message);
}

let versoes;
let motorOk = true;
try {
  versoes = require('./atualizacao');
} catch (e) {
  motorOk = false;
  console.error('motor de versões indisponível:', e && e.message);
  const semMotor = { ok: false, erro: 'o motor de atualização não veio neste pacote' };
  versoes = {
    preparar: () => ({ caminho: path.join(__dirname, 'app', 'index.html') }),
    estado: () => ({
      versaoPrograma: app.getVersion(), atual: null, anterior: null, pendente: null,
      fase: 'ok', emTeste: null, recado: null, automatico: false, fonte: '',
      fonteCustomizada: false, ultimaChecagem: 0, historico: [], semMotor: true
    }),
    procurar: async () => { throw new Error(semMotor.erro); },
    baixarVersao: async () => { throw new Error(semMotor.erro); },
    reverter: () => semMotor,
    validar: () => ({ ok: true, jaValidada: true }),
    limparRecado: () => true,
    configurar: () => true,
    historico: () => [],
    guardarBackup: () => null,
    precisaTestar: () => false,
    cmpVer: () => 0
  };
}

/* Rede de segurança final: qualquer erro não tratado no programa não pode
   virar uma tela preta de erro. Registra, avisa em português e segue. */
process.on('uncaughtException', err => {
  console.error('erro não tratado:', err);
  try {
    if (app.isReady() && !BrowserWindow.getAllWindows().length) criarJanela();
    dialog.showErrorBox('JeV Empreendimentos',
      'Aconteceu um erro interno no programa, mas seus dados estão a salvo.\n\n' +
      'Detalhe técnico: ' + ((err && err.message) || err) +
      '\n\nSe a tela não abrir, use Atualizações → Reverter para a versão anterior, ' +
      'ou instale novamente a última versão.');
  } catch (e) {}
});

const ehWindows = process.platform === 'win32';
let janela = null;
let arquivoPendente = null;      // .jev aberto com dois cliques antes de a janela existir
let checandoManual = false;
let caminhoSistema = path.join(__dirname, 'app', 'index.html');
let vigia = null;                // relógio que vigia a versão em teste

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

function reiniciar() {
  if (!process.env.JEV_SEM_RELANCAR) app.relaunch();   // desligado só nos testes
  app.exit(0);
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

  janela.loadFile(caminhoSistema);

  janela.once('ready-to-show', () => {
    janela.maximize();
    janela.show();
    if (arquivoPendente) { enviarArquivo(arquivoPendente); arquivoPendente = null; }
  });

  /* se a versão nova nem carrega, volta atrás sem esperar o autoteste */
  janela.webContents.on('did-fail-load', (_e, cod, desc) => {
    if (versoes.precisaTestar() && cod !== -3) {
      voltarAtrasSozinho('a tela do sistema não carregou (' + desc + ')');
    }
  });
  janela.webContents.on('render-process-gone', () => {
    if (versoes.precisaTestar()) voltarAtrasSozinho('o sistema fechou sozinho ao abrir');
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
   VERSÃO EM TESTE — vigia e volta atrás
   ========================================================================= */
function voltarAtrasSozinho(motivo) {
  if (vigia) { clearTimeout(vigia); vigia = null; }
  const r = versoes.reverter(motivo, { descartar: true });
  if (!r.ok) return;
  if (process.env.JEV_SEM_RELANCAR) { reiniciar(); return; }   // nos testes não abre caixa
  dialog.showMessageBoxSync({
    type: 'warning',
    title: 'Atualização desfeita',
    message: 'A versão nova não passou no teste.',
    detail: 'Motivo: ' + motivo + '\n\nO sistema vai voltar sozinho para a versão ' +
            r.versao + ', que já estava funcionando. Seus dados não foram tocados.',
    buttons: ['Reabrir o sistema']
  });
  reiniciar();
}

function ligarVigia() {
  if (!versoes.precisaTestar()) return;
  /* o sistema tem 90 segundos para abrir e dizer que passou no autoteste */
  const ms = Number(process.env.JEV_VIGIA_MS) || 90000;
  vigia = setTimeout(() => {
    voltarAtrasSozinho('o sistema não respondeu ao teste em ' + Math.round(ms / 1000) + ' segundos');
  }, ms);
}

/* =========================================================================
   ATUALIZAÇÃO DO SISTEMA (o arquivo do sistema, sem reinstalar nada)
   ========================================================================= */
async function procurarSistema(manual) {
  try {
    const r = await versoes.procurar(pacote);
    if (!r.temNova) {
      if (manual) {
        dialog.showMessageBox(janela, {
          type: 'info', title: 'Atualização do sistema',
          message: r.jaBaixada
            ? 'A versão ' + r.jaBaixada + ' já está baixada, esperando você reiniciar.'
            : 'Você já está na versão mais nova.',
          detail: 'Versão em uso: ' + r.versaoAtual,
          buttons: ['Fechar']
        });
      }
      return r;
    }
    const e = versoes.estado(pacote);
    if (janela) janela.webContents.send('jev-sistema', {
      fase: 'encontrada', info: r.info,
      automatico: !manual && e.automatico !== false   // sozinho: baixa em segundo plano
    });
    return r;
  } catch (e) {
    if (manual) {
      dialog.showMessageBox(janela, {
        type: 'info', title: 'Atualização do sistema',
        message: 'Não consegui verificar agora.',
        detail: 'Confira a conexão com a internet e tente de novo.\n\n' + (e.message || ''),
        buttons: ['Fechar']
      });
    }
    if (janela) janela.webContents.send('jev-sistema', { fase: 'erro', erro: String(e.message || e) });
    throw e;
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
      label: 'Atualizações',
      submenu: [
        {
          label: 'Procurar atualização do sistema',
          click: () => { procurarSistema(true).catch(() => {}); }
        },
        {
          label: 'Abrir a tela de Atualizações',
          click: () => janela && janela.webContents.send('jev-sistema', { fase: 'abrir-tela' })
        },
        { type: 'separator' },
        {
          label: 'Reverter para a versão anterior…',
          click: () => menuReverter()
        },
        { type: 'separator' },
        {
          label: 'Procurar atualização do programa',
          click: () => checarPrograma()
        }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Onde ficam meus dados',
          click: () => dialog.showMessageBox(janela, {
            type: 'info', title: 'Onde ficam meus dados',
            message: 'Tudo fica gravado neste computador.',
            detail: 'O sistema não usa servidor: os dados ficam no armazenamento local do aplicativo, ' +
                    'nesta pasta:\n\n' + app.getPath('userData') +
                    '\n\nAs versões do sistema e os backups automáticos de antes de cada atualização ' +
                    'ficam nas subpastas "sistema" e "backups".\n\n' +
                    'Faça o backup pelo botão do banco de dados, no alto da tela, e guarde o arquivo ' +
                    'em nuvem ou pendrive toda semana.',
            buttons: ['Entendi']
          })
        },
        { type: 'separator' },
        {
          label: 'Sobre o JeV Empreendimentos',
          click: () => {
            const e = versoes.estado(pacote);
            dialog.showMessageBox(janela, {
              type: 'info', title: 'Sobre',
              message: 'JeV Empreendimentos',
              detail: `Sistema: versão ${(e.atual && e.atual.versao) || app.getVersion()}\n` +
                      `Programa: versão ${app.getVersion()}\n` +
                      `Electron ${process.versions.electron} · Chromium ${process.versions.chrome}\n\n` +
                      'Gestão de obras, imóveis, veículos, chácara, produtos, infoprodutos e mídia.\n' +
                      'Funciona sem internet. As guias do JeV Mobile entram em “Celular da equipe”.',
              buttons: ['Fechar']
            });
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

async function menuReverter() {
  const e = versoes.estado(pacote);
  if (!e.anterior) {
    dialog.showMessageBox(janela, {
      type: 'info', title: 'Reverter atualização',
      message: 'Não há versão anterior guardada.',
      detail: 'A volta atrás fica disponível a partir da primeira atualização aplicada.',
      buttons: ['Fechar']
    });
    return;
  }
  const r = await dialog.showMessageBox(janela, {
    type: 'question', title: 'Reverter atualização',
    message: `Voltar para a versão ${e.anterior.versao}?`,
    detail: `Você está usando a versão ${e.atual && e.atual.versao}. ` +
            `O sistema volta para a ${e.anterior.versao} e reabre em alguns segundos.\n\n` +
            'Seus dados NÃO são afetados — só o programa volta ao que era. ' +
            'Depois dá para avançar de novo pela tela de Atualizações.',
    buttons: ['Voltar para a ' + e.anterior.versao, 'Cancelar'],
    defaultId: 1, cancelId: 1
  });
  if (r.response !== 0) return;
  const res = versoes.reverter('pedido pelo usuário');
  if (res.ok) reiniciar();
}

/* =========================================================================
   ATUALIZAÇÃO DO PROGRAMA (o .exe, via GitHub Releases)
   ========================================================================= */
function atualizacaoConfigurada() {
  try {
    const arq = path.join(process.resourcesPath, 'app-update.yml');
    if (!fs.existsSync(arq)) return false;
    const txt = fs.readFileSync(arq, 'utf8');
    return !/SEU-USUARIO/i.test(txt);
  } catch (e) { return false; }
}

function checarPrograma() {
  if (!atualizacaoConfigurada()) {
    dialog.showMessageBox(janela, {
      type: 'info', title: 'Atualização do programa',
      message: 'A atualização do programa ainda não está ligada.',
      detail: 'Ela começa a funcionar depois que o sistema for publicado no GitHub.\n\n' +
              'Isso é diferente da atualização do sistema, que já funciona: as melhorias ' +
              'do dia a dia chegam por ali, sem reinstalar nada.',
      buttons: ['Entendi']
    });
    return;
  }
  checandoManual = true;
  autoUpdater.checkForUpdates().catch(e => {
    checandoManual = false;
    dialog.showMessageBox(janela, {
      type: 'info', title: 'Atualização do programa',
      message: 'Não consegui verificar agora.',
      detail: 'Confira sua conexão com a internet e tente de novo.\n\n' + (e.message || ''),
      buttons: ['Fechar']
    });
  });
}

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
        type: 'info', title: 'Atualização do programa',
        message: 'Você já está na versão mais nova do programa.',
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
      title: 'Nova versão do programa',
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
        type: 'warning', title: 'Atualização do programa',
        message: 'Não consegui verificar a atualização.',
        detail: String((err && err.message) || err),
        buttons: ['Fechar']
      });
    }
  });

  if (app.isPackaged && atualizacaoConfigurada()) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 20000);
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
  }
}

/* =========================================================================
   PONTES COM A TELA
   ========================================================================= */
ipcMain.handle('jev-versao', () => app.getVersion());
ipcMain.handle('jev-pasta-dados', () => app.getPath('userData'));
ipcMain.handle('jev-checar-atualizacao', () => {
  checandoManual = true;
  return autoUpdater.checkForUpdates().then(() => true).catch(() => false);
});

ipcMain.handle('versao-estado', () => versoes.estado(pacote));
ipcMain.handle('versao-limpar-recado', () => versoes.limparRecado());
ipcMain.handle('versao-configurar', (_e, cfg) => versoes.configurar(cfg || {}));
ipcMain.handle('versao-historico', () => versoes.historico());
ipcMain.handle('versao-backup', (_e, nome, texto) => versoes.guardarBackup(nome, texto));

ipcMain.handle('versao-procurar', async () => {
  try { return Object.assign({ ok: true }, await versoes.procurar(pacote)); }
  catch (e) { return { ok: false, erro: String(e.message || e) }; }
});

ipcMain.handle('versao-baixar', async (_e, info) => {
  try { return Object.assign({ ok: true }, await versoes.baixarVersao(pacote, info)); }
  catch (e) { return { ok: false, erro: String(e.message || e) }; }
});

ipcMain.handle('versao-aplicar', () => { setTimeout(reiniciar, 300); return true; });

/* ---------------------------------------------------------- publicador */
ipcMain.handle('pub-disponivel', () => !!publicador);

ipcMain.handle('pub-escolher-video', async () => {
  const r = await dialog.showOpenDialog(janela, {
    title: 'Escolha o vídeo que vai ser publicado',
    properties: ['openFile'],
    filters: [{ name: 'Vídeo', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi'] }]
  });
  if (r.canceled || !r.filePaths.length) return null;
  const caminho = r.filePaths[0];
  let tamanho = 0;
  try { tamanho = fs.statSync(caminho).size; } catch (e) {}
  return { caminho, nome: path.basename(caminho), tamanho };
});

ipcMain.handle('pub-publicar', async (_e, dados) => {
  if (!publicador) return { ok: false, motivo: 'o publicador não veio neste pacote' };
  try { return await publicador.publicar(dados || {}); }
  catch (e) { return { ok: false, motivo: String((e && e.message) || e) }; }
});

ipcMain.handle('pub-esquecer-logins', async () => {
  if (!publicador) return false;
  try { return await publicador.esquecerLogins(); } catch (e) { return false; }
});

/* ------------------------------------------------------------- estúdio */
const contaEstudio = evento => {
  if (janela && !janela.isDestroyed()) janela.webContents.send('estudio-passo', evento);
};

ipcMain.handle('est-disponivel', () => !!estudio);
ipcMain.handle('est-estado', (_e, opcoes) => {
  if (!estudio) return { pronto: false, semEstudio: true };
  try { return estudio.estado(opcoes || {}); } catch (e) { return { pronto: false, erro: String(e && e.message) }; }
});
ipcMain.handle('est-instalar', async () => {
  if (!estudio) return { ok: false, motivo: 'o estúdio não veio neste pacote' };
  try { return await estudio.instalar(contaEstudio); }
  catch (e) { return { ok: false, motivo: String((e && e.message) || e) }; }
});
ipcMain.handle('est-criar', async (_e, dados) => {
  if (!estudio) return { ok: false, motivo: 'o estúdio não veio neste pacote' };
  try { return await estudio.criar(dados || {}, contaEstudio); }
  catch (e) { return { ok: false, motivo: String((e && e.message) || e) }; }
});
ipcMain.handle('est-parar', () => { try { return estudio ? estudio.parar() : false; } catch (e) { return false; } });
ipcMain.handle('est-escolher', async (_e, qual) => {
  if (!estudio) return [];
  try { return await estudio.escolherArquivos(qual); } catch (e) { return []; }
});
ipcMain.handle('est-midia-produto', async (_e, url) => {
  if (!estudio) return { ok: false, motivo: 'o estúdio não veio neste pacote', fotos: [], videos: [] };
  try { return await estudio.midiaDoProduto(url); }
  catch (e) { return { ok: false, motivo: String((e && e.message) || e), fotos: [], videos: [] }; }
});
/* baixar a mídia do anúncio e guardar na pasta do produto */
ipcMain.handle('est-midia-baixar', async (_e, dados) => {
  if (!estudio) return { ok: false, arquivos: [], motivo: 'o estúdio não veio neste pacote' };
  try { return await estudio.baixarMidias(dados || {}, contaEstudio); }
  catch (e) { return { ok: false, arquivos: [], motivo: String((e && e.message) || e) }; }
});
ipcMain.handle('est-midia-guardada', (_e, chave) => {
  if (!estudio) return [];
  try { return estudio.midiasGuardadas(chave); } catch (e) { return []; }
});
ipcMain.handle('est-midia-limpar', (_e, chave) => {
  try { return estudio ? estudio.limparMidias(chave) : false; } catch (e) { return false; }
});

/* a IA de vídeo do computador do dono: examinar, instalar e apagar os pesos */
ipcMain.handle('est-ia-estado', () => {
  if (!estudio) return { pronto: false, pode_instalar: false, motivo: 'o estúdio não veio neste pacote' };
  try { return estudio.iaEstado(); }
  catch (e) { return { pronto: false, pode_instalar: false, motivo: String((e && e.message) || e) }; }
});
ipcMain.handle('est-ia-instalar', async () => {
  if (!estudio) return { ok: false, motivo: 'o estúdio não veio neste pacote' };
  try { return await estudio.iaInstalar(contaEstudio); }
  catch (e) { return { ok: false, motivo: String((e && e.message) || e) }; }
});
ipcMain.handle('est-ia-limpar', () => {
  try { return estudio ? estudio.iaLimpar() : false; } catch (e) { return false; }
});

ipcMain.handle('est-abrir-pasta', (_e, caminho) => {
  try { shell.showItemInFolder(caminho); return true; } catch (e) { return false; }
});
ipcMain.handle('est-guardar-como', async (_e, origem, sugestao) => {
  try {
    const r = await dialog.showSaveDialog(janela, {
      title: 'Guardar o vídeo', defaultPath: sugestao || path.basename(origem),
      filters: [{ name: 'Vídeo', extensions: ['mp4'] }]
    });
    if (r.canceled || !r.filePath) return '';
    fs.copyFileSync(origem, r.filePath);
    return r.filePath;
  } catch (e) { return ''; }
});
ipcMain.handle('est-faxina', (_e, guardar) => {
  try { return estudio ? estudio.faxina(guardar) : 0; } catch (e) { return 0; }
});

ipcMain.handle('versao-validar', (_e, ok, detalhes) => {
  if (vigia) { clearTimeout(vigia); vigia = null; }
  const r = versoes.validar(ok, detalhes);
  if (!ok && r.reverteu && r.reverteu.ok) setTimeout(reiniciar, 1200);
  return r;
});

ipcMain.handle('versao-reverter', (_e, motivo) => {
  const r = versoes.reverter(motivo || 'pedido pelo usuário');
  if (r.ok) setTimeout(reiniciar, 500);
  return r;
});

/* =========================================================================
   CICLO DE VIDA
   ========================================================================= */
app.on('open-file', (e, caminho) => { e.preventDefault(); enviarArquivo(caminho); });

/* pasta de dados trocada — usado pelos testes automáticos */
if (process.env.JEV_DADOS) { try { app.setPath('userData', process.env.JEV_DADOS); } catch (e) {} }

app.whenReady().then(() => {
  arquivoPendente = arquivoDaLinhaDeComando(process.argv);

  /* decide qual versão do sistema abrir — e, se preciso, já volta atrás */
  try {
    const r = versoes.preparar({
      pastaDados: app.getPath('userData'),
      embutido: path.join(__dirname, 'app', 'index.html'),
      versaoApp: app.getVersion()
    });
    if (r && r.caminho && fs.existsSync(r.caminho)) caminhoSistema = r.caminho;
  } catch (e) {
    console.error('motor de versões:', e);   // na dúvida, abre a cópia do instalador
  }

  if (process.env.JEV_FONTE) { try { versoes.configurar({ fonte: process.env.JEV_FONTE }); } catch (e) {} }

  configurarDownloads();
  montarMenu();
  criarJanela();
  ligarVigia();
  configurarAtualizacao();

  if (process.env.JEV_ROTEIRO) {
    try {
      require('./teste_roteiro').rodar(process.env.JEV_ROTEIRO, janela, versoes, app)
        .catch(e => { console.error(e); app.exit(1); });
    } catch (e) { console.error('roteiro de teste ausente:', e && e.message); }
    return;
  }

  /* procura sistema novo 15 s depois de abrir e depois a cada 3 horas */
  const auto = () => {
    const e = versoes.estado(pacote);
    if (e.automatico && e.fase === 'ok') procurarSistema(false).catch(() => {});
  };
  setTimeout(auto, 15000);
  /* fase de desenvolvimento: o programa também dá uma olhada a cada 10 min.
     O ritmo que vale no dia a dia é o do próprio sistema, que se atualiza
     sozinho — este aqui é só uma rede de segurança.                        */
  setInterval(auto, 10 * 60 * 1000);

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

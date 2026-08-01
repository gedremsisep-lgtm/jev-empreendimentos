/* Ponte segura entre a janela do Electron e a página do sistema.
   A página continua sendo um arquivo HTML comum — aqui só entra o que
   ela não conseguiria fazer sozinha: receber um .jev aberto com dois
   cliques, saber a versão instalada e comandar a troca de versão do
   sistema (baixar, aplicar, validar e reverter). */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('JeVDesktop', {
  ehAplicativo: true,

  /* chamado quando o usuário abre um arquivo .jev pelo Windows ou pelo menu */
  aoReceberArquivo(callback) {
    ipcRenderer.on('jev-arquivo', (_e, dados) => { try { callback(dados); } catch (e) { console.error(e); } });
  },

  /* avisos da atualização do programa (o .exe) */
  aoAtualizar(callback) {
    ipcRenderer.on('jev-atualizacao', (_e, dados) => { try { callback(dados); } catch (e) { console.error(e); } });
  },

  /* avisos da atualização do sistema (o arquivo do sistema) */
  aoSistema(callback) {
    ipcRenderer.on('jev-sistema', (_e, dados) => { try { callback(dados); } catch (e) { console.error(e); } });
  },

  versao: () => ipcRenderer.invoke('jev-versao'),
  pastaDados: () => ipcRenderer.invoke('jev-pasta-dados'),
  procurarAtualizacao: () => ipcRenderer.invoke('jev-checar-atualizacao'),

  /* ---- versões do sistema ---- */
  vsEstado:       ()             => ipcRenderer.invoke('versao-estado'),
  vsProcurar:     ()             => ipcRenderer.invoke('versao-procurar'),
  vsBaixar:       info           => ipcRenderer.invoke('versao-baixar', info),
  vsAplicar:      ()             => ipcRenderer.invoke('versao-aplicar'),
  vsValidar:      (ok, detalhes) => ipcRenderer.invoke('versao-validar', ok, detalhes),
  vsReverter:     motivo         => ipcRenderer.invoke('versao-reverter', motivo),
  vsLimparRecado: ()             => ipcRenderer.invoke('versao-limpar-recado'),
  vsConfigurar:   cfg            => ipcRenderer.invoke('versao-configurar', cfg),
  vsHistorico:    ()             => ipcRenderer.invoke('versao-historico'),
  vsBackup:       (nome, texto)  => ipcRenderer.invoke('versao-backup', nome, texto)
});

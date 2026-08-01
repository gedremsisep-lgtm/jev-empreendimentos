/* Ponte segura entre a janela do Electron e a página do sistema.
   A página continua sendo um arquivo HTML comum — aqui só entra o que
   ela não conseguiria fazer sozinha: receber um .jev aberto com dois
   cliques e saber o número da versão instalada. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('JeVDesktop', {
  ehAplicativo: true,

  /* chamado quando o usuário abre um arquivo .jev pelo Windows ou pelo menu */
  aoReceberArquivo(callback) {
    ipcRenderer.on('jev-arquivo', (_e, dados) => { try { callback(dados); } catch (e) { console.error(e); } });
  },

  /* avisos da atualização automática */
  aoAtualizar(callback) {
    ipcRenderer.on('jev-atualizacao', (_e, dados) => { try { callback(dados); } catch (e) { console.error(e); } });
  },

  versao: () => ipcRenderer.invoke('jev-versao'),
  pastaDados: () => ipcRenderer.invoke('jev-pasta-dados'),
  procurarAtualizacao: () => ipcRenderer.invoke('jev-checar-atualizacao')
});

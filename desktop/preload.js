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
  vsBackup:       (nome, texto)  => ipcRenderer.invoke('versao-backup', nome, texto),

  /* ---- publicador: abre a plataforma já com o vídeo e o texto ---- */
  pubDisponivel:    ()      => ipcRenderer.invoke('pub-disponivel'),
  pubEscolherVideo: ()      => ipcRenderer.invoke('pub-escolher-video'),
  pubPublicar:      dados   => ipcRenderer.invoke('pub-publicar', dados),
  pubEsquecerLogins:()      => ipcRenderer.invoke('pub-esquecer-logins'),

  /* ---- estúdio: o vídeo é montado aqui dentro, no seu computador ---- */
  estDisponivel:  ()               => ipcRenderer.invoke('est-disponivel'),
  estEstado:      opcoes           => ipcRenderer.invoke('est-estado', opcoes),
  estInstalar:    ()               => ipcRenderer.invoke('est-instalar'),
  estCriar:       dados            => ipcRenderer.invoke('est-criar', dados),
  estParar:       ()               => ipcRenderer.invoke('est-parar'),
  estEscolher:    qual             => ipcRenderer.invoke('est-escolher', qual),
  estMidiaProduto:url              => ipcRenderer.invoke('est-midia-produto', url),
  /* ---- baixar a mídia do anúncio e guardar na pasta do produto ---- */
  estMidiaBaixar: dados            => ipcRenderer.invoke('est-midia-baixar', dados),
  estMidiaGuardada:chave           => ipcRenderer.invoke('est-midia-guardada', chave),
  estMidiaLimpar: chave            => ipcRenderer.invoke('est-midia-limpar', chave),
  /* ---- IA de vídeo rodando no seu PC (só NVIDIA, e só quando você manda) ---- */
  estIaEstado:    ()               => ipcRenderer.invoke('est-ia-estado'),
  estIaInstalar:  ()               => ipcRenderer.invoke('est-ia-instalar'),
  estIaLimpar:    ()               => ipcRenderer.invoke('est-ia-limpar'),
  estAbrirPasta:  caminho          => ipcRenderer.invoke('est-abrir-pasta', caminho),
  estGuardarComo: (origem, nome)   => ipcRenderer.invoke('est-guardar-como', origem, nome),
  estFaxina:      guardar          => ipcRenderer.invoke('est-faxina', guardar),
  /* o andamento chega por aqui, ao vivo, enquanto o vídeo é montado */
  aoEstudio(callback) {
    ipcRenderer.on('estudio-passo', (_e, dados) => {
      try { callback(dados); } catch (e) { console.error(e); }
    });
  }
});

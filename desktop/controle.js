/* =========================================================================
   CONTROLE — a ponte entre o JeV e o Mission Control

   O QUE ESTA PEÇA NÃO FAZ
   -----------------------
   Ela NÃO copia o Mission Control para dentro do JeV. Copiar criaria duas
   verdades: o painel avulso mostrando uma coisa, o sistema mostrando outra,
   e um dia ninguém sabendo qual está certa. Aqui se faz `require` dos
   arquivos originais, na pasta original. Uma fonte só.

   COMO ELA ACHA A PASTA
   ---------------------
   1. o caminho que o dono escolheu, guardado em userData/controle.json
   2. C:\JeV\MissionControl (onde está hoje)
   3. ../MissionControl e ../../MissionControl, relativos ao programa
   Achou agents.json lá dentro, é ela.

   A PORTA PROTEGIDA
   -----------------
   Todo `require` do Mission Control é dentro de try/catch. Se a pasta sumir,
   se o arquivo estiver corrompido, se o dono apagar tudo — o JeV abre igual,
   e a tela Controle explica o que houve em vez de a janela ficar branca.
   Recurso que derruba o programa quando falta não é recurso: é armadilha.

   O EXECUTOR DENTRO DO PROGRAMA
   -----------------------------
   O runner.js roda as rotinas com `spawn('node ...')`. Na máquina do dono
   pode não haver Node instalado — mas há o Electron, que É um Node por
   dentro. MC_NODE aponta para o próprio executável e ELECTRON_RUN_AS_NODE=1
   diz a ele para se comportar como Node puro. É assim que a rotina roda sem
   pedir que ninguém instale nada.
   ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

let PASTA = null;     /* a pasta do Mission Control, quando encontrada */
let ws = null;        /* state.js, já apontado para o workspace          */
let runner = null;    /* runner.js, o executor de rotinas                */
let servidor = null;  /* o processo do server.js, só para o 3D           */
let motivo = '';      /* por que não deu, quando não dá                  */

function arquivoConfig(app){ return path.join(app.getPath('userData'), 'controle.json'); }

function lerConfig(app){
  try { return JSON.parse(fs.readFileSync(arquivoConfig(app), 'utf8')); }
  catch { return {}; }
}
function gravarConfig(app, obj){
  const abs = arquivoConfig(app);
  fs.mkdirSync(path.dirname(abs), {recursive:true});
  fs.writeFileSync(abs, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

/* uma pasta só vale se tiver as três peças que a ponte usa */
function ehMissionControl(dir){
  if(!dir) return false;
  try {
    return fs.existsSync(path.join(dir, 'state.js'))
        && fs.existsSync(path.join(dir, 'runner.js'))
        && fs.existsSync(path.join(dir, 'workspace', 'agents.json'));
  } catch { return false; }
}

function candidatos(app){
  const c = [];
  const cfg = lerConfig(app);
  if(cfg.pasta) c.push(cfg.pasta);
  if(process.platform === 'win32') c.push('C:\\JeV\\MissionControl');
  const base = path.dirname(app.getAppPath ? app.getAppPath() : __dirname);
  c.push(path.join(base, 'MissionControl'));
  c.push(path.join(base, '..', 'MissionControl'));
  c.push(path.join(path.dirname(process.execPath), 'MissionControl'));
  return c;
}

function achar(app){
  for(const dir of candidatos(app)) if(ehMissionControl(dir)) return dir;
  return null;
}

/* ------------------------------------------------------------------ ligar */
function ligar(app, opc){
  opc = opc || {};
  PASTA = achar(app);
  if(!PASTA){
    motivo = 'não encontrei a pasta do Mission Control';
    return {ok:false, motivo, procurei:candidatos(app)};
  }
  try {
    /* require com caminho absoluto: os arquivos NÃO são copiados para o
       pacote do programa, então não podem ser exigidos pelo nome curto */
    ws     = require(path.join(PASTA, 'state.js')).criar(path.join(PASTA, 'workspace'));
    runner = require(path.join(PASTA, 'runner.js'));
  } catch(e){
    ws = null; runner = null;
    motivo = 'a pasta existe mas não consegui carregá-la: ' + e.message;
    return {ok:false, motivo, pasta:PASTA};
  }
  /* o executor precisa saber qual workspace e qual Node usar ANTES de subir */
  process.env.MC_WORKSPACE = path.join(PASTA, 'workspace');
  process.env.MC_NODE = process.execPath;
  process.env.ELECTRON_RUN_AS_NODE = '1';
  try { if(opc.executor !== false) runner.start(); }
  catch(e){ motivo = 'o executor de rotinas não subiu: ' + e.message; }
  return {ok:true, pasta:PASTA, executor: opc.executor !== false};
}

/* --------------------------------------------- o servidor, só para o 3D */
/* O painel avulso (com o escritório 3D) mora no server.js. Ele sobe com
   MC_NO_RUNNER=1 para NÃO ligar um segundo executor — dois executores
   rodariam a mesma rotina duas vezes, e ninguém entenderia por quê. */
function subirServidor(){
  if(!PASTA) return {ok:false, motivo:'Mission Control não encontrado'};
  if(servidor && !servidor.killed) return {ok:true, jaEstava:true, url:'http://127.0.0.1:3020'};
  try {
    const {spawn} = require('child_process');
    servidor = spawn(process.execPath, [path.join(PASTA, 'server.js')], {
      cwd: PASTA, stdio:'ignore', windowsHide:true,
      env: {...process.env, ELECTRON_RUN_AS_NODE:'1', MC_NO_RUNNER:'1',
            MC_WORKSPACE: path.join(PASTA, 'workspace')},
    });
    servidor.unref();
    return {ok:true, url:'http://127.0.0.1:3020'};
  } catch(e){ return {ok:false, motivo:e.message}; }
}
function pararServidor(){
  try { if(servidor && !servidor.killed) servidor.kill(); } catch {}
  servidor = null;
}

/* ------------------------------------------------------- o que a tela lê */
function estado(){
  if(!ws) return {disponivel:false, motivo: motivo || 'Mission Control não está ligado', pasta:PASTA};
  try {
    const s = ws.buildState();
    /* a tela precisa saber se a rotina está rodando AGORA, e isso só o
       executor sabe — o arquivo de rotinas não guarda essa informação */
    if(runner && s.cron && Array.isArray(s.cron.jobs)){
      for(const j of s.cron.jobs){ try { j.rodandoAgora = runner.isRunning(j.id); } catch { j.rodandoAgora = false; } }
    }
    return {disponivel:true, pasta:PASTA, servidor: !!(servidor && !servidor.killed), ...s};
  } catch(e){ return {disponivel:false, motivo:e.message, pasta:PASTA}; }
}

function arquivo(rel){
  if(!ws) throw new Error(motivo || 'Mission Control não está ligado');
  return ws.file(rel);
}
function mudarTarefa(id, dados){
  if(!ws) throw new Error(motivo || 'Mission Control não está ligado');
  return ws.patchTask(id, dados);
}
function mudarRotina(id, dados){
  if(!ws) throw new Error(motivo || 'Mission Control não está ligado');
  const j = ws.patchJob(id, dados);
  try { if(runner) runner.refreshNextRuns(); } catch {}
  return j;
}
async function rodarAgora(id){
  if(!runner) throw new Error(motivo || 'o executor de rotinas não está ligado');
  if(runner.isRunning(id)) throw new Error('essa rotina já está rodando');
  runner.runNow(id).catch(()=>{});   /* não segura a tela esperando terminar */
  return {ok:true, iniciada:id};
}
function mudarAgente(id, dados){
  if(!ws) throw new Error(motivo || 'Mission Control não está ligado');
  return ws.patchAgent(id, dados);
}
function criarAgente(dados){
  if(!ws) throw new Error(motivo || 'Mission Control não está ligado');
  return ws.createAgent(dados);
}

/* o dono aponta outra pasta pelo botão "Pasta" */
function definirPasta(app, dir){
  if(!ehMissionControl(dir))
    throw new Error('essa pasta não parece um Mission Control: falta state.js, runner.js ou workspace/agents.json');
  const cfg = lerConfig(app); cfg.pasta = dir; gravarConfig(app, cfg);
  /* o require guarda cache por caminho; limpar é o que permite trocar de
     pasta sem fechar o programa */
  try {
    if(PASTA){
      delete require.cache[require.resolve(path.join(PASTA, 'state.js'))];
      delete require.cache[require.resolve(path.join(PASTA, 'runner.js'))];
    }
  } catch {}
  ws = null; runner = null; pararServidor();
  return ligar(app, {executor:true});
}

module.exports = {
  ligar, estado, arquivo, mudarTarefa, mudarRotina, rodarAgora,
  mudarAgente, criarAgente, definirPasta, subirServidor, pararServidor,
  get pasta(){ return PASTA; },
  get pronto(){ return !!ws; },
};

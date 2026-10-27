/* =========================================================================
   AGENTES — a sede dos agentes de IA ("JeV Empreendimentos — sede dos
   agentes"), vista a partir do JeV.

   A sede é um programa à parte, numa pasta fora do pacote (por padrão
   C:\JeV\jev-agentes), com o próprio servidor em 127.0.0.1:3030. Esta peça
   faz só três coisas: acha a pasta, sobe o servidor quando ele não está no
   ar (usando o próprio Electron em modo Node, sem depender do Node do PATH)
   e abre o painel numa janela do JeV. Nada do painel é copiado para cá.

   Nenhuma chave de IA passa por aqui: elas moram no .env da sede, no
   computador onde o servidor roda, e nunca atravessam a ponte.
   ========================================================================= */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const URL_SEDE = 'http://127.0.0.1:3030';
let PASTA = null;
let servidor = null;     // processo do server.js, quando fomos nós que subimos
let janela = null;       // BrowserWindow com o painel
let motivo = '';

function arquivoConfig(app) { return path.join(app.getPath('userData'), 'agentes.json'); }
function lerConfig(app) { try { return JSON.parse(fs.readFileSync(arquivoConfig(app), 'utf8')); } catch { return {}; } }
function gravarConfig(app, obj) { try { fs.mkdirSync(path.dirname(arquivoConfig(app)), { recursive: true }); fs.writeFileSync(arquivoConfig(app), JSON.stringify({ ...lerConfig(app), ...obj }, null, 2)); } catch (e) { console.error('agentes: não gravei a configuração —', e.message); } }
function ehSede(dir) { try { return !!dir && fs.existsSync(path.join(dir, 'server.js')) && fs.existsSync(path.join(dir, 'engine', 'orquestrador.js')); } catch { return false; } }
function candidatos(app) {
  const c = [];
  const cfg = lerConfig(app); if (cfg.pasta) c.push(cfg.pasta);
  if (process.platform === 'win32') c.push('C:\\JeV\\jev-agentes');
  const base = path.resolve(__dirname, '..');
  c.push(path.join(base, 'jev-agentes'), path.join(base, '..', 'jev-agentes'), path.join(path.dirname(process.execPath), 'jev-agentes'));
  return c;
}
function achar(app) { for (const d of candidatos(app)) if (ehSede(d)) return d; return null; }

/* o servidor responde? (200 = painel aberto; 401 = pedindo senha; os dois contam como "no ar") */
function pingar() {
  return new Promise(resolve => {
    const req = http.get(URL_SEDE + '/api/state', { timeout: 1500 }, res => { res.resume(); resolve(res.statusCode === 200 || res.statusCode === 401); });
    req.on('error', () => resolve(false)); req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
const espera = ms => new Promise(r => setTimeout(r, ms));

/* garante que o servidor da sede está no ar; sobe se preciso e espera responder */
async function garantir(app) {
  if (await pingar()) return { ok: true, url: URL_SEDE, jaEstava: true };
  PASTA = PASTA || achar(app);
  if (!PASTA) { motivo = 'não encontrei a pasta da sede dos agentes (jev-agentes)'; return { ok: false, motivo, procurei: candidatos(app) }; }
  if (!servidor || servidor.killed) {
    try {
      const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', JA_HOST: '127.0.0.1', JA_PORT: '3030' };
      servidor = spawn(process.execPath, [path.join(PASTA, 'server.js')], { cwd: PASTA, stdio: 'ignore', windowsHide: true, env });
      servidor.on('exit', () => { servidor = null; });
      servidor.unref();
    } catch (e) { motivo = 'não consegui subir o servidor: ' + e.message; return { ok: false, motivo, pasta: PASTA }; }
  }
  for (let i = 0; i < 20; i++) { await espera(400); if (await pingar()) return { ok: true, url: URL_SEDE, pasta: PASTA }; }
  motivo = 'o servidor foi chamado mas não respondeu em 8 segundos. Abra ' + path.join(PASTA, 'INICIAR.bat') + ' para ver a mensagem de erro.';
  return { ok: false, motivo, pasta: PASTA };
}

/* abre (ou traz para frente) a janela com o painel da sede */
async function abrir(app, BrowserWindow) {
  const r = await garantir(app);
  if (!r.ok) return r;
  if (janela && !janela.isDestroyed()) { janela.focus(); return { ok: true, url: URL_SEDE, jaAberta: true }; }
  janela = new BrowserWindow({ width: 1320, height: 860, title: 'JeV Empreendimentos — sede dos agentes', autoHideMenuBar: true, backgroundColor: '#0b0a14', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  janela.on('closed', () => { janela = null; });
  janela.loadURL(URL_SEDE + '/#/conversa');
  return { ok: true, url: URL_SEDE };
}
async function estado(app) { return { pasta: PASTA || achar(app), rodando: await pingar(), url: URL_SEDE, motivo }; }
function definirPasta(app, dir) { if (!ehSede(dir)) return { ok: false, motivo: 'Essa pasta não tem o server.js e a engine da sede. Escolha a pasta "jev-agentes".' }; PASTA = dir; gravarConfig(app, { pasta: dir }); motivo = ''; return { ok: true, pasta: dir }; }
function parar() { try { if (servidor && !servidor.killed) servidor.kill(); } catch {} servidor = null; }

module.exports = { garantir, abrir, estado, definirPasta, parar, get pasta() { return PASTA; } };

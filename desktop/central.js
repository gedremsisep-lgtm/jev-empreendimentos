/* Fábrica de vídeos (Editor, Máquina de Vendas, Central de Canais) — C:\JeV\fabrica-reels, porta 3140.
   O JeV liga o programa quando uma aba nova é aberta (ou quando o JeV abre) e NÃO desliga ao fechar:
   a Central precisa ficar no ar para postar no horário. Sem chaves nem senhas por aqui. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const URL_CC = 'http://127.0.0.1:3140';
const CANDIDATOS = ['C:\\JeV\\fabrica-reels', path.join(process.env.USERPROFILE || '', 'JeV', 'fabrica-reels')];
let motivo = '';

function achar() { return CANDIDATOS.find(d => { try { return fs.existsSync(path.join(d, 'vendas', 'servidor.py')); } catch { return false; } }) || null; }

function pingar() {
  return new Promise(resolve => {
    const req = http.get(URL_CC + '/api/estado', { timeout: 1500 }, res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
const espera = ms => new Promise(r => setTimeout(r, ms));

async function garantir() {
  if (await pingar()) return { ok: true, url: URL_CC, jaEstava: true };
  const pasta = achar();
  if (!pasta) { motivo = 'Não encontrei C:\\JeV\\fabrica-reels.'; return { ok: false, motivo }; }
  try {
    const p = spawn('python', ['servidor.py', '--sem-navegador'], {
      cwd: path.join(pasta, 'vendas'), detached: true, stdio: 'ignore', windowsHide: true });
    p.on('error', e => { motivo = 'Não achei o Python (rode C:\\JeV\\fabrica-reels\\INSTALAR-FERRAMENTAS): ' + e.message; });
    p.unref();
  } catch (e) { motivo = 'Não consegui ligar a fábrica: ' + e.message; return { ok: false, motivo }; }
  for (let i = 0; i < 30; i++) { await espera(500); if (await pingar()) return { ok: true, url: URL_CC }; }
  motivo = motivo || 'A fábrica foi chamada mas não respondeu em 15 s. Abra C:\\JeV\\fabrica-reels\\CENTRAL-DE-CANAIS para ver a mensagem.';
  return { ok: false, motivo };
}

module.exports = { garantir, pingar, URL_CC };

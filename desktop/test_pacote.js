/* =========================================================================
   Confere o que realmente entra no instalador.

   Existe para não repetir um erro que já aconteceu: o motor de atualização
   (atualizacao.js) ficou de fora do pacote e o programa nem abria. Aqui o
   pacote é montado de verdade e o conteúdo dele é lido de dentro.

   Rodar:  node test_pacote.js
   ========================================================================= */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AQUI = __dirname;
let falhas = 0;
const ok = (t, v) => { if (v === true) console.log('  OK    ' + t); else { falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v)); } };

const pacote = JSON.parse(fs.readFileSync(path.join(AQUI, 'package.json'), 'utf8'));
const lista = pacote.build.files.filter(f => !f.startsWith('!'));

/* --- 1. leitura estática: todo require('./x') tem de estar na lista ------ */
function requeridos(arquivo) {
  const txt = fs.readFileSync(path.join(AQUI, arquivo), 'utf8');
  const achados = new Set();
  const re = /require\(\s*['"]\.\/([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(txt))) achados.add(m[1]);
  return [...achados];
}
function estaNaLista(nome) {
  const alvo = /\.(js|json|html|node)$/.test(nome) ? nome : nome + '.js';
  return lista.some(p => p === alvo || p === nome ||
    (p.includes('*') && new RegExp('^' + p.replace(/\*\*\/\*/g, '.*').replace(/\*/g, '[^/]*') + '$').test(alvo)));
}

console.log('1) o que o programa pede para carregar');
const entradas = ['main.js', 'preload.js', 'atualizacao.js'];
for (const arq of entradas) {
  if (!fs.existsSync(path.join(AQUI, arq))) { ok('existe ' + arq, false); continue; }
  for (const dep of requeridos(arq)) {
    /* teste_roteiro só é usado pelos testes; não precisa ir no instalador */
    if (dep.startsWith('teste_') || dep.startsWith('test_')) continue;
    ok(`${arq} pede "${dep}" e ele está na lista do instalador`, estaNaLista(dep));
  }
}

/* --- 2. monta o pacote de verdade e lê o que ficou dentro ---------------- */
console.log('\n2) montando o pacote e olhando dentro dele');
try {
  execSync('npx electron-builder --linux dir --config.linux.target=dir ' +
           '--config.linux.icon=build/icon.png --publish never',
           { cwd: AQUI, stdio: 'pipe', timeout: 900000 });
} catch (e) {
  ok('o pacote foi montado', String((e.stderr || e.stdout || e.message)).slice(-400));
}

const asar = path.join(AQUI, 'dist', 'linux-unpacked', 'resources', 'app.asar');
ok('o app.asar foi gerado', fs.existsSync(asar));
if (fs.existsSync(asar)) {
  const dentro = execSync(`npx asar list "${asar}"`, { cwd: AQUI, encoding: 'utf8' })
    .split('\n').map(l => l.trim().replace(/^\//, ''));
  for (const arq of ['main.js', 'preload.js', 'atualizacao.js', 'package.json', 'app/index.html']) {
    ok(`"${arq}" está dentro do instalador`, dentro.includes(arq));
  }
  const sistema = dentro.includes('app/index.html');
  if (sistema) {
    const tam = fs.statSync(path.join(AQUI, 'app', 'index.html')).size;
    ok('o sistema dentro do pacote tem tamanho de sistema (> 1 MB)', tam > 1000000 ? true : tam);
  }
}

/* --- 3. o programa empacotado abre e continua aberto --------------------- */
console.log('\n3) abrindo o pacote montado');
const exe = path.join(AQUI, 'dist', 'linux-unpacked', 'jev-empreendimentos');
if (!fs.existsSync(exe)) {
  ok('o executável foi gerado', false);
} else {
  const { spawnSync } = require('child_process');
  const r = spawnSync('bash', ['-c',
    `timeout 40 xvfb-run -a "${exe}" --no-sandbox > /tmp/jev_pacote.log 2>&1 & ` +
    `P=$!; sleep 20; if kill -0 $P 2>/dev/null; then echo VIVO; else echo MORREU; fi; kill $P 2>/dev/null; wait 2>/dev/null`
  ], { encoding: 'utf8', timeout: 120000 });
  const log = fs.existsSync('/tmp/jev_pacote.log') ? fs.readFileSync('/tmp/jev_pacote.log', 'utf8') : '';
  ok('o programa continua aberto depois de 20 segundos', /VIVO/.test(r.stdout) ? true : r.stdout.trim());
  ok('nenhum módulo faltando', !/Cannot find module/i.test(log) ? true : (log.match(/Cannot find module.*/) || [])[0]);
  ok('nenhuma exceção não tratada', !/Uncaught Exception/i.test(log) ? true : (log.match(/Uncaught Exception.*/) || [])[0]);
}

console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'Tudo certo — o instalador leva tudo o que precisa.'));
process.exit(falhas ? 1 : 0);

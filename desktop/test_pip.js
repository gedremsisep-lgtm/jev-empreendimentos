/* =========================================================================
   O teste do PYTHON EMBEDDABLE — o defeito que travava a IA de vídeo.

   O que ele reproduz: o Python que o programa baixa no Windows é o pacote
   "embeddable". Ele vem SEM pip e com um arquivo pythonNNN._pth onde a
   linha "import site" está comentada — o que desliga o site-packages.

   Resultado na tela do dono, em agosto de 2026:
     instalando torch (1 de 3) falhou: ... No module named pip
     instalando diffusers e companhia (2 de 3) falhou: ... No module named pip
     baixando o modelo de vídeo falhou: No module named 'huggingface_hub'

   Três erros, um problema só. Este teste monta um Python de mentira com as
   duas amarras e exige que o conserto as desfaça.

   Rodar:  node test_pip.js
   ========================================================================= */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-pip-'));
process.env.JEV_ESTUDIO = TEMP;

let falhas = 0;
const ok = (t, v) => {
  if (v === true) { console.log('  OK    ' + t); return; }
  falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v).slice(0, 240));
};

/* --------------------------------- um Python embeddable de mentira ------ */
function montarPython(nome, opcoes){
  const o = opcoes || {};
  const dir = path.join(TEMP, nome);
  fs.mkdirSync(dir, { recursive: true });

  /* o ._pth exatamente como a Python.org entrega: import site comentado */
  if (o.comPth !== false)
    fs.writeFileSync(path.join(dir, 'python313._pth'),
      'python313.zip\n.\n\n# Uncomment to run site.main() automatically\n#import site\n');

  /* o executável: um script que finge ser o python.
     Ele só "tem pip" depois que o get-pip.py rodar — como o de verdade. */
  const exe = path.join(dir, 'python');
  fs.writeFileSync(exe,
    '#!/bin/bash\n' +
    'AQUI="$(cd "$(dirname "$0")" && pwd)"\n' +
    'if [ "$1" = "-m" ] && [ "$2" = "pip" ]; then\n' +
    '  if [ -f "$AQUI/tem_pip" ]; then echo "pip 25.2 from $AQUI"; exit 0; fi\n' +
    '  echo "$AQUI/python.exe: No module named pip" >&2; exit 1\n' +
    'fi\n' +
    'case "$1" in *get-pip.py) ' +
    (o.getPipFalha ? 'echo "erro do get-pip" >&2; exit 1' :
      'touch "$AQUI/tem_pip"; echo "Successfully installed pip"; exit 0') +
    ' ;; esac\n' +
    'exit 0\n', { mode: 0o755 });
  return { dir, exe };
}

/* --------------------------------- um bootstrap.pypa.io de mentira ------ */
let servidor, porta;

(async () => {
  servidor = http.createServer((req, res) => {
    if (/get-pip\.py$/.test(req.url)) {
      res.writeHead(200, { 'Content-Type': 'text/x-python' });
      return res.end('# get-pip de mentira\nprint("ok")\n');
    }
    res.writeHead(404); res.end('nao');
  });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  porta = servidor.address().port;
  process.env.JEV_GETPIP = 'http://127.0.0.1:' + porta + '/get-pip.py';

  const E = require('./estudio.js');

  /* ============================================ 1) o ._pth destravado */
  console.log('\n1) o arquivo que desliga o site-packages é destravado');
  const py1 = montarPython('py1');
  const antes = fs.readFileSync(path.join(py1.dir, 'python313._pth'), 'utf8');
  ok('o Python de mentira começa igual ao de verdade: import site comentado',
    /#import site/.test(antes) && !/^import site$/m.test(antes) ? true : antes);

  const d = E.destravarPth(py1.dir);
  const depois = fs.readFileSync(path.join(py1.dir, 'python313._pth'), 'utf8');
  ok('o conserto rodou', d.ok === true && d.mexeu === true ? true : d);
  ok('descomentou o import site', /^import site$/m.test(depois) ? true : depois);
  ok('e não deixou a linha comentada para trás',
    !/#\s*import site/.test(depois) ? true : depois);
  ok('acrescentou o caminho do site-packages',
    /Lib\\site-packages/.test(depois) ? true : depois);
  ok('e não jogou fora o que já estava no arquivo',
    /python313\.zip/.test(depois) ? true : depois);

  const denovo = E.destravarPth(py1.dir);
  ok('rodar de novo não estraga nada e diz que já estava feito',
    denovo.ok === true && denovo.mexeu === false ? true : denovo);

  /* ============================================ 2) o pip é instalado */
  console.log('\n2) o pip, que não vem no pacote, é instalado');
  const py2 = montarPython('py2');
  ok('sem conserto, o Python não tem pip', E.temPip(py2.exe) === false ? true : 'tinha pip');

  const linhas = [];
  const r2 = await E.prepararPython(py2.exe, e => linhas.push(e.texto || ''));
  ok('a preparação deu certo', r2.ok === true ? true : r2);
  ok('e ela sabia que precisava instalar', r2.jaTinha === false ? true : r2);
  ok('agora o Python tem pip', E.temPip(py2.exe) === true ? true : 'continuou sem');
  ok('a tela foi avisada de que o Python veio sem pip',
    linhas.some(l => /veio sem pip/.test(l)) ? true : linhas);
  ok('e de que o arquivo travado foi destravado',
    linhas.some(l => /destravei/.test(l)) ? true : linhas);
  ok('o get-pip.py não fica sujando a pasta depois',
    !fs.existsSync(path.join(py2.dir, 'get-pip.py')) ? true : 'ficou lá');

  const r2b = await E.prepararPython(py2.exe, () => {});
  ok('na segunda vez ele não baixa nada de novo',
    r2b.ok === true && r2b.jaTinha === true ? true : r2b);

  /* ============================================ 3) quando não dá certo */
  console.log('\n3) quando não dá certo, o recado ensina em vez de assustar');
  const py3 = montarPython('py3', { getPipFalha: true });
  const r3 = await E.prepararPython(py3.exe, () => {});
  ok('falha é falha, não um "pronto" mentiroso', r3.ok === false ? true : r3);
  ok('e o motivo fala do pip em português',
    /pip não quis instalar/.test(r3.motivo) ? true : r3.motivo);

  const baseBoa = process.env.JEV_GETPIP;
  process.env.JEV_GETPIP = 'http://127.0.0.1:1/get-pip.py';
  const py4 = montarPython('py4');
  const r4 = await E.prepararPython(py4.exe, () => {});
  ok('sem internet, não explode', r4.ok === false ? true : r4);
  ok('e explica que sem o pip nada do resto acontece',
    /não tem como ser instalada/.test(r4.motivo) ? true : r4.motivo);
  process.env.JEV_GETPIP = baseBoa;

  /* ============================================ 4) Python de Linux */
  console.log('\n4) num Python normal, ele não inventa conserto');
  const py5 = montarPython('py5', { comPth: false });
  fs.writeFileSync(path.join(py5.dir, 'tem_pip'), '1');   /* já tem pip */
  const r5 = await E.prepararPython(py5.exe, () => {});
  ok('reconhece que já está tudo certo', r5.ok === true && r5.jaTinha === true ? true : r5);
  const d5 = E.destravarPth(py5.dir);
  ok('e não cria ._pth onde ele não existia',
    d5.ok === true && d5.mexeu === false ? true : d5);

  console.log('');
  console.log(falhas ? falhas + ' FALHA(S)'
    : 'Tudo certo — o Python é destravado e ganha pip antes de instalar a IA.');
  servidor.close();
  try { fs.rmSync(TEMP, { recursive: true, force: true }); } catch (e) {}
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('EXPLODIU:', e); process.exit(1); });

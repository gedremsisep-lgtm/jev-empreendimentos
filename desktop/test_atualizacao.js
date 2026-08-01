/* =========================================================================
   Teste de ponta a ponta do motor de versões.

   Abre o aplicativo de verdade, várias vezes seguidas, e confere:
     1. a instalação limpa abre na versão que veio no instalador
     2. os dados gravados sobrevivem à troca de versão
     3. uma versão boa é baixada, aplicada no reinício e aprovada no autoteste
     4. uma versão com defeito é reprovada e desfeita sozinha
     5. uma versão que nem abre é desfeita pelo vigia do tempo
     6. o botão de reverter volta para a versão anterior
   Rodar:  xvfb-run -a node test_atualizacao.js
   ========================================================================= */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const AQUI = __dirname;
const ELECTRON = path.join(AQUI, 'node_modules', '.bin', 'electron');
const CANAL = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-canal-'));
const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-dados-'));
const BASE = fs.readFileSync(path.join(AQUI, 'app', 'index.html'), 'utf8');

let falhas = 0;
const ok = (t, v) => { if (v === true) console.log('  OK    ' + t); else { falhas++; console.log(' FALHA  ' + t + '  → ' + JSON.stringify(v)); } };

/* ------------------------------------------------- canal de atualização falso */
let porta = 0;
function publicar(versao, html, notas) {
  const arquivo = `jev-${versao}.html`;
  fs.writeFileSync(path.join(CANAL, arquivo), html);
  const sha = require('crypto').createHash('sha256').update(html).digest('hex');
  fs.writeFileSync(path.join(CANAL, 'versao.json'), JSON.stringify({
    sistema: 'JeV Empreendimentos', versao, arquivo, sha256: sha,
    tamanho: Buffer.byteLength(html), data: '2026-08-01', notas: notas || ['teste']
  }, null, 2));
  return sha;
}
const servidor = http.createServer((req, res) => {
  const nome = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
  const arq = path.join(CANAL, nome);
  if (!arq.startsWith(CANAL) || !fs.existsSync(arq)) { res.writeHead(404); return res.end('nao'); }
  res.writeHead(200); res.end(fs.readFileSync(arq));
});

/* ------------------------------------------------- rodar o aplicativo uma vez */
function abrir(roteiro, segundos) {
  return new Promise((resolve, reject) => {
    const p = spawn(ELECTRON, ['--no-sandbox', AQUI], {
      env: Object.assign({}, process.env, {
        JEV_SEM_RELANCAR: '1',
        JEV_ROTEIRO: roteiro || '',
        JEV_VIGIA_MS: process.env.JEV_VIGIA_MS || '8000',
        JEV_DADOS: DADOS,
        JEV_FONTE: `http://127.0.0.1:${porta}/`
      }),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let saida = '';
    p.stdout.on('data', d => { saida += d; });
    p.stderr.on('data', d => { saida += d; });
    const relogio = setTimeout(() => { p.kill('SIGKILL'); }, (segundos || 60) * 1000);
    p.on('exit', () => {
      clearTimeout(relogio);
      const linhas = saida.split('\n').filter(l => l.startsWith('TESTE '));
      const dados = {};
      linhas.forEach(l => {
        const i = l.indexOf(' ', 6);
        try { dados[l.slice(6, i)] = JSON.parse(l.slice(i + 1)); } catch (e) {}
      });
      resolve({ dados, saida });
    });
    p.on('error', reject);
  });
}

function estado() {
  return JSON.parse(fs.readFileSync(path.join(DADOS, 'sistema', 'estado.json'), 'utf8'));
}
function fichaDe(qual) {
  const f = path.join(DADOS, 'sistema', qual, 'ficha.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

/* ------------------------------------------------- versões de mentira */
function versaoBoa(v) {
  /* o mesmo sistema, só com o número trocado */
  return BASE.replace(/const SISTEMA_VERSAO = '[^']*'/, `const SISTEMA_VERSAO = '${v}'`);
}
function versaoComDefeito(v) {
  /* uma tela que estoura erro: o autoteste tem de pegar */
  return versaoBoa(v).replace('</body>',
    `<script>function obrasRender(){ throw new Error('defeito plantado no teste'); }</script></body>`);
}
function versaoQueNaoAbre() {
  /* uma tela em branco: o sistema nem chega a rodar o autoteste, e quem
     tem de perceber é o vigia do tempo dentro do aplicativo */
  return '<!doctype html><meta charset="utf-8"><title>JeV Empreendimentos</title>' +
         '<body>tela em branco</body><!--' + 'x'.repeat(70000) + '-->';
}

/* ========================================================================= */
(async () => {
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  porta = servidor.address().port;
  console.log('canal de teste em http://127.0.0.1:' + porta + '/\n');

  console.log('1) instalação limpa');
  let r = await abrir('semear', 40);
  const e1 = estado();
  ok('abre na versão que veio no instalador', fichaDe('atual').origem === 'instalador');
  ok('não fica em teste numa instalação limpa', e1.fase === 'ok' ? true : e1);
  ok('gravou os dados de teste', r.dados.gravou && r.dados.gravou.obras >= 3 ? true : r.dados);
  const contagemInicial = r.dados.gravou;

  console.log('\n2) baixar uma versão boa');
  publicar('9.0.1', versaoBoa('9.0.1'), ['Versão boa de teste']);
  r = await abrir('baixar', 60);
  ok('achou a versão nova no canal', r.dados.procurou && r.dados.procurou.temNova === true ? true : r.dados.procurou);
  ok('baixou e guardou como pendente', !!fichaDe('pendente') && fichaDe('pendente').versao === '9.0.1');
  ok('a versão em uso ainda é a antiga', fichaDe('atual').versao !== '9.0.1');
  ok('guardou um backup antes de trocar',
    fs.existsSync(path.join(DADOS, 'backups')) && fs.readdirSync(path.join(DADOS, 'backups')).length > 0);

  console.log('\n3) reiniciar: aplica, testa e aprova');
  r = await abrir('esperar', 90);
  const e3 = estado();
  ok('a versão nova entrou', fichaDe('atual').versao === '9.0.1' ? true : fichaDe('atual'));
  ok('a antiga ficou guardada para voltar atrás', !!fichaDe('anterior'));
  ok('o autoteste aprovou', e3.fase === 'ok' && !e3.emTeste ? true : e3);
  ok('o histórico registrou a aprovação',
    JSON.parse(fs.readFileSync(path.join(DADOS, 'sistema', 'historico.json'), 'utf8'))
      .some(h => h.acao === 'validada' && h.versao === '9.0.1'));
  ok('a tela confirmou o autoteste', r.dados.autoteste && r.dados.autoteste.fase === 'ok' ? true : r.dados.autoteste);
  ok('nenhum dado se perdeu na troca',
    r.dados.contagem && r.dados.contagem.obras === contagemInicial.obras &&
    r.dados.contagem.financeiro === contagemInicial.financeiro ? true : r.dados.contagem);

  console.log('\n4) uma versão com defeito é reprovada e desfeita');
  publicar('9.0.2', versaoComDefeito('9.0.2'), ['Versão com defeito de propósito']);
  await abrir('baixar', 60);
  ok('a versão com defeito foi baixada', fichaDe('pendente').versao === '9.0.2');
  r = await abrir('esperar', 90);
  const e4 = estado();
  ok('voltou sozinho para a 9.0.1', fichaDe('atual').versao === '9.0.1' ? true : fichaDe('atual'));
  ok('não ficou nada pendente', !fichaDe('pendente'));
  ok('o histórico explica o motivo',
    JSON.parse(fs.readFileSync(path.join(DADOS, 'sistema', 'historico.json'), 'utf8'))
      .some(h => h.acao === 'revertida' && /autoteste/.test(h.motivo || '')));
  ok('deixou o recado da reversão para a próxima abertura',
    e4.recado && e4.recado.tipo === 'revertido' && e4.recado.versao === '9.0.2' ? true : e4.recado);
  ok('a versão com defeito foi jogada fora, não virou alvo do botão reverter',
    !fichaDe('anterior') || fichaDe('anterior').versao !== '9.0.2' ? true : fichaDe('anterior'));

  console.log('\n5) uma versão que nem abre é desfeita pelo vigia');
  publicar('9.0.3', versaoQueNaoAbre('9.0.3'), ['Versão que nem abre']);
  await abrir('baixar', 60);
  ok('a versão quebrada foi baixada', fichaDe('pendente').versao === '9.0.3');
  r = await abrir('esperar', 90);
  ok('o vigia desfez sozinho', fichaDe('atual').versao === '9.0.1' ? true : fichaDe('atual'));
  ok('o motivo ficou registrado',
    JSON.parse(fs.readFileSync(path.join(DADOS, 'sistema', 'historico.json'), 'utf8'))
      .some(h => h.acao === 'revertida' && /não respondeu|não terminou|não carregou|fechou sozinho/.test(h.motivo || '')));
  ok('a versão em branco também foi jogada fora',
    !fichaDe('anterior') || fichaDe('anterior').versao !== '9.0.3' ? true : fichaDe('anterior'));

  console.log('\n6) o botão de reverter volta para a versão anterior');
  publicar('9.0.4', versaoBoa('9.0.4'), ['Outra versão boa']);
  await abrir('baixar', 60);
  await abrir('esperar', 90);
  ok('a 9.0.4 entrou e foi aprovada', fichaDe('atual').versao === '9.0.4' && estado().fase === 'ok' ? true : fichaDe('atual'));
  const antes = fichaDe('atual').versao, alvo = fichaDe('anterior').versao;
  r = await abrir('reverter', 60);
  ok('trocou para a versão anterior', fichaDe('atual').versao === alvo ? true : { antes, alvo, agora: fichaDe('atual').versao });
  ok('a que saiu virou a de voltar atrás', fichaDe('anterior').versao === antes);

  console.log('\n7) os dados continuam lá depois de tudo isso');
  r = await abrir('contar', 40);
  ok('mesma quantidade de registros do começo',
    r.dados.contagem && r.dados.contagem.obras === contagemInicial.obras &&
    r.dados.contagem.financeiro === contagemInicial.financeiro &&
    r.dados.contagem.pessoas === contagemInicial.pessoas
      ? true : { agora: r.dados.contagem, comeco: contagemInicial });

  servidor.close();
  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'Tudo certo — nenhuma falha.'));
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

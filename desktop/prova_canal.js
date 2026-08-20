/* =========================================================================
   Prova de ponta a ponta contra o CANAL DE VERDADE do GitHub.

   Aqui não tem servidor de mentira. Este teste finge ser um computador da
   família com uma versão antiga instalada, aponta para o mesmo endereço que
   o aplicativo do dono usa, e faz o caminho inteiro: procurar, baixar,
   conferir a impressão digital, aplicar, abrir e aprovar.

   Se este teste passar, a atualização chega na casa dele. Se não passar,
   não adianta o arquivo estar no GitHub.

   Rode assim:   node desktop/prova_canal.js 1.0.21
   ========================================================================= */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ESPERADA = process.argv[2];
if (!ESPERADA) { console.error('uso: node desktop/prova_canal.js 1.0.21'); process.exit(2); }

const atualizacao = require('./atualizacao');

let falhas = 0;
function ok(nome, valor) {
  if (valor === true) { console.log('  OK    ' + nome); return; }
  falhas++;
  console.log(' FALHA  ' + nome + '  → ' + JSON.stringify(valor));
}

/* uma instalação velha de mentira: o sistema embutido é uma casca com uma
   versão bem antiga, para o canal ter sempre o que oferecer */
const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-prova-'));
const EMBUTIDO = path.join(DADOS, 'embutido.html');
fs.writeFileSync(EMBUTIDO,
  '<!doctype html><meta charset="utf-8"><title>JeV</title>' +
  "<script>const SISTEMA_VERSAO = '1.0.13';</script>");

(async function () {
  console.log('\nprova contra o canal de verdade — esperando a ' + ESPERADA + '\n');

  console.log('1) uma instalação antiga, apontada para o GitHub de verdade');
  atualizacao.preparar({ pastaDados: DADOS, embutido: EMBUTIDO, versaoApp: '1.0.13' });
  const inicio = atualizacao.estado();
  ok('o sistema instalado é o velho', inicio.atual && inicio.atual.versao === '1.0.13'
    ? true : inicio.atual);

  console.log('\n2) procurar no canal');
  const p = await atualizacao.procurar(null);
  ok('o canal respondeu', p && p.info ? true : p);
  ok('e anuncia a ' + ESPERADA, p.info.versao === ESPERADA ? true : p.info.versao);
  ok('dizendo que existe versão nova', p.temNova === true ? true : p);
  ok('com as notas do que mudou',
    Array.isArray(p.info.notas) && p.info.notas.length > 0 ? true : p.info.notas);

  console.log('\n3) baixar e conferir a impressão digital');
  /* baixarVersao recusa o arquivo se o sha256 não bater — chegar aqui sem
     explodir já é a prova de que o arquivo publicado é o que foi montado */
  const b = await atualizacao.baixarVersao(null, p.info);
  ok('baixou e o sha256 bate com o publicado', b.versao === ESPERADA ? true : b);
  ok('e o arquivo tem o tamanho de um sistema inteiro', b.tamanho > 1000000 ? true : b.tamanho);

  console.log('\n4) aplicar e abrir');
  const depois = atualizacao.estado();
  ok('a versão nova ficou pendente para o próximo início',
    depois.pendente && depois.pendente.versao === ESPERADA ? true : depois.pendente);

  /* reinício: é aqui que a versão nova entra em teste */
  atualizacao.preparar({ pastaDados: DADOS, embutido: EMBUTIDO, versaoApp: '1.0.13' });
  const emTeste = atualizacao.estado();
  ok('no reinício, a nova virou a atual',
    emTeste.atual && emTeste.atual.versao === ESPERADA ? true : emTeste.atual);
  ok('e ficou em teste, para poder voltar atrás se travar',
    atualizacao.precisaTestar() === true ? true : 'não entrou em teste');

  const html = fs.readFileSync(path.join(DADOS, 'sistema', 'atual', 'index.html'), 'utf8');
  ok('o arquivo aplicado é mesmo o do sistema ' + ESPERADA,
    html.includes("SISTEMA_VERSAO = '" + ESPERADA + "'") ? true : 'versão errada dentro do arquivo');

  /* as peças novas desta versão têm que estar dentro do arquivo que chegou */
  console.log('\n5) o que essa versão prometeu veio dentro dela');
  ok('o garimpo pelo Kalodata veio', html.includes('Kalodata') ? true : 'não veio');
  ok('a função que guarda os materiais veio',
    html.includes('function pautaMateriais') ? true : 'não veio');
  ok('o prompt de pessoa usando o produto veio',
    html.includes('function pessPromptTexto') ? true : 'não veio');
  ok('e a tabela de tipos de produto veio junto',
    html.includes('PESS_FAMILIAS') && html.includes('function pessFamiliaId') ? true : 'não veio');
  ok('o manuseio certo de cada produto veio escrito',
    html.includes('spreads it in slow upward circles until it disappears')
    && html.includes('cracks an egg straight onto the dry surface with no oil') ? true : 'não veio');
  ok('e as cinco cenas da pessoa vieram',
    html.includes('A pessoa e o problema') && html.includes('Ela recomenda') ? true : 'não veio');

  /* 1.0.30: a pessoa em toda cena, e nada cortado nas bordas */
  ok('a regra de que TEM que aparecer uma pessoa veio',
    html.includes('A real person must be visible and present in this shot') ? true : 'não veio');
  ok('e a proibição de cena só com produto',
    html.includes('never a product-only shot') ? true : 'não veio');
  ok('a trava do enquadramento veio',
    html.includes('product must be FULLY inside the frame at all times') ? true : 'não veio');
  ok('e o aviso da faixa de botões do aplicativo no 9:16',
    html.includes('right-hand strip and the bottom fifth') ? true : 'não veio');
  ok('a cena de apresentar, com rosto e produto no mesmo quadro',
    html.includes('her face and the ENTIRE product are both clearly visible') ? true : 'não veio');
  ok('o aviso de vídeo sem pessoa veio',
    html.includes('function pautaTemVideo') && html.includes('function pautaVerPrompt') ? true : 'não veio');
  ok('e o negativo passou a proibir produto sozinho e produto cortado',
    html.includes('product alone without a person') && html.includes('cropped product') ? true : 'não veio');

  console.log('\n6) aprovar');
  const v = atualizacao.validar(true, 'autoteste da prova');
  const fim = atualizacao.estado();
  ok('o autoteste aprovou a versão', v.ok === true ? true : v);
  ok('e o sistema saiu do modo de teste',
    fim.fase === 'ok' && atualizacao.precisaTestar() === false ? true : fim.fase);
  ok('a atual continua sendo a ' + ESPERADA,
    fim.atual && fim.atual.versao === ESPERADA ? true : fim.atual);
  ok('e o anterior ficou guardado, caso precise voltar',
    fim.anterior && fim.anterior.versao === '1.0.13' ? true : fim.anterior);

  console.log('');
  console.log(falhas ? falhas + ' FALHA(S)'
    : 'Tudo certo — a ' + ESPERADA + ' chega sozinha nos computadores da família.');
  try { fs.rmSync(DADOS, { recursive: true, force: true }); } catch (e) {}
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('EXPLODIU:', e); process.exit(1); });

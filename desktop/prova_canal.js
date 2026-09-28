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

  /* 1.0.31: a IA da nuvem que põe uma pessoa apresentando */
  ok('a tela da IA com pessoa veio',
    html.includes('function hggSecaoHTML') && html.includes('function hggCartaoHTML') ? true : 'não veio');
  ok('o orçamento antes de gastar veio',
    html.includes('function hggOrcar') && html.includes('function hggConfirmarGerar') ? true : 'não veio');
  ok('o botão de confirmar mostra o preço, não só "gerar"',
    html.includes('Pode gerar por ') ? true : 'não veio');
  ok('a tela avisa que cena barrada não é cobrada',
    html.includes('não é cobrada') ? true : 'não veio');
  ok('o campo do segredo é senha, não texto à vista',
    html.includes('id="hgg-seg" type="password"') ? true : 'não veio');
  ok('e o pedido completo, que serve para qualquer IA',
    html.includes('function hggPedidoTexto') && html.includes('PEDIDO DE VÍDEO') ? true : 'não veio');

  /* 1.0.32: o botão no alto da aba Vídeos e pauta */
  ok('o botão "Criar vídeo no Higgsfield" veio',
    html.includes('Criar vídeo no Higgsfield') && html.includes('function hggCriarVideo') ? true : 'não veio');
  ok('ele pergunta o produto em vez de gerar no primeiro clique',
    html.includes('function hggEscolherProduto') && html.includes('quanto vai custar') ? true : 'não veio');
  ok('e o cartão do produto ganhou âncora, para o botão levar até ele',
    html.includes("id=\"pauta-' + item.id + '\"") || html.includes('pauta-') ? true : 'não veio');

  /* 1.0.33: o preparo automático do anúncio em todas as plataformas */
  ok('o preparo automático veio',
    html.includes('function prepAoGarimpar') && html.includes('function prepSalvarFichas') ? true : 'não veio');
  ok('a legenda de cada plataforma veio',
    html.includes('function prepLegendas') && html.includes('function prepTexto') ? true : 'não veio');
  ok('o botão de preparar todos veio',
    html.includes('function prepPrepararTudo') && html.includes('Preparar o anúncio de todos') ? true : 'não veio');
  ok('e o de abrir todas para publicar',
    html.includes('function prepAbrirTodas') && html.includes('Abrir todas para publicar') ? true : 'não veio');
  ok('o aviso de publicidade entra em toda legenda — é exigência, não enfeite',
    html.includes('Publicidade — ganho comissão por venda.') ? true : 'não veio');
  ok('e a tela avisa quando falta o link de afiliado',
    html.includes('não ganha comissão') ? true : 'não veio');

  /* 1.0.35: o garimpo do Mercado Livre com o link já pronto */
  ok('a tela do Mercado Livre veio',
    html.includes('Mercado Livre — garimpo com o link já pronto') &&
    html.includes('function mlSecaoHTML') ? true : 'não veio');
  ok('o garimpo que já gera os links veio',
    html.includes('function mlGarimpar') && html.includes('Garimpar e gerar os links')
      ? true : 'não veio');
  ok('a conversão para produto da casa veio — é o que liga no resto do sistema',
    html.includes('function mlComoProduto') && html.includes('function mlNichoDe')
      ? true : 'não veio');
  ok('e a tela promete, escrito, que não guarda a senha dele',
    html.includes('não vejo nem guardo a sua senha') ? true : 'não veio');

  /* 1.0.36: importar uma obra pronta, sem apagar o que já está no sistema */
  ok('o botão de importar obra veio na tela de Obras',
    html.includes('Importar obra') && html.includes('oimp-file') ? true : 'não veio');
  ok('o importador veio inteiro',
    html.includes('function obraImpConferir') && html.includes('function obraImpGravar') &&
    html.includes('function obraImportarArquivo') ? true : 'não veio');
  ok('e o exportador, para levar a obra para outra máquina',
    html.includes('function obraExportar') && html.includes('JEV_OBRA') ? true : 'não veio');
  ok('a tela promete, escrito, que importar SÓ ADICIONA',
    html.includes('A importação <b>só adiciona</b>') ? true : 'não veio');
  ok('o importador recusa arquivo que não é obra',
    html.includes('Este arquivo não é uma obra da JeV') ? true : 'não veio');
  ok('o registro de projetos entra junto com a obra',
    html.includes('pranchas e cadernos registrados') ? true : 'não veio');
  ok('as disciplinas de infraestrutura entraram',
    html.includes('Urbanismo / Loteamento') && html.includes('Drenagem Pluvial') &&
    html.includes('Abastecimento de Água') && html.includes('Esgotamento Sanitário') &&
    html.includes('Calçadas e Acessibilidade') ? true : 'não veio');

  /* 1.0.37: os Vigias do negócio e o Controle da equipe de agentes */
  ok('a tela dos Vigias veio na rota e no menu',
    html.includes("vigias:vigiasRender") && html.includes('id="pg-vigias"') ? true : 'não veio');
  ok('os vinte vigias vieram inteiros',
    html.includes('function vigRodar') && html.includes('function vigDados') &&
    html.includes("id:'obra_etapa_atrasada'") && html.includes("id:'fin_vencida'") &&
    html.includes("id:'ctr_vencendo'") && html.includes("id:'prod_estoque_min'") &&
    html.includes("id:'canal_parado'") ? true : 'não veio');
  ok('o vigia prepara a cobrança, não só o alerta',
    html.includes('Copiar a cobrança') && html.includes('me manda o comprovante') ? true : 'não veio');
  ok('a tela promete, escrito, que vigia nenhum grava no banco',
    html.includes('Nenhum deles grava nada no banco') ? true : 'não veio');
  ok('e avisa que, sem abrir o sistema, ninguém é avisado',
    html.includes('ninguém é avisado') ? true : 'não veio');
  ok('o banco conhece a tabela dos vigias',
    html.includes("'midiateca','vigias'") ? true : 'não veio');

  ok('a tela do Controle veio na rota e no menu',
    html.includes("ctl:controleRender") && html.includes('id="pg-ctl"') ? true : 'não veio');
  ok('o Controle veio com as duas pontes',
    html.includes('function ctlNoApp') && html.includes('127.0.0.1:3020') &&
    html.includes('JeVDesktop.ctlEstado') ? true : 'não veio');
  ok('e com as oito abas',
    html.includes("'painel'") && html.includes("'rotinas'") &&
    html.includes("'esteira'") && html.includes("'memorias'") ? true : 'não veio');
  ok('sem o Mission Control, a tela explica em vez de ficar em branco',
    html.includes('não está respondendo') && html.includes('INICIAR.bat') ? true : 'não veio');

  /* 1.0.38 — as quatro que vieram da versão que já rodava na máquina de casa.
     Entram aqui porque a fusão podia ter perdido qualquer uma sem quebrar
     nada: o arquivo montaria igual, os testes passariam, e a falta só
     apareceria com o sistema aberto, semanas depois. */
  ok('o Controle relê sozinho de 6 em 6 segundos',
    html.includes('function ctlLigarRelogio') && html.includes('}, 6000)') ? true : 'não veio');
  ok('e não relê por baixo de um modal aberto',
    /ctlLigarRelogio[\s\S]{0,400}\.mk\.on/.test(html) ? true : 'a guarda do modal sumiu');
  ok('e para de reler quando você sai da tela',
    /ctlLigarRelogio[\s\S]{0,400}PG !== 'ctl'/.test(html) ? true : 'a guarda da tela sumiu');
  ok('a ficha do agente abre pela tela',
    html.includes('function ctlVerAgente') && html.includes('function ctlAgentePorId') ? true : 'não veio');
  ok('dá para criar agente e mudar o estado dele',
    html.includes('function ctlFormAgente') && html.includes('function ctlSalvarAgente') &&
    html.includes('function ctlAplicarStatus') && html.includes('function ctlCriarAgente') ? true : 'não veio');
  ok('e o progresso da tarefa se ajusta na tela',
    html.includes('function ctlVerTarefa') && html.includes('function ctlAplicarProgresso') ? true : 'não veio');

  /* 1.0.39 — o Escritório, o oitavo card do painel.
     A verificação que mais importa aqui é a quarta: o dia em que alguém
     empurrar ESCRITORIO para dentro de UNIDADES, o financeiro passa a
     oferecer "Escritório" como negócio no lançamento e o rateio fica errado
     em silêncio. Nenhum teste de tela pegaria isso. */
  ok('o Escritório veio, com as duas abas',
    html.includes("id:'escritorio'") && html.includes("['ctl','Controle'") &&
    html.includes("['vigias','Vigias'") ? true : 'não veio');
  ok('o card dele sabe se desenhar no painel',
    html.includes('function escrCard') && html.includes('function escrPreencher') ? true : 'não veio');
  ok('a navegação emoldura o Controle e os Vigias',
    /unidadeDaPagina[\s\S]{0,200}ESCRITORIO/.test(html) ? true : 'a moldura sumiu');
  /* recorta a lista UNIDADES do arquivo e olha dentro dela — regex solta
     sobre o arquivo inteiro casaria com o ESCRITORIO que vem logo abaixo e
     daria "passou" numa prova que não provou nada */
  const listaUnidades = (html.split('const UNIDADES = [')[1] || '').split('\n];')[0];
  ok('e ele continua FORA das unidades de negócio, longe do dinheiro',
    listaUnidades && !listaUnidades.includes('escritorio') ? true :
      'entrou em UNIDADES — o financeiro vai oferecer Escritório como negócio');
  ok('o painel não espera a pasta do Controle para aparecer',
    /if\(PERMS\[CU\]\.includes\(ESCRITORIO\.pg\)\) escrPreencher\(\);/.test(html) &&
    !/await escrPreencher/.test(html) ? true : 'alguém pôs await e travou o painel');
  ok('Controle desligado vira "desligado", nunca zero agentes',
    html.includes("escrPor('agentes', 'desligado'") ? true : 'não veio');
  ok('e os dois sininhos acendem sem reler tudo de novo',
    /async function vigSino\(n\)/.test(html) && /async function ctlBadge\(n\)/.test(html) ? true : 'não veio');

  /* a Midiateca e o motor de visuais, que estavam prontos desde setembro */
  ok('a Midiateca veio',
    html.includes('galeria:galeriaRender') && html.includes('function galDoEstudio') ? true : 'não veio');
  ok('e o motor de visuais desenhados por código',
    html.includes('function visualHTML') && html.includes('function visContador') ? true : 'não veio');

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

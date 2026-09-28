/* =========================================================================
   test_escritorio.js — o oitavo card do painel

   O Escritório é o único card de "Seus negócios" que não é um negócio. Isso
   cria três riscos, e este teste existe por causa deles:

   1. ELE VIRAR UNIDADE DE NEGÓCIO SEM NINGUÉM QUERER. Basta alguém achar
      "mais limpo" empurrar ESCRITORIO para dentro de UNIDADES e pronto: o
      financeiro passa a oferecer "Escritório" como negócio no lançamento, o
      DRE ganha uma coluna que só dá zero e o rateio fica errado para sempre.
      O teste trava isso pelos dois lados — fora de UNIDADES, e um lançamento
      marcado como 'escritorio' tem de cair em Geral.

   2. ELE SEGURAR O PAINEL DA FAMÍLIA. Metade dos números vem de uma pasta
      fora do sistema, que pode nem estar ligada. Se um dia alguém puser um
      await nisso, o painel inteiro fica girando na casa de quem não usa o
      Controle. O teste mede o tempo com a pasta travada de propósito.

   3. ELE MENTIR. Controle desligado não é "0 agentes" — é "desligado". Zero
      faria o dono achar que perdeu a equipe.

     node test_escritorio.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};

/* o mesmo formato que o Mission Control de verdade devolve */
const ESTADO = {
  disponivel: true,
  pasta: 'C:\\JeV\\MissionControl',
  errors: [],
  agents: { agents: [
    { id:'radar',    name:'Radar',    status:'busy'   },
    { id:'guardiao', name:'Guardião', status:'online' },
    { id:'produtor', name:'Produtor', status:'error'  },
    { id:'dormindo', name:'Dormindo', status:'idle'   },
  ]},
  tasks: { tasks: [
    { id:'T-1', title:'Andando',      stage:'em_execucao' },
    { id:'T-2', title:'Andando 2',    stage:'em_execucao' },
    { id:'T-3', title:'Esperando',    stage:'revisao'     },
    { id:'T-4', title:'Travada',      stage:'bloqueada'   },
    { id:'T-5', title:'Pronta',       stage:'concluida'   },
  ]},
  cron: { jobs: [
    { id:'j1', name:'Radar diário', enabled:true  },
    { id:'j2', name:'Backup',       enabled:true  },
    { id:'j3', name:'Parada',       enabled:false },
  ]},
  heartbeat: { staleAfterMinutes:60, agents:{} },
};
/* de pé = busy + online = 2 de 4 · andando = 2 · ligadas = 2 de 3
   esperando o dono = revisao + bloqueada + agente com erro = 3 */

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{width:1500, height:1100} });
  page.on('pageerror', e => { fail++; console.log('  FALHA erro de página: ' + e.message); });
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 20000 });

  console.log('\n— a peça existe e tem a forma de unidade —');
  const peca = await page.evaluate(() => ({
    existe:   typeof ESCRITORIO === 'object' && !!ESCRITORIO,
    pagina:   ESCRITORIO.pg,
    abas:     (ESCRITORIO.tabs||[]).map(a=>a[0]),
    temCor:   !!ESCRITORIO.cor && !!ESCRITORIO.bg,
    temCard:  typeof escrCard === 'function',
    temEnche: typeof escrPreencher === 'function',
    corUnica: !UNIDADES.some(u=>u.cor.toLowerCase() === ESCRITORIO.cor.toLowerCase()),
  }));
  t('o Escritório existe', peca.existe);
  t('abre no Controle', peca.pagina === 'ctl', peca.pagina);
  t('tem as duas abas: Controle e Vigias',
    JSON.stringify(peca.abas) === JSON.stringify(['ctl','vigias']), JSON.stringify(peca.abas));
  t('tem cor própria, diferente dos sete negócios', peca.temCor && peca.corUnica);
  t('sabe desenhar o próprio card', peca.temCard && peca.temEnche);

  console.log('\n— e MESMO ASSIM fica fora do dinheiro —');
  const fora = await page.evaluate(() => ({
    naoEhUnidade: !UNIDADES.some(u => u.id === 'escritorio'),
    naoTemRota:   !UNIDADES.some(u => u.pg === 'ctl'),
    caiEmGeral:   unInfo('escritorio').id === 'geral',
    achaPeloCtl:    (unidadeDaPagina('ctl')    ||{}).id === 'escritorio',
    achaPeloVigias: (unidadeDaPagina('vigias') ||{}).id === 'escritorio',
    naoRoubaMidia:  (unidadeDaPagina('midia')  ||{}).id === 'midia',
  }));
  t('não está em UNIDADES — o financeiro não o enxerga', fora.naoEhUnidade && fora.naoTemRota);
  t('lançamento marcado como escritório cai em Geral', fora.caiEmGeral);
  t('mas a navegação acha o Escritório pelo Controle', fora.achaPeloCtl);
  t('e também pelos Vigias', fora.achaPeloVigias);
  t('e não roubou a moldura de nenhum negócio', fora.naoRoubaMidia);

  console.log('\n— a barra de contexto emoldura as duas telas —');
  const barra = await page.evaluate(async () => {
    delete window.JeVDesktop;
    window.fetch = () => Promise.reject(new Error('recusada'));
    await go('ctl');
    await new Promise(r => setTimeout(r, 300));
    const b = document.getElementById('ctxbar');
    const txtCtl = b.innerText;
    await go('vigias');
    await new Promise(r => setTimeout(r, 400));
    return {
      ligadaNoCtl: b.classList.contains('on'),
      dizEscritorio: /Escrit/i.test(txtCtl),
      temDuasAbas: /Controle/.test(txtCtl) && /Vigias/.test(txtCtl),
      segueNoVigias: b.classList.contains('on') && /Escrit/i.test(b.innerText),
      abaCertaNoVigias: !!b.querySelector('.cb.on'),
    };
  });
  t('abrindo o Controle, a barra do Escritório acende', barra.ligadaNoCtl);
  t('e o botão de voltar diz Escritório', barra.dizEscritorio);
  t('com as duas abas lado a lado', barra.temDuasAbas);
  t('indo para os Vigias, continua dentro do Escritório', barra.segueNoVigias);
  t('e a aba de agora fica marcada', barra.abaCertaNoVigias);

  console.log('\n— o card está no painel, ao lado de Mídia —');
  const card = await page.evaluate(async () => {
    delete window.JeVDesktop;
    window.fetch = () => Promise.reject(new Error('recusada'));
    await go('hub');
    await new Promise(r => setTimeout(r, 600));
    const cards = [...document.querySelectorAll('#hub-root .ugrid .ucard')];
    const meu = cards.find(c => /Escrit/i.test(c.querySelector('h3').textContent));
    return {
      quantos: cards.length,
      ultimo: cards.indexOf(meu) === cards.length - 1,
      depoisDeMidia: cards.indexOf(meu) === cards.findIndex(c=>/Mídia/.test(c.querySelector('h3').textContent)) + 1,
      leva: (meu.getAttribute('onclick')||''),
      texto: meu.innerText,
    };
  });
  t('o card do Escritório está na fileira', card.quantos === 8, card.quantos + ' cards');
  t('é o último, depois de Mídia', card.ultimo && card.depoisDeMidia);
  t('e clicar nele abre o Controle', /go\('ctl'\)/.test(card.leva), card.leva);
  t('não fala em receita, despesa nem resultado do mês',
    !/Receita do mês|Despesa do mês|Resultado do mês/.test(card.texto));
  t('mostra o que importa: quem está de pé e o que espera por você',
    /Agentes de pé/.test(card.texto) && /Esperando você/.test(card.texto));

  console.log('\n— com o Controle desligado, o card DIZ desligado —');
  const desligado = await page.evaluate(async () => {
    delete window.JeVDesktop;
    window.fetch = () => Promise.reject(new Error('recusada'));
    await go('hub');
    await new Promise(r => setTimeout(r, 900));
    const v = k => (document.querySelector(`[data-escr="${k}"]`)||{}).textContent;
    return { agentes:v('agentes'), tarefas:v('tarefas'), vigias:v('vigias'), espera:v('espera') };
  });
  t('não escreve zero agentes — escreve desligado', desligado.agentes === 'desligado', desligado.agentes);
  t('e não inventa tarefa nenhuma', desligado.tarefas === '—', desligado.tarefas);
  t('os vigias, que leem o banco daqui, respondem mesmo assim',
    desligado.vigias !== '—' && desligado.vigias !== undefined, desligado.vigias);
  t('e o rodapé fecha um número', /^\d+$/.test(desligado.espera || ''), desligado.espera);

  console.log('\n— com a pasta travada, o painel NÃO fica esperando —');
  const tempo = await page.evaluate(async () => {
    delete window.JeVDesktop;
    window.fetch = () => new Promise(() => {});      /* nunca responde */
    document.getElementById('hub-root').innerHTML = '';
    const t0 = performance.now();
    go('hub');
    /* mede até os cards aparecerem DE VERDADE na tela — o go() não é
       esperado por quem o chama, então cronometrar a chamada não provaria
       nada. O que importa é quando a família vê o painel. */
    while(performance.now() - t0 < 5000){
      if(document.querySelector('#hub-root .ugrid .ucard')) break;
      await new Promise(r => setTimeout(r, 20));
    }
    return { gasto: performance.now() - t0,
             tem: !!document.querySelector('#hub-root .ugrid .ucard') };
  });
  t('o painel apareceu sem esperar a pasta', tempo.gasto < 1500, Math.round(tempo.gasto) + ' ms');
  t('e os cards estavam lá', tempo.tem);

  console.log('\n— com o Controle no ar, os números batem —');
  const cheio = await page.evaluate(async (E) => {
    let perguntas = 0;
    window.JeVDesktop = { ctlEstado: () => { perguntas++; return Promise.resolve(E); } };
    /* o painel do passo anterior ficou com a pasta travada e pode estar
       terminando agora. Deixa ele acabar ANTES de zerar a conta, senão a
       sobra dele entra na conta deste */
    await new Promise(r => setTimeout(r, 700));
    perguntas = 0;
    go('hub');
    await new Promise(r => setTimeout(r, 900));
    const v = k => (document.querySelector(`[data-escr="${k}"]`)||{}).textContent;
    const sino = s => { const e = document.querySelector(s);
      return e ? {txt:e.textContent, escondido:e.classList.contains('hide')} : null; };
    return { agentes:v('agentes'), tarefas:v('tarefas'), rotinas:v('rotinas'),
             espera:v('espera'), perguntas,
             sinoCtl:sino('[data-ctl-badge]'), sinoVig:sino('[data-vig-badge]') };
  }, ESTADO);
  t('agentes de pé: 2 de 4', cheio.agentes === '2 de 4', cheio.agentes);
  t('tarefas andando: 2', cheio.tarefas === '2', cheio.tarefas);
  t('rotinas ligadas: 2 de 3', cheio.rotinas === '2 de 3', cheio.rotinas);
  t('esperando você soma revisão, travada e agente com erro',
    Number(cheio.espera) >= 3, cheio.espera);
  t('perguntou ao Controle UMA vez só, não uma por número',
    cheio.perguntas === 1, cheio.perguntas + ' perguntas');
  t('o sininho do Controle acendeu SEM precisar entrar na tela',
    cheio.sinoCtl && cheio.sinoCtl.txt === '3' && !cheio.sinoCtl.escondido,
    JSON.stringify(cheio.sinoCtl));
  t('e o dos vigias também foi aceso pelo painel',
    cheio.sinoVig && /^\d+$|99\+/.test(cheio.sinoVig.txt), JSON.stringify(cheio.sinoVig));

  console.log('\n— quem não pode ver, não vê —');
  const perm = await page.evaluate(async () => {
    const antes = CU;
    CU = 'c';                                   /* perfil Campo */
    await go('hub');
    await new Promise(r => setTimeout(r, 500));
    const cards = [...document.querySelectorAll('#hub-root .ugrid .ucard h3')].map(x=>x.textContent);
    const menu = PERMS.c.includes(ESCRITORIO.pg);
    CU = antes;
    return { temCard: cards.some(x=>/Escrit/i.test(x)), menu, cards };
  });
  t('o perfil Campo não recebe o card do Escritório', !perm.temCard, JSON.stringify(perm.cards));
  t('nem a permissão da tela', !perm.menu);

  console.log('\n— o menu Negócios também leva lá —');
  const menu = await page.evaluate(() => {
    const btn = document.getElementById('mn-neg');
    menuNegocios(btn);
    const txt = document.getElementById('dropneg').innerText;
    fecharDrops();
    return txt;
  });
  t('o Escritório aparece no menu Negócios', /Escrit/i.test(menu));
  /* o menu mostra o nome longo (u.nome), não o curto do card */
  t('e continua listando os sete negócios',
    /Obras e Edificações/.test(menu) && /Canais de Vídeo/.test(menu), menu.replace(/\n/g,' | '));

  console.log(`\n${ok} passaram, ${fail} falharam`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();

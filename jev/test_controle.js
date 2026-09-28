/* =========================================================================
   test_controle.js — a tela do Controle tem de ser honesta nos dois mundos.

   Os dois erros que este teste existe para impedir:

   1. TELA BRANCA SEM EXPLICAÇÃO. Sem o Mission Control ligado, a tela não
      pode simplesmente não aparecer. Tem de dizer o que houve e ensinar a
      ligar. Painel que falha calado vira chamado de suporte.

   2. COMANDO DISPARADO POR ENGANO. Mudar etapa e "rodar agora" são os dois
      únicos comandos desta tela, e os dois mexem em coisa de verdade. O
      teste prova que cada um manda UMA chamada só, e só depois da escolha.

     node test_controle.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};

/* um workspace de mentira, na forma exata do Mission Control de verdade */
const ESTADO = {
  disponivel: true,
  pasta: 'C:\\JeV\\MissionControl',
  generatedAt: new Date().toISOString(),
  errors: [],
  agents: { agents: [
    { id:'radar', name:'Radar', role:'Pauta de finanças', description:'Varre notícias.',
      status:'busy', color:'#4fd1ff', skills:['radar-pauta'], currentTask:'T-104',
      lastHeartbeat:new Date(Date.now()-5*60000).toISOString(),
      stats:{tasksDone:38, tasksFailed:2} },
    { id:'guardiao', name:'Guardião', role:'Backup e vigia', status:'online', color:'#8b7bff',
      skills:['backup'], lastHeartbeat:new Date(Date.now()-2*60000).toISOString(),
      stats:{tasksDone:120, tasksFailed:0} },
    { id:'produtor', name:'Produtor', role:'Montagem', status:'error', color:'#ff8b5e',
      skills:['ffmpeg'], lastHeartbeat:new Date(Date.now()-400*60000).toISOString(),
      stats:{tasksDone:11, tasksFailed:3} },
  ]},
  tasks: { stages:['backlog','planejada','em_execucao','revisao','bloqueada','concluida'], tasks:[
    { id:'T-101', title:'Produzir vídeo longo', stage:'em_execucao', owner:'produtor',
      progress:65, updatedAt:new Date(Date.now()-30*60000).toISOString(),
      evidence:'Narração em fabrica/saida/T-101/narracao.mp3 (4m12s)' },
    { id:'T-102', title:'Revisar o roteiro da semana', stage:'revisao', owner:'radar',
      progress:100, updatedAt:new Date(Date.now()-90*60000).toISOString(), evidence:'docs/roteiro-24.md' },
    { id:'T-103', title:'Publicar no canal', stage:'bloqueada', owner:'produtor', progress:40,
      updatedAt:new Date(Date.now()-200*60000).toISOString(),
      blockedBy:'Falta a chave da plataforma. Cole em Configurações e ligue a rotina de novo.' },
    { id:'T-104', title:'Sem evidência nenhuma', stage:'em_execucao', owner:'radar', progress:10,
      updatedAt:new Date().toISOString() },
  ]},
  cron: { timezone:'America/Cuiaba', jobs:[
    { id:'radar-diario', name:'Radar diário de pautas', description:'Lê os feeds.',
      schedule:'0 7 * * *', humanSchedule:'Diário às 07:00', agent:'radar', enabled:true,
      run:'node agents/radar.js', lastRun:new Date(Date.now()-3600000).toISOString(),
      lastStatus:'ok', nextRun:new Date(Date.now()+7200000).toISOString(), rodandoAgora:false },
    { id:'backup-noturno', name:'Backup da noite', schedule:'0 23 * * *',
      humanSchedule:'Diário às 23:00', agent:'guardiao', enabled:true, run:'node agents/guardiao.js',
      lastStatus:'erro', lastError:'saiu com código 1 — veja logs/job-backup-noturno.log',
      lastRun:new Date(Date.now()-86400000).toISOString(), rodandoAgora:false },
    { id:'so-lembrete', name:'Conferir o canal', schedule:'0 9 * * 1', humanSchedule:'Segunda às 09:00',
      enabled:false, pausedReason:'Agente ainda não criado', lastStatus:null },
  ]},
  projects: { projects:[
    { id:'P-01', name:'Canal Finanças', goal:'Publicar 3 curtos e 1 longo por semana.',
      status:'ativo', progress:35, deadline:'2026-12-31', agents:['radar','produtor'],
      milestones:[{title:'Canal criado', done:true, date:'2026-09-10'},
                  {title:'Mil inscritos', done:false}] },
  ]},
  pipeline: { stages:[{id:'ideia',label:'Ideia'},{id:'publicado',label:'Publicado'}],
    items:[{id:'C-021', title:'Por que 90% nunca investem', format:'longo', channel:'youtube',
            stage:'publicado', views:412}] },
  heartbeat: { staleAfterMinutes:60, agents:{
    radar:{lastSeen:new Date(Date.now()-5*60000).toISOString(), ok:true},
    produtor:{lastSeen:new Date(Date.now()-400*60000).toISOString(), ok:false},
  }},
  status: 'Dia 24. Três vídeos na esteira, um bloqueado esperando chave.',
  memory: [{file:'memory/decisoes.md', name:'decisoes.md', title:'Decisões',
            updated:new Date().toISOString(), preview:'O canal não publica sozinho'}],
  docs:   [{file:'docs/regras-da-casa.md', name:'regras-da-casa.md', title:'Regras da casa',
            updated:new Date().toISOString(), preview:'O agente prepara, o dono clica'}],
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{width:1500, height:1100} });
  page.on('pageerror', e => { fail++; console.log('  FALHA erro de página: ' + e.message); });
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 20000 });

  console.log('\n— a peça está no sistema —');
  const reg = await page.evaluate(() => ({
    naRota: typeof controleRender === 'function',
    temPagina: !!document.getElementById('ctl-root'),
    temBotao: !!document.querySelector('[data-ctl-badge]'),
    permG: PERMS.g.includes('ctl'),
    permO: PERMS.o.includes('ctl'),
    permC: PERMS.c.includes('ctl'),
    abas: CTL_ABAS.map(a => a[0]),
  }));
  t('a tela existe e está na rota', reg.naRota && reg.temPagina);
  t('o botão do Controle apareceu no topo', reg.temBotao);
  t('Gestão e Operação enxergam', reg.permG && reg.permO);
  t('Campo NÃO enxerga (mexe em programa da máquina)', !reg.permC);
  t('as oito abas estão lá',
    JSON.stringify(reg.abas) === JSON.stringify(['painel','agentes','tarefas','rotinas','projetos','esteira','memorias','docs']),
    JSON.stringify(reg.abas));

  console.log('\n— sem o Mission Control, a tela EXPLICA —');
  const sem = await page.evaluate(async () => {
    /* nem app nem servidor: é o estado de quem abriu no navegador */
    delete window.JeVDesktop;
    window.fetch = () => Promise.reject(new Error('conexão recusada'));
    await go('ctl');
    await new Promise(r => setTimeout(r, 400));
    const txt = document.getElementById('ctl-root').innerText;
    return {
      diz: /não está respondendo/i.test(txt),
      explicaOQueE: /equipe de agentes/i.test(txt),
      ensinaLigar: /INICIAR\.bat|aplicativo instalado/i.test(txt),
      temTentarDeNovo: /Tentar de novo/i.test(txt),
      naoFicouEmBranco: txt.trim().length > 200,
    };
  });
  t('diz que o Controle não respondeu', sem.diz);
  t('explica o que é o Controle', sem.explicaOQueE);
  t('ensina como ligar', sem.ensinaLigar);
  t('oferece tentar de novo', sem.temTentarDeNovo);
  t('não deixou a tela em branco', sem.naoFicouEmBranco);

  console.log('\n— com o Controle no ar, os números batem —');
  const cheio = await page.evaluate(async (E) => {
    const chamadas = [];
    window.JeVDesktop = {
      ehAplicativo: true,
      ctlEstado: () => { chamadas.push('estado'); return Promise.resolve(E); },
      ctlMudarTarefa: (id, d) => { chamadas.push('tarefa:' + id + ':' + JSON.stringify(d)); return Promise.resolve({}); },
      ctlMudarRotina: (id, d) => { chamadas.push('rotina:' + id + ':' + JSON.stringify(d)); return Promise.resolve({}); },
      ctlRodarAgora:  id     => { chamadas.push('rodar:' + id); return Promise.resolve({ok:true}); },
      ctlArquivo:     rel    => { chamadas.push('arquivo:' + rel);
                                  return Promise.resolve({file:rel, content:'# Conteúdo lido do disco'}); },
      ctlSubirServidor: () => Promise.resolve({ok:true, url:'http://127.0.0.1:3020'}),
    };
    window.__ch = chamadas;
    CTL.aba = 'painel';
    await controleRender();
    await new Promise(r => setTimeout(r, 300));
    const txt = document.getElementById('ctl-root').innerText;
    const badge = document.querySelector('[data-ctl-badge]');
    return {
      txt,
      /* a tela do Controle mostra trabalho; ela NÃO dispara postagem em
         plataforma nenhuma. O escopo é esta tela, não o sistema inteiro. */
      semPublicar: !/[Pp]ublicar/.test(
        (document.getElementById('ctl-root').innerHTML.match(/onclick="[^"]*"/g) || []).join(' ')),
      pendencias: ctlPendencias(E),
      badgeNum: badge ? badge.textContent : '',
      badgeVisivel: badge && !badge.classList.contains('hide'),
    };
  }, ESTADO);
  /* 2 tarefas (revisão + bloqueada) + 1 agente com erro = 3 */
  t('o contador de pendências dá 3', cheio.pendencias === 3, String(cheio.pendencias));
  t('o botão do topo acendeu com 3', cheio.badgeVisivel && cheio.badgeNum === '3', cheio.badgeNum);
  t('o painel mostra 2 de 3 agentes de pé', /2 de 3/.test(cheio.txt), cheio.txt.slice(0, 200));
  t('o painel conta 1 com erro', /1 com erro/.test(cheio.txt));
  t('o painel diz quantas esperam você', /Esperando você/.test(cheio.txt));
  t('o resumo do Guardião aparece', /Três vídeos na esteira/.test(cheio.txt));
  t('nenhum botão desta tela publica em lugar nenhum', cheio.semPublicar);

  console.log('\n— as abas desenham o que têm —');
  const abas = await page.evaluate(async () => {
    const out = {};
    for (const a of ['agentes','tarefas','rotinas','projetos','esteira','memorias','docs']) {
      CTL.aba = a; await controleRender(); await new Promise(r => setTimeout(r, 120));
      out[a] = document.getElementById('ctl-root').innerText;
    }
    return out;
  });
  t('agentes: mostra nome, papel e último sinal', /Radar/.test(abas.agentes) && /Pauta de finanças/.test(abas.agentes));
  t('agentes: acusa o batimento velho do Produtor', /sem dar sinal/i.test(abas.agentes));
  t('tarefas: a travada vem primeiro e diz O QUE FAZER',
    abas.tarefas.indexOf('Publicar no canal') < abas.tarefas.indexOf('Produzir vídeo longo') &&
    /Cole em Configurações/.test(abas.tarefas));
  t('tarefas: mostra a evidência de onde saiu o número', /narracao\.mp3/.test(abas.tarefas));
  t('tarefas: acusa execução SEM evidência', /sem evidência registrada/i.test(abas.tarefas));
  t('rotinas: diz o horário em palavra de gente', /Diário às 07:00/.test(abas.rotinas));
  t('rotinas: mostra o erro da última execução', /veja logs\/job-backup-noturno\.log/.test(abas.rotinas));
  t('rotinas: rotina sem comando avisa que é só lembrete', /só informativa/i.test(abas.rotinas));
  t('rotinas: mostra por que está pausada', /Agente ainda não criado/.test(abas.rotinas));
  t('projetos: mostra meta e marcos', /Canal Finanças/.test(abas.projetos) && /Mil inscritos/.test(abas.projetos));
  t('esteira: separa por etapa', /Ideia/.test(abas.esteira) && /Publicado/.test(abas.esteira));
  t('memórias e documentos aparecem', /Decisões/.test(abas.memorias) && /Regras da casa/.test(abas.docs));

  console.log('\n— um comando, uma chamada, e só depois da escolha —');
  const cmd = await page.evaluate(async () => {
    window.__ch.length = 0;
    CTL.aba = 'tarefas'; await controleRender(); await new Promise(r => setTimeout(r, 120));
    /* abrir o seletor não pode mandar nada */
    ctlMoverTarefa('T-101');
    await new Promise(r => setTimeout(r, 120));
    const aoAbrir = window.__ch.filter(c => c.startsWith('tarefa:')).length;
    const modalAberto = document.getElementById('mk-form').classList.contains('on');
    /* agora sim, a escolha */
    await ctlAplicarEtapa('T-101', 'concluida');
    await new Promise(r => setTimeout(r, 250));
    const depois = window.__ch.filter(c => c.startsWith('tarefa:'));
    return { aoAbrir, modalAberto, depois };
  });
  t('abrir o seletor de etapa não manda nada', cmd.aoAbrir === 0, String(cmd.aoAbrir));
  t('o seletor abre de verdade', cmd.modalAberto);
  t('escolher a etapa manda UMA chamada só', cmd.depois.length === 1, JSON.stringify(cmd.depois));
  t('e manda a etapa certa', /"stage":"concluida"/.test(cmd.depois[0] || ''), cmd.depois[0]);

  const rodar = await page.evaluate(async () => {
    window.__ch.length = 0;
    CTL.aba = 'rotinas'; await controleRender(); await new Promise(r => setTimeout(r, 120));
    ctlPedirRodar('radar-diario');
    await new Promise(r => setTimeout(r, 150));
    const antesDeConfirmar = window.__ch.filter(c => c.startsWith('rodar:')).length;
    const perg = document.getElementById('mkc-body').innerText;
    document.getElementById('mkc-ok').click();
    await new Promise(r => setTimeout(r, 300));
    return { antesDeConfirmar, perg, depois: window.__ch.filter(c => c.startsWith('rodar:')) };
  });
  t('"Rodar agora" pergunta antes', rodar.antesDeConfirmar === 0);
  t('a pergunta avisa que nada é publicado', /Nada é publicado/i.test(rodar.perg), rodar.perg.slice(0, 160));
  t('confirmar manda UM comando só', rodar.depois.length === 1, JSON.stringify(rodar.depois));

  console.log('\n— ler um arquivo do workspace —');
  const arq = await page.evaluate(async () => {
    window.__ch.length = 0;
    CTL.aba = 'docs'; await controleRender(); await new Promise(r => setTimeout(r, 120));
    await ctlVerArquivo('docs/regras-da-casa.md');
    await new Promise(r => setTimeout(r, 200));
    return { txt: document.getElementById('ctl-root').innerText, ch: window.__ch.slice() };
  });
  t('pediu o arquivo certo', arq.ch.includes('arquivo:docs/regras-da-casa.md'), JSON.stringify(arq.ch));
  t('mostrou o conteúdo lido', /Conteúdo lido do disco/.test(arq.txt));

  console.log('\n— pelo navegador, sem aplicativo, fala com o servidor —');
  const web = await page.evaluate(async (E) => {
    delete window.JeVDesktop;
    const urls = [];
    window.fetch = (u, o) => { urls.push((o && o.method || 'GET') + ' ' + u);
      return Promise.resolve({ ok:true, text:()=>Promise.resolve(JSON.stringify(E)) }); };
    CTL.aba = 'painel'; await controleRender(); await new Promise(r => setTimeout(r, 250));
    return { urls, txt: document.getElementById('ctl-root').innerText };
  }, ESTADO);
  t('o navegador chama 127.0.0.1:3020', web.urls.some(u => u.includes('127.0.0.1:3020/api/state')),
    JSON.stringify(web.urls));
  t('e a tela desenha igual', /Canal Finanças|Três vídeos na esteira|Agentes de pé/.test(web.txt));

  await browser.close();
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

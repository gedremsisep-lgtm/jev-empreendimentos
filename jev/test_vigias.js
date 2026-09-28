/* =========================================================================
   test_vigias.js — cada vigia tem de achar o que deve E CALAR no resto.

   O erro que este teste existe para impedir é o mais perigoso que um
   sistema de alerta pode ter: o alerta que não aparece. Um agente que
   nunca acusa nada passa por "está tudo em ordem" e ninguém desconfia —
   até a conta vencer, o contrato cair, a obra parar.

   Por isso todo agente é testado em PAR: um registro que ele TEM de pegar,
   e um parecido que ele NÃO pode pegar. Só achar não prova nada; um agente
   que devolvesse tudo passaria na metade fácil do teste.

     node test_vigias.js
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => { fail++; console.log('  FALHA erro de página: ' + e.message); });
  await page.goto('file://' + path.join(__dirname, 'jev_empreendimentos.html'));
  await page.waitForFunction(() => typeof db !== 'undefined' && db !== null, { timeout: 20000 });

  console.log('\n— o sistema conhece os vigias —');
  const reg = await page.evaluate(() => ({
    noStores: STORES.includes('vigias'),
    versao: DB_VERSION,
    naRota: typeof vigiasRender === 'function',
    temPagina: !!document.getElementById('vigias-root'),
    temSino: !!document.querySelector('[data-vig-badge]'),
    permG: PERMS.g.includes('vigias'),
    permC: PERMS.c.includes('vigias'),
    quantos: VIGIAS.length,
    /* dois vigias com o mesmo id fariam um sumir sem aviso nenhum */
    idsUnicos: new Set(VIGIAS.map(a => a.id)).size === VIGIAS.length,
    /* todo agente tem de apontar para uma rota que existe de verdade */
    rotasValidas: VIGIAS.every(a => PERMS.g.includes(a.rota)),
    areas: [...new Set(VIGIAS.map(a => a.area))].sort(),
  }));
  t('vigias está na lista de tabelas', reg.noStores);
  t('a versão do banco subiu para 9', reg.versao === 9, 'v' + reg.versao);
  t('a tela existe e está na rota', reg.naRota && reg.temPagina);
  t('o sino apareceu no topo', reg.temSino);
  t('Gestão e Campo enxergam a tela', reg.permG && reg.permC);
  t('são 20 vigias', reg.quantos === 20, 'achei ' + reg.quantos);
  t('nenhum id repetido entre os vigias', reg.idsUnicos);
  t('todo agente aponta para uma rota que existe', reg.rotasValidas);
  t('cobre as quatro áreas que ele pediu',
    JSON.stringify(reg.areas) === JSON.stringify(['financeiro','locacao','midia','obras','produtos']),
    JSON.stringify(reg.areas));

  console.log('\n— semeando o cenário —');
  const semeado = await page.evaluate(async () => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0,10); };
    const mk = new Date().toISOString().slice(0,7);
    for (const s of STORES) { if (s !== 'config') { const all = await dbGetAll(s); for (const r of all) await dbDel(s, r.id); } }

    /* ---- OBRAS ---- */
    const obraId  = await dbAdd('obras', {nome:'Obra Vigiada', status:'Em andamento', valorContrato:500000});
    const obraOk  = await dbAdd('obras', {nome:'Obra Em Dia',  status:'Em andamento', valorContrato:100000});
    const obraFim = await dbAdd('obras', {nome:'Obra Entregue', status:'Entregue', valorContrato:100000});
    /* etapa atrasada de verdade, e duas que NÃO podem acusar */
    await dbAdd('etapas', {obraId, nome:'Fundação', dtFim:d(-30), avanco:40});
    await dbAdd('etapas', {obraId, nome:'Estrutura', dtFim:d(-30), avanco:100});   // pronta: cala
    await dbAdd('etapas', {obraId, nome:'Cobertura', dtFim:d(+30), avanco:0});     // no prazo: cala
    await dbAdd('etapas', {obraId:obraFim, nome:'Pintura', dtFim:d(-60), avanco:10}); // obra entregue: cala
    /* orçamento estourado numa, folgado na outra */
    await dbAdd('orcamento', {obraId, desc:'Concreto', qtd:100, vunit:500});        // orçado 50.000
    await dbAdd('financeiro', {tipo:'despesa', status:'Pago', valor:60000, venc:d(-5), data:d(-5),
                               refTipo:'obra', refId:obraId, desc:'Concretagem'});  // 120%
    await dbAdd('orcamento', {obraId:obraOk, desc:'Bloco', qtd:100, vunit:100});    // orçado 10.000
    await dbAdd('financeiro', {tipo:'despesa', status:'Pago', valor:1000, venc:d(-5), data:d(-5),
                               refTipo:'obra', refId:obraOk, desc:'Bloco'});        // 10%: cala
    /* a transferência entre contas não pode contar como gasto da obra */
    await dbAdd('financeiro', {tipo:'despesa', status:'Pago', valor:900000, venc:d(-2), data:d(-2),
                               refTipo:'obra', refId:obraOk, desc:'Transferência', transf:true});
    /* medição vencida e medição paga */
    await dbAdd('medicoes', {obraId, num:1, valor:80000, venc:d(-10), status:'Aprovada'});
    await dbAdd('medicoes', {obraId, num:2, valor:80000, venc:d(-10), status:'Paga'});      // cala
    /* RDO: a obra vigiada está sem diário; a outra lançou ontem */
    await dbAdd('rdo', {obraId, data:d(-40), atividades:'Serviço antigo'});
    await dbAdd('rdo', {obraId:obraOk, data:d(-1), atividades:'Serviço de ontem'});          // cala
    /* compra atrasada, e uma já entregue */
    await dbAdd('compras', {obraId, num:'REQ-001/26', status:'Pedido emitido', prevEntrega:d(-9), fornecedor:'Casa do Cimento'});
    await dbAdd('compras', {obraId, num:'REQ-002/26', status:'Entregue', prevEntrega:d(-9)});// cala
    /* a requisição vinda do celular grava 'Solicitada', fora de ST_COMPRA */
    await dbAdd('compras', {obraId, num:'RQ-003', status:'Solicitada', prevEntrega:d(-3)});

    /* ---- FINANCEIRO ---- */
    const contaId = await dbAdd('contas', {nome:'Conta Principal', tipo:'Conta corrente', saldoInicial:1000});
    const contaOk = await dbAdd('contas', {nome:'Conta Sobrando',  tipo:'Conta corrente', saldoInicial:50000});
    await dbAdd('financeiro', {tipo:'receita', status:'Pendente', valor:12000, venc:d(-20), data:d(-20),
                               desc:'Prestação do cliente', pessoa:'Carlos Andrade'});
    await dbAdd('financeiro', {tipo:'despesa', status:'Pendente', valor:800, venc:d(+3), data:d(+3),
                               desc:'Energia do canteiro'});
    await dbAdd('financeiro', {tipo:'despesa', status:'Pago', valor:800, venc:d(-20), data:d(-20),
                               desc:'Já paga'});                                            // cala
    await dbAdd('financeiro', {tipo:'despesa', status:'Cancelado', valor:9000, venc:d(-20), data:d(-20),
                               desc:'Cancelada'});                                          // cala
    await dbAdd('financeiro', {tipo:'despesa', status:'Pendente', valor:5000, venc:d(+90), data:d(+90),
                               desc:'Longe de vencer'});                                    // cala do "a vencer"
    /* conta no vermelho: saída paga maior que o saldo inicial */
    await dbAdd('financeiro', {tipo:'despesa', status:'Pago', valor:4000, venc:d(-2), data:d(-2),
                               contaId, desc:'Saque grande'});
    await dbAdd('financeiro', {tipo:'receita', status:'Pago', valor:200, venc:d(-2), data:d(-2),
                               contaId:contaOk, desc:'Entradinha'});                        // cala
    /* recorrência ativa sem lançamento no mês, e outra já lançada */
    const recId = await dbAdd('recorrencias', {desc:'Aluguel do escritório', valor:2500, tipo:'despesa',
                               periodo:1, dia:10, inicio:'2020-01-01', ativo:true});
    const recOk = await dbAdd('recorrencias', {desc:'Internet', valor:300, tipo:'despesa',
                               periodo:1, dia:15, inicio:'2020-01-01', ativo:true});
    /* paga de propósito: prova que a recorrência do mês foi lançada sem
       virar, ela mesma, uma conta vencida quando o teste roda depois do dia 15 */
    await dbAdd('financeiro', {tipo:'despesa', status:'Pago', valor:300, venc:mk+'-15',
                               data:mk+'-15', dtPag:mk+'-15', desc:'Internet', recorrenteId:recOk});
    await dbAdd('recorrencias', {desc:'Desligada', valor:100, tipo:'despesa', periodo:1,
                               dia:5, inicio:'2020-01-01', ativo:false});                   // cala

    /* ---- IMÓVEIS E VEÍCULOS ---- */
    const imovId = await dbAdd('imoveis', {nome:'Kitnet 03', tipo:'Kitnet', status:'Alugado', aluguelBase:900});
    const imovVg = await dbAdd('imoveis', {nome:'Sala 12', tipo:'Sala comercial', status:'Vago', aluguelBase:1800});
    await dbAdd('imoveis', {nome:'Casa da família', tipo:'Casa', status:'Próprio em uso'});  // cala
    const veicId = await dbAdd('veiculos', {placa:'ABC1D23', modelo:'Hilux', tipo:'Caminhonete',
                               status:'Locado', vencLicenc:d(-5), vencSeguro:d(+400), proxRevisao:d(+15), km:82000});
    await dbAdd('veiculos', {placa:'XYZ9K88', modelo:'Strada', tipo:'Caminhonete',
                               status:'Disponível', vencLicenc:d(+300), vencSeguro:d(+300)}); // cala
    const ctrId = await dbAdd('contratos', {tipo:'imovel', refId:imovId, pessoa:'Marta Ribeiro',
                               inicio:d(-700), fim:d(+25), status:'Ativo', valor:900, diaVenc:10,
                               indice:'IGP-M', proxReajuste:d(+12)});
    await dbAdd('contratos', {tipo:'imovel', refId:imovVg, pessoa:'Antigo', inicio:d(-900),
                               fim:d(-40), status:'Encerrado', valor:800});                  // cala
    await dbAdd('contratos', {tipo:'veiculo', refId:veicId, pessoa:'Obra Sul', inicio:d(-100),
                               fim:d(+400), status:'Ativo', valor:4500});                    // cala
    /* aluguel atrasado, ligado ao contrato */
    await dbAdd('financeiro', {tipo:'receita', status:'Pendente', valor:900, venc:d(-12), data:d(-12),
                               desc:'Aluguel Kitnet 03', contratoId:ctrId, refTipo:'imovel', refId:imovId});
    await dbAdd('manutencoes', {refTipo:'imovel', refId:imovId, data:d(-20), status:'Agendada',
                               desc:'Trocar o chuveiro', prestador:'Elétrica Luz', valor:180});
    await dbAdd('manutencoes', {refTipo:'veiculo', refId:veicId, data:d(-20), status:'Concluída',
                               desc:'Revisão dos 80 mil', valor:1200});                      // cala

    /* ---- PRODUTOS, CHÁCARA E CANAIS ---- */
    await dbAdd('produtos', {nome:'Mel 500g', tipo:'Produto da chácara', un:'produtos',
                               estoque:2, estoqueMin:10, custo:12, preco:30, und:'un', ativo:true});
    await dbAdd('produtos', {nome:'Doce de leite', tipo:'Produto físico', un:'produtos',
                               estoque:200, estoqueMin:10, custo:8, preco:20, ativo:true});  // cala
    await dbAdd('produtos', {nome:'Curso de obra', tipo:'Infoproduto', un:'info',
                               estoque:0, estoqueMin:0, preco:397, ativo:true});             // cala
    await dbAdd('vendas', {un:'produtos', produto:'Mel 500g', data:d(-15), qtd:3, total:90,
                               cliente:'Joana Prado', status:'Pedido', plataforma:'WhatsApp'});
    await dbAdd('vendas', {un:'produtos', produto:'Doce de leite', data:d(-15), qtd:2, total:40,
                               cliente:'Outro', status:'Paga'});                             // cala
    const loteId = await dbAdd('lotes', {nome:'Talhão do Fundo', tipo:'Talhão de lavoura', area:3, und:'ha'});
    await dbAdd('ciclos', {nome:'Milho safrinha', status:'Em andamento', loteId, cultura:'Milho',
                               dtIni:d(-90), dtPrev:d(-6), prodPrev:120, und:'saca', precoPrev:70});
    await dbAdd('ciclos', {nome:'Feijão', status:'Em andamento', loteId, cultura:'Feijão',
                               dtIni:d(-10), dtPrev:d(+120), prodPrev:40, und:'saca'});      // cala
    await dbAdd('ciclos', {nome:'Colhido', status:'Colhido', loteId, dtPrev:d(-6)});         // cala
    const canalId = await dbAdd('canais', {nome:'Canal Obra Fácil', plataforma:'YouTube', dtInicio:d(-400)});
    const canalOk = await dbAdd('canais', {nome:'Canal Ativo', plataforma:'YouTube', dtInicio:d(-400)});
    await dbAdd('canais', {nome:'Canal Recém-Aberto', plataforma:'TikTok', dtInicio:d(-3)});  // cala
    await dbAdd('videos', {titulo:'Vídeo antigo', canalId, status:'Publicado', dtPub:d(-45)});
    await dbAdd('videos', {titulo:'Vídeo de ontem', canalId:canalOk, status:'Publicado', dtPub:d(-1)}); // cala
    await dbAdd('videos', {titulo:'Roteiro parado', canalId, status:'Roteiro', dtPrev:d(-20)});
    await dbAdd('videos', {titulo:'No prazo', canalId, status:'Roteiro', dtPrev:d(+20)});     // cala

    await finLoad();
    return {obraId, obraOk, contaId, contaOk, recId, recOk, ctrId, veicId, imovVg, canalId};
  });
  t('o cenário foi semeado', !!semeado.obraId);

  console.log('\n— cada vigia acha o que deve —');
  const r = await page.evaluate(async () => {
    const {achados, quebrados} = await vigRodar();
    const por = {};
    for (const a of achados) (por[a.agente] = por[a.agente] || []).push(a);
    return {
      quebrados,
      contagem: Object.fromEntries(Object.entries(por).map(([k,v]) => [k, v.length])),
      titulos:  Object.fromEntries(Object.entries(por).map(([k,v]) => [k, v.map(x=>x.titulo)])),
      total: achados.length,
      /* o "já deixa pronto" que ele escolheu: o texto tem de vir escrito */
      comTexto: achados.filter(a=>a.pronto && a.pronto.tipo==='texto' && (a.pronto.conteudo||'').length>40).length,
      /* nenhum achado pode vir sem chave, senão silenciar não funciona */
      todosComChave: achados.every(a => a.chave && a.chave.includes(':')),
      chavesUnicas: new Set(achados.map(a=>a.chave)).size === achados.length,
      gravesValidos: achados.every(a => ['alto','medio','baixo'].includes(a.grave)),
      ordenado: achados.every((a,i,arr) => i===0 ||
        ({alto:0,medio:1,baixo:2})[arr[i-1].grave] <= ({alto:0,medio:1,baixo:2})[a.grave]),
    };
  });

  t('nenhum agente quebrou', r.quebrados.length === 0, r.quebrados.join(' | '));

  const esperado = {
    obra_etapa_atrasada:   1,   // Fundação; cala na pronta, na no-prazo e na obra entregue
    obra_estouro:          1,   // Obra Vigiada a 120%; Obra Em Dia a 10%
    obra_medicao_vencida:  1,   // a Aprovada; a Paga cala
    obra_sem_rdo:          1,   // Obra Vigiada; Obra Em Dia lançou ontem
    obra_compra_atrasada:  2,   // a 'Pedido emitido' e a 'Solicitada' do celular
    fin_vencida:           2,   // a receita do cliente e o aluguel atrasado
    fin_a_vencer:          1,   // energia em 3 dias; a de 90 dias cala
    fin_rec_nao_lancada:   1,   // o aluguel do escritório; a internet já lançou
    fin_saldo_negativo:    1,   // Conta Principal; Conta Sobrando cala
    ctr_vencendo:          1,   // o de imóvel em 25 dias; o de veículo em 400 cala
    ctr_reajuste:          1,
    ctr_aluguel_atrasado:  1,
    veic_documento:        2,   // licenciamento vencido e revisão em 15 dias
    manut_pendente:        1,   // a Agendada; a Concluída cala
    imovel_vago:           1,
    prod_estoque_min:      1,   // Mel; o Doce tem 200 e o infoproduto não tem estoque
    venda_parada:          1,
    ciclo_colheita:        1,   // Milho atrasado; Feijão longe; Colhido já foi
    canal_parado:          1,   // Obra Fácil; Ativo publicou ontem; Recém-Aberto tem prazo
    video_atrasado:        1,
  };
  for (const [id, n] of Object.entries(esperado)) {
    const achou = r.contagem[id] || 0;
    t(`${id}: ${n} achado${n>1?'s':''}`, achou === n,
      `veio ${achou} — ${JSON.stringify(r.titulos[id] || [])}`);
  }

  console.log('\n— o que ele pediu: avisa E já deixa pronto —');
  t('todo achado tem chave própria', r.todosComChave);
  t('nenhuma chave repetida (senão silenciar erraria o alvo)', r.chavesUnicas);
  t('toda gravidade é uma das três', r.gravesValidos);
  t('a lista vem do mais grave para o menos', r.ordenado);
  t('pelo menos 6 achados trazem o texto já escrito', r.comTexto >= 6, 'vieram ' + r.comTexto);

  const txt = await page.evaluate(async () => {
    const {achados} = await vigRodar();
    const cob = achados.find(a => a.agente === 'ctr_aluguel_atrasado');
    const est = achados.find(a => a.agente === 'prod_estoque_min');
    return {cobranca: cob ? cob.pronto.conteudo : '', reposicao: est ? est.pronto.conteudo : ''};
  });
  t('a cobrança do aluguel traz o nome de quem deve', /Marta/.test(txt.cobranca), txt.cobranca.slice(0,80));
  t('a cobrança traz o valor em reais', /R\$\s*900,00/.test(txt.cobranca), txt.cobranca.slice(0,120));
  t('a cobrança traz a data do vencimento', /\d{2}\/\d{2}\/\d{4}/.test(txt.cobranca));
  t('o pedido de reposição diz quanto comprar', /Quantidade sugerida: 18/.test(txt.reposicao), txt.reposicao);

  console.log('\n— desligar e silenciar —');
  const ctl = await page.evaluate(async () => {
    const antes = (await vigRodar()).achados.length;
    await dbAdd('vigias', {tipo:'ajuste', agente:'imovel_vago', ligado:false});
    const semVago = (await vigRodar()).achados;
    const alvo = semVago.find(a => a.agente === 'fin_a_vencer');
    await dbAdd('vigias', {tipo:'silencio', chave:alvo.chave, ate:addDias(hoje(), 7)});
    const calado = (await vigRodar()).achados;
    /* silêncio vencido não vale mais: o alerta tem de voltar sozinho */
    await dbAdd('vigias', {tipo:'silencio', chave:'prod_estoque_min:1', ate:addDias(hoje(), -1)});
    const voltou = (await vigRodar()).achados;
    return {
      antes,
      semVago: semVago.length,
      temVago: semVago.some(a => a.agente === 'imovel_vago'),
      calado: calado.length,
      temAlvo: calado.some(a => a.chave === alvo.chave),
      estoqueSegueVivo: voltou.some(a => a.agente === 'prod_estoque_min'),
    };
  });
  t('desligar um vigia tira os achados dele', !ctl.temVago && ctl.semVago === ctl.antes - 1,
    `${ctl.antes} → ${ctl.semVago}`);
  t('silenciar tira só aquele achado', !ctl.temAlvo && ctl.calado === ctl.semVago - 1,
    `${ctl.semVago} → ${ctl.calado}`);
  t('silêncio com data vencida não cala mais nada', ctl.estoqueSegueVivo);

  console.log('\n— o agente NÃO escreve no banco de dados —');
  const limpo = await page.evaluate(async () => {
    const antes = {};
    for (const s of ['obras','etapas','financeiro','contratos','produtos','vendas','ciclos','videos'])
      antes[s] = (await dbGetAll(s)).length;
    await vigRodar();
    await vigRodar();
    const depois = {};
    for (const s of Object.keys(antes)) depois[s] = (await dbGetAll(s)).length;
    return {igual: JSON.stringify(antes) === JSON.stringify(depois), antes, depois};
  });
  t('rodar os vigias não cria nem apaga um único registro', limpo.igual,
    JSON.stringify(limpo.antes) + ' → ' + JSON.stringify(limpo.depois));

  console.log('\n— a tela desenha o que os vigias acharam —');
  const tela = await page.evaluate(async () => {
    VIG.area = ''; VIG.grave = '';
    await go('vigias');
    await new Promise(r => setTimeout(r, 500));
    const texto = document.getElementById('vigias-root').innerText;
    const badge = document.querySelector('[data-vig-badge]');
    return {
      mostraTitulo: /Vigias do negócio/.test(texto),
      mostraUrgente: /Urgente/.test(texto),
      mostraUmAlerta: /Kitnet 03|Fundação|Obra Vigiada/.test(texto),
      explicaOLimite: /não liga para o seu celular|ninguém é avisado/i.test(texto),
      dizQueNaoGrava: /Nenhum deles grava nada no banco/i.test(texto),
      badgeVisivel: badge && !badge.classList.contains('hide'),
      badgeNum: badge ? badge.textContent : '',
    };
  });
  t('a tela abre com o título certo', tela.mostraTitulo);
  t('mostra o cartão de urgentes', tela.mostraUrgente);
  t('mostra pelo menos um alerta de verdade', tela.mostraUmAlerta);
  t('diz na cara o limite de rodar só dentro do app', tela.explicaOLimite);
  t('avisa que agente nenhum grava no banco', tela.dizQueNaoGrava);
  t('o sino do topo acendeu com o número', tela.badgeVisivel && Number(tela.badgeNum) > 0, tela.badgeNum);

  console.log('\n— o perfil de Campo não enxerga dinheiro —');
  const campo = await page.evaluate(async () => {
    const antes = CU;
    CU = 'c';
    const {achados} = await vigRodar();
    CU = antes;
    return {
      areas: [...new Set(achados.map(a => a.area))].sort(),
      temFinanceiro: achados.some(a => a.area === 'financeiro'),
      temObra: achados.some(a => a.area === 'obras'),
    };
  });
  t('Campo vê os alertas de obra', campo.temObra);
  t('Campo NÃO vê os alertas de financeiro', !campo.temFinanceiro, JSON.stringify(campo.areas));

  await browser.close();
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

/* =========================================================================
   OS VIGIAS DE MONITORAMENTO

   O QUE É, EM UMA FRASE
   ---------------------
   Vinte vigias que leem o banco toda vez que o sistema abre e dizem, sem
   você ir procurar, o que está prestes a doer: etapa atrasada, conta
   vencida, contrato acabando, estoque no fim, canal parado.

   AS TRÊS DECISÕES QUE ELE TOMOU, E QUE ESTÃO CRAVADAS AQUI
   ---------------------------------------------------------
   1. VIGIAM TODOS OS CAMPOS. Obras, financeiro, imóveis e veículos,
      produtos, chácara e canais. Nenhum negócio da casa fica de fora.

   2. RODAM DENTRO DO APLICATIVO, quando ele abre. Não há servidor, não há
      credencial saindo daqui, não há mensalidade. O preço disso é honesto
      e precisa ser dito: se ninguém abrir o JeV, ninguém é avisado. O
      agente não acorda de madrugada para te ligar.

   3. AVISAM E JÁ DEIXAM PRONTO. Não é só o alerta vermelho. Junto dele vem
      o trabalho adiantado: a cobrança já escrita com o valor e o dia certo,
      a lista de compra já montada com o que falta, a carta de renovação já
      redigida. Pronto para copiar e mandar — mas nada sai daqui sozinho.

   A REGRA QUE NÃO SE QUEBRA
   -------------------------
   AGENTE NÃO ESCREVE NO BANCO DE DADOS. Ele lê, conclui e prepara texto.
   Quem grava é você, na tela do módulo, como sempre foi. Um vigia com
   permissão de escrita é um vigia que pode estragar o que devia proteger —
   e você descobriria tarde demais, porque confiaria nele.

   ONDE ISSO ENCOSTA NO RESTO DO SISTEMA
   -------------------------------------
   O store 'vigias' guarda só duas coisas, e nenhuma delas é alerta:
     - {tipo:'ajuste',   agente:<id>, ligado:<bool>}      qual vigia está de pé
     - {tipo:'silencio', chave:<str>, ate:<'YYYY-MM-DD'>} o que você mandou calar
   O alerta em si NUNCA é gravado. Ele nasce da leitura do banco a cada vez.
   Guardar alerta seria guardar uma foto do passado e mostrá-la como se
   fosse o presente: a conta que você pagou ontem continuaria gritando.
   ========================================================================= */

/* quantos dias de antecedência cada vigia usa. Mexer aqui muda o sistema
   inteiro de uma vez, que é o ponto de ter isso num lugar só. */
const VIG_PRAZO = {
  vencer:    7,    /* conta a vencer                                  */
  contrato:  60,   /* contrato de locação chegando ao fim             */
  reajuste:  30,   /* reajuste de aluguel entrando na data            */
  documento: 30,   /* licenciamento, seguro e revisão de veículo      */
  manut:     15,   /* próxima manutenção programada                   */
  rdo:       7,    /* obra andando sem diário                         */
  canal:     14,   /* canal sem vídeo publicado                       */
  venda:     7,    /* venda parada em Pedido ou Confirmada            */
  colheita:  7,    /* ciclo da chácara chegando na data               */
  entrega:   0,    /* compra passou da previsão de entrega            */
};

/* as cores saem das variáveis da casa, não de hexadecimal solto: quem
   mexer no tema uma vez acerta esta tela junto, sem passar por aqui */
const VIG_GRAVE = {
  alto:  {rotulo:'Urgente', cor:'var(--red)',   bg:'var(--red-bg)',   pill:'s-bl', ic:'ti-alert-triangle'},
  medio: {rotulo:'Atenção', cor:'var(--amber)', bg:'var(--amber-bg)', pill:'s-wn', ic:'ti-clock-exclamation'},
  baixo: {rotulo:'De olho', cor:'var(--blue)',  bg:'var(--blue-bg)',  pill:'s-pd', ic:'ti-eye'},
};

/* estado só da tela — nada disso vai para o banco */
const VIG = {carregando:false, achados:[], area:'', grave:'', silencios:[], ajustes:[], erro:''};

/* ---------------------------------------------------------------- ajudas */
/* diasEntre(a,b) devolve b-a; então "quanto falta" é diasEntre(hoje, alvo)
   e um número NEGATIVO quer dizer que a data já passou. */
function vigFaltam(iso){ return iso ? diasEntre(hoje(), String(iso).slice(0,10)) : null; }
function vigVencido(iso){ const d = vigFaltam(iso); return d !== null && d < 0; }
function vigDentro(iso, dias){ const d = vigFaltam(iso); return d !== null && d >= 0 && d <= dias; }
/* "há 3 dias" / "em 12 dias" — o jeito que gente fala */
function vigQuando(iso){
  const d = vigFaltam(iso);
  if(d === null) return '';
  if(d === 0)  return 'hoje';
  if(d === 1)  return 'amanhã';
  if(d === -1) return 'ontem';
  return d > 0 ? `em ${d} dias` : `há ${Math.abs(d)} dias`;
}
function vigPrimeiroNome(s){ return String(s||'').trim().split(/\s+/)[0] || ''; }
function vigAssina(){
  const e = (CFG && CFG.empresa) ? String(CFG.empresa).trim() : '';
  return e ? `\n\n${e}` : '';
}

/* ================================================== OS VINTE VIGIAS ===== */
/* Cada um recebe o mesmo pacote D, já carregado uma vez só, e devolve uma
   lista de achados. Carregar o banco vinte vezes seria vinte vezes mais
   lento sem nenhum ganho — os dados são os mesmos para todos. */

const VIGIAS = [

/* ---------------------------------------------------------------- OBRAS */
{
  id:'obra_etapa_atrasada', nome:'Etapa atrasada', area:'obras', rota:'crono',
  ic:'ti-crane', desc:'Etapa com data de fim já passada e avanço abaixo de 100%.',
  achar(D){
    const viva = o => !['Concluída','Entregue'].includes(o.status);
    const out = [];
    for(const e of D.etapas){
      const o = D.obras.find(x=>x.id===e.obraId);
      if(!o || !viva(o)) continue;
      if(!e.dtFim || !vigVencido(e.dtFim)) continue;
      if(num(e.avanco) >= 100) continue;
      const atraso = Math.abs(vigFaltam(e.dtFim));
      out.push({
        chave:`obra_etapa_atrasada:${e.id}`,
        grave: atraso > 15 ? 'alto' : 'medio',
        titulo:`${e.nome} — ${o.nome}`,
        detalhe:`Fim previsto ${dbr(e.dtFim)}, ${vigQuando(e.dtFim)}. Avanço em ${qtd(num(e.avanco),0)}%.`,
        pronto:{tipo:'ir', rotulo:'Abrir o cronograma da obra', rota:'crono'},
      });
    }
    return out;
  }
},
{
  id:'obra_estouro', nome:'Custo passando do orçamento', area:'obras', rota:'obras',
  ic:'ti-crane', desc:'Despesa realizada da obra encostando ou passando do orçado.',
  achar(D){
    const out = [];
    for(const o of D.obras){
      if(['Concluída','Entregue'].includes(o.status)) continue;
      const orcado = D.orcamento.filter(i=>i.obraId===o.id)
                       .reduce((s,i)=>s+num(i.qtd)*num(i.vunit), 0);
      if(orcado <= 0) continue;
      /* finVale tira cancelado e transferência entre contas: sem isso uma
         transferência apareceria como gasto da obra e o alerta seria falso */
      const gasto = D.financeiro.filter(l=>finVale(l) && l.tipo==='despesa' &&
                      l.refTipo==='obra' && Number(l.refId)===o.id)
                      .reduce((s,l)=>s+num(l.valor), 0);
      const p = gasto/orcado*100;
      if(p < 90) continue;
      out.push({
        chave:`obra_estouro:${o.id}`,
        grave: p >= 100 ? 'alto' : 'medio',
        titulo:`${o.nome} — ${qtd(p,1)}% do orçamento`,
        detalhe:`Orçado ${moeda(orcado)} · realizado ${moeda(gasto)}` +
                (p>=100 ? ` · passou ${moeda(gasto-orcado)}` : ` · sobra ${moeda(orcado-gasto)}`),
        pronto:{tipo:'ir', rotulo:'Abrir o orçamento da obra', rota:'orc'},
      });
    }
    return out;
  }
},
{
  id:'obra_medicao_vencida', nome:'Medição vencida sem pagamento', area:'obras', rota:'med',
  ic:'ti-file-invoice', desc:'Boletim de medição emitido ou aprovado com vencimento passado.',
  achar(D){
    const out = [];
    for(const m of D.medicoes){
      if(['Paga','Cancelada'].includes(m.status)) continue;
      if(!m.venc || !vigVencido(m.venc)) continue;
      const o = D.obras.find(x=>x.id===m.obraId);
      const quem = o ? (o.cliente || o.nome) : 'o cliente';
      out.push({
        chave:`obra_medicao_vencida:${m.id}`,
        grave:'alto',
        titulo:`Medição ${m.num} — ${o?o.nome:'obra'}`,
        detalhe:`${moeda(m.valor)} venceu ${dbr(m.venc)}, ${vigQuando(m.venc)}. Situação: ${m.status}.`,
        pronto:{tipo:'texto', rotulo:'Copiar a cobrança',
          conteudo:`Bom dia, ${vigPrimeiroNome(quem)}.\n\n`+
            `Passando para lembrar do boletim de medição nº ${m.num} da obra ${o?o.nome:''}, `+
            `no valor de ${moeda(m.valor)}, com vencimento em ${dbr(m.venc)}.\n\n`+
            `Pode me confirmar a previsão de pagamento? Qualquer documento que faltar, eu envio na hora.`+
            vigAssina()},
      });
    }
    return out;
  }
},
{
  id:'obra_sem_rdo', nome:'Obra andando sem diário', area:'obras', rota:'rdo',
  ic:'ti-clipboard-check', desc:'Obra em andamento sem RDO lançado nos últimos dias.',
  achar(D){
    const out = [];
    for(const o of D.obras){
      if(o.status !== 'Em andamento') continue;
      const meus = D.rdo.filter(r=>r.obraId===o.id).map(r=>r.data).filter(Boolean).sort();
      const ult = meus.length ? meus[meus.length-1] : null;
      const sem = ult ? Math.abs(vigFaltam(ult)) : null;
      if(ult && sem <= VIG_PRAZO.rdo) continue;
      out.push({
        chave:`obra_sem_rdo:${o.id}`,
        grave: (sem === null || sem > 20) ? 'alto' : 'medio',
        titulo:`${o.nome} sem diário`,
        detalhe: ult ? `Último RDO em ${dbr(ult)}, ${vigQuando(ult)}.`
                     : 'Nenhum RDO lançado nesta obra até agora.',
        pronto:{tipo:'ir', rotulo:'Abrir o diário de obra', rota:'rdo'},
      });
    }
    return out;
  }
},
{
  id:'obra_compra_atrasada', nome:'Compra passou da entrega', area:'obras', rota:'mat',
  ic:'ti-package', desc:'Requisição ainda aberta com previsão de entrega já vencida.',
  achar(D){
    /* 'Solicitada' não existe em ST_COMPRA, mas é o que o celular grava.
       Tratar como aberta, senão requisição de campo nunca seria vigiada. */
    const abertas = ['Requisitado','Aguardando cotação','Cotado','Pedido emitido','Solicitada'];
    const out = [];
    for(const c of D.compras){
      if(!abertas.includes(c.status)) continue;
      if(!c.prevEntrega || !vigVencido(c.prevEntrega)) continue;
      const o = D.obras.find(x=>x.id===c.obraId);
      out.push({
        chave:`obra_compra_atrasada:${c.id}`,
        grave: Math.abs(vigFaltam(c.prevEntrega)) > 7 ? 'alto' : 'medio',
        titulo:`${c.num||'Requisição'} — ${o?o.nome:'obra'}`,
        detalhe:`Entrega prevista ${dbr(c.prevEntrega)}, ${vigQuando(c.prevEntrega)}. `+
                `Situação: ${c.status}${c.fornecedor?' · '+c.fornecedor:''}.`,
        pronto:{tipo:'texto', rotulo:'Copiar a cobrança do fornecedor',
          conteudo:`Bom dia${c.fornecedor?', '+vigPrimeiroNome(c.fornecedor):''}.\n\n`+
            `Sobre a requisição ${c.num||''}${o?' da obra '+o.nome:''}: a entrega estava prevista `+
            `para ${dbr(c.prevEntrega)} e ainda não chegou.\n\n`+
            `Consegue me passar a nova data? A frente de serviço está parada esperando o material.`+
            vigAssina()},
      });
    }
    return out;
  }
},

/* ----------------------------------------------------------- FINANCEIRO */
{
  id:'fin_vencida', nome:'Conta vencida', area:'financeiro', rota:'fin',
  ic:'ti-wallet', desc:'Lançamento pendente com vencimento já passado.',
  achar(D){
    const out = [];
    for(const l of D.financeiro){
      if(!finVale(l) || !finAtrasado(l)) continue;
      const rec = l.tipo === 'receita';
      const dias = Math.abs(vigFaltam(l.venc));
      out.push({
        chave:`fin_vencida:${l.id}`,
        grave: dias > 15 ? 'alto' : 'medio',
        titulo:`${rec?'A receber':'A pagar'}: ${l.desc||'(sem descrição)'}`,
        detalhe:`${moeda(l.valor)} venceu ${dbr(l.venc)}, ${vigQuando(l.venc)}`+
                `${l.pessoa?' · '+l.pessoa:''}.`,
        pronto: rec
          ? {tipo:'texto', rotulo:'Copiar a cobrança',
             conteudo:`Bom dia${l.pessoa?', '+vigPrimeiroNome(l.pessoa):''}.\n\n`+
               `Identifiquei aqui que ${l.desc?'"'+l.desc+'"':'o valor'} de ${moeda(l.valor)} `+
               `venceu em ${dbr(l.venc)} e ainda consta em aberto.\n\n`+
               `Se já tiver sido pago, me manda o comprovante que eu dou baixa. `+
               `Se ainda não, me diz a melhor data que eu reprogramo.`+ vigAssina()}
          : {tipo:'ir', rotulo:'Abrir o financeiro', rota:'fin'},
      });
    }
    return out;
  }
},
{
  id:'fin_a_vencer', nome:'Conta a vencer', area:'financeiro', rota:'fin',
  ic:'ti-clock', desc:`Lançamento pendente vencendo nos próximos ${VIG_PRAZO.vencer} dias.`,
  achar(D){
    const out = [];
    for(const l of D.financeiro){
      if(!finVale(l) || l.status !== 'Pendente') continue;
      if(!vigDentro(l.venc, VIG_PRAZO.vencer)) continue;
      out.push({
        chave:`fin_a_vencer:${l.id}`,
        grave:'baixo',
        titulo:`${l.tipo==='receita'?'A receber':'A pagar'}: ${l.desc||'(sem descrição)'}`,
        detalhe:`${moeda(l.valor)} vence ${dbr(l.venc)}, ${vigQuando(l.venc)}.`,
        pronto:{tipo:'ir', rotulo:'Abrir o financeiro', rota:'fin'},
      });
    }
    return out;
  }
},
{
  id:'fin_rec_nao_lancada', nome:'Recorrência não lançada', area:'financeiro', rota:'fin',
  ic:'ti-refresh', desc:'Conta fixa ativa que ainda não gerou o lançamento do mês.',
  achar(D){
    const mk = mesAtual();
    const out = [];
    for(const r of D.recorrencias){
      if(r.ativo === false) continue;
      if(r.inicio && String(r.inicio).slice(0,7) > mk) continue;
      if(r.fim && String(r.fim).slice(0,7) < mk) continue;
      /* a periodicidade decide se ESTE mês é mês dela */
      const per = num(r.periodo) || 1;
      if(per > 1 && r.inicio){
        const passou = mesesEntre(String(r.inicio).slice(0,7)+'-01', mk+'-01');
        if(passou % per !== 0) continue;
      }
      const tem = D.financeiro.some(l=>Number(l.recorrenteId)===r.id &&
                    String(l.venc||l.data||'').slice(0,7) === mk);
      if(tem) continue;
      out.push({
        chave:`fin_rec_nao_lancada:${r.id}:${mk}`,
        grave:'medio',
        titulo:`${r.desc||'Recorrência'} não lançada em ${dmes(mk+'-01')}`,
        detalhe:`${r.tipo==='receita'?'Receita':'Despesa'} fixa de ${moeda(r.valor)}, `+
                `dia ${num(r.dia)||10}. Este mês ainda não apareceu no financeiro.`,
        pronto:{tipo:'ir', rotulo:'Abrir as contas fixas', rota:'fin'},
      });
    }
    return out;
  }
},
{
  id:'fin_saldo_negativo', nome:'Conta no vermelho', area:'financeiro', rota:'fin',
  ic:'ti-alert-circle', desc:'Conta bancária ou caixa com saldo abaixo de zero.',
  achar(D){
    const out = [];
    for(const c of D.saldos){
      if(num(c.saldo) >= 0) continue;
      out.push({
        chave:`fin_saldo_negativo:${c.id}`,
        grave:'alto',
        titulo:`${c.nome} com saldo negativo`,
        detalhe:`Saldo de ${moeda(c.saldo)}. `+
                `Entradas ${moeda(c.entradas)} contra saídas ${moeda(c.saidas)}.`,
        pronto:{tipo:'ir', rotulo:'Abrir as contas', rota:'fin'},
      });
    }
    return out;
  }
},

/* ------------------------------------------------ IMÓVEIS E VEÍCULOS --- */
{
  id:'ctr_vencendo', nome:'Contrato de locação vencendo', area:'locacao', rota:'imoveis',
  ic:'ti-file-invoice', desc:`Contrato ativo terminando nos próximos ${VIG_PRAZO.contrato} dias.`,
  achar(D){
    const out = [];
    for(const c of D.contratos){
      if(c.status !== 'Ativo' || !c.fim) continue;
      const falta = vigFaltam(c.fim);
      if(falta === null || falta > VIG_PRAZO.contrato) continue;
      const bem = vigBem(D, c.tipo, c.refId);
      out.push({
        chave:`ctr_vencendo:${c.id}`,
        grave: falta < 0 ? 'alto' : (falta <= 30 ? 'medio' : 'baixo'),
        titulo:`${bem} — contrato ${falta<0?'vencido':'vencendo'}`,
        detalhe:`${c.pessoa||'Locatário'} · fim em ${dbr(c.fim)}, ${vigQuando(c.fim)} · ${moeda(c.valor)}.`,
        pronto:{tipo:'texto', rotulo:'Copiar a mensagem de renovação',
          conteudo:`Bom dia${c.pessoa?', '+vigPrimeiroNome(c.pessoa):''}.\n\n`+
            `O contrato de ${bem} termina em ${dbr(c.fim)}.\n\n`+
            `Tem interesse em renovar? Se tiver, eu já preparo o aditivo com as condições `+
            `atualizadas. Se preferir encerrar, também tudo bem — só me avisa para combinarmos `+
            `a vistoria e a entrega das chaves.`+ vigAssina()},
      });
    }
    return out;
  }
},
{
  id:'ctr_reajuste', nome:'Reajuste de aluguel na data', area:'locacao', rota:'imoveis',
  ic:'ti-calendar-check', desc:`Contrato com reajuste previsto nos próximos ${VIG_PRAZO.reajuste} dias.`,
  achar(D){
    const out = [];
    for(const c of D.contratos){
      if(c.status !== 'Ativo' || !c.proxReajuste) continue;
      const falta = vigFaltam(c.proxReajuste);
      if(falta === null || falta > VIG_PRAZO.reajuste) continue;
      const bem = vigBem(D, c.tipo, c.refId);
      out.push({
        chave:`ctr_reajuste:${c.id}:${String(c.proxReajuste).slice(0,7)}`,
        grave: falta < 0 ? 'medio' : 'baixo',
        titulo:`${bem} — reajuste ${falta<0?'vencido':'chegando'}`,
        detalhe:`Previsto para ${dbr(c.proxReajuste)}, ${vigQuando(c.proxReajuste)}. `+
                `Índice ${c.indice||'não definido'}. Valor hoje: ${moeda(c.valor)}.`,
        pronto:{tipo:'ir', rotulo:'Abrir o contrato', rota: c.tipo==='veiculo'?'veiculos':'imoveis'},
      });
    }
    return out;
  }
},
{
  id:'ctr_aluguel_atrasado', nome:'Aluguel atrasado', area:'locacao', rota:'fin',
  ic:'ti-home', desc:'Aluguel gerado pelo contrato que venceu e não foi recebido.',
  achar(D){
    const out = [];
    for(const l of D.financeiro){
      if(!finVale(l) || !l.contratoId || l.tipo !== 'receita') continue;
      if(!finAtrasado(l)) continue;
      const c = D.contratos.find(x=>x.id===Number(l.contratoId));
      const bem = c ? vigBem(D, c.tipo, c.refId) : (l.refNome||'o imóvel');
      out.push({
        chave:`ctr_aluguel_atrasado:${l.id}`,
        grave:'alto',
        titulo:`Aluguel atrasado — ${bem}`,
        detalhe:`${moeda(l.valor)} venceu ${dbr(l.venc)}, ${vigQuando(l.venc)}`+
                `${c&&c.pessoa?' · '+c.pessoa:''}.`,
        pronto:{tipo:'texto', rotulo:'Copiar a cobrança',
          conteudo:`Bom dia${c&&c.pessoa?', '+vigPrimeiroNome(c.pessoa):''}.\n\n`+
            `O aluguel de ${bem}, no valor de ${moeda(l.valor)}, venceu em ${dbr(l.venc)} `+
            `e ainda não constou aqui.\n\n`+
            `Se já pagou, me manda o comprovante que eu baixo na hora. `+
            `Se houve algum imprevisto, me fala que a gente combina uma data.`+ vigAssina()},
      });
    }
    return out;
  }
},
{
  id:'veic_documento', nome:'Documento de veículo vencendo', area:'locacao', rota:'veiculos',
  ic:'ti-car', desc:`Licenciamento, seguro ou revisão nos próximos ${VIG_PRAZO.documento} dias.`,
  achar(D){
    const campos = [['vencLicenc','Licenciamento'],['vencSeguro','Seguro'],['proxRevisao','Revisão']];
    const out = [];
    for(const v of D.veiculos){
      for(const [campo, rotulo] of campos){
        const dt = v[campo];
        if(!dt) continue;
        const falta = vigFaltam(dt);
        if(falta === null || falta > VIG_PRAZO.documento) continue;
        out.push({
          chave:`veic_documento:${v.id}:${campo}`,
          grave: falta < 0 ? 'alto' : 'medio',
          titulo:`${rotulo} ${falta<0?'vencido':'vencendo'} — ${v.modelo||''} ${v.placa||''}`.trim(),
          /* "Licenciamento em 24/09, há 4 dias" não diz nada. O verbo é que
             conta a história: venceu, ou vence. */
          detalhe:`${campo==='proxRevisao' ? (falta<0?'Revisão estava marcada para':'Revisão marcada para')
                                           : (falta<0?rotulo+' venceu em':rotulo+' vence em')} `+
                  `${dbr(dt)}, ${vigQuando(dt)}.`+
                  (campo==='proxRevisao'&&num(v.km)?` Odômetro em ${qtd(num(v.km),0)} km.`:''),
          pronto:{tipo:'ir', rotulo:'Abrir o veículo', rota:'veiculos'},
        });
      }
    }
    return out;
  }
},
{
  id:'manut_pendente', nome:'Manutenção agendada e não feita', area:'locacao', rota:'imoveis',
  ic:'ti-tool', desc:'Manutenção marcada cuja data passou sem ser concluída.',
  achar(D){
    const out = [];
    for(const m of D.manutencoes){
      if(m.status === 'Concluída') continue;
      if(!m.data || !vigVencido(m.data)) continue;
      const bem = vigBem(D, m.refTipo, m.refId);
      out.push({
        chave:`manut_pendente:${m.id}`,
        grave: Math.abs(vigFaltam(m.data)) > 15 ? 'alto' : 'medio',
        titulo:`${m.desc||'Manutenção'} — ${bem}`,
        detalhe:`Agendada para ${dbr(m.data)}, ${vigQuando(m.data)}. `+
                `Situação: ${m.status||'Agendada'}${m.prestador?' · '+m.prestador:''}.`,
        pronto:{tipo:'ir', rotulo:'Abrir manutenções',
                rota: m.refTipo==='veiculo'?'veiculos':'imoveis'},
      });
    }
    return out;
  }
},
{
  id:'imovel_vago', nome:'Imóvel parado sem render', area:'locacao', rota:'imoveis',
  ic:'ti-home', desc:'Imóvel marcado como vago — todo mês parado é aluguel que não entra.',
  achar(D){
    const out = [];
    for(const i of D.imoveis){
      if(i.status !== 'Vago') continue;
      out.push({
        chave:`imovel_vago:${i.id}`,
        grave:'baixo',
        titulo:`${i.nome} está vago`,
        detalhe: num(i.aluguelBase)
          ? `Aluguel de referência ${moeda(i.aluguelBase)} por mês que deixa de entrar.`
          : 'Sem aluguel de referência cadastrado.',
        pronto:{tipo:'ir', rotulo:'Abrir o imóvel', rota:'imoveis'},
      });
    }
    return out;
  }
},

/* ------------------------------- PRODUTOS, CHÁCARA E CANAIS ------------ */
{
  id:'prod_estoque_min', nome:'Estoque no mínimo', area:'produtos', rota:'produtos',
  ic:'ti-shopping-bag', desc:'Produto físico ativo com estoque igual ou abaixo do mínimo.',
  achar(D){
    const out = [];
    for(const p of D.produtos){
      if(p.ativo === false) continue;
      if(p.tipo === 'Infoproduto' || p.tipo === 'Serviço' || p.tipo === 'Assinatura') continue;
      const mn = num(p.estoqueMin);
      if(mn <= 0) continue;
      const est = num(p.estoque);
      if(est > mn) continue;
      const repor = Math.max(mn*2 - est, 1);
      out.push({
        chave:`prod_estoque_min:${p.id}`,
        grave: est <= 0 ? 'alto' : 'medio',
        titulo: est <= 0 ? `${p.nome} — ACABOU` : `${p.nome} — estoque no mínimo`,
        detalhe:`${qtd(est,0)} ${p.und||'un'} em estoque, mínimo de ${qtd(mn,0)}.`+
                (num(p.custo)?` Repor ${qtd(repor,0)} custa ${moeda(repor*num(p.custo))}.`:''),
        pronto:{tipo:'texto', rotulo:'Copiar o pedido de reposição',
          conteudo:`Pedido de reposição\n\n`+
            `Produto: ${p.nome}${p.sku?'  (SKU '+p.sku+')':''}\n`+
            `Em estoque: ${qtd(est,0)} ${p.und||'un'}\n`+
            `Mínimo: ${qtd(mn,0)} ${p.und||'un'}\n`+
            `Quantidade sugerida: ${qtd(repor,0)} ${p.und||'un'}\n`+
            (num(p.custo)?`Custo estimado: ${moeda(repor*num(p.custo))}\n`:'')+
            `\nGerado pelo monitoramento do JeV em ${dbr(hoje())}.`},
      });
    }
    return out;
  }
},
{
  id:'venda_parada', nome:'Venda parada sem fechar', area:'produtos', rota:'produtos',
  ic:'ti-shopping-bag', desc:`Venda em Pedido ou Confirmada há mais de ${VIG_PRAZO.venda} dias.`,
  achar(D){
    const out = [];
    for(const v of D.vendas){
      if(!['Pedido','Confirmada'].includes(v.status)) continue;
      if(!v.data) continue;
      const parada = Math.abs(vigFaltam(v.data));
      if(vigFaltam(v.data) > 0 || parada <= VIG_PRAZO.venda) continue;
      out.push({
        chave:`venda_parada:${v.id}`,
        grave: parada > 20 ? 'alto' : 'medio',
        titulo:`${v.produto||'Venda'} — ${v.status} ${vigQuando(v.data)}`,
        detalhe:`${moeda(v.total)}${v.cliente?' · '+v.cliente:''}`+
                `${v.plataforma?' · '+v.plataforma:''}. Ainda não entrou como paga.`,
        pronto:{tipo:'texto', rotulo:'Copiar a mensagem para o cliente',
          conteudo:`Bom dia${v.cliente?', '+vigPrimeiroNome(v.cliente):''}.\n\n`+
            `Passando para saber do seu pedido de ${v.produto||'produto'}`+
            `${num(v.total)?', no valor de '+moeda(v.total):''}.\n\n`+
            `Está tudo certo para seguirmos? Qualquer dúvida é só me chamar.`+ vigAssina()},
      });
    }
    return out;
  }
},
{
  id:'ciclo_colheita', nome:'Ciclo chegando na colheita', area:'produtos', rota:'chacara',
  ic:'ti-plant-2', desc:`Ciclo em andamento com colheita prevista em até ${VIG_PRAZO.colheita} dias, ou já atrasada.`,
  achar(D){
    const out = [];
    for(const c of D.ciclos){
      if(!['Planejado','Em andamento'].includes(c.status)) continue;
      if(!c.dtPrev) continue;
      const falta = vigFaltam(c.dtPrev);
      if(falta === null || falta > VIG_PRAZO.colheita) continue;
      const lote = D.lotes.find(l=>l.id===c.loteId);
      out.push({
        chave:`ciclo_colheita:${c.id}`,
        grave: falta < 0 ? 'alto' : 'medio',
        titulo: falta < 0 ? `${c.nome} — colheita atrasada` : `${c.nome} — colher ${vigQuando(c.dtPrev)}`,
        detalhe:`Previsto ${dbr(c.dtPrev)}${lote?' · '+lote.nome:''}`+
                `${c.cultura?' · '+c.cultura:''}. `+
                `Produção esperada ${qtd(num(c.prodPrev),0)} ${c.und||''}`+
                (num(c.precoPrev)?`, a ${moeda(c.precoPrev)} = ${moeda(num(c.prodPrev)*num(c.precoPrev))}.`:'.'),
        pronto:{tipo:'ir', rotulo:'Abrir o ciclo na chácara', rota:'chacara'},
      });
    }
    return out;
  }
},
{
  id:'canal_parado', nome:'Canal sem publicar', area:'midia', rota:'midia',
  ic:'ti-brand-youtube', desc:`Canal sem nenhum vídeo publicado há mais de ${VIG_PRAZO.canal} dias.`,
  achar(D){
    const out = [];
    for(const c of D.canais){
      const pubs = D.videos.filter(v=>Number(v.canalId)===c.id && v.status==='Publicado' && v.dtPub)
                     .map(v=>String(v.dtPub).slice(0,10)).sort();
      const ult = pubs.length ? pubs[pubs.length-1] : null;
      const sem = ult ? Math.abs(vigFaltam(ult)) : null;
      if(ult && sem <= VIG_PRAZO.canal) continue;
      /* canal recém-cadastrado que nunca publicou não é falha: é começo.
         Só cobra depois que o prazo já teria cabido desde a abertura. */
      if(!ult && c.dtInicio && Math.abs(vigFaltam(c.dtInicio)) <= VIG_PRAZO.canal) continue;
      out.push({
        chave:`canal_parado:${c.id}`,
        grave: (sem === null || sem > VIG_PRAZO.canal*3) ? 'alto' : 'medio',
        titulo:`${c.nome} parado`,
        detalhe: ult ? `Última publicação em ${dbr(ult)}, ${vigQuando(ult)}.`
                     : 'Nenhum vídeo publicado neste canal até agora.',
        pronto:{tipo:'ir', rotulo:'Abrir o canal', rota:'midia'},
      });
    }
    return out;
  }
},
{
  id:'video_atrasado', nome:'Vídeo passou da data prevista', area:'midia', rota:'midia',
  ic:'ti-player-play', desc:'Vídeo com data prevista vencida e que ainda não foi publicado.',
  achar(D){
    const out = [];
    for(const v of D.videos){
      if(v.status === 'Publicado' || v.status === 'Arquivado') continue;
      if(!v.dtPrev || !vigVencido(v.dtPrev)) continue;
      const c = D.canais.find(x=>x.id===Number(v.canalId));
      out.push({
        chave:`video_atrasado:${v.id}`,
        grave: Math.abs(vigFaltam(v.dtPrev)) > 14 ? 'medio' : 'baixo',
        titulo:`${v.titulo} — previsto ${vigQuando(v.dtPrev)}`,
        detalhe:`Parado em "${v.status||'Ideia'}"${c?' · '+c.nome:''}. `+
                `Data prevista era ${dbr(v.dtPrev)}.`,
        pronto:{tipo:'ir', rotulo:'Abrir o vídeo', rota:'midia'},
      });
    }
    return out;
  }
},
];

/* nome amigável de um imóvel ou veículo, a partir do par (tipo, id).
   contratos usa 'tipo', manutencoes usa 'refTipo' — a função recebe o
   valor já resolvido para não repetir essa confusão em cada agente. */
function vigBem(D, tipo, refId){
  const id = Number(refId);
  if(tipo === 'veiculo'){
    const v = D.veiculos.find(x=>x.id===id);
    return v ? `${v.modelo||'Veículo'}${v.placa?' '+v.placa:''}` : 'Veículo';
  }
  const i = D.imoveis.find(x=>x.id===id);
  return i ? (i.nome||'Imóvel') : 'Imóvel';
}

/* =============================================== RODAR OS VIGIAS ====== */
/* Lê o banco UMA vez e passa o mesmo pacote para os vinte. */
async function vigDados(){
  const [obras,etapas,orcamento,financeiro,recorrencias,medicoes,rdoL,compras,
         imoveis,veiculos,contratos,manutencoes,lotes,ciclos,produtos,vendas,
         canais,videos] = await Promise.all([
    dbGetAll('obras'), dbGetAll('etapas'), dbGetAll('orcamento'),
    dbGetAll('financeiro'), dbGetAll('recorrencias'), dbGetAll('medicoes'),
    dbGetAll('rdo'), dbGetAll('compras'),
    dbGetAll('imoveis'), dbGetAll('veiculos'), dbGetAll('contratos'),
    dbGetAll('manutencoes'), dbGetAll('lotes'), dbGetAll('ciclos'),
    dbGetAll('produtos'), dbGetAll('vendas'), dbGetAll('canais'), dbGetAll('videos'),
  ]);
  /* saldo de conta não existe no banco — é sempre calculado */
  let saldos = [];
  try { saldos = await saldoContas(); } catch(e){ saldos = []; }
  return {obras,etapas,orcamento,financeiro,recorrencias,medicoes,rdo:rdoL,compras,
          imoveis,veiculos,contratos,manutencoes,lotes,ciclos,produtos,vendas,
          canais,videos,saldos};
}

async function vigAjustes(){
  const todos = await dbGetAll('vigias');
  return {
    ajustes:   todos.filter(x=>x.tipo==='ajuste'),
    silencios: todos.filter(x=>x.tipo==='silencio' && (!x.ate || x.ate >= hoje())),
  };
}

function vigLigado(ajustes, id){
  const a = ajustes.find(x=>x.agente===id);
  return !a || a.ligado !== false;     /* nasce ligado */
}

/* O coração. Devolve a lista de achados já filtrada por permissão, por
   ajuste e por silêncio, ordenada do mais grave para o menos.

   Um agente que estoura NÃO derruba os outros dezenove: cada um roda
   dentro do seu próprio try. Vigia quebrado vira aviso na tela, não
   apagão no painel. */
async function vigRodar(){
  const {ajustes, silencios} = await vigAjustes();
  const D = await vigDados();
  const cal = new Set(silencios.map(s=>s.chave));
  const ordem = {alto:0, medio:1, baixo:2};
  const out = [];
  const quebrados = [];
  for(const ag of VIGIAS){
    if(!PERMS[CU].includes(ag.rota)) continue;   /* não vê a tela, não vê o alerta */
    if(!vigLigado(ajustes, ag.id)) continue;
    let achados = [];
    try { achados = ag.achar(D) || []; }
    catch(e){ quebrados.push(`${ag.nome}: ${e.message}`); continue; }
    for(const a of achados){
      if(cal.has(a.chave)) continue;
      out.push({...a, agente:ag.id, agenteNome:ag.nome, area:ag.area,
                ic:ag.ic, rota:a.pronto&&a.pronto.rota ? a.pronto.rota : ag.rota});
    }
  }
  out.sort((x,y)=> (ordem[x.grave]-ordem[y.grave]) || x.titulo.localeCompare(y.titulo,'pt-BR'));
  return {achados:out, quebrados, ajustes, silencios};
}

/* contador para o sino do topo — só os urgentes e os de atenção; "de olho"
   não merece bolinha vermelha, senão o sino grita todo dia e vira paisagem */
async function vigContar(){
  try {
    const {achados} = await vigRodar();
    return achados.filter(a=>a.grave!=='baixo').length;
  } catch(e){ return 0; }
}
/* Aceita o número já contado. Quem está no painel acabou de rodar os vinte
   vigias para encher o card do Escritório — mandar rodar de novo só para
   acender o sino seria ler o banco inteiro duas vezes pelo mesmo número. */
async function vigSino(n){
  const el = document.querySelector('[data-vig-badge]');
  if(!el) return;
  if(n === undefined) n = await vigContar();
  el.textContent = n > 99 ? '99+' : String(n);
  el.classList.toggle('hide', n === 0);
}

/* ==================================================== A TELA =========== */
const VIG_AREAS = [
  ['',          'Tudo',                   'ti-list-check'],
  ['obras',     'Obras',                  'ti-crane'],
  ['financeiro','Financeiro',             'ti-wallet'],
  ['locacao',   'Imóveis e veículos',     'ti-home'],
  ['produtos',  'Produtos e chácara',     'ti-shopping-bag'],
  ['midia',     'Canais',                 'ti-brand-youtube'],
];

async function vigiasRender(){
  const root = document.getElementById('vigias-root');
  root.innerHTML = `<div class="card"><div class="bd"><div class="empty">
    <i class="ti ti-refresh"></i><b>Os vigias estão lendo o sistema…</b></div></div></div>`;

  const {achados, quebrados, ajustes} = await vigRodar();
  VIG.achados = achados;

  const vis = achados.filter(a=>
    (!VIG.area  || a.area  === VIG.area) &&
    (!VIG.grave || a.grave === VIG.grave));

  const cont = g => achados.filter(a=>a.grave===g).length;
  const meus    = VIGIAS.filter(a=>PERMS[CU].includes(a.rota));
  const ligados = meus.filter(a=>vigLigado(ajustes,a.id)).length;

  const kpi = (g)=>{
    const s = VIG_GRAVE[g], n = cont(g), on = VIG.grave === g;
    return `<div class="kc" onclick="vigFiltrarGrave('${g}')" style="cursor:pointer;
        ${on?`background:${s.bg};`:''}">
      <div class="lb"><i class="ti ${s.ic}" style="color:${s.cor}"></i>${s.rotulo}</div>
      <div class="vl" style="color:${n?s.cor:'var(--text3)'}">${n}</div>
      <div class="sb">${on?'filtrando por este':'clique para filtrar'}</div>
    </div>`;
  };

  let h = `<div class="ph">
      <div class="ic" style="background:var(--gold-bg);color:var(--gold-dk)"><i class="ti ti-bell-ringing"></i></div>
      <div><h1>Vigias do negócio</h1>
        <p>${ligados} de ${meus.length} vigias de pé — leram o sistema agora e o que acharam está aqui</p></div>
      <div class="sp"></div>
      <button class="btn gh" onclick="vigiasRender()"><i class="ti ti-refresh"></i>Reler</button>
      <button class="btn gh" onclick="vigPainelAjustes()"><i class="ti ti-adjustments"></i>Quais vigias</button>
    </div>`;

  if(quebrados.length){
    h += `<div class="card"><div class="bd" style="border-left:4px solid var(--red)">
      <b style="color:var(--red)">Agente com defeito — o painel abaixo está incompleto por causa disso:</b>
      <div class="tt" style="margin-top:6px;line-height:1.6">${quebrados.map(esc).join('<br>')}</div>
    </div></div>`;
  }

  h += `<div class="kg" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    ${kpi('alto')}${kpi('medio')}${kpi('baixo')}</div>`;

  h += `<div class="chips" style="margin-top:14px">${VIG_AREAS.map(([v,rot,ic])=>{
    const n = v ? achados.filter(a=>a.area===v).length : achados.length;
    return `<div class="chip ${VIG.area===v?'on':''}" onclick="vigFiltrarArea('${v}')">
      <i class="ti ${ic}"></i> ${rot} <b>${n}</b></div>`;
  }).join('')}</div>`;

  if(vis.length){
    h += vis.map(vigCartao).join('');
  } else {
    h += `<div class="card"><div class="bd"><div class="empty">
      <i class="ti ti-circle-check" style="color:var(--green)"></i>
      <b>${achados.length ? 'Nada neste filtro.' : 'Nenhum alerta. Está tudo em dia.'}</b>
      ${achados.length ? 'Tire o filtro acima para ver o resto.'
        : 'Os '+ligados+' vigias leram o sistema inteiro e não acharam nada que precise de você agora.'}
    </div></div></div>`;
  }

  h += `<div class="card"><div class="bd">
      <b>Como estes vigias funcionam, sem letra miúda.</b>
      <div class="tt" style="margin-top:6px;line-height:1.7;font-size:12.5px">
      Eles rodam aqui dentro, quando você abre o JeV — não há servidor nem mensalidade, e nenhuma
      senha sua sai da sua máquina. Em troca, se ninguém abrir o sistema, ninguém é avisado: o
      agente não liga para o seu celular de madrugada.<br>
      Nenhum deles grava nada no banco. Eles leem, concluem e deixam o texto pronto para você
      copiar; gravar continua sendo na tela do módulo, com o seu dedo.</div>
    </div></div>`;

  root.innerHTML = h;
  vigSino();
}

function vigFiltrarArea(v){ VIG.area = (VIG.area===v ? '' : v); vigiasRender(); }
function vigFiltrarGrave(g){ VIG.grave = (VIG.grave===g ? '' : g); vigiasRender(); }

/* a chave vira id de elemento, então tem de sobrar só o que HTML aceita */
function vigId(chave){ return 'vigtx-' + String(chave).replace(/[^a-zA-Z0-9_-]/g,'_'); }

function vigCartao(a){
  const s = VIG_GRAVE[a.grave];
  const p = a.pronto || {};
  let botao = '';
  if(p.tipo === 'texto'){
    botao = `<button class="btn gh sm" onclick="vigCopiar('${esc(a.chave)}')">
      <i class="ti ti-copy"></i>${esc(p.rotulo||'Copiar')}</button>`;
  } else if(p.tipo === 'ir'){
    botao = `<button class="btn gh sm" onclick="go('${esc(p.rota||a.rota)}')">
      <i class="ti ti-arrow-right"></i>${esc(p.rotulo||'Abrir')}</button>`;
  }
  return `<div class="card" style="border-left:4px solid ${s.cor}"><div class="bd">
    <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <i class="ti ${a.ic}" style="font-size:21px;color:${s.cor};margin-top:1px"></i>
      <div style="flex:1;min-width:250px">
        <div style="font-weight:700;font-size:14.5px;line-height:1.35">${esc(a.titulo)}</div>
        <div style="color:var(--text2);font-size:13px;margin-top:4px;line-height:1.55">${esc(a.detalhe)}</div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:7px;flex-wrap:wrap">
          <span class="st ${s.pill}">${s.rotulo}</span>
          <span class="tt">${esc(a.agenteNome)}</span>
        </div>
      </div>
      <div class="brow" style="margin-top:0">
        ${botao}
        <button class="btn gh sm" title="Não me mostre isto por 7 dias"
          onclick="vigSilenciar('${esc(a.chave)}')"><i class="ti ti-x"></i>Silenciar</button>
      </div>
    </div>
    ${p.tipo==='texto' ? `<div id="${vigId(a.chave)}"
        style="display:none;margin-top:12px;background:var(--bg3);border:1px dashed var(--border2);
        border-radius:var(--radius);padding:12px 14px;font-size:12.5px;white-space:pre-wrap;
        line-height:1.6">${esc(p.conteudo||'')}</div>` : ''}
  </div></div>`;
}

async function vigCopiar(chave){
  const a = VIG.achados.find(x=>x.chave===chave);
  if(!a || !a.pronto || !a.pronto.conteudo) return;
  const cx = document.getElementById(vigId(chave));
  if(cx) cx.style.display = 'block';
  try {
    await navigator.clipboard.writeText(a.pronto.conteudo);
    toast('Texto copiado. É só colar no WhatsApp.','ag');
  } catch(e){
    /* área de transferência bloqueada acontece: o texto já está na tela,
       e dizer isso é melhor do que um erro que não ajuda ninguém */
    toast('Não consegui copiar sozinho — o texto está aí embaixo para você selecionar.','aw');
  }
}

async function vigSilenciar(chave){
  await dbAdd('vigias', {tipo:'silencio', chave, ate:addDias(hoje(),7)});
  toast('Silenciado por 7 dias.','ai');
  vigiasRender();
}

async function vigPainelAjustes(){
  const {ajustes, silencios} = await vigAjustes();
  const meus = VIGIAS.filter(a=>PERMS[CU].includes(a.rota));
  const linhas = meus.map(a=>{
    const on = vigLigado(ajustes, a.id);
    return `<div style="display:flex;align-items:flex-start;gap:11px;padding:11px 2px;
        border-bottom:1px solid var(--border)">
      <i class="ti ${a.ic}" style="font-size:19px;color:var(--text2);margin-top:2px"></i>
      <div style="flex:1;min-width:180px">
        <div style="font-weight:650;font-size:13.5px">${esc(a.nome)}</div>
        <div class="tt" style="margin-top:2px;line-height:1.5">${esc(a.desc)}</div>
      </div>
      <button class="btn ${on?'gn':'gh'} sm" onclick="vigLigar('${a.id}',${on?'false':'true'})">
        <i class="ti ${on?'ti-circle-check':'ti-x'}"></i>${on?'De pé':'Desligado'}</button>
    </div>`;
  }).join('');
  modal('Quais vigias estão de pé', 'ti-adjustments', `
    <div style="max-height:56vh;overflow:auto">${linhas}</div>
    ${silencios.length ? `<div style="margin-top:13px;display:flex;align-items:center;
        justify-content:space-between;gap:11px;background:var(--bg3);border-radius:var(--radius);padding:11px 13px">
        <div class="tt">${silencios.length} alerta${silencios.length>1?'s':''} silenciado${silencios.length>1?'s':''} no momento.</div>
        <button class="btn gh sm" onclick="vigDesfazerSilencios()">
          <i class="ti ti-refresh"></i>Ouvir tudo de novo</button></div>` : ''}
    <div class="tt" style="margin-top:13px;line-height:1.6">
      Desligar um vigia não apaga nada: ele só para de te mostrar o que vê.
      Ligue de volta quando quiser e o alerta volta na hora, se o motivo ainda existir.
    </div>`, null, 'sm');
}

async function vigLigar(id, ligado){
  const todos = await dbGetAll('vigias');
  const a = todos.find(x=>x.tipo==='ajuste' && x.agente===id);
  if(a) await dbPut('vigias', {...a, ligado});
  else   await dbAdd('vigias', {tipo:'ajuste', agente:id, ligado});
  vigPainelAjustes();
  vigiasRender();
}

async function vigDesfazerSilencios(){
  const todos = await dbGetAll('vigias');
  for(const s of todos.filter(x=>x.tipo==='silencio')) await dbDel('vigias', s.id);
  toast('Os alertas silenciados voltaram.','ai');
  closeModal('mk-form');
  vigiasRender();
}

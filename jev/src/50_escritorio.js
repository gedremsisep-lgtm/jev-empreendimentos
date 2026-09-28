/* =========================================================================
   ESCRITÓRIO — o card do painel, e quem enche os números dele

   O QUE É O ESCRITÓRIO
   --------------------
   Os sete cards do painel são negócios: entra dinheiro, sai dinheiro, sobra
   ou falta. O Escritório é o oitavo card e não é nada disso. É a sala de quem
   trabalha sozinho: a equipe de agentes de IA que roda na máquina (o
   Controle) e os vinte vigias que leem o sistema. Ele não tem receita nem
   despesa — por isso o rodapé do card, onde os outros mostram o resultado do
   mês, aqui mostra quantas coisas estão esperando por você.

   A LIGAÇÃO ESTÁ EM 04_dados.js
   -----------------------------
   A peça ESCRITORIO mora lá, junto das unidades, e explica ali por que fica
   de fora de UNIDADES. As duas abas dele são as telas que já existem — o
   Controle e os Vigias —, emolduradas pela mesma barra de contexto de Obras
   e Mídia.

   POR QUE OS NÚMEROS CHEGAM DEPOIS
   --------------------------------
   Metade deles vem de uma pasta fora do sistema, pelo Mission Control, com
   prazo de 2,5 segundos para responder. Segurar o painel da casa esperando
   uma pasta que talvez nem esteja ligada seria trocar a tela inicial de
   todo mundo por um relógio girando. Então o card nasce com traço, o painel
   aparece na hora, e os números entram quando chegam.

   E DE QUEBRA, OS DOIS SININHOS
   -----------------------------
   Os contadores da barra de cima só acendiam depois que alguém entrava nas
   telas — quem ficasse no painel não era avisado de nada, que é justamente
   o contrário do que um sininho serve. Como aqui já se lê o estado dos dois,
   os dois sininhos são acesos com esta mesma leitura, sem custo novo.
   ========================================================================= */

/* o card, no mesmo molde dos outros sete (.ucard), para não destoar da
   fileira — o que muda é o miolo, que conta gente em vez de dinheiro */
function escrCard(){
  const u = ESCRITORIO;
  return `<div class="ucard" style="--uc:${u.cor};--ucb:${u.bg}" onclick="go('${u.pg}')">
      <div class="bar"></div>
      <div class="top2"><div class="ico"><i class="ti ${u.ic}"></i></div>
        <div style="flex:1;min-width:0"><h3>${esc(u.curto)}</h3><div class="sub">${esc(u.desc)}</div></div></div>
      <div class="body">
        <div class="kv"><span>Agentes de pé</span><b data-escr="agentes">—</b></div>
        <div class="kv"><span>Tarefas andando</span><b data-escr="tarefas">—</b></div>
        <div class="kv"><span>Rotinas ligadas</span><b data-escr="rotinas">—</b></div>
        <div class="kv"><span>Vigias apontando</span><b data-escr="vigias">—</b></div>
        <div class="foot">
          <div><div class="tt">Esperando você</div>
            <div class="res" data-escr="espera" style="color:var(--text3)">—</div></div>
          <div class="go">Abrir <i class="ti ti-arrow-right"></i></div></div>
      </div></div>`;
}

function escrPor(chave, texto, cor){
  const el = document.querySelector(`[data-escr="${chave}"]`);
  if(!el) return;                 /* o dono saiu do painel enquanto se lia */
  el.textContent = texto;
  el.style.color = cor || '';
}

/* Roda SEM await no fim do painel. Cada metade tem o seu try: a pasta do
   Controle pode não existir e os vigias podem tropeçar num dado torto, e
   nem um nem outro pode deixar o card pela metade sem dizer por quê. */
async function escrPreencher(){
  let espera = 0;

  /* os vigias leem o banco daqui mesmo — sempre respondem */
  try {
    const {achados} = await vigRodar();
    const graves = achados.filter(a=>a.grave!=='baixo').length;
    escrPor('vigias', String(achados.length),
            achados.length ? 'var(--amber)' : 'var(--text3)');
    espera += graves;
    vigSino(graves);
  } catch(e){ escrPor('vigias', '—'); }

  /* o Controle mora fora do sistema e pode simplesmente estar desligado.
     Escrever "desligado" é informação; deixar traço seria mentira por
     omissão — o dono ficaria achando que tem zero agente cadastrado. */
  try {
    const d = await ctlEstado();
    if(!d.disponivel){
      escrPor('agentes', 'desligado', 'var(--text3)');
      escrPor('tarefas', '—');
      escrPor('rotinas', '—');
      ctlBadge(0);
    } else {
      const ag = (d.agents && d.agents.agents) || [];
      const tf = (d.tasks && d.tasks.tasks) || [];
      const jb = (d.cron && d.cron.jobs) || [];
      const comErro = ag.filter(a=>a.status==='error').length;
      escrPor('agentes', ag.filter(a=>['online','busy'].includes(a.status)).length + ' de ' + ag.length,
              comErro ? 'var(--red)' : 'var(--green)');
      escrPor('tarefas', String(tf.filter(t=>t.stage==='em_execucao').length), 'var(--blue)');
      escrPor('rotinas', jb.filter(j=>j.enabled).length + ' de ' + jb.length);
      const pend = ctlPendencias(d);
      espera += pend;
      ctlBadge(pend);
    }
  } catch(e){ escrPor('agentes', 'desligado', 'var(--text3)'); }

  escrPor('espera', String(espera), espera ? 'var(--amber)' : 'var(--green)');
}

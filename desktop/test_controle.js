/* =========================================================================
   test_controle.js — o módulo do aplicativo contra um Mission Control REAL.

   Este teste não usa dublê: ele copia um Mission Control de verdade para uma
   pasta temporária e trabalha em cima dele. É a única forma de provar que o
   `require` do state.js e do runner.js funciona com os arquivos como eles
   são hoje — e não como eu imaginei que fossem.

   Se não houver nenhum Mission Control na máquina, o teste PULA e diz isso.
   Pular dizendo é honesto; passar sem ter testado nada seria mentira.

     node test_controle.js
     MC_DIR=/caminho/para/MissionControl node test_controle.js
   ========================================================================= */
const fs=require('fs'), path=require('path'), os=require('os');
let ok=0, fail=0;
const t=(n,c,e)=>{ if(c){ok++;console.log('  ok   '+n);} else {fail++;console.log('  FALHA '+n+(e?'  → '+e:''));} };

/* onde pode estar um Mission Control para servir de molde */
function acharFonte(){
  const c = [process.env.MC_DIR,
             '/mnt/user-data/uploads/MissionControl',
             'C:\\JeV\\MissionControl',
             path.join(__dirname, '..', '..', 'MissionControl')].filter(Boolean);
  for(const d of c){
    try { if(fs.existsSync(path.join(d,'state.js')) &&
              fs.existsSync(path.join(d,'workspace','agents.json'))) return d; } catch {}
  }
  return null;
}
const FONTE = acharFonte();
if(!FONTE){
  console.log('PULADO — não achei um Mission Control para testar contra.');
  console.log('Aponte um com: MC_DIR=/caminho/para/MissionControl node test_controle.js');
  process.exit(0);
}
console.log('testando contra ' + FONTE);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(),'mc-'));
const MC  = path.join(TMP,'MissionControl');
fs.cpSync(FONTE, MC, {recursive:true});
const app = { getPath: ()=>path.join(TMP,'userData'), getAppPath: ()=>path.join(TMP,'app') };

const ctl = require('./controle.js');

console.log('\n— acha a pasta e liga —');
const r = ctl.ligar(app, {executor:false});   // sem executor: nada de cron rodando no teste
t('achou o Mission Control', r.ok, JSON.stringify(r).slice(0,200));
t('guardou o caminho certo', r.pasta === MC, r.pasta);
t('ficou pronto', ctl.pronto);

console.log('\n— lê o estado de verdade —');
const e = ctl.estado();
t('disponível', e.disponivel, e.motivo);
t('trouxe os agentes', (e.agents.agents||[]).length === 8, String((e.agents.agents||[]).length));
t('trouxe as tarefas',  (e.tasks.tasks||[]).length === 11);
t('trouxe as rotinas',  (e.cron.jobs||[]).length === 11);
t('trouxe memórias e docs', e.memory.length>0 && e.docs.length>0);
t('marcou se a rotina está rodando agora', e.cron.jobs.every(j=>'rodandoAgora' in j));
t('sem erro de arquivo', (e.errors||[]).length===0, JSON.stringify(e.errors));

console.log('\n— escreve só o que pode —');
const alvo = e.tasks.tasks[0].id;
ctl.mudarTarefa(alvo, {stage:'concluida'});
const dep = ctl.estado().tasks.tasks.find(x=>x.id===alvo);
t('mudou a etapa da tarefa', dep.stage==='concluida');
t('e pôs 100% junto, como manda o state.js', dep.progress===100, String(dep.progress));
const jid = e.cron.jobs[0].id;
ctl.mudarRotina(jid, {enabled:false, reason:'teste'});
t('desligou a rotina', ctl.estado().cron.jobs.find(x=>x.id===jid).enabled===false);
t('e gravou o porquê', !!ctl.estado().cron.jobs.find(x=>x.id===jid).pausedReason);

console.log('\n— a porta protegida —');
const ctl2 = require('./controle.js');
const vazio = { getPath: ()=>path.join(TMP,'ud2'), getAppPath: ()=>path.join(TMP,'nada') };
// aponta para uma pasta que nao e' Mission Control
let erro=null;
try { ctl2.definirPasta(vazio, TMP); } catch(x){ erro=x.message; }
t('recusa pasta que não é Mission Control', /não parece um Mission Control/.test(erro||''), erro);

console.log('\n— o arquivo lido é o do disco —');
let f=null, erroLer=null;
try { f = ctl.arquivo('docs/regras-da-casa.md'); } catch(x){ erroLer = x.message; }
t('leu o arquivo do disco', !!f && f.content.length>10, erroLer || (f&&f.content.slice(0,60)));
let fora=null;
try { ctl.arquivo('../../../etc/passwd'); } catch(x){ fora=x.message; }
t('recusa caminho para fora do workspace', !!fora, fora);

fs.rmSync(TMP,{recursive:true,force:true});
console.log(`\n${ok} passaram, ${fail} falharam`);
process.exit(fail?1:0);

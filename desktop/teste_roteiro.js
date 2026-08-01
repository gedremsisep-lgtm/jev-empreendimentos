/* Roteiros usados só pelo test_atualizacao.js. Em uso normal este arquivo
   nem é carregado — o main.js só o exige quando JEV_ROTEIRO está definido. */
const fala = (nome, valor) => console.log('TESTE ' + nome + ' ' + JSON.stringify(valor));

function esperarPagina(wc, expressao, ms) {
  const fim = Date.now() + (ms || 60000);
  return new Promise(resolve => {
    const bater = () => {
      wc.executeJavaScript(expressao).then(v => {
        if (v) return resolve(v);
        if (Date.now() > fim) return resolve(null);
        setTimeout(bater, 400);
      }).catch(() => { if (Date.now() > fim) resolve(null); else setTimeout(bater, 400); });
    };
    bater();
  });
}

const CONTAR = `(async()=>{const o={};for(const s of ['obras','financeiro','pessoas','etapas'])o[s]=(await dbGetAll(s)).length;return o;})()`;

async function rodar(nome, janela, versoes, app) {
  const wc = janela.webContents;
  await esperarPagina(wc, 'typeof db!=="undefined" && db!==null && typeof dbGetAll==="function"', 40000);

  if (nome === 'semear') {
    const r = await wc.executeJavaScript(`(async()=>{
      for(let i=1;i<=3;i++) await dbAdd('obras',{cod:'T-00'+i,nome:'Obra de teste '+i,status:'Em andamento',area:100+i,valorContrato:100000});
      for(let i=1;i<=5;i++) await dbAdd('financeiro',{tipo:i%2?'receita':'despesa',valor:1000*i,data:hoje(),desc:'lançamento '+i});
      for(let i=1;i<=2;i++) await dbAdd('pessoas',{nome:'Pessoa '+i,tipo:'Cliente'});
      const o={};for(const s of ['obras','financeiro','pessoas','etapas'])o[s]=(await dbGetAll(s)).length;return o;})()`);
    fala('gravou', r);
  }

  if (nome === 'baixar') {
    const r = await wc.executeJavaScript(`(async()=>{
      const p = await window.JeVDesktop.vsProcurar();
      if(p.ok && p.temNova){ VS.achada = p.info; await verBaixar(); }
      return p;})()`);
    fala('procurou', r);
    await new Promise(r2 => setTimeout(r2, 2500));
  }

  if (nome === 'esperar') {
    /* dá tempo do autoteste rodar e o motor sair da fase de teste */
    const fim = Date.now() + 70000;
    while (versoes.precisaTestar() && Date.now() < fim) await new Promise(r => setTimeout(r, 500));
    await new Promise(r => setTimeout(r, 1500));
    fala('autoteste', versoes.estado(require('./package.json')));
    const c = await wc.executeJavaScript(CONTAR).catch(() => null);
    fala('contagem', c);
  }

  if (nome === 'contar') {
    fala('contagem', await wc.executeJavaScript(CONTAR).catch(() => null));
  }

  if (nome === 'reverter') {
    await wc.executeJavaScript(`window.JeVDesktop.vsReverter('teste automatico')`).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
  }

  await new Promise(r => setTimeout(r, 400));
  app.exit(0);
}

module.exports = { rodar };

/* =========================================================================
   test_obraimport.js — o importador de obra tem de ADICIONAR, nunca apagar.
   Roda o jev_empreendimentos.html montado, num navegador de verdade, com
   IndexedDB de verdade.
     node test_obraimport.js [caminho_do_arquivo.jevobra]
   ========================================================================= */
const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const ARQ = process.argv[2] || null;
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

  console.log('\n— conferência do arquivo (sem gravar nada) —');

  const r = await page.evaluate(() => {
    const casos = {};
    casos.naoJson   = obraImpConferir('isto não é json');
    casos.outroTipo = obraImpConferir(JSON.stringify({ _tipo: 'JEV', dados: {} }));
    casos.backup    = obraImpConferir(JSON.stringify({ _sistema: 'JEV', dados: { obras: [] } }));
    casos.semNome   = obraImpConferir(JSON.stringify({ _tipo: 'JEV_OBRA', obra: { cod: 'X' } }));
    casos.dataRuim  = obraImpConferir(JSON.stringify({ _tipo: 'JEV_OBRA',
      obra: { nome: 'A', dtInicio: '2027-01-01', dtPrevFim: '2026-01-01' } }));
    casos.bom       = obraImpConferir(JSON.stringify({ _tipo: 'JEV_OBRA',
      obra: { nome: 'Obra teste', cod: 'T-1', dtInicio: '2026-01-01', dtPrevFim: '2026-06-30' },
      etapas: [{ ordem: 1, nome: 'Etapa', peso: 100 }],
      orcamento: [{ cod: 'I-1', desc: 'Item', und: 'm', qtd: 2, vunit: 3 }],
      projetos: [{ disciplina: 'Drenagem Pluvial', nome: 'Prancha 14' }] }));
    casos.semListas = obraImpConferir(JSON.stringify({ _tipo: 'JEV_OBRA', obra: { nome: 'Só a obra' } }));
    casos.total     = obraImpTotal([{ qtd: 2, vunit: 3.5 }, { qtd: 10, vunit: 1 }]);
    return casos;
  });

  t('recusa arquivo que não é JSON',            r.naoJson.ok === false);
  t('recusa JSON de outro tipo',                r.outroTipo.ok === false);
  t('recusa um BACKUP do sistema',              r.backup.ok === false, JSON.stringify(r.backup));
  t('recusa obra sem nome',                     r.semNome.ok === false);
  t('recusa término anterior ao início',        r.dataRuim.ok === false);
  t('aceita arquivo bom',                       r.bom.ok === true, JSON.stringify(r.bom).slice(0, 120));
  t('arquivo bom traz 1 etapa',                 r.bom.ok && r.bom.dados.etapas.length === 1);
  t('arquivo bom traz 1 item de orçamento',     r.bom.ok && r.bom.dados.orcamento.length === 1);
  t('arquivo bom traz 1 projeto',               r.bom.ok && r.bom.dados.projetos.length === 1);
  t('obra sem listas vira listas vazias',       r.semListas.ok === true &&
                                                r.semListas.dados.etapas.length === 0 &&
                                                r.semListas.dados.orcamento.length === 0 &&
                                                r.semListas.dados.projetos.length === 0);
  t('soma do orçamento do arquivo',             Math.abs(r.total - 17) < 1e-9, 'deu ' + r.total);

  console.log('\n— a gravação ADICIONA e não destrói —');

  const g = await page.evaluate(async () => {
    /* uma obra que já existe, e um lançamento em outra tabela, para provar
       que o importador não encosta em nada disso */
    const antigaId = await dbAdd('obras', { cod: 'ANTIGA', nome: 'Obra que já estava aqui',
      area: 100, dtInicio: '2026-01-01', dtPrevFim: '2026-12-31', status: 'Em andamento' });
    await dbAdd('etapas', { obraId: antigaId, ordem: 1, nome: 'Etapa da antiga', peso: 100 });
    await dbAdd('imoveis', { nome: 'Imóvel que não é da obra' });

    OBRA_IMP = {
      obra: { cod: 'NOVA', nome: 'Obra importada', area: 50,
              dtInicio: '2027-01-01', dtPrevFim: '2027-12-31', status: 'Planejamento' },
      etapas: [{ ordem: 1, nome: 'E1', peso: 60 }, { ordem: 2, nome: 'E2', peso: 40 }],
      orcamento: [{ cod: 'A', desc: 'a', und: 'm', qtd: 1, vunit: 10 },
                  { cod: 'B', desc: 'b', und: 'm', qtd: 2, vunit: 20 },
                  { cod: 'C', desc: 'c', und: 'm', qtd: 3, vunit: 30 }],
      projetos: [{ disciplina: 'Pavimentação', nome: 'Prancha 12', autor: 'Schettini' },
                 { nome: 'Sem disciplina nenhuma' }],
    };
    await obraImpGravar();

    const obras   = await dbGetAll('obras');
    const nova    = obras.find(o => o.cod === 'NOVA');
    const antiga  = obras.find(o => o.cod === 'ANTIGA');
    const etNova  = nova ? await dbByObra('etapas', nova.id) : [];
    const etAnt   = await dbByObra('etapas', antigaId);
    const orcNova = nova ? await dbByObra('orcamento', nova.id) : [];
    return {
      nObras: obras.length,
      temAntiga: !!antiga,
      temNova: !!nova,
      idsDiferentes: !!(nova && antiga) && nova.id !== antiga.id,
      etNova: etNova.length, etAntiga: etAnt.length,
      orcNova: orcNova.length,
      pjNova: nova ? (await dbByObra('projetos', nova.id)).length : 0,
      pjSemArquivo: nova ? (await dbByObra('projetos', nova.id)).every(p => p.arquivo === null) : false,
      pjTemObraId: nova ? (await dbByObra('projetos', nova.id)).every(p => Number(p.obraId) === Number(nova.id)) : false,
      pjDisciplinaPadrao: nova ? (await dbByObra('projetos', nova.id))
        .find(p => p.nome === 'Sem disciplina nenhuma')?.disciplina === 'Outro' : false,
      orcTemObraId: orcNova.every(i => Number(i.obraId) === Number(nova.id)),
      etTemObraId: etNova.every(e => Number(e.obraId) === Number(nova.id)),
      imoveis: (await dbGetAll('imoveis')).length,
      selecionada: Number(OBRA) === Number(nova && nova.id),
      estadoLimpo: OBRA_IMP === null,
      origemPreenchida: orcNova.every(i => !!i.origem),
      statusEtapa: etNova.every(e => e.status === 'Não iniciada' && e.avanco === 0),
    };
  });

  t('as duas obras existem depois de importar', g.nObras === 2, 'obras: ' + g.nObras);
  t('a obra que já estava continua lá',         g.temAntiga);
  t('a obra nova entrou',                       g.temNova);
  t('a nova ganhou um id próprio',              g.idsDiferentes);
  t('as 2 etapas da nova foram gravadas',       g.etNova === 2, 'deu ' + g.etNova);
  t('a etapa da obra antiga não foi mexida',    g.etAntiga === 1, 'deu ' + g.etAntiga);
  t('os 3 itens de orçamento foram gravados',   g.orcNova === 3, 'deu ' + g.orcNova);
  t('todo item ficou com o obraId certo',       g.orcTemObraId);
  t('toda etapa ficou com o obraId certo',      g.etTemObraId);
  t('os 2 projetos foram registrados',          g.pjNova === 2, 'deu ' + g.pjNova);
  t('projeto sem anexo entra como referência',  g.pjSemArquivo);
  t('todo projeto ficou com o obraId certo',    g.pjTemObraId);
  t('projeto sem disciplina cai em "Outro"',    g.pjDisciplinaPadrao);
  t('o imóvel de outra tabela sobreviveu',      g.imoveis === 1, 'deu ' + g.imoveis);
  t('a obra importada fica selecionada',        g.selecionada);
  t('o estado de importação é limpo no fim',    g.estadoLimpo);
  t('todo item leva a origem registrada',       g.origemPreenchida);
  t('etapas entram zeradas e não iniciadas',    g.statusEtapa);

  console.log('\n— ida e volta: exportar e importar de novo —');

  const v = await page.evaluate(async () => {
    const original = (await dbGetAll('obras')).find(o => o.cod === 'NOVA');
    const etapas = (await dbByObra('etapas', original.id)).map(e => {
      const c = { ...e }; delete c.id; delete c.obraId; delete c._gid; delete c._ts; delete c._user; return c; });
    const orcamento = (await dbByObra('orcamento', original.id)).map(i => {
      const c = { ...i }; delete c.id; delete c.obraId; delete c._gid; delete c._ts; delete c._user; return c; });
    const projetos = (await dbByObra('projetos', original.id)).map(p => {
      const c = { ...p }; delete c.id; delete c.obraId; delete c._gid; delete c._ts; delete c._user;
      delete c.arquivo; delete c.tam; delete c.nomeArq; delete c.ext; return c; });
    const limpa = { ...original }; delete limpa.id; delete limpa._gid; delete limpa._ts; delete limpa._user;
    limpa.cod = 'NOVA-2';
    const txt = JSON.stringify({ _tipo: 'JEV_OBRA', _versao: 1, obra: limpa, etapas, orcamento, projetos });

    const conf = obraImpConferir(txt);
    if (!conf.ok) return { erro: conf.motivo };
    OBRA_IMP = conf.dados;
    await obraImpGravar();
    const copia = (await dbGetAll('obras')).find(o => o.cod === 'NOVA-2');
    return {
      passou: true,
      nObras: (await dbGetAll('obras')).length,
      etapas: (await dbByObra('etapas', copia.id)).length,
      orcamento: (await dbByObra('orcamento', copia.id)).length,
      projetos: (await dbByObra('projetos', copia.id)).length,
      nomeIgual: copia.nome === original.nome,
      areaIgual: Number(copia.area) === Number(original.area),
    };
  });

  t('o que sai do sistema volta para o sistema', v.passou === true, v.erro);
  t('a cópia não apagou as anteriores',          v.nObras === 3, 'obras: ' + v.nObras);
  t('a cópia trouxe as 2 etapas',                v.etapas === 2);
  t('a cópia trouxe os 3 itens',                 v.orcamento === 3);
  t('a cópia trouxe os 2 projetos',              v.projetos === 2);
  t('a cópia manteve nome e área',               v.nomeIgual && v.areaIgual);

  if (ARQ && fs.existsSync(ARQ)) {
    console.log('\n— o arquivo de verdade: ' + path.basename(ARQ) + ' —');
    const txt = fs.readFileSync(ARQ, 'utf8');
    const d = JSON.parse(txt);
    const a = await page.evaluate(async (texto) => {
      const conf = obraImpConferir(texto);
      if (!conf.ok) return { erro: conf.motivo };
      OBRA_IMP = conf.dados;
      await obraImpGravar();
      const o = (await dbGetAll('obras')).find(x => x.cod === conf.dados.obra.cod);
      const orc = await dbByObra('orcamento', o.id);
      const et  = await dbByObra('etapas', o.id);
      const pj  = await dbByObra('projetos', o.id);
      return { etapas: et.length, itens: orc.length, projetos: pj.length,
               discOk: pj.every(p => DISCIPLINAS.includes(p.disciplina)),
               comAlerta: et.filter(e => /PONTOS CRÍTICOS/.test(e.obs || '')).length,
               soma: orc.reduce((s, i) => s + Math.round(num(i.qtd) * num(i.vunit) * 100) / 100, 0),
               contrato: num(o.valorContrato),
               pesos: Math.round(et.reduce((s, e) => s + num(e.peso), 0) * 100) / 100 };
    }, txt);
    t('o arquivo de verdade importa',        !a.erro, a.erro);
    t('entraram todas as etapas do arquivo', a.etapas === d.etapas.length, `${a.etapas} de ${d.etapas.length}`);
    t('entraram todos os itens do arquivo',  a.itens === d.orcamento.length, `${a.itens} de ${d.orcamento.length}`);
    t('a soma do orçamento bate com o contrato',
      Math.abs(a.soma - a.contrato) < 0.05, `orçamento ${a.soma} × contrato ${a.contrato}`);
    t('os pesos das etapas fecham 100%',     Math.abs(a.pesos - 100) < 0.01, 'deu ' + a.pesos);
    t('entraram todos os projetos do arquivo', a.projetos === d.projetos.length, `${a.projetos} de ${d.projetos.length}`);
    t('toda disciplina existe na lista do sistema', a.discOk);
    t('os pontos críticos chegaram nas etapas', a.comAlerta === 7, 'etapas com alerta: ' + a.comAlerta);
  }

  await browser.close();
  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})();

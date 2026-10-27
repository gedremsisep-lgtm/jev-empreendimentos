/* =========================================================================
   test_imp3d_calc.js — valida o motor de cálculo da Impressão 3D isolado,
   sem navegador: carrega só a função pura (imp3dCalcular) e confere contra
   o caso de regressão da especificação do módulo (seção 8.4) e contra as
   guardas de divisão por zero / markup+taxas ≥ 100%.

     node test_imp3d_calc.js
   ========================================================================= */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'src/51_imp3d.js'), 'utf8');
// isola só a função de cálculo, sem precisar simular DOM/IndexedDB do resto do módulo
const m = src.match(/function imp3dCalcular\(p\)\{[\s\S]*?\n\}/);
if(!m){ console.error('FALHA: não encontrou imp3dCalcular em 51_imp3d.js'); process.exit(1); }
const imp3dCalcular = new Function('return ' + m[0])();

const m2 = src.match(/function imp3dDeprecInfo\(imp\)\{[\s\S]*?\n\}/);
const imp3dDeprecInfo = new Function('num', 'return ' + m2[0])(v=>{ const n=parseFloat(v); return isNaN(n)?0:n; });

let ok = 0, fail = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { fail++; console.log('  FALHA ' + nome + (extra ? '  → ' + extra : '')); }
};
const perto = (a,b,eps=0.0005) => Math.abs(a-b) < eps;

console.log('--- Caso de regressão (seção 8.4 da especificação) ---');
const deprec = imp3dDeprecInfo({ valorCompra:2500, valorResidual:0, vidaUtilHoras:2000 });
t('depreciação/h = 1,25', perto(deprec.custoHora, 1.25), deprec.custoHora);

const r = imp3dCalcular({
  pesoConsumidoG: 50, custoPorGramaMaterial: 120/1000,
  tempoHoras: 3, potenciaW: 250, tarifaKwh: 0.95,
  custoDeprecHora: deprec.custoHora,
  manutModo: 'hora', custoManutHora: 0,
  tempoPreparoH: 0.5, valorHoraTrabalho: 25,
  reservaFalhasPct: 8,
  modoPreco: 'markup', markupPct: 100,
  quantidade: 1
});
t('material = R$6,00', perto(r.custoMaterial, 6.00), r.custoMaterial);
t('energia = R$0,7125', perto(r.custoEnergia, 0.7125), r.custoEnergia);
t('depreciação = R$3,75', perto(r.custoDeprec, 3.75), r.custoDeprec);
t('mão de obra = R$12,50', perto(r.custoMaoObra, 12.50), r.custoMaoObra);
t('custo-base = R$22,9625', perto(r.custoBase, 22.9625), r.custoBase);
t('reserva de falhas = R$1,837', perto(r.reservaFalhas, 1.837), r.reservaFalhas);
t('custo ajustado = R$24,7995', perto(r.custoAjustado, 24.7995), r.custoAjustado);
t('preço com markup 100% = R$49,599', perto(r.precoVendaUnitario, 49.599), r.precoVendaUnitario);
t('preço exibido arredondado = R$49,60', Math.round(r.precoVendaUnitario*100)/100 === 49.60);

console.log('--- Guardas ---');
const semVida = imp3dDeprecInfo({ valorCompra:2500, valorResidual:0, vidaUtilHoras:0 });
t('vida útil zero não divide por zero (valida:false)', semVida.valida === false && semVida.custoHora === null);

const taxasDemais = imp3dCalcular({ pesoConsumidoG:10, custoPorGramaMaterial:0.1, tempoHoras:1,
  modoPreco:'markup', markupPct:10, taxasPagamentoPct:60, comissaoMarketplacePct:45 });
t('markup + taxas de venda ≥ 100% bloqueia o preço (não calcula número inválido)',
  taxasDemais.precoVendaUnitario === null && taxasDemais.avisos.length > 0, JSON.stringify(taxasDemais.avisos));

const margemAlta = imp3dCalcular({ pesoConsumidoG:10, custoPorGramaMaterial:0.1, tempoHoras:1,
  modoPreco:'margem', margemDesejadaPct:70, taxasPagamentoPct:35 });
t('margem + taxas ≥ 100% bloqueia o preço', margemAlta.precoVendaUnitario === null);

console.log('--- Markup com taxas sobre a venda (regrossing) ---');
// custo ajustado 100, markup 50% -> preço antes das taxas = 150; com 10% de taxas sobre a
// venda, o preço final tem de "regrossar" para que, depois de pagar a taxa, sobrem R$150
const comTaxa = imp3dCalcular({ pesoConsumidoG:1000, custoPorGramaMaterial:0.1, tempoHoras:0,
  modoPreco:'markup', markupPct:50, taxasPagamentoPct:10, quantidade:1 });
// custo-base = 100 (1000g * 0.1), sem reserva de falhas => ajustado=100; antes de taxas=150
t('preço antes das taxas = R$150', perto(comTaxa.precoAntesTaxas, 150));
t('preço final regrossado = R$166,67 (150 / 0,9)', perto(comTaxa.precoVendaUnitario, 150/0.9, 0.01), comTaxa.precoVendaUnitario);
const custoLiquidoAposTaxa = comTaxa.precoVendaUnitario * (1-0.10);
t('depois de pagar a taxa de 10%, sobra o preço com markup pretendido (R$150)', perto(custoLiquidoAposTaxa, 150, 0.01), custoLiquidoAposTaxa);

console.log('--- Manutenção: hora OU fixa, nunca as duas ---');
const manutHora = imp3dCalcular({ tempoHoras:4, manutModo:'hora', custoManutHora:2, manutFixoPeca:999 });
t('modo hora usa só custoManutHora × tempo (8), ignora o fixo', perto(manutHora.custoManut, 8));
const manutFixo = imp3dCalcular({ tempoHoras:4, manutModo:'fixo', custoManutHora:2, custoManutFixoPeca:15 });
t('modo fixo usa só o valor fixo (15), ignora o por-hora', perto(manutFixo.custoManut, 15));

console.log('\n' + ok + ' ok, ' + fail + ' falha(s)');
process.exit(fail ? 1 : 0);

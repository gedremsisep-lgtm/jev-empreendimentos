/* Garimpo de produtos: condições, pontuação, links e ligação com o gerador */
const { chromium } = require('/root/jev/node_modules/playwright');
(async () => {
  const erros = [];
  const ok = (t,v)=>console.log((v===true?'  OK  ':' FALHA')+'  '+t+(v===true?'':'  → '+JSON.stringify(v)));
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write']});
  const page = await ctx.newPage();
  page.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  page.on('console',m=>{ if(m.type()==='error'&&!/favicon|api.github|ERR_/.test(m.text())) erros.push('CONSOLE: '+m.text()); });
  await page.goto('file:///root/jev/jev_empreendimentos.html');
  await page.waitForFunction(()=>typeof db!=='undefined'&&db!==null,{timeout:20000});
  await page.waitForTimeout(1800);

  /* ---------------------------------------------------------- o catálogo */
  const versaoEsperada = Number((require('fs').readFileSync('/root/jev/src/03_core.js','utf8')
    .match(/DB_VERSION\s*=\s*(\d+)/)||[])[1]);
  ok('o banco está na versão que o código pede ('+versaoEsperada+')',
    await page.evaluate(v=>db.version===v, versaoEsperada));
  ok('a tabela do garimpo existe', await page.evaluate(()=>db.objectStoreNames.contains('garimpos')));
  ok('as cinco lojas estão no catálogo', await page.evaluate(()=>
    ['ml','shopee','amazon','magalu','tiktok'].every(id=>!!garLoja(id))));
  ok('os cinco nichos estão no catálogo', await page.evaluate(()=>GAR_NICHOS.length===5));
  ok('o pool tem produto suficiente para garimpar', await page.evaluate(()=>GAR_POOL.length>=25));

  ok('todo produto tem os campos que a tela usa', await page.evaluate(()=>{
    const faltando = GAR_POOL.filter(p=>!p.n||!p.t||!p.g||!p.preco||!p.vend||!p.nota||!p.video||!p.ang||!p.gancho||!p.porque);
    return faltando.length ? faltando.map(p=>p.n||'(sem nome)') : true;
  }));
  ok('todo ângulo sugerido existe no gerador de roteiro', await page.evaluate(()=>{
    const ruins = [...new Set(GAR_POOL.map(p=>p.ang))].filter(a=>!ANGULOS[a]);
    return ruins.length ? ruins : true;
  }));
  ok('todo nicho do pool existe na lista de nichos', await page.evaluate(()=>{
    const ids = GAR_NICHOS.map(n=>n.id);
    const ruins = [...new Set(GAR_POOL.map(p=>p.g))].filter(g=>!ids.includes(g));
    return ruins.length ? ruins : true;
  }));
  ok('não há produto repetido no pool', await page.evaluate(()=>{
    const t = GAR_POOL.map(p=>p.t);
    return new Set(t).size === t.length ? true : t.length - new Set(t).size;
  }));
  ok('todo termo de busca é minúsculo e sem acento', await page.evaluate(()=>{
    const ruins = GAR_POOL.filter(p=>p.t !== p.t.toLowerCase() || /[áàâãéêíóôõúç]/.test(p.t));
    return ruins.length ? ruins.map(p=>p.t) : true;
  }));

  /* -------------------------------------------- achados reais do TikTok Shop */
  const reais = await page.evaluate(()=>GAR_POOL.filter(p=>p.tt));
  ok('há 7 produtos conferidos na vitrine do TikTok Shop', reais.length===7 ? true : reais.length);
  ok('todo achado real tem preço, preço cheio, vendas e nota',
    reais.every(p=>p.preco>0 && p.de>p.preco && p.vend>0 && p.nota>0) ? true : reais.map(p=>p.n));
  ok('nenhum achado real passa de R$ 100', reais.every(p=>p.preco<=100) ? true : reais.map(p=>p.preco));
  ok('todo id de produto do TikTok é numérico',
    reais.every(p=>/^\d{15,25}$/.test(p.tt)) ? true : reais.map(p=>p.tt));
  ok('não há id de produto repetido',
    new Set(reais.map(p=>p.tt)).size===reais.length);
  ok('o link do TikTok vai direto no produto, não na busca', await page.evaluate(()=>{
    const p = GAR_POOL.find(x=>x.tt);
    const u = garLink('tiktok', p.t, 100, p.tt);
    return u === 'https://shop.tiktok.com/br/pdp/' + p.tt ? true : u;
  }));
  ok('sem id, o TikTok volta a ser busca', await page.evaluate(()=>
    /tiktok\.com\/search\?q=/.test(garLink('tiktok','fita led',100)) ));

  const soTT = await page.evaluate(()=>garEscolher(
    {lojas:['tiktok'], nichos:['org','coz','dec','ban','lim'], teto:100, quantos:7, comMin:0, soTT:true}));
  ok('marcando só TikTok Shop, vêm os 7 achados reais', soTT.length===7 ? true : soTT.length);
  ok('e todos com link direto do produto',
    soTT.every(a=>a.links[0].url.indexOf('/pdp/')>0) ? true : soTT.map(a=>a.links[0].url));
  ok('a comissão usada é a do TikTok Shop (10–30%)',
    soTT.every(a=>a.comissao===20) ? true : soTT.map(a=>a.comissao));

  /* --------------------------------------------------------------- links */
  const links = await page.evaluate(()=>['ml','shopee','amazon','magalu','tiktok']
    .map(id=>({loja:id, url: garLink(id,'fita led 5m com fonte',100)})));
  ok('o link do Mercado Livre leva o teto de preço',
    /lista\.mercadolivre\.com\.br\/fita-led-5m-com-fonte_PriceRange_0-100$/.test(links[0].url) ? true : links[0].url);
  ok('o link da Shopee ordena por vendas e filtra preço',
    /maxPrice=100/.test(links[1].url) && /sortBy=sales/.test(links[1].url) ? true : links[1].url);
  ok('o link da Amazon usa centavos no filtro e mais vendidos',
    /p_36%3A-10000/.test(links[2].url) && /exact-aware-popularity-rank/.test(links[2].url) ? true : links[2].url);
  ok('o link do Magalu filtra preço e ordena',
    /price---0\.00%3A100\.00/.test(links[3].url) && /sortOrder=6/.test(links[3].url) ? true : links[3].url);
  ok('o link do TikTok busca o termo', /tiktok\.com\/search\?q=/.test(links[4].url) ? true : links[4].url);
  ok('acento no termo vira endereço limpo no Mercado Livre', await page.evaluate(()=>{
    const u = garLink('ml','luminária projetor galáxia 360°',100);
    return /\/luminaria-projetor-galaxia-360_PriceRange_0-100$/.test(u) ? true : u;
  }));
  ok('o teto muda o link', await page.evaluate(()=>{
    const u = garLink('amazon','tapete',50);
    return /p_36%3A-5000/.test(u) ? true : u;
  }));
  ok('cada nicho aponta para um ranking real do Mercado Livre', await page.evaluate(()=>
    GAR_NICHOS.every(n=>/^https:\/\/www\.mercadolivre\.com\.br\/mais-vendidos\/MLB\d+$/.test(garRanking(n.id)))));

  const sete0 = await page.evaluate(()=>garEscolher(
    {lojas:['ml'], nichos:['org','coz','dec','ban','lim'], teto:100, quantos:7, comMin:0, soTT:false}));
  ok('sem o filtro, o pool inteiro entra na disputa', sete0.length===7);

  /* ---------------------------------------------------------- a escolha */
  const sete = await page.evaluate(()=>garEscolher(
    {lojas:['ml','shopee','amazon','magalu','tiktok'], nichos:['org','coz','dec','ban','lim'], teto:100, quantos:7, comMin:0}));
  ok('traz exatamente 7 produtos', sete.length===7 ? true : sete.length);
  ok('nenhum passa do teto de R$ 100', sete.every(p=>p.preco<=100) ? true : sete.map(p=>p.preco));
  ok('não repete produto', new Set(sete.map(p=>p.t)).size===7);
  ok('espalha entre os nichos (pelo menos 3 nichos diferentes)',
    new Set(sete.map(p=>p.g)).size>=3 ? true : sete.map(p=>p.g));
  ok('nenhum nicho leva mais que 3 dos 7', (()=>{
    const c={}; sete.forEach(p=>c[p.g]=(c[p.g]||0)+1);
    return Object.values(c).every(v=>v<=3) ? true : c;
  })());
  ok('cada achado traz um link por loja marcada', sete.every(p=>p.links.length===5));
  ok('vem ordenado do mais forte para o mais fraco',
    sete.every((p,i)=>i===0 || sete[i-1].pontos >= p.pontos - 9*3) ? true : sete.map(p=>p.pontos));
  ok('calcula o ganho por venda', sete.every(p=>p.ganho>0 && p.ganho < p.preco) ? true : sete.map(p=>p.ganho));

  const teto40 = await page.evaluate(()=>garEscolher(
    {lojas:['ml'], nichos:['org','coz','dec','ban','lim'], teto:40, quantos:7, comMin:0}));
  ok('baixar o teto para R$ 40 muda a lista', teto40.every(p=>p.preco<=40) ? true : teto40.map(p=>p.preco));
  ok('com uma loja só, o link vem só dela', teto40.every(p=>p.links.length===1));

  const soCozinha = await page.evaluate(()=>garEscolher(
    {lojas:['ml'], nichos:['coz'], teto:100, quantos:5, comMin:0}));
  ok('marcar só cozinha traz só cozinha', soCozinha.every(p=>p.g==='coz') ? true : soCozinha.map(p=>p.g));

  const comAlta = await page.evaluate(()=>garEscolher(
    {lojas:['magalu'], nichos:['org'], teto:100, quantos:5, comMin:25}));
  ok('comissão mínima alta demais devolve lista vazia em vez de mentir',
    comAlta.length===0 ? true : comAlta.length);

  const tudo = await page.evaluate(()=>garEscolher(
    {lojas:['ml'], nichos:['org'], teto:100, quantos:99, comMin:0}));
  ok('pedir mais do que existe não quebra nem repete',
    tudo.length>0 && new Set(tudo.map(p=>p.t)).size===tudo.length ? true : tudo.length);

  /* ------------------------------------------------------------- a tela */
  await page.evaluate(()=>go('midia')); await page.waitForTimeout(700);
  await page.evaluate(()=>midStab('gar')); await page.waitForTimeout(800);
  const tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('a aba Garimpo abre', tela.includes('Condições do garimpo'));
  ok('mostra as cinco lojas', ['Mercado Livre','Shopee','Amazon','Magazine Luiza','TikTok Shop']
    .every(n=>tela.includes(n)));
  ok('mostra onde gerar o link que paga', tela.includes('Onde gerar o link que paga'));
  ok('oferece o filtro dos achados do TikTok Shop', tela.includes('vitrine do TikTok Shop'));


  await page.evaluate(()=>garGarimpar()); await page.waitForTimeout(900);
  const achou = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('depois de garimpar, os 7 aparecem na tela', achou.includes('7 produtos escolhidos'));

  /* o botão do filtro tem de trazer os 7 reais, sem o usuário mexer em mais nada */
  await page.evaluate(()=>garSoTT(true)); await page.waitForTimeout(700);
  await page.evaluate(()=>garGarimpar()); await page.waitForTimeout(900);
  const soTela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('ligar o filtro do TikTok traz os 7 reais de uma vez', soTela.includes('7 produtos escolhidos'));
  ok('e todos os cartões viram achado de vitrine',
    (soTela.match(/ti-brand-tiktok"><\/i> na vitrine do TikTok Shop/g)||[]).length===7
      ? true : (soTela.match(/ti-brand-tiktok"><\/i> na vitrine do TikTok Shop/g)||[]).length);
  ok('o filtro deixa só o TikTok Shop marcado', await page.evaluate(()=>GAR.lojas.length===1 && GAR.lojas[0]==='tiktok'));
  await page.evaluate(()=>{ garSoTT(false); GAR.lojas=['ml','shopee','amazon','magalu','tiktok']; midiaRender(); });
  await page.waitForTimeout(600);
  await page.evaluate(()=>garGarimpar()); await page.waitForTimeout(900);
  ok('cada card traz o gancho do vídeo', achou.includes('Gancho:'));
  ok('cada card traz o ângulo sugerido', achou.includes('Ângulo sugerido:'));
  ok('o aviso sobre o link de afiliado aparece',
    achou.includes('Nenhum deles é o link de afiliado') && achou.includes('é pessoal'));
  ok('o cartão marca os achados reais do TikTok Shop', achou.includes('na vitrine do TikTok Shop'));
  ok('o botão do TikTok avisa que abre o produto', achou.includes('TikTok Shop — o produto'));
  ok('gravou o garimpo no histórico', await page.evaluate(async ()=>(await dbGetAll('garimpos')).length>=1));

  /* desmarcar loja não pode zerar tudo */
  await page.evaluate(()=>{ ['ml','shopee','amazon','magalu','tiktok'].forEach(id=>garTogglar('lojas',id)); });
  await page.waitForTimeout(600);
  ok('nunca fica sem nenhuma loja marcada', await page.evaluate(()=>GAR.lojas.length>=1));
  await page.evaluate(()=>{ GAR.lojas=['ml','shopee','amazon','magalu','tiktok']; midiaRender(); });
  await page.waitForTimeout(500);

  /* --------------------------------------------------- cadastro e roteiro */
  await page.evaluate(()=>garGarimpar()); await page.waitForTimeout(800);
  await page.evaluate(()=>garCadastrar()); await page.waitForTimeout(1000);
  const progs = await page.evaluate(async ()=>await dbGetAll('programas'));

  /* ANTES este teste exigia "exatamente 7 fichas", e isso era certo no mundo
     antigo: só o botão Cadastrar criava ficha, então sobrava o último
     garimpo. Hoje o garimpo manda os achados para a pauta sozinho, e a ficha
     de afiliado nasce junto — que é o que o dono pediu. Como este teste
     garimpa três vezes com filtros diferentes, ele acumula os produtos das
     três buscas, e "7" virou um número do passado.

     O que continua valendo, e é o que importa de verdade, é que NENHUM
     produto apareça duas vezes. Essa é a propriedade que protege contra o
     defeito real; o número absoluto só protegia contra o calendário. */
  const nomes = progs.map(p=>String(p.produto||'').toLowerCase());
  const repetidos = nomes.filter((n,i)=>nomes.indexOf(n)!==i);
  ok('cadastrou os produtos garimpados como afiliados', progs.length>=7 ? true : progs.length);
  ok('e nenhum produto foi cadastrado duas vezes',
    repetidos.length===0 ? true : repetidos.slice(0,3));
  ok('trouxe preço e comissão para o cadastro',
    progs.every(p=>p.preco>0 && p.comissao>0) ? true : progs.map(p=>[p.preco,p.comissao]));
  ok('trouxe o motivo do produto para o campo de benefício',
    progs.every(p=>String(p.beneficio||'').length>20));
  ok('deixou o link de afiliado em branco, para você colar o seu',
    progs.every(p=>!p.url));

  await page.evaluate(()=>midStab('gar')); await page.waitForTimeout(700);
  await page.evaluate(()=>garGarimpar()); await page.waitForTimeout(700);
  await page.evaluate(()=>garCadastrar()); await page.waitForTimeout(1000);
  const depois = await page.evaluate(async ()=>(await dbGetAll('programas')).map(p=>String(p.produto||'').toLowerCase()));
  ok('cadastrar de novo não duplica',
    depois.length===progs.length && depois.filter((n,i)=>depois.indexOf(n)!==i).length===0
      ? true : {antes:progs.length, agora:depois.length});

  await page.evaluate(()=>midStab('gar')); await page.waitForTimeout(600);
  await page.evaluate(()=>garGarimpar()); await page.waitForTimeout(700);
  await page.evaluate(()=>garParaRoteiro()); await page.waitForTimeout(1400);
  ok('o botão de roteiro leva para a aba Gerar vídeo', await page.evaluate(()=>MID_TAB==='gerar'));
  ok('os produtos garimpados já vêm marcados no gerador',
    await page.evaluate(()=>GER && GER.produtos.length>0 && GER.produtos.length<=5));
  ok('o ângulo escolhido é um dos que o gerador conhece',
    await page.evaluate(()=>GER && !!ANGULOS[GER.angulo]));

  const pacote = await page.evaluate(async ()=>{ await gerMontar(); return GER.pacote; });
  ok('o pacote de vídeo é montado em cima do que foi garimpado',
    pacote && pacote.cenas && pacote.cenas.length>0 ? true : pacote);
  ok('o roteiro cita o produto garimpado', await page.evaluate(()=>{
    const t = JSON.stringify(GER.pacote).toLowerCase();
    return GAR.achados.some(a=>t.includes(a.n.toLowerCase().slice(0,12)));
  }));

  /* ------------------------------------------------- exportar e as telas */
  ok('o garimpo exporta sem quebrar', await page.evaluate(()=>{
    try{ const j = JSON.stringify({produtos:GAR.achados}); return JSON.parse(j).produtos.length>0; }
    catch(e){ return String(e); }
  }));

  const telas = ['hub','fin','obras','imoveis','veiculos','chacara','produtos','midia','pessoas','rel','cfg'];
  for(const t of telas){
    await page.evaluate(n=>go(n), t);
    await page.waitForTimeout(260);
  }
  ok('as telas principais continuam abrindo depois do garimpo', erros.length===0 ? true : erros.slice(0,3));

  console.log('');
  if(erros.length){ console.log('ERROS:'); erros.forEach(e=>console.log('  '+e)); }
  else console.log('Nenhum erro de JavaScript.');
  await b.close();
})();

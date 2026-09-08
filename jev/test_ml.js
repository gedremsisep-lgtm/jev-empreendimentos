/* =========================================================================
   O GARIMPO DO MERCADO LIVRE, DENTRO DO SISTEMA

   A ponte com o site já é provada em desktop/test_mercadolivre.js. Aqui é a
   outra metade: o que o sistema FAZ com o que chega de lá.

   O que este arquivo cobra:
     1. o produto do Mercado Livre vira produto da casa — e daí a pauta, o
        prompt com pessoa, o vídeo e o grupo de ofertas funcionam sem saber
        de onde ele veio;
     2. a ficha de afiliado nasce JÁ COM O LINK, que é a razão de existir
        desta fonte;
     3. o gancho é escrito com o número real, e não inventa desconto que
        não existe;
     4. a tela nunca pede senha, e diz com todas as letras que não guarda.
   ========================================================================= */
const { chromium } = require('playwright');

(async () => {
  let falhas = 0;
  const ok = (t,v)=>{ if(v!==true) falhas++;
    console.log((v===true?'  OK  ':' FALHA')+'  '+t+(v===true?'':'  → '+String(JSON.stringify(v)).slice(0,300))); };
  const erros = [];
  const b = await chromium.launch({
    executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await (await b.newContext({viewport:{width:1440,height:1100}})).newPage();
  page.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  page.on('console',m=>{ if(m.type()==='error'&&!/favicon|api.github|ERR_|net::/.test(m.text())) erros.push('CONSOLE: '+m.text()); });
  await page.goto('file://' + __dirname + '/jev_empreendimentos.html');
  await page.waitForFunction(()=>typeof db!=='undefined'&&db!==null,{timeout:20000});
  await page.waitForTimeout(1600);

  await page.evaluate(async ()=>{
    for(const p of await dbGetAll('programas')) await dbDel('programas', p.id);
    for(const v of await dbGetAll('videos'))    await dbDel('videos', v.id);
  });

  console.log('\n1) de produto do Mercado Livre para produto da casa');

  ok('o termo de busca sai sem acento e sem pontuação', await page.evaluate(()=>
    mlTermo('Luminária Projetor Galáxia 360° — Kit 2!') === 'luminaria projetor galaxia 360 kit 2'
      ? true : mlTermo('Luminária Projetor Galáxia 360° — Kit 2!')));

  ok('o nicho é adivinhado pelo nome, e cai num que existe', await page.evaluate(()=>{
    const ids = GAR_NICHOS.map(n=>n.id);
    const casos = {
      'Kit 2 Refletor Super Led 400w': 'dec',
      'Fritadeira Elétrica Air Fryer 12L': 'coz',
      'Kit 2 Travesseiros Antialérgico': 'ban',
      'Lavadora Lava Jato Portátil': 'lim',
      'Compressor Portátil Car Air Pump': 'org'
    };
    const ruins = Object.keys(casos).filter(k => mlNichoDe({n:k}) !== casos[k]);
    const fora = Object.keys(casos).filter(k => ids.indexOf(mlNichoDe({n:k})) < 0);
    return (!ruins.length && !fora.length) ? true : {ruins, fora};
  }));

  ok('o produto convertido tem tudo que a pauta precisa', await page.evaluate(()=>{
    const p = mlComoProduto({n:'Kit 2 Refletor Super Led 400w', preco:43.77, de:99.98,
      vend:50000, nota:4.7, comissao:62, extras:true, ganho:27.14,
      url:'https://www.mercadolivre.com.br/x/p/MLB57490176', mlb:'MLB57490176'});
    const faltando = ['n','t','g','preco','vend','nota','gancho','porque','ang','video']
      .filter(k => p[k] === undefined || p[k] === '' || p[k] === null);
    return faltando.length ? faltando : true;
  }));

  ok('e guarda o endereço do anúncio, que é de onde sai o link e as mídias',
    await page.evaluate(()=>{
      const p = mlComoProduto({n:'X', preco:10, url:'https://www.mercadolivre.com.br/x/p/MLB1'});
      return p.links.length===1 && p.links[0].loja==='ml' ? true : p.links;
    }));

  console.log('\n2) o gancho é escrito com número real, não com invenção');

  ok('com desconto de verdade, o gancho é o desconto', await page.evaluate(()=>
    /56% de desconto/.test(mlGancho({de:99.98, preco:43.77})) ? true :
    mlGancho({de:99.98, preco:43.77})));
  ok('desconto pequeno demais não vira gancho', await page.evaluate(()=>
    !/desconto/.test(mlGancho({de:100, preco:95, vend:20000})) ? true :
    mlGancho({de:100, preco:95, vend:20000})));
  ok('sem preço cheio, ele NÃO inventa desconto', await page.evaluate(()=>
    !/desconto|De R\$/.test(mlGancho({preco:43.77, vend:50000})) ? true :
    mlGancho({preco:43.77, vend:50000})));
  ok('aí usa a prova social, que também é real', await page.evaluate(()=>
    /já compraram/.test(mlGancho({preco:43.77, vend:50000})) ? true :
    mlGancho({preco:43.77, vend:50000})));
  ok('e o "porque" mostra a comissão, que é o motivo de escolher este produto',
    await page.evaluate(()=>{
      const p = mlComoProduto({n:'X', preco:43.77, comissao:62, extras:true, ganho:27.14});
      return /62%/.test(p.porque) && /ganhos extras/.test(p.porque) && /27,14/.test(p.porque)
        ? true : p.porque;
    }));

  console.log('\n3) sem o aplicativo, a tela é honesta em vez de quebrar');

  ok('diz que precisa do aplicativo do Windows', await page.evaluate(async ()=>{
    const h = await mlSecaoHTML();
    return /aplicativo do Windows/.test(h) ? true : 'não avisou';
  }));
  ok('e manda usar a colagem em lote enquanto isso', await page.evaluate(async ()=>{
    const h = await mlSecaoHTML();
    return /colagem em lote/.test(h) ? true : 'não ofereceu saída';
  }));

  console.log('\n4) com o aplicativo, mas ainda sem login');

  ok('oferece abrir a janela do próprio Mercado Livre', await page.evaluate(async ()=>{
    window.JeVDesktop = { mlGarimpar:async()=>({}), mlEntrar:async()=>({ok:true}),
      mlEstado:async()=>({conectado:false, precisaEntrar:true,
        motivo:'você ainda não entrou na sua conta de afiliado do Mercado Livre'}) };
    ML.estado = null;
    const h = await mlSecaoHTML();
    return /Abrir o Mercado Livre e entrar/.test(h) ? true : 'não ofereceu';
  }));
  ok('e promete, na tela, que não vê nem guarda a senha', await page.evaluate(async ()=>{
    const h = await mlSecaoHTML();
    return /não vejo nem guardo a sua senha/i.test(h) ? true : 'não prometeu';
  }));
  ok('a tela não tem campo de senha nenhum', await page.evaluate(async ()=>{
    const h = await mlSecaoHTML();
    return !/type="password"|name="password"|senha.*input/i.test(h) ? true : 'tem campo de senha';
  }));

  console.log('\n5) garimpar: a ficha nasce COM o link');

  const r = await page.evaluate(async ()=>{
    window.JeVDesktop = {
      mlEntrar: async()=>({ok:true}),
      mlEstado: async()=>({conectado:true, tag:'jl20260908183348982'}),
      mlGarimpar: async()=>({ ok:true, tag:'jl20260908183348982', comLink:3, achados:[
        {n:'Kit 2 Refletor Super Led 400w', mlb:'MLB57490176', preco:43.77, de:99.98,
         vend:50000, nota:4.7, comissao:62, extras:true, ganho:27.14, selo:'MAIS VENDIDO',
         url:'https://www.mercadolivre.com.br/a/p/MLB57490176',
         link:'https://meli.la/AAA1', codigoBusca:'CX0V3Z-J3FE'},
        {n:'Compressor Portátil Car Air Pump', mlb:'MLB99', preco:61.71, de:157.98,
         vend:10000, nota:4.7, comissao:62, extras:true, ganho:38.26,
         url:'https://www.mercadolivre.com.br/b/p/MLB99', link:'https://meli.la/BBB2', codigoBusca:''},
        {n:'Bermuda Shorts Legging', mlb:'MLB77', preco:94.91, vend:1000, nota:4.9,
         comissao:16, extras:false, ganho:15.19,
         url:'https://www.mercadolivre.com.br/c/p/MLB77', link:'', codigoBusca:''}
      ]})
    };
    ML.estado = null; await mlVerEstado();
    await mlGarimpar();
    const fichas = await dbGetAll('programas');
    const pauta = (await dbGetAll('videos')).filter(v=>v.origem==='garimpo');
    return {
      fichas: fichas.length,
      comLink: fichas.filter(f=>f.url).length,
      naPauta: pauta.length,
      refletor: fichas.find(f=>/Refletor/.test(f.produto)) || null,
      semLink: fichas.find(f=>/Bermuda/.test(f.produto)) || null,
      recado: ML.recado
    };
  });

  ok('as três viraram ficha de afiliado', r.fichas===3 ? true : r);
  ok('e DUAS já nasceram com o link colado', r.comLink===2 ? true : r);
  ok('o link certo foi para o produto certo',
    r.refletor && r.refletor.url==='https://meli.la/AAA1' ? true : r.refletor && r.refletor.url);
  ok('a plataforma fica marcada como Mercado Livre',
    r.refletor && r.refletor.plataforma==='Mercado Livre' ? true : r.refletor && r.refletor.plataforma);
  ok('a comissão real é guardada na ficha',
    r.refletor && r.refletor.comissao===62 ? true : r.refletor && r.refletor.comissao);
  ok('o código de busca é guardado — serve onde link é barrado',
    r.refletor && r.refletor.codigoBusca==='CX0V3Z-J3FE' ? true : r.refletor && r.refletor.codigoBusca);
  ok('o que veio sem link fica sem link, e não inventa um',
    r.semLink && !r.semLink.url ? true : r.semLink && r.semLink.url);
  ok('os três foram para a pauta, para virar vídeo', r.naPauta===3 ? true : r);
  ok('e o recado conta o que aconteceu, com número',
    /2 produto\(s\) com o seu link/.test(r.recado) ? true : r.recado);

  console.log('\n6) e daí para frente o resto do sistema já funciona sozinho');

  ok('o produto do ML entra na fila de ofertas do WhatsApp', await page.evaluate(async ()=>{
    const c = await ofCandidatos();
    return c.livres.length===2 ? true : {livres:c.livres.length, sem:c.semLink.length};
  }));
  ok('e a oferta sai com o link do Mercado Livre dentro', await page.evaluate(async ()=>{
    const o = await ofProxima();
    return o && /meli\.la/.test(o.texto) ? true : (o && o.texto || '').slice(0,120);
  }));
  ok('com o ganho por venda que o ML informou, não um chute', await page.evaluate(async ()=>{
    const f = (await dbGetAll('programas')).find(x=>/Compressor/.test(x.produto));
    return f && f.comissao===62 && f.preco===61.71 ? true : f;
  }));
  ok('e o prompt de vídeo com pessoa é montado em cima dele', await page.evaluate(async ()=>{
    const item = (await dbGetAll('videos')).find(v=>/Refletor/.test((v.produto||{}).n||''));
    if (!item) return 'não achei na pauta';
    const pac = pautaPacote(item);
    return pac && pac.cenas && pac.cenas.length >= 3 ? true : 'não montou o pacote';
  }));

  console.log('\n7) quando o Mercado Livre muda, a tela não mente');

  ok('recusa é mostrada, não escondida', await page.evaluate(async ()=>{
    window.JeVDesktop.mlGarimpar = async()=>({ ok:false, mudouDeForma:true,
      motivo:'A página de afiliados do Mercado Livre mudou de forma e eu não reconheci a lista de produtos. Nada foi inventado. Use a colagem em lote na Carteira de links enquanto eu não me acerto com o novo formato.' });
    const antes = (await dbGetAll('programas')).length;
    await mlGarimpar();
    const depois = (await dbGetAll('programas')).length;
    return depois===antes && /mudou de forma/.test(ML.recado) ? true :
      {antes, depois, recado: ML.recado};
  }));
  ok('e nenhuma ficha é criada nem estragada nesse caso', await page.evaluate(async ()=>{
    const f = (await dbGetAll('programas')).find(x=>/Refletor/.test(x.produto));
    return f && f.url==='https://meli.la/AAA1' ? true : 'estragou a ficha';
  }));

  console.log('\n8) a aba Afiliados continua inteira');
  await page.evaluate(()=>{ go('midia'); midStab('afil'); }); await page.waitForTimeout(1300);
  const tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('o Mercado Livre aparece', /Mercado Livre — garimpo/.test(tela) ? true : 'sumiu');
  ok('a carteira de links continua', /Carteira de links/.test(tela) ? true : 'sumiu');
  ok('o grupo de ofertas continua', /Grupo de ofertas/.test(tela) ? true : 'sumiu');
  ok('o canal continua', /Canal de promoções/.test(tela) ? true : 'sumiu');
  ok('a tabela de afiliados continua', /Meus produtos de afiliado/.test(tela) ? true : 'sumiu');
  ok('nenhum erro de JavaScript no caminho todo', erros.length===0 ? true : erros);

  console.log('');
  console.log(falhas ? falhas+' FALHA(S)'
    : 'Tudo certo — produto do ML vira ficha com link, pauta e oferta, sem senha nenhuma.');
  await b.close();
  process.exit(falhas?1:0);
})().catch(e=>{ console.error('EXPLODIU:', e); process.exit(1); });

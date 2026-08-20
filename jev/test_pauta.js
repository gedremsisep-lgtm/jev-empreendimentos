/* =========================================================================
   Vídeos e pauta: o produto garimpado chega aqui com o prompt pronto,
   o botão de gerar o vídeo, e — só depois que o vídeo existe — o botão
   de publicar com todas as plataformas.
   ========================================================================= */
const { chromium } = require('/root/jev/node_modules/playwright');
const { spawnSync } = require('child_process');

const VIDEO = '/tmp/jev-pauta-vertical.webm';
spawnSync('ffmpeg', ['-loglevel','error','-y','-f','lavfi',
  '-i','testsrc=size=270x480:rate=15:duration=2',
  '-c:v','libvpx-vp9','-b:v','200k','-pix_fmt','yuv420p', VIDEO]);

(async () => {
  const erros = [];
  let falhas = 0;
  const ok = (t,v)=>{ if(v!==true) falhas++;
    console.log((v===true?'  OK  ':' FALHA')+'  '+t+(v===true?'':'  → '+JSON.stringify(v).slice(0,300))); };

  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
                                   args:['--no-sandbox','--allow-file-access-from-files']});
  const ctx = await b.newContext({viewport:{width:1440,height:1200},permissions:['clipboard-read','clipboard-write']});
  const page = await ctx.newPage();
  page.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  page.on('console',m=>{ if(m.type()==='error'&&!/favicon|api.github|ERR_|net::/.test(m.text())) erros.push('CONSOLE: '+m.text()); });
  await page.goto('file:///root/jev/jev_empreendimentos.html');
  await page.waitForFunction(()=>typeof db!=='undefined'&&db!==null,{timeout:20000});
  await page.waitForTimeout(1800);

  /* limpa o terreno */
  await page.evaluate(async ()=>{
    for(const v of await dbGetAll('videos')) await dbDel('videos', v.id);
    for(const c of await dbGetAll('canais')) await dbDel('canais', c.id);
    go('midia');
  });

  /* ============================================ 1) sem garimpo, a aba explica */
  console.log('\n1) a aba antes de garimpar');
  await page.evaluate(()=>midStab('videos')); await page.waitForTimeout(900);
  let tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('a aba diz que ainda não tem nada garimpado', /Nada garimpado ainda/.test(tela) ? true : 'sem o aviso');
  ok('e oferece ir para o Garimpo', /Ir para o Garimpo/.test(tela) ? true : 'sem o atalho');
  ok('mesmo sem canal cadastrado, a aba abre',
    !/Cadastre um canal primeiro/.test(tela) ? true : 'travou por falta de canal');

  /* ================================================= 2) garimpar enche a pauta */
  console.log('\n2) garimpar manda os produtos para a pauta');
  await page.evaluate(()=>{ midStab('gar'); garSoTT(true); });
  await page.waitForTimeout(700);
  await page.evaluate(()=>garGarimpar());
  await page.waitForTimeout(1200);

  const naPauta = await page.evaluate(async ()=>{
    const v = (await dbGetAll('videos')).filter(x=>x.origem==='garimpo');
    return { n:v.length, primeiro:v[0] && v[0].titulo, temProduto:!!(v[0]&&v[0].produto),
             status:v[0]&&v[0].status, achados:(GAR.achados||[]).length };
  });
  ok('cada produto garimpado virou uma linha de pauta',
    naPauta.n === naPauta.achados && naPauta.n >= 5 ? true : naPauta);
  ok('a linha guarda o produto inteiro, não só o nome', naPauta.temProduto===true ? true : naPauta);
  ok('e começa como Ideia', naPauta.status==='Ideia' ? true : naPauta.status);

  /* garimpar de novo não duplica */
  await page.evaluate(()=>garGarimpar());
  await page.waitForTimeout(1200);
  const denovo = await page.evaluate(async ()=>(await dbGetAll('videos')).filter(x=>x.origem==='garimpo').length);
  ok('garimpar de novo não duplica a pauta', denovo === naPauta.n ? true : {antes:naPauta.n, depois:denovo});

  /* ==================================================== 3) o prompt automático */
  console.log('\n3) o prompt automático de cada item');
  await page.evaluate(()=>midStab('videos')); await page.waitForTimeout(1000);
  tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('os produtos aparecem na aba Vídeos e pauta',
    /Produtos garimpados/.test(tela) ? true : 'não apareceram');
  ok('cada um traz o botão de ver o prompt',
    (tela.match(/Ver o prompt automático/g)||[]).length === naPauta.n ? true :
      (tela.match(/Ver o prompt automático/g)||[]).length);
  ok('e o botão de gerar o vídeo do produto',
    (tela.match(/onclick="pautaGerar\(/g)||[]).length === naPauta.n ? true :
      (tela.match(/onclick="pautaGerar\(/g)||[]).length);
  ok('antes de existir vídeo, NÃO aparece o botão de publicar',
    !/Publicar o vídeo/.test(tela) ? true : 'apareceu cedo demais');

  const idPrimeiro = await page.evaluate(async ()=>
    (await dbGetAll('videos')).filter(x=>x.origem==='garimpo').sort((a,b)=>b.id-a.id)[0].id);

  const prompt = await page.evaluate(async id=>{
    const item = await dbGet('videos', id);
    const pac = pautaPacote(item);
    return { texto: pautaPromptTexto(pac), cenas: pac.cenas.length,
             temLegenda: !!pac.legenda, hashtags: pac.hashtags.length,
             produto: pac.produto };
  }, idPrimeiro);
  ok('o prompt cita o produto pelo nome', prompt.texto.includes(prompt.produto) ? true : prompt.texto.slice(0,120));
  ok('e tem uma cena por bloco, com o inglês que as IAs entendem',
    prompt.cenas >= 3 && /CENA 1/.test(prompt.texto) ? true : prompt);
  ok('traz o negative prompt junto', /NEGATIVE PROMPT/.test(prompt.texto) ? true : 'faltou');
  ok('e a narração em português', /Narração:/.test(prompt.texto) ? true : 'faltou a narração');
  ok('a legenda e as hashtags vêm prontas',
    prompt.temLegenda && prompt.hashtags > 0 ? true : prompt);

  await page.evaluate(id=>pautaAbrir(id), idPrimeiro);
  await page.waitForTimeout(800);
  tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('abrir o prompt mostra o texto na tela', /NEGATIVE PROMPT/.test(tela) ? true : 'não mostrou');
  ok('e o botão vira "fechar"', /Fechar o prompt/.test(tela) ? true : 'não virou');

  /* ================================================ 4) pelo navegador, é honesto */
  console.log('\n4) pelo navegador');
  await page.evaluate(id=>pautaGerar(id), idPrimeiro);
  await page.waitForTimeout(1200);
  const semApp = await page.evaluate(async id=>{
    const item = await dbGet('videos', id);
    return { status:item.status, temRoteiro:!!item.roteiroId, aba:MID_TAB,
             producao:(item.producao||[]).length };
  }, idPrimeiro);
  ok('o roteiro é montado e guardado mesmo sem o aplicativo',
    semApp.temRoteiro===true && semApp.status==='Roteiro' ? true : semApp);
  ok('e o sistema leva você para a aba de baixar para a fábrica',
    semApp.aba==='gerar' ? true : semApp.aba);
  ok('sem inventar que montou vídeo', semApp.producao===0 ? true : semApp);

  /* =============================================== 5) dentro do aplicativo */
  console.log('\n5) dentro do aplicativo, o vídeo é montado');
  await page.evaluate(v=>{
    window.__criar = []; window.__midia = []; window.__ouvinte = null;
    window.JeVDesktop = {
      ehAplicativo:true,
      aoEstudio(cb){ window.__ouvinte = cb; },
      estEstado: async () => ({pronto:true, python:'/py', ffmpeg:'/ff', fabrica:true, comVoz:true}),
      estMidiaProduto: async url => { window.__midia.push(url);
        return {ok:true, fotos:['https://loja/a.jpg','https://loja/b.jpg'], videos:['https://loja/v.mp4'], motivo:''}; },
      estCriar: async d => {
        window.__criar.push(d);
        for(const p of [20,60,90]){ window.__ouvinte && window.__ouvinte({tipo:'passo', pct:p, texto:'montando'});
          await new Promise(r=>setTimeout(r,20)); }
        return {ok:true, pasta:'/dados/saida', trabalho:'/dados/trab', avisos:[],
          arquivos:[{caminho:v, nome:'p - vertical.webm', formato:'9:16', tamanho:120000},
                    {caminho:v, nome:'p - horizontal.mp4', formato:'16:9', tamanho:110000},
                    {caminho:v, nome:'p - quadrado.mp4',  formato:'1:1',  tamanho:100000}]};
      },
      estParar: async () => true,
      estEscolher: async qual => { window.__escolheu = qual; return (window.__vaiEscolher || []); },
      estMidiaBaixar: async dados => {
        window.__baixou = dados;
        for (const p of [10, 60, 100]){
          window.__ouvinte && window.__ouvinte({tipo:'passo', pct:p, texto:'baixando ' + p});
          await new Promise(r => setTimeout(r, 20));
        }
        if (window.__semRede)
          return { ok:false, arquivos:[], avisos:[], inalcancavel:true, podeTentarNaTela:false,
                   motivo:'Este computador não conseguiu nem alcançar shop.tiktok.com ' +
                          '(ECONNRESET — socket hang up).' };
        if (window.__lojaBloqueia)
          return { ok:false, arquivos:[], avisos:[], barrado:true, podeTentarNaTela:true,
                   motivo:'A loja pediu verificação de segurança.' };
        return { ok:true, pasta:'/dados/produtos/p1', avisos:[],
          arquivos:[{caminho:'/dados/produtos/p1/a01.mp4', nome:'a01.mp4', tamanho:900000, tipo:'video'},
                    {caminho:'/dados/produtos/p1/b02.jpg', nome:'b02.jpg', tamanho:50000, tipo:'foto'},
                    {caminho:'/dados/produtos/p1/b03.jpg', nome:'b03.jpg', tamanho:51000, tipo:'foto'}] };
      },
      estMidiaLimpar: async chave => { window.__limpou = chave; return true; },
      __semRede: false,
      estAbrirPasta:  async c => { window.__abriu = c; return true; },
      pubPublicar: async d => { window.__pedido = d; return {ok:true, anexou:!!d.video, escreveu:true, avisos:[]}; }
    };
    EST.ferramentas = null;
  }, VIDEO);

  await page.evaluate(()=>midStab('videos')); await page.waitForTimeout(900);
  await page.evaluate(id=>pautaGerar(id), idPrimeiro);
  await page.waitForTimeout(2000);

  const pedido = await page.evaluate(()=>window.__criar[0]);
  ok('o roteiro do produto foi para a fábrica',
    pedido && pedido.roteiro && pedido.roteiro.cenas.length>0 ? true : pedido);
  ok('com a narração escrita para ESTE produto, não a genérica',
    pedido.roteiro.cenas.some(c=>String(c.fala||'').length>10) ? true : pedido.roteiro.cenas.map(c=>c.fala));
  ok('e buscou sozinho a mídia do anúncio do produto',
    (await page.evaluate(()=>window.__midia.length)) === 1 ? true : 'não buscou');
  ok('mandando as fotos e o vídeo do vendedor junto',
    pedido.fotos.length===2 && pedido.videos.length===1 ? true : {f:pedido.fotos, v:pedido.videos});

  const depois = await page.evaluate(async id=>{
    const item = await dbGet('videos', id);
    return { status:item.status, producao:(item.producao||[]).length,
             producoes:(await dbGetAll('producoes')).length };
  }, idPrimeiro);
  ok('a linha da pauta passa para Editado', depois.status==='Editado' ? true : depois.status);
  ok('com as três versões guardadas', depois.producao===3 ? true : depois.producao);
  ok('e o vídeo entra na lista de produções', depois.producoes>=1 ? true : depois.producoes);

  /* ================ 5a) baixar as mídias do anúncio, antes de gerar
     O botão de baixar vem ANTES do de gerar porque é nessa ordem que
     funciona: primeiro o material chega ao computador, depois o vídeo é
     montado com ele. E o que foi baixado tem que virar a mesma coisa que o
     material escolhido na mão — senão a montagem teria dois caminhos.     */
  console.log('\n5a) baixar as mídias do produto antes de gerar');
  await page.evaluate(() => { EST.ferramentas = null; midStab('videos'); });
  await page.waitForTimeout(900);
  tela = await page.evaluate(() => document.getElementById('mid-body').innerHTML);
  ok('o botão de baixar as mídias aparece no cartão',
    /Baixar as mídias do produto/.test(tela) ? true : 'não apareceu');
  /* a ordem tem que valer DENTRO do mesmo cartão, não na página inteira */
  const ordem = await page.evaluate(id => {
    const h = document.getElementById('mid-body').innerHTML;
    return { baixar: h.indexOf('pautaBaixarMidias(' + id + ')'),
             gerar: h.indexOf('pautaGerar(' + id + ')') };
  }, idPrimeiro);
  ok('e vem antes do botão de gerar o vídeo, no mesmo cartão',
    ordem.baixar >= 0 && ordem.baixar < ordem.gerar ? true : ordem);

  await page.evaluate(() => { window.__lojaBloqueia = false; });
  await page.evaluate(id => pautaBaixarMidias(id), idPrimeiro);
  await page.waitForTimeout(1500);
  const pedidoBaixar = await page.evaluate(() => window.__baixou);
  ok('o pedido leva o endereço do anúncio de onde o produto foi garimpado',
    pedidoBaixar && (pedidoBaixar.urls || []).length > 0 ? true : pedidoBaixar);

  const baixado = await page.evaluate(async id => {
    const it = await dbGet('videos', id);
    return { midia: it.midia || [], pasta: it.midiaPasta || '' };
  }, idPrimeiro);
  ok('os arquivos baixados ficam guardados no item',
    baixado.midia.length === 3 ? true : baixado);
  ok('e o sistema lembra em que pasta eles estão',
    baixado.pasta === '/dados/produtos/p1' ? true : baixado.pasta);

  await page.evaluate(() => midiaRender()); await page.waitForTimeout(800);
  tela = await page.evaluate(() => document.getElementById('mid-body').innerHTML);
  ok('o cartão mostra o que foi baixado',
    /1 vídeo e 2 fotos/.test(tela) ? true : 'não mostrou a conta');
  ok('com o botão para ver os arquivos no computador',
    /Ver os arquivos/.test(tela) ? true : 'não deixou ver');

  /* e agora o que importa: gerar usa o que foi baixado */
  await page.evaluate(() => { window.__criar = []; window.__midia = []; });
  await page.evaluate(id => pautaGerar(id), idPrimeiro);
  await page.waitForTimeout(2000);
  const usouBaixado = await page.evaluate(() => window.__criar[0]);
  ok('gerar o vídeo usa os arquivos que foram baixados',
    usouBaixado && usouBaixado.arquivos.length === 3 &&
    usouBaixado.arquivos[0] === '/dados/produtos/p1/a01.mp4' ? true : usouBaixado && usouBaixado.arquivos);
  ok('e o vídeo do vendedor vai na frente da lista',
    /\.mp4$/i.test(usouBaixado.arquivos[0]) ? true : usouBaixado.arquivos[0]);

  /* soltar apaga também o que foi baixado, para não encher o disco */
  await page.evaluate(id => pautaLimparMateriais(id), idPrimeiro);
  await page.waitForTimeout(700);
  const limpou = await page.evaluate(async id => ({
    midia: (await dbGet('videos', id)).midia,
    pediu: window.__limpou
  }), idPrimeiro);
  ok('soltar os materiais apaga também os arquivos baixados',
    limpou.midia.length === 0 && !!limpou.pediu ? true : limpou);

  /* a loja que bloqueia não pode virar um beco sem saída */
  await page.evaluate(() => { window.__lojaBloqueia = true; });
  await page.evaluate(id => pautaBaixarMidias(id), idPrimeiro);
  await page.waitForTimeout(1500);
  await page.evaluate(() => midiaRender()); await page.waitForTimeout(700);
  tela = await page.evaluate(() => document.getElementById('mid-body').innerHTML);
  ok('quando a loja bloqueia, o sistema diz o motivo',
    /verificação de segurança/.test(tela) ? true : 'não disse o motivo');
  const semNada = await page.evaluate(async id => (await dbGet('videos', id)).midia, idPrimeiro);
  ok('e não inventa arquivo nenhum', semNada.length === 0 ? true : semNada);
  ok('oferecendo abrir a loja na tela, que é a saída quando a loja barra',
    /Abrir a loja na minha tela/.test(tela) ? true : 'não ofereceu');
  await page.evaluate(() => { window.__lojaBloqueia = false; });

  /* o caso que aconteceu de verdade: o TikTok inteiro bloqueado na internet
     do dono. O cartão não pode culpar a loja nem mandar abrir na tela — tem
     que dizer que o problema é a rede deste computador. */
  await page.evaluate(() => { window.__semRede = true; });
  await page.evaluate(id => pautaBaixarMidias(id), idPrimeiro);
  await page.waitForTimeout(1500);
  await page.evaluate(() => midiaRender()); await page.waitForTimeout(700);
  tela = await page.evaluate(() => document.getElementById('mid-body').innerHTML);
  ok('loja inalcançável: o cartão diz que não é defeito do aplicativo',
    /não é defeito do aplicativo/i.test(tela) ? true : 'não disse');
  ok('e ensina o teste do 4G, que separa rede de conta',
    /4G/.test(tela) ? true : 'não ensinou o teste');
  ok('citando antivírus e roteador, que são as causas de verdade',
    /antivírus/i.test(tela) && /roteador/i.test(tela) ? true : 'não citou as causas');
  ok('sem oferecer abrir a loja na tela, que também não abriria',
    !/Abrir a loja na minha tela/.test(tela) ? true : 'ofereceu à toa');
  await page.evaluate(() => { window.__semRede = false; });

  /* ============================ 5b) o material do painel do vendedor manda
     O TikTok Shop não deixa ninguém ler a página de fora. Então o caminho que
     precisa funcionar sempre é o dono baixar o vídeo do anúncio no painel e
     apontar o arquivo — e esse material tem que passar na frente do que o
     sistema adivinha da página, senão o vídeo sai sem pessoa nenhuma.        */
  console.log('\n5b) o material que você escolhe passa na frente');
  await page.evaluate(()=>midiaRender()); await page.waitForTimeout(700);
  tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('o botão de materiais do produto aparece no cartão',
    /Materiais do produto/.test(tela) ? true : 'não apareceu');
  const conta = t => (t.match(/Antes de gerar, traga as mídias/gi) || []).length;
  const avisosAntes = conta(tela);
  ok('e o cartão sem material avisa por que o vídeo sairia com texto',
    avisosAntes > 0 ? true : 'não avisou');

  await page.evaluate(()=>{ window.__vaiEscolher = [
    {caminho:'C:\\Users\\ju\\Downloads\\anuncio.mp4', nome:'anuncio.mp4', tamanho:900000},
    {caminho:'C:\\Users\\ju\\Downloads\\capa.jpg',    nome:'capa.jpg',    tamanho:40000}]; });
  await page.evaluate(id=>pautaMateriais(id), idPrimeiro);
  await page.waitForTimeout(700);
  const guardou = await page.evaluate(async id=>(await dbGet('videos', id)).midia, idPrimeiro);
  ok('os arquivos escolhidos ficam guardados no item',
    guardou && guardou.length===2 ? true : guardou);
  ok('e o pedido foi de mídia, não de música',
    (await page.evaluate(()=>window.__escolheu))==='midia' ? true : 'pediu outra coisa');

  /* escolher de novo soma, não troca: quem pega o vídeo e depois a foto
     não pode perder o vídeo */
  await page.evaluate(()=>{ window.__vaiEscolher = [
    {caminho:'C:\\Users\\ju\\Downloads\\anuncio.mp4', nome:'anuncio.mp4', tamanho:900000},
    {caminho:'C:\\Users\\ju\\Downloads\\lado.jpg',    nome:'lado.jpg',    tamanho:41000}]; });
  await page.evaluate(id=>pautaMateriais(id), idPrimeiro);
  await page.waitForTimeout(700);
  const somou = await page.evaluate(async id=>(await dbGet('videos', id)).midia, idPrimeiro);
  ok('escolher de novo soma e não repete o mesmo arquivo',
    somou.length===3 ? true : somou);

  await page.evaluate(()=>midiaRender()); await page.waitForTimeout(700);
  tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('o cartão passa a mostrar o que você escolheu',
    /Materiais: 1 vídeo e 2 fotos/.test(tela) ? true : 'não mostrou a conta certa');
  ok('e o aviso de "traga as mídias" some daquele cartão',
    conta(tela) === avisosAntes - 1 ? true : { antes: avisosAntes, agora: conta(tela) });
  ok('no lugar dele, o cartão diz que é com esses arquivos que o vídeo vai ser montado',
    /É com esses arquivos que o vídeo vai ser montado/.test(tela) ? true : 'não disse');

  await page.evaluate(()=>{ window.__criar = []; window.__midia = []; });
  await page.evaluate(id=>pautaGerar(id), idPrimeiro);
  await page.waitForTimeout(2000);
  const comArq = await page.evaluate(()=>window.__criar[0]);
  ok('a fábrica recebe os arquivos que você escolheu',
    comArq && comArq.arquivos && comArq.arquivos.length===3 ? true : comArq && comArq.arquivos);
  ok('e o sistema nem tenta ler a página da loja quando já tem material seu',
    (await page.evaluate(()=>window.__midia.length))===0 ? true : 'foi buscar à toa');

  await page.evaluate(id=>pautaLimparMateriais(id), idPrimeiro);
  await page.waitForTimeout(600);
  const soltou = await page.evaluate(async id=>(await dbGet('videos', id)).midia, idPrimeiro);
  ok('soltar os materiais volta a busca automática', soltou.length===0 ? true : soltou);

  /* ======================================== 6) agora sim, o botão de publicar */
  console.log('\n6) o botão de publicar nasce depois do vídeo');
  await page.evaluate(()=>midiaRender()); await page.waitForTimeout(900);
  tela = await page.evaluate(()=>document.getElementById('mid-body').innerHTML);
  ok('o botão Publicar o vídeo aparece', /Publicar o vídeo/.test(tela) ? true : 'não apareceu');
  ok('junto com o de assistir', /Assistir/.test(tela) ? true : 'faltou o assistir');
  ok('e o cartão avisa quantas versões existem', /3 versão\(ões\) prontas/.test(tela) ? true : 'não avisou');
  ok('só o item com vídeo ganhou o botão',
    (tela.match(/Publicar o vídeo/g)||[]).length === 1 ? true : (tela.match(/Publicar o vídeo/g)||[]).length);

  /* tentar publicar um item sem vídeo é recusado */
  const outro = await page.evaluate(async id=>{
    const v = (await dbGetAll('videos')).filter(x=>x.origem==='garimpo' && x.id!==id);
    return v[0].id;
  }, idPrimeiro);
  await page.evaluate(()=>{ DISP.pautaId = null; DISP.video = null; });
  await page.evaluate(id=>pautaPublicar(id), outro);
  await page.waitForTimeout(800);
  const recusou = await page.evaluate(()=>({pautaId:DISP.pautaId, video:DISP.video}));
  ok('publicar sem vídeo é recusado',
    recusou.pautaId===null && recusou.video===null ? true : recusou);

  /* ============================================ 7) todas as plataformas */
  console.log('\n7) todas as plataformas');
  await page.evaluate(async ()=>{
    await dbAdd('canais',{nome:'JeV Achados', plataforma:'TikTok', finalidade:'afiliado',
      url:'https://www.tiktok.com/@jevachados'});
  });
  await page.evaluate(id=>pautaPublicar(id), idPrimeiro);
  await page.waitForTimeout(1200);

  const janela = await page.evaluate(()=>({
    plats: DISP.plats.slice(), video: DISP.video, pautaId: DISP.pautaId,
    corpo: (document.getElementById('mkf-body')||{}).innerHTML || ''
  }));
  ok('a janela de publicar abriu', janela.corpo.length > 200 ? true : 'não abriu');
  ok('com TODAS as plataformas marcadas',
    janela.plats.length === (await page.evaluate(()=>PLATAFORMAS_VIDEO.length)) ? true : janela.plats.length);
  ok('e o vídeo em pé já anexado',
    janela.video && /vertical\.webm$/.test(janela.video.caminho) ? true : janela.video);
  ok('lembrando de qual item da pauta veio', janela.pautaId === idPrimeiro ? true : janela.pautaId);
  ok('a tela mostra quais pagam e quais não pagam',
    /não paga por view|não pagam/i.test(janela.corpo) ? true : 'não avisou sobre pagamento');

  /* marcar como publicado fecha o ciclo na pauta */
  await page.evaluate(()=>dispMarcar('tt'));
  await page.waitForTimeout(900);
  const fechou = await page.evaluate(async id=>{
    const item = await dbGet('videos', id);
    return { status:item.status, dtPub:item.dtPub,
             pubs:(await dbGetAll('publicacoes')).length };
  }, idPrimeiro);
  ok('marcar publicado muda a situação da linha na pauta',
    fechou.status==='Publicado' ? true : fechou.status);
  ok('e grava a data', !!fechou.dtPub ? true : fechou);
  ok('e registra a publicação', fechou.pubs>=1 ? true : fechou.pubs);
  await page.evaluate(()=>closeModal('mk-form'));
  await page.waitForTimeout(400);

  /* =================================================== 8) assistir e tirar */
  console.log('\n8) assistir e tirar da pauta');
  await page.evaluate(id=>pautaAssistir(id), idPrimeiro);
  await page.waitForTimeout(1000);
  const assistindo = await page.evaluate(()=>({
    aba: MID_TAB, arquivos: EST.resultado && EST.resultado.arquivos.length,
    html: document.getElementById('mid-body').innerHTML
  }));
  ok('assistir leva para o player com o vídeo do produto',
    assistindo.aba==='gerar' && assistindo.arquivos===3 ? true : assistindo);
  ok('e a área de assistir antes de postar aparece',
    /Assista antes de postar/.test(assistindo.html) ? true : 'não apareceu');

  await page.evaluate(()=>{ midStab('videos'); });
  await page.waitForTimeout(800);
  await page.evaluate(id=>{ pautaTirar(id); }, outro);
  await page.waitForTimeout(500);
  await page.evaluate(()=>document.getElementById('mkc-ok').click());
  await page.waitForTimeout(800);
  const sobrou = await page.evaluate(async ()=>(await dbGetAll('videos')).filter(x=>x.origem==='garimpo').length);
  ok('tirar da pauta remove só aquele item', sobrou === naPauta.n - 1 ? true : {antes:naPauta.n, agora:sobrou});

  /* ============ 8b) o vídeo sem pessoa é avisado, não escondido

     A fábrica daqui monta com a foto REAL e não inventa gente. Quando só
     chegou foto, o vídeo sai bonito e sem ninguém — e o dono acha que
     quebrou. A tela precisa dizer que não quebrou e mostrar os dois
     caminhos: baixar o vídeo do vendedor, ou levar o prompt para uma IA. */
  console.log('\n8b) o vídeo que saiu sem pessoa avisa, em vez de calar');
  const tv = await page.evaluate(() => [
    pautaTemVideo([{ caminho: 'C:\\x\\anuncio.mp4' }]),
    pautaTemVideo([{ caminho: '/casa/foto.jpg' }, { caminho: '/casa/dois.png' }]),
    pautaTemVideo([{ nome: 'clipe.MOV' }]),
    pautaTemVideo([]),
    pautaTemVideo(null)
  ]);
  ok('reconhece vídeo pelo nome do arquivo', tv[0] === true ? true : tv[0]);
  ok('e não confunde foto com vídeo', tv[1] === false ? true : tv[1]);
  ok('aceita maiúscula na extensão', tv[2] === true ? true : tv[2]);
  ok('lista vazia e lista nenhuma não quebram',
    tv[3] === false && tv[4] === false ? true : [tv[3], tv[4]]);

  const cartao = await page.evaluate(async () => {
    const todos = (await dbGetAll('videos')).filter(x => x.origem === 'garimpo');
    if (!todos.length) return 'sem item na pauta';
    PAUTA.aviso[todos[0].id] = 'saiu só com as fotos, sem ninguém aparecendo';
    await midiaRender();
    const h = document.getElementById('mid-body').innerHTML;
    PAUTA.aviso[todos[0].id] = '';
    return h;
  });
  ok('o aviso aparece no cartão do vídeo',
    /sem ninguém aparecendo/.test(cartao) ? true : String(cartao).slice(0, 120));
  ok('e vem com o botão de baixar as mídias do vendedor',
    /pautaBaixarMidias\(/.test(cartao) ? true : 'sem o botão');
  ok('e com o botão que abre o prompt da IA',
    /pautaVerPrompt\(/.test(cartao) ? true : 'sem o botão');
  ok('é aviso âmbar, não erro vermelho',
    /class="al aw"[^>]*><i class="ti ti-user-off"/.test(cartao) ? true : 'não é aviso');

  const abriu = await page.evaluate(async () => {
    const todos = (await dbGetAll('videos')).filter(x => x.origem === 'garimpo');
    PAUTA.abertos[todos[0].id] = true;
    pautaVerPrompt(todos[0].id);
    return PAUTA.abertos[todos[0].id];
  });
  ok('clicar no prompt com a ficha já aberta não fecha na cara de quem clicou',
    abriu === true ? true : abriu);

  /* ==================================================== 9) nada quebrou */
  console.log('\n9) o resto do sistema');
  await page.evaluate(()=>{ delete window.JeVDesktop; });
  for(const t of ['hub','fin','obras','imoveis','veiculos','chacara','produtos','midia','rel','cfg']){
    await page.evaluate(n=>go(n), t); await page.waitForTimeout(250);
  }
  await page.evaluate(()=>{ go('midia'); midStab('cort'); }); await page.waitForTimeout(400);
  await page.evaluate(()=>midStab('afil')); await page.waitForTimeout(400);
  await page.evaluate(()=>midStab('gar')); await page.waitForTimeout(400);
  await page.evaluate(()=>midStab('videos')); await page.waitForTimeout(600);
  ok('as telas continuam abrindo', erros.length===0 ? true : erros.slice(0,3));

  console.log('');
  if(erros.length){ console.log('ERROS:'); erros.forEach(e=>console.log('  '+e)); }
  else console.log('Nenhum erro de JavaScript.');
  console.log(falhas ? falhas+' FALHA(S)' : 'Tudo certo.');
  await b.close();
  process.exit(falhas ? 1 : 0);
})();

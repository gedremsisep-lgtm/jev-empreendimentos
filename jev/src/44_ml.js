/* =========================================================================
   MERCADO LIVRE — O GARIMPO QUE JÁ VEM COM O LINK

   POR QUE ESTA PEÇA VALE MAIS QUE AS OUTRAS FONTES
   ------------------------------------------------
   Todo garimpo até aqui achava o produto e parava. O link de afiliado, que
   é o que faz a venda pagar, ficava esperando o dono ir no painel buscar.
   Com sete produtos por dia, isso é o gargalo — e é o motivo de a fila do
   grupo secar justo no dia em que ele está ocupado.

   Aqui não: a lista do hub de afiliados do Mercado Livre já traz a COMISSÃO
   de cada produto, e o link sai na mesma viagem, em lote. Produto garimpado
   entra na ficha já pronto para postar.

   O NÚMERO QUE MUDA A CONVERSA
   ----------------------------
   Medido na conta dele, em 08/09/2026: o melhor produto do catálogo antigo
   pagava R$ 8,55 por venda. Os "Ganhos extras" do Mercado Livre pagam
   R$ 27,14 (refletor) e R$ 38,26 (compressor de ar) — em produtos com
   dezenas de milhares de vendas. Três a quatro vezes mais, no mesmo
   trabalho de gravar um vídeo.

   O QUE ESTA TELA NÃO FAZ
   -----------------------
   Não pede, não digita e não guarda a senha dele. A janela que abre é o
   Mercado Livre de verdade; quem entra na conta é ele, com o dedo dele. O
   que fica guardado é o cookie da sessão, do mesmo jeito que o navegador
   guarda — e é isso que faz o login valer nas próximas vezes.
   ========================================================================= */

const ML = { estado: null, garimpando: false, achados: [], recado: '', filtros: {
  quantos: 12, teto: 0, ganhoMin: 0, soExtras: false
} };

function mlApp(){ return (typeof window !== 'undefined' && window.JeVDesktop) || null; }
function mlTem(){ const d = mlApp(); return !!(d && d.mlGarimpar); }

async function mlVerEstado(){
  const d = mlApp();
  if (!d || !d.mlEstado){ ML.estado = { semApp: true }; return ML.estado; }
  try { ML.estado = await d.mlEstado(); }
  catch (e) { ML.estado = { conectado: false, motivo: String((e && e.message) || e) }; }
  return ML.estado;
}

async function mlEntrar(){
  const d = mlApp();
  if (!d || !d.mlEntrar){ toast('Isso só funciona no aplicativo do Windows.', 'aw'); return; }
  await d.mlEntrar();
  toast('Abri o Mercado Livre numa janela. Entre na sua conta por lá — ' +
        'eu não vejo e não guardo a sua senha. Depois volte aqui.', 'ai');
  /* dá tempo de ele fazer o login antes de eu perguntar de novo */
  setTimeout(async function(){ await mlVerEstado(); midiaRender(); }, 12000);
}

/* ------------------------------------------- de produto do ML para produto do JeV

   Converter aqui, uma vez, é o que faz TUDO o que já existe funcionar sem
   mudar uma linha: a pauta, o prompt com pessoa, o vídeo, o anúncio, o
   grupo de ofertas. O sistema não precisa saber que este produto veio do
   Mercado Livre — só precisa de um produto no formato da casa. */
function mlNichoDe(p){
  const t = String((p && p.n) || '').toLowerCase();
  if (/cozinha|panela|fritadeira|air ?fryer|liquidific|talher|copo|garrafa/.test(t)) return 'coz';
  if (/lâmpada|lampada|refletor|luminária|luminaria|led|abajur|decor|quadro/.test(t)) return 'dec';
  if (/travesseiro|lençol|lencol|toalha|edredom|colch|cortina|tapete/.test(t)) return 'ban';
  if (/limpeza|vassoura|rodo|detergente|lava|esfregão|esfregao|mop/.test(t)) return 'lim';
  return 'org';
}

/* o termo de busca: minúsculo, sem acento, sem pontuação — é o que o resto
   do sistema usa como chave do produto */
function mlTermo(nome){
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 60);
}

/* o gancho, escrito a partir do que o próprio Mercado Livre informou.
   Nada inventado: é o desconto real, ou a prova social real. */
function mlGancho(p){
  if (p.de && p.preco && p.de > p.preco){
    const off = Math.round((1 - p.preco / p.de) * 100);
    if (off >= 15) return 'De ' + moeda(p.de) + ' por ' + moeda(p.preco) + ' — ' + off + '% de desconto';
  }
  if (p.vend >= 10000) return qtd(p.vend, 0) + '+ pessoas já compraram';
  if (p.nota >= 4.7) return 'Nota ' + String(p.nota).replace('.', ',') + ' de quem já comprou';
  return 'Achado do Mercado Livre';
}

function mlComoProduto(p){
  return {
    n: p.n,
    t: mlTermo(p.n),
    g: mlNichoDe(p),
    preco: p.preco || 0,
    de: p.de || 0,
    vend: p.vend || 0,
    nota: p.nota || 0,
    comissao: p.comissao || 0,
    ganho: p.ganho || 0,
    gancho: mlGancho(p),
    porque: 'Comissão de ' + (p.comissao || 0) + '%' + (p.extras ? ' (ganhos extras)' : '') +
            (p.ganho ? ', ' + moeda(p.ganho) + ' por venda' : ''),
    ang: 'Antes e depois',
    video: 5,
    loja: 'Mercado Livre',
    capa: p.capa || '',
    mlb: p.mlb || '',
    links: p.url ? [{ loja: 'ml', nome: 'Mercado Livre', url: p.url }] : []
  };
}

/* ---------------------------------------------------------------- garimpar */
async function mlGarimpar(){
  const d = mlApp();
  if (!mlTem()){ toast('Isso só funciona no aplicativo do Windows.', 'aw'); return; }

  ML.garimpando = true; ML.recado = 'lendo a lista e gerando os seus links…';
  midiaRender();

  let r;
  try { r = await d.mlGarimpar(ML.filtros); }
  catch (e) { r = { ok: false, motivo: String((e && e.message) || e) }; }
  ML.garimpando = false;

  if (!r || !r.ok){
    ML.recado = (r && r.motivo) || 'não consegui garimpar no Mercado Livre';
    if (r && r.precisaEntrar) await mlVerEstado();
    toast(ML.recado, 'aw');
    midiaRender();
    return;
  }

  ML.achados = r.achados || [];
  const produtos = ML.achados.map(mlComoProduto);

  /* vira ficha de afiliado — e, diferente de todo o resto, JÁ COM O LINK */
  let comLink = 0, semLink = 0;
  try {
    await prepSalvarFichas(produtos);
    const fichas = await dbGetAll('programas');
    for (const p of ML.achados){
      if (!p.link) { semLink++; continue; }
      const chave = String(p.n || '').trim().toLowerCase();
      const f = fichas.find(function(x){
        return String(x.produto || '').trim().toLowerCase() === chave;
      });
      if (!f) continue;
      await dbPut('programas', Object.assign({}, f, {
        url: p.link, plataforma: 'Mercado Livre',
        comissao: p.comissao || f.comissao || 0,
        preco: p.preco || f.preco || 0,
        codigoBusca: p.codigoBusca || ''
      }));
      comLink++;
    }
  } catch (e) { console.error('fichas do ML:', e); }

  /* e vira pauta, para virar vídeo */
  let naPauta = 0;
  try {
    if (typeof pautaDoGarimpo === 'function'){
      const x = await pautaDoGarimpo(produtos);
      naPauta = (x && x.novos) || 0;
    }
  } catch (e) { console.error('pauta do ML:', e); }

  ML.recado = comLink + ' produto(s) com o seu link já colado' +
    (semLink ? ' · ' + semLink + ' sem link' : '') +
    (naPauta ? ' · ' + naPauta + ' foram para a pauta de vídeo' : '');
  if (r.linksFalharam)
    ML.recado += ' — os links não vieram: ' + (r.motivoLinks || '');
  toast(ML.recado, comLink ? 'ag' : 'aw');
  midiaRender();
}

function mlMudarFiltro(campo, valor){
  ML.filtros[campo] = valor;
  midiaRender();
}

/* -------------------------------------------------------------------- tela */
function mlAchadosHTML(){
  if (!ML.achados.length) return '';
  return '<div class="sh" style="margin-top:12px"><i class="ti ti-pick"></i>' +
    'O que veio do Mercado Livre</div>' +
    '<div style="max-height:300px;overflow:auto"><table><thead><tr>' +
      '<th>Produto</th><th class="c">Comissão</th><th class="r">Preço</th>' +
      '<th class="r">Ganho/venda</th><th class="c">Link</th>' +
    '</tr></thead><tbody>' +
    ML.achados.map(function(p){
      return '<tr><td><b>' + esc(p.n) + '</b>' +
        (p.selo ? ' <span class="st s-nt">' + esc(p.selo) + '</span>' : '') +
        (p.vend ? '<div class="tt">' + qtd(p.vend, 0) + '+ vendidos' +
                  (p.nota ? ' · nota ' + String(p.nota).replace('.', ',') : '') + '</div>' : '') +
        '</td>' +
        '<td class="c n">' + (p.comissao || 0) + '%' +
          (p.extras ? '<div class="tt">ganhos extras</div>' : '') + '</td>' +
        '<td class="r n">' + (p.preco ? moeda(p.preco) : '—') + '</td>' +
        '<td class="r n"><b>' + (p.ganho ? moeda(p.ganho) : '—') + '</b></td>' +
        '<td class="c">' + (p.link
          ? '<span class="st s-ok"><i class="ti ti-check"></i>pronto</span>'
          : '<span class="st s-wn">sem link</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

async function mlSecaoHTML(){
  if (mlTem() && !ML.estado) await mlVerEstado();
  const e = ML.estado;

  let h = '<div class="card tw" style="margin-bottom:14px">' +
    '<div class="hd"><i class="ti ti-shopping-cart" style="color:#FFE600"></i>' +
    'Mercado Livre — garimpo com o link já pronto' +
    (e && e.conectado ? '<span class="st s-ok">conectado</span>' : '') +
    '</div><div class="bd">';

  if (!mlTem())
    return h + '<div class="tt">O garimpo do Mercado Livre precisa abrir uma janela na sua ' +
      'conta, e isso só existe no <b>aplicativo do Windows</b>. Pelo navegador, use a ' +
      'colagem em lote na Carteira de links aqui embaixo.</div></div></div>';

  if (!e || !e.conectado){
    h += '<div class="tt">Esta é a única fonte que traz a <b>comissão de cada produto</b> e ' +
      'gera o <b>seu link de afiliado</b> na mesma viagem — produto garimpado já sai pronto ' +
      'para postar. Para isso eu preciso que você entre na sua conta uma vez, na janela do ' +
      'próprio Mercado Livre. <b>Eu não vejo nem guardo a sua senha</b>; fica guardado só o ' +
      'acesso da sessão, igual ao navegador faz.</div>' +
      (e && e.motivo ? '<div class="tt" style="margin-top:5px">' + esc(e.motivo) + '</div>' : '') +
      '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn gn" onclick="mlEntrar()">' +
          '<i class="ti ti-login"></i>Abrir o Mercado Livre e entrar</button>' +
        '<button class="btn xs gh" onclick="mlVerEstado().then(midiaRender)">' +
          '<i class="ti ti-refresh"></i>Já entrei, confira</button>' +
      '</div></div></div>';
    return h;
  }

  const f = ML.filtros;
  h += '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
    '<label class="tt">Trazer <input type="number" min="1" max="50" value="' + f.quantos + '" ' +
      'style="width:60px" onchange="mlMudarFiltro(\'quantos\', Number(this.value))"> produtos</label>' +
    '<label class="tt">Preço até R$ <input type="number" min="0" value="' + (f.teto || '') + '" ' +
      'placeholder="sem teto" style="width:80px" ' +
      'onchange="mlMudarFiltro(\'teto\', Number(this.value))"></label>' +
    '<label class="tt">Ganho mínimo R$ <input type="number" min="0" value="' + (f.ganhoMin || '') + '" ' +
      'placeholder="0" style="width:70px" ' +
      'onchange="mlMudarFiltro(\'ganhoMin\', Number(this.value))"></label>' +
    '<label class="tt" style="display:flex;gap:5px;align-items:center">' +
      '<input type="checkbox"' + (f.soExtras ? ' checked' : '') + ' ' +
      'onchange="mlMudarFiltro(\'soExtras\', this.checked)"> só os de ganhos extras</label>' +
    '</div>';

  h += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
    (ML.garimpando
      ? '<span class="tt"><i class="ti ti-loader"></i> ' + esc(ML.recado) + '</span>'
      : '<button class="btn gn" onclick="mlGarimpar()">' +
        '<i class="ti ti-pick"></i>Garimpar e gerar os links</button>') +
    '<button class="btn xs gh" onclick="mlEntrar()">' +
      '<i class="ti ti-external-link"></i>Abrir a janela do ML</button>' +
    '<span class="tt">Leio a lista, calculo o ganho por venda de cada um e gero os seus ' +
      'links em lote — numa chamada só.</span>' +
    '</div>';

  if (!ML.garimpando && ML.recado)
    h += '<div class="tt" style="margin-top:8px">' + esc(ML.recado) + '</div>';

  h += mlAchadosHTML();
  h += '</div></div>';
  return h;
}

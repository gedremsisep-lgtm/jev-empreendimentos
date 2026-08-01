/* =========================================================================
   NUVEM — espaço próprio da JeV no Supabase
   O sistema continua sendo dono dos dados: tudo é gravado primeiro neste
   computador e depois espelhado na nuvem. Sem internet, nada para de
   funcionar — a sincronização acontece na próxima vez que houver sinal.

   Como é guardado lá:
     jev_registros  — uma linha por registro (gid = tabela.aparelho.id)
     jev_aparelhos  — quem sincronizou e quando
     jev-arquivos   — pasta separada com as fotos e comprovantes
   Nada disso encosta em tabelas de outros sistemas.
   ========================================================================= */

const NV_TABELA   = 'jev_registros';
const NV_APARELHO = 'jev_aparelhos';
const NV_BALDE    = 'jev-arquivos';

/* tabelas que sobem para a nuvem — 'sync' e 'lixeira' são de uso interno */
const NV_STORES = STORES.filter(s=>!['sync','lixeira'].includes(s));

/* referências entre tabelas: usadas só quando um id bate de frente com
   outro já existente neste computador (acontece se dois aparelhos criarem
   cadastros ao mesmo tempo, cada um sem ver o outro) */
const NV_REFS = {
  etapas:{obraId:'obras'}, orcamento:{obraId:'obras'}, compras:{obraId:'obras'},
  estoque:{obraId:'obras', compraId:'compras', contaId:'contas'},
  apontamentos:{obraId:'obras', equipeId:'equipe'},
  rdo:{obraId:'obras'}, projetos:{obraId:'obras'}, medicoes:{obraId:'obras'},
  financeiro:{contaId:'contas', aptId:'apontamentos'},
  recorrencias:{contaId:'contas'},
  manutencoes:{contaId:'contas', contratoId:'contratos'},
  vendas:{produtoId:'produtos', contaId:'contas'},
  videos:{canalId:'canais'},
  ciclos:{loteId:'lotes', contaId:'contas'}
};
const NV_REFTIPO = {obra:'obras', imovel:'imoveis', veiculo:'veiculos',
                    ciclo:'ciclos', produto:'produtos', canal:'canais'};

let NUVEM = {url:'', chave:'', email:'', refresh:'', inst:'', nome:'', auto:true,
             ultimoEnvio:0, ultimaBaixa:'', ultima:'', fotos:[]};
let NV_SESSAO = {token:'', expira:0};
let NV_OCUPADO = false;
let NV_TIMER = null;
let NV_ULTIMO_RESUMO = null;

const nvLigada = ()=> !!(NUVEM.url && NUVEM.chave && NUVEM.email);

/* =========================================================================
   Configuração guardada junto com o resto (tabela config)
   ========================================================================= */
async function nvCarregar(){
  const c = await dbGet('sync', 1);
  NUVEM = {url:'', chave:'', email:'', refresh:'', inst:'', nome:'', auto:true,
           ultimoEnvio:0, ultimaBaixa:'', ultima:'', fotos:[], ...(c||{})};
  if(!NUVEM.inst){
    NUVEM.inst = Math.random().toString(36).slice(2,8);
    await nvGravar();
  }
  if(nvLigada() && NUVEM.auto) nvAgendar();
}
async function nvGravar(){ await dbPutRaw('sync', {...NUVEM, id:1}); }

function nvAgendar(){
  if(NV_TIMER) clearInterval(NV_TIMER);
  if(!NUVEM.auto || !nvLigada()) return;
  NV_TIMER = setInterval(()=>{ if(navigator.onLine) nvSincronizar(true); }, 5*60*1000);
  setTimeout(()=>{ if(navigator.onLine) nvSincronizar(true); }, 6000);
}

/* =========================================================================
   Conversa com o Supabase
   ========================================================================= */
function nvURL(caminho){ return String(NUVEM.url).replace(/\/+$/,'') + caminho; }

async function nvEntrar(senha){
  const r = await fetch(nvURL('/auth/v1/token?grant_type=password'), {
    method:'POST',
    headers:{'apikey':NUVEM.chave,'Content-Type':'application/json'},
    body: JSON.stringify({email:NUVEM.email, password:senha})
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(nvErro(j) || 'usuário ou senha não conferem');
  NV_SESSAO = {token:j.access_token, expira: Date.now() + (j.expires_in||3600)*1000 - 60000};
  NUVEM.refresh = j.refresh_token || '';
  await nvGravar();
  return true;
}
async function nvRenovar(){
  if(!NUVEM.refresh) throw new Error('sessão expirada — entre de novo com a senha');
  const r = await fetch(nvURL('/auth/v1/token?grant_type=refresh_token'), {
    method:'POST',
    headers:{'apikey':NUVEM.chave,'Content-Type':'application/json'},
    body: JSON.stringify({refresh_token:NUVEM.refresh})
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok){ NUVEM.refresh=''; await nvGravar(); throw new Error('sessão expirada — entre de novo com a senha'); }
  NV_SESSAO = {token:j.access_token, expira: Date.now() + (j.expires_in||3600)*1000 - 60000};
  if(j.refresh_token){ NUVEM.refresh = j.refresh_token; await nvGravar(); }
}
async function nvSessao(){
  if(NV_SESSAO.token && Date.now() < NV_SESSAO.expira) return NV_SESSAO.token;
  await nvRenovar();
  return NV_SESSAO.token;
}
function nvErro(j){
  return (j && (j.msg || j.message || j.error_description || j.error || j.hint)) || '';
}
async function nvAPI(caminho, opts={}){
  const token = await nvSessao();
  const h = Object.assign({
    'apikey': NUVEM.chave,
    'Authorization': 'Bearer '+token
  }, opts.headers||{});
  const r = await fetch(nvURL(caminho), {...opts, headers:h});
  if(!r.ok){
    let msg = '';
    try{ msg = nvErro(await r.json()); }catch(e){ msg = r.statusText; }
    if(r.status===404 && /jev_registros/.test(caminho))
      msg = 'as tabelas da JeV ainda não existem neste projeto — rode o script de preparação';
    throw new Error(`${msg||'erro'} (${r.status})`);
  }
  return r;
}

/* =========================================================================
   Fotos e anexos vão para a pasta separada, não para dentro do banco
   ========================================================================= */
async function nvHash(texto){
  const b = new TextEncoder().encode(texto);
  const d = await crypto.subtle.digest('SHA-256', b);
  return [...new Uint8Array(d)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function nvDataURLparaBlob(u){
  const [cab,b64] = String(u).split(',');
  const mime = (cab.match(/data:([^;]+)/)||[])[1] || 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:mime});
}
async function nvSubirArquivo(dataUrl){
  const h = await nvHash(dataUrl);
  const ext = /image\/png/.test(dataUrl) ? 'png' : 'jpg';
  const caminho = `fotos/${h}.${ext}`;
  if(!NUVEM.fotos.includes(h)){
    const token = await nvSessao();
    const r = await fetch(nvURL(`/storage/v1/object/${NV_BALDE}/${caminho}`), {
      method:'POST',
      headers:{'apikey':NUVEM.chave,'Authorization':'Bearer '+token,'x-upsert':'true'},
      body: nvDataURLparaBlob(dataUrl)
    });
    if(!r.ok && r.status!==409){
      let m=''; try{ m = nvErro(await r.json()); }catch(e){}
      throw new Error('não consegui enviar uma foto: '+(m||r.status));
    }
    NUVEM.fotos.push(h);
    if(NUVEM.fotos.length>4000) NUVEM.fotos = NUVEM.fotos.slice(-3000);
  }
  return 'jevarq:'+caminho;
}
async function nvBaixarArquivo(marca){
  const caminho = String(marca).slice(7);
  const token = await nvSessao();
  const r = await fetch(nvURL(`/storage/v1/object/${NV_BALDE}/${caminho}`), {
    headers:{'apikey':NUVEM.chave,'Authorization':'Bearer '+token}
  });
  if(!r.ok) return '';
  const blob = await r.blob();
  return await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>res(''); fr.readAsDataURL(blob); });
}
/* percorre o registro trocando as fotos pelo endereço na pasta (e o contrário) */
async function nvTrocarArquivos(valor, subindo){
  if(typeof valor === 'string'){
    if(subindo && valor.startsWith('data:image')) return await nvSubirArquivo(valor);
    if(!subindo && valor.startsWith('jevarq:'))   return await nvBaixarArquivo(valor);
    return valor;
  }
  if(Array.isArray(valor)){
    const out=[];
    for(const v of valor) out.push(await nvTrocarArquivos(v, subindo));
    return out;
  }
  if(valor && typeof valor === 'object'){
    const out={};
    for(const k of Object.keys(valor)) out[k] = await nvTrocarArquivos(valor[k], subindo);
    return out;
  }
  return valor;
}

/* =========================================================================
   ENVIAR — o que mudou aqui vai para a nuvem
   ========================================================================= */
async function nvEnviar(){
  const marca = Date.now();
  const desde = num(NUVEM.ultimoEnvio);
  let lote = [], enviados = 0, comFoto = 0;

  const despachar = async ()=>{
    if(!lote.length) return;
    await nvAPI(`/rest/v1/${NV_TABELA}?on_conflict=gid`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body: JSON.stringify(lote)
    });
    enviados += lote.length;
    lote = [];
  };

  for(const store of NV_STORES){
    const linhas = await dbGetAll(store);
    for(const r of linhas){
      const novo = !r._gid;
      if(novo){
        /* a configuração da empresa é a mesma para todo mundo, por isso
           usa um código fixo em vez do código deste aparelho */
        r._gid = store==='config' ? `config.jev.${r.id}` : `${store}.${NUVEM.inst}.${r.id}`;
        await dbPutRaw(store, r);
      }else if(num(r._ts) <= desde){
        continue;
      }
      const dados = {...r};
      delete dados.id;
      const temFoto = JSON.stringify(dados).includes('data:image');
      const limpo = temFoto ? await nvTrocarArquivos(dados, true) : dados;
      if(temFoto) comFoto++;
      lote.push({gid:r._gid, tabela:store, dados:limpo, excluido:false,
                 aparelho:NUVEM.inst, autor:NUVEM.nome||''});
      if(lote.length>=60) await despachar();
    }
  }

  /* o que foi apagado aqui também some lá */
  for(const t of await dbGetAll('lixeira')){
    if(num(t._ts) <= desde) continue;
    lote.push({gid:t.id, tabela:t.tabela, dados:{}, excluido:true,
               aparelho:NUVEM.inst, autor:NUVEM.nome||''});
    if(lote.length>=60) await despachar();
  }
  await despachar();

  NUVEM.ultimoEnvio = marca;
  await nvGravar();
  return {enviados, comFoto};
}

/* =========================================================================
   BAIXAR — o que os outros aparelhos mudaram vem para cá
   ========================================================================= */
async function nvBaixar(tudo){
  let cursor = tudo ? '1970-01-01T00:00:00Z'
                    : (NUVEM.ultimaBaixa || '1970-01-01T00:00:00Z');
  let novos=0, alterados=0, apagados=0, remapeados=0, voltas=0;
  const REMAP = {};
  let maior = cursor;

  while(voltas++ < 200){
    const r = await nvAPI(`/rest/v1/${NV_TABELA}?select=*&atualizado=gt.${encodeURIComponent(cursor)}`+
                          `&order=atualizado.asc&limit=150`);
    const linhas = await r.json();
    if(!linhas.length) break;
    for(const linha of linhas){
      const res = await nvAplicar(linha, REMAP);
      if(res==='novo') novos++;
      else if(res==='alterado') alterados++;
      else if(res==='apagado') apagados++;
      if(res==='remapeado'){ novos++; remapeados++; }
      if(linha.atualizado > maior) maior = linha.atualizado;
    }
    cursor = linhas[linhas.length-1].atualizado;
    if(linhas.length < 150) break;
  }

  if(Object.keys(REMAP).length) await nvCorrigirReferencias(REMAP);

  NUVEM.ultimaBaixa = maior;
  await nvGravar();
  return {novos, alterados, apagados, remapeados};
}

function nvStoreDoGid(gid){
  const p = String(gid).split('.');
  return {store:p[0], id: Number(p[2])};
}
function nvBuscarPorGid(store, gid){
  return new Promise(res=>{
    try{
      const idx = tx(store,'readonly').index('_gid');
      const r = idx.get(gid);
      r.onsuccess = ()=>res(r.result||null);
      r.onerror   = ()=>res(null);
    }catch(e){ res(null); }
  });
}

async function nvAplicar(linha, REMAP){
  const {store, id:idOriginal} = nvStoreDoGid(linha.gid);
  if(!NV_STORES.includes(store)) return '';

  const local = await nvBuscarPorGid(store, linha.gid);

  if(linha.excluido){
    if(local){ await dbDel(store, local.id, true); return 'apagado'; }
    return '';
  }

  const bruto = linha.dados || {};
  const dados = JSON.stringify(bruto).includes('jevarq:')
                ? await nvTrocarArquivos(bruto, false) : bruto;
  const carimbo = Date.parse(linha.atualizado) || Date.now();

  if(local){
    /* Não dá para comparar a hora dos dois computadores — cada um tem o
       próprio relógio. A regra é outra e não depende disso: se o registro
       daqui ainda tem alteração que não subiu, ele fica e vence no próximo
       envio; se já subiu, o que vem da nuvem é o mais recente. */
    if(num(local._ts) > num(NUVEM.ultimoEnvio)) return '';
    await dbPutRaw(store, {...dados, id:local.id, _gid:linha.gid,
                           _ts:num(NUVEM.ultimoEnvio)||carimbo, _nuvem:linha.atualizado});
    return 'alterado';
  }

  /* registro novo para este computador — tenta manter o mesmo número */
  if(idOriginal){
    const ocupado = await dbGet(store, idOriginal).catch(()=>null);
    if(!ocupado){
      await dbAddRaw(store, {...dados, id:idOriginal, _gid:linha.gid,
                             _ts:num(NUVEM.ultimoEnvio)||carimbo, _nuvem:linha.atualizado});
      return 'novo';
    }
  }
  const semId = {...dados, _gid:linha.gid, _ts:num(NUVEM.ultimoEnvio)||carimbo, _nuvem:linha.atualizado};
  delete semId.id;
  const novoId = await dbAddRaw(store, semId);
  if(idOriginal && Number(novoId)!==Number(idOriginal)) REMAP[`${store}:${idOriginal}`] = Number(novoId);
  return idOriginal ? 'remapeado' : 'novo';
}

/* quando um número precisou mudar, arruma quem apontava para ele */
async function nvCorrigirReferencias(REMAP){
  const de = (store,id)=> REMAP[`${store}:${Number(id)}`];
  for(const store of NV_STORES){
    const mapa = NV_REFS[store] || {};
    const temPoli = ['financeiro','manutencoes','contratos'].includes(store);
    if(!Object.keys(mapa).length && !temPoli) continue;
    for(const r of await dbGetAll(store)){
      let mudou = false;
      for(const [campo, alvo] of Object.entries(mapa)){
        if(r[campo]==null || r[campo]==='') continue;
        const n = de(alvo, r[campo]);
        if(n){ r[campo] = n; mudou = true; }
      }
      if(temPoli && r.refId!=null && r.refId!==''){
        const alvo = store==='contratos'
          ? (/im/i.test(r.tipo||'') ? 'imoveis' : 'veiculos')
          : NV_REFTIPO[r.refTipo];
        if(alvo){ const n = de(alvo, r.refId); if(n){ r.refId = n; mudou = true; } }
      }
      if(mudou) await dbPutRaw(store, r);
    }
  }
}

/* =========================================================================
   SINCRONIZAR
   ========================================================================= */
async function nvSincronizar(silencioso, tudo){
  if(!nvLigada()){ if(!silencioso) toast('Conecte a nuvem primeiro.','aw'); return; }
  if(NV_OCUPADO) return;
  NV_OCUPADO = true;
  nvPintarStatus('sincronizando');
  try{
    const env = await nvEnviar();
    const bai = await nvBaixar(tudo);
    await nvRegistrarAparelho();

    NUVEM.ultima = new Date().toISOString();
    await nvGravar();
    NV_ULTIMO_RESUMO = {...env, ...bai, quando:NUVEM.ultima, erro:''};

    if(!silencioso || env.enviados || bai.novos || bai.alterados || bai.apagados){
      const partes = [];
      if(env.enviados) partes.push(`${env.enviados} enviado(s)`);
      if(bai.novos)     partes.push(`${bai.novos} novo(s)`);
      if(bai.alterados) partes.push(`${bai.alterados} atualizado(s)`);
      if(bai.apagados)  partes.push(`${bai.apagados} apagado(s)`);
      toast(partes.length ? 'Nuvem: '+partes.join(' · ') : 'Nuvem: já estava tudo em dia.');
    }
    if(bai.remapeados)
      toast(`${bai.remapeados} cadastro(s) chegaram com número repetido e foram renumerados aqui.`,'aw');

    if(bai.novos || bai.alterados || bai.apagados){
      await finLoad();
      if(typeof celLoad==='function'){ await celLoad(); await celMarcarBadge(); }
      /* só redesenha a tela se não houver formulário aberto, para não
         apagar o que a pessoa está digitando no meio de um cadastro */
      const ocupado = ['mk-form','mk-conf','mk-bkp','mk-print']
        .some(id=>document.getElementById(id)?.classList.contains('on'));
      if(!ocupado && PG!=='nuvem') go(PG);
    }
    nvPintarStatus('ok');
    if(PG==='nuvem') nuvemRender();
  }catch(e){
    console.error(e);
    NV_ULTIMO_RESUMO = {erro:e.message, quando:new Date().toISOString()};
    nvPintarStatus('erro');
    if(!silencioso) toast('Nuvem: '+e.message,'ae');
    if(PG==='nuvem') nuvemRender();
  }finally{
    NV_OCUPADO = false;
  }
}

async function nvRegistrarAparelho(){
  try{
    await nvAPI(`/rest/v1/${NV_APARELHO}?on_conflict=inst`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body: JSON.stringify([{inst:NUVEM.inst, nome:NUVEM.nome||'Computador',
                             tipo: window.JeVDesktop?'Aplicativo do Windows':'Navegador',
                             autor: NUVEM.email||''}])
    });
  }catch(e){ /* não é motivo para atrapalhar a sincronização */ }
}

/* bolinha de status ao lado do relógio da barra de cima */
function nvPintarStatus(estado){
  const el = document.getElementById('nv-status');
  if(!el) return;
  const mapa = {
    off:      ['ti-cloud-off',      'var(--text3)', 'Nuvem desligada'],
    ok:       ['ti-cloud-check',    'var(--green)', 'Tudo sincronizado'],
    sincronizando:['ti-cloud-upload','var(--gold)', 'Sincronizando…'],
    erro:     ['ti-cloud-exclamation','var(--red)', 'Não consegui sincronizar']
  };
  const [ic,cor,tit] = mapa[estado] || mapa.off;
  el.innerHTML = `<i class="ti ${ic}"></i>`;
  el.style.color = cor;
  el.title = tit + (NUVEM.ultima ? ' — última vez em '+dbr(NUVEM.ultima)+' '+String(NUVEM.ultima).slice(11,16) : '');
}

/* =========================================================================
   TELA
   ========================================================================= */
async function nuvemRender(){
  const box = document.getElementById('nuvem-root');
  let h = `<div class="ph"><div class="ic" style="background:var(--blue-bg);color:var(--blue)">
      <i class="ti ti-cloud"></i></div>
    <div><h1>Nuvem da JeV</h1><p>Uma cópia viva do sistema em um espaço só seu, separado de qualquer outro</p></div>
    <div class="sp"></div>
    ${nvLigada()?`<button class="btn gn sm" onclick="nvSincronizar(false)" ${NV_OCUPADO?'disabled':''}>
      <i class="ti ti-refresh"></i>Sincronizar agora</button>`:''}</div>`;

  h += nvLigada() ? await nvTelaLigada() : nvTelaDesligada();
  box.innerHTML = h;
  nvPintarStatus(nvLigada() ? (NV_ULTIMO_RESUMO && NV_ULTIMO_RESUMO.erro ? 'erro':'ok') : 'off');
}

function nvTelaDesligada(){
  return `
  <div class="al ai"><i class="ti ti-info-circle"></i><div>
    <b>Para que serve.</b> Com a nuvem ligada, tudo o que você faz aqui aparece nos outros
    computadores e as guias do celular chegam sozinhas, sem WhatsApp. Se este computador
    estragar, você instala o sistema em outro, entra com o mesmo usuário e recupera tudo.
    Sem internet o sistema continua funcionando igual — ele sincroniza depois.</div></div>

  <div class="fr2">
    <div class="card"><div class="hd"><i class="ti ti-list-numbers"></i>Preparar o espaço da JeV</div><div class="bd">
      <div class="sh"><i class="ti ti-number-1"></i>Crie um projeto novo</div>
      <div class="tt" style="line-height:1.75">Entre em <b>supabase.com</b>, clique em <b>New project</b> e dê o nome
        <b>jev-empreendimentos</b>. Precisa ser um projeto <b>só da JeV</b> — não aproveite o de outro sistema,
        para os dados nunca se misturarem. Guarde a senha do banco que ele pede.</div>

      <div class="sh" style="margin-top:14px"><i class="ti ti-number-2"></i>Crie as tabelas</div>
      <div class="tt" style="line-height:1.75">No menu do projeto, abra <b>SQL Editor → New query</b>,
        cole o script abaixo e clique em <b>Run</b>.</div>
      <div class="brow" style="margin-top:9px">
        <button class="btn gh sm" onclick="nvCopiarSQL()"><i class="ti ti-copy"></i>Copiar o script</button>
        <button class="btn gh sm" onclick="nvBaixarSQL()"><i class="ti ti-download"></i>Baixar como arquivo</button>
        <button class="btn gh sm" onclick="nvVerSQL()"><i class="ti ti-eye"></i>Ver o script</button>
      </div>

      <div class="sh" style="margin-top:14px"><i class="ti ti-number-3"></i>Crie os usuários</div>
      <div class="tt" style="line-height:1.75">Em <b>Authentication → Users → Add user</b>, crie um e-mail e senha
        para você e outro para cada pessoa da equipe. Marque <b>Auto Confirm User</b>.</div>

      <div class="sh" style="margin-top:14px"><i class="ti ti-number-4"></i>Copie o endereço e a chave</div>
      <div class="tt" style="line-height:1.75">Em <b>Project Settings → API</b>, copie o <b>Project URL</b> e a chave
        <b>anon public</b>. Cole aqui ao lado.</div>
    </div></div>

    <div class="card"><div class="hd"><i class="ti ti-plug"></i>Conectar este computador</div><div class="bd">
      <div class="fg"><label>Endereço do projeto <span class="rq">*</span></label>
        <input id="nv-url" placeholder="https://xxxxxxxx.supabase.co" value="${esc(NUVEM.url)}"></div>
      <div class="fg"><label>Chave pública (anon) <span class="rq">*</span></label>
        <textarea id="nv-key" rows="3" placeholder="eyJhbGciOi…" style="font-family:ui-monospace,monospace;font-size:11px">${esc(NUVEM.chave)}</textarea></div>
      <div class="fr2">
        <div class="fg"><label>Seu e-mail de acesso <span class="rq">*</span></label>
          <input id="nv-mail" type="email" placeholder="voce@exemplo.com" value="${esc(NUVEM.email)}"></div>
        <div class="fg"><label>Sua senha <span class="rq">*</span></label>
          <input id="nv-pass" type="password" placeholder="a senha criada no Supabase"></div>
      </div>
      <div class="fg"><label>Nome deste computador</label>
        <input id="nv-nome" placeholder="Ex.: computador do escritório" value="${esc(NUVEM.nome)}"></div>
      <div id="nv-err"></div>
      <button class="btn gn blk" onclick="nvConectar()"><i class="ti ti-cloud-check"></i>Conectar e sincronizar</button>
      <div class="al aw" style="margin-top:12px"><i class="ti ti-shield-lock"></i><div>
        A senha não fica guardada aqui — só o crachá de entrada, que o sistema renova sozinho.
        Se alguém pegar a chave pública, ainda assim não vê nada sem usuário e senha.</div></div>
    </div></div>
  </div>`;
}

async function nvTelaLigada(){
  const r = NV_ULTIMO_RESUMO || {};
  const pend = await nvPendentes();
  let h = `<div class="kg">
    <div class="kc ${r.erro?'rd':'gn'}"><div class="lb"><i class="ti ti-cloud"></i>Situação</div>
      <div class="vl" style="font-size:19px">${r.erro?'Com problema':'Conectada'}</div>
      <div class="sb">${esc(NUVEM.url.replace(/^https?:\/\//,''))}</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-clock"></i>Última sincronização</div>
      <div class="vl" style="font-size:19px">${NUVEM.ultima?dbr(NUVEM.ultima)+' '+String(NUVEM.ultima).slice(11,16):'ainda não'}</div>
      <div class="sb">${NUVEM.auto?'automática a cada 5 minutos':'só quando você mandar'}</div></div>
    <div class="kc ${pend?'am':'gn'}"><div class="lb"><i class="ti ti-upload"></i>Esperando para subir</div>
      <div class="vl" style="font-size:19px">${pend}</div>
      <div class="sb">registro(s) alterados aqui</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-device-desktop"></i>Este aparelho</div>
      <div class="vl" style="font-size:19px">${esc(NUVEM.nome||'Computador')}</div>
      <div class="sb">código ${esc(NUVEM.inst)}</div></div>
  </div>`;

  if(r.erro){
    h += `<div class="al ae"><i class="ti ti-alert-circle"></i><div>
      <b>A última tentativa não deu certo.</b><br>${esc(r.erro)}
      <br><small>Os dados daqui continuam salvos e inteiros. Resolva e sincronize de novo.</small></div></div>`;
  }else if(r.quando){
    h += `<div class="al ag"><i class="ti ti-circle-check"></i><div>
      Na última vez: <b>${r.enviados||0}</b> enviado(s), <b>${r.novos||0}</b> novo(s) recebido(s),
      <b>${r.alterados||0}</b> atualizado(s) e <b>${r.apagados||0}</b> apagado(s).</div></div>`;
  }

  h += `<div class="fr2">
    <div class="card"><div class="hd"><i class="ti ti-settings"></i>Como sincronizar</div><div class="bd">
      <label style="display:flex;gap:11px;align-items:flex-start;cursor:pointer;margin-bottom:14px">
        <input type="checkbox" id="nv-auto" ${NUVEM.auto?'checked':''} onchange="nvTrocarAuto(this.checked)"
          style="width:20px;height:20px;margin-top:2px">
        <span><b>Sincronizar sozinho</b><div class="tt">A cada 5 minutos, e sempre que o sistema abrir.
          Desligue se a internet for cara ou fraca.</div></span></label>
      <div class="brow">
        <button class="btn gn" onclick="nvSincronizar(false)" ${NV_OCUPADO?'disabled':''}>
          <i class="ti ti-refresh"></i>Sincronizar agora</button>
        <button class="btn gh" onclick="nvVerAparelhos()"><i class="ti ti-devices"></i>Ver aparelhos</button>
      </div>
      <div class="divider"></div>
      <div class="tt" style="line-height:1.7">Quem manda é este computador para o que você digita aqui,
        e a nuvem para o que os outros digitaram. Quando dois mexem no mesmo registro,
        fica valendo a alteração mais recente.</div>
    </div></div>

    <div class="card"><div class="hd"><i class="ti ti-download"></i>Trazer tudo da nuvem</div><div class="bd">
      <div class="al ai"><i class="ti ti-device-desktop-plus"></i><div>
        Use isto em um <b>computador novo</b>: conecte com o mesmo usuário e traga toda a base de uma vez.
        O que já existir aqui é mantido — nada é apagado.</div></div>
      <button class="btn bl blk" onclick="nvRestaurar()"><i class="ti ti-cloud-download"></i>Trazer tudo da nuvem</button>
      <div class="divider"></div>
      <div class="al aw"><i class="ti ti-alert-triangle"></i><div>
        A nuvem é uma cópia de conveniência, não substitui o backup. Continue baixando o backup
        <b>.json</b> toda semana pelo botão do banco de dados, no alto da tela.</div></div>
      <button class="btn gh blk" style="margin-top:10px" onclick="nvDesconectar()">
        <i class="ti ti-plug-off"></i>Desconectar este computador</button>
    </div></div>
  </div>`;
  return h;
}

async function nvPendentes(){
  const desde = num(NUVEM.ultimoEnvio);
  let n = 0;
  for(const s of NV_STORES)
    n += (await dbGetAll(s)).filter(r=>!r._gid || num(r._ts)>desde).length;
  n += (await dbGetAll('lixeira')).filter(r=>num(r._ts)>desde).length;
  return n;
}

async function nvConectar(){
  const err = document.getElementById('nv-err');
  const url = val('nv-url').replace(/\/+$/,''), key = val('nv-key'),
        mail = val('nv-mail'), pass = val('nv-pass');
  const falha = m=>{ err.innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>${esc(m)}</div>`; };
  if(!/^https:\/\/.+\..+/.test(url)) return falha('O endereço precisa começar com https:// — copie o Project URL do Supabase.');
  if(key.length < 40) return falha('A chave parece incompleta. Copie a chave "anon public" inteira.');
  if(!mail || !pass)  return falha('Informe o e-mail e a senha que você criou no Supabase.');

  err.innerHTML = `<div class="al ai"><i class="ti ti-loader-2"></i>Conectando…</div>`;
  NUVEM.url=url; NUVEM.chave=key; NUVEM.email=mail; NUVEM.nome=val('nv-nome')||'Computador';
  try{
    await nvEntrar(pass);
    await nvAPI(`/rest/v1/${NV_TABELA}?select=gid&limit=1`);   // confere se as tabelas existem
    await nvGravar();
    nvAgendar();
    toast('Nuvem conectada.');
    await nvSincronizar(false);
    nuvemRender();
  }catch(e){
    NUVEM.url=''; NUVEM.chave=''; NUVEM.email=''; await nvGravar();
    falha(e.message);
  }
}
async function nvTrocarAuto(v){ NUVEM.auto = !!v; await nvGravar(); nvAgendar(); toast(v?'Sincronização automática ligada.':'Sincronização automática desligada.'); }

function nvRestaurar(){
  confirmar('Trazer tudo da nuvem',
    'Vou percorrer todos os registros da nuvem e trazer para cá o que faltar ou estiver mais novo. ' +
    'Nada que existe aqui é apagado. Em uma base grande isso pode levar alguns minutos.',
    async()=>{ NUVEM.ultimaBaixa=''; await nvGravar(); await nvSincronizar(false,true); });
}
function nvDesconectar(){
  confirmar('Desconectar da nuvem',
    'Este computador para de sincronizar. <b>Os dados daqui continuam todos aqui</b>, e a cópia da nuvem também ' +
    'continua lá para os outros aparelhos. Você pode reconectar quando quiser.',
    async()=>{
      if(NV_TIMER) clearInterval(NV_TIMER);
      NUVEM = {...NUVEM, url:'', chave:'', email:'', refresh:'', ultimaBaixa:'', ultimoEnvio:0};
      NV_SESSAO = {token:'',expira:0};
      await nvGravar(); nuvemRender(); toast('Desconectado da nuvem.','aw');
    });
}
async function nvVerAparelhos(){
  try{
    const r = await nvAPI(`/rest/v1/${NV_APARELHO}?select=*&order=visto.desc`);
    const lista = await r.json();
    modal('Aparelhos conectados','ti-devices',
      lista.length ? `<div class="card tw"><div class="bd"><table>
        <thead><tr><th>Aparelho</th><th>Tipo</th><th>Usuário</th><th>Última vez</th></tr></thead><tbody>
        ${lista.map(a=>`<tr><td><b>${esc(a.nome||a.inst)}</b>${a.inst===NUVEM.inst?' <span class="st s-ok">este aqui</span>':''}</td>
          <td>${esc(a.tipo||'—')}</td><td>${esc(a.autor||'—')}</td>
          <td class="n">${dbr(a.visto)} ${String(a.visto||'').slice(11,16)}</td></tr>`).join('')}
        </tbody></table></div></div>`
      : `<div class="empty"><i class="ti ti-devices"></i><b>Nenhum aparelho ainda</b></div>`,
      `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>`,'lg');
  }catch(e){ toast('Não consegui buscar a lista: '+e.message,'ae'); }
}

/* ---------------- o script do banco, embutido ---------------- */
function nvSQL(){
  return `-- JeV Empreendimentos — espaço próprio no Supabase
-- Rode UMA VEZ no projeto NOVO da JeV: SQL Editor -> New query -> Run

create table if not exists public.jev_registros (
  gid         text primary key,
  tabela      text        not null,
  dados       jsonb       not null default '{}'::jsonb,
  excluido    boolean     not null default false,
  atualizado  timestamptz not null default now(),
  aparelho    text,
  autor       text
);
create index if not exists jev_registros_atualizado_idx on public.jev_registros (atualizado);
create index if not exists jev_registros_tabela_idx     on public.jev_registros (tabela);

create or replace function public.jev_marcar_hora()
returns trigger language plpgsql as $$
begin
  new.atualizado := now();
  return new;
end $$;

drop trigger if exists jev_registros_hora on public.jev_registros;
create trigger jev_registros_hora
  before insert or update on public.jev_registros
  for each row execute function public.jev_marcar_hora();

create table if not exists public.jev_aparelhos (
  inst  text primary key,
  nome  text,
  tipo  text,
  autor text,
  visto timestamptz not null default now()
);

alter table public.jev_registros enable row level security;
alter table public.jev_aparelhos enable row level security;

drop policy if exists "jev registros ler"      on public.jev_registros;
drop policy if exists "jev registros gravar"   on public.jev_registros;
drop policy if exists "jev registros alterar"  on public.jev_registros;
drop policy if exists "jev registros apagar"   on public.jev_registros;
create policy "jev registros ler"     on public.jev_registros for select to authenticated using (true);
create policy "jev registros gravar"  on public.jev_registros for insert to authenticated with check (true);
create policy "jev registros alterar" on public.jev_registros for update to authenticated using (true) with check (true);
create policy "jev registros apagar"  on public.jev_registros for delete to authenticated using (true);

drop policy if exists "jev aparelhos ler"     on public.jev_aparelhos;
drop policy if exists "jev aparelhos gravar"  on public.jev_aparelhos;
drop policy if exists "jev aparelhos alterar" on public.jev_aparelhos;
create policy "jev aparelhos ler"     on public.jev_aparelhos for select to authenticated using (true);
create policy "jev aparelhos gravar"  on public.jev_aparelhos for insert to authenticated with check (true);
create policy "jev aparelhos alterar" on public.jev_aparelhos for update to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('jev-arquivos', 'jev-arquivos', false)
on conflict (id) do nothing;

drop policy if exists "jev arquivos ler"     on storage.objects;
drop policy if exists "jev arquivos gravar"  on storage.objects;
drop policy if exists "jev arquivos alterar" on storage.objects;
create policy "jev arquivos ler"     on storage.objects for select to authenticated using (bucket_id = 'jev-arquivos');
create policy "jev arquivos gravar"  on storage.objects for insert to authenticated with check (bucket_id = 'jev-arquivos');
create policy "jev arquivos alterar" on storage.objects for update to authenticated using (bucket_id = 'jev-arquivos') with check (bucket_id = 'jev-arquivos');

create or replace view public.jev_v_resumo as
  select tabela, count(*) filter (where not excluido) as registros, max(atualizado) as ultima_alteracao
    from public.jev_registros group by tabela order by tabela;
`;
}
function nvCopiarSQL(){
  navigator.clipboard.writeText(nvSQL())
    .then(()=>toast('Script copiado — cole no SQL Editor do Supabase.'))
    .catch(()=>nvVerSQL());
}
function nvBaixarSQL(){ baixarArquivo(nvSQL(),'jev-supabase.sql','text/plain;charset=utf-8'); }
function nvVerSQL(){
  modal('Script de preparação do Supabase','ti-database',
    `<div class="tt" style="margin-bottom:9px">Selecione tudo e copie, ou use o botão de baixar.</div>
     <textarea readonly rows="18" style="width:100%;font-family:ui-monospace,monospace;font-size:11px;
       border:1px solid var(--border2);border-radius:10px;padding:11px">${esc(nvSQL())}</textarea>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn gn" onclick="nvBaixarSQL()"><i class="ti ti-download"></i>Baixar</button>`,'lg');
}

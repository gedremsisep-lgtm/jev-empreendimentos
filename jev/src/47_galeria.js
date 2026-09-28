/* =========================================================================
   47_galeria.js — a Midiateca: onde os vídeos da casa ficam para ver.

   POR QUE NÃO GUARDA O VÍDEO DENTRO DO BANCO
   Um vídeo de um minuto em 1920x1080 passa de 10 MB. Gravar isso como
   dataURL dentro do IndexedDB incha o banco, entope a sincronização da
   nuvem (que sobe registro a registro) e trava a tela na hora de abrir.
   Então a regra aqui é: o BANCO guarda a FICHA, o disco guarda o arquivo.

   Isso tem uma consequência honesta, e ela está escrita na tela: a ficha
   sincroniza entre os aparelhos, o arquivo não. Quem abrir a midiateca em
   outro computador vê o vídeo na lista, com todos os dados, e um aviso de
   que o arquivo está na outra máquina.

   No aplicativo o vídeo toca direto do disco. No navegador, sem aplicativo,
   o arquivo precisa ser escolhido na hora — o navegador não deixa uma
   página abrir um caminho do disco sozinha, e isso é proteção, não defeito.
   ========================================================================= */

const GAL_TIPOS = ['Vídeo da obra', 'Vídeo de produto', 'Peça para canal',
                   'Registro de campo', 'Apresentação', 'Outro'];

let GAL = { busca: '', tipo: '', obra: '', tocando: null, temp: {} };

/* ---------- utilidades ---------- */

function galEhVideo(nome){
  return /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(String(nome || ''));
}

function galDuracao(s){
  const n = Math.max(0, Math.round(Number(s) || 0));
  const m = Math.floor(n / 60), r = n % 60;
  return m + ':' + String(r).padStart(2, '0');
}

function galTamanho(b){
  const n = Number(b) || 0;
  if (!n) return '—';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

/* o aplicativo consegue abrir caminho do disco; o navegador não */
function galNoApp(){
  const d = (typeof APP === 'function') ? APP() : null;
  return !!d;
}

/* De onde o <video> vai ler. Três casos, e cada um com um motivo:
   1. o dono acabou de escolher o arquivo nesta sessão -> URL temporária
   2. estamos no aplicativo e a ficha tem caminho       -> lê do disco
   3. nenhum dos dois                                   -> não dá para tocar */
function galFonte(f){
  if (!f) return '';
  if (GAL.temp[f.id]) return GAL.temp[f.id];
  if (f.caminho && galNoApp()) return 'file:///' + String(f.caminho).replace(/\\/g, '/').replace(/^\/+/, '');
  return '';
}

/* ---------- a tela ---------- */

async function galeriaRender(){
  const itens = (await dbGetAll('midiateca')).sort((a, b) =>
    String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
  const obras = await dbGetAll('obras');
  const mapaObra = {}; obras.forEach(o => mapaObra[o.id] = o);

  const filtrados = itens.filter(f => {
    if (GAL.tipo && f.tipo !== GAL.tipo) return false;
    if (GAL.obra && Number(f.obraId) !== Number(GAL.obra)) return false;
    if (GAL.busca){
      const t = (String(f.titulo || '') + ' ' + String(f.descricao || '') + ' ' +
                 String(f.tags || '')).toLowerCase();
      if (!t.includes(GAL.busca.toLowerCase())) return false;
    }
    return true;
  });

  const bytes = itens.reduce((s, f) => s + num(f.bytes), 0);
  const seg = itens.reduce((s, f) => s + num(f.duracao), 0);

  let html = `<div class="ph"><div class="ic"><i class="ti ti-photo-video"></i></div>
    <div><h1>Midiateca</h1><p>Os vídeos da casa, num lugar só</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="galPasta()"><i class="ti ti-folder-open"></i>Abrir a pasta</button>
    <button class="btn" onclick="galForm()"><i class="ti ti-video-plus"></i>Guardar um vídeo</button></div>`;

  html += `<div class="kg">
    <div class="kc bl"><div class="lb"><i class="ti ti-movie"></i>Vídeos</div>
      <div class="vl">${itens.length}</div><div class="sb">${filtrados.length} na lista agora</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-clock-play"></i>Tempo total</div>
      <div class="vl">${galDuracao(seg)}</div><div class="sb">somando todas as peças</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-database"></i>No disco</div>
      <div class="vl">${galTamanho(bytes)}</div><div class="sb">o banco guarda só a ficha</div></div>
  </div>`;

  if (!itens.length){
    html += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-video-off"></i>
      <b>Nenhum vídeo guardado ainda</b>Guarde aqui as peças do Estúdio, os vídeos da obra e o que
      for gravado em campo. A ficha fica no sistema e sincroniza entre os aparelhos; o arquivo
      continua no disco de quem gravou.
      <div class="brow" style="justify-content:center;margin-top:14px">
        <button class="btn" onclick="galForm()"><i class="ti ti-video-plus"></i>Guardar o primeiro</button>
      </div></div></div></div>`;
  } else {
    html += `<div class="card"><div class="bd">
      <div class="fg2">
        <div class="fg"><label>Procurar</label>
          <input id="gal-busca" value="${esc(GAL.busca)}" placeholder="Título, descrição ou etiqueta"
            oninput="GAL.busca=this.value;galeriaRender()"></div>
        <div class="fg"><label>Tipo</label><select onchange="GAL.tipo=this.value;galeriaRender()">
          <option value="">Todos</option>
          ${GAL_TIPOS.map(t => `<option ${GAL.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Obra</label><select onchange="GAL.obra=this.value;galeriaRender()">
          <option value="">Todas</option>
          ${obras.map(o => `<option value="${o.id}" ${Number(GAL.obra) === o.id ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}
        </select></div>
      </div></div></div>`;

    html += `<div class="kg" style="grid-template-columns:repeat(auto-fill,minmax(330px,1fr))">`;
    for (const f of filtrados){
      const fonte = galFonte(f);
      const ob = f.obraId ? mapaObra[f.obraId] : null;
      html += `<div class="card"><div class="bd" style="padding:0;overflow:hidden">
        <div style="position:relative;background:#0f1318;aspect-ratio:16/9;display:flex;
                    align-items:center;justify-content:center">
          ${fonte
            ? `<video src="${esc(fonte)}" controls preload="metadata"
                 style="width:100%;height:100%;object-fit:contain;background:#0f1318"></video>`
            : `<div style="text-align:center;padding:18px">
                 <i class="ti ti-video-off" style="font-size:34px;color:var(--text3)"></i>
                 <div class="tt" style="margin-top:8px;line-height:1.6">O arquivo está em outro
                 aparelho.<br>A ficha veio pela nuvem; o vídeo, não.</div>
                 <button class="btn gh sm" style="margin-top:10px" onclick="galEscolher(${f.id})">
                   <i class="ti ti-folder"></i>Apontar o arquivo</button></div>`}
        </div>
        <div style="padding:13px 15px">
          <div style="font-weight:600;font-size:14.5px;line-height:1.35">${esc(f.titulo || 'Sem título')}</div>
          <div class="tt" style="margin-top:5px">
            ${f.tipo ? esc(f.tipo) : 'Outro'}${f.duracao ? ' · ' + galDuracao(f.duracao) : ''}${f.bytes ? ' · ' + galTamanho(f.bytes) : ''}
            ${ob ? '<br>Obra: ' + esc(ob.nome) : ''}
          </div>
          ${f.descricao ? `<div class="tt" style="margin-top:7px;line-height:1.6">${esc(f.descricao)}</div>` : ''}
          <div class="brow" style="margin-top:11px">
            <button class="ib" title="Editar" onclick="galForm(${f.id})"><i class="ti ti-pencil"></i></button>
            ${f.caminho && galNoApp() ? `<button class="ib" title="Abrir a pasta" onclick="galAbrirPasta(${f.id})"><i class="ti ti-folder-open"></i></button>` : ''}
            <span class="sp"></span>
            <button class="ib" title="Remover da lista" onclick="galDel(${f.id})"><i class="ti ti-trash"></i></button>
          </div>
        </div></div></div>`;
    }
    html += `</div>`;

    if (!galNoApp()){
      html += `<div class="al ai" style="margin-top:14px"><i class="ti ti-info-circle"></i><div>
        Você está vendo o sistema fora do aplicativo. O navegador não deixa uma página abrir um
        arquivo do disco por conta própria — é proteção dele, não defeito daqui. Para tocar um
        vídeo agora, use <b>Apontar o arquivo</b>; no aplicativo instalado ele toca sozinho.</div></div>`;
    }
  }

  document.getElementById('galeria-root').innerHTML = html;
}

/* ---------- guardar e editar a ficha ---------- */

async function galForm(id){
  const f = id ? await dbGet('midiateca', id) : null;
  const obras = await dbGetAll('obras');
  modal(f ? 'Editar o vídeo' : 'Guardar um vídeo', 'ti-video-plus', `
    <div class="fg"><label>Título <span class="rq">*</span></label>
      <input id="gl-tit" value="${esc(f ? f.titulo : '')}" placeholder="Ex.: Loteamento Jardim Água Branca — as 9 etapas em 3D"></div>
    <div class="fg2">
      <div class="fg"><label>Tipo</label><select id="gl-tipo">
        ${GAL_TIPOS.map(t => `<option ${f && f.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select></div>
      <div class="fg"><label>Obra (opcional)</label><select id="gl-obra">
        <option value="">Nenhuma</option>
        ${obras.map(o => `<option value="${o.id}" ${f && Number(f.obraId) === o.id ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}
      </select></div>
    </div>
    <div class="fg"><label>Descrição</label>
      <textarea id="gl-desc" placeholder="O que este vídeo mostra, e para que serve">${esc(f ? f.descricao : '')}</textarea></div>
    <div class="fg"><label>Etiquetas</label>
      <input id="gl-tags" value="${esc(f ? f.tags : '')}" placeholder="separadas por vírgula"></div>
    <div class="drop" onclick="document.getElementById('gl-file').click()">
      <i class="ti ti-video"></i><b id="gl-nome">${f && f.nomeArq ? esc(f.nomeArq) : 'Escolher o arquivo de vídeo'}</b>
      <span class="tt">O arquivo fica no disco. O sistema guarda o caminho, a duração e o tamanho.</span></div>
    <input type="file" id="gl-file" accept="video/*" class="hide" onchange="galArquivo(this)">
    <div id="gl-err"></div>`,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn" onclick="galSalvar(${id || ''})"><i class="ti ti-check"></i>Guardar</button>`);
  window.__GLARQ = f ? {caminho: f.caminho, nomeArq: f.nomeArq, bytes: f.bytes,
                        duracao: f.duracao, largura: f.largura, altura: f.altura} : null;
}

/* lê o arquivo escolhido e tira dele o que o sistema precisa saber */
async function galArquivo(inp){
  const a = inp.files && inp.files[0];
  if (!a) return;
  if (!galEhVideo(a.name)){
    document.getElementById('gl-err').innerHTML =
      `<div class="al ae"><i class="ti ti-alert-circle"></i>Isso não parece um arquivo de vídeo.</div>`;
    return;
  }
  document.getElementById('gl-nome').textContent = a.name + ' (' + galTamanho(a.size) + ')';
  /* a duração e a medida saem do próprio navegador, sem programa de fora */
  const url = URL.createObjectURL(a);
  const v = document.createElement('video');
  v.preload = 'metadata';
  const medidas = await new Promise(res => {
    v.onloadedmetadata = () => res({d: v.duration, w: v.videoWidth, h: v.videoHeight});
    v.onerror = () => res({d: 0, w: 0, h: 0});
    v.src = url;
  });
  window.__GLARQ = {
    /* a.path existe no Electron e é o caminho de verdade; no navegador não
       existe, e aí guardamos só o nome — a ficha vale, o arquivo não toca */
    caminho: a.path || '',
    nomeArq: a.name, bytes: a.size,
    duracao: Math.round(medidas.d || 0), largura: medidas.w, altura: medidas.h,
    urlTemp: url,
  };
  if (!a.path){
    document.getElementById('gl-err').innerHTML =
      `<div class="al aw"><i class="ti ti-alert-triangle"></i>Fora do aplicativo o navegador não
       informa o caminho do arquivo. A ficha será guardada e o vídeo toca nesta sessão; para tocar
       sempre, guarde pelo aplicativo instalado.</div>`;
  }
}

async function galSalvar(id){
  const titulo = val('gl-tit');
  if (!titulo){
    document.getElementById('gl-err').innerHTML =
      `<div class="al ae"><i class="ti ti-alert-circle"></i>Dê um título ao vídeo.</div>`;
    return;
  }
  const a = window.__GLARQ || {};
  const d = {
    titulo, tipo: val('gl-tipo'), descricao: val('gl-desc'), tags: val('gl-tags'),
    obraId: val('gl-obra') ? Number(val('gl-obra')) : null,
    caminho: a.caminho || '', nomeArq: a.nomeArq || '', bytes: num(a.bytes),
    duracao: num(a.duracao), largura: num(a.largura), altura: num(a.altura),
  };
  let novoId = id;
  if (id){
    const velho = await dbGet('midiateca', id);
    await dbPut('midiateca', {...velho, ...d});
  } else {
    d.criadoEm = new Date().toISOString();
    novoId = await dbAdd('midiateca', d);
  }
  /* a URL temporária não cabe no banco, mas serve para tocar já nesta sessão */
  if (a.urlTemp) GAL.temp[novoId] = a.urlTemp;
  window.__GLARQ = null;
  closeModal('mk-form');
  toast('Vídeo guardado na midiateca.');
  galeriaRender();
}

/* apontar o arquivo de uma ficha que veio de outro aparelho */
function galEscolher(id){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'video/*';
  inp.onchange = async () => {
    const a = inp.files && inp.files[0];
    if (!a) return;
    GAL.temp[id] = URL.createObjectURL(a);
    if (a.path){
      const f = await dbGet('midiateca', id);
      await dbPut('midiateca', {...f, caminho: a.path, nomeArq: a.name, bytes: a.size});
    }
    galeriaRender();
  };
  inp.click();
}

function galDel(id){
  confirmar('Tirar da midiateca',
    'A ficha sai do sistema. <b>O arquivo de vídeo no disco não é apagado</b> — só o registro daqui.',
    async () => { await dbDel('midiateca', id); delete GAL.temp[id]; toast('Removido da lista.', 'aw'); galeriaRender(); });
}

async function galAbrirPasta(id){
  const f = await dbGet('midiateca', id);
  const d = (typeof APP === 'function') ? APP() : null;
  if (d && d.estAbrirPasta && f.caminho){ d.estAbrirPasta(f.caminho); return; }
  toast('Isso só funciona dentro do aplicativo.', 'aw');
}

async function galPasta(){
  const d = (typeof APP === 'function') ? APP() : null;
  if (d && d.estAbrirPasta){ d.estAbrirPasta(''); return; }
  toast('A pasta de vídeos só abre pelo aplicativo instalado.', 'aw');
}

/* ---------- a ponte com o Estúdio ----------
   Uma peça montada no Estúdio deve poder ir para a midiateca sem o dono ter
   de procurar o arquivo de novo. */
async function galDoEstudio(caminho, titulo, extras){
  if (!caminho) return null;
  const nome = String(caminho).split(/[\\/]/).pop();
  const id = await dbAdd('midiateca', {
    titulo: titulo || nome, tipo: (extras && extras.tipo) || 'Peça para canal',
    descricao: (extras && extras.descricao) || '', tags: (extras && extras.tags) || '',
    obraId: (extras && extras.obraId) || null,
    caminho, nomeArq: nome, bytes: num(extras && extras.bytes),
    duracao: num(extras && extras.duracao),
    largura: num(extras && extras.largura) || 1920,
    altura: num(extras && extras.altura) || 1080,
    criadoEm: new Date().toISOString(), origem: 'Estúdio',
  });
  return id;
}

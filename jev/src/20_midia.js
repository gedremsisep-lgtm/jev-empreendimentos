/* =========================================================================
   NEGÓCIO: CANAIS E PLATAFORMAS DIGITAIS DE VÍDEO
   ========================================================================= */
let MID_TAB = 'canais';
function midStab(t){ MID_TAB = t; midiaRender(); }

/* Para que serve cada canal. Não é enfeite: é o que decide o que acontece
   quando você clica em postar. Um canal de cortes começa por um link do
   YouTube; um de afiliado começa por um produto e um link que paga.      */
const MID_FINALIDADES = {
  proprio:  { n:'Conteúdo próprio', ic:'ti-video',    cor:'#2D6CDF',
              desc:'Vídeos que você mesmo grava e publica.' },
  cortes:   { n:'Cortes',           ic:'ti-scissors', cor:'#7C4DBE',
              desc:'Pega um vídeo longo e vira vários cortes de um minuto.' },
  afiliado: { n:'Afiliado',         ic:'ti-link',     cor:'#1F7A44',
              desc:'Divulga produtos com o seu link de comissão.' }
};
function midFinalidade(c){
  return MID_FINALIDADES[(c && c.finalidade) || 'proprio'] || MID_FINALIDADES.proprio;
}

async function midiaRender(){
  const root = document.getElementById('midia-root');
  await finLoad();
  const canais = await dbGetAll('canais');
  const videos = await dbGetAll('videos');
  const publicados = videos.filter(v=>v.status==='Publicado');
  const mk = mesAtual();
  const rec = FIN.filter(l=>finVale(l)&&l.un==='midia'&&l.tipo==='receita'&&String(l.data).slice(0,7)===mk).reduce((s,l)=>s+num(l.valor),0);
  const des = FIN.filter(l=>finVale(l)&&l.un==='midia'&&l.tipo==='despesa'&&String(l.data).slice(0,7)===mk).reduce((s,l)=>s+num(l.valor),0);
  const recTot = FIN.filter(l=>finVale(l)&&l.un==='midia'&&l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const insc = canais.reduce((s,c)=>s+num(c.inscritos),0);
  const views = publicados.reduce((s,v)=>s+num(v.views),0);
  const naFila = videos.filter(v=>['Ideia','Roteiro','Gravado','Editado'].includes(v.status));

  let h = `<div class="ph"><div class="ic" style="background:#FBEAE8;color:#C0392B"><i class="ti ti-brand-youtube"></i></div>
    <div><h1>Canais de Vídeo</h1><p>Plataformas digitais, produção de conteúdo e monetização</p></div>
    <div class="sp"></div>
    <button class="btn gh" onclick="midReceita()"><i class="ti ti-cash"></i>Lançar monetização</button>
    <button class="btn rd" onclick="canalForm()"><i class="ti ti-plus"></i>Novo canal</button></div>`;

  h += `<div class="kg" style="margin-bottom:16px">
    <div class="kc rd"><div class="lb"><i class="ti ti-device-tv"></i>Canais</div><div class="vl">${canais.length}</div>
      <div class="sb">${canais.filter(c=>c.monetizado).length} monetizado(s)</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-users"></i>Inscritos</div><div class="vl">${insc.toLocaleString('pt-BR')}</div>
      <div class="sb">somando todos os canais</div></div>
    <div class="kc bl"><div class="lb"><i class="ti ti-eye"></i>Visualizações</div><div class="vl">${views.toLocaleString('pt-BR')}</div>
      <div class="sb">${publicados.length} vídeo(s) publicado(s)</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-trending-up"></i>Receita do mês</div><div class="vl">${moedaK(rec)}</div>
      <div class="sb">${dmesL(mk)}</div></div>
    <div class="kc am"><div class="lb"><i class="ti ti-trending-down"></i>Custo do mês</div><div class="vl">${moedaK(des)}</div>
      <div class="sb">edição, tráfego, equipamentos</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-sum"></i>Receita acumulada</div><div class="vl">${moedaK(recTot)}</div>
      <div class="sb">${views?moeda(recTot/views*1000)+' por mil views':'—'}</div></div>
  </div>`;

  if(naFila.length && MID_TAB==='canais'){
    h += `<div class="al ai"><i class="ti ti-list-check"></i><div><b>Na fila de produção:</b>
      ${['Ideia','Roteiro','Gravado','Editado'].map(s=>{
        const n = naFila.filter(v=>v.status===s).length;
        return n? `${n} em ${s.toLowerCase()}` : null; }).filter(Boolean).join(' · ')}
      <button class="btn xs gh" style="margin-left:8px" onclick="midStab('videos')">Ver pauta</button></div></div>`;
  }

  h += `<div class="tabs">
    <button class="tab ${MID_TAB==='canais'?'on':''}" onclick="midStab('canais')"><i class="ti ti-device-tv"></i>Canais</button>
    <button class="tab ${MID_TAB==='videos'?'on':''}" onclick="midStab('videos')"><i class="ti ti-video"></i>Vídeos e pauta</button>
    <button class="tab ${MID_TAB==='afil'?'on':''}" onclick="midStab('afil')"><i class="ti ti-link"></i>Afiliados</button>
    <button class="tab ${MID_TAB==='gar'?'on':''}" onclick="midStab('gar')"><i class="ti ti-pick"></i>Garimpo</button>
    <button class="tab ${MID_TAB==='cort'?'on':''}" onclick="midStab('cort')"><i class="ti ti-scissors"></i>Cortes</button>
    <button class="tab ${MID_TAB==='gerar'?'on':''}" onclick="midStab('gerar')"><i class="ti ti-wand"></i>Gerar vídeo</button>
    <button class="tab ${MID_TAB==='pub'?'on':''}" onclick="midStab('pub')"><i class="ti ti-send"></i>Publicar</button>
    <button class="tab ${MID_TAB==='plat'?'on':''}" onclick="midStab('plat')"><i class="ti ti-world"></i>Plataformas</button>
    <button class="tab ${MID_TAB==='des'?'on':''}" onclick="midStab('des')"><i class="ti ti-chart-bar"></i>Desempenho</button>
  </div><div id="mid-body"></div>`;
  root.innerHTML = h;

  if(MID_TAB==='canais') await midTabCanais(canais,videos);
  if(MID_TAB==='videos') await midTabVideos(canais,videos);
  if(MID_TAB==='afil')   await midTabAfiliados();
  if(MID_TAB==='gar')    await midTabGarimpo();
  if(MID_TAB==='cort')   await midTabCortes();
  if(MID_TAB==='gerar')  await midTabGerar();
  if(MID_TAB==='pub')    await midTabPublicar();
  if(MID_TAB==='plat')   await midTabPlataformas();
  if(MID_TAB==='des')    await midTabDesempenho(canais,videos);
}

async function midTabCanais(canais,videos){
  const body = document.getElementById('mid-body');
  if(!canais.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-device-tv-off"></i>
      <b>Nenhum canal cadastrado</b>Cadastre seus canais do YouTube, TikTok, Instagram ou Kwai
      para acompanhar inscritos, visualizações e quanto cada um traz de receita.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn rd" onclick="canalForm()"><i class="ti ti-plus"></i>Cadastrar canal</button></div></div></div></div>`;
    return;
  }
  let h = `<div class="mgrid">`;
  canais.forEach(c=>{
    const pi = platInfo(c.plataforma);
    const vs = videos.filter(v=>Number(v.canalId)===Number(c.id));
    const pub = vs.filter(v=>v.status==='Publicado');
    const views = pub.reduce((s,v)=>s+num(v.views),0);
    const rec = finDoRef('canal',c.id,'receita').reduce((s,l)=>s+num(l.valor),0);
    const des = finDoRef('canal',c.id,'despesa').reduce((s,l)=>s+num(l.valor),0);
    h += `<div class="ocard" onclick="canalDetalhe(${c.id})">
      <div class="oh"><div class="oi" style="background:${pi.cor}1A;color:${pi.cor}"><i class="ti ${pi.ic}"></i></div>
        <div style="flex:1;min-width:0"><b style="display:block;font-size:13.5px">${esc(c.nome)}</b>
          <span class="tt"><i class="ti ${midFinalidade(c).ic}" style="color:${midFinalidade(c).cor}"></i>
            ${esc(midFinalidade(c).n)} · ${esc(c.plataforma)}${c.nicho?' · '+esc(c.nicho):''}</span></div>
        ${c.monetizado?'<span class="st s-ok">Monetizado</span>':'<span class="st s-nt">Sem monetização</span>'}</div>
      <div class="ob">
        <div class="row"><span>Inscritos</span><b>${num(c.inscritos).toLocaleString('pt-BR')}</b></div>
        <div class="row"><span>Vídeos publicados</span><b>${pub.length}</b></div>
        <div class="row"><span>Visualizações</span><b>${views.toLocaleString('pt-BR')}</b></div>
        <div class="row"><span>Receita acumulada</span><b style="color:var(--green)">${moedaK(rec)}</b></div>
        <div class="row"><span>Custo acumulado</span><b style="color:var(--red)">${moedaK(des)}</b></div>
        <div class="row"><span>RPM (por mil views)</span><b>${views?moeda(rec/views*1000):'—'}</b></div>
        <div style="border-top:1px solid var(--bg3);margin-top:6px;padding-top:7px;display:flex;justify-content:space-between">
          <span style="font-size:12px;color:var(--text2);font-weight:700">Resultado</span>
          <b style="color:${rec-des>=0?'var(--green)':'var(--red)'}">${moedaK(rec-des)}</b></div>
        <div class="no-print" style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap">
          ${c.finalidade==='cortes'
            ? `<button class="btn sm pu" style="flex:1" onclick="canalIrCortes(${c.id}, event)">
                 <i class="ti ti-scissors"></i>Fazer cortes</button>`
            : c.finalidade==='afiliado'
            ? `<button class="btn sm gn" style="flex:1" onclick="canalIrAfiliado(${c.id}, event)">
                 <i class="ti ti-pick"></i>Garimpar produto</button>`
            : ''}
          <button class="btn sm gn blk" style="flex:1" onclick="postAbrir(${c.id}, event)">
            <i class="ti ti-send"></i>Postar</button></div>
      </div></div>`;
  });
  h += `</div>`;
  body.innerHTML = h;
}
function canalIrCortes(id, ev){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  CORT.canalId = Number(id); CORT.manifesto = null;
  midStab('cort');
}
function canalIrAfiliado(id, ev){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  AFIL_CANAL = Number(id);
  midStab('gar');
}
let AFIL_CANAL = null;

async function canalForm(id){
  const c = id ? await dbGet('canais',id) : null;
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Nome do canal <span class="rq">*</span></label>
        <input id="cn-nome" value="${esc(c?c.nome:'')}" placeholder="Ex.: JeV Construção na Prática"></div>
      <div class="fg"><label>Plataforma</label><select id="cn-plat">
        ${PLATS_VIDEO.map(p=>`<option ${c&&c.plataforma===p.v?'selected':''}>${p.v}</option>`).join('')}</select></div></div>
    <div class="fg"><label>Para que serve este canal</label>
      <div class="chips" id="cn-fins">
        ${Object.entries(MID_FINALIDADES).map(([k,f])=>`<span class="chip ${((c&&c.finalidade)||'proprio')===k?'on':''}"
          data-fin="${k}" onclick="canalFinalidade('${k}')"><i class="ti ${f.ic}"></i> ${f.n}</span>`).join('')}</div>
      <input type="hidden" id="cn-fin" value="${esc((c&&c.finalidade)||'proprio')}">
      <div class="hint" id="cn-finh">${esc(midFinalidade(c).desc)}</div></div>
    <div class="fr3">
      <div class="fg"><label>Nicho / tema</label><input id="cn-nicho" value="${esc(c?c.nicho:'')}" placeholder="Ex.: obras, vida na chácara"></div>
      <div class="fg"><label>Inscritos / seguidores</label><input id="cn-insc" type="number" value="${c?c.inscritos:0}"></div>
      <div class="fg"><label>Início do canal</label><input id="cn-ini" type="date" value="${c?c.dtInicio:hoje()}"></div></div>
    <div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Endereço do canal</label><input id="cn-url" value="${esc(c?c.url:'')}" placeholder="https://"></div>
      <div class="fg"><label style="display:flex;gap:8px;align-items:center;margin-top:22px;cursor:pointer">
        <input type="checkbox" id="cn-mon" ${c&&c.monetizado?'checked':''} style="width:16px;height:16px">Canal monetizado</label></div></div>
    <div class="fg"><label>Endereço exato para postar (opcional)</label>
      <input id="cn-urlp" value="${esc(c&&c.urlPostar?c.urlPostar:'')}" placeholder="https://… a tela de envio deste canal">
      <div class="hint">Se preencher, o botão <b>Postar</b> vai direto para cá, sem adivinhar. Serve para
        quando a plataforma muda de endereço ou quando você administra mais de uma conta.</div></div>
    <div class="fg"><label>Observações (estratégia, frequência de postagem, parcerias)</label><textarea id="cn-obs">${esc(c?c.obs:'')}</textarea></div>
    <div id="cn-err"></div>`;
  modal(id?'Editar canal':'Novo canal','ti-device-tv',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     ${id?`<button class="btn rd" onclick="canalDel(${id})"><i class="ti ti-trash"></i>Excluir</button>`:''}
     <button class="btn gn" onclick="canalSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
}
async function canalSave(id){
  const nome = val('cn-nome');
  if(!nome){ document.getElementById('cn-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o nome do canal.</div>`; return; }
  const d = {nome, plataforma:val('cn-plat'), nicho:val('cn-nicho'), inscritos:num(val('cn-insc')),
             dtInicio:val('cn-ini'), url:val('cn-url'), urlPostar:val('cn-urlp'),
             finalidade:val('cn-fin')||'proprio',
             monetizado:chk('cn-mon'), obs:val('cn-obs')};
  if(id){ const old = await dbGet('canais',id); await dbPut('canais',{...old,...d}); }
  else await dbAdd('canais',d);
  closeModal('mk-form'); toast('Canal salvo.'); midiaRender();
}
function canalFinalidade(k){
  setVal('cn-fin', k);
  const cx = document.getElementById('cn-fins');
  if(cx) Array.from(cx.querySelectorAll('.chip')).forEach(el=>{
    el.classList.toggle('on', el.getAttribute('data-fin')===k);
  });
  const hint = document.getElementById('cn-finh');
  if(hint && MID_FINALIDADES[k]) hint.textContent = MID_FINALIDADES[k].desc;
}
function canalDel(id){
  confirmar('Excluir canal','Os vídeos do canal também serão removidos. O financeiro é mantido.',
    async()=>{
      for(const v of (await dbGetAll('videos')).filter(x=>Number(x.canalId)===Number(id))) await dbDel('videos',v.id);
      await dbDel('canais',id); closeModal('mk-form'); toast('Canal removido.','aw'); midiaRender();
    });
}
async function canalDetalhe(id){
  const c = await dbGet('canais',id);
  const vs = (await dbGetAll('videos')).filter(v=>Number(v.canalId)===Number(id))
               .sort((a,b)=>String(b.dtPub||b.dtPrev).localeCompare(String(a.dtPub||a.dtPrev)));
  const mov = finDoRef('canal',id).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const rec = mov.filter(l=>l.tipo==='receita').reduce((s,l)=>s+num(l.valor),0);
  const des = mov.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+num(l.valor),0);
  const views = vs.filter(v=>v.status==='Publicado').reduce((s,v)=>s+num(v.views),0);
  const b = `<div class="kg" style="margin-bottom:14px">
      <div class="kc pu"><div class="lb">Inscritos</div><div class="vl">${num(c.inscritos).toLocaleString('pt-BR')}</div></div>
      <div class="kc bl"><div class="lb">Visualizações</div><div class="vl">${views.toLocaleString('pt-BR')}</div></div>
      <div class="kc gn"><div class="lb">Receita</div><div class="vl">${moedaK(rec)}</div></div>
      <div class="kc rd"><div class="lb">Custo</div><div class="vl">${moedaK(des)}</div></div></div>
    ${vs.length?`<div class="card tw"><div class="hd"><i class="ti ti-video"></i>Vídeos</div><div class="bd"><table>
      <thead><tr><th>Título</th><th class="c">Situação</th><th class="c">Publicação</th><th class="r">Views</th><th class="r">Receita</th></tr></thead><tbody>
      ${vs.slice(0,25).map(v=>`<tr><td><b>${esc(v.titulo)}</b></td>
        <td class="c"><span class="st ${ST_VIDEO[v.status]||'s-nt'}">${esc(v.status)}</span></td>
        <td class="c n">${dbr(v.dtPub||v.dtPrev)}</td><td class="r n">${num(v.views).toLocaleString('pt-BR')}</td>
        <td class="r n">${moeda(v.receita)}</td></tr>`).join('')}
      </tbody></table></div></div>`:''}
    <div class="card tw"><div class="hd"><i class="ti ti-history"></i>Movimentos financeiros</div><div class="bd"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th></tr></thead><tbody>
      ${mov.slice(0,20).map(l=>`<tr><td class="n">${dbr(l.data)}</td><td>${esc(l.desc)}</td><td class="tt">${esc(l.cat)}</td>
        <td class="r n"><b style="color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${l.tipo==='receita'?'+':'−'} ${moeda(l.valor)}</b></td></tr>`).join('')
        || `<tr><td colspan="4" class="c tt" style="padding:20px">Nenhum movimento</td></tr>`}
      </tbody></table></div></div>`;
  modal(c.nome+' — '+c.plataforma,'ti-device-tv',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Fechar</button>
     <button class="btn gn" onclick="postAbrir(${id})"><i class="ti ti-send"></i>Postar</button>
     <button class="btn rd" onclick="videoForm(null,${id})"><i class="ti ti-video-plus"></i>Novo vídeo</button>
     <button class="btn gn" onclick="midReceita(${id})"><i class="ti ti-cash"></i>Lançar receita</button>
     <button class="btn" onclick="canalForm(${id})"><i class="ti ti-edit"></i>Editar</button>`,'lg');
}

async function midTabVideos(canais,videos){
  const body = document.getElementById('mid-body');
  const mapC = {}; canais.forEach(c=>mapC[c.id]=c);
  if(!canais.length){
    /* sem canal ainda dá para garimpar, ver o prompt e montar o vídeo —
       o canal só faz falta na hora de publicar */
    body.innerHTML = await pautaSecaoHTML() +
      `<div class="card"><div class="hd"><i class="ti ti-video"></i>Pauta e vídeos<span class="sp"></span>
      <button class="btn sm gh" onclick="hggCriarVideo()"><i class="ti ti-user-check"></i>Criar vídeo no Higgsfield</button>
      </div><div class="bd"><div class="empty"><i class="ti ti-video-off"></i>
      <b>Cadastre um canal para publicar</b>O vídeo você já pode montar aqui. O canal é
      necessário só na hora de subir para a plataforma.
      <div class="brow" style="justify-content:center;margin-top:14px">
      <button class="btn rd" onclick="canalForm()"><i class="ti ti-plus"></i>Cadastrar canal</button></div></div></div></div>`;
    return;
  }
  const fases = ['Ideia','Roteiro','Gravado','Editado','Publicado'];
  /* os produtos garimpados vêm primeiro: é neles que o trabalho acontece */
  let h = await pautaSecaoHTML();
  h += `<div class="card"><div class="hd"><i class="ti ti-video"></i>Pauta e vídeos<span class="sp"></span>
      <button class="btn sm gh" onclick="hggCriarVideo()"><i class="ti ti-user-check"></i>Criar vídeo no Higgsfield</button>
      <button class="btn sm rd" onclick="videoForm()"><i class="ti ti-plus"></i>Novo vídeo</button></div><div class="bd">
      <div class="chips">${fases.map(f=>{
        const n = videos.filter(v=>v.status===f).length;
        return `<span class="chip ${n?'on':''}" style="${n?'background:'+(f==='Publicado'?'#1F7A44':'#C0392B'):''}">${f}: ${n}</span>`;
      }).join('')}</div></div></div>`;
  if(!videos.length){
    h += `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-video-off"></i>
      <b>Nenhum vídeo na pauta</b>Anote as ideias, acompanhe a produção e registre as visualizações e a receita de cada vídeo.</div></div></div>`;
  }else{
    h += `<div class="card tw"><div class="bd"><table>
      <thead><tr><th>Título</th><th>Canal</th><th class="c">Situação</th><th class="c">Data</th>
      <th class="r">Views</th><th class="r">Curtidas</th><th class="r">Receita</th><th class="r">RPM</th><th class="c no-print"></th></tr></thead><tbody>`;
    videos.sort((a,b)=>String(b.dtPub||b.dtPrev||'').localeCompare(String(a.dtPub||a.dtPrev||''))).forEach(v=>{
      const c = mapC[v.canalId]||{};
      const rpm = num(v.views)? num(v.receita)/num(v.views)*1000 : 0;
      h += `<tr><td><b>${esc(v.titulo)}</b>${v.tema?`<br><span class="tt">${esc(v.tema)}</span>`:''}</td>
        <td class="tt">${esc(c.nome||'—')}</td>
        <td class="c"><span class="st ${ST_VIDEO[v.status]||'s-nt'}">${esc(v.status)}</span></td>
        <td class="c n tt">${dbr(v.dtPub||v.dtPrev)}</td>
        <td class="r n">${num(v.views).toLocaleString('pt-BR')}</td>
        <td class="r n">${num(v.likes).toLocaleString('pt-BR')}</td>
        <td class="r n">${moeda(v.receita)}</td>
        <td class="r n">${rpm?moeda(rpm):'—'}</td>
        <td class="c no-print nowrap"><button class="ib bl" onclick="videoForm(${v.id})"><i class="ti ti-edit"></i></button>
          <button class="ib rd" onclick="videoDel(${v.id})"><i class="ti ti-trash"></i></button></td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="4">TOTAL — ${videos.length} vídeo(s)</td>
      <td class="r n">${videos.reduce((s,v)=>s+num(v.views),0).toLocaleString('pt-BR')}</td>
      <td class="r n">${videos.reduce((s,v)=>s+num(v.likes),0).toLocaleString('pt-BR')}</td>
      <td class="r n">${moeda(videos.reduce((s,v)=>s+num(v.receita),0))}</td><td colspan="2"></td></tr></tfoot></table></div></div>`;
  }
  body.innerHTML = h;
}
async function videoForm(id,canalId){
  const v = id ? await dbGet('videos',id) : null;
  const canais = await dbGetAll('canais');
  const b = `<div class="fr3">
      <div class="fg" style="grid-column:span 2"><label>Título <span class="rq">*</span></label>
        <input id="vi-tit" value="${esc(v?v.titulo:'')}" placeholder="Título do vídeo"></div>
      <div class="fg"><label>Canal</label><select id="vi-canal">
        ${canais.map(c=>`<option value="${c.id}" ${((v&&Number(v.canalId)===Number(c.id))||Number(canalId)===Number(c.id))?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div></div>
    <div class="fr4">
      <div class="fg"><label>Situação</label><select id="vi-status">
        ${Object.keys(ST_VIDEO).map(s=>`<option ${v&&v.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="fg"><label>Data prevista</label><input id="vi-prev" type="date" value="${v?v.dtPrev:hoje()}"></div>
      <div class="fg"><label>Data de publicação</label><input id="vi-pub" type="date" value="${v?v.dtPub:''}"></div>
      <div class="fg"><label>Duração (min)</label><input id="vi-dur" type="number" step="0.1" value="${v?v.duracao:''}"></div></div>
    <div class="fr4">
      <div class="fg"><label>Visualizações</label><input id="vi-views" type="number" value="${v?v.views:0}" oninput="videoRpm()"></div>
      <div class="fg"><label>Curtidas</label><input id="vi-likes" type="number" value="${v?v.likes:0}"></div>
      <div class="fg"><label>Comentários</label><input id="vi-com" type="number" value="${v?v.comentarios:0}"></div>
      <div class="fg"><label>Inscritos ganhos</label><input id="vi-ganho" type="number" value="${v?v.inscritosGanhos:0}"></div></div>
    <div class="fr3">
      <div class="fg"><label>Receita do vídeo (R$)</label><input id="vi-rec" type="number" step="0.01" value="${v?v.receita:0}" oninput="videoRpm()"></div>
      <div class="fg"><label>Custo de produção (R$)</label><input id="vi-custo" type="number" step="0.01" value="${v?v.custo:0}"></div>
      <div class="fg"><label>RPM (por mil views)</label><input id="vi-rpm" readonly value="—"></div></div>
    <div class="fr2">
      <div class="fg"><label>Tema / assunto</label><input id="vi-tema" value="${esc(v?v.tema:'')}"></div>
      <div class="fg"><label>Link</label><input id="vi-url" value="${esc(v?v.url:'')}" placeholder="https://"></div></div>
    <div class="fg"><label>Roteiro / observações</label><textarea id="vi-obs">${esc(v?v.obs:'')}</textarea></div>
    <div id="vi-err"></div>`;
  modal(id?'Editar vídeo':'Novo vídeo','ti-video',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="videoSave(${id||'null'})"><i class="ti ti-device-floppy"></i>Salvar</button>`);
  videoRpm();
}
function videoRpm(){
  const v = num(val('vi-views')), r = num(val('vi-rec'));
  setVal('vi-rpm', v? moeda(r/v*1000) : '—');
}
async function videoSave(id){
  const t = val('vi-tit');
  if(!t){ document.getElementById('vi-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o título.</div>`; return; }
  const d = {titulo:t, canalId:Number(val('vi-canal')), status:val('vi-status'), dtPrev:val('vi-prev'),
             dtPub:val('vi-pub'), duracao:num(val('vi-dur')), views:num(val('vi-views')),
             likes:num(val('vi-likes')), comentarios:num(val('vi-com')), inscritosGanhos:num(val('vi-ganho')),
             receita:num(val('vi-rec')), custo:num(val('vi-custo')), tema:val('vi-tema'),
             url:val('vi-url'), obs:val('vi-obs')};
  if(id){ const old = await dbGet('videos',id); await dbPut('videos',{...old,...d}); }
  else await dbAdd('videos',d);
  closeModal('mk-form'); toast('Vídeo salvo.'); midiaRender();
}
function videoDel(id){
  confirmar('Excluir vídeo','O registro será removido da pauta.',
    async()=>{ await dbDel('videos',id); toast('Removido.','aw'); midiaRender(); });
}

async function midReceita(canalId){
  const canais = await dbGetAll('canais');
  if(!canais.length){ toast('Cadastre um canal primeiro.','aw'); canalForm(); return; }
  const b = `<div class="al ai"><i class="ti ti-cash"></i><div>Use para registrar o pagamento da plataforma,
      um publipost, patrocínio ou comissão de afiliado.</div></div>
    <div class="fr3">
      <div class="fg"><label>Canal</label><select id="mr-canal">
        ${canais.map(c=>`<option value="${c.id}" ${Number(canalId)===Number(c.id)?'selected':''}>${esc(c.nome)} (${esc(c.plataforma)})</option>`).join('')}</select></div>
      <div class="fg"><label>Fonte da receita</label><select id="mr-fonte">${FONTES_REC.map(f=>`<option>${f}</option>`).join('')}</select></div>
      <div class="fg"><label>Valor (R$)</label><input id="mr-valor" type="number" step="0.01"></div></div>
    <div class="fr3">
      <div class="fg"><label>Competência</label><input id="mr-data" type="month" value="${mesAtual()}"></div>
      <div class="fg"><label>Situação</label><select id="mr-status"><option value="Pago">Já recebido</option><option value="Pendente">A receber</option></select></div>
      <div class="fg"><label>Pagador / anunciante</label><input id="mr-pes"></div></div>
    <div class="fg"><label>Observações</label><input id="mr-obs"></div>
    <div id="mr-err"></div>`;
  modal('Lançar receita de mídia','ti-cash',b,
    `<button class="btn gh" onclick="closeModal('mk-form')">Cancelar</button>
     <button class="btn gn" onclick="midReceitaSave()"><i class="ti ti-check"></i>Lançar</button>`,'sm');
}
async function midReceitaSave(){
  const v = num(val('mr-valor'));
  if(v<=0){ document.getElementById('mr-err').innerHTML = `<div class="al ae"><i class="ti ti-alert-circle"></i>Informe o valor.</div>`; return; }
  const c = await dbGet('canais',val('mr-canal'));
  const mk = val('mr-data');
  const fonte = val('mr-fonte');
  await finAdd({tipo:'receita', un:'midia', refTipo:'canal', refId:c.id, refNome:c.nome+' ('+c.plataforma+')',
    desc:`${fonte} — ${c.nome} (${dmes(mk+'-01')})`, valor:v,
    cat: fonte==='Monetização da plataforma'?'Monetização de vídeos':
         fonte==='Afiliados'?'Comissão e afiliados':'Publicidade e patrocínio',
    data:mk+'-01', venc:mk+'-15', status:val('mr-status'), dtPag: val('mr-status')==='Pago'?hoje():'',
    pessoa:val('mr-pes'), obs:val('mr-obs'), contaId:CFG.contaPadrao||null, auto:true, origem:'Receita de mídia'});
  closeModal('mk-form'); toast('Receita lançada.'); midiaRender();
}

async function midTabDesempenho(canais,videos){
  const body = document.getElementById('mid-body');
  const pub = videos.filter(v=>v.status==='Publicado');
  if(!pub.length){
    body.innerHTML = `<div class="card"><div class="bd"><div class="empty"><i class="ti ti-chart-bar"></i>
      <b>Sem vídeos publicados</b>Registre os vídeos publicados com views e receita para ver o desempenho.</div></div></div>`;
    return;
  }
  const mapC = {}; canais.forEach(c=>mapC[c.id]=c);
  const porCanal = {}, porMes = {};
  pub.forEach(v=>{
    const c = mapC[v.canalId]||{nome:'—',plataforma:'Outra'};
    if(!porCanal[c.nome]) porCanal[c.nome] = {views:0,rec:0,n:0,cor:platInfo(c.plataforma).cor};
    porCanal[c.nome].views += num(v.views); porCanal[c.nome].rec += num(v.receita); porCanal[c.nome].n++;
    const mk = String(v.dtPub||'').slice(0,7);
    if(mk){ if(!porMes[mk]) porMes[mk] = {views:0,rec:0}; porMes[mk].views += num(v.views); porMes[mk].rec += num(v.receita); }
  });
  const meses = Object.keys(porMes).sort();
  const totViews = pub.reduce((s,v)=>s+num(v.views),0);
  const totRec = pub.reduce((s,v)=>s+num(v.receita),0);
  const top = pub.slice().sort((a,b)=>num(b.views)-num(a.views)).slice(0,10);

  let h = `<div class="kg" style="margin-bottom:14px">
    <div class="kc bl"><div class="lb"><i class="ti ti-eye"></i>Views totais</div><div class="vl">${totViews.toLocaleString('pt-BR')}</div>
      <div class="sb">${pub.length} vídeo(s) publicado(s)</div></div>
    <div class="kc pu"><div class="lb"><i class="ti ti-chart-line"></i>Média por vídeo</div>
      <div class="vl">${Math.round(totViews/pub.length).toLocaleString('pt-BR')}</div><div class="sb">visualizações</div></div>
    <div class="kc gn"><div class="lb"><i class="ti ti-cash"></i>Receita dos vídeos</div><div class="vl">${moedaK(totRec)}</div>
      <div class="sb">informada por vídeo</div></div>
    <div class="kc gd"><div class="lb"><i class="ti ti-coin"></i>RPM médio</div>
      <div class="vl">${totViews?moeda(totRec/totViews*1000):'—'}</div><div class="sb">receita por mil visualizações</div></div>
  </div>
  <div class="chg">
    <div class="card"><div class="hd"><i class="ti ti-chart-line"></i>Visualizações por mês</div><div class="bd">
      ${lineChart([{name:'Views',pts:meses.map(m=>porMes[m].views),color:'#C0392B',area:true}],meses.map(m=>dmes(m+'-01')),{h:220})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-chart-pie"></i>Views por canal</div><div class="bd">
      ${donutChart(Object.entries(porCanal).map(([k,v])=>({label:k,val:v.views,color:v.cor})),
        {centerLabel:'VIEWS',centerVal:totViews.toLocaleString('pt-BR')})}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-trophy"></i>Vídeos mais vistos</div><div class="bd">
      ${hbarChart(top.map(v=>({label:v.titulo,val:num(v.views),fmt:num(v.views).toLocaleString('pt-BR')+' views',color:'#C0392B'})))}</div></div>
    <div class="card"><div class="hd"><i class="ti ti-cash"></i>Receita por canal</div><div class="bd">
      ${hbarChart(Object.entries(porCanal).map(([k,v])=>({label:k,val:v.rec,color:v.cor})))}</div></div>
  </div>
  <div class="card tw"><div class="hd"><i class="ti ti-table"></i>Desempenho por canal</div><div class="bd"><table>
    <thead><tr><th>Canal</th><th class="r">Vídeos</th><th class="r">Views</th><th class="r">Média por vídeo</th>
    <th class="r">Receita</th><th class="r">RPM</th></tr></thead><tbody>
    ${Object.entries(porCanal).sort((a,b)=>b[1].views-a[1].views).map(([k,v])=>`<tr>
      <td><b>${esc(k)}</b></td><td class="r n">${v.n}</td><td class="r n">${v.views.toLocaleString('pt-BR')}</td>
      <td class="r n">${Math.round(v.views/v.n).toLocaleString('pt-BR')}</td>
      <td class="r n">${moeda(v.rec)}</td><td class="r n">${v.views?moeda(v.rec/v.views*1000):'—'}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  body.innerHTML = h;
}

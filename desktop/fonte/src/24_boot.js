/* =========================================================================
   INICIALIZAÇÃO
   ========================================================================= */
window.addEventListener('error',e=>{ console.error('Erro global:',e.error||e.message); });

(async function init(){
  try{
    await initDB();
    await seedBase();
    await carregarConfig();
    await finLoad();
    await recGerar(false);
    setU('g');
    await celMarcarBadge();
    celLigarDesktop();
    await nvCarregar();
    nvPintarStatus(nvLigada()?'ok':'off');
    /* por último: confere a versão do sistema (e testa, se acabou de trocar) */
    verIniciar().catch(e=>console.error('atualizações:',e));
  }catch(err){
    console.error(err);
    document.querySelector('.wrap').innerHTML =
      `<div class="al ae" style="margin-top:30px"><i class="ti ti-alert-circle"></i><div>
       <b>Não foi possível iniciar o banco de dados local.</b><br>${esc(err.message||err)}<br><br>
       Isso costuma acontecer quando o navegador está em <b>modo anônimo</b> ou com o armazenamento bloqueado.
       Abra o arquivo em uma janela normal do Chrome, Edge, Firefox ou Safari.</div></div>`;
  }
})();

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    fecharDrops();
    if(typeof celPararCam==='function') celPararCam();
    ['mk-form','mk-conf','mk-print','mk-bkp'].forEach(id=>{
      const m = document.getElementById(id);
      if(m && m.classList.contains('on')) closeModal(id);
    });
  }
  if((e.ctrlKey||e.metaKey) && e.key==='k'){ e.preventDefault(); buscaGlobal(); }
});

/* =========================================================================
   JeV Empreendimentos — service worker
   Guarda o sistema no computador para abrir sem internet e troca de versão
   sozinho: toda abertura com internet já vem na versão mais nova.
   ========================================================================= */
const VERSAO = 'jev-sistema-v1.0.2';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './versao.json',
                  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil((async()=>{
    const c = await caches.open(VERSAO);
    await Promise.allSettled(ARQUIVOS.map(a=>c.add(new Request(a,{cache:'reload'}))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n=>n!==VERSAO).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  if(url.origin!==location.origin) return;

  const ehSistema = req.mode==='navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('versao.json');

  if(ehSistema){
    /* rede primeiro: com internet, abre sempre na versão nova.
       sem internet, abre a última que ficou guardada.            */
    e.respondWith((async()=>{
      try{
        const r = await fetch(req, {cache:'no-store'});
        const c = await caches.open(VERSAO);
        c.put(req, r.clone());
        return r;
      }catch(err){
        return (await caches.match(req)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  e.respondWith((async()=>{
    const guardado = await caches.match(req);
    const rede = fetch(req).then(r=>{ caches.open(VERSAO).then(c=>c.put(req, r.clone())); return r; }).catch(()=>null);
    return guardado || rede || new Response('', {status:504});
  })());
});

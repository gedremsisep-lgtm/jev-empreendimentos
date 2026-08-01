/* =========================================================================
   JeV Mobile — service worker
   Guarda o aplicativo no celular para abrir sem internet e troca de versão
   sozinho quando um arquivo novo é publicado.
   ========================================================================= */
const VERSAO = 'jev-mobile-v1.0.0';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-64.png',
  './versao.json'
];

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

/* HTML e versao.json: tenta a rede primeiro (para pegar atualização);
   o resto: usa o que está guardado e atualiza em segundo plano.        */
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  if(url.origin!==location.origin) return;

  const doHTML = req.mode==='navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('versao.json');

  if(doHTML){
    e.respondWith((async()=>{
      try{
        const r = await fetch(req);
        const c = await caches.open(VERSAO);
        c.put(req, r.clone());
        return r;
      }catch(err){
        const cache = await caches.match(req);
        return cache || caches.match('./index.html');
      }
    })());
    return;
  }

  e.respondWith((async()=>{
    const cache = await caches.match(req);
    const rede = fetch(req).then(r=>{
      caches.open(VERSAO).then(c=>c.put(req, r.clone()));
      return r;
    }).catch(()=>null);
    return cache || rede || new Response('', {status:504});
  })());
});

self.addEventListener('message', e=>{ if(e.data==='atualizar') self.skipWaiting(); });

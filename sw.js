const CACHE='cardvault-complete-v6';
const BASE=new URL('./',self.location.href);
const ASSETS=[new URL('./',self.location.href).href,new URL('./index.html',self.location.href).href,new URL('./static/app.js',self.location.href).href,new URL('./manifest.webmanifest',self.location.href).href,new URL('./static/icon.svg',self.location.href).href];
self.addEventListener('install',event=>{ event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(new URL('./index.html',self.location.href).href))));
});

const CACHE='phonics-helper-v6';
const APP_SHELL=[
  './',
  './index.html',
  './style.css',
  './upgrade.css',
  './ui-20261115-37.css',
  './manifest.webmanifest',
  './icon.svg',
  './master-plan-20261115-35.js',
  './learned-vocabulary.js',
  './mastery-baseline.js',
  './planner.js',
  './storage.js',
  './app.js'
];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
        return response;
      })
      .catch(()=>caches.match(event.request,{ignoreSearch:true}))
  );
});

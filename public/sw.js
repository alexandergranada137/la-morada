/* Public, versioned resources only. Prices, leads, authentication and admin never enter Cache Storage. */
const RELEASE='ed50a1d55559957f';
const CACHE='morada-public-'+RELEASE;
const PAGE_PATHS=new Set(['/','/recorrido','/cotizacion','/contacto','/comunidad','/plano','/privacidad','/cookies','/aviso-legal','/condiciones']);
const normalize=pathname=>pathname.replace(/\.html$/,'').replace(/\/index$/,'/')||'/';
function classify(request){
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||/^\/(?:api(?:\/|$)|admin|sw\.js)/.test(url.pathname)||request.headers.has('Authorization'))return null;
  const path=normalize(url.pathname);
  if(PAGE_PATHS.has(path))return {key:new URL(path,url.origin).href,page:true};
  if(/\.(?:css|js|mjs|json|woff2?|webp|png|jpg|svg|ico)$/i.test(url.pathname)&&!url.pathname.startsWith('/assets/panoramas/'))return {key:url.href,page:false};
  return null;
}
async function store(cache,key,response){
  if(!response.ok||response.status!==200||response.headers.has('Set-Cookie')||/no-store|private/i.test(response.headers.get('Cache-Control')||'')||Number(response.headers.get('Content-Length'))>4*1024*1024)return;
  const headers=new Headers(response.headers);headers.set('X-Morada-Cached-At',String(Date.now()));
  await cache.put(key,new Response(response.clone().body,{status:200,headers}));
}
async function update(cache,key,request){
  const response=await fetch(request,{cache:'no-cache'});
  await store(cache,key,response);
  return response;
}
async function warm(paths){
  const cache=await caches.open(CACHE);
  // Small batches avoid competing with the visitor's foreground requests.
  for(let i=0;i<paths.length;i+=2)await Promise.allSettled(paths.slice(i,i+2).map(async path=>{
    const request=new Request(new URL(path,self.location.origin));const type=classify(request);
    if(type&&!await cache.match(type.key))await update(cache,type.key,request);
  }));
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(name=>name.startsWith('morada-public-')&&name!==CACHE).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const type=classify(event.request);
  if(!type)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(type.key);
    const force=event.request.cache==='reload'||event.request.cache==='no-store';
    if(cached&&!force){
      const age=Date.now()-Number(cached.headers.get('X-Morada-Cached-At')||0);
      if(age>(type.page?60000:86400000))event.waitUntil(update(cache,type.key,event.request).catch(()=>{}));
      return cached;
    }
    const response=await fetch(event.request);
    event.waitUntil(store(cache,type.key,response).then(async()=>{
      const keys=await cache.keys();if(keys.length>150)await Promise.all(keys.slice(0,keys.length-150).map(key=>cache.delete(key)));
    }).catch(()=>{}));
    return response;
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='WARM_PAGES'&&Array.isArray(event.data.paths)){
    const paths=event.data.paths.filter(path=>typeof path==='string'&&PAGE_PATHS.has(normalize(path))).slice(0,4);
    event.waitUntil(warm(paths));
  }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const policy={};
new Function('exports',ts.transpile(fs.readFileSync('lib/cache-policy.ts','utf8'),{module:ts.ModuleKind.CommonJS}))(policy);
for(const path of ['/api/clientes','/api/catalogo','/api/admin','/api/asesores?ref=test','/admin','/admin.html'])assert.match(policy.publicCacheControl(path,'application/json',200),/private, no-store/);
assert.equal(policy.publicCacheControl('/sw.js','text/javascript',200),'no-store');
assert.match(policy.publicCacheControl('/','text/html',200),/max-age=60/);
assert.match(policy.publicCacheControl('/site.js','text/javascript',200),/max-age=300/);
assert.match(policy.publicCacheControl('/logo.webp','image/webp',200),/max-age=86400/);
assert.equal(policy.publicCacheControl('/missing','text/html',404),'no-store');
const handlers=new Map(),buckets=new Map();let calls=0;
const key=request=>typeof request==='string'?request:request.url;
const caches={
  async open(name){if(!buckets.has(name))buckets.set(name,new Map());const entries=buckets.get(name);return {
    async match(request){return entries.get(key(request))?.clone();},
    async put(request,response){entries.set(key(request),response.clone());},
    async keys(){return [...entries.keys()].map(url=>new Request(url));},
    async delete(request){return entries.delete(key(request));}
  };},
  async keys(){return [...buckets.keys()];},async delete(name){return buckets.delete(name);}
};
const self={location:{origin:'https://morada.test'},addEventListener:(type,handler)=>handlers.set(type,handler),skipWaiting:async()=>{},clients:{claim:async()=>{}}};
let fail=false;
const fetch=async request=>{calls++;return new Response('public shell',{status:fail?503:200,headers:{'Content-Type':'text/html','Cache-Control':'public, max-age=60'}});};
vm.runInNewContext(fs.readFileSync('scripts/cache-worker.template.js','utf8').replace('__CACHE_RELEASE__','test-release'),{self,caches,fetch,Request,Response,Headers,URL,Set,Promise,Date});
async function route(url,options){let response;const pending=[];handlers.get('fetch')({request:new Request(url,options),respondWith:p=>response=p,waitUntil:p=>pending.push(p)});const result=await response;await Promise.all(pending);return result;}
for(const [url,options] of [
  ['https://morada.test/api/clientes'],['https://morada.test/api/catalogo'],['https://morada.test/admin'],['https://morada.test/admin.html'],
  ['https://morada.test/admin-tools.js'],['https://third-party.test/pixel.js'],['https://morada.test/cotizacion',{method:'POST'}],
  ['https://morada.test/plano'],['https://morada.test/plano.html'],
  ['https://morada.test/',{headers:{Authorization:'test'}}]
])assert.equal(await route(url,options),undefined,'Sensitive and external requests are never intercepted');
assert.equal(calls,0);
let result=await route('https://morada.test/cotizacion?manzana=D&lote=6&ref=one');assert.equal(await result.text(),'public shell');assert.equal(calls,1);
result=await route('https://morada.test/cotizacion?manzana=E&lote=8&ref=two');assert.equal(await result.text(),'public shell');assert.equal(calls,1,'Repeated navigation is served from real Cache Storage');
await route('https://morada.test/cotizacion',{cache:'reload'});assert.equal(calls,2,'Explicit reload reaches the network');
await route('https://morada.test/vendor/three/three.core.js');await route('https://morada.test/vendor/three/three.core.js');assert.equal(calls,3,'Static assets are reused');
assert.equal(await route('https://morada.test/assets/panoramas/big.jpg'),undefined);
const active=buckets.get('morada-public-test-release');assert.ok([...active.keys()].every(url=>!url.includes('ref=')&&!url.includes('/api/')&&!url.includes('/admin')));
fail=true;await route('https://morada.test/missing.js');assert.ok(!active.has('https://morada.test/missing.js'),'Error responses never poison the cache');
await caches.open('morada-public-old');await caches.open('unrelated-cache');
const waits=[];handlers.get('activate')({waitUntil:p=>waits.push(p)});await Promise.all(waits);
assert.ok(!buckets.has('morada-public-old'));assert.ok(buckets.has('unrelated-cache'));
console.log('PASS: real document/asset reuse, query-safe public shells, fresh private APIs, forced reload, bounded scope, error handling and release invalidation.');

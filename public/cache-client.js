(() => {
  if(location.protocol!=='https:'||/^\/admin/.test(location.pathname))return;
  const paths=new Set(['/','/recorrido','/cotizacion','/contacto','/comunidad','/plano']);
  const normalize=path=>path.replace(/\.html$/,'').replace(/\/index$/,'/')||'/';
  const connection=navigator.connection;
  const mayPrefetch=()=>!connection?.saveData&&!/^(slow-)?2g$/.test(connection?.effectiveType||'')&&!document.hidden;
  let registration;
  const prefetched=new Set();
  let planPrepared=false;
  function warm(path){
    if(!mayPrefetch()||!paths.has(path)||prefetched.has(path)||path===normalize(location.pathname))return;
    prefetched.add(path);
    const worker=navigator.serviceWorker?.controller||registration?.active;
    if(worker)worker.postMessage({type:'WARM_PAGES',paths:[path]});
    else {
      const link=document.createElement('link');link.rel='prefetch';link.as='document';link.href=path;document.head.append(link);
    }
  }
  function linkIntent(event){
    const link=event.target.closest('a[href]');if(!link||link.target||link.hasAttribute('download'))return;
    const url=new URL(link.href);
    if(url.origin===location.origin){
      const path=normalize(url.pathname);
      if(paths.has(path)&&url.pathname.endsWith('.html')){url.pathname=path;link.href=url.href;}
      warm(path);
      if(path==='/recorrido'&&!planPrepared&&mayPrefetch()){
        planPrepared=true;
        for(const href of ['/tour3d.js?v=mobile1','/vendor/three/three.core.js','/vendor/three/three.module.js']){
          const preload=document.createElement('link');preload.rel='modulepreload';preload.href=href;document.head.append(preload);
        }
      }
    }
  }
  function start(){
    // Use the canonical path directly instead of paying for .html redirects on every click.
    for(const link of document.querySelectorAll('a[href]')){
      const url=new URL(link.href),path=normalize(url.pathname);
      if(url.origin===location.origin&&paths.has(path)&&url.pathname.endsWith('.html')){url.pathname=path;link.href=url.href;}
    }
    document.addEventListener('pointerover',linkIntent,{passive:true});
    document.addEventListener('pointerdown',linkIntent,{passive:true});
    document.addEventListener('focusin',linkIntent);
    document.addEventListener('click',linkIntent,{capture:true});
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(value=>{
      registration=value;
      navigator.serviceWorker.ready.then(()=>{
        if(mayPrefetch())(navigator.serviceWorker.controller||registration.active)?.postMessage({type:'WARM_PAGES',paths:['/','/recorrido','/cotizacion','/contacto']});
      });
    }).catch(()=>{});
    // Prefetch HTML after the first paint; leave large videos and 360° photos on demand.
    const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,500));
    idle(()=>{if(mayPrefetch())for(const path of ['/recorrido','/cotizacion','/contacto'])warm(path);},{timeout:2000});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

export const TOUR_KEY='morada-quick-tour-v1';

export function tourPosition(target,card,view){
  const gap=14,pad=12;
  const minX=(view.left||0)+pad,minY=(view.top||0)+pad;
  const maxX=(view.left||0)+view.width-pad-card.width;
  const maxY=(view.top||0)+view.height-pad-card.height;
  const above=target.top-gap-card.height;
  const below=target.bottom+gap;
  const side=below<=maxY?'below':above>=minY?'above':target.top>minY+view.height/2?'above':'below';
  const left=Math.max(minX,Math.min(maxX,target.left+target.width/2-card.width/2));
  return {left,top:Math.max(minY,Math.min(maxY,side==='above'?above:below)),side,arrow:Math.max(22,Math.min(card.width-22,target.left+target.width/2-left))};
}

if(typeof document!=='undefined'){
  const steps=[
    {path:'/recorrido',title:'Encuentra tu lote',text:'Abre el plano, busca por manzana y toca un lote para ver su área, precio y disponibilidad.'},
    {path:'/cotizacion',title:'Cotiza y simula tus cuotas',text:'Elige tu lote y forma de pago. Puedes simular una inicial desde el 30 % y hasta 36 meses. El cupón es opcional.'},
    {path:'/comunidad',title:'Conoce las novedades',text:'Aquí encontrarás avances, noticias y fotografías de los propietarios de La Morada.'},
    {path:'/contacto',title:'Coordina una visita',text:'Solicita una visita al terreno o conversa con el equipo por WhatsApp para resolver tus dudas.'},
  ];
  const phone=matchMedia('(max-width:760px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let card,ring,index=0,active=false,previousFocus,target,frame,motion,startTimer;
  const normalize=path=>path.replace(/\.html$/,'').replace(/\/$/,'').replace(/^\/index$/,'')||'/';
  function seen(){try{return localStorage.getItem(TOUR_KEY)==='1';}catch{return true;}}
  function claim(){try{if(seen())return false;localStorage.setItem(TOUR_KEY,'1');return true;}catch{return false;}}
  function findTarget(){
    const nav=document.querySelector(phone.matches?'.mobile-dock':'.site-header nav');
    return [...(nav?.querySelectorAll('a[href]')||[])].find(link=>normalize(new URL(link.href,location.href).pathname)===steps[index].path);
  }
  function blocked(){return document.hidden||Boolean(document.querySelector('.cookie-banner,dialog[open]'));}
  function position(){
    if(!active)return;
    target=findTarget();
    if(!target){finish(false);return;}
    const rect=target.getBoundingClientRect();
    if(!rect.width||!rect.height){finish(false);return;}
    const visual=window.visualViewport;
    const view={left:visual?.offsetLeft||0,top:visual?.offsetTop||0,width:visual?.width||innerWidth,height:visual?.height||innerHeight};
    card.style.width=Math.max(0,Math.min(320,view.width-24))+'px';
    card.style.maxHeight=Math.max(0,view.height-24)+'px';
    const size=card.getBoundingClientRect(),point=tourPosition(rect,size,view);
    card.style.left=point.left+'px';card.style.top=point.top+'px';card.dataset.side=point.side;
    card.style.setProperty('--tour-arrow',point.arrow+'px');
    for(const [property,value] of Object.entries({left:rect.left-4,top:rect.top-4,width:rect.width+8,height:rect.height+8}))ring.style[property]=value+'px';
    card.style.visibility='visible';
  }
  function schedule(){if(!active)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(position);}
  function show(animate=true){
    motion?.cancel();
    card.querySelector('[data-tour-count]').textContent=(index+1)+' de '+steps.length+' · Guía rápida';
    card.querySelector('h2').textContent=steps[index].title;
    card.querySelector('[data-tour-copy]').textContent=steps[index].text;
    card.querySelector('[data-tour-back]').hidden=index===0;
    card.querySelector('[data-tour-next]').textContent=index===steps.length-1?'Listo':'Siguiente';
    position();
    if(animate&&!reduced.matches&&active)motion=card.animate([{opacity:0,transform:'translateY('+(card.dataset.side==='above'?'4':'-4')+'px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(0.23,1,0.32,1)'});
    card.querySelector('[data-tour-next]').focus({preventScroll:true});
  }
  function finish(restore=true){
    if(!active)return;
    active=false;motion?.cancel();cancelAnimationFrame(frame);
    if(typeof card.hidePopover==='function'&&card.matches(':popover-open'))card.hidePopover();
    card.remove();ring.remove();
    if(restore&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function start(manual=false){
    if(active||blocked())return;
    index=0;if(!findTarget()||(!manual&&!claim()))return;
    if(manual)try{localStorage.setItem(TOUR_KEY,'1');}catch{/* A manual guide still works without storage. */}
    previousFocus=document.activeElement;active=true;
    ring=document.createElement('div');ring.className='morada-tour-ring';ring.setAttribute('aria-hidden','true');
    card=document.createElement('aside');card.className='morada-tour';card.setAttribute('popover','manual');card.setAttribute('role','dialog');card.setAttribute('aria-labelledby','quick-tour-title');card.setAttribute('aria-describedby','quick-tour-copy');card.style.visibility='hidden';
    card.innerHTML='<div class="morada-tour-content" aria-live="polite" aria-atomic="true"><p class="morada-tour-count" data-tour-count></p><h2 id="quick-tour-title"></h2><p id="quick-tour-copy" data-tour-copy></p></div><div class="morada-tour-actions"><button type="button" data-tour-skip>Saltar</button><button type="button" data-tour-back>Atrás</button><button type="button" data-tour-next>Siguiente</button></div>';
    card.querySelector('[data-tour-skip]').onclick=()=>finish();
    card.querySelector('[data-tour-back]').onclick=event=>{if(index>0){index--;show(event.detail!==0);}};
    card.querySelector('[data-tour-next]').onclick=event=>{if(index===steps.length-1)finish();else{index++;show(event.detail!==0);}};
    document.body.append(ring,card);
    if(typeof card.showPopover==='function')card.showPopover();
    show();
  }
  function tryStart(){
    if(active||seen()||blocked()||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
    start();
  }
  function deferStart(){clearTimeout(startTimer);startTimer=setTimeout(tryStart,700);}
  document.addEventListener('keydown',event=>{if(active&&event.key==='Escape'){event.preventDefault();finish();}});
  document.addEventListener('click',event=>{if(active&&event.target.closest('a[href]'))finish(false);});
  document.addEventListener('focusout',deferStart);
  document.addEventListener('visibilitychange',deferStart);
  document.addEventListener('toggle',event=>{if(active&&event.target.matches('dialog[open]'))finish(false);},true);
  window.addEventListener('morada:consent',deferStart);
  window.addEventListener('resize',schedule,{passive:true});window.addEventListener('scroll',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('storage',event=>{if(active&&event.key===TOUR_KEY&&event.newValue==='1')finish();});
  const footer=document.querySelector('.site-footer');
  if(footer){const replay=document.createElement('button');replay.type='button';replay.className='quick-tour-replay';replay.textContent='Ver guía rápida';replay.onclick=()=>start(true);footer.append(replay);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',deferStart,{once:true});else deferStart();
}

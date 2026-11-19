import './video-autoplay.js';

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const heroSelect=document.querySelector('#heroBlockSelect'),heroLink=document.querySelector('#heroExploreBtn');
heroSelect?.addEventListener('change',()=>{
 const block=heroSelect.value;
 heroLink.href=block?`recorrido.html?manzana=${encodeURIComponent(block)}`:'recorrido.html';
});

const tabs=[...document.querySelectorAll('.gallery-tabs [role=tab]')];
let galleryAnimation;
function selectView(tab){
 if(tab.getAttribute('aria-selected')==='true')return;
 galleryAnimation?.cancel();
 for(const item of tabs){
  const active=item===tab;
  item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;
  document.getElementById(item.getAttribute('aria-controls')).hidden=!active;
 }
 const panel=document.getElementById(tab.getAttribute('aria-controls'));
 // Keep the caption and layout stable while the new view comes into focus.
 const media=panel.querySelector("img, video");
 if(!reducedMotion.matches && media){
  galleryAnimation=media.animate([{opacity:.65},{opacity:1}],{duration:220,easing:"ease-out"});
 }
}
for(const [index,tab] of tabs.entries()){
 tab.addEventListener('click',()=>selectView(tab));
 tab.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  let next;
  if(event.key==='ArrowRight')next=(index+1)%tabs.length;
  if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
  if(event.key==='Home')next=0;
  if(event.key==='End')next=tabs.length-1;
  if(next===undefined)return;
  event.preventDefault();tabs[next].focus();selectView(tabs[next]);
 });
}

const dialog=document.querySelector('#terrain-video-dialog'),video=dialog.querySelector('video');
const galleryVideo=document.querySelector('#panel-today video');
const heroVideo=document.querySelector('#hero-background-video');
const heroToggle=document.querySelector('#hero-video-toggle');
let heroInView=true;
let heroWantsPlayback=!reducedMotion.matches;

function syncHeroVideo() {
 if(!heroWantsPlayback || !heroInView || document.hidden || dialog.open){
  heroVideo.pause();
  return;
 }
 if(!heroVideo.getAttribute('src'))heroVideo.src=heroVideo.dataset.src;
 if(heroVideo.paused)heroVideo.play().catch(()=>{
  // The photo stays visible if the browser blocks autoplay.
 });
}

heroToggle.hidden=false;
heroToggle.addEventListener('click',()=>{
 heroWantsPlayback=heroVideo.paused;
 syncHeroVideo();
});
heroVideo.addEventListener('playing',()=>{
 heroVideo.hidden=false;
 heroToggle.textContent='Pausar fondo';
});
heroVideo.addEventListener('pause',()=>{heroToggle.textContent='Reproducir fondo';});
heroVideo.addEventListener('error',()=>{
 heroVideo.hidden=true;
 heroToggle.hidden=true;
});
reducedMotion.addEventListener('change',()=>{
 heroWantsPlayback=!reducedMotion.matches;
 syncHeroVideo();
});
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(([entry])=>{
  heroInView=entry.isIntersecting;
  syncHeroVideo();
 });
 observer.observe(document.querySelector('.hero'));
}else{
 syncHeroVideo();
}

let videoTrigger;
for(const button of document.querySelectorAll('[data-open-terrain]'))button.addEventListener('click',()=>{
 videoTrigger=button;
 galleryVideo?.pause();
 if(!video.getAttribute('src'))video.src=video.dataset.src;
 dialog.showModal();
 syncHeroVideo();
 video.play().catch(()=>{/* Native controls remain available when autoplay is blocked. */});
});
dialog.querySelector('.video-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
dialog.addEventListener('close',()=>{video.pause();syncHeroVideo();videoTrigger?.focus({preventScroll:true});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();syncHeroVideo();});

// Only animate the newly revealed content; summaries respond immediately to input.
for(const detail of document.querySelectorAll('.amenity-card'))detail.addEventListener('toggle',()=>{
 if(!detail.open||reducedMotion.matches)return;
 detail.querySelector('.amenity-card-detail').animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'cubic-bezier(.23,1,.32,1)'});
});

// Read the lowest active price from the same public catalog the explorer uses.
const heroPrice = document.querySelector('#hero-price');
if (heroPrice) {
  fetch('/api/catalogo').then(async response => {
    if (!response.ok) return;
    const { lots } = await response.json();
    let lowest;
    for (const lot of lots ?? []) {
      if (lot.blocked || lot.price?.status !== 'available') continue;
      const amount = lot.price.offer_usd?.total ?? (lot.price.usd_cents == null ? NaN : lot.price.usd_cents / 100);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (!lowest || amount < lowest.amount) lowest = { lot, amount };
    }
    if (!lowest) return;
    const query = new URLSearchParams({
      moneda: 'USD', manzana: lowest.lot.block, lote: lowest.lot.lot,
    });
    heroPrice.textContent = new Intl.NumberFormat('es-PE', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0,
    }).format(lowest.amount);
    document.querySelector('#hero-price-label').textContent = 'Lotes desde';
    document.querySelector('#hero-price-link').href = 'cotizacion.html?' + query;
    query.set('pago', 'cuotas');
    document.querySelector('#hero-initial-link').href = 'cotizacion.html?' + query;
  }).catch(() => {
    // The explorer link stays available when the catalog cannot be loaded.
  });
}

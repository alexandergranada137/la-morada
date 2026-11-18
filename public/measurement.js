// IDs are public configuration. No personal details are sent in analytics events.
let config={},gaLoaded=false,pixelLoaded=false;
const pendingMeta=[],seenLeads=new Set(),seenLots=new Set();let quoteStarted=false;
function metaEvent(name,parameters={},custom=false){
 if(!preferences().marketing)return;
 if(pixelLoaded)window.fbq(custom?'trackCustom':'track',name,parameters);
 else {pendingMeta.push({name,parameters,custom});if(pendingMeta.length>20)pendingMeta.shift();}
}
function preferences(){return window.MoradaConsent?.preferences() || {analytics:false,marketing:false};}
function addScript(src,id){if(document.getElementById(id))return;const script=document.createElement('script');script.async=true;script.src=src;script.id=id;document.head.append(script);}
function applyMeasurement(){
 const consent=preferences();
 if(consent.analytics===true&&/^G-[A-Z0-9]{4,20}$/.test(config.ga4||'')&&!gaLoaded){
   window.dataLayer=window.dataLayer||[];
   window.gtag=function(){window.dataLayer.push(arguments);};
   window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   window.gtag('js',new Date());window.gtag('config',config.ga4,{send_page_view:true,page_location:location.origin+location.pathname,page_referrer:document.referrer?new URL(document.referrer).origin:'',allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:15552000});
   addScript('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(config.ga4),'morada-ga4');gaLoaded=true;
 }
 if(consent.marketing===true&&/^\d{5,25}$/.test(config.pixel||'')&&!pixelLoaded){
   const fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments);};
   fbq.queue=[];fbq.loaded=true;fbq.version='2.0';window.fbq=fbq;window._fbq=fbq;
   fbq('consent','grant');fbq('set','autoConfig',false,config.pixel);fbq('init',config.pixel);fbq('track','PageView');
   addScript('https://connect.facebook.net/en_US/fbevents.js','morada-meta');pixelLoaded=true;
   for(const event of pendingMeta.splice(0))metaEvent(event.name,event.parameters,event.custom);
 }
}
fetch('/api/config').then(r=>r.ok?r.json():{}).then(data=>{config=data.config||{};applyMeasurement();}).catch(()=>{});
window.addEventListener('morada:consent',()=>{
 const consent=preferences();
 if(!consent.analytics&&window.gtag)window.gtag('consent','update',{analytics_storage:'denied'});
 if(!consent.marketing&&window.fbq)window.fbq('consent','revoke');
 if(!consent.marketing)pendingMeta.length=0;
 if((gaLoaded&&!consent.analytics)||(pixelLoaded&&!consent.marketing)){location.reload();return;}
 applyMeasurement();
});
window.addEventListener('morada:lead',event=>{
 const consent=preferences(),detail=event.detail||{};
 const key=detail.requestId;if(key&&seenLeads.has(key))return;if(key)seenLeads.add(key);
 const requestType=['quote','hold','visit'].includes(detail.requestType)?detail.requestType:'quote';
 if(consent.analytics&&gaLoaded)window.gtag('event','generate_lead',{currency:detail.currency});
 metaEvent('Lead',{currency:['PEN','USD'].includes(detail.currency)?detail.currency:'PEN',content_name:requestType==='visit'?'Solicitud de visita':requestType==='hold'?'Solicitud de separación':'Solicitud de cotización'});
 if(requestType==='visit')metaEvent('VisitRequested',{content_name:'Solicitud de visita por coordinar'},true);
});

window.addEventListener('morada:lot-view',event=>{
 if(!preferences().marketing)return;
 const detail=event.detail||{};if(!/^[A-K]-\d{2}$/.test(detail.lotId||''))return;
 const key=detail.lotId;if(seenLots.has(key))return;seenLots.add(key);
 metaEvent('ViewContent',{content_ids:[key],content_name:'Lote '+key,content_type:'product',currency:['PEN','USD'].includes(detail.currency)?detail.currency:'PEN'});
});
document.addEventListener('focusin',event=>{
 if(!preferences().marketing)return;
 if(quoteStarted||!event.target.closest?.('#quoteForm'))return;
 quoteStarted=true;metaEvent('QuoteStarted',{content_name:'Cotización de lote'},true);
});
document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(!link)return;let url;try{url=new URL(link.href,location.href);}catch{return;}
 const method=['wa.me','api.whatsapp.com'].includes(url.hostname)?'WhatsApp':url.protocol==='tel:'?'Teléfono':url.protocol==='mailto:'?'Correo':null;if(!method)return;
 const consent=preferences();if(consent.analytics&&gaLoaded)window.gtag('event','contact',{method});metaEvent('Contact',{content_name:method});
});

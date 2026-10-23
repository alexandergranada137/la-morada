// El plano técnico conserva sus coordenadas CAD. El render usa anclajes visuales independientes.
let mapStyle='render';
const renderAnchors={a:[865,562],b:[435,427],c:[280,475],d:[530,579],e:[817,663],f:[774,775],g:[405,748],h:[456,654],i:[816,848],j:[1092,722],k:[1080,652],parque:[625,704],club:[1055,500],arborizacion:[786,494]};
function updateMapLabel(){
 if(typeof mode!=='undefined'&&mode==='pano')return;
 document.querySelector('#viewLabel').textContent=mapStyle==='render'?'VISTA CENITAL · RENDER CONCEPTUAL':'PLANO REAL · IMPRESION A1';
 document.querySelector('#scale').textContent=mapStyle==='render'?'VISUALIZACIÓN CONCEPTUAL · NO ES UNA FOTO SATELITAL':'FUENTE: IMPRESION A1 · PL-01';
}
function setMapStyle(style){mapStyle=style;buildRealPlan();document.querySelectorAll('[data-map-style]').forEach(b=>{b.classList.toggle('active',b.dataset.mapStyle===style);b.setAttribute('aria-pressed',String(b.dataset.mapStyle===style))});document.querySelectorAll('[data-id]').forEach(el=>el.classList.toggle('selected',el.dataset.id===current.id));}
function buildRealPlan(){
 const parent=document.querySelector('#mapContent');
 const art=mapStyle==='render';
 parent.innerHTML=`<image href="${art?'assets/la-morada-cenital.png':MORADA.planImage}" x="0" y="26.849" width="1000" height="706.302" preserveAspectRatio="none"/>`+MORADA.scenes.map(s=>{const a=renderAnchors[s.id];const x=art?a[0]/1492*1000:s.x,y=art?26.849+a[1]/1054*706.302:s.y;return `<g class="real-zone ${s.type==='manzana'?'block':''}" data-id="${s.id}" tabindex="0" role="button" aria-label="Seleccionar ${s.name}">${!art&&s.polygon?`<polygon class="real-outline" points="${s.polygon.map(p=>p.join(',')).join(' ')}"/>`:''}<circle class="real-pin" cx="${x}" cy="${y}" r="${s.type==='manzana'?11:10}"/><text class="real-letter" x="${x}" y="${y+3.5}" text-anchor="middle">${s.type==='manzana'?s.id.toUpperCase():'↗'}</text><title>${s.name}</title></g>`}).join('');
 document.querySelectorAll('[data-id]').forEach(el=>{el.onclick=()=>select(el.dataset.id);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(el.dataset.id)}}});
 document.querySelector('#map').setAttribute('aria-label',art?'Vista cenital conceptual interactiva de La Morada':'Plano real navegable de La Morada, IMPRESION A1');
 updateMapLabel();
}

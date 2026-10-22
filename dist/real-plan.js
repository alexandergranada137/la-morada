// Renderizado del plano real en las mismas coordenadas que sus marcadores.
function buildRealPlan(){
 const parent=document.querySelector('#mapContent');
 parent.innerHTML=`<image href="${MORADA.planImage}" x="0" y="26.849" width="1000" height="706.302"/>`+MORADA.scenes.map(s=>`<g class="real-zone ${s.type==='manzana'?'block':''}" data-id="${s.id}" tabindex="0" role="button" aria-label="Seleccionar ${s.name}">${s.polygon?`<polygon class="real-outline" points="${s.polygon.map(p=>p.join(',')).join(' ')}"/>`:''}<circle class="real-pin" cx="${s.x}" cy="${s.y}" r="${s.type==='manzana'?10:9}"/><text class="real-letter" x="${s.x}" y="${s.y+3.5}" text-anchor="middle">${s.type==='manzana'?s.id.toUpperCase():'↗'}</text><title>${s.name}</title></g>`).join('');
 document.querySelectorAll('[data-id]').forEach(el=>{el.onclick=()=>select(el.dataset.id);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(el.dataset.id)}}});
}

import { escapeHtml } from './seo';

type PublicLot = {block: string; lot: number; area: number; usd_cents: number | null; status: string};
const saleBlocks = new Set(['A','C','D','E','F','G','H','J','K']);

// This is ordinary visible content for every visitor, including users without WebGL.
export function lotCatalogHtml(rows: PublicLot[]): string {
  const valid=rows.filter(row=>saleBlocks.has(row.block)&&row.status==='available'&&Number.isSafeInteger(row.lot)&&row.lot>0&&Number.isFinite(row.area)&&row.area>0);
  if(!valid.length)return '<p>Consulta las áreas, precios y disponibilidad actualizados en el <a href="/recorrido">plano interactivo</a> o <a href="/contacto">contacta con un asesor</a>.</p>';
  const number=new Intl.NumberFormat('es-PE',{maximumFractionDigits:2});
  const price=new Intl.NumberFormat('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
  const body=valid.map(row=>{
    const amount=Number.isSafeInteger(row.usd_cents)&&row.usd_cents!>0?'US$ '+price.format(row.usd_cents!/100):'Consultar';
    const query=new URLSearchParams({manzana:row.block,lote:String(row.lot),moneda:'USD'});
    return '<tr><th scope="row"><a href="/cotizacion?'+escapeHtml(query.toString())+'">'+escapeHtml(row.block)+' · '+row.lot+'</a></th><td>'+number.format(row.area)+' m²</td><td>'+amount+'</td></tr>';
  }).join('');
  return '<details><summary>Consultar áreas y precios de '+valid.length+' lotes disponibles</summary><div class="catalog-table-scroll" role="region" aria-label="Catálogo de áreas y precios" tabindex="0"><table><caption>La Morada · Precios de lista publicados en dólares</caption><thead><tr><th scope="col">Manzana · Lote</th><th scope="col">Área</th><th scope="col">Precio de lista</th></tr></thead><tbody>'+body+'</tbody></table></div></details><p class="fine">Los importes corresponden al terreno. Las promociones dependen del lote y la forma de pago. Confirma la disponibilidad y las condiciones antes de contratar. <a href="/comprar-terreno-en-cuotas">Cómo calcular la inicial y las cuotas</a>.</p>';
}

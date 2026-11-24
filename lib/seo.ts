// Public pages share the same URL and metadata rules in the Worker and sitemap routes.
export const PUBLIC_PAGES: Record<string, {title: string; description: string; label: string}> = {
  '/': {title:'Terrenos en Uchumayo, Arequipa | La Morada', description:'Conoce los terrenos de La Morada en Uchumayo, Arequipa. Explora el plano 3D, consulta áreas y precios, simula tus cuotas y coordina una visita.', label:'Inicio'},
  '/recorrido': {title:'Plano de lotes y precios en Uchumayo | La Morada', description:'Explora el plano interactivo de La Morada en Uchumayo. Consulta área, precio en dólares o soles y disponibilidad publicada de cada lote.', label:'Plano interactivo'},
  '/plano': {title:'Plano de lotización en Uchumayo, Arequipa | La Morada', description:'Consulta el plano de referencia y la distribución de los lotes de La Morada, en Uchumayo, Arequipa. Continúa al explorador para ver precios y estados.', label:'Plano de referencia'},
  '/cotizacion': {title:'Cotiza tu terreno en Uchumayo y simula cuotas | La Morada', description:'Cotiza un lote de La Morada en dólares o soles. Simula una inicial desde el 30 % y hasta 36 meses; consulta las condiciones con un asesor.', label:'Cotización'},
  '/comprar-terreno-en-cuotas': {title:'Comprar terreno en cuotas: inicial y cálculo | La Morada', description:'Aprende a calcular una inicial del 30 % y mensualidades hasta 36 meses para un terreno en La Morada. Guía del simulador y condiciones que debes consultar.', label:'Comprar en cuotas'},
  '/comunidad': {title:'Novedades, avances y propietarios en Uchumayo | La Morada', description:'Conoce las novedades, los avances publicados, eventos y fotografías de propietarios de La Morada, proyecto de terrenos en Uchumayo, Arequipa.', label:'Novedades y propietarios'},
  '/contacto': {title:'Visita los terrenos en Uchumayo, Arequipa | La Morada', description:'Coordina una visita a La Morada, en la Variante de Uchumayo, Arequipa. Contacta al equipo de Biosfera para consultar lotes, documentación y condiciones.', label:'Contacto y visitas'},
  '/aviso-legal': {title:'Aviso legal | La Morada · Biosfera Inmobiliaria', description:'Identificación y contacto de Biosfera Inmobiliaria S.A.C., RUC 20610186450, responsable del sitio La Morada, y alcance de la información publicada.', label:'Aviso legal'},
  '/privacidad': {title:'Política de privacidad | La Morada', description:'Consulta cómo Biosfera Inmobiliaria S.A.C. trata los datos de las consultas y solicitudes de La Morada y cómo contactar al responsable de privacidad.', label:'Privacidad'},
  '/cookies': {title:'Política de cookies y preferencias | La Morada', description:'Conoce las cookies y servicios de medición de La Morada. Gestiona tu consentimiento para Analytics, Meta y mapas desde las preferencias del sitio.', label:'Cookies'},
  '/condiciones': {title:'Condiciones de cotización y compra | La Morada', description:'Consulta el alcance de las cotizaciones, disponibilidad, simulaciones y solicitudes comerciales de La Morada. Confirma las condiciones antes de contratar.', label:'Condiciones'},
};

export function canonicalPath(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '').replace(/\.html$/, '');
  const normalized = path === '' || path === '/index' ? '/' : path;
  return Object.hasOwn(PUBLIC_PAGES, normalized) ? normalized : null;
}

export function escapeHtml(value: string): string {
  return value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

export function robotsText(origin: string): string {
  return `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;
}

export function sitemapXml(origin: string): string {
  // No invented lastmod dates: URLs change only when public pages are added/removed.
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Object.keys(PUBLIC_PAGES).map(path=>'<url><loc>'+escapeHtml(origin+path)+'</loc></url>').join('')+'</urlset>';
}

export function pageMetadata(origin: string, path: string): string {
  const page = PUBLIC_PAGES[path];
  if (!page) return '';
  const canonical = origin+path;
  const image = origin+'/assets/render-oficial-perspectiva.webp';
  const graph: Record<string, unknown>[] = [
    {'@type':'RealEstateAgent','@id':origin+'/#empresa',name:'BIOSFERA INMOBILIARIA S.A.C.',alternateName:'La Morada',url:origin+'/',telephone:'+51966030329',email:'Biosfera.marketing.di@gmail.com',taxID:'20610186450',image,logo:origin+'/assets/brand/logo-dark.webp',address:{'@type':'PostalAddress',streetAddress:'Calle Lima 100, oficina 608',addressLocality:'Yanahuara',addressRegion:'Arequipa',addressCountry:'PE'},areaServed:{'@type':'Place',name:'Uchumayo, Arequipa, Perú'}},
    {'@type':'WebSite','@id':origin+'/#sitio',url:origin+'/',name:'La Morada',alternateName:'La Morada Uchumayo',inLanguage:'es-PE',publisher:{'@id':origin+'/#empresa'}},
    {'@type':path==='/contacto'?'ContactPage':'WebPage','@id':canonical+'#pagina',url:canonical,name:page.title,description:page.description,inLanguage:'es-PE',isPartOf:{'@id':origin+'/#sitio'},publisher:{'@id':origin+'/#empresa'},...(path==='/'?{}:{breadcrumb:{'@id':canonical+'#ruta'}})},
  ];
  if(path!=='/')graph.push({'@type':'BreadcrumbList','@id':canonical+'#ruta',itemListElement:[{'@type':'ListItem',position:1,name:'La Morada',item:origin+'/'},{'@type':'ListItem',position:2,name:page.label,item:canonical}]});
  return '<link rel="canonical" href="'+escapeHtml(canonical)+'">'+
    '<meta name="robots" content="index,follow,max-image-preview:large">'+
    '<meta property="og:type" content="website"><meta property="og:locale" content="es_PE"><meta property="og:site_name" content="La Morada">'+
    '<meta property="og:title" content="'+escapeHtml(page.title)+'"><meta property="og:description" content="'+escapeHtml(page.description)+'">'+
    '<meta property="og:url" content="'+escapeHtml(canonical)+'"><meta property="og:image" content="'+escapeHtml(image)+'">'+
    '<meta property="og:image:alt" content="Render referencial de La Morada y el valle de Uchumayo">'+
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+escapeHtml(page.title)+'"><meta name="twitter:description" content="'+escapeHtml(page.description)+'">'+
    '<meta name="twitter:image" content="'+escapeHtml(image)+'"><link rel="icon" type="image/webp" href="/assets/brand/logo-dark.webp">'+
    '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':graph}).replaceAll('<','\\u003c')+'</script>';
}

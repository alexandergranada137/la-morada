import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { publicCacheControl } from '../lib/cache-policy';
import { CACHE_RELEASE } from '../lib/cache-release';

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url=new URL(request.url);
    const pages=["","recorrido","plano","cotizacion","comunidad","contacto","aviso-legal","privacidad","cookies","condiciones"];
    if(url.pathname==="/robots.txt")return new Response("User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: "+url.origin+"/sitemap.xml\n",{headers:{"Content-Type":"text/plain; charset=utf-8"}});
    if(url.pathname==="/sitemap.xml")return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(page=>'<url><loc>'+url.origin+'/'+page+'</loc></url>').join('')+'</urlset>',{headers:{"Content-Type":"application/xml; charset=utf-8"}});
    const cacheablePage=request.method==='GET'&&pages.some(page=>url.pathname==='/'+page)&&!request.headers.has('Authorization');
    const cacheKey=new Request(url.origin+url.pathname+'?__morada_release='+CACHE_RELEASE);
    const bypass=/no-cache|no-store/.test(request.headers.get('Cache-Control')||'');
    if(cacheablePage&&!bypass){
      const cached=await caches.default.match(cacheKey);
      if(cached){const hit=new Response(cached.body,cached);hit.headers.set('Cache-Control',publicCacheControl(url.pathname,'text/html',200));hit.headers.set('X-Morada-Page-Cache','HIT');return hit;}
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const assetRequest=url.pathname==='/'||url.pathname.endsWith('.html')||!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/_');
    let response=env.ASSETS&&assetRequest?await env.ASSETS.fetch(request):await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    response=new Response(response.body,response);
    response.headers.set("X-Content-Type-Options","nosniff");
    response.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");
    if(/^\/admin(?:\.html)?\/?$/.test(url.pathname))response.headers.set("X-Robots-Tag","noindex, nofollow");
    response.headers.set('Cache-Control',publicCacheControl(url.pathname,response.headers.get('Content-Type')||'',response.status));
    if(url.pathname==='/sw.js')response.headers.set('Service-Worker-Allowed','/');
    if(response.headers.get("Content-Type")?.includes("text/html")){
      let verification="";
      try{const row=await env.DB.prepare("SELECT value FROM settings WHERE key='site_config'").first<{value:string}>();verification=row?JSON.parse(row.value).verification||"":"";}catch{/* Metadata must not prevent pages loading. */}
      const meta= /^[A-Za-z0-9_-]{10,200}$/.test(verification)?'<meta name="google-site-verification" content="'+verification+'">':"";
      const canonical=url.origin+url.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
      const image=url.origin+'/assets/render-oficial-perspectiva.webp';
      const structured={'@context':'https://schema.org','@type':'RealEstateAgent',name:'BIOSFERA INMOBILIARIA S.A.C.',alternateName:'La Morada',url:url.origin,telephone:'+51966030329',email:'Biosfera.marketing.di@gmail.com',taxID:'20610186450',image,logo:url.origin+'/assets/brand/logo-dark.webp',address:{'@type':'PostalAddress',streetAddress:'Calle Lima 100, oficina 608',addressLocality:'Yanahuara, Arequipa',addressCountry:'PE'}};
      response=new HTMLRewriter().on('title',{element(element){element.onEndTag(end=>{end.after('<meta property="og:title" content="La Morada · Terrenos en Uchumayo, Arequipa">',{html:true});});}}).on('meta[name="description"]',{element(element){const description=element.getAttribute('content')||'';element.after('<meta property="og:description" content="'+description.replaceAll('&','&amp;').replaceAll('"','&quot;')+'">',{html:true});}}).on('head',{element(element){element.append(meta+'<link rel="canonical" href="'+canonical+'"><meta property="og:type" content="website"><meta property="og:locale" content="es_PE"><meta property="og:site_name" content="La Morada"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+image+'"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/webp" href="/assets/brand/logo-dark.webp"><script type="application/ld+json">'+JSON.stringify(structured).replaceAll('<','\\u003c')+'</script>',{html:true});}}).transform(response);
      response.headers.delete('ETag');
    }
    if(cacheablePage&&response.status===200&&response.headers.get('Content-Type')?.includes('text/html')){
      response.headers.set('X-Morada-Page-Cache','MISS');
      const copy=response.clone();copy.headers.set('Cache-Control','public, max-age=120');
      ctx.waitUntil(caches.default.put(cacheKey,copy).catch(()=>{}));
    }
    return response;
  },
};

export default worker;

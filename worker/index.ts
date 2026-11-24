import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { publicCacheControl } from '../lib/cache-policy';
import { CACHE_RELEASE } from '../lib/cache-release';
import { applySecurityHeaders } from '../lib/security-headers';
import { PUBLIC_PAGES, canonicalPath, robotsText, sitemapXml, pageMetadata } from '../lib/seo';
import { lotCatalogHtml } from '../lib/catalog-index';

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url=new URL(request.url);
    if(url.pathname==="/robots.txt")return new Response(robotsText(url.origin),{headers:{"Content-Type":"text/plain; charset=utf-8"}});
    if(url.pathname==="/sitemap.xml")return new Response(sitemapXml(url.origin),{headers:{"Content-Type":"application/xml; charset=utf-8"}});
    const pagePath=canonicalPath(url.pathname);
    if(pagePath&&pagePath!==url.pathname&&(request.method==='GET'||request.method==='HEAD')){
      // Keep referral, campaign and selected-lot parameters while consolidating URL aliases.
      const destination=new URL(url);destination.pathname=pagePath;
      return new Response(null,{status:308,headers:{Location:destination.href,'Cache-Control':'public, max-age=3600'}});
    }
    const cacheablePage=request.method==='GET'&&Object.hasOwn(PUBLIC_PAGES,url.pathname)&&url.pathname!=='/plano'&&!request.headers.has('Authorization');
    const cacheKey=new Request(url.origin+url.pathname+'?__morada_release='+CACHE_RELEASE);
    const bypass=/no-cache|no-store/.test(request.headers.get('Cache-Control')||'');
    if(cacheablePage&&!bypass){
      const cached=await caches.default.match(cacheKey);
      if(cached){const hit=new Response(cached.body,cached);applySecurityHeaders(hit.headers);hit.headers.set('Cache-Control',publicCacheControl(url.pathname,'text/html',200));hit.headers.set('X-Morada-Page-Cache','HIT');return hit;}
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
    applySecurityHeaders(response.headers);
    if(/^\/admin(?:\.html)?\/?$/.test(url.pathname))response.headers.set("X-Robots-Tag","noindex, nofollow");
    if(response.status>=400)response.headers.set('X-Robots-Tag','noindex');
    response.headers.set('Cache-Control',publicCacheControl(url.pathname,response.headers.get('Content-Type')||'',response.status));
    if(url.pathname==='/plano'&&response.status===200)response.headers.set('Cache-Control','public, max-age=0, must-revalidate');
    if(url.pathname==='/sw.js')response.headers.set('Service-Worker-Allowed','/');
    if(response.status===200&&pagePath&&response.headers.get("Content-Type")?.includes("text/html")){
      let verification="";
      try{const row=await env.DB.prepare("SELECT value FROM settings WHERE key='site_config'").first<{value:string}>();verification=row?JSON.parse(row.value).verification||"":"";}catch{/* Metadata must not prevent pages loading. */}
      const meta= /^[A-Za-z0-9_-]{10,200}$/.test(verification)?'<meta name="google-site-verification" content="'+verification+'">':"";
      response=new HTMLRewriter().on('head',{element(element){element.append(meta+pageMetadata(url.origin,pagePath),{html:true});}}).transform(response);
      if(pagePath==='/plano'){
        let catalog=lotCatalogHtml([]);
        try{
          const result=await env.DB.prepare("SELECT block,lot,area,usd_cents,status FROM prices WHERE status='available' AND block NOT IN ('B','I') ORDER BY block,lot LIMIT 200").all<{block:string;lot:number;area:number;usd_cents:number|null;status:string}>();
          catalog=lotCatalogHtml(result.results);
        }catch{/* Keep a usable route to the interactive catalog if the database is unavailable. */}
        response=new HTMLRewriter().on('#public-lot-catalog',{element(element){element.setInnerContent(catalog,{html:true});}}).transform(response);
      }
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

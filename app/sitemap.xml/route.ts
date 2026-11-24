import { sitemapXml } from '../../lib/seo';
export function GET(request:Request){return new Response(sitemapXml(new URL(request.url).origin),{headers:{'Content-Type':'application/xml; charset=utf-8'}});}

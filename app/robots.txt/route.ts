import { robotsText } from '../../lib/seo';
export function GET(request:Request){return new Response(robotsText(new URL(request.url).origin),{headers:{'Content-Type':'text/plain; charset=utf-8'}});}

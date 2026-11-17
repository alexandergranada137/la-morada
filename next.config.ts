import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  async headers(){return [{source:'/admin.html',headers:[
    {key:'Cache-Control',value:'no-store'},
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'same-origin'},
    ...(process.env.NODE_ENV==='production'?[{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"}]:[])
  ]}];}
};
export default nextConfig;

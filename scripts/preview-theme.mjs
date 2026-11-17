import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('public'),source=path.resolve(process.argv[2]||'theme-kit/ejemplo-halloween.morada-theme.json');
const theme=JSON.parse(fs.readFileSync(source,'utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.mp4':'video/mp4','.pdf':'application/pdf'};
http.createServer((req,res)=>{
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/api/config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,config:{theme}}));}
 if(name==='/api/catalogo'||name==='/api/contenido'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(fs.readFileSync(name==='/api/catalogo'?'demo/catalog-snapshot.json':'demo/content-snapshot.json'));}
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(name==='/'?'/index.html':name));}catch{res.writeHead(400);return res.end();}
 if(!file.startsWith(root+path.sep)||path.basename(file).startsWith('admin')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(0,'127.0.0.1',function(){console.log('Vista de prueba sin escrituras: http://127.0.0.1:'+this.address().port+'/index.html');});

import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const source=path.resolve('public'),destination=path.resolve(process.argv[2]||'dist-pages');
if(destination===source||destination.startsWith(source+path.sep))throw new Error('El destino no puede estar dentro de public.');
await mkdir(destination,{recursive:true});
const existing=await readdir(destination);if(existing.length&&!existing.includes('DEMO-MANIFEST.json'))throw new Error('La carpeta ya contiene archivos. Usa una carpeta nueva.');
for(const entry of await readdir(source)){if(entry.startsWith('admin')||entry.endsWith('.map'))continue;await cp(path.join(source,entry),path.join(destination,entry),{recursive:true});}
const catalog=JSON.parse(await readFile('demo/catalog-snapshot.json','utf8')),content=JSON.parse(await readFile('demo/content-snapshot.json','utf8'));
await writeFile(path.join(destination,'catalog-snapshot.json'),JSON.stringify(catalog));await writeFile(path.join(destination,'content-snapshot.json'),JSON.stringify(content));
await cp('demo/theme-snapshot.json',path.join(destination,'theme-snapshot.json'));
await cp('demo/demo.js',path.join(destination,'demo.js'));await cp('demo/demo.css',path.join(destination,'demo.css'));
for(const name of (await readdir(destination)).filter(f=>f.endsWith('.html'))){const target=path.join(destination,name);let html=await readFile(target,'utf8');html=html.replace(/<a class="footer-admin-link" href="admin\.html">[^<]*<\/a>/g,'').replace('<head>','<head><link rel="stylesheet" href="demo.css?v=mobile2"><script src="demo.js"></script>').replace('en tiempo real','del catálogo de referencia');await writeFile(target,html);}
await cp('demo/preview.mjs',path.join(destination,'preview.mjs'));
await cp('demo/ABRIR-DEMO.cmd',path.join(destination,'ABRIR-DEMO.cmd'));
await writeFile(path.join(destination,'.nojekyll'),'');
await writeFile(path.join(destination,'README.md'),'# La Morada — demo de presentación\n\nEsta carpeta contiene únicamente la web de muestra y datos públicos del proyecto. No incluye credenciales, base de datos privada, solicitudes de clientes ni el panel de administración.\n\n## Publicar en GitHub Pages\n\n1. Crea un repositorio y sube el CONTENIDO de esta carpeta; index.html debe quedar en la raíz.\n2. En Settings → Pages selecciona Deploy from a branch, la rama main y /(root).\n3. Guarda y abre la dirección que indique GitHub.\n\nPara probarla en Windows, haz doble clic en ABRIR-DEMO.cmd y deja abierta la ventana mientras la usas. Requiere Node.js; en este equipo también detecta el incluido con Codex. No abras index.html directamente para usar el 3D. En GitHub Pages se abre desde su enlace web.\n\n## Alcance\n\nEl plano, los renders, el video y la navegación son demostrativos. Los formularios están desactivados y no registran solicitudes. La disponibilidad y precios son una fotografía del catálogo a la fecha del manifiesto; deben confirmarse con el equipo. La plataforma completa mantiene su panel y base de datos en un servidor.\n');
const manifest={kind:'la-morada-demo',generated:new Date().toISOString(),catalogDate:catalog.generated,privateDataIncluded:false,formsEnabled:false,adminIncluded:false};await writeFile(path.join(destination,'DEMO-MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log('Demo generada en: '+destination);

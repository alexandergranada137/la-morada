import fs from 'node:fs/promises';
import path from 'node:path';
const source=path.resolve(process.argv[2]||'theme.json'),root=path.dirname(source),theme=JSON.parse((await fs.readFile(source,'utf8')).replace(/^\uFEFF/,''));
if(theme.format!=='la-morada-theme'||theme.version!==1||!/^[-a-z0-9]{1,60}$/.test(theme.id))throw Error('Usa la plantilla la-morada-theme versión 1.');
for(const key of ['hero','banner']){
 const value=theme.images[key];if(!value||value.startsWith('data:image/'))continue;
 const image=path.resolve(root,value);if(!image.startsWith(root+path.sep))throw Error('Las imágenes deben estar dentro de la carpeta del tema.');
 const mime={'.jpg':'jpeg','.jpeg':'jpeg','.png':'png','.webp':'webp'}[path.extname(image).toLowerCase()];if(!mime)throw Error('Usa imágenes JPG, PNG o WebP.');
 const bytes=await fs.readFile(image);if(bytes.length>220000)throw Error('Cada imagen debe pesar como máximo 220 KB. Optimiza a WebP.');
 theme.images[key]='data:image/'+mime+';base64,'+bytes.toString('base64');
}
const output=path.join(root,theme.id+'.morada-theme.json'),json=JSON.stringify(theme,null,2);if(json.length>800000)throw Error('Tema demasiado grande.');await fs.writeFile(output,json);console.log('Archivo listo para importar: '+output);

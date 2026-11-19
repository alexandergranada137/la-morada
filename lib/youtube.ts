export function youtubeUrl(value: unknown): string {
  if(value===undefined||value===null||value==='')return '';
  if(typeof value!=='string'||value.length>500)throw Error('Enlace de YouTube inválido.');
  let url:URL;try{url=new URL(value.trim());}catch{throw Error('Usa un enlace completo de YouTube.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Usa un enlace seguro de YouTube.');
  let id='';
  if(url.hostname==='youtu.be')id=url.pathname.slice(1);
  else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)){
    if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
    else id=url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1]||'';
  }
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw Error('Usa el enlace de un video de YouTube, no de un canal ni una lista.');
  return 'https://www.youtube.com/watch?v='+id;
}

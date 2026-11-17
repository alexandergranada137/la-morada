(() => {
  const dashboard=document.querySelector('#dashboard');
  const panel=document.createElement('aside');
  panel.className='admin-activity';
  panel.setAttribute('aria-label','Avisos del panel');
  panel.innerHTML='<div class="activity-heading"><h2>Actividad del panel</h2><button type="button" class="quiet-button" id="clearActivity">Marcar avisos como leídos</button></div><p id="activityStatus" role="status">Los avisos se actualizan mientras este panel está abierto y visible.</p><ul id="activityItems" aria-label="Últimos avisos"></ul>';
  dashboard.prepend(panel);
  const items=panel.querySelector('ul');
  const status=panel.querySelector('#activityStatus');
  let cursors=null;
  let generation=0;
  let busy=false;
  let controller;
  let unread=0;
  let timer;
  const title=document.title;
  function addNotice(text,section){
    const li=document.createElement('li');
    const button=document.createElement('button');
    button.type='button';button.className='activity-link';button.textContent=text;
    button.onclick=()=>{
      const nav=[...document.querySelectorAll('#adminSections button')].find(button=>button.dataset.panel===section);
      nav?.click();
      if(section==='historyPanel')document.querySelector('#loadHistory').click();
      unread=0;document.title=title;
    };
    li.append(button);items.prepend(li);
    while(items.children.length>15)items.lastElementChild.remove();
    unread++;document.title=`(${unread}) ${title}`;
  }
  async function poll(){
    if(busy||dashboard.hidden||document.hidden)return;
    busy=true;controller=new AbortController();
    const currentGeneration=generation;
    try{
      const query=new URLSearchParams({view:'activity',...(cursors||{})});
      const response=await fetch('/api/admin?'+query,{cache:'no-store',signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||'No se pudieron consultar los avisos.');
      if(dashboard.hidden||currentGeneration!==generation)return;
      const wasInitialized=Boolean(cursors);
      cursors=data.cursors;
      if(wasInitialized){
        for(const lead of data.activity.leads)addNotice('Nueva solicitud de '+lead.name+(lead.advisor_name?' · Asesor '+lead.advisor_name:''),'leadsPanel');
        for(const event of data.activity.events)addNotice(event.event,event.event.startsWith('Asesor')||event.event.includes('asesor')?'advisorsPanel':event.event.startsWith('Solicitud')?'leadsPanel':'securityPanel');
        for(const revision of data.activity.revisions)addNotice('Se actualizaron '+revision.rows+' lotes.','historyPanel');
      }
      status.textContent=unread?`${unread} avisos nuevos. Actualizado a las ${new Date().toLocaleTimeString('es-PE')}.`:'Panel conectado. Recibirás aquí los nuevos clientes y cambios.';
    }catch(error){if(error.name!=='AbortError')status.textContent='No se pudieron actualizar los avisos. Se reintentará automáticamente.';}
    finally{busy=false;}
  }
  function reset(){generation++;clearInterval(timer);controller?.abort();cursors=null;unread=0;items.replaceChildren();document.title=title;}
  function sync(){
    clearInterval(timer);
    if(dashboard.hidden){reset();return;}
    if(document.hidden){controller?.abort();return;}
    poll();timer=setInterval(poll,20000);
  }
  panel.querySelector('#clearActivity').onclick=()=>{unread=0;document.title=title;items.replaceChildren();status.textContent='Avisos marcados como leídos.';};
  new MutationObserver(sync).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('morada:session-expired',reset);
  window.addEventListener('pagehide',reset);
  window.addEventListener('pageshow',sync);
  sync();
})();

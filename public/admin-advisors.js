(() => {
  const panel = document.createElement('section');
  panel.id = 'advisorsPanel';
  panel.hidden = true;
  panel.innerHTML = `
    <h2>Resultados por asesor</h2>
    <div id="advisorKpis" class="referral-kpis"></div>
    <div class="table-wrap"><table class="advisor-report"><caption>Solicitudes registradas por enlace de asesor</caption><thead><tr><th>Asesor</th><th>Solicitudes</th><th>Clientes únicos</th><th>Nuevas</th><th>Contactadas</th><th>Visitas</th><th>Cerradas</th></tr></thead><tbody id="advisorReport"></tbody></table></div>
    <p class="field-help">Cada solicitud cuenta una vez. Clientes únicos se calcula por correo electrónico. Cerrada indica el estado de seguimiento registrado por el equipo.</p>
    <h2>Asesores y enlaces de referidos</h2>
    <p>Crea un enlace por asesor. Cuando el cliente envía una solicitud, queda registrado el asesor que lo invitó. Se conserva el último enlace válido visitado durante 30 días en ese navegador.</p>
    <form id="advisorForm" class="advisor-form">
      <label>Nombre del asesor<input name="name" required maxlength="100" autocomplete="off" placeholder="Nombre y apellido"></label>
      <button class="button" type="submit">Generar enlace de referidos</button>
    </form>
    <p id="advisorStatus" role="status"></p>
    <button id="refreshAdvisors" class="quiet-button" type="button">Actualizar asesores</button>
    <div id="advisorList" class="advisor-list"></div>`;
  document.querySelector('#dashboard').append(panel);
  const form = panel.querySelector('form');
  const status = panel.querySelector('#advisorStatus');
  const list = panel.querySelector('#advisorList');
  const report = panel.querySelector('#advisorReport');
  const kpis = panel.querySelector('#advisorKpis');
  const refresh = panel.querySelector('#refreshAdvisors');
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  async function save(body) {
    const response = await fetch('/api/asesores', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'No se pudo guardar el asesor.');
    return data;
  }
  async function load() {
    refresh.disabled = true;list.setAttribute('aria-busy','true');window.MoradaLoading?.skeleton(list,{count:3});
    try {
      const response = await fetch('/api/asesores', {cache:'no-store'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      report.replaceChildren();
      kpis.replaceChildren();
      const totals=(data.report||[]).reduce((sum,row)=>({requests:sum.requests+row.requests,newClients:sum.newClients+row.new_clients,visits:sum.visits+row.visits,closed:sum.closed+row.closed}),{requests:0,newClients:0,visits:0,closed:0});
      for(const [label,value] of [['Solicitudes',totals.requests],['Nuevas',totals.newClients],['Visitas coordinadas',totals.visits],['Cerradas',totals.closed]]){
        const tile=element('div',undefined,'referral-kpi');tile.append(element('span',label),element('strong',String(value)));kpis.append(tile);
      }
      for(const row of data.report||[]){
        const tr=element('tr');
        tr.append(element('th',row.name+(row.deleted?' · Enlace eliminado':'')));
        for(const [key,label] of [['requests','Solicitudes'],['clients','Clientes únicos'],['new_clients','Nuevas'],['contacted','Contactadas'],['visits','Visitas'],['closed','Cerradas']]){const cell=element('td',String(row[key]));cell.dataset.label=label;tr.append(cell);}
        report.append(tr);
      }
      list.replaceChildren();
      if (!data.items.length) list.append(element('p','Registra tu primer asesor para generar su enlace.'));
      for (const advisor of data.items) {
        const card = element('article',undefined,'advisor-card');
        card.append(element('h3',advisor.name),element('p',`${advisor.active?'Activo':'Desactivado'} · ${advisor.clients} solicitudes · ${advisor.new_clients} nuevas`));
        const url = new URL('/index.html', location.origin);
        url.searchParams.set('ref',advisor.id);
        const label = element('label','Enlace para compartir');
        const input = element('input');
        input.readOnly = true;
        input.value = url.href;
        label.append(input);
        const actions = element('div',undefined,'advisor-actions');
        const copy = element('button','Copiar enlace','button');
        copy.type = 'button';
        copy.disabled = !advisor.active;
        copy.onclick = async () => {
          try { await navigator.clipboard.writeText(url.href); status.textContent='Enlace de '+advisor.name+' copiado.'; }
          catch { input.focus(); input.select(); status.textContent='Selecciona y copia el enlace del asesor.'; }
        };
        const toggle = element('button',advisor.active?'Desactivar enlace':'Reactivar enlace','quiet-button');
        toggle.type = 'button';
        toggle.onclick = async () => {
          toggle.disabled = true;
          try { await save({id:advisor.id,name:advisor.name,active:!advisor.active}); await load(); status.textContent='Enlace '+(advisor.active?'desactivado':'reactivado')+'.'; }
          catch (error) { status.textContent=error.message; toggle.disabled=false; }
        };
        const remove=element('button','Eliminar enlace','quiet-button');
        remove.type='button';
        remove.onclick=async()=>{
          if(!confirm('¿Eliminar el enlace de '+advisor.name+'? Dejará de funcionar; sus clientes y resultados anteriores se conservarán.'))return;remove.disabled=true;
          try{await save({action:'delete',id:advisor.id});await load();status.textContent='Enlace eliminado. Sus solicitudes anteriores se conservan en los resultados.';}
          catch(error){status.textContent=error.message;remove.disabled=false;}
        };
        const options=element('details',undefined,'advisor-options'),summary=element('summary','Enlace y opciones');
        options.append(summary,label,toggle,remove);
        actions.append(copy);
        if(navigator.share){const share=element('button','Compartir','quiet-button');share.type='button';share.disabled=!advisor.active;share.onclick=async()=>{try{await navigator.share({title:'La Morada · '+advisor.name,url:url.href});}catch(error){if(error.name!=='AbortError')status.textContent='No se pudo compartir. Usa Copiar enlace.';}};actions.append(share);}
        card.append(actions,options);
        list.append(card);
      }
    } catch (error) { list.replaceChildren(element('p','No se pudieron cargar los enlaces. Pulsa Actualizar para reintentar.'));status.textContent=error.message || 'No se pudieron cargar los asesores.'; }
    finally { refresh.disabled=false;list.removeAttribute('aria-busy'); }
  }
  form.onsubmit = async event => {
    event.preventDefault();
    const button=form.querySelector('button');
    button.disabled=true;
    try {
      await save({name:form.elements.name.value.trim(),active:true});
      form.reset();
      await load();
      status.textContent='Enlace generado. Usa Copiar enlace para compartirlo con el asesor.';
    } catch (error) { status.textContent=error.message; }
    finally { button.disabled=false; }
  };
  refresh.onclick=load;
  document.addEventListener('admin:section',event=>{if(event.detail==='advisorsPanel')load();});
  window.addEventListener('morada:session-expired',()=>{form.reset();list.replaceChildren();report.replaceChildren();kpis.replaceChildren();status.textContent='';});
})();

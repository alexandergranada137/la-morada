(() => {
  const dashboard = document.querySelector('#dashboard');
  const nav = document.querySelector('#adminSections');
  nav.removeAttribute('style');
  const buttons = [...nav.querySelectorAll('[data-panel]')];
  const primary = ['leadsPanel', 'advisorsPanel', 'inventoryPanel'];
  const names = {leadsPanel:'Clientes', advisorsPanel:'Referidos', inventoryPanel:'Lotes'};
  const more = document.createElement('label');
  more.className = 'admin-more';
  more.append(document.createTextNode('Otras secciones'));
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Otras secciones del panel');
  select.append(new Option('Seleccionar sección', ''));
  for (const button of buttons) {
    if (primary.includes(button.dataset.panel)) button.textContent = names[button.dataset.panel];
    else {
      select.append(new Option(button.textContent, button.dataset.panel));
      button.hidden = true;
    }
  }
  for (const id of primary) nav.append(buttons.find(button => button.dataset.panel === id));
  more.append(select);
  nav.append(more);
  const account = document.createElement('details');
  account.className = 'admin-account';
  const accountSummary = document.createElement('summary');
  accountSummary.textContent = 'Mi sesión';
  account.append(accountSummary, document.querySelector('#logout'));
  document.querySelector('.admin-nav-bar').append(account);
  select.onchange = () => {
    if (select.value) buttons.find(button => button.dataset.panel === select.value)?.click();
  };
  document.addEventListener('admin:section', event => {
    select.value = primary.includes(event.detail) ? '' : event.detail;
    dashboard.dataset.section = event.detail;
  });
  function openWorkspace() {
    if (!dashboard.hidden && !dashboard.dataset.initialized) {
      dashboard.dataset.initialized = 'true';
      buttons.find(button => button.dataset.panel === 'leadsPanel').click();
    }
    document.body.classList.toggle('admin-authenticated', !dashboard.hidden);
    if (dashboard.hidden) delete dashboard.dataset.initialized;
  }
  new MutationObserver(openWorkspace).observe(dashboard, {attributes:true, attributeFilter:['hidden']});

  function disclosure(nodes, title, className) {
    const details = document.createElement('details');
    details.className = className;
    const summary = document.createElement('summary');
    summary.textContent = title;
    details.append(summary, ...nodes);
    return details;
  }
  // Keep the search visible; filters and exports are available on demand.
  const tools = document.querySelector('#leadsPanel .admin-tools');
  const filters = disclosure([...tools.querySelectorAll('select,button')], 'Filtrar y exportar', 'admin-filter-options');
  tools.append(filters);
  const leadHeader = document.createElement('header');
  leadHeader.className = 'workspace-heading';
  const leadsPanel = document.querySelector('#leadsPanel');
  leadHeader.append(leadsPanel.querySelector('h2'), document.querySelector('#loadLeads'));
  leadsPanel.prepend(leadHeader);

  // Referral management comes first; detailed performance follows the links.
  const advisors = document.querySelector('#advisorsPanel');
  const reportTitle = advisors.querySelector('h2');
  const reportTable = advisors.querySelector('.table-wrap');
  const reportHelp = advisors.querySelector('.field-help');
  const report = disclosure([reportTable, reportHelp], 'Ver resultados por asesor', 'advisor-results');
  reportTitle.remove();
  advisors.append(report);
  const advisorHeader = document.createElement('header');
  advisorHeader.className = 'workspace-heading';
  advisorHeader.append(advisors.querySelector('h2'), document.querySelector('#refreshAdvisors'));
  advisors.prepend(advisorHeader);
  document.querySelector('#refreshAdvisors').textContent = 'Actualizar';

  const activity = document.querySelector('.admin-activity');
  const activityDetails = disclosure([...activity.children], 'Avisos del panel', 'activity-disclosure');
  activity.append(activityDetails);
  const status = activity.querySelector('#activityStatus');
  new MutationObserver(() => {
    const count = activity.querySelector('#activityItems').children.length;
    activityDetails.firstElementChild.textContent = count ? `Avisos del panel · ${count} sin leer` : 'Avisos del panel';
  }).observe(status, {childList:true, subtree:true});
  nav.after(activity);

  // Imports and bulk operations no longer dominate the inventory screen.
  const csv = document.querySelector('.csv-import-summary');
  const bulk = document.querySelector('.bulk-bar');
  const upload = document.querySelector('.upload-control');
  const download = document.querySelector('#downloadTemplate');
  const inventoryTools = disclosure([upload, download, csv, bulk], 'Importar archivo y acciones en lote', 'inventory-extra-tools');
  document.querySelector('.admin-controls-card').append(inventoryTools);
  const saveBar = document.querySelector('.save-bar');
  const changeCount = document.querySelector('#changeCount');
  function syncSave() { saveBar.classList.toggle('has-changes', !changeCount.textContent.includes('Sin cambios')); }
  new MutationObserver(syncSave).observe(changeCount, {childList:true, subtree:true});
  syncSave();
  // Visible labels survive conversion of the inventory table to mobile rows.
  const labelInventory = () => {
    for (const row of document.querySelectorAll('#lotRows tr')) {
      [...row.cells].forEach((cell,index) => cell.dataset.label = ['Lote','Área m²','Precio S/','Precio US$','Estado','Cotización'][index]);
    }
  };
  new MutationObserver(labelInventory).observe(document.querySelector('#lotRows'), {childList:true});
  labelInventory();
  openWorkspace();
})();

(() => {
  const header = document.querySelector('.site-header');
  const nav = header?.querySelector('nav');
  if (!nav) return;

  const mobile = matchMedia('(max-width:760px)');
  const homeMain = document.querySelector('.home-page main');
  const homeSections = homeMain ? [...homeMain.children] : [];
  const mobileSections = homeMain ? [
    homeMain.querySelector('.hero'),
    homeMain.querySelector('.home-finder-section'),
    homeMain.querySelector('#espacios'),
    homeMain.querySelector('#miradas'),
    homeMain.querySelector('#detalles'),
    homeMain.querySelector('#elegir'),
    homeMain.querySelector('.home-project-note'),
  ].filter(Boolean) : [];
  const quoteLayout = document.querySelector('.quote-page .form-layout');
  const quoteReferences = [...document.querySelectorAll('.quote-context,.quote-context-note')].map(node => {
    const placeholder = document.createComment('Project reference position');
    node.before(placeholder);
    return {node,placeholder};
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'navigation-toggle';
  toggle.textContent = 'Menú';
  toggle.setAttribute('aria-label', 'Abrir menú');
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-expanded', 'false');

  const dialog = document.createElement('dialog');
  dialog.className = 'mobile-menu-dialog';
  dialog.id = 'mobileMenu';
  dialog.setAttribute('aria-label', 'Menú de La Morada');
  toggle.setAttribute('aria-controls', dialog.id);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'mobile-menu-close';
  close.textContent = 'Cerrar menú';
  dialog.append(close);
  header.insertBefore(toggle, nav);
  header.append(dialog);

  function closeMenu() {
    if (dialog.open) dialog.close();
  }
  toggle.onclick = () => {
    dialog.showModal();
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-menu-open');
  };
  close.onclick = closeMenu;
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest('a')) closeMenu();
  });
  dialog.addEventListener('close', () => {
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-menu-open');
    if (mobile.matches) toggle.focus();
  });
  function syncMenu() {
    closeMenu();
    nav.hidden = false;
    if (mobile.matches) dialog.append(nav);
    else header.insertBefore(nav, dialog);
    if (homeMain) {
      const sections = mobile.matches ? mobileSections : homeSections;
      for (const section of sections) homeMain.append(section);
    }
    for (const reference of quoteReferences) {
      if (mobile.matches && quoteLayout) quoteLayout.append(reference.node);
      else reference.placeholder.after(reference.node);
    }
  }
  syncMenu();
  mobile.addEventListener('change', syncMenu);

  const dock = document.createElement('nav');
  dock.className = 'mobile-dock';
  dock.setAttribute('aria-label', 'Accesos principales');
  const page = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/index';
  for (const [name, href, path] of [
    ['Inicio', 'index.html', '/index'],
    ['Lotes', 'recorrido.html', '/recorrido'],
    ['Cotizar', 'cotizacion.html', '/cotizacion'],
    ['Visita', 'contacto.html', '/contacto'],
  ]) {
    const link = document.createElement('a');
    link.textContent = name;
    link.href = href;
    if (path === page) link.setAttribute('aria-current', 'page');
    if (path === '/cotizacion') link.dataset.mobileQuote = '';
    dock.append(link);
  }
  document.body.append(dock);
  const lotInfo = document.querySelector('#lotInfo');
  if (lotInfo) {
    const updateQuoteLink = () => {
      const quote = lotInfo.querySelector('a.primary');
      dock.querySelector('[data-mobile-quote]').href = quote?.href || 'cotizacion.html';
    };
    new MutationObserver(updateQuoteLink).observe(lotInfo, {childList:true,subtree:true});
    updateQuoteLink();
  }
})();

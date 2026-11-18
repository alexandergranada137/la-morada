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
  // The bottom navigation replaces the mobile menu; desktop keeps the full navigation.
  const filters = document.querySelector('.explorer .filter-disclosure');
  const filterPosition = filters ? document.createComment('Desktop lot search position') : null;
  if (filters) filters.before(filterPosition);
  const scene = document.querySelector('.scene-panel');
  function syncMenu() {
    nav.hidden = mobile.matches;
    if (filters && scene) {
      if (mobile.matches) scene.after(filters);
      else filterPosition.after(filters);
    }
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
  for (const link of nav.querySelectorAll('a[href]')) {
    const path = new URL(link.href).pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/index';
    if (path === page) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
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
  // Secondary destinations remain available without a second menu on mobile.
  const footerNav = document.querySelector('.site-footer nav');
  if (footerNav && !footerNav.querySelector('a[href="comunidad.html"]')) {
    const community = document.createElement('a');community.href='comunidad.html';community.textContent='Comunidad';footerNav.append(community);
  }

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

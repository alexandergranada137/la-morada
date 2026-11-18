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
    ['Comunidad', 'comunidad.html', '/comunidad'],
    ['Visita', 'contacto.html', '/contacto'],
  ]) {
    const link = document.createElement('a');
    const symbols={Inicio:'<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',Lotes:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',Cotizar:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2"/>',Comunidad:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',Visita:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-12 5 2 2 4-4"/>'};
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.7');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');icon.innerHTML=symbols[name]||'';
    const label=document.createElement('span');label.textContent=name;link.append(icon,label);
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

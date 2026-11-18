(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(0.23, 1, 0.32, 1)';
  let keyboard = false;
  let navigationTimer;
  const running = new WeakMap();
  document.addEventListener('keydown', () => { keyboard = true;document.documentElement.dataset.input='keyboard'; }, {capture:true});
  document.addEventListener('pointerdown', () => { keyboard = false;document.documentElement.dataset.input='pointer'; }, {capture:true,passive:true});
  function reveal(node) {
    if (!node || keyboard || reduced.matches) return;
    running.get(node)?.cancel();
    const animation = node.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}], {duration:180,easing:ease});
    running.set(node, animation);
    animation.finished.then(() => running.delete(node), () => {});
  }
  document.addEventListener('admin:section', event => reveal(document.getElementById(event.detail)));
  document.addEventListener('toggle', event => {
    const node = event.target;
    if (!(node instanceof HTMLDetailsElement) || !node.open) return;
    if (CSS.supports('interpolate-size:allow-keywords') && node.matches('.lead-record,.advisor-options,.advisor-results,.admin-filter-options,.activity-disclosure,.inventory-extra-tools')) return;
    for (const child of node.children) if (child.tagName !== 'SUMMARY') reveal(child);
  }, true);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.pathname === location.pathname) return;
    // Navigation stays native: forms, history, referral parameters and downloads retain their behavior.
    document.documentElement.toggleAttribute('data-keyboard-navigation', keyboard);
    try { sessionStorage.setItem('morada-keyboard-navigation', String(keyboard)); } catch {}
    clearTimeout(navigationTimer);
    navigationTimer = setTimeout(() => document.documentElement.classList.add('navigation-pending'), 180);
  });
  function ready() {
    clearTimeout(navigationTimer);
    document.documentElement.classList.remove('navigation-pending');
  }
  addEventListener('pageshow', ready);
  addEventListener('pagehide', ready);
  try {
    if (sessionStorage.getItem('morada-keyboard-navigation') === 'true') document.documentElement.setAttribute('data-keyboard-navigation','');
    sessionStorage.removeItem('morada-keyboard-navigation');
  } catch {}
})();

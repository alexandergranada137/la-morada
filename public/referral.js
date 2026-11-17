(() => {
  const key = 'morada-advisor-referral';
  const duration = 30 * 24 * 60 * 60 * 1000;
  const incoming = new URL(location.href).searchParams.get('ref');
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  if (!saved || saved.expires <= Date.now() || !/^[a-f0-9]{32}$/.test(saved.id)) saved = null;
  let code = /^[a-f0-9]{32}$/.test(incoming || '') ? incoming : saved?.id || '';
  let advisor = null;

  function showAdvisor() {
    for (const node of document.querySelectorAll('[data-referral-advisor]')) {
      node.hidden = !advisor;
      node.textContent = advisor ? 'Tu asesor · ' + advisor.name : '';
    }
  }

  const ready = (async () => {
    if (!code) return;
    try {
      const response = await fetch('/api/asesores?ref=' + encodeURIComponent(code), {cache:'no-store'});
      if (response.status === 404) {
        code = '';
        try { localStorage.removeItem(key); } catch {}
        return;
      }
      if (!response.ok) return;
      const data = await response.json();
      if (!data.advisor || data.advisor.id !== code || typeof data.advisor.name !== 'string') return;
      advisor = data.advisor;
      try {
        localStorage.setItem(key, JSON.stringify({id:code,expires:saved?.id===code?saved.expires:Date.now()+duration}));
      } catch {}
      showAdvisor();
    } catch { /* The server checks the referral again when receiving the request. */ }
  })();

  window.MoradaReferral = {ready, code: () => code, advisor: () => advisor};
  document.addEventListener('DOMContentLoaded', showAdvisor);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !code || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^\/(?:index|recorrido|plano|cotizacion|contacto|comunidad)\.html$|^\/$/.test(url.pathname)) return;
    url.searchParams.set('ref', code);
    link.href = url.href;
  });
})();

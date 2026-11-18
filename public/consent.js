(() => {
  const key = 'morada-consent';
  const version = 2;
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  let choice = readChoice();
  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value?.version === version && value.expires > Date.now()) return value;
    } catch {}
    return {analytics:false,marketing:false};
  }
  function clearCookies(category) {
    const names = document.cookie.split(';').map(item => item.trim().split('=')[0]);
    const matches = name => category === 'analytics' ? /^_ga(?:_|$)|^_gid$|^_gat/.test(name) : /^_fbp$|^_fbc$/.test(name);
    const domains = location.hostname.split('.');
    for (const name of names.filter(matches)) {
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      for (let i=0;i<domains.length-1;i++) {
        document.cookie = name + '=; Max-Age=0; path=/; domain=.' + domains.slice(i).join('.') + '; SameSite=Lax';
      }
    }
  }
  function save(analytics, marketing) {
    choice = {version,analytics,marketing,updated:new Date().toISOString(),expires:Date.now()+lifetime};
    try { localStorage.setItem(key,JSON.stringify(choice)); } catch {}
    if (!analytics) clearCookies('analytics');
    if (!marketing) clearCookies('marketing');
    window.dispatchEvent(new Event('morada:consent'));
    banner.remove();
  }
  window.MoradaConsent = {preferences:() => choice};
  if (!choice.analytics) clearCookies('analytics');
  if (!choice.marketing) clearCookies('marketing');
  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label','Preferencias de cookies');
  banner.innerHTML = '<h2>Tú eliges las cookies</h2><p>Usamos almacenamiento esencial para el sitio. Con tu permiso, Google Analytics mide las visitas y Meta Pixel mide campañas publicitarias. Puedes aceptar, rechazar o elegir por categoría.</p><a href="cookies.html">Leer política de cookies</a><div class="cookie-actions"><button type="button" data-choice="reject">Rechazar opcionales</button><button type="button" data-choice="custom">Configurar</button><button type="button" data-choice="accept">Aceptar opcionales</button></div>';
  banner.querySelector('[data-choice="reject"]').onclick = () => save(false,false);
  banner.querySelector('[data-choice="accept"]').onclick = () => save(true,true);
  banner.querySelector('[data-choice="custom"]').onclick = openPreferences;
  function openPreferences() {
    if (document.querySelector('#cookiePreferences')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'cookiePreferences';
    dialog.className = 'privacy-dialog';
    dialog.setAttribute('aria-labelledby','privacy-title');
    dialog.innerHTML = '<h2 id="privacy-title">Preferencias de cookies</h2><p>Las cookies opcionales están desactivadas hasta que las autorices. Puedes cambiar tu elección en cualquier momento.</p><p><strong>Esenciales · Siempre activas</strong><br>Seguridad, sesión del administrador y preferencias del sitio.</p><label><input name="analytics" type="checkbox"> Analítica · Google Analytics</label><p>Estadísticas de navegación y solicitudes, si se configura la cuenta.</p><label><input name="marketing" type="checkbox"> Publicidad · Meta Pixel</label><p>Medición de campañas y conversiones, si se configura la cuenta.</p><a href="cookies.html">Consultar proveedores y duraciones</a><div class="cookie-actions"><button type="button" data-save>Guardar selección</button><button type="button" data-reject>Rechazar opcionales</button><button type="button" data-close>Cerrar sin cambiar</button></div>';
    dialog.querySelector('[name="analytics"]').checked = choice.analytics;
    dialog.querySelector('[name="marketing"]').checked = choice.marketing;
    dialog.querySelector('[data-save]').onclick = () => {save(dialog.querySelector('[name="analytics"]').checked,dialog.querySelector('[name="marketing"]').checked);dialog.close();};
    dialog.querySelector('[data-reject]').onclick = () => {save(false,false);dialog.close();};
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('close',() => dialog.remove(),{once:true});
    document.body.append(dialog);
    dialog.showModal();
  }
  document.querySelectorAll('[data-load-map]').forEach(button => {
    button.onclick = () => {
      const container=button.closest('.map-consent');
      container.replaceWith(container.querySelector('template').content.cloneNode(true));
    };
  });
  const footer = document.querySelector('footer') || document.body;
  const legalLinks=document.createElement('nav');
  legalLinks.className='legal-footer-links';
  legalLinks.setAttribute('aria-label','Información legal y cookies');
  for (const [text,href] of [['Aviso legal','aviso-legal.html'],['Privacidad','privacidad.html'],['Cookies','cookies.html'],['Condiciones','condiciones.html']]) {
    if (footer.querySelector('a[href="'+href+'"]')) continue;
    const link = document.createElement('a');
    link.href = href;link.textContent = text;legalLinks.append(link);
  }
  const button = document.createElement('button');
  button.type = 'button';button.className = 'quiet-button';button.textContent = 'Configurar cookies';button.onclick = openPreferences;
  legalLinks.append(button);
  footer.append(legalLinks);
  if (!choice.version) document.body.append(banner);
  window.addEventListener('storage',event => {
    if (event.key !== key) return;
    choice = readChoice();
    if (!choice.analytics) clearCookies('analytics');
    if (!choice.marketing) clearCookies('marketing');
    window.dispatchEvent(new Event('morada:consent'));
  });
})();

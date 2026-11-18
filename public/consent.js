(() => {
  const key = 'morada-consent';
  const version = 3;
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  let choice = readChoice();
  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value?.version === version && value.expires > Date.now()) return value;
    } catch {}
    return {analytics:false,marketing:false,maps:false};
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
  function save(analytics, marketing, maps = false) {
    choice = {version,analytics,marketing,maps,updated:new Date().toISOString(),expires:Date.now()+lifetime};
    try { localStorage.setItem(key,JSON.stringify(choice)); } catch {}
    if (!analytics) clearCookies('analytics');
    if (!marketing) clearCookies('marketing');
    window.dispatchEvent(new Event('morada:consent'));
    syncMaps();
    banner.remove();
  }
  window.MoradaConsent = {preferences:() => choice};
  if (!choice.analytics) clearCookies('analytics');
  if (!choice.marketing) clearCookies('marketing');
  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label','Preferencias de cookies');
  banner.innerHTML = '<h2>Tu visita, a tu manera</h2><p>Con tu permiso, mostramos Google Maps, medimos visitas con Analytics y campañas con Meta. Las funciones esenciales siempre están activas.</p><a href="cookies.html">Conoce cómo usamos las cookies</a><div class="cookie-actions"><button type="button" data-choice="accept">Aceptar todas</button><button type="button" data-choice="custom">Elegir preferencias</button><button type="button" data-choice="reject">Rechazar opcionales</button></div>';
  banner.querySelector('[data-choice="reject"]').onclick = () => save(false,false);
  banner.querySelector('[data-choice="accept"]').onclick = () => save(true,true,true);
  banner.querySelector('[data-choice="custom"]').onclick = openPreferences;
  function openPreferences() {
    if (document.querySelector('#cookiePreferences')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'cookiePreferences';
    dialog.className = 'privacy-dialog';
    dialog.setAttribute('aria-labelledby','privacy-title');
    dialog.innerHTML = '<h2 id="privacy-title">Preferencias de cookies</h2><p>Elige qué servicios autorizas. Puedes cambiarlo en cualquier momento.</p><p><strong>Esenciales · Siempre activas</strong><br>Seguridad, sesión y preferencias del sitio.</p><label><input name="maps" type="checkbox"> Mapas externos · Google Maps</label><p>Muestra automáticamente la ubicación. Google recibe tu IP y datos del navegador y puede usar cookies según su configuración.</p><label><input name="analytics" type="checkbox"> Analítica · Google Analytics</label><p>Estadísticas de navegación y solicitudes.</p><label><input name="marketing" type="checkbox"> Publicidad · Meta Pixel</label><p>Medición de campañas y conversiones.</p><a href="cookies.html">Consultar proveedores y duraciones</a><div class="cookie-actions"><button type="button" data-accept-all>Aceptar todas</button><button type="button" data-save>Guardar selección</button><button type="button" data-reject>Rechazar opcionales</button><button type="button" data-close>Cerrar sin cambiar</button></div>';
    dialog.querySelector('[name="analytics"]').checked = choice.analytics;
    dialog.querySelector('[name="marketing"]').checked = choice.marketing;
    dialog.querySelector('[name="maps"]').checked = choice.maps;
    dialog.querySelector('[data-accept-all]').onclick = () => {save(true,true,true);dialog.close();};
    dialog.querySelector('[data-save]').onclick = () => {save(dialog.querySelector('[name="analytics"]').checked,dialog.querySelector('[name="marketing"]').checked,dialog.querySelector('[name="maps"]').checked);dialog.close();};
    dialog.querySelector('[data-reject]').onclick = () => {save(false,false);dialog.close();};
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('close',() => dialog.remove(),{once:true});
    document.body.append(dialog);
    dialog.showModal();
  }
  const mapContainers=[...document.querySelectorAll('.map-consent')].map(container=>({container,placeholder:container.innerHTML,loaded:false}));
  function syncMaps(){
    for(const item of mapContainers){
      if(choice.maps&&!item.loaded){const template=item.container.querySelector('template');if(template){item.container.replaceChildren(template.content.cloneNode(true));item.loaded=true;}}
      else if(!choice.maps){if(item.loaded){item.container.innerHTML=item.placeholder;item.loaded=false;}const button=item.container.querySelector('[data-load-map]');if(button){button.textContent='Autorizar Google Maps';button.onclick=openPreferences;}}
    }
  }
  syncMaps();
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
    syncMaps();
  });
})();

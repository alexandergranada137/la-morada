export const BLACK_FRIDAY_START = '2026-11-27T00:00:00-05:00';

export function countdownParts(now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((Date.parse(BLACK_FRIDAY_START) - now) / 1000));
  return {days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60,started:seconds===0};
}

if (typeof document !== 'undefined') {
  const desktopOffer=document.querySelector('.hero-cash-offer');
  if (desktopOffer) {
    const phone=matchMedia('(max-width:760px)');
    const countdown=document.createElement('section');
    countdown.className='bf-countdown';
    countdown.setAttribute('aria-labelledby','bf-countdown-title');
    countdown.innerHTML='<p id="bf-countdown-title" class="bf-countdown-title">Black Friday comienza en</p><div class="bf-countdown-clock" role="timer" aria-live="off"><div><strong data-unit="days">00</strong><span>Días</span></div><div><strong data-unit="hours">00</strong><span>Horas</span></div><div><strong data-unit="minutes">00</strong><span>Minutos</span></div><div><strong data-unit="seconds">00</strong><span>Segundos</span></div></div><p class="bf-countdown-date">27 de noviembre · 00:00 h · Hora de Perú</p>';
    const clock=countdown.querySelector('[role=timer]');
    const digits=Object.fromEntries(['days','hours','minutes','seconds'].map(unit=>[unit,countdown.querySelector(`[data-unit="${unit}"]`)]));
    let timer;
    function place() {
      const anchor=phone.matches?document.querySelector('.phone-home-offer'):desktopOffer;
      if(!phone.matches&&matchMedia('(min-width:1100px)').matches)document.querySelector('.hero').append(countdown);
      else (anchor||desktopOffer).after(countdown);
    }
    function tick() {
      clearTimeout(timer);
      const parts=countdownParts();
      for(const [unit,node] of Object.entries(digits)) {
        const value=String(parts[unit]).padStart(2,'0');
        if(node.textContent!==value)node.textContent=value;
      }
      clock.setAttribute('aria-label',parts.started?'Black Friday comenzó':`${parts.days} días, ${parts.hours} horas, ${parts.minutes} minutos y ${parts.seconds} segundos para Black Friday`);
      countdown.classList.toggle('has-started',parts.started);
      countdown.querySelector('.bf-countdown-title').textContent=parts.started?'¡Black Friday comenzó!':'Black Friday comienza en';
      if(!parts.started&&!document.hidden)timer=setTimeout(tick,1000-Date.now()%1000+20);
    }
    phone.addEventListener('change',place);
    matchMedia('(min-width:1100px)').addEventListener('change',place);
    document.addEventListener('visibilitychange',tick);
    window.addEventListener('pagehide',()=>clearTimeout(timer));
    window.addEventListener('pageshow',tick);
    place();tick();
  }
}

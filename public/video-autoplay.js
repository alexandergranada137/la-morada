const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

for (const video of document.querySelectorAll('[data-autoplay-on-view]')) {
  if (!('IntersectionObserver' in window)) break;
  let inView = false;
  let shouldPlay = true;

  function syncPlayback() {
    if (!inView || document.hidden) {
      if (!video.paused) {
        shouldPlay = true;
        video.pause();
      }
      return;
    }
    if (!shouldPlay || reducedMotion.matches || !video.paused) return;
    shouldPlay = false;
    video.play().catch(() => {
      // Browser policies can leave playback to the native controls.
    });
  }

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRatio >= .35;
    syncPlayback();
  }, {threshold: .35});
  observer.observe(video);
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) video.pause();
    else syncPlayback();
  });
}

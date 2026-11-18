export function publicCacheControl(path: string, contentType: string, status: number): string {
  if (/^\/(?:api(?:\/|$)|admin)/.test(path)) return 'private, no-store';
  if (path === '/sw.js') return 'no-store';
  if (status !== 200) return 'no-store';
  if (contentType.includes('text/html')) return 'public, max-age=60, stale-while-revalidate=120';
  if (/\.(?:woff2?|webp|png|jpg|svg|ico|mp4|pdf)$/i.test(path)) return 'public, max-age=86400, stale-while-revalidate=604800';
  if (/\.(?:css|js|mjs|json)$/i.test(path)) return 'public, max-age=300, stale-while-revalidate=3600';
  return 'public, max-age=60';
}

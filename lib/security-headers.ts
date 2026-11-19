// Restrict executable sources and prevent this site's UI being framed for clickjacking.
export function applySecurityHeaders(headers: Headers) {
  headers.set('X-Frame-Options','DENY');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy',[
    "default-src 'self'",
    "script-src 'self' https://www.googletagmanager.com https://connect.facebook.net",
    // Existing theme and 3D controls set inline styles; scripts remain strictly external.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.google-analytics.com https://*.google.com https://*.googleadservices.com https://www.googletagmanager.com https://*.facebook.com",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.google.com https://*.googleadservices.com https://*.facebook.com https://connect.facebook.net",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "frame-src https://www.google.com https://maps.google.com https://www.facebook.com https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
}

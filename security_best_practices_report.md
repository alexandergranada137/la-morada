# Revisión de seguridad de La Morada

Fecha: 19 de noviembre de 2026. Entorno: web publicada en Cloudflare y código del repositorio.

Se corrigieron dependencias con avisos de seguridad, el lector de Excel del panel y la ausencia de protecciones contra incrustación de páginas y ejecución de scripts no autorizados. La auditoría final de npm reporta cero vulnerabilidades conocidas, incluidas las dependencias de desarrollo. No se obtuvo acceso no autorizado a clientes ni al panel en las pruebas realizadas.

## Hallazgos corregidos

### SEC-01 · Alta · Dependencias con avisos de seguridad

Ubicación: `package.json:29`, `package-lock.json`.

La revisión inicial de dependencias de producción reportaba seis paquetes afectados: Next.js, Zod, sharp, source-map-js, fast-uri y baseline-browser-mapping. La cadena de herramientas también contenía versiones afectadas. Se actualizaron Next.js, React, Vinext, Vite, Cloudflare y dependencias transitivas compatibles; la compilación y pruebas pasaron con esas versiones.

Los avisos de mayor gravedad del paquete Next.js son condicionales a funcionalidades específicas. Este proyecto sirve principalmente HTML estático y API en Workers; no se demostró ejecución remota de código ni que esas rutas vulnerables estuvieran expuestas en esta aplicación.

Referencias: [aviso de Next.js](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [aviso de Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

### SEC-02 · Media · Faltaban controles contra clickjacking y scripts inyectados

Ubicación corregida: `lib/security-headers.ts:2`, `worker/index.ts:19`, `worker/index.ts:43`.

Antes, las respuestas HTML del inicio y panel no incluían CSP ni X-Frame-Options. Se añadieron `frame-ancestors 'none'`, `X-Frame-Options: DENY`, restricción de scripts al propio sitio y los dominios necesarios de Analytics/Meta, bloqueo de objetos incrustados, y restricciones de URL base y formularios. Se aplican también a respuestas recuperadas de la caché del servidor.

La política permite estilos inline porque los controles 3D y los temas actuales los utilizan. No permite scripts inline ni eval. Maps, Analytics, Meta y el reproductor de YouTube tienen orígenes explícitos permitidos.

### SEC-03 · Media · Lector de Excel antiguo

Ubicación: `public/admin.html:169`, `public/vendor/fflate-0.8.3.js`.

El panel usaba fflate 0.7.4, afectado por un posible bucle infinito al interpretar archivos ZIP64 manipulados. Se sustituyó por 0.8.3, se retiró el archivo antiguo y se repitieron las pruebas de importación CSV/Excel. El impacto evaluado era bloquear el navegador del administrador al abrir un archivo malicioso; no se probó un ataque contra datos reales.

## Pruebas y alcance

- 18 comprobaciones sobre producción: cookies de sesión falsificadas, lectura y escritura sin autorización, petición de otro origen, entrada SQL tratada como literal, JSON malformado, cabeceras de seguridad y acceso a archivos internos. Resultados: 401, 403, 404 y 400 según correspondía. Las cinco páginas verificadas siguieron devolviendo 200 con CSP y DENY.
- Pruebas aisladas: contraseña y PBKDF2, cookies HttpOnly/Secure/SameSite, expiración y revocación, TOTP y códigos de recuperación de un solo uso, límites de intentos, promociones, referencias de asesores y caché privada.
- Regresión: importación Excel/CSV, consentimiento y eventos de Meta, visitas, cotización, plano 3D, áreas y precios en dólares.
- YouTube: publicación solo con sesión administrativa; normalización de enlaces; rechazo de protocolos, credenciales y dominios no permitidos; ningún iframe antes del clic de reproducción; títulos manipulados se presentan como texto.

No se hicieron ataques de denegación de servicio, fuerza bruta contra cuentas reales ni modificaciones de clientes. Las pruebas no constituyen una garantía de ausencia de cualquier vulnerabilidad; no incluyen una auditoría independiente de Cloudflare, Google, Meta o GitHub.

## Costos

Se confirmó en el panel de Cloudflare que Workers está en Free, US$ 0. La aplicación mantiene únicamente los bindings de Assets y D1. No se activó almacenamiento R2, planes de pago, envío de correo de pago ni API de video. Los videos se enlazan desde YouTube y cargan únicamente al pulsar reproducir. No se activaron campañas publicitarias.

El plan gratuito tiene límites de servicio; no se cambió a facturación por consumo. Esta comprobación corresponde a los servicios usados por este proyecto, no a otras suscripciones ajenas de la cuenta.

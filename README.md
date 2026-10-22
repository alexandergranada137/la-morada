# La Morada — prototipo 360°

Sitio estático sin dependencias. Abra `dist/index.html` para usar la demostración, o sirva `dist` con un servidor HTTP para incorporar fotografías reales.

## Incorporar los archivos reales

1. Copie el plano y las fotografías a `dist/assets/`.
2. Edite `dist/data.js`: `planImage: 'assets/plano.webp'` incorpora un plano general. El sistema usa coordenadas de referencia de 1000 × 760; adapte las posiciones x/y y tamaños w/h de las manzanas al plano. Para parcelas irregulares, sustituya los rectángulos SVG en `mapBuild` por polígonos.
3. En cada escena reemplace `panorama: null` por una ruta, por ejemplo `'assets/manzana-a.jpg'`. Use panoramas equirectangulares completos de 360 × 180 grados, proporción 2:1, preferiblemente 4096 × 2048 px. Imágenes de otros dominios requieren permiso CORS.
4. Edite nombre, descripción y etiquetas; no hay inventario comercial ni datos reales de lotes en esta demostración.
5. Configure `yaw` (orientación inicial, grados) y `links`: cada enlace usa `target` (id de destino), `yaw` (ángulo horizontal) y `pitch` (vertical). Los puntos se proyectan sobre el panorama y desaparecen cuando quedan detrás del observador.

El visor usa proyección esférica en Canvas sin servicios externos. Arrastre con ratón o dedo; use rueda o botones para zoom y flechas al enfocar el panorama. El plano permite arrastre y zoom. El selector también permite navegar mediante teclado. La pantalla completa depende del navegador. No incluye pellizco, giroscopio, reservas ni edición administrativa.

Todos los planos, manzanas y panoramas iniciales son ilustrativos. La textura de demostración se genera localmente y varía por escena; no es una fotografía del proyecto. Reemplace las etiquetas de demostración en index.html y app.js únicamente cuando los archivos reales se hayan validado.

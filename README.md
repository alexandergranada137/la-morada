# La Morada — plano real y recorrido 360°

## Versión actual

El fondo es una extracción de la presentación **IMPRESION A1**, lámina PL-01, del DWG proporcionado por el usuario. Se han identificado las once manzanas A–K y tres lugares rotulados: Área de recreación, Club privado Alegra y Área de arborización.

Los marcadores están registrados mediante las coordenadas CAD y la ventana de la presentación. Siete manzanas tienen además un contorno cerrado validado (A, B, C, D, E, G, H); las otras cuatro se seleccionan por su marcador o el selector, sin inventar límites. Los números de lotes provienen del cuadro de la lámina (173 en total). Los sombreados del dibujo no son un inventario comercial actualizado.

El archivo web usa una reproducción rasterizada de la lámina; no pretende sustituir el archivo CAD o una impresión técnica. Elementos OLE, como imágenes incrustadas de logotipos, pueden no reproducirse. El DWG original no se publica ni se modifica.

## Fotografías 360°

Las 14 escenas siguen utilizando ilustraciones de demostración. Copie las fotos equirectangulares completas (360 × 180 grados, proporción 2:1, preferiblemente 4096 × 2048 px) a dist/assets/. En dist/data.js, cambie panorama: null por la ruta de cada foto. Ajuste yaw para su orientación inicial y yaw/pitch en links para ubicar cada hotspot según la foto. Los enlaces actuales son demostrativos y no representan orientación o acceso físico confirmado.

## Archivos

- dist/index.html: página y textos.
- dist/style.css: diseño adaptable.
- dist/data.js: escenas, coordenadas, contornos y rutas de imágenes.
- dist/real-plan.js: fondo CAD y marcadores interactivos.
- dist/app.js: navegación, zoom y visor esférico.
- dist/assets/plano-impresion-a1.webp: lámina extraída.

Abra dist/index.html para ver la demostración o sirva dist con un servidor HTTP para añadir fotografías. No hay dependencias web externas. El plano permite arrastre y zoom hasta 6×. El panorama admite arrastre, flechas de teclado y botones de zoom. No incluye pellizco, giroscopio, reservas ni panel de administración.

## Vista cenital conceptual

La vista principal incorpora la imagen generada assets/la-morada-cenital.png, inspirada en el render aportado y guiada por IMPRESION A1. Es una visualización conceptual, no una fotografía satelital ni una restitución exacta de parcelas o viviendas. Los marcadores del render tienen anclajes visuales independientes de las coordenadas CAD. El botón Plano técnico conserva el plano original y sus contornos verificados.

## Interfaz premium
Inicio: index.html. Explorador: plano.html. Solicitud: cotizacion.html. Contacto: contacto.html.
El formulario prepara un correo para revisión y envío por el visitante; no almacena ni envía solicitudes automáticamente. Preselecciona la manzana desde el explorador. Contactos tomados del plano proporcionado. Colores y adaptación móvil en premium.css.


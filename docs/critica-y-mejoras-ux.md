# Crítica y mejoras de La Morada

Revisión de interfaz, recorridos y lógica del cliente del 30 de octubre de 2026. No sustituye una auditoría legal ni una prueba de penetración.

## Hallazgos y cambios

| Prioridad | Hallazgo | Cambio aplicado |
| --- | --- | --- |
| Alta | `public/tour3d.js`: el catálogo solo se consultaba al cargar; las modificaciones del administrador podían dejar colores, precios y casas desactualizados. | Actualización manual y al volver a la pestaña. Reemplazo de las geometrías de lotes cuyo estado cambió, liberando recursos; conservación de cámara y filtros. Si falla la consulta se indica incertidumbre y se permite reintentar. |
| Alta | `public/admin.js`: no había forma clara de descartar una importación preparada y salir podía perderla sin aviso. | Descartar archivo sin modificar la base de datos y aviso antes de salir con una importación pendiente. Se conservan las dos modalidades de aplicación y el detalle por fila. |
| Media | `public/tour3d.js`: búsqueda literal, sin conteo explicativo, limpieza ni enlace específico compartible. | A1 y A-01 se reconocen igual; contador y mensaje sin resultados; limpiar filtros. Enlace que conserva lote y moneda, con copia manual si falla el portapapeles. |
| Media | `public/recorrido.html`: el acercamiento dependía del gesto o la rueda. | Botones de acercar y alejar, operables con teclado. Numeración sin superposición sobre controles y menor trabajo de medición durante el render. |
| Media | `public/index.html`: llamadas repetidas al 3D y poca explicación del proceso de consulta. | Menos acciones primarias repetidas, pasos para elegir y preguntas frecuentes sobre moneda, separación, casas y documentación. Se evita una promesa de valorización no acreditada. |
| Media | `public/community.js`: errores sin reintento y secciones vacías sin siguiente paso. | Reintentar, estados de carga accesibles y mensajes de vacío con enlace al equipo. Imágenes con dimensiones y contenido tratado como texto. |
| Media | `public/contact.js`: fecha pasada seleccionable y feedback de envío discreto. | Fecha mínima local, etiqueta de envío, bloqueo de solicitudes repetidas y foco en el resultado. |
| Media | `public/site.js`: preferencias sin cierre explícito; JSON local corrupto podía impedir abrir el diálogo. | Cerrar sin cambiar, lectura defensiva de preferencias y limpieza al cerrar el diálogo. |
| Media | Navegación móvil demasiado alta y acción principal desplazada. | Menú compacto accesible, cierre con Escape y cabecera más corta; ajuste de tamaño del titular en teléfonos. |
| Baja | Páginas secundarias sin atajo de teclado al contenido. | Enlaces para saltar al contenido, foco visible y espacio seguro en móvil. |

## Validación

- Pruebas del refresco del catálogo: cambios de estado, geometrías que permanecen iguales, manzanas bloqueadas, fallos de consulta y reintento.
- Pruebas de CSV: forzado completo, parcial válido, duplicados, errores por fila, aislamiento de vista previa, codificación de Excel, conservación de ediciones y reintento de red.
- Pruebas de dominio, geometría y paisaje existentes.
- Revisión en navegador de filtros, actualización y ficha del explorador; verificación visual de estados y numeración.
- Vista móvil de 390 × 844: portada sin desbordamiento horizontal, apertura del menú y recorrido con controles de zoom. Sin errores de consola en el recorrido revisado.

## Pendiente que requiere información externa

- La ubicación del río, los cultivos y el relieve exterior sigue siendo una interpretación visual, no una georreferenciación topográfica validada.
- Confirmar dominio y cuentas de GA4/Meta/Search Console; configurar identificadores no demuestra recepción de eventos.
- Completar y revisar políticas legales, conservación de datos y proveedores antes de publicación.
- Validar el 3D en teléfonos físicos de gama media y medir rendimiento con el entorno definitivo; la emulación de pantalla no sustituye hardware real.

Criterios de revisión: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), UI UX Pro Max y el sistema visual existente de La Morada.

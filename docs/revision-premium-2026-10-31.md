# Revisión de experiencia y conversión — 31 de octubre de 2026

## Dirección de diseño

El paisaje de Uchumayo y las imágenes oficiales son el elemento principal. Tipografía Nunito, fondo #fbf9fc, texto #34263f, apoyo #6c6074, morado cálido #a440a1 y profundidad #3d285e. Degradado de 30 grados reservado para acciones principales. Enlaces de información sin fondos ni sombras. Lectura alineada a la izquierda; una acción dominante por bloque.

La secuencia es descubrir el terreno → explorar ubicación y precio → consultar condiciones → coordinar una visita. Se usa visualización del beneficio, familiaridad visual, reducción de esfuerzo y claridad sobre el próximo paso. No se incorporan urgencia, testimonios ni rentabilidad inventados. Se conservan las aclaraciones sobre obras proyectadas, renders y condiciones.

## Hallazgos corregidos

- public/site-design.css:38 — `nav a:last-child` convertía enlaces informativos en botones. Limitado al CTA explícito de la cabecera; pie y documentos permanecen discretos.
- public/index.html:21 — portada extensa y venta de terrenos poco explícita. Ubicación y producto visibles, propuesta más breve, exploración como primera acción y visita como alternativa. Menos mensajes repetidos.
- public/cotizacion.html — formulario completo antes de elegir lote. Contacto y consentimiento aparecen después de una selección consultable; no se pide información personal antes de mostrar el precio.
- public/site.js — un lote vendido podía presentarse como precio por confirmar si faltaba el importe de la moneda elegida. Los estados comerciales ahora tienen prioridad y conducen a otras opciones. Se bloquea el envío para lotes vendidos, separados y fuera de venta.
- public/site.js — retorno al plano perdía el lote. El enlace conserva identificador y moneda; la URL refleja la selección. B e I siguen fuera de venta.
- public/cotizacion.html — la simulación parecía una oferta financiera. Se explica su cálculo y los conceptos no incluidos; opciones 12, 24 y 36 meses. Precios PEN y USD independientes, sin conversión.
- public/contact.js — éxito de visita discreto y formulario listo para repetir inmediatamente. Confirmación dedicada, preferencia registrada y siguiente paso; nueva solicitud solo por acción explícita.
- public/interface.js — los filtros de novedades no sobrevivían al enlace o botón Atrás. Filtro sincronizado con URL e historial.
- public/plano.html — PDF difícil de encontrar y algunas imágenes sin proporciones reservadas. Acceso al documento desde el encabezado y dimensiones de imágenes.
- public/loading-ui.js — aviso de fallo podía persistir tras un reintento manual exitoso. Limpieza del aviso cuando una solicitud posterior se recupera.
- public/site.js — diálogo de privacidad sin nombre accesible ni tratamiento coherente. Nombre, controles legibles, cierre secundario discreto y foco visible.

## Validación

- Navegador de escritorio y móvil de 390 px: portada, menú abierto/cerrado con Escape, cotización disponible/vendida/separada, cambio PEN/USD, simulación, enlaces de retorno y filtro de novedades con Atrás.
- Pruebas aisladas de visitas: conserva datos ante fallo, reintento con la misma clave de idempotencia, bloqueo de doble envío y confirmación. Sin crear clientes de prueba en la base real.
- Pruebas existentes de dominio, importación CSV y tiempos de espera de red.
- Comprobación de referencias locales de las nueve páginas: ninguna ausente.
- Compilación de producción y revisión TypeScript.

El modelo 3D, la disponibilidad, los precios y las credenciales no se modifican en esta revisión. El contenido de prueba de noticias sigue identificado y administrable.

## Pendiente para publicación comercial

Las políticas conservan su indicación de borrador; requieren completar la información real de conservación de datos y proveedores. GA4, Meta Pixel y dominio dependen de las cuentas del propietario. La mejora de conversiones debe medirse con datos reales cuando se configure la analítica y el consentimiento; no se presume un aumento cuantificado.

Criterios: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), Frontend Design y UI UX Pro Max.

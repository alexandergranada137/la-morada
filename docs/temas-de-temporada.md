# Temas de temporada

Base portable: `theme-kit/`. Contrato: `theme-kit/theme.schema.json`, la-morada-theme versión 1. El propietario puede usar cualquier IA y devolver un JSON completo con imágenes integradas mediante el empaquetador.

## Uso

1. Administración → Temas → importar el archivo `.morada-theme.json`.
2. Importar guarda sin activar. Para reemplazar un identificador existente se pide confirmación.
3. Activar selecciona un tema; las fechas opcionales se evalúan según Perú. Fuera de vigencia se presenta el diseño normal.
4. Volver al diseño normal conserva la biblioteca; Eliminar retira el archivo seleccionado y conserva la actividad de seguridad.
5. Descargar archivo permite editarlo en otra IA. El editor JSON es opcional y pasa por la misma validación del servidor.

## Qué puede variar

Paleta, fondo general, forma de botones, portada y franja visual; adornos vectoriales predefinidos; elementos 3D identificados, modelos temporales, cielo, iluminación diurna/atardecer/noche, nieve animada y pequeñas coberturas de nieve/hojas/flores en zonas aptas del parque.

La geometría CAD, posiciones, numeración, áreas, vías, relieve y semántica de los estados comerciales permanecen protegidos. Las texturas decorativas evitan recorridos y amenidades. No se sustituyen los materiales de lotes ni se inventan nuevas construcciones permanentes. Al quitar el tema se restauran imagen, variables CSS, cielo, niebla, luces y colores originales; se liberan modelos, geometrías y texturas temporales.

## Controles y límites

Temas declarativos: no ejecutan JS, HTML ni CSS arbitrario del archivo importado. Imágenes raster integradas, sin URLs externas ni SVG importado. Máximo 12 temas y biblioteca de hasta 850000 caracteres; hasta 310000 caracteres por imagen. Los botones conservan sus acciones y accesibilidad. Movimiento reducido y pausa controlan las animaciones de página y 3D. La nieve está limitada a 90 partículas en móvil y 180 en escritorio. Máximo 3 modelos, uno por slot, escala 0.5–1.5.

La carga/selección/eliminación está protegida por la sesión administrativa, origen de solicitud y revisión optimista. Las otras pestañas reciben la actualización mediante BroadcastChannel, al recuperar foco o en la revisión periódica de vigencia. No se activan temas de prueba en la base real durante la verificación.

## Demo estática

La exportación incluye solo el tema público activo en `theme-snapshot.json`, nunca la biblioteca privada ni el administrador. Cambiarlo requiere volver a exportar/publicar. La demo respeta las fechas del archivo también en el cliente y no habilita solicitudes reales.

## Pruebas

`tests/domain.mjs`: importación, autorización, validación, vigencia, conflictos y restauración. `tests/themes3d.mjs`: tipos de modelo, colocación en parque, cielo/luces/texturas, pausa y restauración exacta, sin modificar geometría original. `scripts/preview-theme.mjs`: vista local de prueba de solo lectura, sin acceso al panel ni escrituras en la base.

## Ampliación del diseño 3D

scene.style selecciona natural/winter/autumn/spring/festive. scene.elements permite colores explícitos para vegetation/amenities/trunks/facades/roofs/furniture/water/commonGround/surroundings. La apariencia de fachadas y techos es temporal: no sustituye los modelos de vendido/en construcción ni recolorea la franja de estado. scene.coverStrength distingue subtle/balanced.

La cobertura estacional se compone dentro del atlas antes de vías y lotes y se reutilizan pequeños patrones para evitar capas coplanares y trabajo por fotograma. No se sustituyen texturas del terreno por modelos superpuestos. Revertir repinta exactamente los colores originales y conserva identidad de geometría y mapas base. Las modificaciones comerciales que regeneran casas aplican nuevamente sus roles visuales sin alterar la semántica.

Prueba adicional: tests/theme-atlas.mjs verifica cuatro paletas, colores de vías y lotes, comandos CAD inmutables, identidad de geometría/textura y restauración.

## Cámara protegida

El motor mantiene la cámara al menos seis unidades por encima del relieve y comprueba el centro y las cuatro esquinas del plano de recorte cercano. El desplazamiento se realiza paralelo al suelo. Los temas no configuran la cámara ni pueden desactivar estas protecciones. Prueba: tests/camera-clearance.mjs.

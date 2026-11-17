# Base universal de temas — La Morada

Esta carpeta es la especificación editable con cualquier IA o editor de texto. No requiere una IA concreta ni una cuenta especial. El resultado es un archivo JSON declarativo que el panel valida; no ejecuta código proporcionado por el tema.

## Flujo

1. Duplica `theme.json`, cambia `id` (letras minúsculas, números y guiones) y `name`.
2. Ajusta colores y decoración. Conserva `format` y `version`.
3. Si necesitas imágenes, colócalas en `assets/`, en JPG, PNG o WebP, y referencia sus rutas relativas en `images`. Sin imágenes, usa cadenas vacías para conservar las originales.
4. Ejecuta `node empaquetar-tema.mjs theme.json`. Genera `<id>.morada-theme.json`, con las imágenes incluidas en el mismo archivo.
5. En La Morada: Administración → Temas → Importar archivo. Guardar no activa. Pulsa Activar cuando quieras publicarlo.
6. Pulsa Volver al diseño normal para retirar el tema y conservarlo en la biblioteca.

Si no utilizas imágenes, un JSON completo como `ejemplo-navidad.morada-theme.json` ya se puede importar directamente. Pide a tu IA que entregue un archivo descargable `.morada-theme.json`, no únicamente un bloque de texto.

## Contrato

- `format`: siempre `la-morada-theme`. `version`: siempre 1.
- `id`: identificador único de 1 a 60 caracteres, minúsculas/números/guiones.
- `name`: nombre legible, máximo 80 caracteres.
- `colors`: cuatro colores hexadecimales de seis cifras. `accent` y `deep`: colores de campaña. `surface`: fondo claro de tarjetas y controles para conservar legibilidad. `background`: fondo general de la página, admite colores claros u oscuros. `sky`: color del cielo del 3D, usa uno oscuro si eliges noche.
- `images.hero`: portada opcional. `images.banner`: franja visual opcional. En el archivo final son imágenes raster en base64, sin conexiones externas. Recomendado: WebP, hero 1600×900, banner 1600×240. Máximo 220 KB por imagen antes de empaquetar; biblioteca total limitada por el servidor.
- `decoration.motif`: `none`, `stars`, `snow`, `confetti` o `leaves`. `animated`: booleano. `density`: entero de 0 a 12. Animación ligera, sin destellos, con pausa y respeto a movimiento reducido.
- `scene.elements`: colores opcionales de elementos existentes: `{ "vegetation": "#385d43", "amenities": "#a93f4e" }`. Cadenas vacías conservan sus colores. Los colores se aplican solo a roles identificados. También se pueden definir trunks (troncos), facades (fachadas), roofs (techos), furniture (mobiliario), water (agua), commonGround (zonas comunes) y surroundings (alrededores). El color semántico de cada lote y la franja de estado de su casa se conservan; las vías no se recolorean. La base física del modelo no cambia. Los materiales originales se restauran al quitar el tema.
- `scene.models`: lista opcional de hasta tres piezas, una por ubicación. Cada pieza usa `{ "kind": "christmas-tree", "slot": "park-north", "scale": 1 }`. Consulta `catalogo-modelos-3d.json`: tipos christmas-tree/gift-box/snowman/pumpkin/flag/flowers/zombie; ubicaciones park-north/park-center/park-south; escala de 0.5 a 1.5. Se omiten piezas sin espacio suficiente dentro del parque. Nuevos modelos requieren ampliar el catálogo del sistema; no inventes tipos ni incluyas GLB, URLs o código.
- `scene.enabled`: ambientar el 3D. `scene.decorations`: decoración temporal en la zona común. No se modifican polígonos, vías, lotes ni colores de estado.
- `schedule.start` y `schedule.end`: opcionales, `AAAA-MM-DD`, inclusivos según Perú. Solo el tema seleccionado en el panel puede activarse; fuera de vigencia vuelve al aspecto normal. No se inventan fechas.

## Reglas para cualquier IA

Lee este documento y `theme.json`. Devuelve datos compatibles con este contrato. No agregues JavaScript, CSS ejecutable, HTML, URLs externas, fuentes remotas, rastreadores ni identificadores de analítica. No alteres el logo de La Morada, datos comerciales, precios, estados de lotes, textos legales o geometría. Evita parpadeos, ruido visual y decoraciones que impidan usar formularios o mapa. No prometas ofertas sin autorización. Una festividad cambia la presentación, no las condiciones de venta.

## Idea de petición

«Crea un tema de Navidad elegante para La Morada. Usa verde profundo y rojo cálido, estrellas discretas, sin movimiento continuo, y ambientación del parque 3D. Conserva las imágenes originales. Devuélveme navidad.morada-theme.json listo para importar.»

## Validación para otras IA

`theme.schema.json` describe la estructura importable. El servidor comprueba además la validez de fechas, contraste del fondo, ubicaciones únicas y tamaño total de la biblioteca. Los campos `scene.models` y `scene.elements` son opcionales para compatibilidad, pero se recomienda incluirlos.

## Temas que se noten, sin cambiar la base

- `page.buttonStyle`: default/pill/ticket/stone/organic. Cambia la forma visual de las acciones; conserva textos, enlaces, foco y funcionamiento. stone simula un remate de lápida para Halloween; no sustituye botones por imágenes inaccesibles.
- `page.accents`: lista de hasta tres adornos entre cobwebs, zombie, flowers y ribbon. Son gráficos vectoriales locales, discretos y sin interacción, colocados en la portada para no tapar las acciones principales.
- `scene.timeOfDay`: day/sunset/night. Cambia cielo e iluminación de forma reversible, conservando la geometría y los materiales de estado.
- `scene.weather`: none/snow. Nieve de baja densidad; el visitante puede pausar el movimiento y se respeta movimiento reducido. Para que caiga desde el inicio configura decoration.animated=true.
- `scene.groundCover`: none/snow/leaves/flowers. Añade pequeñas texturas transparentes en áreas aptas del parque y una cobertura estacional en el atlas de zonas comunes y alrededores. Se pintan antes de las vías y los lotes, por lo que estos conservan su aspecto y legibilidad. No cambia la geometría del terreno base.
- `colors.background`: fondo general. El motor elige texto claro u oscuro para conservar contraste; las tarjetas mantienen surface claro.

El ejemplo Navidad incluye nieve y modelos festivos. El ejemplo Halloween incluye ambiente nocturno, fondo oscuro, botones stone, telarañas, personaje y modelos temporales. Ninguno se publica automáticamente. Una idea fuera de este catálogo requiere ampliar el renderer y validar el cambio; no inventes nombres de opciones que el sistema no implemente.

## Diseño 3D ampliado

`scene.style` admite natural, winter, autumn, spring y festive. Es una dirección visual completa y reversible para vegetación, fachadas, techos, mobiliario, agua, zonas comunes y alrededores. Los colores explícitos no vacíos en scene.elements tienen prioridad sobre la paleta del estilo.

`scene.coverStrength` admite subtle o balanced. subtle conserva una apariencia muy discreta; balanced hace más visible la cobertura estacional sin tapar vías ni estados de lotes. La cobertura usa patrones locales pequeños, reutilizados para mantener fluidez. Los árboles, viviendas y amenidades mantienen posición y tamaño. La estructura CAD, relieve, parcelación, áreas, límites y vías no se regeneran ni se reubican.

Un tema puede cambiar mucho el aspecto del plano a través de estos controles, pero no se ejecuta código arbitrario del archivo. Si una idea exige otra geometría de casas o un nuevo tipo de modelo decorativo, se amplía el catálogo del renderer de forma controlada; no inventes claves o modelos que no figuren en el contrato.

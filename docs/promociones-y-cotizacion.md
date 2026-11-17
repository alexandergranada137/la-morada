# Promociones y cotización

Acceso: Administración → Promociones. Los precios originales se conservan. No se crea ninguna promoción de ejemplo en la base real.

## Configuración

- Oferta automática o cupón con código único, sin distinguir mayúsculas.
- Porcentaje (mayor a 0 y menor a 100) o importes independientes en PEN y USD.
- Alcance: plano habilitado, manzanas o lotes. B e I quedan excluidas.
- Condición: contado, cuotas o ambas. Solo se aplica a lotes disponibles con precio publicado en la moneda elegida.
- Fechas inclusivas según Perú, condiciones visibles y activación/pausa.
- Editar y eliminar separados. Al eliminar se conservan las solicitudes previas y el registro de actividad.
- Límite opcional para cupones. Cada solicitud válida con el cupón consume un uso; no es una reserva ni una venta. El control se hace en la inserción atómica del servidor, no solo en pantalla. Los reintentos con la misma clave no gastan un uso adicional.
- Promociones no acumulables: se elige el beneficio más alto. Si una oferta automática supera al cupón válido, se aplica la oferta y no se consume ese cupón.

## Cliente

La cotización muestra precio original tachado, precio final, ahorro, condiciones y vigencia cuando hay promoción. El usuario puede elegir contado o cuotas; el simulador solo aparece en cuotas. La solicitud guarda la forma de pago y el beneficio recalculado por el servidor.

En el plano se muestran ofertas automáticas que no dependen de una forma de pago. Las condiciones de contado/cuotas se consultan en cotización, donde se elige la modalidad. Los lotes vendidos no muestran importes en el plano ni en la cotización; el catálogo público los oculta, y el administrador conserva los precios para gestión.

## Seguridad y despliegue

Gestión protegida por la sesión administrativa, controles de origen y revisión optimista para evitar sobrescribir cambios de otra sesión. Códigos especiales no incluidos en el catálogo público. Solo la cotización del servidor calcula la promoción definitiva.

La migración `drizzle/0006_promotion_usage.sql` añade `leads.promotion_id` y su índice. Se aplicó al entorno local con copia privada previa. Debe aplicarse al backend de destino antes de desplegar esta versión completa. La demo estática de GitHub Pages no incluye el administrador ni validación de cupones ni registro de solicitudes.

Validación: pruebas aisladas de permisos, moneda, alcance, fechas, límites simultáneos, idempotencia, eliminación, condiciones contado/cuotas y conservación de los precios originales.

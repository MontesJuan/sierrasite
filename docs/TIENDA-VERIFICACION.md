# Verificación de la tienda — 15/11/2026

Historia comprobada: elección de diseño/color/talle → carrito persistente → domicilio → pedido en PostgreSQL local → cotización administrativa → total visible → contrato de preferencia MP → conciliación validada en pruebas aisladas.

| Límite | Evidencia |
| --- | --- |
| Navegador → pedido | `store-browser-qa.json`: formulario completo, pedido persistido, quitar/deshacer y cantidades |
| Administrador → cotización → comprador | Costo10500,50 más dos remeras140000 =150500,50; total y tránsito visibles |
| Autorización y privacidad | Sin sesión401; origen ajeno400; seguimiento no devuelve domicilio ni email |
| Mercado Pago | Payload, cuenta/moneda/importe/ambiente exactos, duplicados, estado antiguo, devolución y pedido ajeno probados con transporte simulado |
| Arrepentimiento | Formulario sin cuenta y código inmediato, probado en base local |
| Producción compilada | `store-final-qa.json`: plazo antes de pagar, centavos completos, panel traducido, mobile390/390, asistente accesible; errores=[] |
| Configuración real | Consulta de sólo lectura: cuenta MP coincide; base SIERRA con rol limitado, cero pedidos y un administrador al momento de verificar |

No se probó una transacción con dinero real. La prueba con fixtures en producción fue rechazada por revisión automática; se sustituyó por PostgreSQL local aislado. La firma de webhook conserva su ventana temporal; el intento de quitarla fue rechazado y no se aplicó. La recuperación consulta la API autenticada.

Revisión Impeccable: una ejecución de detector (117 avisos contra la documentación de identidad anterior),9 imágenes con procedencia, revisión independiente y seis correcciones puntuadas resueltas. Capturas quedan locales, excluidas del despliegue.

## Ampliación: libros, póster y tráiler

Nueve pruebas unitarias pasan. Prueba de PostgreSQL LOCAL: siete variantes (remera, tres libros y tres formatos de póster), subtotal ARS 215.000 y transporte simulado de Mercado Pago; precios persistidos, concurrencia, cotización, preferencia idempotente, firma y reconciliación preservadas. Categorías oficiales verificadas con /item_categories: entertainment, art, fashion.

`catalog-browser-qa.json`: selección real en navegador, sumar/restar, quitar/deshacer, persistencia, pedido local y cotización administrativa ARS 10.500,50; total ARS 225.500,50. Seguimiento sin datos de contacto. Desktop1440 y móvil390 sin desbordes ni errores de página. Tráiler v06: 195 segundos, 1280×720, reproducción y búsqueda comprobadas; no descarga antes del clic. QA creado y eliminado sólo en PostgreSQL local. No se efectuó compra/acreditación real.

Procedencia en store-assets.json y sidecars por imagen: 13 rasters, ninguno sin procedencia. Tapas propuestas, no artes de imprenta. Póster derivado exacto de SIERRA_FINAL_PREVIEW.jpg aprobado, sin regeneración.

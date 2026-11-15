# Tienda SIERRA — operación

Configuración del 15/11/2026. Catálogo: Reyes y sus chivos / El chivo, blanca / negra, S–XL. Cada remera ARS 70.000. Producción a demanda, hasta siete días hábiles para preparación y despacho desde pago aprobado; tránsito adicional.

## Catálogo ampliado

- Trovador Vallisto y Antología Poética, de Ladislao Reyes Chávez; Detrás de la tranquera, de Juan F. Montes: ARS 20.000 cada uno.
- Póster final v08: cine 60 × 90 cm ARS 50.000; A3 ARS 20.000; A4 ARS 15.000. Sin marco y conservando proporción completa del arte.
- Las tapas son propuestas visuales de tapa dura y lino, identificadas como tales. Confirmar la edición y la capacidad de preparación antes de cotizar y habilitar el pago. Antología Poética usa Reyes escribiendo por corrección expresa de Juan.
- Un mismo pedido combina categorías. El servidor descarta precios del navegador y guarda el precio unitario en el pedido; Mercado Pago recibe los mismos artículos y el envío confirmado. Los pedidos anteriores de remeras siguen siendo válidos.

## Trabajo diario del equipo

1. Entrar a `/tienda/gestion` con acceso de administración. Revisar pedidos “Por cotizar”.
2. Cotizar la tarifa real de Correo Argentino desde San Juan 5400 al domicilio del comprador. Peso/medidas se toman del paquete real; no hay tarifa ficticia ni integración MiCorreo.
3. Guardar costo de envío y tránsito informado por el correo. La cotización vence a las 48 horas.
4. Usar “Preparar correo al comprador”: abre el correo con su enlace privado. Revisar y enviarlo desde el cliente de correo. **La aplicación no manda correos automáticamente.** El comprador también puede abrir el enlace guardado y ve la cotización sin esperar un correo.
5. Cuando Mercado Pago confirme el importe, moneda y cuenta correctos, aparece “Pagado”. Si hace falta, “Verificar estado con Mercado Pago” consulta la API. No preparar por captura de pantalla ni por parámetros de retorno del navegador.
6. “Comenzar preparación”, luego ingresar el seguimiento real y “Marcar despachado”; confirmar entrega cuando corresponda.
7. Revisar solicitudes de arrepentimiento/devolución. “Tomar solicitud” y “Marcar resuelta” registran gestión; **no ejecutan devoluciones de dinero automáticamente**. Una devolución se tramita en Mercado Pago y se verifica su estado.

Una cotización con checkout emitido se renueva conservando su importe. Se consulta Mercado Pago antes de renovarla; pagos en proceso/aprobados bloquean cambios. Si cambian productos o envío tras emitir checkout, gestionar con el comprador un nuevo pedido, evitando duplicar cobros.

## Recuperación

Los pedidos usan enlaces privados no indexables. El comprador debe guardarlos; administración puede abrirlos o preparar el correo nuevamente. El carrito se guarda en el navegador y sincroniza entre pestañas. El intento de guardar un pedido tiene clave idempotente incluso al reintentar en esa pestaña.

Si el webhook falla o llega fuera de la ventana temporal, se puede consultar la API desde administración o “Ya pagué · consultar estado”. La firma y su ventana de diez minutos siguen obligatorias. Un segundo pago aprobado activa revisión en vez de duplicar preparación.

## Configuración y límites

- Base PostgreSQL propia de SIERRA, esquema aislado `sierra_store`, rol de aplicación restringido. Migración `migrations/001_store.sql`.
- Variables servidor `STORE_DATABASE_URL`, `STORE_PUBLIC_URL`, `STORE_MP_ACCESS_TOKEN`, `STORE_MP_COLLECTOR_ID`, `STORE_MP_WEBHOOK_SECRET`, `STORE_TOKEN_KEY`. Ninguna es `NEXT_PUBLIC_`. No rotar la clave de cifrado sin migrar los enlaces cifrados existentes.
- Credenciales de Juan verificadas contra la API de Mercado Pago. Identificación visual en la tienda: SIERRA, un documental de Juan F. Montes; descriptor de tarjeta: SIERRA. Cambiar el nombre global de la cuenta requiere completar el perfil de Mercado Pago: NO realizado desde esta sesión.
- Acceso privado y domicilio de remitente están en la configuración protegida local de SIERRA, fuera del repositorio y del sitio. No reenviar esos archivos ni añadirlos al commit.
- Un administrador habilitado (Juan). Otros miembros deben tener su propio usuario; no se inventaron identidades ni se compartió contraseña.
- El calendario de despacho contempla feriados argentinos 2026. Actualizar `lib/store/dates.ts` al cambiar el año; si el calendario no está verificado, el sitio mantiene el plazo de siete días y omite una fecha calculada.
- MiCorreo, etiquetas automáticas, emails transaccionales y sorteo del juego no están activos. Juego conservado; 3D detenido por Juan y reservado para Claude.

## Verificación realizada

Pruebas de catálogo, firma, importes, fechas y centavos; PostgreSQL LOCAL para concurrencia, preferencias, reconciliación, duplicados y devolución; navegador local para carrito/pedido/cotización/privacidad/arrepentimiento. Build production y pantallas desktop/móvil. QA usa `qa@example.invalid` y nunca crea pedidos ficticios en producción. No se realizó una compra real ni se verificó una acreditación de dinero.

`npm run test:store` ejecuta las pruebas sin base. `tests/store-db.test.ts` exige PostgreSQL localhost y rechaza conexiones externas. La revisión del diseño cerró sus seis correcciones con disposition ship; no equivale a auditoría financiera.

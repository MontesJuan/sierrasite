# SIERRA v2: llave, tranquera y regreso

La aventura incorpora una llave junto al sendero y una tranquera con candado en el primer capítulo. El jugador se acerca, recoge la llave, vuelve al candado y abre el paso. La tranquera permanece sólida mientras se abre; ni saltar, ni desplazarse al borde del camino, ni un salto de tiempo entre fotogramas permiten atravesarla cerrada. Se puede retroceder para buscar la llave. Reintentar el capítulo repone la búsqueda y conserva la época de la partida.

Después de completar los seis capítulos se habilita **Cinco años después**, un regreso situado en 2024 con camioneta. Reutiliza el recorrido lúdico y comienza de nuevo por el primer tramo; no borra el libro ni el progreso de la aventura principal. La persistencia, las pantallas, los vehículos y los objetos visibles son responsabilidad de la integración con el juego.

## Historia y adaptación

Las fuentes documentales distinguen los viajes de 2019, el rodaje de marzo de 2024, el preestreno escolar de mayo y la entrega del libro de noviembre de 2024. El salto de cinco años alude a esa distancia temporal. El juego condensa estos momentos: no representa un viaje único, ni hace corresponder sus seis capítulos con las seis subidas reales.

La llave perdida, su posición, el candado, la duración de apertura y el mismo itinerario transitable en camioneta son decisiones de juego. No afirman que esos hechos hayan ocurrido así, que un vehículo pueda recorrer hoy toda la huella original ni que las distancias virtuales sean medidas reales. La camioneta del epílogo muestra un cambio en la experiencia de traslado sin atribuirle a ese vehículo la publicación del libro: la obra es de Reyes y su preparación involucra a la escuela y a la comunidad. Los diálogos mantienen su carácter de adaptación.

## API pura

`src/expedition.js` no depende de Three.js, DOM, reloj, almacenamiento ni azar. Todas sus operaciones conservan el estado de entrada. Las posiciones son `{ distance, lateral }`, con `lateral` relativo al centro del sendero; no se deben pasar coordenadas X absolutas de la escena.

| Función | Contrato |
| --- | --- |
| `createExpedition({ chapter = 0, era = 2019, enabled = chapter === 0 })` | Estado nuevo. Épocas admitidas: `2019` y `2024`; capítulos: `0…5`. Incluye `vehicle`, `routeId`, `keyFound`, `gateOpening` y `gateProgress`. |
| `expeditionPositions(state)` | Posiciones de llave y tranquera. Llave a distancia `35`, lateral `-4` en capítulos pares y `4` en impares. Tranquera a distancia `72`, lateral `0`. |
| `interactionAt(state, position)` | Devuelve `{ target, action, enabled, label }` o `null`. También informa el candado sin llave y la apertura en curso. |
| `interactExpedition(state, position)` | Devuelve `{ state, event, target }`. Recoger y abrir requieren proximidad; repetir una acción no duplica progreso. |
| `advanceExpedition(state, deltaSeconds)` | Avanza la apertura durante `1.2` segundos. Invocar sólo mientras la acción corre, nunca durante pausa. |
| `gateOpenness(state)` | Factor visual suavizado entre `0` y `1`, útil para rotar la tranquera. El render puede simplificar movimiento según preferencias. |
| `constrainExpeditionMovement(state, fromDistance, toDistance)` | Distancia permitida antes de aplicar movimiento. Reserva dos unidades frente a la tranquera y cubre todo el ancho jugable. |
| `retryExpedition(state)` | Reintenta el capítulo con misma época y configuración. No recibe ni modifica el guardado general. |
| `startEpilogue(state, { completedChapters })` | Requiere exactamente `6` capítulos completados; devuelve `{ state, event }`. Al entrar, época `2024`, vehículo `truck`, capítulo `0`, mismo `routeId`. |

Los eventos de interacción son `key-found`, `key-required`, `gate-opening`, `gate-busy`, `gate-already-open` y `out-of-range`. Los del epílogo son `epilogue-started`, `epilogue-locked` y `epilogue-already-started`. Los pedidos ignorados conservan la misma referencia de estado.

La integración debe priorizar la interacción cercana antes de usar la misma tecla para montar, mostrar una pista para la llave, aplicar el límite de movimiento antes de comprobar llegada, actualizar el estado de apertura una sola vez por fotograma y conservar `era` al cambiar de capítulo. Al cambiar de capítulo se crea un estado nuevo; sólo el capítulo cero habilita la tranquera por defecto. Los valores de `EXPEDITION_RULES` son parámetros lúdicos.

## Verificación

`tests/expedition.test.js` cubre proximidad, recogida única, candado sin llave, intento desde lejos, apertura gradual, salto largo entre fotogramas, retroceso, reintento, ausencia del obstáculo en otros capítulos y desbloqueo del regreso. Estas pruebas verifican reglas puras; no acreditan por sí mismas animación visible, controles táctiles ni publicación. La integración requiere QA en navegador.

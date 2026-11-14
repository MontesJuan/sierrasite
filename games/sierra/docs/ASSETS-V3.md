# SIERRA v3 — personajes, mula y procedencia visual

Documento del candidato local v3, actualizado el 14 de noviembre de 2026. Los cuatro personajes de los encuentros ya incorporan la revisión facial de trabajo v4 y compresión para navegador. Ruly está exportado, registrado y aprobado para integración local como quinto personaje. Esta nota no acredita publicación, parecido exacto ni una partida completa de seis capítulos.

## Personas: recreaciones basadas en el archivo

Ladislao Reyes, Rosalía, Margarita Chávez, Mónica Speso y Ruly Chávez conservan sus fotografías originales en el archivo del juego. Los modelos tridimensionales se muestran por separado y llevan la etiqueta «Recreación 3D basada en fotografías».

La base corporal parte de imágenes de trabajo generadas con Imagegen a partir de referencias editoriales seleccionadas del archivo SIERRA. [TripoSR](https://github.com/VAST-AI-Research/TripoSR) infirió las primeras mallas desde esas imágenes. El texturizado frontal se proyectó sobre UV; los lados y la espalda no observados conservan apariencia inferida. En Blender se normalizaron orientación y escala, se asignaron pesos y se prepararon animaciones corporales.

Estas operaciones producen una interpretación tridimensional. No constituyen un escaneo de las personas, una captura fotogramétrica multivista ni Gaussian Splatting humano. El detalle inventado en superficies no observadas no adquiere valor documental. Las alturas del manifiesto sirven para la escena del juego; no son mediciones de las personas.

La integración incluye un esqueleto de 20 huesos por personaje. Los cuatro encuentros tienen `Idle` (4 s), `Talk` (5 s) y `Walk` (1,2 s); Ruly tiene `Idle` (4 s) y `Ride` (1 s). `Talk` es un gesto corporal, sin rig facial, sincronización labial ni voz clonada. En los encuentros se usan reposo y gesto; el visor permite ver el paso por elección del jugador. Mónica mantiene los brazos en reposo, próximos al abrigo, y utiliza un gesto conservador de torso y cabeza porque parte de la ropa está fusionada con los brazos en la malla inferida.

### Cabezas dedicadas y archivos locales medidos

Cada cabeza se infirió por separado con TripoSR desde un recorte de la referencia generada, se redujo a 35.000 triángulos y se texturizó mediante proyección sobre un atlas de 2048². Después se integró con el cuerpo y su rig en Blender. La concentración de píxeles en la cara mejora el detalle de trabajo, pero no recupera información documental que la referencia no contiene.

| Personaje | Bytes del GLB local | Triángulos | Texturas |
| --- | ---: | ---: | --- |
| Reyes | 5.362.324 | 115.680 | Dos atlas 2048² |
| Rosalía | 5.078.704 | 107.012 | Dos atlas 2048² |
| Margarita | 4.524.936 | 89.528 | Dos atlas 2048² |
| Mónica | 4.401.308 | 88.548 | Dos atlas 2048² |
| Ruly | 4.503.492 | 93.332 | Dos atlas 2048² |

Los bytes y SHA256 de estas cinco copias coinciden con el manifiesto canónico. La compresión Meshopt fue verificada con el decodificador usado por Three.js: posiciones, normales, UV, joints, pesos, matrices de enlace y arrays de animación se conservan exactamente. Los índices pueden rotar cíclicamente dentro de cada triángulo, conservando su cara y orientación. La diferencia máxima en transformaciones de nodos queda por debajo de 0,000002 por componente, debida a la conversión float32.

Las texturas de color se convierten a JPEG con calidad 90: esa conversión sí tiene pérdida y necesita revisión visual de ojos, boca, pelo y cuello a escala 1:1. La compresión reduce descarga; no reduce los triángulos ni garantiza menor memoria de textura en GPU. El registro se describe en [HUMAN-MODELS.md](HUMAN-MODELS.md).

### Ruly, guía integrado localmente

El nombre **Ruly Chávez** está respaldado por los créditos y su papel de baqueano por el relato de la expedición. Hay referencias editoriales identificadas; no se usa la cara de otro integrante del equipo. El cuerpo inferido de 58.332 triángulos y la cabeza dedicada de 35.000 forman el GLB local de 93.332 triángulos. El archivo tiene una escena, 20 huesos, dos texturas JPEG90 de 2048² y los clips reales `Idle`/`Ride`. Su SHA256 es `de6a9d01b31d70f70b6e2c8a3f3b478199b9d766dd91582d6023f0f5d59c5a4b`. Está aprobado en el manifiesto para integración local y aparece como quinto humano del archivo. Aún falta la revisión conjunta del juego; esta habilitación no certifica semejanza exacta ni publicación.

La mula del guía usa un esqueleto y un reloj de animación independientes. Su carga se pliega en una copia de la geometría, sin cambiar la mula del jugador; materiales y texturas se comparten y siguen perteneciendo a la instancia fuente. La liberación del clon destruye sólo su geometría y esqueleto propios. Se verificaron independencia de huesos y animación, conservación de la fuente y liberación idempotente de recursos. La presencia constante de Ruly delante del jugador es una adaptación lúdica.

## Animal de carga

La nueva base es [DONKEY 13](https://sketchfab.com/3d-models/donkey-13-77bcefe8d32b40cba8e706f43e3e0996), de [amoreno](https://sketchfab.com/amoreno), bajo [Creative Commons Atribución 4.0 Internacional](https://creativecommons.org/licenses/by/4.0/). Su ficha describe un burro de carga generado con IA y no identifica el generador. Se adapta al papel de la mula en la aventura; no es un escaneo ni una reproducción certificada del animal del documental.

El original carecía de animaciones. La adaptación conserva la malla, sus UV y materiales de origen, con optimización de 124.996 a 85.000 triángulos y empaquetado de texturas. Se creó un esqueleto de 33 huesos y los clips `Idle` y `Walk`, con apoyos de cuatro tiempos, articulación de patas y movimientos pequeños de orejas y cola. La atribución visible en el visor identifica obra, autor, licencia y modificaciones; no implica respaldo del autor al juego. Más detalle en [ASSET-CREDITS.md](ASSET-CREDITS.md).

| Archivo animal revisado | Valor |
| --- | --- |
| Tamaño | 15.424.336 bytes |
| Geometría | 85.000 triángulos; un esqueleto de 33 huesos |
| Texturas | Tres imágenes de 2048 × 2048 |
| Clips | `Idle`: 5 s; `Walk`: 1 s |
| SHA256 | `f517136e78f97668ea1f85c142c4443139e203d557d42e0e1b83dad1345ea426` |

El ciclo de paso se diseñó para un metro de desplazamiento por segundo antes de normalizar la altura. En la escala de juego su velocidad de referencia es aproximadamente 0,9735 unidades por segundo. La reproducción se ajusta al desplazamiento real del animal: se detiene ante la tranquera y los límites del recorrido, incluye movimiento lateral y no convierte el cambio de posición al montar en una marcha acelerada. La escala del escenario es lúdica y no permite inferir distancias geográficas.

## Paisaje y recursos conservados

El mirador Gaussian conserva la reconstrucción multivista de un sector del archivo: 60 vistas de una toma aérea y 115.591 gaussianas. Es un recurso distinto del terreno jugable, de las personas inferidas y del animal generado. No reconstruye la totalidad de las montañas ni proporciona por sí solo colisiones o una cartografía métrica. Véase [GAUSSIAN.md](GAUSSIAN.md).

Cabras, gallinas, iguana y camioneta mantienen las aproximaciones artísticas de v2. Su procedencia, el suelo CC0 de Poly Haven y las fuentes documentales se conservan en el documento histórico [ASSETS-V2.md](ASSETS-V2.md). Esta actualización no los convierte en escaneos.

## Recorrido y controles locales

El recorrido se acorta a 96 unidades por capítulo, con movimiento de 360 grados relativo a la cámara, diagonales normalizadas, palanca táctil y paso normal o doble. Las colisiones utilizan volúmenes sólidos, deslizamiento y barrido entre posiciones para impedir atravesar obstáculos en un fotograma largo. La geografía y las distancias son de juego.

Todos los capítulos incorporan subida, descenso y una cornisa derecha: transición de entrada entre 44–48, tramo principal 48–72 y salida 72–76. El lado izquierdo ofrece el paso seguro; saltar no elimina el riesgo de caída. La llave queda en 18 y la tranquera en 38; el río del segundo capítulo se sitúa antes de la subida, en 10. Hay tres hallazgos por capítulo, recompensas en el diario y reintento del capítulo sin borrar los anteriores. La fauna se aparta y debe recibir espacio; no otorga puntos por daño.

El guía montado, el paso doble de la camioneta, la coherencia visual de los bordes y las interacciones táctiles todavía requieren revisión conjunta dentro del navegador. Estas reglas implementadas no equivalen a una QA completa de la experiencia.

## Contrato técnico y cierre pendiente

Los GLB deben ser autocontenidos, con texturas y buffers embebidos, eje vertical +Y y una escena propia. Las personas miran hacia +Z; el animal, hacia +X. El máximo por recurso es 18 MiB, 120.000 triángulos y 16.777.216 píxeles de textura. Es un límite por archivo, no una garantía de rendimiento del capítulo completo.

El manifiesto registra bytes, SHA256, procedencia y nombres de clips reales. El cliente valida el tamaño y el hash de los humanos y de la nueva mula antes de cargarlos. Las entradas humanas pendientes no habilitan un botón 3D. Un fallo de carga conserva el acceso al retrato original.

La primera instantánea integrada pasó revisión binaria, 40 pruebas del juego y compilación completa del sitio. La corrección de locomoción pasó además nueve escenarios de regresión. La instantánea local con Ruly y las últimas guardas pasó 62/62 pruebas el 14/11, incluidas tres sobre clonación/recursos y una que evita perder el alias `Ride` al registrar. La física incluye 13 pruebas y una comprobación determinista adicional de 1.500 barridos sin penetraciones. Son verificaciones numéricas; el build final, la revisión visual y la publicación se registran por separado.

- Revisar los cuatro GLB comprimidos en el visor: frente, perfil, tres cuartos, espalda y unión del cuello con cada clip; comprobar que JPEG90 no borra detalle facial significativo.
- Revisar Ruly montado, sus contactos con la silla, manos y piernas, orientación en pendientes y espera delante del jugador, también en el regreso a paso doble. El GLB ya está exportado y habilitado localmente.
- Completar los seis capítulos y el epílogo con controles reales, pérdida y reintento; comprobar colisiones contra rocas, cercas y árboles, caída en cada cornisa, hallazgos y guardado.
- Completar QA táctil y rendimiento en calidad liviana, especialmente en la escuela con dos personas, fauna y guía; reconstruir y verificar el candidato final después de los cambios.
- Publicar el commit revisado y registrar su despliegue; comprobar `/jugar`, hashes de recursos y las 23 rutas documentales. La comprobación HTTP no sustituye una partida ni una revisión visual.

No se declara equivalencia con una producción AAA, captura facial completa ni una réplica exacta de las personas. El objetivo de esta entrega es una recreación reconocible y jugable cuya procedencia y límites puedan revisarse.

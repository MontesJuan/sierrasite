# SIERRA v2 — procedencia y límites de los recursos visuales

Estado documental al 13 de noviembre de 2026: recursos preparados e integración en validación. Este documento no acredita despliegue de v2 ni reemplaza la QA del juego. La primera versión publicada tiene su propio registro de entrega.

## Qué representa cada recurso

| Recurso | Procedencia | Alcance |
| --- | --- | --- |
| Paisaje del mirador | Reconstrucción multivista de una toma aérea original de SIERRA | Gaussian Splatting real de un sector observado; no reconstruye toda la sierra ni proporciona por sí solo colisiones o distancias métricas |
| Reyes, Rosalía y Mónica | Fotografías y fragmentos del documental con identidad contrastada | Conservan la apariencia filmada; no equivalen a personajes humanos tridimensionales, riggeados o libremente animables |
| Mula, cabra, gallina e iguana | Geometría creada localmente en Blender, con materiales y armature | Aproximaciones artísticas animadas; no escaneos de los animales filmados |
| Camioneta | Modelo genérico creado localmente en Blender | Interpretación para el epílogo; no reproducción certificada de un vehículo documental concreto |
| Suelo rocoso | Textura PBR externa CC0 | Detalle visual de superficie; no registra el terreno geográfico de SIERRA |

La vía externa de generación 3D mediante Higgsfield/Tripo quedó pendiente por falta de créditos del proveedor durante esta implementación. No produjo una reconstrucción humana que pueda darse por entregada. El trabajo local no convierte ese pendiente en una réplica exacta de Reyes.

## Personas: fuentes verificadas

**Ladislao Reyes Chávez.** La placa nominal de personajes del documental histórico, a 4280 s, vincula su nombre con el retrato de sombrero y camisa rayada. Se contrastaron además la entrevista del clip `A015_A003_0309RW` y la escena de mesa con cuadernos `A018_A037`. En el máster NV v10 se revisaron fotogramas a 3508 s y 3784 s. El fragmento preparado como `public/video/reyes.mp4` comienza a 3505 s y dura siete segundos, sin audio.

Una entrevista candidata a 1085 s y un perfil con gorra roja tenían atribuciones previas de catálogo que no resolvieron el cotejo nominal de esta selección. Se excluyeron como referencias de identidad para v2. Esta exclusión no identifica a otra persona ni modifica la fuente documental: evita convertir una atribución insuficiente en un modelo de Reyes.

**Rosalía Riveros.** Las notas de identidad confirmadas por el director y la secuencia `A011_C027` documentan huerta, cabras e hilado, con y sin anteojos. Los planos P0037–P0039 del catálogo corregido sostienen el encuentro en el corral y la salida con dos cabritos. Se revisaron el cuerpo entero en la huerta a 462 s, los cabritos a 524 s y el retrato junto al corral a 534 s del máster NV. `public/video/rosalia.mp4` comienza a 523 s y dura siete segundos, sin audio. No se utiliza como identificación la mujer de campera roja que sigue sin confirmación visual.

**Mónica Speso.** Su identidad se sostiene en el crédito nominal a 4288 s de la versión histórica, el catálogo de entrevista y el zócalo «Mónica Speso / Directora de la escuela» a 2623 s del máster NV. `public/video/monica.mp4` comienza a 2635 s y dura siete segundos, sin audio. Las referencias limpias disponibles tienen 1280 × 676 píxeles nativos: no se ampliaron para simular detalle adicional. No se localizó un conjunto de cuerpo entero y vistas completas.

Los tiempos de la versión histórica y del máster NV corresponden a montajes diferentes. No deben intercambiarse. Los originales, los manifiestos con rutas exactas y la evidencia nominal quedan en el archivo privado del proyecto. Los medios documentales no se relicencian como CC0.

La selección v2 reunió 22 referencias activas. JEV evaluó 15 miniaturas de medios revisados; no se enviaron documentos privados, credenciales ni imágenes con menores identificables. Sus puntuaciones orientan claridad y pertinencia, no certifican identidad, derechos ni precisión tridimensional.

## Paisaje reconstruido

El insumo fue `DJI_0307`, una toma aérea original: 60 fotogramas de 720 × 406 píxeles entre 5 y 25 segundos. COLMAP registró las 60 vistas; Brush completó 5000 pasos y produjo 115.591 gaussianas. La distribución preparada ocupa 2.299.852 bytes en `public/scenes/sierra-valley-5000.spz`; procedencia, conteo y cámaras están en `public/scenes/sierra-observatory.json`.

Ese resultado corresponde a apariencia multivista del sector capturado. La escala es relativa; la captura no cubre todos los lados ni todo el recorrido del juego. El mirador debe limitarse a vistas respaldadas por el registro. La navegación y las colisiones pertenecen a la escena jugable. Los resultados y reservas técnicas están en [GAUSSIAN.md](GAUSSIAN.md).

## Fauna y vehículo

Los recursos previstos son `mule.glb`, `goat.glb`, `chicken.glb`, `iguana.glb` y `pickup.glb`. `public/models/manifest.json` conserva sus nombres de animación y procedencia. La mula incluye cuatro patas articuladas, cabeza, orejas, cola, arnés, silla y alforjas; el resto tiene movimientos específicos. La exportación definitiva, la deformación de articulaciones y su integración siguen sujetas a revisión visual.

Las fotografías del viaje orientaron el equipo de la mula; el documental aportó cabritos y aves de corral. El fotograma aviar revisado muestra un gallo en primer plano, no una gallina. No se encontró una referencia documental de iguana verificada en el relevamiento. La gallina e iguana modeladas son interpretaciones del entorno; no representan individuos escaneados. La fauna no es un objetivo de daño.

## Material de suelo y licencia

**Dry Ground Rocks**, de **Rob Tuytel**, obtenido de [Poly Haven](https://polyhaven.com/a/dry_ground_rocks), se publica allí bajo **CC0**. Las copias optimizadas del proyecto son `public/textures/ground-color.webp`, `ground-normal.webp` y `ground-roughness.webp`. Se conserva la atribución por trazabilidad, aunque la [licencia de los assets de Poly Haven](https://polyhaven.com/license) no exige crédito. Esta licencia corresponde al recurso de suelo; no se extiende a fotografías de SIERRA, personas, marca ni materiales del documental.

## Qué falta para un Reyes fiel y animable

El siguiente ciclo necesita una captura o un conjunto documental apto para reconstrucción, seguido de trabajo de personaje. Como especificación de producción:

1. Confirmar con dirección el conjunto de identidad y vestuario, manteniendo separadas las épocas y las referencias dudosas.
2. Reunir originales nítidos de frente, ambos perfiles, tres cuartos, espalda y cuerpo entero, incluidos manos, calzado y sombrero. Evitar depender de un único retrato comprimido.
3. Si es posible una captura nueva autorizada, mantener postura y expresión estables, luz uniforme, enfoque y focal constantes; mover la cámara alrededor del sujeto y conservar solapamiento entre vistas. COLMAP recomienda distintos puntos de vista, buena textura e iluminación semejante; girar desde un único punto no aporta la misma evidencia espacial. [Guía de captura de COLMAP](https://colmap.github.io/tutorial.html#structure-from-motion).
4. Revisar la reconstrucción desde ángulos nuevos y cotejar silueta, proporciones y rostro con dirección. Una imagen proyectada o una salida generativa no basta como prueba de semejanza.
5. Preparar malla, UV, materiales, esqueleto y pesos; después animaciones corporales y, si se requieren, expresiones faciales. Evaluar articulaciones, rostro y ropa en movimiento dentro del navegador.

La aprobación requiere evidencia visual y técnica de ese personaje concreto. El splat del paisaje, los clips documentales y la fauna animada son entregables distintos y no completan por sí solos este pendiente.

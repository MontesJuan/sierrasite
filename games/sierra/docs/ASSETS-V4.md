# Jugabilidad y recursos v4

Estado de este documento: **candidato local**. Describe lo implementado en el código y los archivos del subproyecto. No afirma publicación: el estado de producción se registra por separado al desplegar un commit revisado.

Los documentos [ASSETS-V2.md](ASSETS-V2.md), [ASSETS-V3.md](ASSETS-V3.md) y [HUMAN-MODELS.md](HUMAN-MODELS.md) siguen describiendo sus versiones. Los créditos de terceros y de material generado están en [ASSET-CREDITS.md](ASSET-CREDITS.md).

## Qué cambia para quien juega

- **Palabras del camino.** Cada tramo tiene ocho letras doradas. Al pasar por una se suma una palabra con su definición al «Diccionario de la sierra» (48 en total). Dos por tramo están altas y piden saltar. Son vocabulario del lugar y de los oficios (`src/rewards.js`); no son versos ni frases atribuidas a Ladislao Reyes.
- **Tres estrellas por tramo:** llegar al encuentro, encontrar los tres cuadernitos y fotografiar un animal.
- **Álbum de fauna.** La cámara (tecla F o botón) reconoce al animal encuadrado. Cada especie tiene una distancia mínima: más cerca no hay foto y el juego pide alejarse. La calificación (1 a 3) mejora con el encuadre y una distancia adecuada. Es una regla de juego, no una guía para el campo.
- **Mi libro del camino.** Reúne nombre o nombre de equipo (opcional), estrellas, las fotos tomadas en el juego y las palabras encontradas. Se imprime o se guarda como PDF desde el navegador.
- **Tiempo por tramo** y mejor marca, visibles en el cierre de capítulo y en el mapa.
- **Sonido activado por defecto** en partidas nuevas, con música y efectos. Se apaga desde el botón de sonido o los ajustes.

## Datos y privacidad

No hay cuentas, red social ni envío de datos. El progreso (`sierra-juego-v1`) y las fotos del juego (`sierra-fotos-v1`, JPEG de 384×240) se guardan sólo en el almacenamiento local del navegador. El nombre del libro se limpia de etiquetas y se limita a 24 caracteres; nunca sale del dispositivo. Empezar un viaje nuevo borra las fotos y conserva el nombre y las preferencias.

## Personajes

Las mallas y texturas de los cinco personajes son las de v3; sus archivos no cambiaron. Cambia cómo se muestran (`tuneHumanSkin` en `src/world-assets.js`):

- La piel proviene de una fotografía proyectada, que ya trae su luz. Ahora se muestra con poco sombreado nuevo (componente emisiva 0,4 y difusa 0,4) para que el relieve irregular de la reconstrucción no manche el rostro.
- Las normales se recalculan suavizadas al cargar, unificando los vértices duplicados en las costuras.
- El visor y el mundo usan suavizado de bordes.

Esto mejora la lectura del rostro; no cambia la semejanza de la geometría ni agrega animación facial. Siguen siendo recreaciones, no escaneos.

**Ruly sobre la mula.** La mula guía reutiliza la malla de la mula de carga. El pliegue que bajaba la carga aplastaba también la grupa del animal. Ahora sólo se baja la carga, entre la cruz y la grupa, sobre una línea de lomo redondeada, y se agrega una montura con pelero tejido. La malla publicada no cambia; el ajuste ocurre en la copia de la guía.

## Mula

`mule.glb` conserva geometría, 33 huesos y clips `Idle`/`Walk`. Sus tres texturas pasaron de PNG a JPEG de 2048 px (calidad 84) con `scripts/compress-glb-textures.mjs`: de 15.424.336 a 5.669.204 bytes. El manifiesto registra el nuevo tamaño y SHA-256.

## Paisaje y construcciones

- **Luz por capítulo.** Seis atmósferas (dirección y color del sol, cielo, niebla, exposición): de la mañana en Astica al atardecer en Vallecito y el amanecer del regreso.
- **Postprocesado.** Resplandor leve y suavizado de bordes con los pases incluidos en Three.js. La calidad «Liviana» lo desactiva.
- **Telar de palos** junto a la casa de Margarita: horcones, travesaños, lizos, peine, urdimbre, tejido en proceso, banquito y ovillos. Los lizos y el peine se mueven.
- **Escuela, ranchos y corral** modelados sobre las tomas del documental (ver «Lugares reales»). Si un modelo no carga, queda una construcción sencilla hecha por código.
- **Majadas** en las laderas: copias estáticas de la cabra dibujadas por instancias, seis grupos por tramo, con algunas que se desplazan despacio.

El telar, las majadas y el relieve son geometría creada por código para jugar; no reconstruyen lugares reales.

## Fauna

Los modelos `v5-*.glb` se hicieron en Blender 5.3 con los guiones de `scripts/blender/fauna-v5/`: malla continua, esqueleto, animaciones en bucle y una textura proyectada desde una imagen de referencia generada con IA. Son modelos artísticos, no escaneos de animales del documental. Si un archivo falta en el manifiesto, el juego usa el modelo anterior o no muestra esa especie.

| Especie | Archivo | Bytes | Triángulos | Clips |
| --- | --- | ---: | ---: | --- |
| Cabra criolla | `v5-cabra.glb` | 669.932 | 12.500 | Idle, Walk, Graze |
| Cabra para majadas (dos poses fijas) | `v5-cabra-estatica.glb` | 208.040 | 2.392 | sin animación |
| Zorro gris | `v5-zorro.glb` | 578.264 | 11.998 | Idle, Walk |
| Puma | `v5-puma.glb` | 570.876 | 11.998 | Idle, Walk |
| Lagarto colorado | `v5-lagarto.glb` | 477.652 | 10.000 | Idle, Walk |
| Cóndor andino | `v5-condor.glb` | 480.088 | 8.480 | Soar, Flap |
| Pavo | `v5-pavo.glb` | 419.512 | 6.944 | Idle, Walk, Peck |
| Gallina | `v5-gallina.glb` | 392.800 | 6.748 | Idle, Walk, Peck |
| Culebra | `v5-culebra.glb` | 349.124 | 2.832 | Idle, Slither |

Los nueve archivos suman 4.146.288 bytes.

`scripts/register-models.mjs` mide cada archivo y actualiza el manifiesto.

## Sonido

`src/audio.js` sintetiza viento, pasos y señales. La música (tres piezas) y nueve efectos son archivos generados con IA para este juego, en `public/audio/`. Se descargan sólo con el sonido activado. No hay voces sintetizadas ni clonadas; las únicas grabaciones de personas son los fragmentos de entrevistas descritos abajo.

## Voces reales del documental

En los encuentros, debajo del diálogo adaptado, aparece un reproductor rotulado «Su voz en el documental» con un fragmento real de la entrevista de esa persona y su transcripción. No reemplaza al diálogo adaptado, no se reproduce solo y atenúa la música mientras suena.

| Persona | Fragmentos | Tramo del juego |
| --- | --- | --- |
| Rosalía | la huerta; la educación | 3 · La escuela |
| Mónica | la transcripción; el trabajo con los poemas | 3 · La escuela y 6 · El libro |
| Margarita | su oficio; las tintas naturales | 4 · Margarita |
| Ladislao Reyes | los cuadernos; su ilusión | 5 · Reyes |

- Ocho MP3 mono de 7,5 a 9,5 segundos (818.765 bytes en total) en `public/audio/voces/`, con el índice `voces.json`. Cada uno se descarga recién al pulsar reproducir.
- Son cortes continuos, sin montaje interno: sólo se niveló el volumen y se agregaron fundidos de entrada y salida. La voz de Margarita proviene de la entrevista ya limpiada de ruido.
- No hay poemas ni canciones de Reyes, voces de chicos ni escenas de aula. Ruly y el baqueano no tienen fragmento. Un mismo fragmento no se repite dentro de un encuentro.
- Las transcripciones se compararon con los subtítulos de la película y con reconocimiento automático. **Ninguna persona las escuchó todavía.** Dudas abiertas: en `rosalia-2`, «viniendo» o «viviendo»; en `margarita-2`, «teño» o «tiño».
- La toma y el tiempo de origen de cada fragmento se conservan fuera del repositorio.
- Antes de publicar: escucha y aprobación del director, y confirmación de que el uso de cada voz en el juego está cubierto por la autorización dada para el documental.

## El camino según el registro real

Cada tramo toma su forma del registro GPS de la expedición (`scripts/build-route-data.py` genera `src/route-data.js`; `src/route.js` lo interpreta):

| Tramo del juego | Tramo real | Largo | Rumbo | Altura |
| --- | --- | ---: | --- | --- |
| 1 · Astica | De Astica a la boca del valle | 5,0 km | noroeste | 740 → 990 m |
| 2 · El río | Por el cauce del río | 5,1 km | oeste | sube 430 m |
| 3 · La escuela | La subida a la escuela | 5,0 km | oeste | llega a 1.620 m |
| 4 · Margarita | De la escuela a lo de Margarita | 5,5 km | oeste | 1.620 → 1.830 m |
| 5 · Reyes | De lo de Margarita a Vallecito | 2,9 km | sur | 1.830 → 2.100 m |
| 6 · El libro | De Vallecito a la escuela | 8,7 km | este-noreste | 2.100 → 1.620 m |

El juego conserva el rumbo, las curvas y el sube y baja de cada tramo, comprimidos a 96 metros jugables; no las distancias. La brújula muestra el rumbo verdadero y el sol está donde estaría a esa hora del viaje. La ficha de cada capítulo cita el largo, el rumbo y la altura reales. Las coordenadas no se publican y el recorrido no sirve para orientarse en la montaña. El paso de la mula y de quien camina es un 20 % más rápido que antes, para que cada tramo sea más breve.

## Energía de la mula y dificultades

Reglas en `src/hazards.js`, parte visible en `src/trail-hazards.js`:

- **Energía.** Se gasta al andar montado, más al trote, cuesta arriba y en el barro. Vuelve al frenar, al caminar a la par de la mula y, más rápido, junto a los dos bebederos de cada tramo. Con poca energía no se puede trotar; sin energía se cae un bulto.
- **La carga.** Tres bultos por intento. Se pierden por golpes de piedras, por tocar rocas, por invadir a la fauna y por agotar a la mula. Sin bultos, o al caer de la cornisa, el tramo vuelve a empezar.
- **Cansancio acumulado.** Cada intento perdido hace que el siguiente empiece con menos energía (100, 88, 76 y 64 %; no baja más). Al terminar cualquier tramo la mula descansa y vuelve a estar entera.
- **Peligros del camino**, que crecen capítulo a capítulo: piedras que cruzan la huella con aviso sonoro, ráfagas que empujan hacia el precipicio en la cornisa, matas espinosas en los bordes, barro y una culebra que cruza la huella y asusta a la mula si se le viene encima. Nada daña a los animales: la respuesta correcta es frenar, rodear o esperar.

Son reglas de juego. No describen riesgos, tiempos ni técnicas del territorio real.

## Lugares reales

Tres capas distintas, que no hay que confundir:

**1. Texturas del terreno**, recortadas de tomas de drone del documental (WebP de 1024 px, 401.072 bytes en total, en `public/textures/`):

| Archivo | Dónde se usa | Escala estimada |
| --- | --- | --- |
| `real-suelo.webp` y su relieve | Todo el suelo y el color de la huella | 4,9 m por baldosa |
| `real-huella-normal.webp` | Los surcos de la huella, como relieve | 3,2 m |
| `real-roca.webp` y su relieve | Rocas del paisaje y piedras del camino | 1,6 m |
| `real-agua.webp` | El río del segundo tramo, con un tinte verdoso | 2,3 m |

Para que se puedan repetir sin costuras se quitaron matas y sombras largas, y se igualó el color entre tomas. Las escalas son estimaciones a partir del tamaño de los objetos, no mediciones. Si un archivo falta, el juego usa la textura anterior.

**2. Construcciones modeladas en Blender 5.3** (`scripts/blender/lugares-v6/`): geometría sencilla a escala, vestida con recortes de las mismas tomas. No son escaneos ni relevamientos.

| Modelo | Bytes | Triángulos | De dónde sale | Qué tan fiel es |
| --- | ---: | ---: | --- | --- |
| `v6-escuela.glb` | 459.632 | 604 | Fachada, columnas, escalera y terraplén de la escuela vistos desde el drone | La más cercana al lugar. Sólo se modeló el tramo de fachada visible; costados y fondo son lisos |
| `v6-rancho-piedra.glb` | 252.912 | 166 | La casa de piedra del patio del telar | La más simple: forma general y una textura de piedra sustituta |
| `v6-rancho.glb` | 434.256 | 400 | Pared de adobe sobre zócalo de piedra, cerco de palos y ramada | Un rancho típico armado con dos referencias, no el retrato de una casa. El techo no se ve en la toma y se supuso de chapa |
| `v6-corral.glb` | 813.108 | 438 | Contorno, cobertizo y piso de un corral de pirca real, trazados sobre una toma cenital | Fiel visto desde arriba; a la altura de los ojos es un corral creíble, no una copia |

- La escuela aparece en los tramos 3 y 6; la casa de piedra, en lo de Margarita; el rancho de adobe y el corral, en lo de Reyes. **El corral se trazó sobre un corral real cercano a la escuela y el rancho de adobe es genérico: en el juego están en lo de Reyes como recreación, no como registro de su casa.**
- El terreno se aplana en una terraza debajo de cada construcción, siempre después del final del tramo, donde la huella ya es llana. Las cajas de colisión salen de la planta de cada modelo.
- Ningún modelo ni textura contiene personas. En la fachada de la escuela se cubrieron el interior de una puerta abierta y un afiche con un dibujo de dos chicos.

**3. Reconstrucciones Gaussian** (`public/scenes/`), que se ven sólo en «Archivo vivo» y desde el botón del encuentro, nunca dentro del mundo jugable:

| Escena | Bytes | Cuadros | Recorrido válido |
| --- | ---: | ---: | --- |
| `escuela.spz` | 2.380.814 | 84 | Acercamiento frontal de unos 7 m a la galería |
| `corral.spz` | 2.439.586 | 80 | Desplazamiento lateral de unos 6 m, vista oblicua |
| `rancho.spz` | 2.308.429 | 84 | Arco elevado de unos 88 m alrededor de un rancho entre álamos |

- 120.000 gaussianas cada una, con el mismo método que la escena del valle (COLMAP 4.1.1 y Brush 0.3.0). Cada manifiesto declara su límite: fuera del recorrido del vuelo no hay evidencia y la imagen se deshace.
- En la escuela se cubrió el vano de una puerta en los cuadros de origen para no reconstruir a una persona sentada adentro. En la escena del corral queda, lejos en la ladera, una figura de pie de unos pocos píxeles, no identificable.
- Los nombres son neutros. Ninguna escena se atribuye a una familia mientras el director no lo confirme. El encuentro con Reyes no ofrece ninguna porque no hay una reconstrucción de su lugar.
- No se publican coordenadas.

## Límites conocidos

- No es fotorrealismo de consola. El objetivo es un aspecto documental creíble en un navegador y en equipos escolares.
- La cámara reconoce especies por su posición en el juego, no por visión artificial.
- Los animales de las majadas lejanas no mueven las patas.
- Falta validar con chicos y docentes la duración, la dificultad de las letras altas y la lectura de las definiciones.

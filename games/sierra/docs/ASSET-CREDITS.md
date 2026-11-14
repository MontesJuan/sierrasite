# Créditos de modelos externos

## DONKEY 13

- Obra original: [DONKEY 13](https://sketchfab.com/3d-models/donkey-13-77bcefe8d32b40cba8e706f43e3e0996).
- Autor: [amoreno](https://sketchfab.com/amoreno).
- Licencia: [Creative Commons Atribución 4.0 Internacional](https://creativecommons.org/licenses/by/4.0/).
- La ficha original describe un burro de carga generado con IA. No identifica el generador utilizado. El archivo original carece de animaciones. Es una representación artística; no es un escaneo del animal del documental.

La variante preparada para SIERRA se identifica con `attribution.id: "donkey-13"` en `public/models/manifest.json`. Las modificaciones realizadas son optimización de 124.996 a 85.000 triángulos, empaquetado de texturas, rig de 33 huesos y animaciones `Idle` y `Walk`. En v4 sus texturas se recomprimieron a JPEG de 2048 px, sin cambios de geometría. Su campo `attribution.changes` resume estos cambios. El visor del archivo muestra los enlaces a la obra, al autor y a la licencia junto al modelo registrado. La atribución no implica respaldo del autor al juego.

El modelo anterior de mula creado de forma procedural en Blender no procede de DONKEY 13 y no recibe esta atribución. La sustitución está registrada en el candidato v3; su alcance y estado de publicación se distinguen en [ASSETS-V3.md](ASSETS-V3.md). Este documento no afirma que un candidato pendiente ya esté desplegado.

## Otros recursos

Las fotografías pertenecen al archivo documental SIERRA. Las recreaciones humanas en 3D se distinguen de sus fotografías originales en el visor; su método y aprobación constan en [HUMAN-MODELS.md](HUMAN-MODELS.md). La procedencia del paisaje reconstruido, el material CC0 de Poly Haven y la fauna procedural se detalla en [ASSETS-V2.md](ASSETS-V2.md).

## Lugares del documental

Las texturas `public/textures/real-*.webp`, los modelos `public/models/v6-*.glb` y las escenas `public/scenes/escuela`, `corral` y `rancho` se hicieron con tomas de drone y de cámara del archivo original de SIERRA. Detalle y límites en [ASSETS-V4.md](ASSETS-V4.md).

## Voces del documental

Los ocho archivos de `public/audio/voces/` son fragmentos de las entrevistas originales del documental SIERRA a Ladislao Reyes, Rosalía, Margarita y Mónica. Pertenecen al archivo de la película y se usan rotulados como tales. No son voces generadas. Detalle en [ASSETS-V4.md](ASSETS-V4.md).

## Material generado con IA para v4

Generado el 14/11/2026 desde la cuenta del autor en Creative Claw. No reproduce obras ni voces de terceros y no usa fotografías del archivo como entrada.

- **Música** (`public/audio/musica-viaje.mp3`, `musica-encuentro.mp3`, `musica-libro.mp3`): tres piezas instrumentales de inspiración andina generadas con Google Lyria 3.5 y recodificadas a MP3 de 96 kbps.
- **Efectos** (`cabra`, `majada`, `pavo`, `gallina`, `rio`, `tranquera`, `telar`, `mula`, `charango`, en `public/audio/`): generados con ElevenLabs Sound Effects v2.
- **Referencias de fauna**: ocho imágenes generadas con Nano Banana 2 (cabra, zorro, puma, pavo, gallina, cóndor, lagarto y piel de culebra). Se usan como textura proyectada de los modelos `v5-*.glb`; las imágenes originales no se publican. No son fotografías del documental ni de animales del lugar.

Los modelos `v5-*.glb` son geometría, esqueleto y animación propios, hechos en Blender 5.3 para SIERRA. Su descripción está en [ASSETS-V4.md](ASSETS-V4.md).

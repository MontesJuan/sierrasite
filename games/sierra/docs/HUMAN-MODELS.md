# Personajes humanos

Los IDs `reyes`, `rosalia`, `margarita` y `monica` incorporan localmente las cabezas dedicadas de la revisión facial v4 en `public/models/manifest.json`. Los archivos usan Meshopt y texturas JPEG90, con bytes y SHA medidos. El estado, tamaños y revisión visual pendiente se registran en [ASSETS-V3.md](ASSETS-V3.md). La presencia de un archivo integrado no acredita su publicación ni parecido exacto.

Ruly Chávez está exportado y aprobado para integración local como quinto personaje y guía montado: 4.503.492 bytes, 93.332 triángulos, 20 huesos, dos atlas JPEG90 de 2048² y clips `Idle`/`Ride`. Su archivo y SHA coinciden con el manifiesto. Falta QA conjunta de rostro, montura, movimiento y controles dentro del juego; la aprobación local no acredita producción ni fidelidad exacta.

Para futuras entradas pendientes se usan sólo `kind: "human"`, `available: false` y `approved: false`, sin inventar archivo ni medidas. Las fotografías documentales permanecen disponibles en el archivo, con o sin modelo.

## Registrar un modelo revisado

Exportar un GLB autocontenido dentro de `public/models/`: texturas y buffers embebidos, Y hacia arriba y frente hacia +Z. Revisar semejanza, geometría, materiales, derechos y movimiento antes de habilitarlo. El script mide tamaño, SHA256, triángulos y clips reales; no genera ni aprueba visualmente el recurso.

```sh
node scripts/register-human-model.mjs reyes --file reyes.glb \
  --kind single-image-inference --tool 'TripoSR + Blender' --approved
```

Ejecutar desde `games/sierra`. Repetir con el ID correspondiente. `--height` cambia la altura de normalización del juego, en metros; no es una medición de la persona. `--yaw` corrige orientación en radianes. `--idle`, `--talk`, `--walk` y `--ride` asignan alias a nombres de clips existentes; `Idle`, `Talk`, `Walk` y `Ride` se reconocen automáticamente. Una malla estática es válida y no recibe clips ficticios. Registrar Ruly conserva `Ride` y no fabrica `Talk` o `Walk`.

Las otras procedencias admitidas son `multiview-reconstruction` y `authored`; seleccionar sólo la que describe el proceso real. El script preserva los cinco modelos previos y las demás entradas humanas. No incluir rutas originales privadas, correspondencia o metadatos personales dentro del GLB o del manifiesto.

La compresión actual conserva exactamente los arrays de atributos, UV, pesos, joints, matrices de enlace y animación después de decodificar; las transformaciones de nodos tienen una tolerancia inferior a `2e-6` por componente. Los triángulos conservan cara y orientación aunque el índice inicial de sus tres vértices rote. JPEG90 sí cambia muestras de color. Registrar y verificar el GLB comprimido que realmente recibe el navegador, con el decodificador Meshopt habilitado; no reutilizar el hash de la exportación anterior.

## Comportamiento

- La galería muestra a las cinco personas y sus fotografías originales. El botón 3D aparece sólo si la entrada está aprobada y el archivo responde con tamaño compatible; fallos de carga vuelven al retrato. Margarita y Ruly no requieren videos inexistentes.
- Capítulo 3: Rosalía y Mónica junto a la escuela; capítulo 4: Margarita; capítulo 5: Reyes; capítulo 6: Mónica. Los encuentros quedan en 98–99, a dos o tres unidades de la llegada en 96. Las posiciones son una adaptación narrativa.
- Los personajes permanecen en su encuentro. Usan `Idle` y, si existe, `Talk` al hablar la persona correspondiente; no caminan durante una conversación. `Talk` es gesto, no sincronización labial ni voz clonada.
- Ruly acompaña montado con `Ride` y descansa con `Idle`; queda excluido del cambio de animación por diálogo. Su frente +Z se alinea con el frente +X de la mula mediante el giro de instancia. Sólo se carga desde una entrada humana aprobada.
- El rig corporal tiene 20 huesos y no incluye rig facial. Mónica conserva los brazos en reposo por ropa fusionada en la malla; el gesto se limita a torso y cabeza.
- El visor permite explorar y reproducir sólo clips presentes. Respeta movimiento reducido salvo reproducción solicitada expresamente. La etiqueta es «Recreación 3D basada en fotografías».
- La luz de los humanos usa ACES, exposición 1, hemisférica 1.7 y sol 2.5 como punto inicial de QA. El paisaje Gaussian conserva su render anterior.

La instantánea local del 14/11 pasó 62/62 pruebas, incluido el registro de `Ride` y la independencia de huesos, geometría modificada y liberación de recursos de la mula guía. Verificar el build final y QA visual, alternando los cinco retratos/modelos, cambios rápidos de pestaña, cierre, pantalla móvil y capítulos con dos personajes. Los tests de datos y recursos no demuestran parecido facial ni rendimiento de la escena completa.

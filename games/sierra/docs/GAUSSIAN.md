# Gaussian Splatting y actores glTF

La segunda etapa separa el paisaje documental reconstruido de los personajes animados. `splat-loader.js` usa Gaussian Splatting real mediante Spark; `world-assets.js` carga modelos GLB con sus clips de animación. Ninguno de estos módulos transforma una fotografía en una superficie y la presenta como reconstrucción.

## Dependencias y formatos

- `three` 0.181.2 y `@sparkjsdev/spark` 2.4.0, versiones fijadas. El paquete Spark exige Three >=0.180.0; las declaraciones de tipos instaladas se cotejaron con la implementación.
- Entornos: `.spz` (v1–v3 gzip y v4), `.ply` Gaussian estándar o comprimido SuperSplat y `.splat`. Un PLY con sólo puntos XYZ/RGB se rechaza.
- Actores: GLB 2.0 autocontenido, texturas embebidas y clips nombrados. Meshopt está soportado; Draco/KTX2 requieren decodificadores autoalojados proporcionados por el integrador.
- La escena Gaussian se integra en el mismo `renderer.render(scene, camera)` de Three. El renderer debe crearse con `antialias: false` y una sola instancia de Three.

Documentación primaria: [Spark: carga](https://sparkjs.dev/docs/loading-splats/), [SparkRenderer](https://sparkjs.dev/docs/spark-renderer/), [rendimiento](https://sparkjs.dev/docs/performance/), [repositorio Spark](https://github.com/sparkjsdev/spark), [formato SPZ](https://github.com/nianticlabs/spz), [GLTFLoader de Three](https://threejs.org/docs/#examples/en/loaders/GLTFLoader).

## Integración

```js
import { SierraSplatLayer } from './splat-loader.js';
import { loadWorldAsset } from './world-assets.js';

const layer = new SierraSplatLayer({
  scene: world.scene,
  renderer: world.renderer,
  quality: 'auto',
  onFallback: () => { /* mostrar entorno alternativo y estado explícito */ },
});
await layer.load(environmentManifest);
// En el rAF: usar delta real, antes del clamp de la física.
layer.update(rawDeltaSeconds);

const actor = await loadWorldAsset(characterManifest, {
  scene: world.scene, renderer: world.renderer,
});
actor.play('walk'); // alias hacia un clip exportado: devuelve false si falta
actor.update(deltaSeconds);
// Al cambiar escena:
actor.dispose();
layer.unload();
```

Mantener estas capas fuera del grupo procedural que `setChapter()` destruye. El splat es apariencia: navegación y colisiones necesitan una malla o restricciones de recorrido independientes. No asumir que puede caminarse por todo un splat: la reconstrucción sólo tiene evidencia desde las vistas capturadas. Para una toma aérea corta, un mirador con órbita limitada suele respetar mejor el volumen observado.

## Manifiestos verificados

Entorno: `id`, `url`, `format`, `bytes` reales, `numSplats` del encabezado, `provenance.kind`, transformación opcional `position`, `rotation` en radianes y `scale` uniforme. Tipos admitidos: `multiview-reconstruction` o `generated-world`; el segundo describe una generación, no una reconstrucción documental. Conservar además procedencia editorial y evidencia de entrenamiento fuera de la web cuando contenga rutas privadas.

Actor: `id`, `url`, `bytes`, transformación, `heightMeters` opcional, `animations` como mapa de aliases y `requiredAnimations`. Ejemplo de aliases: `{ idle: 'Idle', walk: 'Walk', talk: 'Talk' }`. Los clips tienen que existir; el cargador no inventa movimiento. Exportar personajes, mula, cabras, gallinas, iguana y vehículo/portón como recursos independientes permite distribuir presupuesto y disponerlos por capítulo.

## Presupuestos de implementación

| Perfil | Archivo máximo | Gaussianas fuente máximas | Objetivo LoD | Pixel ratio máximo |
| --- | --- | --- | --- | --- |
| Bajo | 16 MiB | 350.000 | 180.000 | 1 |
| Auto | 32 MiB | 800.000 | 400.000 | 1,25 |
| Alto | 64 MiB | 1.500.000 | 900.000 | 1,5 |

Son límites del juego, no garantías de rendimiento. Una escena activa a la vez. Los archivos se descargan con límite efectivo por stream, incluso sin Content-Length. El conteo del encabezado se compara antes de decodificar. SPZ preflight requiere DecompressionStream en archivos gzip. LoD puede añadir nodos internos; el conteo declarado corresponde a gaussianas fuente.

Tras 3 segundos de calentamiento, 5 segundos sostenidos por debajo de 23 fps reducen calidad. Si persiste en perfil bajo, se libera la capa y se activa fallback. Las pestañas ocultas y saltos de tiempo no cuentan. El juego decide la presentación del fallback y conserva la jugabilidad. Los GLB tienen límite de 18 MiB, 120.000 triángulos por recurso y 16 megapíxeles de texturas; estos últimos se verifican al decodificar.

## Reconstrucción local

[Brush](https://github.com/ArthurBrussee/brush) entrena Gaussian Splatting desde COLMAP o Nerfstudio mediante WebGPU, incluido macOS. La prueba local utiliza Brush 0.3.0 Apple Silicon con checksum contrastado y COLMAP 4.1.1 sin CUDA. No se requiere ni se afirma disponer de NVIDIA/CUDA. La presencia del programa no acredita que se haya entrenado una escena: revisar el manifiesto de entrega y los logs del ensayo.

Ruta técnica: fotogramas con paralaje → features/matching COLMAP CPU → cámaras y puntos dispersos → entrenamiento Brush Metal → PLY Gaussian → exportación de distribución y prueba en Spark. Panorámicas con sólo giro no aportan por sí solas el paralaje necesario. Imágenes inconexas tampoco garantizan una escena reconstruible.

## Verificación de los módulos

31 tests Node pasaron en la ejecución final, incluyendo los 8 controles nuevos de Gaussian/GLB: rechazo de nubes de puntos, encabezados PLY/SPZ, presupuestos/procedencia, streams limitados, GLB autocontenidos y nombres reales de animación. Ambos módulos se compilaron con Vite en un harness temporal; Spark se mantiene como importación diferida, aproximadamente 988 KB gzip en esa compilación. Eso no sustituye la comprobación visual de una escena real y un personaje real dentro del juego.


## Escena documental producida el 13/11/2026

La prueba terminó: 60 fotogramas de un movimiento aéreo original fueron registrados, con 4.758 puntos de estructura y error medio de reproyección de 0,258 píxeles. Brush completó 5.000 pasos y produjo 115.591 gaussianas. El artefacto de distribución `public/scenes/sierra-valley-5000.spz` ocupa 2.299.852 bytes; su conteo, tamaño y SHA-256 se verifican contra `sierra-observatory.json` en los tests.

El manifiesto contiene 60 posiciones y orientaciones de cámara convertidas a Three, fov vertical 43,428° y aspecto de captura 720/406. La escala de COLMAP es relativa, no metros medidos. Para pantallas más anchas que la captura, preservar el campo horizontal observado evita exponer partes no vistas del volumen. En el punto medio, un render nativo de evaluación comparado con su fotograma retenido obtuvo SSIM 0,975814; es una comparación de apariencia en esa vista, no una certificación geométrica de toda la escena.

La versión inicial de 2.500 pasos fue visualizada en Chrome por el agente de integración: estructura y orientación coherentes, sin errores reportados. La confirmación final de la versión 5.000 pasos y de su integración en `/jugar` pertenece a la QA de publicación. El original, las imágenes de entrenamiento, el modelo COLMAP, los checkpoints y la evidencia privada permanecen en el archivo del proyecto, fuera del repositorio público. No se alteraron los medios originales.

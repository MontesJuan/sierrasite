# SIERRA — El camino de las palabras

Aventura educativa de navegador de 6 capítulos para chicos de 8 a 12 años. Viaje en mula, obstáculos, conversaciones adaptadas, fotografías de archivo, diario, seis minijuegos, pérdida/reintento y progreso local.

Publicado dentro del sitio documental en `/jugar`. El build del sitio ejecuta `npm run game:build`; instala este subproyecto, compila Vite con base `/jugar/` y sincroniza la salida con `public/jugar`. No editar la salida compilada a mano.

Desarrollo aislado: `npm ci && npm run dev`. Pruebas: `npm test`. Producción: `npm run build`. Controles WASD/flechas, E interacción/montura, espacio salto, F fotografía, J diario, M mapa y Esc pausa. En pantalla táctil aparecen flechas/salto; se arrastra para mirar.

Requiere WebGL. Preferencias de calidad, movimiento reducido y audio opcional en pausa. Sin cuentas, anuncios, analítica ni servicios externos; guarda sólo progreso local. La aventura usa un paisaje 3D creado para el juego. El Archivo vivo incorpora un sector real reconstruido mediante Gaussian Splatting (60 vistas del dron), retratos documentales en movimiento y un visor de la fauna animada en Blender. La nueva búsqueda de llave abre una tranquera; al completar los seis capítulos se desbloquea el regreso de 2024 en camioneta. Los personajes humanos animables e hiperrealistas siguen pendientes: los planos originales preservan su identidad. Ver `docs/ASSETS-V2.md`, `docs/GAUSSIAN.md` y `docs/V2-EXPEDITION.md`. Diálogos y actividades son adaptaciones. Ver `docs/NARRATIVE.md`.

Las fotografías, logo y demás material de SIERRA conservan sus derechos originales. Las licencias de las fuentes se incluyen en public/fonts. Three.js (MIT), Spark (MIT) y Vite (MIT) constan en dependencias. No se redistribuye el archivo documental privado ni correspondencia.

La fuente editable de los modelos está en `scripts/blender/build-fauna.py`. Guardar primero el proyecto Blender y crear una carpeta `models` junto al `.blend`; el script crea escenas nuevas y exporta sólo la escena activa, sin metadatos privados. La copia de trabajo `.blend` y las fuentes originales se conservan fuera del repositorio público.

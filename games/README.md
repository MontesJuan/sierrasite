# SIERRA — aventura en el navegador

El videojuego vive en `games/sierra/` y se publica dentro del sitio documental, en **https://sierradoc.site/jugar**. Comparte el repositorio `MontesJuan/sierrasite` y el proyecto Vercel del sitio.

## Construcción

- `npm ci`: instalar las dependencias del sitio.
- `npm run game:build`: instalar las dependencias bloqueadas del juego, compilarlo y sincronizar su salida con `public/jugar/`.
- `npm run build`: reconstruir primero el juego y después el sitio Next.js.
- `npm run dev`: iniciar el sitio; ejecutar `game:build` antes de comprobar `/jugar`.

El juego debe configurar Vite con `base: '/jugar/'`. Sus imágenes, fuentes y scripts se resuelven dentro de esa ruta. Next.js reescribe solamente `/jugar` hacia `/jugar/index.html`; las peticiones a archivos conservan sus rutas propias. Los enlaces de entrada son enlaces HTML completos para abrir el juego fuera del shell y el enrutador del documental.

`scripts/sync-game.mjs` valida la salida antes de reemplazarla y restaura la anterior si falla el reemplazo. `public/jugar/` y `games/sierra/dist/` son resultados de compilación, no fuentes versionadas.

## Alcance del repositorio

Versionar únicamente el código del juego, sus pruebas y documentación pública, recursos seleccionados y sus licencias. No copiar el vault, notas privadas, inventarios de archivo, `asset-review`, configuraciones locales, credenciales ni documentación de INCAA. El código no modifica los originales de SIERRA.

Los diálogos del juego son adaptaciones educativas. Los seis capítulos comprimen recorridos históricos y no representan seis expediciones literales. Conservar esta distinción al modificar el contenido.

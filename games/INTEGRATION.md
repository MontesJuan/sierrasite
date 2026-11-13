# Integración del videojuego — 13/11/2026

La integración parte del commit publicado `0377c2b` de `MontesJuan/sierrasite`. El sitio documental conserva su contenido y sus rutas; incorpora una entrada de navegación y una invitación en la portada hacia `/jugar`.

## Cambio de framework necesario

La base usaba Next.js 14.2.32. El [aviso oficial del 14/10/2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026) identifica como versiones corregidas las líneas 15.5.28 y 16.4.1. La línea 14 no tiene un parche que cubra los avisos actuales. Se eligió **Next.js 15.5.29**, con versión exacta y dentro de la línea Maintenance LTS, para reducir el cambio respecto de un salto a 16.

React y React DOM permanecen en **18.2.0**, admitido por las peer dependencies de Next 15.5.29. El cambio de API necesario fue resolver `params` como Promise en la ruta documental `app/[...slug]/page.tsx`. Se fijó PostCSS **8.5.23** mediante override para corregir los avisos de lectura de sourcemaps y XSS del paquete anterior. Se actualizaron únicamente seis dependencias transitivas afectadas que tenían correcciones compatibles: brace-expansion, glob, lodash, dos instancias de minimatch y picomatch.

`outputFileTracingRoot` apunta a la raíz del sitio para evitar que Next infiera otro proyecto a partir de un archivo de bloqueo superior. `games/` queda fuera del proyecto TypeScript del sitio; el juego se construye de forma independiente con Vite.

La actualización es un cambio de versión mayor de Next y requiere comprobación visual y funcional de la versión desplegada. El build y la prueba HTTP no sustituyen una prueba de interacción en navegador. La API externa del asistente conserva su configuración; no se cambiaron credenciales ni proveedores.

## Verificación local completada

- `next build`: compilación y tipos correctos; 27 páginas generadas.
- Prueba HTTP con `next start`: las 23 rutas editoriales responden 200.
- La portada contiene la invitación y los enlaces HTML hacia `/jugar`.
- `/kb/private`, `/assets/private`, `/sierra_prensa.zip` y una ruta inexistente responden 404.
- `/api/press-zip` conserva la redirección 307 hacia `/prensa`.
- El sincronizador del juego rechaza una base de assets incorrecta sin modificar la salida previa; una salida válida se copia, reemplaza la anterior y limpia el área temporal.
- `git diff --check`: sin errores.

## Auditoría de dependencias

Tras las correcciones, `npm audit` no informa vulnerabilidades críticas ni altas. Quedan cinco avisos moderados en la cadena de archiver 7, glob y minimatch. Corregirlos según npm requiere actualizar archiver a la versión mayor 8; no se amplió el alcance a esa migración. El endpoint antiguo de ZIP de prensa ya se redirige a la sala de prensa.

## Comprobación integrada antes de publicar

Copiar sólo la fuente pública y los recursos seleccionados a `games/sierra`, ejecutar `npm run build`, revisar `/jugar` y sus archivos, y completar el recorrido jugable en escritorio y dispositivo táctil. Confirmar también navegación, prensa y entrada/salida del juego. La publicación y la prueba en producción quedan a cargo de la coordinación de esta entrega.

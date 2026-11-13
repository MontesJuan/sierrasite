# Verificación — 13 de noviembre de 2026

## Juego

- Build Vite 7.3.8 aprobado. 15 pruebas de estado aprobadas: corrupción, continuidad de capítulos, progreso imposible, final, repetición, almacenamiento bloqueado y zona segura del río.
- Partida completa en navegador local sobre distribución compilada: seis capítulos, seis decisiones, equipaje, río con tres pasos, memoria, telar, grabación y cuadernos, orden editorial y final. Resultado: completed=[0,1,2,3,4,5], mode=ending. Sin errores de consola.
- Reintento verificado después de agotar el equipo con tres fallos. Ayuda desde derrota regresa a derrota. Obstáculo del camino produce daño; desvío lo evita.
- Guardado: recargar tras completar conserva libro, mapa y diario. No se adelantó la partida con código ni se alteró almacenamiento para aprobar el recorrido.
- Fotografía guardada y consultada. Diario completo desbloqueado al terminar.
- Responsive: portada, diario, HUD y ajustes a390×844; recorrido también1440×900. Control táctil presionado avanza32,7m; pausa detiene motor. Calidad low y movimiento reducido reflejados en estado del motor. Audio activado por gesto sin error de consola; no se certifica escucha humana.
- Corregidos acceso a localStorage bloqueado, retrato incorrecto de Mónica, teclado tras ganar minijuego y retorno desde ayuda/fallback/diario.

## Sitio documental

Worktree desde0377c2b, checkout anterior intacto. Next15.5.29, React18.2 y PostCSS8.5.23. Build y23 rutas documentales HTTP200 comprobados; bloqueos privados404 y redirect prensa preservados. Se vuelve a construir tras integrar el juego.

## Límites

No prueba con niños ni dispositivos escolares físicos. Duración10–15min es objetivo, no medición. Navegación3D procedural: no fotogrametría, mundo abierto ni calidad AAA. El sonido es síntesis ambiental original y los diálogos son texto adaptado. Prueba WebGL en navegador Chromium del entorno; Safari/Firefox pendientes. No se afirma auditoría de accesibilidad completa.

El juego no contiene servicios remotos, cuentas, analítica, micrófono ni datos de menores. JEV se ejecutó únicamente durante selección editorial fuera del cliente.

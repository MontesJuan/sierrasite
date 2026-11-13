# SIERRA — narrativa de la aventura

Documento de trabajo, 13 de noviembre de 2026. Subproyecto educativo del documental SIERRA. Publicación prevista en `https://sierradoc.site/jugar`, dentro del repositorio existente `MontesJuan/sierrasite`. El estado efectivo de producción se registra en el README y en el cierre de la entrega; esta nota no certifica un despliegue.

## Propósito

El jugador acompaña a un equipo documentalista desde Astica hasta Vallecito y vuelve con los cuadernos de Ladislao Reyes a la escuela. Las dificultades de desplazamiento y comunicación se vuelven acciones sencillas: preparar una mula, elegir el momento de cruzar, cuidar el equipo, escuchar y transportar una obra. El desenlace reconoce el trabajo del poeta, los alumnos y sus docentes.

El territorio tiene belleza y dificultad a la vez. La comunidad conoce su entorno y tiene voz propia. Los visitantes ayudan a conectar personas, sin aparecer como salvadores. La tecnología sirve para conservar y compartir los poemas; no se equipara ausencia de tecnología con ausencia de conocimiento.

## Seis capítulos jugables

| N.º | Lugar y misión | Acción principal | Aprendizaje |
| --- | --- | --- | --- |
| 1 | Astica: preparar el viaje | Acomodar el equipo, subir a la mula, seguir la huella | El cuidado empieza antes de partir |
| 2 | La quebrada: cruzar el río | Observar, esperar y avanzar por el paso del juego | El agua y la montaña tienen sus tiempos |
| 3 | Escuela y casa de Rosalía | Escuchar sobre la huerta, el agua y el proyecto de los cuadernos | Los saberes locales y la educación se encuentran |
| 4 | Casa de Margarita y camino a Vallecito | Conocer el telar y continuar dejando espacio a la fauna | Un oficio conserva historia; observar exige respeto |
| 5 | Vallecito: encuentro con Reyes | Escuchar, cuidar el corral y preparar los cuadernos | La obra y la voz pertenecen a su autor |
| 6 | Regreso a la escuela | Transportar, leer y preparar el libro entre todos | La comunicación y la colaboración acercan mundos |

Los datos consumidos por el juego están en `src/content.js`: `GAME_META`, `CHARACTERS` y `CHAPTERS`. Cada capítulo contiene `dialogue` como lista de `{speaker,text}`, una decisión con `question` y `choices` (`text`, `correct`, `reply`), parámetros lúdicos de `challenge`, una recompensa y una idea de aprendizaje.

## Historia real y adaptación

**Hechos apoyados por las fuentes:**

- Ladislao Reyes Chávez escribe poesía en cuadernos y vive en Vallecito, en las Sierras de Elizondo, Valle Fértil, San Juan.
- El documental muestra recorridos a lomo de mula desde Astica, hacia la escuela y hacia Vallecito, atravesando senderos y cursos de agua.
- La escuela y la casa de Rosalía están próximas. Rosalía trabaja la huerta, cría animales y habla del agua, la educación y la comunicación.
- Margarita es artesana del telar: produce, hila y tiñe la lana, y aprendió el oficio de su madre.
- El guion muestra a Brian atando el bolso con los cuadernos a una mula; el equipo los lleva a la escuela. Allí, los alumnos reciben un mensaje grabado de Reyes y transcriben los poemas en computadoras.
- La directora Mónica impulsa el trabajo escolar. El cierre del guion acredita la edición del segundo libro con la participación de alumnos y docentes y el apoyo del Fondo Editorial de la Legislatura de San Juan.
- La entrega del libro en la escuela corresponde al 6 de noviembre de 2024 según la trazabilidad y el testimonio de Juan. Es un viaje distinto del preestreno escolar del 29 de mayo de 2024.

**Licencias del juego:**

- Todos los parlamentos de `src/content.js` son textos adaptados para la experiencia, no transcripciones ni citas de las personas reales. No se inventaron poemas atribuidos a Reyes.
- Las seis misiones no representan las seis subidas históricas. El juego condensa varios encuentros y momentos documentales en una aventura continua y sin fecha de rodaje en pantalla.
- Las posiciones, distancias, pendientes, duración, obstáculos, coleccionables y ayudas de navegación se ajustan a la jugabilidad. El mapa no sirve para recorrer la sierra real.
- Las fotografías provienen de una selección editorial del archivo; una foto de fondo no demuestra que el episodio jugable sucediera exactamente en ese lugar o día.
- Los fallos son reintentos lúdicos. No equivalen a accidentes que hayan sufrido las personas retratadas.
- Publicar el libro dentro del juego representa un proceso de lectura, transcripción, revisión y edición mucho más largo. La victoria pertenece al trabajo conjunto.

## Fauna y obstáculos

Reyes menciona al zorro, al puma y al cóndor en relación con el cuidado de sus animales. El juego puede convertir su presencia en obstáculos de tiempo, cuidado y elección de paso, sin afirmar que atacan habitualmente a los visitantes ni presentar violencia como solución. No se dan puntos por herir, atrapar o perseguir animales. La respuesta es observar, esperar, tomar distancia o cuidar el corral.

El cansancio, la pendiente, el agua y la pérdida de tiempo dan tensión sin necesidad de violencia. Una decisión incorrecta permite aprender y volver a intentar. Las instrucciones de cruces son mecánicas del juego y no formación para una travesía real.

## Cronología que debe conservarse

La corrección del director fija **seis subidas y cinco rodajes**:

1. 13–15 de agosto de 2019: Juan, único cineasta, con Alejandro; primera entrevista a Reyes frente al rancho, «Maestrita bella».
2. Septiembre de 2019: Bruno Sesto, Nicolás Farina, Diego Garcés y Javier Ruiz, sin Juan. El detalle de jornadas entre el relato y las fechas de cámara continúa por conciliar.
3. 7–13 de marzo de 2024: Juan, Bruno Sesto y Bernardo Blanco; Pablo Nielsen realizó el traslado, sin incorporarlo por ello al equipo de rodaje.
4. 28 de mayo–1 de junio de 2024: viaje familiar y preestreno escolar del 29 de mayo.
5. 6 de noviembre de 2024: entrega del libro en la escuela, separada del preestreno.
6. 5–6 de marzo de 2026: Épyca, Juan, Joaquín, Ezequiel y Esteban.

No usar la cifra seis del juego como equivalencia con esta cronología. No atribuirle al jugador la autoría de los poemas ni a un documentalista el trabajo hecho por los alumnos.

## Fuentes editoriales y método

La historia se contrastó con el guion final de SIERRA, la escaleta de montaje, la nota de identidades confirmadas y la trazabilidad de viajes revisada por el director. Las fuentes completas y sus rutas se conservan en el cerebro local del proyecto, fuera del repositorio y del sitio públicos.

El guion apoya los encuentros y el arco de los cuadernos; la trazabilidad distingue el preestreno de mayo de 2024 de la entrega del libro de noviembre de 2024. Las identidades visuales proceden de confirmaciones del director y cotejo de escenas. Las propuestas editoriales no se convierten en hechos.

Se utilizó JEV para foco documental con el vault y las carpetas explícitos. El foco automático no seleccionó candidatos útiles y se continuó con búsqueda y lectura local. No se enviaron cuerpos documentales. La selección visual JEV es una ayuda editorial y no acredita identidad, autoría ni derechos.

El archivo maestro, los inventarios internos y la correspondencia no se incluyen en esta publicación. El juego sólo recibe contenido adaptado y recursos editoriales seleccionados.

## Revisión pedagógica

Primera versión pensada para una sesión escolar breve, con textos cortos, controles simples, pausas y reintentos. Antes de presentarla como validada con estudiantes debe realizarse una prueba con docentes y chicos: comprensión de controles, lectura, dificultad, comodidad visual y recuerdo de quién escribió y quién ayudó a publicar. El acabado visual o una selección JEV no certifican esa validación.

Preguntas para el aula: ¿qué necesitó el equipo para llegar?, ¿qué sabía cada persona?, ¿qué cambió al llevar los cuadernos a la escuela?, ¿qué historia de nuestro lugar queremos conservar?

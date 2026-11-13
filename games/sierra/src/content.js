/**
 * SIERRA — El camino de las palabras.
 * Todos los diálogos son adaptaciones para el juego, nunca citas de la película.
 * Fuentes y límites editoriales: docs/NARRATIVE.md.
 */
export const GAME_META = {
  title: 'SIERRA',
  subtitle: 'El camino de las palabras',
  tagline: 'Un camino. Muchas voces. Un libro por llegar.',
  description: 'Una aventura documental por las Sierras de Elizondo. Viajá en mula, conocé a su comunidad y ayudá a que la poesía de Reyes llegue a la escuela.',
  location: 'Sierras de Elizondo · San Juan, Argentina',
  audience: 'Para explorar en familia y en la escuela',
  adaptationNotice: 'Inspirado en el documental SIERRA, de Juan F. Montes. El recorrido está condensado y los diálogos fueron adaptados para jugar.',
  wildlifeNotice: 'La fauna forma parte de la sierra. Observá, cuidá a los animales y encontrá otra manera de seguir.',
  ending: {
    title: 'La sierra ya tiene quien la lea.',
    text: 'Los cuadernos llegaron a la escuela. Con el trabajo de Reyes, los alumnos y sus docentes, las palabras se transformaron en un libro. Tu viaje ayudó a unir esos mundos.',
    fact: 'En la historia real, los alumnos y docentes digitalizaron los poemas de Ladislao Reyes. Su segundo libro fue entregado en la escuela en noviembre de 2024.',
    question: '¿Qué historia de tu lugar te gustaría conservar?',
  },
};

export const CHARACTERS = {
  equipo: { name: 'El equipo', role: 'Documentalistas', description: 'Venimos a escuchar, filmar y acompañar el viaje de los cuadernos.' },
  baqueano: { name: 'El baqueano', role: 'Guía de la travesía', description: 'Conoce las huellas, el ritmo de las mulas y los tiempos de la montaña.' },
  rosalia: { name: 'Rosalía', role: 'La huerta y el agua', description: 'Cultiva, cría animales y defiende el agua y la educación de su comunidad.' },
  monica: { name: 'Mónica', role: 'Directora de la escuela', description: 'Propone a sus alumnos leer y digitalizar los poemas de su vecino.' },
  margarita: { name: 'Margarita', role: 'Artesana del telar', description: 'Hila, tiñe y teje. Aprendió el oficio de su madre y lo transmite con su trabajo.' },
  reyes: { name: 'Ladislao Reyes', role: 'Poeta de Vallecito', description: 'Escribe en cuadernos sobre su vida y su sierra. Sueña con compartir su poesía.' },
};

export const CHAPTERS = [
  {
    id: 'astica', number: 1, title: 'Donde empieza la huella', shortTitle: 'Astica',
    location: 'Astica · el inicio del viaje',
    objective: 'Subí a la mula y llevá el equipo hasta el primer descanso.',
    intro: 'La cámara está lista. La sierra, adelante. Para llegar a Reyes hay que aprender otro ritmo: el de la mula y el sendero.',
    npc: 'El baqueano',
    dialogue: [
      { speaker: 'El baqueano', text: 'Antes de salir, acomodemos la carga. En esta huella avanzamos juntos y sin apuro.' },
      { speaker: 'El equipo', text: 'Traemos una cámara y muchas ganas de escuchar. ¿Nos mostrás por dónde empezar?' },
      { speaker: 'El baqueano', text: 'Seguí la huella. La mula necesita espacio y descanso, igual que nosotros.' },
    ],
    decision: {
      question: 'La carga quedó torcida. ¿Cómo empezamos?',
      choices: [
        { text: 'Acomodamos el equipo antes de salir.', correct: true, reply: 'Ahora sí. Cuidar el viaje empieza antes del primer paso.' },
        { text: 'Salimos rápido y la arreglamos después.', correct: false, reply: 'Todavía estamos a tiempo. Una carga bien acomodada hace el viaje más seguro.' },
      ],
    },
    challenge: { type: 'trail', duration: 55, hazards: ['rock'], collectible: 'equipo' },
    reward: { title: 'La primera huella', text: 'Aprendiste a viajar con la mula y a cuidar el equipo.' },
    learning: 'La distancia también se mide en esfuerzo, cuidado y tiempo compartido.',
    sourceIds: ['guion', 'viajes'],
  },
  {
    id: 'rio', number: 2, title: 'El río marca el paso', shortTitle: 'El río',
    location: 'La quebrada · camino a la escuela',
    objective: 'Seguí el paso marcado y protegé el equipo durante el cruce.',
    intro: 'El agua corta la huella. Su sonido llena la quebrada. La escuela está del otro lado y cada paso cuenta.',
    npc: 'El baqueano',
    dialogue: [
      { speaker: 'El equipo', text: 'Desde lejos parecía un río pequeño. De cerca, la corriente cambia todo.' },
      { speaker: 'El baqueano', text: 'Miremos primero. En el juego vamos a seguir los pasos marcados; afuera, siempre con una persona que conozca el lugar.' },
      { speaker: 'El equipo', text: 'La cámara va protegida. Esperamos juntos el momento de avanzar.' },
    ],
    decision: {
      question: 'La corriente tapa el paso. ¿Qué hacemos?',
      choices: [
        { text: 'Esperamos junto al guía.', correct: true, reply: 'Esperar también es avanzar: el equipo sigue a salvo.' },
        { text: 'Nos metemos para ganar tiempo.', correct: false, reply: 'Volvamos a la orilla. El río no se cruza a las apuradas.' },
      ],
    },
    challenge: { type: 'river', duration: 60, hazards: ['water', 'rock'], collectible: 'equipo' },
    reward: { title: 'Al otro lado', text: 'El equipo llegó seco. Ya se escucha la vida de la escuela.' },
    learning: 'La naturaleza tiene sus tiempos. Observar y pedir ayuda es parte de aprender.',
    sourceIds: ['guion'],
  },
  {
    id: 'escuela', number: 3, title: 'Una escuela entre montañas', shortTitle: 'La escuela',
    location: 'Escuela Albergue Marcos Gómez Narváez',
    objective: 'Conocé a Rosalía y escuchá la propuesta de Mónica.',
    intro: 'Entre cerros aparecen la escuela y la casa de Rosalía. Aquí el camino se vuelve encuentro: hay una historia que todos pueden ayudar a escribir.',
    npc: 'Rosalía',
    dialogue: [
      { speaker: 'Rosalía', text: 'Esta es nuestra huerta. El agua sostiene las plantas, los animales y nuestra vida en la sierra.' },
      { speaker: 'El equipo', text: 'Queremos conocer a Reyes y ayudar a que sus poemas lleguen a más personas.' },
      { speaker: 'Rosalía', text: 'Pasen por la escuela. La educación y la comunicación abren muchas posibilidades.' },
      { speaker: 'Mónica', text: 'Reyes guarda sus poemas en cuadernos. Con los chicos podemos leerlos y pasarlos a la computadora.' },
      { speaker: 'El equipo', text: 'Vamos a visitarlo. Si él quiere, traeremos sus cuadernos con mucho cuidado.' },
    ],
    decision: {
      question: 'Antes de filmar la huerta, ¿qué hacemos?',
      choices: [
        { text: 'Le preguntamos a Rosalía y escuchamos.', correct: true, reply: 'Una buena historia empieza con respeto por quien la comparte.' },
        { text: 'Filmamos todo sin preguntar.', correct: false, reply: 'Primero hay que conversar. La casa y la historia son de quienes viven aquí.' },
      ],
    },
    challenge: { type: 'trail', duration: 55, hazards: ['rock'], collectible: 'encuentros' },
    reward: { title: 'Una idea compartida', text: 'La escuela espera los cuadernos. Ya sabemos para qué seguimos.' },
    learning: 'El conocimiento vive en la escuela y también en los saberes de cada vecino.',
    sourceIds: ['guion', 'personajes'],
  },
  {
    id: 'margarita', number: 4, title: 'Los hilos del camino', shortTitle: 'Margarita',
    location: 'La casa de Margarita · rumbo a Vallecito',
    objective: 'Llegá a Margarita, conocé su telar y seguí la huella con cuidado.',
    intro: 'El camino lleva a una casa de piedra. Las manos de Margarita transforman la lana en tejidos. Más arriba, la sierra vuelve a abrirse.',
    npc: 'Margarita',
    dialogue: [
      { speaker: 'Margarita', text: 'Aprendí a tejer de mi mamá. Hilo la lana, la tiño y después trabajo en el telar.' },
      { speaker: 'El equipo', text: 'Un tejido lleva tiempo, igual que una película o un libro.' },
      { speaker: 'Margarita', text: 'Y cada parte necesita cuidado. Los oficios también cuentan la historia de un lugar.' },
      { speaker: 'El equipo', text: 'Gracias por compartirlo. Seguimos hacia Vallecito para encontrarnos con Reyes.' },
    ],
    decision: {
      question: 'Un zorro aparece junto a la huella. ¿Cómo seguimos?',
      choices: [
        { text: 'Le dejamos espacio y buscamos el paso libre.', correct: true, reply: 'La sierra es su hogar. Podemos continuar sin perseguirlo.' },
        { text: 'Lo perseguimos para sacarle una foto.', correct: false, reply: 'La mejor imagen nunca necesita molestar a un animal.' },
      ],
    },
    challenge: { type: 'wildlife', duration: 65, hazards: ['rock', 'fox', 'condor'], collectible: 'saberes' },
    reward: { title: 'Saberes que siguen vivos', text: 'Conociste el oficio de Margarita y encontraste una manera respetuosa de seguir.' },
    learning: 'Un oficio se transmite al compartirlo. La fauna no es un enemigo al que vencer.',
    sourceIds: ['guion', 'personajes'],
  },
  {
    id: 'reyes', number: 5, title: 'El tesoro de Vallecito', shortTitle: 'Reyes',
    location: 'Vallecito · la casa de Reyes',
    objective: 'Escuchá a Reyes y reuní los cuadernos para llevarlos a la escuela.',
    intro: 'Después de la última subida, una casa, un corral y un poeta. El tesoro que vinimos a buscar no brilla: está escrito a mano.',
    npc: 'Ladislao Reyes',
    dialogue: [
      { speaker: 'Ladislao Reyes', text: 'En estos cuadernos guardo poemas sobre mi vida y mi sierra. Quiero que otras generaciones puedan leerlos.' },
      { speaker: 'El equipo', text: 'Mónica y sus alumnos quieren ayudarte a pasarlos a la computadora. ¿Los llevamos a la escuela?' },
      { speaker: 'Ladislao Reyes', text: 'Sí. Aquí la distancia y la falta de comunicación hacen difícil ese trabajo. Entre todos podemos acercarlo.' },
      { speaker: 'El equipo', text: 'Vamos a cuidar cada cuaderno y a llevar también tu mensaje.' },
      { speaker: 'Ladislao Reyes', text: 'Antes de salir, dejemos a los animales atendidos y el bolso bien cerrado.' },
    ],
    decision: {
      question: 'El bolso está listo. ¿Qué falta antes de volver?',
      choices: [
        { text: 'Revisar los cuadernos y cerrar el corral.', correct: true, reply: 'El viaje de los poemas también necesita cuidar lo que queda en casa.' },
        { text: 'Salir sin revisar nada.', correct: false, reply: 'Hagamos una última revisión. Lo que llevamos y lo que dejamos importan.' },
      ],
    },
    challenge: { type: 'wildlife', duration: 70, hazards: ['rock', 'puma', 'condor'], collectible: 'cuadernos' },
    reward: { title: 'La voz de Reyes', text: 'Los cuadernos y el mensaje están listos para viajar.' },
    learning: 'La tecnología ayuda a compartir una obra; la voz y la autoría siguen siendo de Reyes.',
    sourceIds: ['guion', 'personajes'],
  },
  {
    id: 'libro', number: 6, title: 'Un libro entre todos', shortTitle: 'El libro',
    location: 'De Vallecito a la escuela',
    objective: 'Llevá los cuadernos a la escuela y completá el viaje del libro.',
    intro: 'Ahora el equipaje pesa distinto: llevamos palabras. La huella de regreso une el trabajo de Reyes con las manos de los chicos.',
    npc: 'Mónica',
    dialogue: [
      { speaker: 'El equipo', text: 'Llegaron los cuadernos, y también un mensaje de Reyes para ustedes.' },
      { speaker: 'Mónica', text: 'Vamos a leerlos con cuidado y a trabajar juntos. Cada poema tiene algo de su vida.' },
      { speaker: 'Los alumnos', text: 'Podemos transcribirlos, revisar las palabras y preparar las páginas.' },
      { speaker: 'Mónica', text: 'Conservemos su voz y su nombre. El libro se hace entre todos, y los poemas son de Ladislao Reyes.' },
      { speaker: 'El equipo', text: 'El camino termina aquí. Las historias recién empiezan a viajar.' },
    ],
    decision: {
      question: 'Una palabra del manuscrito no se entiende. ¿Qué hacemos?',
      choices: [
        { text: 'La revisamos y consultamos antes de cambiarla.', correct: true, reply: 'Leer con atención también es cuidar la voz del autor.' },
        { text: 'Inventamos una palabra para terminar rápido.', correct: false, reply: 'No hace falta apurarse. Podemos dejarla marcada y pedir ayuda.' },
      ],
    },
    challenge: { type: 'return', duration: 75, hazards: ['rock', 'water', 'fox'], collectible: 'paginas' },
    reward: { title: 'El camino de las palabras', text: 'El libro está listo para compartir. La comunidad convirtió la distancia en encuentro.' },
    learning: 'Los alumnos y docentes fueron parte central de la digitalización de los poemas y la realización del libro.',
    sourceIds: ['guion', 'viajes'],
  },
];

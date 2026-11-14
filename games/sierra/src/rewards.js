/**
 * Recompensas del viaje: palabras de la sierra, fauna para fotografiar y estrellas.
 * Lógica pura, sin DOM. Las palabras son vocabulario general del lugar y de los
 * oficios; nunca versos ni frases atribuidas a Ladislao Reyes.
 */
export const WORDS_PER_CHAPTER = 8;
const w = (word, meaning) => Object.freeze({ word, meaning });
export const WORDS = Object.freeze([
  [w('huella', 'Camino angosto que se forma de tanto pasar por el mismo lugar.'), w('baqueano', 'Persona que conoce muy bien los caminos de un lugar y guía a otros.'), w('mula', 'Animal fuerte y de paso seguro, hija de una yegua y un burro.'), w('apero', 'Conjunto de piezas para ensillar y cargar un animal.'), w('alforja', 'Bolsa doble que se cuelga a los costados del animal para llevar cosas.'), w('tranquera', 'Puerta de palos que cierra el paso en un alambrado o un corral.'), w('cerro', 'Elevación de tierra y piedra, más baja que una montaña.'), w('travesía', 'Viaje largo a través de un lugar difícil de cruzar.')],
  [w('quebrada', 'Paso estrecho entre cerros, por donde suele correr el agua.'), w('vado', 'Parte poco profunda de un río por donde se puede cruzar.'), w('corriente', 'Movimiento del agua que avanza en una dirección.'), w('orilla', 'Borde de tierra junto a un río o un arroyo.'), w('crecida', 'Aumento del agua de un río después de las lluvias.'), w('cauce', 'Lecho por donde corre el agua de un río.'), w('vertiente', 'Lugar donde el agua brota de la tierra.'), w('arroyo', 'Río pequeño, de poca agua.')],
  [w('huerta', 'Terreno donde se cultivan verduras y frutales.'), w('acequia', 'Canal pequeño que lleva agua para regar.'), w('majada', 'Grupo de cabras u ovejas que se crían juntas.'), w('albergue', 'Lugar que da techo y descanso. En una escuela albergue los chicos se quedan a dormir.'), w('semilla', 'Parte de la planta de la que nace una planta nueva.'), w('vecino', 'Persona que vive cerca y comparte el lugar.'), w('pizarrón', 'Tablero del aula donde se escribe con tiza.'), w('recreo', 'Rato de descanso y juego en la escuela.')],
  [w('telar', 'Armazón de palos donde se tejen las telas a mano.'), w('lana', 'Pelo de la oveja que se hila para tejer.'), w('huso', 'Palito que gira para convertir la lana en hilo.'), w('urdimbre', 'Hilos tensados a lo largo del telar.'), w('trama', 'Hilos que cruzan la urdimbre para formar el tejido.'), w('ovillo', 'Bola que se forma al enrollar el hilo.'), w('teñir', 'Dar color a la lana, a veces con plantas del monte.'), w('poncho', 'Abrigo tejido con una abertura para pasar la cabeza.')],
  [w('poeta', 'Persona que escribe poemas.'), w('verso', 'Cada una de las líneas de un poema.'), w('corral', 'Lugar cercado donde se guardan los animales.'), w('manuscrito', 'Texto escrito a mano.'), w('cuaderno', 'Hojas unidas para escribir y guardar lo escrito.'), w('cóndor', 'Ave enorme de los Andes que planea muy alto casi sin aletear.'), w('puesto', 'Casa de campo donde vive quien cuida a sus animales.'), w('memoria', 'Lo que una persona o un pueblo recuerda y guarda.')],
  [w('transcribir', 'Copiar un texto, por ejemplo de un cuaderno a la computadora.'), w('página', 'Cada cara de una hoja de un libro.'), w('autor', 'Persona que crea una obra. Los poemas son de su autor.'), w('edición', 'Trabajo de preparar un texto para publicarlo.'), w('imprenta', 'Taller donde se imprimen los libros.'), w('tapa', 'Cubierta de un libro.'), w('lector', 'Persona que lee.'), w('biblioteca', 'Lugar donde se guardan y se comparten los libros.')],
].map(list => Object.freeze(list)));
export const TOTAL_WORDS = WORDS.length * WORDS_PER_CHAPTER;

/**
 * Distancias en metros del juego. `min` es el espacio que hay que dejarle al animal:
 * más cerca no hay foto. Son reglas de juego, no consejos para el campo.
 */
export const FAUNA = Object.freeze({
  cabra: Object.freeze({ name: 'Cabra criolla', min: 1.5, ideal: 9, fact: 'Las majadas suben solas a los cerros y vuelven al corral al atardecer.' }),
  gallina: Object.freeze({ name: 'Gallina', min: 1, ideal: 6, fact: 'Anda suelta cerca de las casas buscando semillas e insectos.' }),
  pavo: Object.freeze({ name: 'Pavo', min: 1.5, ideal: 7, fact: 'El macho abre la cola como un abanico para hacerse ver.' }),
  lagarto: Object.freeze({ name: 'Lagarto colorado', min: 2, ideal: 8, fact: 'Toma sol sobre las piedras para juntar calor.' }),
  culebra: Object.freeze({ name: 'Culebra', min: 3, ideal: 9, fact: 'Se aleja si siente pasos. Se la mira de lejos y se la deja pasar.' }),
  zorro: Object.freeze({ name: 'Zorro gris', min: 4, ideal: 14, fact: 'Sale al amanecer y al atardecer. Es curioso, pero prefiere la distancia.' }),
  puma: Object.freeze({ name: 'Puma', min: 12, ideal: 45, fact: 'Casi nunca se deja ver. Verlo de lejos es una suerte.' }),
  condor: Object.freeze({ name: 'Cóndor andino', min: 8, ideal: 70, fact: 'Con las alas abiertas mide unos tres metros de punta a punta.' }),
});
export const FAUNA_IDS = Object.freeze(Object.keys(FAUNA));

/**
 * 0 = demasiado cerca (no hay foto); 1–3 = calidad del encuadre.
 * `centering` es el coseno del ángulo entre la mirada y el animal.
 */
export function photoRating(id, distance, centering = 1) {
  const species = FAUNA[id];
  if (!species || !Number.isFinite(distance) || distance < 0) return 0;
  if (distance < species.min) return 0;
  const base = distance <= species.ideal ? 3 : distance <= species.ideal * 2 ? 2 : 1;
  return Math.max(1, base - (centering >= .965 ? 0 : 1));
}

export const wordCount = mask => { let n = 0; for (let m = (Number(mask) || 0) & 255; m; m >>= 1) n += m & 1; return n; };

/** Tres estrellas por capítulo: llegar, los tres hallazgos y una foto de fauna. */
export function chapterStars(save, chapter) {
  return [Boolean(save?.completed?.includes(chapter)), (save?.finds?.[chapter] || 0) >= 3, (save?.wild?.[chapter] || 0) >= 1];
}
export function totalStars(save) { let n = 0; for (let i = 0; i < 6; i++) n += chapterStars(save, i).filter(Boolean).length; return n; }

/** El nombre queda sólo en el dispositivo. Sin etiquetas ni caracteres de control. */
export function sanitizeName(value) {
  return typeof value === 'string' ? value.replace(/[<>&"'`\\\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) : '';
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

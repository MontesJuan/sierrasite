/**
 * Dificultades del camino y energía de la mula. Lógica pura, sin DOM ni Three.js.
 * Son reglas de juego: no describen riesgos ni tiempos del territorio real.
 * Nada daña a la fauna; lo que cansa o hace perder carga es el camino.
 */
export const ENERGY = Object.freeze({ full: 100, floor: 64, fatigueStep: 12, low: 20, afterCollapse: 35, maxFatigue: 3 });
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Cada intento perdido deja a la mula más cansada, hasta un piso. Terminar un tramo la repone. */
export function startEnergy(fatigue) { return Math.max(ENERGY.floor, ENERGY.full - clamp(Math.floor(Number(fatigue) || 0), 0, ENERGY.maxFatigue) * ENERGY.fatigueStep); }

/** Energía por segundo: se gasta al andar montado (más al trote, cuesta arriba y en el barro) y vuelve al descansar. */
export function energyRate({ speed = 0, mounted = false, fast = false, grade = 0, mud = false, drinking = false, era = 2019 } = {}) {
  if (era === 2024 && mounted) return 0;                 // la camioneta no se cansa
  if (drinking) return 24;                                // junto al agua se repone rápido
  if (Math.abs(speed) < .15) return mounted ? 4 : 7;      // quieta descansa; sin jinete, más
  if (!mounted) return fast ? -1 : 2.5;                   // caminar a la par alivia a la mula; correr cansa a quien camina
  return -(.6 + (fast ? 1.5 : 0) + Math.max(0, grade) * 2.2 + (mud ? 1.2 : 0));
}

/**
 * Plan fijo de cada tramo. Empieza suave y suma dificultades capítulo a capítulo.
 * distance y lateral usan las mismas unidades que el sendero; el precipicio queda a la derecha (+lateral).
 */
export function hazardPlan(chapter) {
  const ch = clamp(Math.floor(Number(chapter) || 0), 0, 5), list = [];
  list.push({ type: 'water', distance: 42, lateral: -2.7 }, { type: 'water', distance: 77, lateral: -2.6 });
  const thorns = [[21, 2.5], [34, -2.6], [63, -2.4], [89, 2.5], [14, -2.5], [73, -2.5]];
  for (const [distance, lateral] of thorns.slice(0, 2 + ch)) list.push({ type: 'thorns', distance, lateral, radius: 1 });
  if ([1, 2, 5].includes(ch)) list.push({ type: 'mud', distance: 35, length: 5, half: 1.5 });
  if (ch >= 4) list.push({ type: 'mud', distance: 80, length: 4, half: 1.5 });
  const rocks = [[], [30], [30, 85], [33, 60], [31, 58, 85], [32, 56, 66, 86]][ch];
  rocks.forEach((distance, i) => list.push({ type: 'rockfall', distance, period: 7.5 - ch * .5, phase: i * 2.3 + ch }));
  // Una culebra cruza la huella cada tanto. No ataca: si la mula se le viene encima, se asusta.
  if (ch === 0) list.push({ type: 'snake', distance: 72, period: 10, phase: 3 });
  if (ch === 4) list.push({ type: 'snake', distance: 37, period: 9, phase: 1 });
  if (ch >= 2) list.push({ type: 'gust', from: 50, to: 68, period: 8 - ch * .5, strength: ch >= 4 ? 1.3 : 1 });
  return list;
}

const ROCK_CROSSING = 2.4, ROCK_WARNING = 1.4, GUST_BLOW = 2.2, GUST_WARNING = 1.3;
/** Piedra que cruza la huella desde la ladera (izquierda) hacia el precipicio (derecha). */
export function rockAt(hazard, time) {
  const cycle = (((time + hazard.phase) % hazard.period) + hazard.period) % hazard.period;
  return { active: cycle < ROCK_CROSSING, lateral: -9 + cycle / ROCK_CROSSING * 17, warning: cycle > hazard.period - ROCK_WARNING, spin: cycle * 5 };
}
/** Ráfaga que empuja hacia el precipicio durante unos segundos; antes avisa. */
export function gustAt(hazard, time, distance) {
  if (distance < hazard.from || distance > hazard.to) return { push: 0, warning: false };
  const cycle = ((time % hazard.period) + hazard.period) % hazard.period;
  return { push: cycle < GUST_BLOW ? hazard.strength * Math.sin(Math.PI * cycle / GUST_BLOW) : 0, warning: cycle > hazard.period - GUST_WARNING };
}
const SNAKE_CROSSING = 5;
/** Culebra que cruza despacio desde la ladera; el resto del tiempo queda quieta fuera de la huella. */
export function snakeAt(hazard, time) {
  const cycle = (((time + hazard.phase) % hazard.period) + hazard.period) % hazard.period, crossing = cycle < SNAKE_CROSSING;
  return { crossing, lateral: crossing ? -3.4 + cycle / SNAKE_CROSSING * 5 : -3.4 };
}
/** ¿La mula se le vino encima a la culebra mientras cruzaba? */
export function snakeSpooks(hazard, snake, distance, lateral, jumpHeight = 0) {
  return snake.crossing && jumpHeight < .3 && Math.abs(distance - hazard.distance) < .9 && Math.abs(lateral - snake.lateral) < .85;
}
/** ¿La piedra alcanza a quien está en (distance, lateral)? Saltando alto se la pasa por arriba. */
export function rockHits(hazard, rock, distance, lateral, jumpHeight = 0) {
  return rock.active && jumpHeight < .6 && Math.abs(distance - hazard.distance) < 1 && Math.abs(lateral - rock.lateral) < 1;
}

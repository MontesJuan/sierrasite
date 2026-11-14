import { ROUTES } from './route-data.js';

/**
 * Forma real de cada tramo, tomada del registro GPS de la expedición y comprimida
 * a los 96 metros jugables. El juego conserva el rumbo, las curvas y el sube y baja;
 * no las distancias. No es un mapa para orientarse en la sierra.
 */
const SAMPLES = 49, STEP = 2, RELIEF_SCALE = .4, RELIEF_FROM = 16, RELIEF_TO = 90;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const route = chapter => ROUTES[clamp(Math.floor(Number(chapter) || 0), 0, ROUTES.length - 1)];

// Interpolación de Catmull-Rom: pasa por las muestras y no quiebra la pendiente.
function sample(values, position) {
  const p = clamp(position, 0, SAMPLES - 1), i = Math.min(SAMPLES - 2, Math.floor(p)), t = p - i;
  const a = values[Math.max(0, i - 1)], b = values[i], c = values[i + 1], d = values[Math.min(SAMPLES - 1, i + 2)];
  return .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - 3 * c + d - a) * t * t * t);
}

/** Desvío lateral del sendero respecto de la línea recta entre los extremos del tramo. */
export function routeLateral(chapter, distance) { return sample(route(chapter).lateral, (Number(distance) || 0) / STEP); }

/**
 * Relieve real que se suma al perfil jugable. El arranque y la llegada quedan planos
 * para la tranquera, el río y las casas; la pendiente entra y sale sin quiebres.
 */
export function routeRelief(chapter, distance) {
  const t = clamp(((Number(distance) || 0) - RELIEF_FROM) / (RELIEF_TO - RELIEF_FROM), 0, 1);
  const eased = t - Math.sin(2 * Math.PI * t) / (2 * Math.PI);
  return sample(route(chapter).relief, eased * (SAMPLES - 1)) * RELIEF_SCALE;
}

/** Rumbo real del tramo en grados: 0 norte, 90 este, 180 sur, 270 oeste. */
export function routeHeading(chapter) { return route(chapter).heading; }

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const NAMES = ['norte', 'noreste', 'este', 'sudeste', 'sur', 'sudoeste', 'oeste', 'noroeste'];
const sector = degrees => Math.round((((Number(degrees) || 0) % 360) + 360) % 360 / 45) % 8;
/** Punto cardinal más cercano y sus dos vecinos, para la brújula. */
export function compass(degrees) { const i = sector(degrees); return { left: POINTS[(i + 7) % 8], main: POINTS[i], right: POINTS[(i + 1) % 8] }; }

/** Una línea para chicos con los datos reales del tramo. */
export function routeFact(chapter) {
  const r = route(chapter), net = r.to - r.from;
  const slope = net >= 0 ? `sube de ${r.from.toLocaleString('es-AR')} a ${r.to.toLocaleString('es-AR')} metros de altura` : `baja de ${r.from.toLocaleString('es-AR')} a ${r.to.toLocaleString('es-AR')} metros de altura`;
  return `En la sierra real, este tramo mide ${String(r.km).replace('.', ',')} km hacia el ${NAMES[sector(r.heading)]} y ${slope}.`;
}

/** Dirección del sol en el mundo del juego (el sendero avanza hacia −Z) para un acimut y una altura reales. */
export function sunDirection(chapter, azimuth, elevation) {
  const relative = (azimuth - routeHeading(chapter)) * Math.PI / 180, height = elevation * Math.PI / 180;
  return [Math.sin(relative) * Math.cos(height), Math.sin(height), -Math.cos(relative) * Math.cos(height)];
}

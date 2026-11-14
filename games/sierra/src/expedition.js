/** Pure expedition rules. Distances and lateral offsets are game units, not metres. */
export const EXPEDITION_RULES = Object.freeze({
  keyDistance: 18,
  keyLateral: 4,
  keyReach: 3,
  gateDistance: 38,
  gateReach: 5,
  gateClearance: 2,
  gateOpeningSeconds: 1.2,
  chapterCount: 6,
  routeId: 'sierra-six-chapters',
});

export const EXPEDITION_ERAS = Object.freeze({
  2019: Object.freeze({ year: 2019, vehicle: 'mule', label: 'El primer camino', yearsLater: 0 }),
  2024: Object.freeze({ year: 2024, vehicle: 'truck', label: 'Cinco años después', yearsLater: 5 }),
});

/** Start a chapter. The key/gate puzzle is enabled only in chapter zero by default. */
export function createExpedition({ chapter = 0, era = 2019, enabled = chapter === 0 } = {}) {
  if (!Number.isInteger(chapter) || chapter < 0 || chapter >= EXPEDITION_RULES.chapterCount) {
    throw new RangeError('Unknown expedition chapter');
  }
  if (era !== 2019 && era !== 2024) throw new RangeError('Unknown expedition era');
  return {
    chapter,
    era,
    vehicle: EXPEDITION_ERAS[era].vehicle,
    routeId: EXPEDITION_RULES.routeId,
    enabled: enabled === true,
    keyFound: false,
    gateOpening: false,
    gateProgress: 0,
  };
}

/** Position relative to the centre of the path; world coordinates must subtract pathX. */
export function expeditionPositions(state) {
  return {
    key: { distance: EXPEDITION_RULES.keyDistance, lateral: EXPEDITION_RULES.keyLateral * (state.chapter % 2 === 0 ? -1 : 1) },
    gate: { distance: EXPEDITION_RULES.gateDistance, lateral: 0 },
  };
}

function withinReach(position, target, reach) {
  return Number.isFinite(position?.distance) && Number.isFinite(position?.lateral)
    && Math.hypot(position.distance - target.distance, position.lateral - target.lateral) <= reach;
}

/** Return the nearby interaction (including a locked gate), or null. Does not mutate. */
export function interactionAt(state, position) {
  if (!state.enabled) return null;
  const { key, gate } = expeditionPositions(state);
  if (!state.keyFound && withinReach(position, key, EXPEDITION_RULES.keyReach)) {
    return { target: 'key', action: 'take-key', enabled: true, label: 'Recoger la llave' };
  }
  if (!withinReach(position, gate, EXPEDITION_RULES.gateReach)) return null;
  if (state.gateProgress >= 1) {
    return { target: 'gate', action: 'already-open', enabled: false, label: 'La tranquera está abierta' };
  }
  if (state.gateOpening) {
    return { target: 'gate', action: 'opening', enabled: false, label: 'La tranquera se está abriendo' };
  }
  if (!state.keyFound) {
    return { target: 'gate', action: 'find-key', enabled: false, label: 'Buscá la llave junto al sendero' };
  }
  return { target: 'gate', action: 'open-gate', enabled: true, label: 'Abrir la tranquera' };
}

/** Apply an interaction. Events are for UI/audio; ignored requests return the same state. */
export function interactExpedition(state, position) {
  const interaction = interactionAt(state, position);
  if (!interaction) return { state, event: 'out-of-range', target: null };
  const target = interaction.target;
  switch (interaction.action) {
    case 'take-key': return { state: { ...state, keyFound: true }, event: 'key-found', target };
    case 'open-gate': return { state: { ...state, gateOpening: true }, event: 'gate-opening', target };
    case 'find-key': return { state, event: 'key-required', target };
    case 'opening': return { state, event: 'gate-busy', target };
    default: return { state, event: 'gate-already-open', target };
  }
}

/** Advance opening with elapsed seconds. Call only while gameplay is running, not paused. */
export function advanceExpedition(state, deltaSeconds) {
  if (!state.enabled || !state.gateOpening || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const gateProgress = Math.min(1, state.gateProgress + deltaSeconds / EXPEDITION_RULES.gateOpeningSeconds);
  return { ...state, gateProgress, gateOpening: gateProgress < 1 };
}

/** Smooth 0..1 visual opening. Reduced-motion rendering may snap, but the rule stays the same. */
export function gateOpenness(state) {
  const progress = Math.min(1, Math.max(0, state.gateProgress));
  return progress * progress * (3 - 2 * progress);
}

/**
 * Clamp requested travel before applying it. The fence spans the whole playable width,
 * so lateral position and jumping never bypass it. Checks the full movement segment to
 * prevent a long frame from tunnelling through; retreat on the same side stays possible.
 */
export function constrainExpeditionMovement(state, fromDistance, toDistance) {
  const from = Number.isFinite(fromDistance) ? fromDistance : 0;
  if (!Number.isFinite(toDistance)) return from;
  if (!state.enabled || state.gateProgress >= 1) return toDistance;
  const { gateDistance, gateClearance } = EXPEDITION_RULES;
  if (from <= gateDistance && toDistance > gateDistance - gateClearance) {
    return gateDistance - gateClearance;
  }
  if (from > gateDistance && toDistance < gateDistance + gateClearance) {
    return gateDistance + gateClearance;
  }
  return toDistance;
}

/** Retry this chapter, preserving the era/vehicle and puzzle configuration. */
export function retryExpedition(state) {
  return createExpedition({ chapter: state.chapter, era: state.era, enabled: state.enabled });
}

/** Enter the 2024 return after all six chapters. Caller retains the original saved book. */
export function startEpilogue(state, { completedChapters = 0 } = {}) {
  if (completedChapters !== EXPEDITION_RULES.chapterCount) return { state, event: 'epilogue-locked' };
  if (state.era === 2024) return { state, event: 'epilogue-already-started' };
  return { state: createExpedition({ era: 2024 }), event: 'epilogue-started' };
}

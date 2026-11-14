/** Pure world-space movement; terrain/path placement and falling remain the caller's job. */
export const ROUTE_LENGTH = 96;

const EPSILON = 1e-8;
const SKIN = 1e-5;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

// Integral of a smooth slope, with a constant-grade centre and zero grade at both ends.
function elevationRamp(distance, start, end, rise, blend = 4) {
  const length = end - start, t = clamp(distance - start, 0, length);
  const grade = rise / (length - blend);
  const integral = u => u * u * u - .5 * u * u * u * u;
  if (t < blend) return grade * blend * integral(t / blend);
  if (t > length - blend) return rise - grade * blend * integral((length - t) / blend);
  return grade * (t - blend * .5);
}

/** Additive trail profile in metres. All six chapters climb, cross a ledge, then descend. */
export function trailHeight(distance, chapter = 0) {
  const d = finite(distance);
  return elevationRamp(d, 18, 48, 18) - elevationRamp(d, 74, 94, 8);
}

/** Edge is the right-hand offset from the path centre; depth already includes the ramp. */
export function cliffSection(distance, chapter = 0) {
  const d = finite(distance), ch = Number.isInteger(chapter) ? chapter : 0;
  const strength = smooth((d - 44) / 4) * (1 - smooth((d - 72) / 4));
  return { active: strength > 0, strength, edge: ch >= 1 && ch <= 3 ? 1.6 : 2.5, depth: 32 * strength };
}

/** Three.js yaw convention: zero faces -Z; positive strafe moves camera-right. */
export function movementDelta({ forward = 0, strafe = 0, yaw = 0, speed = 0, dt = 0 } = {}) {
  const f = finite(forward), s = finite(strafe), angle = finite(yaw);
  const length = Math.max(1, Math.hypot(f, s));
  const travel = Math.max(0, finite(speed)) * Math.max(0, finite(dt));
  if (!Number.isFinite(travel)) return { dx: 0, dz: 0 };
  return {
    dx: ((s / length) * Math.cos(angle) - (f / length) * Math.sin(angle)) * travel,
    dz: (-(f / length) * Math.cos(angle) - (s / length) * Math.sin(angle)) * travel,
  };
}

function collisionShape(collider) {
  if (!collider || !Number.isFinite(collider.x) || !Number.isFinite(collider.z)) return null;
  if (Number.isFinite(collider.radius) && collider.radius > 0) return 'circle';
  if (Number.isFinite(collider.halfX) && Number.isFinite(collider.halfZ)
      && collider.halfX >= 0 && collider.halfZ >= 0) return 'box';
  return null;
}

function penetration(x, z, radius, collider, shape) {
  const localX = x - collider.x, localZ = z - collider.z;
  if (shape === 'circle') {
    const distance = Math.hypot(localX, localZ), reach = radius + collider.radius;
    if (distance >= reach - EPSILON) return null;
    return { nx: distance > EPSILON ? localX / distance : 1,
      nz: distance > EPSILON ? localZ / distance : 0, depth: reach - distance };
  }
  const closestX = clamp(localX, -collider.halfX, collider.halfX);
  const closestZ = clamp(localZ, -collider.halfZ, collider.halfZ);
  const ox = localX - closestX, oz = localZ - closestZ, distance = Math.hypot(ox, oz);
  if (distance > EPSILON) {
    if (distance >= radius - EPSILON) return null;
    return { nx: ox / distance, nz: oz / distance, depth: radius - distance };
  }
  // Centre inside the box: leave through its nearest face, never divide by zero.
  const faceX = collider.halfX - Math.abs(localX), faceZ = collider.halfZ - Math.abs(localZ);
  return faceX <= faceZ
    ? { nx: localX < 0 ? -1 : 1, nz: 0, depth: faceX + radius }
    : { nx: 0, nz: localZ < 0 ? -1 : 1, depth: faceZ + radius };
}

function sweepCircle(x, z, dx, dz, cx, cz, radius) {
  const ox = x - cx, oz = z - cz;
  const a = dx * dx + dz * dz, b = ox * dx + oz * dz;
  if (a <= EPSILON * EPSILON || b >= 0) return null;
  const c = ox * ox + oz * oz - radius * radius;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  if (t < -EPSILON || t > 1 + EPSILON) return null;
  const fraction = clamp(t, 0, 1);
  const nx = x + dx * fraction - cx, nz = z + dz * fraction - cz;
  const length = Math.hypot(nx, nz);
  if (length <= EPSILON || nx * dx + nz * dz >= -EPSILON) return null;
  return { t: fraction, nx: nx / length, nz: nz / length };
}

// A disk swept against a rectangle has flat sides and round corners, not an expanded square.
function sweepBox(x, z, dx, dz, radius, collider) {
  const ox = x - collider.x, oz = z - collider.z;
  let earliest = null;
  function accept(hit) {
    if (hit && (!earliest || hit.t < earliest.t)) earliest = hit;
  }
  for (const sign of [-1, 1]) {
    if (dx * sign < -EPSILON) {
      const t = (sign * (collider.halfX + radius) - ox) / dx;
      if (t >= -EPSILON && t <= 1 + EPSILON && Math.abs(oz + dz * t) <= collider.halfZ + EPSILON)
        accept({ t: clamp(t, 0, 1), nx: sign, nz: 0 });
    }
    if (dz * sign < -EPSILON) {
      const t = (sign * (collider.halfZ + radius) - oz) / dz;
      if (t >= -EPSILON && t <= 1 + EPSILON && Math.abs(ox + dx * t) <= collider.halfX + EPSILON)
        accept({ t: clamp(t, 0, 1), nx: 0, nz: sign });
    }
    for (const signZ of [-1, 1]) {
      const cornerX = sign * collider.halfX, cornerZ = signZ * collider.halfZ;
      const hit = sweepCircle(ox, oz, dx, dz, cornerX, cornerZ, radius);
      if (hit && sign * (ox + dx * hit.t - cornerX) >= -EPSILON
          && signZ * (oz + dz * hit.t - cornerZ) >= -EPSILON) accept(hit);
    }
  }
  return earliest;
}

/**
 * Resolve a horizontal disk against solid circles/axis-aligned boxes without mutation.
 * feet and each collider.height use the SAME vertical reference. If feet is jumpY,
 * height must be obstacle height above the local floor. Missing height means unjumpable.
 * contacts contains unique collider IDs (input indices for unnamed colliders).
 * Substeps improve sliding; swept collision still prevents tunnelling on long frames.
 */
export function resolveMovement({ x = 0, z = 0, dx = 0, dz = 0, radius = .35,
  feet = 0, colliders = [] } = {}) {
  let px = finite(x), pz = finite(z);
  const moveX = finite(dx), moveZ = finite(dz), r = Math.max(.01, finite(radius, .35));
  const contactIds = new Set();
  const solids = (Array.isArray(colliders) ? colliders : []).flatMap((collider, index) => {
    const shape = collisionShape(collider);
    const top = Number.isFinite(collider?.height) ? collider.height : Infinity;
    return shape && finite(feet) < top - EPSILON ? [{ collider, shape, id: collider.id ?? index }] : [];
  });
  if (!solids.length) return { x: px + moveX, z: pz + moveZ, contacts: [] };

  // Recover from a spawn/save overlapping a solid before attempting to move.
  for (let pass = 0; pass < 8; pass++) {
    let corrected = false;
    for (const solid of solids) {
      const overlap = penetration(px, pz, r, solid.collider, solid.shape);
      if (!overlap) continue;
      px += overlap.nx * (overlap.depth + SKIN); pz += overlap.nz * (overlap.depth + SKIN);
      contactIds.add(solid.id); corrected = true;
    }
    if (!corrected) break;
  }

  const travel = Math.hypot(moveX, moveZ);
  const steps = Math.max(1, Math.min(256, Math.ceil(travel / Math.max(.025, r * .5))));
  for (let step = 0; step < steps; step++) {
    let remainingX = moveX / steps, remainingZ = moveZ / steps;
    const normals = [];
    for (let iteration = 0; iteration < 8; iteration++) {
      const remainingLength = Math.hypot(remainingX, remainingZ);
      if (remainingLength <= EPSILON) break;
      let nearest = null;
      for (const solid of solids) {
        const c = solid.collider;
        const hit = solid.shape === 'circle'
          ? sweepCircle(px, pz, remainingX, remainingZ, c.x, c.z, r + c.radius)
          : sweepBox(px, pz, remainingX, remainingZ, r, c);
        if (hit && (!nearest || hit.t < nearest.t)) nearest = { ...hit, id: solid.id };
      }
      if (!nearest) { px += remainingX; pz += remainingZ; break; }
      const fraction = Math.max(0, nearest.t - SKIN / remainingLength);
      px += remainingX * fraction; pz += remainingZ * fraction;
      remainingX *= 1 - fraction; remainingZ *= 1 - fraction;
      contactIds.add(nearest.id); normals.push(nearest);
      // Retain all normals in this step so sliding along one wall cannot enter another.
      for (const normal of normals) {
        const inward = remainingX * normal.nx + remainingZ * normal.nz;
        if (inward < 0) {
          remainingX -= normal.nx * inward; remainingZ -= normal.nz * inward;
        }
      }
    }
  }
  return { x: px, z: pz, contacts: [...contactIds] };
}

import type { Rarity } from "@/lib/quotes";

// The inside of the cabinet, in "machine units". One unit is one fat pixel:
// the SVG that draws the scene uses the same coordinates, so nothing here
// ever needs converting to screen space.
export const WORLD = {
  w: 220,
  h: 180,
  left: 12,
  right: 208,
  floor: 168,
  /** The claw rests at the top and never rises above this. */
  top: 46,
  /** Vertical post that walls the prize chute off from the pile. */
  dividerX: 56,
  dividerTop: 122,
  dividerHalf: 2,
  /** Where the claw parks: dead centre over the chute. */
  homeX: 34,
  minX: 26,
  maxX: 194,
};

export type BodyKind = "capsule" | "junk" | "orb";

export interface Body {
  id: number;
  kind: BodyKind;
  /** Capsules carry a rarity; junk carries which piece of scrap it is. */
  rarity: Rarity;
  junk: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  held: boolean;
  /**
   * True once the claw has let go of it over the chute. Everything else meets
   * a guard that runs the full height of the cabinet above the post, so the
   * pile can never spill into the prize box on its own.
   */
  pass: boolean;
  /** Small rotation index, purely so the pile does not look stamped. */
  spin: number;
}

const G = 0.32;

let nextId = 1;

export function makeBody(kind: BodyKind, x: number, y: number, rarity: Rarity = 3, junk = 0): Body {
  return {
    id: nextId++,
    kind,
    rarity,
    junk,
    x,
    y,
    vx: 0,
    vy: 0,
    r: kind === "junk" ? 9 : 9,
    held: false,
    pass: false,
    spin: Math.floor(Math.random() * 4),
  };
}

function collideDivider(b: Body) {
  const { dividerX, dividerHalf, floor } = WORLD;
  const dividerTop = b.pass ? WORLD.dividerTop : -400;
  const cx = Math.max(dividerX - dividerHalf, Math.min(b.x, dividerX + dividerHalf));
  const cy = Math.max(dividerTop, Math.min(b.y, floor));
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= b.r * b.r) return;
  const d = Math.sqrt(d2) || 0.001;
  const nx = d2 === 0 ? (b.x < dividerX ? -1 : 1) : dx / d;
  const ny = d2 === 0 ? 0 : dy / d;
  const push = b.r - d;
  b.x += nx * push;
  b.y += ny * push;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= 1.3 * vn * nx;
    b.vy -= 1.3 * vn * ny;
  }
}

/** Advance the pile one frame. Returns true while anything is still moving. */
export function step(bodies: Body[]): boolean {
  const { left, right, floor } = WORLD;
  let moving = false;

  for (const b of bodies) {
    if (b.held) continue;
    b.vy += G;
    b.vx *= 0.985;
    b.x += b.vx;
    b.y += b.vy;
  }

  for (let iter = 0; iter < 6; iter++) {
    for (const b of bodies) {
      if (b.held) continue;
      if (b.x < left + b.r) {
        b.x = left + b.r;
        if (b.vx < 0) b.vx *= -0.3;
      }
      if (b.x > right - b.r) {
        b.x = right - b.r;
        if (b.vx > 0) b.vx *= -0.3;
      }
      if (b.y > floor - b.r) {
        b.y = floor - b.r;
        if (b.vy > 0) b.vy *= -0.18;
        b.vx *= 0.9;
      }
      collideDivider(b);
    }

    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (a.held) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const c = bodies[j];
        if (c.held) continue;
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const min = a.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.001;
        const nx = dx / d;
        const ny = dy / d;
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        c.x += nx * push;
        c.y += ny * push;
        const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (rel < 0) {
          const imp = rel * 0.55;
          a.vx += imp * nx;
          a.vy += imp * ny;
          c.vx -= imp * nx;
          c.vy -= imp * ny;
        }
      }
    }
  }

  for (const b of bodies) {
    if (b.held) continue;
    const speed = Math.abs(b.vx) + Math.abs(b.vy);
    if (speed < 0.42) {
      b.vx *= 0.5;
      if (Math.abs(b.vy) < 0.4) b.vy *= 0.5;
    } else {
      moving = true;
    }
  }
  return moving;
}

/** Run the simulation off-screen so the pile is already at rest on first paint. */
export function settle(bodies: Body[], frames = 420) {
  for (let i = 0; i < frames; i++) step(bodies);
  for (const b of bodies) {
    b.vx = 0;
    b.vy = 0;
  }
}

export function inChute(b: Body) {
  return b.x < WORLD.dividerX - WORLD.dividerHalf;
}

/** The mix a fresh load of capsules is poured from. */
const LOAD: Rarity[] = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5];

export function pourCapsules(count = LOAD.length, fromY = -20): Body[] {
  const mix = [...LOAD].sort(() => Math.random() - 0.5).slice(0, count);
  const span = WORLD.right - WORLD.dividerX - 24;
  const load = mix.map((rarity, i) =>
    makeBody(
      "capsule",
      WORLD.dividerX + 12 + Math.random() * span,
      fromY - i * 14,
      rarity,
    ),
  );
  // A couple of glowing orbs ride along with every load: grab one for a bonus.
  const orbs = count >= LOAD.length ? 2 : 1;
  for (let i = 0; i < orbs; i++) {
    load.push(makeBody("orb", WORLD.dividerX + 12 + Math.random() * span, fromY - (mix.length + i) * 14));
  }
  return load;
}

/** Three bits of scrap wedged in the chute for the repair quest. */
export function pourJunk(): Body[] {
  return [0, 1, 2].map((n) => makeBody("junk", 22 + n * 10, 100 - n * 22, 3, n));
}

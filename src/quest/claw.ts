import { type Body, WORLD, inChute, pourCapsules, settle, step } from "@/lib/physics";

import { type BallId, rollBalls } from "./balls";

// The claw machine itself, with nothing of the screen in it: a pile of balls, a claw, and
// what happens on each of the sixty steps a second. machine.tsx draws it and feeds it input.
//
// The one promise it keeps: no grab comes up empty. Ask for a grab with nothing under the
// claw and it goes to the nearest place a drop would catch a ball, then drops there. On the
// way down it follows the ball it is after (a pile shifts), it closes on whatever is between
// its prongs at that moment, and if that is nothing it goes straight back for another.

export type Phase = "idle" | "down" | "close" | "up" | "carry" | "release" | "return";

export interface Sim {
  bodies: Body[];
  /** Which design each body wears. */
  skin: Map<number, BallId>;
  keys: { left: boolean; right: boolean };
  /** Where the claw has been asked to go: a tap on the glass, or the way to the nearest ball. */
  seek: number | null;
  /** Drop as soon as the claw gets there. */
  dropOnArrival: boolean;
  /** Steps until the bin may be topped up again. */
  refillIn: number;
  /** Steps until a ball on top of the pile gives a little hop. */
  hopIn: number;
  claw: { x: number; y: number; open: boolean; phase: Phase; timer: number; targetY: number; target: Body | null; held: Body | null; ticked: number; tries: number };
}

/** Things worth a sound or a reaction. A "prize" carries the ball that came down the chute. */
export type ClawEvent = "move" | "descend" | "grab" | "miss" | "release" | "prize";
export type Emit = (event: ClawEvent, ball?: BallId) => void;

/** How far below the claw a held ball hangs, how fast the claw travels, how far to each side it can reach. */
export const HOLD = 10;
const SPEED = 1.7;
const REACH = 11.5;
/** The prongs close around a ball that is this much further out than the claw could aim for, or this far above or below. */
const GRASP_X = REACH + 3;
const GRASP_Y = 10;
/** How many times the claw will go again by itself before it admits a miss. */
const TRIES = 3;
/** A bin with this few balls left is topped up with a dozen more. */
const LOW = 4;
export const clampX = (x: number) => Math.max(WORLD.minX, Math.min(WORLD.maxX, x));

function pour(skin: Map<number, BallId>, n?: number) {
  const bodies = pourCapsules(n).filter((b) => b.kind === "capsule");
  const ids = rollBalls(bodies.length);
  bodies.forEach((b, i) => skin.set(b.id, ids[i]));
  return bodies;
}

export function createSim(): Sim {
  const skin = new Map<number, BallId>();
  const bodies = pour(skin);
  settle(bodies);
  return {
    bodies,
    skin,
    keys: { left: false, right: false },
    seek: null,
    dropOnArrival: false,
    refillIn: 0,
    hopIn: 150,
    claw: { x: WORLD.homeX, y: WORLD.top, open: true, phase: "idle", timer: 0, targetY: 0, target: null, held: null, ticked: WORLD.homeX, tries: 0 },
  };
}

/** What the claw would take if it dropped at `x` (where it is now, unless told otherwise), and how far down that is. */
export function sight(sim: Sim, x = sim.claw.x) {
  let y = WORLD.floor - 12;
  let target: Body | null = null;
  if (Math.abs(x - WORLD.dividerX) < 8) y = Math.min(y, WORLD.dividerTop - 12);
  for (const b of sim.bodies) {
    if (b.held || Math.abs(b.x - x) > REACH) continue;
    if (b.y - HOLD < y) {
      y = b.y - HOLD;
      target = b;
    }
  }
  return { y: Math.max(y, WORLD.top + 2), target };
}

/**
 * The nearest place, left or right, where a drop would come up with a ball. Not simply the
 * nearest ball: one tucked against the divider or the wall cannot be taken from above it.
 */
export function nearestCatch(sim: Sim) {
  const spots = sim.bodies
    .filter((b) => !b.held && !inChute(b))
    .map((b) => clampX(b.x))
    .sort((a, b) => Math.abs(a - sim.claw.x) - Math.abs(b - sim.claw.x));
  return spots.find((x) => sight(sim, x).target) ?? null;
}

/** Send the claw down for whatever is under it right now. */
function drop(sim: Sim, emit: Emit) {
  const c = sim.claw;
  const { y, target } = sight(sim);
  c.targetY = y;
  c.target = target;
  c.phase = "down";
  c.open = true;
  sim.seek = null;
  sim.dropOnArrival = false;
  emit("descend");
}

/** The ball between the prongs right now, if there is one: the nearest within their grasp. */
function inGrasp(sim: Sim) {
  const c = sim.claw;
  let best: Body | null = null;
  let near = Infinity;
  for (const b of sim.bodies) {
    const dx = Math.abs(b.x - c.x);
    const dy = Math.abs(b.y - (c.y + HOLD));
    if (b.held || dx > GRASP_X || dy > GRASP_Y || dx + dy >= near) continue;
    best = b;
    near = dx + dy;
  }
  return best;
}

/** The big button. With a ball under the claw it drops at once; otherwise it goes and finds one first. */
export function grab(sim: Sim, emit: Emit) {
  if (sim.claw.phase !== "idle") return;
  sim.claw.tries = 0;
  const spot = sight(sim).target ? null : nearestCatch(sim);
  if (spot !== null) {
    sim.seek = spot;
    sim.dropOnArrival = true;
  } else drop(sim, emit);
}

/** One tap of an arrow: a fixed step, so the claw can be steered without holding. True if it moved. */
export function nudge(sim: Sim, side: "left" | "right", emit: Emit) {
  const c = sim.claw;
  if (c.phase !== "idle") return false;
  c.x = clampX(c.x + (side === "left" ? -3 : 3));
  sim.seek = null;
  sim.dropOnArrival = false;
  emit("move");
  return true;
}

/** A tap on the glass: slide over to that spot, and wait there. */
export function seekTo(sim: Sim, x: number) {
  if (sim.claw.phase !== "idle") return;
  sim.seek = clampX(x);
  sim.dropOnArrival = false;
}

/**
 * One step, a sixtieth of a second. `locked` is true while a prize or a quote is on screen:
 * the claw finishes what it is doing, but takes no steering. Returns true if anything moved.
 */
export function advance(sim: Sim, locked: boolean, emit: Emit) {
  const c = sim.claw;
  let dirty = false;

  if (c.phase === "idle" && !locked) {
    const dir = (sim.keys.right ? 1 : 0) - (sim.keys.left ? 1 : 0);
    // Steering by hand takes over from wherever the claw was heading.
    if (dir) {
      sim.seek = null;
      sim.dropOnArrival = false;
    }
    let next = clampX(c.x + dir * SPEED);
    if (!dir && sim.seek !== null) {
      next = Math.abs(sim.seek - c.x) <= SPEED ? sim.seek : c.x + Math.sign(sim.seek - c.x) * SPEED;
      if (next === sim.seek) sim.seek = null;
    }
    if (next !== c.x) {
      c.x = next;
      dirty = true;
      if (Math.abs(c.x - c.ticked) > 9) {
        c.ticked = c.x;
        emit("move");
      }
    }
    if (sim.dropOnArrival && sim.seek === null) drop(sim, emit);

    // Now and then a ball on top of the pile hops, so the pile feels alive.
    if (--sim.hopIn <= 0) {
      sim.hopIn = 100 + Math.floor(Math.random() * 130);
      const aimed = sight(sim).target;
      const tops = sim.bodies.filter(
        (b) => b !== aimed && !b.held && !inChute(b) && Math.abs(b.vx) + Math.abs(b.vy) < 0.3 && !sim.bodies.some((o) => o !== b && o.y < b.y - 4 && Math.abs(o.x - b.x) < 13),
      );
      const hopper = tops[Math.floor(Math.random() * tops.length)];
      if (hopper) hopper.vy = -1.7;
    }
  }

  for (const b of sim.bodies) {
    if (b.held && b !== c.held) b.held = false;
    if (b.pass && !b.held && b.x > WORLD.dividerX + b.r + 2 && Math.abs(b.vx) + Math.abs(b.vy) < 0.5) b.pass = false;
  }
  if (c.held) {
    c.held.x = c.x;
    c.held.y = c.y + HOLD;
  }

  if (c.phase === "down") {
    // The pile may shift while the claw is on its way: keep after whatever is under it now.
    const now = sight(sim);
    c.targetY = now.y;
    c.target = now.target;
    c.y = Math.min(c.targetY, c.y + 2.4);
    if (c.y >= c.targetY) {
      c.phase = "close";
      c.timer = 16;
    }
    dirty = true;
  } else if (c.phase === "close") {
    c.timer--;
    if (c.timer === 9) {
      c.open = false;
      const t = inGrasp(sim);
      if (t) {
        t.held = true;
        c.held = t;
        emit("grab");
      } else c.tries++;
    }
    if (c.timer <= 0) c.phase = "up";
    dirty = true;
  } else if (c.phase === "up") {
    c.y = Math.max(WORLD.top, c.y - 1.9);
    if (c.y <= WORLD.top) {
      const again = !c.held && c.tries < TRIES ? nearestCatch(sim) : null;
      if (c.held) c.phase = "carry";
      else if (again === null) {
        // Out of tries, or nothing left in the bin to take: this one really is a miss.
        emit("miss");
        c.phase = "return";
      } else {
        // It came up empty and has tries left: straight over to the nearest ball and down again.
        c.phase = "idle";
        c.open = true;
        sim.seek = again;
        sim.dropOnArrival = true;
      }
    }
    dirty = true;
  } else if (c.phase === "carry" || c.phase === "return") {
    if (Math.abs(c.x - WORLD.homeX) <= SPEED) {
      c.x = WORLD.homeX;
      if (c.phase === "carry") {
        c.phase = "release";
        c.timer = 12;
      } else {
        c.phase = "idle";
        c.open = true;
      }
    } else {
      c.x += c.x > WORLD.homeX ? -SPEED : SPEED;
    }
    dirty = true;
  } else if (c.phase === "release") {
    c.timer--;
    if (c.timer === 7 && c.held) {
      c.held.pass = true;
      c.held.held = false;
      c.held.vx = 0;
      c.held.vy = 0;
      c.held = null;
      c.open = true;
      emit("release");
    }
    if (c.timer <= 0) c.phase = "idle";
    dirty = true;
  }

  if (step(sim.bodies)) dirty = true;

  // A ball that reaches the bottom of the chute is the prize.
  for (const b of sim.bodies) {
    if (b.held || !inChute(b) || b.y < WORLD.floor - b.r - 1) continue;
    sim.bodies = sim.bodies.filter((x) => x !== b);
    const ball = sim.skin.get(b.id) ?? "classic";
    sim.skin.delete(b.id);
    emit("prize", ball);
    dirty = true;
    break;
  }

  // Running low: a dozen more tumble in, and no more for two and a half seconds.
  if (sim.refillIn > 0) sim.refillIn--;
  if (sim.bodies.length <= LOW && sim.refillIn === 0 && c.phase === "idle") {
    sim.refillIn = 150;
    sim.bodies = [...sim.bodies, ...pour(sim.skin, 12)];
    dirty = true;
  }

  return dirty;
}

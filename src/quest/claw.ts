import { type Body, WORLD, inChute, pourCapsules, settle, step } from "@/lib/physics";

import { type BallId, rollBalls } from "./balls";

// The claw machine itself, with nothing of the screen in it: a pile of balls, a claw, and
// what happens on each of the sixty steps a second. machine.tsx draws it and feeds it input.
//
// How it behaves: the claw only ever drops straight down, where the player has put it. It
// never travels sideways by itself to find a ball. Aim at an empty spot and it comes up empty.
//
// What it does to be fair: between rounds it rests over the pile, not over the prize chute
// (where there is nothing to take), so there is a ball under it before anyone has steered. On
// the way down it follows the ball it is after, because a pile shifts, and it closes on
// whatever is between its prongs at that moment.

export type Phase = "idle" | "down" | "close" | "up" | "carry" | "release" | "rest";

export interface Sim {
  bodies: Body[];
  /** Which design each body wears. */
  skin: Map<number, BallId>;
  keys: { left: boolean; right: boolean };
  /** Where a tap on the glass asked the claw to go. */
  seek: number | null;
  /** Steps until the bin may be topped up again. */
  refillIn: number;
  /** Steps until a ball on top of the pile gives a little hop. */
  hopIn: number;
  claw: { x: number; y: number; open: boolean; phase: Phase; timer: number; targetY: number; target: Body | null; held: Body | null; ticked: number; restX: number };
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
  const sim: Sim = {
    bodies,
    skin,
    keys: { left: false, right: false },
    seek: null,
    refillIn: 0,
    hopIn: 150,
    claw: { x: WORLD.homeX, y: WORLD.top, open: true, phase: "idle", timer: 0, targetY: 0, target: null, held: null, ticked: WORLD.homeX, restX: WORLD.homeX },
  };
  // It starts where it rests: over the pile, with a ball under it.
  sim.claw.x = sim.claw.ticked = sim.claw.restX = restSpot(sim);
  return sim;
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

/** Where the claw rests between rounds: the place nearest the middle of the bin where a drop would catch a ball. */
export function restSpot(sim: Sim) {
  const middle = (WORLD.dividerX + WORLD.right) / 2;
  const spots = sim.bodies
    .filter((b) => !b.held && !inChute(b))
    .map((b) => clampX(b.x))
    .sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
  return spots.find((x) => sight(sim, x).target) ?? clampX(middle);
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

/** The big button: the claw drops straight down, wherever it is. */
export function grab(sim: Sim, emit: Emit) {
  if (sim.claw.phase === "idle") drop(sim, emit);
}

/** One tap of an arrow: a fixed step, so the claw can be steered without holding. True if it moved. */
export function nudge(sim: Sim, side: "left" | "right", emit: Emit) {
  const c = sim.claw;
  if (c.phase !== "idle") return false;
  c.x = clampX(c.x + (side === "left" ? -3 : 3));
  sim.seek = null;
  emit("move");
  return true;
}

/** A tap on the glass: slide over to that spot, and wait there. */
export function seekTo(sim: Sim, x: number) {
  if (sim.claw.phase !== "idle") return;
  sim.seek = clampX(x);
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
    // Steering by hand takes over from wherever a tap had sent the claw.
    if (dir) sim.seek = null;
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
      } else emit("miss");
    }
    if (c.timer <= 0) c.phase = "up";
    dirty = true;
  } else if (c.phase === "up") {
    c.y = Math.max(WORLD.top, c.y - 1.9);
    if (c.y <= WORLD.top) {
      // With a ball, off to the chute. Without one, it opens again and waits where it is for
      // the player to line it up.
      if (c.held) c.phase = "carry";
      else {
        c.phase = "idle";
        c.open = true;
      }
    }
    dirty = true;
  } else if (c.phase === "carry") {
    if (Math.abs(c.x - WORLD.homeX) <= SPEED) {
      c.x = WORLD.homeX;
      c.phase = "release";
      c.timer = 12;
    } else {
      c.x += c.x > WORLD.homeX ? -SPEED : SPEED;
    }
    dirty = true;
  } else if (c.phase === "rest") {
    // Back from the chute to its place over the pile.
    if (Math.abs(c.x - c.restX) <= SPEED) {
      c.x = c.restX;
      c.phase = "idle";
    } else {
      c.x += c.x > c.restX ? -SPEED : SPEED;
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
    if (c.timer <= 0) {
      c.restX = restSpot(sim);
      c.phase = "rest";
    }
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

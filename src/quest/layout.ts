// Which arrangement of the game fits a window, and how big to draw it.
//
// The cabinet is drawn on a fixed-size canvas and scaled as one piece. Scaled to anything but
// 1 (or 2) its pixels stop landing on whole screen pixels and the type goes soft, so the aim is
// to find an arrangement that fits at exactly 1, and only shrink when nothing does.
//
// There are three families:
//   beside  the cabinet with both menus standing either side of it
//   split   the cabinet's glass on the left, its controls on a deck to the right, menus in dialogs
//   folded  the whole cabinet, with the menus folded into a bar across the top
// and within each a few levels that leave out more as the window gets shorter.

export type Family = "beside" | "split" | "folded";

export interface Parts {
  mascot: boolean;
  marquee: "full" | "short" | "none";
  /** The arrows and the big button, under the glass. In `split` they are on the deck instead. */
  ledge: boolean;
  base: "full" | "slim" | "none";
}

export interface Layout {
  family: Family;
  level: number;
  parts: Parts;
  /** Natural size of the canvas the game is drawn on, before scaling. */
  width: number;
  height: number;
  scale: number;
  /** Height of the menu bar across the top (folded only). */
  bar: number;
  /** How far the cabinet stands above the bottom of the window, in screen pixels. */
  gap: number;
  /** Screen pixels per art pixel of the scenery: always a whole number. */
  art: number;
  /** Whole art rows of the scenery hidden above the top of the window. */
  cut: number;
}

// Natural heights of the pieces of the cabinet, in CSS pixels. The end-to-end check measures the
// real cabinet in every arrangement and fails if any of these has drifted.
const MASCOT = 92;
const MARQUEE = { full: 160, short: 102, none: 0 };
const GLASS = 420;
const LEDGE = 124;
const BASE = { full: 117, slim: 64, none: 0 };
const FEET = 16;
/** Each piece of the cabinet below the mascot overlaps the one above by this much. */
const JOIN = 4;

export const CABINET_WIDTH = 544;
export const SIDE_WIDTH = 300;
export const DECK_WIDTH = 280;
const WIDTH: Record<Family, number> = { beside: 1260, split: CABINET_WIDTH + 32 + DECK_WIDTH, folded: CABINET_WIDTH + 12 };

const PARTS: Record<Family, Parts[]> = {
  beside: [
    { mascot: true, marquee: "full", ledge: true, base: "full" },
    { mascot: true, marquee: "full", ledge: true, base: "slim" },
    { mascot: true, marquee: "short", ledge: true, base: "slim" },
    // No base at all: the status strip moves to the bottom of the right-hand menu.
    { mascot: true, marquee: "short", ledge: true, base: "none" },
  ],
  folded: [
    { mascot: true, marquee: "full", ledge: true, base: "full" },
    { mascot: true, marquee: "full", ledge: true, base: "slim" },
    { mascot: true, marquee: "short", ledge: true, base: "slim" },
  ],
  split: [
    { mascot: true, marquee: "full", ledge: false, base: "none" },
    { mascot: true, marquee: "short", ledge: false, base: "none" },
    // The glass and nothing else: for a phone held sideways.
    { mascot: false, marquee: "none", ledge: false, base: "none" },
  ],
};

export function cabinetHeight(p: Parts) {
  const stack = [MARQUEE[p.marquee], GLASS, p.ledge ? LEDGE : 0, BASE[p.base], FEET].filter((h) => h > 0);
  return (p.mascot ? MASCOT : 0) + stack.reduce((a, b) => a + b, 0) - JOIN * (stack.length - 1);
}

/** The menu bar is one row from this width up, and two rows below it. */
/** The scenery stage, in art pixels. */
export const STAGE_W = 512;
export const STAGE_H = 270;
export const BAR_ONE_ROW = 760;
const barHeight = (vw: number) => (vw >= BAR_ONE_ROW ? 100 : 164);
/** Room always kept clear: a sliver above the cabinet and a strip of floor below it. */
const HEADROOM = 4;
const FLOOR = 8;
/** Menus drawn smaller than this beside the cabinet are too small to read. */
const BESIDE_MIN = 0.8;
/** An arrangement this close to the best one counts as just as good. */
const CLOSE = 0.05;

interface Candidate {
  family: Family;
  level: number;
  parts: Parts;
  width: number;
  height: number;
  bar: number;
  scale: number;
}

function candidates(vw: number, vh: number): Candidate[] {
  const list: Candidate[] = [];
  for (const family of ["beside", "split", "folded"] as const) {
    PARTS[family].forEach((parts, level) => {
      const width = WIDTH[family];
      const height = cabinetHeight(parts);
      const bar = family === "folded" ? barHeight(vw) : 0;
      const scale = Math.max(0.1, Math.min(1, (vw - 16) / width, (vh - bar - HEADROOM - FLOOR) / height));
      list.push({ family, level, parts, width, height, bar, scale });
    });
  }
  return list;
}

export function chooseLayout(vw: number, vh: number): Layout {
  const all = candidates(vw, vh);
  const of = (family: Family) => all.filter((c) => c.family === family);
  const glassOnly = of("split")[2];
  // Richest first. A wide window prefers the deck to the bar; a tall one the other way round.
  const beside = of("beside").filter((c) => c.scale >= BESIDE_MIN);
  const split = of("split").slice(0, 2);
  const folded = of("folded");
  const main = [...beside, ...(vw > vh ? [...split, ...folded] : [...folded, ...split])];
  const best = Math.max(...main.map((c) => c.scale));

  let pick: Candidate;
  if (best < 0.8 && glassOnly.scale > best + CLOSE) {
    pick = glassOnly;
  } else {
    // The richest arrangement that is pixel-perfect; failing that, the richest that is about as big as anything gets.
    pick = main.find((c) => c.scale === 1) ?? main.find((c) => c.scale >= best - CLOSE)!;
  }

  // A very large screen gets everything at double size, which is just as crisp.
  let scale = pick.scale;
  if (scale === 1 && (vw - 16) / pick.width >= 2 && (vh - pick.bar - HEADROOM - FLOOR) / pick.height >= 2) scale = 2;

  // The scenery is drawn at a whole number of screen pixels per art pixel, and the cabinet
  // stands nine art pixels up from the bottom of it, on the floor, when there is room.
  // (The stage is 512 x 270 art pixels. It always covers the width; in height it is allowed to
  // fall up to a fifth of an art pixel short, and plain sky fills the strip above it.)
  const art = Math.max(2, Math.ceil(vw / STAGE_W), Math.ceil(vh / STAGE_H - 0.2));
  const spare = vh - pick.bar - HEADROOM - pick.height * scale;
  const gap = Math.round(Math.max(FLOOR, Math.min(art * 9, spare)));

  // A wide, short window hides the top of the stage. The scenery needs to know by how many
  // art rows, so that what hangs in the sky can come down into view instead of being sliced.
  const cut = Math.max(0, Math.ceil(STAGE_H - vh / art));

  return { family: pick.family, level: pick.level, parts: pick.parts, width: pick.width, height: pick.height, scale, bar: pick.bar, gap, art, cut };
}

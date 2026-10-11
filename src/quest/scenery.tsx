"use client";

import { memo, useEffect, useMemo, useRef } from "react";

import { Art, type SpriteData, cloud, sparkle, star } from "./art";
import * as S from "./scenery-art";
import type { WorldId } from "./worlds";

// The level behind the machine. Each world is a stack of painted layers (far
// sky to the floor the cabinet stands on), drawn once onto low-resolution
// canvases, and a cast of animated sprites. The world moves: far layers scroll
// past, one art pixel at a time; clouds, birds and vehicles cross the sky; things
// hop, drip, launch and drive along the ground. The floor itself stays put, so
// the machine stands still while the world goes by behind it. The stage is
// 512 x 270 art pixels, pinned to the bottom of the screen and scaled to cover.

const W = 512;
const H = 270;
/** Top of the floor the cabinet stands on. */
const GROUND = 236;
const CX = W / 2;
const { sin, abs, floor, round, sqrt, max, min } = Math;
/** One full turn across the stage: sin(TAU * k * x) repeats exactly k times, so a scrolling layer has no seam. */
const TAU = (Math.PI * 2) / W;

type G = CanvasRenderingContext2D;
type Paint = (g: G) => void;

interface Prop {
  sprite?: SpriteData;
  x: number;
  y: number;
  /** Size, for props that are a plain block rather than a sprite. */
  w?: number;
  h?: number;
  /** Animation on the positioned wrapper, and on the art inside it. */
  cls?: string;
  inner?: string;
  delay?: number;
  dur?: number;
  layer: number;
  color?: string;
  /** Draw the sprite larger or smaller than one art pixel per pixel. */
  scale?: number;
  /** Extra CSS variables for the animation: which side of the road, how far to fall. */
  vars?: Record<string, string | number>;
}

interface Scene {
  layers: Paint[];
  /** How far each layer slides against the pointer. */
  depths: number[];
  /** Seconds for a layer to scroll once across the stage; 0 or missing means it stays put. */
  scroll?: number[];
  /** One layer drawn as a flip-book: several frames, shown in turn. */
  frames?: { layer: number; paints: Paint[]; ms: number };
  props: Prop[];
  /**
   * The stage is pinned to the bottom of the window, so a wide, short window hides its top
   * rows. Everything above this row hangs from the top of the window instead: it slides down
   * by however many rows are hidden, so nothing up there is ever sliced by the window's edge.
   */
  seam: number;
  /** Painted layers with something above the seam. They are painted in two parts, so the top part can slide. */
  hang?: number[];
}

/** Props that travel on their own. In a scrolling layer everything else rides along with the scenery. */
const FREE = ["sc-drift", "sc-drift-back", "sc-patrol", "sc-shoot", "sc-zoom"];

// ── Painting helpers ───────────────────────────────────────────────────
const mulberry = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function box(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c;
  g.fillRect(round(x), round(y), round(w), round(h));
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x: number, y: number, share: number) => share * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5;

/** Flat bands of colour; every seam is ordered-dithered so the gradient stays pixel art. */
function sky(g: G, stops: [number, string][], seam = 8, bottom = H) {
  stops.forEach(([y, c], i) => box(g, 0, y, W, (stops[i + 1]?.[0] ?? bottom) - y, c));
  for (let i = 1; i < stops.length; i++) {
    const y0 = stops[i][0] - seam / 2;
    for (let r = 0; r < seam; r++) {
      for (let x = 0; x < W; x++) {
        g.fillStyle = dither(x, y0 + r, (r + 0.5) / seam) ? stops[i][1] : stops[i - 1][1];
        g.fillRect(x, y0 + r, 1, 1);
      }
    }
  }
}

/** A disc of dithered light: dense in the middle, thinning to nothing at the rim. */
function glow(g: G, cx: number, cy: number, r: number, c: string, strength = 1) {
  g.fillStyle = c;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1 && dither(x, y, (1 - d) ** 1.6 * strength)) g.fillRect(x, y, 1, 1);
    }
  }
}

/** Land: everything below a height line, with an optional outline and lit edge. */
function ridge(g: G, top: (x: number) => number, fill: string, o: { line?: string; hi?: string; hiH?: number; bottom?: number } = {}) {
  let prev = round(top(0));
  for (let x = 0; x < W; x++) {
    const y = round(top(x));
    box(g, x, y, 1, (o.bottom ?? H) - y, fill);
    if (o.hi) box(g, x, y + 1, 1, o.hiH ?? 2, o.hi);
    if (o.line) box(g, x, min(y, prev), 1, abs(y - prev) + 1, o.line);
    prev = y;
  }
}

/** A skyline of round hills, as a height line. */
const humps = (list: [number, number][], base: number) => (x: number) => {
  let top = 0;
  for (const [cx, r] of list) {
    // Measured the short way round, so the skyline joins up with itself where the stage wraps.
    const dx = ((((x - cx + W / 2) % W) + W) % W) - W / 2;
    const d = r * r - dx ** 2;
    if (d > 0) top = max(top, sqrt(d));
  }
  return base - top;
};

function stamp(g: G, s: SpriteData, x: number, y: number) {
  for (const r of s.runs) {
    g.fillStyle = r.c;
    g.fillRect(round(x) + r.x, round(y) + r.y, r.w, 1);
  }
}

/** A striped setting sun: the gaps widen toward the horizon. */
function sun(g: G, cx: number, cy: number, r: number, cols: string[], horizon: number, stripesFrom = 0) {
  for (let dy = -r; dy <= r; dy++) {
    const y = cy + dy;
    if (y >= horizon) break;
    const s = dy - stripesFrom;
    if (s > 0 && s % 10 < min(7, 2 + floor(s / 10))) continue;
    const half = round(sqrt(r * r - dy * dy));
    box(g, cx - half, y, half * 2, 1, cols[min(cols.length - 1, floor(((dy + r) / (2 * r)) * cols.length))]);
  }
}

function stars(g: G, seed: number, count: number, maxY: number, cols: string[], big = 0) {
  const r = mulberry(seed);
  for (let i = 0; i < count; i++) {
    const x = floor(r() * W);
    const y = floor(r() ** 1.4 * maxY);
    const c = cols[floor(r() * cols.length)];
    box(g, x, y, 1, 1, c);
    if (i < big) {
      box(g, x - 1, y, 3, 1, c);
      box(g, x, y - 1, 1, 3, c);
    }
  }
}

// ── World 1: Dreamland ─────────────────────────────────────────────────
function dream(): Scene {
  const far = (x: number) => 200 + 9 * sin(TAU * 2 * x + 1) + 5 * sin(TAU * 5 * x);
  const mid = (x: number) => 218 + 8 * sin(x / 29 + 2.4) + 3 * sin(x / 11 + 1);
  const trees: [number, number, string, string, string, string][] = [
    [14, 13, "#ffb3d1", "#ffd9e8", "#f48fb8", "#c9619a"],
    [36, 9, "#b9ecd0", "#e2f9ec", "#8fd6b0", "#5aa888"],
    [66, 11, "#d6c2f6", "#ece2fc", "#b89ae8", "#8a6cc8"],
    [176, 10, "#ffb3d1", "#ffd9e8", "#f48fb8", "#c9619a"],
    [338, 12, "#b9ecd0", "#e2f9ec", "#8fd6b0", "#5aa888"],
    [436, 10, "#ffb3d1", "#ffd9e8", "#f48fb8", "#c9619a"],
    [470, 14, "#d6c2f6", "#ece2fc", "#b89ae8", "#8a6cc8"],
    [498, 9, "#ffe2a8", "#fff3d6", "#f6c878", "#c9944a"],
  ];
  const lilac = ["#d6c2f6", "#ece2fc", "#b89ae8", "#8a6cc8"] as const;
  const mint = ["#b9ecd0", "#e2f9ec", "#8fd6b0", "#5aa888"] as const;
  // The islands and cake platforms are whole sprites, so they can float.
  const isleA = S.compose("isle-a", 64, 58, [[S.island(64), 0, 20], [S.puffTree(13), 10, 5], [S.puffTree(9, ...mint), 28, 9], [S.lolli(5), 44, 0]]);
  const isleB = S.compose("isle-b", 56, 54, [[S.island(56), 0, 20], [S.puffTree(11, ...lilac), 32, 7], [S.lolli(5, "#8fd0ff", "#f2fbff", "#4f93c8"), 8, 0], [S.gumdrop(10), 20, 14]]);
  const cakeA = S.compose("cake-a", 52, 24, [[S.cake(52), 0, 9], [S.gumdrop(12, "#ffd98a", "#fff3d0", "#f0b85a", "#c98a2e"), 32, 0]]);
  const cakeB = S.compose("cake-b", 44, 23, [[S.cake(44, "#b9a6f2", "#e0d6fb"), 0, 8], [S.gumdrop(11, "#ff9ec6", "#ffd9e8", "#f07aa8", "#c9619a"), 6, 0]]);
  const props: Prop[] = [
    ...[
      [56, 6, 64, -6],
      [38, 28, 92, -50],
      [48, 54, 76, -26],
      [30, 82, 104, -82],
      [44, 104, 82, -62],
      [34, 18, 110, -17],
      [40, 128, 96, -38],
    ].map(([w, y, dur, delay], i): Prop => ({ sprite: cloud(w, i % 3 === 1 ? "lilac" : "pink"), x: 0, y, cls: "sc-drift", inner: "sc-jiggle", dur, delay, layer: 1 })),
    ...[
      [30, 22],
      [72, 58],
      [196, 14],
      [224, 70],
      [300, 40],
      [332, 12],
      [428, 20],
      [470, 76],
      [486, 34],
      [22, 108],
      [180, 118],
      [340, 122],
    ].map(([x, y], i): Prop => ({ sprite: sparkle((["yellow", "pink", "blue", "lilac", "mint"] as const)[i % 5], i % 2 ? 7 : 9), x, y, inner: "sc-twinkle", delay: -i * 0.37, layer: 0 })),
    // Islands and cake platforms, floating.
    { sprite: isleA, x: 94, y: 16, inner: "sc-float", layer: 2 },
    { sprite: isleB, x: 358, y: 6, inner: "sc-float", delay: -1.6, layer: 2 },
    { sprite: cakeA, x: 14, y: 141, inner: "sc-float", delay: -0.8, layer: 2 },
    { sprite: cakeB, x: 452, y: 130, inner: "sc-float", delay: -2.6, layer: 2 },
    { sprite: S.bonbon(), x: 160, y: 26, inner: "sc-bob", layer: 2 },
    { sprite: star(12, false), x: 418, y: 10, inner: "sc-bob", delay: -0.9, layer: 2 },
    { sprite: star(18), x: 30, y: 128, inner: "sc-bob", delay: -0.4, layer: 2 },
    { sprite: S.bonbon("#8fd6b0", "#e2f9ec", "#5aa888"), x: 458, y: 118, inner: "sc-bob", delay: -1.3, layer: 2 },
    // Hot-air balloons crossing the sky, and a few birds going the other way.
    { sprite: S.balloon("#ff9ec6", "#fff6fa"), x: 0, y: 4, cls: "sc-drift", inner: "sc-float", dur: 58, delay: -14, layer: 2 },
    { sprite: S.balloon("#9be3b4", "#fffbe6", "#4f9f7c"), x: 0, y: 22, cls: "sc-drift", inner: "sc-float", dur: 84, delay: -52, layer: 2 },
    ...[
      [10, 0],
      [16, -0.5],
      [5, -1.1],
    ].flatMap(([y, d]): Prop[] => [
      { sprite: S.bird(0, "#7a5cb8"), x: 0, y, cls: "sc-drift-back", inner: "sc-flick-a", dur: 30, delay: -8 + d, layer: 2 },
      { sprite: S.bird(1, "#7a5cb8"), x: 0, y, cls: "sc-drift-back", inner: "sc-flick-b", dur: 30, delay: -8 + d, layer: 2 },
    ]),
    { x: 400, y: 2, w: 22, h: 1, cls: "sc-shoot", color: "#ffffff", delay: -3, layer: 0 },
  ];
  return {
    depths: [0, 0.3, 0.65, 1.1],
    scroll: [0, 130, 0, 0],
    // The islands, balloons and high clouds hang; the cake platforms and far islands stand.
    seam: 80,
    props,
    layers: [
      (g) => {
        sky(g, [[0, "#a99cf0"], [44, "#bfa6f2"], [84, "#dcaeee"], [120, "#f6b4dc"], [152, "#ffc4d6"], [182, "#ffd8cc"], [208, "#ffeacc"]], 10);
        stars(g, 7, 60, 84, ["#ffffff", "#ffffff", "#fff6c8"], 6);
        // A rainbow arching over the machine: six bands, dithered so the sky shows through.
        const bands = ["#ff9ec6", "#ffc08a", "#fff0a8", "#b9f0d4", "#a9c9ff", "#c8b6ff"];
        for (let y = 14; y < 168; y++) {
          for (let x = 0; x < W; x++) {
            const i = floor((150 - Math.hypot(x - CX, y - 168)) / 3);
            if (i >= 0 && i < bands.length && dither(x, y, 0.7)) box(g, x, y, 1, 1, bands[i]);
          }
        }
        sun(g, CX, 206, 96, ["#fffbe6", "#fff6d0", "#ffeec0", "#ffe2b4", "#ffd6ac"], GROUND, -30);
      },
      (g) => {
        ridge(g, far, "#dcaaea", { hi: "#eecaf6", hiH: 1 });
        stamp(g, S.island(44, S.ISLE_FAR), 214, 98);
        stamp(g, S.island(30, S.ISLE_FAR), 300, 118);
        stamp(g, S.island(36, S.ISLE_FAR), 20, 92);
        stamp(g, S.island(28, S.ISLE_FAR), 468, 100);
      },
      (g) => {
        ridge(g, mid, "#f59cc2", { hi: "#ffc2da", hiH: 2, line: "#de78a6" });
        for (const [x, s, a, b, c, d] of trees) stamp(g, S.puffTree(s, a, b, c, d), x - s / 2, mid(x) - round(s * 1.35) + 3);
      },
      (g) => {
        box(g, 0, GROUND, W, H - GROUND, "#f79ac0");
        for (let y = GROUND + 2; y < H; y += 8) for (let x = (floor((y - GROUND) / 8) % 2) * 8; x < W; x += 16) box(g, x, y, 8, 8, "#f48bb6");
        for (let x = 0; x < W; x++) {
          const drip = 3 + round(1.6 + 1.6 * sin(x * 0.55)) + (floor(x / 11) % 3 === 0 ? 2 : 0);
          box(g, x, GROUND, 1, drip, "#fff8fc");
          box(g, x, GROUND + drip, 1, 1, "#e584b0");
        }
        box(g, 0, GROUND - 1, W, 1, "#d97aa8");
        box(g, 0, GROUND, W, 1, "#ffffff");
        // A few sweets on the ground, kept to the corners.
        const yellow = ["#ffd98a", "#fff3d0", "#f0b85a", "#c98a2e"] as const;
        const rose = ["#ff9ec6", "#ffd9e8", "#f07aa8", "#c9619a"] as const;
        // Under the menus, either side of the machine.
        stamp(g, S.candyCane(), 94, GROUND - 13);
        stamp(g, S.lolli(8), 110, GROUND - 26);
        stamp(g, S.gumdrop(16), 132, GROUND - 12);
        stamp(g, S.cupcake(), 152, GROUND - 11);
        stamp(g, S.cupcake(), 346, GROUND - 11);
        stamp(g, S.gumdrop(14, ...lilac), 364, GROUND - 10);
        stamp(g, S.lolli(7, "#8fd0ff", "#f2fbff", "#4f93c8"), 386, GROUND - 24);
        stamp(g, S.candyCane(), 404, GROUND - 13);
        // And out in the corners, for wide screens.
        stamp(g, S.lolli(8, "#b9a6f2", "#f2edff", "#7a5cb8"), 26, GROUND - 26);
        stamp(g, S.gumdrop(14, ...rose), 50, GROUND - 10);
        stamp(g, S.gumdrop(10, ...yellow), 8, GROUND - 7);
        stamp(g, S.lolli(8), 470, GROUND - 26);
        stamp(g, S.gumdrop(16, ...lilac), 444, GROUND - 12);
        stamp(g, S.gumdrop(9, ...yellow), 494, GROUND - 6);
      },
    ],
  };
}

// ── World 2: Mushroom Hills ────────────────────────────────────────────
function mushroomHills(): Scene {
  const far = humps([[30, 62], [148, 42], [262, 82], [392, 54], [490, 62]], 240);
  const mid = humps([[94, 38], [214, 26], [334, 30], [446, 42]], 242);
  const blocks = (g: G, x: number, y: number, kinds: S.BlockKind[]) => kinds.forEach((k, i) => stamp(g, S.block(k), x + i * 12, y));
  const coins: [number, number][] = [[112, 6], [124, 6], [136, 6], [376, 4], [388, 4], [400, 4], [26, 112], [38, 112], [464, 100]];
  const lift = S.compose("lift", 26, 15, [[S.plank(26), 0, 9], [S.coin(), 9, 0]]);
  const props: Prop[] = [
    ...[
      [52, 8, 60, -11],
      [36, 32, 88, -55],
      [46, 62, 72, -33],
      [30, 90, 100, -78],
      [40, 20, 82, -70],
      [34, 118, 94, -24],
    ].map(([w, y, dur, delay]): Prop => ({ sprite: cloud(w, "sky"), x: 0, y, cls: "sc-drift", inner: "sc-jiggle", dur, delay, layer: 1 })),
    ...coins.map(([x, y], i): Prop => ({ sprite: S.coin(), x, y, cls: "sc-bob", inner: "sc-flip", delay: -i * 0.21, layer: 2 })),
    ...[
      [152, 4],
      [356, 6],
      [34, 104],
      [470, 92],
    ].map(([x, y], i): Prop => ({ sprite: sparkle("yellow", 7), x, y, inner: "sc-twinkle", delay: -i * 0.6, layer: 2 })),
    // Birds overhead.
    ...[
      [34, 0],
      [40, -0.6],
      [30, -1.3],
    ].flatMap(([y, d]): Prop[] => [
      { sprite: S.bird(0, "#1f4a8a"), x: 0, y, cls: "sc-drift-back", inner: "sc-flick-a", dur: 26, delay: -5 + d, layer: 2 },
      { sprite: S.bird(1, "#1f4a8a"), x: 0, y, cls: "sc-drift-back", inner: "sc-flick-b", dur: 26, delay: -5 + d, layer: 2 },
    ]),
    // One blob out for a walk across the grass.
    { sprite: S.blob("#4f9cf0", "#b6dcff", "#1f4a8a"), x: 0, y: GROUND - 10, cls: "sc-drift", inner: "sc-hop", dur: 48, delay: -6, layer: 3 },
    // Butterflies over the flowers.
    ...[
      [88, GROUND - 16, "#ff9ec6", 0],
      [170, GROUND - 20, "#ffffff", -0.7],
      [342, GROUND - 18, "#fff0a8", -1.4],
    ].flatMap(([x, y, c, d]): Prop[] => [
      { sprite: S.butterfly(0, c as string), x: x as number, y: y as number, cls: "sc-flutter", inner: "sc-flick-a", delay: d as number, layer: 3 },
      { sprite: S.butterfly(1, c as string), x: x as number, y: y as number, cls: "sc-flutter", inner: "sc-flick-b", delay: d as number, layer: 3 },
    ]),
    // A lift with a coin on it, out at each edge, and the goal flag.
    { sprite: lift, x: 34, y: 196, cls: "sc-lift", dur: 8, layer: 2 },
    { sprite: lift, x: 456, y: 190, cls: "sc-lift", dur: 10, delay: -4, layer: 2 },
    { sprite: S.goalFlag(0), x: 428, y: GROUND - 30, inner: "sc-flick-a sc-slow", layer: 3 },
    { sprite: S.goalFlag(1), x: 428, y: GROUND - 30, inner: "sc-flick-b sc-slow", layer: 3 },
  ];
  return {
    depths: [0, 0.3, 0.65, 1.1],
    scroll: [0, 150, 0, 0],
    // The two block rows high in the sky hang, with the coins over them.
    seam: 80,
    hang: [2],
    props,
    layers: [
      (g) => {
        sky(g, [[0, "#3f9cf0"], [56, "#5aaef5"], [112, "#7cc2fa"], [162, "#a3d6fd"], [202, "#cdeaff"]], 4);
        ridge(g, (x) => 224 + 5 * sin(x / 23) + 3 * sin(x / 9 + 2), "#e8f6ff");
      },
      (g) => {
        ridge(g, far, "#8fd98f", { line: "#4fa862" });
        // Lit patches on the far hills.
        for (const [x, y, w] of [[18, 196, 9], [40, 188, 6], [250, 172, 12], [280, 180, 7], [140, 208, 6], [384, 198, 8], [482, 190, 9]]) {
          box(g, x, y, w, 3, "#b4ecb0");
          box(g, x + 1, y - 1, w - 2, 5, "#b4ecb0");
        }
      },
      (g) => {
        ridge(g, mid, "#58c060", { line: "#2e8f3c", hi: "#86dc84", hiH: 1 });
        stamp(g, S.bush(30), 150, GROUND - 13);
        stamp(g, S.bush(24), 352, GROUND - 11);
        // Block rows high in the sky, clear of the menus.
        blocks(g, 100, 20, ["brick", "prize", "brick", "brick"]);
        blocks(g, 364, 18, ["brick", "brick", "prize", "brick"]);
        // And out at the edges for wide screens.
        blocks(g, 14, 126, ["brick", "prize", "brick"]);
        blocks(g, 452, 114, ["prize", "brick"]);
        blocks(g, 0, GROUND - 12, ["brick"]);
        blocks(g, 488, GROUND - 12, ["brick", "brick"]);
        blocks(g, 500, GROUND - 24, ["brick"]);
      },
      (g) => {
        box(g, 0, GROUND, W, H - GROUND, "#c9793a");
        for (let y = GROUND + 6; y < H; y += 8) {
          box(g, 0, y + 7, W, 1, "#9a5424");
          box(g, 0, y, W, 1, "#e09a5a");
          for (let x = (floor((y - GROUND) / 8) % 2) * 8; x < W; x += 16) box(g, x, y, 1, 7, "#9a5424");
        }
        for (let x = 0; x < W; x++) {
          const tooth = [0, 1, 2, 2, 1, 0][x % 6];
          box(g, x, GROUND - 1, 1, 6 + tooth, "#58c74f");
          box(g, x, GROUND + 5 + tooth, 1, 1, "#2e8f3c");
        }
        box(g, 0, GROUND - 2, W, 1, "#2e8f3c");
        box(g, 0, GROUND - 1, W, 1, "#a5ee86");
        const gold = ["#ffc93a", "#d9952a", "#fff0a8"] as const;
        // Under the menus, either side of the machine.
        stamp(g, S.mushroom(40), 100, GROUND - 39);
        stamp(g, S.mushroom(20, ...gold), 146, GROUND - 19);
        stamp(g, S.mushroom(26), 386, GROUND - 25);
        stamp(g, S.bush(22), 350, GROUND - 10);
        // A signpost pointing on, and a bit of fence at each edge.
        stamp(g, S.signpost(), 170, GROUND - 10);
        stamp(g, S.fence(24), 62, GROUND - 9);
        stamp(g, S.fence(18), 414, GROUND - 9);
        // And out in the corners, for wide screens.
        stamp(g, S.mushroom(34), 18, GROUND - 33);
        stamp(g, S.mushroom(18, ...gold), 58, GROUND - 17);
        stamp(g, S.mushroom(30, ...gold), 446, GROUND - 29);
        for (const [x, c] of [[90, "#ffffff"], [172, "#ff9ec6"], [340, "#ffffff"], [420, "#ffc93a"], [4, "#ff9ec6"], [80, "#ffc93a"], [436, "#ffffff"]] as [number, string][]) stamp(g, S.flower(c, c === "#ffc93a" ? "#ee4b3b" : "#ffc93a"), x, GROUND - 8);
      },
    ],
  };
}

// ── World 3: Cosmic Arcade ─────────────────────────────────────────────
function cosmic(): Scene {
  const far = (x: number) => 214 + 7 * sin(x / 33 + 0.6) + 5 * abs(sin(x / 14));
  const surface = (x: number) => GROUND + round(1.4 * sin(x / 19));
  const nebula = (g: G, cx: number, cy: number, rx: number, ry: number, cols: [string, string], seed: number) => {
    const r = mulberry(seed);
    for (let y = cy - ry; y < cy + ry; y++) {
      for (let x = cx - rx; x < cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (r() - 0.5) * 0.5;
        if (d < 1 && dither(x, y, (1 - d) * 0.8)) box(g, x, y, 1, 1, cols[1 - d > 0.6 ? 1 : 0]);
      }
    }
  };
  const props: Prop[] = [
    ...[
      [22, 16],
      [60, 92],
      [158, 22],
      [200, 60],
      [236, 10],
      [296, 78],
      [330, 20],
      [352, 96],
      [420, 14],
      [484, 44],
      [468, 118],
      [36, 134],
      [176, 132],
      [316, 140],
      [498, 150],
      [8, 60],
    ].map(([x, y], i): Prop => ({ sprite: sparkle((["blue", "lilac", "yellow", "pink"] as const)[i % 4], i % 3 ? 7 : 9), x, y, inner: "sc-twinkle", delay: -i * 0.29, layer: 0 })),
    { sprite: S.satellite(), x: 0, y: 34, cls: "sc-drift", inner: "sc-bob", dur: 60, delay: -33, layer: 2 },
    { sprite: S.ufo(), x: 176, y: 6, cls: "sc-patrol", inner: "sc-bob", dur: 22, layer: 3 },
    { x: 440, y: 8, w: 26, h: 1, cls: "sc-shoot", color: "#ffffff", layer: 0 },
    { x: 120, y: 2, w: 20, h: 1, cls: "sc-shoot", color: "#c4f3ff", delay: -5.5, layer: 0 },
    // Beacons on the rocks and the relay mast.
    { x: 43, y: 132, w: 2, h: 2, cls: "sc-blink", color: "#ff4fa8", layer: 3 },
    { x: 463, y: 120, w: 2, h: 2, cls: "sc-blink", color: "#4fd6ff", delay: -0.5, layer: 3 },
    { x: 395, y: GROUND - 26, w: 2, h: 2, cls: "sc-blink", color: "#ff4fa8", delay: -0.7, layer: 4 },
    // Asteroids tumbling past, and an astronaut out for a walk.
    { sprite: S.asteroid(7, 0), x: 0, y: 16, cls: "sc-drift-back", inner: "sc-tumble", dur: 44, delay: -10, layer: 3 },
    { sprite: S.asteroid(5, 1), x: 0, y: 40, cls: "sc-drift-back", inner: "sc-tumble", dur: 31, delay: -22, layer: 3 },
    { sprite: S.astronaut(), x: 0, y: 22, cls: "sc-drift", inner: "sc-float", dur: 72, delay: -50, layer: 3 },
    // A rover crossing the surface.
    { sprite: S.rover(), x: 0, y: GROUND - 9, cls: "sc-drift", inner: "sc-rumble", dur: 52, delay: -16, layer: 4 },
    // The rocket sits on its pad, then goes.
    { sprite: S.flame(0), x: 118, y: GROUND - 1, cls: "sc-launch sc-launch-flame", inner: "sc-flick-a sc-down", layer: 4 },
    { sprite: S.flame(1), x: 118, y: GROUND - 1, cls: "sc-launch sc-launch-flame", inner: "sc-flick-b sc-down", layer: 4 },
    { sprite: S.rocket(), x: 114, y: GROUND - 35, cls: "sc-launch", layer: 4 },
  ];
  return {
    depths: [0, 0.1, 0.25, 0.6, 1.1],
    scroll: [0, 260, 170, 0, 0],
    // The big planet, the moon and everything flying past them hang.
    seam: 80,
    hang: [2],
    props,
    layers: [
      (g) => {
        sky(g, [[0, "#090920"], [60, "#0f0e34"], [118, "#18134e"], [166, "#27186a"], [204, "#3c1f86"], [226, "#58289c"]], 12);
        nebula(g, 150, 96, 96, 44, ["#2a1a6a", "#5a2a92"], 3);
        nebula(g, 404, 132, 84, 38, ["#16306e", "#2a5aa0"], 5);
        nebula(g, 300, 40, 60, 24, ["#3a1a66", "#7a2a8a"], 9);
        stars(g, 11, 110, 230, ["#8f8cf0", "#6a66c8", "#c4f3ff"], 0);
        // A small spiral galaxy.
        for (let t = 0; t < 15; t += 0.12) {
          for (const arm of [0, Math.PI]) {
            const rad = 0.8 + t * 1.25;
            box(g, 372 + Math.cos(t + arm) * rad * 1.5, 42 + sin(t + arm) * rad * 0.62, 1, 1, t < 3 ? "#ffffff" : t < 9 ? "#d0bcff" : "#8f6cf0");
          }
        }
        box(g, 370, 41, 4, 3, "#fff6e0");
      },
      // The starfield, drifting.
      (g) => stars(g, 12, 220, 230, ["#ffffff", "#ffffff", "#c4f3ff", "#ffd0f0", "#fff0a8"], 16),
      (g) => {
        const big = S.planet(24, ["#ffc98a", "#f9a86a", "#f08a5d", "#e87a5a", "#d96a4a", "#c9584a"], "#7a2f4a", ["#ffe1a8", "#f0b87a"]);
        stamp(g, big, 126 - big.w / 2, 4);
        stamp(g, S.moon(12), 412, 4);
        stamp(g, S.planet(6, ["#8ff0e0", "#4fc8c0", "#2a9aa0"], "#1a5a70"), 62, 20);
        stamp(g, S.planet(9, ["#b9a6ff", "#9a7cf0", "#7a58d8"], "#3f2a8a"), 316, 108);
      },
      (g) => {
        ridge(g, far, "#2c2870", { hi: "#4a44a0", hiH: 1 });
        // Floating rocks with a mast each.
        stamp(g, S.rock(44, "#5a52a6", "#8f88dc", "#3f3888", "#1f1c52"), 22, 140);
        box(g, 43, 133, 2, 10, "#b9b6ff");
        stamp(g, S.rock(38, "#5a52a6", "#8f88dc", "#3f3888", "#1f1c52"), 444, 128);
        box(g, 463, 121, 2, 10, "#b9b6ff");
        stamp(g, S.block("steel"), 452, 119);
      },
      (g) => {
        ridge(g, surface, "#5a52a6", { hi: "#8f88dc", hiH: 2 });
        for (let y = GROUND + 9; y < H; y++) for (let x = 0; x < W; x++) if (y > GROUND + 16 || dither(x, y, (y - GROUND - 9) / 8)) box(g, x, y, 1, 1, "#463f8c");
        for (const [cx, cy, rx] of [[62, 248, 13], [128, 262, 9], [176, 244, 6], [342, 246, 8], [394, 260, 14], [452, 250, 7], [300, 264, 6], [226, 262, 10]]) {
          const ry = max(2, round(rx * 0.36));
          for (let y = cy - ry; y <= cy + ry; y++) {
            const half = round(rx * sqrt(max(0, 1 - ((y - cy) / ry) ** 2)));
            box(g, cx - half, y, half * 2, 1, y < cy ? "#352f72" : "#3f3888");
          }
          box(g, cx - rx + 2, cy + ry, rx * 2 - 4, 1, "#8f88dc");
        }
        // A rocket parked on the left, a relay mast on the right.
        const stone = ["#6a62b8", "#a8a0ec", "#463f8c", "#1f1c52"] as const;
        // The launch pad.
        box(g, 110, GROUND, 26, 2, "#1f1c52");
        box(g, 112, GROUND, 22, 1, "#ffd23f");
        stamp(g, S.rock(16, ...stone), 154, GROUND - 4);
        box(g, 394, GROUND - 24, 4, 24, "#1f1c52");
        box(g, 395, GROUND - 24, 2, 24, "#8f95bd");
        box(g, 388, GROUND - 18, 16, 2, "#8f95bd");
        box(g, 390, GROUND - 10, 12, 2, "#8f95bd");
        // A moon base beside it, and a flag planted by the pad.
        stamp(g, S.dome(), 350, GROUND - 12);
        stamp(g, S.moonFlag(), 142, GROUND - 12);
        stamp(g, S.rock(16, ...stone), 372, GROUND - 3);
        stamp(g, S.rock(28, ...stone), 28, GROUND - 8);
        stamp(g, S.rock(20, ...stone), 468, GROUND - 5);
      },
    ],
  };
}

// ── World 4: Neon Circuit ──────────────────────────────────────────────
function racing(): Scene {
  const HORIZON = 200;
  const half = (d: number) => 6 + d * 2.45;
  const peaks: [number, number][] = [[36, 38], [112, 24], [186, 30], [330, 28], [404, 40], [476, 26]];
  const road =
    (phase: number): Paint =>
    (g) => {
      box(g, 0, HORIZON + 1, W, H - HORIZON - 1, "#131126");
      for (let y = HORIZON + 1; y < H; y++) {
        const d = y - HORIZON;
        const band = floor(44 / d + phase * 0.5) % 2;
        const cross = floor(70 / d + phase * 0.5);
        const h = half(d);
        const lip = max(1, round(d * 0.1));
        // Grid on the open ground either side.
        if (d < 7) box(g, 0, y, W, 1, d < 3 ? "#2a2070" : "#1d1850");
        else if (cross !== floor(70 / (d + 1) + phase * 0.5)) box(g, 0, y, W, 1, "#33248a");
        for (let n = -14; n <= 14; n++) {
          const x = CX + n * 0.62 * (d + 6) * 1.6;
          if (abs(x - CX) > h + lip + 2) box(g, x, y, 1, 1, "#33248a");
        }
        box(g, CX - h, y, h * 2, 1, band ? "#2a2842" : "#25233b");
        box(g, CX - h - lip, y, lip, 1, band ? "#ff3f5a" : "#f4f1ff");
        box(g, CX + h, y, lip, 1, band ? "#ff3f5a" : "#f4f1ff");
        if (!band) {
          const lw = max(1, round(d * 0.035));
          box(g, CX - h * 0.36 - lw / 2, y, lw, 1, "#3fd0ff");
          box(g, CX + h * 0.36 - lw / 2, y, lw, 1, "#3fd0ff");
        }
      }
      box(g, 0, HORIZON, W, 1, "#3fd0ff");
      box(g, 0, HORIZON + 1, W, 1, "#1f6aa0");
    };
  // Nothing stands still beside a moving road. Everything at the trackside rushes out from the
  // vanishing point and past you: lamp posts, palms, a hoarding and a marshal's flag on the
  // verge, and cones and tyre stacks right on the edge of the tarmac.
  const lamp = (c: string) => S.compose(`lamp-${c}`, 9, 20, [[S.lampPost(20), 0, 0], [{ w: 6, h: 3, runs: [{ x: 0, y: 0, w: 6, c }, { x: 0, y: 1, w: 6, c }, { x: 0, y: 2, w: 6, c: "#ffffff" }] }, 2, 1]]);
  const LOOP = 3.6;
  const passing = (sprite: SpriteData, side: number, slot: number, slots: number, out = 1, offset = 0): Prop => ({
    sprite,
    x: CX - sprite.w / 2,
    y: HORIZON - sprite.h,
    cls: "sc-zoom",
    dur: LOOP,
    delay: -((slot / slots) * LOOP) - offset,
    vars: { "--side": side, "--out": out },
    layer: 3,
  });
  const roadside: Prop[] = [
    // The verge, left then right: four things each, evenly spaced in time.
    ...[lamp("#3fd0ff"), S.palm(), S.billboard(), S.palm()].map((sp, i) => passing(sp, -1, i, 4)),
    ...[lamp("#ff7a2f"), S.palm(), S.flag(), S.palm()].map((sp, i) => passing(sp, 1, i, 4, 1, LOOP / 8)),
    // The edge of the tarmac: cones on the left, a tyre stack and a cone on the right.
    ...[S.cone(), S.cone(), S.cone()].map((sp, i) => passing(sp, -1, i, 3, 0.9, LOOP / 6)),
    ...[S.tires(), S.cone()].map((sp, i) => passing(sp, 1, i, 2, 0.9, LOOP / 3)),
  ];
  const props: Prop[] = [
    ...[
      [70, 30, 80, -11],
      [50, 52, 100, -63],
      [86, 84, 90, -37],
      [44, 104, 112, -85],
      [60, 16, 124, -108],
    ].map(([w, y, dur, delay], i): Prop => ({ x: 0, y, w, h: 3, cls: "sc-drift", inner: "sc-streak", color: ["#3a1a66", "#4a1f6e", "#7a2068", "#8a2866", "#231654"][i], dur, delay, layer: 0 })),
    // A blimp over the city.
    { sprite: S.blimp(), x: 0, y: 12, cls: "sc-drift-back", inner: "sc-float", dur: 70, delay: -20, layer: 1 },
    ...roadside,
    // One car in each lane, either side of the machine, both pointed at the horizon,
    // and a third far ahead. They drift in their lanes.
    { sprite: S.car("#ffd23f", "#fff0a8", "#d9952a"), x: CX - 6, y: HORIZON + 9, scale: 0.42, cls: "sc-weave", inner: "sc-rumble", layer: 3 },
    { sprite: S.car("#ee2f4a", "#ff8a96", "#a81a30", 1), x: 136, y: 251, cls: "sc-sway", inner: "sc-rumble", layer: 3 },
    { sprite: S.car("#3f7af0", "#9fc0ff", "#2550b8", -1), x: 343, y: 249, cls: "sc-sway", inner: "sc-rumble", delay: -2.6, layer: 3 },
    { x: 0, y: HORIZON, w: W, h: 1, cls: "sc-pulse", color: "#b6f0ff", layer: 2 },
  ];
  return {
    depths: [0, 0.25, 0.55, 0.9],
    // Only the blimp and the high streaks of cloud hang; the rest is road and skyline.
    seam: 80,
    props,
    // The road is a four-frame flip-book: the stripes run toward you.
    frames: { layer: 2, paints: [road(0), road(1), road(2), road(3)], ms: 360 },
    layers: [
      (g) => {
        sky(g, [[0, "#0a0a1e"], [40, "#12123a"], [78, "#231654"], [110, "#451a66"], [136, "#7a2068"], [158, "#b82c56"], [176, "#e8483a"], [190, "#ff7a2f"]], 8, HORIZON + 1);
        stars(g, 21, 90, 100, ["#ffffff", "#c4f3ff", "#ffd0f0"], 6);
        sun(g, CX, 190, 104, ["#fff06a", "#ffe45a", "#ffc93a", "#ffa63a", "#ff7a3a", "#ff5a4a", "#f03a5a", "#e83a6a"], HORIZON, -24);
      },
      (g) => {
        // Mountains, lit from the left.
        for (let x = 0; x < W; x++) {
          let top = 0;
          let lit = false;
          for (const [cx, h] of peaks) {
            const t = h - abs(x - cx) / 1.5;
            if (t > top) {
              top = t;
              lit = x < cx;
            }
          }
          if (top > 0) box(g, x, HORIZON - round(top), 1, round(top), lit ? "#2f1a62" : "#1f1246");
        }
        // The city, either side of the road.
        const r = mulberry(31);
        for (const [from, to] of [[0, 188], [324, W]]) {
          let x = from;
          while (x < to) {
            const w = 7 + floor(r() * 11);
            const near = 1 - min(abs(x - 188), abs(x - 324)) / 200;
            const h = 8 + floor(r() * 26 * (0.5 + near * 0.7));
            box(g, x, HORIZON - h, w, h, "#0d0b22");
            for (let wy = HORIZON - h + 2; wy < HORIZON - 2; wy += 3) {
              for (let wx = x + 1; wx < x + w - 1; wx += 2) if (r() < 0.36) box(g, wx, wy, 1, 1, ["#3fd0ff", "#ffd23f", "#ff4fa8", "#ffd23f"][floor(r() * 4)]);
            }
            if (r() < 0.3) {
              box(g, x + floor(w / 2), HORIZON - h - 5, 1, 5, "#0d0b22");
              box(g, x + floor(w / 2), HORIZON - h - 6, 1, 1, "#ff3f5a");
            }
            x += w + (r() < 0.25 ? 2 : 0);
          }
        }
      },
      road(0),
      // Nothing is painted on the ground here; it all rushes past (see `roadside`).
      () => {},
    ],
  };
}

// ── World 5: Dungeon Quest ─────────────────────────────────────────────
function dungeon(): Scene {
  const torches: [number, number][] = [[104, 24], [400, 24], [28, 150], [476, 142]];
  const props: Prop[] = [
    ...torches.flatMap(([x, y], i): Prop[] => [
      { sprite: S.flame(0), x: x - 1, y: y - 11, inner: "sc-flick-a", delay: -i * 0.11, layer: 1 },
      { sprite: S.flame(1), x: x - 1, y: y - 11, inner: "sc-flick-b", delay: -i * 0.11, layer: 1 },
      { x: x + 2, y: y - 14, w: 1, h: 1, cls: "sc-rise", color: "#ffb52e", delay: -i * 0.7, dur: 2.6, layer: 1 },
      { x: x + 5, y: y - 12, w: 1, h: 1, cls: "sc-rise", color: "#fff0a8", delay: -1.2 - i * 0.5, dur: 3.1, layer: 1 },
    ]),
    // Motes of magic rising off the crystals.
    ...[
      [406, GROUND - 20, "#a8f0d0", 4.8, -0.8],
      [414, GROUND - 14, "#35c28c", 5.4, -2.4],
      [362, GROUND - 20, "#ffe9a0", 4.4, -3.4],
      [354, 12, "#d0bcff", 5, -1],
      [378, 18, "#a8f0d0", 4.5, -2.8],
      [136, 14, "#ffe9a0", 4.9, -2],
    ].map(([x, y, c, dur, delay]): Prop => ({ x: x as number, y: y as number, w: 1, h: 1, cls: "sc-rise", color: c as string, dur: dur as number, delay: delay as number, layer: 3 })),
    ...[
      [404, GROUND - 18],
      [352, 10],
    ].map(([x, y], i): Prop => ({ sprite: sparkle((["mint", "lilac"] as const)[i], 7), x, y, inner: "sc-twinkle", delay: -i * 0.8, layer: 3 })),
    { sprite: S.bat(0), x: 0, y: 14, cls: "sc-drift", inner: "sc-flick-a", dur: 22, delay: -5, layer: 2 },
    { sprite: S.bat(1), x: 0, y: 14, cls: "sc-drift", inner: "sc-flick-b", dur: 22, delay: -5, layer: 2 },
    // Water dripping from the roof, in the gaps where you can see it land.
    ...[
      [174, 8, 226, 0],
      [334, 6, 228, -1.3],
      [70, 10, 224, -2.2],
      [440, 12, 222, -0.6],
    ].map(([x, y, fall, delay]): Prop => ({ x, y, w: 1, h: 3, cls: "sc-drip", color: "#8fe6ff", delay, dur: 3.6, vars: { "--fall": fall }, layer: 2 })),
    // A spider on its thread.
    { x: 322, y: 0, w: 1, h: 26, cls: "sc-thread", color: "#8a8598", vars: { "--fall": 26 }, layer: 2 },
    { sprite: S.spider(), x: 319, y: -2, cls: "sc-spider", vars: { "--fall": 26 }, layer: 2 },
    // Something watching from the dark.
    { x: 214, y: 9, w: 2, h: 2, cls: "sc-eyes", color: "#ffd23f", layer: 1 },
    { x: 219, y: 9, w: 2, h: 2, cls: "sc-eyes", color: "#ffd23f", layer: 1 },
    { x: 52, y: 196, w: 2, h: 2, cls: "sc-eyes", color: "#ff4f6a", delay: -2.4, layer: 0 },
    { x: 58, y: 196, w: 2, h: 2, cls: "sc-eyes", color: "#ff4f6a", delay: -2.4, layer: 0 },
    // A will-o'-the-wisp drifting through, and a rat on the flagstones.
    { sprite: S.flame(0, "#ffffff", "#8fe6ff", "#4fa0ff"), x: 0, y: 44, cls: "sc-drift", inner: "sc-flick-a", dur: 64, delay: -20, layer: 2 },
    { sprite: S.flame(1, "#ffffff", "#8fe6ff", "#4fa0ff"), x: 0, y: 44, cls: "sc-drift", inner: "sc-flick-b", dur: 64, delay: -20, layer: 2 },
    { sprite: S.rat(), x: 0, y: GROUND - 5, cls: "sc-drift", inner: "sc-rumble", dur: 17, delay: -4, layer: 3 },
  ];
  return {
    depths: [0, 0.3, 0.65, 1.1],
    // The ceiling hangs: pillar heads, stalactites, chains, banners, cobwebs, the two high
    // torches and the treasure ledges. The wall behind them stays where it is.
    seam: 96,
    hang: [1, 2],
    props,
    layers: [
      (g) => {
        // The back wall: big bricks, three slightly different stones.
        box(g, 0, 0, W, H, "#151220");
        const r = mulberry(17);
        for (let row = 0; row * 16 < GROUND; row++) {
          for (let x = row % 2 ? -16 : 0; x < W; x += 32) {
            const y = row * 16;
            box(g, x + 1, y + 1, 31, 15, ["#241f35", "#272239", "#211c31", "#2a2540"][floor(r() * 4)]);
            box(g, x + 1, y + 1, 31, 1, "#302a47");
            if (r() < 0.16) box(g, x + 6 + floor(r() * 16), y + 5, 3 + floor(r() * 5), 1, "#151220");
            if (r() < 0.1) box(g, x + 4 + floor(r() * 20), y + 13, 4, 2, "#2f6a52");
          }
        }
        // Two doorways into rooms you cannot quite see.
        for (const cx of [56, 456]) {
          for (let y = 150; y < GROUND; y++) {
            const half = y > 176 ? 24 : round(sqrt(max(0, 24 * 24 - (176 - y) ** 2)));
            box(g, cx - half - 3, y, half * 2 + 6, 1, "#3a3450");
            box(g, cx - half, y, half * 2, 1, "#0b0911");
          }
          glow(g, cx, GROUND - 4, 26, cx < CX ? "#2a4a5a" : "#4a3a1a", 0.8);
          for (const [dx, dy] of [[-8, 8], [5, 5], [11, 10], [-2, 12]]) box(g, cx + dx, GROUND - dy, 1, 1, cx < CX ? "#8fe6ff" : "#ffc93a");
        }
        // Dark at the ceiling.
        for (let y = 0; y < 34; y++) for (let x = 0; x < W; x++) if (dither(x, y, (1 - y / 34) * 0.7)) box(g, x, y, 1, 1, "#0e0c16");
      },
      (g) => {
        // Torchlight on the wall. It is painted on the torches' own layer, so it stays with them.
        for (const [x, y] of torches) {
          glow(g, x + 4, y - 4, 40, "#4a2f3a", 0.9);
          glow(g, x + 4, y - 4, 22, "#7a4a3a", 0.9);
        }
        // Pillars framing the machine, and stalactites overhead.
        for (const x of [164, 328]) stamp(g, S.pillar(GROUND, 14), x, 0);
        for (const x of [-10, 502]) stamp(g, S.pillar(GROUND, 14), x, 0);
        const r = mulberry(5);
        for (let x = 4; x < W; x += 9 + floor(r() * 16)) {
          const len = 6 + floor(r() * 22);
          const half = 2 + floor(r() * 4);
          for (let y = 0; y < len; y++) {
            const wdt = max(1, round(half * 2 * (1 - y / len)));
            box(g, x - wdt / 2, y, wdt, 1, "#0e0c16");
            box(g, x - wdt / 2, y, 1, 1, "#262036");
          }
        }
        for (const [x, len] of [[178, 30], [332, 26], [228, 18], [286, 22]]) for (let y = 0; y < len; y += 3) {
          box(g, x, y, 2, 2, "#5a5568");
          box(g, x, y + 2, 2, 1, "#2a2639");
        }
        for (const [x, y] of torches) stamp(g, S.torchBracket(), x, y);
        // Banners either side of the machine, and cobwebs where the pillars meet the roof.
        stamp(g, S.banner(), 190, 8);
        stamp(g, S.banner("#2f6a9a", "#1f4a72"), 312, 8);
        stamp(g, S.cobweb(true), 150, 6);
        stamp(g, S.cobweb(), 348, 6);
      },
      (g) => {
        // Ledges of stone blocks with treasure on them.
        const ledge = (x: number, y: number, n: number) => {
          for (let i = 0; i < n; i++) stamp(g, S.block("stone"), x + i * 12, y);
          box(g, x + 2, y + 12, n * 12 - 4, 2, "#14122e");
        };
        ledge(122, 28, 4);
        stamp(g, S.chest(), 124, 11);
        stamp(g, S.goldPile(14), 152, 22);
        ledge(342, 28, 4);
        stamp(g, S.crystal("violet", 20), 346, 8);
        stamp(g, S.crystal("emerald", 12), 372, 16);
        ledge(0, 170, 4);
        stamp(g, S.crystal("cyan", 16), 6, 154);
        ledge(464, 162, 4);
        stamp(g, S.goldPile(16), 478, 156);
      },
      (g) => {
        box(g, 0, GROUND, W, H - GROUND, "#3f3a54");
        for (let row = 0; GROUND + 2 + row * 12 < H; row++) {
          const y = GROUND + 2 + row * 12;
          box(g, 0, y + 11, W, 1, "#2a2639");
          for (let x = row % 2 ? 14 : 0; x < W; x += 28) {
            box(g, x, y, 1, 11, "#2a2639");
            box(g, x + 1, y, 26, 1, "#4f4868");
          }
        }
        box(g, 0, GROUND, W, 2, "#7d7692");
        box(g, 0, GROUND - 1, W, 1, "#14122e");
        for (const [x, w] of [[6, 14], [90, 9], [150, 6], [350, 8], [410, 12], [500, 10]]) {
          box(g, x, GROUND, w, 2, "#4fbf7a");
          box(g, x + 1, GROUND + 2, w - 3, 1, "#2f8f5b");
        }
        // Under the menus, either side of the machine.
        stamp(g, S.barrel(), 98, GROUND - 13);
        stamp(g, S.crate(), 112, GROUND - 12);
        stamp(g, S.barrel(), 126, GROUND - 13);
        stamp(g, S.bones(), 144, GROUND - 7);
        stamp(g, S.chest(), 350, GROUND - 17);
        stamp(g, S.goldPile(20), 376, GROUND - 7);
        stamp(g, S.crystal("emerald", 20), 400, GROUND - 19);
        // And out in the corners, for wide screens.
        stamp(g, S.crystal("violet", 16), 8, GROUND - 15);
        stamp(g, S.crystal("cyan", 18), 490, GROUND - 17);
      },
    ],
  };
}

const BUILD: Record<WorldId, () => Scene> = { dream, mushroom: mushroomHills, cosmic, racing, dungeon };
const built = new Map<WorldId, Scene>();
function sceneOf(id: WorldId) {
  let s = built.get(id);
  if (!s) {
    s = BUILD[id]();
    built.set(id, s);
  }
  return s;
}

// ── Rendering ──────────────────────────────────────────────────────────
const u = (n: number) => `calc(var(--u) * ${n})`;

/** A prop above the seam hangs from the top of the window: `--cut` rows are hidden up there. */
const hangs = (p: Prop, seam: number) => p.y < seam;

function PropView({ p, dx = 0, seam }: { p: Prop; dx?: number; seam: number }) {
  // Where a drifting prop rests when motion is off: wherever its head start had carried it.
  const drifts = (p.cls === "sc-drift" || p.cls === "sc-drift-back") && p.dur;
  const along = drifts ? (-(p.delay ?? 0) % p.dur!) / p.dur! : 0;
  const rest = drifts ? Math.round(-80 + 610 * (p.cls === "sc-drift" ? along : 1 - along)) : undefined;
  const top = hangs(p, seam) ? `calc(var(--u) * (${p.y} + var(--cut, 0)))` : u(p.y);
  const style = { left: u(p.x + dx), top, "--t": p.dur ? `${p.dur}s` : undefined, "--rest": rest, animationDelay: p.delay ? `${p.delay}s` : undefined, ...p.vars } as React.CSSProperties;
  const k = p.scale ?? 1;
  const size = { width: u((p.sprite?.w ?? p.w ?? 1) * k), height: u((p.sprite?.h ?? p.h ?? 1) * k) };
  return (
    <div className={`sc-prop ${p.cls ?? ""}`} style={style}>
      {p.sprite ? (
        <Art sprite={p.sprite} className={p.inner} style={{ ...size, animationDelay: p.cls ? undefined : style.animationDelay }} />
      ) : (
        <span className={p.inner} style={{ ...size, display: "block", background: p.color }} />
      )}
    </div>
  );
}

interface LayerProps {
  /** One painter, or several for a flip-book. */
  paints: Paint[];
  /** How long the flip-book takes to play through. */
  ms?: number;
  depth: number;
  /** Seconds to scroll once across the stage; 0 for a layer that stays put. */
  scroll: number;
  props: Prop[];
  /** The scene's seam, for its props. */
  seam: number;
  /** Paint this layer in two parts, split at the seam, so the top part can hang. */
  split: boolean;
  /** Rows hidden above the window right now. */
  cut: number;
}

function Layer({ paints, ms = 400, depth, scroll, props, seam, split, cut }: LayerProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const n = paints.length;
  // A scrolling layer is painted twice, side by side, and slides one stage-width to the left.
  const copies = scroll ? 2 : 1;
  useEffect(() => {
    // One canvas holds the rows from the seam down; a split layer has a second for the rows above.
    const parts: [HTMLCanvasElement | null, number, number][] = split ? [[ref.current, seam, H], [top.current, 0, seam]] : [[ref.current, 0, H]];
    for (const [canvas, from, to] of parts) {
      const g = canvas?.getContext("2d");
      if (!g) continue;
      g.clearRect(0, 0, W * copies, H * n);
      paints.forEach((paint, frame) => {
        for (let c = 0; c < copies; c++) {
          g.save();
          g.translate(c * W, frame * H);
          g.beginPath();
          g.rect(0, from, W, to - from);
          g.clip();
          paint(g);
          g.restore();
        }
      });
    }
  }, [paints, copies, n, seam, split]);
  // What stands on the ground is hidden if a short window would slice it; what hangs never is.
  const shown = props.filter((p) => hangs(p, seam) || p.y >= cut + 2);
  const riding = shown.filter((p) => !FREE.some((c) => p.cls?.startsWith(c)));
  const free = shown.filter((p) => FREE.some((c) => p.cls?.startsWith(c)));
  const sheet = n > 1 ? ({ height: `${n * 100}%`, animationDuration: `${ms}ms`, animationTimingFunction: `steps(${n})` } as React.CSSProperties) : undefined;
  return (
    <div className="sc-layer" style={{ "--depth": depth } as React.CSSProperties}>
      <div className={scroll ? "sc-scroll" : "sc-still"} style={scroll ? ({ "--t": `${scroll}s` } as React.CSSProperties) : undefined}>
        <canvas ref={ref} width={W * copies} height={H * n} className={n > 1 ? "sc-canvas sc-sheet" : "sc-canvas"} style={{ width: `${copies * 100}%`, ...sheet }} />
        {split && <canvas ref={top} width={W * copies} height={H} className="sc-canvas sc-hang" style={{ width: `${copies * 100}%` }} />}
        {riding.map((p, i) => (
          <PropView key={i} p={p} seam={seam} />
        ))}
        {scroll > 0 && riding.map((p, i) => <PropView key={`b${i}`} p={p} dx={W} seam={seam} />)}
      </div>
      {free.map((p, i) => (
        <PropView key={i} p={p} seam={seam} />
      ))}
    </div>
  );
}

export const WorldScene = memo(function WorldScene({ world, cut = 0 }: { world: WorldId; cut?: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const scene = sceneOf(world);
  // Worked out once per world, so a layer only repaints when the world changes.
  const layers = useMemo(
    () =>
      scene.layers.map((paint, i) => ({
        paints: scene.frames?.layer === i ? scene.frames.paints : [paint],
        props: scene.props.filter((p) => p.layer === i),
      })),
    [scene],
  );

  // Layers slide a little against the pointer, the far ones least.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      stage.current?.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div className="sc-world" aria-hidden="true">
      <div ref={stage} className="sc-stage" style={{ "--cut": cut } as React.CSSProperties}>
        {layers.map((layer, i) => (
          <Layer key={`${world}-${i}`} paints={layer.paints} ms={scene.frames?.ms} depth={scene.depths[i]} scroll={scene.scroll?.[i] ?? 0} props={layer.props} seam={scene.seam} split={!!scene.hang?.includes(i) && layer.paints.length === 1} cut={cut} />
        ))}
      </div>
    </div>
  );
});

/** The little picture of a world on its level-select card. */
export function WorldThumb({ world, px = 2 }: { world: WorldId; px?: number }) {
  return <Art sprite={S.thumb(world)} px={px} className="size-auto" />;
}

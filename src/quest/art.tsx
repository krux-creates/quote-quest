import { memo } from "react";

// Quote Quest art kit. Every sprite here is built from shape functions on a
// small pixel grid, then outlined in one ink colour, so the whole set shares
// a line weight, a light direction (top-left) and a palette.

export const K = "#34305e"; // ink: every outline in the set

export const C = {
  white: "#ffffff",
  cream: "#fffaf0",
  fur: "#ffffff",
  furLo: "#e9e5f6",
  ear: "#f9c4d8",
  blush: "#f9aec8",
  nose: "#f48fb1",
  mouth: "#d9477a",
  tongue: "#f9a0bd",
  yellow: "#ffd95a",
  yellowHi: "#fff3ae",
  yellowLo: "#f1b53c",
  pink: "#f4679d",
  pinkHi: "#ffc2d8",
  pinkLo: "#d94a82",
  blue: "#4a78e8",
  blueHi: "#8fb0ff",
  blueLo: "#2f55bd",
  grey: "#aab0c8",
  greyHi: "#d8dcec",
  greyLo: "#7f86a3",
} as const;

export type Test = (x: number, y: number) => boolean;
type Fill = string | ((x: number, y: number) => string | null);

export interface SpriteData {
  w: number;
  h: number;
  runs: { x: number; y: number; w: number; c: string }[];
}

export class Pix {
  private d: (string | null)[];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.d = new Array(w * h).fill(null);
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x];
  }
  set(x: number, y: number, c: string | null) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  /** Fill a shape; pixels on its rim take `line`, so every shape carries its own outline. */
  shape(inside: Test, fill: Fill, line?: string) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        if (!inside(cx, cy)) continue;
        const rim = line && !(inside(cx - 1, cy) && inside(cx + 1, cy) && inside(cx, cy - 1) && inside(cx, cy + 1));
        const c = rim ? line : typeof fill === "function" ? fill(cx, cy) : fill;
        if (c) this.set(x, y, c);
      }
    }
  }
  /** Outline everything drawn so far from the outside (used for lettering). */
  halo(c: string, diagonal = true) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== null) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) {
          for (let dx = -1; dx <= 1 && !near; dx++) {
            if ((dx || dy) && (diagonal || !dx || !dy) && this.get(x + dx, y + dy) !== null) near = true;
          }
        }
        if (near) add.push(y * this.w + x);
      }
    }
    for (const i of add) this.d[i] = c;
  }
  stamp(map: string[], pal: Record<string, string>, ox: number, oy: number) {
    map.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (pal[row[i]]) this.set(ox + i, oy + j, pal[row[i]]);
    });
  }
  done(): SpriteData {
    const runs: SpriteData["runs"] = [];
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const c = this.get(x, y);
        if (!c) {
          x++;
          continue;
        }
        let w = 1;
        while (x + w < this.w && this.get(x + w, y) === c) w++;
        runs.push({ x, y, w, c });
        x += w;
      }
    }
    return { w: this.w, h: this.h, runs };
  }
}

// ── Geometry ───────────────────────────────────────────────────────────
export const ell =
  (cx: number, cy: number, rx: number, ry: number): Test =>
  (x, y) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

export function poly(pts: [number, number][]): Test {
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

export function starShape(cx: number, cy: number, R: number, r: number): Test {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const rad = i % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return poly(pts);
}

export const heartShape =
  (cx: number, cy: number, s: number): Test =>
  (x, y) => {
    const u = (x - cx) / s;
    const v = -(y - cy) / s + 0.2;
    return (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0;
  };

const cache = new Map<string, SpriteData>();
export function once(key: string, build: () => SpriteData) {
  let s = cache.get(key);
  if (!s) {
    s = build();
    cache.set(key, s);
  }
  return s;
}

// ── Mascot: a white tiger cub peeking over the cabinet ─────────────────
export type Mood = "happy" | "wink" | "wow" | "sad" | "blink" | "lookL" | "lookR" | "love" | "stars" | "laugh" | "purr" | "sleep" | "cool";

const HEART_EYE = ["pp.pp", "ppppp", ".ppp.", "..p.."];
const STAR_EYE = ["..o..", ".oyo.", "oywyo", ".oyo.", "..o.."];

/** What the cub's body is doing, apart from its face. */
export interface TigerPose {
  /** `wave` lifts the right paw off the ledge; the two knead poses press one paw down and lift the other. */
  paw?: "rest" | "wave" | "kneadL" | "kneadR";
  /** One ear flicked down. */
  ears?: boolean;
  /** Head tilted: -1 to its right, 1 to its left. */
  tilt?: -1 | 0 | 1;
}

/** The cub, in one of its faces and poses. Passing `true` for the pose is shorthand for a wave. */
export function tiger(mood: Mood = "happy", pose: TigerPose | boolean = false) {
  const { paw = "rest", ears = false, tilt = 0 }: TigerPose = typeof pose === "boolean" ? { paw: pose ? "wave" : "rest" } : pose;
  const wave = paw === "wave";
  return once(`tiger-${mood}-${paw}-${ears}-${tilt}`, () => {
    const p = new Pix(48, 42);
    for (const ex of [10, 38]) {
      // A flicked ear sits lower and further out.
      const [fx, fy] = ears && ex === 38 ? [1.5, 2.5] : [0, 0];
      p.shape(ell(ex + fx, 9 + fy, 7.2, 7.2), C.fur, K);
      p.shape(ell(ex + fx, 9.5 + fy, 3.4, 3.6), C.ear);
    }
    p.shape(
      ell(24, 19.5, 18.5, 15.5),
      (x, y) => (((x - 24) / 18.5) ** 2 + ((y - 19.5) / 15.5) ** 2 > 0.6 && (x - 24) * 0.45 + (y - 19.5) > 7 ? C.furLo : C.fur),
      K,
    );
    // Forehead and cheek stripes.
    p.rect(23, 5, 2, 6, K);
    p.rect(19, 6, 2, 4, K);
    p.rect(27, 6, 2, 4, K);
    p.rect(7, 15, 4, 2, K);
    p.rect(6, 19, 4, 2, K);
    p.rect(37, 15, 4, 2, K);
    p.rect(38, 19, 4, 2, K);
    // Cheeks: pinker when it is pleased with itself.
    const blush = mood === "love" || mood === "purr" || mood === "laugh" ? C.nose : C.blush;
    p.shape(ell(12.5, 25, 3.6, 2.3), blush);
    p.shape(ell(35.5, 25, 3.6, 2.3), blush);

    // Eyes.
    const dot = (x: number) => {
      p.rect(x, 17, 3, 4, K);
      p.set(x, 17, C.white);
    };
    /** Closed and happy: a little arch. */
    const arch = (x: number) => {
      p.rect(x, 18, 1, 2, K);
      p.rect(x + 1, 17, 2, 1, K);
      p.rect(x + 3, 18, 1, 2, K);
    };
    /** Closed and asleep: the same arch, upside down. */
    const cup = (x: number) => {
      p.rect(x, 18, 1, 1, K);
      p.rect(x + 1, 19, 2, 1, K);
      p.rect(x + 3, 18, 1, 1, K);
    };
    const [L, R] = [16, 29];
    if (mood === "wink") {
      dot(L);
      arch(R - 1);
    } else if (mood === "sad") {
      for (const x of [L, R]) {
        p.rect(x, 19, 3, 2, K);
        p.set(x, 18, K);
      }
    } else if (mood === "blink") {
      p.rect(L - 1, 19, 4, 1, K);
      p.rect(R, 19, 4, 1, K);
    } else if (mood === "lookL" || mood === "lookR") {
      const d = mood === "lookL" ? -2 : 2;
      dot(L + d);
      dot(R + d);
    } else if (mood === "love") {
      p.stamp(HEART_EYE, { p: C.pink }, L - 1, 16);
      p.stamp(HEART_EYE, { p: C.pink }, R - 1, 16);
      p.set(L, 17, C.pinkHi);
      p.set(R, 17, C.pinkHi);
    } else if (mood === "stars") {
      p.stamp(STAR_EYE, { o: K, y: C.yellow, w: C.white }, L - 1, 16);
      p.stamp(STAR_EYE, { o: K, y: C.yellow, w: C.white }, R - 1, 16);
    } else if (mood === "laugh") {
      // Squeezed shut: > and <.
      for (let i = 0; i < 3; i++) {
        p.set(L + i, 17 + i, K);
        p.set(L + i, 21 - i, K);
        p.set(R + 2 - i, 17 + i, K);
        p.set(R + 2 - i, 21 - i, K);
      }
    } else if (mood === "purr") {
      arch(L - 1);
      arch(R - 1);
    } else if (mood === "sleep") {
      cup(L - 1);
      cup(R - 1);
    } else if (mood === "cool") {
      // Shades: two lenses, a bridge, and a glint on each.
      p.rect(9, 16, 30, 1, K);
      p.rect(13, 16, 9, 6, K);
      p.rect(26, 16, 9, 6, K);
      p.rect(22, 17, 4, 1, K);
      for (const x of [14, 27]) {
        p.rect(x, 17, 2, 1, C.blueHi);
        p.set(x, 18, C.blueHi);
        p.rect(x + 3, 19, 2, 1, C.blue);
      }
    } else {
      dot(L);
      dot(R);
    }

    // Nose and mouth.
    p.rect(22, 21, 4, 2, C.nose);
    p.rect(23, 23, 2, 1, K);
    if (mood === "sad") {
      p.rect(21, 26, 1, 1, K);
      p.rect(22, 25, 4, 1, K);
      p.rect(26, 26, 1, 1, K);
    } else if (mood === "wow" || mood === "stars") {
      p.shape(ell(24, 27, 2.6, 3), C.mouth, K);
    } else if (mood === "laugh") {
      p.shape((x, y) => y > 23.6 && ell(24, 24, 6, 6.4)(x, y), C.mouth, K);
      p.rect(22, 27, 4, 2, C.tongue);
    } else if (mood === "purr" || mood === "sleep" || mood === "cool") {
      // The cat mouth: a little "w" under the nose.
      p.set(20, 24, K);
      p.rect(21, 25, 2, 1, K);
      p.rect(23, 24, 2, 1, K);
      p.rect(25, 25, 2, 1, K);
      p.set(27, 24, K);
    } else {
      p.shape((x, y) => y > 23.6 && ell(24, 24, 4.6, 5)(x, y), C.mouth, K);
      p.rect(23, 26, 2, 2, C.tongue);
    }

    // Paws hooked over the edge; one lifts to wave.
    const drawPaw = (cx: number, cy: number, rx: number, ry: number) => {
      p.shape(ell(cx, cy, rx, ry), (x, y) => (y > cy + 2 ? C.furLo : C.fur), K);
      p.rect(Math.round(cx) - 3, Math.round(cy), 1, 3, K);
      p.rect(Math.round(cx) + 2, Math.round(cy), 1, 3, K);
    };
    drawPaw(11, paw === "kneadL" ? 33.5 : paw === "kneadR" ? 36.5 : 35.5, 8.2, 5.8);
    if (wave) drawPaw(40, 27.5, 6.6, 6.2);
    else drawPaw(37, paw === "kneadR" ? 33.5 : paw === "kneadL" ? 36.5 : 35.5, 8.2, 5.8);
    const flat = p.done();
    if (!tilt) return flat;
    // A head tilt: every row above the paws slides sideways, most at the top.
    const pad = 3;
    return {
      w: flat.w + pad * 2,
      h: flat.h,
      runs: flat.runs.map((r) => ({ ...r, x: r.x + pad + (r.y < 29 ? Math.round(((29 - r.y) / 29) * pad) * tilt : 0) })),
    };
  });
}

// ── Hearts and stars ───────────────────────────────────────────────────
export function heart(size = 16) {
  return once(`heart-${size}`, () => {
    const p = new Pix(size + 2, size);
    const cx = (size + 2) / 2;
    const s = size / 2.42;
    p.shape(
      heartShape(cx, size * 0.5, s),
      (x, y) => {
        const hi = ((x - (cx - s * 0.52)) / (s * 0.36)) ** 2 + ((y - size * 0.33) / (s * 0.26)) ** 2 <= 1;
        if (hi) return C.pinkHi;
        return x - cx + (y - size * 0.5) > s * 0.62 ? C.pinkLo : C.pink;
      },
      K,
    );
    return p.done();
  });
}

export function star(size = 18, face = true) {
  return once(`star-${size}-${face}`, () => {
    const p = new Pix(size, size);
    const c = size / 2;
    const R = size / 2;
    p.shape(
      starShape(c, c + size * 0.03, R, R * 0.56),
      (x, y) => (x - c + (y - c) > R * 0.5 ? C.yellowLo : x - c + (y - c) < -R * 0.62 ? C.yellowHi : C.yellow),
      K,
    );
    if (face && size >= 16) {
      const e = Math.round(c - size * 0.16) - 1;
      const f = Math.round(c + size * 0.16);
      const y = Math.round(c);
      p.rect(e, y, 1, 2, K);
      p.rect(f, y, 1, 2, K);
      p.set(e - 1, y + 2, C.blush);
      p.set(f + 1, y + 2, C.blush);
      p.set(e + 1, y + 3, K);
      p.rect(e + 2, y + 4, f - e - 3, 1, K);
      p.set(f - 1, y + 3, K);
    }
    return p.done();
  });
}

// ── Decor ──────────────────────────────────────────────────────────────
export const SPARKLES = { yellow: "#ffd15a", pink: "#f77fb2", blue: "#6f9cf5", lilac: "#b493f0", mint: "#7fd7b0" } as const;

export function sparkle(color: keyof typeof SPARKLES, size: 7 | 9 = 7) {
  return once(`sparkle-${color}-${size}`, () => {
    const p = new Pix(size, size);
    const m = (size - 1) / 2;
    for (let i = 0; i < size; i++) {
      p.set(m, i, SPARKLES[color]);
      p.set(i, m, SPARKLES[color]);
    }
    p.rect(m - 1, m - 1, 3, 3, SPARKLES[color]);
    p.set(m, m, C.white);
    return p.done();
  });
}

export const CLOUD_TONES = {
  pink: ["#fde6ef", "#f9cfe0", "#f08fb8"],
  mint: ["#f3fcf6", "#d4f1e0", "#6cc299"],
  lilac: ["#f4effd", "#dfd3f8", "#9c82d8"],
  peach: ["#fff6ea", "#ffe1bd", "#f0a04e"],
  sky: ["#f2faff", "#d2ebfb", "#5aa9e6"],
  rose: ["#fff0f3", "#fbcdd6", "#e86a86"],
  teal: ["#eef8fa", "#cfe6ec", "#4f93ab"],
} as const;
export type CloudTone = keyof typeof CLOUD_TONES;

export function cloud(w = 30, tone: CloudTone = "pink") {
  return once(`cloud-${w}-${tone}`, () => {
    const [fill, shade, line] = CLOUD_TONES[tone];
    const h = Math.round(w * 0.5);
    const p = new Pix(w, h);
    const puff: Test = (x, y) =>
      y < h - 0.5 &&
      (ell(w * 0.3, h * 0.66, w * 0.24, h * 0.36)(x, y) ||
        ell(w * 0.55, h * 0.48, w * 0.26, h * 0.46)(x, y) ||
        ell(w * 0.78, h * 0.7, w * 0.2, h * 0.3)(x, y) ||
        (y > h * 0.62 && x > w * 0.12 && x < w * 0.92));
    p.shape(puff, (x, y) => (y > h * 0.74 ? shade : fill), line);
    return p.done();
  });
}

// ── Lettering: fat pixel letters with an outline, a lit top and a shadow ─
const GLYPHS: Record<string, string[]> = {
  Q: ["..#####..", ".#######.", "###...###", "###...###", "###...###", "###.#.###", "###..####", ".########", "..####.##"],
  U: ["###...###", "###...###", "###...###", "###...###", "###...###", "###...###", "###...###", ".#######.", "..#####.."],
  O: ["..#####..", ".#######.", "###...###", "###...###", "###...###", "###...###", "###...###", ".#######.", "..#####.."],
  T: ["#########", "#########", "#########", "...###...", "...###...", "...###...", "...###...", "...###...", "...###..."],
  E: ["#########", "#########", "###......", "#######..", "#######..", "###......", "###......", "#########", "#########"],
  S: [".########", "#########", "###......", "########.", ".########", "......###", "......###", "#########", "########."],
};

export const INKS = {
  pink: ["#f56fa3", "#ffb5d0", "#d9507f"],
  blue: ["#5f8cee", "#a9c4ff", "#4069c8"],
  yellow: ["#ffcf4a", "#ffec9e", "#e8a82e"],
  lilac: ["#a985ec", "#d3c0fa", "#8565cf"],
  mint: ["#69d3a2", "#b9f0d4", "#46b384"],
  red: ["#ee4b3b", "#ff9a8a", "#b82c20"],
  green: ["#4fbf5a", "#a9ec9c", "#2e8f3c"],
  gold: ["#ffc93a", "#fff0a8", "#d9952a"],
  cream: ["#fff3d0", "#ffffff", "#e0c88c"],
  cyan: ["#4fd6ff", "#c4f3ff", "#2a9fd0"],
  violet: ["#9a6bff", "#d0bcff", "#6a3fd6"],
  magenta: ["#ff4fa8", "#ffb0d8", "#c82a7c"],
  orange: ["#ff7a2f", "#ffc08a", "#d0521a"],
  emerald: ["#35c28c", "#a8f0d0", "#1f8a60"],
  steel: ["#c9cce0", "#ffffff", "#8a8fa8"],
} as const;
export type Ink = keyof typeof INKS;

export function letter(ch: string, ink: Ink) {
  return once(`letter-${ch}-${ink}`, () => {
    const g = GLYPHS[ch];
    const [main, hi, lo] = INKS[ink];
    const p = new Pix(11, 13);
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== "#") continue;
        const top = j === 0 || (j === 1 && g[0][i] !== "#");
        const bottom = j === g.length - 1 || (j === g.length - 2 && g[g.length - 1][i] !== "#");
        p.set(i + 1, j + 1, top ? hi : bottom ? lo : main);
      }
    });
    p.halo(K);
    // A one-pixel drop shadow under the outline gives the letters weight.
    for (let x = 0; x < 11; x++) {
      for (let y = 11; y >= 0; y--) {
        if (p.get(x, y) === K && p.get(x, y + 1) === null) p.set(x, y + 1, K);
      }
    }
    return p.done();
  });
}

// ── Small icons ────────────────────────────────────────────────────────
const ICONS: Record<string, { map: string[]; pal: Record<string, string> }> = {
  heart: { map: [".oo.oo.", "oppoppo", "ophpppo", "opppppo", ".opppo.", "..opo..", "...o..."], pal: { o: K, p: C.pink, h: C.pinkHi } },
  bulb: { map: ["..ooo..", ".oyyyo.", "oyhyyyo", "oyyyyyo", ".oyyyo.", "..ooo..", "..ogo..", "..ooo.."], pal: { o: K, y: C.yellow, h: C.yellowHi, g: C.grey } },
  arm: {
    map: ["....ooo....", "...oyyyo...", "...oyhyo...", "..ooyyyo...", ".oyyoyyyoo.", "oyyyyyyyyyo", "oyhyyyyyyyo", ".oyyyyyyyo.", "..ooooooo.."],
    pal: { o: K, y: C.yellow, h: C.yellowHi },
  },
  sprout: {
    map: [".oo...oo.", "oggo.oggo", "ogggogggo", ".oghgggo.", "..ogggo..", "...ogo...", "...ogo...", "...ooo..."],
    pal: { o: K, g: "#6fcf8f", h: "#c7f2d6" },
  },
  yin: {
    map: ["..ooooo..", ".owwwooo.", "owwowoooo", "owwwwoooo", "owwwooooo", "owwooowoo", "owwoooooo", ".owwoooo.", "..ooooo.."],
    pal: { o: K, w: C.white },
  },
  compass: {
    map: ["..ooooo..", ".owwwwwo.", "owwwwrwwo", "owwwrrwwo", "owwwowwwo", "owwbbwwwo", "owbwwwwwo", ".owwwwwo.", "..ooooo.."],
    pal: { o: K, w: C.white, r: "#ee4b3b", b: C.blue },
  },
  target: {
    map: ["..ooooo..", ".orrrrro.", "orrwwwrro", "orwwrwwro", "orwrrrwro", "orwwrwwro", "orrwwwrro", ".orrrrro.", "..ooooo.."],
    pal: { o: K, w: C.white, r: "#ee4b3b" },
  },
  pad: {
    map: [".ooooooooo.", "ogggggggggo", "oggoggggrgo", "ogoooggrgro", "oggoggggrgo", "ogggooogggo", ".ooo...ooo."],
    pal: { o: K, g: "#b9a6f2", r: C.pink },
  },
  // One-colour icons take the text colour of whatever they sit in.
  x: { map: ["oo...oo", "ooo.ooo", ".ooooo.", "..ooo..", ".ooooo.", "ooo.ooo", "oo...oo"], pal: { o: "currentColor" } },
  soundOn: { map: ["...o...o.", "..oo.o..o", "oooo..o.o", "oooo..o.o", "oooo..o.o", "..oo.o..o", "...o...o."], pal: { o: "currentColor" } },
  soundOff: { map: ["...o.....", "..oo.o..o", "oooo..oo.", "oooo..oo.", "oooo.o..o", "..oo.....", "...o....."], pal: { o: "currentColor" } },
  prev: { map: ["...o", "..oo", ".ooo", "oooo", ".ooo", "..oo", "...o"], pal: { o: "currentColor" } },
  next: { map: ["o...", "oo..", "ooo.", "oooo", "ooo.", "oo..", "o..."], pal: { o: "currentColor" } },
  arrowL: { map: ["....oo...", "...oo....", "..oo.....", ".oooooooo", ".oooooooo", "..oo.....", "...oo....", "....oo..."], pal: { o: "currentColor" } },
  arrowR: { map: ["...oo....", "....oo...", ".....oo..", "oooooooo.", "oooooooo.", ".....oo..", "....oo...", "...oo...."], pal: { o: "currentColor" } },
  copyMono: { map: ["..oooooo", "..o....o", "ooooo..o", "o...o..o", "o...o..o", "o...oooo", "o...o...", "ooooo..."], pal: { o: "currentColor" } },
  heartLine: { map: [".oo.oo.", "o..o..o", "o.....o", "o.....o", ".o...o.", "..o.o..", "...o..."], pal: { o: "currentColor" } },
  heartFull: { map: [".oo.oo.", "ooooooo", "ooooooo", "ooooooo", ".ooooo.", "..ooo..", "...o..."], pal: { o: "currentColor" } },
  starlet: {
    map: ["....o....", "...oyo...", "...oyo...", "oooyyyooo", "oyhyyyyyo", ".oyyyyyo.", ".oyyoyyo.", "oyyo.oyyo", "ooo...ooo"],
    pal: { o: K, y: C.yellow, h: C.yellowHi },
  },
  note: { map: ["..ooooo", "..o...o", "..o...o", "..o...o", ".oo..oo", "ooo.ooo", "oo..oo."], pal: { o: "currentColor" } },
  down: { map: ["...o...", "...o...", "...o...", ".ooooo.", "..ooo..", "...o...", "o.....o", "ooooooo"], pal: { o: "currentColor" } },
  check: { map: ["......o", ".....oo", "o...oo.", "oo.oo..", ".ooo...", "..o...."], pal: { o: "currentColor" } },
  cursorDown: { map: ["ooooooo", ".ooooo.", "..ooo..", "...o..."], pal: { o: "currentColor" } },
  caret: { map: ["ooooo", ".ooo.", "..o.."], pal: { o: "currentColor" } },
  pip: { map: ["..o..", ".ooo.", "ooooo", ".ooo.", "..o.."], pal: { o: "currentColor" } },
  globe: { map: ["..ooo..", ".o.o.o.", "ooooooo", "o..o..o", "ooooooo", ".o.o.o.", "..ooo.."], pal: { o: "currentColor" } },
};
export function icon(name: string) {
  return once(`icon-${name}`, () => {
    const { map, pal } = ICONS[name];
    const p = new Pix(map[0].length, map.length);
    p.stamp(map, pal, 0, 0);
    return p.done();
  });
}

// ── Renderer ───────────────────────────────────────────────────────────
interface ArtProps extends Omit<React.SVGProps<SVGSVGElement>, "children"> {
  sprite: SpriteData;
  /** CSS pixels per art pixel. Keep it a whole number. */
  px?: number;
}

export const Art = memo(function Art({ sprite, px = 4, style, ...rest }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${sprite.w} ${sprite.h}`}
      width={sprite.w * px}
      height={sprite.h * px}
      shapeRendering="crispEdges"
      style={{ display: "block", flex: "none", ...style }}
      {...rest}
    >
      {sprite.runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
});

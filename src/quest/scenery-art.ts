import { K, Pix, type SpriteData, type Test, ell, once, poly, starShape } from "./art";

// Scenery sprites: the things the five worlds are built from. Same rules as
// the rest of the art kit: shapes on a small grid, light from the top-left.

const { sin, abs, max, min, hypot, round, floor } = Math;

export function blit(p: Pix, s: SpriteData, ox: number, oy: number) {
  for (const r of s.runs) for (let i = 0; i < r.w; i++) p.set(ox + r.x + i, oy + r.y, r.c);
}

// ── Dreamland ──────────────────────────────────────────────────────────
export interface IslePal {
  grass: string;
  grassHi: string;
  rock: string;
  rockHi: string;
  rockLo: string;
  line: string;
}
export const ISLE_DREAM: IslePal = { grass: "#9be3b4", grassHi: "#d2f7dc", rock: "#c4a6ec", rockHi: "#dcc6f6", rockLo: "#a584d8", line: "#7a5cb8" };
export const ISLE_FAR: IslePal = { grass: "#c4e8d8", grassHi: "#e2f6ec", rock: "#d8c0f0", rockHi: "#e6d6f8", rockLo: "#c4a8e6", line: "#b294dc" };

/** A floating island: a grassy cap on a rock that tapers to a point. */
export function island(w: number, pal: IslePal = ISLE_DREAM) {
  return once(`isle-${w}-${pal.grass}`, () => {
    const h = round(w * 0.5) + 6;
    const p = new Pix(w, h);
    const u = (x: number) => (x - w / 2) / (w / 2);
    const top = (x: number) => 4 - 2.4 * (1 - u(x) ** 2);
    const bot = (x: number) => 7 + (h - 9) * max(0, 1 - abs(u(x))) ** 0.72 * (0.82 + 0.18 * sin(x * 0.9));
    p.shape(
      (x, y) => abs(u(x)) < 1 && y >= top(x) && y <= bot(x),
      (x, y) => {
        if (y < top(x) + 1.8) return pal.grassHi;
        if (y < top(x) + 4.4 + sin(x * 1.1)) return pal.grass;
        if (x > w * 0.64) return pal.rockLo;
        return floor((y + sin(x * 0.6) * 1.6) / 4) % 2 === 0 ? pal.rock : pal.rockHi;
      },
      pal.line,
    );
    return p.done();
  });
}

/** A round candy tree: a puff of sugar on a short trunk. */
export function puffTree(size = 14, fill = "#ffb3d1", hi = "#ffd9e8", lo = "#f48fb8", line = "#c9619a") {
  return once(`puff-${size}-${fill}`, () => {
    const p = new Pix(size, round(size * 1.35));
    const c = size / 2;
    p.rect(round(c) - 1, size - 1, 2, round(size * 0.35), "#b98a6a");
    p.shape(ell(c, c, c, c), (x, y) => (hypot(x - c * 0.7, y - c * 0.62) < c * 0.34 ? hi : x - c + (y - c) > c * 0.55 ? lo : fill), line);
    return p.done();
  });
}

/** A lollipop: a swirled disc on a white stick. */
export function lolli(r = 7, a = "#ff8fbf", b = "#fff6fa", line = "#c9619a") {
  return once(`lolli-${r}-${a}`, () => {
    const p = new Pix(r * 2, r * 2 + 12);
    p.rect(r - 1, r * 2 - 1, 2, 13, "#ffffff");
    p.rect(r, r * 2 - 1, 1, 13, "#e3dcee");
    p.shape(
      ell(r, r, r, r),
      (x, y) => {
        const d = hypot(x - r, y - r);
        const t = Math.atan2(y - r, x - r);
        return floor((d * 1.15 + t * 1.3) / 2.1) % 2 === 0 ? a : b;
      },
      line,
    );
    return p.done();
  });
}

/** A floating cake platform: frosting that drips over a wafer. */
export function cake(w: number, frost = "#ff9ec6", frostHi = "#ffd0e4", wafer = "#ffe6b8", waferLo = "#f3c98a", line = "#c9619a") {
  return once(`cake-${w}-${frost}`, () => {
    const h = 15;
    const p = new Pix(w, h);
    const drip = (x: number) => 5 + 2.2 * (0.5 + 0.5 * sin(x * 0.8 + 1)) + (floor(x / 7) % 2 ? 1.5 : 0);
    const body: Test = (x, y) => {
      const edge = min(x, w - x);
      return y > 0.2 && y < h - 0.2 - (edge < 2 ? 2 - edge : 0) - (y > 10 ? max(0, 4 - edge) * 0.8 : 0) && edge > (y < 2 ? 2 - y : 0);
    };
    p.shape(body, (x, y) => (y < 2 ? frostHi : y < drip(x) ? frost : (floor(x / 3) + floor(y / 3)) % 2 === 0 ? wafer : waferLo), line);
    return p.done();
  });
}

export function gumdrop(w = 14, fill = "#a6e3c4", hi = "#dcf7ea", lo = "#7cc9a6", line = "#4f9f7c") {
  return once(`gum-${w}-${fill}`, () => {
    const h = round(w * 0.8);
    const p = new Pix(w, h);
    p.shape(
      (x, y) => y < h - 0.2 && ell(w / 2, h, w / 2, h - 0.5)(x, y),
      (x, y) => (hypot(x - w * 0.34, y - h * 0.42) < w * 0.14 ? hi : x > w * 0.68 || y > h - 2.2 ? lo : fill),
      line,
    );
    return p.done();
  });
}

/** A wrapped sweet: a striped oval with a twist of paper at each end. It is drawn by hand, a pixel at a time. */
export function bonbon(fill = "#ff8fbf", hi = "#ffd9e8", lo = "#e0609a") {
  return once(`bonbon-${fill}`, () => {
    const map = [
      "......KKKKKKK......",
      "KK...KhhpwwppK...KK",
      "KwK.KhhpwwppwwK.KwK",
      "KwwKKhpwwppwwpKKwwK",
      "KwwwKpwwppwwplKwwwK",
      "KwwKKwwppwwpplKKwwK",
      "KwK.KwppwwppllK.KwK",
      "KK...KppwwpplK...KK",
      "......KKKKKKK......",
    ];
    const p = new Pix(map[0].length, map.length);
    p.stamp(map, { K, p: fill, h: hi, l: lo, w: "#fffaf0" }, 0, 0);
    return p.done();
  });
}

// ── Mushroom Hills ─────────────────────────────────────────────────────
export function mushroom(s = 28, cap = "#ee4b3b", capLo = "#b82c20", capHi = "#ff8a78") {
  return once(`shroom-${s}-${cap}`, () => {
    const w = s;
    const h = round(s * 0.98);
    const p = new Pix(w, h);
    const cx = w / 2;
    const rim = h * 0.56;
    p.shape(
      (x, y) => y > rim - 2 && y < h - 0.3 && abs(x - cx) < s * 0.17 + (y - rim) * 0.05,
      (x, y) => (y < rim + 2 ? "#d9b98a" : x > cx + s * 0.05 ? "#ecd7ae" : "#fff3d6"),
      K,
    );
    const spots: [number, number, number][] = [
      [-0.2, 0.2, 0.115],
      [0.2, 0.32, 0.095],
      [0.0, 0.46, 0.06],
      [0.37, 0.1, 0.07],
      [-0.4, 0.07, 0.06],
    ];
    p.shape(
      (x, y) => y < rim && ell(cx, rim, w / 2 - 0.2, h * 0.56 - 0.5)(x, y),
      (x, y) => {
        for (const [sx, sy, sr] of spots) if (hypot(x - (cx + sx * s), y - (rim - sy * h)) < sr * s) return "#ffffff";
        if (y > rim - 2.2) return capLo;
        if (hypot(x - cx + s * 0.22, y - rim + h * 0.3) > s * 0.42 && x > cx) return capLo;
        return y < rim - h * 0.4 && x < cx ? capHi : cap;
      },
      K,
    );
    return p.done();
  });
}

export function coin() {
  return once("coin", () => {
    const p = new Pix(8, 9);
    p.shape(ell(4, 4.5, 4, 4.5), (x, y) => (x < 3 && y < 4 ? "#fff0a8" : x > 5.2 || y > 6.6 ? "#d9952a" : "#ffc93a"), "#8a5a10");
    p.rect(3, 3, 2, 3, "#d9952a");
    return p.done();
  });
}

export type BlockKind = "brick" | "prize" | "stone" | "steel";
export function block(kind: BlockKind) {
  return once(`block-${kind}`, () => {
    const p = new Pix(12, 12);
    if (kind === "brick") {
      p.rect(0, 0, 12, 12, K);
      p.rect(1, 1, 10, 10, "#c9643a");
      p.rect(1, 1, 10, 1, "#e88a5a");
      p.rect(1, 4, 10, 1, "#7a3516");
      p.rect(1, 8, 10, 1, "#7a3516");
      p.rect(6, 1, 1, 3, "#7a3516");
      p.rect(3, 5, 1, 3, "#7a3516");
      p.rect(9, 5, 1, 3, "#7a3516");
      p.rect(6, 9, 1, 2, "#7a3516");
    } else if (kind === "prize") {
      p.rect(0, 0, 12, 12, K);
      p.rect(1, 1, 10, 10, "#ffc93a");
      p.rect(1, 1, 10, 1, "#fff0a8");
      p.rect(1, 1, 1, 10, "#fff0a8");
      p.rect(1, 10, 10, 1, "#d9952a");
      p.rect(10, 1, 1, 10, "#d9952a");
      for (const [x, y] of [
        [2, 2],
        [9, 2],
        [2, 9],
        [9, 9],
      ])
        p.set(x, y, "#8a5a10");
      p.shape(starShape(6, 6.3, 3.9, 1.7), "#8a5a10");
    } else if (kind === "stone") {
      p.rect(0, 0, 12, 12, "#14122e");
      p.rect(1, 1, 10, 10, "#6a6382");
      p.rect(1, 1, 10, 1, "#8f88a8");
      p.rect(1, 10, 10, 1, "#4a4560");
      p.rect(10, 2, 1, 9, "#4a4560");
      p.rect(4, 5, 3, 1, "#4a4560");
      p.rect(6, 6, 1, 2, "#4a4560");
    } else {
      p.rect(0, 0, 12, 12, "#14122e");
      p.rect(1, 1, 10, 10, "#3d388c");
      p.rect(1, 1, 10, 1, "#6a64c8");
      p.rect(1, 10, 10, 1, "#26225e");
      p.rect(3, 4, 6, 4, "#26225e");
      p.rect(4, 5, 4, 2, "#4fd6ff");
    }
    return p.done();
  });
}

export function bush(w = 26, fill = "#4fbf5a", hi = "#8fe38a", lo = "#2e8f3c", line = "#1f6a2e") {
  return once(`bush-${w}-${fill}`, () => {
    const h = round(w * 0.46);
    const p = new Pix(w, h);
    const puff: Test = (x, y) =>
      y < h - 0.3 && (ell(w * 0.26, h * 0.82, w * 0.24, h * 0.56)(x, y) || ell(w * 0.52, h * 0.66, w * 0.26, h * 0.66)(x, y) || ell(w * 0.78, h * 0.86, w * 0.2, h * 0.46)(x, y));
    p.shape(puff, (x, y) => (y > h - 2.4 ? lo : hypot(x - w * 0.46, y - h * 0.38) < w * 0.1 || hypot(x - w * 0.22, y - h * 0.62) < w * 0.07 ? hi : fill), line);
    return p.done();
  });
}

export function flower(petal = "#ffffff", heartC = "#ffc93a") {
  return once(`flower-${petal}`, () => {
    const p = new Pix(5, 8);
    p.rect(2, 4, 1, 4, "#2e8f3c");
    p.set(1, 6, "#2e8f3c");
    p.rect(1, 0, 3, 1, petal);
    p.rect(0, 1, 5, 3, petal);
    p.rect(1, 4, 3, 1, petal);
    p.rect(2, 2, 1, 1, heartC);
    return p.done();
  });
}

// ── Cosmic Arcade ──────────────────────────────────────────────────────
export function planet(r: number, bands: string[], shade: string, ring?: [string, string]) {
  return once(`planet-${r}-${bands[0]}-${ring?.[0] ?? ""}`, () => {
    const pad = ring ? round(r * 0.9) : 0;
    const w = r * 2 + pad * 2;
    const p = new Pix(w, r * 2);
    const cx = w / 2;
    const cy = r;
    const tilt = -0.32;
    const across = (x: number, y: number) => (x - cx) * sin(tilt) + (y - cy) * Math.cos(tilt);
    const inRing = (x: number, y: number) => {
      const u = (x - cx) * Math.cos(tilt) - (y - cy) * sin(tilt);
      const d = (u / (r * 1.82)) ** 2 + (across(x, y) / (r * 0.4)) ** 2;
      return d < 1 && d > 0.5 ? (d > 0.8 ? 2 : 1) : 0;
    };
    if (ring) p.shape((x, y) => inRing(x, y) > 0, (x, y) => ring[inRing(x, y) - 1]);
    p.shape(ell(cx, cy, r, r), (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      const band = bands[max(0, min(bands.length - 1, floor(((dy + r) / (r * 2)) * bands.length + sin(x * 0.45) * 0.4)))];
      // The night side falls away to the bottom-right, through a checkered edge.
      const dark = hypot(dx + r * 0.42, dy + r * 0.38);
      if (dark > r * 1.22) return shade;
      if (dark > r * 1.06) return (floor(x) + floor(y)) % 2 === 0 ? shade : band;
      return band;
    });
    // The near half of the ring passes in front of the planet.
    if (ring) p.shape((x, y) => inRing(x, y) > 0 && across(x, y) > 0, (x, y) => ring[inRing(x, y) - 1]);
    return p.done();
  });
}

export function moon(r = 12) {
  return once(`moon-${r}`, () => {
    const p = new Pix(r * 2, r * 2);
    const craters: [number, number, number][] = [
      [-0.3, -0.25, 0.22],
      [0.3, 0.1, 0.17],
      [-0.1, 0.45, 0.14],
      [0.25, -0.5, 0.1],
    ];
    p.shape(ell(r, r, r, r), (x, y) => {
      const dx = x - r;
      const dy = y - r;
      for (const [cx, cy, cr] of craters) {
        const d = hypot(dx - cx * r, dy - cy * r);
        if (d < cr * r) return dy - cy * r < -cr * r * 0.3 ? "#9aa0c4" : "#b9bedb";
      }
      const dark = hypot(dx + r * 0.4, dy + r * 0.36);
      if (dark > r * 1.18) return "#8f95bd";
      return dark > r * 1.02 && (floor(x) + floor(y)) % 2 === 0 ? "#8f95bd" : "#dfe3f6";
    });
    return p.done();
  });
}

/** A lump of rock with a flat top, to stand things on. */
export function rock(w: number, fill: string, hi: string, lo: string, line: string) {
  return once(`rock-${w}-${fill}`, () => {
    const h = round(w * 0.42) + 3;
    const p = new Pix(w, h);
    const u = (x: number) => (x - w / 2) / (w / 2);
    const bot = (x: number) => 5 + (h - 6) * max(0, 1 - u(x) ** 2) ** 0.6 * (0.86 + 0.14 * sin(x * 1.3));
    p.shape(
      (x, y) => abs(u(x)) < 1 && y > 1.2 - 1.2 * (1 - u(x) ** 2) + 1 && y < bot(x),
      (x, y) => {
        if (y < 3.2) return hi;
        if (hypot(x - w * 0.32, y - h * 0.5) < 2.2 || hypot(x - w * 0.66, y - h * 0.42) < 1.7) return lo;
        return x > w * 0.7 || y > bot(x) - 2 ? lo : fill;
      },
      line,
    );
    return p.done();
  });
}

export function satellite() {
  return once("satellite", () => {
    const p = new Pix(26, 11);
    for (const x of [0, 17]) {
      p.rect(x, 3, 9, 5, "#1b2a6a");
      p.rect(x + 1, 4, 7, 3, "#4fa0ff");
      p.rect(x + 3, 4, 1, 3, "#1b2a6a");
      p.rect(x + 6, 4, 1, 3, "#1b2a6a");
    }
    p.rect(9, 2, 8, 7, "#8f95bd");
    p.rect(10, 3, 6, 5, "#dfe3f6");
    p.rect(10, 6, 6, 2, "#b9bedb");
    p.rect(12, 0, 1, 2, "#dfe3f6");
    p.rect(11, 0, 3, 1, "#ff4fa8");
    p.rect(12, 9, 2, 2, "#8f95bd");
    return p.done();
  });
}

export function ufo() {
  return once("ufo", () => {
    const p = new Pix(24, 13);
    p.shape((x, y) => y < 7 && ell(12, 7, 6, 6.5)(x, y), (x, y) => (hypot(x - 10, y - 3.5) < 1.6 ? "#e6fbff" : "#8fe6ff"), "#2a9fd0");
    p.shape(ell(12, 8, 12, 3.8), (x, y) => (y < 7 ? "#e6e2ff" : y > 9.4 ? "#7a74c8" : "#b9b6ff"), "#3d388c");
    for (const x of [5, 9, 13, 17]) p.rect(x, 8, 2, 1, x % 8 === 5 ? "#ffd23f" : "#ff4fa8");
    p.rect(9, 11, 6, 2, "#3d388c");
    p.rect(10, 11, 4, 1, "#4fd6ff");
    return p.done();
  });
}

export function rocket() {
  return once("rocket", () => {
    const p = new Pix(18, 36);
    // Fins first, so the hull overlaps them.
    p.shape(poly([[1, 35], [1, 26], [6, 20], [6, 31]]), "#ee4b3b", K);
    p.shape(poly([[17, 35], [17, 26], [12, 20], [12, 31]]), "#b82c20", K);
    p.shape(
      (x, y) => y > 0.3 && y < 31.5 && abs(x - 9) < (y < 12 ? 0.6 + (y / 12) ** 0.7 * 4.6 : 5.2),
      (x, y) => (y < 8 ? (x < 9 ? "#ff7a68" : "#ee4b3b") : x > 11.5 ? "#c9cce0" : x < 6.5 ? "#ffffff" : "#ecedf6"),
      K,
    );
    p.shape(ell(9, 15, 2.8, 2.8), (x, y) => (x < 8.6 && y < 14.6 ? "#e6fbff" : "#4fd6ff"), K);
    p.rect(5, 24, 8, 1, "#ee4b3b");
    p.rect(7, 31, 4, 2, "#5a567f");
    return p.done();
  });
}

// ── Neon Circuit ───────────────────────────────────────────────────────
/**
 * A racing car seen from behind. `lean` turns it toward the vanishing point: -1 for a car
 * on the right of the road (it heads up and to the left), 1 for one on the left, 0 square-on.
 * A turned car shows its near flank and front wheel as well as its tail.
 */
export function car(body: string, hi: string, lo: string, lean: -1 | 0 | 1 = 0) {
  return once(`car-${body}-${lean}`, () => {
    // Draw it square-on first.
    const p = new Pix(26, 15);
    p.rect(3, 11, 5, 4, "#0e0d14");
    p.rect(18, 11, 5, 4, "#0e0d14");
    p.shape(poly([[7, 0], [19, 0], [22, 6], [4, 6]]), (x, y) => (y > 1.2 && x > 8 && x < 18 ? (y < 3 ? "#8fd0ff" : "#3f7ac8") : body), K);
    p.shape((x, y) => x > 0.2 && x < 25.8 && y > 4.6 && y < 12.6 && min(x, 26 - x) > (y < 6.5 ? 1.6 : 0), (x, y) => (y < 6.6 ? hi : y > 10.4 ? lo : body), K);
    p.rect(2, 7, 5, 2, "#ff2f4f");
    p.rect(19, 7, 5, 2, "#ff2f4f");
    p.rect(3, 7, 2, 1, "#ffd0d6");
    p.rect(20, 7, 2, 1, "#ffd0d6");
    p.rect(10, 7, 6, 3, "#f4f1ff");
    p.rect(11, 8, 4, 1, "#5a567f");
    p.rect(1, 11, 24, 1, "#34323f");
    if (!lean) return p.done();

    // Then shear it row by row, so the roof sits nearer the vanishing point than the bumper,
    // and fill in the flank that the turn brings into view.
    const pad = 7;
    const q = new Pix(26 + pad, 15);
    const shift = (y: number) => round(max(0, 11 - y) * 0.34) * lean;
    const base = lean < 0 ? pad : 0;
    for (let y = 0; y < 15; y++) {
      const dx = base + shift(y);
      let first = -1;
      let last = -1;
      for (let x = 0; x < 26; x++) {
        const c = p.get(x, y);
        if (!c) continue;
        q.set(x + dx, y, c);
        if (first < 0) first = x + dx;
        last = x + dx;
      }
      if (first < 0 || y < 5 || y > 11) continue;
      // The near side of the body: three pixels of shade and an outline.
      const edge = lean < 0 ? first : last;
      for (let i = 1; i <= 3; i++) q.set(edge - i * lean, y, y === 5 || i === 3 ? K : lo);
      q.set(edge, y, y === 5 ? K : lo);
    }
    // The front wheel, tucked ahead of the flank.
    const fx = lean < 0 ? base + shift(9) - 4 : base + shift(9) + 26;
    q.rect(fx, 9, 4, 4, "#0e0d14");
    return q.done();
  });
}

/** A trackside lamp post; the lamp itself is a separate blinking prop. */
export function lampPost(h = 26) {
  return once(`post-${h}`, () => {
    const p = new Pix(9, h);
    p.rect(4, 4, 2, h - 4, "#0e0d14");
    p.rect(5, 4, 1, h - 4, "#34323f");
    p.rect(1, 0, 8, 5, "#0e0d14");
    p.rect(2, 1, 6, 3, "#34323f");
    p.rect(2, h - 2, 6, 2, "#0e0d14");
    return p.done();
  });
}

export function flag() {
  return once("flag", () => {
    const p = new Pix(16, 22);
    p.rect(1, 0, 2, 22, K);
    p.rect(3, 1, 12, 10, K);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) p.set(4 + x, 2 + y, (floor(x / 2) + floor(y / 2)) % 2 === 0 ? "#ffffff" : "#22212e");
    return p.done();
  });
}

// ── Dungeon Quest ──────────────────────────────────────────────────────
export function torchBracket() {
  return once("torch", () => {
    const p = new Pix(8, 14);
    p.rect(3, 4, 2, 10, "#14122e");
    p.rect(3, 5, 1, 8, "#8a5a2f");
    p.rect(0, 2, 8, 4, "#14122e");
    p.rect(1, 3, 6, 2, "#8a8598");
    p.rect(1, 3, 6, 1, "#c0bbd0");
    return p.done();
  });
}

export function flame(frame: 0 | 1, hot = "#fff0a8", mid = "#ffb52e", cool = "#ee4b3b") {
  return once(`flame-${frame}-${mid}`, () => {
    const p = new Pix(10, 13);
    const lean = frame ? 1 : -1;
    const tip = frame ? 0.6 : 2;
    const body: Test = (x, y) => {
      const t = (y - tip) / (12.5 - tip);
      if (t < 0 || y > 12.6) return false;
      const cx = 5 + lean * (1 - t) * 1.6;
      return abs(x - cx) < 0.5 + 4.2 * sin(min(1, t * 1.15) * Math.PI * 0.62) ** 1.2;
    };
    p.shape(body, (x, y) => {
      const t = (y - tip) / (12.5 - tip);
      const cx = 5 + lean * (1 - t) * 1.6;
      const d = abs(x - cx);
      return t > 0.55 && d < 1.3 ? hot : t > 0.34 && d < 2.6 ? mid : cool;
    });
    return p.done();
  });
}

export const CRYSTALS = {
  emerald: ["#35c28c", "#a8f0d0", "#1f8a60", "#0f5a3c"],
  violet: ["#9a6bff", "#d0bcff", "#6a3fd6", "#3f1f9a"],
  cyan: ["#4fd6ff", "#d0f6ff", "#2a9fd0", "#14608a"],
} as const;
export type CrystalColor = keyof typeof CRYSTALS;

/** A cluster of three shards, each with a lit face and a dark face. */
export function crystal(color: CrystalColor, s = 20) {
  return once(`crystal-${color}-${s}`, () => {
    const [mid, hi, lo, line] = CRYSTALS[color];
    const p = new Pix(s, s);
    const shard = (bx: number, tipX: number, tipY: number, half: number) => {
      const out = poly([
        [bx - half, s],
        [bx - half - 0.6, s * 0.55 + tipY * 0.4],
        [tipX, tipY],
        [bx + half + 0.6, s * 0.55 + tipY * 0.4],
        [bx + half, s],
      ]);
      p.shape((x, y) => y < s - 0.2 && out(x, y), (x, y) => (x < tipX - 0.6 ? (y < s * 0.55 + tipY * 0.4 + 1 ? hi : mid) : x > tipX + 0.8 ? lo : mid), line);
    };
    shard(s * 0.24, s * 0.16, s * 0.42, s * 0.11);
    shard(s * 0.78, s * 0.86, s * 0.34, s * 0.11);
    shard(s * 0.5, s * 0.5, 0.6, s * 0.17);
    return p.done();
  });
}

export function chest() {
  return once("chest", () => {
    const p = new Pix(24, 18);
    p.shape((x, y) => y > 6 && y < 17.6 && x > 0.4 && x < 23.6, (x, y) => (y > 15 ? "#6a3f1e" : x > 19 ? "#7a4a24" : "#9a6233"), "#14122e");
    p.shape((x, y) => y < 8 && ell(12, 8, 11.6, 7.6)(x, y), (x, y) => (y < 3 && x < 12 ? "#c98a4f" : x > 18 ? "#7a4a24" : "#b0753c"), "#14122e");
    for (const x of [4, 18]) {
      p.rect(x, 2, 2, 15, "#d9a93a");
      p.rect(x, 2, 1, 15, "#ffe9a0");
    }
    p.rect(1, 8, 22, 2, "#d9a93a");
    p.rect(1, 8, 22, 1, "#ffe9a0");
    p.rect(10, 7, 4, 5, "#14122e");
    p.rect(11, 8, 2, 3, "#ffe9a0");
    return p.done();
  });
}

export function goldPile(w = 18) {
  return once(`gold-${w}`, () => {
    const h = round(w * 0.4);
    const p = new Pix(w, h);
    p.shape((x, y) => y < h - 0.2 && ell(w / 2, h, w / 2, h - 0.5)(x, y), (x, y) => ((floor(x * 0.9) + floor(y * 1.3)) % 3 === 0 ? "#fff0a8" : x > w * 0.66 ? "#d9952a" : "#ffc93a"), "#8a5a10");
    return p.done();
  });
}

export function bat(frame: 0 | 1) {
  return once(`bat-${frame}`, () => {
    const p = new Pix(15, 8);
    const c = "#2a2440";
    p.rect(6, 2, 3, 4, c);
    p.set(6, 1, c);
    p.set(8, 1, c);
    p.set(6, 3, "#ff4f6a");
    p.set(8, 3, "#ff4f6a");
    if (frame) {
      p.rect(2, 3, 4, 2, c);
      p.rect(9, 3, 4, 2, c);
      p.rect(0, 4, 3, 2, c);
      p.rect(12, 4, 3, 2, c);
    } else {
      p.rect(3, 1, 3, 2, c);
      p.rect(9, 1, 3, 2, c);
      p.rect(0, 0, 4, 2, c);
      p.rect(11, 0, 4, 2, c);
    }
    return p.done();
  });
}

/** A pillar with a capital and a base, as tall as you like. */
export function pillar(h: number, w = 16) {
  return once(`pillar-${h}-${w}`, () => {
    const p = new Pix(w + 6, h);
    p.rect(3, 0, w, h, "#3a3450");
    p.rect(3, 0, 3, h, "#4f4868");
    p.rect(w - 1, 0, 4, h, "#2a2639");
    for (let y = 14; y < h - 8; y += 18) p.rect(3, y, w, 1, "#2a2639");
    for (const y of [0, h - 6]) {
      p.rect(0, y, w + 6, 6, "#14122e");
      p.rect(1, y + 1, w + 4, 4, "#4f4868");
      p.rect(1, y + 1, w + 4, 1, "#6a6382");
    }
    return p.done();
  });
}

// ── Level-select thumbnails ────────────────────────────────────────────
export function thumb(world: string) {
  return once(`thumb-${world}`, () => {
    const w = 36;
    const h = 24;
    const p = new Pix(w, h);
    const hill = (cx: number, r: number, base: number, c: string, top?: string) => {
      for (let x = 0; x < w; x++) {
        const d = r * r - (x - cx) ** 2;
        if (d <= 0) continue;
        const y = round(base - Math.sqrt(d));
        p.rect(x, y, 1, h - y, c);
        if (top) p.set(x, y, top);
      }
    };
    if (world === "dream") {
      ["#b9a6f2", "#d8b0ee", "#f9b9d9", "#ffd3d8", "#ffe9cc"].forEach((c, i) => p.rect(0, i * 4, w, 4 + (i === 4 ? 8 : 0), c));
      p.shape(ell(18, 17, 7, 7), "#fff6c8");
      p.rect(3, 4, 7, 2, "#ffffff");
      p.rect(4, 3, 4, 1, "#ffffff");
      p.rect(25, 7, 8, 2, "#ffffff");
      p.rect(27, 6, 4, 1, "#ffffff");
      hill(8, 9, 24, "#f79ac0", "#ffc6dc");
      hill(29, 11, 26, "#e0a8e6", "#f2ccf4");
      p.rect(0, 20, w, 4, "#f58cb8");
      p.rect(0, 20, w, 1, "#fff8fb");
    } else if (world === "mushroom") {
      ["#5ab0f5", "#7cc4fa", "#a5d9fd"].forEach((c, i) => p.rect(0, i * 7, w, 7 + (i === 2 ? 6 : 0), c));
      p.rect(4, 3, 8, 2, "#ffffff");
      p.rect(6, 2, 4, 1, "#ffffff");
      hill(27, 12, 22, "#58c74f", "#2e8f3c");
      hill(7, 8, 22, "#7ed08a", "#3f9a5a");
      for (let i = 0; i < 3; i++) {
        p.rect(13 + i * 4, 9, 4, 4, i === 1 ? "#ffc93a" : "#c9643a");
        p.rect(13 + i * 4, 9, 4, 1, i === 1 ? "#fff0a8" : "#e88a5a");
      }
      p.rect(0, 19, w, 5, "#c9793a");
      p.rect(0, 18, w, 2, "#58c74f");
      p.rect(0, 18, w, 1, "#9be87f");
    } else if (world === "cosmic") {
      ["#0a0a26", "#141244", "#261a66", "#3a2088"].forEach((c, i) => p.rect(0, i * 6, w, 6, c));
      for (const [x, y] of [[3, 3], [9, 8], [15, 2], [22, 6], [30, 3], [33, 11], [6, 13], [18, 10], [27, 14]]) p.set(x, y, "#ffffff");
      p.shape(ell(26, 9, 5, 5), (x, y) => (y < 8 ? "#f9b67a" : y < 10 ? "#f08a5d" : "#d96a4a"));
      p.rect(19, 9, 14, 1, "#ffe1a8");
      p.shape(ell(8, 6, 2, 2), "#dfe3f6");
      hill(10, 12, 30, "#5b54a6", "#8c84d8");
      hill(30, 10, 28, "#463f8c", "#6a62c0");
    } else if (world === "racing") {
      ["#14143c", "#3a1a66", "#8a2866", "#e0483a", "#ff7a2f"].forEach((c, i) => p.rect(0, i * 3, w, 3, c));
      p.shape((x, y) => y < 15 && ell(18, 15, 7, 7)(x, y), (x, y) => (floor(y) % 3 === 2 && y > 10 ? "#e0483a" : y < 11 ? "#ffe45a" : "#ff9a3a"));
      p.rect(0, 15, w, 9, "#17152c");
      p.shape(poly([[17, 15], [19, 15], [32, 24], [4, 24]]), "#34324a");
      for (let y = 16; y < 24; y += 3) p.rect(18, y, 1, 2, "#3fd0ff");
      for (let y = 15; y < 24; y++) {
        const half = 1 + ((y - 15) * 14) / 9;
        p.set(round(18 - half), y, y % 2 ? "#ff3f5a" : "#ffffff");
        p.set(round(18 + half), y, y % 2 ? "#ff3f5a" : "#ffffff");
      }
      p.rect(0, 15, w, 1, "#3fa9ff");
    } else {
      p.rect(0, 0, w, h, "#1f1a2e");
      for (let y = 0; y < 18; y += 4) for (let x = (y / 4) % 2 ? -4 : 0; x < w; x += 8) p.rect(x, y, 7, 3, "#2b2540");
      p.shape((x, y) => y > 6 && abs(x - 18) < 5 && (y > 10 || ell(18, 10.5, 5, 5)(x, y)), "#0e0c16");
      p.rect(0, 18, w, 6, "#4a4560");
      p.rect(0, 18, w, 1, "#7d7692");
      for (const x of [7, 28]) {
        p.rect(x, 9, 2, 4, "#8a5a2f");
        p.rect(x - 1, 6, 4, 3, "#ffb52e");
        p.rect(x, 5, 2, 2, "#fff0a8");
      }
      p.rect(16, 14, 5, 4, "#9a6233");
      p.rect(16, 15, 5, 1, "#ffc93a");
      p.rect(30, 14, 2, 4, "#35c28c");
      p.rect(32, 15, 2, 3, "#1f8a60");
      p.rect(3, 15, 2, 3, "#9a6bff");
    }
    return p.done();
  });
}

// ── Things that move ───────────────────────────────────────────────────
// Creatures and vehicles for the worlds. Anything that flaps or flickers comes
// as two frames; the scene shows them in turn.
const sheet = (key: string, map: string[], pal: Record<string, string>) =>
  once(key, () => {
    const p = new Pix(map[0].length, map.length);
    p.stamp(map, pal, 0, 0);
    return p.done();
  });

/** Several sprites pasted into one, so a whole island or platform can move as a piece. */
export function compose(key: string, w: number, h: number, parts: [SpriteData, number, number][]) {
  return once(key, () => {
    const p = new Pix(w, h);
    for (const [s, x, y] of parts) blit(p, s, x, y);
    return p.done();
  });
}

/** A hot-air balloon in two colours. */
export function balloon(a: string, b: string, line = "#7a5cb8") {
  return once(`balloon-${a}`, () => {
    const p = new Pix(16, 24);
    p.shape(
      (x, y) => ell(8, 7.5, 7.6, 7.4)(x, y) || (y > 10 && y < 16.5 && abs(x - 8) < (16.5 - y) * 0.9 + 1.2),
      (x, y) => (y < 4 && x < 7 ? "#ffffff" : floor((x + 1) / 3) % 2 ? b : a),
      line,
    );
    p.rect(6, 16, 1, 3, line);
    p.rect(9, 16, 1, 3, line);
    p.rect(5, 19, 6, 4, "#8a5a2f");
    p.rect(5, 19, 6, 1, "#c98a4f");
    p.rect(5, 23, 6, 1, "#5a3a1a");
    return p.done();
  });
}

export const bird = (frame: 0 | 1, c = "#34305e") =>
  sheet(`bird-${frame}-${c}`, frame ? [".......", "..ooo..", ".o.o.o.", "o.....o"] : ["o.....o", ".o...o.", "..ooo..", "...o..."], { o: c });

/** A round little blob with two eyes: the thing that hops about on the ground. */
export const blob = (body: string, hi: string, line: string) =>
  sheet(`blob-${body}`, ["....oooo....", "..oobbbboo..", ".obbhbbbbbo.", "obbhbbbbbbbo", "obbwkbbwkbbo", "obbwkbbwkbbo", "obbbbbbbbbbo", "obbbbbbbbbbo", ".oooooooooo."], {
    o: line,
    b: body,
    h: hi,
    w: "#ffffff",
    k: "#1b1b2e",
  });

export const butterfly = (frame: 0 | 1, c = "#ff9ec6") =>
  sheet(`butterfly-${frame}-${c}`, frame ? [".a.a.", ".aoa.", "..o..", "..o.."] : ["aa.aa", "aaoaa", ".aoa.", "..o.."], { a: c, o: "#34305e" });

/** A goal flag on a pole; two frames of the cloth catching the wind. */
export function goalFlag(frame: 0 | 1) {
  return once(`goal-${frame}`, () => {
    const p = new Pix(13, 30);
    p.rect(1, 2, 2, 28, "#f4f1ff");
    p.rect(2, 2, 1, 28, "#b9bedb");
    p.rect(0, 0, 4, 3, "#ffc93a");
    p.rect(0, 28, 4, 2, "#5a567f");
    const wave = frame ? [0, 0, 1, 1, 1, 0, 0, -1, -1] : [0, 1, 1, 0, 0, -1, -1, 0, 0];
    wave.forEach((dy, x) => {
      p.rect(3 + x, 5 + dy, 1, 7, x % 3 === 1 ? "#ff8a78" : "#ee4b3b");
      p.set(3 + x, 5 + dy, "#b82c20");
      p.set(3 + x, 11 + dy, "#b82c20");
    });
    return p.done();
  });
}

/** A plank that rides up and down. */
export function plank(w = 26) {
  return once(`plank-${w}`, () => {
    const p = new Pix(w, 6);
    p.rect(0, 0, w, 6, "#7a3516");
    p.rect(1, 1, w - 2, 4, "#ffc93a");
    p.rect(1, 1, w - 2, 1, "#fff0a8");
    p.rect(1, 4, w - 2, 1, "#d9952a");
    for (let x = 3; x < w - 2; x += 6) p.set(x, 2, "#7a3516");
    return p.done();
  });
}

export function asteroid(r = 6, v = 0) {
  return once(`asteroid-${r}-${v}`, () => {
    const p = new Pix(r * 2, r * 2);
    p.shape(
      (x, y) => hypot(x - r, y - r) < r - 1.2 + 0.8 * sin(Math.atan2(y - r, x - r) * 3 + v * 2),
      (x, y) => (hypot(x - r * 0.7, y - r * 1.15) < r * 0.26 || hypot(x - r * 1.3, y - r * 0.7) < r * 0.2 ? "#3f3888" : x + y > r * 2.5 ? "#463f8c" : x + y < r * 1.5 ? "#a8a0ec" : "#6a62b8"),
      "#1f1c52",
    );
    return p.done();
  });
}

export const astronaut = () =>
  sheet("astronaut", ["...ooooo...", "..owwwwwo..", ".owbbbbbwo.", ".owbhhbbwo.", ".owbbbbbwo.", "..owwwwwo..", ".ooowwwooo.", "owwowrwowwo", "owwowwwowwo", ".oo.owo.oo.", "...owwwo...", "...owowo...", "..owwowwo..", "..ooo.ooo.."], {
    o: "#1f1c52",
    w: "#f0ecff",
    b: "#2a5aa0",
    h: "#8fe6ff",
    r: "#ff4fa8",
  });

/** A moon rover: six wheels, a cabin window and an aerial. */
export const rover = () =>
  sheet("rover", ["...........r....", "...........o....", "..oooooooo.o....", ".owwwwwwwwooo...", ".owbbwwwwwwwwo..", "oooooooooooooooo", ".okko.okko.okko.", ".okko.okko.okko.", "..oo...oo...oo.."], {
    o: "#1f1c52",
    w: "#dfe3f6",
    b: "#4fd6ff",
    k: "#5a567f",
    r: "#ff4fa8",
  });

/** A roadside palm, lit in neon from one side. */
export function palm() {
  return once("palm", () => {
    const p = new Pix(18, 24);
    for (let y = 9; y < 24; y++) {
      p.rect(8, y, 2, 1, y % 3 === 0 ? "#4a1f5a" : "#1f1030");
      if (y % 3 === 1) p.set(8, y, "#ff4fa8");
    }
    const leaf = (pts: [number, number][]) => {
      for (const [dx, dy] of pts) {
        for (const s of [-1, 1]) {
          const x = (s > 0 ? 9 : 8) + s * dx;
          p.set(x, 9 + dy, "#1fc8a8");
          p.set(x, 10 + dy, "#0a6a5c");
        }
      }
    };
    leaf([[1, -1], [2, -2], [3, -2], [4, -2], [5, -1], [6, 0], [7, 1], [8, 3]]);
    leaf([[1, -3], [2, -4], [3, -5], [4, -5], [5, -4], [6, -3], [7, -1]]);
    p.rect(8, 3, 2, 6, "#0a6a5c");
    p.rect(8, 3, 1, 3, "#1fc8a8");
    return p.done();
  });
}

/** A blimp for the sky over the track. */
export function blimp() {
  return once("blimp", () => {
    const p = new Pix(26, 11);
    p.shape(poly([[21, 1], [25, 0], [25, 8], [21, 7]]), "#ee2f4a", "#0e0d18");
    p.shape(ell(12, 4.5, 11.6, 4.3), (x, y) => (y < 2.4 ? "#f4f1ff" : y > 6 ? "#8a86a8" : floor(x / 5) % 2 ? "#ff7a2f" : "#c9cce0"), "#0e0d18");
    p.rect(9, 8, 7, 3, "#0e0d18");
    p.rect(10, 9, 5, 1, "#ffd23f");
    return p.done();
  });
}

export const spider = () => sheet("spider", ["..ooo..", "o.ooo.o", ".ooooo.", "o.oro.o", ".o...o."], { o: "#0e0c16", r: "#ff4f6a" });

/** A rat, running to the right. */
export const rat = () => sheet("rat", ["......ee...", "pp.ggggggg.", "..pgggggkgg", "...gggggggg", "...g..g..g."], { g: "#6a6578", e: "#8a8598", k: "#ff4f6a", p: "#f9a0bd" });

// ── World furniture ────────────────────────────────────────────────────
// Things each world would be expected to have lying about.

// Dreamland.
export const cupcake = () =>
  sheet("cupcake", [".....rr.....", "....orro....", "...owwwwo...", "..owwpwwwo..", ".owwwwwwpwo.", ".owpwwwwwwo.", "oooooooooooo", ".occdccdcco.", ".occdccdcco.", ".occdccdcco.", "..ocdccdco..", "..oooooooo.."], {
    o: "#c9619a",
    r: "#ee4b6a",
    w: "#fff8fc",
    p: "#ff9ec6",
    c: "#ffd98a",
    d: "#f0b85a",
  });
export const candyCane = () =>
  sheet("candy-cane", ["..oooo..", ".orwwro.", "orwoorwo", "owro.oro", "orwo.owo", "owro.ooo", "orwo....", "owro....", "orwo....", "owro....", "orwo....", "owro....", "orwo....", "oooo...."], {
    o: "#c9619a",
    r: "#f4679d",
    w: "#ffffff",
  });

// Mushroom Hills.
export const signpost = () =>
  sheet("signpost", ["ooooooooooo", "obbbbbkbbbo", "obkkkkkkbbo", "obbbbbkbbbo", "ooooooooooo", "....opo....", "....opo....", "....opo....", "....opo....", "....opo...."], {
    o: "#5a3a1a",
    b: "#e0b070",
    k: "#5a3a1a",
    p: "#b0753c",
  });
/** A length of picket fence. */
export function fence(w = 24) {
  return once(`fence-${w}`, () => {
    const p = new Pix(w, 9);
    p.rect(0, 3, w, 2, "#fff6d8");
    p.rect(0, 5, w, 1, "#d9c08a");
    for (let x = 1; x < w - 2; x += 6) {
      p.rect(x, 1, 3, 8, "#fff6d8");
      p.set(x + 1, 0, "#fff6d8");
      p.rect(x + 2, 1, 1, 8, "#d9c08a");
    }
    return p.done();
  });
}

// Cosmic Arcade.
/** A moon base: a glass dome on a footing, with lit windows. */
export function dome() {
  return once("dome", () => {
    const p = new Pix(24, 13);
    p.shape(
      (x, y) => y < 10.5 && ell(12, 10.5, 11.5, 10)(x, y),
      (x, y) => (hypot(x - 8, y - 5) < 2.2 ? "#e6fbff" : y > 6.5 && floor(x / 4) % 2 === 0 ? "#ffd23f" : x > 15 ? "#2a9fd0" : "#4fd6ff"),
      "#1f1c52",
    );
    p.rect(0, 10, 24, 3, "#1f1c52");
    p.rect(1, 10, 22, 1, "#8f95bd");
    p.rect(1, 11, 22, 1, "#5a567f");
    return p.done();
  });
}
export const moonFlag = () => sheet("moon-flag", ["o.......", "opppp...", "oppppp..", "opppp...", "o.......", "o.......", "o.......", "o.......", "o.......", "o.......", "o.......", "o......."], { o: "#dfe3f6", p: "#ff4fa8" });

// Neon Circuit.
export const cone = () => sheet("cone", ["...o...", "..oro..", "..oro..", ".owwwo.", ".orrro.", "owwwwwo", "orrrrro", "ooooooo"], { o: "#0e0d18", r: "#ff7a2f", w: "#f4f1ff" });
export function tires() {
  return once("tires", () => {
    const p = new Pix(10, 12);
    for (let i = 0; i < 3; i++) p.stamp([".oooooooo.", "okkkkkkkko", "okggggggko", ".oooooooo."], { o: "#0e0d18", k: "#34323f", g: "#5a567f" }, 0, i * 4);
    return p.done();
  });
}
/** A trackside hoarding on two legs: a neon frame around a big arrow. */
export function billboard() {
  return once("billboard", () => {
    const p = new Pix(30, 24);
    p.rect(5, 15, 2, 9, "#0e0d18");
    p.rect(23, 15, 2, 9, "#0e0d18");
    p.rect(0, 0, 30, 16, "#0e0d18");
    p.rect(1, 1, 28, 14, "#ff4fa8");
    p.rect(2, 2, 26, 12, "#17161f");
    // The arrow, pointing up the road.
    p.rect(13, 5, 4, 7, "#3fd0ff");
    [2, 4, 6, 8].forEach((w, i) => p.rect(15 - w / 2, 3 + i, w, 1, "#3fd0ff"));
    p.rect(4, 4, 3, 3, "#ffd23f");
    p.rect(23, 4, 3, 3, "#ffd23f");
    return p.done();
  });
}

// Dungeon Quest.
export const barrel = () =>
  sheet(
    "barrel",
    ["..oooooooo..", ".obbbbbbbbo.", "obbhbbbbbbdo", "oggggggggggo", "obbhbbbbbbdo", "obbhbbbbbbdo", "obbhbbbbbbdo", "obbhbbbbbbdo", "obbhbbbbbbdo", "oggggggggggo", "obbhbbbbbbdo", ".obbbbbbbbo.", "..oooooooo.."],
    { o: "#14122e", b: "#9a6233", h: "#c98a4f", d: "#6a3f1e", g: "#8a8598" },
  );
export const crate = () =>
  sheet(
    "crate",
    ["oooooooooooo", "obbbbbbbbbbo", "obdbbbbbbdbo", "obbdbbbbdbbo", "obbbdbbdbbbo", "obbbbddbbbbo", "obbbbddbbbbo", "obbbdbbdbbbo", "obbdbbbbdbbo", "obdbbbbbbdbo", "obbbbbbbbbbo", "oooooooooooo"],
    { o: "#14122e", b: "#b0753c", d: "#6a3f1e" },
  );
/** A skull and a couple of old bones. */
export const bones = () =>
  sheet("bones", [".ooooo........", "owwwwwo.......", "owkwkwo.......", "owwwwwo.ww..ww", ".owkwo.wwwwwww", ".owwwo..ww..ww", "..ooo........."], { o: "#8a8598", w: "#e6e2f4", k: "#14122e" });
/** A cobweb for a top corner; `flip` puts the corner on the right. */
export function cobweb(flip = false) {
  return once(`cobweb-${flip}`, () => {
    const n = 14;
    const p = new Pix(n, n);
    const put = (x: number, y: number) => p.set(flip ? n - 1 - x : x, y, "#8a86b0");
    for (let i = 0; i < n; i++) {
      put(i, 0);
      put(0, i);
      if (i < 11) put(i, i);
    }
    for (const r of [5, 9, 13]) {
      for (let a = 0; a <= 90; a += 3) {
        const [x, y] = [round(Math.cos((a * Math.PI) / 180) * r), round(sin((a * Math.PI) / 180) * r)];
        // Each strand sags between the spokes.
        const dip = round(sin((a * Math.PI) / 45) ** 2 * 1.4);
        if (x - dip >= 0 && y - dip >= 0) put(max(0, x - dip), max(0, y - dip));
      }
    }
    return p.done();
  });
}
/** A wall banner: a rod, red cloth with a gold ring on it, and a forked tail. */
export function banner(cloth = "#b82c3a", lo = "#8a1e2a") {
  return once(`banner-${cloth}`, () => {
    const p = new Pix(10, 20);
    p.rect(1, 2, 8, 16, cloth);
    p.rect(7, 2, 2, 16, lo);
    for (let i = 0; i < 4; i++) for (let x = 5 - i - 1; x <= 4 + i + 1; x++) if (x >= 1 && x <= 8 && i < 3) p.set(x, 17 - (2 - i), null);
    p.rect(0, 0, 10, 2, "#d9a93a");
    p.rect(0, 0, 10, 1, "#ffe9a0");
    p.rect(3, 6, 4, 1, "#ffc93a");
    p.rect(3, 10, 4, 1, "#ffc93a");
    p.rect(2, 7, 1, 3, "#ffc93a");
    p.rect(7, 7, 1, 3, "#ffc93a");
    return p.done();
  });
}

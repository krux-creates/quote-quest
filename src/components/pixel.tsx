import { memo } from "react";

export const INK = "#1b1b1f";

type Palette = Record<string, string>;

interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

const cache = new Map<string, Run[]>();

/** Collapse a character map into horizontal runs so each row is a few rects. */
function runsOf(map: string[], palette: Palette): Run[] {
  const key = map.join("|") + JSON.stringify(palette);
  const hit = cache.get(key);
  if (hit) return hit;
  const runs: Run[] = [];
  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const fill = palette[row[x]];
      if (!fill) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && palette[row[x + w]] === fill) w++;
      runs.push({ x, y, w, fill });
      x += w;
    }
  });
  cache.set(key, runs);
  return runs;
}

interface SpriteProps {
  map: string[];
  palette: Palette;
  x?: number;
  y?: number;
  /** Mirror horizontally around the sprite's own centre. */
  flip?: boolean;
}

/** A pixel sprite as an SVG group. Use inside an <svg shapeRendering="crispEdges">. */
export const Sprite = memo(function Sprite({ map, palette, x = 0, y = 0, flip }: SpriteProps) {
  const w = map[0]?.length ?? 0;
  const runs = runsOf(map, palette);
  return (
    <g transform={flip ? `translate(${x + w} ${y}) scale(-1 1)` : `translate(${x} ${y})`}>
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </g>
  );
});

interface PixelArtProps extends Omit<React.SVGProps<SVGSVGElement>, "children"> {
  map: string[];
  palette: Palette;
  /** Rendered size of one map cell, in CSS pixels. */
  px?: number;
}

/** A sprite as a standalone inline SVG for use in normal HTML layout. */
export function PixelArt({ map, palette, px = 3, style, ...rest }: PixelArtProps) {
  const w = map[0]?.length ?? 0;
  const h = map.length;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${w} ${h}`}
      width={w * px}
      height={h * px}
      shapeRendering="crispEdges"
      style={{ display: "block", ...style }}
      {...rest}
    >
      <Sprite map={map} palette={palette} />
    </svg>
  );
}

/**
 * Rasterise a shape function onto a square grid and trace an ink outline
 * around it. Round things — capsules, gears, nuts — come out even this way,
 * which hand-typed maps rarely do.
 */
export function rasterize(size: number, paint: (x: number, y: number) => string | null): string[] {
  const cells: (string | null)[][] = [];
  for (let y = 0; y < size; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < size; x++) row.push(paint(x + 0.5 - size / 2, y + 0.5 - size / 2));
    cells.push(row);
  }
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && cells[y][x] !== null;
  return cells.map((row, y) =>
    row
      .map((c, x) => {
        if (c === null) return ".";
        const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
        return edge ? "o" : c;
      })
      .join(""),
  );
}

// ── Capsule ────────────────────────────────────────────────────────────
export const CAPSULE_MAP = rasterize(18, (x, y) => {
  if (x * x + y * y > 81) return null;
  if (y > -1 && y < 1) return "o";
  if (y < 0) {
    if (x > -6 && x < -2 && y > -7 && y < -4) return "h";
    if (x > -7 && x < -5 && y > -5 && y < -2) return "h";
    return x > 4 || y > -2.2 ? "s" : "t";
  }
  return x > 3.5 || y > 5.5 ? "g" : "w";
});

export function capsulePalette(top: string, shade: string): Palette {
  return { o: INK, t: top, s: shade, h: "#ffffff", w: "#ffffff", g: "#d9dbe6" };
}

// ── Junk wedged in the prize chute ─────────────────────────────────────
const GEAR_MAP = rasterize(18, (x, y) => {
  const d = Math.hypot(x, y);
  const a = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI / 4);
  const tooth = a > Math.PI / 16 && a < (Math.PI * 3) / 16;
  if (d < 2.4) return null;
  if (d < 6.4) return x + y > 3 ? "b" : "a";
  if (d < 9 && tooth) return "a";
  return null;
});

const NUT_MAP = rasterize(18, (x, y) => {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (Math.hypot(x, y) < 3) return null;
  if (ay > 7.5 || ax > 8.5 || ax * 0.55 + ay > 9.4) return null;
  return y > 2.5 ? "b" : "a";
});

const CELL_MAP = rasterize(18, (x, y) => {
  const ax = Math.abs(x);
  if (y < -8 && ax < 2.5) return "c";
  if (y < -7 || y > 8 || ax > 5.5) return null;
  if (y < -3) return "c";
  return x > 2 ? "b" : "a";
});

export const JUNK: { name: string; map: string[]; palette: Palette }[] = [
  { name: "RUSTY GEAR", map: GEAR_MAP, palette: { o: INK, a: "#b9bcc7", b: "#8b8f9c" } },
  { name: "LOOSE NUT", map: NUT_MAP, palette: { o: INK, a: "#e0a35a", b: "#b0763a" } },
  { name: "DEAD BATTERY", map: CELL_MAP, palette: { o: INK, a: "#6fd38d", b: "#3fa565", c: "#ffcf3a" } },
];

// ── The claw ───────────────────────────────────────────────────────────
export const CLAW_PALETTE: Palette = { o: INK, b: "#afc8f0", h: "#e6efff", t: "#f2d9a0", d: "#8ea9d8" };

export const CLAW_HEAD = [
  "....ooooooo....",
  "..oobbbbbbboo..",
  ".obbhhbbbbbbdo.",
  ".obhbbbbbbbbdo.",
  "obbbbbbbbbbbbdo",
  "ottttttttttttto",
  "ottttttttttttto",
  "ooooooooooooooo",
];

export const CLAW_OPEN = [
  ".......oooo.......oooo.......",
  ".....oobbo.........obboo.....",
  "...oobbo.............obboo...",
  "..obbo.................obbo..",
  ".obbo...................obbo.",
  ".obo.....................obo.",
  ".obo.....................obo.",
  ".obo.....................obo.",
  ".obbo...................obbo.",
  "..obo...................obo..",
  "..oo.....................oo..",
];

export const CLAW_CLOSED = [
  "....oooo.......oooo....",
  "...obbo.........obbo...",
  "..obbo...........obbo..",
  ".obbo.............obbo.",
  ".obo...............obo.",
  ".obo...............obo.",
  ".obo...............obo.",
  ".obo...............obo.",
  ".obbo.............obbo.",
  "..obbo...........obbo..",
  "...obbo.........obbo...",
  "....ooo.........ooo....",
];

// ── King Clawdius, the cat who thinks he runs the machine ──────────────
export type Mood = "happy" | "awake" | "sleep" | "shock" | "sad";

const EYES: Record<Mood, [string, string]> = {
  happy: ["fffffefffffffffeffff", "ffffefefffffffefefff"],
  awake: ["ffffeeffffffffeeffff", "ffffewffffffffewffff"],
  sleep: ["ffffffffffffffffffff", "ffffeeeffffffeeeffff"],
  shock: ["ffffeeeffffffeeeffff", "ffffeweffffffeweffff"],
  sad: ["ffffeffffffffffeffff", "fffffeeffffffeefffff"],
};

const MOUTH: Record<Mood, [string, string]> = {
  happy: ["ffffffffeffeffffffff", "fffffffffeefffffffff"],
  awake: ["ffffffffeffeffffffff", "fffffffffeefffffffff"],
  sleep: ["fffffffffeefffffffff", "ffffffffffffffffffff"],
  shock: ["fffffffffeefffffffff", "fffffffffeefffffffff"],
  sad: ["fffffffffeefffffffff", "ffffffffeffeffffffff"],
};

export function catMap(mood: Mood): string[] {
  const [e1, e2] = EYES[mood];
  const [m1, m2] = MOUTH[mood];
  return [
    ".........y..yy..y.......",
    ".........yy.yy.yy.......",
    ".........yyyyyyyy.......",
    "...oo....yryyyyry...oo..",
    "..offo..oooooooooo.offo.",
    "..ofpfooffffffffffoofpfo",
    "..offfffffdffdfffffffo..",
    "..offfffffdffdfffffffo..",
    ".offffffffffffffffffffo.",
    `.o${e1}o.`,
    `.o${e2}o.`,
    ".offccfffffppfffffccffo.",
    `.o${m1}o.`,
    `.o${m2}o.`,
    ".offffffffffffffffffffo.",
    "..offffffffffffffffffo..",
    "...oooooooooooooooooo...",
  ];
}

export const CAT_PALETTE: Palette = {
  o: INK,
  f: "#e3b5f5",
  d: "#9b6fd1",
  p: "#ff8fb0",
  c: "#ffc1d6",
  e: INK,
  w: "#ffffff",
  y: "#ffcf3a",
  r: "#ee4b3b",
};

// ── Small HUD glyphs ───────────────────────────────────────────────────
export const HEART_MAP = [
  ".oo.oo.",
  "orrorro",
  "orrrrro",
  "orrrrro",
  ".orrro.",
  "..oro..",
  "...o...",
];

export const STAR_MAP = [
  "...o...",
  "..oyo..",
  "oooyooo",
  "oyyyyyo",
  ".oyyyo.",
  "oyyoyyo",
  "ooo.ooo",
];

export const CLOUD_MAP = [
  "........oooo..........",
  "......oowwwwoo........",
  "....oowwwwwwwwo.oooo..",
  "..oowwwwwwwwwwwowwwwo.",
  ".owwwwwwwwwwwwwwwwwwwo",
  "owwwwwwwwwwwwwwwwwwwwo",
  "owwssssswwwwwssssswwwo",
  ".oooooooooooooooooooo.",
];

export const LAUREL_MAP = [
  "......gg.",
  "....ggg..",
  "..gg.g...",
  ".ggg.gg..",
  ".gg.gg...",
  "gg..g.gg.",
  "ggg.gggg.",
  ".gg.gg...",
  "..gggg...",
  "...ggggg.",
  ".....ggg.",
];

// ── Bonus orb, after the time orbs inside the Xuanfang caskets ────────
export const ORB_MAP = rasterize(18, (x, y) => {
  const d = Math.hypot(x, y);
  if (d > 9) return null;
  if (x > -6 && x < -2 && y > -7 && y < -3) return "h";
  if (d < 3.4) return "c";
  if (d < 5.2) return "m";
  return x + y > 5 ? "s" : "t";
});

export const ORB_PALETTE: Palette = { o: INK, t: "#5fe0cf", s: "#2aa99a", m: "#9af3e6", c: "#eafffb", h: "#ffffff" };

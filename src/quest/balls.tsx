import { PixelArt, Sprite, rasterize } from "@/components/pixel";

import { K } from "./art";

// Eight collectible balls. Each is an original two-tone capsule: a patterned
// lid, a base, a band and a button. Rarity only changes how loudly the prize
// reveal celebrates. Every ball, common or legendary, holds exactly one quote.

export type BallId = "classic" | "azure" | "pearl" | "volt" | "dusk" | "noir" | "royal" | "legend";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface BallDef {
  id: BallId;
  name: string;
  rarity: Rarity;
  /** Share of a fresh pile, out of 100. */
  weight: number;
  blurb: string;
  map: string[];
  palette: Record<string, string>;
}

type Paint = (x: number, y: number, d: number) => string | null;

/** The shared body: a circle, a band, a button. `lid` and `base` paint the two halves. */
function capsule(lid: Paint, base: Paint, opt: { band?: string; ring?: string } = {}) {
  return rasterize(18, (x, y) => {
    const d = Math.hypot(x, y);
    if (d > 9) return null;
    if (d < 1.8) return "b";
    if (d < 3.3) return opt.ring ?? "o";
    if (y > -1 && y < 1) return opt.band ?? "o";
    return y < 0 ? lid(x, y, d) : base(x, y, d);
  });
}

const glint: Paint = (x, y) => ((x > -6 && x < -2 && y > -7 && y < -4) || (x > -7 && x < -5 && y > -5 && y < -2) ? "h" : null);
const dome: Paint = (x, y, d) => glint(x, y, d) ?? (x > 4 || y > -2.2 ? "s" : "t");
const cup: Paint = (x, y) => (x > 3.5 || y > 5.5 ? "g" : "w");

const WHITE = { w: "#ffffff", g: "#d9dbe6" };
const pal = (p: Record<string, string>) => ({ o: K, b: "#ffffff", h: "#ffffff", ...WHITE, ...p });

export const BALLS: BallDef[] = [
  {
    id: "classic",
    name: "Classic",
    rarity: "common",
    weight: 24,
    blurb: "Red lid, white base. The one that started it all.",
    map: capsule(dome, cup),
    palette: pal({ t: "#f2616d", s: "#cf4156", h: "#ffc2c8" }),
  },
  {
    id: "azure",
    name: "Azure",
    rarity: "common",
    weight: 20,
    blurb: "Blue lid with two red shoulder stripes.",
    map: capsule((x, y, d) => (Math.abs(x) > 3.4 && Math.abs(x) < 6.4 && y < -2.4 && d < 7.8 ? "r" : x > -3 && x < 0 && y > -8 && y < -6 ? "h" : dome(x, y, d) === "h" ? "t" : dome(x, y, d)), cup),
    palette: pal({ t: "#4f86ea", s: "#3566c6", h: "#b6ccff", r: "#f2616d" }),
  },
  {
    id: "pearl",
    name: "Pearl",
    rarity: "common",
    weight: 16,
    blurb: "All white with a red band.",
    map: capsule((x, y) => (x > 4 || y > -2.2 ? "s" : "t"), cup, { band: "r", ring: "r" }),
    palette: pal({ t: "#ffffff", s: "#dfe2ee", r: "#e8483a" }),
  },
  {
    id: "volt",
    name: "Volt",
    rarity: "uncommon",
    weight: 13,
    blurb: "Black lid with two yellow bars.",
    map: capsule((x, y, d) => (Math.abs(x) > 3.2 && Math.abs(x) < 6 && d < 7.9 ? "y" : glint(x, y, d) ? "h" : x > 4 || y > -2.2 ? "s" : "t"), cup),
    palette: pal({ t: "#45435a", s: "#2c2b3b", h: "#7b7994", y: "#ffd23f" }),
  },
  {
    id: "dusk",
    name: "Dusk",
    rarity: "uncommon",
    weight: 11,
    blurb: "Green lid, orange trim, a base as dark as a cave.",
    map: capsule((x, y, d) => (y > -2.6 ? "a" : dome(x, y, d)), cup),
    palette: pal({ t: "#35a868", s: "#1f7a4a", h: "#a8f0c8", a: "#ff8a3c", w: "#45435a", g: "#2c2b3b", b: "#ffd9a8" }),
  },
  {
    id: "noir",
    name: "Noir",
    rarity: "rare",
    weight: 7,
    blurb: "Black on black with a gold band. Very fancy.",
    map: capsule((x, y, d) => (y > -2.4 ? "r" : dome(x, y, d)), cup, { band: "d", ring: "d" }),
    palette: pal({ t: "#45435a", s: "#2c2b3b", h: "#8a88a4", w: "#3a3849", g: "#262532", d: "#f0bd3a", r: "#d93a4a", b: "#fff3ae" }),
  },
  {
    id: "royal",
    name: "Royal",
    rarity: "rare",
    weight: 6,
    blurb: "Purple lid with two pink studs and a white gem.",
    map: capsule(
      (x, y, d) => (Math.hypot(Math.abs(x) - 4.6, y + 4.6) < 1.9 ? "p" : Math.abs(x) + Math.abs(y + 6.2) < 1.6 ? "h" : x > 4.5 || y > -2.2 ? "s" : d > 0 ? "t" : null),
      cup,
    ),
    palette: pal({ t: "#9566e0", s: "#7045c0", p: "#ff9ccd" }),
  },
  {
    id: "legend",
    name: "Legend",
    rarity: "legendary",
    weight: 3,
    blurb: "Solid gold with a star. It glows. You will know it when you see it.",
    map: capsule((x, y, d) => (Math.abs(x) < ({ "-7.5": 1, "-6.5": 2, "-5.5": 4, "-4.5": 2, "-3.5": 1 }[String(y)] ?? 0) ? "h" : x > 4.5 || y > -2 ? "s" : d > 7.4 && x < 0 ? "l" : "t"), cup),
    palette: pal({ t: "#ffcf3a", s: "#e8a21e", l: "#fff0a8", h: "#fffbe6", w: "#fff3c4", g: "#f1d58a", b: "#fffbe6" }),
  },
];

const BY_ID = new Map(BALLS.map((b) => [b.id, b]));
export const ballById = (id: BallId) => BY_ID.get(id) ?? BALLS[0];
export const isBallId = (id: unknown): id is BallId => typeof id === "string" && BY_ID.has(id as BallId);

export const RARITY_LABEL: Record<Rarity, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary" };

/** A fresh pile: weighted at random, and a full load always hides exactly one Legend. */
export function rollBalls(count: number, rand: () => number = Math.random): BallId[] {
  const pool = BALLS.filter((b) => b.id !== "legend");
  const total = pool.reduce((n, b) => n + b.weight, 0);
  const out: BallId[] = [];
  for (let i = 0; i < count; i++) {
    let roll = rand() * total;
    let pick = pool[0];
    for (const b of pool) {
      roll -= b.weight;
      if (roll <= 0) {
        pick = b;
        break;
      }
    }
    out.push(pick.id);
  }
  // A big load is guaranteed its Legend; a small top-up only sometimes gets one.
  if (count >= 20 || rand() < 0.3) out[Math.floor(rand() * out.length)] = "legend";
  return out;
}

/** A ball as its own inline SVG, for cards, the dex and the prize reveal. */
export function BallArt({ id, px = 3, half, className, style }: { id: BallId; px?: number; half?: "lid" | "cup"; className?: string; style?: React.CSSProperties }) {
  const b = ballById(id);
  const map = half === "lid" ? b.map.slice(0, 9) : half === "cup" ? b.map.slice(9) : b.map;
  return <PixelArt map={map} palette={b.palette} px={px} className={className} style={style} />;
}

/** A ball as an SVG group, for inside the machine. */
export function BallSprite({ id }: { id: BallId }) {
  const b = ballById(id);
  return <Sprite map={b.map} palette={b.palette} />;
}

/** The dark outline of a ball nobody has found yet. */
const SHADOW: Record<string, string> = { o: "#4a4770", t: "#4a4770", s: "#4a4770", h: "#4a4770", w: "#4a4770", g: "#4a4770", b: "#6a6792", r: "#4a4770", y: "#4a4770", a: "#4a4770", d: "#4a4770", p: "#4a4770", l: "#4a4770" };
export function BallShadow({ px = 3, className }: { px?: number; className?: string }) {
  return <PixelArt map={BALLS[0].map} palette={SHADOW} px={px} className={className} />;
}

"use client";

import { useEffect, useRef } from "react";

// The backdrop is generated, not drawn: a low-resolution canvas painted from
// a palette and a seed, then scaled up by a whole number so every pixel stays
// square. Layers follow the usual parallax recipe — a dithered sky, pale far
// mountains, darker hills, a town skyline, then the ground — with the far
// layers kept low-contrast so the cabinet in front stays the loudest thing.

export interface Scene {
  seed: number;
  /** Sky colours from the top of the screen down to the horizon. */
  sky: string[];
  stars?: boolean;
  sun: { x: number; y: number; r: number; color: string; glow: string; crescent?: boolean };
  cloud: string;
  cloudLo: string;
  far: string;
  farHi: string;
  mid: string;
  midLo: string;
  town: string;
  townHi: string;
  window: string;
  lamp: string;
  /** How likely each kind of building is on this skyline. */
  mix: { house: number; pagoda: number; tower: number };
  grassHi: string;
  grass: string;
  soil: string;
  soilLo: string;
  tree: string;
  treeHi: string;
}

export const SCENES: Record<string, Scene> = {
  // CH 01 — a clear arcade afternoon.
  play: {
    seed: 11,
    sky: ["#6fa4ff", "#8ab8ff", "#a9c8ff", "#c8ddff", "#e6f0ff"],
    sun: { x: 0.615, y: 0.075, r: 8, color: "#fff6c2", glow: "#dff0ff" },
    cloud: "#ffffff",
    cloudLo: "#d5e6ff",
    far: "#b3c6ef",
    farHi: "#f4f8ff",
    mid: "#86b7a4",
    midLo: "#6b9f8c",
    town: "#5f7fae",
    townHi: "#8aa6cf",
    window: "#ffeaa0",
    lamp: "#ff5d8f",
    mix: { house: 5, pagoda: 1, tower: 2 },
    grassHi: "#5fd47d",
    grass: "#2f9e4f",
    soil: "#9a6233",
    soilLo: "#7d4d26",
    tree: "#2c8a48",
    treeHi: "#55c873",
  },
  // CH 02 — sunset over the Xuanfang rooftops.
  luck: {
    seed: 23,
    sky: ["#2f2360", "#6a3378", "#b8456f", "#f0734c", "#ffb04a", "#ffe08a"],
    sun: { x: 0.957, y: 0.5, r: 13, color: "#fff0a8", glow: "#ffc76a" },
    cloud: "#ffb98a",
    cloudLo: "#d9707a",
    far: "#8a4f84",
    farHi: "#d98a8a",
    mid: "#5c2f60",
    midLo: "#472250",
    town: "#2c1636",
    townHi: "#6b3a52",
    window: "#ffd15a",
    lamp: "#ff4a3a",
    mix: { house: 2, pagoda: 6, tower: 0 },
    grassHi: "#9fb84a",
    grass: "#5f7a2c",
    soil: "#5a3520",
    soilLo: "#432515",
    tree: "#4a2a4a",
    treeHi: "#8a4a5a",
  },
  // CH 03 — first light, try again.
  grit: {
    seed: 37,
    sky: ["#3fb7b0", "#72d6c4", "#a8ecd4", "#dcf7dc", "#fff6d0"],
    sun: { x: 0.043, y: 0.36, r: 11, color: "#ffffff", glow: "#fff3b8" },
    cloud: "#ffffff",
    cloudLo: "#c5f0e2",
    far: "#8fd2b8",
    farHi: "#e8fff2",
    mid: "#4fa77b",
    midLo: "#3d8f66",
    town: "#2a7560",
    townHi: "#57a88c",
    window: "#fff1a8",
    lamp: "#ff5d8f",
    mix: { house: 6, pagoda: 1, tower: 1 },
    grassHi: "#8fe86a",
    grass: "#3fb04a",
    soil: "#8a5a30",
    soilLo: "#6e4423",
    tree: "#1f7a4a",
    treeHi: "#4fc27a",
  },
  // CH 04 — the workshop at golden hour.
  make: {
    seed: 51,
    sky: ["#f08a4a", "#f7a85a", "#ffc878", "#ffe2a0", "#fff3cf"],
    sun: { x: 0.957, y: 0.3, r: 12, color: "#fffbe0", glow: "#ffe08a" },
    cloud: "#fff3d6",
    cloudLo: "#f2b77a",
    far: "#dc9a68",
    farHi: "#ffe1b0",
    mid: "#b57242",
    midLo: "#9a5c33",
    town: "#6f3f25",
    townHi: "#a8683f",
    window: "#fff0a0",
    lamp: "#ff8a2a",
    mix: { house: 5, pagoda: 0, tower: 3 },
    grassHi: "#c7d95a",
    grass: "#8ea83a",
    soil: "#7a4a26",
    soilLo: "#5e371a",
    tree: "#6b7a2a",
    treeHi: "#a8bf4a",
  },
  // CH 05 — transmitter towers after dark.
  signal: {
    seed: 67,
    sky: ["#0b0c2a", "#141442", "#25205f", "#40297f", "#6a3aa0"],
    stars: true,
    sun: { x: 0.615, y: 0.075, r: 7, color: "#f3f0ff", glow: "#3a3486", crescent: true },
    cloud: "#3a3486",
    cloudLo: "#2a2568",
    far: "#2c2f70",
    farHi: "#5a55b8",
    mid: "#1d2052",
    midLo: "#151741",
    town: "#0d0e2c",
    townHi: "#2a2a66",
    window: "#4fd6ff",
    lamp: "#ff2f86",
    mix: { house: 3, pagoda: 0, tower: 6 },
    grassHi: "#2f9a8a",
    grass: "#1c5f58",
    soil: "#2a1f3a",
    soilLo: "#1c1429",
    tree: "#123f4a",
    treeHi: "#2a8f8a",
  },
};

const PX = 4;
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const INK = "#1b1b1f";

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1-D noise: random heights every `step` pixels, eased between. */
function ridge(rand: () => number, width: number, step: number) {
  const knots = Array.from({ length: Math.ceil(width / step) + 2 }, () => rand());
  return (x: number) => {
    const i = Math.floor(x / step);
    const f = x / step - i;
    const e = f * f * (3 - 2 * f);
    return knots[i] * (1 - e) + knots[i + 1] * e;
  };
}

interface Cloud {
  x: number;
  y: number;
  puffs: [number, number, number][];
}

function makeClouds(rand: () => number, w: number, h: number): Cloud[] {
  const n = Math.max(3, Math.round(w / 70));
  return Array.from({ length: n }, (_, i) => {
    const count = 3 + Math.floor(rand() * 3);
    const puffs: [number, number, number][] = [];
    let dx = 0;
    for (let k = 0; k < count; k++) {
      const r = 3 + Math.floor(rand() * 5);
      puffs.push([dx, -Math.floor(rand() * 3), r]);
      dx += r + 1 + Math.floor(rand() * 3);
    }
    return { x: ((i + rand() * 0.8) / n) * w, y: Math.floor(h * (0.07 + rand() * 0.3)), puffs };
  });
}

function drawClouds(g: CanvasRenderingContext2D, clouds: Cloud[], w: number, drift: number, s: Scene) {
  for (const c of clouds) {
    const span = w + 60;
    const cx = Math.floor(((c.x + drift) % span) - 30);
    for (const [dx, dy, r] of c.puffs) {
      for (let y = -r; y <= 0; y++) {
        const half = Math.floor(Math.sqrt(r * r - y * y));
        g.fillStyle = y >= -1 ? s.cloudLo : s.cloud;
        g.fillRect(cx + dx - half, c.y + dy + y, half * 2 + 1, 1);
      }
    }
  }
}

/** Sky, sun or moon, and stars: everything that sits behind the clouds. */
function paintSky(g: CanvasRenderingContext2D, w: number, h: number, s: Scene, rand: () => number) {
  const horizon = Math.round(h * 0.74);
  const last = s.sky.length - 1;
  for (let y = 0; y < h; y++) {
    const t = Math.min(1, y / horizon) * last;
    const i = Math.min(last - 1, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < w; x++) {
      g.fillStyle = f > (BAYER[y & 3][x & 3] + 0.5) / 16 ? s.sky[i + 1] : s.sky[i];
      g.fillRect(x, y, 1, 1);
    }
  }

  if (s.stars) {
    for (let i = 0; i < Math.round((w * h) / 260); i++) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * horizon * 0.8);
      g.fillStyle = rand() > 0.75 ? "#ffffff" : "#9fa8ff";
      g.fillRect(x, y, 1, 1);
      if (rand() > 0.93) {
        g.fillRect(x - 1, y, 3, 1);
        g.fillRect(x, y - 1, 1, 3);
      }
    }
  }

  const cx = Math.round(w * s.sun.x);
  const cy = Math.round(h * s.sun.y);
  const r = s.sun.r;
  for (let y = -r - 7; y <= r + 7; y++) {
    for (let x = -r - 7; x <= r + 7; x++) {
      const d = Math.hypot(x, y);
      const px = cx + x;
      const py = cy + y;
      if (d <= r) {
        const bitten = s.sun.crescent && Math.hypot(x - r * 0.55, y + r * 0.35) < r * 0.9;
        if (!bitten) {
          g.fillStyle = s.sun.color;
          g.fillRect(px, py, 1, 1);
        }
      } else if (d <= r + 7) {
        // A dithered halo: dense near the disc, thinning outward.
        const density = 1 - (d - r) / 7;
        if (density * 0.8 > (BAYER[py & 3][px & 3] + 0.5) / 16) {
          g.fillStyle = s.sun.glow;
          g.fillRect(px, py, 1, 1);
        }
      }
    }
  }
}

/** Mountains, hills, the town and the ground, on a transparent canvas. */
function paintLand(g: CanvasRenderingContext2D, w: number, h: number, s: Scene, rand: () => number) {
  const horizon = Math.round(h * 0.74);
  const ground = h - Math.max(14, Math.round(h * 0.075));
  const hazeTo = s.sky[s.sky.length - 1];

  // Far mountains: tall, pale, with a lit cap and haze at the foot.
  const farA = ridge(rand, w, 46);
  const farB = ridge(rand, w, 13);
  const farMax = h * 0.3;
  for (let x = 0; x < w; x++) {
    const hgt = Math.round(farMax * (0.35 + 0.5 * farA(x) + 0.15 * farB(x)));
    const top = horizon - hgt;
    for (let y = top; y < ground; y++) {
      const depth = y - top;
      const capped = hgt > farMax * 0.6 && depth < 3 + Math.round(farB(x + 7) * 4);
      const fade = (y - (horizon - 12)) / 14;
      const hazy = fade > 0 && fade > (BAYER[y & 3][x & 3] + 0.5) / 16;
      g.fillStyle = hazy ? hazeTo : capped ? s.farHi : s.far;
      g.fillRect(x, y, 1, 1);
    }
  }

  // Mid hills: lower and darker, with a bumpy tree line.
  const midA = ridge(rand, w, 30);
  const midB = ridge(rand, w, 5);
  for (let x = 0; x < w; x++) {
    const hgt = Math.round(h * 0.14 * (0.35 + 0.65 * midA(x)) + midB(x) * 3);
    const top = horizon + 8 - hgt;
    for (let y = top; y < ground; y++) {
      const shade = (y - top) / 22 > (BAYER[y & 3][x & 3] + 0.5) / 16;
      g.fillStyle = shade ? s.midLo : s.mid;
      g.fillRect(x, y, 1, 1);
    }
  }

  // Town skyline, built left to right.
  const total = s.mix.house + s.mix.pagoda + s.mix.tower;
  let x = -4 - Math.floor(rand() * 6);
  while (x < w + 4) {
    const pick = rand() * total;
    const kind = pick < s.mix.house ? "house" : pick < s.mix.house + s.mix.pagoda ? "pagoda" : "tower";
    if (kind === "house") {
      const bw = 9 + Math.floor(rand() * 9);
      const bh = 7 + Math.floor(rand() * 9);
      g.fillStyle = s.town;
      g.fillRect(x, ground - bh, bw, bh);
      const peak = Math.min(6, Math.floor(bw / 2));
      for (let r = 0; r < peak; r++) g.fillRect(x - 1 + r, ground - bh - 1 - r, bw + 2 - r * 2, 1);
      g.fillStyle = s.townHi;
      g.fillRect(x - 1, ground - bh - 1, bw + 2, 1);
      for (let wy = ground - bh + 3; wy < ground - 3; wy += 4) {
        for (let wx = x + 2; wx < x + bw - 2; wx += 4) {
          if (rand() > 0.45) {
            g.fillStyle = s.window;
            g.fillRect(wx, wy, 2, 2);
          }
        }
      }
      x += bw + Math.floor(rand() * 5);
    } else if (kind === "pagoda") {
      const tiers = 2 + Math.floor(rand() * 2);
      let bw = 13 + Math.floor(rand() * 6);
      let y = ground;
      const left = x;
      for (let t = 0; t < tiers; t++) {
        const th = 6 + Math.floor(rand() * 3);
        const inset = t * 2;
        g.fillStyle = s.town;
        g.fillRect(left + inset, y - th, bw, th);
        if (rand() > 0.3) {
          g.fillStyle = s.window;
          g.fillRect(left + inset + Math.floor(bw / 2) - 1, y - th + 2, 2, 3);
        }
        // Tiled roof with upturned eaves.
        g.fillStyle = s.town;
        g.fillRect(left + inset - 3, y - th - 2, bw + 6, 2);
        g.fillRect(left + inset - 4, y - th - 3, 2, 1);
        g.fillRect(left + inset + bw + 2, y - th - 3, 2, 1);
        g.fillStyle = s.townHi;
        g.fillRect(left + inset - 3, y - th - 2, bw + 6, 1);
        if (t === 0) {
          g.fillStyle = s.lamp;
          g.fillRect(left - 3, y - th, 2, 3);
          g.fillRect(left + bw + 1, y - th, 2, 3);
        }
        y -= th + 2;
        bw -= 4;
      }
      g.fillStyle = s.town;
      g.fillRect(left + (tiers - 1) * 2 + Math.floor((bw + 4) / 2), y - 4, 1, 4);
      x += 18 + tiers * 2 + Math.floor(rand() * 7);
    } else {
      const bw = 5 + Math.floor(rand() * 4);
      const bh = 20 + Math.floor(rand() * 18);
      g.fillStyle = s.town;
      g.fillRect(x, ground - bh, bw, bh);
      g.fillRect(x + Math.floor(bw / 2), ground - bh - 7, 1, 7);
      g.fillStyle = s.lamp;
      g.fillRect(x + Math.floor(bw / 2), ground - bh - 8, 1, 1);
      g.fillStyle = s.townHi;
      g.fillRect(x, ground - bh, 1, bh);
      for (let wy = ground - bh + 3; wy < ground - 3; wy += 4) {
        if (rand() > 0.35) {
          g.fillStyle = s.window;
          g.fillRect(x + 2, wy, bw - 3, 2);
        }
      }
      x += bw + 2 + Math.floor(rand() * 6);
    }
  }

  // Trees in front of the town.
  for (let i = 0; i < Math.round(w / 34); i++) {
    const tx = Math.floor(rand() * w);
    const r = 4 + Math.floor(rand() * 4);
    g.fillStyle = s.soilLo;
    g.fillRect(tx, ground - 5, 2, 5);
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      g.fillStyle = s.tree;
      g.fillRect(tx + 1 - half, ground - 5 - r + y, half * 2, 1);
      if (y < 0 && half > 1) {
        g.fillStyle = s.treeHi;
        g.fillRect(tx + 1 - half, ground - 5 - r + y, Math.max(1, half - 1), 1);
      }
    }
  }

  // Ground: an ink line, a lit lip of grass with tufts, then speckled soil.
  g.fillStyle = INK;
  g.fillRect(0, ground - 1, w, 1);
  g.fillStyle = s.grassHi;
  g.fillRect(0, ground, w, 2);
  g.fillStyle = s.grass;
  g.fillRect(0, ground + 2, w, 3);
  for (let gx = 0; gx < w; gx += 2) {
    if (rand() > 0.5) {
      g.fillStyle = s.grassHi;
      g.fillRect(gx, ground - 2, 1, 1);
      g.fillStyle = s.grass;
      g.fillRect(gx, ground + 5, 1, 1 + Math.floor(rand() * 2));
    }
  }
  g.fillStyle = s.soil;
  g.fillRect(0, ground + 5, w, h - ground - 5);
  for (let i = 0; i < w * 0.6; i++) {
    g.fillStyle = s.soilLo;
    g.fillRect(Math.floor(rand() * w), ground + 7 + Math.floor(rand() * (h - ground - 7)), 2, 1);
  }
}

export function Backdrop({ scene }: { scene: Scene }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;

    let sky: HTMLCanvasElement | null = null;
    let land: HTMLCanvasElement | null = null;
    let clouds: Cloud[] = [];
    let w = 0;
    let h = 0;
    let drift = 0;

    const compose = () => {
      if (!sky || !land) return;
      g.drawImage(sky, 0, 0);
      drawClouds(g, clouds, w, drift, scene);
      g.drawImage(land, 0, 0);
    };

    const build = () => {
      w = Math.ceil(window.innerWidth / PX);
      h = Math.ceil(window.innerHeight / PX);
      cv.width = w;
      cv.height = h;
      cv.style.width = `${w * PX}px`;
      cv.style.height = `${h * PX}px`;
      const layer = () => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
      };
      sky = layer();
      land = layer();
      // Each layer gets its own generator, so the land does not reshuffle
      // when only the width changes how many stars were drawn.
      paintSky(sky.getContext("2d")!, w, h, scene, mulberry(scene.seed));
      paintLand(land.getContext("2d")!, w, h, scene, mulberry(scene.seed * 7 + 1));
      clouds = makeClouds(mulberry(scene.seed * 13 + 5), w, h);
      compose();
    };

    build();
    window.addEventListener("resize", build);

    // Clouds creep one pixel at a time; nothing else moves.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = still
      ? 0
      : window.setInterval(() => {
          drift += 1;
          compose();
        }, 700);

    return () => {
      window.removeEventListener("resize", build);
      if (timer) window.clearInterval(timer);
    };
  }, [scene]);

  return <canvas ref={ref} className="backdrop pixelated pointer-events-none fixed top-0 left-0 -z-10" aria-hidden="true" />;
}

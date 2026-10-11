"use client";

import { useEffect, useRef } from "react";

import { Card, CardContent } from "@/components/ui/8bit/card";

import { Art, icon } from "./art";
import { CARD_STYLES, cardVars } from "./cards";
import { songName } from "./music";
import { WorldThumb } from "./scenery";
import { WORLDS, type World, type WorldId } from "./worlds";

// Changing world plays a wipe, and each world brings its own: the one you are
// going to closes over the one you are leaving, names itself, and opens again.
//   Dreamland       two banks of cloud roll in from the sides
//   Mushroom Hills  a sky-blue iris closes to a point, the way a platformer ends a level
//   Cosmic Arcade   the screen dissolves to space while star streaks stretch outward
//   Neon Circuit    a checkered flag sweeps across corner to corner
//   Dungeon Quest   a portcullis of stone drops from the top
// Each is drawn on a 160 x 90 canvas and scaled up, so its edges are as chunky
// as everything else on screen.

export type WipeStage = "in" | "hold" | "out";
// Unhurried: about a second to close, long enough on the card to read it, a second to open.
export const WIPE_IN = 900;
export const WIPE_HOLD = 1700;
export const WIPE_OUT = 900;

const GW = 160;
const GH = 90;
const { sqrt, max, min, floor, round, cos, sin, hypot } = Math;

type G = CanvasRenderingContext2D;
/** Draw the wipe at coverage `p`: 0 is nothing, 1 is the whole screen hidden. */
type Draw = (g: G, p: number) => void;

const box = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(round(x), round(y), round(w), round(h));
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x: number, y: number, share: number) => share * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5;

const clouds: Draw = (g, p) => {
  const reach = p * (GW / 2 + 14);
  // A scalloped edge: one puff every 18 rows, the two banks half a puff out of step.
  const edge = (y: number, side: number) => {
    const v = ((y + side * 9) % 18) - 9;
    return max(0, reach - 12 + sqrt(max(0, 81 - v * v)) * 1.3);
  };
  for (let y = 0; y < GH; y++) {
    const [left, right] = [edge(y, 0), edge(y, 1)];
    // Where the banks have met there is only cloud: no edge, so no seam down the middle.
    if (left + right >= GW) {
      box(g, 0, y, GW, 1, "#fff8fc");
      continue;
    }
    for (const [side, e] of [
      [0, left],
      [1, right],
    ]) {
      if (e <= 0) continue;
      const at = (from: number, w: number, c: string) => box(g, side ? GW - from - w : from, y, w, 1, c);
      at(0, e, "#fff8fc");
      at(max(0, e - 5), min(5, e), "#ffd0e4");
      at(max(0, e - 1), 1, "#c9619a");
    }
  }
};

const iris: Draw = (g, p) => {
  const r = (1 - p) * (hypot(GW, GH) / 2 + 2);
  for (let y = 0; y < GH; y++) {
    const dy = y + 0.5 - GH / 2;
    const half = r > Math.abs(dy) ? sqrt(r * r - dy * dy) : 0;
    // The field is the world's own sky blue, so the dark card stands clear of it.
    box(g, 0, y, GW / 2 - half, 1, "#2f7fd8");
    box(g, GW / 2 + half, y, GW / 2 - half + 1, 1, "#2f7fd8");
    // A gold rim on the hole.
    if (half > 0 && r > 3) {
      box(g, GW / 2 - half, y, 2, 1, "#ffc93a");
      box(g, GW / 2 + half - 2, y, 2, 1, "#ffc93a");
    }
  }
};

const RAYS = Array.from({ length: 56 }, (_, i) => ({ a: (i / 56) * Math.PI * 2 + ((i * 7) % 5) * 0.03, from: 6 + ((i * 13) % 17), c: ["#ffffff", "#4fd6ff", "#c4f3ff", "#ff4fa8", "#9a6bff"][i % 5] }));
const warp: Draw = (g, p) => {
  // The dark arrives as an ordered dither, so it is a pixel dissolve and not a fade.
  g.fillStyle = "#0c0b28";
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (dither(x, y, p * 1.05)) g.fillRect(x, y, 1, 1);
  for (const ray of RAYS) {
    const len = p * p * 70;
    for (let d = ray.from; d < ray.from + len; d++) box(g, GW / 2 + cos(ray.a) * d * 1.5, GH / 2 + sin(ray.a) * d, 1, 1, ray.c);
  }
};

const flag: Draw = (g, p) => {
  const cell = 10;
  const [cols, rows] = [GW / cell, GH / cell];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Each square grows from its middle, a little later the further along the diagonal it is.
      const k = min(1, max(0, (p - ((c + r) / (cols + rows)) * 0.7) / 0.3));
      if (k <= 0) continue;
      const size = max(2, round(cell * k));
      box(g, c * cell + (cell - size) / 2, r * cell + (cell - size) / 2, size, size, (c + r) % 2 ? "#17161f" : "#f4f1ff");
    }
  }
};

const gate: Draw = (g, p) => {
  const bottom = round(p * (GH + 10));
  if (bottom <= 0) return;
  const wall = bottom - 7;
  for (let y = 0; y < wall; y++) {
    // Rows of stone hang from the bottom edge of the gate, so they travel with it.
    const row = floor((wall - 1 - y) / 10);
    const inRow = (wall - 1 - y) % 10;
    box(g, 0, y, GW, 1, inRow === 0 ? "#14122e" : inRow === 9 ? "#5a5470" : "#3a3450");
    if (inRow !== 0) for (let x = row % 2 ? 10 : 0; x < GW; x += 20) box(g, x, y, 1, 1, "#14122e");
  }
  // Iron teeth along the bottom.
  for (let x = 0; x < GW; x += 10) {
    for (let i = 0; i < 7; i++) {
      const w = 8 - i;
      if (wall + i >= 0) box(g, x + 1 + i / 2, wall + i, w, 1, i === 0 ? "#14122e" : i < 3 ? "#b0acc0" : "#8a8598");
    }
  }
};

const DRAW: Record<WorldId, Draw> = { dream: clouds, mushroom: iris, cosmic: warp, racing: flag, dungeon: gate };

/** `at` pins the wipe at one coverage, for showing a still of it. */
export function WorldWipe({ world, stage, at }: { world: WorldId; stage: WipeStage; at?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext("2d");
    if (!g) return;
    const draw = DRAW[world];
    const started = performance.now();
    const length = stage === "in" ? WIPE_IN : WIPE_OUT;
    let raf = 0;
    const frame = (now: number) => {
      const t = stage === "hold" || at !== undefined ? 1 : min(1, (now - started) / length);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      g.clearRect(0, 0, GW, GH);
      draw(g, at ?? (stage === "out" ? 1 - eased : stage === "in" ? eased : 1));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    // Draw once straight away: a covered screen must never have to wait for a frame.
    frame(started);
    return () => cancelAnimationFrame(raf);
  }, [world, stage, at]);
  return <canvas ref={ref} width={GW} height={GH} className="qq-wipe-canvas" />;
}

/**
 * The stage card shown while the screen is covered: which world this is, a picture of it, what
 * it is like and what is playing. It is that world's own quote card (same frame, same trims),
 * standing on a dark plate with a white edge, so it reads against any of the wipes.
 */
export function WorldIntro({ world }: { world: World }) {
  const at = WORLDS.findIndex((w) => w.id === world.id);
  return (
    <div className="qq-show-inner qq-intro" data-card={world.id} style={cardVars(CARD_STYLES[world.id])}>
      <Card font="normal" className="qq-show-card w-full gap-0 py-0">
        <CardContent className="qq-card relative p-0">
          <header className="qq-card-bar retro">
            <span className="flex items-center gap-2.5">
              <i className="qq-led" />
              NOW ENTERING
            </span>
            <span>
              WORLD {world.stage}/{WORLDS.length}
            </span>
          </header>
          <div className="qq-card-body qq-intro-body">
            {(["tl", "tr", "bl", "br"] as const).map((c) => (
              <i key={c} className={`qq-corner qq-corner-${c}`} />
            ))}
            <span className="qq-intro-thumb">
              <WorldThumb world={world.id} px={4} />
            </span>
            <div className="qq-intro-text">
              <p className="qq-intro-name retro">{world.name.toUpperCase()}</p>
              <p className="qq-copy qq-intro-tag">{world.tag}</p>
              {/* Where you are among the five worlds. */}
              <p className="qq-intro-pips">
                {WORLDS.map((w, i) => (
                  <i key={w.id} data-on={i === at} />
                ))}
              </p>
            </div>
          </div>
          <footer className="qq-card-foot retro">
            <Art sprite={icon("note")} px={2} />
            {songName(world.id).toUpperCase()}
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}

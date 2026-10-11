"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { CLAW_CLOSED, CLAW_HEAD, CLAW_OPEN, Sprite, rasterize } from "@/components/pixel";
import { type Body, WORLD } from "@/lib/physics";
import { sfx } from "@/lib/sound";

import { K } from "./art";
import { type BallId, BallSprite } from "./balls";
import { type ClawEvent, type Sim, advance, clampX, createSim, grab, nudge, seekTo, sight } from "./claw";
import type { Look } from "./worlds";

// The inside of the glass: a physics pile of balls and a claw. You steer
// freely, drop, and carry a ball to the chute. Whatever lands there is the prize.
// The machine itself (what moves, and when) is in claw.ts; this file draws it, turns
// keys, taps and the buttons into input for it, and gives its events their sounds.

export interface MachineHandle {
  hold: (side: "left" | "right", on: boolean) => void;
  pick: () => void;
}

interface MachineProps {
  /** True while the prize reveal or a quote is on screen. */
  locked: boolean;
  onWin: (ball: BallId) => void;
  onBusy: (busy: boolean) => void;
  onMiss: () => void;
  /** Which way the claw is travelling right now: -1, 0 or 1. The mascot watches it. */
  onSteer: (dir: number) => void;
  /** Rail, claw and floor colours for the current world. */
  look: Look;
}

type Ball = Body & { ball: BallId };

interface View {
  cx: number;
  cy: number;
  open: boolean;
  held: Ball | null;
  bodies: Ball[];
  /** The ball the claw would take if it dropped right now, and how far down that is. */
  aim: number | null;
  aimY: number;
}

function snapshot(sim: Sim, locked: boolean): View {
  const wear = (b: Body): Ball => ({ ...b, ball: sim.skin.get(b.id) ?? "classic" });
  const aiming = sim.claw.phase === "idle" && !locked ? sight(sim) : null;
  return {
    cx: Math.round(sim.claw.x),
    cy: Math.round(sim.claw.y),
    open: sim.claw.open,
    held: sim.claw.held ? wear(sim.claw.held) : null,
    bodies: sim.bodies.filter((b) => !b.held).map(wear),
    aim: aiming?.target?.id ?? null,
    aimY: aiming ? Math.round(aiming.y) : 0,
  };
}

const RIM_MAP = rasterize(20, (x, y) => (x * x + y * y <= 100 ? "r" : null));

// The word on the sign, as pixels. A font at this size turns the Z into a 2.
const LETTERS: Record<string, string[]> = {
  P: ["###.", "#..#", "###.", "#...", "#..."],
  R: ["###.", "#..#", "###.", "#.#.", "#..#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  Z: ["####", "...#", ".##.", "#...", "####"],
  E: ["####", "#...", "###.", "#...", "####"],
};
const PRIZE_MAP = [0, 1, 2, 3, 4].map((row) => [..."PRIZE"].map((c) => LETTERS[c][row]).join("."));
const ARROW_MAP = ["...oooooo...", "...ossssо...".replace("о", "o"), "...osssso...", "oooossssoooo", "osssssssssso", ".osssssssso.", "..osssssso..", "...osssso...", "....osso....", ".....oo....."];
const CHEVRON_MAP = ["s...s", ".s.s.", "..s.."];

export const QuestMachine = forwardRef<MachineHandle, MachineProps>(function QuestMachine({ locked, onWin, onBusy, onMiss, onSteer, look }, ref) {
  const [boot] = useState(() => {
    const sim = createSim();
    return { sim, view: snapshot(sim, false) };
  });
  const simRef = useRef<Sim>(boot.sim);
  const [view, setView] = useState<View>(boot.view);

  const live = useRef({ locked, onWin, onBusy, onMiss, onSteer });
  useEffect(() => {
    live.current = { locked, onWin, onBusy, onMiss, onSteer };
  });
  const paint = useCallback(() => setView(snapshot(simRef.current, live.current.locked)), []);
  // Locking and unlocking changes whether the aim guide shows.
  useEffect(() => {
    const id = window.setTimeout(paint, 0);
    return () => window.clearTimeout(id);
  }, [locked, paint]);

  const headPal = useMemo(() => ({ o: K, ...look.head }), [look]);
  const prongPal = useMemo(() => ({ o: K, b: look.prong }), [look]);
  const rimPal = useMemo(() => (look.rim ? { o: look.rim, r: look.rim } : null), [look]);
  const signPal = useMemo(() => ({ "#": look.signInk, o: K, s: look.sign }), [look]);

  /** What the machine reports as it runs, turned into sound and passed up to the game. */
  const emit = useCallback((event: ClawEvent, ball?: BallId) => {
    if (event === "move") sfx.move();
    else if (event === "descend") sfx.descend();
    else if (event === "grab") sfx.grab();
    else if (event === "release") sfx.drop();
    else if (event === "miss") {
      sfx.miss();
      live.current.onMiss();
    } else if (event === "prize") {
      sfx.clunk();
      live.current.onWin(ball ?? "classic");
    }
  }, []);

  const pick = useCallback(() => {
    if (!live.current.locked) grab(simRef.current, emit);
  }, [emit]);

  const hold = useCallback(
    (side: "left" | "right", on: boolean) => {
      const sim = simRef.current;
      // A tap still moves the claw a fixed step, so it works without holding.
      if (on && !sim.keys[side] && !live.current.locked && nudge(sim, side, emit)) paint();
      sim.keys[side] = on;
    },
    [emit, paint],
  );

  useImperativeHandle(ref, () => ({ hold, pick }), [hold, pick]);

  // Tap or drag on the glass and the claw slides over to that spot.
  const seek = (e: React.PointerEvent<SVGSVGElement>) => {
    if (live.current.locked) return;
    const r = e.currentTarget.getBoundingClientRect();
    seekTo(simRef.current, ((e.clientX - r.left) / r.width) * WORLD.w);
  };

  // Arrows or A/D steer; Space, Enter or Down drops the claw.
  useEffect(() => {
    const side = (k: string) => (k === "ArrowLeft" || k === "a" || k === "A" ? "left" : k === "ArrowRight" || k === "d" || k === "D" ? "right" : null);
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest("[role=dialog]"));
    const down = (e: KeyboardEvent) => {
      if (live.current.locked || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const s = side(e.key);
      if (s) {
        if (!e.repeat) hold(s, true);
        e.preventDefault();
      } else if ((e.key === " " || e.key === "ArrowDown" || e.key === "Enter") && !e.repeat && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        pick();
      }
    };
    const up = (e: KeyboardEvent) => {
      const s = side(e.key);
      if (s) simRef.current.keys[s] = false;
    };
    const blur = () => {
      simRef.current.keys.left = false;
      simRef.current.keys.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [hold, pick]);

  useEffect(() => {
    const sim = simRef.current;
    let raf = 0;
    let wasBusy = false;
    let wasDir = 0;

    const tick = () => {
      const c = sim.claw;
      const L = live.current;
      const fromX = c.x;
      let dirty = advance(sim, L.locked, emit);

      const dir = Math.sign(c.x - fromX);
      if (dir !== wasDir) {
        wasDir = dir;
        L.onSteer(dir);
      }
      const busy = c.phase !== "idle";
      if (busy !== wasBusy) {
        wasBusy = busy;
        L.onBusy(busy);
        dirty = true;
      }
      if (dirty) paint();
    };

    // The simulation runs at a fixed 60 steps a second, whatever the display does:
    // a 120 Hz screen draws more often, it does not play faster.
    const STEP = 1000 / 60;
    let last = performance.now();
    let owed = 0;
    const loop = (now: number) => {
      owed = Math.min(owed + now - last, STEP * 5);
      last = now;
      while (owed >= STEP) {
        tick();
        owed -= STEP;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Dev-only handle: a background tab gets no animation frames.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __quest?: unknown }).__quest = {
        tick: (n = 1) => {
          for (let i = 0; i < n; i++) tick();
        },
        claw: () => ({ x: sim.claw.x, y: sim.claw.y, phase: sim.claw.phase }),
        moveTo: (x: number) => {
          sim.claw.x = clampX(x);
        },
        bodies: () => sim.bodies.map((b) => ({ ball: sim.skin.get(b.id), x: Math.round(b.x), y: Math.round(b.y), held: b.held })),
      };
    }
    return () => cancelAnimationFrame(raf);
  }, [emit, paint]);

  const { cx, cy } = view;
  const guide: number[] = [];
  if (view.aim !== null) for (let y = cy + 17; y < view.aimY - 2; y += 6) guide.push(y);

  return (
    <svg
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      width={WORLD.w * 2}
      height={WORLD.h * 2}
      shapeRendering="crispEdges"
      className="qq-machine absolute bottom-1 left-2 block"
      role="img"
      aria-label={`Claw machine with ${view.bodies.length} balls. Tap the glass to move the claw.`}
      onPointerDown={seek}
      onPointerMove={(e) => {
        if (e.buttons === 1) seek(e);
      }}
    >
      {/* Floor, and the prize chute: a hole in it, marked with chevrons. */}
      <rect x="0" y="168" width={WORLD.w} height="12" fill={look.floor} />
      <rect x="0" y="168" width={WORLD.w} height="2" fill={look.floorLine} />
      <rect x="12" y="168" width="42" height="12" fill={K} />
      <rect x="12" y="168" width="42" height="2" fill="#000000" opacity="0.4" />
      {[18, 30, 42].map((x) => (
        <Sprite key={x} map={CHEVRON_MAP} palette={signPal} x={x} y={173} />
      ))}
      {/* The sign over the chute hangs from the rail on two chains. */}
      {[19, 48].map((x) => (
        <g key={x}>
          {Array.from({ length: 23 }, (_, i) => (
            <rect key={i} x={x} y={32 + i * 2} width="1" height="1" fill={look.cable} />
          ))}
        </g>
      ))}
      <rect x="16" y="78" width="36" height="13" fill={K} />
      <rect x="17" y="79" width="34" height="11" fill={look.sign} />
      <rect x="17" y="79" width="34" height="1" fill="#ffffff" opacity="0.45" />
      <rect x="17" y="89" width="34" height="1" fill="#000000" opacity="0.18" />
      <Sprite map={PRIZE_MAP} palette={signPal} x={22} y={82} />
      <g className="qq-point">
        <Sprite map={ARROW_MAP} palette={signPal} x={28} y={94} />
      </g>

      {view.bodies.map((b) => (
        <BallG key={b.id} body={b} aim={b.id === view.aim} rim={rimPal} />
      ))}

      {/* Dotted drop line: where the claw will land if you grab now. */}
      {guide.map((y) => (
        <rect key={y} x={cx} y={y} width="1" height="3" fill="#ffffff" opacity="0.75" />
      ))}

      {/* Post that walls the chute off from the pile. */}
      <rect x={WORLD.dividerX - 3} y={WORLD.dividerTop} width="6" height="46" fill={K} />
      <rect x={WORLD.dividerX - 2} y={WORLD.dividerTop + 1} width="4" height="45" fill={look.post} />
      <rect x={WORLD.dividerX - 2} y={WORLD.dividerTop + 5} width="4" height="3" fill={look.stripe} />
      <rect x={WORLD.dividerX - 2} y={WORLD.dividerTop + 12} width="4" height="3" fill={look.stripe} />

      {/* Rail, carriage, cable, claw. */}
      <rect x="12" y="24" width="196" height="7" fill={K} />
      <rect x="13" y="25" width="194" height="5" fill={look.rail} />
      <rect x="13" y="25" width="194" height="1" fill={look.railHi} />
      <rect x="8" y="20" width="7" height="15" fill={K} />
      <rect x="9" y="21" width="5" height="13" fill={look.cap} />
      <rect x="205" y="20" width="7" height="15" fill={K} />
      <rect x="206" y="21" width="5" height="13" fill={look.cap} />
      <rect x={cx - 3} y="30" width="7" height={Math.max(0, cy - 38)} fill={K} />
      <rect x={cx - 2} y="30" width="5" height={Math.max(0, cy - 38)} fill={look.cable} />
      <rect x={cx - 9} y="21" width="19" height="11" fill={K} />
      <rect x={cx - 8} y="22" width="17" height="9" fill={look.carriage} />
      <rect x={cx - 8} y="22" width="17" height="2" fill={look.carriageHi} />
      {view.held && <BallG body={view.held} upright rim={rimPal} />}
      {view.open ? <Sprite map={CLAW_OPEN} palette={prongPal} x={cx - 14} y={cy - 1} /> : <Sprite map={CLAW_CLOSED} palette={prongPal} x={cx - 11} y={cy - 1} />}
      <Sprite map={CLAW_HEAD} palette={headPal} x={cx - 7} y={cy - 8} />
    </svg>
  );
});

function BallG({ body, aim, upright, rim }: { body: Ball; aim?: boolean; upright?: boolean; rim: Record<string, string> | null }) {
  const special = body.ball === "legend" ? "qq-glint" : body.ball === "noir" || body.ball === "royal" ? "qq-glint qq-glint-slow" : null;
  return (
    <g className={aim ? "qq-aim" : undefined}>
      <g transform={`translate(${Math.round(body.x) - 9} ${Math.round(body.y) - 9})`}>
        {rim && (
          <g transform="translate(-1 -1)" opacity="0.45">
            <Sprite map={RIM_MAP} palette={rim} />
          </g>
        )}
        <g transform={upright ? undefined : `rotate(${body.spin * 90} 9 9)`}>
          <BallSprite id={body.ball} />
        </g>
        {special && (
          <g className={special}>
            <rect x="14" y="-1" width="1" height="5" fill="#ffffff" />
            <rect x="12" y="1" width="5" height="1" fill="#ffffff" />
            {body.ball === "legend" && <rect x="1" y="13" width="3" height="1" fill="#fff6c2" />}
            {body.ball === "legend" && <rect x="2" y="12" width="1" height="3" fill="#fff6c2" />}
          </g>
        )}
      </g>
    </g>
  );
}

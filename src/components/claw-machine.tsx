"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/8bit/button";
import {
  CAPSULE_MAP,
  CLAW_CLOSED,
  CLAW_HEAD,
  CLAW_OPEN,
  INK,
  JUNK,
  ORB_MAP,
  ORB_PALETTE,
  PixelArt,
  Sprite,
  capsulePalette,
} from "@/components/pixel";
import { type Body, WORLD, inChute, pourCapsules, pourJunk, settle, step } from "@/lib/physics";
import { RARITY, type Rarity } from "@/lib/quotes";
import type { Skin } from "@/lib/skins";
import { sfx } from "@/lib/sound";
import type { Mode } from "@/lib/store";
import { cn } from "@/lib/utils";

type Phase = "idle" | "down" | "close" | "up" | "carry" | "release" | "return";

export interface ClawHandle {
  /** Dump the pile and pour a fresh load — used when a new tape goes in. */
  refill: () => void;
  /** Remove any scrap still in the chute. */
  sweep: () => void;
}

interface ClawMachineProps {
  mode: Mode;
  /** How many pieces of scrap still jam the chute. 0 once repaired. */
  jam: number;
  grip: number;
  /** True while something else owns the player's attention. */
  locked: boolean;
  onWin: (rarity: Rarity) => void;
  onJunkCleared: (left: number) => void;
  onJammed: () => void;
  onSlip: () => void;
  onMiss: () => void;
  onGrab: (kind: "capsule" | "junk" | "orb") => void;
  /** A bonus orb reached the prize box. */
  onOrb: () => void;
  /** Which casket this is: colours, claw and roof. */
  skin: Skin;
  onHatch: () => void;
  className?: string;
}

const PALETTES: Record<Rarity, Record<string, string>> = {
  3: capsulePalette(RARITY[3].top, RARITY[3].shade),
  4: capsulePalette(RARITY[4].top, RARITY[4].shade),
  5: capsulePalette(RARITY[5].top, RARITY[5].shade),
};

/** Distance from the claw's palm down to the centre of whatever it holds. */
const HOLD = 10;
const SPEED = 1.7;

interface Fx {
  id: number;
  junk: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Sim {
  bodies: Body[];
  fx: Fx[];
  keys: { left: boolean; right: boolean };
  claw: {
    x: number;
    y: number;
    open: boolean;
    phase: Phase;
    timer: number;
    targetY: number;
    target: Body | null;
    held: Body | null;
    slipY: number;
    ticked: number;
    refilling: boolean;
  };
}

function createSim(jam: number): Sim {
  const bodies = [...pourCapsules(), ...(jam > 0 ? pourJunk().slice(0, jam) : [])];
  settle(bodies);
  return {
    bodies,
    fx: [],
    keys: { left: false, right: false },
    claw: {
      x: WORLD.homeX,
      y: WORLD.top,
      open: true,
      phase: "idle",
      timer: 0,
      targetY: 0,
      target: null,
      held: null,
      slipY: -1,
      ticked: WORLD.homeX,
      refilling: false,
    },
  };
}

/** What one frame looks like, copied out of the simulation for React to draw. */
interface View {
  cx: number;
  cy: number;
  open: boolean;
  busy: boolean;
  held: Body | null;
  bodies: Body[];
  fx: Fx[];
  capsules: number;
}

function snapshot(sim: Sim): View {
  return {
    cx: Math.round(sim.claw.x),
    cy: Math.round(sim.claw.y),
    open: sim.claw.open,
    busy: sim.claw.phase !== "idle",
    held: sim.claw.held ? { ...sim.claw.held } : null,
    bodies: sim.bodies.filter((b) => !b.held).map((b) => ({ ...b })),
    fx: sim.fx.map((f) => ({ ...f })),
    capsules: sim.bodies.filter((b) => b.kind === "capsule").length,
  };
}

export const ClawMachine = forwardRef<ClawHandle, ClawMachineProps>(function ClawMachine(
  { mode, jam, grip, locked, onWin, onJunkCleared, onJammed, onSlip, onMiss, onGrab, onOrb, onHatch, skin, className },
  ref,
) {
  // The simulation is one mutable object that lives for the whole session.
  // Render never reads it: every frame that changes something publishes an
  // immutable snapshot, and the JSX below draws only from that.
  const [boot] = useState(() => {
    const sim = createSim(jam);
    return { sim, view: snapshot(sim) };
  });
  const simRef = useRef<Sim>(boot.sim);
  const [view, setView] = useState<View>(boot.view);
  const paint = useCallback(() => setView(snapshot(simRef.current)), []);
  const [prize, setPrize] = useState<Rarity | null>(null);

  // The frame loop reads the latest props through this ref, so it can stay
  // mounted for the whole session without being torn down on every render.
  const live = useRef({ mode, jam, grip, locked, onWin, onJunkCleared, onJammed, onSlip, onMiss, onGrab, onOrb });
  useEffect(() => {
    live.current = { mode, jam, grip, locked, onWin, onJunkCleared, onJammed, onSlip, onMiss, onGrab, onOrb };
  });

  const pick = useCallback(() => {
    const sim = simRef.current;
    const c = sim.claw;
    const all = sim.bodies;
    if (c.phase !== "idle" || live.current.locked) return;
    let targetY = WORLD.floor - 12;
    let target: Body | null = null;
    if (Math.abs(c.x - WORLD.dividerX) < 8) targetY = Math.min(targetY, WORLD.dividerTop - 12);
    // Only things the claw could actually close around stop its descent, so a
    // neighbour's shoulder never blocks a capsule that is lined up.
    const reach = live.current.mode === "arcade" ? 8 : 11.5;
    for (const b of all) {
      if (b.held || Math.abs(b.x - c.x) > reach) continue;
      const y = b.y - HOLD;
      if (y < targetY) {
        targetY = y;
        target = b;
      }
    }
    c.targetY = Math.max(targetY, WORLD.top + 2);
    c.target = target;
    c.phase = "down";
    c.open = true;
    sfx.descend();
  }, []);

  /** A single tap moves the claw a fixed step, so it works without holding. */
  const nudge = useCallback(
    (dir: -1 | 1) => {
      const c = simRef.current.claw;
      if (c.phase !== "idle" || live.current.locked) return;
      c.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, c.x + dir * 3));
      sfx.move();
      paint();
    },
    [paint],
  );

  useImperativeHandle(ref, () => ({
    refill: () => {
      const sim = simRef.current;
      const c = sim.claw;
      const keep = sim.bodies.filter((b) => b.kind === "junk" || b.held);
      sim.bodies = [...keep, ...pourCapsules()];
      c.refilling = false;
      sfx.clunk();
      paint();
    },
    sweep: () => {
      const sim = simRef.current;
      sim.bodies = sim.bodies.filter((b) => b.kind !== "junk");
      paint();
    },
  }));

  // Keyboard: arrows or A/D to steer, Space/Enter/Down to drop the claw.
  useEffect(() => {
    const sim = simRef.current;
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || live.current.locked || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (!e.repeat) nudge(-1);
        sim.keys.left = true;
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (!e.repeat) nudge(1);
        sim.keys.right = true;
        e.preventDefault();
      } else if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") {
        if (e.repeat) return;
        if (e.key === "Enter" && e.target instanceof HTMLElement && e.target.tagName === "BUTTON") return;
        e.preventDefault();
        pick();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") sim.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") sim.keys.right = false;
    };
    const blur = () => {
      sim.keys.left = false;
      sim.keys.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [nudge, pick]);

  useEffect(() => {
    const sim = simRef.current;
    let raf = 0;
    let jamCooldown = 0;

    const release = (b: Body) => {
      b.held = false;
      b.vx = 0;
      b.vy = 0;
    };

    const tick = () => {
      const c = sim.claw;
      const all = sim.bodies;
      const L = live.current;
      let dirty = false;

      if (c.phase === "idle" && !L.locked) {
        const dir = (sim.keys.right ? 1 : 0) - (sim.keys.left ? 1 : 0);
        if (dir) {
          const next = Math.max(WORLD.minX, Math.min(WORLD.maxX, c.x + dir * SPEED));
          if (next !== c.x) {
            c.x = next;
            dirty = true;
            if (Math.abs(c.x - c.ticked) > 9) {
              c.ticked = c.x;
              sfx.move();
            }
          }
        }
      }

      for (const b of all) {
        // Nothing may stay flagged as held unless the claw really has it.
        if (b.held && b !== c.held) b.held = false;
        // A capsule spat back off a jam is part of the pile again once it lands.
        if (b.pass && !b.held && b.x > WORLD.dividerX + b.r + 2 && Math.abs(b.vx) + Math.abs(b.vy) < 0.5) b.pass = false;
      }
      if (c.held) {
        c.held.x = c.x;
        c.held.y = c.y + HOLD;
      }

      switch (c.phase) {
        case "down":
          c.y = Math.min(c.targetY, c.y + 2.4);
          if (c.y >= c.targetY) {
            c.phase = "close";
            c.timer = 16;
          }
          dirty = true;
          break;

        case "close":
          c.timer--;
          if (c.timer === 9) {
            c.open = false;
            const t = c.target;
            const reach = L.mode === "arcade" ? 8 : 11.5;
            const off = t ? Math.abs(t.x - c.x) : 99;
            if (t && !t.held && off <= reach && Math.abs(t.y - (c.y + HOLD)) < 8) {
              t.held = true;
              c.held = t;
              c.slipY = -1;
              if (L.mode === "arcade" && t.kind !== "junk") {
                const aim = 1 - off / reach;
                const tier = t.rarity === 5 ? 0.16 : t.rarity === 4 ? 0.06 : 0;
                const hold = Math.max(0.08, Math.min(0.97, 0.3 + 0.6 * aim + (L.grip - 50) / 100 - tier));
                if (Math.random() > hold) c.slipY = c.y - (14 + Math.random() * 44);
              }
              sfx.grab();
              L.onGrab(t.kind);
            } else {
              sfx.miss();
              L.onMiss();
            }
          }
          if (c.timer <= 0) c.phase = "up";
          dirty = true;
          break;

        case "up":
          c.y = Math.max(WORLD.top, c.y - 1.9);
          if (c.held && c.slipY > 0 && c.y <= c.slipY) {
            release(c.held);
            c.held = null;
            c.slipY = -1;
            c.open = true;
            sfx.slip();
            L.onSlip();
          }
          if (c.y <= WORLD.top) {
            if (c.held?.kind === "junk") {
              // Scrap is flung clean out of the top of the cabinet.
              const j = c.held;
              sim.bodies = all.filter((b) => b !== j);
              sim.fx.push({ id: j.id, junk: j.junk, x: j.x, y: j.y, vx: 1.6, vy: -4.6, life: 40 });
              c.held = null;
              c.open = true;
              sfx.clunk();
              L.onJunkCleared(sim.bodies.filter((b) => b.kind === "junk").length);
              c.phase = "return";
            } else {
              c.phase = c.held ? "carry" : "return";
            }
          }
          dirty = true;
          break;

        case "carry":
        case "return":
          if (Math.abs(c.x - WORLD.homeX) <= SPEED) {
            c.x = WORLD.homeX;
            if (c.phase === "carry") {
              c.phase = "release";
              c.timer = 12;
            } else {
              c.phase = "idle";
              c.open = true;
            }
          } else {
            c.x += c.x > WORLD.homeX ? -SPEED : SPEED;
          }
          dirty = true;
          break;

        case "release":
          c.timer--;
          if (c.timer === 7 && c.held) {
            c.held.pass = true;
            release(c.held);
            c.held = null;
            c.open = true;
            sfx.drop();
          }
          if (c.timer <= 0) c.phase = "idle";
          dirty = true;
          break;
      }

      if (step(sim.bodies)) dirty = true;

      // Anything that settles in the chute either drops into the prize box
      // or, while the chute is jammed, gets spat straight back onto the pile.
      if (jamCooldown > 0) jamCooldown--;
      for (const b of sim.bodies) {
        if (b.held || b.kind === "junk" || !inChute(b)) continue;
        const slow = Math.abs(b.vx) + Math.abs(b.vy) < 0.9;
        const blocked = sim.bodies.some((j) => j.kind === "junk");
        if (blocked) {
          if (slow && b.y > WORLD.dividerTop - 30 && jamCooldown === 0) {
            b.vx = 3.5 + Math.random();
            b.vy = -6.8;
            jamCooldown = 50;
            sfx.clunk();
            L.onJammed();
            dirty = true;
          }
        } else if (b.y >= WORLD.floor - b.r - 1) {
          sim.bodies = sim.bodies.filter((x) => x !== b);
          sfx.clunk();
          if (b.kind === "orb") {
            L.onOrb();
          } else {
            setPrize(b.rarity);
            L.onWin(b.rarity);
          }
          dirty = true;
          break;
        }
      }

      // Top the pile up before it runs dry.
      const left = sim.bodies.filter((b) => b.kind === "capsule").length;
      if (left <= 4 && !c.refilling && c.phase === "idle") {
        c.refilling = true;
        sim.bodies = [...sim.bodies, ...pourCapsules(10)];
        window.setTimeout(() => {
          sim.claw.refilling = false;
        }, 2500);
        dirty = true;
      }

      if (sim.fx.length) {
        for (const f of sim.fx) {
          f.x += f.vx;
          f.y += f.vy;
          f.vy += 0.3;
          f.life--;
        }
        sim.fx = sim.fx.filter((f) => f.life > 0);
        dirty = true;
      }

      if (dirty) paint();
    };

    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Dev-only handle so the simulation can be stepped from the console
    // (a background tab gets no animation frames).
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __casket?: unknown }).__casket = {
        tick: (n = 1) => {
          for (let i = 0; i < n; i++) tick();
        },
        claw: () => ({ ...sim.claw, target: null, held: sim.claw.held?.kind ?? null }),
        bodies: () => sim.bodies.map((b) => ({ kind: b.kind, rarity: b.rarity, x: Math.round(b.x), y: Math.round(b.y), held: b.held })),
      };
    }
    return () => cancelAnimationFrame(raf);
  }, [paint]);

  const { cx, cy, busy } = view;
  const capsulesLeft = view.capsules;
  const clawPalette = useMemo(() => ({ o: INK, ...skin.claw }), [skin]);

  const hold = useCallback(
    (side: "left" | "right", on: boolean) => {
      const { keys } = simRef.current;
      if (on && !keys[side]) nudge(side === "left" ? -1 : 1);
      keys[side] = on;
    },
    [nudge],
  );

  return (
    <div
      className={cn("casket relative mx-auto w-full max-w-[520px] select-none", className)}
      style={
        {
          "--cab": skin.body,
          "--cab-hi": skin.bodyHi,
          "--cab-lo": skin.bodyLo,
          "--cab-ink": skin.bodyInk,
          "--deck": skin.deck,
          "--deck-lo": skin.deckLo,
          "--base": skin.base,
          "--base-lo": skin.baseLo,
          "--base-ink": skin.baseInk,
          "--key-lo": skin.keyLo,
          "--pick-lo": skin.pickLo,
          "--primary": skin.pick,
        } as React.CSSProperties
      }
    >
      {skin.roof && <Roof roof={skin.roof} />}
      {/* ── Cabinet ─────────────────────────────────────────────── */}
      <div className="cabinet relative px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
        <p className="font-pixel text-center text-[10px] tracking-[0.2em] text-[var(--cab-ink)] sm:text-[11px]">{skin.label}</p>
        <h1 className="marquee mt-2 text-center text-[19px] leading-none sm:text-[26px]" aria-label="Quote Casket">
          {"QUOTE CASKET".split("").map((ch, i) => (
            <span key={i} aria-hidden="true" style={{ color: skin.marquee[i % skin.marquee.length] }}>
              {ch === " " ? " " : ch}
            </span>
          ))}
        </h1>

        <div className="glass mt-4">
          <svg
            viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
            shapeRendering="crispEdges"
            className="block h-auto w-full"
            role="img"
            aria-label={`Claw machine with ${capsulesLeft} capsules`}
          >
            <defs>
              <clipPath id="glass-clip">
                <rect x="6" y="6" width="208" height="168" />
              </clipPath>
            </defs>

            <rect width={WORLD.w} height={WORLD.h} fill={skin.frame} />
            <rect x="6" y="6" width="208" height="168" fill={skin.wall} />
            <rect x="34" y="26" width="152" height="118" fill={skin.back} />
            <g stroke={skin.seam} strokeWidth="2">
              <line x1="6" y1="6" x2="34" y2="26" />
              <line x1="214" y1="6" x2="186" y2="26" />
              <line x1="6" y1="174" x2="34" y2="144" />
              <line x1="214" y1="174" x2="186" y2="144" />
            </g>
            <rect x="34" y="26" width="152" height="118" fill="none" stroke={skin.backLine} strokeWidth="1" />

            <g clipPath="url(#glass-clip)">
              {/* Prize chute: a dark slot in the floor and a post that walls it off. */}
              <rect x="12" y="164" width="42" height="10" fill={INK} />
              <rect x="14" y="166" width="38" height="2" fill="#3d3d45" />
              {jam > 0 ? (
                <g className="blink">
                  <rect x="14" y="62" width="40" height="11" fill="#ee4b3b" />
                  <rect x="13" y="63" width="42" height="9" fill="#ee4b3b" />
                  <text x="34" y="70.5" textAnchor="middle" className="svg-label" fill="#fff">
                    JAMMED
                  </text>
                </g>
              ) : (
                <g>
                  <rect x="17" y="62" width="34" height="11" fill="#9ef5c0" />
                  <rect x="16" y="63" width="36" height="9" fill="#9ef5c0" />
                  <text x="34" y="70.5" textAnchor="middle" className="svg-label" fill={INK}>
                    PRIZE
                  </text>
                  <path d="M30 76h8v5h4l-8 7-8-7h4z" fill="#9ef5c0" stroke={INK} strokeWidth="1" />
                </g>
              )}

              {view.bodies.map((b) => (
                <BodySprite key={b.id} body={b} />
              ))}

              <rect x={WORLD.dividerX - 3} y={WORLD.dividerTop} width="6" height="52" fill={INK} />
              <rect x={WORLD.dividerX - 2} y={WORLD.dividerTop + 1} width="4" height="50" fill={skin.post} />
              <rect x={WORLD.dividerX - 2} y={WORLD.dividerTop + 1} width="4" height="3" fill={skin.stripe} />
              <rect x={WORLD.dividerX - 2} y={WORLD.dividerTop + 7} width="4" height="3" fill={skin.stripe} />

              {/* Rail, carriage, cable, claw. */}
              <rect x="14" y="24" width="192" height="7" fill={INK} />
              <rect x="15" y="25" width="190" height="5" fill={skin.rail} />
              <rect x="15" y="25" width="190" height="1" fill={skin.railHi} />
              <rect x="10" y="20" width="6" height="15" fill={INK} />
              <rect x="11" y="21" width="4" height="13" fill={skin.cap} />
              <rect x="204" y="20" width="6" height="15" fill={INK} />
              <rect x="205" y="21" width="4" height="13" fill={skin.cap} />

              <rect x={cx - 3} y="30" width="7" height={Math.max(0, cy - 8 - 30)} fill={INK} />
              <rect x={cx - 2} y="30" width="5" height={Math.max(0, cy - 8 - 30)} fill={skin.cable} />
              <rect x={cx - 9} y="21" width="19" height="11" fill={INK} />
              <rect x={cx - 8} y="22" width="17" height="9" fill={skin.carriage} />
              <rect x={cx - 8} y="22" width="17" height="2" fill={skin.carriageHi} />

              {view.held && <BodySprite body={view.held} />}
              {view.open ? (
                <Sprite map={CLAW_OPEN} palette={clawPalette} x={cx - 14} y={cy - 1} />
              ) : (
                <Sprite map={CLAW_CLOSED} palette={clawPalette} x={cx - 11} y={cy - 1} />
              )}
              <Sprite map={CLAW_HEAD} palette={clawPalette} x={cx - 7} y={cy - 8} />

              {view.fx.map((f) => (
                <g key={f.id} opacity={Math.min(1, f.life / 14)} transform={`translate(${Math.round(f.x) - 9} ${Math.round(f.y) - 9})`}>
                  <Sprite map={JUNK[f.junk].map} palette={JUNK[f.junk].palette} />
                </g>
              ))}
            </g>

            {/* Glass glare */}
            <polygon points="150,6 172,6 96,174 74,174" fill="#ffffff" opacity="0.13" />
            <polygon points="180,6 188,6 112,174 104,174" fill="#ffffff" opacity="0.1" />
          </svg>
        </div>

        {/* Cabinet front: prize box, readout, service hatch. */}
        <div className="mt-4 flex items-stretch gap-3">
          <div className="prize-door relative flex h-[58px] w-[92px] shrink-0 items-center justify-center" aria-live="polite">
            <span className="font-pixel absolute -top-[9px] left-2 bg-[var(--cab)] px-1 text-[9px] tracking-widest text-[var(--cab-ink)]">
              PRIZE BOX
            </span>
            {prize ? (
              <span key={`${prize}-${capsulesLeft}`} className="prize-pop">
                <PixelArt map={CAPSULE_MAP} palette={PALETTES[prize]} px={2} />
              </span>
            ) : (
              <span className="font-pixel text-[9px] text-white/35">EMPTY</span>
            )}
          </div>

          <div className="lcd flex flex-1 flex-col justify-center px-3 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-pixel text-[9px] tracking-widest opacity-70">CAPSULES</span>
              <span className="font-display text-[11px]">{String(capsulesLeft).padStart(2, "0")}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-pixel text-[9px] tracking-widest opacity-70">MODE</span>
              <span className="font-display text-[9px]">{mode === "arcade" ? "ARCADE" : "CHILL"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onHatch}
            className="hatch group relative h-[58px] w-[34px] shrink-0"
            aria-label="Service hatch"
            title="Service hatch"
          >
            <span className="screw absolute top-1.5 left-1/2 -translate-x-1/2" />
            <span className="screw absolute bottom-1.5 left-1/2 -translate-x-1/2" />
          </button>
        </div>
      </div>

      {/* ── Control deck ────────────────────────────────────────── */}
      <div className="deck relative mx-auto -mt-1 w-[88%]">
        {!busy && !locked && (
          <span className="touch-tag font-pixel absolute -top-3 left-[66%] z-10 px-1.5 py-0.5 text-[9px] whitespace-nowrap text-white">
            {jam > 0 ? "Fix me!" : "Touch!"}
          </span>
        )}
        <div className="deck-top flex items-end gap-3 px-6 pt-3 pb-4 sm:gap-4 sm:px-8">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="key h-11 w-11 bg-white text-lg text-[#1b1b1f] hover:bg-white"
              aria-label="Move claw left"
              disabled={locked}
              onPointerDown={() => hold("left", true)}
              onPointerUp={() => hold("left", false)}
              onPointerLeave={() => hold("left", false)}
              onPointerCancel={() => hold("left", false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              ◀
            </Button>
            <Button
              type="button"
              variant="outline"
              className="key h-11 w-11 bg-white text-lg text-[#1b1b1f] hover:bg-white"
              aria-label="Move claw right"
              disabled={locked}
              onPointerDown={() => hold("right", true)}
              onPointerUp={() => hold("right", false)}
              onPointerLeave={() => hold("right", false)}
              onPointerCancel={() => hold("right", false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              ▶
            </Button>
          </div>
          <div className="relative flex-1">
            <Button
              type="button"
              className="pick h-11 w-full text-[13px] tracking-widest"
              disabled={locked || busy}
              onClick={(e) => {
                e.currentTarget.blur();
                sfx.press();
                pick();
              }}
            >
              PICK!
            </Button>
          </div>
        </div>
        <div className="deck-base mx-auto w-[calc(100%-8px)] px-4 py-3 text-center">
          <p className="font-pixel text-[11px] leading-snug text-[var(--base-ink)] sm:text-[12px]">
            Use the arrows to <b>move</b>, then <b>PICK</b> a capsule.
            <span className="hidden sm:inline"> Keys: ← → and Space.</span>
          </p>
        </div>
      </div>
    </div>
  );
});

function BodySprite({ body }: { body: Body }) {
  const x = Math.round(body.x) - 9;
  const y = Math.round(body.y) - 9;
  if (body.kind === "junk") {
    const j = JUNK[body.junk];
    return (
      <g transform={`translate(${x} ${y})`}>
        <Sprite map={j.map} palette={j.palette} />
      </g>
    );
  }
  if (body.kind === "orb") {
    return (
      <g transform={`translate(${x} ${y})`}>
        <Sprite map={ORB_MAP} palette={ORB_PALETTE} />
        <rect className="twinkle" x="13" y="3" width="2" height="2" fill="#fff" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${body.spin * 90} 9 9)`}>
      <Sprite map={CAPSULE_MAP} palette={PALETTES[body.rarity]} />
      {body.rarity === 5 && <rect className="twinkle" x="12" y="2" width="2" height="2" fill="#fff" />}
    </g>
  );
}

/** The tiled roof of the Xuanfang casket: upturned eaves over a lacquered beam. */
function Roof({ roof }: { roof: NonNullable<Skin["roof"]> }) {
  const rows: [number, number][] = [
    [34, 98],
    [24, 108],
    [16, 116],
    [9, 123],
    [4, 128],
  ];
  return (
    <svg viewBox="0 0 132 18" shapeRendering="crispEdges" className="relative z-[1] -mb-[6px] block h-auto w-full" aria-hidden="true">
      <rect x="40" y="0" width="52" height="3" fill={INK} />
      <rect x="41" y="1" width="50" height="1" fill={roof.ridge} />
      {rows.map(([a, b], i) => (
        <g key={i}>
          <rect x={a - 1} y={3 + i * 2} width={b - a + 2} height="2" fill={INK} />
          <rect x={a} y={3 + i * 2} width={b - a} height="2" fill={i % 2 ? roof.tileLo : roof.tile} />
        </g>
      ))}
      {/* Eaves curl up at both ends. */}
      <rect x="0" y="9" width="6" height="4" fill={INK} />
      <rect x="1" y="10" width="4" height="2" fill={roof.ridge} />
      <rect x="126" y="9" width="6" height="4" fill={INK} />
      <rect x="127" y="10" width="4" height="2" fill={roof.ridge} />
      {Array.from({ length: 15 }, (_, i) => (
        <rect key={i} x={10 + i * 8} y="9" width="1" height="4" fill={roof.tileLo} />
      ))}
      <rect x="8" y="13" width="116" height="5" fill={INK} />
      <rect x="9" y="14" width="114" height="3" fill={roof.beam} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={15 + i * 12} y="14" width="4" height="3" fill={roof.ridge} />
      ))}
    </svg>
  );
}

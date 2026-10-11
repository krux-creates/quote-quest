"use client";

import { useEffect, useRef, useState } from "react";

import { CAPSULE_MAP, CLOUD_MAP, INK, PixelArt, STAR_MAP, capsulePalette } from "@/components/pixel";
import { type Quote, RARITY, type Tape } from "@/lib/quotes";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

export type Screen =
  | { kind: "boot" }
  | { kind: "ident" }
  | { kind: "jam"; left: number }
  | { kind: "static" }
  | { kind: "intro" }
  | { kind: "reveal"; quote: Quote; fresh: boolean }
  | { kind: "quote"; quote: Quote; fresh: boolean; replay?: boolean }
  | { kind: "over" };

interface RetroTvProps {
  screen: Screen;
  tape: Tape;
  muted: boolean;
  onStart: () => void;
  onChannel: () => void;
  onMute: () => void;
  onPlayAgain: () => void;
  onChill: () => void;
  className?: string;
}

const STAR_ON = { o: INK, y: "#ffcf3a" };
const STAR_OFF = { o: "#4a5160", y: "#2a2f3a" };
const CLOUD = { o: INK, w: "#ffffff", s: "#cfe4ff" };

export function Stars({ count, px = 2, max = 5 }: { count: number; px?: number; max?: number }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <PixelArt key={i} map={STAR_MAP} palette={i < count ? STAR_ON : STAR_OFF} px={px} />
      ))}
    </span>
  );
}

/** Low-res snow, redrawn every frame and scaled up with hard pixels. */
function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    let raf = 0;
    const img = g.createImageData(cv.width, cv.height);
    const draw = () => {
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={80} height={60} className="pixelated absolute inset-0 h-full w-full" aria-hidden="true" />;
}

/**
 * Reveals `text` one character at a time. The caller remounts (via `key`)
 * for each new quote, so the count only ever needs to run forward.
 */
function useTypewriter(text: string, enabled: boolean) {
  const [n, setN] = useState(enabled ? 0 : text.length);
  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setN((cur) => Math.max(cur, i));
      if (i % 2 === 0 && text[i - 1] !== " ") sfx.type();
      if (i >= text.length) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [text, enabled]);
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}

function QuoteScreen({ quote, fresh, replay, tape }: { quote: Quote; fresh: boolean; replay?: boolean; tape: Tape }) {
  const { shown, done, skip } = useTypewriter(quote.text, !replay);
  const len = quote.text.length;
  // Sized off the screen's own width, so a long line fits a phone-sized CRT too.
  const size = len < 50 ? "q-short" : len < 95 ? "q-mid" : "q-long";
  return (
    <button type="button" onClick={skip} className="absolute inset-0 flex cursor-default flex-col text-left" aria-label="Skip typing">
      <div className="flex items-center justify-between px-4 pt-3 sm:px-5 sm:pt-4">
        <span className="font-display text-[8px] text-[#9ef5c0] sm:text-[9px]">
          ▶ <span className="hidden sm:inline">{replay ? "REPLAY" : "PLAY"} · </span>CH {String(tape.channel).padStart(2, "0")}
        </span>
        <span className="flex items-center gap-2">
          {fresh && !replay && <span className="font-display blink bg-[#ee4b3b] px-1.5 py-0.5 text-[7px] text-white">NEW</span>}
          <Stars count={quote.rarity} />
        </span>
      </div>
      <blockquote
        className={cn("font-crt phosphor min-h-0 flex-1 overflow-hidden px-4 pt-1.5 leading-[1.02] text-[#eaf7ff] sm:px-5 sm:pt-2", size)}
        aria-live="polite"
      >
        <span aria-hidden="true" className="text-[#9ef5c0]">“</span>
        {shown}
        {done ? <span aria-hidden="true" className="text-[#9ef5c0]">”</span> : <span className="caret" aria-hidden="true" />}
      </blockquote>
      <div
        className={cn("lower-third mx-3 mb-3 flex shrink-0 items-center gap-3 px-2.5 py-1.5 sm:mx-4 sm:mb-4 sm:px-3 sm:py-2", done ? "opacity-100" : "opacity-0")}
        style={{ background: tape.color, color: tape.ink }}
      >
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[9px] sm:text-[11px]">{quote.author}</p>
          <p className="font-pixel mt-1 truncate text-[10px] opacity-90 sm:text-[11px]">
            {quote.source} · {quote.year}
          </p>
        </div>
        <span className="font-display hidden shrink-0 text-[8px] opacity-90 sm:inline">{RARITY[quote.rarity].label}</span>
      </div>
    </button>
  );
}

function RevealScreen({ quote, fresh }: { quote: Quote; fresh: boolean }) {
  const r = RARITY[quote.rarity];
  const pal = capsulePalette(r.top, r.shade);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: r.rayAlt }}>
      <div
        className="sunburst absolute top-1/2 left-1/2 aspect-square w-[220%]"
        style={{ background: `repeating-conic-gradient(${r.ray} 0 15deg, ${r.rayAlt} 15deg 30deg)` }}
      />
      <div className="burst-glow absolute inset-0" />
      {[
        [16, 22],
        [78, 16],
        [86, 62],
        [12, 70],
        [64, 82],
        [34, 12],
      ].map(([l, t], i) => (
        <span key={i} className="sparkle absolute" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${i * 0.13}s` }} />
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="capsule-crack relative">
          <div className="half-top">
            <PixelArt map={CAPSULE_MAP.slice(0, 9)} palette={pal} px={6} />
          </div>
          <div className="half-bottom">
            <PixelArt map={CAPSULE_MAP.slice(9)} palette={pal} px={6} />
          </div>
        </div>
        <div className="reveal-tag flex flex-col items-center gap-2 bg-[#1b1b1f] px-3 py-2">
          <Stars count={quote.rarity} px={3} />
          <span className="font-display text-[9px] text-white">
            {r.label} · {fresh ? "NEW QUOTE" : "REPEAT"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RetroTv({ screen, tape, muted, onStart, onChannel, onMute, onPlayAgain, onChill, className }: RetroTvProps) {
  const ch = String(tape.channel).padStart(2, "0");
  return (
    <div className={cn("relative mx-auto w-full max-w-[560px]", className)}>
      <svg viewBox="0 0 120 34" className="antenna mx-auto block h-[46px] w-[170px]" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M60 34 L18 4" stroke={INK} strokeWidth="2.5" fill="none" />
        <path d="M60 34 L104 8" stroke={INK} strokeWidth="2.5" fill="none" />
        <rect x="14" y="1" width="7" height="7" fill="#ee4b3b" stroke={INK} strokeWidth="1.5" />
        <rect x="101" y="5" width="7" height="7" fill="#ee4b3b" stroke={INK} strokeWidth="1.5" />
        <rect x="50" y="28" width="20" height="6" fill={INK} />
      </svg>

      <div className="tv relative flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="crt-bezel relative min-w-0 flex-1 p-2 sm:p-3">
          <div className="crt relative aspect-[4/3] w-full overflow-hidden" data-screen={screen.kind}>
            {screen.kind === "boot" && (
              <button type="button" onClick={onStart} className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#17181c] text-[#cfd3da]">
                <span className="font-display text-[10px] tracking-widest text-[#8b90a0]">QUOTE CASKET TV</span>
                <span className="font-display text-center text-[13px] leading-[2.1] sm:text-[17px]">
                  press
                  <br />
                  <span className="blink text-[22px] text-white sm:text-[28px]">START</span>
                </span>
                <span className="font-pixel text-[11px] text-[#8b90a0]">click the screen or hit Enter</span>
              </button>
            )}

            {(screen.kind === "ident" || screen.kind === "intro") && (
              <div className={cn("absolute inset-0 flex flex-col", screen.kind === "intro" && "wipe-in")} style={{ background: "#a9c8ff" }}>
                <div className="relative flex-1 overflow-hidden">
                  <span className="drift absolute top-[14%] left-[8%]">
                    <PixelArt map={CLOUD_MAP} palette={CLOUD} px={3} />
                  </span>
                  <span className="drift absolute top-[42%] left-[62%]" style={{ animationDelay: "-6s" }}>
                    <PixelArt map={CLOUD_MAP} palette={CLOUD} px={2} />
                  </span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <span className="font-display px-2 py-1 text-[9px]" style={{ background: tape.color, color: tape.ink }}>
                      CHANNEL {ch}
                    </span>
                    <span className="ident-title font-display text-[18px] leading-tight sm:text-[26px]">{tape.title}</span>
                    <span className="font-pixel text-[11px] text-[#1b1b1f] sm:text-[13px]">{tape.tagline}</span>
                  </div>
                </div>
                <div className="ground flex h-[24%] items-center justify-center">
                  <span className="font-display blink bg-[#1b1b1f] px-2 py-1.5 text-[8px] text-white sm:text-[9px]">
                    GRAB A CAPSULE TO TUNE IN
                  </span>
                </div>
              </div>
            )}

            {screen.kind === "jam" && (
              <div className="absolute inset-0 flex flex-col">
                <div className="flex flex-1">
                  {["#d9d9d9", "#f7e04a", "#4fd6ff", "#34c98a", "#ff5d8f", "#ee4b3b", "#4f7cff"].map((c) => (
                    <span key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </div>
                <div className="flex h-[46%] flex-col items-center justify-center gap-2 bg-[#17181c] px-3 text-center">
                  <span className="font-display blink text-[12px] text-[#ee4b3b] sm:text-[15px]">NO SIGNAL</span>
                  <span className="font-display text-[8px] leading-[1.9] text-white sm:text-[9px]">
                    PRIZE BOX JAMMED
                    <br />
                    CLEAR {screen.left} PIECE{screen.left === 1 ? "" : "S"} OF SCRAP
                  </span>
                </div>
              </div>
            )}

            {screen.kind === "static" && <Snow />}
            {screen.kind === "reveal" && <RevealScreen quote={screen.quote} fresh={screen.fresh} />}
            {screen.kind === "quote" && (
              <div className="absolute inset-0 bg-[#10151c]">
                <QuoteScreen key={screen.quote.id + (screen.replay ? "r" : "")} quote={screen.quote} fresh={screen.fresh} replay={screen.replay} tape={tape} />
              </div>
            )}

            {screen.kind === "over" && (
              <div className="synth absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <span className="over-title font-display text-[20px] sm:text-[28px]">GAME OVER</span>
                <span className="font-display text-[9px] text-white">PLAY AGAIN?</span>
                <span className="flex gap-4">
                  <button type="button" onClick={onPlayAgain} className="font-display tv-link text-[11px] text-white">
                    YES
                  </button>
                  <button type="button" onClick={onChill} className="font-display tv-link text-[11px] text-white/70">
                    CHILL MODE
                  </button>
                </span>
              </div>
            )}

            <div className="scanlines pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="crt-glare pointer-events-none absolute inset-0" aria-hidden="true" />
          </div>
        </div>

        {/* Side panel: two dials, a grille and the power lamp. */}
        <div className="tv-panel flex w-[58px] shrink-0 flex-col items-center gap-3 px-1.5 py-3 sm:w-[76px] sm:gap-4">
          <button type="button" onClick={onChannel} className="dial" aria-label={`Channel dial, now on channel ${tape.channel}. Next channel`} title="Next channel">
            <span className="dial-mark" style={{ transform: `rotate(${(tape.channel - 1) * 60 - 120}deg)` }} />
          </button>
          <span className="font-pixel -mt-2 text-[9px] text-[#d8f3f1]">CH {ch}</span>
          <button type="button" onClick={onMute} className="dial dial-sm" aria-pressed={muted} aria-label={muted ? "Unmute sound" : "Mute sound"} title={muted ? "Unmute" : "Mute"}>
            <span className="dial-mark" style={{ transform: `rotate(${muted ? -130 : 40}deg)` }} />
          </button>
          <span className="font-pixel -mt-2 text-[9px] text-[#d8f3f1]">{muted ? "MUTE" : "VOL"}</span>
          <div className="grille mt-auto h-12 w-full sm:h-16" aria-hidden="true" />
          <span className={cn("lamp", screen.kind !== "boot" && "lamp-on")} aria-hidden="true" />
        </div>
      </div>
      <div className="flex justify-between px-10" aria-hidden="true">
        <span className="tv-foot" />
        <span className="tv-foot" />
      </div>
    </div>
  );
}

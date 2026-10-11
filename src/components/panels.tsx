"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/8bit/alert";
import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Kbd } from "@/components/ui/8bit/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/8bit/tooltip";
import XpBar from "@/components/ui/8bit/xp-bar";
import { CAT_PALETTE, HEART_MAP, INK, type Mood, PixelArt, catMap } from "@/components/pixel";
import { QUOTES, type Quote, type Tape, quotesOfTape } from "@/lib/quotes";
import { MAX_HEARTS, type Mode, levelOf, levelProgress } from "@/lib/store";
import { cn } from "@/lib/utils";

const HEART_ON = { o: INK, r: "#ee4b3b" };
const HEART_OFF = { o: "#b9b6a5", r: "#fffdf2" };

export function Hearts({ value, px = 2 }: { value: number; px?: number }) {
  return (
    <span className="inline-flex flex-wrap gap-[2px]" role="img" aria-label={`${value} of ${MAX_HEARTS} lives`}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <PixelArt key={i} map={HEART_MAP} palette={i < value ? HEART_ON : HEART_OFF} px={px} />
      ))}
    </span>
  );
}

// ── HUD ────────────────────────────────────────────────────────────────
interface HudProps {
  pulls: number;
  owned: number;
  xp: number;
  mode: Mode;
  hearts: number;
  streak: number;
  best: number;
  onBook: () => void;
  onSettings: () => void;
}

function Cell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("hud-cell min-w-0", className)}>
      <div className="font-display bg-[#1b1b1f] px-1 py-1 text-center text-[7px] tracking-wider whitespace-nowrap text-white sm:text-[8px] sm:tracking-widest">{label}</div>
      <div className="flex h-8 items-center justify-center bg-white px-2">{children}</div>
    </div>
  );
}

export function Hud({ pulls, owned, xp, mode, hearts, streak, best, onBook, onSettings }: HudProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
      <div className="hud-strip grid w-full grid-cols-4 gap-[10px] px-1 sm:w-auto sm:flex-1 lg:max-w-[640px]">
        <Cell label="PULLS">
          <span className="font-display text-[12px] text-[#12803f]">{String(pulls).padStart(3, "0")}</span>
        </Cell>
        <Cell label={mode === "arcade" ? "LIVES" : "GRIP"}>
          {mode === "arcade" ? <Hearts value={hearts} /> : <span className="font-display text-[8px] whitespace-nowrap text-[#1727b8] sm:text-[9px]">CHILL ∞</span>}
        </Cell>
        <Cell label="STREAK">
          <span className="font-display flex items-baseline gap-1.5 text-[11px] whitespace-nowrap text-[#ee4b3b]">
            {streak}
            <span className="text-[7px] text-[#8b8870]">TOP {best}</span>
          </span>
        </Cell>
        <Cell label={`LEVEL ${levelOf(xp)}`}>
          <XpBar value={levelProgress(xp)} className="w-full" aria-label={`Level progress ${levelProgress(xp)} percent`} />
        </Cell>
      </div>

      <div className="flex w-full items-center justify-between gap-4 px-1 sm:w-auto sm:justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={onBook} className="count-pill flex items-center gap-2 py-1 pr-3 pl-1.5" aria-label={`Quote book, ${owned} of ${QUOTES.length} collected`}>
              <span className="-my-2 block w-[42px] overflow-hidden">
                <PixelArt map={catMap("happy")} palette={CAT_PALETTE} px={1.75} />
              </span>
              <span className="font-pixel text-left text-[9px] leading-[1.1] text-[#5c5a4e]">
                QUOTE
                <br />
                COUNT
              </span>
              <span className="font-display text-[15px]">{owned}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Open the quote book</TooltipContent>
        </Tooltip>
        <Button type="button" variant="secondary" size="sm" className="text-[9px]" onClick={onBook}>
          BOOK
        </Button>
        <Button type="button" variant="outline" size="sm" className="bg-white text-[9px]" onClick={onSettings}>
          MENU
        </Button>
      </div>
    </header>
  );
}

// ── Mascot ─────────────────────────────────────────────────────────────
export interface Line {
  /** What the King announces to the room. */
  loud: string;
  /** What he mutters once nobody is listening. */
  aside?: string;
}

/** `lift` raises the speech bubble clear of a casket that has a roof. */
export function Mascot({ mood, line, lift, className }: { mood: Mood; line: Line; lift?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-end gap-3", className)}>
      <div className={cn("mascot relative z-10 shrink-0", mood === "sleep" ? "" : "bob")}>
        <PixelArt map={catMap(mood)} palette={CAT_PALETTE} px={4} />
        {mood === "sleep" && <span className="font-display zzz absolute -top-1 right-0 text-[10px]">z</span>}
        <span className="paw absolute -bottom-[9px] left-[14px]" />
        <span className="paw absolute right-[14px] -bottom-[9px]" />
      </div>
      {/* The margin lives on this wrapper: on the Alert itself it would sit inside the pixel frame. */}
      <div className={cn("min-w-0 flex-1", lift ? "mb-9" : "mb-6")}>
        <Alert className="speech bg-[#fffdf2] px-3 py-2.5" role="status">
          <AlertTitle className="text-[8px] tracking-widest text-[#9b6fd1]">KING CLAWDIUS</AlertTitle>
          <AlertDescription className="text-[#1b1b1f]">
            <span className="font-pixel block text-[12px] leading-snug sm:text-[13px]">{line.loud}</span>
            {line.aside && <span className="font-pixel mt-1 block text-[11px] leading-snug text-[#7a7868]">({line.aside})</span>}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// ── VCR deck + tape shelf ──────────────────────────────────────────────
interface TapeDeckProps {
  tapes: Tape[];
  active: Tape;
  owned: Record<string, number>;
  disabled: boolean;
  quote: Quote | null;
  fav: boolean;
  position: number;
  total: number;
  onTape: (id: string) => void;
  onRewind: () => void;
  onForward: () => void;
  onKeep: () => void;
  onCopy: () => void;
  onPostcard: () => void;
}

export function TapeDeck({ tapes, active, owned, disabled, quote, fav, position, total, onTape, onRewind, onForward, onKeep, onCopy, onPostcard }: TapeDeckProps) {
  const none = !quote;
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="vcr mt-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="slot min-w-0 flex-1 overflow-hidden px-2 py-1.5">
            {/* Re-keyed per tape so each change plays the cassette sliding in. */}
            <div key={active.id} className="slot-in flex items-center gap-2">
              <span className="h-4 w-2 shrink-0" style={{ background: active.color }} />
              <span className="font-display truncate text-[8px] text-[#9ef5c0]">
                ▶ CH {String(active.channel).padStart(2, "0")} {active.title}
              </span>
            </div>
          </div>
          <span className="counter font-display px-2 py-1.5 text-[9px]" aria-label={total ? `${position >= 0 ? `Quote ${total - position}` : "Nothing airing"} of ${total} in history` : "No quotes aired yet"}>
            {position >= 0 ? String(total - position).padStart(2, "0") : "--"}/{total ? String(total).padStart(2, "0") : "--"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-3">
          <Button type="button" size="sm" variant="secondary" className="text-[8px]" disabled={total === 0 || position >= total - 1} onClick={onRewind} aria-label="Rewind to the previous quote">
            ◀◀ REW
          </Button>
          <Button type="button" size="sm" variant="secondary" className={cn("text-[8px]", fav && "bg-[#ff5d8f] text-white hover:bg-[#ff5d8f]")} disabled={none} onClick={onKeep} aria-pressed={fav}>
            {fav ? "♥ KEPT" : "♡ KEEP"}
          </Button>
          <Button type="button" size="sm" variant="secondary" className="text-[8px]" disabled={none} onClick={onCopy}>
            COPY
          </Button>
          <Button type="button" size="sm" variant="secondary" className="text-[8px]" disabled={none} onClick={onPostcard} aria-label="Save this quote as a postcard image">
            CARD
          </Button>
          <Button type="button" size="sm" variant="secondary" className="text-[8px]" disabled={position <= 0} onClick={onForward} aria-label="Forward to the newest quote">
            FF ▶▶
          </Button>
        </div>
      </div>

      <div className="shelf mt-6 px-3 pt-2">
        <div className="mb-8 flex items-center justify-between">
          <span className="chip font-display px-2 py-1 text-[8px] tracking-widest text-[#5c5a4e]">TAPE SHELF</span>
          <span className="chip font-pixel hidden items-center gap-1.5 px-2 py-0.5 text-[10px] text-[#5c5a4e] sm:flex">
            <Kbd>←</Kbd>
            <Kbd>→</Kbd> move <Kbd>SPACE</Kbd> pick
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          {tapes.map((t) => {
            const all = quotesOfTape(t.id);
            const got = all.filter((x) => owned[x.id]).length;
            const on = t.id === active.id;
            const done = got === all.length;
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => onTape(t.id)}
                aria-pressed={on}
                aria-label={`Channel ${t.channel}: ${t.title}. ${got} of ${all.length} quotes collected${on ? ", in the deck" : ""}`}
                className={cn("tape group relative flex-1", on && "tape-on")}
              >
                {on ? (
                  <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-[#1b1b1f] border-[#1b1b1f] text-[6px] text-white">DECK</Badge>
                ) : done ? (
                  <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-[#ffcf3a] border-[#ffcf3a] text-[6px] text-[#1b1b1f]">100%</Badge>
                ) : got === 0 ? (
                  <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-[#4f7cff] border-[#4f7cff] text-[6px] text-white">NEW</Badge>
                ) : null}
                <span className="tape-body flex h-[104px] flex-col items-center justify-between px-1 py-1.5 sm:h-[118px]">
                  <span className="font-display text-[7px] text-white/80">CH{t.channel}</span>
                  <span className="tape-label font-display flex-1 py-1 text-[7px] sm:text-[8px]" style={{ background: t.color, color: t.ink }}>
                    {t.title}
                  </span>
                  <span className="font-display text-[7px] text-white">
                    {got}/{all.length}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="shelf-board" aria-hidden="true" />
      </div>
    </div>
  );
}

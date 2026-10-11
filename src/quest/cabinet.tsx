"use client";

import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { cn } from "@/lib/utils";

import { Art, Pix, type SpriteData, cloud, icon, letter, once, star } from "./art";
import { BALLS, BallArt, type BallDef, RARITY_LABEL } from "./balls";
import { CARD_STYLES, cardVars, quoteSize } from "./cards";
import { type QuestQuote, categoryLabel } from "./quotes";
import type { Save } from "./save";
import * as S from "./scenery-art";
import type { World, WorldId } from "./worlds";

// ── The garland ────────────────────────────────────────────────────────
// A line strung across the top of the glass in two swags, with things hanging
// off it. What hangs there belongs to the world: sweet dreams in Dreamland,
// coins and mushrooms in Mushroom Hills, a little solar system in Cosmic
// Arcade, race bunting in Neon Circuit, and an adventurer's kit in the dungeon.
const fromMap = (key: string, map: string[], pal: Record<string, string>) =>
  once(key, () => {
    const p = new Pix(map[0].length, map.length);
    p.stamp(map, pal, 0, 0);
    return p.done();
  });
const INK = "#34305e";
/** Outlines for things that hang against a dark wall: pale, so they read. */
const PALE = "#f0ecff";

// Dreamland.
const MOON = fromMap("charm-moon", ["..ooo..", ".oyyyo.", "oyyyoo.", "oyyo...", "oyyo...", "oyyyoo.", ".oyyyo.", "..ooo.."], { o: INK, y: "#fff3ae" });
const CLOUD = fromMap("charm-cloud", ["...ooo...", "..owwwo..", ".owwwwwoo", "owwwwwwwo", "owwwwwwwo", ".ooooooo."], { o: INK, w: "#ffffff" });
// Mushroom Hills.
const SHROOM = fromMap("charm-shroom", [".ooooooo.", "orrwrrrro", "orrrrrwro", "ooooooooo", "..occco..", "..occco..", "..ooooo.."], { o: INK, r: "#ee4b3b", w: "#ffffff", c: "#fff3d6" });
const LEAF = fromMap("charm-leaf", ["....ooo", "..oogho", ".ogghgo", "ogghggo", "oghggo.", "ohggo..", "oooo..."], { o: INK, g: "#4fbf5a", h: "#a9ec9c" });
// Cosmic Arcade.
const ROCKET = fromMap("charm-rocket", ["...r...", "..rrr..", "..www..", "..wbw..", "..www..", ".rwwwr.", "rr.w.rr", "...f...", "...y..."], { r: "#ff4fa8", w: "#f0ecff", b: "#4fd6ff", f: "#ff7a2f", y: "#ffd23f" });
const SAUCER = fromMap("charm-saucer", ["...ccc...", "..chhcc..", ".lllllll.", "lylplylpl", ".ddddddd."], { c: "#8fe6ff", h: "#e6fbff", l: "#b9b6ff", y: "#ffd23f", p: "#ff4fa8", d: "#7a74c8" });
// Dungeon Quest: what an adventurer carries.
const KEY = fromMap("charm-key", [".ggg.", "gh..g", "g...g", ".ggg.", "..g..", "..g..", "..gg.", "..g..", "..gg."], { g: "#ffc93a", h: "#fff0a8" });
const POTION = fromMap("charm-potion", ["..www..", "..ogo..", "..ogo..", ".ogggo.", "ogrrrgo", "orrhrro", "orrrrro", ".orrro.", "..ooo.."], { o: PALE, g: "#bfe6ff", r: "#ee4b3b", h: "#ffb0a6", w: "#b0753c" });
const SWORD = fromMap("charm-sword", ["...g...", "..ggg..", "ggggggg", "..shd..", "..shd..", "..shd..", "..shd..", "..shd..", "...s..."], { g: "#ffc93a", s: "#c0bbd0", h: "#ffffff", d: "#8a8598" });
const SHIELD = fromMap("charm-shield", ["ggggggg", "gbbwbbg", "gbbwbbg", "gwwwwwg", "gbbwbbg", ".gbwbg.", "..gbg..", "...g..."], { g: "#ffc93a", b: "#3f5fd8", w: "#ffffff" });
const SKULL = fromMap("charm-skull", [".ooooo.", "owwwwwo", "owkwkwo", "owwwwwo", ".owkwo.", ".owwwo.", "..ooo.."], { o: "#8a8598", w: "#f0ecff", k: "#14122e" });
const LANTERN = fromMap("charm-lantern", ["..ooo..", ".ooooo.", ".oyyyo.", ".oyhyo.", ".oyhyo.", ".oyyyo.", ".ooooo.", "..ooo.."], { o: "#8a8598", y: "#ffb52e", h: "#fff0a8" });
/** A race pennant: a triangle, plain or checkered. */
const pennant = (a: string, b = a) =>
  once(`pennant-${a}-${b}`, () => {
    const p = new Pix(7, 8);
    [7, 7, 5, 5, 3, 3, 1, 1].forEach((w, y) => {
      for (let i = 0; i < w; i++) {
        const x = (7 - w) / 2 + i;
        p.set(x, y, (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? b : a);
      }
    });
    return p.done();
  });

const GARLANDS: Record<WorldId, { line: [string, string]; hang: SpriteData[]; count: number }> = {
  dream: { line: ["#9c82d8", "#9c82d8"], hang: [icon("heart"), icon("starlet"), MOON, CLOUD, icon("starlet"), icon("heart")], count: 6 },
  mushroom: { line: ["#8a5a2f", "#8a5a2f"], hang: [S.coin(), SHROOM, LEAF, S.coin(), SHROOM, LEAF], count: 6 },
  cosmic: { line: ["#8f8cf0", "#8f8cf0"], hang: [icon("starlet"), S.moon(4), ROCKET, S.planet(4, ["#8ff0e0", "#4fc8c0", "#2a9aa0"], "#1a5a70"), SAUCER, icon("starlet")], count: 6 },
  racing: { line: ["#f4f1ff", "#f4f1ff"], hang: [pennant("#ee2f4a"), pennant("#f4f1ff", "#22212e"), pennant("#ff7a2f"), pennant("#3fa9ff")], count: 10 },
  // An iron chain: light link, dark link.
  dungeon: { line: ["#b0acc0", "#5a5568"], hang: [LANTERN, KEY, POTION, SWORD, SHIELD, SKULL], count: 6 },
};

/** Art pixels. The glass is 144 wide inside its rim; this leaves four clear on each side. */
const GARLAND_W = 136;
const SWAG = GARLAND_W / 2;
/** How far the line has sagged at x: nothing at the three nails, three pixels mid-swag. */
const sag = (x: number) => {
  const t = (x % SWAG) / (SWAG - 1);
  return 1 + Math.round(12 * t * (1 - t));
};

/** The whole garland as one sprite. */
function garland(world: WorldId) {
  return once(`garland-${world}`, () => {
    const g = GARLANDS[world];
    const p = new Pix(GARLAND_W, 14);
    for (let x = 0; x < GARLAND_W; x++) p.set(x, sag(x), g.line[x % 2]);
    // Three nails hold it up.
    for (const x of [0, SWAG - 1, GARLAND_W - 2]) p.rect(x, 0, 2, 3, g.line[0]);
    for (let i = 0; i < g.count; i++) {
      const s = g.hang[i % g.hang.length];
      const cx = Math.round(((i + 0.5) * GARLAND_W) / g.count);
      S.blit(p, s, cx - Math.floor(s.w / 2), sag(cx) + 1);
    }
    return p.done();
  });
}

// The parts of the arcade cabinet. The shapes are shared by every world; the
// colours, patterns and trim come from quest.css under [data-world], and the
// ornaments bolted to the outside are chosen here.

function Lamps() {
  return (
    <div className="qq-bulbs" aria-hidden="true">
      {Array.from({ length: 17 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

/**
 * The banner. Every world lays it out the same way, top to bottom: a clear band where the cub's
 * paws hook over the edge, the name, the tagline, then a row of lamps running the full width.
 * (Neon Circuit runs a checkered strip where the lamps would be.) Nothing sits behind the paws,
 * and the three rows are spaced evenly.
 */
export function Marquee({ world, short = false }: { world: World; short?: boolean }) {
  return (
    <header className="qq-box qq-head px-6 pt-[32px] pb-[18px]" data-short={short || undefined}>
      <h1 className="flex items-center justify-center gap-4" aria-label="Quote Quest">
        {["QUOTE", "QUEST"].map((word, w) => (
          <span key={word} className="flex" aria-hidden="true">
            {[...word].map((ch, i) => (
              // Each letter hops a beat after the one before it, so a wave runs through the name.
              <Art key={i} sprite={letter(ch, world.inks[w * 5 + i])} className={cn("qq-title-ch", i > 0 && "-ml-1")} style={{ animationDelay: `${(w * 5 + i) * 0.09}s` }} />
            ))}
          </span>
        ))}
      </h1>
      {/* A short window keeps the name and drops the two rows under it. */}
      {!short && (
        <>
          <p className="qq-sub qq-copy mt-[14px] flex items-center justify-center gap-3">
            <Art sprite={icon("pip")} px={2} className="qq-pip" />A little wisdom, one grab away.
            <Art sprite={icon("pip")} px={2} className="qq-pip" />
          </p>
          <div className="mt-[16px]">{world.id === "racing" ? <div className="qq-checker-row" aria-hidden="true" /> : <Lamps />}</div>
        </>
      )}
    </header>
  );
}

/** The ornaments on top of the marquee: each world bolts on something of its own. */
export function Topper({ world }: { world: World }) {
  const id = world.id;
  return (
    <div className="pointer-events-none absolute top-[92px] right-3 z-10 h-0 w-[58px]" aria-hidden="true">
      {id === "dream" && (
        <>
          <Art sprite={cloud(18, "pink")} px={3} className="absolute right-0 bottom-0" />
          <Art sprite={star(12, false)} px={3} className="absolute right-[10px] bottom-[26px]" />
        </>
      )}
      {id === "mushroom" && <Art sprite={S.mushroom(18)} px={3} className="absolute right-0 -bottom-[3px]" />}
      {id === "cosmic" && (
        <>
          <span className="qq-mast absolute right-[26px] bottom-0" />
          <Art sprite={S.moon(5)} px={3} className="absolute right-[-4px] bottom-[6px]" />
        </>
      )}
      {id === "racing" && <Art sprite={S.flag()} px={3} className="absolute right-[2px] bottom-0" />}
      {id === "dungeon" && (
        <>
          <Art sprite={S.crystal("violet", 10)} px={3} className="absolute right-[30px] -bottom-[3px]" />
          <Art sprite={S.crystal("emerald", 14)} px={3} className="absolute right-0 -bottom-[3px]" />
        </>
      )}
    </div>
  );
}

/** What hangs off the sides of the glass: charms, coins, neon tubes, flags or torches. */
export function Flanks({ world }: { world: World }) {
  const id = world.id;
  const torch = (
    <span className="relative block h-[81px] w-[30px]">
      <Art sprite={S.flame(0)} px={3} className="sc-flick-a absolute top-0 left-0" />
      <Art sprite={S.flame(1)} px={3} className="sc-flick-b absolute top-0 left-0" />
      <Art sprite={S.torchBracket()} px={3} className="absolute top-[39px] left-[3px]" />
    </span>
  );
  return (
    <>
      {(["l", "r"] as const).map((side) => (
        <div key={side} className={cn("qq-flank", side === "l" ? "qq-flank-l" : "qq-flank-r")} aria-hidden="true">
          {id === "dream" && (
            // A candy-striped barber pole, held at each end by the same gold cap.
            <span className="qq-candy">
              <i className="qq-candy-end qq-candy-top" />
              <i className="qq-candy-end qq-candy-bottom" />
            </span>
          )}
          {id === "mushroom" &&
            [0, 1, 2].map((n) => (
              // A coin on a peg. They stay face-on; a glint runs down each side in turn.
              <span key={n} className="qq-peg" style={{ animationDelay: `${n * 0.3 + (side === "l" ? 0 : 1.2)}s` }}>
                <Art sprite={S.coin()} px={3} />
              </span>
            ))}
          {id === "cosmic" && <span className="qq-tube" />}
          {id === "racing" && <span className="qq-checker" />}
          {id === "dungeon" && torch}
        </div>
      ))}
    </>
  );
}

/** The garland across the top of the glass. It hangs still. */
export function Garland({ world }: { world: World }) {
  return <Art sprite={garland(world.id)} px={3} className="qq-garland" aria-hidden="true" />;
}

/**
 * Light on the glass. Every pane has a lit top and left edge and a shaded bottom and right;
 * what it reflects depends on where the machine is standing. All of it sits in the open
 * middle of the glass, clear of the garland, the rail and the sign.
 */
export function GlassShine({ world }: { world: World }) {
  const id = world.id;
  /** A stepped diagonal bar: one unit of slope per row. */
  const bar = (key: string, x: number, y: number, len: number, w: number, fill: string, opacity: number) =>
    Array.from({ length: len }, (_, r) => <rect key={`${key}${r}`} x={x - r} y={y + r} width={w} height="1" fill={fill} opacity={opacity} />);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 114 97" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="3" width="108" height="1" fill="#ffffff" opacity="0.32" />
      <rect x="3" y="4" width="1" height="90" fill="#ffffff" opacity="0.22" />
      <rect x="3" y="93" width="108" height="1" fill="#000000" opacity="0.14" />
      <rect x="110" y="4" width="1" height="89" fill="#000000" opacity="0.1" />
      {/* Dreamland: a broad soft shine and a thin one beside it. */}
      {id === "dream" && [bar("a", 100, 28, 18, 6, "#ffffff", 0.42), bar("b", 108, 28, 12, 2, "#ffffff", 0.34), bar("c", 62, 62, 8, 2, "#ffffff", 0.26)]}
      {/* Mushroom Hills: two crisp bars, and a short third lower down. */}
      {id === "mushroom" && [bar("a", 98, 28, 16, 4, "#ffffff", 0.46), bar("b", 105, 28, 10, 2, "#ffffff", 0.36), bar("c", 70, 58, 7, 3, "#ffffff", 0.3)]}
      {/* Cosmic Arcade: four thin neon lines. */}
      {id === "cosmic" && [0, 1, 2, 3].map((n) => bar(`n${n}`, 106 - n * 4, 28, 20 - n * 3, 1, n % 2 ? "#ff8fd0" : "#8fe6ff", 0.6))}
      {/* Neon Circuit: streaks of passing light. */}
      {id === "racing" &&
        [
          [74, 30, 30, "#ffffff"],
          [86, 34, 18, "#ffb070"],
          [68, 38, 24, "#ffffff"],
          [92, 42, 12, "#3fd0ff"],
          [80, 46, 16, "#ffb070"],
        ].map(([x, y, w, c]) => <rect key={y} x={x} y={y} width={w} height="1" fill={c as string} opacity="0.42" />)}
      {/* Dungeon Quest: old, thick glass by torchlight. Two warm bars where the others have white, and a short one answering low on the left. */}
      {id === "dungeon" && [bar("a", 99, 28, 15, 3, "#ffd98a", 0.36), bar("b", 105, 28, 9, 1, "#ffd98a", 0.3), bar("c", 22, 70, 7, 2, "#ffd98a", 0.2)]}
    </svg>
  );
}

/** Where the eight sparkles sit around the prize, in percent of the glass. */
const SPARKS = [
  [18, 22],
  [80, 18],
  [88, 52],
  [70, 82],
  [28, 84],
  [10, 56],
  [36, 12],
  [62, 10],
];

/**
 * The prize reveal. Trigger: a ball reaches the chute. Owner: the game, while
 * its phase is "open". Length: 2.3s, always. Rise, whirl, crack, flash.
 * The rays are the same ones that turn behind the quote card afterwards and sit
 * behind it in the downloaded picture: one palette per rarity, eight even fans.
 */
export function PrizeReveal({ ball, fresh }: { ball: BallDef; fresh: boolean }) {
  const banner = ball.rarity === "legendary" ? "LEGENDARY BALL!" : ball.rarity === "rare" ? "RARE BALL!" : fresh ? "NEW BALL FOUND!" : "YOU WON A QUOTE!";
  return (
    <div className="qq-prize absolute inset-1 overflow-hidden" data-rarity={ball.rarity} aria-hidden="true">
      <div className="qq-rays" />
      <div className="qq-halo" />
      {SPARKS.map(([l, t], i) => (
        <span key={i} className="qq-spark" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${i * 0.13}s` }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center pb-6">
        <div className="qq-rise">
          <div className="qq-lid">
            <BallArt id={ball.id} half="lid" px={8} />
          </div>
          <div className="qq-cup">
            <BallArt id={ball.id} half="cup" px={8} />
          </div>
        </div>
      </div>
      <div className="qq-banner">
        <Badge className="border-[#34305e] bg-[#34305e] text-[12px] leading-[1.7] text-white">{banner}</Badge>
        <p className="qq-copy mt-2.5 text-center text-[#34305e]">
          {ball.name} Ball · {RARITY_LABEL[ball.rarity]}
        </p>
      </div>
      <div className="qq-flash" />
    </div>
  );
}

interface ShowcaseProps {
  quote: QuestQuote;
  ball: BallDef;
  world: World;
  typed: number;
  done: boolean;
  fav: boolean;
  downloaded: boolean;
  index: number;
  total: number;
  /** Which quote of all the ones ever revealed this is. The pager counts only the last 40. */
  number: number;
  onSkip: () => void;
  onStep: (dir: -1 | 1) => void;
  onFav: () => void;
  onDownload: () => void;
  onAgain: () => void;
}

/**
 * The quote, on stage. The card steps out in front of the machine, the rest of
 * the screen dims, and slow prize rays turn behind it. The card holds only the
 * quote, in the text box of the world you are in (see cards.ts); everything you
 * can do with it sits in one row underneath.
 */
export function QuoteShowcase({ quote, ball, world, typed, done, fav, downloaded, index, total, number, onSkip, onStep, onFav, onDownload, onAgain }: ShowcaseProps) {
  const style = CARD_STYLES[world.id];
  return (
    <section className="qq-show" data-rarity={ball.rarity} aria-label="Your quote">
      <div className="qq-show-rays" aria-hidden="true" />
      <div className="qq-show-inner qq-pop" data-card={world.id} style={cardVars(style)}>
        <Card font="normal" className="qq-show-card w-full gap-0 py-0">
          <CardContent className="qq-card relative p-0" onClick={onSkip}>
            <p className="sr-only" aria-live="polite">
              {quote.text} {quote.author}
            </p>
            <header className="qq-card-bar retro" aria-hidden="true">
              <span className="flex items-center gap-2.5">
                <i className="qq-led" />
                {style.title}
              </span>
              <span className="flex items-center gap-3">
                {world.id === "cosmic" && (
                  <span className="qq-signal">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                No.{pad(number, 3)}
              </span>
            </header>
            <div className="qq-card-body" aria-hidden="true">
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <i key={c} className={`qq-corner qq-corner-${c}`} />
              ))}
              <span className="qq-card-tag retro">{categoryLabel(quote.cat).toUpperCase()}</span>
              <blockquote className="qq-card-quote">
                <p className="qq-card-text retro" data-size={quoteSize(quote.text)}>
                  {quote.text.slice(0, typed)}
                  {!done && <span className="qq-caret" />}
                  {/* The untyped rest keeps its space, so the card never changes size mid-sentence. */}
                  <span className="invisible">{quote.text.slice(typed)}</span>
                </p>
              </blockquote>
              <cite className={cn("qq-card-plate retro", done ? "" : "opacity-0")}>{quote.author}</cite>
            </div>
            <footer className="qq-card-foot retro" aria-hidden="true">
              <BallArt id={ball.id} px={2} />
              <span>
                {ball.name.toUpperCase()} BALL
                <span className="qq-rarity-chip" data-rarity={ball.rarity}>
                  {" · "}
                  {RARITY_LABEL[ball.rarity].toUpperCase()}
                </span>
              </span>
            </footer>
          </CardContent>
        </Card>

        <div className="qq-show-actions">
          <Button font="normal" variant="outline" className="qq-btn qq-paper-btn h-11 w-11 p-0" aria-label="Previous quote" disabled={!done || index <= 0} onClick={() => onStep(-1)}>
            <Art sprite={icon("prev")} px={3} className="size-auto" />
          </Button>
          <span className="qq-show-count" aria-label={`Quote ${index + 1} of ${total}`}>
            {index + 1}/{total}
          </span>
          <Button font="normal" variant="outline" className="qq-btn qq-paper-btn h-11 w-11 p-0" aria-label="Next quote" disabled={!done || index >= total - 1} onClick={() => onStep(1)}>
            <Art sprite={icon("next")} px={3} className="size-auto" />
          </Button>
          <span className="qq-show-gap" />
          <Button font="normal" variant="outline" className="qq-paper-btn retro h-11 gap-2 px-2 text-[12px]" data-on={fav} aria-pressed={fav} disabled={!done} onClick={onFav}>
            <Art sprite={icon(fav ? "heartFull" : "heartLine")} px={2} className="size-auto" />
            {fav ? "SAVED" : "SAVE"}
          </Button>
          <Button font="normal" variant="outline" className="qq-paper-btn retro h-11 gap-2 px-2 text-[12px]" disabled={!done} onClick={onDownload}>
            <Art sprite={icon("down")} px={2} className="size-auto" />
            {downloaded ? "DONE!" : "DOWNLOAD"}
          </Button>
          <Button className="qq-go-btn qq-show-go h-11 px-3 text-[12px]" onClick={done ? onAgain : onSkip}>
            {done ? "PLAY AGAIN" : "SKIP"}
          </Button>
        </div>
      </div>
    </section>
  );
}

interface ControlsProps {
  /** What the big button does right now. With a quote on stage it still reads GRAB ME!: pressing it goes back for another. */
  mode: "grab" | "wait" | "skip" | "again";
  canSteer: boolean;
  onHold: (side: "left" | "right", on: boolean) => void;
  onMain: () => void;
}


/** What an arrow button needs so that holding it steers and a tap nudges, by mouse, touch or keyboard. */
const steerProps = (onHold: ControlsProps["onHold"], side: "left" | "right") => ({
  onPointerDown: () => onHold(side, true),
  onPointerUp: () => onHold(side, false),
  onPointerLeave: () => onHold(side, false),
  onPointerCancel: () => onHold(side, false),
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  // Keyboard and switch users: Enter or Space nudges the claw one step.
  onKeyDown: (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      onHold(side, true);
      onHold(side, false);
    }
  },
});

function Arrow({ side, wide, canSteer, onHold }: { side: "left" | "right"; wide: boolean; canSteer: boolean; onHold: ControlsProps["onHold"] }) {
  return (
    <Button font="normal" variant="outline" className={cn("qq-btn qq-key-btn h-[68px] touch-none", wide ? "w-[78px]" : "w-[64px]")} aria-label={`Move claw ${side}`} disabled={!canSteer} {...steerProps(onHold, side)}>
      <Art sprite={icon(side === "left" ? "arrowL" : "arrowR")} px={4} className="size-auto" />
    </Button>
  );
}

function GrabButton({ mode, onMain, className }: Pick<ControlsProps, "mode" | "onMain"> & { className?: string }) {
  return (
    <Button
      className={cn("qq-go-btn h-[68px] text-[20px] tracking-[0.04em]", className)}
      disabled={mode === "wait"}
      onClick={(e) => {
        e.currentTarget.blur();
        onMain();
      }}
    >
      <span>GRAB ME!</span>
    </Button>
  );
}

/** Two arrows and one big button, on the ledge under the glass. That is the whole control scheme. */
export function Controls({ mode, canSteer, onHold, onMain }: ControlsProps) {
  return (
    <div className="qq-box qq-ledge -mt-1 px-7 pt-6 pb-8">
      <div className="flex items-center gap-[22px]">
        <Arrow side="left" wide canSteer={canSteer} onHold={onHold} />
        <Arrow side="right" wide canSteer={canSteer} onHold={onHold} />
        <GrabButton mode={mode} onMain={onMain} className="flex-1" />
      </div>
    </div>
  );
}

/**
 * The same controls for the deck beside the glass, where a short window puts them: the arrows
 * on one row (with whatever small buttons are passed in at the far end), the big button below.
 */
export function DeckControls({ mode, canSteer, onHold, onMain, children }: ControlsProps & { children?: React.ReactNode }) {
  return (
    <div className="qq-deck-keys">
      <div className="flex items-end gap-[18px]">
        <Arrow side="left" wide={false} canSteer={canSteer} onHold={onHold} />
        <Arrow side="right" wide={false} canSteer={canSteer} onHold={onHold} />
        <span className="flex-1" />
        {children}
      </div>
      <GrabButton mode={mode} onMain={onMain} className="w-full" />
    </div>
  );
}

const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const stats = (save: Save) => [
  ["QUOTES", pad(save.pulls, 3)],
  ["FAVES", pad(save.favs.length)],
  ["BALLS", `${save.dex.length}/${BALLS.length}`],
];

/** The three counters on one line, in an 8bitcn card, for wherever the full status screen does not fit. */
export function StatStrip({ save }: { save: Save }) {
  return (
    <Card font="normal" className="qq-stats">
      <dl className="qq-stats-row" aria-label="Arcade stats">
        {stats(save).map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="qq-lcd-dim">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** The base: the prize door, and a little status screen like a credits display. A short window gets a slim one. */
export function Base({ save, world, cat, slim = false }: { save: Save; world: World; cat: string; slim?: boolean }) {
  if (slim) {
    return (
      <div className="qq-box qq-base -mt-1 px-6 py-[10px]" data-slim>
        <StatStrip save={save} />
      </div>
    );
  }
  return (
    <div className="qq-box qq-base -mt-1 px-6 pt-5 pb-5">
      <div className="flex items-stretch gap-5">
        <div className="qq-door w-[132px]" aria-hidden="true">
          <span key={save.pulls} className={cn("qq-flap", save.pulls > 0 && "qq-flap-kick")} />
          <span className="qq-door-label">PRIZE</span>
        </div>
        <dl className="qq-lcd flex-1" aria-label="Arcade stats">
          <div className="grid grid-cols-3">
            {stats(save).map(([label, value]) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <dt className="qq-lcd-dim text-[length:var(--t8,8px)]">{label}</dt>
                <dd className="text-[16px]">{value}</dd>
              </div>
            ))}
          </div>
          <div className="qq-lcd-line mt-2 flex justify-center gap-2 pt-2 text-[length:var(--t8,8px)]">
            <dt className="sr-only">World and quote type</dt>
            <dd className="truncate">
              W{world.stage} {world.name.toUpperCase()} <span className="qq-lcd-dim">·</span> {cat.toUpperCase()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function Feet() {
  return (
    <>
      <div className="-mt-1 flex justify-between px-6" aria-hidden="true">
        <span className="qq-foot" />
        <span className="qq-foot" />
      </div>
      <div className="qq-shadow" aria-hidden="true" />
      <div className="qq-aura" aria-hidden="true" />
    </>
  );
}

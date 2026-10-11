"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/8bit/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/8bit/tabs";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

import { Art, icon, tiger } from "./art";
import { BALLS, BallArt, type BallDef, type BallId, BallShadow, RARITY_LABEL, ballById } from "./balls";
import { songName } from "./music";
import { CATEGORIES, type Category, categoryLabel, quoteById } from "./quotes";
import type { Save } from "./save";
import { WorldThumb } from "./scenery";
import { WORLDS, type World, type WorldId } from "./worlds";

// Everything that sits around the cabinet: the level select, the quote types,
// the ball dex and the quote book. Each is a plain component so the wide layout
// can stand them beside the machine and the narrow one can put them in dialogs.

/** A section label, in the pixel display font. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("qq-tagline", className)}>
      <Badge className="border-[var(--tag)] bg-[var(--tag)] text-[12px] leading-[1.6] text-[var(--tag-ink)]">{children}</Badge>
    </h2>
  );
}

/**
 * The level select. Beside the machine it is a list: a row per world, with a cursor on the one
 * you are in. In a small window it opens as a dialog and lays out as a row of level cards
 * instead (see `WorldTile`), wrapping to as many rows as the window needs.
 */
export function WorldSelector({ value, onChange, className, layout = "list" }: { value: WorldId; onChange: (id: WorldId) => void; className?: string; layout?: "list" | "grid" }) {
  const grid = layout === "grid";
  return (
    <section className={className} aria-label="Choose your world">
      <Tag>CHOOSE YOUR WORLD</Tag>
      <div role="radiogroup" aria-label="World" className={grid ? "qq-world-grid" : "mt-4 flex flex-col gap-[18px]"}>
        {WORLDS.map((w) => {
          const on = w.id === value;
          if (grid) return <WorldTile key={w.id} world={w} on={on} onPick={() => onChange(w.id)} />;
          return (
            <Button
              key={w.id}
              font="normal"
              variant="outline"
              role="radio"
              aria-checked={on}
              data-on={on}
              data-w={w.id}
              className="qq-btn qq-ui-btn qq-world-btn h-[68px] w-full justify-start gap-3 px-2.5 text-left"
              onClick={() => onChange(w.id)}
            >
              {on && <Art sprite={icon("next")} px={4} className="qq-cursor size-auto" />}
              <span className="qq-thumb">
                <WorldThumb world={w.id} />
              </span>
              <span className="flex min-w-0 flex-col items-start gap-[6px] leading-none">
                <span className="qq-world-stage">WORLD {w.stage}</span>
                <span className="retro text-[12px] leading-[1.5] whitespace-nowrap">{w.name.toUpperCase()}</span>
                <span className="qq-world-tag text-[length:var(--t8,8px)] leading-[1.5] whitespace-nowrap">{w.tag}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * A level card for the dialog, built like a game cartridge label. Every card has the same five
 * rows at the same heights (header strip, picture, name, one line about it, its tune), so a
 * row of them lines up edge to edge. The world you are in has the menu cursor above it and its
 * tune strip lit.
 */
function WorldTile({ world, on, onPick }: { world: World; on: boolean; onPick: () => void }) {
  return (
    <Button font="normal" variant="outline" role="radio" aria-checked={on} data-on={on} data-w={world.id} className="qq-btn qq-ui-btn qq-world-btn qq-world-tile" onClick={onPick}>
      {on && <Art sprite={icon("cursorDown")} px={4} className="qq-tile-cursor size-auto" />}
      <span className="qq-tile-bar retro">WORLD {world.stage}</span>
      <span className="qq-tile-pic">
        <span className="qq-thumb qq-tile-thumb">
          <WorldThumb world={world.id} px={3} />
        </span>
      </span>
      <span className="qq-tile-name retro">{world.name.toUpperCase()}</span>
      <span className="qq-world-tag qq-tile-tag">{world.tag}</span>
      <span className="qq-tile-foot retro">
        <Art sprite={icon("note")} px={1} className="size-auto" />
        {songName(world.id).toUpperCase()}
      </span>
    </Button>
  );
}

export function CategoryPicker({ value, onChange, className }: { value: Category; onChange: (id: Category) => void; className?: string }) {
  return (
    <section className={className} aria-label="Quote type">
      <Tag>QUOTE TYPE</Tag>
      <div role="radiogroup" aria-label="Quote type" className="mt-4 flex flex-wrap gap-x-[18px] gap-y-[18px]">
        {CATEGORIES.map((c) => (
          <Button
            key={c.id}
            font="normal"
            variant="outline"
            role="radio"
            aria-checked={value === c.id}
            data-on={value === c.id}
            className="qq-ui-btn retro h-11 grow gap-1.5 px-2 text-[12px] uppercase"
            onClick={() => onChange(c.id)}
          >
            <Art sprite={icon(c.icon)} px={2} className="size-auto" />
            {c.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

export function BallDex({ found, onInspect, className }: { found: BallId[]; onInspect: (b: BallDef, has: boolean) => void; className?: string }) {
  return (
    <section className={className} aria-label="Ball collection">
      <Tag>
        BALLS {found.length}/{BALLS.length}
      </Tag>
      <div className="mt-4 grid grid-cols-4 gap-[18px]">
        {BALLS.map((b) => {
          const has = found.includes(b.id);
          return (
            <Button
              key={b.id}
              font="normal"
              variant="outline"
              className="qq-btn qq-ui-btn qq-dex-btn h-[52px] w-full p-0"
              data-rarity={has ? b.rarity : undefined}
              aria-label={has ? `${b.name} ball, ${RARITY_LABEL[b.rarity]}` : "A ball you have not found yet"}
              onClick={() => onInspect(b, has)}
            >
              {has ? <BallArt id={b.id} px={2} className="size-auto" /> : <BallShadow px={2} className="size-auto opacity-60" />}
            </Button>
          );
        })}
      </div>
    </section>
  );
}

// ── Menu buttons ───────────────────────────────────────────────────────
// Wherever the full menus do not fit (the bar across the top of a small window, the deck beside
// the glass in a short one) these four stand in for them. Each says what is chosen now.

export function WorldButton({ world, onClick }: { world: World; onClick: () => void }) {
  return (
    <Button font="normal" variant="outline" className="qq-ui-btn qq-bar-btn qq-bar-world retro" aria-label={`World ${world.stage}: ${world.name}. Change world`} onClick={onClick}>
      <span className="qq-thumb">
        <WorldThumb world={world.id} px={2} />
      </span>
      <span className="qq-bar-text">
        <span className="qq-bar-label">WORLD {world.stage}</span>
        <span className="qq-bar-value">{world.name.toUpperCase()}</span>
      </span>
      <Art sprite={icon("caret")} px={3} className="qq-bar-caret size-auto" />
    </Button>
  );
}

export function TypeButton({ cat, onClick }: { cat: Category; onClick: () => void }) {
  return (
    <Button font="normal" variant="outline" className="qq-ui-btn qq-bar-btn qq-bar-type retro" aria-label={`Quote type: ${categoryLabel(cat)}. Change type`} onClick={onClick}>
      <Art sprite={icon(CATEGORIES.find((c) => c.id === cat)?.icon ?? "bulb")} px={3} className="qq-bar-art size-auto" />
      <span className="qq-bar-text">
        <span className="qq-bar-label">QUOTE TYPE</span>
        <span className="qq-bar-value">{categoryLabel(cat).toUpperCase()}</span>
      </span>
      <Art sprite={icon("caret")} px={3} className="qq-bar-caret size-auto" />
    </Button>
  );
}

/** Opens the Quote Book. Given a count, it shows how many quotes are saved beside the heart. */
export function BookButton({ count, onClick }: { count?: number; onClick: () => void }) {
  return (
    <Button font="normal" variant="outline" className={cn("qq-ui-btn qq-bar-icon retro", count != null && count > 0 && "qq-bar-book")} aria-label={count == null ? "Quote book" : `Quote book. ${count} saved`} onClick={onClick}>
      <Art sprite={icon("heartFull")} px={3} className="qq-heart size-auto" />
      {count != null && count > 0 && <span className="qq-bar-num">{count > 99 ? "99+" : pad(count)}</span>}
    </Button>
  );
}

/** One audio button: music and effects, then effects only, then silence. */
export function AudioButton({ muted, music, onClick }: { muted: boolean; music: boolean; onClick: () => void }) {
  const tune = music && !muted;
  return (
    <Button font="normal" variant="outline" className="qq-ui-btn qq-bar-icon" data-on={tune} aria-label={muted ? "Sound is off. Turn it on" : tune ? "Music and effects are on. Turn the music off" : "Effects only. Turn all sound off"} onClick={onClick}>
      <Art sprite={icon(muted ? "soundOff" : tune ? "note" : "soundOn")} px={3} className="size-auto" />
    </Button>
  );
}

export type BookTab = "saved" | "recent" | "balls";

interface BookProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: BookTab;
  onTab: (tab: BookTab) => void;
  save: Save;
  onToggleFav: (id: string) => void;
  onCopy: (id: string) => void;
  onDownload: (id: string) => void;
  /** Ids of the quote just copied or downloaded, to flip its button label. */
  copied: string | null;
  downloaded: string | null;
}

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** One ball in the sticker album at the back of the book. */
function Sticker({ ball, has }: { ball: BallDef; has: boolean }) {
  return (
    <li className="qq-sticker" data-rarity={has ? ball.rarity : undefined} data-has={has}>
      {has ? <BallArt id={ball.id} px={3} /> : <BallShadow px={3} className="opacity-40" />}
      <p className="retro mt-2 text-[length:var(--t8,8px)] leading-[1.6]">{has ? ball.name.toUpperCase() : "???"}</p>
      <p className="qq-rarity retro text-[length:var(--t8,8px)] leading-[1.6]">{RARITY_LABEL[ball.rarity].toUpperCase()}</p>
    </li>
  );
}

/**
 * The inside of the Quote Book: an open book, one quote to a spread. The left
 * page shows the ball the quote came out of, the right page the quote itself.
 * Ribbon bookmarks along the top switch between saved quotes, recent quotes and
 * the ball album; the arrows (or the arrow keys) turn the page.
 */
function Book({ tab, onTab, save, onToggleFav, onCopy, onDownload, copied, downloaded }: Omit<BookProps, "open" | "onOpenChange">) {
  // Each section remembers its own page.
  const [at, setAt] = useState<Record<BookTab, number>>({ saved: 0, recent: 0, balls: 0 });
  const [turn, setTurn] = useState<{ id: number; dir: 1 | -1 } | null>(null);

  const recent = [...save.log].reverse();
  const entries = tab === "saved" ? [...save.favs].reverse().map((q) => ({ q, b: recent.find((e) => e.q === q)?.b ?? null })) : tab === "recent" ? recent : [];
  const count = tab === "balls" ? 1 : entries.length;
  const i = Math.min(at[tab], Math.max(0, count - 1));
  const entry = entries[i] ?? null;
  const quote = entry ? quoteById(entry.q) : null;
  const ball = entry?.b ? ballById(entry.b) : null;
  const fav = !!quote && save.favs.includes(quote.id);

  const go = (dir: 1 | -1) => {
    const n = i + dir;
    if (n < 0 || n >= count) return;
    setAt((a) => ({ ...a, [tab]: n }));
    setTurn((t) => ({ id: (t?.id ?? 0) + 1, dir }));
    sfx.page();
  };
  const TABS: { id: BookTab; label: string }[] = [
    { id: "saved", label: `SAVED ${save.favs.length}` },
    { id: "recent", label: "RECENT" },
    { id: "balls", label: `BALLS ${save.dex.length}/${BALLS.length}` },
  ];

  return (
    <Tabs
      className="qq-book"
      data-tab={tab}
      value={tab}
      onValueChange={(next) => {
        if (next === tab) return;
        onTab(next as BookTab);
        setTurn((x) => ({ id: (x?.id ?? 0) + 1, dir: 1 }));
        sfx.page();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        else if (e.key === "ArrowRight") go(1);
      }}
    >
      <div className="qq-book-top">
        {/* On the tabs the arrow keys move between sections, so they must not also turn the page. */}
        <TabsList className="qq-bookmarks" aria-label="Sections of the book" onKeyDown={(e) => e.stopPropagation()}>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="qq-bookmark" data-tab={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* On a phone there is a second way out, at the top, where no browser toolbar can cover it. */}
        <DialogClose asChild>
          <Button font="normal" variant="outline" className="qq-paper-btn qq-book-x h-9 w-9 p-0" aria-label="Close the book">
            <Art sprite={icon("x")} px={2} className="size-auto" />
          </Button>
        </DialogClose>
      </div>

      <div className="qq-book-cover">
        <TabsContent value={tab} className="qq-book-pages text-[length:inherit]" aria-live="polite">
          {/* Left page: where the quote came from. */}
          <div className="qq-page qq-page-l">
            {tab === "balls" ? (
              <>
                <p className="qq-page-head retro">BALL ALBUM</p>
                <ul className="qq-stickers">
                  {BALLS.slice(0, 4).map((b) => (
                    <Sticker key={b.id} ball={b} has={save.dex.includes(b.id)} />
                  ))}
                </ul>
                <span className="qq-page-num retro">1</span>
              </>
            ) : quote ? (
              <>
                <p className="qq-page-head retro">{tab === "saved" ? "SAVED QUOTE" : "RECENT QUOTE"}</p>
                <div className="qq-plinth">{ball ? <BallArt id={ball.id} px={6} /> : <BallShadow px={6} className="opacity-40" />}</div>
                <p className="qq-page-ball retro mt-5 text-center text-[12px] leading-[1.6]">{ball ? `${ball.name.toUpperCase()} BALL` : "A BALL LONG GONE"}</p>
                {ball && (
                  <>
                    <p className="qq-rarity retro mt-1 text-center text-[length:var(--t8,8px)] tracking-[0.08em]" data-rarity={ball.rarity}>
                      {RARITY_LABEL[ball.rarity].toUpperCase()}
                    </p>
                    <p className="qq-page-blurb retro mx-auto mt-5 max-w-[230px] text-center text-[length:var(--t8,8px)] leading-[2.1] opacity-70">{ball.blurb.toUpperCase()}</p>
                  </>
                )}
                <span className="qq-page-num retro">{i * 2 + 1}</span>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <Art sprite={tiger("wink")} px={3} />
              </div>
            )}
          </div>

          {/* Right page: the quote. */}
          <div className="qq-page qq-page-r">
            {tab === "balls" ? (
              <>
                <p className="qq-page-head retro">
                  {save.dex.length}/{BALLS.length} FOUND
                </p>
                <ul className="qq-stickers">
                  {BALLS.slice(4).map((b) => (
                    <Sticker key={b.id} ball={b} has={save.dex.includes(b.id)} />
                  ))}
                </ul>
                <span className="qq-page-num retro">2</span>
              </>
            ) : quote ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="qq-page-tag retro">{categoryLabel(quote.cat).toUpperCase()}</span>
                  <span className="retro text-[length:var(--t8,8px)] opacity-60">No.{pad(i + 1, 3)}</span>
                </div>
                <blockquote className="qq-page-quote">
                  <p className="retro" data-size={quote.text.length > 78 ? "s" : "l"}>
                    {quote.text}
                  </p>
                </blockquote>
                <p className="qq-page-author retro">{quote.author}</p>
                <span className="qq-page-num retro">{i * 2 + 2}</span>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="retro text-center text-[12px] leading-[2]">
                  {tab === "saved" ? "NOTHING SAVED YET." : "NO QUOTES YET."}
                  <br />
                  <span className="opacity-60">{tab === "saved" ? "GRAB A BALL, THEN HIT SAVE ON A QUOTE YOU LIKE." : "LINE THE CLAW UP OVER A BALL AND HIT GRAB ME!"}</span>
                </p>
              </div>
            )}
          </div>

          {/* The page in mid-turn. */}
          {turn && <i key={turn.id} className="qq-leaf" data-dir={turn.dir} aria-hidden="true" />}
          <i className="qq-ribbon" aria-hidden="true" />
        </TabsContent>
      </div>

      <div className="qq-book-nav" data-pages={count}>
        <Button font="normal" variant="outline" className="qq-paper-btn qq-book-turn h-10 w-10 p-0" aria-label="Previous page" disabled={i <= 0} onClick={() => go(-1)}>
          <Art sprite={icon("prev")} px={3} className="size-auto" />
        </Button>
        <span className="qq-book-count retro" aria-label={count ? `Page ${i + 1} of ${count}` : "No pages"}>
          {count ? i + 1 : 0}/{count}
        </span>
        <Button font="normal" variant="outline" className="qq-paper-btn qq-book-turn h-10 w-10 p-0" aria-label="Next page" disabled={i >= count - 1} onClick={() => go(1)}>
          <Art sprite={icon("next")} px={3} className="size-auto" />
        </Button>
        <span className="qq-show-gap" />
        {quote && (
          <>
            <Button font="normal" variant="outline" className="qq-paper-btn qq-book-act retro h-10 gap-2 px-3 text-[length:var(--t8,8px)]" onClick={() => onDownload(quote.id)}>
              <Art sprite={icon("down")} px={2} className="size-auto" />
              {downloaded === quote.id ? "DONE!" : "DOWNLOAD"}
            </Button>
            <Button font="normal" variant="outline" className="qq-paper-btn qq-book-act retro h-10 gap-2 px-3 text-[length:var(--t8,8px)]" onClick={() => onCopy(quote.id)}>
              <Art sprite={icon("copyMono")} px={2} className="size-auto" />
              {copied === quote.id ? "COPIED!" : "COPY"}
            </Button>
            <Button font="normal" variant="outline" className="qq-paper-btn qq-book-act retro h-10 gap-2 px-3 text-[length:var(--t8,8px)]" data-on={fav} aria-pressed={fav} onClick={() => onToggleFav(quote.id)}>
              <Art sprite={icon(fav ? "x" : "heartFull")} px={2} className="size-auto" />
              {fav ? "REMOVE" : "SAVE"}
            </Button>
          </>
        )}
        <DialogClose asChild>
          <Button font="normal" variant="outline" className="qq-paper-btn qq-book-close retro h-10 gap-2 px-3 text-[length:var(--t8,8px)]">
            <Art sprite={icon("x")} px={2} className="size-auto" />
            CLOSE
          </Button>
        </DialogClose>
      </div>
    </Tabs>
  );
}

/** Saved quotes, recent quotes and the ball album, as a book that opens over the game. */
export function QuoteBook({ open, onOpenChange, ...book }: BookProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent font="normal" showCloseButton={false} className="qq-dialog qq-book-dialog">
        <DialogHeader className="sr-only">
          <DialogTitle>Quote Book</DialogTitle>
          <DialogDescription>Your saved quotes, the quotes you revealed recently, and the balls you have found. One quote to a page; the arrow keys turn pages.</DialogDescription>
        </DialogHeader>
        <Book {...book} />
      </DialogContent>
    </Dialog>
  );
}

function focusCurrent(e: Event) {
  const current = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>('[aria-checked="true"]');
  if (!current) return;
  e.preventDefault();
  current.focus();
}

/** A picker in a dialog, for screens too narrow to stand it beside the machine. */
export function PickerDialog({ open, onOpenChange, title, children, className }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: React.ReactNode; className?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent font="normal" showCloseButton={false} className={cn("qq-dialog qq-picker gap-0 p-5", className)}
        // Open with the current choice in hand, not whichever option happens to come first.
        // (The 8bitcn wrapper types its props as a plain div, but hands them on to the dialog.)
        {...({ onOpenAutoFocus: focusCurrent } as object)}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        {/* The list scrolls inside the frame if the screen is short; the frame itself never clips. */}
        <div className="qq-picker-scroll">{children}</div>
        {/* The heading above and this button below both sit on the centre line. */}
        <div className="flex justify-center pt-9 pb-1.5">
          <DialogClose asChild>
            <Button font="normal" variant="outline" className="qq-paper-btn retro h-11 px-7 text-[12px]">
              DONE
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/8bit/badge";
import DifficultySelect from "@/components/ui/8bit/blocks/difficulty-select";
import QuestLog, { type Quest } from "@/components/ui/8bit/blocks/quest-log";
import { Button } from "@/components/ui/8bit/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/8bit/dialog";
import EnemyHealthDisplay from "@/components/ui/8bit/enemy-health-display";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/8bit/item";
import { Kbd } from "@/components/ui/8bit/kbd";
import { Label } from "@/components/ui/8bit/label";
import { ScrollArea } from "@/components/ui/8bit/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/8bit/sheet";
import { Slider } from "@/components/ui/8bit/slider";
import { Switch } from "@/components/ui/8bit/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/8bit/tabs";
import XpBar from "@/components/ui/8bit/xp-bar";
import { CAPSULE_MAP, LAUREL_MAP, PixelArt, capsulePalette } from "@/components/pixel";
import { Stars } from "@/components/retro-tv";
import { QUOTES, type Quote, RARITY, TAPES, TAPE_BY_ID, quotesOfSet, quotesOfTape } from "@/lib/quotes";
import { type Mode, type Save, levelOf, levelProgress } from "@/lib/store";
import { cn } from "@/lib/utils";

const words = (s: string) => s.trim().split(/\s+/).length;

function Capsule({ quote, px = 2 }: { quote: Quote; px?: number }) {
  const r = RARITY[quote.rarity];
  return <PixelArt map={CAPSULE_MAP} palette={capsulePalette(r.top, r.shade)} px={px} />;
}

// ── Quote book ─────────────────────────────────────────────────────────
interface BookProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  save: Save;
  jam: number;
  onAir: (id: string) => void;
  onKeep: (id: string) => void;
  onCopy: (id: string) => void;
  onPostcard: (id: string) => void;
}

export function QuoteBook({ open, onOpenChange, save, jam, onAir, onKeep, onCopy, onPostcard }: BookProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [tab, setTab] = useState(save.tape);
  const ownedCount = QUOTES.filter((x) => save.owned[x.id]).length;
  const sel = picked && save.owned[picked] ? QUOTES.find((x) => x.id === picked) ?? null : null;
  const selTape = sel ? TAPE_BY_ID[sel.tape] : null;

  const quests: Quest[] = [
    {
      id: "repair",
      title: "Heart of Repair",
      shortDescription: jam > 0 ? `${3 - jam}/3 scrap cleared` : "Prize box is working",
      description: "The prize box is jammed with scrap. Park the claw over the chute and lift all three pieces out so capsules can drop through.",
      status: jam > 0 ? "active" : "completed",
    },
    {
      id: "hatch",
      title: "Authorised Cats Only",
      shortDescription: save.hatchFound ? "Hatch found" : "Something on the cabinet opens",
      description: "There is a service hatch on the front of the cabinet. Behind it is the dial that sets how hard the claw grips.",
      status: save.hatchFound ? "completed" : "pending",
    },
    ...TAPES.flatMap((t) =>
      t.sets.map((s): Quest => {
        const all = quotesOfSet(s.id);
        const got = all.filter((x) => save.owned[x.id]).length;
        return {
          id: s.id,
          title: `${s.name}`,
          shortDescription: `CH ${t.channel} · ${got}/${all.length} quotes`,
          description: `${s.blurb} Pull all three quotes of this set from the ${t.title} tape: ${all.map((x) => (save.owned[x.id] ? x.author : "???")).join(", ")}.`,
          status: got === all.length ? "completed" : got > 0 ? "active" : "pending",
        };
      }),
    ),
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="book w-full gap-0 bg-[#fffdf2] p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b-4 border-[#1b1b1f] bg-[#f7f1b5] px-5 pt-5 pb-4">
          <SheetTitle className="text-[14px]">QUOTE BOOK</SheetTitle>
          <SheetDescription className="font-pixel text-[12px] text-[#5c5a4e]">
            {ownedCount} of {QUOTES.length} quotes collected · {save.favs.length} kept
          </SheetDescription>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-display shrink-0 text-[9px]">LV {levelOf(save.xp)}</span>
            <XpBar value={levelProgress(save.xp)} className="flex-1" />
            <span className="font-pixel shrink-0 text-[11px] text-[#5c5a4e]">{save.xp} XP</span>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100dvh-132px)]">
          <div className="px-5 py-5">
            {/* Character-sheet style card for the selected quote. */}
            {sel && selTape ? (
              <div className="sheet-card relative mb-9 p-4">
                <div className="flex items-start gap-3">
                  <div className="rarity-tile flex size-14 shrink-0 items-center justify-center" style={{ background: RARITY[sel.rarity].rayAlt }}>
                    <Capsule quote={sel} px={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Stars count={sel.rarity} />
                    <p className="font-display mt-1.5 text-[11px] leading-snug">{sel.author}</p>
                    <p className="font-pixel mt-1 text-[11px] text-[#5c5a4e]">
                      {sel.source} · {sel.year}
                    </p>
                  </div>
                </div>
                <blockquote className="font-crt mt-3 text-[24px] leading-[1.05]">“{sel.text}”</blockquote>
                <dl className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    ["RARITY", RARITY[sel.rarity].label],
                    ["CHANNEL", `CH ${selTape.channel}`],
                    ["WORDS", String(words(sel.text))],
                    ["PULLED", `×${save.owned[sel.id]}`],
                  ].map(([k, v]) => (
                    <div key={k} className="stat px-1.5 py-1.5 text-center">
                      <dt className="font-pixel text-[9px] text-[#7a7868]">{k}</dt>
                      <dd className="font-display mt-1 text-[8px]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  <Button size="sm" className="text-[8px]" onClick={() => onAir(sel.id)}>
                    AIR
                  </Button>
                  <Button size="sm" variant="secondary" className={cn("text-[8px]", save.favs.includes(sel.id) && "bg-[#ff5d8f] text-white hover:bg-[#ff5d8f]")} onClick={() => onKeep(sel.id)}>
                    {save.favs.includes(sel.id) ? "♥ KEPT" : "♡ KEEP"}
                  </Button>
                  <Button size="sm" variant="secondary" className="text-[8px]" onClick={() => onCopy(sel.id)}>
                    COPY
                  </Button>
                  <Button size="sm" variant="secondary" className="text-[8px]" onClick={() => onPostcard(sel.id)}>
                    CARD
                  </Button>
                </div>
              </div>
            ) : (
              <p className="font-pixel mb-5 bg-[#ebe8d6] px-3 py-2 text-[12px] text-[#5c5a4e]">
                {ownedCount ? "Pick a quote to see its card." : "Nothing here yet. Grab a capsule and it lands in this book."}
              </p>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-5 grid h-auto w-full grid-cols-6">
                {TAPES.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="px-0 py-1.5 text-[8px]">
                    CH{t.channel}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="quests" className="px-0 py-1.5 text-[8px]">
                  LOG
                </TabsTrigger>
              </TabsList>

              {TAPES.map((t) => (
                <TabsContent key={t.id} value={t.id} className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display px-2 py-1 text-[9px]" style={{ background: t.color, color: t.ink }}>
                      {t.title}
                    </span>
                    <span className="font-pixel text-[11px] text-[#5c5a4e]">
                      {quotesOfTape(t.id).filter((x) => save.owned[x.id]).length} / {quotesOfTape(t.id).length}
                    </span>
                  </div>
                  {t.sets.map((s) => {
                    const all = quotesOfSet(s.id);
                    const got = all.filter((x) => save.owned[x.id]).length;
                    return (
                      <section key={s.id}>
                        <div className="set-band mb-3 flex items-center justify-between gap-2 px-2 py-1.5">
                          <span className="font-display text-[8px]">{s.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-pixel text-[10px] text-[#5c5a4e]">
                              {got} / {all.length}
                            </span>
                            {got === all.length && <Badge className="bg-[#9ef5c0] border-[#9ef5c0] text-[6px] text-[#1b1b1f]">SET</Badge>}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {all.map((x) =>
                            save.owned[x.id] ? (
                              <Item key={x.id} asChild variant="outline" size="sm" className={cn("px mx-1 cursor-pointer rounded-none border-0 bg-white", picked === x.id && "bg-[#dfeaff]")}>
                                <button type="button" onClick={() => setPicked(x.id)} className="w-full text-left">
                                  <ItemMedia>
                                    <Capsule quote={x} />
                                  </ItemMedia>
                                  <ItemContent className="min-w-0">
                                    <ItemTitle className="text-[8px] leading-snug">
                                      {x.author}
                                      {save.favs.includes(x.id) && <span className="text-[#ff5d8f]"> ♥</span>}
                                    </ItemTitle>
                                    <ItemDescription className="font-pixel line-clamp-1 text-[11px] normal-case">{x.text}</ItemDescription>
                                  </ItemContent>
                                </button>
                              </Item>
                            ) : (
                              <Item key={x.id} variant="muted" size="sm" className="mx-1 rounded-none bg-[#ebe8d6]">
                                <ItemMedia>
                                  <span className="font-display flex size-9 items-center justify-center bg-[#d8d4bd] text-[14px] text-[#9a967d]">?</span>
                                </ItemMedia>
                                <ItemContent>
                                  <ItemTitle className="text-[8px] text-[#8b8870]">UNKNOWN</ItemTitle>
                                  <ItemDescription className="font-pixel text-[11px]">In a {RARITY[x.rarity].label.toLowerCase()} capsule on CH {t.channel}</ItemDescription>
                                </ItemContent>
                              </Item>
                            ),
                          )}
                        </div>
                      </section>
                    );
                  })}
                </TabsContent>
              ))}

              <TabsContent value="quests">
                <QuestLog quests={quests} title="QUEST LOG" maxHeight="520px" className="bg-white" />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Menu ───────────────────────────────────────────────────────────────
interface MenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  muted: boolean;
  volume: number;
  onMode: (mode: Mode) => void;
  onMuted: (muted: boolean) => void;
  onVolume: (volume: number) => void;
  onReset: () => void;
}

export function MenuDialog({ open, onOpenChange, mode, muted, volume, onMode, onMuted, onVolume, onReset }: MenuProps) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setConfirm(false);
        onOpenChange(o);
      }}
    >
      <DialogContent showCloseButton={false} className="bg-[#fffdf2] sm:max-w-[440px]!">
        <DialogHeader>
          <DialogTitle className="text-[13px]">PAUSE MENU</DialogTitle>
          <DialogDescription className="font-pixel text-[12px]">How the claw behaves, and how loud it is.</DialogDescription>
        </DialogHeader>

        <DifficultySelect
          title="CLAW MODE"
          description={mode === "arcade" ? "Aim matters. A slip costs a life. Nine lives." : "The claw always holds. No lives, no timer."}
          vertical={false}
          options={["easy", "hard"]}
          labels={{ easy: "CHILL", hard: "ARCADE" }}
          value={mode === "arcade" ? "hard" : "easy"}
          onChange={(v) => onMode(v === "hard" ? "arcade" : "chill")}
          className="menu-card bg-white [&_[data-slot=card-description]]:font-pixel [&_[data-slot=card-description]]:text-center [&_[data-slot=card-description]]:text-[11px] [&_[data-slot=card-title]]:text-[10px]"
        />

        <div className="space-y-4 px-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="mute" className="text-[9px]">
              MUTE SOUND
            </Label>
            <Switch id="mute" checked={muted} onCheckedChange={onMuted} />
          </div>
          <div className="space-y-3">
            <Label htmlFor="volume" className="text-[9px]">
              VOLUME {volume}
            </Label>
            <Slider id="volume" value={[volume]} max={100} step={5} onValueChange={(v) => onVolume(v[0])} aria-label="Volume" />
          </div>
          <p className="font-pixel flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#5c5a4e]">
            <Kbd>←</Kbd>
            <Kbd>→</Kbd> or <Kbd>A</Kbd>
            <Kbd>D</Kbd> move · <Kbd>SPACE</Kbd> drop the claw
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Button variant="secondary" size="sm" className="text-[8px]" onClick={() => (confirm ? (onReset(), setConfirm(false), onOpenChange(false)) : setConfirm(true))}>
            {confirm ? "REALLY WIPE SAVE?" : "RESET SAVE"}
          </Button>
          <Button size="sm" className="text-[9px]" onClick={() => onOpenChange(false)}>
            RESUME
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Service hatch (the secret) ─────────────────────────────────────────
interface HatchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grip: number;
  mode: Mode;
  onGrip: (grip: number) => void;
  onSteal: () => void;
  stolen: number;
}

export function HatchDialog({ open, onOpenChange, grip, mode, onGrip, onSteal, stolen }: HatchProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="hatch-panel bg-[#2a2c35] text-white sm:max-w-[440px]!">
        <DialogHeader>
          <DialogTitle className="text-[12px] text-[#ffcf3a]">SERVICE HATCH</DialogTitle>
          <DialogDescription className="font-pixel text-[12px] text-[#c9ccd8]">Authorised cats only. You are inside the machine.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 bg-[#1b1b1f] p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="grip" className="text-[9px] text-white">
              CLAW GRIP
            </Label>
            <span className="font-display text-[10px] text-[#9ef5c0]">{grip}</span>
          </div>
          <Slider id="grip" value={[grip]} min={0} max={100} step={5} onValueChange={(v) => onGrip(v[0])} aria-label="Claw grip strength" />
          <p className="font-pixel text-[11px] text-[#c9ccd8]">
            Factory setting is 50. {mode === "arcade" ? "Higher grip means fewer slips." : "It only matters in Arcade mode."}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#1b1b1f] p-3">
          <button type="button" onClick={onSteal} className={cn("shiny shrink-0", stolen > 0 && stolen < 3 && "wiggle")} aria-label="Take the shiny capsule" disabled={stolen >= 3}>
            <PixelArt map={CAPSULE_MAP} palette={capsulePalette(RARITY[5].top, RARITY[5].shade)} px={3} />
          </button>
          <p className="font-pixel text-[12px] leading-snug text-[#c9ccd8]">
            {stolen >= 3
              ? "\"...Fine. One. Do not tell the others.\""
              : stolen > 0
                ? `"Put that back!" (${3 - stolen} more and he gives in)`
                : "A legendary capsule, set aside. The label says DO NOT TAKE."}
          </p>
        </div>

        <Button variant="secondary" size="sm" className="ml-auto text-[9px]" onClick={() => onOpenChange(false)}>
          CLOSE HATCH
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Set complete ───────────────────────────────────────────────────────
export function VictoryDialog({ setId, onClose }: { setId: string | null; onClose: () => void }) {
  const tape = setId ? TAPES.find((t) => t.sets.some((s) => s.id === setId)) : null;
  const set = tape?.sets.find((s) => s.id === setId);
  const quotes = setId ? quotesOfSet(setId) : [];
  return (
    <Dialog open={!!setId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="victory gap-0 bg-[#fffdf2] p-0 sm:max-w-[560px]!">
        <div className="relative px-5 pt-6 pb-5">
          <div className="victory-rays absolute inset-0" aria-hidden="true" />
          <DialogHeader className="relative items-center text-center">
            <DialogTitle className="flex items-center justify-center gap-3 text-[14px] leading-relaxed">
              <PixelArt map={LAUREL_MAP} palette={{ g: "#12803f" }} px={3} />
              <span className="text-[#12803f]">SET COMPLETE</span>
              <PixelArt map={LAUREL_MAP} palette={{ g: "#12803f" }} px={3} style={{ transform: "scaleX(-1)" }} />
            </DialogTitle>
            <DialogDescription className="font-display text-[9px] text-[#1b1b1f]">
              {set?.name} · {quotes.length} QUOTES INSIDE
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-5 grid grid-cols-3 gap-3">
            {quotes.map((x, i) => (
              <div key={x.id} className={cn("podium-card flex flex-col items-center px-2 pt-3 pb-2 text-center", i === 1 && "-mt-3")} style={{ background: RARITY[x.rarity].rayAlt }}>
                <Capsule quote={x} px={3} />
                <span className="podium mt-2 h-3 w-[80%]" />
                <span className="podium -mt-px h-3 w-full" />
                <span className="font-display mt-2 line-clamp-2 text-[7px] leading-snug">{x.author}</span>
                <span className="mt-1.5">
                  <Stars count={x.rarity} px={1} />
                </span>
              </div>
            ))}
          </div>
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-4">
            <Badge className="bg-[#9ef5c0] border-[#9ef5c0] text-[7px] text-[#1b1b1f]">+50 XP</Badge>
            {tape && (
              <Badge className="text-[7px]" style={{ background: tape.color, color: tape.ink }}>
                CH {tape.channel} {tape.title}
              </Badge>
            )}
          </div>
        </div>
        <div className="bg-[#1b1b1f] px-5 py-4 text-center">
          <p className="font-pixel text-[13px] text-white">{set?.blurb} The Capsule Empire grows.</p>
          <Button className="mint mt-3 w-full text-[10px]" onClick={onClose}>
            GOT IT
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Jam boss bar ───────────────────────────────────────────────────────
export function JamBar({ left }: { left: number }) {
  return (
    <div className="jam-bar bg-[#fffdf2] px-3 py-2.5">
      <EnemyHealthDisplay enemyName="THE JAM" level={1} currentHealth={left} maxHealth={3} size="sm" healthBarColor="bg-[#ee4b3b]" />
    </div>
  );
}

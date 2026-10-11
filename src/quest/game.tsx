"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/8bit/alert";
import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { copyText } from "@/lib/clipboard";
import { setMuted, sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

import { Art, type Mood, icon } from "./art";
import { BALLS, type BallId, ballById, isBallId } from "./balls";
import { Base, Controls, DeckControls, Feet, Flanks, Garland, GlassShine, Marquee, PrizeReveal, QuoteShowcase, StatStrip, Topper } from "./cabinet";
import { downloadCard, renderCard } from "./cards";
import { type Layout, chooseLayout } from "./layout";
import { type MachineHandle, QuestMachine } from "./machine";
import { Mascot, POKES, useCat } from "./mascot";
import { checkSongs, playSong, songBeat, songName, stopSong } from "./music";
import { AudioButton, BallDex, BookButton, type BookTab, CategoryPicker, PickerDialog, QuoteBook, TypeButton, WorldButton, WorldSelector } from "./panels";
import "./quest.css";
import { CATEGORIES, type Category, categoryLabel, pickQuote, quoteById } from "./quotes";
import { NEW_SAVE, type Save, readSave, writeSave } from "./save";
import { WorldScene } from "./scenery";
import { WIPE_HOLD, WIPE_IN, WIPE_OUT, type WipeStage, WorldIntro, WorldWipe } from "./transition";
import { type WorldId, isWorldId, worldById } from "./worlds";

// The whole loop: choose a world → steer the claw → grab a ball → it drops down
// the chute → the ball cracks open → the quote steps out on a card and types itself.

type Phase = "aim" | "open" | "quote";

/** Length of the prize reveal, start to card. The CSS delays in quest.css are cut to fit it. */
const REVEAL_MS = 2300;
const ALL = 9999;

const AIM_LINES = ["Need a spark? Grab a ball!", "Spot a rare ball? Go and get it!", "Tap the glass and the claw goes there.", "One more? I never get tired of these."];
const MILESTONES: Record<number, string> = {
  1: "Your first quote! Save the ones you like.",
  5: "Five quotes! You're getting good at this.",
  10: "Ten quotes! The claw likes you.",
  25: "25 quotes! Certified quote collector.",
  50: "50 quotes. Okay, now you're just showing off.",
};

export function QuestGame() {
  const [save, setSave] = useState<Save>(NEW_SAVE);
  const saveRef = useRef<Save>(NEW_SAVE);
  /** True once the save is read and the layout is measured; nothing shows before that. */
  const [ready, setReady] = useState(false);
  /** The world on screen. It trails `save.world` by half a wipe. */
  const [scene, setScene] = useState<WorldId>(NEW_SAVE.world);
  const [wipe, setWipe] = useState<WipeStage | null>(null);
  /** Whether a wipe is under way right now, for the click handler to read. */
  const wiping = useRef(false);

  const [phase, setPhase] = useState<Phase>("aim");
  const [busy, setBusy] = useState(false);
  const [steer, setSteer] = useState(0);
  /** Which entry of the log is on the card, and how much of it is typed. */
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /** The quote just copied or downloaded, so its button can say so for a moment. */
  const [flash, setFlash] = useState<{ id: string; kind: "copy" | "download" } | null>(null);

  const [dialog, setDialog] = useState<"worlds" | "types" | "book" | null>(null);
  const [tab, setTab] = useState<BookTab>("saved");
  const [bare, setBare] = useState(false);
  /** Browsers only allow sound after a first tap or key press. */
  const [unlocked, setUnlocked] = useState(false);

  /** Which arrangement of the game fits this window, and at what size (see layout.ts). */
  const [layout, setLayout] = useState<Layout>(() => chooseLayout(1362, 1044));
  const cab = useRef<HTMLDivElement>(null);
  const machine = useRef<MachineHandle>(null);
  const timers = useRef<number[]>([]);
  const wipes = useRef<number[]>([]);
  const flashTimer = useRef(0);
  const pokes = useRef(0);
  const cat = useCat();
  const react = cat.react;

  const update = useCallback((fn: (s: Save) => Save) => {
    const next = fn(saveRef.current);
    saveRef.current = next;
    setSave(next);
    writeSave(next);
  }, []);

  useEffect(() => {
    const live = timers;
    const liveWipes = wipes;
    const liveFlash = flashTimer;
    const id = window.setTimeout(() => {
      let s = readSave();
      // Dev-only: `?world=`, `?cat=`, `?demo=open|quote`, `?ball=`, `?dex=all`, `?book=`, `?menu=`, `?wipe=hold` and `?ui=0`, for screenshots.
      const dev = process.env.NODE_ENV !== "production";
      const params = dev ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const world = params.get("world");
      const wanted = params.get("cat") as Category | null;
      if (isWorldId(world)) s = { ...s, world };
      if (wanted && CATEGORIES.some((c) => c.id === wanted)) s = { ...s, cat: wanted };
      if (params.get("dex") === "all") s = { ...s, dex: BALLS.map((b) => b.id) };
      const demo = params.get("demo");
      if (demo) {
        const ball = params.get("ball");
        const q = pickQuote(s.cat, [], () => Number(params.get("pick") ?? 0.6));
        if (q) {
          const b: BallId = isBallId(ball) ? ball : "azure";
          s = { ...s, pulls: s.pulls + 1, log: [...s.log, { q: q.id, b }], dex: s.dex.includes(b) ? s.dex : [...s.dex, b] };
          setAt(s.log.length - 1);
          setTyped(ALL);
          setPhase(demo === "open" ? "open" : "quote");
        }
      }
      const book = params.get("book");
      if (book === "saved" || book === "recent" || book === "balls") {
        setTab(book);
        setDialog("book");
      }
      if (params.get("wipe") === "hold") setWipe("hold");
      const menu = params.get("menu");
      if (menu === "worlds" || menu === "types") setDialog(menu);
      if (params.get("ui") === "0") setBare(true);
      if (dev) Object.assign(window, { __songs: checkSongs, __card: renderCard });
      saveRef.current = s;
      setSave(s);
      setScene(s.world);
      setReady(true);
      // If the page has already been tapped (a hot reload, say), the music may carry straight on.
      if (navigator.userActivation?.hasBeenActive) setUnlocked(true);
      // A wave hello.
      react("happy", "hop", 1700, true);
    }, 0);

    // Fit everything on one screen, whatever the window.
    const fit = () => setLayout(chooseLayout(window.innerWidth, window.innerHeight));
    fit();
    window.addEventListener("resize", fit);
    const watch = new ResizeObserver(fit);
    watch.observe(document.documentElement);

    const unlock = () => setUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      watch.disconnect();
      live.current.forEach((t) => window.clearTimeout(t));
      liveWipes.current.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(liveFlash.current);
    };
  }, [react]);

  useEffect(() => setMuted(save.muted), [save.muted]);

  // Each world has its own tune. It starts after the first tap and then never stops on its own:
  // not when the tab is in the background, not between worlds, only when it is switched off.
  const musicOn = ready && unlocked && !save.muted && save.music;
  useEffect(() => {
    if (musicOn) playSong(scene);
    else stopSong();
  }, [musicOn, scene]);

  const world = worldById(scene);
  const entry = phase === "aim" ? null : (save.log[at] ?? null);
  const quote = entry ? quoteById(entry.q) : null;
  const full = quote?.text.length ?? 0;
  const done = phase === "quote" && typed >= full;

  // A ball reached the prize chute: crack it open, then type the quote out.
  const onWin = useCallback(
    (ball: BallId) => {
      const s = saveRef.current;
      const next = pickQuote(
        s.cat,
        s.log.slice(-5).map((e) => e.q),
      );
      if (!next) {
        setNote("The quote box is empty! Nothing to hand out.");
        return;
      }
      const isNew = !s.dex.includes(ball);
      const log = [...s.log, { q: next.id, b: ball }].slice(-40);
      const dex = isNew ? [...s.dex, ball] : s.dex;
      const pulls = s.pulls + 1;
      update(() => ({ ...s, pulls, log, dex }));
      setAt(log.length - 1);
      setTyped(0);
      setFresh(isNew);
      setNote(null);
      setPhase("open");
      const b = ballById(ball);
      const special = b.rarity === "rare" || b.rarity === "legendary";
      sfx.reveal(b.rarity === "legendary" ? 5 : b.rarity === "common" ? 3 : 4);
      react(special ? "stars" : "wow", "hop", REVEAL_MS);
      const after = isNew && dex.length === BALLS.length ? "All 8 balls found! You legend." : isNew ? `New ball: ${b.name}! It's in your collection.` : (MILESTONES[pulls] ?? null);
      // One fixed timeline every time: rise, whirl, crack, flash, then the card.
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [
        window.setTimeout(() => {
          setPhase("quote");
          setNote(after);
        }, REVEAL_MS),
      ];
    },
    [update, react],
  );

  // The typewriter. It only ever runs forward; a new quote resets the count in onWin.
  useEffect(() => {
    if (phase !== "quote" || typed >= full) return;
    const id = window.setTimeout(() => {
      setTyped((n) => n + 1);
      if (typed % 2 === 0) sfx.type();
    }, 30);
    return () => window.clearTimeout(id);
  }, [phase, typed, full]);

  const again = useCallback(() => {
    setNote(null);
    setPhase("aim");
    sfx.press();
  }, []);

  /** Leaf back and forth through the quotes revealed so far. */
  const stepQuote = useCallback(
    (dir: -1 | 1) => {
      const n = at + dir;
      if (phase !== "quote" || n < 0 || n >= saveRef.current.log.length) return;
      setAt(n);
      setTyped(ALL);
      setNote(null);
      sfx.ui();
    },
    [at, phase],
  );

  const toggleFav = useCallback(
    (id: string) => {
      const had = saveRef.current.favs.includes(id);
      update((s) => ({ ...s, favs: had ? s.favs.filter((x) => x !== id) : [...s.favs, id] }));
      setNote(had ? "Okay, taken back out." : "Saved to your favourites!");
      react(had ? "sad" : "love", had ? "nod" : "hop", 1500);
      sfx.ui();
    },
    [update, react],
  );

  const flashFor = useCallback((id: string, kind: "copy" | "download") => {
    setFlash({ id, kind });
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1700);
  }, []);

  const copy = useCallback(
    async (id: string) => {
      const q = quoteById(id);
      if (!q) return;
      const ok = await copyText(`“${q.text}” — ${q.author}`);
      setNote(ok ? "Copied! Go share it." : "Couldn't reach the clipboard. Sorry!");
      if (!ok) return;
      flashFor(id, "copy");
      react("wink", "nod", 1200);
      sfx.ui();
    },
    [flashFor, react],
  );

  /** Save the quote as a picture, in the card style of the world you are in. */
  const download = useCallback(
    async (id: string) => {
      const q = quoteById(id);
      if (!q) return;
      const { log, pulls } = saveRef.current;
      const n = log.map((e) => e.q).lastIndexOf(id);
      // The number on the picture is the quote's place among all the ones ever revealed.
      const number = n < 0 ? pulls : pulls - (log.length - 1 - n);
      const ok = await downloadCard(q, ballById(log[n]?.b ?? "classic"), worldById(saveRef.current.world), Math.max(1, number));
      setNote(ok ? "Saved as a picture. Check your downloads!" : "Couldn't make the picture. Sorry!");
      if (!ok) return;
      flashFor(id, "download");
      react("wink", "nod", 1200);
      sfx.ui();
    },
    [flashFor, react],
  );

  const chooseWorld = useCallback(
    (id: WorldId) => {
      if (id === saveRef.current.world) return;
      update((s) => ({ ...s, world: id }));
      setNote(`Welcome to ${worldById(id).name}!`);
      react(id === "racing" ? "cool" : "wow", "hop", 1500);
      sfx.tape();
      wipes.current.forEach((t) => window.clearTimeout(t));
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setScene(id);
        setWipe(null);
        return;
      }
      // The new world's own wipe closes over the old one, shows its card, and opens again.
      // Picking another world while that is going on cuts straight to the new world's card.
      const open = () => {
        setWipe("out");
        wipes.current.push(
          window.setTimeout(() => {
            wiping.current = false;
            setWipe(null);
          }, WIPE_OUT + 40),
        );
      };
      const cover = () => {
        setScene(id);
        setWipe("hold");
        wipes.current = [window.setTimeout(open, WIPE_HOLD)];
      };
      if (wiping.current) cover();
      else {
        wiping.current = true;
        setWipe("in");
        wipes.current = [window.setTimeout(cover, WIPE_IN)];
      }
    },
    [update, react],
  );

  const chooseCat = useCallback(
    (id: Category) => {
      if (id === saveRef.current.cat) return;
      update((s) => ({ ...s, cat: id }));
      setNote(`${categoryLabel(id)} quotes are loaded.`);
      react("wink", "nod", 1000);
      sfx.ui();
    },
    [update, react],
  );

  // With a quote showing: Space or Enter is the big button, the arrows leaf through quotes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || dialog || phase !== "quote") return;
      if (e.key === " " || e.key === "Enter") {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        if (done) again();
        else setTyped(ALL);
      } else if (e.key === "Escape" && done) again();
      else if (e.key === "ArrowLeft" && done) stepQuote(-1);
      else if (e.key === "ArrowRight" && done) stepQuote(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [again, stepQuote, dialog, phase, done]);

  // The cub's face: a reaction if it is having one, otherwise whatever the game is doing.
  const napping = cat.asleep && phase === "aim" && !busy && !steer;
  const watching: Mood = steer < 0 ? "lookL" : steer > 0 ? "lookR" : busy ? "wow" : "happy";
  const resting: Mood = phase === "open" ? "wow" : phase === "quote" ? (done ? "purr" : "happy") : napping ? "sleep" : watching;
  // Left to itself, with nothing to watch, it runs through its idle routine.
  const act = !cat.emote && phase === "aim" && !busy && !steer && !napping ? cat.act : null;
  const face: Mood = cat.emote?.face ?? act?.face ?? (cat.blink && (resting === "happy" || resting === "lookL" || resting === "lookR") ? "blink" : resting);
  const line =
    note ??
    (phase === "open"
      ? "Ooh! What's inside?"
      : phase === "quote"
        ? done
          ? "A good one! Save it, or play again."
          : "Shh... it's typing."
        : busy
          ? "Steady... steady..."
          : napping
            ? "Zzz... (poke me, I'm awake)"
            : save.pulls === 0
              ? "Move the claw, then hit GRAB ME!"
              : AIM_LINES[save.pulls % AIM_LINES.length]);
  const poke = () => {
    const p = POKES[pokes.current % POKES.length];
    pokes.current += 1;
    react(p.face, p.anim, 1600, !!p.wave);
    setNote(p.line);
    sfx.ui();
  };

  const { family, parts, scale, width, height, gap } = layout;
  const wide = family === "beside";
  // The stylesheet sets small print larger by 1/scale, so it never falls below 8px on the screen.
  const vars = { "--art": `${layout.art}px`, "--inv": (1 / scale).toFixed(4) } as React.CSSProperties;
  const target = worldById(save.world);
  const openBook = (t: BookTab) => {
    setTab(t);
    setDialog("book");
    sfx.ui();
  };
  const toggleSound = () => {
    const muted = !saveRef.current.muted;
    update((s) => ({ ...s, muted }));
    setMuted(muted);
    if (!muted) sfx.ui();
  };
  const toggleMusic = () => {
    const music = !(saveRef.current.music && !saveRef.current.muted);
    update((s) => ({ ...s, music, muted: music ? false : s.muted }));
    setMuted(saveRef.current.muted);
    setNote(music ? `Now playing: ${songName(saveRef.current.world)}.` : "Music off. Just the bleeps, then.");
    if (music) react("cool", "nod", 1800);
    sfx.ui();
  };
  /** The folded bar has one audio button: music and effects, then effects only, then silence. */
  const cycleAudio = () => {
    const s = saveRef.current;
    const next = s.muted ? { muted: false, music: true } : s.music ? { muted: false, music: false } : { muted: true, music: false };
    update((x) => ({ ...x, ...next }));
    setMuted(next.muted);
    setNote(next.muted ? "Sound off. Shh." : next.music ? `Now playing: ${songName(s.world)}.` : "Music off. Just the bleeps, then.");
    if (!next.muted) sfx.ui();
  };
  const soundButton = (
    <Button font="normal" variant="outline" className="qq-btn qq-ui-btn h-11 w-11 shrink-0 p-0" aria-label={save.muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!save.muted} onClick={toggleSound}>
      <Art sprite={icon(save.muted ? "soundOff" : "soundOn")} px={2} className="size-auto" />
    </Button>
  );
  const tuneOn = save.music && !save.muted;
  const controls = {
    mode: phase === "aim" ? (busy ? "wait" : "grab") : phase === "open" ? "wait" : done ? "again" : "skip",
    canSteer: phase === "aim" && !busy,
    onHold: (side: "left" | "right", on: boolean) => machine.current?.hold(side, on),
    onMain: () => {
      if (phase === "aim") {
        sfx.press();
        setNote(null);
        machine.current?.pick();
      } else if (done) again();
      else setTyped(ALL);
    },
  } as const;
  const menuButtons = {
    world: <WorldButton world={target} onClick={() => setDialog("worlds")} />,
    type: <TypeButton cat={save.cat} onClick={() => setDialog("types")} />,
    book: <BookButton count={save.favs.length} onClick={() => openBook("saved")} />,
    audio: <AudioButton muted={save.muted} music={save.music} onClick={cycleAudio} />,
  };

  return (
    <div className={cn("qq relative h-dvh overflow-hidden", !ready && "qq-booting", bare && "qq-bare")} data-world={scene} data-layout={family} data-level={layout.level} data-wide={wide} data-stage={phase === "quote" ? "quote" : undefined} style={vars}>
      <WorldScene world={scene} cut={layout.cut} />

      {/* Folded: the menus become a bar along the top. It is drawn at full size whatever the
          cabinet is scaled to, and each button says what is chosen now, not just what it opens. */}
      {family === "folded" && (
        <nav className="qq-topbar" aria-label="Game menu">
          {menuButtons.world}
          {menuButtons.type}
          <span className="qq-bar-space" />
          {menuButtons.book}
          {menuButtons.audio}
        </nav>
      )}

      <div className="qq-fit" style={{ width: width * scale, height: height * scale, bottom: gap }}>
        <div className="qq-canvas" style={{ width, height, transform: `scale(${scale})` }}>
          {wide && (
            <aside className="qq-side qq-side-l">
              <WorldSelector value={save.world} onChange={chooseWorld} />
              <div className="flex items-center gap-[18px]">
                <Button
                  font="normal"
                  variant="outline"
                  className="qq-ui-btn retro h-11 min-w-0 flex-1 justify-start gap-2.5 px-3 text-[length:var(--t8,8px)] uppercase"
                  data-on={tuneOn}
                  aria-pressed={tuneOn}
                  aria-label={tuneOn ? `Music on: ${songName(save.world)}. Turn it off` : "Turn music on"}
                  onClick={toggleMusic}
                >
                  <Art sprite={icon("note")} px={2} className="size-auto" />
                  <span className="truncate">{tuneOn ? songName(save.world) : "Music off"}</span>
                </Button>
                {soundButton}
              </div>
            </aside>
          )}

          <div ref={cab} className="qq-cab">
            {parts.mascot && (
              <Mascot
                face={face}
                pose={cat.emote ? { paw: cat.emote.wave ? "wave" : "rest" } : (act ?? undefined)}
                anim={cat.emote?.anim ?? act?.anim}
                animKey={cat.emote?.id ?? act?.id}
                lean={phase === "aim" ? steer || act?.lean || 0 : 0}
                asleep={napping && !cat.emote}
                beat={musicOn ? songBeat(scene) : null}
                line={line}
                onPoke={poke}
              />
            )}
            {parts.marquee !== "none" && (
              <>
                <Topper world={world} />
                <Marquee world={world} short={parts.marquee === "short"} />
              </>
            )}

            {/* Glass: the physics pile and claw, a garland above, the prize reveal on top. */}
            <div className={cn("relative mx-auto w-[488px]", parts.marquee !== "none" && "-mt-1")}>
              <Flanks world={world} />
              <div className="qq-box qq-body p-4">
                <div className="qq-box qq-glass relative h-[388px] overflow-hidden">
                  <div className="qq-glass-rim" />
                  <Garland world={world} />

                  {ready && (
                    <QuestMachine
                      ref={machine}
                      locked={phase !== "aim"}
                      onWin={onWin}
                      onBusy={setBusy}
                      onSteer={setSteer}
                      onMiss={() => {
                        setNote("Missed! Line the claw up over a ball.");
                        react("sad", "shake", 1400);
                      }}
                      look={world.look}
                    />
                  )}

                  {phase === "open" && entry && <PrizeReveal ball={ballById(entry.b)} fresh={fresh} />}

                  <GlassShine world={world} />
                </div>
              </div>
            </div>

            {parts.ledge && <Controls {...controls} />}
            {parts.base !== "none" && <Base save={save} world={target} cat={categoryLabel(save.cat)} slim={parts.base === "slim"} />}
            <Feet />
          </div>

          {wide && (
            <aside className="qq-side qq-side-r">
              <CategoryPicker value={save.cat} onChange={chooseCat} />
              <BallDex found={save.dex} onInspect={() => openBook("balls")} />
              <div>
                <Button font="normal" variant="outline" className="qq-ui-btn retro h-11 w-full gap-2.5 px-3 text-[12px]" onClick={() => openBook("saved")}>
                  <Art sprite={icon("heartFull")} px={2} className="qq-heart size-auto" />
                  FAVOURITES
                  <Badge className="border-[var(--ui-on)] bg-[var(--ui-on)] text-[length:var(--t8,8px)] leading-[1.9] text-white">{String(save.favs.length).padStart(2, "0")}</Badge>
                </Button>
              </div>
              {/* With no base on the cabinet, the counters live here. */}
              {parts.base === "none" && <StatStrip save={save} />}
            </aside>
          )}

          {/* Split: the controls and the menu buttons stand on a deck beside the glass. */}
          {family === "split" && (
            <aside className="qq-deck" aria-label="Controls">
              {!parts.mascot && (
                <Alert font="normal" className="qq-deck-say" role="status">
                  <AlertDescription className="qq-copy block text-[#34305e]">{line}</AlertDescription>
                </Alert>
              )}
              {menuButtons.world}
              {menuButtons.type}
              <DeckControls {...controls}>
                <BookButton onClick={() => openBook("saved")} />
                {menuButtons.audio}
              </DeckControls>
              {parts.mascot && <StatStrip save={save} />}
            </aside>
          )}
        </div>
      </div>

      {/* The quote on stage: everything else dims, the card steps out in front of the machine. */}
      {phase === "quote" && quote && entry && (
        <>
          <div className="qq-scrim" aria-hidden="true" />
          <div className="qq-fit qq-front" style={{ width: width * scale, height: height * scale, bottom: gap }}>
            <div className="qq-canvas" style={{ width, height, transform: `scale(${scale})` }}>
              <QuoteShowcase
                quote={quote}
                ball={ballById(entry.b)}
                world={world}
                typed={typed}
                done={done}
                fav={save.favs.includes(quote.id)}
                downloaded={flash?.kind === "download" && flash.id === quote.id}
                index={at}
                total={save.log.length}
                number={save.pulls - (save.log.length - 1 - at)}
                onSkip={() => setTyped(ALL)}
                onStep={stepQuote}
                onFav={() => toggleFav(quote.id)}
                onDownload={() => download(quote.id)}
                onAgain={again}
              />
            </div>
          </div>
        </>
      )}

      {wipe && (
        <div className="qq-wipe" data-stage={wipe} aria-hidden="true">
          <WorldWipe world={save.world} stage={wipe} />
          <div className="qq-intro-wrap">
            <WorldIntro world={target} />
          </div>
        </div>
      )}

      <QuoteBook
        open={dialog === "book"}
        onOpenChange={(o) => setDialog(o ? "book" : null)}
        tab={tab}
        onTab={setTab}
        save={save}
        onToggleFav={toggleFav}
        onCopy={copy}
        onDownload={download}
        copied={flash?.kind === "copy" ? flash.id : null}
        downloaded={flash?.kind === "download" ? flash.id : null}
      />
      <PickerDialog open={dialog === "worlds"} onOpenChange={(o) => setDialog(o ? "worlds" : null)} title="Choose your world" className="qq-world-dialog p-7 [--w:908px]">
        <WorldSelector
          layout="grid"
          value={save.world}
          onChange={(id) => {
            chooseWorld(id);
            setDialog(null);
          }}
        />
      </PickerDialog>
      <PickerDialog open={dialog === "types"} onOpenChange={(o) => setDialog(o ? "types" : null)} title="Quote type">
        <CategoryPicker
          value={save.cat}
          onChange={(id) => {
            chooseCat(id);
            setDialog(null);
          }}
        />
      </PickerDialog>
    </div>
  );
}

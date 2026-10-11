"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";

import { toast } from "@/components/ui/8bit/toast";
import { TooltipProvider } from "@/components/ui/8bit/tooltip";
import { Backdrop, SCENES } from "@/components/backdrop";
import { type ClawHandle, ClawMachine } from "@/components/claw-machine";
import { HatchDialog, JamBar, MenuDialog, QuoteBook, VictoryDialog } from "@/components/overlays";
import { Hud, type Line, Mascot, TapeDeck } from "@/components/panels";
import type { Mood } from "@/components/pixel";
import { RetroTv, type Screen } from "@/components/retro-tv";
import { renderPostcard, savePostcard } from "@/lib/postcard";
import { QUOTES, QUOTE_BY_ID, RARITY, type Rarity, TAPES, TAPE_BY_ID, drawQuote, quotesOfSet } from "@/lib/quotes";
import { copyText } from "@/lib/clipboard";
import { skinOf } from "@/lib/skins";
import { measurePeak, setMuted, setVolume, sfx } from "@/lib/sound";
import { MAX_HEARTS, useSave } from "@/lib/store";

// King Clawdius announces things grandly, then apologises for it.
const LINES = {
  boot: { loud: "PEASANT! Your King demands a capsule!", aside: "press START on the telly. please." },
  jam: { loud: "The royal prize box is JAMMED!", aside: "I may have dropped some things in it. sorry." },
  jamHint: { loud: "It cannot pass! Scrap blocks the chute!", aside: "lift the junk out first — the claw parks right above it." },
  junk: (n: number) => ({ loud: `One piece gone! ${n} more, subject!`, aside: "you're doing great." }),
  repaired: { loud: "REPAIRED! The Capsule Empire rises again!", aside: "thank you. truly." },
  idle: { loud: "Steer the claw and seize a capsule!", aside: "blue is common, purple is rare, gold is legendary." },
  miss: { loud: "A swing and a miss!", aside: "line the claw up over the middle of one." },
  slip: { loud: "It SLIPPED! Guards! ...oh. No guards.", aside: "that one cost a life. aim for the centre." },
  common: { loud: "A fine broadcast for my subjects.", aside: "I liked that one, actually." },
  rare: { loud: "A RARE capsule! Excellent hunting!", aside: "can I keep it? no? fine." },
  legend: { loud: "LEGENDARY! All hail — well, you.", aside: "nobody has pulled gold in ages." },
  repeat: { loud: "We have aired this one before.", aside: "still good, though. +5 XP." },
  tape: (t: string) => ({ loud: `Now loading: ${t}!`, aside: "fresh capsules incoming." }),
  over: { loud: "Out of lives! The claw rests.", aside: "play again, or switch to Chill — no shame." },
  sleep: { loud: "Zzz… capsules… zzz…", aside: "poke the controls to wake him." },
  steal: { loud: "PUT THAT BACK!", aside: "it's the only gold one I have." },
  orbLife: { loud: "An ORB! One life restored!", aside: "they glow like the ones back in Xuanfang." },
  orbXp: { loud: "An ORB! A royal bonus for you!", aside: "+15 XP. spend it wisely. you can't spend it." },
  hatch: { loud: "Who opened the royal hatch?!", aside: "don't touch the dial. …okay, touch it a little." },
} satisfies Record<string, Line | ((...a: never[]) => Line)>;

export function Game() {
  const { save, update, reset, ready } = useSave();
  const [screen, setScreen] = useState<Screen>({ kind: "boot" });
  const [jamLeft, setJam] = useState(3);
  const [mood, setMood] = useState<Mood>("awake");
  const [line, setLine] = useState<Line>(LINES.boot);
  const [airing, setAiring] = useState<string | null>(null);
  /** Index into the history that is on screen; -1 while nothing is airing. */
  const [position, setPosition] = useState(-1);
  const [book, setBook] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hatch, setHatch] = useState(false);
  const [victory, setVictory] = useState<string | null>(null);
  const [stolen, setStolen] = useState(0);

  // Derived, not synced: the cabinet mounts the moment the save loads, and it
  // must already know whether to pour scrap into the chute.
  const jam = save.repaired ? 0 : jamLeft;

  const machine = useRef<ClawHandle>(null);
  const tvRef = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const idle = useRef(0);
  const started = screen.kind !== "boot";

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const say = useCallback((l: Line, m: Mood) => {
    setLine(l);
    setMood(m);
    idle.current = 0;
  }, []);

  // Restore session-level bits once the save file has loaded.
  useEffect(() => {
    if (!ready) return;
    setMuted(save.muted);
    setVolume(save.volume / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // The King nods off if nothing happens for a while.
  useEffect(() => {
    const id = window.setInterval(() => {
      idle.current += 1;
      if (idle.current === 45) {
        setLine(LINES.sleep);
        setMood("sleep");
      }
    }, 1000);
    const wake = () => {
      if (idle.current >= 45) {
        setLine(LINES.idle);
        setMood("awake");
      }
      idle.current = 0;
    };
    window.addEventListener("keydown", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, []);

  const tape = TAPE_BY_ID[save.tape] ?? TAPES[0];
  const restScreen = useCallback((): Screen => (jam > 0 ? { kind: "jam", left: jam } : { kind: "ident" }), [jam]);

  const start = useCallback(() => {
    if (started) return;
    sfx.reveal(4);
    setScreen(jam > 0 ? { kind: "jam", left: jam } : { kind: "ident" });
    say(jam > 0 ? LINES.jam : LINES.idle, jam > 0 ? "shock" : "happy");
  }, [started, jam, say]);

  // Enter starts the game from the boot screen.
  useEffect(() => {
    if (started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, start]);

  const air = useCallback(
    (rarity: Rarity) => {
      const quote = drawQuote(save.tape, rarity, save.owned);
      const fresh = !save.owned[quote.id];
      const setQuotes = quotesOfSet(quote.set);
      const completes = fresh && !save.doneSets.includes(quote.set) && setQuotes.every((x) => x.id === quote.id || save.owned[x.id]);

      update((s) => ({
        ...s,
        owned: { ...s.owned, [quote.id]: (s.owned[quote.id] ?? 0) + 1 },
        history: [quote.id, ...s.history.filter((id) => id !== quote.id)].slice(0, 40),
        pulls: s.pulls + 1,
        xp: s.xp + (fresh ? RARITY[rarity].xp : 5) + (completes ? 50 : 0),
        streak: s.streak + 1,
        best: Math.max(s.best, s.streak + 1),
        doneSets: completes ? [...s.doneSets, quote.set] : s.doneSets,
      }));

      clearTimers();
      setPosition(0);
      setAiring(quote.id);
      setScreen({ kind: "static" });
      sfx.static();
      // On a phone the telly sits above the fold of the cabinet: bring it back.
      const box = tvRef.current?.getBoundingClientRect();
      if (box && (box.top < -40 || box.bottom > window.innerHeight + 40)) {
        tvRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      later(() => {
        setScreen({ kind: "reveal", quote, fresh });
        sfx.reveal(rarity);
        say(!fresh ? LINES.repeat : rarity === 5 ? LINES.legend : rarity === 4 ? LINES.rare : LINES.common, rarity === 5 ? "shock" : "happy");
      }, 480);
      later(() => setScreen({ kind: "quote", quote, fresh }), 2300);
      if (completes) {
        later(() => {
          sfx.set();
          setVictory(quote.set);
        }, 2300 + quote.text.length * 30 + 1400);
      }
    },
    [save.tape, save.owned, save.doneSets, update, clearTimers, later, say],
  );

  const onJunkCleared = useCallback(
    (left: number) => {
      setJam(left);
      if (left > 0) {
        setScreen({ kind: "jam", left });
        say(LINES.junk(left), "happy");
        return;
      }
      update((s) => ({ ...s, repaired: true, xp: s.xp + 30 }));
      sfx.repair();
      toast("PRIZE BOX REPAIRED · +30 XP");
      say(LINES.repaired, "happy");
      setScreen({ kind: "static" });
      later(() => setScreen({ kind: "ident" }), 500);
    },
    [update, say, later],
  );

  const onJammed = useCallback(() => say(LINES.jamHint, "shock"), [say]);

  const onMiss = useCallback(() => {
    update((s) => (s.streak ? { ...s, streak: 0 } : s));
    say(LINES.miss, "sad");
  }, [update, say]);

  const onSlip = useCallback(() => {
    const hearts = Math.max(0, save.hearts - 1);
    update((s) => ({ ...s, hearts: Math.max(0, s.hearts - 1), streak: 0 }));
    if (hearts === 0) {
      clearTimers();
      sfx.over();
      setScreen({ kind: "over" });
      say(LINES.over, "sad");
    } else {
      say(LINES.slip, "shock");
    }
  }, [save.hearts, update, clearTimers, say]);

  const onOrb = useCallback(() => {
    sfx.secret();
    if (save.mode === "arcade") {
      update((s) => ({ ...s, hearts: Math.min(MAX_HEARTS, s.hearts + 1) }));
      toast("ORB · +1 LIFE");
      say(LINES.orbLife, "happy");
    } else {
      update((s) => ({ ...s, xp: s.xp + 15 }));
      toast("ORB · +15 XP");
      say(LINES.orbXp, "happy");
    }
  }, [save.mode, update, say]);

  const onGrab = useCallback(
    (kind: "capsule" | "junk" | "orb") => {
      if (kind === "capsule" && jam === 0) setMood("happy");
      idle.current = 0;
    },
    [jam],
  );

  const changeTape = useCallback(
    (id: string) => {
      if (id === save.tape || !started) return;
      update((s) => ({ ...s, tape: id }));
      clearTimers();
      sfx.tape();
      machine.current?.refill();
      setAiring(null);
      setPosition(-1);
      setScreen({ kind: "static" });
      later(() => setScreen({ kind: "intro" }), 320);
      later(() => setScreen(jam > 0 ? { kind: "jam", left: jam } : { kind: "ident" }), 2600);
      say(LINES.tape(TAPE_BY_ID[id].title), "happy");
    },
    [save.tape, started, update, clearTimers, later, jam, say],
  );

  const nextChannel = useCallback(() => {
    const i = TAPES.findIndex((t) => t.id === save.tape);
    changeTape(TAPES[(i + 1) % TAPES.length].id);
  }, [save.tape, changeTape]);

  const toggleMute = useCallback(() => {
    update((s) => {
      setMuted(!s.muted);
      return { ...s, muted: !s.muted };
    });
  }, [update]);

  // Transport: step back and forth through everything that has aired.
  const show = useCallback(
    (id: string, pos: number) => {
      const quote = QUOTE_BY_ID[id];
      if (!quote) return;
      clearTimers();
      sfx.tape();
      setPosition(pos);
      setAiring(id);
      if (quote.tape !== save.tape) update((s) => ({ ...s, tape: quote.tape }));
      setScreen({ kind: "static" });
      later(() => setScreen({ kind: "quote", quote, fresh: false, replay: true }), 260);
    },
    [clearTimers, later, save.tape, update],
  );

  const keep = useCallback(
    (id: string) => {
      const had = save.favs.includes(id);
      update((s) => ({ ...s, favs: had ? s.favs.filter((x) => x !== id) : [...s.favs, id] }));
      sfx.ui();
      toast(had ? "REMOVED FROM KEPT" : "KEPT ♥");
    },
    [save.favs, update],
  );

  const copy = useCallback(async (id: string) => {
    const quote = QUOTE_BY_ID[id];
    if (!quote) return;
    const ok = await copyText(`“${quote.text}” — ${quote.author}`);
    if (ok) sfx.ui();
    toast(ok ? "COPIED TO CLIPBOARD" : "COPY BLOCKED BY BROWSER");
  }, []);

  const postcard = useCallback(async (id: string) => {
    const quote = QUOTE_BY_ID[id];
    if (!quote) return;
    const ok = await savePostcard(quote, TAPE_BY_ID[quote.tape]);
    sfx.ui();
    toast(ok ? "POSTCARD SAVED" : "COULD NOT MAKE POSTCARD");
  }, []);

  const playAgain = useCallback(() => {
    update((s) => ({ ...s, hearts: MAX_HEARTS, streak: 0 }));
    sfx.reveal(4);
    setScreen(restScreen());
    say(LINES.idle, "happy");
  }, [update, restScreen, say]);

  const goChill = useCallback(() => {
    update((s) => ({ ...s, mode: "chill", hearts: MAX_HEARTS }));
    setScreen(restScreen());
    say(LINES.idle, "happy");
  }, [update, restScreen, say]);

  const openHatch = useCallback(() => {
    setHatch(true);
    sfx.secret();
    say(LINES.hatch, "shock");
    if (!save.hatchFound) {
      update((s) => ({ ...s, hatchFound: true, xp: s.xp + 30 }));
      toast("SECRET FOUND · +30 XP");
    }
  }, [save.hatchFound, update, say]);

  const steal = useCallback(() => {
    const n = stolen + 1;
    setStolen(n);
    if (n < 3) {
      sfx.miss();
      say(LINES.steal, "shock");
      return;
    }
    setHatch(false);
    if (started && jam === 0) air(5);
  }, [stolen, say, started, jam, air]);

  const wipe = useCallback(() => {
    clearTimers();
    reset();
    setJam(3);
    setAiring(null);
    setPosition(-1);
    setStolen(0);
    setScreen({ kind: "boot" });
    say(LINES.boot, "awake");
    window.setTimeout(() => window.location.reload(), 60);
  }, [clearTimers, reset, say]);

  // Dev-only: lets a transient screen be frozen for inspection from the console.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __casketUi?: unknown }).__casketUi = {
      reveal: (id: string) => {
        clearTimers();
        setScreen({ kind: "reveal", quote: QUOTE_BY_ID[id], fresh: true });
      },
      victory: (setId: string | null) => setVictory(setId),
      postcard: async (id: string) => {
        const blob = await renderPostcard(QUOTE_BY_ID[id], TAPE_BY_ID[QUOTE_BY_ID[id].tape]);
        return blob ? URL.createObjectURL(blob) : null;
      },
      sound: () => measurePeak(() => sfx.reveal(5)),
    };
  }, [clearTimers]);

  // Dev-only: `?demo=quote|reveal|over|book|victory|ident|jam` opens the page
  // in that state with a seeded save, for screenshots.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !ready) return;
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (!demo) return;
    const quote = QUOTE_BY_ID.p6;
    const wanted = new URLSearchParams(window.location.search).get("tape");
    const id = window.setTimeout(() => {
      if (wanted && TAPE_BY_ID[wanted]) update((s) => ({ ...s, tape: wanted }));
      if (demo === "jam") {
        setScreen({ kind: "jam", left: 3 });
        say(LINES.jam, "shock");
        return;
      }
      const seed = ["p6", "p3", "p5", "p4", "l3", "g3", "m2"];
      machine.current?.sweep();
      update((s) => ({
        ...s,
        repaired: true,
        owned: Object.fromEntries(seed.map((id) => [id, 1])),
        history: seed,
        favs: ["p6"],
        pulls: 7,
        xp: 215,
        streak: 4,
        best: 6,
        doneSets: ["play-b"],
        mode: demo === "over" ? "arcade" : s.mode,
        hearts: demo === "over" ? 0 : s.hearts,
      }));
      if (demo === "quote") {
        setAiring("p6");
        setPosition(0);
        setScreen({ kind: "quote", quote, fresh: true });
        say(LINES.legend, "shock");
      } else if (demo === "reveal") {
        setScreen({ kind: "reveal", quote, fresh: true });
        say(LINES.legend, "shock");
      } else if (demo === "over") {
        setScreen({ kind: "over" });
        say(LINES.over, "sad");
      } else {
        setScreen({ kind: "ident" });
        say(LINES.idle, "happy");
        if (demo === "book") setBook(true);
        if (demo === "victory") setVictory("play-b");
        if (demo === "menu") setMenu(true);
        if (demo === "hatch") setHatch(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const ownedCount = QUOTES.filter((x) => save.owned[x.id]).length;
  const busy = screen.kind === "static" || screen.kind === "reveal" || screen.kind === "intro";
  const locked = !started || busy || screen.kind === "over" || book || menu || hatch || !!victory;
  const current = airing ? QUOTE_BY_ID[airing] : null;

  return (
    <TooltipProvider>
      <div className="scene relative min-h-dvh overflow-x-clip">
        <Backdrop scene={SCENES[tape.id] ?? SCENES.play} />

        <div className="relative mx-auto max-w-[1180px] px-4 pt-5 pb-28 sm:px-6 sm:pt-7">
          <Hud
            pulls={save.pulls}
            owned={ownedCount}
            xp={save.xp}
            mode={save.mode}
            hearts={save.hearts}
            streak={save.streak}
            best={save.best}
            onBook={() => setBook(true)}
            onSettings={() => setMenu(true)}
          />

          <main className="mt-8 grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
            <section aria-label="Claw machine" className="order-2 lg:order-1 lg:row-span-2">
              <Mascot mood={mood} line={line} lift={!!skinOf(tape.id).roof} className="relative z-10 -mb-[6px] px-3" />
              {ready ? (
                <ClawMachine
                  ref={machine}
                  mode={save.mode}
                  jam={jam}
                  grip={save.grip}
                  locked={locked}
                  onWin={air}
                  onJunkCleared={onJunkCleared}
                  onJammed={onJammed}
                  onSlip={onSlip}
                  onMiss={onMiss}
                  onGrab={onGrab}
                  onOrb={onOrb}
                  skin={skinOf(tape.id)}
                  onHatch={openHatch}
                />
              ) : (
                <div className="cabinet mx-auto flex aspect-[5/6] w-full max-w-[520px] items-center justify-center">
                  <span className="font-display blink text-[10px]">LOADING…</span>
                </div>
              )}
            </section>

            <section ref={tvRef} aria-label="Television" className="order-1 scroll-mt-4 lg:order-2 lg:pt-6">
              <RetroTv
                screen={screen}
                tape={tape}
                muted={save.muted}
                onStart={start}
                onChannel={nextChannel}
                onMute={toggleMute}
                onPlayAgain={playAgain}
                onChill={goChill}
              />
              {started && jam > 0 && (
                <div className="mx-auto mt-4 max-w-[560px]">
                  <JamBar left={jam} />
                </div>
              )}
            </section>

            <section aria-label="Tape deck" className="order-3 lg:-mt-6">
              <TapeDeck
                tapes={TAPES}
                active={tape}
                owned={save.owned}
                disabled={!started || busy}
                quote={current}
                fav={!!airing && save.favs.includes(airing)}
                position={position}
                total={save.history.length}
                onTape={changeTape}
                onRewind={() => {
                  const next = Math.min(save.history.length - 1, position + 1);
                  if (save.history[next]) show(save.history[next], next);
                }}
                onForward={() => {
                  if (save.history[0]) show(save.history[0], 0);
                }}
                onKeep={() => airing && keep(airing)}
                onCopy={() => airing && copy(airing)}
                onPostcard={() => airing && postcard(airing)}
              />
            </section>
          </main>
        </div>

        <QuoteBook
          open={book}
          onOpenChange={setBook}
          save={save}
          jam={jam}
          onAir={(id) => {
            setBook(false);
            const pos = save.history.indexOf(id);
            show(id, Math.max(0, pos));
          }}
          onKeep={keep}
          onCopy={copy}
          onPostcard={postcard}
        />
        <MenuDialog
          open={menu}
          onOpenChange={setMenu}
          mode={save.mode}
          muted={save.muted}
          volume={save.volume}
          onMode={(mode) => {
            update((s) => ({ ...s, mode, hearts: MAX_HEARTS }));
            sfx.ui();
          }}
          onMuted={(m) => {
            setMuted(m);
            update((s) => ({ ...s, muted: m }));
          }}
          onVolume={(v) => {
            setVolume(v / 100);
            update((s) => ({ ...s, volume: v }));
          }}
          onReset={wipe}
        />
        <HatchDialog open={hatch} onOpenChange={setHatch} grip={save.grip} mode={save.mode} onGrip={(g) => update((s) => ({ ...s, grip: g }))} onSteal={steal} stolen={stolen} />
        <VictoryDialog setId={victory} onClose={() => setVictory(null)} />
        <Toaster position="bottom-center" />
      </div>
    </TooltipProvider>
  );
}

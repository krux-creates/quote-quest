"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/8bit/alert";
import { Button } from "@/components/ui/8bit/button";
import { cn } from "@/lib/utils";

import { Art, type Mood, type TigerPose, tiger } from "./art";

// The cub on top of the machine. It is never still. Left alone it runs through
// a little routine: kneading the edge with its paws, looking about, tilting
// its head, flicking an ear, waving, ducking behind the marquee and popping
// back up. It also breathes, blinks, watches the claw, nods to the music,
// dozes off if you leave it long enough, and pulls a face for anything that
// happens. Poke it and it pulls a different one.

export type CatAnim = "hop" | "squish" | "shake" | "nod" | "peek";

interface Emote {
  face: Mood;
  anim: CatAnim;
  wave: boolean;
  /** Changes every time, so the same animation can replay back to back. */
  id: number;
}

/** One moment of an idle act: a face, a pose, and which way it leans. */
export interface Act extends TigerPose {
  face?: Mood;
  lean?: number;
  anim?: CatAnim;
  id: number;
}
type Frame = [Omit<Act, "id">, number];

const times = (n: number, frames: Frame[]): Frame[] => Array.from({ length: n }, () => frames).flat();

/** The idle routine. Each act is a short strip of frames and how long each one holds, in milliseconds. */
const ACTS: Frame[][] = [
  // Kneading the edge of the cabinet, one paw then the other.
  times(5, [
    [{ face: "purr", paw: "kneadL" }, 190],
    [{ face: "purr", paw: "kneadR" }, 190],
  ]),
  // Looking about.
  [
    [{ face: "lookL", lean: -1 }, 540],
    [{ face: "blink", lean: -1 }, 110],
    [{ face: "lookR", lean: 1 }, 580],
    [{ face: "blink" }, 110],
  ],
  // An ear flick.
  [
    [{ ears: true }, 110],
    [{}, 120],
    [{ ears: true }, 110],
    [{}, 260],
  ],
  // A head tilt, a wink, a tilt the other way.
  [
    [{ face: "happy", tilt: -1 }, 420],
    [{ face: "wink", tilt: -1 }, 520],
    [{ face: "happy" }, 140],
    [{ face: "purr", tilt: 1 }, 460],
  ],
  // Ducking behind the marquee and popping back up, delighted with itself.
  [
    [{ face: "happy", anim: "peek" }, 1000],
    [{ face: "laugh", anim: "peek" }, 750],
  ],
  // A wave.
  times(3, [
    [{ face: "happy", paw: "wave" }, 230],
    [{ face: "happy" }, 170],
  ]),
];

/** What a poke gets you, in order. */
export const POKES: { face: Mood; anim: CatAnim; line: string; wave?: boolean }[] = [
  { face: "laugh", anim: "squish", line: "Hehe! That tickles!" },
  { face: "purr", anim: "nod", line: "Purrrr... do that again." },
  { face: "love", anim: "hop", line: "Aww. I like you too!" },
  { face: "wink", anim: "nod", line: "Psst. The gold ball is the rare one.", wave: true },
  { face: "cool", anim: "nod", line: "Too cool for claws." },
  { face: "stars", anim: "hop", line: "Ooh, sparkly!" },
];

const NAP_AFTER_MS = 45000;

/** The cub's own life: reactions that wear off, the idle routine, a blink every few seconds, and a nap when nobody is around. */
export function useCat() {
  const [emote, setEmote] = useState<Emote | null>(null);
  const [act, setAct] = useState<Act | null>(null);
  const [blink, setBlink] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const count = useRef(0);
  const off = useRef(0);

  const react = useCallback((face: Mood, anim: CatAnim = "hop", ms = 1400, wave = false) => {
    window.clearTimeout(off.current);
    count.current += 1;
    setEmote({ face, anim, wave, id: count.current });
    off.current = window.setTimeout(() => setEmote(null), ms);
  }, []);

  useEffect(() => {
    let blinker = 0;
    let lid = 0;
    const scheduleBlink = () => {
      blinker = window.setTimeout(
        () => {
          setBlink(true);
          lid = window.setTimeout(() => setBlink(false), 150);
          scheduleBlink();
        },
        2400 + Math.random() * 3200,
      );
    };
    scheduleBlink();

    // The idle routine: one act, a short rest, the next act.
    let stage = 0;
    let turn = 0;
    const play = (frames: Frame[], i: number, id: number) => {
      if (i >= frames.length) {
        setAct(null);
        stage = window.setTimeout(next, 1300 + Math.random() * 1700);
        return;
      }
      setAct({ ...frames[i][0], id });
      stage = window.setTimeout(() => play(frames, i + 1, id), frames[i][1]);
    };
    const next = () => {
      turn += 1;
      play(ACTS[turn % ACTS.length], 0, turn);
    };
    stage = window.setTimeout(next, 2600);

    let nap = 0;
    let seen = 0;
    const arm = () => {
      window.clearTimeout(nap);
      nap = window.setTimeout(() => setAsleep(true), NAP_AFTER_MS);
    };
    let woken = 0;
    // A press or a key wakes the cub. A held key repeats many times a second; a few a second is plenty.
    const wake = () => {
      if (Date.now() - woken < 200) return;
      woken = Date.now();
      setAsleep(false);
      arm();
    };
    // Moving the pointer counts as company, but not more than once a second.
    const stir = () => {
      if (Date.now() - seen < 1000) return;
      seen = Date.now();
      wake();
    };
    arm();
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("pointermove", stir);
    const timer = off;
    return () => {
      window.clearTimeout(blinker);
      window.clearTimeout(lid);
      window.clearTimeout(stage);
      window.clearTimeout(nap);
      window.clearTimeout(timer.current);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointermove", stir);
    };
  }, []);

  return { emote, act, blink, asleep, react };
}

interface MascotProps {
  face: Mood;
  pose?: TigerPose;
  /** A one-shot animation, and a key that changes each time it should replay. */
  anim?: CatAnim | null;
  animKey?: number;
  /** Which way it is leaning to watch the claw. */
  lean: number;
  asleep: boolean;
  /** Seconds per beat when music is playing: it nods along. */
  beat: number | null;
  line: string;
  onPoke: () => void;
}

export function Mascot({ face, pose, anim, animKey = 0, lean, asleep, beat, line, onPoke }: MascotProps) {
  // A tilted head is drawn on a slightly wider sprite; shift it back so the paws stay put.
  const tilted = !!pose?.tilt;
  return (
    <div className="relative z-10 h-[92px]">
      {/* The cub is a button too: 8bitcn's ghost variant, the one that draws no frame. */}
      <Button font="normal" variant="ghost" className="qq-poke absolute -bottom-[33px] left-1 block h-auto p-0" data-lean={lean < 0 ? "l" : lean > 0 ? "r" : undefined} data-peek={anim === "peek" || undefined} aria-label="Pet the cat" onClick={onPoke}>
        <span
          key={anim ? `${anim}-${animKey}` : "idle"}
          className={cn("qq-cat block", anim ? `qq-cat-${anim}` : beat ? "qq-cat-groove" : "qq-cat-idle")}
          style={!anim && beat ? ({ "--beat": `${beat}s` } as React.CSSProperties) : undefined}
        >
          <Art sprite={tiger(face, pose)} px={3} className="size-auto" style={tilted ? { marginLeft: -9, marginRight: -9 } : undefined} />
        </span>
        {asleep && (
          <span className="qq-zzz" aria-hidden="true">
            <i>z</i>
            <i>z</i>
            <i>Z</i>
          </span>
        )}
      </Button>
      {/* The speech bubble: an 8bitcn Alert, as wide as what is being said, with a pointer built from the same blocks as its frame. */}
      <div className="qq-say absolute top-[6px] left-[176px]">
        <Alert font="normal" className="flex min-h-[58px] items-center px-4 py-2" role="status">
          <AlertDescription className="qq-copy block text-[#34305e]">{line}</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

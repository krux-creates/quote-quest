import { audioContext } from "@/lib/sound";

import type { WorldId } from "./worlds";

// One looping chiptune per world, written here as note lists and played through
// a few oscillators. Nothing is sampled and nothing is borrowed: these five
// tunes were composed for this game.
//
// Notation: "E5:4" is a note and its length in sixteenths; "-" is a rest; a
// bare "E5" takes the track's default length; "|" only marks the bar for the reader.

interface Track {
  wave: OscillatorType;
  gain: number;
  /** Default note length, in sixteenths. */
  step: number;
  notes: string;
}

interface Song {
  name: string;
  bpm: number;
  lead: Track;
  arp: Track;
  bass: Track;
  /** One bar of sixteen steps each; "x" is a hit. */
  kick: string;
  snare: string;
  hat: string;
}

const twice = (s: string) => `${s} | ${s}`;
const bars = (...chords: string[]) => chords.join(" | ");
const rep = (s: string, n: number) => Array(n).fill(s).join(" ");

const SONGS: Record<WorldId, Song> = {
  // Dreamland: slow, in C, all soft edges.
  dream: {
    name: "Cotton Sky",
    bpm: 92,
    lead: {
      wave: "triangle",
      gain: 0.3,
      step: 4,
      notes: "E5 G5 C6 G5 | A5 E5 C5 E5 | F5 A5 C6 A5 | G5 B5 D6:2 B5:2 G5 | E5:2 G5:2 C6 E6 D6:2 C6:2 | C6 A5 E5 A5 | A5:2 C6:2 F6 E6 C6 | D6 B5 G5:8",
    },
    arp: { wave: "square", gain: 0.035, step: 2, notes: twice(bars(rep("C4 E4 G4 E4", 2), rep("A3 C4 E4 C4", 2), rep("F3 A3 C4 A3", 2), rep("G3 B3 D4 B3", 2))) },
    bass: { wave: "triangle", gain: 0.26, step: 8, notes: twice("C3 G2 | A2 E2 | F2 C3 | G2 D3") },
    kick: "x.......x.......",
    snare: "................",
    hat: "..x...x...x...x.",
  },
  // Mushroom Hills: quick and bouncy, in G, with a hop in every bar.
  mushroom: {
    name: "Hop Along",
    bpm: 138,
    lead: {
      wave: "square",
      gain: 0.1,
      step: 2,
      notes:
        "B4 D5 G5 -:1 G5:1 B5 A5 G5 - | E5 G5 C6 - B5 G5 E5:4 | D5 G5 B5 -:1 B5:1 A5 G5 D5 - | F#5 A5 D6:4 C6 A5 F#5:4 | G5 B5 E6 - D6 B5 G5:4 | E5 G5 C6 E6 D6 C6 G5:4 | A5 F#5 A5 D6 C6 A5 F#5 A5 | G5:4 D5 B4 G4:4 -:4",
    },
    arp: {
      wave: "square",
      gain: 0.03,
      step: 2,
      notes: bars(rep("B3 D4 G4 D4", 2), rep("C4 E4 G4 E4", 2), rep("B3 D4 G4 D4", 2), rep("A3 D4 F#4 D4", 2), rep("B3 E4 G4 E4", 2), rep("C4 E4 G4 E4", 2), rep("A3 D4 F#4 D4", 2), rep("B3 D4 G4 D4", 2)),
    },
    bass: {
      wave: "triangle",
      gain: 0.28,
      step: 2,
      notes: bars(rep("G2 G3", 4), rep("C3 C4", 4), rep("G2 G3", 4), rep("D3 D4", 4), rep("E2 E3", 4), rep("C3 C4", 4), rep("D3 D4", 4), rep("G2 G3", 4)),
    },
    kick: "x.....x.x.......",
    snare: "....x.......x...",
    hat: "x.x.x.x.x.x.x.x.",
  },
  // Cosmic Arcade: long notes over a shimmer of sixteenths, in A minor.
  cosmic: {
    name: "Starfield",
    bpm: 96,
    lead: {
      wave: "triangle",
      gain: 0.3,
      step: 4,
      notes: "E5:6 C5:2 A4:8 | F5:6 C5:2 A4:8 | G5:6 E5:2 C5:8 | D5:6 B4:2 G4 B4 | A5:6 E5:2 C6:8 | A5 F5 C6:8 | G5 E5 C6 E6 | D6:8 B5 G5",
    },
    arp: {
      wave: "square",
      gain: 0.03,
      step: 1,
      notes: twice(bars(rep("A3 C4 E4 A4 C5 A4 E4 C4", 2), rep("F3 A3 C4 F4 A4 F4 C4 A3", 2), rep("C4 E4 G4 C5 E5 C5 G4 E4", 2), rep("G3 B3 D4 G4 B4 G4 D4 B3", 2))),
    },
    bass: { wave: "triangle", gain: 0.26, step: 16, notes: twice("A2 | F2 | C3 | G2") },
    kick: "x.........x.....",
    snare: "............x...",
    hat: "..x...x...x...x.",
  },
  // Neon Circuit: fast, in E minor, with the bass pumping eighths the whole way.
  racing: {
    name: "Night Lap",
    bpm: 150,
    lead: {
      wave: "sawtooth",
      gain: 0.085,
      step: 2,
      notes:
        "E5 -:1 E5:1 G5 B5 A5 G5 E5 - | G5 -:1 G5:1 E5 C5 E5 G5 C6:4 | F#5 A5 D6 A5 F#5 A5 D6 E6 | E6:4 B5 G5 E5:4 -:4 | B5 -:1 B5:1 E6 B5 G5 B5 E6 - | C6 -:1 C6:1 G5 E5 G5 C6 E6:4 | D6 F#6 E6 D6 A5 D6 F#5 A5 | D#6:4 B5:4 F#5:4 B5 D#6",
    },
    arp: {
      wave: "square",
      gain: 0.028,
      step: 1,
      notes: bars(rep("E4 G4 B4 G4", 4), rep("E4 G4 C5 G4", 4), rep("F#4 A4 D5 A4", 4), rep("E4 G4 B4 G4", 4), rep("E4 G4 B4 G4", 4), rep("E4 G4 C5 G4", 4), rep("F#4 A4 D5 A4", 4), rep("F#4 B4 D#5 B4", 4)),
    },
    bass: {
      wave: "triangle",
      gain: 0.3,
      step: 2,
      notes: bars("E2 E2 E3 E2 E2 E2 E3 E2", "C3 C3 C4 C3 C3 C3 C4 C3", "D3 D3 D4 D3 D3 D3 D4 D3", "E2 E2 E3 E2 E2 E2 E3 E2", "E2 E2 E3 E2 E2 E2 E3 E2", "C3 C3 C4 C3 C3 C3 C4 C3", "D3 D3 D4 D3 D3 D3 D4 D3", "B2 B2 B3 B2 B2 B2 B3 B2"),
    },
    kick: "x...x...x...x...",
    snare: "....x.......x...",
    hat: "x.xxx.xxx.xxx.xx",
  },
  // Dungeon Quest: slow and low, in D minor, with the raised seventh for a little menace.
  dungeon: {
    name: "Torchlight",
    bpm: 84,
    lead: {
      wave: "square",
      gain: 0.085,
      step: 4,
      notes: "D4 F4 A4:6 G4:2 | F4 D4 Bb3:8 | G4 Bb4 D5:6 C5:2 | C#5 A4 E4:8 | D5 A4 F4 A4 | Bb4 D5 F5:6 D5:2 | G4:2 Bb4:2 D5 Bb4 G4 | A4 C#5 E5 A4",
    },
    arp: {
      wave: "triangle",
      gain: 0.12,
      step: 2,
      notes: twice(bars("D3 A3 D4 F4 D4 A3 D4 F4", "Bb2 F3 Bb3 D4 Bb3 F3 Bb3 D4", "G2 D3 G3 Bb3 G3 D3 G3 Bb3", "A2 E3 A3 C#4 A3 E3 A3 C#4")),
    },
    bass: { wave: "triangle", gain: 0.3, step: 4, notes: twice("D2:8 D2 A2 | Bb2:8 Bb2 F2 | G2:8 G2 D3 | A2:8 A2 E2") },
    kick: "x.........x.....",
    snare: "........x.......",
    hat: "....x.......x...",
  },
};

export const songName = (world: WorldId) => SONGS[world].name;
/** Seconds per beat, so the mascot can nod along. */
export const songBeat = (world: WorldId) => 60 / SONGS[world].bpm;

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(name: string) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  const n = SEMITONE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((n - 69) / 12);
}

interface Hit {
  freq: number;
  len: number;
}
/** Turn a note list into one slot per sixteenth: the note that starts there, or nothing. */
function compile(t: Track): (Hit | null)[] {
  const out: (Hit | null)[] = [];
  for (const token of t.notes.split(/\s+/)) {
    if (!token || token === "|") continue;
    const [name, len] = token.split(":");
    const n = len ? Number(len) : t.step;
    out.push(name === "-" ? null : { freq: freq(name), len: n });
    for (let i = 1; i < n; i++) out.push(null);
  }
  return out;
}

interface Playing {
  world: WorldId;
  song: Song;
  lead: (Hit | null)[];
  arp: (Hit | null)[];
  bass: (Hit | null)[];
  length: number;
  step: number;
  /** Audio-clock time of the next step to schedule. */
  at: number;
  bus: GainNode;
  timer: number;
}

// The tune in progress lives on the window, not in this module, so it keeps
// playing through a hot reload and there is only ever one of it.
const store = globalThis as { __questTune?: Playing | null };
let noise: AudioBuffer | null = null;
/** How far ahead notes are queued. Generous, because background tabs only get a timer once a second. */
const AHEAD = 1.6;
const LEVEL = 0.32;

function tone(ac: AudioContext, bus: GainNode, wave: OscillatorType, f: number, at: number, dur: number, gain: number) {
  if (!f) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(f, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.setValueAtTime(gain, at + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.96);
  osc.connect(g).connect(bus);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function drum(ac: AudioContext, bus: GainNode, kind: "kick" | "snare" | "hat", at: number) {
  if (kind === "kick") {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(46, at + 0.11);
    g.gain.setValueAtTime(0.5, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    osc.connect(g).connect(bus);
    osc.start(at);
    osc.stop(at + 0.16);
    return;
  }
  if (!noise) {
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.2), ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const g = ac.createGain();
  const dur = kind === "snare" ? 0.1 : 0.035;
  src.buffer = noise;
  filter.type = "highpass";
  filter.frequency.value = kind === "snare" ? 1600 : 7000;
  g.gain.setValueAtTime(kind === "snare" ? 0.22 : 0.09, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(bus);
  src.start(at);
  src.stop(at + dur + 0.02);
}

function pump() {
  const ac = audioContext();
  const p = store.__questTune;
  if (!ac || !p) return;
  // After a long sleep (a throttled tab), skip ahead rather than play a burst of late notes.
  if (p.at < ac.currentTime) p.at = ac.currentTime + 0.05;
  const sixteenth = 60 / p.song.bpm / 4;
  while (p.at < ac.currentTime + AHEAD) {
    const i = p.step;
    for (const [track, hits] of [
      [p.song.lead, p.lead],
      [p.song.arp, p.arp],
      [p.song.bass, p.bass],
    ] as const) {
      const hit = hits[i % hits.length];
      if (hit) tone(ac, p.bus, track.wave, hit.freq, p.at, hit.len * sixteenth, track.gain);
    }
    const beat = i % 16;
    if (p.song.kick[beat] === "x") drum(ac, p.bus, "kick", p.at);
    if (p.song.snare[beat] === "x") drum(ac, p.bus, "snare", p.at);
    if (p.song.hat[beat] === "x") drum(ac, p.bus, "hat", p.at);
    p.step = (i + 1) % p.length;
    p.at += sixteenth;
  }
}

/** Fade out and stop whatever is playing. Safe to call when nothing is. */
export function stopSong() {
  const p = store.__questTune;
  if (!p) return;
  store.__questTune = null;
  window.clearInterval(p.timer);
  const ac = audioContext();
  if (!ac) return;
  // Notes already queued keep sounding, so the fade is what actually ends the tune.
  p.bus.gain.cancelScheduledValues(ac.currentTime);
  p.bus.gain.setValueAtTime(p.bus.gain.value, ac.currentTime);
  p.bus.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.25);
  window.setTimeout(() => p.bus.disconnect(), 2200);
}

/** Start a world's tune from the top. Call it from a user gesture the first time. */
export function playSong(world: WorldId) {
  if (store.__questTune?.world === world) return;
  stopSong();
  const ac = audioContext();
  if (!ac) return;
  const song = SONGS[world];
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, ac.currentTime);
  bus.gain.linearRampToValueAtTime(LEVEL, ac.currentTime + 0.4);
  bus.connect(ac.destination);
  const lead = compile(song.lead);
  const next: Playing = { world, song, lead, arp: compile(song.arp), bass: compile(song.bass), length: lead.length, step: 0, at: ac.currentTime + 0.12, bus, timer: 0 };
  next.timer = window.setInterval(pump, 200);
  store.__questTune = next;
  pump();
}

/** Dev check: every track of every song should fill whole bars, and loop together. */
export function checkSongs() {
  return Object.entries(SONGS).map(([id, s]) => {
    const [lead, arp, bass] = [compile(s.lead).length, compile(s.arp).length, compile(s.bass).length];
    return { id, lead, arp, bass, ok: lead % 16 === 0 && lead % arp === 0 && lead % bass === 0 };
  });
}

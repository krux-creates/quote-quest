// Every sound is synthesised on the fly — square and triangle blips through
// one gain node, so there are no audio files to load.

type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let volume = 0.5;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume * 0.25;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** The shared audio context, for anything that wants its own chain (the world music does). */
export function audioContext() {
  return audio();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master) master.gain.value = muted ? 0 : volume * 0.25;
}

export function setVolume(next: number) {
  volume = Math.max(0, Math.min(1, next));
  if (master) master.gain.value = muted ? 0 : volume * 0.25;
}

function tone(freq: number, at: number, dur: number, wave: Wave = "square", gain = 1, slideTo?: number) {
  const ac = audio();
  if (!ac || !master || muted) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(at: number, dur: number, gain = 0.5) {
  const ac = audio();
  if (!ac || !master || muted) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  const g = ac.createGain();
  src.buffer = buf;
  g.gain.value = gain;
  src.connect(g).connect(master);
  src.start(ac.currentTime + at);
}

const scale = (notes: number[], step: number, dur: number, wave: Wave = "square", gain = 0.8) =>
  notes.forEach((n, i) => tone(n, i * step, dur, wave, gain));

export const sfx = {
  /** One tick per step of the claw. */
  move: () => tone(220, 0, 0.04, "square", 0.35),
  press: () => tone(330, 0, 0.06, "square", 0.6, 180),
  descend: () => tone(520, 0, 0.5, "triangle", 0.5, 150),
  grab: () => scale([392, 523], 0.06, 0.08),
  miss: () => tone(180, 0, 0.22, "sawtooth", 0.5, 70),
  slip: () => scale([440, 330, 220, 147], 0.07, 0.1, "square", 0.6),
  drop: () => tone(600, 0, 0.25, "triangle", 0.6, 120),
  clunk: () => {
    noise(0, 0.08, 0.5);
    tone(90, 0, 0.12, "square", 0.6);
  },
  static: () => noise(0, 0.45, 0.35),
  type: () => tone(880 + Math.random() * 120, 0, 0.018, "square", 0.12),
  reveal: (rarity: 3 | 4 | 5) => {
    if (rarity === 5) scale([523, 659, 784, 1047, 1319, 1568], 0.09, 0.16, "square", 0.8);
    else if (rarity === 4) scale([523, 659, 784, 1047], 0.09, 0.14, "square", 0.7);
    else scale([523, 784], 0.09, 0.12, "square", 0.6);
  },
  tape: () => {
    noise(0, 0.12, 0.4);
    tone(110, 0.1, 0.15, "square", 0.5);
    tone(165, 0.24, 0.12, "square", 0.5);
  },
  repair: () => scale([262, 330, 392, 523, 659, 784], 0.08, 0.14, "square", 0.8),
  set: () => scale([392, 523, 659, 784, 659, 784, 1047], 0.11, 0.18, "square", 0.8),
  over: () => scale([392, 370, 349, 294, 196], 0.18, 0.24, "triangle", 0.8),
  ui: () => tone(660, 0, 0.05, "square", 0.4),
  /** A page turning. */
  page: () => {
    noise(0, 0.07, 0.22);
    tone(520, 0.03, 0.04, "triangle", 0.2, 300);
  },
  secret: () => scale([988, 1319, 988, 1319, 1760], 0.07, 0.1, "square", 0.6),
};

/**
 * Dev aid: play `fn` and report the loudest sample that reached the output
 * over the next `ms`. A peak above zero proves the sound was really made,
 * which matters when nobody is listening to the test run.
 */
export function measurePeak(fn: () => void, ms = 900): Promise<{ peak: number; state: string }> {
  const ac = audio();
  if (!ac || !master) return Promise.resolve({ peak: 0, state: "unavailable" });
  const tap = ac.createScriptProcessor(1024, 1, 1);
  const sink = ac.createGain();
  sink.gain.value = 0;
  let peak = 0;
  tap.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  };
  master.connect(tap);
  tap.connect(sink).connect(ac.destination);
  fn();
  return new Promise((resolve) => {
    window.setTimeout(() => {
      master?.disconnect(tap);
      tap.disconnect();
      resolve({ peak: Math.round(peak * 1000) / 1000, state: ac.state });
    }, ms);
  });
}

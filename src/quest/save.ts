import { type BallId, isBallId } from "./balls";
import { CATEGORIES, type Category, quoteById } from "./quotes";
import { type WorldId, isWorldId } from "./worlds";

// Everything worth keeping between visits, in one localStorage entry.

export interface LogEntry {
  /** Quote id. */
  q: string;
  /** The ball it came out of. */
  b: BallId;
}

export interface Save {
  favs: string[];
  /** Quotes revealed, ever. */
  pulls: number;
  world: WorldId;
  cat: Category;
  /** Ball designs found so far. */
  dex: BallId[];
  /** The last quotes revealed, oldest first. */
  log: LogEntry[];
  /** All sound off. */
  muted: boolean;
  /** The world tune, on its own switch. */
  music: boolean;
}

export const NEW_SAVE: Save = { favs: [], pulls: 0, world: "dream", cat: "motivation", dex: [], log: [], muted: false, music: true };

const LOG_MAX = 40;
/** In development `?slot=name` keeps a separate save, so tests never touch a real one. */
function key() {
  const slot = process.env.NODE_ENV === "production" ? null : new URLSearchParams(window.location.search).get("slot");
  return slot ? `quote-quest:v3:${slot}` : "quote-quest:v3";
}

const isCategory = (x: unknown): x is Category => CATEGORIES.some((c) => c.id === x);
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** Read the save, dropping anything that no longer matches the game (old ids, bad shapes). */
export function readSave(): Save {
  try {
    const raw = window.localStorage.getItem(key());
    if (!raw) return NEW_SAVE;
    const s = JSON.parse(raw) as Record<string, unknown>;
    return {
      favs: [...new Set(list(s.favs).filter((id): id is string => typeof id === "string" && !!quoteById(id)))],
      pulls: typeof s.pulls === "number" && s.pulls >= 0 ? Math.floor(s.pulls) : 0,
      world: isWorldId(s.world) ? s.world : NEW_SAVE.world,
      cat: isCategory(s.cat) ? s.cat : NEW_SAVE.cat,
      dex: [...new Set(list(s.dex).filter(isBallId))],
      log: list(s.log)
        .filter((e): e is LogEntry => !!e && typeof e === "object" && !!quoteById((e as LogEntry).q) && isBallId((e as LogEntry).b))
        .map((e) => ({ q: e.q, b: e.b }))
        .slice(-LOG_MAX),
      muted: s.muted === true,
      music: s.music !== false,
    };
  } catch {
    // No save, or storage blocked: start clean.
    return NEW_SAVE;
  }
}

export function writeSave(s: Save) {
  try {
    window.localStorage.setItem(key(), JSON.stringify({ ...s, log: s.log.slice(-LOG_MAX) }));
  } catch {
    // Private windows can refuse writes; the game still works for the session.
  }
}

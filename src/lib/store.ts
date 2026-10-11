"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type Mode = "chill" | "arcade";

export const MAX_HEARTS = 9;
export const XP_PER_LEVEL = 120;

export interface Save {
  /** quote id → how many times it has been pulled */
  owned: Record<string, number>;
  favs: string[];
  /** Most recent first — what the REWIND button steps through. */
  history: string[];
  pulls: number;
  xp: number;
  mode: Mode;
  hearts: number;
  streak: number;
  best: number;
  muted: boolean;
  volume: number;
  /** False until the jammed prize box has been cleared once. */
  repaired: boolean;
  tape: string;
  /** The grip dial hidden behind the service hatch, 0–100. */
  grip: number;
  hatchFound: boolean;
  doneSets: string[];
}

export const DEFAULT_SAVE: Save = {
  owned: {},
  favs: [],
  history: [],
  pulls: 0,
  xp: 0,
  mode: "chill",
  hearts: MAX_HEARTS,
  streak: 0,
  best: 0,
  muted: false,
  volume: 60,
  repaired: false,
  tape: "play",
  grip: 50,
  hatchFound: false,
  doneSets: [],
};

const KEY = "quote-casket:v1";

function readSave(): Save {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
  } catch {
    // A corrupt or blocked store just means a fresh game.
  }
  return DEFAULT_SAVE;
}

const never = () => () => {};

/**
 * The whole save file lives in one localStorage entry. `ready` flips to true
 * once the page has hydrated, so the server render and the first client
 * render both see the default save and nothing mismatches.
 */
export function useSave() {
  const ready = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  const stored = useMemo(() => (ready ? readSave() : DEFAULT_SAVE), [ready]);
  const [edited, setEdited] = useState<Save | null>(null);
  const save = edited ?? stored;

  useEffect(() => {
    if (!edited) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(edited));
    } catch {
      // Private windows can refuse writes; the game still runs for the session.
    }
  }, [edited]);

  const update = useCallback((fn: (s: Save) => Save) => setEdited((prev) => fn(prev ?? readSave())), []);
  const reset = useCallback(() => setEdited(DEFAULT_SAVE), []);

  return { save, update, reset, ready };
}

export const levelOf = (xp: number) => 1 + Math.floor(xp / XP_PER_LEVEL);
export const levelProgress = (xp: number) => Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);

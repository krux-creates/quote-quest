import type { Ink } from "./art";

// Five worlds. Picking one swaps the whole level: the scenery behind the
// machine (scenery.tsx), the cabinet skin (quest.css, under [data-world]) and
// the colours of everything inside the glass (`look`, below).

export type WorldId = "dream" | "mushroom" | "cosmic" | "racing" | "dungeon";

export interface Look {
  rail: string;
  railHi: string;
  cap: string;
  carriage: string;
  carriageHi: string;
  cable: string;
  post: string;
  stripe: string;
  floor: string;
  floorLine: string;
  sign: string;
  signInk: string;
  head: { b: string; h: string; d: string; t: string };
  prong: string;
  /** A pale ring behind each ball, for worlds where the glass is dark. */
  rim: string | null;
}

export interface World {
  id: WorldId;
  /** Stage number, as on a level-select screen. */
  stage: string;
  name: string;
  /** One short line: at most 13 letters, so it fits a level card on a single line. */
  tag: string;
  /** Ink for each of the ten letters of QUOTE QUEST. */
  inks: Ink[];
  /** Browser chrome colour. */
  theme: string;
  look: Look;
}

export const WORLDS: World[] = [
  {
    id: "dream",
    stage: "1",
    name: "Dreamland",
    tag: "Candy hills",
    inks: ["pink", "blue", "yellow", "lilac", "mint", "mint", "lilac", "pink", "blue", "yellow"],
    theme: "#b9a6f2",
    look: {
      rail: "#4a78e8",
      railHi: "#8fb0ff",
      cap: "#ffd95a",
      carriage: "#ffd95a",
      carriageHi: "#fff3ae",
      cable: "#4a78e8",
      post: "#ffd95a",
      stripe: "#f77fb2",
      floor: "#eec3d8",
      floorLine: "#dba3c2",
      sign: "#b9f0d4",
      signInk: "#34305e",
      head: { b: "#ffd95a", h: "#fff3ae", d: "#f1b53c", t: "#4a78e8" },
      prong: "#aab0c8",
      rim: null,
    },
  },
  {
    id: "mushroom",
    stage: "2",
    name: "Mushroom Hills",
    tag: "Coin blocks",
    inks: ["gold", "cream", "gold", "cream", "gold", "cream", "gold", "cream", "gold", "cream"],
    theme: "#5ab0f5",
    look: {
      rail: "#e8483a",
      railHi: "#ff9a8a",
      cap: "#ffc93a",
      carriage: "#ffc93a",
      carriageHi: "#fff0a8",
      cable: "#fff3d0",
      post: "#4fbf5a",
      stripe: "#ffc93a",
      floor: "#c9793a",
      floorLine: "#58c74f",
      sign: "#fff3d0",
      signInk: "#34305e",
      head: { b: "#e8483a", h: "#ff9a8a", d: "#b82c20", t: "#fff3d0" },
      prong: "#c9cce0",
      rim: null,
    },
  },
  {
    id: "cosmic",
    stage: "3",
    name: "Cosmic Arcade",
    tag: "Neon planets",
    inks: ["cyan", "violet", "magenta", "cyan", "violet", "magenta", "cyan", "violet", "magenta", "cyan"],
    theme: "#11103a",
    look: {
      rail: "#4fd6ff",
      railHi: "#c4f3ff",
      cap: "#9a6bff",
      carriage: "#2b2760",
      carriageHi: "#4fd6ff",
      cable: "#9a6bff",
      post: "#3d388c",
      stripe: "#4fd6ff",
      floor: "#2f2a78",
      floorLine: "#4fd6ff",
      sign: "#4fd6ff",
      signInk: "#14122e",
      head: { b: "#4a44a0", h: "#4fd6ff", d: "#1f1c52", t: "#ff4fa8" },
      prong: "#b9b6ff",
      rim: "#8f8cf0",
    },
  },
  {
    id: "racing",
    stage: "4",
    name: "Neon Circuit",
    tag: "Sunset race",
    inks: ["red", "orange", "gold", "orange", "red", "cyan", "steel", "cyan", "steel", "cyan"],
    theme: "#14143c",
    look: {
      rail: "#ff7a2f",
      railHi: "#ffc08a",
      cap: "#ee2f4a",
      carriage: "#34323f",
      carriageHi: "#3fa9ff",
      cable: "#3fa9ff",
      post: "#34323f",
      stripe: "#ffffff",
      floor: "#34323f",
      floorLine: "#ff7a2f",
      sign: "#ffd23f",
      signInk: "#14122e",
      head: { b: "#ee2f4a", h: "#ff8a96", d: "#a81a30", t: "#ffffff" },
      prong: "#c9cce0",
      rim: "#8a86a8",
    },
  },
  {
    id: "dungeon",
    stage: "5",
    name: "Dungeon Quest",
    tag: "Lost treasure",
    inks: ["gold", "emerald", "gold", "emerald", "gold", "emerald", "gold", "emerald", "gold", "emerald"],
    theme: "#1a1626",
    look: {
      rail: "#8a8598",
      railHi: "#c0bbd0",
      cap: "#d9a93a",
      carriage: "#d9a93a",
      carriageHi: "#ffe9a0",
      cable: "#7a7588",
      post: "#6a6578",
      stripe: "#35c28c",
      floor: "#57516a",
      floorLine: "#7d7692",
      sign: "#d9a93a",
      signInk: "#14122e",
      head: { b: "#d9a93a", h: "#ffe9a0", d: "#a8781e", t: "#35c28c" },
      prong: "#b0acc0",
      rim: "#9a94b4",
    },
  },
];

const BY_ID = new Map(WORLDS.map((w) => [w.id, w]));
export const worldById = (id: string | null | undefined) => BY_ID.get(id as WorldId) ?? WORLDS[0];
export const isWorldId = (id: unknown): id is WorldId => typeof id === "string" && BY_ID.has(id as WorldId);

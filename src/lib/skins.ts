// Every tape plays in its own casket. Two families:
//   · the pastel arcade cabinet from the Superboard Figma file
//   · the Xuanfang casket from Wuthering Waves 3.5 — red lacquer pillars,
//     jade glass, a brass claw and a tiled roof
// plus colourways of the arcade cabinet for the other channels.

export interface Skin {
  /** Printed above the marquee. */
  label: string;
  body: string;
  bodyHi: string;
  bodyLo: string;
  bodyInk: string;
  frame: string;
  wall: string;
  back: string;
  seam: string;
  backLine: string;
  rail: string;
  railHi: string;
  cap: string;
  carriage: string;
  carriageHi: string;
  cable: string;
  claw: { b: string; h: string; t: string; d: string };
  post: string;
  stripe: string;
  deck: string;
  deckLo: string;
  base: string;
  baseLo: string;
  baseInk: string;
  pick: string;
  pickLo: string;
  keyLo: string;
  marquee: string[];
  /** A tiled roof over the cabinet, for the Xuanfang casket. */
  roof?: { tile: string; tileLo: string; ridge: string; beam: string };
}

export const SKINS: Record<string, Skin> = {
  play: {
    label: "CASKET 01 · ARCADE",
    body: "#f7f1b5",
    bodyHi: "#fffbd6",
    bodyLo: "#e2d98c",
    bodyInk: "#5b5330",
    frame: "#8f8f8f",
    wall: "#e1dfd8",
    back: "#f8f8f8",
    seam: "#ffffff",
    backLine: "#8a8880",
    rail: "#9dbbe8",
    railHi: "#c9dcf7",
    cap: "#7f9bcf",
    carriage: "#afc8f0",
    carriageHi: "#e6efff",
    cable: "#f2d9a0",
    claw: { b: "#afc8f0", h: "#e6efff", t: "#f2d9a0", d: "#8ea9d8" },
    post: "#c9c7bf",
    stripe: "#ffcf3a",
    deck: "#fdfdfd",
    deckLo: "#c9c9cf",
    base: "#fdf6b0",
    baseLo: "#e2d98c",
    baseInk: "#3d3a22",
    pick: "#1727b8",
    pickLo: "#0d1a82",
    keyLo: "#2a4be0",
    marquee: ["#ff5d8f", "#ffb52e", "#34c98a", "#4f7cff", "#a66bff"],
  },
  luck: {
    label: "CASKET 02 · XUANFANG",
    body: "#8e2f25",
    bodyHi: "#b5483a",
    bodyLo: "#5f1c17",
    bodyInk: "#ffd98a",
    frame: "#3a1d14",
    wall: "#7a4a2a",
    back: "#bfe9df",
    seam: "#e9c46a",
    backLine: "#3f8f84",
    rail: "#d8a93b",
    railHi: "#f4d67a",
    cap: "#9a6f1e",
    carriage: "#e3b84a",
    carriageHi: "#fbe7a1",
    cable: "#5a3a1a",
    claw: { b: "#e3b84a", h: "#fbe7a1", t: "#8e2f25", d: "#b0852a" },
    post: "#5f1c17",
    stripe: "#e9c46a",
    deck: "#5a3320",
    deckLo: "#2e170e",
    base: "#6b3a22",
    baseLo: "#4a2413",
    baseInk: "#ffe6b0",
    pick: "#1f8f7f",
    pickLo: "#12594f",
    keyLo: "#b0852a",
    marquee: ["#ffd98a", "#7fe3cf", "#ffb04a"],
    roof: { tile: "#34404f", tileLo: "#1d2530", ridge: "#e9c46a", beam: "#5f1c17" },
  },
  grit: {
    label: "CASKET 03 · MINT",
    body: "#bff0cf",
    bodyHi: "#e4fbe9",
    bodyLo: "#8fd3a6",
    bodyInk: "#1f5a3a",
    frame: "#6f8f7c",
    wall: "#d9ebe0",
    back: "#f5fbf7",
    seam: "#ffffff",
    backLine: "#7fa590",
    rail: "#ffb5c8",
    railHi: "#ffd9e3",
    cap: "#e98aa5",
    carriage: "#ffc7d5",
    carriageHi: "#ffe9ef",
    cable: "#f2d9a0",
    claw: { b: "#ffc7d5", h: "#fff0f4", t: "#f2d9a0", d: "#e98aa5" },
    post: "#b9cfc2",
    stripe: "#ff5d8f",
    deck: "#fdfdfd",
    deckLo: "#c9d6cd",
    base: "#d6f7df",
    baseLo: "#9fdcb3",
    baseInk: "#1f5a3a",
    pick: "#12803f",
    pickLo: "#0a5a2b",
    keyLo: "#34c98a",
    marquee: ["#12803f", "#ff5d8f", "#34c98a", "#e0457a"],
  },
  make: {
    label: "CASKET 04 · WORKSHOP",
    body: "#e9b877",
    bodyHi: "#f7d7a6",
    bodyLo: "#c08a4a",
    bodyInk: "#4a2c0a",
    frame: "#6b4a2a",
    wall: "#d7c2a3",
    back: "#f6ecdb",
    seam: "#fff7e6",
    backLine: "#9a7a55",
    rail: "#8d99a8",
    railHi: "#c5ced8",
    cap: "#5f6a78",
    carriage: "#aab4c0",
    carriageHi: "#dfe5ec",
    cable: "#3a3a40",
    claw: { b: "#aab4c0", h: "#eef2f6", t: "#ff8a2a", d: "#7c8795" },
    post: "#9a7a55",
    stripe: "#ff8a2a",
    deck: "#f3efe6",
    deckLo: "#c9bfae",
    base: "#ffcf8a",
    baseLo: "#d99a4a",
    baseInk: "#4a2c0a",
    pick: "#d4551a",
    pickLo: "#8f380c",
    keyLo: "#ff8a2a",
    marquee: ["#d4551a", "#4a2c0a", "#ff8a2a", "#8f380c"],
  },
  signal: {
    label: "CASKET 05 · NIGHT SHIFT",
    body: "#2a2550",
    bodyHi: "#413a7a",
    bodyLo: "#17143a",
    bodyInk: "#b9b4ff",
    frame: "#0e0c24",
    wall: "#2f2a5e",
    back: "#171437",
    seam: "#5a4fd0",
    backLine: "#5a4fd0",
    rail: "#4fd6ff",
    railHi: "#b5f0ff",
    cap: "#2a9fc7",
    carriage: "#7ae3ff",
    carriageHi: "#dff8ff",
    cable: "#ff5d8f",
    claw: { b: "#7ae3ff", h: "#e6fbff", t: "#ff5d8f", d: "#2a9fc7" },
    post: "#413a7a",
    stripe: "#ff5d8f",
    deck: "#2f2a5e",
    deckLo: "#100e28",
    base: "#2a2550",
    baseLo: "#17143a",
    baseInk: "#cfcaff",
    pick: "#ff2f86",
    pickLo: "#a3134f",
    keyLo: "#4fd6ff",
    marquee: ["#4fd6ff", "#ff5d8f", "#b98cff", "#9ef5c0"],
  },
};

export const skinOf = (tapeId: string): Skin => SKINS[tapeId] ?? SKINS.play;

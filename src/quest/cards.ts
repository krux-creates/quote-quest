import { type Mood, tiger } from "./art";
import { type BallDef, RARITY_LABEL } from "./balls";
import { type QuestQuote, categoryLabel } from "./quotes";
import { type World, type WorldId } from "./worlds";

// The quote card, five ways. Each world shows the quote in the text box its
// kind of game would have used: a storybook page, an 8-bit message block, a
// ship's transmission, a results board, an RPG dialogue window.
// Every card has the same parts (a title bar, a framed panel with the quote, a
// name plate for whoever said it, a footer naming the ball) and one description
// of their colours. That description drives the card on screen, as CSS
// variables, and the picture you can download, drawn on a canvas further down.

export interface CardStyle {
  name: string;
  /** What the title bar says. */
  title: string;
  /** The notched outer border, and the card behind the panel. */
  line: string;
  fill: string[];
  bar: string;
  barInk: string;
  barLo: string;
  led: string;
  /** The framed panel the quote sits in. */
  panel: string;
  panelLine: string;
  ink: string;
  /** A hard one-pixel shadow under the quote, where the box wants one. */
  shadow: string | null;
  /** Footer text. */
  dim: string;
  /** Category tag. */
  accent: string;
  accentInk: string;
  /** Name plate. */
  plate: string;
  plateInk: string;
  plateLo: string;
  corner: string;
  /** The sky behind the card in the downloaded picture. */
  sky: string[];
}

export const CARD_STYLES: Record<WorldId, CardStyle> = {
  dream: {
    name: "Storybook",
    title: "STORYBOOK",
    line: "#34305e",
    fill: ["#fff3dc"],
    bar: "#cf2f74",
    barInk: "#ffffff",
    barLo: "#a8205c",
    led: "#fff3ae",
    panel: "#fffdf8",
    panelLine: "#f9aec8",
    ink: "#34305e",
    shadow: null,
    dim: "#6f5a86",
    accent: "#9be3b4",
    accentInk: "#1f5a3c",
    plate: "#ffe07a",
    plateInk: "#34305e",
    plateLo: "#f1b53c",
    corner: "#f4679d",
    sky: ["#a99cf0", "#dcaeee", "#ffc4d6", "#ffeacc"],
  },
  mushroom: {
    name: "Message Block",
    title: "MESSAGE BLOCK",
    line: "#ffffff",
    fill: ["#16142c"],
    bar: "#c9643a",
    barInk: "#ffffff",
    barLo: "#7a3516",
    led: "#ffc93a",
    panel: "#16142c",
    panelLine: "#ffffff",
    ink: "#ffffff",
    shadow: null,
    dim: "#c9c4e6",
    accent: "#58c74f",
    accentInk: "#0f3a12",
    plate: "#ffc93a",
    plateInk: "#4a2408",
    plateLo: "#d9952a",
    corner: "#ffc93a",
    sky: ["#3f9cf0", "#7cc2fa", "#cdeaff"],
  },
  cosmic: {
    name: "Transmission",
    title: "INCOMING TRANSMISSION",
    line: "#4fd6ff",
    fill: ["#0c0b28"],
    bar: "#17154c",
    barInk: "#4fd6ff",
    barLo: "#4fd6ff",
    led: "#ff4fa8",
    panel: "#11103a",
    panelLine: "#9a6bff",
    ink: "#d6f6ff",
    shadow: "#1b3a8a",
    dim: "#8f8cf0",
    accent: "#ff4fa8",
    accentInk: "#0c0b28",
    plate: "#4fd6ff",
    plateInk: "#0c0b28",
    plateLo: "#2a9fd0",
    corner: "#4fd6ff",
    sky: ["#090920", "#18134e", "#3c1f86"],
  },
  racing: {
    name: "Results Board",
    title: "FINAL LAP",
    line: "#ff7a2f",
    fill: ["#1c1b26"],
    bar: "#d92440",
    barInk: "#ffffff",
    barLo: "#a81a30",
    led: "#ffd23f",
    panel: "#26252f",
    panelLine: "#4c4a5c",
    ink: "#ffffff",
    shadow: null,
    dim: "#b0acc8",
    accent: "#3fa9ff",
    accentInk: "#0e0d18",
    plate: "#ffd23f",
    plateInk: "#0e0d18",
    plateLo: "#d9952a",
    corner: "#ff7a2f",
    sky: ["#0a0a1e", "#451a66", "#b82c56", "#ff7a2f"],
  },
  dungeon: {
    name: "Parchment",
    title: "QUEST LOG",
    line: "#3a2416",
    fill: ["#f4e2b4", "#eed8a2", "#e8ce92", "#e0c284"],
    bar: "transparent",
    barInk: "#7a5a36",
    barLo: "#7a5a36",
    led: "#a8281e",
    panel: "transparent",
    panelLine: "#8a5a2f",
    ink: "#3a2416",
    shadow: null,
    dim: "#7a5a36",
    accent: "#a8281e",
    accentInk: "#fff3d6",
    plate: "#3a2416",
    plateInk: "#fff3d6",
    plateLo: "#d9a93a",
    corner: "#8a5a2f",
    sky: ["#151220", "#241f35", "#2e2843"],
  },
};

const bands = (cols: string[]) => (cols.length === 1 ? cols[0] : `linear-gradient(${cols.map((c, i) => `${c} ${(i * 100) / cols.length}% ${((i + 1) * 100) / cols.length}%`).join(", ")})`);

/** A card style as the CSS variables quest.css reads. */
export function cardVars(s: CardStyle): React.CSSProperties {
  return {
    "--c-line": s.line,
    "--c-fill": bands(s.fill),
    "--c-bar": s.bar,
    "--c-bar-ink": s.barInk,
    "--c-bar-lo": s.barLo,
    "--c-led": s.led,
    "--c-panel": s.panel,
    "--c-panel-line": s.panelLine,
    "--c-ink": s.ink,
    "--c-shadow": s.shadow ? `3px 3px 0 ${s.shadow}` : "none",
    "--c-dim": s.dim,
    "--c-accent": s.accent,
    "--c-accent-ink": s.accentInk,
    "--c-plate": s.plate,
    "--c-plate-ink": s.plateInk,
    "--c-plate-lo": s.plateLo,
    "--c-corner": s.corner,
  } as React.CSSProperties;
}

/** The size step the quote is set in: short quotes get big type. */
export const quoteSize = (text: string) => (text.length > 96 ? "s" : text.length > 52 ? "m" : "l");

// ── The downloadable picture ───────────────────────────────────────────
/** The prize rays, per rarity. quest.css has the same three lists as --rays; keep them in step. */
const RAYS = {
  common: ["#fff3ae", "#ffffff", "#b9f3f4", "#c8b6ff", "#ffc2e0"],
  uncommon: ["#fff3ae", "#ffffff", "#b9f3f4", "#c8b6ff", "#ffc2e0"],
  rare: ["#d9c2ff", "#ffffff", "#ff9fd6", "#8f6cf0", "#9fe8f4"],
  legendary: ["#ffd23f", "#fff8d0", "#ff9a3a", "#fff8d0", "#ffe27a"],
} as const;

function family(variable: string) {
  const v = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return v ? `${v}, monospace` : "monospace";
}

function wrap(g: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** A rectangle with one notch cut from each corner: the 8-bit border. */
function notched(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, n: number, c: string) {
  g.fillStyle = c;
  g.fillRect(x + n, y, w - n * 2, h);
  g.fillRect(x, y + n, w, h - n * 2);
}

/** The face the cub pulls in the picture, and whether it waves: one pose per world. */
const POSES: Record<WorldId, { mood: Mood; wave: boolean }> = {
  dream: { mood: "love", wave: false },
  mushroom: { mood: "happy", wave: true },
  cosmic: { mood: "stars", wave: false },
  racing: { mood: "cool", wave: false },
  dungeon: { mood: "wink", wave: true },
};

/** Letter and word spacing on a canvas, where the browser supports it (it only affects line breaks slightly where it does not). */
function spacing(g: CanvasRenderingContext2D, letter: number, word = 0) {
  const ctx = g as CanvasRenderingContext2D & { letterSpacing?: string; wordSpacing?: string };
  ctx.letterSpacing = `${letter}px`;
  ctx.wordSpacing = `${word}px`;
}

/**
 * Draw a quote as a 1200 x 1000 picture: the card exactly as it appears on screen, in the style
 * of a world, with the prize rays behind it and the cub peeking over the top.
 *
 * Every measurement below is the on-screen one from quest.css (the card is 620px wide there)
 * passed through `u`, which scales it up to the picture. Change the card in one place and
 * the other has to follow.
 */
export async function renderCard(quote: QuestQuote, ball: BallDef, world: World, number = 1): Promise<HTMLCanvasElement | null> {
  const s = CARD_STYLES[world.id];
  const id = world.id;
  /** The two cards on pale paper take darker rarity colours. */
  const light = id === "dream" || id === "dungeon";
  const W = 1200;
  const H = 1000;
  /** How much of the picture above the card belongs to the cub. */
  const HEAD = 236;
  const cw = 1000;
  const k = cw / 620;
  const u = (n: number) => Math.round(n * k);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  if (!g) return null;
  const arcade = family("--font-press-start");
  await Promise.all([document.fonts.load(`32px ${arcade}`), document.fonts.load(`16px ${arcade}`)]).catch(() => undefined);
  const box = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // The world's sky in flat bands, dimmed with a checker so the card owns the picture.
  s.sky.forEach((c, i) => box(0, Math.floor((i * H) / s.sky.length), W, Math.ceil(H / s.sky.length), c));
  box(0, 0, W, H, "rgba(20, 18, 46, 0.42)");
  g.fillStyle = "rgba(20, 18, 46, 0.3)";
  for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 8 : 0; x < W; x += 16) g.fillRect(x, y, 8, 8);

  // Prize rays: a fan of wedges, faded out toward the edges.
  const rays = document.createElement("canvas");
  rays.width = W;
  rays.height = H;
  const r = rays.getContext("2d");
  if (r) {
    const cols = RAYS[ball.rarity];
    const [rx, ry] = [W / 2, H / 2 + 20];
    // The same fan as on screen: five colours blending into each other across 45 degrees, eight times round.
    const conic = (r as CanvasRenderingContext2D & { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient }).createConicGradient?.(-Math.PI / 2, rx, ry);
    if (conic) {
      for (let k = 0; k < 8; k++) cols.forEach((c, i) => conic.addColorStop((k * 45 + i * 9) / 360, c));
      conic.addColorStop(1, cols[0]);
      r.fillStyle = conic;
      r.fillRect(0, 0, W, H);
    } else {
      // Older browsers: the same colours as flat wedges.
      const slice = Math.PI / 20;
      for (let i = 0; i < 40; i++) {
        r.fillStyle = cols[i % cols.length];
        r.beginPath();
        r.moveTo(rx, ry);
        r.arc(rx, ry, 900, i * slice - Math.PI / 2, (i + 1) * slice - Math.PI / 2 + 0.004);
        r.fill();
      }
    }
    const fade = r.createRadialGradient(rx, ry, 260, rx, ry, 700);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    r.globalCompositeOperation = "destination-in";
    r.fillStyle = fade;
    r.fillRect(0, 0, W, H);
    g.globalAlpha = ball.rarity === "legendary" ? 0.8 : 0.62;
    g.drawImage(rays, 0, 0);
    g.globalAlpha = 1;
  }

  // Set the quote first, so the card can be cut to fit it. Same sizes, leading and measure as on screen.
  const size = quoteSize(quote.text);
  const fs = u({ l: 24, m: 20, s: 16 }[size]);
  const lh = Math.round(fs * { l: 1.75, m: 1.8, s: 1.9 }[size]);
  g.font = `${fs}px ${arcade}`;
  spacing(g, 0, -0.2 * fs);
  const lines = wrap(g, quote.text, u(528));
  const block = Math.max(lines.length * lh, u(150));

  const barH = u(id === "racing" ? 52 : id === "dungeon" ? 34 : 40);
  const gapTop = id === "dungeon" ? 0 : u(16);
  const tagH = u(30);
  const plateH = u(34);
  const panelH = u(26) + tagH + u(20) + block + u(18) + plateH + u(4) + u(26);
  const footH = u(56);
  const ch = barH + gapTop + panelH + footH;
  const cx = (W - cw) / 2;
  const cy = HEAD + Math.max(0, Math.round((H - HEAD - 64 - ch) / 2));
  const n = u(6);

  // Shadow, notched border, banded fill.
  notched(g, cx - n, cy - n + u(18), cw + n * 2, ch + n * 2, n, "rgba(20, 18, 46, 0.4)");
  notched(g, cx - n, cy - n, cw + n * 2, ch + n * 2, n, s.line);
  s.fill.forEach((c, i) => box(cx, cy + Math.floor((i * ch) / s.fill.length), cw, Math.ceil(ch / s.fill.length), c));
  g.save();
  g.beginPath();
  g.rect(cx, cy, cw, ch);
  g.clip();
  if (id === "dream") {
    // Dotted paper.
    g.fillStyle = "rgba(249, 196, 216, 0.7)";
    for (let y = cy + u(6); y < cy + ch; y += u(16)) for (let x = cx + u(6); x < cx + cw; x += u(16)) g.fillRect(x, y, u(4), u(4));
  } else if (id === "dungeon") {
    // Foxing: a scatter of darker specks, and a darker edge all round.
    g.fillStyle = "rgba(138, 90, 47, 0.28)";
    for (let y = cy + u(5); y < cy + ch; y += u(12)) for (let x = cx + ((y / u(12)) % 2 ? u(3) : u(9)); x < cx + cw; x += u(12)) g.fillRect(x, y, u(2), u(2));
    g.lineWidth = u(8);
    g.strokeStyle = "rgba(138, 90, 47, 0.3)";
    g.strokeRect(cx + u(4), cy + u(4), cw - u(8), ch - u(8));
  } else if (id === "cosmic") {
    // A faint grid behind everything.
    g.fillStyle = "rgba(79, 214, 255, 0.09)";
    for (let y = cy; y < cy + ch; y += u(20)) g.fillRect(cx, y, cw, u(2));
    for (let x = cx; x < cx + cw; x += u(20)) g.fillRect(x, cy, u(2), ch);
  }

  // Title bar.
  if (id === "mushroom") {
    // Bricks: two courses to a tile, joints staggered.
    const [bw, bh] = [u(32), u(16)];
    for (let y = 0; y < barH; y += bh) {
      for (let x = 0; x < cw; x += bw) {
        box(cx + x, cy + y, bw, bh, "#c9643a");
        box(cx + x, cy + y, bw, u(2), "#7a3516");
        box(cx + x, cy + y + bh / 2, bw, u(2), "#7a3516");
        box(cx + x, cy + y + u(2), u(2), bh / 2 - u(2), "#7a3516");
        box(cx + x + bw / 2, cy + y + bh / 2 + u(2), u(2), bh / 2 - u(2), "#7a3516");
        box(cx + x + u(2), cy + y + u(2), bw - u(2), u(2), "#e88a5a");
        box(cx + x, cy + y + bh / 2 + u(2), bw / 2, u(2), "#e88a5a");
        box(cx + x + bw / 2 + u(2), cy + y + bh / 2 + u(2), bw / 2 - u(2), u(2), "#e88a5a");
      }
    }
    box(cx, cy + barH - u(4), cw, u(4), "#16142c");
  } else if (id === "racing") {
    box(cx, cy, cw, barH, s.bar);
    // A checkered strip along the bottom of the bar.
    const q = u(6);
    for (let j = 0; j < 2; j++) for (let i = 0; i * q < cw; i++) box(cx + i * q, cy + barH - q * 2 + j * q, q, q, (i + j) % 2 ? "#17161f" : "#f4f1ff");
  } else if (id !== "dungeon") {
    box(cx, cy, cw, barH, s.bar);
    box(cx, cy + barH - u(id === "cosmic" ? 2 : 4), cw, u(id === "cosmic" ? 2 : 4), s.barLo);
  }
  const barMid = cy + (id === "racing" ? (barH - u(12)) / 2 : (barH - u(4)) / 2) + u(1);
  g.textBaseline = "middle";
  g.font = `${u(12)}px ${arcade}`;
  spacing(g, u(12) * 0.06);
  let tx = cx + u(16);
  if (id !== "dungeon") {
    box(tx, barMid - u(4), u(8), u(8), s.led);
    tx += u(8) + u(10);
  }
  const ink = id === "dungeon" ? s.dim : s.barInk;
  const label = (text: string, x: number, align: CanvasTextAlign) => {
    g.textAlign = align;
    if (id === "mushroom") {
      // The same hard dark edge the title has on screen.
      g.lineJoin = "miter";
      g.lineWidth = u(4);
      g.strokeStyle = "#4a1f0a";
      g.strokeText(text, x, barMid);
    }
    g.fillStyle = ink;
    g.fillText(text, x, barMid);
  };
  label(s.title, tx, "left");
  const no = `No.${String(number).padStart(3, "0")}`;
  label(no, cx + cw - u(16), "right");
  if (id === "cosmic") {
    // Signal bars, left of the number.
    const right = cx + cw - u(16) - g.measureText(no).width - u(12);
    [3, 6, 9, 12].forEach((h, i) => box(right - u(22) + i * u(6), barMid + u(6) - u(h), u(4), u(h), s.barInk));
  }

  // The panel the quote sits in.
  const px = cx + u(16);
  const py = cy + barH + gapTop;
  const pw = cw - u(32);
  if (s.panel !== "transparent") box(px, py, pw, panelH, s.panel);
  if (id === "dream") {
    // A dashed frame.
    const [t, on, step] = [u(4), u(12), u(20)];
    for (let x = 0; x < pw; x += step) {
      box(px + x, py, Math.min(on, pw - x), t, s.panelLine);
      box(px + x, py + panelH - t, Math.min(on, pw - x), t, s.panelLine);
    }
    for (let y = 0; y < panelH; y += step) {
      box(px, py + y, t, Math.min(on, panelH - y), s.panelLine);
      box(px + pw - t, py + y, t, Math.min(on, panelH - y), s.panelLine);
    }
  } else if (id === "racing") {
    // Racing stripes down each side.
    box(px, py, u(6), panelH, "#ee2f4a");
    box(px + u(6), py, u(6), panelH, "#ff7a2f");
    box(px + pw - u(6), py, u(6), panelH, "#ee2f4a");
    box(px + pw - u(12), py, u(6), panelH, "#ff7a2f");
  } else if (id === "dungeon") {
    // A ruled double line in brown ink.
    g.lineWidth = u(2);
    g.strokeStyle = s.panelLine;
    g.strokeRect(px + u(1), py + u(1), pw - u(2), panelH - u(2));
    g.strokeRect(px + u(7), py + u(7), pw - u(14), panelH - u(14));
  } else {
    g.lineWidth = u(4);
    g.strokeStyle = s.panelLine;
    g.strokeRect(px + u(2), py + u(2), pw - u(4), panelH - u(4));
  }
  // Corners: hearts on the storybook, nothing on the results board, brackets everywhere else.
  const corners: [number, number, number, number][] = [
    [px + u(12), py + u(12), 1, 1],
    [px + pw - u(12), py + u(12), -1, 1],
    [px + u(12), py + panelH - u(12), 1, -1],
    [px + pw - u(12), py + panelH - u(12), -1, -1],
  ];
  if (id === "dream") {
    const c = u(4);
    const HEART = [".#.#.", "#####", "#####", ".###.", "..#.."];
    for (const [ax, ay, dx, dy] of corners) {
      const [hx, hy] = [dx > 0 ? ax : ax - c * 5, dy > 0 ? ay : ay - c * 5];
      HEART.forEach((row, j) => [...row].forEach((ch2, i) => ch2 === "#" && box(hx + i * c, hy + j * c, c, c, s.corner)));
    }
  } else if (id !== "racing") {
    const [len, t] = [u(16), u(4)];
    for (const [ax, ay, dx, dy] of corners) {
      box(dx > 0 ? ax : ax - len, dy > 0 ? ay : ay - t, len, t, s.corner);
      box(dx > 0 ? ax : ax - t, dy > 0 ? ay : ay - len, t, len, s.corner);
    }
  }

  // Category tag.
  g.textAlign = "center";
  let y = py + u(26);
  const cat = categoryLabel(quote.cat).toUpperCase();
  g.font = `${u(12)}px ${arcade}`;
  spacing(g, u(12) * 0.06);
  const lw = g.measureText(cat).width + u(24);
  notched(g, W / 2 - lw / 2, y, lw, tagH, u(4), s.accent);
  g.fillStyle = s.accentInk;
  g.fillText(cat, W / 2, y + tagH / 2 + u(1));
  y += tagH + u(20);

  // The quote.
  g.font = `${fs}px ${arcade}`;
  spacing(g, 0, -0.2 * fs);
  lines.forEach((l, i) => {
    const ly = y + (block - lines.length * lh) / 2 + lh / 2 + i * lh;
    if (s.shadow) {
      g.fillStyle = s.shadow;
      g.fillText(l, W / 2 + u(3), ly + u(3));
    }
    g.fillStyle = s.ink;
    g.fillText(l, W / 2, ly);
  });
  y += block + u(18);

  // Name plate.
  g.font = `${u(12)}px ${arcade}`;
  spacing(g, u(12) * 0.04);
  const nw = g.measureText(quote.author).width + u(32);
  const nx = W / 2 - nw / 2;
  if (id === "dungeon") {
    // A gold ring round the plate instead of a lip.
    box(nx - u(3), y - u(3), nw + u(6), plateH + u(6), "#d9a93a");
  } else {
    box(nx, y + u(4), nw, plateH, s.plateLo);
  }
  box(nx, y, nw, plateH, s.plate);
  if (id === "mushroom") {
    // A coin block: lit on the top and left, shaded on the bottom and right.
    box(nx, y, nw, u(4), "#fff0a8");
    box(nx, y, u(4), plateH, "#fff0a8");
    box(nx, y + plateH - u(4), nw, u(4), s.plateLo);
    box(nx + nw - u(4), y, u(4), plateH, s.plateLo);
  }
  g.fillStyle = s.plateInk;
  g.fillText(quote.author, W / 2, y + plateH / 2 + u(1));

  // Footer: the ball it came out of, and how rare that was.
  const fy = cy + ch - footH / 2;
  const bp = 3;
  const bs = ball.map.length * bp;
  g.font = `${u(8)}px ${arcade}`;
  spacing(g, u(8) * 0.08);
  g.textAlign = "left";
  const name = `${ball.name.toUpperCase()} BALL`;
  const rarity = ` · ${RARITY_LABEL[ball.rarity].toUpperCase()}`;
  const total = bs + u(12) + g.measureText(name + rarity).width;
  const left = W / 2 - total / 2;
  ball.map.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = ball.palette[row[i]];
      if (c) box(left + i * bp, fy - bs / 2 + j * bp, bp, bp, c);
    }
  });
  g.fillStyle = s.dim;
  g.fillText(name, left + bs + u(12), fy + u(1));
  g.fillStyle = ball.rarity === "legendary" ? (light ? "#8f5d08" : "#ffc93a") : ball.rarity === "rare" ? (light ? "#7045c0" : "#b99cff") : s.dim;
  g.fillText(rarity, left + bs + u(12) + g.measureText(name).width, fy + u(1));

  if (id === "cosmic") {
    // Scanlines over the whole screen.
    g.fillStyle = "rgba(0, 0, 0, 0.22)";
    for (let sy = cy + u(3); sy < cy + ch; sy += u(4)) g.fillRect(cx, sy, cw, Math.max(1, u(1)));
  }
  g.restore();
  spacing(g, 0);

  // The cub, hooked over the top edge of the card, pulling this world's face.
  // A legendary ball gets star eyes wherever it turns up.
  const pose = POSES[world.id];
  const cub = tiger(ball.rarity === "legendary" ? "stars" : pose.mood, pose.wave);
  const c6 = 6;
  const mx = Math.round(W / 2 - (cub.w * c6) / 2);
  const my = cy - n - (cub.h - 9) * c6;
  for (const run of cub.runs) box(mx + run.x * c6, my + run.y * c6, run.w * c6, c6, run.c);
  // A few sparkles around it.
  for (const [sx, sy, q] of [[mx - 70, my + 60, 6], [mx + cub.w * c6 + 46, my + 30, 8], [mx - 30, my + 150, 4], [mx + cub.w * c6 + 90, my + 130, 5]]) {
    box(sx - q, sy - q * 3, q * 2, q * 6, "#ffffff");
    box(sx - q * 3, sy - q, q * 6, q * 2, "#ffffff");
  }

  // Signature.
  g.textAlign = "center";
  g.font = `16px ${arcade}`;
  g.lineWidth = 6;
  g.strokeStyle = "#14122e";
  g.strokeText(`QUOTE QUEST  ·  ${world.name.toUpperCase()}`, W / 2, H - 34);
  g.fillStyle = "#ffffff";
  g.fillText(`QUOTE QUEST  ·  ${world.name.toUpperCase()}`, W / 2, H - 34);
  return cv;
}

/** Save the picture as a PNG. Returns false if the browser would not make one. */
export async function downloadCard(quote: QuestQuote, ball: BallDef, world: World, number = 1) {
  const cv = await renderCard(quote, ball, world, number);
  if (!cv) return false;
  const blob = await new Promise<Blob | null>((resolve) => cv.toBlob((b) => resolve(b), "image/png"));
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quote-quest-${quote.author.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${quote.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

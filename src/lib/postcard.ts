import { type Quote, RARITY, type Tape } from "@/lib/quotes";

const INK = "#1b1b1f";

function fontFamily(variable: string, fallback: string) {
  const v = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function wrap(g: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw a quote as a 1080×1080 pixel-bordered postcard and return it as a PNG blob. */
export async function renderPostcard(quote: Quote, tape: Tape): Promise<Blob | null> {
  const size = 1080;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const g = cv.getContext("2d");
  if (!g) return null;

  const crt = fontFamily("--font-vt323", "monospace");
  const display = fontFamily("--font-press-start", "monospace");
  await Promise.all([document.fonts.load(`96px ${crt}`), document.fonts.load(`28px ${display}`)]).catch(() => undefined);

  const u = 12; // one fat pixel
  g.fillStyle = tape.color;
  g.fillRect(0, 0, size, size);

  // Notched pixel frame around a cream card.
  g.fillStyle = INK;
  g.fillRect(u * 5, u * 4, size - u * 10, size - u * 8);
  g.fillRect(u * 4, u * 5, size - u * 8, size - u * 10);
  g.fillStyle = "#fffdf2";
  g.fillRect(u * 6, u * 5, size - u * 12, size - u * 10);
  g.fillRect(u * 5, u * 6, size - u * 10, size - u * 12);

  // Header strip.
  g.fillStyle = INK;
  g.fillRect(u * 5, u * 6, size - u * 10, u * 7);
  g.fillStyle = "#ffffff";
  g.font = `28px ${display}`;
  g.textBaseline = "middle";
  g.fillText(`CH ${String(tape.channel).padStart(2, "0")} · ${tape.title}`, u * 8, u * 9.6);
  g.textAlign = "right";
  g.fillStyle = RARITY[quote.rarity].top;
  g.fillText("★".repeat(quote.rarity), size - u * 8, u * 9.6);
  g.textAlign = "left";

  // Quote body, sized down until it fits the card.
  const maxW = size - u * 20;
  const maxH = 520;
  let fs = 124;
  let lines: string[] = [];
  for (; fs >= 56; fs -= 6) {
    g.font = `${fs}px ${crt}`;
    lines = wrap(g, `“${quote.text}”`, maxW);
    if (lines.length * fs * 0.92 <= maxH) break;
  }
  g.fillStyle = INK;
  g.textBaseline = "top";
  const top = u * 17 + (maxH - lines.length * fs * 0.92) / 2;
  lines.forEach((l, i) => g.fillText(l, u * 10, top + i * fs * 0.92));

  // Author block.
  g.fillStyle = tape.color;
  g.fillRect(u * 10, size - u * 23, u * 12, u);
  g.fillStyle = INK;
  g.font = `30px ${display}`;
  g.fillText(quote.author.toUpperCase(), u * 10, size - u * 20.5);
  g.fillStyle = "#5c5a4e";
  g.font = `44px ${crt}`;
  g.fillText(`${quote.source} · ${quote.year}`, u * 10, size - u * 16.5);

  g.fillStyle = "#8b8870";
  g.font = `18px ${display}`;
  g.fillText("QUOTE CASKET", u * 10, size - u * 10.5);

  return new Promise((resolve) => cv.toBlob((b) => resolve(b), "image/png"));
}

export async function savePostcard(quote: Quote, tape: Tape) {
  const blob = await renderPostcard(quote, tape);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quote-casket-${quote.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

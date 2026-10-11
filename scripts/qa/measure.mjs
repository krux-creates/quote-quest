// Things the checks measure in the page. Each is a plain function that runs inside the browser.

/** Every visible piece of text, with the size it is actually drawn at on screen. */
export function smallestText() {
  const seen = [];
  for (const el of document.querySelectorAll(".qq *, [role=dialog] *")) {
    if (el.closest("svg, .sr-only, [aria-hidden=true] canvas") || el.children.length || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || +cs.opacity < 0.4 || !box.width || box.bottom < 0 || box.top > innerHeight) continue;
    // The size on screen is the font size times every scale applied on the way up.
    let k = 1;
    for (let e = el; e; e = e.parentElement) {
      const t = getComputedStyle(e).transform;
      if (t && t !== "none") k *= new DOMMatrix(t).a;
    }
    seen.push([Math.round(parseFloat(cs.fontSize) * k * 10) / 10, el.textContent.trim().slice(0, 24)]);
  }
  seen.sort((a, b) => a[0] - b[0]);
  return seen;
}

/** The layout the game chose, and the cabinet as it actually came out. */
export function layoutInfo() {
  const root = document.querySelector(".qq");
  const cab = document.querySelector(".qq-cab");
  const canvas = document.querySelector(".qq-canvas");
  const fit = document.querySelector(".qq-fit").getBoundingClientRect();
  return {
    view: [innerWidth, innerHeight],
    family: root.dataset.layout,
    level: +root.dataset.level,
    scale: Math.round(new DOMMatrix(getComputedStyle(canvas).transform).a * 1000) / 1000,
    cabinet: cab.offsetHeight,
    canvas: [canvas.offsetWidth, canvas.offsetHeight],
    art: getComputedStyle(root).getPropertyValue("--art").trim(),
    box: [Math.round(fit.left), Math.round(fit.top), Math.round(fit.right), Math.round(fit.bottom)],
    scrolls: [document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight],
  };
}

/**
 * Any control the player is meant to reach that pokes outside the window or sits under
 * something else. Only the front layer counts: with a dialog open that is the dialog, and with
 * a quote on stage it is the quote's own buttons.
 */
export function hiddenControls() {
  const bad = [];
  const dialog = document.querySelector('[role="dialog"]');
  const staged = document.querySelector('.qq[data-stage="quote"] .qq-show');
  const front = dialog ?? staged ?? document.querySelector(".qq");
  for (const b of front.querySelectorAll("button:not([disabled])")) {
    const r = b.getBoundingClientRect();
    if (!r.width || getComputedStyle(b).visibility === "hidden" || b.closest("[inert]")) continue;
    const name = (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 28);
    if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) {
      // Inside a scrolling list, being out of sight is fine: it scrolls into view.
      if (!b.closest(".qq-picker-scroll, [data-slot='scroll-area']")) bad.push(`${name}: off screen`);
      continue;
    }
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top && !b.contains(top) && !top.contains(b)) bad.push(`${name}: covered by ${(top.className?.baseVal ?? top.className ?? top.tagName).toString().slice(0, 30)}`);
  }
  return bad;
}

/**
 * Every control must be an 8bitcn component wearing the kit's pixel frame. Returns the ones that
 * are not: a plain <button>, or a component whose frame is missing, the wrong thickness, or
 * drawn in no colour. Two things are frameless by design and pass: 8bitcn's ghost button, and
 * a tab, which is framed by its tab list.
 */
export function offKit() {
  const bad = [];
  const clear = (c) => !c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
  const bit = parseFloat(getComputedStyle(document.querySelector(".qq")).getPropertyValue("--bit"));
  const drawn = (edges) => edges.filter((e) => e.getBoundingClientRect().width > 0);
  for (const b of document.querySelectorAll(".qq button, [role=dialog] button")) {
    const r = b.getBoundingClientRect();
    if (!r.width || getComputedStyle(b).visibility === "hidden") continue;
    const name = (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 28);
    if (b.dataset.slot === "tabs-trigger") {
      const list = b.closest('[data-slot="tabs-list"]');
      const frame = list ? drawn([...list.children].filter((e) => e.getAttribute("aria-hidden") === "true")) : [];
      if (frame.length < 2) bad.push(`${name}: tab outside a framed tab list`);
      else if (frame.some((e) => clear(getComputedStyle(e).borderTopColor) && clear(getComputedStyle(e).borderLeftColor))) bad.push(`${name}: tab list frame has no colour`);
      continue;
    }
    // An 8bitcn button always carries its decorations slot, even when a dialog's close wrapper renames it.
    const frame = b.querySelector(':scope > [data-slot="button-decorations"]');
    if (!frame) { bad.push(`${name}: not an 8bitcn component`); continue; }
    if (b.dataset.variant === "ghost") continue;
    const edges = frame ? drawn([...frame.children]) : [];
    if (!edges.length) { bad.push(`${name}: no frame`); continue; }
    if (edges.every((e) => clear(getComputedStyle(e).backgroundColor))) bad.push(`${name}: frame has no colour`);
    const thick = Math.min(...edges.map((e) => Math.min(e.offsetWidth, e.offsetHeight)));
    if (thick !== bit) bad.push(`${name}: frame is ${thick}px, the kit is ${bit}px`);
  }
  return bad;
}

/**
 * Scenery props that the top edge of the window slices: partly above it, partly below.
 * Drifting things are skipped while they are off to one side.
 */
export function slicedProps() {
  const bad = [];
  for (const el of document.querySelectorAll(".sc-prop")) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.right < 0 || r.left > innerWidth) continue;
    // A thread or a falling drip is meant to come in from above.
    if (/sc-(thread|drip|spider|shoot|launch|rise)/.test(el.className)) continue;
    if (r.top < -1 && r.bottom > 1) bad.push(`${el.className.replace("sc-prop", "").trim() || "still"} at ${Math.round(r.left)},${Math.round(r.top)} (${Math.round(r.width)}x${Math.round(r.height)})`);
  }
  return bad;
}

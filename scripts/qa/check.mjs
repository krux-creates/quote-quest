// The end-to-end check. It drives a real (headless) Chrome against the running dev server:
//
//   0. the quotes backend is asked for every category, and the game is played with it cut off;
//   1. every screen, at every window size the layout has an arrangement for, is measured
//      (including phone screens as small as they get once the browser's toolbars are showing);
//   2. a round is played in real time with real key presses and clicks, twice (desktop, phone);
//   3. the frame rate is sampled in each world.
//
// Run it with `pnpm e2e` while `pnpm dev` is up. It plays in its own save slot and removes it
// afterwards, so it never touches a real save. It exits non-zero if anything fails.
// `pnpm e2e api`, `pnpm e2e screens`, `pnpm e2e play` or `pnpm e2e frames` runs one part alone.

import { launch, sleep } from "./chrome.mjs";
import { hiddenControls, layoutInfo, offKit, slicedProps, smallestText } from "./measure.mjs";

const SLOT = "e2e";
const WORLDS = ["dream", "mushroom", "cosmic", "racing", "dungeon"];
/** Windows as a browser reports them: the screen less the browser's own bars. */
const SIZES = [
  [1920, 970],
  [1362, 1044],
  [1440, 790],
  [1536, 730],
  [1366, 650],
  [1280, 610],
  [1024, 660],
  [800, 600],
  [803, 1044],
  [768, 1024],
  [390, 844],
  [360, 740],
  [320, 640],
  // Phones as their browsers really give them to a page, with the toolbars showing.
  [430, 740],
  [390, 664],
  [375, 553],
  [844, 390],
];
const CATEGORIES = ["motivation", "life", "creativity", "focus", "adventure", "wisdom", "friendship", "gaming"];
const SHELF = "quote-quest:library:v1";
const SCREENS = [
  ["playing", ""],
  // r11 is the longest quote in the library (117 characters) and the tenth of twenty in Friendship.
  ["quote card", "cat=friendship&demo=quote&pick=0.47"],
  ["quote book", "book=saved"],
  ["ball album", "book=balls"],
  ["world select", "menu=worlds"],
  ["type select", "menu=types"],
];
/** A save with something in every corner of it: favourites, a log, most of the balls. */
const SEEDED = {
  favs: ["r11", "g4", "c17"],
  pulls: 77,
  world: "dream",
  cat: "gaming",
  dex: ["classic", "azure", "pearl", "volt", "dusk", "noir", "royal"],
  // r11 is the longest quote in the library, c17 has the longest name: if they fit, they all do.
  log: [
    { q: "m1", b: "classic" },
    { q: "c17", b: "royal" },
    { q: "r11", b: "volt" },
  ],
  muted: true,
  music: false,
};

const only = process.argv[2];
const part = (name) => !only || only === name;
const fails = [];
let checks = 0;
function expect(ok, what) {
  checks++;
  if (!ok) {
    fails.push(what);
    console.log(`  FAIL  ${what}`);
  }
  return ok;
}
const url = (query = "") => `/?slot=${SLOT}${query ? `&${query}` : ""}`;

const page = await launch();
try {
  // ── 0. The backend ────────────────────────────────────────────────────
  await page.goto(url());
  // Ask for every category, as the game does, and keep the answers the way the game keeps them.
  const api = await page.run(
    async (cats, key) => {
      const shelf = { byId: {}, pools: {} };
      const out = { index: await fetch("/api/quotes").then((r) => r.json()), cats: [], bad: await fetch("/api/quotes?category=poetry").then((r) => r.status) };
      for (const cat of cats) {
        const res = await fetch(`/api/quotes?category=${cat}`);
        const body = await res.json();
        for (const q of body.quotes) shelf.byId[q.id] = q;
        shelf.pools[cat] = body.quotes.map((q) => q.id);
        out.cats.push({ cat, status: res.status, cache: res.headers.get("cache-control"), count: body.quotes.length, complete: body.quotes.every((q) => q.id && q.cat === cat && q.text && q.author && q.source), longest: Math.max(...body.quotes.map((q) => q.text.length)) });
      }
      localStorage.setItem(key, JSON.stringify(shelf));
      return out;
    },
    CATEGORIES,
    SHELF,
  );
  if (part("api")) {
    console.log("Backend: /api/quotes");
    expect(api.index.total === 160 && api.index.categories.length === 8, `the index lists 8 categories and ${api.index.total} quotes`);
    for (const c of api.cats) {
      expect(c.status === 200 && c.count === 20 && c.complete, `${c.cat}: ${c.count} complete quotes (status ${c.status})`);
      expect(/s-maxage/.test(c.cache ?? ""), `${c.cat}: the answer may be cached (${c.cache})`);
      expect(c.longest <= 120, `${c.cat}: the longest quote is ${c.longest} characters`);
    }
    expect(api.bad === 400, `an unknown category is turned away (status ${api.bad})`);
    console.log(`  ${api.index.total} quotes in ${api.index.categories.length} categories`);

    // The game asks for its category by itself, and keeps what it is sent.
    await page.run((key) => localStorage.removeItem(key), SHELF);
    await page.size(1362, 1044);
    await page.goto(url("cat=wisdom"), { settle: 800 });
    const stocked = await page
      .until((key) => JSON.parse(localStorage.getItem(key) ?? "{}").pools?.wisdom?.length === 20, { timeout: 10000, what: "the machine to be stocked" }, SHELF)
      .then(() => true, () => false);
    expect(stocked, "on arrival the game fetches its category and keeps all 20 quotes");

    // With the backend out of reach and nothing kept from before, the built-in quotes cover.
    await page.send("Network.setBlockedURLs", { urls: ["*/api/quotes*"] });
    await page.run((key) => localStorage.removeItem(key), SHELF);
    await page.goto(url(), { settle: 1200 });
    await page.unseed(SLOT);
    await page.goto(url(), { settle: 1200 });
    await page.key(" ");
    const offline = await page.until(() => document.querySelector(".qq").dataset.stage === "quote", { timeout: 30000, what: "a quote with the backend cut off" }).then(() => true, () => false);
    expect(offline, "with the backend cut off, a grab still wins a quote");
    expect((await page.run((key) => localStorage.getItem(key), SHELF)) === null, "and nothing was stocked, so that quote was a built-in one");
    await page.send("Network.setBlockedURLs", { urls: [] });
    await page.unseed(SLOT);
    await page.goto(url());
    await page.run((key, shelf) => localStorage.setItem(key, shelf), SHELF, JSON.stringify(await page.run(async (cats) => {
      const shelf = { byId: {}, pools: {} };
      for (const cat of cats) {
        const body = await fetch(`/api/quotes?category=${cat}`).then((r) => r.json());
        for (const q of body.quotes) shelf.byId[q.id] = q;
        shelf.pools[cat] = body.quotes.map((q) => q.id);
      }
      return shelf;
    }, CATEGORIES)));
  }

  // ── 1. Every screen at every size ─────────────────────────────────────
  if (part("screens")) console.log(`Screens: ${SIZES.length} window sizes x ${SCREENS.length} screens`);
  await page.goto(url());
  await page.seed(SLOT, SEEDED);
  await page.reducedMotion(true);
  let n = 0;
  for (const [w, h] of part("screens") ? SIZES : []) {
    const seen = [];
    for (const [screen, query] of SCREENS) {
      const world = WORLDS[n++ % WORLDS.length];
      const where = `${w}x${h} ${screen} (${world})`;
      await page.size(w, h, { touch: w < 500 });
      await page.goto(url(`world=${world}${query ? `&${query}` : ""}`), { settle: 1100 });

      const at = await page.run(layoutInfo);
      seen[0] ??= `${at.family} L${at.level} @${at.scale}`;
      expect(at.scrolls[0] <= 0 && at.scrolls[1] <= 0, `${where}: the page scrolls by ${at.scrolls}`);
      expect(at.cabinet === at.canvas[1], `${where}: the cabinet is ${at.cabinet}px tall, the layout allows ${at.canvas[1]}`);
      expect(at.box[0] >= 0 && at.box[1] >= 0 && at.box[2] <= w && at.box[3] <= h, `${where}: the game (${at.box}) pokes out of the window`);

      const off = await page.run(offKit);
      expect(off.length === 0, `${where}: not 8bitcn: ${off.join("; ")}`);
      const hidden = await page.run(hiddenControls);
      expect(hidden.length === 0, `${where}: unreachable: ${hidden.join("; ")}`);
      const text = await page.run(smallestText);
      expect(!text.length || text[0][0] >= 7.95, `${where}: "${text[0]?.[1]}" is drawn at ${text[0]?.[0]}px`);
      const sliced = await page.run(slicedProps);
      expect(sliced.length === 0, `${where}: scenery sliced by the top edge: ${sliced.join("; ")}`);
    }
    console.log(`  ${`${w}x${h}`.padEnd(10)} ${seen[0]}`);
  }

  // ── 2. A round, played ────────────────────────────────────────────────
  const players = [
    ["desktop", 1362, 1044],
    // A phone with its browser's toolbars showing, which is how it is actually played.
    ["phone", 390, 664],
  ];
  for (const [name, w, h] of part("play") ? players : []) {
    console.log(`Play: ${name} (${w}x${h})`);
    await page.reducedMotion(false);
    await page.size(w, h, { touch: w < 500 });
    await page.goto(url());
    await page.unseed(SLOT);
    await page.run((key) => localStorage.removeItem(key), SHELF);
    await page.goto(url(), { settle: 1200 });
    // Nothing is really downloaded or copied: both are recorded instead.
    await page.run(() => {
      window.__saved = [];
      HTMLAnchorElement.prototype.click = function () {
        if (this.download) window.__saved.push(this.download);
      };
    });
    const stage = () => document.querySelector(".qq").dataset.stage ?? "aim";
    const save = (slot) => JSON.parse(localStorage.getItem(`quote-quest:v3:${slot}`) ?? "null");

    // The machine stocks itself from the backend before anyone can reach the button.
    const full = await page.until((key) => JSON.parse(localStorage.getItem(key) ?? "{}").pools?.motivation?.length === 20, { timeout: 10000, what: "the machine to be stocked" }, SHELF).then(() => true, () => false);
    expect(full, `${name}: the machine holds all 20 Motivation quotes from the backend`);

    // The cub is never still: over six seconds it must strike more than one pose.
    const poses = new Set();
    for (let i = 0; i < 24; i++) {
      poses.add(await page.run(() => [...document.querySelector(".qq-cat").classList].join(" ") + "|" + document.querySelector(".qq-cat svg").innerHTML.length));
      await sleep(250);
    }
    expect(poses.size >= 3, `${name}: the cub struck ${poses.size} different poses in six seconds`);

    // Steer: the claw must actually travel. On the desktop with the keyboard, on the phone with a finger held on the button.
    const before = await page.run(() => window.__quest.claw().x);
    if (name === "phone") await page.touch('[aria-label="Move claw right"]', 700);
    else await page.key("ArrowRight", 700);
    const after = await page.run(() => window.__quest.claw().x);
    expect(after > before + 20, `${name}: holding ${name === "phone" ? "a finger on the right arrow" : "the right arrow key"} moved the claw ${Math.round(after - before)}px`);
    if (name === "phone") {
      // And a tap on the glass sends it there.
      const glass = await page.run(() => { const r = document.querySelector(".qq-machine").getBoundingClientRect(); return [r.left + r.width * 0.75, r.top + r.height * 0.5]; });
      await page.touch(glass);
      await sleep(1200);
      const there = await page.run(() => window.__quest.claw().x);
      expect(Math.abs(there - after) > 5, `${name}: a tap on the glass moved the claw from ${Math.round(after)} to ${Math.round(there)}`);
    }

    // Grab. Every grab must end with a quote on stage.
    const t0 = Date.now();
    await page.key(" ");
    await page.until(() => document.querySelector(".qq").dataset.stage === "quote", { timeout: 30000, what: "a quote on stage" });
    const took = (Date.now() - t0) / 1000;
    expect(took > 3 && took < 25, `${name}: the grab took ${took.toFixed(1)}s from the press to the card`);
    await page.until(() => document.querySelector(".qq-show-go")?.textContent.trim() === "PLAY AGAIN", { timeout: 20000, what: "the quote to finish typing" });
    const quote = await page.run(() => document.querySelector(".qq-show .sr-only").textContent.trim());
    expect(quote.length > 10, `${name}: the card shows a quote ("${quote.slice(0, 40)}")`);
    expect((await page.run(hiddenControls)).length === 0, `${name}: every button on the quote card can be reached`);

    // Save it, download it.
    await page.press("SAVE", ".qq-show");
    await page.until(() => !!document.querySelector('.qq-show [aria-pressed="true"]'), { what: "the save button to light" });
    expect((await page.run(save, SLOT))?.favs.length === 1, `${name}: saving stores one favourite`);
    await page.press("DOWNLOAD", ".qq-show");
    await page.until(() => window.__saved.length > 0, { timeout: 15000, what: "the picture to be made" });
    expect(/^quote-quest-.+\.png$/.test(await page.run(() => window.__saved[0])), `${name}: the download is a named PNG`);

    // Back to the machine, and a second round with the mouse.
    await sleep(250);
    await page.key("Escape");
    await page.until(() => !document.querySelector(".qq").dataset.stage, { timeout: 4000, what: "the machine to come back" }).catch(() => {});
    expect((await page.run(stage)) === "aim", `${name}: Escape returns to the machine`);
    // The button is dead while the claw rides home and the bin refills; wait for it, as a player would.
    await page.until(() => [...document.querySelectorAll(".qq-go-btn")].some((b) => b.textContent.trim() === "GRAB ME!" && !b.disabled && b.getBoundingClientRect().width > 0), { timeout: 15000, what: "the grab button to wake" });
    await sleep(300);
    // No steering this time: the claw is parked over the prize chute, with nothing under it.
    // It must go and find a ball by itself, because no grab may come up empty.
    await page.press("GRAB ME!", ".qq");
    await page.until(() => document.querySelector(".qq").dataset.stage === "quote", { timeout: 30000, what: "a second quote" });
    await page.until(() => document.querySelector(".qq-show-go")?.textContent.trim() === "PLAY AGAIN", { timeout: 20000, what: "the second quote to finish typing" });
    expect((await page.run(save, SLOT))?.pulls === 2, `${name}: two grabs, two quotes counted`);
    // Step back to the first one and forward again.
    await page.press("Previous quote", ".qq-show");
    await sleep(300);
    expect((await page.run(() => document.querySelector(".qq-show .sr-only").textContent.trim())) === quote, `${name}: the back arrow shows the first quote again`);
    await page.press("PLAY AGAIN", ".qq-show");
    await page.until(() => !document.querySelector(".qq").dataset.stage, { what: "the machine to come back" });

    // Change world. The wipe covers the screen, shows the stage card, and opens on the new world.
    if (name === "desktop") await page.click('.qq-side .qq-world-btn[data-w="cosmic"]');
    else {
      await page.click(".qq-topbar .qq-bar-world");
      await page.until(() => !!document.querySelector('[role="dialog"] .qq-world-btn[data-w="cosmic"]'), { what: "the world select" });
      await sleep(300);
      expect((await page.run(offKit)).length === 0, `${name}: the world select is all 8bitcn`);
      await page.click('[role="dialog"] .qq-world-btn[data-w="cosmic"]');
    }
    await page.until(() => !!document.querySelector(".qq-wipe .qq-intro"), { timeout: 6000, what: "the stage card" });
    expect((await page.run(() => document.querySelector(".qq-wipe .qq-intro").textContent)).toUpperCase().includes("COSMIC ARCADE"), `${name}: the stage card names the new world`);
    await page.until(() => document.querySelector(".qq").dataset.world === "cosmic" && !document.querySelector(".qq-wipe"), { timeout: 12000, what: "the new world" });

    // The book: saved quotes, a page each.
    await page.run(() => document.querySelector('[role="dialog"] [data-slot="dialog-close"]')?.click());
    await sleep(300);
    if (name === "desktop") {
      const at = await page.run(() => {
        const b = [...document.querySelectorAll(".qq-side-r button")].find((x) => x.textContent.includes("FAVOURITES"));
        const r = b?.getBoundingClientRect();
        return r ? [r.left + r.width / 2, r.top + r.height / 2] : null;
      });
      expect(!!at, `${name}: there is a FAVOURITES button beside the machine`);
      if (at) await page.click(at);
    } else await page.click(".qq-topbar .qq-bar-icon");
    await page.until(() => !!document.querySelector('[role="dialog"] .qq-book'), { what: "the quote book" });
    await sleep(500);
    expect((await page.run(() => document.querySelector(".qq-page-quote")?.textContent ?? "")).length > 10, `${name}: the book opens on the saved quote`);
    await page.press("RECENT", '[role="dialog"]');
    await sleep(500);
    expect((await page.run(() => document.querySelector('.qq-bookmark[data-state="active"]')?.textContent.trim())) === "RECENT", `${name}: the RECENT tab opens`);
    expect((await page.run(offKit)).length === 0, `${name}: the book is all 8bitcn`);
    expect((await page.run(hiddenControls)).length === 0, `${name}: every button in the book can be reached`);
    // The ball album is the tallest page in the book. It must fit too, and the book must close from it.
    await page.click('.qq-bookmark[data-tab="balls"]');
    await sleep(500);
    expect((await page.run(() => document.querySelector('.qq-bookmark[data-state="active"]')?.dataset.tab)) === "balls", `${name}: the BALLS tab opens`);
    const album = await page.run(() => {
      const b = document.querySelector(".qq-book").getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), view: innerHeight, stickers: document.querySelectorAll(".qq-sticker").length };
    });
    expect(album.top >= 0 && album.bottom <= album.view, `${name}: the ball album (${album.top} to ${album.bottom}) fits the ${album.view}px screen`);
    expect(album.stickers === 8, `${name}: the album shows all eight balls`);
    expect((await page.run(hiddenControls)).length === 0, `${name}: every button on the album page can be reached`);
    if (name === "phone") {
      // On a phone there are two ways out. The one at the top first, then back in and out by the other.
      await page.touch(".qq-book-x");
      await page.until(() => !document.querySelector('[role="dialog"]'), { timeout: 4000, what: "the book to close from the top button" });
      await sleep(300);
      await page.touch(".qq-topbar .qq-bar-icon");
      await page.until(() => !!document.querySelector('[role="dialog"] .qq-book'), { what: "the quote book again" });
      await sleep(500);
      expect((await page.run(() => document.querySelector('.qq-bookmark[data-state="active"]')?.dataset.tab)) === "saved", `${name}: the heart opens the book at the saved quotes`);
    }
    await page.press("CLOSE", '[role="dialog"]');
    await page.until(() => !document.querySelector('[role="dialog"]'), { timeout: 4000, what: "the book to close" });
    await sleep(300);

    // Come back later: everything is still there.
    await page.goto(url(), { settle: 1000 });
    const kept = await page.run(save, SLOT);
    expect(kept?.pulls === 2 && kept?.favs.length === 1 && kept?.world === "cosmic" && kept?.log.length === 2, `${name}: after a reload the save still holds 2 quotes, 1 favourite, Cosmic Arcade`);
    expect((await page.run(() => document.querySelector(".qq").dataset.world)) === "cosmic", `${name}: and the game opens in that world`);
  }

  // ── 3. Frame rate ─────────────────────────────────────────────────────
  if (part("frames")) console.log("Frame rate, two seconds in each world at 1362x1044:");
  await page.size(1362, 1044);
  await page.reducedMotion(false);
  for (const world of part("frames") ? WORLDS : []) {
    await page.goto(url(`world=${world}`), { settle: 1500 });
    const fps = await page.run(
      () =>
        new Promise((resolve) => {
          const stamps = [];
          const tick = (t) => {
            stamps.push(t);
            if (t - stamps[0] < 2000) requestAnimationFrame(tick);
            else {
              const gaps = stamps.slice(1).map((s, i) => s - stamps[i]);
              resolve({ fps: Math.round((gaps.length / (stamps.at(-1) - stamps[0])) * 1000), worst: Math.round(Math.max(...gaps)) });
            }
          };
          requestAnimationFrame(tick);
        }),
    );
    console.log(`  ${world.padEnd(9)} ${fps.fps} fps, longest frame ${fps.worst}ms`);
    expect(fps.fps >= 50, `${world}: ${fps.fps} fps`);
  }

  await page.unseed(SLOT);
  expect(page.errors.length === 0, `console errors: ${page.errors.slice(0, 3).join(" | ")}`);
  expect(page.outside.length === 0, `requests that left this machine: ${page.outside.slice(0, 3).join(", ")}`);
} catch (error) {
  fails.push(`the run stopped: ${error.message}`);
  console.log(`  FAIL  the run stopped: ${error.message}`);
  // What the game looked like when it stopped, for whoever has to work out why.
  const at = await page
    .run(() => ({
      stage: document.querySelector(".qq")?.dataset.stage ?? "playing",
      world: document.querySelector(".qq")?.dataset.world,
      claw: window.__quest?.claw(),
      cub: document.querySelector(".qq-say")?.textContent,
      dialog: document.querySelector('[role="dialog"]')?.getAttribute("aria-label") ?? !!document.querySelector('[role="dialog"]'),
      buttons: [...document.querySelectorAll(".qq-go-btn")].map((b) => b.textContent.trim() + (b.disabled ? " (off)" : "")),
    }))
    .catch(() => null);
  console.log(`        at that moment: ${JSON.stringify(at)}`);
  if (page.errors.length) console.log(`        console errors: ${page.errors.slice(0, 3).join(" | ")}`);
} finally {
  await page.close();
}

console.log(fails.length ? `\n${fails.length} of ${checks} checks failed.` : `\nAll ${checks} checks passed.`);
process.exit(fails.length ? 1 : 0);

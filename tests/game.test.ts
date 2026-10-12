import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BALLS, rollBalls } from "@/quest/balls";
import { quoteSize } from "@/quest/cards";
import { checkSongs, songName } from "@/quest/music";
import { CATEGORIES, QUEST_QUOTES, closeShelf, pickQuote, poolFor, quoteById, stock } from "@/quest/quotes";
import { NEW_SAVE, readSave, writeSave } from "@/quest/save";
import { WORLDS } from "@/quest/worlds";

/** A random-number source that repeats, so a test that rolls dice gives the same answer every run. */
function dice(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("the built-in quotes", () => {
  it("come in eight kinds, with enough of each to play without the backend", () => {
    assert.equal(CATEGORIES.length, 8);
    for (const c of CATEGORIES) assert.ok(poolFor(c.id).length >= 4, `${c.label} has at least four it can hand out`);
  });
  it("each have their own id, some words and someone who said them", () => {
    assert.equal(new Set(QUEST_QUOTES.map((q) => q.id)).size, QUEST_QUOTES.length);
    for (const q of QUEST_QUOTES) {
      assert.ok(q.text.trim().length >= 10 && q.author.trim().length >= 2, `${q.id} is complete`);
      assert.ok(CATEGORIES.some((c) => c.id === q.cat), `${q.id} is of a known kind`);
      assert.equal(quoteById(q.id), q);
    }
  });
  it("do not repeat until every one of that kind has been seen", () => {
    const rand = dice(7);
    for (const c of CATEGORIES) {
      const all = QUEST_QUOTES.filter((q) => q.cat === c.id && !q.retired);
      const seen: string[] = [];
      for (let i = 0; i < all.length; i++) {
        const q = pickQuote(c.id, seen, rand);
        assert.ok(q && q.cat === c.id && !seen.includes(q.id), `${c.label}: pick ${i + 1} is new`);
        seen.push(q.id);
      }
      assert.ok(pickQuote(c.id, seen, rand), `${c.label}: and then they come round again`);
    }
  });
  it("never hand out a retired quote, but can still show one that was saved", () => {
    const rand = dice(11);
    const retired = QUEST_QUOTES.filter((q) => q.retired);
    assert.equal(retired.length, 7);
    for (const c of CATEGORIES) for (let i = 0; i < 60; i++) assert.ok(!pickQuote(c.id, [], rand)?.retired);
    for (const q of retired) assert.equal(quoteById(q.id), q);
  });
  it("are set in a size that fits the card", () => {
    assert.equal(quoteSize("x".repeat(52)), "l");
    assert.equal(quoteSize("x".repeat(53)), "m");
    assert.equal(quoteSize("x".repeat(97)), "s");
    const longest = Math.max(...QUEST_QUOTES.map((q) => q.text.length));
    assert.ok(longest <= 120, `the longest quote is ${longest} characters; the card is laid out for up to 120`);
  });
});

describe("what the backend sends", () => {
  const store = new Map<string, string>();
  const sent = [
    { id: "g8", cat: "gaming", text: "War. War never changes.", author: "Fallout", source: "Fallout (1997)" },
    { id: "g9", cat: "gaming", text: "A man chooses; a slave obeys.", author: "BioShock", source: "BioShock (2007)" },
    { id: "g1", cat: "gaming", text: "It's dangerous to go alone! Take this.", author: "The Legend of Zelda", source: "The Legend of Zelda (1986)" },
  ];
  beforeEach(() => {
    store.clear();
    closeShelf();
    (globalThis as Record<string, unknown>).window = {
      location: { search: "" },
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    };
  });

  it("replaces the built-in quotes of that kind, and only that kind", () => {
    const life = poolFor("life").map((q) => q.id);
    assert.equal(stock("gaming", sent), 3);
    assert.deepEqual(poolFor("gaming").map((q) => q.id), ["g8", "g9", "g1"]);
    assert.deepEqual(poolFor("life").map((q) => q.id), life);
    assert.equal(quoteById("g8")?.author, "Fallout");
  });
  it("is still there on the next visit, with no connection", () => {
    stock("gaming", sent);
    closeShelf();
    assert.deepEqual(poolFor("gaming").map((q) => q.id), ["g8", "g9", "g1"]);
    assert.equal(quoteById("g9")?.text, "A man chooses; a slave obeys.");
  });
  it("keeps a favourite that came from the backend when the save is read back", () => {
    stock("gaming", sent);
    writeSave({ ...NEW_SAVE, favs: ["g8"], log: [{ q: "g9", b: "classic" }] });
    closeShelf();
    assert.deepEqual(readSave().favs, ["g8"]);
    assert.equal(readSave().log[0].q, "g9");
  });
  it("ignores anything that is not a quote of the kind that was asked for", () => {
    assert.equal(stock("gaming", [null, 7, { id: "x" }, { id: "l8", cat: "life", text: "Wrong shelf.", author: "Nobody" }]), 0);
    assert.ok(poolFor("gaming").length >= 4, "the built-in quotes are still there");
  });
  it("survives a stored shelf that is not even JSON", () => {
    store.set("quote-quest:library:v1", "{nope");
    assert.ok(poolFor("gaming").length >= 4);
  });
});

describe("the balls", () => {
  it("come in eight designs, one of them a Legend", () => {
    assert.equal(BALLS.length, 8);
    assert.equal(BALLS.filter((b) => b.rarity === "legendary").length, 1);
  });
  it("a full bin always hides exactly one Legend", () => {
    const rand = dice(3);
    for (let i = 0; i < 200; i++) {
      const load = rollBalls(22, rand);
      assert.equal(load.length, 22);
      assert.equal(load.filter((b) => b === "legend").length, 1);
    }
  });
  it("a top-up only sometimes brings one", () => {
    const rand = dice(5);
    let legends = 0;
    for (let i = 0; i < 400; i++) legends += rollBalls(12, rand).filter((b) => b === "legend").length;
    assert.ok(legends > 60 && legends < 180, `${legends} of 400 top-ups had a Legend (about 3 in 10 expected)`);
  });
});

describe("the worlds", () => {
  it("are five, numbered 1 to 5, each with a tune", () => {
    assert.deepEqual(WORLDS.map((w) => w.stage), ["1", "2", "3", "4", "5"]);
    assert.equal(new Set(WORLDS.map((w) => songName(w.id))).size, 5);
  });
  it("have names and taglines short enough for their cards", () => {
    for (const w of WORLDS) {
      assert.ok(w.name.length <= 14, `${w.name} fits the level card`);
      assert.ok(w.tag.length <= 13, `"${w.tag}" fits on one line`);
      assert.equal(w.inks.length, 10, `${w.name} has a colour for each letter of QUOTE QUEST`);
    }
  });
  it("have tunes whose parts all loop together", () => {
    for (const s of checkSongs()) assert.ok(s.ok, `${s.id}: lead ${s.lead}, arp ${s.arp}, bass ${s.bass} steps`);
  });
});

describe("the save", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    // save.ts reads the browser's storage; here it gets a plain map.
    (globalThis as Record<string, unknown>).window = {
      location: { search: "" },
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    };
  });

  it("starts fresh when there is nothing stored", () => {
    assert.deepEqual(readSave(), NEW_SAVE);
  });
  it("comes back as it was written", () => {
    const save = { ...NEW_SAVE, favs: ["m1", "g5"], pulls: 12, world: "cosmic" as const, cat: "gaming" as const, dex: ["classic" as const, "legend" as const], log: [{ q: "m1", b: "classic" as const }], muted: true, music: false };
    writeSave(save);
    assert.deepEqual(readSave(), save);
  });
  it("survives a save that is not even JSON", () => {
    store.set("quote-quest:v3", "{not json");
    assert.deepEqual(readSave(), NEW_SAVE);
  });
  it("drops whatever no longer matches the game, and keeps the rest", () => {
    store.set(
      "quote-quest:v3",
      JSON.stringify({ favs: ["m1", "m1", "nope", 7], pulls: -3, world: "atlantis", cat: "poetry", dex: ["classic", "classic", "golden"], log: [{ q: "m1", b: "classic" }, { q: "gone", b: "classic" }, { q: "g5", b: "plastic" }, null], muted: "yes", music: false }),
    );
    assert.deepEqual(readSave(), { favs: ["m1"], pulls: 0, world: "dream", cat: "motivation", dex: ["classic"], log: [{ q: "m1", b: "classic" }], muted: false, music: false });
  });
  it("keeps only the last forty quotes in the log", () => {
    store.set("quote-quest:v3", JSON.stringify({ log: Array.from({ length: 55 }, () => ({ q: "m1", b: "classic" })) }));
    assert.equal(readSave().log.length, 40);
  });
});

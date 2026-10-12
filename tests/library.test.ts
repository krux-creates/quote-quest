import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GET } from "@/app/api/quotes/route";
import { CATEGORIES, QUEST_QUOTES } from "@/quest/quotes";
import { LIBRARY, shelf } from "@/server/library";

const ask = async (query = "") => {
  const res = await GET(new Request(`https://quote.quest/api/quotes${query}`));
  return { status: res.status, cache: res.headers.get("cache-control"), body: (await res.json()) as Record<string, unknown> };
};

describe("the quote library", () => {
  it("holds twenty quotes of each of the eight kinds", () => {
    for (const c of CATEGORIES) assert.equal(shelf(c.id).length, 20, c.label);
    assert.equal(LIBRARY.filter((q) => !q.retired).length, 160);
  });

  it("gives every quote its own id, and never the same line twice", () => {
    assert.equal(new Set(LIBRARY.map((q) => q.id)).size, LIBRARY.length);
    const lines = LIBRARY.map((q) => q.text.toLowerCase().replace(/[^a-z]/g, ""));
    assert.equal(new Set(lines).size, lines.length);
  });

  it("still knows every quote the built-in set ever had, under the same id", () => {
    for (const old of QUEST_QUOTES) {
      const now = LIBRARY.find((q) => q.id === old.id);
      assert.ok(now && now.text === old.text && now.author === old.author && now.cat === old.cat, `${old.id} is unchanged`);
    }
  });

  it("says where each quote it hands out comes from", () => {
    for (const q of LIBRARY.filter((x) => !x.retired)) assert.ok(q.source && q.source.length >= 5, `${q.id} (${q.author}) has a source`);
  });

  it("only holds quotes that fit a card: 120 characters, and a name of 24", () => {
    for (const q of LIBRARY) {
      assert.ok(q.text.length >= 10 && q.text.length <= 120, `${q.id} is ${q.text.length} characters`);
      assert.ok(q.author.length >= 2 && q.author.length <= 24, `${q.id}: "${q.author}" is ${q.author.length} characters`);
    }
  });

  it("only uses letters the pixel font can draw", () => {
    // Press Start 2P has Latin-1 and the common dashes and quote marks. It has no macrons,
    // for one, and a letter it lacks is drawn in another face in the middle of the word.
    for (const q of LIBRARY) {
      const odd = [...`${q.text}${q.author}`].filter((ch) => !/[ -~¡-ÿ—‘’“”…]/.test(ch));
      assert.deepEqual(odd, [], `${q.id} uses ${odd.join(" ")}`);
    }
  });

  it("does not put the same person in a category more than twice", () => {
    for (const c of CATEGORIES) {
      const seen = new Map<string, number>();
      for (const q of shelf(c.id)) seen.set(q.author, (seen.get(q.author) ?? 0) + 1);
      for (const [author, n] of seen) assert.ok(n <= 2, `${author} appears ${n} times in ${c.label}`);
    }
  });
});

describe("GET /api/quotes", () => {
  it("lists the categories and how many quotes each holds", async () => {
    const { status, body } = await ask();
    assert.equal(status, 200);
    assert.equal(body.total, 160);
    assert.deepEqual(
      (body.categories as { id: string; count: number }[]).map((c) => [c.id, c.count]),
      CATEGORIES.map((c) => [c.id, 20]),
    );
  });

  it("answers a category with its quotes, each with a source, and lets the CDN keep the answer", async () => {
    for (const c of CATEGORIES) {
      const { status, cache, body } = await ask(`?category=${c.id}`);
      const quotes = body.quotes as { id: string; cat: string; text: string; author: string; source: string }[];
      assert.equal(status, 200);
      assert.equal(body.category, c.id);
      assert.equal(body.count, 20);
      assert.equal(quotes.length, 20);
      assert.ok(quotes.every((q) => q.cat === c.id && q.id && q.text && q.author && q.source), `${c.label}: every quote is complete`);
      assert.match(cache ?? "", /s-maxage=3600/);
    }
  });

  it("never hands out a retired quote", async () => {
    const retired = QUEST_QUOTES.filter((q) => q.retired).map((q) => q.id);
    assert.equal(retired.length, 7);
    for (const c of CATEGORIES) {
      const ids = ((await ask(`?category=${c.id}`)).body.quotes as { id: string }[]).map((q) => q.id);
      assert.ok(!ids.some((id) => retired.includes(id)), c.label);
    }
  });

  it("turns away a category that does not exist, and says which ones do", async () => {
    const { status, body } = await ask("?category=poetry");
    assert.equal(status, 400);
    assert.match(body.error as string, /poetry/);
    assert.deepEqual(body.categories, CATEGORIES.map((c) => c.id));
  });
});

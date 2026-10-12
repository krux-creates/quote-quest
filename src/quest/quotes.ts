export type Category = "motivation" | "life" | "creativity" | "wisdom" | "adventure" | "friendship" | "focus" | "gaming";

export interface QuestQuote {
  id: string;
  cat: Category;
  text: string;
  author: string;
  /** Where it was said or written. Quotes from the backend carry this. */
  source?: string;
  /** No longer handed out, but kept so that a quote someone saved earlier still opens in their book. */
  retired?: boolean;
}

// Ordered so a long label sits next to a short one when the buttons wrap.
export const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "motivation", label: "Motivation", icon: "arm" },
  { id: "life", label: "Life", icon: "sprout" },
  { id: "creativity", label: "Creativity", icon: "bulb" },
  { id: "focus", label: "Focus", icon: "target" },
  { id: "adventure", label: "Adventure", icon: "compass" },
  { id: "wisdom", label: "Wisdom", icon: "yin" },
  { id: "friendship", label: "Friendship", icon: "heart" },
  { id: "gaming", label: "Gaming", icon: "pad" },
];

const q = (id: string, cat: Category, text: string, author: string, retired?: true): QuestQuote => ({ id, cat, text, author, ...(retired && { retired }) });

// The built-in set: what the machine holds before it has heard from the backend, and whenever
// it cannot reach it. The full library (160 quotes, each with its source) lives on the server
// in src/server/library.ts and arrives through /api/quotes.
//
// Real lines from real people (and a few real games). Nothing here is paraphrased or invented.
// Seven are retired: four that sat oddly in their category and three whose attribution is
// popular rather than proven. They are still here because ids are forever.
export const QUEST_QUOTES: QuestQuote[] = [
  q("m1", "motivation", "You miss 100% of the shots you don't take.", "Wayne Gretzky"),
  q("m2", "motivation", "Fall seven times, stand up eight.", "Japanese proverb"),
  q("m3", "motivation", "It ain't over till it's over.", "Yogi Berra"),
  q("m4", "motivation", "Pressure is a privilege.", "Billie Jean King"),
  q("m5", "motivation", "Start where you are. Use what you have. Do what you can.", "Arthur Ashe"),
  q("m6", "motivation", "Fortune favors the bold.", "Virgil"),
  q("m7", "motivation", "I've failed over and over and over again in my life. And that is why I succeed.", "Michael Jordan"),

  q("l1", "life", "We don't make mistakes. We just have happy accidents.", "Bob Ross"),
  q("l2", "life", "A ship in harbor is safe, but that is not what ships are built for.", "John A. Shedd"),
  q("l3", "life", "Diligence is the mother of good luck.", "Benjamin Franklin"),
  q("l4", "life", "The opposite of play is not work. It's depression.", "Brian Sutton-Smith", true),
  q("l5", "life", "Play is older than culture.", "Johan Huizinga", true),
  q("l6", "life", "In three words I can sum up everything I've learned about life: it goes on.", "Robert Frost"),
  q("l7", "life", "I love deadlines. I love the whooshing noise they make as they go by.", "Douglas Adams"),

  q("c1", "creativity", "The creative mind plays with the objects it loves.", "Carl Jung"),
  q("c2", "creativity", "What I cannot create, I do not understand.", "Richard Feynman"),
  q("c3", "creativity", "Real artists ship.", "Steve Jobs"),
  q("c4", "creativity", "The details are not the details. They make the design.", "Charles Eames"),
  q("c5", "creativity", "Good design is as little design as possible.", "Dieter Rams"),
  q("c6", "creativity", "The best way to predict the future is to invent it.", "Alan Kay"),
  q("c7", "creativity", "Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke"),

  q("w1", "wisdom", "The unexamined life is not worth living.", "Socrates"),
  q("w2", "wisdom", "We are what we repeatedly do.", "Will Durant"),
  q("w3", "wisdom", "He who has a why to live can bear almost any how.", "Friedrich Nietzsche"),
  q("w4", "wisdom", "Chance favors only the prepared mind.", "Louis Pasteur"),
  q("w5", "wisdom", "Luck is the residue of design.", "Branch Rickey"),
  q("w6", "wisdom", "It is not that we have a short time to live, but that we waste a lot of it.", "Seneca"),
  q("w7", "wisdom", "I think, therefore I am.", "René Descartes"),

  q("a1", "adventure", "Not all those who wander are lost.", "J.R.R. Tolkien"),
  q("a2", "adventure", "The journey of a thousand miles begins with a single step.", "Lao Tzu"),
  q("a3", "adventure", "It is not the mountain we conquer, but ourselves.", "Edmund Hillary", true),
  q("a4", "adventure", "Adventure is worthwhile in itself.", "Amelia Earhart"),
  q("a5", "adventure", "Because it's there.", "George Mallory"),
  q("a6", "adventure", "Only those who will risk going too far can possibly find out how far one can go.", "T.S. Eliot"),
  q("a7", "adventure", "The die is cast.", "Julius Caesar"),

  q("r1", "friendship", "The only way to have a friend is to be one.", "Ralph Waldo Emerson"),
  q("r2", "friendship", "What? You too? I thought I was the only one.", "C.S. Lewis"),
  q("r3", "friendship", "A friend is someone who knows all about you and still loves you.", "Elbert Hubbard"),
  q("r4", "friendship", "Walking with a friend in the dark is better than walking alone in the light.", "Helen Keller", true),
  q("r5", "friendship", "No man is an island, entire of itself.", "John Donne"),
  q("r6", "friendship", "To love and be loved is to feel the sun from both sides.", "David Viscott"),
  q("r7", "friendship", "What is a friend? A single soul dwelling in two bodies.", "Aristotle"),

  q("o1", "focus", "The main thing is to keep the main thing the main thing.", "Stephen Covey"),
  q("o2", "focus", "You can do anything, but not everything.", "David Allen"),
  q("o3", "focus", "It is not enough to be industrious; so are the ants. What are you industrious about?", "Henry David Thoreau"),
  q("o4", "focus", "Write programs that do one thing and do it well.", "Doug McIlroy", true),
  q("o5", "focus", "Be here now.", "Ram Dass"),
  q("o6", "focus", "Talk is cheap. Show me the code.", "Linus Torvalds", true),
  q("o7", "focus", "The sun's rays do not burn until brought to a focus.", "Alexander Graham Bell", true),

  q("g1", "gaming", "It's dangerous to go alone! Take this.", "The Legend of Zelda"),
  q("g2", "gaming", "A game is a series of interesting choices.", "Sid Meier"),
  q("g3", "gaming", "If it's not fun, why bother?", "Reggie Fils-Aimé"),
  q("g4", "gaming", "On my business card, I am a corporate president. In my mind, I am a game developer. But in my heart, I am a gamer.", "Satoru Iwata"),
  q("g5", "gaming", "The cake is a lie.", "Portal"),
  q("g6", "gaming", "Thank you Mario! But our princess is in another castle!", "Super Mario Bros."),
  q("g7", "gaming", "Stay awhile and listen.", "Diablo"),
];

export const isCategory = (x: unknown): x is Category => CATEGORIES.some((c) => c.id === x);
export const categoryLabel = (cat: Category) => CATEGORIES.find((c) => c.id === cat)?.label ?? cat;

// ── What this browser has been sent ────────────────────────────────────
// Every quote the backend has ever sent is kept in localStorage: the machine is stocked from
// it at once on the next visit, it still works with no connection, and a saved favourite can
// always be shown, even one the library has since dropped.

const BUILT_IN = new Map(QUEST_QUOTES.map((x) => [x.id, x]));
const SHELF_KEY = "quote-quest:library:v1";

interface Shelf {
  /** Every quote this browser has been sent, by id. */
  byId: Record<string, QuestQuote>;
  /** What each category holds, as of the last answer from the backend. */
  pools: Partial<Record<Category, string[]>>;
}

let shelf: Shelf | null = null;

const isQuote = (x: unknown): x is QuestQuote => {
  const v = x as QuestQuote | null;
  return !!v && typeof v.id === "string" && typeof v.text === "string" && typeof v.author === "string" && isCategory(v.cat);
};

/** Read the stored shelf once, dropping anything that is not a quote. On the server there is none. */
function open(): Shelf {
  if (shelf) return shelf;
  shelf = { byId: {}, pools: {} };
  if (typeof window === "undefined") return shelf;
  try {
    const raw = JSON.parse(window.localStorage.getItem(SHELF_KEY) ?? "null") as Partial<Shelf> | null;
    for (const quote of Object.values(raw?.byId ?? {})) if (isQuote(quote)) shelf.byId[quote.id] = quote;
    for (const [cat, ids] of Object.entries(raw?.pools ?? {})) {
      if (isCategory(cat) && Array.isArray(ids)) shelf.pools[cat] = ids.filter((id) => typeof id === "string" && id in shelf!.byId);
    }
  } catch {
    // A shelf that cannot be read is an empty shelf; the built-in set covers for it.
  }
  return shelf;
}

/** Forget what has been read, so the next lookup reads storage again. For tests. */
export function closeShelf() {
  shelf = null;
}

/** A quote by id: the backend's copy if this browser has one, else the built-in one. */
export const quoteById = (id: string) => open().byId[id] ?? BUILT_IN.get(id) ?? null;

/** The quotes of one kind in the machine right now: the backend's list if it has arrived, else the built-in ones. */
export function poolFor(cat: Category): QuestQuote[] {
  const sent = (open().pools[cat] ?? []).map((id) => open().byId[id]).filter((x) => x && !x.retired);
  return sent.length ? sent : QUEST_QUOTES.filter((x) => x.cat === cat && !x.retired);
}

/** Put a category's quotes, as the backend sent them, on the shelf and into storage. */
export function stock(cat: Category, quotes: unknown[]) {
  const good = quotes.filter(isQuote).filter((x) => x.cat === cat);
  if (!good.length) return 0;
  const s = open();
  for (const quote of good) s.byId[quote.id] = quote;
  s.pools[cat] = good.map((x) => x.id);
  try {
    window.localStorage.setItem(SHELF_KEY, JSON.stringify(s));
  } catch {
    // Storage is full or off: the quotes are still on the shelf for this visit.
  }
  return good.length;
}

/**
 * Ask the backend for one category and stock the machine with the answer. Returns how many
 * quotes that category now holds. It never throws: with no connection the machine keeps
 * whatever it already has.
 */
export async function fetchQuotes(cat: Category, signal?: AbortSignal): Promise<number> {
  try {
    const res = await fetch(`/api/quotes?category=${cat}`, { signal });
    if (res.ok) stock(cat, ((await res.json()) as { quotes?: unknown[] }).quotes ?? []);
  } catch {
    // Offline, or the request was dropped because the player moved on.
  }
  return poolFor(cat).length;
}

/**
 * A quote from the category that the player has not just seen. An empty
 * category falls back to the whole collection; an empty collection gives null.
 */
export function pickQuote(cat: Category, seen: string[], rand: () => number = Math.random, all: QuestQuote[] = poolFor(cat)): QuestQuote | null {
  const live = all.filter((x) => !x.retired);
  const inCat = live.filter((x) => x.cat === cat);
  const pool = inCat.length ? inCat : live;
  if (!pool.length) return null;
  const fresh = pool.filter((x) => !seen.includes(x.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rand() * from.length)] ?? null;
}

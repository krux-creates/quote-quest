export type Category = "motivation" | "life" | "creativity" | "wisdom" | "adventure" | "friendship" | "focus" | "gaming";

export interface QuestQuote {
  id: string;
  cat: Category;
  text: string;
  author: string;
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

const q = (id: string, cat: Category, text: string, author: string): QuestQuote => ({ id, cat, text, author });

// Real lines from real people (and a few real games). Nothing here is paraphrased or invented.
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
  q("l4", "life", "The opposite of play is not work. It's depression.", "Brian Sutton-Smith"),
  q("l5", "life", "Play is older than culture.", "Johan Huizinga"),
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
  q("a3", "adventure", "It is not the mountain we conquer, but ourselves.", "Edmund Hillary"),
  q("a4", "adventure", "Adventure is worthwhile in itself.", "Amelia Earhart"),
  q("a5", "adventure", "Because it's there.", "George Mallory"),
  q("a6", "adventure", "Only those who will risk going too far can possibly find out how far one can go.", "T.S. Eliot"),
  q("a7", "adventure", "The die is cast.", "Julius Caesar"),

  q("r1", "friendship", "The only way to have a friend is to be one.", "Ralph Waldo Emerson"),
  q("r2", "friendship", "What? You too? I thought I was the only one.", "C.S. Lewis"),
  q("r3", "friendship", "A friend is someone who knows all about you and still loves you.", "Elbert Hubbard"),
  q("r4", "friendship", "Walking with a friend in the dark is better than walking alone in the light.", "Helen Keller"),
  q("r5", "friendship", "No man is an island, entire of itself.", "John Donne"),
  q("r6", "friendship", "To love and be loved is to feel the sun from both sides.", "David Viscott"),
  q("r7", "friendship", "What is a friend? A single soul dwelling in two bodies.", "Aristotle"),

  q("o1", "focus", "The main thing is to keep the main thing the main thing.", "Stephen Covey"),
  q("o2", "focus", "You can do anything, but not everything.", "David Allen"),
  q("o3", "focus", "It is not enough to be industrious; so are the ants. What are you industrious about?", "Henry David Thoreau"),
  q("o4", "focus", "Write programs that do one thing and do it well.", "Doug McIlroy"),
  q("o5", "focus", "Be here now.", "Ram Dass"),
  q("o6", "focus", "Talk is cheap. Show me the code.", "Linus Torvalds"),
  q("o7", "focus", "The sun's rays do not burn until brought to a focus.", "Alexander Graham Bell"),

  q("g1", "gaming", "It's dangerous to go alone! Take this.", "The Legend of Zelda"),
  q("g2", "gaming", "A game is a series of interesting choices.", "Sid Meier"),
  q("g3", "gaming", "If it's not fun, why bother?", "Reggie Fils-Aimé"),
  q("g4", "gaming", "On my business card, I am a corporate president. In my mind, I am a game developer. But in my heart, I am a gamer.", "Satoru Iwata"),
  q("g5", "gaming", "The cake is a lie.", "Portal"),
  q("g6", "gaming", "Thank you Mario! But our princess is in another castle!", "Super Mario Bros."),
  q("g7", "gaming", "Stay awhile and listen.", "Diablo"),
];

const BY_ID = new Map(QUEST_QUOTES.map((x) => [x.id, x]));
export const quoteById = (id: string) => BY_ID.get(id) ?? null;
export const categoryLabel = (cat: Category) => CATEGORIES.find((c) => c.id === cat)?.label ?? cat;

/**
 * A quote from the category that the player has not just seen. An empty
 * category falls back to the whole collection; an empty collection gives null.
 */
export function pickQuote(cat: Category, seen: string[], rand: () => number = Math.random, all: QuestQuote[] = QUEST_QUOTES): QuestQuote | null {
  const inCat = all.filter((x) => x.cat === cat);
  const pool = inCat.length ? inCat : all;
  if (!pool.length) return null;
  const fresh = pool.filter((x) => !seen.includes(x.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rand() * from.length)] ?? null;
}

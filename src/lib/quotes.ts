export type Rarity = 3 | 4 | 5;

export interface Quote {
  id: string;
  text: string;
  author: string;
  /** Where the line comes from — shown on the card so every quote is checkable. */
  source: string;
  year: string;
  rarity: Rarity;
  tape: string;
  set: string;
}

export interface QuoteSet {
  id: string;
  name: string;
  blurb: string;
}

export interface Tape {
  id: string;
  channel: number;
  title: string;
  tagline: string;
  /** Label colour on the cassette spine and the channel ident. */
  color: string;
  ink: string;
  sets: QuoteSet[];
}

export const TAPES: Tape[] = [
  {
    id: "play",
    channel: 1,
    title: "PLAYER ONE",
    tagline: "On games and why we play them",
    color: "#4f7cff",
    ink: "#ffffff",
    sets: [
      { id: "play-a", name: "RULES OF PLAY", blurb: "What a game actually is." },
      { id: "play-b", name: "ARCADE WISDOM", blurb: "From the people who built them." },
      { id: "play-c", name: "SERIOUS FUN", blurb: "Play is not the opposite of work." },
    ],
  },
  {
    id: "luck",
    channel: 2,
    title: "LUCKY DROP",
    tagline: "On chance, nerve and taking the shot",
    color: "#ff5d8f",
    ink: "#ffffff",
    sets: [
      { id: "luck-a", name: "TAKE THE SHOT", blurb: "You have to press PICK." },
      { id: "luck-b", name: "PREPARED MINDS", blurb: "Luck has a recipe." },
      { id: "luck-c", name: "SIGN-OFF", blurb: "Said straight to camera." },
    ],
  },
  {
    id: "grit",
    channel: 3,
    title: "CONTINUE?",
    tagline: "On missing, and going again",
    color: "#34c98a",
    ink: "#0f2b1e",
    sets: [
      { id: "grit-a", name: "INSERT COIN", blurb: "The claw slipped. So what." },
      { id: "grit-b", name: "IN THE ARENA", blurb: "From people who were in it." },
      { id: "grit-c", name: "KEEP GOING", blurb: "Small, stubborn steps." },
    ],
  },
  {
    id: "make",
    channel: 4,
    title: "WORKSHOP",
    tagline: "On making, mending and shipping",
    color: "#ffb52e",
    ink: "#3a2500",
    sets: [
      { id: "make-a", name: "OPEN IT UP", blurb: "Understand it by taking it apart." },
      { id: "make-b", name: "LESS, BUT BETTER", blurb: "The craft of leaving things out." },
      { id: "make-c", name: "SHIP IT", blurb: "Done beats imagined." },
    ],
  },
  {
    id: "signal",
    channel: 5,
    title: "SIGNAL",
    tagline: "On machines, media and the future",
    color: "#a66bff",
    ink: "#ffffff",
    sets: [
      { id: "signal-a", name: "THE MACHINE", blurb: "From the first programmers." },
      { id: "signal-b", name: "THE FUTURE", blurb: "It tends to arrive early." },
      { id: "signal-c", name: "ON AIR", blurb: "Words made for broadcast." },
    ],
  },
];

const q = (
  id: string,
  tape: string,
  set: string,
  rarity: Rarity,
  text: string,
  author: string,
  source: string,
  year: string,
): Quote => ({ id, tape, set, rarity, text, author, source, year });

export const QUOTES: Quote[] = [
  // ── CH 01 · PLAYER ONE ────────────────────────────────────────────
  q("p1", "play", "play-a", 3, "Play is older than culture.", "Johan Huizinga", "Homo Ludens", "1938"),
  q("p2", "play", "play-a", 3, "A game is a series of interesting choices.", "Sid Meier", "Game Developers Conference talk", "1989"),
  q("p3", "play", "play-a", 4, "Playing a game is the voluntary attempt to overcome unnecessary obstacles.", "Bernard Suits", "The Grasshopper", "1978"),
  q("p4", "play", "play-b", 3, "If it's not fun, why bother?", "Reggie Fils-Aimé", "Nintendo Spotlight, E3", "2017"),
  q("p5", "play", "play-b", 4, "All the best games are easy to learn and difficult to master.", "Nolan Bushnell", "Atari founder — \"Bushnell's Law\"", "1970s"),
  q("p6", "play", "play-b", 5, "On my business card, I am a corporate president. In my mind, I am a game developer. But in my heart, I am a gamer.", "Satoru Iwata", "GDC keynote", "2005"),
  q("p7", "play", "play-c", 3, "Play is really the work of childhood.", "Fred Rogers", "Host, Mister Rogers' Neighborhood", "attrib."),
  q("p8", "play", "play-c", 4, "The opposite of play is not work. It's depression.", "Brian Sutton-Smith", "Play theorist", "attrib."),
  q("p9", "play", "play-c", 4, "The creative mind plays with the objects it loves.", "Carl Jung", "Psychological Types", "1921"),

  // ── CH 02 · LUCKY DROP ────────────────────────────────────────────
  q("l1", "luck", "luck-a", 3, "Fortune favors the bold.", "Virgil", "The Aeneid, Book X", "19 BC"),
  q("l2", "luck", "luck-a", 3, "The die is cast.", "Julius Caesar", "Crossing the Rubicon, per Suetonius", "49 BC"),
  q("l3", "luck", "luck-a", 5, "You miss 100% of the shots you don't take.", "Wayne Gretzky", "Interview, The Hockey News", "1983"),
  q("l4", "luck", "luck-b", 3, "Diligence is the mother of good luck.", "Benjamin Franklin", "Poor Richard's Almanack", "1736"),
  q("l5", "luck", "luck-b", 4, "Luck is the residue of design.", "Branch Rickey", "Baseball executive", "attrib."),
  q("l6", "luck", "luck-b", 4, "Chance favors only the prepared mind.", "Louis Pasteur", "Lecture, University of Lille", "1854"),
  q("l7", "luck", "luck-c", 3, "It ain't over till it's over.", "Yogi Berra", "New York Mets manager", "1973"),
  q("l8", "luck", "luck-c", 4, "We don't make mistakes. We just have happy accidents.", "Bob Ross", "The Joy of Painting", "1980s"),
  q("l9", "luck", "luck-c", 4, "Good night, and good luck.", "Edward R. Murrow", "Sign-off, See It Now", "1950s"),

  // ── CH 03 · CONTINUE? ─────────────────────────────────────────────
  q("g1", "grit", "grit-a", 3, "Fall seven times, stand up eight.", "Japanese proverb", "Nana korobi ya oki", "Trad."),
  q("g2", "grit", "grit-a", 4, "I have gotten a lot of results! I know several thousand things that won't work.", "Thomas Edison", "Quoted by Dyer & Martin", "1910"),
  q("g3", "grit", "grit-a", 5, "Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.", "Samuel Beckett", "Worstward Ho", "1983"),
  q("g4", "grit", "grit-b", 3, "Pressure is a privilege.", "Billie Jean King", "Her motto, and her book title", "2008"),
  q("g5", "grit", "grit-b", 4, "The credit belongs to the man who is actually in the arena.", "Theodore Roosevelt", "Citizenship in a Republic, Paris", "1910"),
  q("g6", "grit", "grit-b", 4, "I've failed over and over and over again in my life. And that is why I succeed.", "Michael Jordan", "Nike \"Failure\" commercial", "1997"),
  q("g7", "grit", "grit-c", 3, "The most effective way to do it, is to do it.", "Amelia Earhart", "Aviator", "attrib."),
  q("g8", "grit", "grit-c", 3, "Start where you are. Use what you have. Do what you can.", "Arthur Ashe", "Tennis champion", "attrib."),
  q("g9", "grit", "grit-c", 4, "A ship in harbor is safe, but that is not what ships are built for.", "John A. Shedd", "Salt from My Attic", "1928"),

  // ── CH 04 · WORKSHOP ──────────────────────────────────────────────
  q("m1", "make", "make-a", 3, "Talk is cheap. Show me the code.", "Linus Torvalds", "Linux kernel mailing list", "2000"),
  q("m2", "make", "make-a", 4, "If you can't open it, you don't own it.", "Mister Jalopy", "The Maker's Bill of Rights, Make", "2005"),
  q("m3", "make", "make-a", 5, "What I cannot create, I do not understand.", "Richard Feynman", "Left on his blackboard", "1988"),
  q("m4", "make", "make-b", 3, "Good design is as little design as possible.", "Dieter Rams", "Ten Principles for Good Design", "1970s"),
  q("m5", "make", "make-b", 3, "The details are not the details. They make the design.", "Charles Eames", "Designer", "attrib."),
  q("m6", "make", "make-b", 4, "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", "Antoine de Saint-Exupéry", "Wind, Sand and Stars", "1939"),
  q("m7", "make", "make-c", 3, "Real artists ship.", "Steve Jobs", "To the Macintosh team", "1983"),
  q("m8", "make", "make-c", 4, "Plan to throw one away; you will, anyhow.", "Fred Brooks", "The Mythical Man-Month", "1975"),
  q("m9", "make", "make-c", 4, "A complex system that works is invariably found to have evolved from a simple system that worked.", "John Gall", "Systemantics", "1975"),

  // ── CH 05 · SIGNAL ────────────────────────────────────────────────
  q("s1", "signal", "signal-a", 3, "Premature optimization is the root of all evil.", "Donald Knuth", "Structured Programming with go to Statements", "1974"),
  q("s2", "signal", "signal-a", 4, "We can only see a short distance ahead, but we can see plenty there that needs to be done.", "Alan Turing", "Computing Machinery and Intelligence", "1950"),
  q("s3", "signal", "signal-a", 5, "The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves.", "Ada Lovelace", "Notes on the Analytical Engine", "1843"),
  q("s4", "signal", "signal-b", 3, "The best way to predict the future is to invent it.", "Alan Kay", "Xerox PARC meeting", "1971"),
  q("s5", "signal", "signal-b", 4, "Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke", "Profiles of the Future", "1973"),
  q("s6", "signal", "signal-b", 4, "The future is already here — it's just not evenly distributed.", "William Gibson", "Novelist, in interviews", "attrib."),
  q("s7", "signal", "signal-c", 3, "And that's the way it is.", "Walter Cronkite", "Sign-off, CBS Evening News", "1962–81"),
  q("s8", "signal", "signal-c", 3, "The medium is the message.", "Marshall McLuhan", "Understanding Media", "1964"),
  q("s9", "signal", "signal-c", 4, "I love deadlines. I love the whooshing noise they make as they go by.", "Douglas Adams", "The Salmon of Doubt", "2002"),
];

export const QUOTE_BY_ID: Record<string, Quote> = Object.fromEntries(
  QUOTES.map((x) => [x.id, x]),
);

export const TAPE_BY_ID: Record<string, Tape> = Object.fromEntries(
  TAPES.map((t) => [t.id, t]),
);

export const RARITY: Record<
  Rarity,
  { label: string; xp: number; top: string; shade: string; ray: string; rayAlt: string }
> = {
  3: { label: "COMMON", xp: 10, top: "#5aa9ff", shade: "#2f6fd6", ray: "#4fd6ff", rayAlt: "#b5f0ff" },
  4: { label: "RARE", xp: 25, top: "#b98cff", shade: "#7d4fe0", ray: "#c9a4ff", rayAlt: "#ecdcff" },
  5: { label: "LEGENDARY", xp: 60, top: "#ffcf3a", shade: "#e08a00", ray: "#ffcf3a", rayAlt: "#fff1b0" },
};

export function quotesOfTape(tapeId: string) {
  return QUOTES.filter((x) => x.tape === tapeId);
}

export function quotesOfSet(setId: string) {
  return QUOTES.filter((x) => x.set === setId);
}

/**
 * Decide which quote a capsule of the given rarity holds. Uncollected quotes
 * come first so the collection always moves forward; once a tier is complete
 * the capsule falls back to a repeat.
 */
export function drawQuote(
  tapeId: string,
  rarity: Rarity,
  owned: Record<string, number>,
  rand: () => number = Math.random,
): Quote {
  const tier = QUOTES.filter((x) => x.tape === tapeId && x.rarity === rarity);
  const fresh = tier.filter((x) => !owned[x.id]);
  const pool = fresh.length ? fresh : tier;
  return pool[Math.floor(rand() * pool.length)];
}

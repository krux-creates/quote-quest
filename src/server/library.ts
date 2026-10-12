import { type Category, QUEST_QUOTES, type QuestQuote } from "@/quest/quotes";

// The quote library, as the backend serves it. Only the server imports this file: the game
// carries a small built-in set (src/quest/quotes.ts) and asks /api/quotes for the rest.
//
// What gets in: real lines, said or written by the person (or work) named, short enough for
// a card (120 characters), with a source that can be looked up. No song lyrics, and nothing
// reworded: where a line is a standard translation or the usual condensed form, the source
// says so. Three older quotes have no primary source on record and are marked "widely
// attributed". A line whose only evidence is someone else's say-so decades later stays out
// (that is why there is no Picasso here).
//
// Ids are forever. A saved favourite is stored by id, so never renumber or reuse one: add new
// quotes at the end of a list, and retire one (in quotes.ts) rather than delete it.

/** Where each quote in the built-in set comes from. */
const BUILT_IN_SOURCES: Record<string, string> = {
  m1: "to Bob McKenzie, The Hockey News, 1983",
  m2: "Nana korobi ya oki",
  m3: "during the 1973 pennant race",
  m4: "title of her 2008 book",
  m5: "widely attributed",
  m6: "Aeneid, Book X",
  m7: "Nike advertisement \"Failure\", 1997",
  l1: "The Joy of Painting",
  l2: "Salt from My Attic (1928)",
  l3: "Poor Richard's Almanack (1736)",
  l6: "to Ray Josephs, This Week, 1954",
  l7: "The Salmon of Doubt (2002)",
  c1: "Psychological Types (1921)",
  c2: "on his blackboard at Caltech, 1988",
  c3: "to the Macintosh team, 1983",
  c4: "widely attributed",
  c5: "Ten Principles for Good Design",
  c6: "at a Xerox PARC meeting, 1971",
  c7: "Profiles of the Future (1973 edition)",
  w1: "Plato's Apology",
  w2: "The Story of Philosophy (1926)",
  w3: "Twilight of the Idols (1889)",
  w4: "lecture at the University of Lille, 1854",
  w5: "lecture title, 1950",
  w6: "On the Shortness of Life",
  w7: "Discourse on the Method (1637)",
  a1: "The Fellowship of the Ring (1954)",
  a2: "Tao Te Ching, chapter 64",
  a4: "widely attributed",
  a5: "The New York Times, 18 March 1923",
  a6: "preface to Harry Crosby's Transit of Venus (1931)",
  a7: "on crossing the Rubicon, 49 BC, per Suetonius",
  r1: "Essays: First Series, \"Friendship\" (1841)",
  r2: "The Four Loves (1960)",
  r3: "The Note Book of Elbert Hubbard (1927)",
  r5: "Devotions upon Emergent Occasions (1624)",
  r6: "How to Live with Another Person (1974)",
  r7: "per Diogenes Laërtius, Lives of the Eminent Philosophers",
  o1: "First Things First (1994)",
  o2: "Getting Things Done (2001)",
  o3: "letter to H.G.O. Blake, 1857",
  o5: "title of his 1971 book",
  g1: "The Legend of Zelda (1986)",
  g2: "Game Developers Conference talk, 1989",
  g3: "as president of Nintendo of America",
  g4: "Game Developers Conference keynote, 2005",
  g5: "Portal (2007)",
  g6: "Super Mario Bros. (1985)",
  g7: "Deckard Cain, Diablo II (2000)",
};

/** A run of new quotes for one category, numbered on from where the built-in set stops. */
function more(cat: Category, prefix: string, from: number, rows: [text: string, author: string, source: string][]): QuestQuote[] {
  return rows.map(([text, author, source], i) => ({ id: `${prefix}${from + i}`, cat, text, author, source }));
}

const MORE: QuestQuote[] = [
  ...more("motivation", "m", 8, [
    ["Do. Or do not. There is no try.", "Yoda", "The Empire Strikes Back (1980)"],
    ["The best way out is always through.", "Robert Frost", "\"A Servant to Servants\" (1914)"],
    ["Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.", "Samuel Beckett", "Worstward Ho (1983)"],
    ["You must do the thing you think you cannot do.", "Eleanor Roosevelt", "You Learn by Living (1960)"],
    ["I'm not afraid of storms, for I'm learning how to sail my ship.", "Louisa May Alcott", "Little Women (1868)"],
    ["The harder the conflict, the more glorious the triumph.", "Thomas Paine", "The American Crisis (1776)"],
    ["Float like a butterfly, sting like a bee.", "Muhammad Ali", "before fighting Sonny Liston, 1964"],
    ["Nothing great was ever achieved without enthusiasm.", "Ralph Waldo Emerson", "Essays: First Series, \"Circles\" (1841)"],
    ["Just keep swimming.", "Dory", "Finding Nemo (2003)"],
    ["The hard is what makes it great.", "Jimmy Dugan", "A League of Their Own (1992)"],
    ["Stay hungry. Stay foolish.", "The Whole Earth Catalog", "back cover of the final issue, 1974; quoted by Steve Jobs at Stanford, 2005"],
    ["Never give in, never give in, never, never, never, never.", "Winston Churchill", "speech at Harrow School, 29 October 1941"],
    ["The only thing we have to fear is fear itself.", "Franklin D. Roosevelt", "first inaugural address, 1933"],
  ]),

  ...more("life", "l", 8, [
    ["Life can only be understood backwards; but it must be lived forwards.", "Søren Kierkegaard", "Journals, 1843, in its usual condensed form"],
    ["To live is the rarest thing in the world. Most people exist, that is all.", "Oscar Wilde", "The Soul of Man Under Socialism (1891)"],
    ["Life is what happens to us while we are making other plans.", "Allen Saunders", "Reader's Digest, January 1957"],
    ["How we spend our days is, of course, how we spend our lives.", "Annie Dillard", "The Writing Life (1989)"],
    ["Tell me, what is it you plan to do with your one wild and precious life?", "Mary Oliver", "\"The Summer Day\" (1990)"],
    ["The days are long, but the years are short.", "Gretchen Rubin", "The Happiness Project (2009)"],
    ["Life shrinks or expands in proportion to one's courage.", "Anaïs Nin", "The Diary of Anaïs Nin, volume 3 (1939-1944)"],
    ["I have measured out my life with coffee spoons.", "T.S. Eliot", "\"The Love Song of J. Alfred Prufrock\" (1915)"],
    ["It does not do to dwell on dreams and forget to live.", "J.K. Rowling", "Harry Potter and the Philosopher's Stone (1997)"],
    ["Life moves pretty fast. If you don't stop and look around once in a while, you could miss it.", "Ferris Bueller", "Ferris Bueller's Day Off (1986)"],
    ["All we have to decide is what to do with the time that is given us.", "J.R.R. Tolkien", "The Fellowship of the Ring (1954)"],
    ["The most wasted of all days is one without laughter.", "Nicolas Chamfort", "Maxims and Thoughts (1795)"],
    ["This too shall pass.", "Persian adage", "retold in English by Edward FitzGerald, 1852"],
    ["Hope is the thing with feathers.", "Emily Dickinson", "poem 314, about 1861"],
    ["So it goes.", "Kurt Vonnegut", "Slaughterhouse-Five (1969)"],
  ]),

  ...more("creativity", "c", 8, [
    ["You can't use up creativity. The more you use, the more you have.", "Maya Angelou", "Bell Telephone Magazine, 1982"],
    ["Oh, the thinks you can think up if only you try!", "Dr. Seuss", "Oh, the Thinks You Can Think! (1975)"],
    ["Less is more.", "Ludwig Mies van der Rohe", "his working motto; the phrase is from Browning's \"Andrea del Sarto\" (1855)"],
    ["Form ever follows function.", "Louis Sullivan", "\"The Tall Office Building Artistically Considered\" (1896)"],
    ["Design is not just what it looks like and feels like. Design is how it works.", "Steve Jobs", "The New York Times Magazine, 30 November 2003"],
    ["Imagination is more important than knowledge.", "Albert Einstein", "The Saturday Evening Post, 26 October 1929"],
    ["I keep on making what I can't do yet in order to learn to be able to do it.", "Vincent van Gogh", "letter to Anthon van Rappard, August 1885"],
    ["The scariest moment is always just before you start.", "Stephen King", "On Writing (2000)"],
    ["Don't loaf and invite inspiration; light out after it with a club.", "Jack London", "\"Getting into Print\" (1903)"],
    ["Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", "Antoine de Saint-Exupéry", "Wind, Sand and Stars (1939)"],
    ["Make good art.", "Neil Gaiman", "commencement address, University of the Arts, 2012"],
    ["Have nothing in your houses that you do not know to be useful, or believe to be beautiful.", "William Morris", "\"The Beauty of Life\" (1880)"],
    ["Ideas are like rabbits. You get a couple and learn how to handle them, and pretty soon you have a dozen.", "John Steinbeck", "interview with Robert van Gelder, April 1947"],
  ]),

  ...more("wisdom", "w", 8, [
    ["Know thyself.", "Delphic maxim", "inscribed at the Temple of Apollo at Delphi"],
    ["There is nothing either good or bad, but thinking makes it so.", "William Shakespeare", "Hamlet, Act 2, Scene 2"],
    ["The first principle is that you must not fool yourself, and you are the easiest person to fool.", "Richard Feynman", "Caltech commencement address, 1974"],
    ["Those who cannot remember the past are condemned to repeat it.", "George Santayana", "The Life of Reason (1905)"],
    ["If I have seen further it is by standing on the shoulders of giants.", "Isaac Newton", "letter to Robert Hooke, 1675"],
    ["No man ever steps in the same river twice.", "Heraclitus", "as reported in Plato's Cratylus"],
    ["The impediment to action advances action. What stands in the way becomes the way.", "Marcus Aurelius", "Meditations 5.20, translated by Gregory Hays"],
    ["Men are disturbed not by things, but by the views which they take of them.", "Epictetus", "Enchiridion, 5"],
    ["To know that we know what we know, and that we do not know what we do not know, that is true knowledge.", "Confucius", "Analects 2.17, as rendered in Thoreau's Walden"],
    ["Never attribute to malice that which is adequately explained by stupidity.", "Hanlon's razor", "Robert J. Hanlon, in Murphy's Law Book Two (1980)"],
    ["To err is human; to forgive, divine.", "Alexander Pope", "An Essay on Criticism (1711)"],
    ["Doubt is not a pleasant condition, but certainty is absurd.", "Voltaire", "letter to Frederick William, Prince of Prussia, 28 November 1770"],
    ["Philosophy begins in wonder.", "Plato", "Theaetetus"],
  ]),

  ...more("adventure", "a", 8, [
    ["We choose to go to the Moon.", "John F. Kennedy", "address at Rice University, 12 September 1962"],
    ["That's one small step for man, one giant leap for mankind.", "Neil Armstrong", "on the Moon, 20 July 1969"],
    ["To boldly go where no man has gone before.", "Star Trek", "opening narration, 1966"],
    ["Second to the right, and straight on till morning.", "J.M. Barrie", "Peter and Wendy (1911)"],
    ["The mountains are calling and I must go.", "John Muir", "letter to his sister Sarah, 3 September 1873"],
    ["Two roads diverged in a wood, and I— I took the one less traveled by, and that has made all the difference.", "Robert Frost", "\"The Road Not Taken\" (1916)"],
    ["Exploration is in our nature. We began as wanderers, and we are wanderers still.", "Carl Sagan", "Cosmos (1980)"],
    ["One does not discover new lands without consenting to lose sight of the shore for a very long time.", "André Gide", "The Counterfeiters (1925)"],
    ["For my part, I travel not to go anywhere, but to go. I travel for travel's sake. The great affair is to move.", "Robert Louis Stevenson", "Travels with a Donkey in the Cévennes (1879)"],
    ["I rarely end up where I was intending to go, but often I end up somewhere that I needed to be.", "Douglas Adams", "The Long Dark Tea-Time of the Soul (1988)"],
    ["To strive, to seek, to find, and not to yield.", "Alfred, Lord Tennyson", "\"Ulysses\" (1842)"],
    ["It is good to have an end to journey toward; but it is the journey that matters, in the end.", "Ursula K. Le Guin", "The Left Hand of Darkness (1969)"],
    ["Life is either a daring adventure, or nothing.", "Helen Keller", "The Open Door (1957)"],
    ["To infinity and beyond!", "Buzz Lightyear", "Toy Story (1995)"],
  ]),

  ...more("friendship", "r", 8, [
    ["The language of friendship is not words, but meanings.", "Henry David Thoreau", "A Week on the Concord and Merrimack Rivers (1849)"],
    ["Each friend represents a world in us, a world possibly not born until they arrive.", "Anaïs Nin", "The Diary of Anaïs Nin, volume 1 (1931-1934)"],
    ["Friendship improves happiness and abates misery, by the doubling of our joy and the dividing of our grief.", "Joseph Addison", "The Spectator, No. 68 (1711)"],
    ["Of all the things which wisdom provides to make us entirely happy, much the greatest is the possession of friendship.", "Epicurus", "Principal Doctrines, 27"],
    ["Without friends no one would choose to live, though he had all other goods.", "Aristotle", "Nicomachean Ethics, Book VIII"],
    ["No friendship is an accident.", "O. Henry", "\"Telemachus, Friend\", in Heart of the West (1907)"],
    ["Some people go to priests; others to poetry; I to my friends.", "Virginia Woolf", "The Waves (1931)"],
    ["I have perceived that to be with those I like is enough.", "Walt Whitman", "\"I Sing the Body Electric\""],
    ["Friendship is a sheltering tree.", "Samuel Taylor Coleridge", "\"Youth and Age\" (1834)"],
    ["The better part of one's life consists of his friendships.", "Abraham Lincoln", "letter to Joseph Gillespie, 13 July 1849"],
    ["Good friends, good books, and a sleepy conscience: this is the ideal life.", "Mark Twain", "Notebook, 4 July 1898"],
    ["Things are never quite as scary when you've got a best friend.", "Bill Watterson", "Calvin, in The Indispensable Calvin and Hobbes (1992)"],
    ["In the sweetness of friendship let there be laughter, and sharing of pleasures.", "Kahlil Gibran", "The Prophet (1923)"],
    ["Friendship marks a life even more deeply than love.", "Elie Wiesel", "The Gates of the Forest (1964)"],
  ]),

  ...more("focus", "o", 8, [
    ["Our life is frittered away by detail.", "Henry David Thoreau", "Walden (1854)"],
    ["To do two things at once is to do neither.", "Publilius Syrus", "Sententiae"],
    ["Besides the noble art of getting things done, there is a nobler art of leaving things undone.", "Lin Yutang", "The Importance of Living (1937)"],
    ["Clarity about what matters provides clarity about what does not.", "Cal Newport", "Deep Work (2016)"],
    ["There is surely nothing quite so useless as doing with great efficiency what should not be done at all.", "Peter Drucker", "\"Managing for Business Effectiveness\", Harvard Business Review, May 1963"],
    ["The essence of strategy is choosing what not to do.", "Michael Porter", "\"What Is Strategy?\", Harvard Business Review, 1996"],
    ["Focusing is about saying no.", "Steve Jobs", "Apple Worldwide Developers Conference, 16 May 1997"],
    ["The ability to simplify means to eliminate the unnecessary so that the necessary may speak.", "Hans Hofmann", "Search for the Real and Other Essays (1948)"],
    ["Attention is the rarest and purest form of generosity.", "Simone Weil", "letter to Joë Bousquet, 13 April 1942"],
    ["My experience is what I agree to attend to.", "William James", "The Principles of Psychology (1890)"],
    ["If you chase two rabbits, you will not catch either one.", "Russian proverb", "proverb"],
    ["Slow is smooth. Smooth is fast.", "U.S. Navy SEAL saying", "training maxim"],
    ["Inspiration is for amateurs—the rest of us just show up and get to work.", "Chuck Close", "interview with Joe Fig, 2006, in Inside the Painter's Studio (2009)"],
    ["Concentration is the secret of strength.", "Ralph Waldo Emerson", "The Conduct of Life, \"Power\" (1860)"],
    ["Less, but better.", "Dieter Rams", "\"Weniger, aber besser\", title of his 1995 book"],
    ["Work expands so as to fill the time available for its completion.", "C. Northcote Parkinson", "The Economist, 19 November 1955"],
  ]),

  ...more("gaming", "g", 8, [
    ["War. War never changes.", "Fallout", "opening narration, Fallout (1997)"],
    ["A man chooses; a slave obeys.", "BioShock", "Andrew Ryan, BioShock (2007)"],
    ["The right man in the wrong place can make all the difference in the world.", "Half-Life 2", "the G-Man, Half-Life 2 (2004)"],
    ["Praise the Sun!", "Dark Souls", "Solaire of Astora, Dark Souls (2011)"],
    ["Do a barrel roll!", "Star Fox 64", "Peppy Hare, Star Fox 64 (1997)"],
    ["All your base are belong to us.", "Zero Wing", "the 1991 Mega Drive translation"],
    ["Hey! Listen!", "Zelda: Ocarina of Time", "Navi, The Legend of Zelda: Ocarina of Time (1998)"],
    ["It's-a me, Mario!", "Super Mario 64", "title screen, Super Mario 64 (1996)"],
    ["I used to be an adventurer like you. Then I took an arrow in the knee.", "Skyrim", "a town guard, The Elder Scrolls V: Skyrim (2011)"],
    ["What is a man? A miserable little pile of secrets.", "Castlevania", "Dracula, Castlevania: Symphony of the Night (1997)"],
    ["You have died of dysentery.", "The Oregon Trail", "The Oregon Trail"],
    ["All the best games are easy to learn and difficult to master.", "Nolan Bushnell", "known as Bushnell's Law"],
    ["A strange game. The only winning move is not to play.", "WarGames", "the computer Joshua, WarGames (1983)"],
  ]),
];

/** Everything the backend knows, retired quotes included. */
export const LIBRARY: QuestQuote[] = [...QUEST_QUOTES.map((quote) => ({ ...quote, source: BUILT_IN_SOURCES[quote.id] })), ...MORE];

/** The quotes of one kind that are handed out today. */
export const shelf = (cat: Category) => LIBRARY.filter((quote) => quote.cat === cat && !quote.retired);

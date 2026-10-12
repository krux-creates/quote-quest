import { CATEGORIES, categoryLabel, isCategory } from "@/quest/quotes";
import { shelf } from "@/server/library";

// The quotes backend.
//
//   GET /api/quotes                      the eight categories and how many quotes each holds
//   GET /api/quotes?category=<id>        every quote of that kind, each with its source
//
// The library only changes when the site is redeployed, so an answer can sit in the CDN for an
// hour and be served stale for a day while a fresh one is fetched.
const CACHE = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category");

  if (category === null) {
    const categories = CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: shelf(c.id).length }));
    return Response.json({ categories, total: categories.reduce((n, c) => n + c.count, 0) }, { headers: CACHE });
  }

  if (!isCategory(category)) {
    return Response.json({ error: `There is no category called "${category}".`, categories: CATEGORIES.map((c) => c.id) }, { status: 400 });
  }

  const quotes = shelf(category).map(({ id, cat, text, author, source }) => ({ id, cat, text, author, source }));
  return Response.json({ category, label: categoryLabel(category), count: quotes.length, quotes }, { headers: CACHE });
}

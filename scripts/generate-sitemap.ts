import { createClient } from "@supabase/supabase-js";
import { PUBLIC_PATHS, SITE_URL } from "../src/lib/seoCatalog";
import { cityBounds, cityCategoryPath, isCityCategoryIndexable, type SeoCategoryRow, type SeoCityRow } from "../src/lib/citySeo";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.warn("Sitemap refresh skipped: public backend configuration is unavailable. Keeping the existing sitemap.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const [{ data: cities, error: cityError }, { data: categories, error: catError }] = await Promise.all([
  supabase.from("seo_cities").select("*").eq("is_active", true).order("sort_order"),
  supabase.from("seo_categories").select("*").eq("is_active", true).order("sort_order"),
]);
if (cityError || catError) {
  console.warn("Sitemap refresh skipped: SEO configuration unavailable. Keeping the existing sitemap.");
  process.exit(0);
}

const eligible: string[] = [];
for (const city of (cities || []) as SeoCityRow[]) {
  const b = cityBounds(city);
  for (const category of (categories || []) as SeoCategoryRow[]) {
    const { count, error } = await supabase.from("posts")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true)
      .in("category", category.post_categories)
      .gte("latitude", b.minLat).lte("latitude", b.maxLat)
      .gte("longitude", b.minLng).lte("longitude", b.maxLng);
    if (error) { console.warn(`Eligibility unavailable for ${city.slug}/${category.slug}; excluded.`); continue; }
    const n = count || 0;
    if (n > 0) console.log(`${city.slug}/${category.slug}: ${n} public listings`);
    if (isCityCategoryIndexable(city, category, n)) eligible.push(cityCategoryPath(city.slug, category.slug));
  }
}

const paths = [...new Set([...PUBLIC_PATHS, ...eligible])];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path => `  <url><loc>${SITE_URL}${path === "/" ? "/" : path}</loc></url>`).join("\n")}\n</urlset>\n`;
await Bun.write("public/sitemap.xml", xml);
console.log(`Sitemap refreshed with ${paths.length} public URLs; ${eligible.length} city service pages included.`);

import { createClient } from "@supabase/supabase-js";
import { PUBLIC_PATHS, SITE_URL } from "../src/lib/seoCatalog";
import { LA_CITY, LA_SERVICES, isLaServiceIndexable, laServicePath } from "../src/lib/laServiceCatalog";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.warn("Sitemap refresh skipped: public backend configuration is unavailable. Keeping the existing sitemap.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const eligibleLaPaths: string[] = [];

for (const service of LA_SERVICES) {
  const { count, error } = await supabase.from("posts")
    .select("id", { count: "exact", head: true })
    .eq("is_visible", true)
    .in("category", [...service.keys])
    .gte("latitude", LA_CITY.lat - LA_CITY.latPadding)
    .lte("latitude", LA_CITY.lat + LA_CITY.latPadding)
    .gte("longitude", LA_CITY.lng - LA_CITY.lngPadding)
    .lte("longitude", LA_CITY.lng + LA_CITY.lngPadding);

  if (error) {
    console.warn(`Sitemap eligibility unavailable for Los Angeles ${service.slug}; keeping it excluded.`);
    continue;
  }

  const listingCount = count || 0;
  console.log(`Los Angeles ${service.slug}: ${listingCount} eligible public listings`);
  if (isLaServiceIndexable("ready", listingCount)) eligibleLaPaths.push(laServicePath(service));
}

const paths = [...new Set([...PUBLIC_PATHS, ...eligibleLaPaths])];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path => `  <url><loc>${SITE_URL}${path === "/" ? "/" : path}</loc></url>`).join("\n")}\n</urlset>\n`;
await Bun.write("public/sitemap.xml", xml);
console.log(`Sitemap refreshed with ${paths.length} public URLs; ${eligibleLaPaths.length} Los Angeles service pages included.`);

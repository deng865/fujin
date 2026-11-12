// Pure rules for the automated city × category SEO pages. Config rows come from
// the admin-managed seo_cities / seo_categories tables.
export type SeoCityRow = {
  slug: string; name_en: string; name_zh: string; state: string;
  latitude: number; longitude: number; radius_miles: number;
  intro_en: string; intro_zh: string; is_active: boolean; sort_order: number;
};
export type SeoCategoryRow = {
  slug: string; name_en: string; name_zh: string; post_categories: string[];
  intro_en: string; intro_zh: string; min_listings: number; is_active: boolean; sort_order: number;
};

const MILES_PER_DEG_LAT = 69;

/** Bounding box used only as a server-side filter; never returned to clients. */
export function cityBounds(city: Pick<SeoCityRow, "latitude" | "longitude" | "radius_miles">) {
  const latPad = city.radius_miles / MILES_PER_DEG_LAT;
  const lngPad = city.radius_miles / (MILES_PER_DEG_LAT * Math.cos((city.latitude * Math.PI) / 180));
  return { minLat: city.latitude - latPad, maxLat: city.latitude + latPad, minLng: city.longitude - lngPad, maxLng: city.longitude + lngPad };
}

export function fillCity(template: string, cityName: string) {
  return template.split("{city}").join(cityName);
}

export function cityCategoryPath(citySlug: string, categorySlug: string) {
  return `/cities/${citySlug}/${categorySlug}`;
}

/** A page is indexable only when both rows are active and real listings meet the threshold. */
export function isCityCategoryIndexable(city: { is_active: boolean } | undefined, category: { is_active: boolean; min_listings: number } | undefined, listingCount: number) {
  if (!city?.is_active || !category?.is_active) return false;
  return listingCount >= Math.max(1, category.min_listings);
}

export function cityCategorySeo(city: SeoCityRow, category: SeoCategoryRow) {
  const title = `${city.name_en} ${category.name_en} | ${city.name_zh}${category.name_zh} · 华人街坊`;
  const en = fillCity(category.intro_en, city.name_en);
  const zh = fillCity(category.intro_zh, city.name_zh);
  const description = `${en.slice(0, 110).replace(/\s+\S*$/, "")}… ${city.name_zh}${category.name_zh}真实公开信息。`;
  return { title, description, introEn: en, introZh: zh };
}

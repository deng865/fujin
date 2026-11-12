import { describe, expect, test } from "bun:test";
import { cityBounds, cityCategorySeo, isCityCategoryIndexable, cityCategoryPath } from "./citySeo";

const city = { slug: "dallas", name_en: "Dallas", name_zh: "达拉斯", state: "Texas", latitude: 32.7767, longitude: -96.797, radius_miles: 40, intro_en: "", intro_zh: "", is_active: true, sort_order: 1 };
const cat = { slug: "jobs", name_en: "Chinese Jobs", name_zh: "华人招聘", post_categories: ["jobs"], intro_en: "Jobs in {city}.", intro_zh: "{city}招聘。", min_listings: 1, is_active: true, sort_order: 1 };

describe("city SEO rules", () => {
  test("pages with zero real listings stay noindex", () => expect(isCityCategoryIndexable(city, cat, 0)).toBe(false));
  test("one real listing makes an active page indexable", () => expect(isCityCategoryIndexable(city, cat, 1)).toBe(true));
  test("admin threshold is respected", () => expect(isCityCategoryIndexable(city, { ...cat, min_listings: 3 }, 2)).toBe(false));
  test("disabled city or category is never indexable", () => {
    expect(isCityCategoryIndexable({ ...city, is_active: false }, cat, 10)).toBe(false);
    expect(isCityCategoryIndexable(city, { ...cat, is_active: false }, 10)).toBe(false);
  });
  test("radius in miles becomes a bounding box", () => {
    const b = cityBounds(city);
    expect(b.maxLat - city.latitude).toBeCloseTo(40 / 69, 5);
    expect(b.maxLng - city.longitude).toBeGreaterThan(40 / 69);
  });
  test("templates fill the city name in both languages", () => {
    const s = cityCategorySeo(city, cat);
    expect(s.introEn).toBe("Jobs in Dallas.");
    expect(s.introZh).toBe("达拉斯招聘。");
    expect(s.title).toContain("达拉斯华人招聘");
    expect(cityCategoryPath("dallas", "jobs")).toBe("/cities/dallas/jobs");
  });
});

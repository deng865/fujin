import { describe, expect, test } from "bun:test";
import { canonicalUrl, directorySchema, PUBLIC_PATHS, routeSeo, SEO_CITIES, SEO_CATEGORIES } from "./seoCatalog";

describe("public SEO rules", () => {
  test("canonical addresses use huaren168.online without tracking or fragments", () => {
    expect(canonicalUrl("/cities/dallas/?lat=32.123&lng=-96.777#map")).toBe("https://huaren168.online/cities/dallas");
  });
  test("the eight requested cities are available", () => {
    expect(SEO_CITIES.map(c => c.en)).toEqual(["Los Angeles", "New York", "San Francisco", "Houston", "Seattle", "Chicago", "Dallas", "San Diego"]);
  });
  test("all six requested directories are available", () => {
    expect(SEO_CATEGORIES.map(c => c.zh)).toEqual(["华人招聘", "华人租房", "二手交易", "同城交友", "华人商家", "生活服务"]);
  });
  test("private account, message, payment and raw user listings are never indexable", () => {
    for (const path of ["/profile", "/messages", "/chat/private-id", "/orders", "/favorites", "/admin", "/auth", "/checkout/return", "/post/user-post"]) {
      expect(routeSeo(path).noindex).toBe(true);
      expect(PUBLIC_PATHS.includes(path)).toBe(false);
    }
  });
  test("curated city and service pages are indexable", () => {
    for (const path of PUBLIC_PATHS) expect(routeSeo(path).noindex).toBe(false);
  });
  test("structured directory data does not publish location or profile fields", () => {
    const schema = JSON.stringify(directorySchema("/cities/dallas", "Dallas"));
    for (const field of ["latitude", "longitude", "geo", "address", "telephone", "user_id"]) expect(schema.includes(`"${field}"`)).toBe(false);
  });
});
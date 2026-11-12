import { describe, expect, test } from "bun:test";
import { canonicalUrl, cityServiceSchema, directorySchema, PUBLIC_PATHS, routeSeo, SEO_CITIES, SEO_CATEGORIES } from "./seoCatalog";
import { LA_SERVICES, isLaServiceIndexable, laServicePath } from "./laServiceCatalog";

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
  test("the Los Angeles pilot has exactly the six requested service routes", () => {
    expect(LA_SERVICES.map(laServicePath)).toEqual([
      "/cities/los-angeles/jobs",
      "/cities/los-angeles/rentals",
      "/cities/los-angeles/lawyers",
      "/cities/los-angeles/restaurants",
      "/cities/los-angeles/drivers",
      "/cities/los-angeles/beauty",
    ]);
  });
  test("each Los Angeles service has unique metadata and is conservative by default", () => {
    expect(new Set(LA_SERVICES.map(service => routeSeo(laServicePath(service)).title)).size).toBe(6);
    expect(new Set(LA_SERVICES.map(service => routeSeo(laServicePath(service)).description)).size).toBe(6);
    for (const service of LA_SERVICES) {
      expect(routeSeo(laServicePath(service)).noindex).toBe(true);
      expect(PUBLIC_PATHS.includes(laServicePath(service))).toBe(false);
    }
  });
  test("Los Angeles indexing requires a completed read and at least one real public listing", () => {
    expect(isLaServiceIndexable("loading", 0)).toBe(false);
    expect(isLaServiceIndexable("error", 3)).toBe(false);
    expect(isLaServiceIndexable("ready", 0)).toBe(false);
    expect(isLaServiceIndexable("ready", 1)).toBe(true);
  });
  test("Los Angeles structured data has three breadcrumbs and no private fields", () => {
    const schema = cityServiceSchema("/cities/los-angeles/jobs", "Los Angeles Chinese Jobs", "华人招聘");
    expect(schema["@graph"][1].itemListElement).toHaveLength(3);
    const serialized = JSON.stringify(schema);
    for (const field of ["latitude", "longitude", "geo", "address", "telephone", "user_id"]) expect(serialized.includes(`"${field}"`)).toBe(false);
  });
});
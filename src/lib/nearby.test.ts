import { describe, expect, test } from "bun:test";
import {
  formatMi,
  formatDistance,
  detectDistanceUnit,
  resolveDistanceUnit,
  getRadiusOptions,
  buildWhatsAppUrl,
  sortByDistance,
  MAP_CATEGORIES,
} from "./nearby";

describe("nearby list", () => {
  test("sorts nearest first", () => {
    const o = { lat: 32.7767, lng: -96.797 };
    const r = sortByDistance([
      { id: "far", latitude: 33.5, longitude: -96.797 },
      { id: "near", latitude: 32.78, longitude: -96.797 },
    ], o);
    expect(r.map((p) => p.id)).toEqual(["near", "far"]);
  });
  test("uses miles and 'nearby' under 0.1mi", () => {
    expect(formatMi(0.05)).toBe("附近");
    expect(formatMi(2.34)).toBe("2.3 mi");
  });
  test("no category opens the map, drivers are a list", () => {
    expect(MAP_CATEGORIES.has("driver")).toBe(false);
    expect(MAP_CATEGORIES.has("food")).toBe(false);
  });
});

import { withinRadius, sortByRating } from "./nearby";
describe("filters", () => {
  test("5 mi radius drops farther items", () => {
    expect(withinRadius([{ distance: 4.9 }, { distance: 5.1 }], 5).length).toBe(1);
    expect(withinRadius([{ distance: 40 }], null).length).toBe(1);
  });
  test("highest rated first, unrated last", () => {
    const r = sortByRating([{ id: "n", distance: 1, rating: null }, { id: "a", distance: 3, rating: 4.9 }, { id: "b", distance: 2, rating: 4.2 }]);
    expect(r.map((x) => x.id)).toEqual(["a", "b", "n"]);
  });
});

describe("global distance units", () => {
  test("uses miles in US and UK, kilometers in South America, Africa, China and Europe", () => {
    expect(detectDistanceUnit({ lat: 32.7767, lng: -96.797 })).toBe("mi");   // Dallas, US
    expect(detectDistanceUnit({ lat: 34.0522, lng: -118.2437 })).toBe("mi"); // Los Angeles, US
    expect(detectDistanceUnit({ lat: 51.5074, lng: -0.1278 })).toBe("mi");   // London, UK
    expect(detectDistanceUnit({ lat: -23.5505, lng: -46.6333 })).toBe("km"); // Sao Paulo, Brazil
    expect(detectDistanceUnit({ lat: -1.2921, lng: 36.8219 })).toBe("km");   // Nairobi, Kenya
    expect(detectDistanceUnit({ lat: 6.5244, lng: 3.3792 })).toBe("km");     // Lagos, Nigeria
    expect(detectDistanceUnit({ lat: 31.2304, lng: 121.4737 })).toBe("km");  // Shanghai, China
    expect(detectDistanceUnit({ lat: 48.8566, lng: 2.3522 })).toBe("km");    // Paris, France
  });

  test("formats km and respects manual unit override", () => {
    expect(formatDistance(0.05, "km")).toBe("附近");
    expect(formatDistance(2.5, "km")).toBe("4.0 km");
    expect(formatDistance(10, "km")).toBe("16 km");
    expect(resolveDistanceUnit({ lat: -23.55, lng: -46.63 }, "mi")).toBe("mi");
    expect(resolveDistanceUnit({ lat: 32.77, lng: -96.79 }, "km")).toBe("km");
    expect(getRadiusOptions("km")[0]?.label).toBe("10 km 内");
  });

  test("normalizes WhatsApp numbers into wa.me links", () => {
    expect(buildWhatsAppUrl("+55 11 98765-4321")).toBe("https://wa.me/5511987654321");
    expect(buildWhatsAppUrl("00254 712 345678")).toBe("https://wa.me/254712345678");
    expect(buildWhatsAppUrl("123")).toBeNull();
  });
});

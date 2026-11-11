import { describe, expect, test } from "bun:test";
import { formatMi, sortByDistance, MAP_CATEGORIES } from "./nearby";

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

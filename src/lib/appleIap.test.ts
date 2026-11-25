import { describe, expect, it } from "bun:test";
import { appleProductIdForPlan, paymentChannelForPlatform, planKeyForAppleProduct } from "./appleIap";

describe("Apple IAP product mapping", () => {
  it("keeps Stripe on the web", () => {
    expect(paymentChannelForPlatform(false)).toBe("stripe");
  });

  it("uses Apple In-App Purchase in the native iOS app", () => {
    expect(paymentChannelForPlatform(true)).toBe("apple_iap");
  });
  it("keeps the existing number1 plan benefits attached to life.fujin.app.number1", () => {
    expect(appleProductIdForPlan("number1")).toBe("life.fujin.app.number1");
  });

  it("maps an App Store product back to the unchanged admin plan key", () => {
    expect(planKeyForAppleProduct("life.fujin.app.number1")).toBe("number1");
  });

  it("rejects products from another app", () => {
    expect(planKeyForAppleProduct("com.example.number1")).toBeNull();
  });

  it("does not allow arbitrary product identifiers", () => {
    expect(() => appleProductIdForPlan("../other")).toThrow();
  });
});

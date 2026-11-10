import { describe, expect, test } from "bun:test";
import { canAdvanceRide, getRideDriver, getRidePhase, rideFareEstimate, validRideCoords } from "./rideJourney";

const trip = { tripId: "ride-1", from: "A", to: "B" };
const message = (sender_id: string, type: string, extra = {}) => ({ sender_id, content: JSON.stringify({ ...trip, type, ...extra }) });

describe("ride journey", () => {
  test("accepting the driver's counteroffer keeps the original requester as passenger", () => {
    expect(getRideDriver([message("passenger", "trip"), message("driver", "trip_counter")], trip, "passenger")).toBe("driver");
  });
  test("direct acceptance assigns the accepting user as driver", () => {
    expect(getRideDriver([message("passenger", "trip")], trip, "driver")).toBe("driver");
  });
  test("arrived does not mean passenger is on board", () => {
    expect(getRidePhase([message("driver", "trip_progress", { phase: "arrived" })], trip, "driver")).toBe("arrived");
  });
  test("pickup requires explicit driver confirmation and survives history reload", () => {
    expect(getRidePhase([message("driver", "trip_progress", { phase: "arrived" }), message("driver", "trip_progress", { phase: "destination" })], trip, "driver")).toBe("destination");
  });
  test("another trip or passenger cannot advance this ride", () => {
    expect(getRidePhase([message("passenger", "trip_progress", { phase: "destination" }), message("driver", "trip_progress", { phase: "destination", tripId: "ride-2" })], trip, "driver")).toBe("pickup");
  });
  test("stale progress cannot move a ride backwards", () => {
    expect(canAdvanceRide("destination", "arrived")).toBe(false);
  });
  test("zero coordinates remain valid", () => {
    expect(validRideCoords({ lat: 0, lng: 0 })).toBe(true);
    expect(validRideCoords({ lat: 100, lng: 0 })).toBe(false);
  });
  test("advisory price does not accept missing routes", () => {
    expect(rideFareEstimate(0)).toBeNull();
    expect(rideFareEstimate(8.5)).toEqual({ low: 22, high: 27 });
  });
});
export interface RideCoords { lat: number; lng: number }
export type RidePhase = "pickup" | "arrived" | "destination";
export interface RideMessage { sender_id: string; content: string }
export interface RideTrip { tripId?: string; from: string; to: string; fromCoords?: RideCoords; toCoords?: RideCoords }

export function rideKey(trip: RideTrip): string {
  return trip.tripId || `${trip.from}|${trip.to}`;
}

export function validRideCoords(coords?: RideCoords | null): coords is RideCoords {
  return !!coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
    && Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180;
}

function parse(message: RideMessage) {
  try { return JSON.parse(message.content); } catch { return null; }
}

export function getRideDriver(messages: RideMessage[], trip: RideTrip, acceptSender: string): string {
  const original = messages.find(message => {
    const data = parse(message);
    return data?.type === "trip" && rideKey(data) === rideKey(trip);
  });
  // The original request is from the passenger; an accepted counteroffer can be sent by either party.
  if (original && original.sender_id !== acceptSender) return acceptSender;
  const counter = messages.find(message => {
    const data = parse(message);
    return data?.type === "trip_counter" && rideKey(data) === rideKey(trip) && message.sender_id !== original?.sender_id;
  });
  return counter?.sender_id || acceptSender;
}

export function canAdvanceRide(current: RidePhase, next: RidePhase): boolean {
  return (current === "pickup" && (next === "arrived" || next === "destination"))
    || (current === "arrived" && next === "destination");
}

export function getRidePhase(messages: RideMessage[], trip: RideTrip, driverId: string): RidePhase {
  let phase: RidePhase = "pickup";
  for (const message of messages) {
    const data = parse(message);
    if (data?.type !== "trip_progress" || message.sender_id !== driverId || rideKey(data) !== rideKey(trip)) continue;
    if (canAdvanceRide(phase, data.phase)) phase = data.phase;
  }
  return phase;
}

/** Advisory USD range only; actual fare remains the amount agreed by both parties. */
export function rideFareEstimate(distanceMi: number) {
  if (!Number.isFinite(distanceMi) || distanceMi <= 0) return null;
  const low = Math.ceil(5 + distanceMi * 2);
  return { low, high: Math.ceil(low * 1.2) };
}

export const RIDE_LANDMARKS = [
  { city: "达拉斯", name: "DFW 机场", coords: { lat: 32.8998, lng: -97.0403 } },
  { city: "达拉斯", name: "达拉斯 Love Field", coords: { lat: 32.8481, lng: -96.8518 } },
  { city: "纽约", name: "法拉盛缅街站", coords: { lat: 40.7596, lng: -73.8300 } },
  { city: "纽约", name: "JFK 机场", coords: { lat: 40.6413, lng: -73.7781 } },
  { city: "洛杉矶", name: "LAX 机场", coords: { lat: 33.9416, lng: -118.4085 } },
  { city: "洛杉矶", name: "蒙特利公园市政厅", coords: { lat: 34.0625, lng: -118.1228 } },
  { city: "旧金山", name: "SFO 机场", coords: { lat: 37.6213, lng: -122.3790 } },
  { city: "旧金山", name: "唐人街龙门", coords: { lat: 37.7907, lng: -122.4056 } },
  { city: "芝加哥", name: "O'Hare 机场", coords: { lat: 41.9742, lng: -87.9073 } },
  { city: "芝加哥", name: "华埠广场", coords: { lat: 41.8534, lng: -87.6335 } },
];
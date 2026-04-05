import { useState, useMemo, useEffect } from "react";
import { Route, Navigation, DollarSign, Check, MessageCircle, Send, Star, XCircle, Loader2 } from "lucide-react";
import { TripRatingInput } from "./TripRating";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface RouteInfo {
  coordinates: [number, number][];
  distanceKm: number;
  distanceMi: number;
  durationMin: number;
}

function TripMiniMap({ fromCoords, toCoords, onRouteLoaded }: { fromCoords: { lat: number; lng: number }; toCoords: { lat: number; lng: number }; onRouteLoaded?: (info: RouteInfo) => void }) {
  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);

  const bounds = useMemo(() => {
    const minLng = Math.min(fromCoords.lng, toCoords.lng);
    const maxLng = Math.max(fromCoords.lng, toCoords.lng);
    const minLat = Math.min(fromCoords.lat, toCoords.lat);
    const maxLat = Math.max(fromCoords.lat, toCoords.lat);
    const padLng = Math.max((maxLng - minLng) * 0.3, 0.005);
    const padLat = Math.max((maxLat - minLat) * 0.3, 0.005);
    return [[minLng - padLng, minLat - padLat], [maxLng + padLng, maxLat + padLat]] as [[number, number], [number, number]];
  }, [fromCoords, toCoords]);

  // Fallback straight line
  const fallbackLine = useMemo(() => ({
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: [[fromCoords.lng, fromCoords.lat], [toCoords.lng, toCoords.lat]] },
  }), [fromCoords, toCoords]);

  useEffect(() => {
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates;
          setRouteGeoJson({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
          const km = route.distance / 1000;
          onRouteLoaded?.({
            coordinates: coords,
            distanceKm: km,
            distanceMi: km * 0.621371,
            durationMin: Math.round(route.duration / 60),
          });
        }
      } catch {
        // keep fallback line
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [fromCoords, toCoords]);

  return (
    <div className="w-full h-[140px] rounded-lg mt-2 overflow-hidden">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ bounds, fitBoundsOptions: { padding: 30 } }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        interactive={true}
        scrollZoom={true}
        dragPan={true}
        touchZoomRotate={true}
        attributionControl={false}
      >
        <Source id="route-line" type="geojson" data={routeGeoJson || fallbackLine}>
          <Layer id="route-line-layer" type="line" paint={{ "line-color": "#3b82f6", "line-width": 3, "line-opacity": 0.8 }} layout={{ "line-cap": "round", "line-join": "round" }} />
        </Source>
        <Marker longitude={fromCoords.lng} latitude={fromCoords.lat} anchor="center">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md" />
        </Marker>
        <Marker longitude={toCoords.lng} latitude={toCoords.lat} anchor="center">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md" />
        </Marker>
      </Map>
    </div>
  );
}

interface TripData {
  type: "trip";
  from: string;
  to: string;
  fromCoords?: { lat: number; lng: number };
  toCoords?: { lat: number; lng: number };
  price?: string;
}

export function parseTripMessage(content: string): TripData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip" && parsed.from && parsed.to) return parsed as TripData;
  } catch {}
  return null;
}

export function parseTripAcceptMessage(content: string): { type: "trip_accept"; from: string; to: string; price?: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_accept") return parsed;
  } catch {}
  return null;
}

export function parseTripCounterMessage(content: string): { type: "trip_counter"; from: string; to: string; price: string; originalPrice?: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_counter") return parsed;
  } catch {}
  return null;
}

export function parseTripCancelMessage(content: string): { type: "trip_cancel"; from: string; to: string; cancelledBy: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_cancel") return parsed;
  } catch {}
  return null;
}

interface TripMessageProps {
  content: string;
  isMe: boolean;
  onAccept?: (trip: { from: string; to: string; price?: string }) => void;
  onCounter?: (trip: { from: string; to: string; originalPrice?: string }, newPrice: string) => void;
  onRate?: (trip: { from: string; to: string; price?: string }, rating: number, comment: string) => void;
  onCancel?: (trip: { from: string; to: string; price?: string }) => void;
  hasRated?: boolean;
  isCancelled?: boolean;
}

export default function TripMessage({ content, isMe, onAccept, onCounter, onRate, onCancel, hasRated, isCancelled }: TripMessageProps) {
  const [navTarget, setNavTarget] = useState<"from" | "to" | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [showRatingInput, setShowRatingInput] = useState(false);

  // Handle trip_cancel type
  const cancelData = parseTripCancelMessage(content);
  if (cancelData) {
    return (
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5 text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            已结束预约
          </div>
          <div className="space-y-1 text-xs opacity-60">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span className="break-words">{cancelData.from}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="break-words">{cancelData.to}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle trip_accept type
  const acceptData = parseTripAcceptMessage(content);
  if (acceptData) {
    return (
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
            <Check className="h-3.5 w-3.5" />
            {isCancelled ? "行程已结束" : "已接受行程"}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span className="break-words">{acceptData.from}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="break-words">{acceptData.to}</span>
            </div>
          </div>
          {acceptData.price && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">成交价: ${acceptData.price}</span>
            </div>
          )}
          {/* Cancel booking button - only show when not cancelled */}
          {!isCancelled && onCancel && (
            <button
              onClick={() => onCancel({ from: acceptData.from, to: acceptData.to, price: acceptData.price })}
              className={`w-full flex items-center justify-center gap-1 rounded-lg py-1.5 mt-2 text-xs font-medium transition-colors text-destructive ${isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-accent hover:bg-accent/80"}`}
            >
              <XCircle className="h-3.5 w-3.5" />
              结束预约
            </button>
          )}
          {/* Auto-show rating when cancelled and not yet rated */}
          {isCancelled && onRate && !hasRated && (
            <TripRatingInput onSubmit={(rating, comment) => {
              onRate({ from: acceptData.from, to: acceptData.to, price: acceptData.price }, rating, comment);
            }} />
          )}
          {hasRated && (
            <div className={`flex items-center justify-center gap-1 text-xs mt-2 pt-2 border-t opacity-60 ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <Check className="h-3 w-3" />
              已评价
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle trip_counter type
  const counterData = parseTripCounterMessage(content);
  if (counterData) {
    return (
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            还价
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span className="break-words">{counterData.from}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="break-words">{counterData.to}</span>
            </div>
          </div>
          <div className={`text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
            {counterData.originalPrice && (
              <div className="flex items-center gap-1.5 opacity-60 line-through mb-1">
                <DollarSign className="h-3 w-3 shrink-0" />
                <span>${counterData.originalPrice}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-medium">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span>还价: ${counterData.price}</span>
            </div>
          </div>
          {/* Accept / Counter buttons for the other party */}
          {!isMe && onAccept && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onAccept({ from: counterData.from, to: counterData.to, price: counterData.price })}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
              >
                <Check className="h-3 w-3" />
                接受
              </button>
              {onCounter && (
                <button
                  onClick={() => { setShowCounterInput(true); setCounterPrice(""); }}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  还价
                </button>
              )}
            </div>
          )}
          {!isMe && showCounterInput && onCounter && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs shrink-0">$</span>
              <input
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="输入价格"
                inputMode="decimal"
                autoFocus
                className="flex-1 min-w-0 rounded-md px-2 py-1 text-xs bg-background text-foreground outline-none"
              />
              <button
                onClick={() => {
                  if (counterPrice.trim()) {
                    onCounter({ from: counterData.from, to: counterData.to, originalPrice: counterData.price }, counterPrice.trim());
                    setShowCounterInput(false);
                  }
                }}
                disabled={!counterPrice.trim()}
                className="p-1 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const trip = parseTripMessage(content);
  if (!trip) return null;

  const openNav = (target: "from" | "to", app: "apple" | "google") => {
    const query = target === "from" ? trip.from : trip.to;
    const coords = target === "from" ? trip.fromCoords : trip.toCoords;
    if (app === "apple") {
      window.open(coords
        ? `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}&q=${encodeURIComponent(query)}`
        : `https://maps.apple.com/?daddr=${encodeURIComponent(query)}`, "_blank");
    } else {
      window.open(coords
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`, "_blank");
    }
    setNavTarget(null);
  };

  return (
    <div className="relative">
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
            <Route className="h-3.5 w-3.5" />
            行程信息
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span className="break-words flex-1">{trip.from}</span>
              <button
                onClick={() => setNavTarget(navTarget === "from" ? null : "from")}
                className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                title="导航到出发地"
              >
                <Navigation className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="break-words flex-1">{trip.to}</span>
              <button
                onClick={() => setNavTarget(navTarget === "to" ? null : "to")}
                className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                title="导航到目的地"
              >
                <Navigation className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {/* Mini map preview */}
          {trip.fromCoords && trip.toCoords && (
            <TripMiniMap fromCoords={trip.fromCoords} toCoords={trip.toCoords} />
          )}
          {/* Distance + price */}
          {trip.fromCoords && trip.toCoords && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <Route className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">距离: {haversineKm(trip.fromCoords.lat, trip.fromCoords.lng, trip.toCoords.lat, trip.toCoords.lng).toFixed(1)} km</span>
            </div>
          )}
          {trip.price && (
            <div className={`flex items-center gap-1.5 text-xs ${trip.fromCoords && trip.toCoords ? "mt-1" : "mt-2 pt-2 border-t"} ${!(trip.fromCoords && trip.toCoords) && (isMe ? "border-primary-foreground/20" : "border-border/50")}`}>
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">期望价格: ${trip.price}</span>
            </div>
          )}
          {/* Accept & Counter buttons for the other party */}
          {!isMe && onAccept && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onAccept(trip)}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                {trip.price ? "接受报价" : "接受行程"}
              </button>
              {trip.price && onCounter && (
                <button
                  onClick={() => { setShowCounterInput(true); setCounterPrice(""); }}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  还价
                </button>
              )}
            </div>
          )}
          {!isMe && showCounterInput && onCounter && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs shrink-0">$</span>
              <input
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="输入你的价格"
                inputMode="decimal"
                autoFocus
                className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-xs bg-background text-foreground outline-none"
              />
              <button
                onClick={() => {
                  if (counterPrice.trim()) {
                    onCounter({ from: trip.from, to: trip.to, originalPrice: trip.price }, counterPrice.trim());
                    setShowCounterInput(false);
                  }
                }}
                disabled={!counterPrice.trim()}
                className="p-1.5 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {navTarget && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNavTarget(null)} />
          <div className={`absolute z-50 ${isMe ? "right-0" : "left-0"} mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]`}>
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border/50">
              {navTarget === "from" ? "导航到出发地" : "导航到目的地"}
            </div>
            <button
              onClick={() => openNav(navTarget, "apple")}
              className="w-full px-4 py-3 text-sm text-left hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Apple Maps
            </button>
            <button
              onClick={() => openNav(navTarget, "google")}
              className="w-full px-4 py-3 text-sm text-left hover:bg-accent flex items-center gap-2 border-t border-border/50 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Google Maps
            </button>
          </div>
        </>
      )}
    </div>
  );
}

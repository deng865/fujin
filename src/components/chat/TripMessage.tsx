import { useState, useMemo, useEffect } from "react";
import { Route, Navigation, DollarSign, Check, MessageCircle, Send, Star, XCircle, Loader2, Car } from "lucide-react";
import { TripRatingInput } from "./TripRating";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { openMapNavigationWithQuery } from "@/lib/mapNavigation";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";


interface RouteInfo {
  coordinates: [number, number][];
  distanceKm: number;
  distanceMi: number;
  durationMin: number;
}

function TripMiniMap({ fromCoords, toCoords, onRouteLoaded, onRouteError }: { fromCoords: { lat: number; lng: number }; toCoords: { lat: number; lng: number }; onRouteLoaded?: (info: RouteInfo) => void; onRouteError?: () => void }) {
  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);

  const bounds = useMemo(() => {
    const minLng = Math.min(fromCoords.lng, toCoords.lng);
    const maxLng = Math.max(fromCoords.lng, toCoords.lng);
    const minLat = Math.min(fromCoords.lat, toCoords.lat);
    const maxLat = Math.max(fromCoords.lat, toCoords.lat);
    const padLng = Math.max((maxLng - minLng) * 0.3, 0.005);
    const padLat = Math.max((maxLat - minLat) * 0.3, 0.005);
    return [[minLng - padLng, minLat - padLat], [maxLng + padLng, maxLat + padLat]] as [[number, number], [number, number]];
  }, [fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng]);

  const fallbackLine = useMemo(() => ({
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: [[fromCoords.lng, fromCoords.lat], [toCoords.lng, toCoords.lat]] },
  }), [fromCoords, toCoords]);

  const [routeError, setRouteError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRouteError(false);
    const controller = new AbortController();
    const failRoute = () => {
      if (!cancelled) { setRouteError(true); onRouteError?.(); }
    };
    const timeout = window.setTimeout(() => { controller.abort(); failRoute(); }, 10000);
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          window.clearTimeout(timeout);
          const route = data.routes[0];
          setRouteGeoJson({ type: "Feature", properties: {}, geometry: route.geometry });
          const km = route.distance / 1000;
          onRouteLoaded?.({ coordinates: route.geometry.coordinates, distanceKm: km, distanceMi: km * 0.621371, durationMin: Math.round(route.duration / 60) });
        } else if (!cancelled) { failRoute(); }
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
        failRoute();
      }
    };
    fetchRoute();
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, [fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng]);

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

export function parseTripAcceptMessage(content: string): { type: "trip_accept"; from: string; to: string; price?: string; fromCoords?: { lat: number; lng: number }; toCoords?: { lat: number; lng: number } } | null {
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

export function parseTripCompleteMessage(content: string): { type: "trip_complete"; from: string; to: string; price?: string; completedBy: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_complete") return parsed;
  } catch {}
  return null;
}

export interface TripAcceptNotifyData {
  type: "trip_accept_notify";
  driverName: string;
  driverAvatar: string | null;
  driverRating: number | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  licensePlate: string | null;
  distanceMi: number;
  etaMin: number;
}

export function parseTripAcceptNotify(content: string): TripAcceptNotifyData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_accept_notify") return parsed as TripAcceptNotifyData;
  } catch {}
  return null;
}

// Unified status label
function TripStatusBadge({ isCancelled, isCompleted }: { isCancelled?: boolean; isCompleted?: boolean }) {
  if (isCompleted) return (
    <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
      <Check className="h-3.5 w-3.5" />
      ✅ 订单已完成
    </div>
  );
  if (isCancelled) return (
    <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
      <XCircle className="h-3.5 w-3.5" />
      已结束预约
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
      <Car className="h-3.5 w-3.5" />
      🚗 行程进行中
    </div>
  );
}

function AcceptTripCard({ acceptData, isMe, isCancelled, isCompleted, onCancel, onComplete, onRate, hasRated, completingTrip, cancellingTrip }: {
  acceptData: { from: string; to: string; price?: string; fromCoords?: { lat: number; lng: number }; toCoords?: { lat: number; lng: number } };
  isMe: boolean;
  isCancelled?: boolean;
  isCompleted?: boolean;
  onCancel?: (trip: { from: string; to: string; price?: string }) => void;
  onComplete?: (trip: { from: string; to: string; price?: string }) => void;
  onRate?: (trip: { from: string; to: string; price?: string }, rating: number, comment: string) => void;
  hasRated?: boolean;
  completingTrip?: boolean;
  cancellingTrip?: boolean;
}) {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeFailed, setRouteFailed] = useState(false);
  const [navTarget, setNavTarget] = useState<"from" | "to" | null>(null);
  const tripEnded = isCancelled || isCompleted;
  const showRouteSection = !tripEnded && !!acceptData.fromCoords && !!acceptData.toCoords;
  const buttonsDisabled = completingTrip || cancellingTrip;

  const handleNav = (target: "from" | "to", app: "apple" | "google") => {
    const query = target === "from" ? acceptData.from : acceptData.to;
    const coords = target === "from" ? acceptData.fromCoords : acceptData.toCoords;
    openMapNavigationWithQuery(query, coords, app);
  };

  return (
    <div className="relative">
      <div className={`rounded-2xl overflow-hidden w-[260px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${tripEnded ? "bg-muted/60 text-muted-foreground" : isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <TripStatusBadge isCancelled={isCancelled} isCompleted={isCompleted} />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
                <span className="text-[10px] font-medium text-green-600">出发地</span>
              </div>
              <span className="break-words flex-1 min-w-0">{acceptData.from}</span>
              {!tripEnded && (
                <button
                  onClick={() => setNavTarget(navTarget === "from" ? null : "from")}
                  className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                  title="导航到出发地"
                >
                  <Navigation className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                <span className="text-[10px] font-medium text-red-500">目的地</span>
              </div>
              <span className="break-words flex-1 min-w-0">{acceptData.to}</span>
              {!tripEnded && (
                <button
                  onClick={() => setNavTarget(navTarget === "to" ? null : "to")}
                  className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                  title="导航到目的地"
                >
                  <Navigation className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {showRouteSection && (
            <TripMiniMap fromCoords={acceptData.fromCoords!} toCoords={acceptData.toCoords!} onRouteLoaded={setRouteInfo} onRouteError={() => setRouteFailed(true)} />
          )}
          {showRouteSection && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <Route className="h-3.5 w-3.5 shrink-0" />
              {routeInfo ? (
                <span className="font-medium">
                  {routeInfo.distanceKm.toFixed(1)} km ({routeInfo.distanceMi.toFixed(1)} mi) · 约 {routeInfo.durationMin} 分钟
                </span>
              ) : routeFailed ? (
                <span className="text-muted-foreground">无法获取路线信息</span>
              ) : (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> 计算路线...
                </span>
              )}
            </div>
          )}
          {acceptData.price && (
            <div className={`flex items-center gap-1.5 text-xs ${showRouteSection ? "mt-1" : "mt-2 pt-2 border-t"} ${!showRouteSection && (isMe ? "border-primary-foreground/20" : "border-border/50")}`}>
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">成交价: ${acceptData.price}</span>
            </div>
          )}
          {/* Action buttons */}
          {!isCancelled && !isCompleted && (onCancel || onComplete) && (
            <div className="flex gap-2 mt-2">
              {onComplete && (
                <button
                  onClick={() => !buttonsDisabled && onComplete({ from: acceptData.from, to: acceptData.to, price: acceptData.price })}
                  disabled={buttonsDisabled}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" : "bg-accent hover:bg-accent/80 text-foreground"}`}
                >
                  {completingTrip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  订单已完成
                </button>
              )}
              {onCancel && (
                <button
                  onClick={() => !buttonsDisabled && onCancel({ from: acceptData.from, to: acceptData.to, price: acceptData.price })}
                  disabled={buttonsDisabled}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-50 text-destructive ${isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-accent hover:bg-accent/80"}`}
                >
                  {cancellingTrip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  结束预约
                </button>
              )}
            </div>
          )}
          {isCompleted && !hasRated && onRate && (
            <div className={`mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                <Star className="h-3.5 w-3.5" />
                请对本次行程评价
              </div>
              <TripRatingInput onSubmit={(rating, comment) => {
                onRate({ from: acceptData.from, to: acceptData.to, price: acceptData.price }, rating, comment);
              }} />
            </div>
          )}
          {hasRated && (
            <div className={`flex items-center justify-center gap-1 text-xs mt-2 pt-2 border-t opacity-60 ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <Check className="h-3 w-3" />
              已评价
            </div>
          )}
        </div>
      </div>

      {navTarget && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNavTarget(null)} />
          <div className={`absolute z-50 top-0 ${isMe ? "right-full mr-1" : "left-full ml-1"} bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]`}>
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border/50">
              {navTarget === "from" ? "导航到出发地" : "导航到目的地"}
            </div>
            <button
              onClick={() => { handleNav(navTarget, "apple"); setNavTarget(null); }}
              className="w-full px-4 py-3 text-sm text-left hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Apple Maps
            </button>
            <button
              onClick={() => { handleNav(navTarget, "google"); setNavTarget(null); }}
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

interface TripMessageProps {
  content: string;
  isMe: boolean;
  isActive?: boolean;
  onAccept?: (trip: { from: string; to: string; price?: string }) => void;
  onCounter?: (trip: { from: string; to: string; originalPrice?: string }, newPrice: string) => void;
  onRate?: (trip: { from: string; to: string; price?: string }, rating: number, comment: string) => void;
  onCancel?: (trip: { from: string; to: string; price?: string }) => void;
  onComplete?: (trip: { from: string; to: string; price?: string }) => void;
  onCounterOpen?: () => void;
  hasRated?: boolean;
  isCancelled?: boolean;
  isCompleted?: boolean;
  acceptingTrip?: boolean;
  completingTrip?: boolean;
  cancellingTrip?: boolean;
}

export default function TripMessage({ content, isMe, isActive, onAccept, onCounter, onRate, onCancel, onComplete, onCounterOpen, hasRated, isCancelled, isCompleted, acceptingTrip, completingTrip, cancellingTrip }: TripMessageProps) {
  const [navTarget, setNavTarget] = useState<"from" | "to" | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [mainRouteFailed, setMainRouteFailed] = useState(false);
  const [counterSending, setCounterSending] = useState(false);

  // Handle trip_accept_notify type
  const notifyData = parseTripAcceptNotify(content);
  if (notifyData) {
    // Hide this card entirely when trip is completed or cancelled — status already shown on AcceptTripCard
    if (isCancelled || isCompleted) return null;
    return (
      <div className={`rounded-2xl overflow-hidden w-[280px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="px-4 py-3 border rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-3 text-emerald-700 dark:text-emerald-400">
            <Car className="h-4 w-4" />
            🚗 司机已接单，正在赶来
          </div>
          <div className="flex items-center justify-between bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">距离你</div>
            <div className="text-sm font-semibold text-foreground">{notifyData.distanceMi.toFixed(1)} miles</div>
          </div>
          <div className="flex items-center justify-between bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg px-3 py-2 mt-1">
            <div className="text-xs text-muted-foreground">预计到达</div>
            <div className="text-sm font-semibold text-foreground">约 {notifyData.etaMin} 分钟</div>
          </div>
        </div>
      </div>
    );
  }

  // Handle trip_complete type - hidden, status shown on AcceptTripCard
  const completeData = parseTripCompleteMessage(content);
  if (completeData) {
    return null;
  }

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
      <AcceptTripCard acceptData={acceptData} isMe={isMe} isCancelled={isCancelled} isCompleted={isCompleted} onCancel={onCancel} onComplete={onComplete} onRate={onRate} hasRated={hasRated} completingTrip={completingTrip} cancellingTrip={cancellingTrip} />
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
            💬 议价中
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
                onClick={() => !acceptingTrip && onAccept({ from: counterData.from, to: counterData.to, price: counterData.price })}
                disabled={acceptingTrip}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors disabled:opacity-50"
              >
                {acceptingTrip ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                接受
              </button>
              {onCounter && (
                <button
                  onClick={() => { setShowCounterInput(true); setCounterPrice(""); onCounterOpen?.(); }}
                  disabled={acceptingTrip}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors disabled:opacity-50"
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
                onClick={async () => {
                  if (counterPrice.trim() && !counterSending) {
                    setCounterSending(true);
                    await onCounter({ from: counterData.from, to: counterData.to, originalPrice: counterData.price }, counterPrice.trim());
                    setCounterSending(false);
                    setShowCounterInput(false);
                  }
                }}
                disabled={!counterPrice.trim() || counterSending}
                className="p-1 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 disabled:opacity-50 transition-colors shrink-0"
              >
                {counterSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const trip = parseTripMessage(content);
  if (!trip) return null;

  if (isActive || isCancelled || isCompleted) {
    return (
      <AcceptTripCard
        acceptData={trip}
        isMe={isMe}
        isCancelled={isCancelled}
        isCompleted={isCompleted}
        onCancel={onCancel}
        onComplete={onComplete}
        onRate={onRate}
        hasRated={hasRated}
        completingTrip={completingTrip}
        cancellingTrip={cancellingTrip}
      />
    );
  }

  const handleNav = (target: "from" | "to", app: "apple" | "google") => {
    const query = target === "from" ? trip.from : trip.to;
    const coords = target === "from" ? trip.fromCoords : trip.toCoords;
    openMapNavigationWithQuery(query, coords, app);
  };

  return (
    <div className="relative">
      <div className={`rounded-2xl overflow-hidden w-[260px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
            <Route className="h-3.5 w-3.5" />
            📋 议价中
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
                <span className="text-[10px] font-medium text-green-600">出发地</span>
              </div>
              <span className="break-words flex-1 min-w-0">{trip.from}</span>
              <button
                onClick={() => setNavTarget(navTarget === "from" ? null : "from")}
                className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                title="导航到出发地"
              >
                <Navigation className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                <span className="text-[10px] font-medium text-red-500">目的地</span>
              </div>
              <span className="break-words flex-1 min-w-0">{trip.to}</span>
              <button
                onClick={() => setNavTarget(navTarget === "to" ? null : "to")}
                className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                title="导航到目的地"
              >
                <Navigation className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {trip.fromCoords && trip.toCoords && (
            <TripMiniMap fromCoords={trip.fromCoords} toCoords={trip.toCoords} onRouteLoaded={setRouteInfo} onRouteError={() => setMainRouteFailed(true)} />
          )}
          {trip.fromCoords && trip.toCoords && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <Route className="h-3.5 w-3.5 shrink-0" />
              {routeInfo ? (
                <span className="font-medium">
                  驾车 {routeInfo.distanceKm.toFixed(1)} km ({routeInfo.distanceMi.toFixed(1)} mi) · 约 {routeInfo.durationMin} 分钟
                </span>
              ) : mainRouteFailed ? (
                <span className="text-muted-foreground">无法获取路线信息</span>
              ) : (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> 计算路线...
                </span>
              )}
            </div>
          )}
          {trip.price && (
            <div className={`flex items-center gap-1.5 text-xs ${trip.fromCoords && trip.toCoords ? "mt-1" : "mt-2 pt-2 border-t"} ${!(trip.fromCoords && trip.toCoords) && (isMe ? "border-primary-foreground/20" : "border-border/50")}`}>
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">出价: ${trip.price}</span>
            </div>
          )}
          {/* Accept & Counter buttons for the other party - with loading */}
          {!isMe && onAccept && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => !acceptingTrip && onAccept(trip)}
                disabled={acceptingTrip}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors disabled:opacity-50"
              >
                {acceptingTrip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {trip.price ? "接受报价" : "接受行程"}
              </button>
              {trip.price && onCounter && (
                <button
                  onClick={() => { setShowCounterInput(true); setCounterPrice(""); onCounterOpen?.(); }}
                  disabled={acceptingTrip}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors disabled:opacity-50"
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
                onClick={async () => {
                  if (counterPrice.trim() && !counterSending) {
                    setCounterSending(true);
                    await onCounter({ from: trip.from, to: trip.to, originalPrice: trip.price }, counterPrice.trim());
                    setCounterSending(false);
                    setShowCounterInput(false);
                  }
                }}
                disabled={!counterPrice.trim() || counterSending}
                className="p-1.5 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 disabled:opacity-50 transition-colors shrink-0"
              >
                {counterSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {navTarget && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNavTarget(null)} />
          <div className={`absolute z-50 top-0 ${isMe ? "right-full mr-1" : "left-full ml-1"} bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]`}>
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border/50">
              {navTarget === "from" ? "导航到出发地" : "导航到目的地"}
            </div>
            <button
              onClick={() => { handleNav(navTarget, "apple"); setNavTarget(null); }}
              className="w-full px-4 py-3 text-sm text-left hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Apple Maps
            </button>
            <button
              onClick={() => { handleNav(navTarget, "google"); setNavTarget(null); }}
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

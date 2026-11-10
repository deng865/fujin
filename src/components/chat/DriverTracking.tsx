import { useState, useEffect, useRef, useCallback } from "react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { Navigation, MapPin, Loader2, ChevronDown, ChevronUp, Phone, Car, LocateFixed, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMapChoiceWithQuery } from "@/components/MapChoiceSheet";
import { validRideCoords, type RideCoords, type RidePhase } from "@/lib/rideJourney";
import type { TripAcceptNotifyData } from "./TripMessage";

interface DriverTrackingProps {
  conversationId: string;
  tripId: string;
  isDriver: boolean;
  phase: RidePhase;
  passengerLocation?: RideCoords;
  destinationLocation?: RideCoords;
  pickupAddress: string;
  destinationAddress: string;
  driverInfo?: TripAcceptNotifyData | null;
  onProgress: (phase: RidePhase) => Promise<void>;
  onQuickMessage: (text: string) => Promise<void>;
  onCall: () => void;
  onComplete: () => void;
  onCancel: () => void;
  busy: boolean;
}

function meters(a: RideCoords, b: RideCoords) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function DriverTracking(props: DriverTrackingProps) {
  const { conversationId, tripId, isDriver, phase, passengerLocation, destinationLocation, pickupAddress, destinationAddress, driverInfo, busy } = props;
  const [driverLocation, setDriverLocation] = useState<RideCoords | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [eta, setEta] = useState<{ mi: number; min: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [lastSeen, setLastSeen] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [routeError, setRouteError] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const mapRef = useRef<MapRef | null>(null);
  const latestLocation = useRef<RideCoords | null>(null);
  const lastRoute = useRef<{ loc: RideCoords; time: number; phase: RidePhase } | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const { openMapChoiceWithQuery, MapChoice } = useMapChoiceWithQuery();
  const target = phase === "destination" ? destinationLocation : passengerLocation;
  const targetAddress = phase === "destination" ? destinationAddress : pickupAddress;
  const stale = lastSeen > 0 && now - lastSeen > 20000;
  const nearPickup = driverLocation && passengerLocation && meters(driverLocation, passengerLocation) <= 80;
  const nearDestination = phase === "destination" && driverLocation && destinationLocation && meters(driverLocation, destinationLocation) <= 80;
  const label = phase === "destination" ? (nearDestination ? "即将到达目的地" : "正在前往目的地")
    : phase === "arrived" ? (isDriver ? "等待乘客上车" : "司机已到达上车点")
    : nearPickup ? "已接近上车点" : isDriver ? "前往上车点" : "司机正在赶来";

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Location is transient; journey progress is persisted by ChatRoom, never inferred from GPS overlap.
  useEffect(() => {
    let watch: number | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let subscribed = false;
    let lastBroadcast = 0;
    let disposed = false;
    const channel = supabase.channel(`trip-track-${conversationId}-${tripId}`);
    const publish = () => {
      if (subscribed && latestLocation.current) void channel.send({ type: "broadcast", event: "driver-location", payload: latestLocation.current });
    };
    channel.on("broadcast", { event: "request-location" }, () => { if (isDriver) publish(); });
    channel.on("broadcast", { event: "driver-location" }, ({ payload }) => {
      if (isDriver || !validRideCoords(payload)) return;
      setDriverLocation(payload);
      setLastSeen(Date.now());
      setLocationError("");
    });
    channel.subscribe(status => {
      if (disposed) return;
      subscribed = status === "SUBSCRIBED";
      if (!subscribed) return;
      if (!isDriver) {
        void channel.send({ type: "broadcast", event: "request-location", payload: {} });
        return;
      }
      if (watch !== null) { publish(); return; }
      if (!navigator.geolocation) { setLocationError("此设备不支持定位，请使用外部地图导航"); return; }
      watch = navigator.geolocation.watchPosition(position => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        latestLocation.current = loc;
        setDriverLocation(loc);
        setLastSeen(Date.now());
        setLocationError("");
        if (Date.now() - lastBroadcast >= 3000) { lastBroadcast = Date.now(); publish(); }
      }, error => setLocationError(error.code === 1 ? "定位权限未开启，请在手机设置中允许定位" : "暂时无法获取位置，仍可使用外部导航"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 });
      heartbeat = setInterval(publish, 5000);
    });
    return () => {
      disposed = true;
      if (watch !== null) navigator.geolocation.clearWatch(watch);
      if (heartbeat) clearInterval(heartbeat);
      void supabase.removeChannel(channel);
      latestLocation.current = null;
    };
  }, [conversationId, tripId, isDriver]);

  useEffect(() => { setRoute(null); setEta(null); setRouteError(false); lastRoute.current = null; }, [phase, target?.lat, target?.lng]);

  // Throttle routing separately from the fast-moving marker. Abort obsolete responses on phase changes.
  const routeInputs = useRef({ driverLocation, target, phase });
  routeInputs.current = { driverLocation, target, phase };
  useEffect(() => {
    let controller: AbortController | null = null;
    let disposed = false;
    const update = async () => {
      const { driverLocation: loc, target: goal, phase: routePhase } = routeInputs.current;
      if (!loc || !validRideCoords(goal)) return;
      const previous = lastRoute.current;
      if (previous && previous.phase === routePhase && (Date.now() - previous.time < 15000 || (!routeError && meters(previous.loc, loc) < 150))) return;
      lastRoute.current = { loc, time: Date.now(), phase: routePhase };
      controller?.abort();
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${loc.lng},${loc.lat};${goal.lng},${goal.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.routes?.[0]) throw new Error("route unavailable");
        if (disposed) return;
        const result = data.routes[0];
        setRoute({ type: "Feature", properties: {}, geometry: result.geometry });
        setEta({ mi: result.distance / 1609.344, min: Math.max(1, Math.round(result.duration / 60)) });
        setRouteError(false);
      } catch {
        if (!disposed) setRouteError(true);
      } finally { clearTimeout(timeout); }
    };
    void update();
    const timer = setInterval(() => void update(), 3000);
    return () => { disposed = true; clearInterval(timer); controller?.abort(); };
  }, [phase, target?.lat, target?.lng]);

  const fitView = useCallback(() => {
    const points: RideCoords[] = [];
    if (driverLocation) points.push(driverLocation);
    if (validRideCoords(target)) points.push(target);
    if (!points.length) return;
    const lngs = points.map(point => point.lng), lats = points.map(point => point.lat);
    mapRef.current?.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 48, maxZoom: 16, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900 });
  }, [driverLocation, target?.lat, target?.lng]);
  const fitted = useRef("");
  useEffect(() => {
    if (!expanded) { fitted.current = ""; return; }
    const key = `${phase}-${!!driverLocation}`;
    if (fitted.current !== key) { fitted.current = key; fitView(); }
  }, [expanded, phase, driverLocation, fitView]);

  const act = async (action: () => Promise<void>) => {
    if (actionBusy || busy) return;
    setActionBusy(true);
    try { await action(); } finally { setActionBusy(false); }
  };
  const mapColor = getComputedStyle(document.documentElement).getPropertyValue(phase === "destination" ? "--ride-destination" : "--ride-pickup").trim();
  return (
    <section aria-label="当前行程" className="shrink-0 w-full max-w-lg mx-auto border-b border-border bg-background">
      <div className="h-14 flex items-center gap-2 px-3">
        <Car className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1" aria-live="polite">
          <div className="text-sm font-semibold truncate">{label}</div>
          <div className="text-xs text-muted-foreground truncate">{stale ? "司机位置更新中" : eta ? `${eta.mi.toFixed(1)} mi · 约 ${eta.min} 分钟` : "等待实时位置"}</div>
        </div>
        {isDriver ? <Button size="sm" onClick={() => openMapChoiceWithQuery(targetAddress, target)}><Navigation />导航</Button>
          : <Button variant="ghost" size="icon" title="联系司机" aria-label="联系司机" onClick={() => callbacks.current.onCall()} disabled={busy}><Phone /></Button>}
        <Button variant="ghost" size="icon" onClick={() => setExpanded(value => !value)} title={expanded ? "收起地图" : "展开地图"} aria-label={expanded ? "收起地图" : "展开地图"} aria-expanded={expanded}>{expanded ? <ChevronUp /> : <ChevronDown />}</Button>
      </div>
      {phase === "arrived" && !isDriver && <div role="status" className="px-3 py-2 bg-primary/10 text-primary text-sm font-semibold">司机已到达，请核对车牌后上车</div>}
      {locationError && <div role="status" className="px-3 pb-2 text-xs text-destructive">{locationError}</div>}
      {!isDriver && <div className="px-3 pb-2 text-xs text-muted-foreground truncate">{driverInfo ? [driverInfo.driverName, driverInfo.vehicleColor, driverInfo.vehicleModel, driverInfo.licensePlate ? `车牌 ${driverInfo.licensePlate}` : "车牌未填写"].filter(Boolean).join(" · ") : "等待司机车辆信息"}</div>}
      {expanded && <>
        <div className="px-3 pb-2 flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="break-words min-w-0">{targetAddress}</span></div>
        <div className="relative h-[30dvh] min-h-[180px] max-h-[340px] w-full bg-muted">
          <Map ref={mapRef} mapboxAccessToken={MAPBOX_TOKEN} initialViewState={{ latitude: target?.lat ?? 32.9, longitude: target?.lng ?? -96.8, zoom: 13 }} onLoad={fitView} mapStyle="mapbox://styles/mapbox/streets-v12" attributionControl={false}>
            {route && <Source id="ride-route" type="geojson" data={route}><Layer id="ride-route-line" type="line" paint={{ "line-color": `hsl(${mapColor})`, "line-width": 5 }} layout={{ "line-cap": "round", "line-join": "round" }} /></Source>}
            {driverLocation && <Marker longitude={driverLocation.lng} latitude={driverLocation.lat}><div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"><Car className="h-4 w-4" /></div></Marker>}
            {validRideCoords(target) && <Marker longitude={target.lng} latitude={target.lat}><MapPin className="h-8 w-8 text-destructive" /></Marker>}
          </Map>
          <div className="absolute right-2 top-2 flex gap-1"><Button variant="secondary" size="icon" title="全览路线" aria-label="全览路线" onClick={fitView}><Route /></Button><Button variant="secondary" size="icon" title="司机当前位置" aria-label="司机当前位置" disabled={!driverLocation} onClick={() => { if (driverLocation) mapRef.current?.flyTo({ center: [driverLocation.lng, driverLocation.lat], zoom: 16 }); }}><LocateFixed /></Button></div>
        </div>
        {routeError && <p className="px-3 py-1 text-xs text-muted-foreground">路线暂不可用，可继续使用外部导航</p>}
        {!isDriver && phase !== "destination" && <div className="flex gap-2 px-3 py-2 flex-wrap">{["我在上车点等您", "在正门右侧等您", "我穿黑色外套"].map(text => <Button key={text} variant="outline" size="sm" disabled={actionBusy || busy} onClick={() => void act(() => callbacks.current.onQuickMessage(text))} className="text-xs">{text}</Button>)}</div>}
      </>}
      {expanded && !isDriver && driverInfo && <div className="flex items-center gap-3 px-3 py-2 border-t border-border">
        {driverInfo.driverAvatar ? <img src={driverInfo.driverAvatar} alt="司机头像" className="h-10 w-10 rounded-full object-cover shrink-0" /> : <Car className="h-8 w-8 text-muted-foreground shrink-0" />}
        <div className="min-w-0 flex-1 text-sm"><div className="font-semibold break-words">{driverInfo.driverName}{driverInfo.driverRating != null ? ` · ★ ${Number(driverInfo.driverRating).toFixed(1)}` : ""}</div><div className="text-xs text-muted-foreground break-words">{[driverInfo.vehicleColor, driverInfo.vehicleModel, driverInfo.licensePlate].filter(Boolean).join(" · ") || "车辆信息未填写"}</div></div>
        <Button variant="outline" size="icon" title="联系司机" aria-label="联系司机" onClick={() => callbacks.current.onCall()} disabled={busy}><Phone /></Button>
      </div>}
      <div className="flex gap-2 px-3 pb-2">
        {isDriver && phase === "pickup" && <Button className="flex-1" size="sm" disabled={busy || actionBusy} onClick={() => void act(() => callbacks.current.onProgress("arrived"))}>{actionBusy ? <Loader2 className="animate-spin" /> : <MapPin />}我已到达上车点</Button>}
        {isDriver && phase !== "destination" && <Button className="flex-1" size="sm" variant={phase === "arrived" ? "default" : "outline"} disabled={busy || actionBusy || !validRideCoords(destinationLocation)} onClick={() => void act(() => callbacks.current.onProgress("destination"))}>已接上乘客</Button>}
        {phase === "destination" && <Button className="flex-1" size="sm" disabled={busy} onClick={() => callbacks.current.onComplete()}>确认送达</Button>}
        <Button variant="ghost" size="sm" disabled={busy || actionBusy} onClick={() => callbacks.current.onCancel()} className="text-destructive">结束预约</Button>
      </div>
      {MapChoice}
    </section>
  );
}

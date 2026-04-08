import { useState, useEffect, useRef } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { Navigation, MapPin, Loader2, ChevronDown, ChevronUp } from "lucide-react";

/** Haversine distance in meters */
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

type Phase = "pickup" | "destination";

interface DriverTrackingProps {
  conversationId: string;
  userId: string;
  isDriver: boolean;
  passengerLocation: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  onClose?: () => void;
}

export default function DriverTracking({
  conversationId,
  userId,
  isDriver,
  passengerLocation,
  destinationLocation,
}: DriverTrackingProps) {
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);
  const [eta, setEta] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("pickup");
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcast = useRef(0);
  const channelRef = useRef<any>(null);

  // Determine current target based on phase
  const currentTarget = phase === "pickup" ? passengerLocation : (destinationLocation ?? passengerLocation);

  // Phase label
  const phaseLabel = phase === "pickup"
    ? (isDriver ? "正在前往乘客位置" : "司机正在前来接您")
    : (isDriver ? "正在前往目的地" : "正在前往目的地");

  // Auto-switch from pickup to destination when driver within 50m of passenger
  useEffect(() => {
    if (phase !== "pickup" || !driverLocation || !destinationLocation) return;
    const dist = haversineMeters(driverLocation, passengerLocation);
    if (dist <= 50) {
      setPhase("destination");
      setRouteGeoJson(null);
      setEta(null);
    }
  }, [driverLocation, passengerLocation, destinationLocation, phase]);

  // Driver: watch position and broadcast
  useEffect(() => {
    if (!isDriver) return;
    const channel = supabase.channel(`trip-track-${conversationId}`);
    channelRef.current = channel;

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setDriverLocation(loc);
            const now = Date.now();
            if (now - lastBroadcast.current > 3000) {
              lastBroadcast.current = now;
              channelRef.current?.send({
                type: "broadcast",
                event: "driver-location",
                payload: loc,
              });
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
        watchIdRef.current = id;
      }
    });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isDriver, conversationId]);

  // Passenger: listen for driver location broadcasts
  useEffect(() => {
    if (isDriver) return;
    const channel = supabase
      .channel(`trip-track-${conversationId}`)
      .on("broadcast", { event: "driver-location" }, ({ payload }) => {
        if (payload?.lat && payload?.lng) {
          setDriverLocation(payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDriver, conversationId]);

  // Fetch route when driver location or target updates
  useEffect(() => {
    if (!driverLocation) return;
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${currentTarget.lng},${currentTarget.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          const route = data.routes[0];
          setRouteGeoJson({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
          setEta({
            distanceKm: route.distance / 1000,
            durationMin: Math.round(route.duration / 60),
          });
        }
      } catch {}
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [driverLocation?.lat, driverLocation?.lng, currentTarget.lat, currentTarget.lng]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="shrink-0 bg-primary/10 border-b border-primary/20 px-4 py-2 w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary">
            {driverLocation ? phaseLabel : "等待司机位置..."}
          </span>
          {eta && (
            <span className="text-muted-foreground">
              · {eta.distanceMi.toFixed(1)} mi · 约{eta.durationMin}分钟
            </span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  const allPoints = [currentTarget];
  if (driverLocation) allPoints.push(driverLocation);
  const bounds = driverLocation
    ? {
        minLng: Math.min(driverLocation.lng, currentTarget.lng),
        maxLng: Math.max(driverLocation.lng, currentTarget.lng),
        minLat: Math.min(driverLocation.lat, currentTarget.lat),
        maxLat: Math.max(driverLocation.lat, currentTarget.lat),
      }
    : null;

  return (
    <div className="shrink-0 border-b border-primary/20">
      <div className="flex items-center justify-between px-4 py-2 bg-primary/10">
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="h-4 w-4 text-primary animate-pulse" />
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary">
            {phase === "pickup" ? "接驾中" : "送驾中"}
          </span>
          <span className="font-medium text-primary">
            {driverLocation ? phaseLabel : "等待司机位置..."}
          </span>
          {eta && (
            <span className="text-muted-foreground">
              · {eta.distanceMi.toFixed(1)} mi · 约{eta.durationMin}分钟
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(false)} className="p-1 hover:bg-accent rounded">
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="h-[200px] w-full">
        {driverLocation ? (
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{
              bounds: bounds
                ? [
                    [bounds.minLng - 0.02, bounds.minLat - 0.02],
                    [bounds.maxLng + 0.02, bounds.maxLat + 0.02],
                  ]
                : undefined,
              latitude: currentTarget.lat,
              longitude: currentTarget.lng,
              zoom: 13,
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            interactive={true}
            attributionControl={false}
          >
            {routeGeoJson && (
              <Source id="tracking-route" type="geojson" data={routeGeoJson}>
                <Layer
                  id="tracking-route-layer"
                  type="line"
                  paint={{
                    "line-color": phase === "pickup" ? "#3b82f6" : "#10b981",
                    "line-width": 4,
                    "line-opacity": 0.8,
                  }}
                  layout={{ "line-cap": "round", "line-join": "round" }}
                />
              </Source>
            )}
            {/* Driver marker */}
            <Marker longitude={driverLocation.lng} latitude={driverLocation.lat} anchor="center">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-blue-500 border-3 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white text-xs">🚗</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              </div>
            </Marker>
            {/* Target marker */}
            <Marker longitude={currentTarget.lng} latitude={currentTarget.lat} anchor="center">
              <div className="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                style={{ backgroundColor: phase === "pickup" ? "#22c55e" : "#ef4444" }}>
                <MapPin className="h-3 w-3 text-white" />
              </div>
            </Marker>
            {/* In destination phase, also show passenger pickup point as a subtle marker */}
            {phase === "destination" && (
              <Marker longitude={passengerLocation.lng} latitude={passengerLocation.lat} anchor="center">
                <div className="w-4 h-4 rounded-full bg-green-400/50 border border-white/50" />
              </Marker>
            )}
          </Map>
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              等待司机共享位置...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

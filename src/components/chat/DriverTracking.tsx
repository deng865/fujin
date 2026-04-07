import { useState, useEffect, useRef, useCallback } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { Navigation, MapPin, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface DriverTrackingProps {
  conversationId: string;
  userId: string;
  isDriver: boolean;
  passengerLocation: { lat: number; lng: number };
  onClose?: () => void;
}

export default function DriverTracking({
  conversationId,
  userId,
  isDriver,
  passengerLocation,
}: DriverTrackingProps) {
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);
  const [eta, setEta] = useState<{ distanceMi: number; durationMin: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcast = useRef(0);

  // Driver: watch position and broadcast
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!isDriver) return;

    // Create and subscribe to channel FIRST, then start watching position
    const channel = supabase.channel(`trip-track-${conversationId}`);
    channelRef.current = channel;

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        // Only start watching after channel is subscribed
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

  // Fetch route when driver location updates
  useEffect(() => {
    if (!driverLocation) return;
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${passengerLocation.lng},${passengerLocation.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          const route = data.routes[0];
          setRouteGeoJson({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
          const km = route.distance / 1000;
          setEta({
            distanceMi: km * 0.621371,
            durationMin: Math.round(route.duration / 60),
          });
        }
      } catch {}
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [driverLocation?.lat, driverLocation?.lng, passengerLocation]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="shrink-0 bg-primary/10 border-b border-primary/20 px-4 py-2 w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary">
            {isDriver ? "正在共享位置" : driverLocation ? "司机正在前来" : "等待司机位置..."}
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

  const bounds = driverLocation
    ? {
        minLng: Math.min(driverLocation.lng, passengerLocation.lng),
        maxLng: Math.max(driverLocation.lng, passengerLocation.lng),
        minLat: Math.min(driverLocation.lat, passengerLocation.lat),
        maxLat: Math.max(driverLocation.lat, passengerLocation.lat),
      }
    : null;

  return (
    <div className="shrink-0 border-b border-primary/20">
      <div className="flex items-center justify-between px-4 py-2 bg-primary/10">
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="h-4 w-4 text-primary animate-pulse" />
          <span className="font-medium text-primary">
            {isDriver ? "正在共享您的位置" : driverLocation ? "司机正在前来" : "等待司机位置..."}
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
              latitude: passengerLocation.lat,
              longitude: passengerLocation.lng,
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
                    "line-color": "#3b82f6",
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
            {/* Passenger marker */}
            <Marker longitude={passengerLocation.lng} latitude={passengerLocation.lat} anchor="center">
              <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-md flex items-center justify-center">
                <MapPin className="h-3 w-3 text-white" />
              </div>
            </Marker>
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

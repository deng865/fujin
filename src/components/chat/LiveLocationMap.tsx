import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Navigation, Radio, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8; // miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

interface LiveLocationMapProps {
  conversationId: string;
  userId: string;
  otherUserId: string;
  myName: string;
  otherName: string;
  initialMyPos?: { lat: number; lng: number } | null;
  initialOtherPos?: { lat: number; lng: number } | null;
  onClose: () => void;
}

export default function LiveLocationMap({
  conversationId,
  userId,
  otherUserId,
  myName,
  otherName,
  initialMyPos,
  initialOtherPos,
  onClose,
}: LiveLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const otherMarkerRef = useRef<any>(null);
  const mapInitedRef = useRef(false);
  const mapboxRef = useRef<any>(null);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(initialMyPos || null);
  const [otherPos, setOtherPos] = useState<{ lat: number; lng: number } | null>(initialOtherPos || null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Subscribe to channel — receive-only, no broadcasting (Banner handles that)
  useEffect(() => {
    const ch = supabase.channel(`live-loc-map-view-${conversationId}`);

    ch.on("broadcast", { event: "live-location" }, (payload: any) => {
      const p = payload?.payload;
      if (!p) return;
      if (p.userId === otherUserId) {
        setOtherPos({ lat: p.lat, lng: p.lng });
      } else if (p.userId === userId) {
        setMyPos({ lat: p.lat, lng: p.lng });
      }
    });

    ch.on("broadcast", { event: "live-location-stop" }, (payload: any) => {
      if (payload?.payload?.userId === otherUserId) {
        setOtherPos(null);
      }
    });

    // Also subscribe to the same channel as Banner to receive broadcasts
    const mainCh = supabase.channel(`live-loc-${conversationId}`);
    mainCh.on("broadcast", { event: "live-location" }, (payload: any) => {
      const p = payload?.payload;
      if (!p) return;
      if (p.userId === otherUserId) {
        setOtherPos({ lat: p.lat, lng: p.lng });
      } else if (p.userId === userId) {
        setMyPos({ lat: p.lat, lng: p.lng });
      }
    });
    mainCh.on("broadcast", { event: "live-location-stop" }, (payload: any) => {
      if (payload?.payload?.userId === otherUserId) {
        setOtherPos(null);
      }
    });

    ch.subscribe();
    mainCh.subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(mainCh);
    };
  }, [conversationId, userId, otherUserId]);

  // Also get own GPS to keep myPos updated (in case Banner hasn't started yet or we opened map independently)
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      (err) => {
        if (err.code === 1) setGeoError("定位权限被拒绝");
        else if (err.code === 3) setGeoError("定位超时");
        else setGeoError("无法获取定位");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // First available center for map init
  const firstCenter = useMemo(() => myPos || otherPos, [myPos, otherPos]);

  // Init map when first center is available
  useEffect(() => {
    if (!firstCenter || mapInitedRef.current || !mapContainerRef.current || !MAPBOX_TOKEN) return;
    mapInitedRef.current = true;

    import("mapbox-gl").then((mapboxgl) => {
      if (!mapContainerRef.current) return;
      (mapboxgl as any).accessToken = MAPBOX_TOKEN;
      mapboxRef.current = mapboxgl;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [firstCenter.lng, firstCenter.lat],
        zoom: 15,
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      mapInitedRef.current = false;
    };
  }, [firstCenter]);

  // Create / update my marker
  useEffect(() => {
    if (!myPos || !mapRef.current || !mapboxRef.current) return;
    const mapboxgl = mapboxRef.current;
    if (!myMarkerRef.current) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">我</div>`;
      myMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([myPos.lng, myPos.lat])
        .addTo(mapRef.current);
    } else {
      myMarkerRef.current.setLngLat([myPos.lng, myPos.lat]);
    }
  }, [myPos]);

  // Create / update other marker
  useEffect(() => {
    if (!otherPos || !mapRef.current || !mapboxRef.current) return;
    const mapboxgl = mapboxRef.current;
    if (!otherMarkerRef.current) {
      const initial = (otherName || "对").charAt(0);
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">${initial}</div>`;
      otherMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([otherPos.lng, otherPos.lat])
        .addTo(mapRef.current);

      // Fit bounds if both available
      if (myPos) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([myPos.lng, myPos.lat]);
        bounds.extend([otherPos.lng, otherPos.lat]);
        mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 16 });
      }
    } else {
      otherMarkerRef.current.setLngLat([otherPos.lng, otherPos.lat]);
    }
  }, [otherPos, otherName, myPos]);

  const fitBounds = useCallback(() => {
    if (!mapRef.current || !mapboxRef.current || !myPos || !otherPos) return;
    const mapboxgl = mapboxRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([myPos.lng, myPos.lat]);
    bounds.extend([otherPos.lng, otherPos.lat]);
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 16 });
  }, [myPos, otherPos]);

  const distance = useMemo(() => {
    if (!myPos || !otherPos) return null;
    return haversineDistance(myPos, otherPos);
  }, [myPos, otherPos]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur">
        <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-full">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-green-500 animate-pulse" />
          <span className="text-sm font-semibold">实时位置共享</span>
        </div>
        <button onClick={fitBounds} className="p-1.5 hover:bg-accent rounded-full" disabled={!myPos || !otherPos}>
          <Navigation className="h-5 w-5" />
        </button>
      </div>

      {/* Distance bar */}
      {distance !== null && (
        <div className="shrink-0 bg-primary/10 px-4 py-1.5 text-center">
          <span className="text-sm font-medium text-primary">
            距离: {distance < 0.1 ? `${Math.round(distance * 5280)} ft` : `${distance.toFixed(1)} mi`}
          </span>
        </div>
      )}

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 relative">
        {!firstCenter && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="flex flex-col items-center gap-2">
              {geoError ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <span className="text-sm text-destructive">{geoError}</span>
                  <button
                    onClick={() => {
                      setGeoError(null);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                        () => setGeoError("定位失败"),
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                    className="text-xs text-primary underline mt-1"
                  >
                    重试
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">正在获取位置...</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-background flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-muted-foreground">{myName || "我"}</span>
          {!myPos && !geoError && <span className="text-xs text-muted-foreground/60">(定位中...)</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">{otherName || "对方"}</span>
          {!otherPos && <span className="text-xs text-muted-foreground/60">(等待中...)</span>}
        </div>
      </div>
    </div>
  );
}

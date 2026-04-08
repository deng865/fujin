import { useState, useEffect, useRef, useCallback } from "react";
import { X, Navigation, Radio, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

interface LiveLocationMapProps {
  conversationId: string;
  userId: string;
  otherUserId: string;
  myName: string;
  otherName: string;
  onClose: () => void;
}

export default function LiveLocationMap({
  conversationId,
  userId,
  otherUserId,
  myName,
  otherName,
  onClose,
}: LiveLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const otherMarkerRef = useRef<any>(null);
  const mapInitedRef = useRef(false);
  const mapboxRef = useRef<any>(null);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [otherPos, setOtherPos] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);

  // Subscribe to unified channel and broadcast own position
  useEffect(() => {
    const ch = supabase.channel(`live-loc-${conversationId}`);
    channelRef.current = ch;

    ch.on("broadcast", { event: "live-location" }, (payload: any) => {
      const p = payload?.payload;
      if (p && p.userId === otherUserId) {
        setOtherPos({ lat: p.lat, lng: p.lng });
      }
    });

    ch.on("broadcast", { event: "live-location-stop" }, (payload: any) => {
      if (payload?.payload?.userId === otherUserId) {
        setOtherPos(null);
      }
    });

    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMyPos(coords);
            ch.send({
              type: "broadcast",
              event: "live-location",
              payload: {
                userId,
                lat: coords.lat,
                lng: coords.lng,
                timestamp: Date.now(),
              },
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      supabase.removeChannel(ch);
    };
  }, [conversationId, userId, otherUserId]);

  // Init map only after first GPS fix
  useEffect(() => {
    if (!myPos || mapInitedRef.current || !mapContainerRef.current || !MAPBOX_TOKEN) return;
    mapInitedRef.current = true;

    import("mapbox-gl").then((mapboxgl) => {
      if (!mapContainerRef.current) return;
      (mapboxgl as any).accessToken = MAPBOX_TOKEN;
      mapboxRef.current = mapboxgl;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [myPos.lng, myPos.lat],
        zoom: 15,
      });

      mapRef.current = map;

      // My marker (blue)
      const myEl = document.createElement("div");
      myEl.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">我</div>`;
      myMarkerRef.current = new mapboxgl.Marker({ element: myEl })
        .setLngLat([myPos.lng, myPos.lat])
        .addTo(map);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      mapInitedRef.current = false;
    };
  }, [myPos]);

  // Update my marker position
  useEffect(() => {
    if (myPos && myMarkerRef.current) {
      myMarkerRef.current.setLngLat([myPos.lng, myPos.lat]);
    }
  }, [myPos]);

  // Create or update other marker lazily
  useEffect(() => {
    if (!otherPos || !mapRef.current || !mapboxRef.current) return;

    if (!otherMarkerRef.current) {
      const mapboxgl = mapboxRef.current;
      const initial = (otherName || "对").charAt(0);
      const otherEl = document.createElement("div");
      otherEl.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">${initial}</div>`;
      otherMarkerRef.current = new mapboxgl.Marker({ element: otherEl })
        .setLngLat([otherPos.lng, otherPos.lat])
        .addTo(mapRef.current);

      // Fit bounds on first appearance
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

  // Fit both markers
  const fitBounds = useCallback(() => {
    if (!mapRef.current || !mapboxRef.current || !myPos || !otherPos) return;
    const mapboxgl = mapboxRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([myPos.lng, myPos.lat]);
    bounds.extend([otherPos.lng, otherPos.lat]);
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 16 });
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
        <button onClick={fitBounds} className="p-1.5 hover:bg-accent rounded-full">
          <Navigation className="h-5 w-5" />
        </button>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 relative">
        {!myPos && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">正在获取位置...</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-background flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-muted-foreground">{myName || "我"}</span>
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

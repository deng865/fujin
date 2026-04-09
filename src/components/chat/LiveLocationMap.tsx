import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Navigation, Radio, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { hasMeaningfulPositionChange, haversineMiles, LiveLocationPosition } from "@/lib/liveLocation";

interface LiveLocationMapProps {
  conversationId: string;
  userId: string;
  otherUserId: string;
  myName: string;
  otherName: string;
  initialMyPos?: { lat: number; lng: number } | null;
  initialOtherPos?: { lat: number; lng: number } | null;
  myLocationError?: string | null;
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
  myLocationError,
  onClose,
}: LiveLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const otherMarkerRef = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const hasAutoFitRef = useRef(false);
  const [myPos, setMyPos] = useState<LiveLocationPosition | null>(initialMyPos || null);
  const [otherPos, setOtherPos] = useState<LiveLocationPosition | null>(initialOtherPos || null);
  const [otherStopped, setOtherStopped] = useState(false);

  const updateMyPos = useCallback((next: LiveLocationPosition) => {
    setMyPos((current) => {
      if (current && !hasMeaningfulPositionChange(current, next, 5)) return current;
      return next;
    });
  }, []);

  const updateOtherPos = useCallback((next: LiveLocationPosition) => {
    setOtherStopped(false);
    setOtherPos((current) => {
      if (current && !hasMeaningfulPositionChange(current, next, 5)) return current;
      return next;
    });
  }, []);

  // Seed from initial props
  useEffect(() => {
    if (initialMyPos) updateMyPos(initialMyPos);
  }, [initialMyPos, updateMyPos]);

  useEffect(() => {
    if (initialOtherPos) updateOtherPos(initialOtherPos);
  }, [initialOtherPos, updateOtherPos]);

  // Fallback: get own GPS position directly if no initialMyPos
  useEffect(() => {
    if (initialMyPos || myPos) return; // already have position
    if (!navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          updateMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      () => {}, // errors handled by banner
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    return () => { cancelled = true; };
  }, [initialMyPos, myPos, updateMyPos]);

  useEffect(() => {
    const ch = supabase.channel(`live-loc-${conversationId}`, { config: { broadcast: { self: true } } });

    ch.on("broadcast", { event: "live-location" }, (payload: any) => {
      const p = payload?.payload;
      if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") return;

      const next = { lat: p.lat, lng: p.lng };

      if (p.userId === otherUserId) {
        updateOtherPos(next);
      } else if (p.userId === userId) {
        updateMyPos(next);
      }
    });

    ch.on("broadcast", { event: "live-location-stop" }, (payload: any) => {
      const stoppedUserId = payload?.payload?.userId;

      if (stoppedUserId === otherUserId) {
        setOtherPos(null);
        setOtherStopped(true);
      }

      if (stoppedUserId === userId) {
        setMyPos(null);
      }
    });

    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, otherUserId, updateMyPos, updateOtherPos, userId]);

  // First available center for map init
  const firstCenter = useMemo(() => myPos || otherPos, [myPos, otherPos]);

  // Init map only once after we get the first usable coordinate.
  useEffect(() => {
    if (!firstCenter || mapRef.current || !mapContainerRef.current || !MAPBOX_TOKEN) return;

    let cancelled = false;

    import("mapbox-gl").then((mapboxgl) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;
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
      cancelled = true;
    };
  }, [firstCenter]);

  useEffect(() => {
    return () => {
      myMarkerRef.current?.remove();
      otherMarkerRef.current?.remove();
      mapRef.current?.remove();
      myMarkerRef.current = null;
      otherMarkerRef.current = null;
      mapRef.current = null;
      mapboxRef.current = null;
      hasAutoFitRef.current = false;
    };
  }, []);

  // Create / update my marker
  useEffect(() => {
    if (!mapRef.current || !mapboxRef.current) return;

    if (!myPos) {
      myMarkerRef.current?.remove();
      myMarkerRef.current = null;
      return;
    }

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
    if (!mapRef.current || !mapboxRef.current) return;

    if (!otherPos) {
      otherMarkerRef.current?.remove();
      otherMarkerRef.current = null;
      return;
    }

    const mapboxgl = mapboxRef.current;
    if (!otherMarkerRef.current) {
      const initial = (otherName || "对").charAt(0);
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">${initial}</div>`;
      otherMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([otherPos.lng, otherPos.lat])
        .addTo(mapRef.current);
    } else {
      otherMarkerRef.current.setLngLat([otherPos.lng, otherPos.lat]);
    }
  }, [otherName, otherPos]);

  const fitBounds = useCallback(() => {
    if (!mapRef.current || !mapboxRef.current || !myPos || !otherPos) return;
    const mapboxgl = mapboxRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([myPos.lng, myPos.lat]);
    bounds.extend([otherPos.lng, otherPos.lat]);
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 16 });
  }, [myPos, otherPos]);

  useEffect(() => {
    if (!myPos || !otherPos || hasAutoFitRef.current) return;

    hasAutoFitRef.current = true;
    const timeoutId = window.setTimeout(() => {
      fitBounds();
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [fitBounds, myPos, otherPos]);

  const distance = useMemo(() => {
    if (!myPos || !otherPos) return null;
    return haversineMiles(myPos, otherPos);
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
            距离: {distance.toFixed(distance < 1 ? 2 : 1)} mi
          </span>
        </div>
      )}

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 relative">
        {!firstCenter && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="flex flex-col items-center gap-2">
              {myLocationError ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <span className="text-sm text-destructive">{myLocationError}</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">正在同步实时位置...</span>
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
          {!myPos && !myLocationError && <span className="text-xs text-muted-foreground/60">(定位中...)</span>}
          {!myPos && myLocationError && <span className="text-xs text-destructive">({myLocationError})</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">{otherName || "对方"}</span>
          {!otherPos && !otherStopped && <span className="text-xs text-muted-foreground/60">(等待中...)</span>}
          {!otherPos && otherStopped && <span className="text-xs text-muted-foreground/60">(已结束)</span>}
        </div>
      </div>
    </div>
  );
}

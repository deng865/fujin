import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Navigation, Radio, Loader2, AlertTriangle, StopCircle, Crosshair, Car } from "lucide-react";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { LiveLocationPosition } from "@/lib/liveLocation";

interface RouteInfo {
  distance: string;
  duration: string;
}

interface LiveLocationMapProps {
  conversationId: string;
  userId: string;
  otherUserId: string;
  myName: string;
  otherName: string;
  myAvatarUrl?: string | null;
  otherAvatarUrl?: string | null;
  initialMyPos?: { lat: number; lng: number } | null;
  initialOtherPos?: { lat: number; lng: number } | null;
  myLocationError?: string | null;
  onClose: () => void;
  onStopShare?: () => void;
  isActive?: boolean;
  sharedChannelRef?: React.RefObject<any>;
}

export default function LiveLocationMap({
  conversationId,
  userId,
  otherUserId,
  myName,
  otherName,
  myAvatarUrl,
  otherAvatarUrl,
  initialMyPos,
  initialOtherPos,
  myLocationError,
  onClose,
  onStopShare,
  isActive,
  sharedChannelRef,
}: LiveLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const otherMarkerRef = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const hasAutoFitRef = useRef(false);
  const routeTimerRef = useRef<number | null>(null);
  const mapLoadedRef = useRef(false);

  const [myPos, setMyPos] = useState<LiveLocationPosition | null>(initialMyPos || null);
  const [otherPos, setOtherPos] = useState<LiveLocationPosition | null>(initialOtherPos || null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  useEffect(() => {
    if (initialOtherPos) setOtherPos(initialOtherPos);
  }, [initialOtherPos]);

  // Listen for partner broadcasts via the shared channel from Banner
  useEffect(() => {
    const ch = sharedChannelRef?.current;
    if (!ch || !otherUserId) return;

    console.log("[LiveLocationMap] 正在监听 partner_id:", otherUserId);

    const handler = (msg: any) => {
      const p = msg?.payload;
      if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") return;
      if (p.userId === otherUserId) {
        console.log("[LiveLocationMap] 收到对方坐标:", p.lat, p.lng);
        setOtherPos({ lat: p.lat, lng: p.lng });
      }
    };

    ch.on("broadcast", { event: "live-location" }, handler);

    // If channel is already subscribed, no need to re-subscribe
    // The Banner manages the channel lifecycle

    return () => {
      // Note: Supabase JS v2 does not support removing individual listeners,
      // but the channel itself will be cleaned up by Banner's effect.
    };
  }, [sharedChannelRef, otherUserId]);

  // Sync myPos from Banner via props (single source of truth)
  useEffect(() => {
    if (initialMyPos) setMyPos(initialMyPos);
  }, [initialMyPos]);

  const firstCenter = useMemo(() => myPos || otherPos, [myPos, otherPos]);

  // Init map
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
      map.on("load", () => {
        mapLoadedRef.current = true;
        // Add empty route source + layer
        map.addSource("route", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.7, "line-dasharray": [2, 1] },
        });
      });
      mapRef.current = map;
    });
    return () => { cancelled = true; };
  }, [firstCenter]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      myMarkerRef.current?.remove();
      otherMarkerRef.current?.remove();
      mapRef.current?.remove();
      myMarkerRef.current = null;
      otherMarkerRef.current = null;
      mapRef.current = null;
      mapboxRef.current = null;
      hasAutoFitRef.current = false;
      mapLoadedRef.current = false;
    };
  }, []);

  // Fetch driving route with 15s debounce + 100m movement threshold
  const lastRoutePosRef = useRef<{ my: LiveLocationPosition; other: LiveLocationPosition } | null>(null);
  const haversineM = useCallback((a: LiveLocationPosition, b: LiveLocationPosition) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }, []);

  useEffect(() => {
    if (!myPos || !otherPos || !MAPBOX_TOKEN) return;

    // Skip if neither party moved > 100m since last route fetch
    const prev = lastRoutePosRef.current;
    if (prev) {
      const myMoved = haversineM(prev.my, myPos);
      const otherMoved = haversineM(prev.other, otherPos);
      if (myMoved < 100 && otherMoved < 100) return;
    }

    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);

    routeTimerRef.current = window.setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${myPos.lng},${myPos.lat};${otherPos.lng},${otherPos.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const route = data.routes?.[0];
        if (!route) return;

        lastRoutePosRef.current = { my: myPos, other: otherPos };

        const distMi = (route.distance / 1609.344);
        const durMin = Math.round(route.duration / 60);
        setRouteInfo({
          distance: distMi < 0.1 ? `${Math.round(route.distance)} m` : `${distMi.toFixed(1)} mi`,
          duration: durMin < 1 ? "< 1 分钟" : `约 ${durMin} 分钟`,
        });

        // Update route on map
        if (mapRef.current && mapLoadedRef.current) {
          const src = mapRef.current.getSource("route");
          if (src) {
            src.setData({
              type: "Feature",
              geometry: route.geometry,
              properties: {},
            });
          }
        }
      } catch {
        // silently fail
      }
    }, 15000);

    return () => { if (routeTimerRef.current) clearTimeout(routeTimerRef.current); };
  }, [myPos, otherPos, haversineM]);

  const createMarkerEl = useCallback((avatarUrl: string | null | undefined, fallbackChar: string, borderColor: string) => {
    const el = document.createElement("div");
    const size = 40;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "50%";
    el.style.border = `3px solid ${borderColor}`;
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,.3)";
    el.style.overflow = "hidden";
    el.style.background = avatarUrl ? "#e5e7eb" : borderColor;
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    if (avatarUrl) {
      const img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = fallbackChar;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.onerror = () => {
        img.remove();
        el.style.background = borderColor;
        el.innerHTML = `<span style="color:white;font-size:14px;font-weight:700;">${fallbackChar}</span>`;
      };
      el.appendChild(img);
    } else {
      el.innerHTML = `<span style="color:white;font-size:14px;font-weight:700;">${fallbackChar}</span>`;
    }
    return el;
  }, []);

  // My marker
  useEffect(() => {
    if (!mapRef.current || !mapboxRef.current) return;
    if (!myPos) { myMarkerRef.current?.remove(); myMarkerRef.current = null; return; }
    const mapboxgl = mapboxRef.current;
    if (!myMarkerRef.current) {
      const el = createMarkerEl(myAvatarUrl, (myName || "我").charAt(0), "#3b82f6");
      myMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([myPos.lng, myPos.lat]).addTo(mapRef.current);
    } else {
      myMarkerRef.current.setLngLat([myPos.lng, myPos.lat]);
    }
  }, [myPos, myAvatarUrl, myName, createMarkerEl]);

  // Other marker
  useEffect(() => {
    if (!mapRef.current || !mapboxRef.current) return;
    if (!otherPos) { otherMarkerRef.current?.remove(); otherMarkerRef.current = null; return; }
    const mapboxgl = mapboxRef.current;
    if (!otherMarkerRef.current) {
      const el = createMarkerEl(otherAvatarUrl, (otherName || "对").charAt(0), "#22c55e");
      otherMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([otherPos.lng, otherPos.lat]).addTo(mapRef.current);
    } else {
      otherMarkerRef.current.setLngLat([otherPos.lng, otherPos.lat]);
    }
  }, [otherName, otherPos, otherAvatarUrl, createMarkerEl]);

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
    const t = window.setTimeout(() => fitBounds(), 150);
    return () => window.clearTimeout(t);
  }, [fitBounds, myPos, otherPos]);

  

  const flyToMe = () => {
    if (mapRef.current && myPos) {
      mapRef.current.flyTo({ center: [myPos.lng, myPos.lat], zoom: 16 });
    }
  };

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
        {isActive && onStopShare ? (
          <button
            onClick={onStopShare}
            className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-full text-xs font-semibold hover:bg-destructive/90 transition-colors flex items-center gap-1"
          >
            <StopCircle className="h-3.5 w-3.5" />
            结束共享
          </button>
        ) : (
          <button onClick={fitBounds} className="p-1.5 hover:bg-accent rounded-full" disabled={!myPos || !otherPos}>
            <Navigation className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Route info bar */}
      {routeInfo && (
        <div className="shrink-0 bg-primary/10 px-4 py-1.5 flex items-center justify-center gap-2">
          <Car className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            驾车 {routeInfo.distance} · {routeInfo.duration}
          </span>
        </div>
      )}

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 relative">
        {!firstCenter && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="flex flex-col items-center gap-3">
              {myLocationError ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <span className="text-sm text-destructive">{myLocationError}</span>
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

        {/* My location button */}
        {myPos && (
          <button
            onClick={flyToMe}
            className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-background/90 backdrop-blur shadow-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
            title="我的位置"
          >
            <Crosshair className="h-5 w-5 text-primary" />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-background flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 overflow-hidden bg-blue-500 flex items-center justify-center shrink-0">
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-white">{(myName || "我").charAt(0)}</span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{myName || "我"}</span>
          {!myPos && !myLocationError && <span className="text-xs text-muted-foreground/60">(定位中...)</span>}
          {!myPos && myLocationError && <span className="text-xs text-destructive">({myLocationError})</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-green-500 overflow-hidden bg-green-500 flex items-center justify-center shrink-0">
            {otherAvatarUrl ? (
              <img src={otherAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-white">{(otherName || "对").charAt(0)}</span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{otherName || "对方"}</span>
          {!otherPos && <span className="text-xs text-muted-foreground/60">(等待中...)</span>}
        </div>
      </div>
    </div>
  );
}

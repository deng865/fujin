import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Navigation, Radio, Loader2, AlertTriangle, RefreshCw, StopCircle, Crosshair, Car } from "lucide-react";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { hasMeaningfulPositionChange, LiveLocationPosition } from "@/lib/liveLocation";

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
  /** Shared Supabase channel from LiveLocationBanner — used to listen for partner broadcasts */
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
  const [geoError, setGeoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const updateMyPos = useCallback((next: LiveLocationPosition) => {
    setGeoError(null);
    setMyPos((current) => {
      if (current && !hasMeaningfulPositionChange(current, next, 5)) return current;
      return next;
    });
  }, []);

  useEffect(() => {
    if (initialOtherPos) setOtherPos(initialOtherPos);
  }, [initialOtherPos]);

  useEffect(() => {
    if (initialMyPos) updateMyPos(initialMyPos);
  }, [initialMyPos, updateMyPos]);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("当前设备不支持定位");
      return;
    }
    let cancelled = false;
    const onSuccess = (pos: GeolocationPosition) => {
      if (!cancelled) updateMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };
    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      if (err.code === 1) setGeoError("定位权限被拒绝");
      else if (err.code === 2) setGeoError("定位不可用");
      else setGeoError("定位超时，请重试");
    };
    const opts = { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, opts);
    return () => { cancelled = true; navigator.geolocation.clearWatch(watchId); };
  }, [updateMyPos, retryCount]);

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

  // Fetch driving route with 5s debounce
  useEffect(() => {
    if (!myPos || !otherPos || !MAPBOX_TOKEN) return;
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);

    routeTimerRef.current = window.setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${myPos.lng},${myPos.lat};${otherPos.lng},${otherPos.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const route = data.routes?.[0];
        if (!route) return;

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
    }, 5000);

    return () => { if (routeTimerRef.current) clearTimeout(routeTimerRef.current); };
  }, [myPos, otherPos]);

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

  const handleRetry = () => { setGeoError(null); setRetryCount((c) => c + 1); };

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
              {(geoError || myLocationError) ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <span className="text-sm text-destructive">{geoError || myLocationError}</span>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    重新定位
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
          {!myPos && !geoError && !myLocationError && <span className="text-xs text-muted-foreground/60">(定位中...)</span>}
          {!myPos && (geoError || myLocationError) && <span className="text-xs text-destructive">({geoError || myLocationError})</span>}
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

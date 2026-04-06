import { useState, useEffect, useRef } from "react";
import { X, Navigation, MapPin } from "lucide-react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface InAppNavMapProps {
  lat: number;
  lng: number;
  address?: string;
  onClose: () => void;
}

export default function InAppNavMap({ lat, lng, address, onClose }: InAppNavMapProps) {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(uPos);
        fetchRoute(uPos);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const fetchRoute = async (from: { lat: number; lng: number }) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${lng},${lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      if (data.routes?.[0]) {
        const r = data.routes[0];
        setRoute({
          type: "Feature" as const,
          properties: {},
          geometry: r.geometry,
        });
        const distKm = r.distance / 1000;
        const durMin = Math.round(r.duration / 60);
        setRouteInfo({
          distance: distKm < 1 ? `${Math.round(r.distance)}m` : `${distKm.toFixed(1)}km`,
          duration: durMin < 60 ? `${durMin}分钟` : `${Math.floor(durMin / 60)}小时${durMin % 60}分钟`,
        });
        const coords = r.geometry.coordinates;
        const lngs = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        mapRef.current?.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, duration: 800 }
        );
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 z-10">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold truncate flex-1 text-center mx-2">{address || "导航"}</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          initialViewState={{ longitude: lng, latitude: lat, zoom: 14 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          <NavigationControl position="top-right" showCompass showZoom={false} />
          <Marker longitude={lng} latitude={lat}>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                <MapPin className="h-5 w-5 text-destructive-foreground" />
              </div>
              <div className="w-2 h-2 bg-destructive rounded-full mt-0.5" />
            </div>
          </Marker>
          {userPos && (
            <Marker longitude={userPos.lng} latitude={userPos.lat}>
              <div className="h-4 w-4 rounded-full border-2 border-background shadow-lg" style={{ backgroundColor: "hsl(var(--primary))" }} />
            </Marker>
          )}
          {route && (
            <Source type="geojson" data={route}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  "line-color": "hsl(217, 91%, 60%)",
                  "line-width": 4,
                  "line-opacity": 0.8,
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      <div className="shrink-0 bg-background border-t border-border/50 px-4 py-4 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Navigation className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{address || "目的地"}</p>
            {routeInfo ? (
              <p className="text-xs text-muted-foreground">{routeInfo.distance} · 约 {routeInfo.duration}</p>
            ) : userPos ? (
              <p className="text-xs text-muted-foreground">正在计算路线...</p>
            ) : (
              <p className="text-xs text-muted-foreground">正在获取位置...</p>
            )}
          </div>
          <button
            onClick={() => {
              const ua = navigator.userAgent.toLowerCase();
              if (/iphone|ipad/.test(ua)) {
                window.open(`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, "_blank");
              } else {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank");
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            开始导航
          </button>
        </div>
      </div>
    </div>
  );
}

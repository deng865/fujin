import { useState, useRef, useCallback } from "react";
import { MapPin, Navigation, Loader2, Send, DollarSign, Map, X, Route } from "lucide-react";
import MapGL, { Marker, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface TripSharePanelProps {
  onSend: (from: string, to: string, fromCoords?: { lat: number; lng: number }, toCoords?: { lat: number; lng: number }, price?: string) => void;
  sending: boolean;
}

interface LocationState {
  text: string;
  coords?: { lat: number; lng: number };
}

export default function TripSharePanel({ onSend, sending }: TripSharePanelProps) {
  const [from, setFrom] = useState<LocationState>({ text: "" });
  const [to, setTo] = useState<LocationState>({ text: "" });
  const [price, setPrice] = useState("");
  const [locatingField, setLocatingField] = useState<"from" | "to" | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [mapField, setMapField] = useState<"from" | "to" | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 32.9, lng: -96.8 });
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mapRef = useRef<MapRef>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=zh`
      );
      const data = await res.json();
      return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);

  const handleUseCurrentLocation = async (field: "from" | "to") => {
    setLocatingField(field);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const coords = { lat: latitude, lng: longitude };
      const address = await reverseGeocode(latitude, longitude);
      if (field === "from") {
        setFrom({ text: address, coords });
      } else {
        setTo({ text: address, coords });
      }
    } catch {} finally {
      setLocatingField(null);
    }
  };

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&country=us,ca&limit=5&language=zh`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch { setSuggestions([]); }
  }, []);

  const handleTextChange = (field: "from" | "to", val: string) => {
    if (field === "from") setFrom({ text: val });
    else setTo({ text: val });
    setActiveField(field);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelectSuggestion = (feature: any) => {
    const [lng, lat] = feature.center;
    const loc = { text: feature.place_name, coords: { lat, lng } };
    if (activeField === "from") setFrom(loc);
    else setTo(loc);
    setSuggestions([]);
    setActiveField(null);
  };

  const handleOpenMap = (field: "from" | "to") => {
    const current = field === "from" ? from : to;
    if (current.coords) {
      setMapCenter(current.coords);
      setMapPin(current.coords);
    } else {
      // Try to use current GPS
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMapCenter(c);
          setMapPin(c);
          mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 14, duration: 500 });
        },
        () => {}
      );
      setMapPin(null);
    }
    setMapField(field);
  };

  const handleMapClick = (e: any) => {
    const { lng, lat } = e.lngLat;
    setMapPin({ lat, lng });
  };

  const handleConfirmMapPin = async () => {
    if (!mapPin || !mapField) return;
    const address = await reverseGeocode(mapPin.lat, mapPin.lng);
    if (mapField === "from") {
      setFrom({ text: address, coords: mapPin });
    } else {
      setTo({ text: address, coords: mapPin });
    }
    setMapField(null);
    setMapPin(null);
  };

  const canSend = from.text.trim() && to.text.trim() && !sending;

  // Map picker overlay
  if (mapField) {
    return (
      <div className="max-w-lg mx-auto px-4 pb-3 pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            📍 在地图上选择{mapField === "from" ? "出发地" : "目的地"}
          </span>
          <button onClick={() => setMapField(null)} className="p-1 rounded-lg hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="w-full h-48 rounded-xl border-2 border-border/50 overflow-hidden">
          <MapGL
            ref={mapRef}
            initialViewState={{
              latitude: mapCenter.lat,
              longitude: mapCenter.lng,
              zoom: 14,
            }}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: "100%", height: "100%" }}
            onClick={handleMapClick}
          >
            {mapPin && (
              <Marker
                latitude={mapPin.lat}
                longitude={mapPin.lng}
                anchor="bottom"
                draggable
                onDragEnd={(e) => setMapPin({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
              >
                <MapPin className="h-8 w-8 text-primary drop-shadow-lg" />
              </Marker>
            )}
          </MapGL>
        </div>
        <button
          onClick={handleConfirmMapPin}
          disabled={!mapPin}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          确认位置
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-3 pt-2 space-y-3">
      <div className="text-xs font-medium text-muted-foreground mb-1">📍 发布行程信息</div>
      <div className="space-y-2">
        {/* From field */}
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <input
              value={from.text}
              onChange={(e) => handleTextChange("from", e.target.value)}
              onFocus={() => setActiveField("from")}
              onBlur={() => setTimeout(() => { if (activeField === "from") setActiveField(null); setSuggestions([]); }, 200)}
              placeholder="搜索出发地"
              className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
            <button
              onClick={() => handleUseCurrentLocation("from")}
              disabled={locatingField === "from"}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="当前位置"
            >
              {locatingField === "from" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleOpenMap("from")}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="地图选点"
            >
              <Map className="h-4 w-4" />
            </button>
          </div>
          {activeField === "from" && suggestions.length > 0 && (
            <div className="absolute left-7 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
              {suggestions.map((f) => (
                <button
                  key={f.id}
                  onMouseDown={() => handleSelectSuggestion(f)}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  {f.place_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* To field */}
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <input
              value={to.text}
              onChange={(e) => handleTextChange("to", e.target.value)}
              onFocus={() => setActiveField("to")}
              onBlur={() => setTimeout(() => { if (activeField === "to") setActiveField(null); setSuggestions([]); }, 200)}
              placeholder="搜索目的地"
              className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
            <button
              onClick={() => handleUseCurrentLocation("to")}
              disabled={locatingField === "to"}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="当前位置"
            >
              {locatingField === "to" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleOpenMap("to")}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="地图选点"
            >
              <Map className="h-4 w-4" />
            </button>
          </div>
          {activeField === "to" && suggestions.length > 0 && (
            <div className="absolute left-7 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
              {suggestions.map((f) => (
                <button
                  key={f.id}
                  onMouseDown={() => handleSelectSuggestion(f)}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  {f.place_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="期望价格（选填）"
            inputMode="decimal"
            className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-xs text-muted-foreground shrink-0">USD</span>
        </div>
      </div>
      <button
        onClick={() => canSend && onSend(from.text.trim(), to.text.trim(), from.coords, to.coords, price.trim() || undefined)}
        disabled={!canSend}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        发送行程
      </button>
    </div>
  );
}

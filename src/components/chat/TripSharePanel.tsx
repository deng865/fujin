import { useState, useRef, useCallback, useEffect } from "react";
import { MapPin, Navigation, Loader2, Send, DollarSign, Map, X, Route } from "lucide-react";
import MapGL, { Marker, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RIDE_LANDMARKS, rideFareEstimate, validRideCoords } from "@/lib/rideJourney";

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
  const [city, setCity] = useState("达拉斯");
  const [locatingField, setLocatingField] = useState<"from" | "to" | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [mapField, setMapField] = useState<"from" | "to" | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 32.9, lng: -96.8 });
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [drivingDistance, setDrivingDistance] = useState<{ mi: number; duration: number } | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mapRef = useRef<MapRef>(null);

  // Preview real driving routes once confirmed coordinates are stable; never label straight-line distance as driving.
  useEffect(() => {
    setDrivingDistance(null);
    if (!validRideCoords(from.coords) || !validRideCoords(to.coords)) { setDistanceLoading(false); return; }
    const start = from.coords, end = to.coords;
    const controller = new AbortController();
    let cancelled = false;
    setDistanceLoading(true);
    const timer = setTimeout(async () => {
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start.lng},${start.lat};${end.lng},${end.lat}?access_token=${MAPBOX_TOKEN}&overview=false`, { signal: controller.signal });
        const data = await response.json();
        if (!cancelled && response.ok && data.routes?.[0]) setDrivingDistance({ mi: data.routes[0].distance / 1609.344, duration: Math.max(1, Math.round(data.routes[0].duration / 60)) });
      } catch {} finally { clearTimeout(timeout); if (!cancelled) setDistanceLoading(false); }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [from.coords?.lat, from.coords?.lng, to.coords?.lat, to.coords?.lng]);
  useEffect(() => () => clearTimeout(debounceRef.current), []);
  const estimate = drivingDistance ? rideFareEstimate(drivingDistance.mi) : null;

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
    } catch { toast({ title: "无法获取位置", description: "请允许定位，或搜索地址、在地图上选点", variant: "destructive" }); } finally {
      setLocatingField(null);
    }
  };

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 3) { setSuggestions([]); return; }
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
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 500);
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

  const canSend = !!(from.text.trim() && to.text.trim() && validRideCoords(from.coords) && validRideCoords(to.coords) && Number(price) > 0 && !sending);

  // Map picker overlay
  if (mapField) {
    return (
      <div className="max-w-lg mx-auto px-4 pb-3 pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            📍 在地图上选择{mapField === "from" ? "出发地" : "目的地"}
          </span>
          <Button onClick={() => setMapField(null)} className="p-1 rounded-lg hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <div className="w-full h-48 rounded-lg border-2 border-border/50 overflow-hidden">
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
        <Button
          onClick={handleConfirmMapPin}
          disabled={!mapPin}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          确认位置
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-3 pt-2 space-y-3 max-h-[55dvh] overflow-y-auto overscroll-contain">
      <div className="text-xs font-medium text-muted-foreground mb-1">发布行程</div>
      <div className="flex items-center gap-2">
        <select aria-label="常用地标城市" value={city} onChange={event => setCity(event.target.value)} className="bg-muted text-foreground rounded-md p-2 text-[16px] min-w-0">
          {["达拉斯", "纽约", "洛杉矶", "旧金山", "芝加哥"].map(name => <option key={name}>{name}</option>)}
        </select>
        <select aria-label="地标填入位置" value={activeField || "from"} onChange={event => setActiveField(event.target.value as "from" | "to")} className="bg-muted text-foreground rounded-md p-2 text-[16px] min-w-0"><option value="from">出发地</option><option value="to">目的地</option></select>
      </div>
      <div className="flex flex-wrap gap-2">{RIDE_LANDMARKS.filter(place => place.city === city).map(place => <Button key={place.name} variant="outline" size="sm" onClick={() => { const location = { text: place.name, coords: place.coords }; if (activeField === "to") setTo(location); else setFrom(location); setSuggestions([]); }}>{place.name}</Button>)}</div>
      <div className="space-y-2">
        {/* From field */}
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span className="text-xs font-medium text-primary">出发</span>
            </div>
            <input
              value={from.text}
              onChange={(e) => handleTextChange("from", e.target.value)}
              onFocus={() => setActiveField("from")}
              onBlur={() => setTimeout(() => { if (activeField === "from") setActiveField(null); setSuggestions([]); }, 200)}
              placeholder="搜索出发地"
              className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-[16px] outline-none focus:ring-2 focus:ring-ring/30"
            />
            <Button
              onClick={() => handleUseCurrentLocation("from")}
              disabled={locatingField === "from"}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="当前位置"
            >
              {locatingField === "from" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => handleOpenMap("from")}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="地图选点"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
          {activeField === "from" && suggestions.length > 0 && (
            <div className="absolute left-7 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
              {suggestions.map((f) => (
                <Button
                  key={f.id}
                  onPointerDown={(event) => { event.preventDefault(); handleSelectSuggestion(f); }}
                  variant="ghost" className="w-full h-auto whitespace-normal justify-start text-left px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  {f.place_name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* To field */}
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-destructive" />
              </div>
              <span className="text-xs font-medium text-destructive">终点</span>
            </div>
            <input
              value={to.text}
              onChange={(e) => handleTextChange("to", e.target.value)}
              onFocus={() => setActiveField("to")}
              onBlur={() => setTimeout(() => { if (activeField === "to") setActiveField(null); setSuggestions([]); }, 200)}
              placeholder="搜索目的地"
              className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-[16px] outline-none focus:ring-2 focus:ring-ring/30"
            />
            <Button
              onClick={() => handleUseCurrentLocation("to")}
              disabled={locatingField === "to"}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="当前位置"
            >
              {locatingField === "to" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => handleOpenMap("to")}
              className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
              title="地图选点"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
          {activeField === "to" && suggestions.length > 0 && (
            <div className="absolute left-7 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
              {suggestions.map((f) => (
                <Button
                  key={f.id}
                  onPointerDown={(event) => { event.preventDefault(); handleSelectSuggestion(f); }}
                  variant="ghost" className="w-full h-auto whitespace-normal justify-start text-left px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  {f.place_name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Driving distance indicator */}
        {from.coords && to.coords && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
              <Route className="h-3.5 w-3.5 text-primary" />
            </div>
            {distanceLoading ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> 计算驾车距离...
              </span>
            ) : drivingDistance ? (
              <span className="text-xs font-medium text-primary">
                驾车距离: {drivingDistance.mi.toFixed(1)} mi · 约 {drivingDistance.duration} 分钟
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">无法获取驾车距离</span>
            )}
          </div>
        )}

        {estimate && <div className="px-1 text-xs text-muted-foreground space-y-1"><div>参考出价 ${estimate.low}–${estimate.high} · 最终价格由双方协商</div><div>机场需确认航站楼与接客点；地标仅为区域位置</div><Button variant="outline" size="sm" onClick={() => setPrice(String(estimate.low))}>采用参考出价 ${estimate.low}</Button></div>}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="出价（必填）"
            inputMode="decimal"
            className={`flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-[16px] outline-none focus:ring-2 focus:ring-ring/30 ${!price.trim() && from.text.trim() && to.text.trim() ? "ring-2 ring-destructive/30" : ""}`}
          />
          <span className="text-xs text-muted-foreground shrink-0">USD</span>
        </div>
      </div>
      <Button
        onClick={() => canSend && onSend(from.text.trim(), to.text.trim(), from.coords, to.coords, price.trim() || undefined)}
        disabled={!canSend}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        发送行程
      </Button>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, Shield, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import MapGL, { Marker, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

interface LocationPickerProps {
  location: { lat: number; lng: number } | null;
  address: string;
  locationType: "precise" | "approximate";
  onLocationChange: (loc: { lat: number; lng: number }) => void;
  onAddressChange: (addr: string) => void;
  onLocationTypeChange: (type: "precise" | "approximate") => void;
}

export default function LocationPicker({
  location, address, locationType,
  onLocationChange, onAddressChange, onLocationTypeChange,
}: LocationPickerProps) {
  const mapRef = useRef<MapRef>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await res.json();
      if (data.features?.[0]) {
        onAddressChange(data.features[0].place_name);
      }
    } catch {}
  }, [onAddressChange]);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&country=us,ca&limit=5`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch { setSuggestions([]); }
  }, []);

  const handleAddressInput = (val: string) => {
    onAddressChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelectSuggestion = (feature: any) => {
    const [lng, lat] = feature.center;
    onLocationChange({ lat, lng });
    onAddressChange(feature.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
  };

  const handleGetLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocationChange(loc);
        mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 15, duration: 800 });
        reverseGeocode(loc.lat, loc.lng);
      },
      () => {}
    );
  };

  useEffect(() => {
    if (!location) handleGetLocation();
  }, []);

  const center = location || { lat: 32.9, lng: -96.8 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-muted-foreground">位置 / Location *</Label>
        <button
          onClick={handleGetLocation}
          className="flex items-center gap-1 text-xs text-primary font-medium"
        >
          <Navigation className="h-3.5 w-3.5" />
          当前定位
        </button>
      </div>

      {/* Address search */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          value={address}
          onChange={(e) => handleAddressInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="搜索地址 / Search address..."
          className="pl-9 rounded-xl h-11"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
            {suggestions.map((f) => (
              <button
                key={f.id}
                onClick={() => handleSelectSuggestion(f)}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {f.place_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mini Map */}
      <div className="w-full h-40 rounded-xl border-2 border-border/50 overflow-hidden" style={{ minHeight: 160 }}>
        <MapGL
          ref={mapRef}
          initialViewState={{
            latitude: center.lat,
            longitude: center.lng,
            zoom: 15,
          }}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: "100%", height: "100%" }}
          onClick={(e) => {
            const { lng, lat } = e.lngLat;
            onLocationChange({ lat, lng });
            reverseGeocode(lat, lng);
          }}
        >
          {location && (
            <Marker
              latitude={location.lat}
              longitude={location.lng}
              anchor="bottom"
              draggable
              onDragEnd={(e) => {
                const { lng, lat } = e.lngLat;
                onLocationChange({ lat, lng });
                reverseGeocode(lat, lng);
              }}
            >
              <MapPin className="h-8 w-8 text-primary drop-shadow-lg" />
            </Marker>
          )}
        </MapGL>
      </div>

      {/* Location type toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => onLocationTypeChange("precise")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border-2 transition-all",
            locationType === "precise"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/50 text-muted-foreground"
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          精确位置
        </button>
        <button
          onClick={() => onLocationTypeChange("approximate")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border-2 transition-all",
            locationType === "approximate"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/50 text-muted-foreground"
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          模糊位置
        </button>
      </div>

      {location && (
        <p className="text-[11px] text-muted-foreground">
          📍 {locationType === "precise"
            ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
            : `${location.lat.toFixed(2)}***, ${location.lng.toFixed(2)}***`
          }
        </p>
      )}
    </div>
  );
}

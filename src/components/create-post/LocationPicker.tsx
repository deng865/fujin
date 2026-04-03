import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  const addressRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Setup Places Autocomplete
  useEffect(() => {
    if (!addressRef.current || !(window as any).google?.maps?.places) return;
    const g = (window as any).google;
    const autocomplete = new g.maps.places.Autocomplete(addressRef.current, {
      componentRestrictions: { country: ["us", "ca"] },
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onLocationChange({ lat, lng });
        onAddressChange(place.formatted_address || "");
        updateMapCenter(lat, lng);
      }
    });
  }, []);

  // Init mini map
  useEffect(() => {
    if (!mapRef.current || !(window as any).google?.maps) return;
    const g = (window as any).google;
    const center = location || { lat: 32.9, lng: -96.8 };

    const map = new g.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
      ],
    });

    const marker = new g.maps.Marker({
      position: center,
      map,
      draggable: true,
      animation: g.maps.Animation.DROP,
    });

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) {
        onLocationChange({ lat: pos.lat(), lng: pos.lng() });
        // Reverse geocode
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ location: { lat: pos.lat(), lng: pos.lng() } }, (results: any) => {
          if (results?.[0]) {
            onAddressChange(results[0].formatted_address);
          }
        });
      }
    });

    googleMapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.setMap(null);
    };
  }, []);

  // Update map when location changes externally
  const updateMapCenter = (lat: number, lng: number) => {
    if (googleMapRef.current && markerRef.current) {
      const pos = new (window as any).google.maps.LatLng(lat, lng);
      googleMapRef.current.panTo(pos);
      markerRef.current.setPosition(pos);
    }
  };

  // Get current location
  const handleGetLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocationChange(loc);
        updateMapCenter(loc.lat, loc.lng);
        // Reverse geocode
        if ((window as any).google?.maps) {
          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: loc }, (results: any) => {
            if (results?.[0]) onAddressChange(results[0].formatted_address);
          });
        }
      },
      () => {}
    );
  };

  // Auto-detect location on mount
  useEffect(() => {
    if (!location) handleGetLocation();
  }, []);

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
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={addressRef}
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="搜索地址 / Search address..."
          className="pl-9 rounded-xl h-11"
        />
      </div>

      {/* Mini Map */}
      <div
        ref={mapRef}
        className="w-full h-40 rounded-xl border-2 border-border/50 overflow-hidden"
        style={{ minHeight: 160 }}
      />

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

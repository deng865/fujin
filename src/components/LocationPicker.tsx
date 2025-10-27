import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  label?: string;
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (latlng: L.LatLng) => void }) {
  const [position, setPosition] = useState<LatLngExpression | null>(null);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onLocationSelect(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

function ChangeView({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function LocationPicker({ onLocationSelect, defaultLocation, label = "选择位置" }: LocationPickerProps) {
  const [center, setCenter] = useState<LatLngExpression>([40.7128, -74.0060]); // Default to NYC
  const [addressInput, setAddressInput] = useState("");

  useEffect(() => {
    if (defaultLocation) {
      setCenter([defaultLocation.lat, defaultLocation.lng]);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          console.log("Could not get current location");
        }
      );
    }
  }, [defaultLocation]);

  const handleMapClick = (latlng: L.LatLng) => {
    onLocationSelect({
      lat: latlng.lat,
      lng: latlng.lng,
      address: addressInput || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`,
    });
  };

  const handleAddressSearch = async () => {
    if (!addressInput) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressInput)}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newCenter: LatLngExpression = [parseFloat(lat), parseFloat(lon)];
        setCenter(newCenter);
        onLocationSelect({
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          address: display_name,
        });
      }
    } catch (error) {
      console.error("Error searching address:", error);
    }
  };

  return (
    <Card className="p-4">
      <label className="block mb-2 text-sm font-medium">{label}</label>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="输入地址搜索 / Enter address"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddressSearch()}
        />
        <Button onClick={handleAddressSearch} variant="secondary">
          搜索
        </Button>
      </div>
      <div className="h-[300px] rounded-md overflow-hidden border">
        <MapContainer 
          center={[40.7128, -74.0060] as LatLngExpression} 
          zoom={13} 
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeView center={center} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocationSelect={handleMapClick} />
        </MapContainer>
      </div>
    </Card>
  );
}

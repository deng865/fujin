import { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MapPin } from "lucide-react";

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  defaultLocation?: { lat: number; lng: number };
  label?: string;
}

export default function LocationPicker({ onLocationSelect, label = "选择位置" }: LocationPickerProps) {
  const [addressInput, setAddressInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [searching, setSearching] = useState(false);

  const handleAddressSearch = async () => {
    if (!addressInput) return;
    
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressInput)}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const location = {
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          address: display_name,
        };
        setSelectedLocation(location);
        onLocationSelect(location);
      }
    } catch (error) {
      console.error("Error searching address:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            
            const location = {
              lat: latitude,
              lng: longitude,
              address: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            };
            setSelectedLocation(location);
            setAddressInput(location.address);
            onLocationSelect(location);
          } catch (error) {
            console.error("Error reverse geocoding:", error);
            const location = {
              lat: latitude,
              lng: longitude,
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            };
            setSelectedLocation(location);
            setAddressInput(location.address);
            onLocationSelect(location);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  return (
    <Card className="p-4">
      <label className="block mb-2 text-sm font-medium">{label}</label>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="输入地址 / Enter address"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddressSearch()}
          />
          <Button 
            onClick={handleAddressSearch} 
            variant="secondary"
            disabled={searching}
          >
            {searching ? "搜索中..." : "搜索"}
          </Button>
        </div>
        
        <Button 
          type="button"
          onClick={handleGetCurrentLocation} 
          variant="outline"
          className="w-full"
        >
          <MapPin className="mr-2 h-4 w-4" />
          使用当前位置 / Use Current Location
        </Button>

        {selectedLocation && (
          <div className="p-3 bg-secondary rounded-md">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">已选择位置 / Selected Location</p>
                <p className="text-xs text-muted-foreground break-words mt-1">
                  {selectedLocation.address}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  坐标: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

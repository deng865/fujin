import { GoogleMap, Marker } from "@react-google-maps/api";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MapPin, Search } from "lucide-react";

interface MapLocationSelectorProps {
  open: boolean;
  onClose: () => void;
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialCenter?: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: "100%",
  height: "500px",
};

export default function MapLocationSelector({
  open,
  onClose,
  onLocationSelect,
  initialCenter = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
}: MapLocationSelectorProps) {
  const [center, setCenter] = useState(initialCenter);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPosition({ lat, lng });

        // Reverse geocode to get address
        try {
          const geocoder = new google.maps.Geocoder();
          const response = await geocoder.geocode({ location: { lat, lng } });
          
          if (response.results[0]) {
            setSelectedAddress(response.results[0].formatted_address);
          } else {
            setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      }
    },
    []
  );

  const handleSearch = async () => {
    if (!searchInput || !window.google?.maps) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address: searchInput });

      if (response.results[0]) {
        const location = response.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        
        setCenter({ lat, lng });
        setMarkerPosition({ lat, lng });
        setSelectedAddress(response.results[0].formatted_address);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleConfirm = () => {
    if (markerPosition) {
      onLocationSelect({
        lat: markerPosition.lat,
        lng: markerPosition.lng,
        address: selectedAddress,
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>在地图中选择位置 / Select Location on Map</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索地址 / Search address"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} variant="secondary">
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </div>

          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            onClick={handleMapClick}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {markerPosition && (
              <Marker
                position={markerPosition}
                draggable={true}
                onDragEnd={handleMapClick}
              />
            )}
          </GoogleMap>

          {selectedAddress && (
            <div className="p-3 bg-secondary rounded-md">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">选中的位置 / Selected Location</p>
                  <p className="text-xs text-muted-foreground break-words mt-1">
                    {selectedAddress}
                  </p>
                  {markerPosition && (
                    <p className="text-xs text-muted-foreground mt-1">
                      坐标: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={!markerPosition}>
              确认选择
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

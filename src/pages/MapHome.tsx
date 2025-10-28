import { useState, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/googleMaps";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Layers, MessageCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const mapContainerStyle = {
  width: "100%",
  height: "calc(100vh - 64px)",
};

const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194,
};

export default function MapHome() {
  const { isLoaded } = useGoogleMaps();
  const [center, setCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");

  useEffect(() => {
    // Get user's current location
    const permission = localStorage.getItem("locationPermission");
    if (permission !== "never") {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setCenter(location);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("无法获取位置信息");
        }
      );
    }

    // Fetch nearby drivers
    fetchNearbyDrivers();
  }, []);

  const fetchNearbyDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("rides")
        .select(`
          *,
          profiles:user_id (
            name,
            avatar_url,
            average_rating,
            total_rides
          )
        `)
        .eq("ride_type", "taxi")
        .eq("is_visible", true)
        .eq("status", "open")
        .limit(20);

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载地图中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="bg-background rounded-full shadow-lg p-3 flex items-center gap-3">
          <Search className="h-5 w-5 text-muted-foreground ml-2" />
          <input
            type="text"
            placeholder="搜索目的地..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMapType(mapType === "roadmap" ? "satellite" : "roadmap")}
          >
            <Layers className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost">
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        options={{
          mapTypeId: mapType,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            }}
          />
        )}

        {/* Driver markers */}
        {drivers.map((driver) => {
          const position = driver.current_location || driver.from_location;
          if (!position?.lat || !position?.lng) return null;

          return (
            <Marker
              key={driver.id}
              position={{ lat: position.lat, lng: position.lng }}
              icon={{
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#22C55E" stroke="white" stroke-width="2"/>
                    <text x="20" y="26" text-anchor="middle" fill="white" font-size="20">🚗</text>
                  </svg>
                `),
                scaledSize: new google.maps.Size(40, 40),
              }}
              onClick={() => setSelectedDriver(driver)}
            />
          );
        })}

        {/* Driver info window */}
        {selectedDriver && selectedDriver.current_location?.lat && (
          <InfoWindow
            position={{
              lat: selectedDriver.current_location.lat,
              lng: selectedDriver.current_location.lng,
            }}
            onCloseClick={() => setSelectedDriver(null)}
          >
            <Card className="border-0 shadow-none p-4 min-w-[280px]">
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={selectedDriver.profiles?.avatar_url || "/placeholder.svg"}
                  alt={selectedDriver.profiles?.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedDriver.profiles?.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{selectedDriver.profiles?.average_rating?.toFixed(1) || "5.0"}</span>
                    <span className="mx-1">•</span>
                    <span>{selectedDriver.profiles?.total_rides || 0} 单</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <p className="text-muted-foreground">
                  车型：{selectedDriver.title || "待补充"}
                </p>
                <p className="text-primary font-medium">
                  距离：1.2km • 预计3分钟到达
                </p>
              </div>
              <Button className="w-full" size="lg">
                立即呼叫
              </Button>
            </Card>
          </InfoWindow>
        )}
      </GoogleMap>

      <BottomNav />
    </div>
  );
}

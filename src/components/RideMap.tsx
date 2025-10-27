import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin, Navigation, Clock } from "lucide-react";

interface RideMapProps {
  rides: Array<{
    id: string;
    title: string;
    ride_type: "taxi" | "carpool";
    from_location: { lat: number; lng: number; address: string };
    to_location?: { lat: number; lng: number; address: string } | null;
    current_location?: { lat: number; lng: number; address: string } | null;
    price_share: number;
    seats_available?: number | null;
    distance?: number;
    duration?: number;
    user: {
      name: string;
      average_rating?: number;
    };
  }>;
  center: { lat: number; lng: number };
  onRideSelect?: (rideId: string) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

export default function RideMap({ rides, center, onRideSelect }: RideMapProps) {
  const [selectedRide, setSelectedRide] = useState<string | null>(null);

  const handleMarkerClick = (rideId: string) => {
    setSelectedRide(rideId);
    onRideSelect?.(rideId);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={12}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {rides.map((ride) => {
            const location = ride.ride_type === "taxi" 
              ? (ride.current_location || ride.from_location)
              : ride.from_location;

            return (
              <Marker
                key={ride.id}
                position={{ lat: location.lat, lng: location.lng }}
                onClick={() => handleMarkerClick(ride.id)}
                icon={{
                  url: ride.ride_type === "taxi"
                    ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                }}
              >
                {selectedRide === ride.id && (
                  <InfoWindow onCloseClick={() => setSelectedRide(null)}>
                    <div className="p-2 max-w-xs">
                      <h3 className="font-semibold text-sm mb-1">{ride.title}</h3>
                      <Badge variant="secondary" className="mb-2">
                        {ride.ride_type === "taxi" ? "打车" : "拼车"}
                      </Badge>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{location.address}</span>
                        </div>
                        {ride.to_location && (
                          <div className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            <span className="truncate">{ride.to_location.address}</span>
                          </div>
                        )}
                        {ride.distance && (
                          <div className="flex items-center gap-1">
                            <span>距离: {(ride.distance / 1000).toFixed(1)} km</span>
                          </div>
                        )}
                        {ride.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>预计: {Math.ceil(ride.duration / 60)} 分钟</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-semibold">${ride.price_share}</span>
                          {ride.seats_available && (
                            <span className="text-muted-foreground">
                              {ride.seats_available} 座位
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}
        </GoogleMap>
      </CardContent>
    </Card>
  );
}

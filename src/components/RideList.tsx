import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin, Navigation, Clock, Star, User, MessageCircle } from "lucide-react";

interface RideListProps {
  rides: Array<{
    id: string;
    title: string;
    ride_type: "taxi" | "carpool";
    from_location: { lat: number; lng: number; address: string };
    to_location?: { lat: number; lng: number; address: string } | null;
    current_location?: { lat: number; lng: number; address: string } | null;
    departure_time?: string | null;
    price_share: number;
    seats_available?: number | null;
    distance?: number;
    duration?: number;
    description?: string | null;
    user: {
      name: string;
      average_rating?: number | null;
    };
  }>;
  onContactDriver: (rideId: string) => void;
}

export default function RideList({ rides, onContactDriver }: RideListProps) {
  const navigate = useNavigate();
  
  if (rides.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">暂无符合条件的行程</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rides.map((ride) => {
        const location = ride.ride_type === "taxi" 
          ? (ride.current_location || ride.from_location)
          : ride.from_location;

        return (
          <Card key={ride.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{ride.title}</h3>
                    <Badge variant={ride.ride_type === "taxi" ? "default" : "secondary"}>
                      {ride.ride_type === "taxi" ? "打车" : "拼车"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{ride.user.name}</span>
                    {ride.user.average_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{ride.user.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    ${ride.price_share}
                  </div>
                  {ride.seats_available && (
                    <div className="text-xs text-muted-foreground">
                      {ride.seats_available} 座位可用
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">
                      {ride.ride_type === "taxi" ? "当前位置:" : "出发地:"}
                    </span>
                    <p className="text-muted-foreground truncate">{location.address}</p>
                  </div>
                </div>

                {ride.to_location && (
                  <div className="flex items-start gap-2 text-sm">
                    <Navigation className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">目的地:</span>
                      <p className="text-muted-foreground truncate">{ride.to_location.address}</p>
                    </div>
                  </div>
                )}

                {ride.departure_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>
                      出发时间: {new Date(ride.departure_time).toLocaleString("zh-CN")}
                    </span>
                  </div>
                )}

                {ride.distance !== undefined && ride.duration !== undefined && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>距离: {(ride.distance / 1000).toFixed(1)} km</span>
                    <span>预计: {Math.ceil(ride.duration / 60)} 分钟</span>
                  </div>
                )}

                {ride.description && (
                  <p className="text-sm text-muted-foreground">{ride.description}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => onContactDriver(ride.id)} className="flex-1">
                  联系车主
                </Button>
                <Button
                  onClick={() => navigate(`/ride-chat/${ride.id}`)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  聊天
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

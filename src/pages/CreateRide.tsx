import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import LocationPicker from "@/components/LocationPicker";
import RideMap from "@/components/RideMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useGoogleMaps } from "@/lib/googleMaps";

type UserRole = "driver" | "passenger";

export default function CreateRide() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [seatsAvailable, setSeatsAvailable] = useState(1);
  const [description, setDescription] = useState("");

  useEffect(() => {
    const fetchUserType = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      if (profile) {
        setRole(profile.user_type as UserRole);
      }
    };

    fetchUserType();
  }, [navigate]);

  // Map data for preview
  const previewRides = currentLocation ? [{
    id: 'preview',
    title: role === "driver" ? "提供打车服务" : "需要打车",
    ride_type: "taxi" as const,
    from_location: currentLocation,
    to_location: destination,
    current_location: currentLocation,
    price_share: role === "driver" ? 6 : 1,
    seats_available: role === "driver" ? seatsAvailable : null,
    user: {
      name: "我",
      average_rating: 5,
    },
  }] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "请先登录",
          description: "您需要登录才能发布行程",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      if (!currentLocation) {
        toast({
          title: "请选择位置",
          description: "请选择当前位置",
          variant: "destructive",
        });
        return;
      }

      const duration = role === "driver" ? 24 : 4; // Driver: 24 hours, Passenger: 4 hours
      const price = role === "driver" ? 6 : 1;
      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + duration);

      const rideData = {
        user_id: user.id,
        ride_type: "taxi" as const,
        title: role === "driver" ? "提供打车服务" : "需要打车",
        current_location: currentLocation,
        from_location: currentLocation,
        to_location: role === "passenger" ? destination : null,
        seats_available: role === "driver" ? seatsAvailable : null,
        passenger_count: role === "passenger" ? 1 : null,
        description,
        is_visible: isVisible,
        expire_at: expireAt.toISOString(),
        status: "open" as const,
        price_share: price,
      };

      const { error } = await supabase.from("rides").insert([rideData]);

      if (error) throw error;

      toast({
        title: "发布成功！",
        description: `您的打车信息已发布，有效期${duration}小时`,
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "发布失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">
              {role === "driver" ? "发布打车服务" : "发布打车需求"}
            </CardTitle>
            <CardDescription>
              {role === "driver" ? "车主收费 $6/24小时" : "乘客收费 $1/4小时"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {role === "driver" ? (
                <>
                  <LocationPicker
                    label="当前位置 / Current Location"
                    onLocationSelect={setCurrentLocation}
                  />
                  
                  <div>
                    <Label htmlFor="seats">可载人数 / Available Seats</Label>
                    <Input
                      id="seats"
                      type="number"
                      min="1"
                      max="8"
                      value={seatsAvailable}
                      onChange={(e) => setSeatsAvailable(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <LocationPicker
                    label="当前位置 / Current Location"
                    onLocationSelect={setCurrentLocation}
                  />
                  
                  <LocationPicker
                    label="目的地 / Destination"
                    onLocationSelect={setDestination}
                  />
                </>
              )}

              <div>
                <Label htmlFor="description">备注 / Notes</Label>
                <Textarea
                  id="description"
                  placeholder="添加备注信息..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="visibility" className="flex flex-col gap-1">
                  <span>公开信息 / Public</span>
                  <span className="text-xs text-muted-foreground">
                    开启后将在地图和搜索中显示
                  </span>
                </Label>
                <Switch
                  id="visibility"
                  checked={isVisible}
                  onCheckedChange={setIsVisible}
                />
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/")} className="flex-1">
                  取消
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  发布信息
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Real-time Map Preview */}
        {mapsLoaded && currentLocation && (
          <div className="max-w-3xl mx-auto mt-6">
            <RideMap
              rides={previewRides}
              center={currentLocation}
            />
          </div>
        )}
      </div>
    </div>
  );
}

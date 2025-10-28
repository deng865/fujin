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

export default function CreateCarpool() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  const [fromLocation, setFromLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [toLocation, setToLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [waypoints, setWaypoints] = useState<{ lat: number; lng: number; address: string }[]>([]);
  const [departureTime, setDepartureTime] = useState("");
  const [seats, setSeats] = useState(1);
  const [priceShare, setPriceShare] = useState("");
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
  const previewRides = fromLocation && toLocation ? [{
    id: 'preview',
    title: role === "driver" ? "拼车车主" : "拼车乘客",
    ride_type: "carpool" as const,
    from_location: fromLocation,
    to_location: toLocation,
    price_share: parseFloat(priceShare) || (role === "driver" ? 6 : 1),
    seats_available: role === "driver" ? seats : null,
    user: {
      name: "我",
      average_rating: 5,
    },
  }] : [];

  const handleAddWaypoint = (location: { lat: number; lng: number; address: string }) => {
    setWaypoints([...waypoints, location]);
  };

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

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

      if (!fromLocation || !toLocation) {
        toast({
          title: "请选择位置",
          description: "请选择出发地和目的地",
          variant: "destructive",
        });
        return;
      }

      if (!departureTime) {
        toast({
          title: "请选择时间",
          description: "请选择出发时间",
          variant: "destructive",
        });
        return;
      }

      const duration = role === "driver" ? 24 : 4;
      const price = role === "driver" ? 6 : 1;
      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + duration);

      const carpoolData = {
        user_id: user.id,
        ride_type: "carpool" as const,
        title: role === "driver" ? "拼车车主" : "拼车乘客",
        from_location: fromLocation,
        to_location: toLocation,
        waypoints: waypoints.length > 0 ? waypoints : null,
        departure_time: new Date(departureTime).toISOString(),
        seats_available: role === "driver" ? seats : null,
        passenger_count: role === "passenger" ? seats : null,
        price_share: parseFloat(priceShare) || price,
        description,
        is_visible: isVisible,
        expire_at: expireAt.toISOString(),
        status: "open" as const,
      };

      const { error } = await supabase.from("rides").insert([carpoolData]);

      if (error) throw error;

      toast({
        title: "发布成功！",
        description: `您的拼车信息已发布，有效期${duration}小时`,
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
              {role === "driver" ? "发布拼车服务" : "发布拼车需求"}
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
                    label="出发地 / From"
                    onLocationSelect={setFromLocation}
                  />
                  
                  <LocationPicker
                    label="目的地 / To"
                    onLocationSelect={setToLocation}
                  />

                  <div>
                    <Label>途径地 / Waypoints (可选)</Label>
                    {waypoints.map((wp, index) => (
                      <div key={index} className="flex items-center gap-2 mt-2">
                        <Input value={wp.address} disabled className="flex-1" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveWaypoint(index)}
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                    <LocationPicker
                      label="添加途径地"
                      onLocationSelect={handleAddWaypoint}
                    />
                  </div>

                  <div>
                    <Label htmlFor="seats">可载人数 / Available Seats</Label>
                    <Input
                      id="seats"
                      type="number"
                      min="1"
                      max="8"
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <LocationPicker
                    label="出发地 / From"
                    onLocationSelect={setFromLocation}
                  />
                  
                  <LocationPicker
                    label="目的地 / To"
                    onLocationSelect={setToLocation}
                  />

                  <div>
                    <Label htmlFor="passengerCount">乘车人数 / Number of Passengers</Label>
                    <Input
                      id="passengerCount"
                      type="number"
                      min="1"
                      max="8"
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="departureTime">出发时间 / Departure Time</Label>
                <Input
                  id="departureTime"
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="priceShare">费用分摊 / Price Share ($)</Label>
                <Input
                  id="priceShare"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={role === "driver" ? "6.00" : "1.00"}
                  value={priceShare}
                  onChange={(e) => setPriceShare(e.target.value)}
                />
              </div>

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
        {mapsLoaded && fromLocation && toLocation && (
          <div className="max-w-3xl mx-auto mt-6">
            <RideMap
              rides={previewRides}
              center={fromLocation}
            />
          </div>
        )}
      </div>
    </div>
  );
}

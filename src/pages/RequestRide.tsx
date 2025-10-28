import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { MapPin, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import LocationPicker from "@/components/LocationPicker";

export default function RequestRide() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [passengerCount, setPassengerCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    // Get user's current location
    const permission = localStorage.getItem("locationPermission");
    if (permission !== "never") {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          // Reverse geocode to get address
          try {
            const geocoder = new google.maps.Geocoder();
            const result = await geocoder.geocode({ location });
            if (result.results[0]) {
              setCurrentLocation({
                ...location,
                address: result.results[0].formatted_address,
              });
            }
          } catch (error) {
            setCurrentLocation({
              ...location,
              address: "当前位置",
            });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const handlePublish = async () => {
    if (!currentLocation) {
      toast.error("请先获取当前位置");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("请先登录");
        navigate("/auth");
        return;
      }

      // Calculate expire time (8 hours from now)
      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + 8);

      const { error } = await supabase.from("rides").insert({
        user_id: user.id,
        ride_type: "taxi",
        title: `打车 - ${passengerCount}人`,
        description: notes || null,
        current_location: currentLocation,
        from_location: currentLocation,
        passenger_count: parseInt(passengerCount),
        is_visible: isPublic,
        status: "open",
        expire_at: expireAt.toISOString(),
      });

      if (error) throw error;

      toast.success("打车信息发布成功！");
      navigate("/");
    } catch (error: any) {
      console.error("Error publishing ride:", error);
      toast.error(error.message || "发布失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">发布打车信息</h1>
          <Button
            variant="ghost"
            onClick={() => navigate("/ride-history")}
          >
            <Clock className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Current Location */}
        <Card className="p-4">
          <button
            onClick={() => setShowLocationPicker(true)}
            className="w-full flex items-center gap-3 text-left"
          >
            <div className="bg-primary/10 p-2 rounded-full">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">从</p>
              <p className="font-medium">
                {currentLocation?.address || "获取当前位置中..."}
              </p>
            </div>
            <span className="text-muted-foreground">&gt;</span>
          </button>
        </Card>

        {/* Passenger Count */}
        <Card className="p-4">
          <Label className="text-sm text-muted-foreground mb-2 block">
            乘车人数
          </Label>
          <select
            value={passengerCount}
            onChange={(e) => setPassengerCount(e.target.value)}
            className="w-full p-3 rounded-lg border bg-background"
          >
            <option value="1">1人</option>
            <option value="2">2人</option>
            <option value="3">3人</option>
            <option value="4">4人</option>
          </select>
        </Card>

        {/* Notes */}
        <Card className="p-4">
          <Label className="text-sm text-muted-foreground mb-2 block">
            备注（可选）
          </Label>
          <Textarea
            placeholder="如：需要儿童座椅、有大件行李等"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </Card>

        {/* Public Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">公开显示在地图上</Label>
              <p className="text-sm text-muted-foreground">
                其他司机可以看到您的打车信息
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">
            💡 发布后将保存8小时，费用：$1
          </p>
        </Card>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t">
        <Button
          className="w-full h-12 text-lg"
          onClick={handlePublish}
          disabled={loading || !currentLocation}
        >
          {loading ? "发布中..." : "发布打车信息（$1）"}
        </Button>
      </div>

      <BottomNav />

      {showLocationPicker && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="p-4">
            <Button
              variant="ghost"
              onClick={() => setShowLocationPicker(false)}
              className="mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </Button>
            <LocationPicker
              onLocationSelect={(location) => {
                setCurrentLocation(location);
                setShowLocationPicker(false);
              }}
              label="选择上车地点"
            />
          </div>
        </div>
      )}
    </div>
  );
}

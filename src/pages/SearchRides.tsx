import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps, calculateDistance } from "@/lib/googleMaps";
import Navbar from "@/components/Navbar";
import RideMap from "@/components/RideMap";
import RideList from "@/components/RideList";
import LocationPicker from "@/components/LocationPicker";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapIcon, ListIcon } from "lucide-react";

type ViewMode = "map" | "list";
type RideType = "all" | "taxi" | "carpool";

interface Ride {
  id: string;
  title: string;
  ride_type: "taxi" | "carpool";
  from_location: any;
  to_location: any;
  current_location: any;
  departure_time: string | null;
  price_share: number;
  seats_available: number | null;
  description: string | null;
  profiles: {
    name: string;
    average_rating: number | null;
  };
  user: {
    name: string;
    average_rating: number | null;
  };
  distance?: number;
  duration?: number;
}

export default function SearchRides() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [rideType, setRideType] = useState<RideType>("all");
  const [rides, setRides] = useState<Ride[]>([]);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [maxDistance, setMaxDistance] = useState<string>("50");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });

  useEffect(() => {
    // Get current location for map center
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.log("Could not get current location")
      );
    }
  }, []);

  useEffect(() => {
    searchRides();
    
    // Set up realtime subscription
    const channel = supabase
      .channel("rides-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rides",
        },
        () => {
          toast({
            title: "新行程发布！",
            description: "有新的行程匹配您的搜索条件",
          });
          searchRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideType, maxPrice, dateFilter, searchLocation, maxDistance]);

  const searchRides = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("rides")
        .select(`
          *,
          profiles:user_id!inner (
            name,
            average_rating
          )
        `)
        .eq("is_visible", true)
        .eq("status", "open")
        .gte("expire_at", new Date().toISOString());

      if (rideType !== "all") {
        query = query.eq("ride_type", rideType);
      }

      if (maxPrice) {
        query = query.lte("price_share", parseFloat(maxPrice));
      }

      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59);
        query = query.gte("departure_time", startDate.toISOString()).lte("departure_time", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      let processedRides = (data || []).map((ride: any) => ({
        ...ride,
        user: ride.profiles,
      }));

      // Calculate distances if search location is set
      if (searchLocation && mapsLoaded) {
        const ridesWithDistance = await Promise.all(
          processedRides.map(async (ride) => {
            const rideLocation = ride.ride_type === "taxi"
              ? (ride.current_location || ride.from_location)
              : ride.from_location;
            
            if (rideLocation) {
              const result = await calculateDistance(
                searchLocation,
                { lat: rideLocation.lat, lng: rideLocation.lng }
              );
              
              if (result) {
                return {
                  ...ride,
                  distance: result.distance,
                  duration: result.duration,
                };
              }
            }
            return ride;
          })
        );

        // Filter by max distance
        if (maxDistance) {
          const maxDistanceMeters = parseFloat(maxDistance) * 1000;
          processedRides = ridesWithDistance.filter(
            (ride) => !ride.distance || ride.distance <= maxDistanceMeters
          );
        } else {
          processedRides = ridesWithDistance;
        }

        // Sort by distance
        processedRides.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }

      setRides(processedRides);
      if (searchLocation) {
        setMapCenter({ lat: searchLocation.lat, lng: searchLocation.lng });
      }
    } catch (error: any) {
      toast({
        title: "搜索失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactDriver = async (rideId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "请先登录",
        description: "您需要登录才能联系车主",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Create a match
    const ride = rides.find((r) => r.id === rideId);
    if (!ride) return;

    try {
      const { error } = await supabase.from("matches").insert({
        user_id: user.id,
        ride_id: rideId,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "请求已发送！",
        description: "等待车主确认",
      });
    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">搜索行程</h1>
          <p className="text-muted-foreground">查找附近的打车和拼车信息</p>
        </div>

        {/* Search Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="rideType">行程类型 / Ride Type</Label>
                <Select value={rideType} onValueChange={(v) => setRideType(v as RideType)}>
                  <SelectTrigger id="rideType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部 / All</SelectItem>
                    <SelectItem value="taxi">打车 / Taxi</SelectItem>
                    <SelectItem value="carpool">拼车 / Carpool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxPrice">最高价格 / Max Price ($)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="不限"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="maxDistance">最大距离 / Max Distance (km)</Label>
                <Input
                  id="maxDistance"
                  type="number"
                  placeholder="50"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="date">出发日期 / Departure Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>

            <LocationPicker
              label="搜索位置 / Search Location (可选)"
              onLocationSelect={setSearchLocation}
            />

            <Button onClick={searchRides} disabled={loading} className="w-full mt-4">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              搜索 / Search
            </Button>
          </CardContent>
        </Card>

        {/* View Mode Toggle */}
        <div className="mb-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="map">
                <MapIcon className="mr-2 h-4 w-4" />
                地图视图
              </TabsTrigger>
              <TabsTrigger value="list">
                <ListIcon className="mr-2 h-4 w-4" />
                列表视图
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            找到 {rides.length} 个结果
          </p>
        </div>

        {/* Results Display */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">搜索中...</p>
            </CardContent>
          </Card>
        ) : viewMode === "map" && mapsLoaded ? (
          <RideMap rides={rides} center={mapCenter} />
        ) : (
          <RideList rides={rides} onContactDriver={handleContactDriver} />
        )}
      </div>
    </div>
  );
}

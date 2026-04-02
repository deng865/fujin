import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Camera, DollarSign, Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "housing", label: "房产 Housing", icon: Home },
  { id: "jobs", label: "找工 Jobs", icon: Briefcase },
  { id: "auto", label: "汽车 Auto", icon: Car },
  { id: "food", label: "美食 Food", icon: UtensilsCrossed },
  { id: "education", label: "教育 Education", icon: GraduationCap },
  { id: "travel", label: "旅游 Travel", icon: Plane },
  { id: "driver", label: "司机 Driver", icon: UserCheck },
  { id: "legal", label: "法律 Legal", icon: Scale },
];

export default function CreatePost() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const addressRef = useRef<HTMLInputElement>(null);

  // Check auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        toast.error("请先登录 / Please login first");
        navigate("/auth");
      }
    });
  }, [navigate]);

  // Setup Places Autocomplete
  useEffect(() => {
    if (!addressRef.current || !(window as any).google?.maps?.places) return;
    const g = (window as any).google;
    const autocomplete = new g.maps.places.Autocomplete(addressRef.current, {
      componentRestrictions: { country: ["us", "ca"] },
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        setLocation({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        setAddress(place.formatted_address || "");
      }
    });
  }, []);

  // Get current location as default
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!location) {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      () => {}
    );
  }, []);

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setImageUrls([...imageUrls, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("请输入标题 / Title required");
    if (!category) return toast.error("请选择分类 / Category required");
    if (!location) return toast.error("请选择位置 / Location required");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        price: price ? parseFloat(price) : null,
        latitude: location.lat,
        longitude: location.lng,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      });

      if (error) throw error;
      toast.success("发布成功！ / Posted successfully!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "发布失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">发布信息 / New Post</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Category Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">分类 / Category *</Label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{cat.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>标题 / Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：两室一厅公寓出租 / 2BR apt for rent"
            className="rounded-xl"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>详情描述 / Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细描述您的信息..."
            rows={4}
            className="rounded-xl resize-none"
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label>价格 / Price (USD)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              placeholder="可选 / Optional"
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label>位置 / Location *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={addressRef}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="输入地址搜索 / Search address..."
              className="pl-9 rounded-xl"
            />
          </div>
          {location && (
            <p className="text-xs text-muted-foreground">
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Images */}
        <div className="space-y-2">
          <Label>图片链接 / Image URLs</Label>
          <div className="flex gap-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="rounded-xl"
            />
            <Button type="button" variant="outline" onClick={addImageUrl} className="rounded-xl shrink-0">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          {imageUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="h-16 w-16 object-cover rounded-xl border" />
                  <button
                    onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl h-12 text-base"
        >
          {loading ? "发布中... / Posting..." : "发布 / Post"}
        </Button>
      </div>
    </div>
  );
}

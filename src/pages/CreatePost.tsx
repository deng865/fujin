import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Send, MapPin, Truck } from "lucide-react";
import CategoryGrid from "@/components/create-post/CategoryGrid";
import DynamicForm from "@/components/create-post/DynamicForm";
import LocationPicker from "@/components/create-post/LocationPicker";
import { getDeviceId } from "@/lib/deviceId";

const initialFormData = {
  title: "", description: "", price: "", phone: "", wechatId: "",
  imageUrls: [] as string[], bedrooms: "", bathrooms: "", priceUnit: "month",
  carModel: "", availableTime: "", driverPriceUnit: "trip",
  salaryRange: "", jobType: "",
  openTime: "", closeTime: "", timezone: "",
};

export default function CreatePost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);
  const [category, setCategory] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locationType, setLocationType] = useState<"precise" | "approximate">("precise");
  const [isMobile, setIsMobile] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        toast.error("请先登录 / Please login first");
        navigate("/auth");
      }
    });
  }, [navigate]);

  // Load existing post data for edit mode
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", editId)
        .single();
      if (error || !data) {
        toast.error("加载帖子失败");
        navigate("/profile");
        return;
      }
      setCategory(data.category);
      setFormData({
        ...initialFormData,
        title: data.title || "",
        description: data.description || "",
        price: data.price != null ? String(data.price) : "",
        phone: data.contact_phone || "",
        wechatId: data.contact_wechat || "",
        imageUrls: data.image_urls || [],
      });
      setLocation({ lat: data.latitude, lng: data.longitude });
      setInitialLoading(false);
    })();
  }, [editId, navigate]);

  const updateForm = (partial: Partial<typeof initialFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleCategorySelect = useCallback((cat: string) => {
    setCategory(cat);
    // Scroll to form after category selected
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // Auto-scroll focused input into view when keyboard opens
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    };
    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  const handleSubmit = async () => {
    if (!category) return toast.error("请选择分类 / Category required");
    if (!formData.title.trim()) return toast.error("请输入标题 / Title required");

    // Check for existing active post in same category (new posts only)
    if (!editId) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { count } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id)
          .eq("category", category)
          .eq("is_visible", true);
        if (count && count > 0) {
          toast.error("您在该分类下已有一条活跃信息，请先下架后再发布新的");
          return;
        }
      }
    }

    // For mobile merchants, auto-detect location if not set
    let submitLocation = location;
    if (isMobile && !submitLocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
        );
        submitLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(submitLocation);
      } catch {
        return toast.error("无法获取位置，请允许定位权限");
      }
    }
    if (!submitLocation) return toast.error("请选择位置 / Location required");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let finalLat = submitLocation.lat;
      let finalLng = submitLocation.lng;
      if (locationType === "approximate") {
        finalLat += (Math.random() - 0.5) * 0.01;
        finalLng += (Math.random() - 0.5) * 0.01;
      }

      let desc = formData.description;
      const extras: string[] = [];
      if (category === "housing") {
        if (formData.bedrooms) extras.push(`🏠 ${formData.bedrooms}${formData.bathrooms ? `/${formData.bathrooms}` : ""}`);
        if (formData.priceUnit === "week") extras.push("💰 周租");
      }
      if (category === "driver") {
        if (formData.carModel) extras.push(`🚗 ${formData.carModel}`);
        if (formData.availableTime) extras.push(`🕐 ${formData.availableTime}`);
      }
      if (category === "jobs") {
        if (formData.salaryRange) extras.push(`💰 ${formData.salaryRange}`);
        if (formData.jobType) extras.push(`📋 ${formData.jobType === "fulltime" ? "全职" : formData.jobType === "parttime" ? "兼职" : "合同"}`);
      }
      if (extras.length > 0) {
        desc = (desc ? desc + "\n\n" : "") + extras.join(" | ");
      }

      // Build operating hours for fixed merchants
      const detectedTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Chicago"; } })();
      const operatingHours = (!isMobile && formData.openTime && formData.closeTime)
        ? { open: formData.openTime, close: formData.closeTime, timezone: detectedTz }
        : null;

      const postPayload = {
        title: formData.title.trim(),
        description: desc?.trim() || null,
        category,
        price: formData.price ? parseFloat(formData.price) : null,
        latitude: finalLat,
        longitude: finalLng,
        image_urls: formData.imageUrls.length > 0 ? formData.imageUrls : null,
        contact_phone: formData.phone.trim() || null,
        contact_wechat: formData.wechatId.trim() || null,
        is_mobile: isMobile,
        operating_hours: operatingHours,
      };

      if (editId) {
        const { error } = await supabase.from("posts").update(postPayload).eq("id", editId);
        if (error) throw error;
        toast.success("修改成功！ / Updated successfully!");
      } else {
        const { error } = await supabase.from("posts").insert({ ...postPayload, user_id: user.id, device_id: getDeviceId() });
        if (error) {
          if (error.message?.includes("idx_posts_one_active_per_user_category") || error.code === "23505") {
            toast.error("您在该分类下已有一条活跃信息，请先下架后再发布新的");
            return;
          }
          if (error.message?.includes("DEVICE_DUPLICATE")) {
            toast.error("该设备在此分类下已有活跃信息，请勿重复发布");
            return;
          }
          if (error.message?.includes("CONTACT_DUPLICATE")) {
            toast.error("该联系方式在此分类下已有活跃信息，请勿重复发布");
            return;
          }
          throw error;
        }
        toast.success("发布成功！ / Posted successfully!");
      }
      navigate(editId ? "/profile" : "/");
    } catch (err: any) {
      toast.error(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex-shrink-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-accent rounded-xl active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold">{editId ? "编辑信息" : "发布信息"}</h1>
          <div className="w-9" />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-8 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {/* Section 1: Category Selection */}
          <CategoryGrid selected={category} onSelect={handleCategorySelect} />

          {/* Merchant type toggle: Fixed vs Mobile */}
          {category && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMobile(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    !isMobile ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  固定地址
                </button>
                <button
                  onClick={() => setIsMobile(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    isMobile ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground"
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  移动服务
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Dynamic Form */}
          {category && (
            <div ref={formRef} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <DynamicForm category={category} data={formData} onChange={updateForm} isMobile={isMobile} />
            </div>
          )}

          {/* Section 3: Location Picker */}
          {category && !isMobile && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <LocationPicker
                location={location}
                address={address}
                locationType={locationType}
                onLocationChange={setLocation}
                onAddressChange={setAddress}
                onLocationTypeChange={setLocationType}
              />
            </div>
          )}

          {/* Mobile service hint */}
          {category && isMobile && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-1">
              <Truck className="h-6 w-6 mx-auto text-primary" />
              <p className="text-sm font-medium text-foreground">移动服务模式</p>
              <p className="text-xs text-muted-foreground">发布后将自动追踪您的位置，在地图上以模糊区域显示</p>
            </div>
          )}

          {/* Submit Button */}
          {category && (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-xl h-12 text-base gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? (editId ? "保存中..." : "发布中...") : (editId ? "保存修改 / Save" : "发布 / Post")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

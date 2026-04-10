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
  openTime: "", closeTime: "", timezone: "America/Chicago",
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
    if (!location) return toast.error("请选择位置 / Location required");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let finalLat = location.lat;
      let finalLng = location.lng;
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
      };

      if (editId) {
        const { error } = await supabase.from("posts").update(postPayload).eq("id", editId);
        if (error) throw error;
        toast.success("修改成功！ / Updated successfully!");
      } else {
        const { error } = await supabase.from("posts").insert({ ...postPayload, user_id: user.id, device_id: getDeviceId() });
        if (error) {
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

          {/* Section 2: Dynamic Form - only show after category selected */}
          {category && (
            <div ref={formRef} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <DynamicForm category={category} data={formData} onChange={updateForm} />
            </div>
          )}

          {/* Section 3: Location Picker */}
          {category && (
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

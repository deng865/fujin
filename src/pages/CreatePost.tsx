import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import CategoryGrid from "@/components/create-post/CategoryGrid";
import DynamicForm from "@/components/create-post/DynamicForm";
import LocationPicker from "@/components/create-post/LocationPicker";

const initialFormData = {
  title: "", description: "", price: "", phone: "", wechatId: "",
  imageUrls: [] as string[], bedrooms: "", bathrooms: "", priceUnit: "month",
  carModel: "", availableTime: "", driverPriceUnit: "trip",
  salaryRange: "", jobType: "",
};

export default function CreatePost() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locationType, setLocationType] = useState<"precise" | "approximate">("precise");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        toast.error("请先登录 / Please login first");
        navigate("/auth");
      }
    });
  }, [navigate]);

  const updateForm = (partial: Partial<typeof initialFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleSubmit = async () => {
    if (!category) return toast.error("请选择分类 / Category required");
    if (!formData.title.trim()) return toast.error("请输入标题 / Title required");
    if (!location) return toast.error("请选择位置 / Location required");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Apply fuzzy offset for approximate location
      let finalLat = location.lat;
      let finalLng = location.lng;
      if (locationType === "approximate") {
        finalLat += (Math.random() - 0.5) * 0.01;
        finalLng += (Math.random() - 0.5) * 0.01;
      }

      // Build description with extra fields
      let desc = formData.description;
      const extras: string[] = [];
      if (formData.phone) extras.push(`📞 ${formData.phone}`);
      if (formData.wechatId) extras.push(`💬 微信: ${formData.wechatId}`);
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

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: desc?.trim() || null,
        category,
        price: formData.price ? parseFloat(formData.price) : null,
        latitude: finalLat,
        longitude: finalLng,
        image_urls: formData.imageUrls.length > 0 ? formData.imageUrls : null,
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
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-accent rounded-xl active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold">发布信息</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-8">
        {/* Section 1: Category Selection */}
        <CategoryGrid selected={category} onSelect={setCategory} />

        {/* Section 2: Dynamic Form - only show after category selected */}
        {category && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
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
            {loading ? "发布中..." : "发布 / Post"}
          </Button>
        )}
      </div>
    </div>
  );
}

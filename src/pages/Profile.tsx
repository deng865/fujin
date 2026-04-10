import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Package, Shield, Headphones, ChevronRight, Edit, Car, Star } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ProfileHeader from "@/components/profile/ProfileHeader";
import LiveSharingBanner from "@/components/profile/LiveSharingBanner";
import MyPostsList from "@/components/profile/MyPostsList";
import PrivacySettings from "@/components/profile/PrivacySettings";
import ReviewList from "@/components/reviews/ReviewList";

function ReviewPositiveRate({ userId }: { userId: string }) {
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("reviews")
      .select("rating")
      .eq("receiver_id", userId)
      .then(({ data }) => {
        if (!data || data.length === 0) { setRate(null); return; }
        const good = data.filter((r: any) => r.rating >= 4).length;
        setRate(Math.round((good / data.length) * 100));
      });
  }, [userId]);
  return (
    <>
      <p className="text-2xl font-bold text-foreground">{rate !== null ? `${rate}%` : "-"}</p>
      <p className="text-[10px] text-muted-foreground">好评率</p>
    </>
  );
}

const ADMIN_USER_ID = "a7c6d947-52ce-4eaf-83fd-914f87ac9669";

interface UserPost {
  id: string;
  title: string;
  category: string;
  price: number | null;
  created_at: string;
  is_visible: boolean;
  is_mobile: boolean;
  operating_hours: { open: string; close: string; timezone?: string } | null;
}

interface Profile {
  name: string;
  phone: string | null;
  wechat_id: string | null;
  avatar_url: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  license_plate: string | null;
  user_type: string | null;
  average_rating: number | null;
  total_ratings: number | null;
}

type SubPage = "main" | "posts" | "privacy" | "editProfile" | "reviews";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [subPage, setSubPage] = useState<SubPage>("main");
  const [locationSharing, setLocationSharing] = useState(true);

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wechatId, setWechatId] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, phone, wechat_id, avatar_url, vehicle_model, vehicle_color, license_plate, user_type, average_rating, total_ratings")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData as any);
        setName(profileData.name);
        setPhone(profileData.phone || "");
        setWechatId(profileData.wechat_id || "");
        setVehicleModel((profileData as any).vehicle_model || "");
        setVehicleColor((profileData as any).vehicle_color || "");
        setLicensePlate((profileData as any).license_plate || "");
      }

      const { data: postsData } = await supabase
        .from("posts")
        .select("id, title, category, price, created_at, is_visible, is_mobile, operating_hours")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setPosts((postsData || []).map((p: any) => ({
        ...p,
        operating_hours: p.operating_hours as UserPost["operating_hours"],
      })));

      // Load location sharing preference
      const saved = localStorage.getItem("location_sharing_enabled");
      if (saved !== null) setLocationSharing(saved === "true");

      setLoading(false);
    })();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const updateData: any = {
      name, phone: phone || null, wechat_id: wechatId || null,
      vehicle_model: vehicleModel || null,
      vehicle_color: vehicleColor || null,
      license_plate: licensePlate || null,
    };
    const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id);
    if (error) { toast.error("更新失败"); return; }
    toast.success("资料已更新");
    setProfile({ ...profile!, ...updateData });
    setSubPage("main");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleContactSupport = async () => {
    if (!user) return;
    // Find or create conversation with admin
    const myId = user.id;
    if (myId === ADMIN_USER_ID) { toast.info("您就是管理员"); return; }

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_1.eq.${myId},participant_2.eq.${ADMIN_USER_ID}),and(participant_1.eq.${ADMIN_USER_ID},participant_2.eq.${myId})`)
      .maybeSingle();

    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({ participant_1: myId, participant_2: ADMIN_USER_ID })
        .select("id")
        .single();
      if (error) { toast.error("无法创建对话"); return; }
      navigate(`/chat/${newConv.id}`);
    }
  };

  const handleLocationSharingChange = (val: boolean) => {
    setLocationSharing(val);
    localStorage.setItem("location_sharing_enabled", val.toString());
    toast.success(val ? "位置共享已开启" : "位置共享已关闭");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Sub-pages
  if (subPage === "posts") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setSubPage("main")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h1 className="text-lg font-semibold ml-2">我的发布</h1>
            <span className="ml-auto text-sm text-muted-foreground">{posts.length} 条</span>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-4">
          <MyPostsList posts={posts} onPostsChange={setPosts} />
        </div>
      </div>
    );
  }

  if (subPage === "privacy") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setSubPage("main")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h1 className="text-lg font-semibold ml-2">隐私设置</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-4">
          <PrivacySettings
            locationSharing={locationSharing}
            onLocationSharingChange={handleLocationSharingChange}
            onBack={() => setSubPage("main")}
          />
        </div>
      </div>
    );
  }

  if (subPage === "reviews") {
    const avg = profile?.average_rating ?? 0;
    const total = profile?.total_ratings ?? 0;
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setSubPage("main")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h1 className="text-lg font-semibold ml-2">我的评价</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* Stats card */}
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{avg ? avg.toFixed(1) : "-"}</p>
              <p className="text-[10px] text-muted-foreground">平均分</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-[10px] text-muted-foreground">总评价</p>
            </div>
            <div className="text-center">
              <ReviewPositiveRate userId={user?.id || ""} />
            </div>
          </div>

          <h2 className="text-sm font-medium text-muted-foreground">收到的评价</h2>
          <ReviewList userId={user?.id || ""} type="received" canDispute />
          <h2 className="text-sm font-medium text-muted-foreground pt-2 border-t border-border">我给出的评价</h2>
          <ReviewList userId={user?.id || ""} type="sent" />
        </div>
      </div>
    );
  }

  if (subPage === "editProfile") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setSubPage("main")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <h1 className="text-lg font-semibold ml-2">编辑资料</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">姓名 / Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">手机 / Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">微信 / WeChat</Label>
            <Input value={wechatId} onChange={(e) => setWechatId(e.target.value)} className="rounded-xl" />
          </div>
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">车辆信息（司机选填）</span>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">车型</Label>
                <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="如: Toyota Camry" className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">车色</Label>
                <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="如: 白色" className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">车牌</Label>
                <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="如: ABC-1234" className="rounded-xl" />
              </div>
            </div>
          </div>
          <Button onClick={handleSaveProfile} className="w-full rounded-xl mt-4">
            保存
          </Button>
        </div>
      </div>
    );
  }

  // Main page
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <h1 className="text-lg font-semibold">我的</h1>
          <button onClick={() => setSubPage("editProfile")} className="p-2 -mr-2 hover:bg-accent rounded-xl">
            <Edit className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Block 1: Profile header */}
        <ProfileHeader
          profile={profile}
          userId={user?.id || ""}
          email={user?.email || ""}
          onAvatarUpdated={(url) => setProfile(p => p ? { ...p, avatar_url: url } : p)}
        />

        {/* Block 2: Live sharing banner */}
        <LiveSharingBanner />

        {/* Block 3: Menu list */}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          <button
            onClick={() => setSubPage("posts")}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
          >
            <Package className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-medium">我的发布</span>
            <span className="text-xs text-muted-foreground mr-1">{posts.length}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setSubPage("reviews")}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
          >
            <Star className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-medium">我的评价</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setSubPage("privacy")}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
          >
            <Shield className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-medium">隐私设置</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={handleContactSupport}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
          >
            <Headphones className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-medium">联系客服</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Block 4: Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-card border border-border rounded-2xl text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>

        {/* Hidden admin entry */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <Shield className="h-3 w-3" />
            管理后台
          </button>
        )}
      </div>
    </div>
  );
}

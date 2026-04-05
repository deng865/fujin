import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, MapPin, LogOut, Trash2, Edit, User, Shield, Camera, Loader2, Car } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";

interface UserPost {
  id: string;
  title: string;
  category: string;
  price: number | null;
  created_at: string;
  is_visible: boolean;
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
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wechatId, setWechatId] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, phone, wechat_id, avatar_url, vehicle_model, vehicle_color, license_plate, user_type")
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
        .select("id, title, category, price, created_at, is_visible")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setPosts(postsData || []);
      setLoading(false);
    })();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const updateData: any = { name, phone: phone || null, wechat_id: wechatId || null };
    // Include vehicle fields
    updateData.vehicle_model = vehicleModel || null;
    updateData.vehicle_color = vehicleColor || null;
    updateData.license_plate = licensePlate || null;
    
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) toast.error("更新失败");
    else {
      toast.success("资料已更新 / Profile updated");
      setProfile({ ...profile!, name, phone: phone || null, wechat_id: wechatId || null, vehicle_model: vehicleModel || null, vehicle_color: vehicleColor || null, license_plate: licensePlate || null });
      setEditing(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("头像不能超过5MB"); return; }
    setUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("请先登录");

      const compressed = await new Promise<File>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const size = 400;
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext("2d")!;
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          canvas.toBlob(
            (blob) => resolve(new File([blob!], `avatar-${user.id}.jpg`, { type: "image/jpeg" })),
            "image/jpeg", 0.85
          );
        };
        img.src = URL.createObjectURL(file);
      });

      const formData = new FormData();
      formData.append("file", compressed);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/upload-to-r2`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData }
      );
      if (!res.ok) throw new Error("上传失败");
      const { url } = await res.json();

      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      setProfile((p) => p ? { ...p, avatar_url: url } : p);
      toast.success("头像已更新");
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) toast.error("删除失败");
    else {
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success("已删除 / Deleted");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const categoryEmoji: Record<string, string> = {
    housing: "🏠", jobs: "💼", auto: "🚗", food: "🍜",
    education: "📚", travel: "✈️", driver: "🚕", legal: "⚖️",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">个人中心 / Profile</h1>
          <button onClick={handleLogout} className="p-2 -mr-2 hover:bg-accent rounded-xl text-destructive">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="border border-border rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">{profile?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          {editing && (
            <div className="space-y-3 pt-3 border-t border-border animate-in fade-in slide-in-from-top-2">
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
              <Button onClick={handleSaveProfile} className="w-full rounded-xl">
                保存 / Save
              </Button>
            </div>
          )}
        </div>

        {/* My Posts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">我的发布 / My Posts</h2>
            <span className="text-sm text-muted-foreground">{posts.length} 条</span>
          </div>

          {posts.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-8 text-center">
              <p className="text-muted-foreground text-sm">暂无发布 / No posts yet</p>
              <Button variant="outline" className="mt-3 rounded-xl" onClick={() => navigate("/create-post")}>
                发布第一条 / Create first post
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-xl">{categoryEmoji[post.category] || "📌"}</span>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.price != null && `$${post.price} · `}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 hover:bg-destructive/10 rounded-xl text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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

import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  profile: { name: string; avatar_url: string | null } | null;
  userId: string;
  email: string;
  onAvatarUpdated: (url: string) => void;
}

export default function ProfileHeader({ profile, userId, email, onAvatarUpdated }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("头像不能超过5MB"); return; }
    setUploading(true);
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
            (blob) => resolve(new File([blob!], `avatar-${userId}.jpg`, { type: "image/jpeg" })),
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

      await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      onAvatarUpdated(url);
      toast.success("头像已更新");
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
          </button>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg truncate">{profile?.name || "未设置"}</p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">ID: {userId.slice(0, 8)}</p>
        </div>
      </div>
    </div>
  );
}

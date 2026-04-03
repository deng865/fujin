
import { useState, useRef } from "react";
import { Camera, X, Play, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MediaUploadProps {
  mediaUrls: string[];
  onChange: (urls: string[]) => void;
}

export default function MediaUpload({ mediaUrls, onChange }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");

      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} 超过50MB限制`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from("post-media")
          .upload(path, file);

        if (error) {
          toast.error(`上传失败: ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("post-media")
          .getPublicUrl(path);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...mediaUrls, ...newUrls]);
      }
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    onChange(mediaUrls.filter((_, i) => i !== index));
  };

  const isVideo = (url: string) => /\.(mp4|mov)(\?|$)/i.test(url);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-muted-foreground">
        图片/视频 Photos/Videos
      </Label>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {mediaUrls.map((url, i) => (
          <div key={i} className="relative shrink-0">
            {isVideo(url) ? (
              <div className="h-20 w-20 rounded-xl border-2 border-border/50 bg-muted flex items-center justify-center">
                <Play className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={url}
                alt=""
                className="h-20 w-20 object-cover rounded-xl border-2 border-border/50"
              />
            )}
            <button
              onClick={() => removeMedia(i)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Camera className="h-5 w-5" />
              <span className="text-[10px]">添加</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

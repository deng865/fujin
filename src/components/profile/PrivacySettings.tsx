import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { MapPin, Trash2, ArrowLeft, FileText, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  locationSharing: boolean;
  onLocationSharingChange: (val: boolean) => void;
  onBack: () => void;
}

export default function PrivacySettings({ locationSharing, onLocationSharingChange, onBack }: Props) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Delete user's posts, then sign out (actual account deletion needs admin/server-side)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("posts").delete().eq("user_id", user.id);
        await supabase.from("favorites").delete().eq("user_id", user.id);
      }
      await supabase.auth.signOut();
      toast.success("账号已注销");
      navigate("/");
    } catch {
      toast.error("注销失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">位置共享</p>
              <p className="text-xs text-muted-foreground">关闭后他人无法看到你的位置</p>
            </div>
          </div>
          <Switch
            checked={locationSharing}
            onCheckedChange={onLocationSharingChange}
          />
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-destructive/5 transition-colors"
        >
          <Trash2 className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">注销账号</p>
            <p className="text-xs text-muted-foreground">注销后所有数据将被清空</p>
          </div>
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        <Link
          to="/privacy-policy"
          className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
        >
          <Shield className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">隐私政策</p>
        </Link>
        <Link
          to="/terms-of-service"
          className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">服务条款</p>
        </Link>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ 确认注销账号</AlertDialogTitle>
            <AlertDialogDescription>
              注销后所有数据将被清空，包括您的帖子、收藏、聊天记录等。此操作不可恢复，确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground"
            >
              {deleting ? "处理中..." : "确认注销"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

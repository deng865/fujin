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
  hasMobilePosts: boolean;
  hasActiveTrip: boolean;
  userId?: string;
}

export default function PrivacySettings({ locationSharing, onLocationSharingChange, onBack, hasMobilePosts, hasActiveTrip, userId }: Props) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [showTripWarning, setShowTripWarning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = (val: boolean) => {
    if (val) {
      onLocationSharingChange(true);
      return;
    }
    if (hasMobilePosts) {
      setShowMobileWarning(true);
    } else if (hasActiveTrip) {
      setShowTripWarning(true);
    } else {
      onLocationSharingChange(false);
    }
  };

  const confirmMobileOffline = async () => {
    if (userId) {
      await supabase.from("posts").update({ is_visible: false })
        .eq("user_id", userId).eq("is_mobile", true);
    }
    onLocationSharingChange(false);
    toast.success("位置共享已关闭，移动服务已下架");
    setShowMobileWarning(false);
  };

  const confirmTripClose = () => {
    onLocationSharingChange(false);
    setShowTripWarning(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
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

      <div className="bg-card border border-border rounded-2xl">
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
            onCheckedChange={handleToggle}
          />
        </div>
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

      <div className="bg-card border border-border rounded-2xl">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-destructive/5 transition-colors rounded-2xl"
        >
          <Trash2 className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">注销账号</p>
            <p className="text-xs text-muted-foreground">注销后所有数据将被清空</p>
          </div>
        </button>
      </div>

      {/* Delete account confirmation */}
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

      {/* Mobile merchant warning - yellow */}
      <AlertDialog open={showMobileWarning} onOpenChange={setShowMobileWarning}>
        <AlertDialogContent className="border-2 border-amber-400">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600">⚠️ 移动服务将下架</AlertDialogTitle>
            <AlertDialogDescription>
              关闭位置共享后，您的移动服务帖子将从地图上消失（设为离线状态）。如需重新上线，请前往"我的发布"手动操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMobileOffline}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              确认关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Active trip warning - orange */}
      <AlertDialog open={showTripWarning} onOpenChange={setShowTripWarning}>
        <AlertDialogContent className="border-2 border-orange-400">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">🚗 行程进行中</AlertDialogTitle>
            <AlertDialogDescription>
              您有进行中的行程，关闭位置共享将增加司机寻找您的难度，建议行程结束后再关闭。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTripClose}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              仍然关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Trash2, FileText, Shield } from "lucide-react";
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
  browseEnabled: boolean;
  onBrowseChange: (val: boolean) => void;
  saving: boolean;
  hasMobilePosts: boolean;
  hasActiveTrip: boolean;
  userId?: string;
}

export default function PrivacySettings({ locationSharing, onLocationSharingChange, browseEnabled, onBrowseChange, saving, hasMobilePosts, hasActiveTrip, userId }: Props) {
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

  const confirmMobileOffline = () => {
    onLocationSharingChange(false);
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
      <section className="border-b border-border py-4 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">浏览定位</h2>
            <p className="text-xs text-muted-foreground mt-1">用于计算附近服务距离，不向公众或商家展示您的浏览位置。</p>
          </div>
          <Switch aria-label="浏览定位" checked={browseEnabled} onCheckedChange={onBrowseChange} />
        </div>
        {!browseEnabled && <p className="text-xs text-muted-foreground">已停止浏览定位，可在首页手动选择区域；距离为区域参考距离。</p>}
      </section>
      {hasMobilePosts && <section className="border-b border-border py-4 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">移动服务接单定位</h2>
            <p className="text-xs text-muted-foreground mt-1">仅在线且在接单时段内更新服务位置。关闭会下线全部移动服务并停止服务位置上传。</p>
          </div>
          <Switch aria-label="移动服务接单定位" checked={locationSharing} onCheckedChange={handleToggle} disabled={saving} />
        </div>
        <p className="text-xs text-muted-foreground">开启不自动上线，请到「我的发布」选择服务。定时时段不会覆盖手动收工。</p>
      </section>}
      {hasActiveTrip && <p className="text-xs text-muted-foreground">行程位置共享独立控制，请在聊天中结束共享；浏览定位和收工开关不会中断当前行程。</p>}

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
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle >⚠️ 移动服务将下架</AlertDialogTitle>
            <AlertDialogDescription>
              关闭后全部移动服务立即下线，停止服务位置上传。再次开启不会自动上线；请在「我的发布」手动上线。进行中行程的位置共享不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMobileOffline}
              disabled={saving}
            >
              确认关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Active trip warning - orange */}
      <AlertDialog open={showTripWarning} onOpenChange={setShowTripWarning}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle >🚗 行程进行中</AlertDialogTitle>
            <AlertDialogDescription>
              您有进行中的行程，关闭位置共享将增加司机寻找您的难度，建议行程结束后再关闭。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTripClose}

            >
              仍然关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

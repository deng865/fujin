import { useEffect, useState } from "react";
import { MoreVertical, Flag, Shield, ShieldOff, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  myId: string;
  otherId: string;
  otherName?: string;
  conversationId: string;
  onBlocked?: () => void;
}

const REPORT_REASONS = [
  "骚扰 / 辱骂",
  "诈骗 / 欺诈",
  "色情 / 不当内容",
  "垃圾信息 / 广告",
  "违法内容",
  "其他",
];

/**
 * Apple App Store Guideline 1.2 (UGC) requires:
 * - In-app reporting of objectionable content
 * - Ability to block abusive users
 * - Action within 24 hours
 *
 * This menu provides both report + block actions in every chat conversation.
 */
export default function ChatHeaderMenu({
  myId,
  otherId,
  otherName,
  conversationId,
  onBlocked,
}: Props) {
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loadingState, setLoadingState] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await (supabase as any)
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", myId)
        .eq("blocked_id", otherId)
        .maybeSingle();
      if (!cancelled) {
        setBlocked(!!data);
        setLoadingState(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [myId, otherId]);

  const handleReport = async () => {
    if (!reason) {
      toast.error("请选择举报原因");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: myId,
        post_id: otherId, // re-using reports table; post_id stores reported user id for chat context
        reason: `[聊天举报] ${reason}`,
        details: `会话 ID: ${conversationId}\n被举报用户: ${otherName || otherId}\n${details || ""}`.trim(),
      } as any);
      if (error) throw error;
      toast.success("举报已提交，我们将在 24 小时内处理");
      setShowReport(false);
      setReason("");
      setDetails("");
    } catch (e: any) {
      toast.error(e?.message || "举报失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = async () => {
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("user_blocks").insert({
        blocker_id: myId,
        blocked_id: otherId,
      });
      if (error) throw error;
      setBlocked(true);
      setShowBlock(false);
      toast.success(`已屏蔽 ${otherName || "该用户"}`);
      onBlocked?.();
    } catch (e: any) {
      toast.error(e?.message || "屏蔽失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async () => {
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("user_blocks")
        .delete()
        .eq("blocker_id", myId)
        .eq("blocked_id", otherId);
      if (error) throw error;
      setBlocked(false);
      toast.success("已解除屏蔽");
    } catch (e: any) {
      toast.error(e?.message || "解除屏蔽失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 hover:bg-accent rounded-xl"
            title="更多"
            aria-label="更多操作"
          >
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 z-[200]">
          <DropdownMenuItem onClick={() => setShowReport(true)}>
            <Flag className="h-4 w-4 mr-2 text-destructive" />
            举报
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {loadingState ? (
            <DropdownMenuItem disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              加载中
            </DropdownMenuItem>
          ) : blocked ? (
            <DropdownMenuItem onClick={handleUnblock} disabled={submitting}>
              <ShieldOff className="h-4 w-4 mr-2" />
              解除屏蔽
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setShowBlock(true)}
              className="text-destructive focus:text-destructive"
            >
              <Shield className="h-4 w-4 mr-2" />
              屏蔽用户
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Report dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>举报用户</DialogTitle>
            <DialogDescription>
              请选择举报原因，我们将在 24 小时内审核处理。恶意举报将被记录。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    reason === r
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="详细描述（选填，最多 500 字）"
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReport(false)} disabled={submitting}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={submitting || !reason}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "提交举报"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block confirm */}
      <AlertDialog open={showBlock} onOpenChange={setShowBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>屏蔽 {otherName || "该用户"}？</AlertDialogTitle>
            <AlertDialogDescription>
              屏蔽后：
              <br />• 对方将无法再向您发送消息或来电
              <br />• 此对话将从您的消息列表中隐藏
              <br />• 您可以随时在此处解除屏蔽
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "确认屏蔽"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

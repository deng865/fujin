import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Eye, EyeOff, ChevronRight, Edit, Clock, Settings } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

const categoryEmoji: Record<string, string> = {
  housing: "🏠", jobs: "💼", auto: "🚗", food: "🍜",
  education: "📚", travel: "✈️", driver: "🚕", legal: "⚖️",
};

interface Props {
  posts: UserPost[];
  onPostsChange: (posts: UserPost[]) => void;
}

export default function MyPostsList({ posts, onPostsChange }: Props) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [schedulePost, setSchedulePost] = useState<UserPost | null>(null);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("21:00");

  // --- Mobile: toggle online/offline ---
  const handleToggleOnline = async (post: UserPost) => {
    const newVisible = !post.is_visible;
    const { error } = await supabase
      .from("posts")
      .update({ is_visible: newVisible })
      .eq("id", post.id);

    if (error) { toast.error("操作失败"); return; }
    onPostsChange(posts.map(p => p.id === post.id ? { ...p, is_visible: newVisible } : p));
    toast.success(newVisible ? "已上线 🟢" : "已下线 ⚫");
  };

  // --- Mobile: open auto-schedule dialog ---
  const openScheduleDialog = (post: UserPost) => {
    setOpenTime(post.operating_hours?.open || "09:00");
    setCloseTime(post.operating_hours?.close || "21:00");
    setSchedulePost(post);
  };

  const saveSchedule = async () => {
    if (!schedulePost) return;
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Chicago"; } })();
    const hours = { open: openTime, close: closeTime, timezone: tz };
    const { error } = await supabase
      .from("posts")
      .update({ operating_hours: hours })
      .eq("id", schedulePost.id);

    if (error) { toast.error("保存失败"); return; }
    onPostsChange(posts.map(p => p.id === schedulePost.id ? { ...p, operating_hours: hours } : p));
    setSchedulePost(null);
    toast.success("自动上下线时间已保存 ⏰");
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("posts").delete().eq("id", deleteId);
    if (error) { toast.error("删除失败"); return; }
    onPostsChange(posts.filter(p => p.id !== deleteId));
    setDeleteId(null);
    toast.success("已删除");
  };

  return (
    <>
      <div className="space-y-2">
        {posts.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm">暂无发布</p>
            <button
              onClick={() => navigate("/create-post")}
              className="mt-3 text-sm text-primary font-medium"
            >
              发布第一条 →
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-card border border-border rounded-2xl p-4 space-y-3"
            >
              {/* Post info row */}
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <span className="text-xl">{categoryEmoji[post.category] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {post.price != null && `$${post.price} · `}
                    {new Date(post.created_at).toLocaleDateString()}
                    {post.is_mobile ? (
                      <span className={`ml-1.5 ${post.is_visible ? "text-emerald-500" : "text-muted-foreground"}`}>
                        · {post.is_visible ? "在线" : "离线"}
                      </span>
                    ) : (
                      post.operating_hours && (
                        <span className="ml-1.5 text-muted-foreground">
                          · {post.operating_hours.open}-{post.operating_hours.close}
                        </span>
                      )
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              {/* Action buttons — conditional on type */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                {post.is_mobile ? (
                  /* === Mobile merchant actions === */
                  <>
                    <button
                      onClick={() => handleToggleOnline(post)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors ${
                        post.is_visible
                          ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                          : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      }`}
                    >
                      {post.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {post.is_visible ? "下线" : "上线"}
                    </button>
                    <button
                      onClick={() => openScheduleDialog(post)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      自动上下线
                    </button>
                    <button
                      onClick={() => navigate(`/create-post?edit=${post.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteId(post.id)}
                      className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  /* === Fixed merchant actions === */
                  <>
                    <button
                      onClick={() => navigate(`/create-post?edit=${post.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      修改
                    </button>
                    <button
                      onClick={() => setDeleteId(post.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {posts.find(p => p.id === deleteId)?.is_mobile
                ? "删除后无法恢复，确定要删除这条帖子吗？"
                : "删除后店铺信息将永久丢失且无法恢复，确定要删除吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-schedule dialog for mobile merchants */}
      <Dialog open={!!schedulePost} onOpenChange={(open) => !open && setSchedulePost(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>自动上下线设置</DialogTitle>
            <DialogDescription>设定每日自动上线和下线的时间，系统将在该时段内自动保持在线状态。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">上线时间</Label>
                <Input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">下线时间</Label>
                <Input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} />
              </div>
            </div>
            {schedulePost?.operating_hours && (
              <p className="text-xs text-muted-foreground">
                当前设置：{schedulePost.operating_hours.open} - {schedulePost.operating_hours.close}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulePost(null)}>取消</Button>
            <Button onClick={saveSchedule}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

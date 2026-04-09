import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, RefreshCw, Eye, EyeOff, ChevronRight } from "lucide-react";
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

interface UserPost {
  id: string;
  title: string;
  category: string;
  price: number | null;
  created_at: string;
  is_visible: boolean;
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

  const handleBump = async (post: UserPost) => {
    // Check if another active post exists in same category
    const sameCategory = posts.filter(p => p.category === post.category && p.id !== post.id && p.is_visible);
    if (sameCategory.length > 0) {
      toast.error("该分类下已有一条活跃帖子，请先下架其他帖子");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({ updated_at: new Date().toISOString(), is_visible: true })
      .eq("id", post.id);

    if (error) { toast.error("刷新失败"); return; }

    onPostsChange(posts.map(p =>
      p.id === post.id ? { ...p, is_visible: true, created_at: p.created_at } : p
    ));
    toast.success("帖子已刷新上线 ✨");
  };

  const handleToggleVisibility = async (post: UserPost) => {
    if (!post.is_visible) {
      // Going visible — enforce one-active-per-category
      const sameCategory = posts.filter(p => p.category === post.category && p.id !== post.id && p.is_visible);
      if (sameCategory.length > 0) {
        toast.error("该分类下已有一条活跃帖子，请先下架其他帖子");
        return;
      }
    }

    const newVisible = !post.is_visible;
    const { error } = await supabase
      .from("posts")
      .update({ is_visible: newVisible })
      .eq("id", post.id);

    if (error) { toast.error("操作失败"); return; }
    onPostsChange(posts.map(p => p.id === post.id ? { ...p, is_visible: newVisible } : p));
    toast.success(newVisible ? "已上架" : "已下架");
  };

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
                    {!post.is_visible && (
                      <span className="ml-1.5 text-orange-500">· 已下架</span>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <button
                  onClick={() => handleBump(post)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新
                </button>
                <button
                  onClick={() => navigate(`/create-post?edit=${post.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleToggleVisibility(post)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors ${
                    post.is_visible
                      ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {post.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {post.is_visible ? "下架" : "上架"}
                </button>
                <button
                  onClick={() => setDeleteId(post.id)}
                  className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，确定要删除这条帖子吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

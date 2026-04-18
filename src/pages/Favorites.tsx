import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart, MapPin, DollarSign, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import FavoriteButton from "@/components/FavoriteButton";
import { useAuth } from "@/hooks/useAuth";

interface FavoritePost {
  id: string; // favorites.id
  post_id: string;
  created_at: string;
  post?: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    price: number | null;
    latitude: number;
    longitude: number;
    image_urls: string[] | null;
    created_at: string;
  } | null;
}

const categoryLabels: Record<string, string> = {
  housing: "🏠 房产",
  jobs: "💼 找工",
  auto: "🚗 汽车",
  food: "🍜 美食",
  education: "📚 教育",
  travel: "✈️ 旅游",
  driver: "🚕 司机",
  legal: "⚖️ 法律",
};

export default function Favorites() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoritePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id, post_id, created_at, posts(id, title, description, category, price, latitude, longitude, image_urls, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (data) {
        setFavorites(data.map((f: any) => ({ ...f, post: f.posts })));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, authLoading, navigate]);

  const handleRemove = async (favoriteId: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    const { error } = await supabase.from("favorites").delete().eq("id", favoriteId);
    if (error) {
      toast({ title: "取消收藏失败", variant: "destructive" });
    } else {
      toast({ title: "已取消收藏" });
    }
  };

  // Get unique categories for filter
  const categories = [...new Set(favorites.map((f) => f.post?.category).filter(Boolean))] as string[];

  const filtered = selectedCategory
    ? favorites.filter((f) => f.post?.category === selectedCategory)
    : favorites;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ml-2 text-lg font-semibold">我的收藏</h1>
          <span className="ml-auto text-sm text-muted-foreground">{favorites.length} 个</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Heart className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">{favorites.length === 0 ? "还没有收藏" : "该分类下没有收藏"}</p>
            <p className="text-xs mt-1">浏览帖子时点击爱心即可收藏</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((fav) => {
              const post = fav.post;
              if (!post) return null;
              return (
                <div key={fav.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                  {/* Thumbnail */}
                  <button
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="shrink-0"
                  >
                    {post.image_urls?.[0] ? (
                      <img src={post.image_urls[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </button>

                  {/* Content */}
                  <button
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{post.title}</p>
                        <span className="text-[11px] text-muted-foreground">
                          {categoryLabels[post.category] || post.category}
                        </span>
                      </div>
                    </div>
                    {post.price != null && (
                      <p className="text-sm font-semibold text-primary flex items-center gap-0.5 mt-0.5">
                        <DollarSign className="h-3 w-3" />{post.price.toLocaleString()}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      收藏于 {formatDistanceToNow(new Date(fav.created_at), { addSuffix: true, locale: zhCN })}
                    </p>
                  </button>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(fav.id)}
                    className="shrink-0 p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

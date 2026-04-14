import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, RefreshCw, Play, Clock, ArrowUpDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import FavoriteButton from "@/components/FavoriteButton";
import PostBottomSheet from "@/components/PostBottomSheet";
import PostCreditBadge from "@/components/PostCreditBadge";
import { usePostRatings } from "@/hooks/usePostRating";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  latitude: number;
  longitude: number;
  image_urls: string[] | null;
  created_at: string;
  user_id: string;
  is_mobile?: boolean;
}

const TABS = [
  { id: "all", label: "全部" },
  { id: "latest", label: "最新" },
  { id: "nearby", label: "附近" },
  { id: "video", label: "视频" },
];

const categoryLabels: Record<string, string> = {
  housing: "🏠 房产", jobs: "💼 招工", auto: "🚗 汽车",
  food: "🍜 美食", education: "📚 教育", travel: "✈️ 旅游",
  driver: "🚕 司机", legal: "⚖️ 法律",
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kmToMiles(km: number) {
  return km * 0.621371;
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
}

function hasVideo(urls: string[] | null) {
  return urls?.some(isVideo) ?? false;
}

export default function Discovery() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState<"distance" | "time">("time");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { isFavorite, toggleFavorite, favoriteIds, userId: favUserId } = useFavorites();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      () => {}
    );
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("id, title, description, category, price, latitude, longitude, image_urls, created_at, user_id, is_mobile")
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Pull-to-refresh handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling) return;
    const dy = Math.max(0, Math.min(80, e.touches[0].clientY - startY.current));
    setPullY(dy);
  };
  const onTouchEnd = () => {
    if (pullY > 50) handleRefresh();
    setPullY(0);
    setPulling(false);
  };

  const postIds = posts.map(p => p.id);
  const { ratings: postRatings } = usePostRatings(postIds);

  // Filter and sort
  const filtered = posts.filter((p) => {
    if (activeTab === "video") return hasVideo(p.image_urls);
    if (activeTab === "nearby" && userLat != null && userLng != null) {
      return haversineKm(userLat, userLng, p.latitude, p.longitude) <= 25;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if ((activeTab === "nearby" || sortBy === "distance") && userLat != null && userLng != null) {
      return haversineKm(userLat, userLng, a.latitude, a.longitude) - haversineKm(userLat, userLng, b.latitude, b.longitude);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleToggleFavorite = async (postId: string) => {
    if (!favUserId) { navigate("/auth"); return; }
    await toggleFavorite(postId);
  };


  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-xl border-b border-border/30 pt-[env(safe-area-inset-top)] px-4 pb-2 z-10">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-xl font-bold text-foreground">发现</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy(sortBy === "distance" ? "time" : "distance")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-accent text-accent-foreground active:scale-95 transition-transform"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === "distance" ? "距离优先" : "时间优先"}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-full bg-accent text-accent-foreground active:scale-90 transition-transform"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-accent text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: pullY > 0 ? pullY : 0 }}
      >
        <RefreshCw className={cn("h-5 w-5 text-muted-foreground transition-transform", pullY > 50 && "text-primary rotate-180")} />
      </div>

      {/* Masonry grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pb-24"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading ? (
          <div className="columns-2 gap-3 pt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-3 break-inside-avoid rounded-2xl bg-accent animate-pulse" style={{ height: `${180 + (i % 3) * 60}px` }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">暂无内容</p>
          </div>
        ) : (
          <div className="columns-2 gap-3 pt-3">
            {sorted.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userLat={userLat}
                userLng={userLng}
                isFavorite={isFavorite(post.id)}
                onToggleFavorite={() => handleToggleFavorite(post.id)}
                onSelect={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      <PostBottomSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        isFavorite={selectedPost ? isFavorite(selectedPost.id) : false}
        onToggleFavorite={handleToggleFavorite}
        userLat={userLat ?? undefined}
        userLng={userLng ?? undefined}
      />

    </div>
  );
}

function PostCard({
  post,
  userLat,
  userLng,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: {
  post: Post;
  userLat: number | null;
  userLng: number | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
}) {
  const coverUrl = post.image_urls?.[0];
  const hasVid = hasVideo(post.image_urls);
  const distKm = userLat != null && userLng != null ? haversineKm(userLat, userLng, post.latitude, post.longitude) : null;
  const distMiles = distKm != null ? kmToMiles(distKm) : null;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN });

  // Varied heights for masonry effect
  const hasImage = !!coverUrl;

  return (
    <div
      className="mb-3 break-inside-avoid rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
      onClick={onSelect}
    >
      {/* Cover image */}
      {hasImage && (
        <div className="relative">
          {isVideo(coverUrl!) ? (
            <div className="relative">
              <video src={coverUrl!} className="w-full object-cover" style={{ maxHeight: 240 }} muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
                  <Play className="h-5 w-5 text-white ml-0.5" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={coverUrl!}
              alt={post.title}
              className="w-full object-cover"
              style={{ maxHeight: 240 }}
              loading="lazy"
            />
          )}

          {/* Favorite button overlay */}
          <div className="absolute top-2 right-2">
            <FavoriteButton
              isFavorite={isFavorite}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              size="sm"
              className="bg-black/30 backdrop-blur-sm text-white hover:text-destructive"
            />
          </div>

          {/* Video badge */}
          {hasVid && !isVideo(coverUrl!) && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium">
              <Play className="h-2.5 w-2.5" />
              视频
            </div>
          )}
        </div>
      )}

      {/* Card content */}
      <div className="p-3 space-y-1.5">
        {/* Category tag */}
        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-muted-foreground">
          {categoryLabels[post.category] || post.category}
        </span>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{post.title}</h3>

        {/* Price */}
        {post.price != null && (
          <p className="text-sm font-bold text-primary">${post.price.toLocaleString()}</p>
        )}

        {/* Bottom row: distance + time */}
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {distMiles != null
              ? (distMiles < 0.1 ? "附近" : `${distMiles.toFixed(1)} mi`)
              : "定位中..."}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo}
          </span>
        </div>

        {/* No-image cards: add favorite button inline */}
        {!hasImage && (
          <div className="flex justify-end pt-1">
            <FavoriteButton
              isFavorite={isFavorite}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

import { useRef, useState, useCallback, useEffect } from "react";
import { MapPin, Clock, Play, X } from "lucide-react";
import MapFilterChips, { type MapFilters } from "@/components/MapFilterChips";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FavoriteButton from "@/components/FavoriteButton";
import InlinePostDetail from "@/components/InlinePostDetail";

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
  is_mobile?: boolean;
  operating_hours?: any;
  live_latitude?: number | null;
  live_longitude?: number | null;
  live_updated_at?: string | null;
}

const categoryLabels: Record<string, string> = {
  housing: "🏠 房产", jobs: "💼 求职招聘", auto: "🚗 汽车",
  food: "🍜 美食", education: "📚 教育", travel: "✈️ 旅游",
  driver: "🚕 司机", legal: "⚖️ 法律", rent: "🏠 房子出租",
  beauty: "💅 美容美发", dating: "❤️ 约会", other: "⭐ 其他",
  "second-hand goods": "🛍️ 二手商品", "home services": "🔧 家庭服务",
  "medical services": "🏥 医疗服务", "law and accounting": "⚖️ 法律/会计",
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

interface MapListSheetProps {
  posts: Post[];
  userLat: number;
  userLng: number;
  selectedPost: Post | null;
  onSelectPost: (post: Post | null) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (postId: string) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  selectedCategory?: string | null;
  mapTapped?: number;
  onSheetHeightChange?: (height: number) => void;
}

type SheetState = "hidden" | "peek" | "half" | "full";

const BOTTOM_NAV = 72;
const HANDLE_HEIGHT = 28;

export default function MapListSheet({
  posts, userLat, userLng, selectedPost, onSelectPost,
  favoriteIds, onToggleFavorite, filters, onFiltersChange,
  selectedCategory, mapTapped = 0, onSheetHeightChange,
}: MapListSheetProps) {
  const [state, setState] = useState<SheetState>("peek");
  const prevMapTapped = useRef(mapTapped);

  // Auto-expand to full when a post is selected
  useEffect(() => {
    if (selectedPost) {
      setState("full");
    }
  }, [selectedPost]);

  // Auto-expand when a category is selected
  useEffect(() => {
    if (selectedCategory && !selectedPost) {
      setState("half");
    }
  }, [selectedCategory, selectedPost]);

  // Collapse when map is tapped (only on new taps)
  useEffect(() => {
    if (mapTapped > 0 && mapTapped !== prevMapTapped.current) {
      prevMapTapped.current = mapTapped;
      if (selectedPost) {
        onSelectPost(null);
      }
      setState("peek");
    }
  }, [mapTapped, selectedPost, onSelectPost]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragRef = useRef({ startY: 0, startState: state as SheetState });
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const getHeight = useCallback((s: SheetState) => {
    const vh = window.innerHeight;
    switch (s) {
      case "hidden": return HANDLE_HEIGHT;
      case "peek": return 100;
      case "half": return Math.round(vh * 0.45);
      case "full": return Math.round(vh * 0.85);
    }
  }, []);

  const currentHeight = getHeight(state);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // In detail mode, only allow drag from handle area or when scrolled to top
    if (selectedPost && state === "full") {
      const detailEl = detailScrollRef.current;
      const touchY = e.touches[0].clientY;
      const sheetTop = sheetRef.current?.getBoundingClientRect().top ?? 0;
      const handleZone = sheetTop + HANDLE_HEIGHT + 20;
      // Allow drag if touching the handle area or detail content is scrolled to top
      if (touchY > handleZone && detailEl && detailEl.scrollTop > 0) return;
    }

    const list = listRef.current;
    if (!selectedPost && list && state === "full" && list.scrollTop > 0) return;
    if (!selectedPost && list && (state === "half" || state === "full")) {
      const listRect = list.getBoundingClientRect();
      const touchY = e.touches[0].clientY;
      if (touchY >= listRect.top && touchY <= listRect.bottom && list.scrollTop > 0) return;
    }

    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.startState = state;
    setIsDragging(true);
  }, [state, selectedPost]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const dy = dragRef.current.startY - e.touches[0].clientY;
    setDragOffset(dy);
  }, [isDragging]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const dy = dragOffset;
    const threshold = 50;

    // In detail mode, swipe down dismisses detail → back to list
    if (selectedPost && dy < -threshold) {
      onSelectPost(null);
      setState("half");
      setDragOffset(0);
      return;
    }

    if (dy > threshold) {
      setState((s) => {
        if (s === "hidden") return "peek";
        if (s === "peek") return "half";
        if (s === "half") return "full";
        return s;
      });
    } else if (dy < -threshold) {
      setState((s) => {
        if (s === "full") return "half";
        if (s === "half") return "peek";
        if (s === "peek") return "hidden";
        return s;
      });
    }
    setDragOffset(0);
  }, [isDragging, dragOffset, selectedPost, onSelectPost]);

  const displayHeight = isDragging
    ? Math.max(HANDLE_HEIGHT, Math.min(window.innerHeight * 0.85, currentHeight + dragOffset))
    : currentHeight;

  useEffect(() => {
    onSheetHeightChange?.(displayHeight);
  }, [displayHeight, onSheetHeightChange]);

  const sorted = [...posts].sort((a, b) => {
    const dA = haversineKm(userLat, userLng, a.latitude, a.longitude);
    const dB = haversineKm(userLat, userLng, b.latitude, b.longitude);
    return dA - dB;
  });

  const handleBackToList = useCallback(() => {
    onSelectPost(null);
    setState("half");
  }, [onSelectPost]);

  return (
    <div
      ref={sheetRef}
      className={cn(
        "absolute left-0 right-0 z-20 bg-background rounded-t-2xl flex flex-col",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.12)]",
        selectedPost ? "" : "touch-none select-none",
        !isDragging && "transition-[height] duration-300 ease-out"
      )}
      style={{
        bottom: `${BOTTOM_NAV}px`,
        height: `${displayHeight}px`,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle area */}
      <div className="shrink-0">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {state !== "hidden" && !selectedPost && (
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">附近</h3>
              <span className="text-xs text-muted-foreground">{sorted.length} 个结果</span>
            </div>
            <button
              onClick={() => setState("hidden")}
              className="p-1.5 rounded-full hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Detail mode: render inline detail */}
      {selectedPost && (state === "half" || state === "full") && (
        <InlinePostDetail
          post={selectedPost}
          onBack={handleBackToList}
          isFavorite={favoriteIds.has(selectedPost.id)}
          onToggleFavorite={onToggleFavorite}
          userLat={userLat}
          userLng={userLng}
          scrollRef={detailScrollRef}
        />
      )}

      {/* List mode */}
      {!selectedPost && (state === "half" || state === "full") && (
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain touch-auto"
        >
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MapPin className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">附近暂无内容</p>
              {selectedCategory && (
                <p className="text-xs mt-1 text-muted-foreground/70">请扩大搜索范围</p>
              )}
            </div>
          ) : (
            <div className="px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
              {sorted.map((post, idx) => {
                const distKm = haversineKm(userLat, userLng, post.latitude, post.longitude);
                const distMi = kmToMiles(distKm);
                const coverUrls = post.image_urls?.slice(0, 3) || [];
                const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN });
                const isFav = favoriteIds.has(post.id);

                return (
                  <div key={post.id}>
                    {idx > 0 && <div className="border-t border-border/20 my-1" />}
                    <div
                      onClick={() => onSelectPost(post)}
                      className="py-3 active:bg-accent/50 transition-colors cursor-pointer rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[15px] font-semibold text-foreground line-clamp-1">{post.title}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {post.price != null && (
                              <span className="text-xs text-muted-foreground">${post.price.toLocaleString()}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{categoryLabels[post.category] || post.category}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-primary font-medium">
                              {distMi < 0.1 ? "附近" : `${distMi.toFixed(1)} mi`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                          </div>
                          {post.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{post.description}</p>
                          )}
                        </div>
                        <FavoriteButton
                          isFavorite={isFav}
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
                          size="sm"
                        />
                      </div>

                      {coverUrls.length > 0 && (
                        <div className="flex gap-1.5 mt-2.5 overflow-hidden rounded-xl">
                          {coverUrls.map((url, i) => (
                            <div
                              key={i}
                              className={cn(
                                "relative bg-muted overflow-hidden",
                                coverUrls.length === 1
                                  ? "w-full aspect-[2/1] rounded-xl"
                                  : i === 0
                                    ? "flex-[2] aspect-[4/3] rounded-l-xl"
                                    : "flex-1 aspect-[3/4] last:rounded-r-xl"
                              )}
                            >
                              {isVideo(url) ? (
                                <>
                                  <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Play className="h-6 w-6 text-white drop-shadow-lg" />
                                  </div>
                                </>
                              ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Peek mode */}
      {!selectedPost && state === "peek" && sorted.length > 0 && (
        <div className="px-4 overflow-hidden flex-1">
          <div
            onClick={() => onSelectPost(sorted[0])}
            className="flex items-center gap-3 py-1 cursor-pointer"
          >
            {sorted[0].image_urls?.[0] && (
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                <img src={sorted[0].image_urls[0]} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground line-clamp-1">{sorted[0].title}</h4>
              <span className="text-xs text-muted-foreground">
                {kmToMiles(haversineKm(userLat, userLng, sorted[0].latitude, sorted[0].longitude)).toFixed(1)} mi
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

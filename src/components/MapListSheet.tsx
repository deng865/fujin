import { useRef, useState } from "react";
import { MapPin, Clock, ChevronUp, Play } from "lucide-react";
import MapFilterChips, { type MapFilters } from "@/components/MapFilterChips";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FavoriteButton from "@/components/FavoriteButton";

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
}

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

interface MapListSheetProps {
  posts: Post[];
  userLat: number;
  userLng: number;
  onSelectPost: (post: Post) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (postId: string) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
}

type SheetState = "peek" | "half" | "full";

export default function MapListSheet({ posts, userLat, userLng, onSelectPost, favoriteIds, onToggleFavorite, filters, onFiltersChange }: MapListSheetProps) {
  const [state, setState] = useState<SheetState>("peek");
  const dragRef = useRef({ startY: 0, startHeight: 0 });
  const sheetRef = useRef<HTMLDivElement>(null);

  const heights: Record<SheetState, string> = {
    peek: "120px",
    half: "50vh",
    full: "85vh",
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.startHeight = sheetRef.current?.offsetHeight || 0;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = dragRef.current.startY - e.changedTouches[0].clientY;
    if (dy > 60) {
      setState((s) => s === "peek" ? "half" : "full");
    } else if (dy < -60) {
      setState((s) => s === "full" ? "half" : "peek");
    }
  };

  const sorted = [...posts].sort((a, b) => {
    const dA = haversineKm(userLat, userLng, a.latitude, a.longitude);
    const dB = haversineKm(userLat, userLng, b.latitude, b.longitude);
    return dA - dB;
  });

  return (
    <div
      ref={sheetRef}
      className="absolute bottom-[72px] left-0 right-0 z-20 bg-background rounded-t-3xl shadow-2xl border-t border-border/30 transition-all duration-300 ease-out flex flex-col"
      style={{ height: heights[state] }}
    >
      {/* Drag handle */}
      <div
        className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => setState((s) => s === "peek" ? "half" : s === "half" ? "full" : "half")}
      >
        <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
        <div className="flex items-center gap-1 mt-1">
          <ChevronUp className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", state === "full" && "rotate-180")} />
          <span className="text-xs text-muted-foreground font-medium">
            {sorted.length} 个结果
          </span>
        </div>
      </div>

      {/* Filter Chips */}
      <MapFilterChips filters={filters} onChange={onFiltersChange} />

      {/* Post list */}
      <div className="flex-1 overflow-y-auto px-3 pb-[calc(20px+env(safe-area-inset-bottom))]">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">附近暂无内容</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((post) => {
              const distKm = haversineKm(userLat, userLng, post.latitude, post.longitude);
              const distMi = kmToMiles(distKm);
              const coverUrl = post.image_urls?.[0];
              const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN });
              const isFav = favoriteIds.has(post.id);

              return (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="flex gap-3 p-3 rounded-2xl bg-card border border-border/30 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  {/* Thumbnail */}
                  {coverUrl && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                      {isVideo(coverUrl) ? (
                        <div className="relative w-full h-full">
                          <video src={coverUrl} className="w-full h-full object-cover" muted preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-5 w-5 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground">
                          {categoryLabels[post.category] || post.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground line-clamp-1">{post.title}</h4>
                      {post.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        {post.price != null && (
                          <span className="text-xs font-bold text-primary">${post.price.toLocaleString()}</span>
                        )}
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {distMi < 0.1 ? "附近" : `${distMi.toFixed(1)} mi`}
                        </span>
                      </div>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Favorite */}
                  <div className="shrink-0 flex items-start pt-1">
                    <FavoriteButton
                      isFavorite={isFav}
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useRef, useState, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Play, X, Navigation, Send, Phone, Share2, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FavoriteButton from "@/components/FavoriteButton";
import InlinePostDetail from "@/components/InlinePostDetail";
import { isCurrentlyOpen } from "@/lib/operatingHours";
import { useMapChoice } from "@/components/MapChoiceSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { checkActiveTripLock } from "@/lib/tripLock";
import { usePostRatings } from "@/hooks/usePostRating";
import PostCreditBadge from "@/components/PostCreditBadge";

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
  user_id?: string;
}

const categoryLabels: Record<string, string> = {
  housing: "🏠 房产", jobs: "💼 求职招聘", auto: "🚗 汽车",
  food: "🍜 美食", education: "📚 教育", travel: "✈️ 旅游",
  driver: "🚕 司机", legal: "⚖️ 法律", rent: "🏠 房子出租",
  beauty: "💅 美容美发", dating: "❤️ 约会", other: "⭐ 其他",
  "second-hand goods": "🛍️ 二手商品", "home services": "🔧 家庭服务",
  "medical services": "🏥 医疗服务", "law and accounting": "⚖️ 法律/会计",
};

const greetingTemplates: Record<string, string> = {
  housing: "你好，我对你发布的房产信息很感兴趣，请问还在吗？",
  driver: "你好，我看到你发布的司机服务，请问现在可以接单吗？",
  jobs: "你好，我对你发布的招工信息很感兴趣，请问还在招人吗？",
  default: "你好，我看到你在地图上发布的信息，想了解更多详情。",
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
  hasUserLocation?: boolean;
  selectedPost: Post | null;
  onSelectPost: (post: Post | null) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (postId: string) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  selectedCategory?: string | null;
  mapTapped?: number;
  mapSwipedUp?: number;
}

import { type MapFilters } from "@/components/MapFilterChips";

type SheetState = "peek" | "half" | "full";

const BOTTOM_NAV = 56;
const HANDLE_HEIGHT = 28;

export interface MapListSheetHandle {
  beginDrag: (clientY: number) => void;
  updateDrag: (clientY: number) => void;
  endDrag: () => void;
}

const MapListSheet = forwardRef<MapListSheetHandle, MapListSheetProps>(function MapListSheet({
  posts, userLat, userLng, hasUserLocation = false, selectedPost, onSelectPost,
  favoriteIds, onToggleFavorite, filters, onFiltersChange,
  selectedCategory, mapTapped = 0, mapSwipedUp = 0,
}, ref) {
  const [state, setState] = useState<SheetState>("peek");
  const [ratingsEnabled, setRatingsEnabled] = useState(false);
  const prevMapTapped = useRef(mapTapped);

  // When a post is selected, spring to half ONLY if currently in peek (preserve half/full).
  useEffect(() => {
    if (selectedPost && state === "peek") {
      setState("half");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost]);

  // Selecting a category should NOT force a state change — keep current drawer position.

  useEffect(() => {
    if (mapTapped > 0 && mapTapped !== prevMapTapped.current) {
      prevMapTapped.current = mapTapped;
      if (selectedPost) {
        onSelectPost(null);
      }
      setState("peek");
    }
  }, [mapTapped, selectedPost, onSelectPost]);

  // mapSwipedUp prop is kept for backward compat but no longer triggers discrete state jumps.
  // Drawer drag is now driven directly via the imperative handle for smooth follow-finger motion.

  // Google Maps-style drawer: spring physics + velocity-based snap + rubber-band
  // We drive height via a single value (animatedHeight) updated by rAF, not React state per frame.
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const getHeight = useCallback((s: SheetState) => {
    const vh = window.innerHeight;
    switch (s) {
      case "peek": return 120;
      case "half": return Math.round(vh * 0.5);
      case "full": return Math.round(vh * 0.9);
    }
  }, []);

  const currentHeight = getHeight(state);

  // Imperative animation engine — bypasses React state for 60fps drag/spring.
  const heightRef = useRef(currentHeight);
  const [, forceRender] = useState(0);
  const rafRef = useRef<number | null>(null);
  const springRef = useRef<{
    velocity: number;
    target: number;
    lastTs: number;
  } | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startY: number;
    startHeight: number;
    samples: Array<{ y: number; t: number }>;
    rafPending: boolean;
    pendingY: number;
  }>({
    active: false,
    startY: 0,
    startHeight: 0,
    samples: [],
    rafPending: false,
    pendingY: 0,
  });

  const setHeight = useCallback((h: number) => {
    heightRef.current = h;
    const el = sheetRef.current;
    if (el) el.style.height = `${h}px`;
  }, []);

  // Sync height when state changes externally (selectedPost, mapTapped, etc.)
  // Spring-animate to the new target instead of CSS transition.
  const animateTo = useCallback((target: number, initialVelocity = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    springRef.current = { velocity: initialVelocity, target, lastTs: 0 };

    const stiffness = 180; // softer = more iOS-like
    const damping = 26;

    const tick = (ts: number) => {
      const s = springRef.current;
      if (!s) return;
      if (s.lastTs === 0) s.lastTs = ts;
      const dt = Math.min((ts - s.lastTs) / 1000, 1 / 30); // clamp dt
      s.lastTs = ts;

      const x = heightRef.current;
      const force = -stiffness * (x - s.target);
      const damp = -damping * s.velocity;
      const accel = force + damp;
      s.velocity += accel * dt;
      const next = x + s.velocity * dt;
      setHeight(next);

      if (Math.abs(s.velocity) < 0.5 && Math.abs(next - s.target) < 0.5) {
        setHeight(s.target);
        springRef.current = null;
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [setHeight]);

  // Re-target spring whenever React `state` changes (and we're not actively dragging)
  useEffect(() => {
    if (dragRef.current.active) return;
    animateTo(getHeight(state));
  }, [state, animateTo, getHeight]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Rubber-band: limit overshoot below peek (60px give) and above full
  const clampWithRubber = useCallback((h: number) => {
    const vh = window.innerHeight;
    const min = 120 - 60; // peek - rubber give
    const max = Math.round(vh * 0.9);
    if (h < min) return min - (min - h) * 0.4;
    if (h > max) return max + (h - max) * 0.3;
    return h;
  }, []);

  const beginDragInternal = useCallback((clientY: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    springRef.current = null;
    dragRef.current = {
      active: true,
      startY: clientY,
      startHeight: heightRef.current,
      samples: [{ y: clientY, t: performance.now() }],
      rafPending: false,
      pendingY: clientY,
    };
    forceRender((n) => n + 1); // mark dragging for class toggling
  }, []);

  const updateDragInternal = useCallback((clientY: number) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.pendingY = clientY;
    if (d.rafPending) return;
    d.rafPending = true;
    requestAnimationFrame(() => {
      d.rafPending = false;
      if (!d.active) return;
      const y = d.pendingY;
      const dy = d.startY - y;
      const target = clampWithRubber(d.startHeight + dy);
      setHeight(target);
      d.samples.push({ y, t: performance.now() });
      if (d.samples.length > 6) d.samples.shift();
    });
  }, [clampWithRubber, setHeight]);

  const endDragInternal = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;

    // Compute velocity from last samples (px/ms, positive = moving up = drawer growing)
    const samples = d.samples;
    let velocity = 0;
    if (samples.length >= 2) {
      const last = samples[samples.length - 1];
      // Use samples within last 100ms for a clean velocity reading
      let first = samples[0];
      for (let i = samples.length - 1; i >= 0; i--) {
        if (last.t - samples[i].t > 100) { first = samples[i + 1] ?? samples[i]; break; }
        first = samples[i];
      }
      const dt = last.t - first.t;
      if (dt > 0) {
        // dy in screen px (down positive); drawer grows when finger moves up → invert
        velocity = -(last.y - first.y) / dt; // px/ms, positive = drawer growing
      }
    }

    // Selected-post mode: snap between half and full; pull down past peek dismisses detail.
    if (selectedPost) {
      const dy = heightRef.current - d.startHeight;
      const threshold = 50;
      const halfH = getHeight("half");
      // Down-fling beyond half → close detail and return to list peek.
      if ((dy < -threshold || velocity < -0.6) && heightRef.current < halfH - 40) {
        onSelectPost(null);
        setState("peek");
        forceRender((n) => n + 1);
        return;
      }
      if (state === "half") {
        if (dy > threshold || velocity > 0.4) setState("full");
        else animateTo(getHeight("half"), velocity * 1000);
      } else if (state === "full") {
        if (dy < -threshold || velocity < -0.4) setState("half");
        else animateTo(getHeight("full"), velocity * 1000);
      } else {
        animateTo(getHeight(state), velocity * 1000);
      }
      forceRender((n) => n + 1);
      return;
    }

    // List mode: velocity-aware snap with enlarged deadzone (Google Maps-like).
    const order: SheetState[] = ["peek", "half", "full"];
    const heights = order.map(getHeight);
    const cur = heightRef.current;

    // Find nearest anchor by distance
    let nearestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < heights.length; i++) {
      const dist = Math.abs(heights[i] - cur);
      if (dist < bestDist) { bestDist = dist; nearestIdx = i; }
    }

    let targetIdx = nearestIdx;
    const VELOCITY_THRESHOLD = 0.5; // px/ms — fling intent
    const SNAP_DEADZONE = 80;       // within this distance, always go to nearest

    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      // Fling toward next anchor in velocity direction
      if (velocity > 0) {
        targetIdx = order.findIndex((_, i) => heights[i] > cur);
        if (targetIdx === -1) targetIdx = order.length - 1;
      } else {
        for (let i = order.length - 1; i >= 0; i--) {
          if (heights[i] < cur) { targetIdx = i; break; }
        }
        if (targetIdx === nearestIdx && cur < heights[0]) targetIdx = 0;
      }
    } else if (bestDist > SNAP_DEADZONE) {
      // Outside deadzone but slow — snap toward direction of drag
      const dy = cur - d.startHeight;
      if (dy > 0) {
        targetIdx = order.findIndex((_, i) => heights[i] > cur);
        if (targetIdx === -1) targetIdx = order.length - 1;
      } else if (dy < 0) {
        for (let i = order.length - 1; i >= 0; i--) {
          if (heights[i] < cur) { targetIdx = i; break; }
        }
        if (targetIdx < 0) targetIdx = 0;
      }
    }

    const targetState = order[targetIdx];
    if (targetState === state) {
      animateTo(heights[targetIdx], velocity * 1000);
    } else {
      setState(targetState);
      requestAnimationFrame(() => animateTo(heights[targetIdx], velocity * 1000));
    }
    forceRender((n) => n + 1);
  }, [animateTo, getHeight, onSelectPost, selectedPost, state]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (selectedPost && state === "full") {
      const detailEl = detailScrollRef.current;
      const touchY = e.touches[0].clientY;
      const sheetTop = sheetRef.current?.getBoundingClientRect().top ?? 0;
      const handleZone = sheetTop + HANDLE_HEIGHT + 20;
      if (touchY > handleZone && detailEl && detailEl.scrollTop > 0) return;
    }

    const list = listRef.current;
    if (!selectedPost && list && state === "full" && list.scrollTop > 0) return;
    if (!selectedPost && list && (state === "half" || state === "full")) {
      const listRect = list.getBoundingClientRect();
      const touchY = e.touches[0].clientY;
      if (touchY >= listRect.top && touchY <= listRect.bottom && list.scrollTop > 0) return;
    }

    beginDragInternal(e.touches[0].clientY);
  }, [state, selectedPost, beginDragInternal]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.active) return;
    updateDragInternal(e.touches[0].clientY);
  }, [updateDragInternal]);

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.active) return;
    endDragInternal();
  }, [endDragInternal]);

  useImperativeHandle(ref, () => ({
    beginDrag: beginDragInternal,
    updateDrag: updateDragInternal,
    endDrag: endDragInternal,
  }), [beginDragInternal, updateDragInternal, endDragInternal]);

  const isDragging = dragRef.current.active;
  const displayHeight = heightRef.current;

  const sorted = useMemo(() => [...posts].sort((a, b) => {
    const dA = haversineKm(userLat, userLng, a.latitude, a.longitude);
    const dB = haversineKm(userLat, userLng, b.latitude, b.longitude);
    return dA - dB;
  }), [posts, userLat, userLng]);

  useEffect(() => {
    setRatingsEnabled(false);
    const timer = window.setTimeout(() => setRatingsEnabled(true), 250);
    return () => window.clearTimeout(timer);
  }, [sorted.length, state]);

  const ratingInputs = useMemo(() => {
    if (!ratingsEnabled) return [];

    const visibleCount = state === "full" ? 48 : state === "half" ? 24 : 0;
    return sorted.slice(0, visibleCount).map((post) => ({ postId: post.id, userId: post.user_id }));
  }, [ratingsEnabled, sorted, state]);

  const { ratings: postRatings } = usePostRatings(ratingInputs);

  const handleBackToList = useCallback(() => {
    onSelectPost(null);
    setState("peek");
  }, [onSelectPost]);

  // Header (title row) shows in list mode only.
  const showHeader = !selectedPost;
  const showList = !selectedPost && displayHeight > 140;
  const showPeek = !selectedPost && !showList && sorted.length > 0;

  return (
    <div
      ref={sheetRef}
      className={cn(
        "absolute left-0 right-0 z-30 bg-background rounded-t-2xl flex flex-col",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.12)]",
        "will-change-[height]",
        selectedPost ? "" : "touch-none select-none"
      )}
      style={{
        bottom: `${BOTTOM_NAV}px`,
        height: `${displayHeight}px`,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle */}
      <div className="shrink-0">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {showHeader && (
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">附近</h3>
              <span className="text-xs text-muted-foreground">{sorted.length} 个结果</span>
            </div>
          </div>
        )}
      </div>

      {/* Detail mode — direct full content, like Google Maps */}
      {selectedPost && (
        <InlinePostDetail
          post={selectedPost}
          onBack={handleBackToList}
          isFavorite={favoriteIds.has(selectedPost.id)}
          onToggleFavorite={onToggleFavorite}
          userLat={userLat}
          userLng={userLng}
          hasUserLocation={hasUserLocation}
          scrollRef={detailScrollRef}
        />
      )}

      {/* List mode — render whenever drawer is open enough, so it scrolls in with the header */}
      {showList && (
        <div
          ref={listRef}
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain",
            state === "full" ? "touch-auto" : "touch-none"
          )}
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
            <div className="pb-[calc(16px+env(safe-area-inset-bottom))]">
              {sorted.map((post, idx) => (
                <ListCard
                  key={post.id}
                  post={post}
                  userLat={userLat}
                  userLng={userLng}
                  hasUserLocation={hasUserLocation}
                  isFavorite={favoriteIds.has(post.id)}
                  onToggleFavorite={onToggleFavorite}
                  onSelect={() => onSelectPost(post)}
                  showDivider={idx > 0}
                  ratingData={postRatings[post.id]}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Peek mode */}
      {showPeek && (
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
                {hasUserLocation
                  ? `${kmToMiles(haversineKm(userLat, userLng, sorted[0].latitude, sorted[0].longitude)).toFixed(1)} mi`
                  : "需要定位"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MapListSheet;

/* ─── Responsive image gallery ─── */
function ImageGallery({ urls, onClickExpand }: { urls: string[]; onClickExpand?: () => void }) {
  if (urls.length === 0) return null;

  // 1 image: full width banner
  if (urls.length === 1) {
    const url = urls[0];
    return (
      <div className="mt-2 rounded-xl overflow-hidden bg-muted" onClick={onClickExpand}>
        {isVideo(url) ? (
          <div className="relative w-full h-40">
            <video src={url} className="w-full h-40 object-cover" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="h-6 w-6 text-white drop-shadow-lg" />
            </div>
          </div>
        ) : (
          <img src={url} alt="" className="w-full h-40 object-cover" loading="lazy" />
        )}
      </div>
    );
  }

  // 2-3 images: equal split grid
  if (urls.length <= 3) {
    return (
      <div className={cn("mt-2 grid gap-1 rounded-xl overflow-hidden", urls.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
        {urls.map((url, i) => (
          <div key={i} className="bg-muted overflow-hidden" onClick={onClickExpand}>
            {isVideo(url) ? (
              <div className="relative w-full h-28">
                <video src={url} className="w-full h-28 object-cover" muted preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="h-5 w-5 text-white drop-shadow-lg" />
                </div>
              </div>
            ) : (
              <img src={url} alt="" className="w-full h-28 object-cover" loading="lazy" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // 4+ images: first 3 visible + scroll for more
  return (
    <div className="mt-2 flex gap-1 overflow-x-auto scrollbar-hide rounded-xl">
      {urls.map((url, i) => (
        <div key={i} className="w-[calc(33.333%-3px)] shrink-0 bg-muted overflow-hidden first:rounded-l-xl last:rounded-r-xl" onClick={onClickExpand}>
          {isVideo(url) ? (
            <div className="relative w-full h-28">
              <video src={url} className="w-full h-28 object-cover" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-5 w-5 text-white drop-shadow-lg" />
              </div>
            </div>
          ) : (
            <img src={url} alt="" className="w-full h-28 object-cover" loading="lazy" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Google Maps style list card ─── */
function ListCard({
  post, userLat, userLng, hasUserLocation, isFavorite, onToggleFavorite, onSelect, showDivider, ratingData,
}: {
  post: Post;
  userLat: number;
  userLng: number;
  hasUserLocation: boolean;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: () => void;
  showDivider: boolean;
  ratingData?: { avgRating: number; totalReviews: number; topTag: string | null };
}) {
  const navigate = useNavigate();
  const { openMapChoice, MapChoice } = useMapChoice();
  const distKm = haversineKm(userLat, userLng, post.latitude, post.longitude);
  const distMi = kmToMiles(distKm);
  const coverUrls = post.image_urls || [];

  let statusText = "";
  let statusColor = "";
  if (!post.is_mobile && post.operating_hours) {
    const open = isCurrentlyOpen(post.operating_hours);
    statusText = open ? "营业中" : "已打烊";
    statusColor = open ? "text-emerald-600" : "text-destructive";
  } else if (post.is_mobile) {
    statusText = "移动服务";
    statusColor = "text-primary";
  }

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: postData } = await supabase.from("posts").select("user_id").eq("id", post.id).single();
    if (!postData) return;
    if (user.id === postData.user_id) {
      toast({ title: "提示", description: "不能和自己聊天哦" });
      return;
    }
    if (post.category === "driver") {
      const lockedConvId = await checkActiveTripLock(user.id);
      if (lockedConvId) {
        toast({ title: "你有进行中的行程", description: "请先结束当前预约后再联系其他司机" });
        navigate(`/chat/${lockedConvId}`);
        return;
      }
    }
    const { data: existing } = await supabase
      .from("conversations").select("id")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${postData.user_id}),and(participant_1.eq.${postData.user_id},participant_2.eq.${user.id})`)
      .maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); return; }
    const greeting = greetingTemplates[post.category] || greetingTemplates.default;
    const { data: newConv, error } = await supabase
      .from("conversations").insert({ participant_1: user.id, participant_2: postData.user_id, last_message: greeting })
      .select("id").single();
    if (error || !newConv) { toast({ title: "创建会话失败", variant: "destructive" }); return; }
    await supabase.from("messages").insert({ conversation_id: newConv.id, sender_id: user.id, content: greeting });
    navigate(`/chat/${newConv.id}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "链接已复制" });
    }
  };

  return (
    <>
      {showDivider && <div className="border-t border-border/30 mx-4" />}
      <div
        onClick={onSelect}
        className="px-4 py-3 active:bg-accent/50 transition-colors cursor-pointer"
      >
        {/* Row 1: Title + favorite */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[15px] font-bold text-foreground line-clamp-1 flex-1">{post.title}</h4>
          <FavoriteButton
            isFavorite={isFavorite}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
            size="sm"
          />
        </div>

        {/* Row 1.5: Credit info */}
        {ratingData && ratingData.totalReviews > 0 && (
          <PostCreditBadge
            avgRating={ratingData.avgRating}
            totalReviews={ratingData.totalReviews}
            topTag={ratingData.topTag}
            isMobile={post.is_mobile}
            className="mt-0.5"
          />
        )}

        {/* Row 2: Price · Category */}
        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
          {post.price != null && (
            <>
              <span className="font-medium text-foreground">${post.price.toLocaleString()}</span>
              <span>·</span>
            </>
          )}
          <span>{categoryLabels[post.category] || post.category}</span>
        </div>

        {/* Row 3: Status · Distance */}
        <div className="flex items-center gap-1 mt-0.5 text-xs">
          {statusText && (
            <>
              <span className={cn("font-medium", statusColor)}>{statusText}</span>
              <span className="text-muted-foreground">·</span>
            </>
          )}
          <span className="text-muted-foreground">
            {!hasUserLocation ? "需要定位" : distMi < 0.1 ? "附近" : `${distMi.toFixed(1)} mi`}
          </span>
        </div>

        {/* Responsive image gallery */}
        <ImageGallery urls={coverUrls} />

        {/* Action capsules */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
          {!post.is_mobile && (
            <ActionCapsule
              icon={<Navigation className="h-3.5 w-3.5" />}
              label="路线"
              primary
              onClick={(e) => { e.stopPropagation(); openMapChoice(post.latitude, post.longitude); }}
            />
          )}
          <ActionCapsule icon={<Send className="h-3.5 w-3.5" />} label="私聊" onClick={handleStartChat} />
          <ActionCapsule icon={<Phone className="h-3.5 w-3.5" />} label="致电" onClick={(e) => {
            e.stopPropagation();
            supabase.from("posts").select("contact_phone, user_id").eq("id", post.id).single().then(({ data }) => {
              if (data?.contact_phone) {
                window.location.href = `tel:${data.contact_phone}`;
              } else if (data?.user_id) {
                supabase.from("profiles").select("phone").eq("id", data.user_id).maybeSingle().then(({ data: prof }) => {
                  if (prof?.phone) window.location.href = `tel:${prof.phone}`;
                  else toast({ title: "暂无电话号码" });
                });
              }
            });
          }} />
          <ActionCapsule
            icon={<Bookmark className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />}
            label={isFavorite ? "已收藏" : "收藏"}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
          />
          <ActionCapsule icon={<Share2 className="h-3.5 w-3.5" />} label="分享" onClick={handleShare} />
        </div>
      </div>
      {MapChoice}
    </>
  );
}

/* ─── Preview card (45% height, Google Maps style) ─── */
function PreviewCard({
  post, userLat, userLng, hasUserLocation, isFavorite, onToggleFavorite, onExpand, onBack,
}: {
  post: Post;
  userLat: number;
  userLng: number;
  hasUserLocation: boolean;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onExpand: () => void;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const { openMapChoice, MapChoice: MapChoice2 } = useMapChoice();
  const distKm = haversineKm(userLat, userLng, post.latitude, post.longitude);
  const distMi = kmToMiles(distKm);
  const coverUrls = post.image_urls || [];
  

  let statusText = "";
  let statusColor = "";
  if (!post.is_mobile && post.operating_hours) {
    const open = isCurrentlyOpen(post.operating_hours);
    statusText = open ? "🟢 营业中" : "🔴 已打烊";
    statusColor = open ? "text-emerald-600" : "text-destructive";
  } else if (post.is_mobile) {
    statusText = "📍 移动服务中";
    statusColor = "text-primary";
  }

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: postData } = await supabase.from("posts").select("user_id").eq("id", post.id).single();
    if (!postData) return;
    if (user.id === postData.user_id) {
      toast({ title: "提示", description: "不能和自己聊天哦" });
      return;
    }
    const { data: existing } = await supabase
      .from("conversations").select("id")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${postData.user_id}),and(participant_1.eq.${postData.user_id},participant_2.eq.${user.id})`)
      .maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); return; }
    const greeting = greetingTemplates[post.category] || greetingTemplates.default;
    const { data: newConv, error } = await supabase
      .from("conversations").insert({ participant_1: user.id, participant_2: postData.user_id, last_message: greeting })
      .select("id").single();
    if (error || !newConv) { toast({ title: "创建会话失败", variant: "destructive" }); return; }
    await supabase.from("messages").insert({ conversation_id: newConv.id, sender_id: user.id, content: greeting });
    navigate(`/chat/${newConv.id}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "链接已复制" });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain touch-auto px-4 pb-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-lg font-bold text-foreground line-clamp-2 flex-1">{post.title}</h3>
        <button
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="shrink-0 p-1.5 rounded-full bg-muted hover:bg-muted/80 active:scale-90 transition-all"
          aria-label="关闭"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Info line */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        {post.price != null && (
          <>
            <span className="font-semibold text-foreground">${post.price.toLocaleString()}</span>
            <span>·</span>
          </>
        )}
        <span>{categoryLabels[post.category] || post.category}</span>
      </div>

      {/* Status + distance */}
      <div className="flex items-center gap-1.5 mt-0.5 text-sm">
        {statusText && (
          <>
            <span className={cn("font-medium", statusColor)}>{statusText}</span>
            <span className="text-muted-foreground">·</span>
          </>
        )}
        <span className="text-muted-foreground">
          {!hasUserLocation ? "需要定位" : distMi < 0.1 ? "附近" : `${distMi.toFixed(1)} mi`}
        </span>
      </div>

      {/* Action capsules */}
      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
        {!post.is_mobile && (
          <ActionCapsule icon={<Navigation className="h-3.5 w-3.5" />} label="路线" primary onClick={(e) => { e.stopPropagation(); openMapChoice(post.latitude, post.longitude); }} />
        )}
        <ActionCapsule icon={<Send className="h-3.5 w-3.5" />} label="私聊" onClick={handleStartChat} />
        <ActionCapsule icon={<Phone className="h-3.5 w-3.5" />} label="致电" onClick={(e) => {
          e.stopPropagation();
          supabase.from("posts").select("contact_phone, user_id").eq("id", post.id).single().then(({ data }) => {
            if (data?.contact_phone) {
              window.location.href = `tel:${data.contact_phone}`;
            } else if (data?.user_id) {
              supabase.from("profiles").select("phone").eq("id", data.user_id).maybeSingle().then(({ data: prof }) => {
                if (prof?.phone) window.location.href = `tel:${prof.phone}`;
                else toast({ title: "暂无电话号码" });
              });
            }
          });
        }} />
        <ActionCapsule
          icon={<Bookmark className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />}
          label={isFavorite ? "已收藏" : "收藏"}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
        />
        <ActionCapsule icon={<Share2 className="h-3.5 w-3.5" />} label="分享" onClick={handleShare} />
      </div>

      {/* Responsive image gallery */}
      <ImageGallery urls={coverUrls} onClickExpand={onExpand} />

      {/* Tap to see more */}
      <button
        onClick={onExpand}
        className="w-full mt-3 py-2 text-sm font-medium text-primary text-center active:bg-accent/50 rounded-lg transition-colors"
      >
        查看详情 ↑
      </button>
      {MapChoice2}
    </div>
  );
}

/* ─── Action capsule button ─── */
function ActionCapsule({ icon, label, primary = false, onClick }: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-transform",
        primary
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
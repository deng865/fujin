import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Navigation, Phone, Send, Clock, MapPin,
  ChevronLeft, ChevronRight, Play, Truck, Store, Locate,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { checkActiveTripLock } from "@/lib/tripLock";
import { openMapNavigation } from "@/lib/mapNavigation";
import { isCurrentlyOpen } from "@/lib/operatingHours";
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
  is_mobile?: boolean;
  operating_hours?: any;
  live_latitude?: number | null;
  live_longitude?: number | null;
  live_updated_at?: string | null;
}

interface PostProfile {
  name: string;
  phone: string | null;
  wechat_id: string | null;
  avatar_url: string | null;
}

interface InlinePostDetailProps {
  post: Post;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: (postId: string) => void;
  userLat: number;
  userLng: number;
}

const categoryLabels: Record<string, string> = {
  housing: "🏠 房产", jobs: "💼 招工", auto: "🚗 汽车",
  food: "🍜 美食", education: "📚 教育", travel: "✈️ 旅游",
  driver: "🚕 司机", legal: "⚖️ 法律", rent: "🏠 房子出租",
  beauty: "💅 美容美发", dating: "❤️ 约会", other: "⭐ 其他",
  "second-hand goods": "🛍️ 二手商品", "home services": "🔧 家庭服务",
  "medical services": "🏥 医疗服务", "law and accounting": "⚖️ 法律/会计",
};

const categoryColors: Record<string, string> = {
  housing: "bg-blue-500/10 text-blue-600", jobs: "bg-emerald-500/10 text-emerald-600",
  auto: "bg-orange-500/10 text-orange-600", food: "bg-red-500/10 text-red-600",
  education: "bg-purple-500/10 text-purple-600", travel: "bg-cyan-500/10 text-cyan-600",
  driver: "bg-yellow-500/10 text-yellow-700", legal: "bg-indigo-500/10 text-indigo-600",
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

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
}

function LazyMediaCarousel({ urls, title }: { urls: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0]));
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (idx: number) => {
    setCurrent(idx);
    setLoaded((prev) => new Set(prev).add(idx));
    scrollRef.current?.children[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  // Preload adjacent slides
  useEffect(() => {
    setLoaded((prev) => {
      const next = new Set(prev);
      next.add(current);
      if (current > 0) next.add(current - 1);
      if (current < urls.length - 1) next.add(current + 1);
      return next;
    });
  }, [current, urls.length]);

  return (
    <div className="relative group">
      <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {urls.map((url, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {!loaded.has(i) ? (
              <div className="w-full h-52 bg-muted animate-pulse" />
            ) : isVideo(url) ? (
              <div className="relative w-full h-52 bg-black">
                <video src={url} controls playsInline className="w-full h-52 object-cover" preload="metadata" />
              </div>
            ) : (
              <img src={url} alt={`${title} - ${i + 1}`} className="w-full h-52 object-cover" loading="lazy" />
            )}
          </div>
        ))}
      </div>
      {urls.length > 1 && (
        <>
          {current > 0 && (
            <button onClick={() => scrollTo(current - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {current < urls.length - 1 && (
            <button onClick={() => scrollTo(current + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <button key={i} onClick={() => scrollTo(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
      {/* Back button overlay */}
    </div>
  );
}

export default function InlinePostDetail({ post, onBack, isFavorite, onToggleFavorite, userLat, userLng }: InlinePostDetailProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PostProfile | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [showNavChoice, setShowNavChoice] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [liveDistMi, setLiveDistMi] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!post) return;
    supabase.from("posts").select("user_id").eq("id", post.id).single().then(({ data: p }) => {
      if (p) supabase.from("profiles").select("name, phone, wechat_id, avatar_url").eq("id", p.user_id).maybeSingle().then(({ data: prof }) => setProfile(prof));
    });
  }, [post.id]);

  // Live distance for mobile merchants
  useEffect(() => {
    if (!post.is_mobile) return;
    const lat = post.live_latitude ?? post.latitude;
    const lng = post.live_longitude ?? post.longitude;
    setLiveDistMi(haversineKm(userLat, userLng, lat, lng) * 0.621371);
  }, [post, userLat, userLng]);

  const distanceKm = haversineKm(userLat, userLng, post.latitude, post.longitude);
  const distanceMi = distanceKm * 0.621371;

  const handleStartChat = async () => {
    if (!currentUserId) { navigate("/auth"); return; }
    const { data: postData } = await supabase.from("posts").select("user_id").eq("id", post.id).single();
    if (!postData) return;
    if (currentUserId === postData.user_id) {
      toast({ title: "提示", description: "不能和自己聊天哦" });
      return;
    }
    setStartingChat(true);
    if (post.category === "driver") {
      const lockedConvId = await checkActiveTripLock(currentUserId);
      if (lockedConvId) {
        toast({ title: "你有进行中的行程", description: "请先结束当前预约后再联系其他司机" });
        setStartingChat(false);
        navigate(`/chat/${lockedConvId}`);
        return;
      }
    }
    const { data: existing } = await supabase
      .from("conversations").select("id")
      .or(`and(participant_1.eq.${currentUserId},participant_2.eq.${postData.user_id}),and(participant_1.eq.${postData.user_id},participant_2.eq.${currentUserId})`)
      .maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); setStartingChat(false); return; }
    const greeting = greetingTemplates[post.category] || greetingTemplates.default;
    const { data: newConv, error } = await supabase
      .from("conversations").insert({ participant_1: currentUserId, participant_2: postData.user_id, last_message: greeting })
      .select("id").single();
    if (error || !newConv) {
      toast({ title: "创建会话失败", variant: "destructive" });
      setStartingChat(false);
      return;
    }
    await supabase.from("messages").insert({ conversation_id: newConv.id, sender_id: currentUserId, content: greeting });
    navigate(`/chat/${newConv.id}`);
    setStartingChat(false);
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN });

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-auto pb-20">
        {/* Back button header */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-medium text-primary active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </button>
        </div>

        {/* Media */}
        {post.image_urls && post.image_urls.length > 0 && (
          <LazyMediaCarousel urls={post.image_urls} title={post.title} />
        )}

        <div className="px-4 pt-3 space-y-3">
          {/* Category + status tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[post.category] || "bg-muted text-muted-foreground"}`}>
              {categoryLabels[post.category] || post.category}
            </span>
            {post.is_mobile ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                <Truck className="h-3 w-3" />
                移动服务中
                {post.live_updated_at && (
                  <span className="text-muted-foreground ml-1">
                    · {formatDistanceToNow(new Date(post.live_updated_at), { addSuffix: true, locale: zhCN })}
                  </span>
                )}
              </span>
            ) : post.operating_hours ? (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isCurrentlyOpen(post.operating_hours)
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-muted text-muted-foreground"
              }`}>
                <Store className="h-3 w-3" />
                {isCurrentlyOpen(post.operating_hours) ? "🟢 营业中" : "🔴 已打烊"}
                <span className="ml-1">{post.operating_hours.open}-{post.operating_hours.close}</span>
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-foreground leading-tight">{post.title}</h2>

          {/* Price */}
          {post.price != null && (
            <p className="text-xl font-extrabold text-primary">${post.price.toLocaleString()}</p>
          )}

          {/* Mobile merchant: live distance button */}
          {post.is_mobile && (
            <button
              onClick={() => {
                const lat = post.live_latitude ?? post.latitude;
                const lng = post.live_longitude ?? post.longitude;
                const d = haversineKm(userLat, userLng, lat, lng) * 0.621371;
                setLiveDistMi(d);
                toast({ title: `当前距离: ${d < 0.1 ? "附近" : d.toFixed(1) + " mi"}` });
              }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl bg-primary/10 text-primary font-medium text-sm active:scale-[0.98] transition-transform"
            >
              <Locate className="h-4 w-4" />
              查看他现在的距离
              {liveDistMi != null && (
                <span className="ml-auto font-bold">
                  {liveDistMi < 0.1 ? "附近" : `${liveDistMi.toFixed(1)} mi`}
                </span>
              )}
            </button>
          )}

          {/* Fixed merchant: distance & nav */}
          {!post.is_mobile && (
            <div className="flex items-center justify-between bg-muted/60 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground font-medium">
                  {distanceMi < 0.1 ? "附近" : `${distanceMi.toFixed(1)} mi`}
                </span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowNavChoice((v) => !v)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl active:scale-95 transition-transform"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  导航
                </button>
                {showNavChoice && (
                  <div className="absolute right-0 bottom-full mb-2 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button
                      onClick={() => { setShowNavChoice(false); openMapNavigation(post.latitude, post.longitude, "apple"); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                    >
                      🍎 Apple Maps
                    </button>
                    <button
                      onClick={() => { setShowNavChoice(false); openMapNavigation(post.latitude, post.longitude, "google"); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                    >
                      📍 Google Maps
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {post.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {post.description}
            </p>
          )}

          {/* Publisher */}
          {profile && (
            <div className="flex items-center gap-3 pt-1">
              <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{profile.name?.[0] || "?"}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile.name || "匿名用户"}</p>
                <p className="text-xs text-muted-foreground">发布者</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom action bar */}
      <div className="shrink-0 bg-background/95 backdrop-blur-xl border-t border-border/50 px-4 py-2.5 flex items-center gap-3">
        <FavoriteButton
          isFavorite={isFavorite}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
          size="md"
        />
        {profile?.phone && (
          <a
            href={`tel:${profile.phone}`}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-accent text-foreground active:scale-90 transition-transform"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        <button
          onClick={handleStartChat}
          disabled={startingChat}
          className="flex-1 flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground font-semibold text-sm rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {startingChat ? "连接中..." : "私聊"}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Navigation, Phone, Send, Clock, MapPin,
  ChevronLeft, ChevronRight, Play, Truck, Store, Locate,
  Share2, Bookmark, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { checkActiveTripLock } from "@/lib/tripLock";
import { useMapChoice } from "@/components/MapChoiceSheet";
import { isCurrentlyOpen } from "@/lib/operatingHours";
import FavoriteButton from "@/components/FavoriteButton";
import MerchantReviewSection from "@/components/reviews/MerchantReviewSection";
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
  scrollRef?: React.RefObject<HTMLDivElement>;
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
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-transform min-w-[64px]",
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

export default function InlinePostDetail({ post, onBack, isFavorite, onToggleFavorite, userLat, userLng, scrollRef }: InlinePostDetailProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PostProfile | null>(null);
  const [postUserId, setPostUserId] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const { openMapChoice, MapChoice } = useMapChoice();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [liveDistMi, setLiveDistMi] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!post) return;
    supabase.from("posts").select("user_id").eq("id", post.id).single().then(({ data: p }) => {
      if (p) {
        setPostUserId(p.user_id);
        supabase.from("profiles").select("name, phone, wechat_id, avatar_url").eq("id", p.user_id).maybeSingle().then(({ data: prof }) => setProfile(prof));
      }
    });
  }, [post.id]);

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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "链接已复制" });
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN });

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain touch-auto pb-4">
        {/* Back button header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-background/90 backdrop-blur-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-medium text-primary active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </button>
          <button
            onClick={onBack}
            className="p-1.5 rounded-full bg-muted hover:bg-muted/80 active:scale-90 transition-all"
            aria-label="关闭"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Media */}
        {post.image_urls && post.image_urls.length > 0 && (
          <LazyMediaCarousel urls={post.image_urls} title={post.title} />
        )}

        <div className="px-4 pt-3 space-y-3">
          {/* Title */}
          <h2 className="text-lg font-bold text-foreground leading-tight">{post.title}</h2>

          {/* Category + status + time + distance */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className={`px-2.5 py-1 rounded-full font-semibold ${categoryColors[post.category] || "bg-muted text-muted-foreground"}`}>
              {categoryLabels[post.category] || post.category}
            </span>
            {post.price != null && (
              <span className="font-bold text-primary text-base">${post.price.toLocaleString()}</span>
            )}
            {post.is_mobile ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                <Truck className="h-3 w-3" />
                移动服务中
              </span>
            ) : post.operating_hours ? (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isCurrentlyOpen(post.operating_hours)
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-muted text-muted-foreground"
              }`}>
                <Store className="h-3 w-3" />
                {isCurrentlyOpen(post.operating_hours) ? "🟢 营业中" : "🔴 已打烊"}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-muted-foreground ml-auto">
              <MapPin className="h-3 w-3" />
              {distanceMi < 0.1 ? "附近" : `${distanceMi.toFixed(1)} mi`}
            </span>
          </div>

          {/* Google Maps style action capsules row */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {!post.is_mobile && (
              <ActionCapsule
                icon={<Navigation className="h-4 w-4" />}
                label="路线"
                primary
                onClick={() => openMapChoice(post.latitude, post.longitude)}
              />
            )}
            <ActionCapsule
              icon={<Send className="h-4 w-4" />}
              label={startingChat ? "连接中..." : "私聊"}
              onClick={handleStartChat}
            />
            {profile?.phone && (
              <ActionCapsule
                icon={<Phone className="h-4 w-4" />}
                label="致电"
                onClick={() => { window.location.href = `tel:${profile.phone}`; }}
              />
            )}
            <ActionCapsule
              icon={<Bookmark className={cn("h-4 w-4", isFavorite && "fill-current")} />}
              label={isFavorite ? "已收藏" : "收藏"}
              onClick={() => onToggleFavorite(post.id)}
            />
            <ActionCapsule
              icon={<Share2 className="h-4 w-4" />}
              label="分享"
              onClick={handleShare}
            />
          </div>

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

          {/* Description */}
          {post.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {post.description}
            </p>
          )}

          {/* Merchant Review Section */}
          {postUserId && (
            <MerchantReviewSection
              postId={post.id}
              postUserId={postUserId}
              currentUserId={currentUserId}
              isMobile={!!post.is_mobile}
              receiverName={profile?.name}
            />
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
                <p className="text-xs text-muted-foreground">发布者 · {timeAgo}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {MapChoice}
    </div>
  );
}
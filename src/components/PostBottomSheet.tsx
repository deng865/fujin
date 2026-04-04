import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation, Heart, Phone, MessageCircle, Send, Clock, MapPin, ChevronLeft, ChevronRight, Flag, X, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import FavoriteButton from "@/components/FavoriteButton";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

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

interface PostProfile {
  name: string;
  phone: string | null;
  wechat_id: string | null;
  avatar_url: string | null;
}

interface PostBottomSheetProps {
  post: Post | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (postId: string) => void;
  userLat?: number;
  userLng?: number;
}

const categoryLabels: Record<string, string> = {
  housing: "🏠 房产", jobs: "💼 招工", auto: "🚗 汽车",
  food: "🍜 美食", education: "📚 教育", travel: "✈️ 旅游",
  driver: "🚕 司机", legal: "⚖️ 法律",
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

function openNavigation(lat: number, lng: number, app: "apple" | "google") {
  if (app === "apple") {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, "_blank");
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  }
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
}

function MediaCarousel({ urls, title }: { urls: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (idx: number) => {
    setCurrent(idx);
    scrollRef.current?.children[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return (
    <div className="relative group">
      <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {urls.map((url, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {isVideo(url) ? (
              <div className="relative w-full h-56 bg-black">
                <video src={url} controls playsInline className="w-full h-56 object-cover" />
              </div>
            ) : (
              <img src={url} alt={`${title} - ${i + 1}`} className="w-full h-56 object-cover" loading="lazy" />
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

export default function PostBottomSheet({ post, onClose, isFavorite = false, onToggleFavorite, userLat, userLng }: PostBottomSheetProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PostProfile | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [showNavChoice, setShowNavChoice] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!post) { setProfile(null); return; }
    supabase.from("profiles").select("name, phone, wechat_id, avatar_url").eq("id", (post as any).user_id ?? "").maybeSingle().then(({ data }) => {
      if (!data) {
        // user_id not on post interface, fetch from DB
        supabase.from("posts").select("user_id").eq("id", post.id).single().then(({ data: p }) => {
          if (p) supabase.from("profiles").select("name, phone, wechat_id, avatar_url").eq("id", p.user_id).maybeSingle().then(({ data: prof }) => setProfile(prof));
        });
      } else {
        setProfile(data);
      }
    });
  }, [post?.id]);

  const distanceKm = post && userLat != null && userLng != null
    ? haversineKm(userLat, userLng, post.latitude, post.longitude)
    : null;

  const handleStartChat = async () => {
    if (!post) return;
    if (!currentUserId) { navigate("/auth"); return; }

    const { data: postData } = await supabase.from("posts").select("user_id").eq("id", post.id).single();
    if (!postData) return;

    if (currentUserId === postData.user_id) {
      toast({ title: "提示", description: "不能和自己聊天哦" });
      return;
    }

    setStartingChat(true);
    const { data: existing } = await supabase
      .from("conversations").select("id")
      .or(`and(participant_1.eq.${currentUserId},participant_2.eq.${postData.user_id}),and(participant_1.eq.${postData.user_id},participant_2.eq.${currentUserId})`)
      .maybeSingle();

    if (existing) { onClose(); navigate(`/chat/${existing.id}`); setStartingChat(false); return; }

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
    onClose();
    navigate(`/chat/${newConv.id}`);
    setStartingChat(false);
  };

  const timeAgo = post ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN }) : "";

  return (
    <Drawer open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent hideHandle className="max-h-[90vh] rounded-t-3xl focus:outline-none">
        {/* Drag handle */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/20" />

        {post && (
          <div className="overflow-y-auto pb-24">
            {/* Media Carousel */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="mt-2">
                <MediaCarousel urls={post.image_urls} title={post.title} />
              </div>
            )}

            {/* Content area */}
            <div className="px-5 pt-4 space-y-3">
              {/* Category tag + time */}
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[post.category] || "bg-muted text-muted-foreground"}`}>
                  {categoryLabels[post.category] || post.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
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

              {/* Distance & Nav */}
              <div className="flex items-center justify-between bg-muted/60 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {distanceKm != null ? (
                    <span className="text-sm text-foreground font-medium">
                      距你 {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)} m` : `${distanceKm.toFixed(1)} km`}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {post.latitude.toFixed(3)}, {post.longitude.toFixed(3)}
                    </span>
                  )}
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
                        onClick={() => { openNavigation(post.latitude, post.longitude, "apple"); setShowNavChoice(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                      >
                        🍎 Apple Maps
                      </button>
                      <button
                        onClick={() => { openNavigation(post.latitude, post.longitude, "google"); setShowNavChoice(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                      >
                        📍 Google Maps
                      </button>
                    </div>
                  )}
                </div>

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
                      <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
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
        )}

        {/* Fixed bottom action bar */}
        {post && (
          <div className="absolute bottom-0 inset-x-0 bg-background/95 backdrop-blur-xl border-t border-border/50 px-5 py-3 flex items-center gap-3 safe-bottom">
            {/* Favorite */}
            {onToggleFavorite && (
              <FavoriteButton
                isFavorite={isFavorite}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
                size="md"
              />
            )}

            {/* Phone */}
            {profile?.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-accent text-foreground active:scale-90 transition-transform"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            {/* Chat button */}
            <button
              onClick={handleStartChat}
              disabled={startingChat}
              className="flex-1 flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground font-semibold text-sm rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {startingChat ? "连接中..." : "私聊"}
            </button>

            {/* Detail page */}
            <button
              onClick={() => { onClose(); navigate(`/post/${post.id}`); }}
              className="flex items-center justify-center h-10 px-4 text-sm font-medium rounded-xl bg-accent text-foreground active:scale-95 transition-transform"
            >
              详情
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

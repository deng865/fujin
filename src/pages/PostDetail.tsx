import { useState, useEffect } from "react";
import { useMapChoice } from "@/components/MapChoiceSheet";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, DollarSign, Clock, User, MessageCircle, Phone, Send, Flag, Navigation, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useFavorites } from "@/hooks/useFavorites";
import FavoriteButton from "@/components/FavoriteButton";
import { zhCN } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { checkActiveTripLock } from "@/lib/tripLock";
import ReviewDialog from "@/components/reviews/ReviewDialog";
import CreditBadge from "@/components/reviews/CreditBadge";

interface PostDetailData {
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
  contact_phone: string | null;
  contact_wechat: string | null;
  profiles?: {
    name: string;
    avatar_url: string | null;
    average_rating: number | null;
    total_ratings: number | null;
  } | null;
}

const categoryLabels: Record<string, string> = {
  housing: "🏠 房产 Housing",
  jobs: "💼 找工 Jobs",
  auto: "🚗 汽车 Auto",
  food: "🍜 美食 Food",
  education: "📚 教育 Education",
  travel: "✈️ 旅游 Travel",
  driver: "🚕 司机 Driver",
  legal: "⚖️ 法律 Legal",
};

const greetingTemplates: Record<string, string> = {
  housing: "你好，我对你发布的房产信息很感兴趣，请问还在吗？",
  driver: "你好，我看到你发布的司机服务，请问现在可以接单吗？",
  jobs: "你好，我对你发布的招工信息很感兴趣，请问还在招人吗？",
  default: "你好，我看到你在地图上发布的信息，想了解更多详情。",
};

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  const [showReview, setShowReview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const { openMapChoice, MapChoice } = useMapChoice();
  const { isFavorite, toggleFavorite, userId: favUserId } = useFavorites();

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!favUserId) { navigate("/auth"); return; }
    if (post) await toggleFavorite(post.id);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, avatar_url, average_rating, total_ratings")
          .eq("id", data.user_id)
          .single();

        setPost({ ...data, profiles: profile });
      }
      setLoading(false);
    })();
  }, [id]);

  const handleStartChat = async () => {
    if (!post) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (user.id === post.user_id) {
      toast({ title: "提示", description: "不能和自己聊天哦" });
      return;
    }

    setStartingChat(true);

    // Block if user has an active trip and this is a driver post
    if (post.category === "driver") {
      const lockedConvId = await checkActiveTripLock(user.id);
      if (lockedConvId) {
        toast({ title: "你有进行中的行程", description: "请先结束当前预约后再联系其他司机" });
        setStartingChat(false);
        navigate(`/chat/${lockedConvId}`);
        return;
      }
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${post.user_id}),and(participant_1.eq.${post.user_id},participant_2.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }

    // Create new conversation
    const greeting = greetingTemplates[post.category] || greetingTemplates.default;

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        participant_1: user.id,
        participant_2: post.user_id,
        last_message: greeting,
      })
      .select("id")
      .single();

    if (error || !newConv) {
      toast({ title: "创建会话失败", description: "请稍后重试", variant: "destructive" });
      setStartingChat(false);
      return;
    }

    // Send greeting message
    await supabase.from("messages").insert({
      conversation_id: newConv.id,
      sender_id: user.id,
      content: greeting,
    });

    navigate(`/chat/${newConv.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">帖子不存在 / Post not found</p>
        <Button variant="outline" onClick={() => navigate("/")}>返回首页</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-accent rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="ml-2 text-sm text-muted-foreground">
              {categoryLabels[post.category] || post.category}
            </span>
          </div>
          <FavoriteButton isFavorite={isFavorite(post.id)} onClick={handleFavorite} size="sm" />
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Images */}
        {post.image_urls && post.image_urls.length > 0 && (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-1">
            {post.image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${post.title} - ${i + 1}`}
                className="w-full h-64 object-cover snap-center shrink-0"
              />
            ))}
          </div>
        )}

        <div className="px-4 py-5 space-y-4">
          {/* Title & Price */}
          <div>
            <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
            {post.price != null && (
              <p className="text-2xl font-bold text-primary mt-1 flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {post.price.toLocaleString()}
              </p>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {post.latitude.toFixed(2)}, {post.longitude.toFixed(2)}
            </span>
            <div className="ml-auto">
              <button
                onClick={() => openMapChoice(post.latitude, post.longitude)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl active:scale-95 transition-transform"
              >
                <Navigation className="h-3.5 w-3.5" />
                导航
              </button>
            </div>
          </div>

          {/* Description */}
          {post.description && (
            <div className="bg-muted/50 rounded-2xl p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {post.description}
              </p>
            </div>
          )}

          {/* Publisher info */}
          <div className="border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                {post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm">{post.profiles?.name || "匿名用户"}</p>
                  <CreditBadge averageRating={post.profiles?.average_rating ?? null} totalRatings={post.profiles?.total_ratings ?? null} />
                </div>
                <p className="text-xs text-muted-foreground">发布者 / Publisher</p>
              </div>
            </div>
          </div>

          {/* Chat Button */}
          <Button
            onClick={handleStartChat}
            disabled={startingChat}
            className="w-full rounded-xl h-12 text-base"
          >
            <Send className="h-4 w-4 mr-2" />
            {startingChat ? "正在创建会话..." : "私聊 / Contact"}
          </Button>

          {/* Review Button */}
          {currentUserId && post.user_id !== currentUserId && (
            <Button
              variant="outline"
              onClick={() => setShowReview(true)}
              className="w-full rounded-xl h-10 text-sm"
            >
              <Star className="h-4 w-4 mr-2" />
              评价此发布者
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setShowContact(!showContact)}
            className="w-full rounded-xl h-10 text-sm"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {showContact ? "收起联系方式" : "查看联系方式"}
          </Button>

          {showContact && (
            <div className="border border-border rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              {post.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${post.contact_phone}`} className="text-sm text-primary underline">
                    {post.contact_phone}
                  </a>
                </div>
              )}
              {post.contact_wechat && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">微信: {post.contact_wechat}</span>
                </div>
              )}
              {!post.contact_phone && !post.contact_wechat && (
                <p className="text-sm text-muted-foreground">发布者未留联系方式 / No contact info provided</p>
              )}
            </div>
          )}

          {/* Report Button */}
          <div className="pt-2 border-t border-border/50">
            {!showReport ? (
              <button
                onClick={() => {
                  if (!favUserId) { navigate("/auth"); return; }
                  setShowReport(true);
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Flag className="h-3.5 w-3.5" />
                举报此帖子
              </button>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <p className="text-sm font-medium">举报原因</p>
                <div className="flex flex-wrap gap-2">
                  {["虚假信息", "诈骗/欺诈", "骚扰/辱骂", "违法内容", "重复发帖", "其他"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setReportReason(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        reportReason === r ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="补充说明（可选）"
                  maxLength={500}
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none h-20"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowReport(false); setReportReason(""); setReportDetails(""); }}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!reportReason || reporting}
                    onClick={async () => {
                      if (!post || !favUserId) return;
                      setReporting(true);
                      const { error } = await supabase.from("reports").insert({
                        reporter_id: favUserId,
                        post_id: post.id,
                        reason: reportReason,
                        details: reportDetails.trim() || null,
                      });
                      if (error?.code === "23505") {
                        toast({ title: "您已举报过此帖子" });
                      } else if (error) {
                        toast({ title: "举报失败", description: "请稍后重试", variant: "destructive" });
                      } else {
                        toast({ title: "举报已提交", description: "我们会尽快审核处理" });
                      }
                      setShowReport(false);
                      setReportReason("");
                      setReportDetails("");
                      setReporting(false);
                    }}
                  >
                    <Flag className="h-3.5 w-3.5 mr-1" />
                    提交举报
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Review Dialog */}
      {currentUserId && post && (
        <ReviewDialog
          open={showReview}
          onOpenChange={setShowReview}
          senderId={currentUserId}
          receiverId={post.user_id}
          postId={post.id}
          receiverName={post.profiles?.name}
        />
      )}
      {MapChoice}
    </div>
  );
}

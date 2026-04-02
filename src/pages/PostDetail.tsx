import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, DollarSign, Clock, User, MessageCircle, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface PostDetail {
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
  profiles?: {
    name: string;
    phone: string | null;
    wechat_id: string | null;
    avatar_url: string | null;
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

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select(`*, profiles:user_id (name, phone, wechat_id, avatar_url)`)
        .eq("id", id)
        .single();

      // The profiles join returns based on user_id FK — but we don't have FK on posts table.
      // So let's fetch profile separately.
      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone, wechat_id, avatar_url")
          .eq("id", data.user_id)
          .single();

        setPost({ ...data, profiles: profile });
      }
      setLoading(false);
    })();
  }, [id]);

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
        <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="ml-2 text-sm text-muted-foreground">
            {categoryLabels[post.category] || post.category}
          </span>
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
                <p className="font-medium text-sm">{post.profiles?.name || "匿名用户"}</p>
                <p className="text-xs text-muted-foreground">发布者 / Publisher</p>
              </div>
            </div>
          </div>

          {/* Contact Button */}
          <Button
            onClick={() => setShowContact(!showContact)}
            className="w-full rounded-xl h-12 text-base"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {showContact ? "收起联系方式" : "查看联系方式 / Contact"}
          </Button>

          {showContact && (
            <div className="border border-border rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              {post.profiles?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${post.profiles.phone}`} className="text-sm text-primary underline">
                    {post.profiles.phone}
                  </a>
                </div>
              )}
              {(post.profiles as any)?.wechat_id && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">微信: {(post.profiles as any).wechat_id}</span>
                </div>
              )}
              {!post.profiles?.phone && !(post.profiles as any)?.wechat_id && (
                <p className="text-sm text-muted-foreground">暂无联系方式 / No contact info available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

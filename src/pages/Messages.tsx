import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MessageCircle, PhoneMissed } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  updated_at: string;
  other_user?: { name: string; avatar_url: string | null };
  unread_count?: number;
}

export default function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      await fetchConversations(user.id);
      setLoading(false);
    };
    load();
  }, [navigate]);

  // Realtime for conversation updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations(userId);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchConversations = async (uid: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order("updated_at", { ascending: false });

    if (!data) return;

    // Fetch other user profiles and unread counts
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherId = conv.participant_1 === uid ? conv.participant_2 : conv.participant_1;
        const { data: profile } = await supabase
          .from("public_profiles")
          .select("name, avatar_url")
          .eq("id", otherId)
          .single();

        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .is("read_at", null)
          .neq("sender_id", uid);

        return {
          ...conv,
          other_user: profile || { name: "用户", avatar_url: null },
          unread_count: count || 0,
        };
      })
    );

    setConversations(enriched);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ml-2 text-lg font-semibold">消息</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">暂无消息</p>
            <p className="text-xs mt-1">在帖子详情页点击"私聊"开始对话</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left active:bg-accent"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {conv.other_user?.avatar_url ? (
                      <img src={conv.other_user.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-medium text-muted-foreground">
                        {(conv.other_user?.name || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Unread badge */}
                  {(conv.unread_count ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                      {conv.unread_count! > 99 ? "99+" : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{conv.other_user?.name || "用户"}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${
                    (conv.last_message?.includes("未接来电") ? "text-destructive" : "text-muted-foreground")
                  }`}>
                    {conv.last_message?.includes("未接来电") && (
                      <PhoneMissed className="h-3 w-3 inline mr-1 -mt-0.5" />
                    )}
                    {conv.last_message || "开始聊天吧"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

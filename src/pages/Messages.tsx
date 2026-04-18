import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MessageCircle, PhoneMissed, Bell, ChevronRight, Pin, Trash2, MailOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import IncomingCall from "@/components/chat/IncomingCall";
import { playMessageNotificationTone, primeAudioNotifications } from "@/lib/audioNotifications";
import CreditBadge from "@/components/reviews/CreditBadge";
import { useAuth } from "@/hooks/useAuth";
import { preloadRoute } from "@/lib/routeLoaders";

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  updated_at: string;
  other_user?: { name: string; avatar_url: string | null; average_rating?: number | null; total_ratings?: number | null };
  unread_count?: number;
}

function SwipeableCard({
  conv,
  onNavigate,
  onMarkUnread,
  onPin,
  onDelete,
}: {
  conv: Conversation;
  onNavigate: () => void;
  onMarkUnread: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const ACTION_WIDTH = 200; // total width for 3 buttons

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const diff = startXRef.current - e.touches[0].clientX;
    currentXRef.current = diff;
    const clamped = Math.max(0, Math.min(diff, ACTION_WIDTH));
    setOffset(clamped);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    if (currentXRef.current > ACTION_WIDTH / 2) {
      setOffset(ACTION_WIDTH);
    } else {
      setOffset(0);
    }
    currentXRef.current = 0;
  };

  const closeSwipe = () => setOffset(0);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex h-full" style={{ width: ACTION_WIDTH }}>
        <button
          onClick={() => { onMarkUnread(); closeSwipe(); }}
          className="flex-1 flex flex-col items-center justify-center bg-primary text-primary-foreground text-[11px] gap-1"
        >
          <MailOpen className="h-4 w-4" />
          未读
        </button>
        <button
          onClick={() => { onPin(); closeSwipe(); }}
          className="flex-1 flex flex-col items-center justify-center bg-amber-500 text-white text-[11px] gap-1"
        >
          <Pin className="h-4 w-4" />
          置顶
        </button>
        <button
          onClick={() => { onDelete(); closeSwipe(); }}
          className="flex-1 flex flex-col items-center justify-center bg-destructive text-destructive-foreground text-[11px] gap-1"
        >
          <Trash2 className="h-4 w-4" />
          删除
        </button>
      </div>

      {/* Main card */}
      <div
        className="relative bg-background transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${offset}px)`, transitionDuration: isDraggingRef.current ? '0ms' : '200ms' }}
        onTouchStart={(e) => { handleTouchStart(e); void preloadRoute(`/chat/${conv.id}`); }}
        onMouseEnter={() => void preloadRoute(`/chat/${conv.id}`)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (offset > 0) { closeSwipe(); } else { onNavigate(); } }}
      >
        <div className="w-full flex items-center gap-3 px-4 py-3 text-left">
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
            {(conv.unread_count ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                {conv.unread_count! > 99 ? "99+" : conv.unread_count}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="font-medium text-sm truncate">{conv.other_user?.name || "用户"}</p>
                <CreditBadge averageRating={conv.other_user?.average_rating ?? null} totalRatings={conv.other_user?.total_ratings ?? null} size="sm" showLabel={false} />
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: zhCN })}
              </span>
            </div>
            <p className={`text-xs truncate mt-0.5 ${
              conv.last_message?.includes("未接来电") ? "text-destructive" : "text-muted-foreground"
            }`}>
              {conv.last_message?.includes("未接来电") && (
                <PhoneMissed className="h-3 w-3 inline mr-1 -mt-0.5" />
              )}
              {conv.last_message || "开始聊天吧"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; callerId: string; sessionId: string; conversationId: string } | null>(null);

  useEffect(() => {
    // Check if notification permission is not granted
    if ("Notification" in window && Notification.permission !== "granted") {
      setShowNotifBanner(true);
    }
    // Preload chat room chunk so first chat open is instant
    void preloadRoute("/chat/_");
  }, []);

  useEffect(() => {
    primeAudioNotifications();
  }, []);

  const handleEnableNotif = useCallback(async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        toast.success("通知已开启");
        setShowNotifBanner(false);
      } else {
        toast.error("请在浏览器设置中允许通知");
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { navigate("/auth"); return; }
    let cancelled = false;
    (async () => {
      await fetchConversations(userId);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, authLoading, navigate]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations(userId);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMessage = payload.new as { sender_id?: string };
        if (newMessage.sender_id !== userId) {
          void playMessageNotificationTone();
        }
        fetchConversations(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Listen for incoming calls globally
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("global-incoming-calls")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_sessions",
      }, async (payload) => {
        const session = payload.new as any;
        if (session.receiver_id === userId && session.status === "ringing") {
          const { data: callerProfile } = await supabase
            .from("public_profiles")
            .select("name")
            .eq("id", session.caller_id)
            .single();
          setIncomingCall({
            callerName: callerProfile?.name || "用户",
            callerId: session.caller_id,
            sessionId: session.id,
            conversationId: session.conversation_id,
          });
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_sessions",
      }, (payload) => {
        const session = payload.new as any;
        if (session.receiver_id !== userId) return;
        if (incomingCall?.sessionId === session.id && session.status !== "ringing") {
          setIncomingCall(null);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, incomingCall?.sessionId]);

  const fetchConversations = async (uid: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order("updated_at", { ascending: false });

    if (!data) return;
    if (data.length === 0) { setConversations([]); return; }

    // Batch-fetch all participant profiles + unread messages in parallel
    const otherIds = Array.from(new Set(
      data.map((c) => (c.participant_1 === uid ? c.participant_2 : c.participant_1))
    ));
    const conversationIds = data.map((c) => c.id);

    const [{ data: profiles }, { data: unreadRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, avatar_url, average_rating, total_ratings")
        .in("id", otherIds),
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .is("read_at", null)
        .neq("sender_id", uid),
    ]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
    const unreadMap = new Map<string, number>();
    (unreadRows || []).forEach((row: any) => {
      unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) || 0) + 1);
    });

    const enriched = data.map((conv) => {
      const otherId = conv.participant_1 === uid ? conv.participant_2 : conv.participant_1;
      const p = profileMap.get(otherId);
      return {
        ...conv,
        other_user: p || { name: "用户", avatar_url: null, average_rating: null, total_ratings: null },
        unread_count: unreadMap.get(conv.id) || 0,
      };
    });

    setConversations(enriched);
  };

  const handleMarkUnread = (convId: string) => {
    toast.success("已标为未读");
  };

  const handlePin = (convId: string) => {
    toast.success("已置顶");
  };

  const handleDelete = async (convId: string) => {
    const { error } = await supabase.from("conversations").delete().eq("id", convId);
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== convId));
      toast.success("已删除对话");
    } else {
      toast.error("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
    {incomingCall && (
      <IncomingCall
        callerName={incomingCall.callerName}
        onAccept={async () => {
          await supabase.from("call_sessions").update({ status: "answered" } as any).eq("id", incomingCall.sessionId);
          setIncomingCall(null);
          navigate(`/chat/${incomingCall.conversationId}?callSession=${incomingCall.sessionId}`);
        }}
        onDecline={async () => {
          await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", incomingCall.sessionId);
          setIncomingCall(null);
        }}
      />
    )}
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ml-2 text-lg font-semibold">消息</h1>
        </div>
      </div>

      {/* Notification Banner */}
      {showNotifBanner && (
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleEnableNotif}
            className="w-full flex items-center gap-3 px-4 py-3 bg-accent/60 hover:bg-accent transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">开启通知，及时收到消息</p>
              <p className="text-[11px] text-muted-foreground">开启后不会错过重要消息</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-xs text-primary font-medium">
              去开启
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>
      )}

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
              <SwipeableCard
                key={conv.id}
                conv={conv}
                onNavigate={() => navigate(`/chat/${conv.id}`)}
                onMarkUnread={() => handleMarkUnread(conv.id)}
                onPin={() => handlePin(conv.id)}
                onDelete={() => handleDelete(conv.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

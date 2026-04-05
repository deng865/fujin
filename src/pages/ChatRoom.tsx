import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Send, MapPin, Loader2, ImagePlus, UserCircle, MessageSquareShare, Undo2, PlusCircle, Smile, Route, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatMessageSchema } from "@/lib/validation";
import { sanitizeHtml } from "@/lib/validation";
import { filterMessage } from "@/lib/sensitiveWords";
import { toast } from "@/hooks/use-toast";
import { checkActiveTripLock } from "@/lib/tripLock";
import LocationMessage, { parseLocationMessage } from "@/components/chat/LocationMessage";
import MediaMessage, { parseMediaMessage } from "@/components/chat/MediaMessage";
import VoiceMessage, { parseVoiceMessage } from "@/components/chat/VoiceMessage";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import VoiceCall from "@/components/chat/VoiceCall";
import IncomingCall from "@/components/chat/IncomingCall";
import CallMessage, { parseCallMessage } from "@/components/chat/CallMessage";
import EmojiPicker from "@/components/chat/EmojiPicker";
import TripSharePanel from "@/components/chat/TripSharePanel";
import TripMessage, { parseTripMessage, parseTripAcceptMessage, parseTripCounterMessage, parseTripCancelMessage } from "@/components/chat/TripMessage";
import TripRatingDisplay, { parseTripRatingMessage } from "@/components/chat/TripRating";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  is_recalled?: boolean;
}

interface OtherUser {
  name: string;
  avatar_url: string | null;
  phone: string | null;
}

export default function ChatRoom() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; callerId: string } | null>(null);
  const [myName, setMyName] = useState("");
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [myWechat, setMyWechat] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTripPanel, setShowTripPanel] = useState(false);
  const [sendingTrip, setSendingTrip] = useState(false);
  const [isRideChat, setIsRideChat] = useState(false);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load conversation and messages
  useEffect(() => {
    if (!conversationId) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, phone, wechat_id, avatar_url")
        .eq("id", user.id)
        .single();
      setMyName(myProfile?.name || user.email || user.id);
      setMyPhone(myProfile?.phone || null);
      setMyWechat(myProfile?.wechat_id || null);
      setMyAvatarUrl(myProfile?.avatar_url || null);

      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (!conv) { navigate("/messages"); return; }

      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;

      const { data: profile } = await supabase
        .from("public_profiles")
        .select("name, avatar_url, user_type")
        .eq("id", otherId)
        .single();

      setOtherUser({
        name: profile?.name || "用户",
        avatar_url: profile?.avatar_url || null,
        phone: null,
      });

      // Check if the other user has driver-category posts (conversation initiated from driver listing)
      const { count: driverPostCount } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", otherId)
        .eq("category", "driver");
      if (driverPostCount && driverPostCount > 0) {
        setIsRideChat(true);
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setLoading(false);

      if (msgs && msgs.length > 0) {
        const unreadIds = msgs
          .filter((m: any) => m.sender_id !== user.id && !m.read_at)
          .map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds);
        }
      }
    };
    load();
  }, [conversationId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription - INSERT and UPDATE (for recall)
  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== userId) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, is_recalled: updated.is_recalled } : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const saveCallRecord = useCallback(async (status: "missed" | "declined" | "completed" | "cancelled", callerId: string, duration?: number) => {
    if (!conversationId || !userId) return;
    const callContent = JSON.stringify({ type: "call", status, callerId, duration });
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: callerId,
      content: callContent,
    });
    const labelMap = { missed: "📞 未接来电", declined: "📞 未接来电", completed: "📞 语音通话", cancelled: "📞 已取消通话" };
    await supabase
      .from("conversations")
      .update({ last_message: labelMap[status], updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const callChannel = supabase.channel(`call-${conversationId}`);
    callChannel
      .on("broadcast", { event: "call-invite" }, ({ payload }) => {
        if (payload.from !== userId && !inCall) {
          setIncomingCall({ callerName: payload.callerName || otherUser?.name || "用户", callerId: payload.from });
        }
      })
      .on("broadcast", { event: "hangup" }, ({ payload }) => {
        if (payload.from !== userId) {
          setIncomingCall(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [conversationId, userId, inCall, otherUser?.name]);

  // Recall message
  const handleRecall = async (msg: Message) => {
    setLongPressMsg(null);
    try {
      // Check if media message - delete R2 files
      const mediaData = parseMediaMessage(msg.content);
      if (mediaData && mediaData.urls.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          fetch(`https://${projectId}.supabase.co/functions/v1/delete-r2-file`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ urls: mediaData.urls }),
          }).catch(console.error);
        }
      }

      // Also check voice messages
      const voiceData = parseVoiceMessage(msg.content);
      if (voiceData) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          fetch(`https://${projectId}.supabase.co/functions/v1/delete-r2-file`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ urls: [voiceData.url] }),
          }).catch(console.error);
        }
      }

      const { error } = await supabase
        .from("messages")
        .update({ is_recalled: true } as any)
        .eq("id", msg.id);

      if (error) {
        toast({ title: "撤回失败", description: "请稍后重试", variant: "destructive" });
      } else {
        // Update locally immediately
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_recalled: true } : m));
        await supabase
          .from("conversations")
          .update({ last_message: "消息已撤回", updated_at: new Date().toISOString() })
          .eq("id", conversationId!);
      }
    } catch {
      toast({ title: "撤回失败", variant: "destructive" });
    }
  };

  const canRecall = (msg: Message) => {
    if (msg.sender_id !== userId || msg.is_recalled) return false;
    // Trip-related messages cannot be recalled
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed?.type && ["trip", "trip_accept", "trip_counter", "trip_cancel", "trip_rating"].includes(parsed.type)) return false;
    } catch {}
    const elapsed = Date.now() - new Date(msg.created_at).getTime();
    return elapsed < 2 * 60 * 1000; // 2 minutes
  };

  // Long press handlers
  const handleTouchStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressMsg(msgId);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !userId || !conversationId || sending) return;
    const trimmed = input.trim();
    const validation = chatMessageSchema.safeParse({ message: trimmed });
    if (!validation.success) {
      toast({ title: "发送失败", description: validation.error.issues[0].message, variant: "destructive" });
      return;
    }
    const filtered = filterMessage(trimmed);
    if (!filtered.safe) {
      toast({ title: "发送失败", description: filtered.message, variant: "destructive" });
      return;
    }
    setSending(true);
    const sanitized = sanitizeHtml(trimmed);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: sanitized,
    });
    if (error) {
      toast({ title: "发送失败", description: "请稍后重试", variant: "destructive" });
    } else {
      await supabase
        .from("conversations")
        .update({ last_message: sanitized, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      setInput("");
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleSendLocation = async () => {
    if (!userId || !conversationId || sendingLocation) return;
    setSendingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      let address = "共享位置";
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (token) {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&language=zh`);
          const geo = await res.json();
          if (geo.features?.[0]?.place_name) address = geo.features[0].place_name;
        }
      } catch {}
      const locationContent = JSON.stringify({ type: "location", lat: latitude, lng: longitude, address });
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId, sender_id: userId, content: locationContent,
      });
      if (error) {
        toast({ title: "发送失败", description: "请稍后重试", variant: "destructive" });
      } else {
        await supabase.from("conversations").update({ last_message: "📍 位置信息", updated_at: new Date().toISOString() }).eq("id", conversationId);
      }
    } catch {
      toast({ title: "获取位置失败", description: "请确保已开启定位权限", variant: "destructive" });
    } finally {
      setSendingLocation(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId || !conversationId) return;
    setUploadingMedia(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("请先登录");
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast({ title: "文件过大", description: `${file.name} 超过50MB限制`, variant: "destructive" });
          continue;
        }
        let processedFile = file;
        if (file.type.startsWith("image/")) {
          processedFile = await new Promise<File>((resolve) => {
            const img = new Image();
            img.onload = () => {
              let w = img.width, h = img.height;
              const maxW = 1200;
              if (w > maxW) { h = (maxW / w) * h; w = maxW; }
              const canvas = document.createElement("canvas");
              canvas.width = w; canvas.height = h;
              canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
              canvas.toBlob(
                (blob) => resolve(new File([blob!], file.name, { type: "image/jpeg" })),
                "image/jpeg", 0.8
              );
            };
            img.src = URL.createObjectURL(file);
          });
        }
        const formData = new FormData();
        formData.append("file", processedFile);
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/upload-to-r2`,
          { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData }
        );
        if (!res.ok) { toast({ title: "上传失败", description: file.name, variant: "destructive" }); continue; }
        const { url } = await res.json();
        urls.push(url);
      }
      if (urls.length > 0) {
        const mediaContent = JSON.stringify({ type: "media", urls });
        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId, sender_id: userId, content: mediaContent,
        });
        if (error) {
          toast({ title: "发送失败", description: "请稍后重试", variant: "destructive" });
        } else {
          await supabase.from("conversations").update({ last_message: "📷 图片/视频", updated_at: new Date().toISOString() }).eq("id", conversationId);
        }
      }
    } catch (err: any) {
      toast({ title: "上传失败", description: err.message || "请稍后重试", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSendContact = async (type: "phone" | "wechat") => {
    if (!userId || !conversationId || sending) return;
    const value = type === "phone" ? myPhone : myWechat;
    if (!value) return;
    const label = type === "phone" ? "手机号" : "微信号";
    const content = JSON.stringify({ type: "contact", contactType: type, value, label: `${label}: ${value}` });
    const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, content });
    if (!error) {
      await supabase.from("conversations").update({ last_message: `📱 ${label}`, updated_at: new Date().toISOString() }).eq("id", conversationId);
    }
    setShowContactMenu(false);
  };

  const handleSendTrip = async (from: string, to: string, fromCoords?: { lat: number; lng: number }, price?: string) => {
    if (!userId || !conversationId) return;
    setSendingTrip(true);
    try {
      const tripContent = JSON.stringify({ type: "trip", from, to, fromCoords, price });
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: tripContent,
      });
      if (!error) {
        await supabase.from("conversations").update({
          last_message: "🚗 行程信息",
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
        setShowTripPanel(false);
      }
    } catch {} finally {
      setSendingTrip(false);
    }
  };

  const handleAcceptTrip = async (trip: { from: string; to: string; price?: string }) => {
    if (!userId || !conversationId) return;
    // Check if this user already has an active trip (driver lock)
    const lockedConvId = await checkActiveTripLock(userId);
    if (lockedConvId && lockedConvId !== conversationId) {
      toast({ title: "你有进行中的行程", description: "请先结束当前预约后再接受新行程" });
      return;
    }
    const acceptContent = JSON.stringify({ type: "trip_accept", from: trip.from, to: trip.to, price: trip.price });
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: acceptContent,
    });
    if (!error) {
      await supabase.from("conversations").update({
        last_message: "✅ 已接受行程",
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);
    }
  };

  const handleCounterTrip = async (trip: { from: string; to: string; originalPrice?: string }, newPrice: string) => {
    if (!userId || !conversationId) return;
    const counterContent = JSON.stringify({ type: "trip_counter", from: trip.from, to: trip.to, price: newPrice, originalPrice: trip.originalPrice });
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: counterContent,
    });
    if (!error) {
      await supabase.from("conversations").update({
        last_message: `💬 还价 $${newPrice}`,
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);
    }
  };

  const handleCancelTrip = async (trip: { from: string; to: string; price?: string }) => {
    if (!userId || !conversationId) return;
    const cancelContent = JSON.stringify({ type: "trip_cancel", from: trip.from, to: trip.to, cancelledBy: userId });
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: cancelContent,
    });
    if (!error) {
      await supabase.from("conversations").update({
        last_message: "❌ 已结束预约",
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);
    }
  };

  // Check if current user already rated for a specific accept message
  const hasUserRated = useCallback((acceptMsgId: string) => {
    return messages.some((m) => {
      if (m.sender_id !== userId) return false;
      const ratingData = parseTripRatingMessage(m.content);
      return ratingData !== null && m.content.includes(acceptMsgId);
    });
  }, [messages, userId]);

  // Simplified: check if user has any rating message after an accept
  const hasRatedForAccept = useCallback((acceptContent: string) => {
    try {
      const accept = JSON.parse(acceptContent);
      return messages.some((m) => {
        if (m.sender_id !== userId) return false;
        const rd = parseTripRatingMessage(m.content);
        return rd && rd.from === accept.from && rd.to === accept.to;
      });
    } catch { return false; }
  }, [messages, userId]);

  // Check if a specific accepted trip has been cancelled
  const isCancelledForAccept = useCallback((acceptContent: string) => {
    try {
      const accept = JSON.parse(acceptContent);
      return messages.some((m) => {
        const cd = parseTripCancelMessage(m.content);
        return cd && cd.from === accept.from && cd.to === accept.to;
      });
    } catch { return false; }
  }, [messages]);

  // Check if there's an active (accepted but not cancelled) trip in this conversation
  const hasActiveTrip = useCallback(() => {
    const accepts = messages.filter((m) => parseTripAcceptMessage(m.content));
    return accepts.some((acceptMsg) => !isCancelledForAccept(acceptMsg.content));
  }, [messages, isCancelledForAccept]);

  // Get active trip details for banner
  const activeTripInfo = useCallback(() => {
    const accepts = messages.filter((m) => parseTripAcceptMessage(m.content));
    for (const acceptMsg of accepts) {
      if (!isCancelledForAccept(acceptMsg.content)) {
        const data = parseTripAcceptMessage(acceptMsg.content);
        if (data) return { from: data.from, to: data.to, price: data.price };
      }
    }
    return null;
  }, [messages, isCancelledForAccept]);

  const handleRateTrip = async (trip: { from: string; to: string; price?: string }, rating: number, comment: string) => {
    if (!userId || !conversationId) return;
    // Get the other user's ID
    const { data: conv } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", conversationId)
      .single();
    if (!conv) return;
    const ratedUserId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;

    const ratingContent = JSON.stringify({
      type: "trip_rating",
      from: trip.from,
      to: trip.to,
      price: trip.price,
      rating,
      comment: comment || undefined,
      ratedUserId,
    });
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: ratingContent,
    });
    if (!error) {
      await supabase.from("conversations").update({
        last_message: `⭐ 行程评价 ${rating}分`,
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);

      // Update profile rating
      const { data: profile } = await supabase
        .from("profiles")
        .select("rating_sum, total_ratings")
        .eq("id", ratedUserId)
        .single();
      if (profile) {
        const newSum = (profile.rating_sum || 0) + rating;
        const newTotal = (profile.total_ratings || 0) + 1;
        await supabase.from("profiles").update({
          rating_sum: newSum,
          total_ratings: newTotal,
          average_rating: parseFloat((newSum / newTotal).toFixed(1)),
        }).eq("id", ratedUserId);
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {inCall && userId && conversationId && (
        <VoiceCall
          conversationId={conversationId}
          userId={userId}
          userName={myName}
          otherUserName={otherUser?.name || "用户"}
          onClose={(callDuration?: number) => {
            setInCall(false);
            if (callDuration !== undefined && callDuration > 0) {
              saveCallRecord("completed", userId, callDuration);
            }
          }}
        />
      )}
      {incomingCall && !inCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          onAccept={() => { setIncomingCall(null); setInCall(true); }}
          onDecline={() => { saveCallRecord("missed", incomingCall.callerId); setIncomingCall(null); }}
        />
      )}

      {/* Header */}
      <div className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 z-10">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/messages")} className="p-2 -ml-2 hover:bg-accent rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {otherUser?.avatar_url ? (
                  <img src={otherUser.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {(otherUser?.name || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-semibold text-sm">{otherUser?.name || "用户"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dismiss long-press menu on backdrop click */}
      {longPressMsg && (
        <div className="fixed inset-0 z-30" onClick={() => setLongPressMsg(null)} />
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-w-lg mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-8">开始聊天吧 👋</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === userId;
          const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();
          const callData = parseCallMessage(msg.content);

          // Recalled message
          if (msg.is_recalled) {
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center text-[11px] text-muted-foreground py-2">
                    {new Date(msg.created_at).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
                  </div>
                )}
                <div className="text-center text-[12px] text-muted-foreground py-1 italic">
                  {isMe ? "你" : (otherUser?.name || "对方")}撤回了一条消息
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-[11px] text-muted-foreground py-2">
                  {new Date(msg.created_at).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
                </div>
              )}
              {callData ? (
                <>
                  <CallMessage content={msg.content} isMe={isMe} isCaller={callData.callerId === userId} />
                  <p className="text-center text-[10px] text-muted-foreground mt-0.5">{formatTime(msg.created_at)}</p>
                </>
              ) : (
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
                  {!isMe && (
                    <Avatar className="h-7 w-7 shrink-0 mt-1">
                      {otherUser?.avatar_url ? <AvatarImage src={otherUser.avatar_url} alt={otherUser?.name || ""} /> : null}
                      <AvatarFallback className="text-[10px]">{(otherUser?.name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className="max-w-[75%] relative"
                    onTouchStart={() => isMe && canRecall(msg) && handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onContextMenu={(e) => {
                      if (isMe && canRecall(msg)) {
                        e.preventDefault();
                        setLongPressMsg(msg.id);
                      }
                    }}
                  >
                    {/* Long press recall menu */}
                    {longPressMsg === msg.id && canRecall(msg) && (
                      <div className={`absolute ${isMe ? "right-0" : "left-0"} -top-10 z-40 bg-popover border border-border rounded-lg shadow-lg py-1 px-1 animate-in fade-in zoom-in-95`}>
                        <button
                          onClick={() => handleRecall(msg)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-accent rounded-md text-destructive whitespace-nowrap"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          撤回
                        </button>
                      </div>
                    )}
                    {parseLocationMessage(msg.content) ? (
                      <LocationMessage content={msg.content} isMe={isMe} />
                    ) : parseMediaMessage(msg.content) ? (
                      <MediaMessage content={msg.content} isMe={isMe} />
                    ) : parseVoiceMessage(msg.content) ? (
                      <VoiceMessage content={msg.content} isMe={isMe} />
                    ) : parseTripRatingMessage(msg.content) ? (
                      <TripRatingDisplay content={msg.content} isMe={isMe} />
                    ) : (parseTripMessage(msg.content) || parseTripAcceptMessage(msg.content) || parseTripCounterMessage(msg.content) || parseTripCancelMessage(msg.content)) ? (
                      <TripMessage content={msg.content} isMe={isMe} onAccept={handleAcceptTrip} onCounter={handleCounterTrip} onRate={handleRateTrip} onCancel={handleCancelTrip} hasRated={hasRatedForAccept(msg.content)} isCancelled={isCancelledForAccept(msg.content)} />
                    ) : (() => {
                      try {
                        const parsed = JSON.parse(msg.content);
                        if (parsed?.type === "contact") {
                          return (
                            <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                              <div className="flex items-center gap-1.5">
                                <UserCircle className="h-4 w-4 shrink-0" />
                                <span className="font-medium">{parsed.contactType === "phone" ? "手机号" : "微信号"}</span>
                              </div>
                              <p className="mt-1 font-mono text-xs select-all">{parsed.value}</p>
                            </div>
                          );
                        }
                      } catch {}
                      return (
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                          {msg.content}
                        </div>
                      );
                    })()}
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? "text-right" : "text-left"}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                  {isMe && (
                    <Avatar className="h-7 w-7 shrink-0 mt-1">
                      {myAvatarUrl ? <AvatarImage src={myAvatarUrl} alt={myName} /> : null}
                      <AvatarFallback className="text-[10px]">{(myName || "M").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/50 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-1.5 px-3 py-2 max-w-lg mx-auto">
          {isRideChat && (
            <button
              onClick={() => { setShowTripPanel(!showTripPanel); setShowContactMenu(false); setShowEmojiPicker(false); }}
              className={`p-2 rounded-full transition-colors shrink-0 ${showTripPanel ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              title="行程"
            >
              <Route className="h-5 w-5" />
            </button>
          )}
          <VoiceRecorder conversationId={conversationId!} userId={userId!} disabled={sending || uploadingMedia} />
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => { setShowEmojiPicker(false); setShowContactMenu(false); setShowTripPanel(false); }} placeholder="输入消息..." maxLength={2000} className="flex-1 min-w-0 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 transition-all placeholder:text-muted-foreground" />
          <button
            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowContactMenu(false); }}
            className={`p-2 hover:bg-accent rounded-full transition-colors shrink-0 ${showEmojiPicker ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="表情"
          >
            <Smile className="h-5 w-5" />
          </button>
          {input.trim() ? (
            <button onClick={handleSend} disabled={!input.trim() || sending} className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => { setShowContactMenu(!showContactMenu); setShowEmojiPicker(false); }}
              className="p-2.5 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="更多"
            >
              <PlusCircle className="h-6 w-6" />
            </button>
          )}
        </div>
        {/* Emoji picker panel */}
        {showEmojiPicker && (
          <EmojiPicker onSelect={(emoji) => setInput(prev => prev + emoji)} />
        )}
        {/* Trip share panel */}
        {showTripPanel && (
          <TripSharePanel onSend={handleSendTrip} sending={sendingTrip} />
        )}
        {/* Expandable action panel (WeChat style "+" menu) */}
        {showContactMenu && (
          <div className="max-w-lg mx-auto px-4 pb-3 pt-1">
            <div className="grid grid-cols-4 gap-4">
              <button onClick={() => { mediaInputRef.current?.click(); setShowContactMenu(false); }} disabled={uploadingMedia} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                  {uploadingMedia ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <ImagePlus className="h-6 w-6 text-muted-foreground" />}
                </div>
                <span className="text-[11px] text-muted-foreground">照片</span>
              </button>
              <button onClick={() => { handleSendLocation(); setShowContactMenu(false); }} disabled={sendingLocation} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                  {sendingLocation ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <MapPin className="h-6 w-6 text-muted-foreground" />}
                </div>
                <span className="text-[11px] text-muted-foreground">位置</span>
              </button>
              <button onClick={() => setInCall(true)} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                  <Phone className="h-6 w-6 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground">语音通话</span>
              </button>
              {myPhone && (
                <button onClick={() => { handleSendContact("phone"); setShowContactMenu(false); }} className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight text-center">手机号发送</span>
                </button>
              )}
              {myWechat && (
                <button onClick={() => { handleSendContact("wechat"); setShowContactMenu(false); }} className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                    <MessageSquareShare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight text-center">微信号发送</span>
                </button>
              )}
            </div>
          </div>
        )}
        <input ref={mediaInputRef} type="file" accept="image/*,video/mp4,video/quicktime" multiple onChange={handleMediaUpload} className="hidden" />
      </div>
    </div>
  );
}

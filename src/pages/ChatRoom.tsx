import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Send, MapPin, Loader2, ImagePlus, UserCircle, MessageSquareShare, Undo2, PlusCircle, Smile, Route, XCircle, Check, DollarSign, Star, Camera, Image as ImageIcon, FolderOpen } from "lucide-react";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
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
import LocationShareDialog from "@/components/chat/LocationShareDialog";
import LiveLocationBanner from "@/components/chat/LiveLocationBanner";
import LiveLocationMessage, { parseLiveLocationMessage } from "@/components/chat/LiveLocationMessage";
import LiveLocationMap from "@/components/chat/LiveLocationMap";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import VoiceCall from "@/components/chat/VoiceCall";
import IncomingCall from "@/components/chat/IncomingCall";
import CallMessage, { parseCallMessage } from "@/components/chat/CallMessage";
import EmojiPicker from "@/components/chat/EmojiPicker";
import TripSharePanel from "@/components/chat/TripSharePanel";
import TripMessage, { parseTripMessage, parseTripAcceptMessage, parseTripCounterMessage, parseTripCancelMessage, parseTripAcceptNotify, parseTripCompleteMessage } from "@/components/chat/TripMessage";
import TripRatingDisplay, { parseTripRatingMessage } from "@/components/chat/TripRating";
import { TripRatingInput } from "@/components/chat/TripRating";
import DriverTracking from "@/components/chat/DriverTracking";
import { playMessageNotificationTone, primeAudioNotifications } from "@/lib/audioNotifications";

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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [isCallCaller, setIsCallCaller] = useState(true);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; callerId: string; sessionId: string } | null>(null);
  const [myName, setMyName] = useState("");
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [myWechat, setMyWechat] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTripPanel, setShowTripPanel] = useState(false);
  const [sendingTrip, setSendingTrip] = useState(false);
  const [isRideChat, setIsRideChat] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [liveShare, setLiveShare] = useState<{ duration: number; startedAt: number; messageId: string } | null>(null);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [selectedLiveLocation, setSelectedLiveLocation] = useState<{ myPos?: { lat: number; lng: number }; otherPos?: { lat: number; lng: number } } | null>(null);
  const [cachedMyPos, setCachedMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [otherCachedPos, setOtherCachedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const liveChannelRef = useRef<any>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [acceptingTrip, setAcceptingTrip] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);
  const [cancellingTrip, setCancellingTrip] = useState(false);
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
      setOtherUserId(otherId);

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

      // Check if current user is a driver
      const { count: myDriverPostCount } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("category", "driver");
      if (myDriverPostCount && myDriverPostCount > 0) {
        setIsDriver(true);
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

  useEffect(() => {
    primeAudioNotifications();
  }, []);

  // Realtime subscription - INSERT and UPDATE (for recall + live location accept)
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
            void playMessageNotificationTone();
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
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, content: updated.content, is_recalled: updated.is_recalled } : m));
          // When a live_location message is accepted, start banner for both parties
          const liveData = parseLiveLocationMessage(updated.content);
          if (liveData?.status === "accepted") {
            setLiveShare({ duration: liveData.durationMinutes, startedAt: Date.now(), messageId: updated.id });
          }
          if (liveData?.status === "ended") {
            setLiveShare(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  // Live location listening is handled inside LiveLocationBanner via onOtherPositionUpdate

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

  // Listen for incoming calls via DB realtime (call_sessions table)
  useEffect(() => {
    if (!conversationId || !userId) return;

    const ch = supabase.channel(`call-sessions-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_sessions",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const session = payload.new as any;
        if (session.receiver_id === userId && session.status === "ringing" && !inCall) {
          // Fetch caller name
          const { data: callerProfile } = await supabase
            .from("public_profiles")
            .select("name")
            .eq("id", session.caller_id)
            .single();
          setIncomingCall({
            callerName: callerProfile?.name || otherUser?.name || "用户",
            callerId: session.caller_id,
            sessionId: session.id,
          });
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_sessions",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const session = payload.new as any;
        if (session.receiver_id !== userId) return;
        if (incomingCall?.sessionId === session.id && session.status !== "ringing") {
          setIncomingCall(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [conversationId, userId, inCall, otherUser?.name, incomingCall?.sessionId]);

  // Also check for any active ringing session on mount
  useEffect(() => {
    if (!conversationId || !userId) return;
    const checkActive = async () => {
      const { data } = await supabase
        .from("call_sessions")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("receiver_id", userId)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1) as any;
      if (data && data.length > 0) {
        const session = data[0];
        const age = Date.now() - new Date(session.created_at).getTime();
        if (age < 30000) {
          const { data: callerProfile } = await supabase
            .from("public_profiles")
            .select("name")
            .eq("id", session.caller_id)
            .single();
          setIncomingCall({
            callerName: callerProfile?.name || otherUser?.name || "用户",
            callerId: session.caller_id,
            sessionId: session.id,
          });
        }
      }
    };
    checkActive();
  }, [conversationId, userId, otherUser?.name]);

  // Start a call: create DB session, then enter call UI
  const handleStartCall = async () => {
    if (!userId || !conversationId || !otherUserId || startingCall) return;
    setStartingCall(true);
    try {
      // Request mic permission early
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());

      const { data, error } = await supabase.from("call_sessions").insert({
        conversation_id: conversationId,
        caller_id: userId,
        receiver_id: otherUserId,
        status: "ringing",
      } as any).select().single();

      if (error || !data) {
        toast({ title: "呼叫失败", description: "请稍后重试", variant: "destructive" });
        return;
      }
      setCallSessionId((data as any).id);
      setIsCallCaller(true);
      setInCall(true);
    } catch (err: any) {
      toast({
        title: "呼叫失败",
        description: err.message?.includes("Permission") ? "请允许麦克风权限后重试" : "无法发起通话",
        variant: "destructive",
      });
    } finally {
      setStartingCall(false);
    }
  };
  // Auto-start call if navigated with callSession param (accepted from Messages page)
  useEffect(() => {
    const sessionId = searchParams.get("callSession");
    if (sessionId && userId && !inCall) {
      setCallSessionId(sessionId);
      setIsCallCaller(false);
      setInCall(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, userId, inCall, setSearchParams]);


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
      if (parsed?.type && ["trip", "trip_accept", "trip_counter", "trip_cancel", "trip_rating", "trip_accept_notify"].includes(parsed.type)) return false;
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
      const locationContent = JSON.stringify({ type: "location", lat: latitude, lng: longitude, address, senderName: myName });
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

  const handleStartLiveShare = async (durationMinutes: number) => {
    if (!userId || !conversationId) return;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      let address = "实时位置共享";
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (token) {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?access_token=${token}&language=zh`);
          const geo = await res.json();
          if (geo.features?.[0]?.place_name) address = geo.features[0].place_name;
        }
      } catch {}
      const liveContent = JSON.stringify({
        type: "live_location",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        address,
        durationMinutes,
        sharedBy: userId,
        status: "pending",
      });
      await supabase.from("messages").insert({
        conversation_id: conversationId, sender_id: userId, content: liveContent,
      });
      await supabase.from("conversations").update({ last_message: "📍 实时位置共享请求", updated_at: new Date().toISOString() }).eq("id", conversationId);
      // Don't start banner yet — wait for accept
    } catch {
      toast({ title: "获取位置失败", description: "请确保已开启定位权限", variant: "destructive" });
    }
  };

  const handleAcceptLiveShare = async (messageId: string) => {
    if (!conversationId || !userId) return;
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const liveData = parseLiveLocationMessage(msg.content);
    if (!liveData) return;
    const updatedContent = JSON.stringify({ ...liveData, status: "accepted" });
    await supabase.from("messages").update({ content: updatedContent } as any).eq("id", messageId);
    setLiveShare({ duration: liveData.durationMinutes, startedAt: Date.now(), messageId });
  };

  const handleStopLiveShare = async (reason: "manual" | "expired") => {
    if (!conversationId || !userId) return;
    // Update the live location message status to "ended"
    if (liveShare?.messageId) {
      const msg = messages.find((m) => m.id === liveShare.messageId);
      if (msg) {
        const liveData = parseLiveLocationMessage(msg.content);
        if (liveData) {
          const updatedContent = JSON.stringify({ ...liveData, status: "ended" });
          await supabase.from("messages").update({ content: updatedContent } as any).eq("id", liveShare.messageId);
        }
      }
    }
    // Send system notification
    const sysContent = JSON.stringify({ type: "system", text: "实时位置共享已结束" });
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, content: sysContent });
    await supabase.from("conversations").update({ last_message: "实时位置共享已结束", updated_at: new Date().toISOString() }).eq("id", conversationId);
    setLiveShare(null);
    setOtherCachedPos(null);
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

  const handleSendTrip = async (from: string, to: string, fromCoords?: { lat: number; lng: number }, toCoords?: { lat: number; lng: number }, price?: string) => {
    if (!userId || !conversationId) return;
    setSendingTrip(true);
    try {
      const tripContent = JSON.stringify({ type: "trip", from, to, fromCoords, toCoords, price });
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

  const handleAcceptTrip = async (trip: { from: string; to: string; price?: string; fromCoords?: { lat: number; lng: number }; toCoords?: { lat: number; lng: number } }) => {
    if (!userId || !conversationId || acceptingTrip) return;
    setAcceptingTrip(true);
    try {
    // Check if this user already has an active trip (driver lock)
    const lockedConvId = await checkActiveTripLock(userId);
    if (lockedConvId && lockedConvId !== conversationId) {
      toast({ title: "你有进行中的行程", description: "请先结束当前预约后再接受新行程" });
      return;
    }
    const acceptContent = JSON.stringify({ type: "trip_accept", from: trip.from, to: trip.to, price: trip.price, fromCoords: trip.fromCoords, toCoords: trip.toCoords });
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

      // Send trip_accept_notify with driver info
      try {
        const { data: driverProfile } = await supabase
          .from("profiles")
          .select("name, avatar_url, average_rating, vehicle_model, vehicle_color, license_plate")
          .eq("id", userId)
          .single();

        // Get driver's current location and calculate distance/ETA to pickup
        let distanceMi = 0;
        let etaMin = 0;
        if (trip.fromCoords) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
            );
            const driverLat = pos.coords.latitude;
            const driverLng = pos.coords.longitude;
            const res = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${driverLng},${driverLat};${trip.fromCoords.lng},${trip.fromCoords.lat}?access_token=${MAPBOX_TOKEN}&overview=false`
            );
            const data = await res.json();
            if (data.routes?.[0]) {
              distanceMi = (data.routes[0].distance / 1000) * 0.621371;
              etaMin = Math.round(data.routes[0].duration / 60);
            }
          } catch {
            // Fallback: estimate based on straight-line
            distanceMi = 5;
            etaMin = 10;
          }
        }

        const notifyContent = JSON.stringify({
          type: "trip_accept_notify",
          driverName: driverProfile?.name || "司机",
          driverAvatar: driverProfile?.avatar_url || null,
          driverRating: driverProfile?.average_rating || null,
          vehicleModel: (driverProfile as any)?.vehicle_model || null,
          vehicleColor: (driverProfile as any)?.vehicle_color || null,
          licensePlate: (driverProfile as any)?.license_plate || null,
          distanceMi,
          etaMin,
        });
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: notifyContent,
        });
      } catch (e) {
        console.error("Failed to send accept notify", e);
      }
    }
    } finally {
      setAcceptingTrip(false);
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

  const [pendingCancelTrip, setPendingCancelTrip] = useState<{ from: string; to: string; price?: string } | null>(null);

  const handleCancelTrip = (trip: { from: string; to: string; price?: string }) => {
    setPendingCancelTrip(trip);
  };

  const confirmCancelTrip = async () => {
    const trip = pendingCancelTrip;
    setPendingCancelTrip(null);
    if (!trip || !userId || !conversationId) return;
    setCancellingTrip(true);
    try {
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
    } finally {
      setCancellingTrip(false);
    }
  };

  // --- Order Complete flow ---
  const [pendingCompleteTrip, setPendingCompleteTrip] = useState<{ from: string; to: string; price?: string } | null>(null);

  const handleCompleteTrip = (trip: { from: string; to: string; price?: string }) => {
    setPendingCompleteTrip(trip);
  };

  const confirmCompleteTrip = async () => {
    const trip = pendingCompleteTrip;
    setPendingCompleteTrip(null);
    if (!trip || !userId || !conversationId) return;
    setCompletingTrip(true);
    try {
      const completeContent = JSON.stringify({ type: "trip_complete", from: trip.from, to: trip.to, price: trip.price, completedBy: userId });
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: completeContent,
      });
      if (!error) {
        await supabase.from("conversations").update({
          last_message: "✅ 订单已完成",
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
      }
    } finally {
      setCompletingTrip(false);
    }
  };

  // ── Pre-compute trip state once per messages change (avoid O(n²) on every render) ──
  const tripState = useMemo(() => {
    const cancelledSet = new Set<string>();
    const completedSet = new Set<string>();
    const ratedByMe = new Set<string>();
    const acceptEntries: { msg: Message; data: ReturnType<typeof parseTripAcceptMessage> }[] = [];

    for (const m of messages) {
      const cd = parseTripCancelMessage(m.content);
      if (cd) cancelledSet.add(`${cd.from}|${cd.to}`);

      try {
        const parsed = JSON.parse(m.content);
        if (parsed?.type === "trip_complete") completedSet.add(`${parsed.from}|${parsed.to}`);
      } catch {}

      const ad = parseTripAcceptMessage(m.content);
      if (ad) acceptEntries.push({ msg: m, data: ad });

      if (m.sender_id === userId) {
        const rd = parseTripRatingMessage(m.content);
        if (rd) ratedByMe.add(`${rd.from}|${rd.to}`);
      }
    }

    const isTerminal = (key: string) => cancelledSet.has(key) || completedSet.has(key);

    let activeAcceptData: ReturnType<typeof parseTripAcceptMessage> = null;
    let activeTrip: { from: string; to: string; price?: string } | null = null;
    for (const entry of acceptEntries) {
      const key = `${entry.data!.from}|${entry.data!.to}`;
      if (!isTerminal(key)) {
        activeAcceptData = entry.data;
        activeTrip = { from: entry.data!.from, to: entry.data!.to, price: entry.data!.price };
        break;
      }
    }

    return { cancelledSet, completedSet, ratedByMe, activeAcceptData, activeTrip, hasActive: !!activeTrip };
  }, [messages, userId]);

  const isCancelledForAccept = useCallback((content: string) => {
    try { const a = JSON.parse(content); return tripState.cancelledSet.has(`${a.from}|${a.to}`); } catch { return false; }
  }, [tripState.cancelledSet]);

  const isCompletedForAccept = useCallback((content: string) => {
    try { const a = JSON.parse(content); return tripState.completedSet.has(`${a.from}|${a.to}`); } catch { return false; }
  }, [tripState.completedSet]);

  const hasRatedForAccept = useCallback((content: string) => {
    try { const a = JSON.parse(content); return tripState.ratedByMe.has(`${a.from}|${a.to}`); } catch { return false; }
  }, [tripState.ratedByMe]);

  const isActiveForTrip = useCallback((content: string) => {
    try {
      const trip = JSON.parse(content);
      if (!trip?.from || !trip?.to) return false;
      const key = `${trip.from}|${trip.to}`;
      // Check if there's an accepted entry for this trip that is not terminal
      return !tripState.cancelledSet.has(key) && !tripState.completedSet.has(key) &&
        messages.some((m) => { const a = parseTripAcceptMessage(m.content); return !!a && a.from === trip.from && a.to === trip.to; });
    } catch { return false; }
  }, [tripState, messages]);

  const hasActiveTrip = useCallback(() => tripState.hasActive, [tripState.hasActive]);
  const activeTripInfo = useCallback(() => tripState.activeTrip, [tripState.activeTrip]);

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
    <>
    <div className="flex flex-col h-[100dvh] bg-background">
      {inCall && userId && conversationId && callSessionId && (
        <VoiceCall
          conversationId={conversationId}
          callSessionId={callSessionId}
          userId={userId}
          userName={myName}
          otherUserName={otherUser?.name || "用户"}
          isCaller={isCallCaller}
          onClose={(callDuration?: number) => {
            setInCall(false);
            setIsCallCaller(true);
            setCallSessionId(null);
            if (callDuration !== undefined && callDuration > 0) {
              saveCallRecord("completed", userId, callDuration);
            } else if (isCallCaller) {
              saveCallRecord("cancelled", userId);
            }
          }}
        />
      )}
      {incomingCall && !inCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          onAccept={async () => {
            // Mark session as answered
            await supabase.from("call_sessions").update({ status: "answered" } as any).eq("id", incomingCall.sessionId);
            setCallSessionId(incomingCall.sessionId);
            setIsCallCaller(false);
            setIncomingCall(null);
            setInCall(true);
          }}
          onDecline={async () => {
            await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", incomingCall.sessionId);
            saveCallRecord("declined", incomingCall.callerId);
            setIncomingCall(null);
          }}
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

      {/* Live location sharing banner */}
      {liveShare && userId && conversationId && otherUserId && (
        <LiveLocationBanner
          conversationId={conversationId}
          userId={userId}
          otherUserId={otherUserId}
          durationMinutes={liveShare.duration}
          startedAt={liveShare.startedAt}
          onStop={(reason) => handleStopLiveShare(reason)}
          onPositionUpdate={(pos) => setCachedMyPos(pos)}
          onOtherPositionUpdate={(pos) => setOtherCachedPos(pos)}
          channelRef={liveChannelRef}
        />
      )}

      {/* Active trip banner */}
      {(() => {
        const trip = activeTripInfo();
        if (!trip) return null;
        return (
          <div className="shrink-0 bg-primary/10 border-b border-primary/20 px-4 py-2 max-w-lg mx-auto w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Route className="h-4 w-4 text-primary shrink-0" />
                <div className="text-xs truncate">
                  <span className="font-medium text-primary">行程进行中</span>
                  <span className="text-muted-foreground ml-1.5">{trip.from} → {trip.to}</span>
                  {trip.price && <span className="text-muted-foreground ml-1">${trip.price}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleCompleteTrip(trip)}
                  disabled={completingTrip || cancellingTrip}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {completingTrip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  订单已完成
                </button>
                <button
                  onClick={() => handleCancelTrip(trip)}
                  disabled={completingTrip || cancellingTrip}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  {cancellingTrip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  结束预约
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Driver real-time tracking map */}
      {(() => {
        if (!hasActiveTrip() || !userId || !conversationId) return null;
        // Find the active accepted trip's coordinates
        const accepts = messages.filter((m) => parseTripAcceptMessage(m.content));
        let activeAccept: ReturnType<typeof parseTripAcceptMessage> = null;
        for (const acceptMsg of accepts) {
          if (!isCancelledForAccept(acceptMsg.content) && !isCompletedForAccept(acceptMsg.content)) {
            activeAccept = parseTripAcceptMessage(acceptMsg.content);
            break;
          }
        }
        if (!activeAccept?.fromCoords) return null;
        return (
          <DriverTracking
            conversationId={conversationId}
            userId={userId}
            isDriver={isDriver}
            passengerLocation={activeAccept.fromCoords}
            destinationLocation={activeAccept.toCoords}
          />
        );
      })()}

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

          // Skip trip_complete and render system messages inline
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed?.type === "trip_complete") return null;
            if (parsed?.type === "system") {
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center text-[11px] text-muted-foreground py-2">
                      {new Date(msg.created_at).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
                    </div>
                  )}
                  <div className="text-center text-[12px] text-muted-foreground py-1">{parsed.text}</div>
                </div>
              );
            }
            if (parsed?.type === "trip_accept_notify") {
              for (let j = i - 1; j >= 0; j--) {
                const ad = parseTripAcceptMessage(messages[j].content);
                if (ad) {
                  if (isCancelledForAccept(messages[j].content) || isCompletedForAccept(messages[j].content)) return null;
                  break;
                }
              }
            }
          } catch {}

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
                    {parseLiveLocationMessage(msg.content) ? (
                      <LiveLocationMessage content={msg.content} isMe={isMe} messageId={msg.id} onAccept={handleAcceptLiveShare} onOpen={() => {
                        const liveData = parseLiveLocationMessage(msg.content);
                        if (liveData && liveData.status === "accepted") {
                          const coords = { lat: liveData.lat, lng: liveData.lng };
                          const isMeSender = liveData.sharedBy === userId;
                          setSelectedLiveLocation({
                            myPos: isMeSender ? coords : cachedMyPos || undefined,
                            otherPos: isMeSender ? undefined : coords,
                          });
                          setShowLiveMap(true);
                        }
                      }} />
                    ) : parseLocationMessage(msg.content) ? (
                      <LocationMessage content={msg.content} isMe={isMe} senderName={isMe ? myName : otherUser?.name} senderAvatarUrl={isMe ? myAvatarUrl : otherUser?.avatar_url} />
                    ) : parseMediaMessage(msg.content) ? (
                      <MediaMessage content={msg.content} isMe={isMe} />
                    ) : parseVoiceMessage(msg.content) ? (
                      <VoiceMessage content={msg.content} isMe={isMe} />
                    ) : parseTripRatingMessage(msg.content) ? (
                      <TripRatingDisplay content={msg.content} isMe={isMe} currentUserId={userId || undefined} />
                    ) : parseTripAcceptNotify(msg.content) ? (
                        <TripMessage content={msg.content} isMe={isMe} isCancelled={false} isCompleted={false} />
                    ) : (parseTripMessage(msg.content) || parseTripAcceptMessage(msg.content) || parseTripCounterMessage(msg.content) || parseTripCancelMessage(msg.content)) ? (
                        <TripMessage content={msg.content} isMe={isMe} isActive={isActiveForTrip(msg.content)} onAccept={hasActiveTrip() || acceptingTrip ? undefined : handleAcceptTrip} onCounter={hasActiveTrip() ? undefined : handleCounterTrip} onCounterOpen={scrollToBottom} onRate={handleRateTrip} onCancel={handleCancelTrip} onComplete={handleCompleteTrip} hasRated={hasRatedForAccept(msg.content)} isCancelled={isCancelledForAccept(msg.content)} isCompleted={isCompletedForAccept(msg.content)} acceptingTrip={acceptingTrip} completingTrip={completingTrip} cancellingTrip={cancellingTrip} />
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
              <button onClick={() => { setShowLocationDialog(true); setShowContactMenu(false); }} disabled={sendingLocation} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                  {sendingLocation ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <MapPin className="h-6 w-6 text-muted-foreground" />}
                </div>
                <span className="text-[11px] text-muted-foreground">位置</span>
              </button>
              <button onClick={() => { handleStartCall(); setShowContactMenu(false); }} disabled={startingCall} className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                  {startingCall ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Phone className="h-6 w-6 text-muted-foreground" />}
                </div>
                <span className="text-[11px] text-muted-foreground">{startingCall ? "呼叫中..." : "语音通话"}</span>
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

    <LocationShareDialog
      open={showLocationDialog}
      onClose={() => setShowLocationDialog(false)}
      onSendLocation={handleSendLocation}
      onShareLive={handleStartLiveShare}
      sendingLocation={sendingLocation}
    />

    {showLiveMap && userId && otherUserId && conversationId && (
      <LiveLocationMap
        conversationId={conversationId}
        userId={userId}
        otherUserId={otherUserId}
        myName={myName || "我"}
        otherName={otherUser?.name || "对方"}
        myAvatarUrl={myAvatarUrl}
        otherAvatarUrl={otherUser?.avatar_url}
        initialMyPos={cachedMyPos || selectedLiveLocation?.myPos}
        initialOtherPos={otherCachedPos || selectedLiveLocation?.otherPos}
        onClose={() => { setShowLiveMap(false); setSelectedLiveLocation(null); }}
        onStopShare={() => handleStopLiveShare("manual")}
        isActive={!!liveShare}
        sharedChannelRef={liveChannelRef}
      />
    )}

    <AlertDialog open={!!pendingCancelTrip} onOpenChange={(open) => { if (!open) setPendingCancelTrip(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ 确认结束预约</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">如果结束预约，有可能对方给你差评，请谨慎。</span>
            <span className="block text-destructive font-medium">行程尚未完成就提前结束，将严重影响您的信用评分。</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>继续行程</AlertDialogCancel>
          <AlertDialogAction onClick={confirmCancelTrip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            确认结束
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!pendingCompleteTrip} onOpenChange={(open) => { if (!open) setPendingCompleteTrip(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>✅ 确认订单完成</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">确认订单已完成后，系统将解除行程锁定。</span>
            {pendingCompleteTrip?.price && (
              <span className="flex items-center gap-1.5 text-base font-semibold text-primary">
                <DollarSign className="h-4 w-4" />
                请确认已完成付款：${pendingCompleteTrip.price}
              </span>
            )}
            <span className="block text-muted-foreground text-xs">完成后您可以对对方进行评价。</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={confirmCompleteTrip}>
            确认完成
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

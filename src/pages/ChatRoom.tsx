import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Send, MapPin, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatMessageSchema } from "@/lib/validation";
import { sanitizeHtml } from "@/lib/validation";
import { filterMessage } from "@/lib/sensitiveWords";
import { toast } from "@/hooks/use-toast";
import LocationMessage, { parseLocationMessage } from "@/components/chat/LocationMessage";
import MediaMessage, { parseMediaMessage } from "@/components/chat/MediaMessage";
import VoiceMessage, { parseVoiceMessage } from "@/components/chat/VoiceMessage";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import VoiceCall from "@/components/chat/VoiceCall";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
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
  const [sending, setSending] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [myName, setMyName] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
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

      // Get own profile name for calls
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setMyName(myProfile?.name || user.email || user.id);

      // Get conversation
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (!conv) { navigate("/messages"); return; }

      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;

      // Get other user's profile (own profile for phone, public_profiles for others)
      const { data: profile } = await supabase
        .from("public_profiles")
        .select("name, avatar_url")
        .eq("id", otherId)
        .single();

      // We can't see other user's phone directly due to RLS, but we may have it from the conversation context
      setOtherUser({
        name: profile?.name || "用户",
        avatar_url: profile?.avatar_url || null,
        phone: null, // Can't access other user's phone due to RLS - this is correct
      });

      // Fetch messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setLoading(false);

      // Mark unread messages as read
      if (msgs && msgs.length > 0) {
        const unreadIds = msgs
          .filter((m) => m.sender_id !== user.id && !m.read_at)
          .map((m) => m.id);
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

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription
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
          // Auto-mark as read if it's from the other user
          if (newMsg.sender_id !== userId) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const handleSend = async () => {
    if (!input.trim() || !userId || !conversationId || sending) return;

    const trimmed = input.trim();

    // Validate
    const validation = chatMessageSchema.safeParse({ message: trimmed });
    if (!validation.success) {
      toast({ title: "发送失败", description: validation.error.issues[0].message, variant: "destructive" });
      return;
    }

    // Sensitive word filter
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
      // Update conversation last_message
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

      // Reverse geocode for address
      let address = "共享位置";
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (token) {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&language=zh`);
          const geo = await res.json();
          if (geo.features?.[0]?.place_name) {
            address = geo.features[0].place_name;
          }
        }
      } catch {}

      const locationContent = JSON.stringify({ type: "location", lat: latitude, lng: longitude, address });

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: locationContent,
      });

      if (error) {
        toast({ title: "发送失败", description: "请稍后重试", variant: "destructive" });
      } else {
        await supabase
          .from("conversations")
          .update({ last_message: "📍 位置信息", updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    } catch (err: any) {
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

        // Compress images
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
        if (!res.ok) {
          toast({ title: "上传失败", description: file.name, variant: "destructive" });
          continue;
        }
        const { url } = await res.json();
        urls.push(url);
      }

      if (urls.length > 0) {
        const mediaContent = JSON.stringify({ type: "media", urls });
        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: mediaContent,
        });
        if (error) {
          toast({ title: "发送失败", description: "请稍后重试", variant: "destructive" });
        } else {
          await supabase
            .from("conversations")
            .update({ last_message: "📷 图片/视频", updated_at: new Date().toISOString() })
            .eq("id", conversationId);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="flex flex-col h-screen bg-background">
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
          {otherUser?.phone && (
            <a href={`tel:${otherUser.phone}`} className="p-2 hover:bg-accent rounded-xl text-primary">
              <Phone className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-w-lg mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-8">
            开始聊天吧 👋
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === userId;
          const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-[11px] text-muted-foreground py-2">
                  {new Date(msg.created_at).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
                {!isMe && (
                  <Avatar className="h-7 w-7 shrink-0 mt-1">
                    {otherUser?.avatar_url ? (
                      <AvatarImage src={otherUser.avatar_url} alt={otherUser?.name || ""} />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {(otherUser?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-[75%]">
                  {parseLocationMessage(msg.content) ? (
                    <LocationMessage content={msg.content} isMe={isMe} />
                  ) : parseMediaMessage(msg.content) ? (
                    <MediaMessage content={msg.content} isMe={isMe} />
                  ) : parseVoiceMessage(msg.content) ? (
                    <VoiceMessage content={msg.content} isMe={isMe} />
                  ) : (
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? "text-right" : "text-left"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/50 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 px-4 py-2 max-w-lg mx-auto">
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={uploadingMedia}
            className="p-2.5 hover:bg-accent rounded-full text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="发送图片/视频"
          >
            {uploadingMedia ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleSendLocation}
            disabled={sendingLocation}
            className="p-2.5 hover:bg-accent rounded-full text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="发送位置"
          >
            {sendingLocation ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime"
            multiple
            onChange={handleMediaUpload}
            className="hidden"
          />
          <VoiceRecorder conversationId={conversationId!} userId={userId!} disabled={sending || uploadingMedia} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            maxLength={2000}
            className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 transition-all placeholder:text-muted-foreground"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="rounded-full h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

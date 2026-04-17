import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import IncomingCall from "@/components/chat/IncomingCall";
import { primeAudioNotifications, playMessageNotificationTone } from "@/lib/audioNotifications";
import { useAuth } from "@/hooks/useAuth";

interface IncomingCallState {
  callerName: string;
  callerId: string;
  sessionId: string;
  conversationId: string;
}

/** Show a browser Notification when the tab is hidden/backgrounded */
const showNativeNotification = (title: string, body: string, onClick?: () => void) => {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Only fire when page is not visible (background / minimised)
  if (document.visibilityState === "visible") return;

  try {
    const n = new Notification(title, {
      body,
      icon: "/placeholder.svg",
      tag: `notif-${Date.now()}`,
    });
    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
    // Auto-close after 5s
    setTimeout(() => n.close(), 5000);
  } catch {
    // Safari / iOS may throw
  }
};

export default function GlobalIncomingCallProvider() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);

  useEffect(() => {
    primeAudioNotifications();
  }, []);

  // Skip on chat pages (ChatRoom has its own listener) and Messages page (has its own too)
  const isChatPage = location.pathname.startsWith("/chat/");
  const isMessagesPage = location.pathname === "/messages";

  // Global message notification (sound + vibration + native notification)
  useEffect(() => {
    if (!userId || isChatPage || isMessagesPage) return;

    const msgCh = supabase.channel("global-msg-notify")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, async (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== userId) {
          void playMessageNotificationTone();
          if (navigator.vibrate) navigator.vibrate(200);

          // Native notification when backgrounded
          // Try to get sender name
          let senderName = "新消息";
          try {
            const { data: p } = await supabase
              .from("public_profiles")
              .select("name")
              .eq("id", msg.sender_id)
              .single();
            if (p?.name) senderName = p.name;
          } catch {}

          // Parse content for preview
          let preview = "发来一条消息";
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed.type === "text" && parsed.text) {
              preview = parsed.text.length > 50 ? parsed.text.slice(0, 50) + "…" : parsed.text;
            } else if (parsed.type === "image") {
              preview = "[图片]";
            } else if (parsed.type === "voice") {
              preview = "[语音消息]";
            } else if (parsed.type === "location") {
              preview = "[位置]";
            }
          } catch {}

          showNativeNotification(senderName, preview, () => {
            navigate(`/chat/${msg.conversation_id}`);
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(msgCh); };
  }, [userId, isChatPage, isMessagesPage, navigate]);

  // Listen for incoming calls globally
  useEffect(() => {
    if (!userId || isChatPage || isMessagesPage) return;

    const ch = supabase.channel("global-incoming-calls-provider")
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
          const name = callerProfile?.name || "用户";
          setIncomingCall({
            callerName: name,
            callerId: session.caller_id,
            sessionId: session.id,
            conversationId: session.conversation_id,
          });

          // Native notification for incoming call when backgrounded
          showNativeNotification("来电", `${name} 正在呼叫你`, () => {
            navigate(`/chat/${session.conversation_id}?callSession=${session.id}`);
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
        setIncomingCall((current) => current?.sessionId === session.id && session.status !== "ringing" ? null : current);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId, isChatPage, isMessagesPage, navigate]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    await supabase.from("call_sessions").update({ status: "answered" } as any).eq("id", incomingCall.sessionId);
    const convId = incomingCall.conversationId;
    const sessId = incomingCall.sessionId;
    setIncomingCall(null);
    navigate(`/chat/${convId}?callSession=${sessId}`);
  }, [incomingCall, navigate]);

  const handleDecline = useCallback(async () => {
    if (!incomingCall) return;
    await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", incomingCall.sessionId);
    setIncomingCall(null);
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <IncomingCall
      callerName={incomingCall.callerName}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
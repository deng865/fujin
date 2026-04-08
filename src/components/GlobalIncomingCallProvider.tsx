import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import IncomingCall from "@/components/chat/IncomingCall";
import { primeAudioNotifications } from "@/lib/audioNotifications";

interface IncomingCallState {
  callerName: string;
  callerId: string;
  sessionId: string;
  conversationId: string;
}

export default function GlobalIncomingCallProvider() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    primeAudioNotifications();
  }, []);

  // Skip on chat pages (ChatRoom has its own listener) and Messages page (has its own too)
  const isChatPage = location.pathname.startsWith("/chat/");
  const isMessagesPage = location.pathname === "/messages";

  // Global message notification (sound + vibration) on pages that don't have their own listener
  useEffect(() => {
    if (!userId || isChatPage || isMessagesPage) return;

    const msgCh = supabase.channel("global-msg-notify")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== userId) {
          void playMessageNotificationTone();
          // Vibrate if supported (200ms pulse)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(msgCh); };
  }, [userId, isChatPage, isMessagesPage]);

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
  }, [userId, isChatPage, isMessagesPage, incomingCall?.sessionId]);

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
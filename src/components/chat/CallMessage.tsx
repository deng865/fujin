import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing } from "lucide-react";

export interface CallData {
  type: "call";
  status: "missed" | "declined" | "completed" | "cancelled";
  duration?: number; // seconds, for completed calls
  callerId: string;
}

export function parseCallMessage(content: string): CallData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "call") return parsed as CallData;
  } catch {}
  return null;
}

interface CallMessageProps {
  content: string;
  isMe: boolean;
  isCaller: boolean;
}

export default function CallMessage({ content, isMe, isCaller }: CallMessageProps) {
  const call = parseCallMessage(content);
  if (!call) return null;

  const isMissed = call.status === "missed" || call.status === "declined";
  const isCancelled = call.status === "cancelled";
  const isCompleted = call.status === "completed";

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}分${sec}秒`;
  };

  let icon = <Phone className="h-4 w-4" />;
  let label = "语音通话";
  let textColor = "text-muted-foreground";

  if (isMissed) {
    icon = <PhoneMissed className="h-4 w-4 text-destructive" />;
    label = isCaller ? "对方未接听" : "未接来电";
    textColor = "text-destructive";
  } else if (isCancelled) {
    icon = <PhoneMissed className="h-4 w-4 text-muted-foreground" />;
    label = isCaller ? "已取消" : "对方已取消";
  } else if (isCompleted) {
    icon = isCaller
      ? <PhoneOutgoing className="h-4 w-4 text-primary" />
      : <PhoneIncoming className="h-4 w-4 text-primary" />;
    label = `通话时长 ${formatDuration(call.duration || 0)}`;
  }

  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 text-xs">
        {icon}
        <span className={textColor}>{label}</span>
      </div>
    </div>
  );
}

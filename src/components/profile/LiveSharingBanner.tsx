import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";

export default function LiveSharingBanner() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("live_sharing_conversation");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.conversationId && data.expiresAt > Date.now()) {
          setVisible(true);
          setChatId(data.conversationId);
        } else {
          localStorage.removeItem("live_sharing_conversation");
        }
      } catch { /* ignore */ }
    }
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => chatId && navigate(`/chat/${chatId}`)}
      className="w-full flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-left transition-colors hover:bg-emerald-500/20"
    >
      <div className="relative">
        <Radio className="h-5 w-5 text-emerald-500" />
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">实时位置共享中</p>
        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">点击返回实时地图</p>
      </div>
      <span className="text-emerald-500 text-lg">›</span>
    </button>
  );
}

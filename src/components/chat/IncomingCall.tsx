import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { startIncomingRingtone } from "@/lib/audioNotifications";

interface IncomingCallProps {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCall({ callerName, onAccept, onDecline }: IncomingCallProps) {
  useEffect(() => {
    const stopRingtone = startIncomingRingtone();
    return () => stopRingtone();
  }, []);

  // Auto-decline after 30s
  useEffect(() => {
    const timer = setTimeout(onDecline, 30000);
    return () => clearTimeout(timer);
  }, [onDecline]);

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="text-center mb-16">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Phone className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">{callerName}</h2>
        <p className="text-muted-foreground mt-2">邀请你进行语音通话...</p>
      </div>

      <div className="flex items-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={onDecline}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
          <span className="text-xs text-muted-foreground">拒绝</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
            onClick={onAccept}
          >
            <Phone className="h-7 w-7" />
          </Button>
          <span className="text-xs text-muted-foreground">接听</span>
        </div>
      </div>
    </div>
  );
}

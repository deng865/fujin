import { useState } from "react";
import { MapPin, Radio, X, Clock } from "lucide-react";

interface LocationShareDialogProps {
  open: boolean;
  onClose: () => void;
  onSendLocation: () => void;
  onShareLive: (durationMinutes: number) => void;
  sendingLocation: boolean;
}

const DURATION_OPTIONS = [
  { label: "15分钟", value: 15 },
  { label: "1小时", value: 60 },
  { label: "8小时", value: 480 },
];

export default function LocationShareDialog({
  open,
  onClose,
  onSendLocation,
  onShareLive,
  sendingLocation,
}: LocationShareDialogProps) {
  const [showDuration, setShowDuration] = useState(false);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-w-lg mx-auto">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-base font-semibold">位置</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-full">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {!showDuration ? (
          <div className="px-4 pb-6 space-y-2">
            <button
              onClick={() => {
                onSendLocation();
                onClose();
              }}
              disabled={sendingLocation}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">发送我的位置</p>
                <p className="text-xs text-muted-foreground">分享你当前的位置给对方</p>
              </div>
            </button>

            <button
              onClick={() => setShowDuration(true)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <div className="h-11 w-11 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Radio className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">实时位置共享</p>
                <p className="text-xs text-muted-foreground">对方可以实时查看你的位置</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="px-4 pb-6">
            <p className="text-sm text-muted-foreground mb-3 px-1">选择共享时长</p>
            <div className="space-y-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onShareLive(opt.value);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-accent transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDuration(false)}
              className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              返回
            </button>
          </div>
        )}
      </div>
    </>
  );
}

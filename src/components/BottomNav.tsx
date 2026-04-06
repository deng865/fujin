import { Compass, MessageCircle, Plus, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPostClick: () => void;
}

const tabs = [
  { id: "discover", label: "发现", icon: Compass },
  { id: "messages", label: "消息", icon: MessageCircle },
  { id: "post", label: "", icon: Plus },
  { id: "favorites", label: "收藏", icon: Heart },
  { id: "profile", label: "我的", icon: User },
];

export default function BottomNav({ activeTab, onTabChange, onPostClick }: BottomNavProps) {
  const unreadCount = useUnreadCount();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999]">
      <div className="bg-background/80 backdrop-blur-2xl border-t border-border/30 px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        <div className="flex items-center justify-around max-w-lg mx-auto relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.id === "post") {
              return (
                <button
                  key={tab.id}
                  onClick={onPostClick}
                  className="relative -mt-5 bg-primary text-primary-foreground rounded-full p-4 shadow-xl hover:opacity-90 transition-all active:scale-90 ring-4 ring-background/80"
                >
                  <Plus className="h-6 w-6" />
                </button>
              );
            }

            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all active:scale-95 min-w-[52px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                  {tab.id === "messages" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

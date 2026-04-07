import { Home, MessageCircle, Plus, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { id: "home", label: "首页", icon: Home, path: "/" },
  { id: "messages", label: "消息", icon: MessageCircle, path: "/messages", auth: true },
  { id: "post", label: "", icon: Plus, path: "/create-post", auth: true },
  { id: "favorites", label: "收藏", icon: Heart, path: "/favorites", auth: true },
  { id: "profile", label: "我的", icon: User, path: "/profile", auth: true },
];

export default function BottomNav() {
  const unreadCount = useUnreadCount();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const activeTab = (() => {
    const path = location.pathname;
    if (path === "/" || path === "/discovery") return "home";
    if (path.startsWith("/messages") || path.startsWith("/chat")) return "messages";
    if (path.startsWith("/favorites")) return "favorites";
    if (path.startsWith("/profile")) return "profile";
    return "home";
  })();

  const handleTabChange = (tab: typeof tabs[number]) => {
    if (tab.auth && !user) {
      navigate("/auth");
      return;
    }
    navigate(tab.path);
  };

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
                  onClick={() => handleTabChange(tab)}
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
                onClick={() => handleTabChange(tab)}
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

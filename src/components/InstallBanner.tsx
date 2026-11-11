import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissInstallBanner, promptInstallation, useInstallPrompt } from "@/hooks/useInstallPrompt";
import { openInstallGuide } from "@/components/InstallGuide";

export default function InstallBanner() {
  const { visible, canPrompt } = useInstallPrompt();
  if (!visible) return null;

  const install = async () => {
    if (!canPrompt || !(await promptInstallation())) openInstallGuide();
  };

  return (
    <aside aria-label="安装到主屏幕" className="flex items-center gap-2 border-b border-border/40 bg-accent/50 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
      <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">华人街坊</p>
        <p className="text-xs leading-5 text-muted-foreground">添加到主屏幕</p>
      </div>
      <Button size="sm" onClick={install} className="shrink-0 gap-1.5 rounded-lg px-3">
        <Download className="h-4 w-4" />{canPrompt ? "一键安装" : "立即添加"}
      </Button>
      <Button variant="ghost" size="icon" aria-label="关闭安装提示" title="今天不再提示" onClick={dismissInstallBanner} className="h-8 w-8 shrink-0 text-muted-foreground">
        <X className="h-4 w-4" />
      </Button>
    </aside>
  );
}
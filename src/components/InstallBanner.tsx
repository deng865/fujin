import { ArrowDown, Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissInstallBanner, promptInstallation, useInstallPrompt } from "@/hooks/useInstallPrompt";
import { openInstallGuide } from "@/components/InstallGuide";
import { getIOSInstallBrowser } from "@/lib/iosInstallBrowser";

export default function InstallBanner() {
  const { visible, canPrompt } = useInstallPrompt();
  if (!visible) return null;

  const install = async () => {
    if (!canPrompt || !(await promptInstallation())) openInstallGuide();
  };

  const iosBrowser = getIOSInstallBrowser(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  if (iosBrowser) return (
    <aside aria-label="苹果手机添加到主屏幕" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[1000] mx-auto w-full max-w-md px-3">
      <div className="pointer-events-auto relative rounded-lg border border-border bg-background p-3 shadow-lg">
        <div className="flex items-start gap-2.5">
          <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">把华人街坊添加到主屏幕</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {iosBrowser === "other" ? "用 Safari 打开 fujin.life，再点分享。" : <>点浏览器的「分享」<Share aria-hidden="true" className="mx-1 inline h-4 w-4 text-primary" />，选择「添加到主屏幕」，再点「添加」。</>}
            </p>
            <Button variant="link" size="sm" onClick={openInstallGuide} className="h-8 px-0 text-sm">查看添加步骤</Button>
          </div>
          <Button variant="ghost" size="icon" aria-label="关闭安装提示" title="今天不再提示" onClick={dismissInstallBanner} className="h-8 w-8 shrink-0 text-muted-foreground"><X className="h-4 w-4" /></Button>
        </div>
        <ArrowDown aria-hidden="true" className="mx-auto h-5 w-5 text-primary" />
      </div>
    </aside>
  );

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
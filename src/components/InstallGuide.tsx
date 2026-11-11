import { useEffect, useState } from "react";
import { Share, PlusSquare, MoreVertical, X, Download, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { promptInstallation, useInstallPrompt } from "@/hooks/useInstallPrompt";
import { getIOSInstallBrowser } from "@/lib/iosInstallBrowser";

const OPEN_EVENT = "open-install-guide";

type Platform = "wechat" | "ios" | "android" | "desktop";

export function openInstallGuide() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/MicroMessenger/i.test(ua)) return "wechat";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      <span className="pt-0.5 text-[15px] leading-relaxed text-foreground">{children}</span>
    </li>
  );
}

export default function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const { canPrompt, installed } = useInstallPrompt();
  const iosBrowser = getIOSInstallBrowser(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

  useEffect(() => {
    setPlatform(detectPlatform());
    const manual = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, manual);
    return () => {
      window.removeEventListener(OPEN_EVENT, manual);
    };
  }, []);

  const close = () => {
    setOpen(false);
  };

  const install = async () => {
    if (await promptInstallation()) close();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-foreground/40" onClick={close}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="添加到主屏幕步骤"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <img src="/icon-192.png" alt="华人街坊" className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">把「华人街坊」装到手机桌面</h2>
            <p className="text-sm text-muted-foreground">不用去应用商店，点桌面图标即可打开</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="关闭" onClick={close} className="shrink-0 text-muted-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {installed ? (
          <p className="rounded-xl bg-muted p-4 text-[15px] text-foreground">✅ 你已经安装好了，以后从手机桌面的「华人街坊」图标打开即可。</p>
        ) : platform === "wechat" ? (
          <ol className="space-y-3 rounded-xl bg-muted p-4">
            <Step n={1}>点右上角 <b>「···」</b></Step>
            <Step n={2}>
              选择 <b>「在浏览器中打开」</b>（iPhone 选 Safari）<Compass className="ml-1 inline h-4 w-4" />
            </Step>
            <Step n={3}>在浏览器里再点「我的 → 安装到手机桌面」，按提示添加</Step>
          </ol>
        ) : platform === "ios" ? (
          <ol className="space-y-3 rounded-xl bg-muted p-4">
            <Step n={1}>{iosBrowser === "chrome" ? <>在 iPhone 的 <b>Chrome 浏览器</b> 打开 fujin.life</> : <>请用 <b>Safari 浏览器</b> 打开 fujin.life</>}</Step>
            <Step n={2}>
              点浏览器的 <b>分享按钮</b> <Share className="mx-0.5 inline h-4 w-4 text-primary" />（方框带向上箭头，位置随浏览器版本不同）
            </Step>
            <Step n={3}>
              往下滑，点 <b>「添加到主屏幕」</b> <PlusSquare className="mx-0.5 inline h-4 w-4 text-primary" />
            </Step>
            <Step n={4}>点右上角 <b>「添加」</b>，桌面就出现「华人街坊」图标了</Step>
            {iosBrowser === "chrome" && <li className="text-sm leading-6 text-muted-foreground">如果没有「添加到主屏幕」，请用 Safari 打开 fujin.life，再按上面的分享步骤添加。</li>}
          </ol>
        ) : platform === "android" ? (
          canPrompt ? (
            <Button className="h-12 w-full text-base" onClick={install}>
              <Download className="mr-2 h-5 w-5" /> 一键安装到桌面
            </Button>
          ) : (
            <ol className="space-y-3 rounded-xl bg-muted p-4">
              <Step n={1}>建议用 <b>Chrome 浏览器</b> 打开 fujin.life</Step>
              <Step n={2}>
                点右上角 <b>菜单</b> <MoreVertical className="mx-0.5 inline h-4 w-4 text-primary" />
              </Step>
              <Step n={3}>选择 <b>「安装应用」</b> 或 <b>「添加到主屏幕」</b></Step>
              <Step n={4}>点「安装」，桌面就出现「华人街坊」图标了</Step>
            </ol>
          )
        ) : (
          <p className="rounded-xl bg-muted p-4 text-[15px] text-foreground">
            请用手机打开 <b>fujin.life</b>，然后进入「我的 → 安装到手机桌面」查看步骤。
          </p>
        )}

        <Button variant="ghost" onClick={close} className="mt-4 w-full text-sm text-muted-foreground">
          以后再说
        </Button>
      </div>
    </div>
  );
}

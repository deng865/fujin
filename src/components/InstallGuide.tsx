import { useEffect, useState } from "react";
import { Share, PlusSquare, MoreVertical, X, Download, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "install_guide_dismissed_at";
const DISMISS_DAYS = 14;
const OPEN_EVENT = "open-install-guide";

type Platform = "wechat" | "ios" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

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

function isInstalled() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed() {
  const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() - t < DISMISS_DAYS * 864e5;
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
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    const manual = () => {
      setCanPrompt(!!deferredPrompt);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, manual);
    const onPrompt = () => setCanPrompt(true);
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Auto-show once on phones, after the user has looked around a bit.
    const p = detectPlatform();
    let timer: number | undefined;
    if (p !== "desktop" && !isInstalled() && !recentlyDismissed() && window.self === window.top) {
      timer = window.setTimeout(() => {
        if (!/^\/(chat|admin|checkout|auth)/.test(location.pathname)) {
          setCanPrompt(!!deferredPrompt);
          setOpen(true);
        }
      }, 10000);
    }
    return () => {
      window.removeEventListener(OPEN_EVENT, manual);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const close = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanPrompt(false);
    close();
  };

  if (!open) return null;
  const installed = isInstalled();

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-foreground/40" onClick={close}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-5 shadow-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <img src="/icon-192.png" alt="华人街坊" className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">把「华人街坊」装到手机桌面</h2>
            <p className="text-sm text-muted-foreground">免下载、不占空间，点图标就像 App 一样打开</p>
          </div>
          <button aria-label="关闭" onClick={close} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
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
            <Step n={1}>请用 <b>Safari 浏览器</b> 打开 fujin.life</Step>
            <Step n={2}>
              点底部的 <b>分享按钮</b> <Share className="mx-0.5 inline h-4 w-4 text-primary" />（方框带向上箭头）
            </Step>
            <Step n={3}>
              往下滑，点 <b>「添加到主屏幕」</b> <PlusSquare className="mx-0.5 inline h-4 w-4 text-primary" />
            </Step>
            <Step n={4}>点右上角 <b>「添加」</b>，桌面就出现「华人街坊」图标了</Step>
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

        <button onClick={close} className="mt-4 w-full py-2 text-sm text-muted-foreground">
          以后再说
        </button>
      </div>
    </div>
  );
}

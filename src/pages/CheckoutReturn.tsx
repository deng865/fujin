import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const { postCredits, hasUnlimited, unlimitedUntil, refresh } = useCredits();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // The webhook grants the credit moments after payment; poll briefly.
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      await refresh();
      if (tries >= 5) {
        clearInterval(timer);
        setChecking(false);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (hasUnlimited || postCredits > 0) setChecking(false);
  }, [hasUnlimited, postCredits]);

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {checking ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在确认支付结果...</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h1 className="text-lg font-semibold">支付完成</h1>
          <p className="text-sm text-muted-foreground">
            {hasUnlimited
              ? `商家会员有效期至 ${new Date(unlimitedUntil!).toLocaleDateString("zh-CN")}`
              : `当前剩余发帖次数：${postCredits} 次`}
          </p>
          {!sessionId && (
            <p className="text-xs text-muted-foreground">未找到订单信息</p>
          )}
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => navigate("/create-post")}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              去发布信息
            </button>
            <button
              onClick={() => navigate("/orders")}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium"
            >
              我的订单
            </button>
          </div>
        </>
      )}
    </div>
  );
}

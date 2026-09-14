import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Order {
  id: string;
  plan_name: string | null;
  plan_key: string | null;
  amount: number;
  currency: string | null;
  payment_status: string | null;
  duration_days: number | null;
  created_at: string | null;
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  completed: { text: "已支付", cls: "text-emerald-600 bg-emerald-500/10" },
  pending: { text: "待支付", cls: "text-amber-600 bg-amber-500/10" },
  failed: { text: "支付失败", cls: "text-destructive bg-destructive/10" },
};

export default function MyOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/orders", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, plan_name, plan_key, amount, currency, payment_status, duration_days, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">我的订单</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">还没有订单记录</p>
            <button
              onClick={() => navigate("/pricing")}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              去购买额度
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => {
              const badge = statusLabel[o.payment_status ?? "pending"] ?? statusLabel.pending;
              return (
                <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {o.plan_name || o.plan_key || "发布服务"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleString("zh-CN")
                          : ""}
                        {o.duration_days ? ` · ${o.duration_days} 天` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">
                        ${Number(o.amount).toFixed(2)}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

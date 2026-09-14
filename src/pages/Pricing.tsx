import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import PaymentTestModeBanner from "@/components/PaymentTestModeBanner";
import StripeEmbeddedCheckoutForm from "@/components/payments/StripeEmbeddedCheckout";

interface Plan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  plan_type: string;
  category: string | null;
  duration_days: number;
  amount_cents: number;
  currency: string;
  post_credits: number;
  unlimited_posts: boolean;
  is_boost: boolean;
  sort_order: number;
}

const typeLabel: Record<string, string> = {
  post: "发帖套餐",
  membership: "商家会员",
  boost: "推广服务",
};

export default function Pricing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { postCredits, hasUnlimited, unlimitedUntil } = useCredits();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("postId");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/pricing", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pricing_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setPlans((data as Plan[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const groups = ["post", "membership", "boost"].filter((t) =>
    plans.some((p) => p.plan_type === t),
  );

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background pb-24">
      <PaymentTestModeBanner />

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">购买发布额度</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">我的额度</p>
          {hasUnlimited ? (
            <p className="mt-1 text-sm font-semibold text-emerald-600">
              商家会员有效期至 {new Date(unlimitedUntil!).toLocaleDateString("zh-CN")}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold">
              剩余发帖次数：{postCredits} 次
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            暂无可购买的套餐
          </p>
        ) : (
          groups.map((type) => (
            <section key={type} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {typeLabel[type] ?? type}
              </h2>
              {plans
                .filter((p) => p.plan_type === type)
                .map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-semibold">{plan.name}</h3>
                          {plan.unlimited_posts && (
                            <Sparkles className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        {plan.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {plan.description}
                          </p>
                        )}
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <li className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-emerald-500" />
                            有效期 {plan.duration_days} 天
                          </li>
                          {plan.unlimited_posts ? (
                            <li className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-500" />
                              期间内无限发布
                            </li>
                          ) : plan.post_credits > 0 ? (
                            <li className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-500" />
                              可发布 {plan.post_credits} 条信息
                            </li>
                          ) : null}
                          {plan.category && (
                            <li className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-500" />
                              适用分类：{plan.category}
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xl font-bold">
                          ${(plan.amount_cents / 100).toFixed(2)}
                        </p>
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {plan.currency}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCheckoutPlan(plan)}
                      className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      立即购买
                    </button>
                  </div>
                ))}
            </section>
          ))
        )}

        <p className="pb-4 text-[11px] leading-relaxed text-muted-foreground">
          费用仅用于在本平台发布与推广信息，不代表平台参与你与其他用户之间的任何交易。
          购买后额度立即到账，具体退款规则见服务条款。
        </p>
      </div>

      {checkoutPlan && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">
              支付 {checkoutPlan.name} · ${(checkoutPlan.amount_cents / 100).toFixed(2)}
            </span>
            <button
              onClick={() => setCheckoutPlan(null)}
              className="rounded-lg p-1.5 hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <StripeEmbeddedCheckoutForm
              planKey={checkoutPlan.plan_key}
              postId={postId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

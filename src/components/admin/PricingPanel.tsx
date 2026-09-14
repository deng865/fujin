import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Loader2, DollarSign } from "lucide-react";

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
  is_active: boolean;
  sort_order: number;
}

interface Category {
  name: string;
  label: string;
}

const PLAN_TYPES = [
  { value: "post", label: "发帖套餐" },
  { value: "membership", label: "商家会员" },
  { value: "boost", label: "推广/置顶" },
];

const emptyPlan = (): Omit<Plan, "id"> => ({
  plan_key: "",
  name: "",
  description: "",
  plan_type: "post",
  category: null,
  duration_days: 30,
  amount_cents: 199,
  currency: "usd",
  post_credits: 1,
  unlimited_posts: false,
  is_boost: false,
  is_active: true,
  sort_order: 99,
});

export default function PricingPanel() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState<Omit<Plan, "id"> | null>(null);

  const load = async () => {
    const [{ data: planData }, { data: catData }] = await Promise.all([
      supabase.from("pricing_plans").select("*").order("sort_order", { ascending: true }),
      supabase.from("categories").select("name, label").order("sort_order", { ascending: true }),
    ]);
    setPlans((planData as Plan[]) ?? []);
    setCategories((catData as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const patch = (id: string, changes: Partial<Plan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  };

  const save = async (plan: Plan) => {
    if (!plan.name.trim()) {
      toast({ title: "请填写套餐名称", variant: "destructive" });
      return;
    }
    if (plan.amount_cents < 50) {
      toast({ title: "金额不能低于 $0.50", variant: "destructive" });
      return;
    }
    setSavingId(plan.id);
    const { error } = await supabase
      .from("pricing_plans")
      .update({
        name: plan.name.trim(),
        description: plan.description?.trim() || null,
        plan_type: plan.plan_type,
        category: plan.category || null,
        duration_days: plan.duration_days,
        amount_cents: plan.amount_cents,
        post_credits: plan.post_credits,
        unlimited_posts: plan.unlimited_posts,
        is_boost: plan.is_boost,
        is_active: plan.is_active,
        sort_order: plan.sort_order,
      })
      .eq("id", plan.id);
    setSavingId(null);
    if (error) toast({ title: "保存失败", description: error.message, variant: "destructive" });
    else toast({ title: "已保存，新价格立即生效" });
  };

  const create = async () => {
    if (!creating) return;
    const key = creating.plan_key.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(key)) {
      toast({ title: "套餐编号只能使用小写字母、数字和下划线", variant: "destructive" });
      return;
    }
    if (!creating.name.trim()) {
      toast({ title: "请填写套餐名称", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("pricing_plans").insert({
      ...creating,
      plan_key: key,
      name: creating.name.trim(),
      description: creating.description?.trim() || null,
      category: creating.category || null,
    });
    if (error) {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
      return;
    }
    setCreating(null);
    toast({ title: "套餐已创建" });
    load();
  };

  const remove = async (plan: Plan) => {
    if (!confirm(`确定删除套餐「${plan.name}」？`)) return;
    const { error } = await supabase.from("pricing_plans").delete().eq("id", plan.id);
    if (error) toast({ title: "删除失败", description: error.message, variant: "destructive" });
    else {
      toast({ title: "已删除" });
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderFields = (
    plan: Omit<Plan, "id">,
    onChange: (changes: Partial<Plan>) => void,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">套餐名称</span>
        <Input value={plan.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>

      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">类型</span>
        <select
          value={plan.plan_type}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              plan_type: v,
              is_boost: v === "boost",
              unlimited_posts: v === "membership",
            });
          }}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-[16px] sm:text-sm"
        >
          {PLAN_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">适用分类</span>
        <select
          value={plan.category ?? ""}
          onChange={(e) => onChange({ category: e.target.value || null })}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-[16px] sm:text-sm"
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>{c.label}</option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">有效天数</span>
        <Input
          type="number"
          min={1}
          value={plan.duration_days}
          onChange={(e) => onChange({ duration_days: Math.max(1, parseInt(e.target.value) || 1) })}
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">价格（美元）</span>
        <Input
          type="number"
          min={0.5}
          step="0.01"
          value={(plan.amount_cents / 100).toFixed(2)}
          onChange={(e) =>
            onChange({ amount_cents: Math.round((parseFloat(e.target.value) || 0) * 100) })
          }
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">赠送发帖条数</span>
        <Input
          type="number"
          min={0}
          value={plan.post_credits}
          disabled={plan.unlimited_posts}
          onChange={(e) => onChange({ post_credits: Math.max(0, parseInt(e.target.value) || 0) })}
        />
      </label>

      <label className="space-y-1 sm:col-span-2">
        <span className="text-xs text-muted-foreground">说明</span>
        <Input
          value={plan.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">排序</span>
        <Input
          type="number"
          value={plan.sort_order}
          onChange={(e) => onChange({ sort_order: parseInt(e.target.value) || 0 })}
        />
      </label>

      <label className="flex items-center gap-2 pt-5 text-sm">
        <input
          type="checkbox"
          checked={plan.unlimited_posts}
          onChange={(e) => onChange({ unlimited_posts: e.target.checked })}
          className="h-4 w-4"
        />
        期间内无限发帖
      </label>

      <label className="flex items-center gap-2 pt-5 text-sm">
        <input
          type="checkbox"
          checked={plan.is_active}
          onChange={(e) => onChange({ is_active: e.target.checked })}
          className="h-4 w-4"
        />
        上架销售
      </label>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          在这里设置每个套餐的分类、有效天数和价格，保存后前台购买页与结账金额立即按新参数生效，无需改动代码。
        </p>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(emptyPlan())} className="shrink-0 gap-1">
            <Plus className="h-4 w-4" /> 新增套餐
          </Button>
        )}
      </div>

      {creating && (
        <div className="space-y-3 rounded-xl border border-primary/40 bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <DollarSign className="h-4 w-4 text-primary" /> 新增套餐
          </div>
          <label className="block max-w-xs space-y-1">
            <span className="text-xs text-muted-foreground">套餐编号（英文，唯一）</span>
            <Input
              value={creating.plan_key}
              placeholder="例如 driver_monthly"
              onChange={(e) => setCreating({ ...creating, plan_key: e.target.value })}
            />
          </label>
          {renderFields(creating, (changes) => setCreating({ ...creating, ...changes }))}
          <div className="flex gap-2">
            <Button size="sm" onClick={create} className="gap-1">
              <Save className="h-4 w-4" /> 创建
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreating(null)}>
              取消
            </Button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">还没有任何套餐</p>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{plan.name || plan.plan_key}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {plan.plan_key}
                  </span>
                  {!plan.is_active && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                      已下架
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => save(plan)}
                    disabled={savingId === plan.id}
                    className="gap-1"
                  >
                    {savingId === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    保存
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(plan)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {renderFields(plan, (changes) => patch(plan.id, changes))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

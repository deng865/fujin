import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Gift, Loader2, Save } from "lucide-react";

export default function WelcomeBonusSettings() {
  const [enabled, setEnabled] = useState(true);
  const [credits, setCredits] = useState(2);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("welcome_bonus_enabled, welcome_bonus_credits, welcome_bonus_days")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEnabled(data.welcome_bonus_enabled);
          setCredits(data.welcome_bonus_credits);
          setDays(data.welcome_bonus_days);
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        welcome_bonus_enabled: enabled,
        welcome_bonus_credits: credits,
        welcome_bonus_days: days,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSaving(false);
    if (error) toast({ title: "保存失败", description: error.message, variant: "destructive" });
    else toast({ title: "新手礼包设置已保存，立即生效" });
  };

  if (loading) return null;

  return (
    <div className="space-y-3 rounded-xl border border-primary/40 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Gift className="h-4 w-4 text-primary" /> 新用户注册赠送
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {enabled ? "进行中" : "已关闭"}
          </span>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <p className="text-xs text-muted-foreground">
        从用户注册当天开始计算有效期，期内可免费发帖，用完或过期后需购买套餐。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">赠送发帖条数</span>
          <Input type="number" min={0} value={credits}
            onChange={(e) => setCredits(Math.max(0, parseInt(e.target.value) || 0))} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">有效天数（自注册日起）</span>
          <Input type="number" min={1} value={days}
            onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))} />
        </label>
      </div>
      <Button size="sm" onClick={save} disabled={saving} className="gap-1">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存设置
      </Button>
    </div>
  );
}

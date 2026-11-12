import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, RefreshCw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cityBounds, cityCategoryPath, isCityCategoryIndexable, type SeoCategoryRow, type SeoCityRow } from "@/lib/citySeo";

export default function SeoPanel() {
  const [cities, setCities] = useState<SeoCityRow[]>([]);
  const [categories, setCategories] = useState<SeoCategoryRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [counting, setCounting] = useState(false);
  const [newCity, setNewCity] = useState({ slug: "", name_en: "", name_zh: "", state: "", latitude: "", longitude: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [c, k] = await Promise.all([
      supabase.from("seo_cities").select("*").order("sort_order"),
      supabase.from("seo_categories").select("*").order("sort_order"),
    ]);
    setCities((c.data as SeoCityRow[]) || []);
    setCategories((k.data as SeoCategoryRow[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const countAll = async () => {
    setCounting(true);
    const next: Record<string, number> = {};
    await Promise.all(cities.flatMap(city => categories.map(async cat => {
      const b = cityBounds(city);
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true })
        .eq("is_visible", true).in("category", cat.post_categories)
        .gte("latitude", b.minLat).lte("latitude", b.maxLat).gte("longitude", b.minLng).lte("longitude", b.maxLng);
      next[`${city.slug}/${cat.slug}`] = count || 0;
    })));
    setCounts(next);
    setCounting(false);
  };

  const saveCity = async (city: SeoCityRow) => {
    const { error } = await supabase.from("seo_cities").update({ ...city, updated_at: new Date().toISOString() }).eq("slug", city.slug);
    toast({ title: error ? "保存失败" : `已保存 ${city.name_zh}`, variant: error ? "destructive" : undefined });
  };
  const saveCategory = async (cat: SeoCategoryRow) => {
    const { error } = await supabase.from("seo_categories").update({ ...cat, updated_at: new Date().toISOString() }).eq("slug", cat.slug);
    toast({ title: error ? "保存失败" : `已保存 ${cat.name_zh}`, variant: error ? "destructive" : undefined });
  };
  const addCity = async () => {
    const lat = Number(newCity.latitude), lng = Number(newCity.longitude);
    if (!/^[a-z0-9-]+$/.test(newCity.slug) || !newCity.name_en || !newCity.name_zh || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast({ title: "请填写英文网址名（小写和-）、中英文名称和坐标", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("seo_cities").insert({ ...newCity, latitude: lat, longitude: lng, sort_order: cities.length + 1 });
    if (error) { toast({ title: "添加失败", description: error.message, variant: "destructive" }); return; }
    setNewCity({ slug: "", name_en: "", name_zh: "", state: "", latitude: "", longitude: "" });
    load();
  };

  const patchCity = (slug: string, patch: Partial<SeoCityRow>) => setCities(list => list.map(c => c.slug === slug ? { ...c, ...patch } : c));
  const patchCat = (slug: string, patch: Partial<SeoCategoryRow>) => setCategories(list => list.map(c => c.slug === slug ? { ...c, ...patch } : c));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const hasCounts = Object.keys(counts).length > 0;

  return <div className="space-y-8 pb-16">
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">收录状态</h2>
          <p className="text-sm text-muted-foreground">城市与分类都开启、且真实公开信息达到门槛的页面才允许搜索引擎收录；网站地图在每次发布时自动更新。</p>
        </div>
        <Button onClick={countAll} disabled={counting} variant="outline" size="sm">{counting ? <Loader2 className="animate-spin" /> : <RefreshCw />}统计信息数量</Button>
      </div>
      {hasCounts && <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted"><th className="p-2 text-left">城市</th>{categories.map(c => <th key={c.slug} className="whitespace-nowrap p-2">{c.name_zh}</th>)}</tr></thead>
          <tbody>{cities.map(city => <tr key={city.slug} className="border-t border-border">
            <td className="whitespace-nowrap p-2 font-medium">{city.name_zh}</td>
            {categories.map(cat => {
              const n = counts[`${city.slug}/${cat.slug}`] ?? 0;
              const ok = isCityCategoryIndexable(city, cat, n);
              return <td key={cat.slug} className="p-2 text-center">
                <Link to={cityCategoryPath(city.slug, cat.slug)} target="_blank" className={ok ? "font-semibold text-primary" : "text-muted-foreground"}>{n}{ok ? " ✓" : ""}</Link>
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>}
    </section>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">城市</h2>
      {cities.map(city => <div key={city.slug} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
        <Switch checked={city.is_active} onCheckedChange={v => patchCity(city.slug, { is_active: v })} aria-label={`开启${city.name_zh}`} />
        <span className="w-28 font-medium">{city.name_zh} <span className="text-xs text-muted-foreground">{city.slug}</span></span>
        <label className="flex items-center gap-1 text-sm">范围(英里)<Input type="number" min={5} max={100} value={city.radius_miles} onChange={e => patchCity(city.slug, { radius_miles: Number(e.target.value) })} className="h-9 w-20 text-[16px]" /></label>
        <Input value={city.intro_zh} placeholder="城市补充介绍（中文，可选）" onChange={e => patchCity(city.slug, { intro_zh: e.target.value })} className="h-9 min-w-48 flex-1 text-[16px]" />
        <Button size="sm" onClick={() => saveCity(city)}><Save />保存</Button>
      </div>)}
      <div className="grid gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-7">
        {(["slug", "name_en", "name_zh", "state", "latitude", "longitude"] as const).map(f => <Input key={f} value={newCity[f]} onChange={e => setNewCity(v => ({ ...v, [f]: e.target.value }))} className="text-[16px]"
          placeholder={{ slug: "网址名 如 boston", name_en: "Boston", name_zh: "波士顿", state: "州", latitude: "纬度", longitude: "经度" }[f]} />)}
        <Button onClick={addCity}><Plus />添加城市</Button>
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">服务分类</h2>
      <p className="text-sm text-muted-foreground">介绍文字中的 {"{city}"} 会自动替换为城市名称。</p>
      {categories.map(cat => <div key={cat.slug} className="space-y-2 rounded-xl border border-border p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Switch checked={cat.is_active} onCheckedChange={v => patchCat(cat.slug, { is_active: v })} aria-label={`开启${cat.name_zh}`} />
          <span className="font-medium">{cat.name_zh} · {cat.name_en}</span>
          <label className="flex items-center gap-1 text-sm">收录门槛<Input type="number" min={1} value={cat.min_listings} onChange={e => patchCat(cat.slug, { min_listings: Number(e.target.value) })} className="h-9 w-16 text-[16px]" />条</label>
          <label className="flex flex-1 items-center gap-1 text-sm">对应发帖分类<Input value={cat.post_categories.join(", ")} onChange={e => patchCat(cat.slug, { post_categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="h-9 min-w-40 text-[16px]" /></label>
          <Button size="sm" onClick={() => saveCategory(cat)}><Save />保存</Button>
        </div>
        <Textarea value={cat.intro_zh} onChange={e => patchCat(cat.slug, { intro_zh: e.target.value })} className="text-[16px]" rows={2} />
        <Textarea lang="en" value={cat.intro_en} onChange={e => patchCat(cat.slug, { intro_en: e.target.value })} className="text-[16px]" rows={2} />
      </div>)}
    </section>
  </div>;
}

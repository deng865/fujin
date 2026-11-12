import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import SeoHead from "@/components/SeoHead";
import DirectoryLinks from "@/components/DirectoryLinks";
import { SEO_CITIES, SEO_CATEGORIES, directorySchema, routeSeo } from "@/lib/seoCatalog";
import { useSeoConfig } from "@/hooks/useSeoConfig";
import { cityCategoryPath } from "@/lib/citySeo";
import { supabase } from "@/integrations/supabase/client";

// Do not select titles/descriptions/media here: user-authored fields can
// contain private addresses. Only safe category labels link to noindex details.
type SafeListing = { id: string; category: string };

export default function PublicDirectory({ kind }: { kind: "city" | "category" }) {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const city = kind === "city" ? SEO_CITIES.find(c => c.slug === slug) : undefined;
  const category = kind === "category" ? SEO_CATEGORIES.find(c => c.slug === slug) : undefined;
  const [listings, setListings] = useState<SafeListing[]>([]);
  const [status, setStatus] = useState("loading");
  const { categories: seoCategories } = useSeoConfig();

  useEffect(() => {
    let active = true;
    setListings([]);
    if (!city && !category) return;
    setStatus("loading");
    let request = supabase.from("posts").select("id, category").eq("is_visible", true).eq("is_mobile", false).order("created_at", { ascending: false }).limit(24);
    if (city) request = request.gte("latitude", city.lat - 0.5).lte("latitude", city.lat + 0.5).gte("longitude", city.lng - 0.65).lte("longitude", city.lng + 0.65);
    if (category) request = request.in("category", [...category.keys]);
    request.then(({ data, error }) => {
      if (!active) return;
      setListings(data || []);
      setStatus(error ? "error" : "ready");
    });
    return () => { active = false; };
  }, [city, category]);

  if (slug && !city && !category) return <div className="h-[100dvh] overflow-y-auto p-6"><h1 className="text-xl font-semibold">页面不存在</h1><Button asChild variant="outline" className="mt-4"><Link to="/">返回首页</Link></Button></div>;

  const heading = city ? `${city.zh}华人生活 · ${city.en}` : category ? `${category.zh} · ${category.en}` : kind === "city" ? "美国城市 · US Cities" : "分类信息 · Chinese Classifieds";
  const seo = routeSeo(pathname);
  return <div className="h-[100dvh] overflow-y-auto bg-background pb-32">
    <SeoHead schema={directorySchema(pathname, heading)} title={seo.title} description={seo.description} />
    <header className="border-b border-border px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
      <div className="max-w-3xl mx-auto flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="返回华人街坊首页"><Link to="/"><ArrowLeft /></Link></Button>
        <Link to="/" className="font-semibold">华人街坊</Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <nav aria-label="面包屑" className="text-sm text-muted-foreground flex flex-wrap gap-2"><Link to="/">首页</Link><span>/</span><Link to={kind === "city" ? "/cities" : "/categories"}>{kind === "city" ? "城市" : "分类"}</Link>{slug && <><span>/</span><span>{city?.zh || category?.zh}</span></>}</nav>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold break-words">{heading}</h1>
        <p lang="en" className="leading-relaxed text-muted-foreground">{city ? city.guide : category ? category.intro : kind === "city" ? "Explore Chinese local life across eight US cities. Choose a city for local search considerations and links to jobs, rentals and everyday services." : "Explore local jobs, housing, secondhand goods, community connections, businesses and everyday services for Chinese-speaking communities in the United States."}</p>
        <p className="leading-relaxed text-muted-foreground">{city ? city.chinese : category ? category.chinese : "选择城市或分类，查看中英文本地生活指南与公开分类入口；实际服务内容和安排请向发布者核实。"}</p>
      </div>
      {category && <section className="space-y-5" aria-label="分类指南">{category.sections.map(([en, body, zh, chinese]) => <section key={en} className="space-y-2"><h2 className="text-lg font-semibold">{zh} · {en}</h2><p lang="en" className="text-sm leading-relaxed text-muted-foreground">{body}</p><p className="text-sm leading-relaxed text-muted-foreground">{chinese}</p></section>)}</section>}
      {(!slug || city) && <section className="space-y-3">
        <h2 className="text-lg font-semibold">{kind === "city" && !city ? "选择城市 · Choose a City" : "生活分类 · Local Categories"}</h2>
        <div className="grid sm:grid-cols-2 gap-x-6">
          {(kind === "city" && !city ? SEO_CITIES : SEO_CATEGORIES).map(item => <Link key={item.slug} to={`${kind === "city" && !city ? "/cities" : "/categories"}/${item.slug}`} className="flex items-center gap-2 py-3 border-b border-border text-primary"><MapPin className="h-4 w-4 shrink-0" /><span>{item.zh} · {item.en}</span></Link>)}
        </div>
      </section>}
      {city && seoCategories.length > 0 && <section className="space-y-3" aria-labelledby="city-service-links">
        <h2 id="city-service-links" className="text-lg font-semibold">{city.zh}服务分类 · {city.en} Services</h2>
        <p className="text-sm text-muted-foreground">查看中英文服务指南与真实公开信息；没有真实帖子的页面不会进入搜索索引。</p>
        <nav className="grid gap-2 sm:grid-cols-2" aria-label={`${city.zh}服务分类`}>
          {seoCategories.map(c => <Link key={c.slug} to={cityCategoryPath(city.slug, c.slug)} className="rounded-xl border border-border px-4 py-3 text-primary">{city.zh}{c.name_zh} · {c.name_en}</Link>)}
        </nav>
      </section>}
      {(city || category) && <section className="space-y-3">
        <h2 className="text-lg font-semibold">公开信息入口 · Public Listings</h2>
        <p className="text-sm text-muted-foreground">{city ? "以下是城市周边公开的固定服务信息，范围仅作城市参考，不代表发布者居住地点。" : "以下为公开的固定服务分类入口；私人地址、实时位置和私信不用于目录。"}</p>
        <div className="min-h-24">
          {status === "loading" ? <p role="status" className="text-sm text-muted-foreground">正在读取公开信息…</p> : listings.length ? <ul className="divide-y divide-border">{listings.map((p, i) => {
            const label = SEO_CATEGORIES.find(c => (c.keys as readonly string[]).includes(p.category))?.zh || "本地服务";
            return <li key={p.id}><Link className="block py-3 text-primary underline underline-offset-4" to={`/post/${p.id}`}>{label} · 公开信息 {i + 1}</Link></li>;
          })}</ul> : <p className="text-sm text-muted-foreground">{status === "error" ? "暂时无法读取公开信息，请稍后再试。" : "目前没有匹配的固定服务信息。可先阅读指南，或查看首页附近信息。"}</p>}
        </div>
        <Button asChild variant="outline"><Link to="/">查看附近信息</Link></Button>
      </section>}
      {category && <section className="space-y-3"><h2 className="text-lg font-semibold">按城市浏览 · Browse Cities</h2><nav className="flex flex-wrap gap-3">{SEO_CITIES.map(c => <Link key={c.slug} to={`/cities/${c.slug}`} className="text-primary underline underline-offset-4 text-sm">{c.en} · {c.zh}</Link>)}</nav></section>}
    </main>
    <div className="max-w-3xl mx-auto"><DirectoryLinks /></div>
  </div>;
}
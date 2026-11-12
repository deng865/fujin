import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Search, X } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SeoHead from "@/components/SeoHead";
import DirectoryLinks from "@/components/DirectoryLinks";
import { supabase } from "@/integrations/supabase/client";
import { SEO_CATEGORIES, cityServiceSchema } from "@/lib/seoCatalog";
import { getLaService } from "@/lib/laServiceCatalog";
import { cityBounds, cityCategoryPath, cityCategorySeo, isCityCategoryIndexable } from "@/lib/citySeo";
import { useSeoConfig } from "@/hooks/useSeoConfig";
import { cn } from "@/lib/utils";

// Coordinates are used only as server-side city filters. Do not select or render
// coordinates, descriptions, contact fields, user IDs or live locations here.
type SafePublicListing = {
  id: string;
  title: string;
  category: string;
  price: number | null;
  image_urls: string[] | null;
  is_mobile: boolean;
  created_at: string;
};

type LoadStatus = "loading" | "ready" | "error";
type ServiceType = "all" | "fixed" | "mobile";

export default function CityServiceDirectory() {
  const { citySlug, serviceSlug } = useParams();
  const { pathname } = useLocation();
  const { cities, categories, status: configStatus } = useSeoConfig();
  const city = cities.find(c => c.slug === citySlug);
  const category = categories.find(c => c.slug === serviceSlug);
  // Los Angeles keeps its hand-written pilot copy where a matching guide exists.
  const laGuide = citySlug === "los-angeles" ? getLaService(serviceSlug) : undefined;
  const [listings, setListings] = useState<SafePublicListing[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [query, setQuery] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("all");

  useEffect(() => {
    let active = true;
    setListings([]);
    setQuery("");
    setServiceType("all");
    if (!city || !category) return;
    setStatus("loading");
    const b = cityBounds(city);

    supabase.from("posts")
      .select("id, title, category, price, image_urls, is_mobile, created_at")
      .eq("is_visible", true)
      .in("category", category.post_categories)
      .gte("latitude", b.minLat)
      .lte("latitude", b.maxLat)
      .gte("longitude", b.minLng)
      .lte("longitude", b.maxLng)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (!active) return;
        setListings((data as SafePublicListing[] | null) || []);
        setStatus(error ? "error" : "ready");
      });

    return () => { active = false; };
  }, [city, category]);

  const filteredListings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return listings.filter(post => {
      if (serviceType === "fixed" && post.is_mobile) return false;
      if (serviceType === "mobile" && !post.is_mobile) return false;
      return !normalized || post.title.toLocaleLowerCase().includes(normalized) || post.category.toLocaleLowerCase().includes(normalized);
    });
  }, [listings, query, serviceType]);

  if (configStatus === "loading") {
    return <div className="h-[100dvh] bg-background p-6"><SeoHead title="华人街坊" description="华人街坊本地生活平台。" noindex /><p role="status" className="text-sm text-muted-foreground">正在加载…</p></div>;
  }

  if (!city || !category) {
    return <div className="h-[100dvh] overflow-y-auto bg-background p-6 pb-32">
      <SeoHead title="页面不存在 | 华人街坊" description="该城市服务页面不存在。" noindex />
      <h1 className="text-xl font-semibold">页面不存在</h1>
      <p className="mt-2 text-sm text-muted-foreground">该城市或服务分类暂未开放。</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/cities">查看全部城市</Link></Button>
    </div>;
  }

  const generated = cityCategorySeo(city, category);
  const service = {
    zh: category.name_zh,
    intro: laGuide?.intro || generated.introEn,
    chinese: laGuide?.chinese || generated.introZh,
    sections: laGuide?.sections || [],
  };
  const heading = `${city.name_zh}${category.name_zh} · ${city.name_en} ${category.name_en}`;
  const seo = { title: laGuide?.title || generated.title, description: laGuide?.description || generated.description };
  const indexable = status === "ready" && isCityCategoryIndexable(city, category, listings.length);
  const generalCategory = SEO_CATEGORIES.find(c => (c.keys as readonly string[]).some(k => category.post_categories.includes(k)));
  const cityPath = `/cities/${city.slug}`;

  return <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-background pb-32">
    <SeoHead
      title={seo.title}
      description={seo.description}
      noindex={!indexable}
      schema={cityServiceSchema(pathname, heading, service.zh, `${city.name_zh} · ${city.name_en}`, cityPath)}
    />
    <header className="border-b border-border bg-background px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label={`返回${city.name_zh}城市指南`}><Link to={cityPath}><ArrowLeft /></Link></Button>
        <Link to="/" className="font-semibold">华人街坊</Link>
        <Button asChild size="sm" className="ml-auto"><Link to="/create-post">发布信息</Link></Button>
      </div>
    </header>

    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <nav aria-label="面包屑" className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link to="/">首页</Link><span>/</span><Link to={cityPath}>{city.name_zh}</Link><span>/</span><span>{service.zh}</span>
      </nav>

      <section className="space-y-4">
        <div className="space-y-2">
          <h1 className="break-words text-2xl font-bold sm:text-3xl">{heading}</h1>
          <p lang="en" className="max-w-3xl leading-relaxed text-muted-foreground">{service.intro}</p>
          <p className="max-w-3xl leading-relaxed text-muted-foreground">{service.chinese}</p>
        </div>
        <div className="relative flex h-11 max-w-2xl items-center rounded-lg bg-muted">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            aria-label={`搜索${city.name_zh}${service.zh}`}
            placeholder={`搜索公开的${service.zh}标题…`}
            className="h-11 border-0 bg-transparent pl-10 pr-11 text-[16px] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && <Button variant="ghost" size="icon" aria-label="清空搜索" onClick={() => setQuery("")} className="absolute right-1 h-9 w-9"><X /></Button>}
        </div>
        <nav aria-label={`${city.name_zh}服务分类筛选`} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {categories.map(item => <Link
            key={item.slug}
            to={cityCategoryPath(city.slug, item.slug)}
            aria-current={item.slug === category.slug ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-sm",
              item.slug === category.slug ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
            )}
          >{item.name_zh}</Link>)}
        </nav>
      </section>

      <section aria-labelledby="la-public-listings" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="la-public-listings" className="text-xl font-semibold">真实公开信息 · Public Listings</h2>
            <p className="mt-1 text-sm text-muted-foreground">按发布者公开位置参考点匹配{city.name_zh}周边约 {city.radius_miles} 英里；不显示精确位置、联系方式或私人资料。</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1" aria-label="服务方式筛选">
            {([["all", "全部"], ["fixed", "固定地点"], ["mobile", "上门/接送"]] as const).map(([value, label]) => <button
              key={value}
              type="button"
              aria-pressed={serviceType === value}
              onClick={() => setServiceType(value)}
              className={cn("rounded-md px-3 py-1.5 text-xs", serviceType === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            >{label}</button>)}
          </div>
        </div>

        {status === "loading" ? <p role="status" className="rounded-xl border border-border p-6 text-sm text-muted-foreground">正在读取公开信息…</p>
          : status === "error" ? <p role="alert" className="rounded-xl border border-border p-6 text-sm text-muted-foreground">暂时无法读取公开信息，请稍后再试。</p>
            : listings.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              <p>目前没有符合此类目和{city.name_zh}范围的公开信息，不会用虚构商家、招聘或房源填充。</p>
              <p className="mt-2">This page stays available for visitors but is excluded from search indexing until a genuine public listing is available.</p>
              <Button asChild variant="outline" className="mt-4"><Link to="/create-post">发布真实{service.zh}信息</Link></Button>
            </div>
              : filteredListings.length === 0 ? <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">没有符合当前搜索或筛选的信息，请更换条件。</p>
                : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredListings.map(post => <li key={post.id}>
                    <Link to={`/post/${post.id}`} className="group flex h-full overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/30">
                      <div className="h-28 w-28 shrink-0 bg-muted sm:h-32 sm:w-32">
                        {post.image_urls?.[0]
                          ? <img src={post.image_urls[0]} alt={`${post.title} · ${city.name_zh}${service.zh}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          : <div className="flex h-full w-full items-center justify-center"><MapPin className="h-6 w-6 text-muted-foreground" /></div>}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col p-3">
                        <h3 className="line-clamp-2 text-[16px] font-semibold group-hover:underline">{post.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{service.zh} · {post.is_mobile ? "上门/接送" : "固定地点"}</p>
                        {post.price != null && post.price > 0 && <p className="mt-auto pt-2 text-sm font-semibold text-primary">${post.price}</p>}
                      </div>
                    </Link>
                  </li>)}
                </ul>}
      </section>

      <section aria-label={`${service.zh}实用指南`} className="grid gap-6 md:grid-cols-2">
        {service.sections.length > 0 && service.sections.map(section => <article key={section.enHeading} className="space-y-2 rounded-2xl bg-muted/50 p-5">
          <h2 className="text-lg font-semibold">{section.zhHeading} · {section.enHeading}</h2>
          <p lang="en" className="text-sm leading-relaxed text-muted-foreground">{section.en}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{section.zh}</p>
        </article>)}
      </section>

      <section className="space-y-3" aria-labelledby="la-related-links">
        <h2 id="la-related-links" className="text-lg font-semibold">继续浏览 · Related Guides</h2>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link to={cityPath} className="text-primary underline underline-offset-4">{city.name_zh}华人生活</Link>
          {generalCategory && <Link to={`/categories/${generalCategory.slug}`} className="text-primary underline underline-offset-4">美国{generalCategory.zh}</Link>}
          <Link to="/" className="text-primary underline underline-offset-4">查看附近全部服务</Link>
        </nav>
      </section>
    </main>
    <div className="mx-auto max-w-5xl"><DirectoryLinks /></div>
  </div>;
}

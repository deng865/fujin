import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Heart, Car, X, Star, MessageCircle, BadgeCheck, Loader2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { isCurrentlyOpen } from "@/lib/operatingHours";
import CategoryScroll from "@/components/CategoryScroll";
import { CITIES, MAP_CATEGORIES, formatMi, sortByDistance, sortByRating, type Coords } from "@/lib/nearby";
import { useLocationPrivacy } from "@/hooks/useLocationPrivacy";
import { PRIVACY_EVENT } from "@/lib/locationPrivacy";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import InstallBanner from "@/components/InstallBanner";
import DirectoryLinks from "@/components/DirectoryLinks";

type SortKey = "distance" | "rating" | "newest";
interface Prof { average_rating: number | null; total_rides: number | null; verified: boolean | null }

interface Post {
  id: string; title: string; description: string | null; category: string; price: number | null;
  user_id: string; latitude: number; longitude: number; image_urls: string[] | null; created_at: string;
  is_mobile?: boolean | null; operating_hours?: any; live_latitude?: number | null; live_longitude?: number | null;
}

const SPAN = 1.2; // ~80 mi box around the origin

export default function NearbyHome() {
  const navigate = useNavigate();
  const { browseEnabled } = useLocationPrivacy();
  const [manualArea, setManualArea] = useState(() => localStorage.getItem("browse_area") || "达拉斯");
  const [clock, setClock] = useState(Date.now());
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const update = () => { setClock(Date.now()); setRefresh(n => n + 1); };
    const timer = window.setInterval(update, 15000);
    window.addEventListener(PRIVACY_EVENT, update);
    return () => { window.clearInterval(timer); window.removeEventListener(PRIVACY_EVENT, update); };
  }, []);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [origin, setOrigin] = useState<Coords>(CITIES.find(c => c.name === manualArea) || CITIES[0]);
    const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("distance");
  const [locationStatus, setLocationStatus] = useState<"locating" | "located" | "denied" | "error" | "manual">("locating");
  const [profiles, setProfiles] = useState<Record<string, Prof>>({});

  const locateMe = () => {
    if (!browseEnabled) { setLocationStatus("manual"); return; }
    if (!navigator.geolocation) { setLocationStatus("error"); return; }
    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => { if (localStorage.getItem("browse_location_enabled") === "false") return; setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus("located"); },
      (error) => setLocationStatus(error.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  };

  useEffect(() => {
    if (browseEnabled && localStorage.getItem("locationPermission") !== "never") locateMe();
    else { setLocationStatus(browseEnabled ? "denied" : "manual"); setOrigin(CITIES.find(c => c.name === manualArea) || CITIES[0]); }
  }, [browseEnabled]);

  useEffect(() => {
    let cancelled = false;
    // Only the initial load shows placeholders. Background refreshes keep the
    // current list in place so they cannot push it down every 15 seconds.
    supabase
      .from("posts")
      .select("id, user_id, title, description, category, price, latitude, longitude, image_urls, created_at, is_mobile, operating_hours, live_latitude, live_longitude")
      .eq("is_visible", true)
      .gte("latitude", origin.lat - SPAN).lte("latitude", origin.lat + SPAN)
      .gte("longitude", origin.lng - SPAN * 1.3).lte("longitude", origin.lng + SPAN * 1.3)
      .limit(500)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error) setPosts((data as Post[]) || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [origin, refresh]);

  useEffect(() => {
    const ids = [...new Set(posts.map((p) => p.user_id))];
    if (!ids.length) return;
    supabase.from("public_profiles").select("id, average_rating, total_rides, verified").in("id", ids)
      .then(({ data }) => setProfiles(Object.fromEntries((data || []).map((r: any) => [r.id, r]))));
  }, [posts]);

  const handleCategory = (c: string | null) => {
    if (c && MAP_CATEGORIES.has(c)) { navigate(`/map?category=${c}`); return; }
    setCategory(c);
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = sortByDistance(posts, origin)
      .filter((p) => !MAP_CATEGORIES.has(p.category))
      .filter((p) => !category || p.category === category)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q))
      .map((p) => ({ ...p, open: p.operating_hours ? isCurrentlyOpen(p.operating_hours) : null, rating: profiles[p.user_id]?.average_rating ?? null, prof: profiles[p.user_id] }));
    // Mobile services that are offline (outside their schedule) are hidden; closed fixed shops stay, listed after open ones.
    items = items.filter((p) => !(p.is_mobile && p.open === false));
    if (sort === "distance") items = [...items].sort((a, b) => Number(a.open === false) - Number(b.open === false));
    if (sort === "rating") items = sortByRating(items);
    if (sort === "newest") items = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return items;
  }, [posts, origin, category, query, sort, profiles, clock]);

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-background pb-28">
      <InstallBanner />
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-h-10">
          <h1 className="shrink-0 text-[20px] font-bold text-foreground">华人街坊</h1>
          <Button variant="ghost" onClick={locateMe} disabled={locationStatus === "locating"}
            title={locationStatus === "denied" ? "请在浏览器或手机设置中允许位置访问，再点击重试" : "重新获取我的位置"}
            aria-label="重新获取我的位置" className="h-9 min-w-0 max-w-full px-2 text-xs text-muted-foreground">
            {locationStatus === "locating" ? <Loader2 className="motion-safe:animate-spin" /> : locationStatus === "located" ? <LocateFixed className="text-primary" /> : <MapPin />}
            <span role="status" aria-live="polite">{locationStatus === "locating" ? "定位中…" : locationStatus === "located" ? "已定位" : locationStatus === "manual" ? "浏览定位已关闭" : locationStatus === "denied" ? "请打开位置设置" : "定位失败，请重试"}</span>
          </Button>
        </div>
        {(locationStatus === "manual" || locationStatus === "denied" || locationStatus === "error") && <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>参考区域</span>
          <Select value={manualArea} onValueChange={name => { setManualArea(name); localStorage.setItem("browse_area", name); setOrigin(CITIES.find(c => c.name === name) || CITIES[0]); }}>
            <SelectTrigger aria-label="选择参考区域" className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{CITIES.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select><span>非实时位置</span>
        </div>}
        <div className="relative flex items-center h-11 rounded-lg bg-muted">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input type="search" aria-label="搜索附近服务" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索附近的接送、美食、律师、美甲…"
            className="min-w-0 h-11 border-0 rounded-lg bg-transparent pl-10 pr-11 text-[16px] [&::-webkit-search-cancel-button]:appearance-none" />
          {query && <Button variant="ghost" size="icon" onClick={() => setQuery("")} aria-label="清空搜索"
            className="absolute right-1 h-9 w-9 text-muted-foreground"><X /></Button>}
        </div>
        <div className="-mx-4"><CategoryScroll inline selectedCategory={category} onSelectCategory={handleCategory} /></div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {([["distance", "离我最近"], ["rating", "好评最高"], ["newest", "最新发布"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)}
              className={cn("shrink-0 rounded-full px-3 py-1 text-sm border", sort === k ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>{l}</button>
          ))}
          <button onClick={() => handleCategory("driver")} className="ml-auto shrink-0 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-sm">
            <Car className="h-4 w-4" />接送
          </button>
        </div>
      </header>

      <main className="px-4 pt-3 space-y-3">
        <h2 className="text-base font-semibold">附近华人服务与分类信息</h2>
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted/60 animate-pulse" />)}
        {!loading && list.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">附近还没有相关信息，换个分类试试</div>
        )}
        {list.map((p) => (
          <article key={p.id} onClick={() => navigate(`/post/${p.id}`)}
            className="flex gap-3 rounded-2xl bg-card border border-border/50 p-3 active:scale-[0.99] transition-transform cursor-pointer">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
              {p.image_urls?.[0] ? <img src={p.image_urls[0]} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center"><MapPin className="h-6 w-6 text-muted-foreground" /></div>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-start gap-2">
                <h3 className="flex-1 text-[16px] font-semibold text-foreground line-clamp-1"><Link to={`/post/${p.id}`} onClick={e => e.stopPropagation()}>{p.title}</Link></h3>
                <button aria-label="收藏" onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }} className="p-1 -m-1">
                  <Heart className={cn("h-5 w-5", favoriteIds.has(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground")} />
                </button>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                {p.rating ? <><Star className="h-3.5 w-3.5 fill-primary text-primary" /><span className="text-foreground font-medium">{p.rating.toFixed(1)}</span></> : <span className="rounded bg-accent px-1.5 text-accent-foreground">新入驻</span>}
                {p.prof?.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                {p.category === "driver" && <span className="flex items-center gap-0.5"><Car className="h-3.5 w-3.5" />接送{p.prof?.total_rides ? ` · ${p.prof.total_rides} 单` : ""}</span>}
              </div>
              {p.description && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{p.description}</p>}
              {p.description?.includes("认领") && <span className="mt-0.5 text-xs text-primary">店主？点此免费认领</span>}
              <div className="mt-auto flex items-center gap-2 pt-1 text-sm">
                <span className="font-semibold text-primary">{locationStatus !== "located" ? "约 " : ""}{formatMi(p.distance)}</span>
                {p.open === true && <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">营业中</span>}
                {p.open === false && <span className="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">已打烊</span>}
                {p.is_mobile && <span className="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">上门服务</span>}
                {p.price != null && <span className="font-semibold text-foreground">${p.price}</span>}
                <button onClick={(e) => { e.stopPropagation(); navigate(`/post/${p.id}`); }}
                  className="ml-auto flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs">
                  {p.category === "driver" ? <><Car className="h-3.5 w-3.5" />叫车</> : <><MessageCircle className="h-3.5 w-3.5" />联系</>}
                </button>
              </div>
            </div>
          </article>
        ))}
      </main>
      <section className="px-4 pt-6 space-y-2 text-sm text-muted-foreground" aria-label="华人街坊本地生活">
        <h2 className="text-base font-semibold text-foreground">美国华人本地生活 · Chinese Local Life</h2>
        <p>华人街坊连接美国华人本地生活、同城社交、商家服务与分类信息。查找工作、租房、二手物品和日常服务，联系发布者确认实际安排。</p>
        <p lang="en">Connect with Chinese local life in US cities: jobs, rentals, secondhand goods, community connections and everyday services. Confirm availability and terms with the advertiser.</p>
      </section>
      <DirectoryLinks />
    </div>
  );
}

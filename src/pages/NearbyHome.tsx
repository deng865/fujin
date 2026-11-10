import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Heart, Car, ChevronDown, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { isCurrentlyOpen } from "@/lib/operatingHours";
import CategoryScroll from "@/components/CategoryScroll";
import { CITIES, MAP_CATEGORIES, formatMi, sortByDistance, type Coords } from "@/lib/nearby";
import { cn } from "@/lib/utils";

type SortKey = "distance" | "newest" | "open";

interface Post {
  id: string; title: string; description: string | null; category: string; price: number | null;
  latitude: number; longitude: number; image_urls: string[] | null; created_at: string;
  is_mobile?: boolean | null; operating_hours?: any; live_latitude?: number | null; live_longitude?: number | null;
}

const SPAN = 1.2; // ~80 mi box around the origin

export default function NearbyHome() {
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [origin, setOrigin] = useState<Coords>(CITIES[0]);
  const [originLabel, setOriginLabel] = useState(CITIES[0].name);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("distance");
  const [cityOpen, setCityOpen] = useState(false);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => { setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }); setOriginLabel("我的位置"); },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  };

  useEffect(() => {
    if (localStorage.getItem("locationPermission") !== "never") locateMe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("posts")
      .select("id, title, description, category, price, latitude, longitude, image_urls, created_at, is_mobile, operating_hours, live_latitude, live_longitude")
      .eq("is_visible", true)
      .gte("latitude", origin.lat - SPAN).lte("latitude", origin.lat + SPAN)
      .gte("longitude", origin.lng - SPAN * 1.3).lte("longitude", origin.lng + SPAN * 1.3)
      .limit(500)
      .then(({ data }) => { if (!cancelled) { setPosts((data as Post[]) || []); setLoading(false); } });
    return () => { cancelled = true; };
  }, [origin]);

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
      .map((p) => ({ ...p, open: p.operating_hours ? isCurrentlyOpen(p.operating_hours) : null }));
    if (sort === "newest") items = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "open") items = items.filter((p) => p.open !== false);
    return items;
  }, [posts, origin, category, query, sort]);

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-background pb-28">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCityOpen((v) => !v)} className="flex items-center gap-1 text-[16px] font-semibold text-foreground shrink-0">
            <MapPin className="h-4 w-4 text-primary" />{originLabel}<ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center gap-2 rounded-full bg-muted px-3 h-10">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索律师、美甲、餐馆…"
              className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground" />
          </div>
        </div>
        {cityOpen && (
          <div className="flex flex-wrap gap-2 pb-1">
            <button onClick={() => { locateMe(); setCityOpen(false); }} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm">
              <Navigation className="h-3.5 w-3.5" />我的位置
            </button>
            {CITIES.map((c) => (
              <button key={c.name} onClick={() => { setOrigin(c); setOriginLabel(c.name); setCityOpen(false); }}
                className="rounded-full bg-muted px-3 py-1.5 text-sm text-foreground">{c.name}</button>
            ))}
          </div>
        )}
        <div className="-mx-4"><CategoryScroll inline selectedCategory={category} onSelectCategory={handleCategory} /></div>
        <div className="flex gap-2">
          {([["distance", "离我最近"], ["newest", "最新发布"], ["open", "营业中"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)}
              className={cn("rounded-full px-3 py-1 text-sm border", sort === k ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>{l}</button>
          ))}
          <button onClick={() => navigate("/map?category=driver")} className="ml-auto flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-sm">
            <Car className="h-4 w-4" />接送
          </button>
        </div>
      </header>

      <main className="px-4 pt-3 space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted/60 animate-pulse" />)}
        {!loading && list.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">附近还没有相关信息，换个分类或城市试试</div>
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
                <h3 className="flex-1 text-[16px] font-semibold text-foreground line-clamp-1">{p.title}</h3>
                <button aria-label="收藏" onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }} className="p-1 -m-1">
                  <Heart className={cn("h-5 w-5", favoriteIds.has(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground")} />
                </button>
              </div>
              {p.description && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
              <div className="mt-auto flex items-center gap-2 pt-1 text-sm">
                <span className="font-semibold text-primary">{formatMi(p.distance)}</span>
                {p.open === true && <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">营业中</span>}
                {p.open === false && <span className="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">已打烊</span>}
                {p.is_mobile && <span className="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">上门服务</span>}
                {p.price != null && <span className="ml-auto font-semibold text-foreground">${p.price}</span>}
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}

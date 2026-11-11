import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Heart, Car, X, Star, MessageCircle, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { isCurrentlyOpen } from "@/lib/operatingHours";
import CategoryScroll from "@/components/CategoryScroll";
import { CITIES, MAP_CATEGORIES, formatMi, sortByDistance, sortByRating, type Coords } from "@/lib/nearby";
import { cn } from "@/lib/utils";

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
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [origin, setOrigin] = useState<Coords>(CITIES[0]);
    const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("distance");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Prof>>({});

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => { setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }); },
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
      .select("id, user_id, title, description, category, price, latitude, longitude, image_urls, created_at, is_mobile, operating_hours, live_latitude, live_longitude")
      .eq("is_visible", true)
      .gte("latitude", origin.lat - SPAN).lte("latitude", origin.lat + SPAN)
      .gte("longitude", origin.lng - SPAN * 1.3).lte("longitude", origin.lng + SPAN * 1.3)
      .limit(500)
      .then(({ data }) => { if (!cancelled) { setPosts((data as Post[]) || []); setLoading(false); } });
    return () => { cancelled = true; };
  }, [origin]);

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
  }, [posts, origin, category, query, sort, profiles]);

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-background pb-28">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 space-y-2">
        <div className="flex items-center gap-2 h-10">
          {searchOpen ? (
            <div className="flex-1 flex items-center gap-2 rounded-full bg-muted px-3 h-10">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索律师、美甲、餐馆…"
                className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground" />
              <button onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label="关闭搜索"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          ) : (
            <>
              <h1 className="flex-1 text-[20px] font-bold text-foreground">附近街坊</h1>
              <button onClick={() => setSearchOpen(true)} aria-label="搜索" className="h-10 w-10 flex items-center justify-center rounded-full bg-muted">
                <Search className="h-5 w-5 text-foreground" />
              </button>
            </>
          )}
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
                <h3 className="flex-1 text-[16px] font-semibold text-foreground line-clamp-1">{p.title}</h3>
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
                <span className="font-semibold text-primary">{formatMi(p.distance)}</span>
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
    </div>
  );
}

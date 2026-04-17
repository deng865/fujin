import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { GeolocateControl, MapRef, Marker } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { isCurrentlyOpen } from "@/lib/operatingHours";
import AvatarMarker from "@/components/AvatarMarker";
import ControlBar from "@/components/ControlBar";
import CategoryScroll from "@/components/CategoryScroll";
import MapControls from "@/components/MapControls";
import PostMarkers from "@/components/PostMarkers";
import { useVisitTracker } from "@/hooks/useVisitTracker";
import MapFilterChips, { defaultFilters, type MapFilters } from "@/components/MapFilterChips";
import MapListSheet from "@/components/MapListSheet";
import { toast } from "@/hooks/use-toast";

const DEFAULT_CENTER = { lat: 32.7767, lng: -96.797 };

interface Post {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  latitude: number;
  longitude: number;
  image_urls: string[] | null;
  created_at: string;
  is_mobile?: boolean;
  operating_hours?: any;
  live_latitude?: number | null;
  live_longitude?: number | null;
  live_updated_at?: string | null;
  user_id?: string;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAP_STYLES: Record<string, string> = {
  roadmap: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
};

function radiusToZoom(radiusMi: number, lat: number, mapEl?: HTMLElement | null): number {
  const C = 24901.461;
  const latRad = (lat * Math.PI) / 180;
  const w = mapEl?.clientWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1);
  const h = mapEl?.clientHeight ?? (typeof window !== "undefined" ? window.innerHeight : 1);
  const shortPx = Math.min(w, h);
  const longPx = Math.max(w, h);
  const baseZoom = Math.log2((C * Math.cos(latRad)) / (2 * radiusMi));
  const zoom = baseZoom + Math.log2(shortPx / longPx);
  return Math.min(Math.max(zoom, 1), 20);
}

function boundsToRadius(map: mapboxgl.Map): number {
  const bounds = map.getBounds();
  if (!bounds) return 10;
  const center = map.getCenter();
  const latRadius = haversine(bounds.getSouth(), center.lng, bounds.getNorth(), center.lng) / 2;
  const lngRadius = haversine(center.lat, bounds.getWest(), center.lat, bounds.getEast()) / 2;
  return Math.round(Math.min(latRadius, lngRadius));
}

export default function MapHomeContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const geolocateRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isRadiusDriven = useRef(false);
  const visiblePostIdsRef = useRef<Set<string>>(new Set());
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [mapType, setMapType] = useState("roadmap");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [bearing, setBearing] = useState(0);
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [mapTapped, setMapTapped] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(100);
  const { toggleFavorite, favoriteIds, userId: favUserId } = useFavorites();

  useVisitTracker(user?.id ?? null, userPos, posts);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setAvatarUrl(null);
      return;
    }

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setAvatarUrl(profile?.avatar_url ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const perm = localStorage.getItem("locationPermission");
    if (perm === "never") return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        mapRef.current?.flyTo({
          center: [loc.lng, loc.lat],
          zoom: radiusToZoom(10, loc.lat, mapRef.current?.getMap().getContainer()),
          duration: 800,
        });
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 5_000 },
    );
  }, []);

  const fetchPosts = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const { data } = await supabase
      .from("posts")
      .select("id, title, description, category, price, latitude, longitude, image_urls, created_at, is_mobile, operating_hours, live_latitude, live_longitude, live_updated_at, user_id")
      .gte("latitude", bounds.getSouth())
      .lte("latitude", bounds.getNorth())
      .gte("longitude", bounds.getWest())
      .lte("longitude", bounds.getEast())
      .eq("is_visible", true)
      .limit(200);

    const next = data || [];
    visiblePostIdsRef.current = new Set(next.map((post) => post.id));
    setPosts(next);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updated = payload.new as any;

          if (!updated.is_mobile || updated.live_latitude == null) return;
          if (!visiblePostIdsRef.current.has(updated.id)) return;

          setPosts((prev) => {
            let changed = false;
            const next = prev.map((post) => {
              if (post.id !== updated.id) return post;
              changed = true;
              return {
                ...post,
                live_latitude: updated.live_latitude,
                live_longitude: updated.live_longitude,
                live_updated_at: updated.live_updated_at,
              };
            });
            return changed ? next : prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMoveEnd = useCallback(() => {
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const nextCenter = map.getCenter();
      setCenter({ lat: nextCenter.lat, lng: nextCenter.lng });

      if (!isRadiusDriven.current) {
        const visibleRadius = boundsToRadius(map);
        if (visibleRadius >= 1 && visibleRadius <= 100) {
          setSearchRadius(visibleRadius);
        }
      }

      isRadiusDriven.current = false;
      void fetchPosts();
    }, 220);
  }, [fetchPosts]);

  const handleRadiusChange = useCallback((radius: number) => {
    setSearchRadius(radius);
    isRadiusDriven.current = true;

    const zoom = radiusToZoom(radius, center.lat, mapRef.current?.getMap().getContainer());
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom, duration: 500 });
  }, [center]);

  const handleLocateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 12, duration: 800 });
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 5_000 },
    );
  }, []);

  const handlePlaceSelect = useCallback((loc: { lat: number; lng: number; name: string }) => {
    setCenter(loc);
    mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 12, duration: 800 });
  }, []);

  const handleToggleFavorite = useCallback(async (postId: string) => {
    if (!favUserId) {
      navigate("/auth");
      return;
    }

    const result = await toggleFavorite(postId);
    if (result === true) toast({ title: "已收藏 ❤️" });
    else if (result === false) toast({ title: "已取消收藏" });
  }, [favUserId, navigate, toggleFavorite]);

  useEffect(() => {
    if (!selectedPost || !mapRef.current) return;

    const lat = selectedPost.is_mobile && selectedPost.live_latitude != null
      ? selectedPost.live_latitude
      : selectedPost.latitude;
    const lng = selectedPost.is_mobile && selectedPost.live_longitude != null
      ? selectedPost.live_longitude
      : selectedPost.longitude;

    mapRef.current.flyTo({
      center: [lng, lat],
      offset: [0, -80],
      duration: 500,
    });
  }, [selectedPost]);

  const filtered = useMemo(() => posts.filter((post) => {
    if (selectedCategory && post.category !== selectedCategory) return false;

    const postLat = post.is_mobile && post.live_latitude != null ? post.live_latitude : post.latitude;
    const postLng = post.is_mobile && post.live_longitude != null ? post.live_longitude : post.longitude;

    if (haversine(center.lat, center.lng, postLat, postLng) > searchRadius) return false;

    if (filters.price) {
      const price = post.price ?? 0;
      if (filters.price === "$" && price > 50) return false;
      if (filters.price === "$$" && (price <= 50 || price > 200)) return false;
      if (filters.price === "$$$" && price <= 200) return false;
    }

    if (!post.is_mobile) {
      const open = isCurrentlyOpen(post.operating_hours);
      if (open !== true) return false;
    }

    return true;
  }), [posts, selectedCategory, center.lat, center.lng, searchRadius, filters]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <MapGL
        ref={mapRef}
        initialViewState={{
          latitude: center.lat,
          longitude: center.lng,
          zoom: radiusToZoom(10, center.lat),
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLES[mapType]}
        style={{ width: "100%", height: "100%" }}
        onLoad={() => {
          void fetchPosts();
          setTimeout(() => geolocateRef.current?.trigger(), 350);
        }}
        onMoveEnd={handleMoveEnd}
        onRotate={(event) => setBearing(event.viewState.bearing)}
        onClick={() => setMapTapped((value) => value + 1)}
      >
        <GeolocateControl
          ref={geolocateRef}
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation
          showUserLocation={false}
          style={{ display: "none" }}
          onGeolocate={(event: any) => {
            setUserPos({ lat: event.coords.latitude, lng: event.coords.longitude });
          }}
        />

        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
            <AvatarMarker avatarUrl={avatarUrl} name={user?.user_metadata?.name} size={40} />
          </Marker>
        )}

        <PostMarkers
          posts={filtered}
          onSelectPost={setSelectedPost}
          favoriteIds={favoriteIds}
          selectedPostId={selectedPost?.id}
        />
      </MapGL>

      <ControlBar
        searchRadius={searchRadius}
        onSearchRadiusChange={handleRadiusChange}
        onPlaceSelect={handlePlaceSelect}
      />

      <CategoryScroll
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <MapControls
        onLocateMe={handleLocateMe}
        onMapTypeChange={setMapType}
        currentMapType={mapType}
        bearing={bearing}
        onResetNorth={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500 })}
        bottomOffset={sheetHeight}
      />

      <MapListSheet
        posts={filtered}
        userLat={userPos?.lat ?? center.lat}
        userLng={userPos?.lng ?? center.lng}
        selectedPost={selectedPost}
        onSelectPost={setSelectedPost}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        filters={filters}
        onFiltersChange={setFilters}
        selectedCategory={selectedCategory}
        mapTapped={mapTapped}
        onSheetHeightChange={setSheetHeight}
      />
    </div>
  );
}
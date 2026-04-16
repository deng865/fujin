import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { MapRef, GeolocateControl, Marker } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { isCurrentlyOpen } from "@/lib/operatingHours";
import AvatarMarker from "@/components/AvatarMarker";
import ControlBar from "@/components/ControlBar";
import CategoryScroll from "@/components/CategoryScroll";
import MapControls from "@/components/MapControls";
import PostMarkers from "@/components/PostMarkers";

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
  const R = 3958.8; // Earth radius in miles
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

// Convert radius (miles) to an appropriate zoom level at a given latitude.
// Treats `radiusMi` as the half-length of the map's SHORTER axis so it matches
// `boundsToRadius` which uses Math.min(latRadius, lngRadius).
function radiusToZoom(radiusMi: number, lat: number, mapEl?: HTMLElement | null): number {
  const C = 24901.461; // Earth circumference in miles
  const latRad = (lat * Math.PI) / 180;
  // Base zoom assumes radius covers half the map width (longitude direction)
  const baseZoom = Math.log2((C * Math.cos(latRad)) / (2 * radiusMi));
  const w = mapEl?.clientWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1);
  const h = mapEl?.clientHeight ?? (typeof window !== "undefined" ? window.innerHeight : 1);
  const shortSidePx = Math.min(w, h);
  const longSidePx = Math.max(w, h);
  // Adjust so radius corresponds to half the shorter axis instead of width
  const ratio = shortSidePx / longSidePx;
  const zoom = baseZoom + Math.log2(ratio);
  return Math.min(Math.max(zoom, 1), 20);
}

// Convert map bounds to an approximate visible radius from center
function boundsToRadius(map: mapboxgl.Map): number {
  const bounds = map.getBounds();
  if (!bounds) return 10;
  const center = map.getCenter();
  // Use half the shorter axis (lat or lng span) as radius
  const latRadius = haversine(bounds.getSouth(), center.lng, bounds.getNorth(), center.lng) / 2;
  const lngRadius = haversine(center.lat, bounds.getWest(), center.lat, bounds.getEast()) / 2;
  return Math.round(Math.min(latRadius, lngRadius));
}

export default function MapHome() {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const geolocateRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isRadiusDriven = useRef(false); // flag to avoid feedback loop
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [mapType, setMapType] = useState("roadmap");
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [bearing, setBearing] = useState(0);
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [mapTapped, setMapTapped] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(100);
  const { isFavorite, toggleFavorite, favoriteIds, userId: favUserId } = useFavorites();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", data.user.id).single();
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      }
    });
    const perm = localStorage.getItem("locationPermission");
    if (perm !== "never") {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(loc);
          mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: radiusToZoom(10, loc.lat, mapRef.current?.getMap().getContainer()), duration: 1000 });
        },
        () => {}
      );
    }
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
    if (data) setPosts(data);
  }, []);

  // Realtime subscription for mobile merchant location updates
  useEffect(() => {
    const channel = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updated = payload.new as any;
          if (updated.is_mobile && updated.live_latitude != null) {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === updated.id
                  ? { ...p, live_latitude: updated.live_latitude, live_longitude: updated.live_longitude, live_updated_at: updated.live_updated_at }
                  : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Debounced move end: sync center, radius from bounds, and fetch
  const handleMoveEnd = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });

      // Sync radius from zoom (skip if this move was triggered by radius change)
      if (!isRadiusDriven.current) {
        const visibleRadius = boundsToRadius(map);
        if (visibleRadius >= 1 && visibleRadius <= 100) {
          setSearchRadius(visibleRadius);
        }
      }
      isRadiusDriven.current = false;

      fetchPosts();
    }, 300);
  }, [fetchPosts]);

  // Radius → Zoom: when user manually adjusts radius, fly to matching zoom
  const handleRadiusChange = useCallback((radius: number) => {
    setSearchRadius(radius);
    isRadiusDriven.current = true;
    const zoom = radiusToZoom(radius, center.lat, mapRef.current?.getMap().getContainer());
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom, duration: 600 });
  }, [center]);
  const handleLocateMe = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 12, duration: 1000 });
      },
      () => {}
    );
  };

  const handlePlaceSelect = (loc: { lat: number; lng: number; name: string }) => {
    setCenter(loc);
    mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 12, duration: 1000 });
  };

  const handleToggleFavorite = async (postId: string) => {
    if (!favUserId) { navigate("/auth"); return; }
    const result = await toggleFavorite(postId);
    if (result === true) toast({ title: "已收藏 ❤️" });
    else if (result === false) toast({ title: "已取消收藏" });
  };

  // Fly to selected post (offset up to avoid drawer covering it)
  useEffect(() => {
    if (selectedPost && mapRef.current) {
      const lat = selectedPost.is_mobile && selectedPost.live_latitude != null
        ? selectedPost.live_latitude : selectedPost.latitude;
      const lng = selectedPost.is_mobile && selectedPost.live_longitude != null
        ? selectedPost.live_longitude : selectedPost.longitude;
      mapRef.current.flyTo({
        center: [lng, lat],
        offset: [0, -80], // shift up so marker is above the drawer
        duration: 600,
      });
    }
  }, [selectedPost]);

  // Apply category + radius + filter chips + operating hours
  const filtered = posts.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    // Use live coordinates for mobile merchants in distance calc
    const pLat = p.is_mobile && p.live_latitude != null ? p.live_latitude : p.latitude;
    const pLng = p.is_mobile && p.live_longitude != null ? p.live_longitude : p.longitude;
    if (haversine(center.lat, center.lng, pLat, pLng) > searchRadius) return false;
    // Price filter
    if (filters.price) {
      const price = p.price ?? 0;
      if (filters.price === "$" && price > 50) return false;
      if (filters.price === "$$" && (price <= 50 || price > 200)) return false;
      if (filters.price === "$$$" && price <= 200) return false;
    }
    // Fixed merchants: must have operating_hours and be currently open
    if (!p.is_mobile) {
      const open = isCurrentlyOpen(p.operating_hours);
      if (open !== true) return false;
    }
    return true;
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden">
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
          // Re-apply zoom now that container size is known so the displayed radius matches searchRadius
          const map = mapRef.current?.getMap();
          if (map) {
            map.jumpTo({ zoom: radiusToZoom(searchRadius, center.lat, map.getContainer()) });
          }
          fetchPosts();
          setTimeout(() => geolocateRef.current?.trigger(), 500);
        }}
        onMoveEnd={handleMoveEnd}
        onRotate={(e) => setBearing(e.viewState.bearing)}
        onClick={() => setMapTapped(n => n + 1)}
      >
        <GeolocateControl
          ref={geolocateRef}
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation
          showUserLocation={false}
          style={{ display: "none" }}
          onGeolocate={(e: any) => {
            setUserPos({ lat: e.coords.latitude, lng: e.coords.longitude });
          }}
        />
        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
            <AvatarMarker avatarUrl={avatarUrl} name={user?.user_metadata?.name} size={40} />
          </Marker>
        )}
        <PostMarkers posts={filtered} onSelectPost={setSelectedPost} favoriteIds={favoriteIds} selectedPostId={selectedPost?.id} />
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

      {/* Bottom sheet with list of nearby posts */}
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

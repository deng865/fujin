import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { MapRef, GeolocateControl, Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import AvatarMarker from "@/components/AvatarMarker";
import ControlBar from "@/components/ControlBar";
import CategoryScroll from "@/components/CategoryScroll";
import MapControls from "@/components/MapControls";
import PostMarkers from "@/components/PostMarkers";
import PostBottomSheet from "@/components/PostBottomSheet";
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
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
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

// Convert radius (km) to an appropriate zoom level at a given latitude
function radiusToZoom(radiusKm: number, lat: number): number {
  const C = 40075.016686; // Earth circumference in km
  const latRad = (lat * Math.PI) / 180;
  // At zoom z, the map width ≈ C * cos(lat) / 2^z km
  // We want the diameter (2*radius) to fit the screen, so zoom = log2(C * cos(lat) / (2 * radius))
  const zoom = Math.log2((C * Math.cos(latRad)) / (2 * radiusKm));
  return Math.min(Math.max(zoom, 1), 20);
}

// Convert map bounds to an approximate visible radius from center
function boundsToRadius(map: mapboxgl.Map): number {
  const bounds = map.getBounds();
  if (!bounds) return 25;
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
  const [searchRadius, setSearchRadius] = useState(25);
  const [mapType, setMapType] = useState("roadmap");
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [bearing, setBearing] = useState(0);
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
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
          mapRef.current?.flyTo({ center: [loc.lng, loc.lat], duration: 1000 });
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
      .select("id, title, description, category, price, latitude, longitude, image_urls, created_at")
      .gte("latitude", bounds.getSouth())
      .lte("latitude", bounds.getNorth())
      .gte("longitude", bounds.getWest())
      .lte("longitude", bounds.getEast())
      .eq("is_visible", true)
      .limit(200);
    if (data) setPosts(data);
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
    const zoom = radiusToZoom(radius, center.lat);
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom, duration: 600 });
  }, [center]);
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

  // Apply category + radius + filter chips
  const filtered = posts.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (haversine(center.lat, center.lng, p.latitude, p.longitude) > searchRadius) return false;
    // Price filter
    if (filters.price) {
      const price = p.price ?? 0;
      if (filters.price === "$" && price > 50) return false;
      if (filters.price === "$$" && (price <= 50 || price > 200)) return false;
      if (filters.price === "$$$" && price <= 200) return false;
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
          zoom: 12,
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLES[mapType]}
        style={{ width: "100%", height: "100%" }}
        onLoad={() => {
          fetchPosts();
          setTimeout(() => geolocateRef.current?.trigger(), 500);
        }}
        onMoveEnd={handleMoveEnd}
        onRotate={(e) => setBearing(e.viewState.bearing)}
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
        <PostMarkers posts={filtered} onSelectPost={setSelectedPost} favoriteIds={favoriteIds} />
      </MapGL>

      <ControlBar
        searchRadius={searchRadius}
        onSearchRadiusChange={setSearchRadius}
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
      />

      {/* Bottom sheet with list of nearby posts */}
      <MapListSheet
        posts={filtered}
        userLat={center.lat}
        userLng={center.lng}
        onSelectPost={setSelectedPost}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <PostBottomSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        isFavorite={selectedPost ? isFavorite(selectedPost.id) : false}
        onToggleFavorite={handleToggleFavorite}
        userLat={center.lat}
        userLng={center.lng}
      />
    </div>
  );
}

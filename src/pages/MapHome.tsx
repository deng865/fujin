import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import ControlBar from "@/components/ControlBar";
import CategoryScroll from "@/components/CategoryScroll";
import MapControls from "@/components/MapControls";
import PostMarkers from "@/components/PostMarkers";
import PostBottomSheet from "@/components/PostBottomSheet";
import BottomNav from "@/components/BottomNav";
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

function MapContent({
  selectedCategory,
  posts,
  center,
  searchRadius,
  onBoundsChanged,
  onSelectPost,
  favoriteIds,
}: {
  selectedCategory: string | null;
  posts: Post[];
  center: { lat: number; lng: number };
  searchRadius: number;
  onBoundsChanged: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onSelectPost: (post: Post) => void;
  favoriteIds: Set<string>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      const bounds = map.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        onBoundsChanged({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() });
      }
    });
    return () => {
      (window as any).google?.maps?.event?.removeListener(listener);
    };
  }, [map, onBoundsChanged]);

  const filtered = posts.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    return haversine(center.lat, center.lng, p.latitude, p.longitude) <= searchRadius;
  });

  return <PostMarkers posts={filtered} onSelectPost={onSelectPost} favoriteIds={favoriteIds} />;
}

export default function MapHome() {
  const navigate = useNavigate();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(25);
  const [mapType, setMapType] = useState("roadmap");
  const [user, setUser] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState("discover");
  const { isFavorite, toggleFavorite, favoriteIds, userId: favUserId } = useFavorites();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const perm = localStorage.getItem("locationPermission");
    if (perm !== "never") {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const handleBoundsChanged = useCallback(async (bounds: { north: number; south: number; east: number; west: number }) => {
    const { data } = await supabase
      .from("posts")
      .select("id, title, description, category, price, latitude, longitude, image_urls, created_at")
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east)
      .eq("is_visible", true)
      .limit(200);
    if (data) setPosts(data);
  }, []);

  const handleLocateMe = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  };

  const handlePostClick = () => {
    navigate(user ? "/create-post" : "/auth");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "profile") navigate(user ? "/profile" : "/auth");
    if (tab === "messages") navigate(user ? "/messages" : "/auth");
    if (tab === "favorites") navigate(user ? "/favorites" : "/auth");
  };

  const handleToggleFavorite = async (postId: string) => {
    if (!favUserId) { navigate("/auth"); return; }
    const result = await toggleFavorite(postId);
    if (result === true) toast({ title: "已收藏 ❤️" });
    else if (result === false) toast({ title: "已取消收藏" });
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <div className="relative h-screen w-screen overflow-hidden">
        <Map
          defaultCenter={center}
          center={center}
          defaultZoom={12}
          mapId="community-map"
          mapTypeId={mapType}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl={false}
          className="h-full w-full"
        >
            <MapContent
              selectedCategory={selectedCategory}
              posts={posts}
              center={center}
              searchRadius={searchRadius}
              onBoundsChanged={handleBoundsChanged}
              onSelectPost={setSelectedPost}
              favoriteIds={favoriteIds}
            />
        </Map>

        {/* Floating search bar */}
        <ControlBar
          searchRadius={searchRadius}
          onSearchRadiusChange={setSearchRadius}
          onPlaceSelect={(loc) => setCenter(loc)}
        />

        {/* Category horizontal scroll */}
        <CategoryScroll
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Map controls - right side */}
        <MapControls
          onLocateMe={handleLocateMe}
          onMapTypeChange={setMapType}
          currentMapType={mapType}
        />

        {/* Bottom sheet for selected post */}
        <PostBottomSheet
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          isFavorite={selectedPost ? isFavorite(selectedPost.id) : false}
          onToggleFavorite={handleToggleFavorite}
        />

        {/* Bottom navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onPostClick={handlePostClick}
        />
      </div>
    </APIProvider>
  );
}

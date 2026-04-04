import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
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

const MAP_STYLES: Record<string, string> = {
  roadmap: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
};

export default function MapHome() {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
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

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
    }
    fetchPosts();
  }, [fetchPosts]);

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

  const handlePostClick = () => {
    navigate(user ? "/create-post" : "/auth");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "discover") navigate("/discovery");
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

  const filtered = posts.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    return haversine(center.lat, center.lng, p.latitude, p.longitude) <= searchRadius;
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
        onLoad={fetchPosts}
        onMoveEnd={handleMoveEnd}
      >
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
      />

      <PostBottomSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        isFavorite={selectedPost ? isFavorite(selectedPost.id) : false}
        onToggleFavorite={handleToggleFavorite}
        userLat={center.lat}
        userLng={center.lng}
      />

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPostClick={handlePostClick}
      />
    </div>
  );
}

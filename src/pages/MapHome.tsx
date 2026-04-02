import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ControlBar from "@/components/ControlBar";
import MapControls from "@/components/MapControls";
import PostMarkers from "@/components/PostMarkers";

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

// Haversine distance in km
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
}: {
  selectedCategory: string | null;
  posts: Post[];
  center: { lat: number; lng: number };
  searchRadius: number;
  onBoundsChanged: (bounds: { north: number; south: number; east: number; west: number }) => void;
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

  // Filter by category + distance
  const filtered = posts.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    return haversine(center.lat, center.lng, p.latitude, p.longitude) <= searchRadius;
  });

  return <PostMarkers posts={filtered} />;
}

export default function MapHome() {
  const navigate = useNavigate();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(25);
  const [mapType, setMapType] = useState("roadmap");
  const [user, setUser] = useState<any>(null);

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
          zoomControl
          className="h-full w-full"
        >
          <MapContent
            selectedCategory={selectedCategory}
            posts={posts}
            center={center}
            searchRadius={searchRadius}
            onBoundsChanged={handleBoundsChanged}
          />
        </Map>

        {/* Top-left unified control bar */}
        <ControlBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchRadius={searchRadius}
          onSearchRadiusChange={setSearchRadius}
          onPlaceSelect={(loc) => setCenter(loc)}
          onPostClick={handlePostClick}
        />

        {/* Bottom-right map controls */}
        <MapControls
          onLocateMe={handleLocateMe}
          onMapTypeChange={setMapType}
          currentMapType={mapType}
        />

        {/* Profile button - top right */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => navigate(user ? "/profile" : "/auth")}
            className="bg-background/85 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/40 p-3 hover:bg-accent transition-all active:scale-95"
          >
            <User className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>
    </APIProvider>
  );
}

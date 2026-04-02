import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";
import { Plus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CategoryPanel from "@/components/CategoryPanel";
import SearchBar from "@/components/SearchBar";
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

function MapContent({
  selectedCategory,
  posts,
  onBoundsChanged,
}: {
  selectedCategory: string | null;
  posts: Post[];
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
        onBoundsChanged({
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        });
      }
    });
    return () => {
      const g = (window as any).google;
      if (g) g.maps.event.removeListener(listener);
    };
  }, [map, onBoundsChanged]);

  const filtered = selectedCategory
    ? posts.filter((p) => p.category === selectedCategory)
    : posts;

  return <PostMarkers posts={filtered} />;
}

export default function MapHome() {
  const navigate = useNavigate();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(25);
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

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <div className="relative h-screen w-screen overflow-hidden">
        <Map
          defaultCenter={center}
          center={center}
          defaultZoom={12}
          mapId="community-map"
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          className="h-full w-full"
        >
          <MapContent
            selectedCategory={selectedCategory}
            posts={posts}
            onBoundsChanged={handleBoundsChanged}
          />
        </Map>

        <CategoryPanel
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchRadius={searchRadius}
          onSearchRadiusChange={setSearchRadius}
        />

        <SearchBar onPlaceSelect={(loc) => setCenter(loc)} />

        {/* Right side buttons */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => user ? navigate("/create-post") : navigate("/auth")}
            className="bg-primary text-primary-foreground rounded-2xl shadow-lg p-3 hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate(user ? "/profile" : "/auth")}
            className="bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-3 hover:bg-accent transition-all"
          >
            <User className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>
    </APIProvider>
  );
}

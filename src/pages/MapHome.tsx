import { useState, useEffect, useCallback } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CategoryPanel from "@/components/CategoryPanel";
import SearchBar from "@/components/SearchBar";
import PostMarkers from "@/components/PostMarkers";

const DEFAULT_CENTER = { lat: 32.7767, lng: -96.797 }; // Dallas

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
  onBoundsChanged: (bounds: google.maps.LatLngBounds) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      const bounds = map.getBounds();
      if (bounds) onBoundsChanged(bounds);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onBoundsChanged]);

  const filtered = selectedCategory
    ? posts.filter((p) => p.category === selectedCategory)
    : posts;

  return <PostMarkers posts={filtered} />;
}

export default function MapHome() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(25);
  const [boundsRef, setBoundsRef] = useState<{
    north: number; south: number; east: number; west: number;
  } | null>(null);

  // Get user location on mount
  useEffect(() => {
    const perm = localStorage.getItem("locationPermission");
    if (perm !== "never") {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location denied, using default")
      );
    }
  }, []);

  // Fetch posts when bounds change
  const handleBoundsChanged = useCallback(async (bounds: google.maps.LatLngBounds) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const b = { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() };
    setBoundsRef(b);

    const { data } = await supabase
      .from("posts")
      .select("id, title, description, category, price, latitude, longitude, image_urls, created_at")
      .gte("latitude", b.south)
      .lte("latitude", b.north)
      .gte("longitude", b.west)
      .lte("longitude", b.east)
      .eq("is_visible", true)
      .limit(200);

    if (data) setPosts(data);
  }, []);

  const handlePlaceSelect = (loc: { lat: number; lng: number }) => {
    setCenter(loc);
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Map */}
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

        {/* Category Panel - Left */}
        <CategoryPanel
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchRadius={searchRadius}
          onSearchRadiusChange={setSearchRadius}
        />

        {/* Search Bar - Top Center */}
        <SearchBar onPlaceSelect={handlePlaceSelect} />

        {/* Post Button - Right */}
        <button
          onClick={() => window.location.href = "/create-post"}
          className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground rounded-2xl shadow-lg p-3 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </APIProvider>
  );
}

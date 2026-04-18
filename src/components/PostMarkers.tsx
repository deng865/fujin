import { useState, useEffect, useMemo, useCallback } from "react";
import { Marker, Source, Layer, useMap } from "react-map-gl/mapbox";
import type {
  CircleLayerSpecification,
  SymbolLayerSpecification,
  MapMouseEvent as MapboxMapMouseEvent,
  GeoJSONSource,
} from "mapbox-gl";
import {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
  Stethoscope, Building, Dumbbell, Baby, Dog, Laptop, Paintbrush, Hammer,
  BookOpen, Headphones, Truck, Wallet, Globe, Flower2, Sparkles, Pizza,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
  Stethoscope, Building, Dumbbell, Baby, Dog, Laptop, Paintbrush, Hammer,
  BookOpen, Headphones, Truck, Wallet, Globe, Flower2, Sparkles, Pizza,
};

// HSL color pool aligned with the dot palette used in DOM markers.
const colorPool = [
  "#3b82f6", "#10b981", "#f97316", "#ef4444",
  "#a855f7", "#06b6d4", "#eab308", "#6366f1",
  "#ec4899", "#14b8a6", "#84cc16", "#f43f5e",
  "#f59e0b", "#8b5cf6", "#d946ef", "#0ea5e9",
];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return colorPool[Math.abs(h) % colorPool.length];
}

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
  live_latitude?: number | null;
  live_longitude?: number | null;
  live_updated_at?: string | null;
  operating_hours?: any;
}

interface PostMarkersProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  favoriteIds?: Set<string>;
  selectedPostId?: string | null;
}

const SOURCE_ID = "posts-source";
const CLUSTER_LAYER = "posts-clusters";
const CLUSTER_COUNT_LAYER = "posts-cluster-count";
const POINT_LAYER = "posts-points";
const FAV_LAYER = "posts-fav-badge";

export default function PostMarkers({ posts, onSelectPost, favoriteIds, selectedPostId }: PostMarkersProps) {
  const { current: mapRef } = useMap();
  const [catMap, setCatMap] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("categories")
      .select("name, icon")
      .then(({ data }) => {
        if (data) {
          const m: Record<string, string> = {};
          data.forEach((c) => (m[c.name] = c.icon));
          setCatMap(m);
        }
      });
  }, []);

  // Build a GeoJSON FeatureCollection — Mapbox handles clustering on the GPU.
  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: posts.map((post) => {
        const isMobile = post.is_mobile === true;
        const lat = isMobile && post.live_latitude != null ? post.live_latitude : post.latitude;
        const lng = isMobile && post.live_longitude != null ? post.live_longitude : post.longitude;
        const color = hashColor(post.category);
        return {
          type: "Feature" as const,
          id: post.id,
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat],
          },
          properties: {
            postId: post.id,
            color,
            isMobile,
            isFav: favoriteIds?.has(post.id) ? 1 : 0,
          },
        };
      }),
    };
  }, [posts, favoriteIds]);

  // Selected post is still rendered as DOM Marker (single element, cheap)
  // so the existing scale/ring animation feels native.
  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  // Click handler — uses Mapbox queryRenderedFeatures so a single delegated
  // listener replaces N per-marker handlers.
  const handleMapClick = useCallback(
    (e: MapboxMapMouseEvent & { features?: any[] }) => {
      const map = mapRef?.getMap();
      if (!map) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [POINT_LAYER, CLUSTER_LAYER],
      });
      if (!features.length) return;

      const feature = features[0];
      // Cluster click → expand by zooming in.
      if (feature.layer.id === CLUSTER_LAYER) {
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (!source || clusterId == null) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const coords = (feature.geometry as any).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoom ?? map.getZoom() + 1, duration: 500 });
        });
        return;
      }

      // Single point click → open the post.
      const postId = feature.properties?.postId as string | undefined;
      if (!postId) return;
      const post = posts.find((p) => p.id === postId);
      if (post) onSelectPost(post);
    },
    [mapRef, onSelectPost, posts],
  );

  // Pointer cursor + delegated click — re-bind whenever handler identity
  // changes so we always have the freshest `posts` array in scope.
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

    map.on("click", handleMapClick);
    map.on("mouseenter", POINT_LAYER, onEnter);
    map.on("mouseleave", POINT_LAYER, onLeave);
    map.on("mouseenter", CLUSTER_LAYER, onEnter);
    map.on("mouseleave", CLUSTER_LAYER, onLeave);

    return () => {
      map.off("click", handleMapClick);
      map.off("mouseenter", POINT_LAYER, onEnter);
      map.off("mouseleave", POINT_LAYER, onLeave);
      map.off("mouseenter", CLUSTER_LAYER, onEnter);
      map.off("mouseleave", CLUSTER_LAYER, onLeave);
    };
  }, [mapRef, handleMapClick]);

  // Layer specs — clusters use circle layer (drawn on WebGL canvas, very fast).
  const clusterLayer: CircleLayerSpecification = {
    id: CLUSTER_LAYER,
    type: "circle",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#3b82f6", 10,
        "#6366f1", 30,
        "#a855f7",
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        18, 10,
        24, 30,
        30,
      ],
      "circle-stroke-width": 3,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.95,
    },
  };

  const clusterCountLayer: SymbolLayerSpecification = {
    id: CLUSTER_COUNT_LAYER,
    type: "symbol",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 13,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#ffffff",
    },
  };

  const pointLayer: CircleLayerSpecification = {
    id: POINT_LAYER,
    type: "circle",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 10,
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.95,
    },
  };

  // Tiny red heart dot for favourites — just a colored ring overlay.
  const favLayer: CircleLayerSpecification = {
    id: FAV_LAYER,
    type: "circle",
    source: SOURCE_ID,
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isFav"], 1]],
    paint: {
      "circle-color": "#ef4444",
      "circle-radius": 4,
      "circle-translate": [8, -8],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
    },
  };

  // Selected marker (DOM) — re-uses the existing icon styling on a single node.
  const selectedIconName = selectedPost ? catMap[selectedPost.category] : undefined;
  const SelectedIcon = (selectedIconName && iconMap[selectedIconName]) || MapPin;
  const selectedColorClass = selectedPost
    ? (() => {
        const hex = hashColor(selectedPost.category);
        // Map back to a tailwind bg-* using inline style for reliability.
        return hex;
      })()
    : null;

  const selectedLat = selectedPost
    ? selectedPost.is_mobile && selectedPost.live_latitude != null
      ? selectedPost.live_latitude
      : selectedPost.latitude
    : 0;
  const selectedLng = selectedPost
    ? selectedPost.is_mobile && selectedPost.live_longitude != null
      ? selectedPost.live_longitude
      : selectedPost.longitude
    : 0;

  return (
    <>
      <Source
        id={SOURCE_ID}
        type="geojson"
        data={geojson}
        cluster
        clusterRadius={50}
        clusterMaxZoom={14}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...pointLayer} />
        <Layer {...favLayer} />
      </Source>

      {selectedPost && (
        <Marker latitude={selectedLat} longitude={selectedLng} anchor="center">
          <div className="relative scale-[1.35] z-10 pointer-events-none">
            <div
              className={cn(
                "text-white rounded-full p-2 shadow-xl ring-[3px] ring-white",
              )}
              style={{ backgroundColor: selectedColorClass ?? "#3b82f6" }}
            >
              <SelectedIcon className="h-4 w-4" />
            </div>
            {favoriteIds?.has(selectedPost.id) && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Heart className="h-2.5 w-2.5 text-destructive fill-destructive" />
              </div>
            )}
          </div>
        </Marker>
      )}
    </>
  );
}

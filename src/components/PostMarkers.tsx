import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
const ICON_LAYER = "posts-icons";
const FAV_LAYER = "posts-fav-badge";

// Mobile (fuzzy) merchants — separate source so they aren't clustered with fixed pins.
const MOBILE_SOURCE_ID = "posts-mobile-source";
const MOBILE_AREA_FILL = "posts-mobile-area-fill";
const MOBILE_AREA_STROKE = "posts-mobile-area-stroke";
const MOBILE_CENTER_DOT = "posts-mobile-center-dot";
const MOBILE_CENTER_ICON = "posts-mobile-center-icon";

const ICON_PIXEL = 36; // logical px (we render @2x for retina)

/**
 * Render a Lucide icon component to a white-stroke PNG data url at 2x scale,
 * then load it into the Mapbox map's image registry under `sprite-{name}`.
 * Idempotent — repeat calls for the same name no-op.
 */
function ensureIconSprite(map: any, name: string): Promise<void> {
  return new Promise((resolve) => {
    const spriteId = `sprite-${name}`;
    if (!map || map.hasImage?.(spriteId)) return resolve();
    const Comp = iconMap[name];
    if (!Comp) return resolve();

    try {
      // Render the Lucide React component to an SVG string (white stroke).
      const svgString = renderToStaticMarkup(
        createElement(Comp as any, {
          color: "#ffffff",
          strokeWidth: 2.5,
          size: ICON_PIXEL,
        }),
      );
      const svg64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
      const img = new Image(ICON_PIXEL * 2, ICON_PIXEL * 2);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = ICON_PIXEL * 2;
          canvas.height = ICON_PIXEL * 2;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve();
          ctx.drawImage(img, 0, 0, ICON_PIXEL * 2, ICON_PIXEL * 2);
          const data = ctx.getImageData(0, 0, ICON_PIXEL * 2, ICON_PIXEL * 2);
          if (!map.hasImage(spriteId)) {
            map.addImage(spriteId, data, { pixelRatio: 2 });
          }
          // Force symbol layer to repaint now that the image is registered.
          map.triggerRepaint?.();
        } catch {}
        resolve();
      };
      img.onerror = () => resolve();
      img.src = svg64;
    } catch {
      resolve();
    }
  });
}

export default function PostMarkers({ posts, onSelectPost, favoriteIds, selectedPostId }: PostMarkersProps) {
  const { current: mapRef } = useMap();
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const registeredIcons = useRef<Set<string>>(new Set());

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

  // Register Lucide icons as Mapbox sprites whenever a new icon name appears.
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const iconNames = new Set<string>();
    Object.values(catMap).forEach((n) => n && iconNames.add(n));
    iconNames.add("MapPin"); // fallback
    iconNames.forEach((name) => {
      if (registeredIcons.current.has(name)) return;
      registeredIcons.current.add(name);
      void ensureIconSprite(map, name);
    });
  }, [mapRef, catMap, posts]);

  // Fallback: if Mapbox requests a sprite image that hasn't loaded yet,
  // register it on demand. This guarantees icons appear on first render.
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onMissing = (e: any) => {
      const id: string = e?.id || "";
      if (!id.startsWith("sprite-")) return;
      const name = id.slice("sprite-".length);
      if (!iconMap[name]) return;
      registeredIcons.current.add(name);
      void ensureIconSprite(map, name);
    };
    map.on("styleimagemissing", onMissing);
    return () => { map.off("styleimagemissing", onMissing); };
  }, [mapRef]);

  // Split posts: fixed merchants render precise pins; mobile merchants render fuzzy service areas.
  const fixedPosts = useMemo(() => posts.filter((p) => p.is_mobile !== true), [posts]);
  const mobilePosts = useMemo(() => posts.filter((p) => p.is_mobile === true), [posts]);

  // Fixed merchants — clustered precise points with category icons.
  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: fixedPosts.map((post) => {
        const color = hashColor(post.category);
        const iconName = catMap[post.category] || "MapPin";
        return {
          type: "Feature" as const,
          id: post.id,
          geometry: {
            type: "Point" as const,
            coordinates: [post.longitude, post.latitude],
          },
          properties: {
            postId: post.id,
            color,
            isFav: favoriteIds?.has(post.id) ? 1 : 0,
            icon: `sprite-${iconName}`,
          },
        };
      }),
    };
  }, [fixedPosts, favoriteIds, catMap]);

  // Mobile merchants — fuzzy point used for service area circles + a precise-looking
  // center pin (icon) so users can recognize the merchant category at a glance.
  // The CIRCLE is the privacy layer; the icon sits at the (already coarsened) center.
  const mobileGeojson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: mobilePosts.map((post) => {
        const lat = post.live_latitude != null ? post.live_latitude : post.latitude;
        const lng = post.live_longitude != null ? post.live_longitude : post.longitude;
        const iconName = catMap[post.category] || "MapPin";
        return {
          type: "Feature" as const,
          id: post.id,
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat],
          },
          properties: {
            postId: post.id,
            color: hashColor(post.category),
            icon: `sprite-${iconName}`,
          },
        };
      }),
    };
  }, [mobilePosts, catMap]);

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const handleMapClick = useCallback(
    (e: MapboxMapMouseEvent & { features?: any[] }) => {
      const map = mapRef?.getMap();
      if (!map) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [POINT_LAYER, ICON_LAYER, CLUSTER_LAYER, MOBILE_AREA_FILL, MOBILE_CENTER_DOT, MOBILE_CENTER_ICON],
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

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

    map.on("click", handleMapClick);
    map.on("mouseenter", POINT_LAYER, onEnter);
    map.on("mouseleave", POINT_LAYER, onLeave);
    map.on("mouseenter", ICON_LAYER, onEnter);
    map.on("mouseleave", ICON_LAYER, onLeave);
    map.on("mouseenter", CLUSTER_LAYER, onEnter);
    map.on("mouseleave", CLUSTER_LAYER, onLeave);
    map.on("mouseenter", MOBILE_AREA_FILL, onEnter);
    map.on("mouseleave", MOBILE_AREA_FILL, onLeave);
    map.on("mouseenter", MOBILE_CENTER_DOT, onEnter);
    map.on("mouseleave", MOBILE_CENTER_DOT, onLeave);
    map.on("mouseenter", MOBILE_CENTER_ICON, onEnter);
    map.on("mouseleave", MOBILE_CENTER_ICON, onLeave);

    return () => {
      map.off("click", handleMapClick);
      map.off("mouseenter", POINT_LAYER, onEnter);
      map.off("mouseleave", POINT_LAYER, onLeave);
      map.off("mouseenter", ICON_LAYER, onEnter);
      map.off("mouseleave", ICON_LAYER, onLeave);
      map.off("mouseenter", CLUSTER_LAYER, onEnter);
      map.off("mouseleave", CLUSTER_LAYER, onLeave);
      map.off("mouseenter", MOBILE_AREA_FILL, onEnter);
      map.off("mouseleave", MOBILE_AREA_FILL, onLeave);
      map.off("mouseenter", MOBILE_CENTER_DOT, onEnter);
      map.off("mouseleave", MOBILE_CENTER_DOT, onLeave);
      map.off("mouseenter", MOBILE_CENTER_ICON, onEnter);
      map.off("mouseleave", MOBILE_CENTER_ICON, onLeave);
    };
  }, [mapRef, handleMapClick]);

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

  // Colored circle background for individual points (the "pin" base).
  const pointLayer: CircleLayerSpecification = {
    id: POINT_LAYER,
    type: "circle",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 16,
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.95,
    },
  };

  // White Lucide icon overlaid on the colored circle.
  const iconLayer: SymbolLayerSpecification = {
    id: ICON_LAYER,
    type: "symbol",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": 0.5,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
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
      "circle-radius": 5,
      "circle-translate": [12, -12],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
    },
  };

  // ===== Mobile (fuzzy) merchants — service area circle =====
  // Larger, more vibrant circle communicates a "service area" rather than a precise pin,
  // protecting the mobile merchant's exact location for personal safety.
  const mobileAreaFillLayer: CircleLayerSpecification = {
    id: MOBILE_AREA_FILL,
    type: "circle",
    source: MOBILE_SOURCE_ID,
    paint: {
      "circle-color": ["get", "color"],
      "circle-opacity": 0.28,
      "circle-radius": [
        "interpolate", ["exponential", 2], ["zoom"],
        8, 2, 10, 8, 12, 32, 14, 126, 16, 504, 18, 2018,
      ],
      "circle-pitch-alignment": "map",
    },
  };

  const mobileAreaStrokeLayer: CircleLayerSpecification = {
    id: MOBILE_AREA_STROKE,
    type: "circle",
    source: MOBILE_SOURCE_ID,
    paint: {
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.7,
      "circle-radius": [
        "interpolate", ["exponential", 2], ["zoom"],
        8, 2, 10, 8, 12, 32, 14, 126, 16, 504, 18, 2018,
      ],
      "circle-pitch-alignment": "map",
    },
  };

  // Colored pin background at the (already-fuzzy) center — matches fixed merchant style.
  const mobileCenterDotLayer: CircleLayerSpecification = {
    id: MOBILE_CENTER_DOT,
    type: "circle",
    source: MOBILE_SOURCE_ID,
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 16,
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.95,
    },
  };

  // White Lucide icon overlaid on the center pin — mirrors fixed merchants.
  const mobileCenterIconLayer: SymbolLayerSpecification = {
    id: MOBILE_CENTER_ICON,
    type: "symbol",
    source: MOBILE_SOURCE_ID,
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": 0.5,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  };

  // Selected marker (DOM) — re-uses the existing icon styling on a single node.
  const selectedIconName = selectedPost ? catMap[selectedPost.category] : undefined;
  const SelectedIcon = (selectedIconName && iconMap[selectedIconName]) || MapPin;
  const selectedColorClass = selectedPost ? hashColor(selectedPost.category) : null;

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
        <Layer {...iconLayer} />
        <Layer {...favLayer} />
      </Source>

      <Source id={MOBILE_SOURCE_ID} type="geojson" data={mobileGeojson}>
        <Layer {...mobileAreaFillLayer} />
        <Layer {...mobileAreaStrokeLayer} />
        <Layer {...mobileCenterDotLayer} />
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

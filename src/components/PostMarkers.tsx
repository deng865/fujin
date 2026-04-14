import { useState, useEffect } from "react";
import { Marker } from "react-map-gl/mapbox";
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

const colorPool = [
  "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-red-500",
  "bg-purple-500", "bg-cyan-500", "bg-yellow-500", "bg-indigo-500",
  "bg-pink-500", "bg-teal-500", "bg-lime-500", "bg-rose-500",
  "bg-amber-500", "bg-violet-500", "bg-fuchsia-500", "bg-sky-500",
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

export default function PostMarkers({ posts, onSelectPost, favoriteIds, selectedPostId }: PostMarkersProps) {
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

  return (
    <>
      {posts.map((post) => {
        const iconName = catMap[post.category];
        const Icon = (iconName && iconMap[iconName]) || MapPin;
        const color = hashColor(post.category);
        const isFav = favoriteIds?.has(post.id);
        const isMobile = post.is_mobile === true;
        const isSelected = selectedPostId === post.id;

        const lat = isMobile && post.live_latitude != null ? post.live_latitude : post.latitude;
        const lng = isMobile && post.live_longitude != null ? post.live_longitude : post.longitude;

        return (
          <Marker
            key={post.id}
            latitude={lat}
            longitude={lng}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectPost(post);
            }}
          >
            <div
              className={cn(
                "relative cursor-pointer transition-transform duration-200",
                isSelected && "scale-[1.35] z-10"
              )}
            >
              {isMobile ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-12 w-12 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="absolute h-10 w-10 rounded-full bg-primary/15 backdrop-blur-sm" />
                  <div className={cn(
                    `${color} text-white rounded-full p-2 shadow-lg z-10`,
                    isSelected ? "ring-[3px] ring-white shadow-xl" : "ring-2 ring-white/50"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              ) : (
                <div className={cn(
                  `${color} text-white rounded-full p-2 shadow-lg transition-all duration-200`,
                  isSelected
                    ? "ring-[3px] ring-white shadow-xl"
                    : "hover:scale-110"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              )}
              {isFav && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                  <Heart className="h-2.5 w-2.5 text-destructive fill-destructive" />
                </div>
              )}
            </div>
          </Marker>
        );
      })}
    </>
  );
}

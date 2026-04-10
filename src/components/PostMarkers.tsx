import { Marker } from "react-map-gl/mapbox";
import { Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, MapPin, Scale, Heart } from "lucide-react";

const categoryIcons: Record<string, any> = {
  housing: Home, jobs: Briefcase, auto: Car, food: UtensilsCrossed,
  education: GraduationCap, travel: Plane, driver: UserCheck, legal: Scale,
};

const categoryColors: Record<string, string> = {
  housing: "bg-blue-500", jobs: "bg-emerald-500", auto: "bg-orange-500",
  food: "bg-red-500", education: "bg-purple-500", travel: "bg-cyan-500",
  driver: "bg-yellow-500", legal: "bg-indigo-500",
};

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
}

export default function PostMarkers({ posts, onSelectPost, favoriteIds }: PostMarkersProps) {
  return (
    <>
      {posts.map((post) => {
        const Icon = categoryIcons[post.category] || MapPin;
        const color = categoryColors[post.category] || "bg-muted";
        const isFav = favoriteIds?.has(post.id);
        const isMobile = post.is_mobile === true;

        // For mobile merchants, use live coordinates if available
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
            <div className="relative cursor-pointer">
              {isMobile ? (
                /* Mobile merchant: fuzzy pulse circle */
                <div className="relative flex items-center justify-center">
                  {/* Outer pulse ring */}
                  <div className="absolute h-12 w-12 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                  {/* Static blur circle */}
                  <div className="absolute h-10 w-10 rounded-full bg-primary/15 backdrop-blur-sm" />
                  {/* Center icon */}
                  <div className={`${color} text-white rounded-full p-2 shadow-lg z-10 ring-2 ring-white/50`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              ) : (
                /* Fixed merchant: standard pin */
                <div className={`${color} text-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform`}>
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

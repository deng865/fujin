import { AdvancedMarker } from "@vis.gl/react-google-maps";
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
        return (
          <AdvancedMarker
            key={post.id}
            position={{ lat: post.latitude, lng: post.longitude }}
            onClick={() => onSelectPost(post)}
          >
            <div className="relative">
              <div className={`${color} text-white rounded-full p-2 shadow-lg cursor-pointer hover:scale-110 transition-transform`}>
                <Icon className="h-4 w-4" />
              </div>
              {isFav && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                  <Heart className="h-2.5 w-2.5 text-destructive fill-destructive" />
                </div>
              )}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

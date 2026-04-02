import { AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, MapPin, Scale, Navigation } from "lucide-react";

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
}

function openNavigation(lat: number, lng: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, "_blank");
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  }
}

export default function PostMarkers({ posts }: PostMarkersProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const navigate = useNavigate();

  return (
    <>
      {posts.map((post) => {
        const Icon = categoryIcons[post.category] || MapPin;
        const color = categoryColors[post.category] || "bg-muted";
        return (
          <AdvancedMarker
            key={post.id}
            position={{ lat: post.latitude, lng: post.longitude }}
            onClick={() => setSelectedPost(post)}
          >
            <div className={`${color} text-white rounded-full p-2 shadow-lg cursor-pointer hover:scale-110 transition-transform`}>
              <Icon className="h-4 w-4" />
            </div>
          </AdvancedMarker>
        );
      })}

      {selectedPost && (
        <InfoWindow
          position={{ lat: selectedPost.latitude, lng: selectedPost.longitude }}
          onCloseClick={() => setSelectedPost(null)}
        >
          <div className="p-2 max-w-[260px]">
            {selectedPost.image_urls?.[0] && (
              <img src={selectedPost.image_urls[0]} alt={selectedPost.title} className="w-full h-28 object-cover rounded-lg mb-2" />
            )}
            <h3 className="font-semibold text-sm mb-1">{selectedPost.title}</h3>
            {selectedPost.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-1">{selectedPost.description}</p>
            )}
            {selectedPost.price != null && (
              <p className="text-sm font-medium text-emerald-600">${selectedPost.price}</p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => navigate(`/post/${selectedPost.id}`)}
                className="flex-1 text-xs text-center py-1.5 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                查看详情
              </button>
              <button
                onClick={() => openNavigation(selectedPost.latitude, selectedPost.longitude)}
                className="flex items-center gap-1 text-xs py-1.5 px-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                <Navigation className="h-3 w-3" />
                导航
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

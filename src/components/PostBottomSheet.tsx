import { Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

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

interface PostBottomSheetProps {
  post: Post | null;
  onClose: () => void;
}

function openNavigation(lat: number, lng: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, "_blank");
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  }
}

export default function PostBottomSheet({ post, onClose }: PostBottomSheetProps) {
  const navigate = useNavigate();

  return (
    <Drawer open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-lg">{post?.title}</DrawerTitle>
          {post?.price != null && (
            <DrawerDescription className="text-base font-semibold text-primary">
              ${post.price}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-3 overflow-y-auto">
          {/* Image */}
          {post.image_urls?.[0] && (
            <img
              src={post.image_urls[0]}
              alt={post.title}
              className="w-full h-48 object-cover rounded-xl"
            />
          )}

          {/* Description */}
          {post.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {post.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { onClose(); navigate(`/post/${post.id}`); }}
              className="flex-1 py-3 text-sm font-semibold text-center bg-accent rounded-xl hover:bg-accent/80 transition-colors active:scale-[0.98]"
            >
              查看详情
            </button>
            <button
              onClick={() => openNavigation(post.latitude, post.longitude)}
              className="flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <Navigation className="h-4 w-4" />
              导航
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

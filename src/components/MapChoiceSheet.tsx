import { MapPin } from "lucide-react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

interface MapChoiceSheetProps {
  open: boolean;
  onClose: () => void;
  appleMapsUrl: string;
  googleMapsUrl: string;
}

export default function MapChoiceSheet({ open, onClose, appleMapsUrl, googleMapsUrl }: MapChoiceSheetProps) {
  const go = (url: string) => {
    window.location.href = url;
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="rounded-t-3xl focus:outline-none">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
        <div className="px-5 pt-4 pb-8 space-y-3">
          <h3 className="text-base font-semibold text-foreground text-center">选择地图应用</h3>
          <button
            onClick={() => go(appleMapsUrl)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-accent text-foreground active:scale-[0.97] transition-transform"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-semibold">Apple 地图</span>
          </button>
          <button
            onClick={() => go(googleMapsUrl)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-accent text-foreground active:scale-[0.97] transition-transform"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold">Google 地图</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

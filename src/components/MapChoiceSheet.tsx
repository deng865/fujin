import { useState, useCallback } from "react";
import { MapPin } from "lucide-react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  buildAppleMapsUrl,
  buildGoogleMapsUrl,
  buildAppleMapsUrlWithQuery,
  buildGoogleMapsUrlWithQuery,
} from "@/lib/mapNavigation";

interface MapChoiceSheetProps {
  open: boolean;
  onClose: () => void;
  appleMapsUrl: string;
  googleMapsUrl: string;
}

function MapChoiceSheet({ open, onClose, appleMapsUrl, googleMapsUrl }: MapChoiceSheetProps) {
  const go = (url: string) => {
    window.location.href = url;
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="rounded-t-3xl focus:outline-none max-h-[90dvh]">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/20 shrink-0" />
        <div
          className="px-5 pt-4 space-y-3 overflow-y-auto"
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        >
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

export default MapChoiceSheet;

/**
 * Hook that manages MapChoiceSheet state.
 * Returns { openMapChoice, MapChoice } where:
 * - openMapChoice(lat, lng) opens the sheet
 * - MapChoice is the JSX element to render
 */
export function useMapChoice() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const openMapChoice = useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
  }, []);

  const close = useCallback(() => setCoords(null), []);

  const MapChoice = coords ? (
    <MapChoiceSheet
      open
      onClose={close}
      appleMapsUrl={buildAppleMapsUrl(coords.lat, coords.lng)}
      googleMapsUrl={buildGoogleMapsUrl(coords.lat, coords.lng)}
    />
  ) : null;

  return { openMapChoice, MapChoice };
}

/**
 * Hook variant for query-based navigation (TripMessage).
 */
export function useMapChoiceWithQuery() {
  const [target, setTarget] = useState<{ query: string; coords: { lat: number; lng: number } | null | undefined } | null>(null);

  const openMapChoiceWithQuery = useCallback((query: string, coords: { lat: number; lng: number } | null | undefined) => {
    setTarget({ query, coords });
  }, []);

  const close = useCallback(() => setTarget(null), []);

  const MapChoice = target ? (
    <MapChoiceSheet
      open
      onClose={close}
      appleMapsUrl={buildAppleMapsUrlWithQuery(target.query, target.coords)}
      googleMapsUrl={buildGoogleMapsUrlWithQuery(target.query, target.coords)}
    />
  ) : null;

  return { openMapChoiceWithQuery, MapChoice };
}

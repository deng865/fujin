import { lazy, Suspense, useEffect, useState } from "react";

const MapHomeContent = lazy(() => import("@/components/map/MapHomeContent"));

function MapHomeFallback() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-muted/20" />

      <div className="absolute top-4 left-4 right-4 z-20 h-12 rounded-2xl border border-border/30 bg-background/90 shadow-xl backdrop-blur-2xl" />

      <div className="absolute top-[72px] left-4 right-4 z-10 flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-9 w-20 shrink-0 rounded-full border border-border/30 bg-background/85 shadow-sm" />
        ))}
      </div>

      <div className="absolute right-4 bottom-44 z-10 flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-11 w-11 rounded-2xl border border-border/30 bg-background/85 shadow-xl backdrop-blur-2xl" />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-[72px] z-20 px-4">
        <div className="rounded-t-2xl border border-border/30 bg-background shadow-xl">
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="space-y-3 px-4 pb-5 pt-1">
            <div className="h-4 w-24 rounded-full bg-muted" />
            <div className="h-20 rounded-2xl bg-muted/60" />
            <div className="h-20 rounded-2xl bg-muted/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapHome() {
  const [shouldMountMap, setShouldMountMap] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShouldMountMap(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!shouldMountMap) {
    return <MapHomeFallback />;
  }

  return (
    <Suspense fallback={<MapHomeFallback />}>
      <MapHomeContent />
    </Suspense>
  );
}

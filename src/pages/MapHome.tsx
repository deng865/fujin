import { lazy, Suspense, useEffect, useState } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const MapHomeContent = lazy(() => lazyWithRetry(() => import("@/components/map/MapHomeContent")));

function MapHomeFallback({ message }: { message?: string }) {
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
            {message ? (
              <div className="rounded-2xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                {message}
              </div>
            ) : (
              <>
                <div className="h-20 rounded-2xl bg-muted/60" />
                <div className="h-20 rounded-2xl bg-muted/40" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export default function MapHome() {
  const [shouldMountMap, setShouldMountMap] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[MapHome] mounted, scheduling Mapbox load");

    // Detect WebGL FIRST. If unavailable in this WKWebView, we never even
    // try to load mapbox-gl (it would crash the renderer).
    const hasWebGL = detectWebGLSupport();
    setWebglAvailable(hasWebGL);
    // eslint-disable-next-line no-console
    console.log("[MapHome] WebGL available:", hasWebGL);

    if (!hasWebGL) return;

    // Wait two animation frames so the React shell paints first, then
    // give the main thread an extra tick before importing the mapbox bundle.
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        timer = window.setTimeout(() => {
          // eslint-disable-next-line no-console
          console.log("[MapHome] mounting MapHomeContent now");
          setShouldMountMap(true);
        }, 250);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, []);

  // WebGL not available → render a static fallback with a "tap to retry" CTA
  if (webglAvailable === false && !forceShow) {
    return (
      <div className="relative flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="text-lg font-semibold">地图暂时不可用</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          当前环境不支持 WebGL。你仍可以浏览列表内容，或点击下方按钮重试加载地图。
        </p>
        <button
          type="button"
          onClick={() => {
            setForceShow(true);
            setShouldMountMap(true);
          }}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow"
        >
          重试加载地图
        </button>
      </div>
    );
  }

  if (!shouldMountMap) {
    return <MapHomeFallback />;
  }

  return (
    <Suspense fallback={<MapHomeFallback />}>
      <MapHomeContent />
    </Suspense>
  );
}

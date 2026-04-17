import { Suspense, lazy, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import AppErrorBoundary from "./AppErrorBoundary";

const GlobalIncomingCallProvider = lazy(() => import("./GlobalIncomingCallProvider"));

const HIDE_NAV_ROUTES = ["/auth", "/reset-password", "/create-post"];

function RouteFallback({ hideNav }: { hideNav: boolean }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col">
        <div className="space-y-3 px-4 pt-4">
          <div className="h-12 rounded-2xl bg-muted animate-pulse" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-9 w-20 shrink-0 rounded-full bg-muted/80 animate-pulse" />
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3 px-4 py-4">
          <div className="h-28 rounded-3xl bg-muted/80 animate-pulse" />
          <div className="h-28 rounded-3xl bg-muted/60 animate-pulse" />
          <div className="h-28 rounded-3xl bg-muted/40 animate-pulse" />
        </div>

        {!hideNav && <div className="h-20 shrink-0" />}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const hideNav = HIDE_NAV_ROUTES.some(r => location.pathname.startsWith(r)) || location.pathname.startsWith("/chat/");
  const [mountGlobals, setMountGlobals] = useState(false);

  useEffect(() => {
    // WKWebView (iOS) does NOT support requestIdleCallback. Always fall back
    // to setTimeout to avoid any chance of throwing on older WebKit builds.
    const w = window as any;
    const ric = typeof w.requestIdleCallback === "function" ? w.requestIdleCallback : null;
    const cic = typeof w.cancelIdleCallback === "function" ? w.cancelIdleCallback : null;

    if (ric && cic) {
      try {
        const id = ric(() => setMountGlobals(true), { timeout: 2500 });
        return () => {
          try { cic(id); } catch { /* noop */ }
        };
      } catch {
        // fallthrough to setTimeout
      }
    }
    const t = window.setTimeout(() => setMountGlobals(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {mountGlobals && (
        <Suspense fallback={null}>
          <GlobalIncomingCallProvider />
        </Suspense>
      )}
      <AppErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<RouteFallback hideNav={hideNav} />}>
          <Outlet />
        </Suspense>
      </AppErrorBoundary>
      {!hideNav && <BottomNav />}
    </>
  );
}

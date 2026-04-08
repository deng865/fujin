import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import GlobalIncomingCallProvider from "./GlobalIncomingCallProvider";

const HIDE_NAV_ROUTES = ["/auth", "/reset-password", "/create-post"];

export default function AppLayout() {
  const location = useLocation();
  const hideNav = HIDE_NAV_ROUTES.some(r => location.pathname.startsWith(r)) || location.pathname.startsWith("/chat/");

  return (
    <>
      <GlobalIncomingCallProvider />
      <Outlet />
      {!hideNav && <BottomNav />}
    </>
  );
}

export const loadMapHome = () => import("../pages/MapHome");
export const loadAuth = () => import("../pages/Auth");
export const loadResetPassword = () => import("../pages/ResetPassword");
export const loadCreatePost = () => import("../pages/CreatePost");
export const loadPostDetail = () => import("../pages/PostDetail");
export const loadFavorites = () => import("../pages/Favorites");
export const loadProfile = () => import("../pages/Profile");
export const loadMessages = () => import("../pages/Messages");
export const loadChatRoom = () => import("../pages/ChatRoom");
export const loadAdminPortal = () => import("../pages/AdminPortal");
export const loadDiscovery = () => import("../pages/Discovery");
export const loadNotFound = () => import("../pages/NotFound");
export const loadPrivacyPolicy = () => import("../pages/PrivacyPolicy");
export const loadTermsOfService = () => import("../pages/TermsOfService");

export function preloadRoute(pathname: string) {
  const normalized = pathname.split("?")[0];

  if (normalized.startsWith("/chat/")) return loadChatRoom();
  if (normalized.startsWith("/post/")) return loadPostDetail();

  switch (normalized) {
    case "/":
      return loadMapHome();
    case "/discovery":
      return loadDiscovery();
    case "/auth":
      return loadAuth();
    case "/reset-password":
      return loadResetPassword();
    case "/create-post":
      return loadCreatePost();
    case "/favorites":
      return loadFavorites();
    case "/profile":
      return loadProfile();
    case "/messages":
      return loadMessages();
    case "/admin":
    case "/admin-portal":
      return loadAdminPortal();
    case "/privacy-policy":
      return loadPrivacyPolicy();
    case "/terms-of-service":
      return loadTermsOfService();
    default:
      return Promise.resolve();
  }
}
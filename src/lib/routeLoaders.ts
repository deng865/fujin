import { lazyWithRetry } from "./lazyWithRetry";

export const loadMapHome = () => lazyWithRetry(() => import("../pages/MapHome"));
export const loadAuth = () => lazyWithRetry(() => import("../pages/Auth"));
export const loadResetPassword = () => lazyWithRetry(() => import("../pages/ResetPassword"));
export const loadCreatePost = () => lazyWithRetry(() => import("../pages/CreatePost"));
export const loadPostDetail = () => lazyWithRetry(() => import("../pages/PostDetail"));
export const loadFavorites = () => lazyWithRetry(() => import("../pages/Favorites"));
export const loadProfile = () => lazyWithRetry(() => import("../pages/Profile"));
export const loadMessages = () => lazyWithRetry(() => import("../pages/Messages"));
export const loadChatRoom = () => lazyWithRetry(() => import("../pages/ChatRoom"));
export const loadAdminPortal = () => lazyWithRetry(() => import("../pages/AdminPortal"));
export const loadDiscovery = () => lazyWithRetry(() => import("../pages/Discovery"));
export const loadNotFound = () => lazyWithRetry(() => import("../pages/NotFound"));
export const loadPrivacyPolicy = () => lazyWithRetry(() => import("../pages/PrivacyPolicy"));
export const loadTermsOfService = () => lazyWithRetry(() => import("../pages/TermsOfService"));

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
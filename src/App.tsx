import { lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import AppLayout from "./components/AppLayout";
import AppErrorBoundary from "./components/AppErrorBoundary";
import MapHome from "./pages/MapHome";
import {
  loadAdminPortal,
  loadAuth,
  loadChatRoom,
  loadCreatePost,
  loadDiscovery,
  loadFavorites,
  loadMessages,
  loadNotFound,
  loadPostDetail,
  loadPrivacyPolicy,
  loadProfile,
  loadResetPassword,
  loadTermsOfService,
} from "./lib/routeLoaders";

const Auth = lazy(loadAuth);
const ResetPassword = lazy(loadResetPassword);
const CreatePost = lazy(loadCreatePost);
const PostDetail = lazy(loadPostDetail);
const Favorites = lazy(loadFavorites);
const Profile = lazy(loadProfile);
const Messages = lazy(loadMessages);
const ChatRoom = lazy(loadChatRoom);
const AdminPortal = lazy(loadAdminPortal);
const Discovery = lazy(loadDiscovery);
const NotFound = lazy(loadNotFound);
const PrivacyPolicy = lazy(loadPrivacyPolicy);
const TermsOfService = lazy(loadTermsOfService);

const queryClient = new QueryClient();

// In native shells (file://) or capacitor:// protocols, BrowserRouter cannot
// resolve deep paths like /messages because there is no server to serve
// index.html. Fall back to HashRouter in those environments.
const isFileProtocol =
  typeof window !== "undefined" &&
  (window.location.protocol === "file:" ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:");
const Router = isFileProtocol ? HashRouter : BrowserRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppErrorBoundary>
          <Router>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<MapHome />} />
                <Route path="/discovery" element={<Discovery />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/chat/:id" element={<ChatRoom />} />
                <Route path="/admin" element={<AdminPortal />} />
                <Route path="/admin-portal" element={<AdminPortal />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </AppErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

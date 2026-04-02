import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapHome from "./pages/MapHome";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import CreatePost from "./pages/CreatePost";
import PostDetail from "./pages/PostDetail";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapHome />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

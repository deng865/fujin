import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("mapbox-gl") || id.includes("react-map-gl")) return "map";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide-react") || id.includes("sonner")) return "ui";
          if (id.includes("date-fns")) return "date";
          if (id.includes("react-router") || id.includes("/react-dom/") || id.includes("/react/")) return "react";
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

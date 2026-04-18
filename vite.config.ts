import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths so the built bundle works under file:// (iOS WKWebView, Capacitor)
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Keep React + all React-dependent libs together to avoid
          // "Cannot read properties of undefined (reading 'createContext')"
          // caused by chunk load order races.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router") ||
            id.includes("scheduler") ||
            id.includes("react-map-gl") ||
            id.includes("@radix-ui") ||
            id.includes("use-sync-external-store")
          ) {
            return "react-vendor";
          }
          if (id.includes("mapbox-gl")) return "mapbox";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("date-fns")) return "date";
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

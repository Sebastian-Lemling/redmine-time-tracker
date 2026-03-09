import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("highlight.js") || id.includes("rehype-highlight")) return "highlight";
          if (
            id.includes("@tiptap/") ||
            id.includes("prosemirror") ||
            id.includes("turndown") ||
            id.includes("marked") ||
            id.includes("react-markdown")
          )
            return "editor";
          if (id.includes("motion") || id.includes("clsx") || id.includes("@dnd-kit/"))
            return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});

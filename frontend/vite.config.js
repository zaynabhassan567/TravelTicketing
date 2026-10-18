import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server runs on http://localhost:5173 (the backend's CORS allows this)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});

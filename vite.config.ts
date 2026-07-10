import { defineConfig } from "vite";

// /api/* geht in der Entwicklung an den lokalen Daten-Proxy (server/server.mjs).
// Im Deployment übernimmt die Serverless Function denselben Pfad.
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});

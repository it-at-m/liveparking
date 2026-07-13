import { defineConfig } from "vite";

// /api/* geht in der Entwicklung an den lokalen Daten-Proxy (server/server.mjs).
// Im Pages-Deployment liest das Frontend stattdessen die statische live.json,
// die der Workflow alle 5 Minuten erneuert.
// base "./" macht den Build pfad-unabhängig (läuft unter /liveparking/ auf Pages).
export default defineConfig({
  base: "./",
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});

// Lokaler Daten-Proxy für die Entwicklung.
//
//   node server/server.mjs        → http://localhost:8787/api/live
//
// Holt die Live-Tabelle von pls-muc-z.com, parst sie und liefert JSON.
// - In-Memory-Cache mit 60 s TTL (schont die Quelle, egal wie viele Clients pollen)
// - Stale-Fallback: ist die Quelle nicht erreichbar, wird der letzte gute
//   Stand mit stale: true ausgeliefert statt eines Fehlers.
// - Kein npm-Paket nötig; läuft ab Node 16 (https statt fetch).

import { createServer } from "node:http";
import { get } from "node:https";
import { parseLiveTable } from "./parser.mjs";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const SOURCE_URL = "https://pls-muc-z.com/pls/info/parkhaus.html";
const CACHE_TTL_MS = 60_000;

let cache = null; // { payload, fetchedAt }

function download(url) {
  return new Promise((resolve, reject) => {
    const req = get(url, { timeout: 10_000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Upstream HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => req.destroy(new Error("Upstream-Timeout")));
    req.on("error", reject);
  });
}

async function getLiveData() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache.payload, stale: false };
  }
  try {
    const html = await download(SOURCE_URL);
    const { parkhaeuser, gesamt } = parseLiveTable(html);
    if (parkhaeuser.length === 0) throw new Error("Parser fand keine Zeilen — Quellformat geändert?");
    const payload = {
      quelle: SOURCE_URL,
      abgerufen: new Date().toISOString(),
      gesamt,
      parkhaeuser,
    };
    cache = { payload, fetchedAt: now };
    return { ...payload, stale: false };
  } catch (err) {
    if (cache) {
      console.warn(`[proxy] Quelle nicht erreichbar (${err.message}) — liefere letzten Stand von ${cache.payload.abgerufen}`);
      return { ...cache.payload, stale: true };
    }
    throw err;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // CORS offen — der Proxy liefert nur öffentliche, unkritische Daten.
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=30",
  };

  if (url.pathname !== "/api/live") {
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: "Not found. Endpoint: /api/live" }));
    return;
  }

  try {
    const data = await getLiveData();
    res.writeHead(200, headers);
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error(`[proxy] Fehler: ${err.message}`);
    res.writeHead(502, headers);
    res.end(JSON.stringify({ error: "Live-Daten derzeit nicht verfügbar" }));
  }
});

server.listen(PORT, () => {
  console.log(`[proxy] läuft auf http://localhost:${PORT}/api/live (Cache-TTL ${CACHE_TTL_MS / 1000}s)`);
});

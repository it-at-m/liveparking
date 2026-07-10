// Erzeugt public/parkhaeuser.json aus den Parkraumwende-Geodaten und
// verifiziert das Matching gegen die Live-Tabelle von pls-muc-z.com.
//
// Aufruf: node scripts/build-geodata.mjs
//
// Hinweis: nutzt curl statt fetch, damit das Skript auch unter Node < 18 läuft.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const GEO_URL = "https://data.parkraumwende.de/data/parkhaeuser.csv";
const LIVE_URL = "https://pls-muc-z.com/pls/info/parkhaus.html";

function download(url) {
  return execFileSync("curl", ["-sL", "--fail", url], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

// --- Geodaten-CSV parsen (keine Kommata in Feldern, daher naives Split) ---
function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, values[i] ?? ""]));
  });
}

// --- Live-Tabelle parsen: <tr> mit 6 <td>-Zellen; darkgrey = Sensor offline ---
function parseLiveTable(html) {
  const rows = [];
  const trRe = /<tr(\s[^>]*)?>([\s\S]*?)<\/tr>/gi;
  for (const m of html.matchAll(trRe)) {
    const aktiv = !/darkgrey/i.test(m[1] ?? "");
    const cells = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, "").trim()
    );
    if (cells.length !== 6 || cells[0] === "S/N") continue;
    rows.push({
      sn: cells[0],
      ph: cells[2],
      name: cells[3],
      frei: Number(cells[4]),
      kap: Number(cells[5]),
      aktiv,
    });
  }
  return rows;
}

const geo = parseCsv(download(GEO_URL));
const live = parseLiveTable(download(LIVE_URL));

// --- Matching über Seriennummer verifizieren ---
const geoSn = new Set(geo.map((g) => g.sn));
const liveSn = new Set(live.map((l) => l.sn));
const onlyGeo = [...geoSn].filter((sn) => !liveSn.has(sn));
const onlyLive = [...liveSn].filter((sn) => !geoSn.has(sn));

console.log(`Geodaten: ${geo.length} Parkhäuser, Live-Tabelle: ${live.length} Zeilen (${liveSn.size} Seriennummern)`);
if (onlyGeo.length) console.warn("Nur in Geodaten:", onlyGeo.join(", "));
if (onlyLive.length) console.warn("Nur in Live-Daten:", onlyLive.join(", "));
if (!onlyGeo.length && !onlyLive.length) console.log("Matching: alle Seriennummern beidseitig vorhanden ✓");

const dupes = live.map((l) => l.sn).filter((sn, i, a) => a.indexOf(sn) !== i);
if (dupes.length) console.log(`Mehrfach-Zeilen in Live-Daten (werden im Proxy summiert): ${[...new Set(dupes)].join(", ")}`);

// --- parkhaeuser.json schreiben (nur statische Felder; kapRef als Fallback) ---
const out = geo
  .map((g) => ({
    sn: g.sn,
    ph: g.ph,
    name: g.name,
    adresse: g.adresse || null,
    lat: Number(g.lat),
    lon: Number(g.lon),
    kapRef: Number(g.kap) || null,
    url: g.url || null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "de"));

for (const p of out) {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || p.lat < 48.1 || p.lat > 48.2 || p.lon < 11.5 || p.lon > 11.65) {
    console.warn(`Koordinaten außerhalb der Innenstadt-Bounds: ${p.name} (${p.lat}, ${p.lon})`);
  }
}

const target = join(ROOT, "public", "parkhaeuser.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Geschrieben: ${target} (${out.length} Einträge)`);

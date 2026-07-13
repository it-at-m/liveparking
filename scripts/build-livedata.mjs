// Erzeugt eine statische live.json für das GitHub-Pages-Deployment.
// Wird vom Pages-Workflow nach dem Build aufgerufen (Cron alle 5 Minuten).
//
// Aufruf: node scripts/build-livedata.mjs [zielpfad]   (Default: dist/live.json)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseLiveTable } from "../server/parser.mjs";

const SOURCE_URL = "https://pls-muc-z.com/pls/info/parkhaus.html";
const ziel = resolve(process.argv[2] ?? "dist/live.json");

const res = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(15_000) });
if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);

const { parkhaeuser, gesamt } = parseLiveTable(await res.text());
if (parkhaeuser.length === 0) throw new Error("Parser fand keine Zeilen – Quellformat geändert?");

const payload = {
  quelle: SOURCE_URL,
  abgerufen: new Date().toISOString(),
  stale: false,
  gesamt,
  parkhaeuser,
};

mkdirSync(dirname(ziel), { recursive: true });
writeFileSync(ziel, JSON.stringify(payload) + "\n", "utf8");
console.log(`Geschrieben: ${ziel} (${parkhaeuser.length} Parkhäuser, ${gesamt.frei} von ${gesamt.kap} frei)`);

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

import type { LiveDaten, LiveEintrag, Standort } from "./types";
import { distanzMeter, distanzText, freiAnzeige, statusFuer } from "./types";
import { aktualisierePanel, oeffnePanel, offenesPanelSn, schliessePanel } from "./panel";
import { renderListe } from "./liste";

const REFRESH_MS = 60_000;
const KARTEN_STIL = "https://tiles.openfreemap.org/styles/positron";
const ZENTRUM: [number, number] = [11.5665, 48.1385];

const mainEl = document.querySelector(".app-main") as HTMLElement;
const statusPill = document.getElementById("status") as HTMLElement;
const statusText = document.getElementById("status-text") as HTMLElement;
const btnKarte = document.getElementById("btn-karte") as HTMLButtonElement;
const btnListe = document.getElementById("btn-liste") as HTMLButtonElement;
const btnLocate = document.getElementById("btn-locate") as HTMLButtonElement;

let standorte: Standort[] = [];
let liveBySn = new Map<string, LiveEintrag>();
let userPos: { lat: number; lon: number } | null = null;
let userMarker: maplibregl.Marker | null = null;

const markerBySn = new Map<string, { el: HTMLElement; standort: Standort }>();

type StatusZustand = "ok" | "warnung" | "fehler";

let dauerStatus: { zustand: StatusZustand; text: string } | null = null;
let statusTimer: ReturnType<typeof setTimeout> | undefined;

function zeigeStatus(zustand: StatusZustand, text: string) {
  statusPill.dataset.zustand = zustand;
  statusText.textContent = text;
}

/** Dauerhafte Statusmeldung (Datenstand, Quellausfall). */
function setzeStatusPill(zustand: StatusZustand, text: string) {
  clearTimeout(statusTimer);
  dauerStatus = { zustand, text };
  zeigeStatus(zustand, text);
}

/** Kurzmeldung (z. B. Standort-Fehler), fällt nach 5 s auf den Datenstand zurück. */
function meldeKurz(zustand: StatusZustand, text: string) {
  clearTimeout(statusTimer);
  zeigeStatus(zustand, text);
  statusTimer = setTimeout(() => {
    if (dauerStatus) zeigeStatus(dauerStatus.zustand, dauerStatus.text);
  }, 5_000);
}

function standortWaehlen(standort: Standort, quelle: HTMLElement, hinweis?: string) {
  oeffnePanel(standort, liveBySn.get(standort.sn), { hinweis, fokusQuelle: quelle });
}

function aktualisiereMarker() {
  for (const { el, standort } of markerBySn.values()) {
    const eintrag = liveBySn.get(standort.sn);
    const status = statusFuer(eintrag);
    el.dataset.status = status;
    el.textContent = status === "offline" ? "–" : String(freiAnzeige(eintrag!));
    el.setAttribute(
      "aria-label",
      status === "offline"
        ? `${standort.name}: keine Live-Daten`
        : `${standort.name}: ${freiAnzeige(eintrag!)} von ${eintrag!.kap} Plätzen frei`
    );
  }
}

function aktualisiereAnsichten() {
  aktualisiereMarker();
  renderListe({
    standorte,
    liveBySn,
    position: userPos,
    onWahl: (standort, quelle) => standortWaehlen(standort, quelle),
  });
  const offenSn = offenesPanelSn();
  if (offenSn) {
    const standort = standorte.find((s) => s.sn === offenSn);
    if (standort) aktualisierePanel(standort, liveBySn.get(offenSn));
  }
}

async function ladeLiveDaten() {
  try {
    const res = await fetch("/api/live");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const daten = (await res.json()) as LiveDaten;
    liveBySn = new Map(daten.parkhaeuser.map((p) => [p.sn, p]));
    aktualisiereAnsichten();

    const stand = new Date(daten.abgerufen).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (daten.stale) {
      setzeStatusPill("warnung", `Quelle nicht erreichbar – letzter Stand ${stand} Uhr`);
    } else {
      setzeStatusPill("ok", `Stand ${stand} Uhr · ${daten.gesamt.frei.toLocaleString("de-DE")} Plätze frei`);
    }
  } catch {
    setzeStatusPill("fehler", "Live-Daten derzeit nicht verfügbar");
  }
}

// ---------- Ansicht Karte/Liste ----------

function setzeAnsicht(ansicht: "karte" | "liste") {
  mainEl.dataset.ansicht = ansicht;
  btnKarte.setAttribute("aria-pressed", String(ansicht === "karte"));
  btnListe.setAttribute("aria-pressed", String(ansicht === "liste"));
  schliessePanel();
}

btnKarte.addEventListener("click", () => setzeAnsicht("karte"));
btnListe.addEventListener("click", () => setzeAnsicht("liste"));

// ---------- Info-Dialog ----------

const infoOverlay = document.getElementById("info-overlay") as HTMLElement;
const btnInfo = document.getElementById("btn-info") as HTMLButtonElement;
const btnInfoSchliessen = document.getElementById("btn-info-schliessen") as HTMLButtonElement;

function oeffneInfo() {
  infoOverlay.hidden = false;
  btnInfoSchliessen.focus();
}

function schliesseInfo() {
  if (infoOverlay.hidden) return;
  infoOverlay.hidden = true;
  btnInfo.focus();
}

btnInfo.addEventListener("click", oeffneInfo);
btnInfoSchliessen.addEventListener("click", schliesseInfo);
infoOverlay.addEventListener("click", (e) => {
  if (e.target === infoOverlay) schliesseInfo();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") schliesseInfo();
});

// ---------- Standort ----------

function zeigeStandort(map: maplibregl.Map) {
  btnLocate.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btnLocate.disabled = false;
      userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };

      if (!userMarker) {
        const punkt = document.createElement("div");
        punkt.className = "user-punkt";
        punkt.setAttribute("aria-label", "Ihr Standort");
        userMarker = new maplibregl.Marker({ element: punkt });
      }
      userMarker.setLngLat([userPos.lon, userPos.lat]).addTo(map);

      // Nächstes Parkhaus mit freien Plätzen und Live-Daten suchen.
      let bester: { standort: Standort; meter: number } | null = null;
      for (const standort of standorte) {
        const eintrag = liveBySn.get(standort.sn);
        if (statusFuer(eintrag) === "offline" || freiAnzeige(eintrag!) === 0) continue;
        const meter = distanzMeter(userPos.lat, userPos.lon, standort.lat, standort.lon);
        if (!bester || meter < bester.meter) bester = { standort, meter };
      }

      aktualisiereAnsichten();

      if (bester) {
        setzeAnsicht("karte");
        map.fitBounds(
          [
            [userPos.lon, userPos.lat],
            [bester.standort.lon, bester.standort.lat],
          ],
          { padding: 90, maxZoom: 16, duration: 800 }
        );
        standortWaehlen(
          bester.standort,
          btnLocate,
          `Nächstes Parkhaus mit freien Plätzen · ${distanzText(bester.meter)} entfernt`
        );
      } else {
        meldeKurz("warnung", "Kein Parkhaus mit freien Plätzen gefunden");
      }
    },
    (err) => {
      btnLocate.disabled = false;
      meldeKurz(
        "warnung",
        err.code === err.PERMISSION_DENIED
          ? "Standortfreigabe abgelehnt"
          : "Standort nicht verfügbar"
      );
    },
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
  );
}

// ---------- Start ----------

async function start() {
  standorte = (await (await fetch("/parkhaeuser.json")).json()) as Standort[];

  const map = new maplibregl.Map({
    container: "map",
    style: KARTEN_STIL,
    center: ZENTRUM,
    zoom: 13.6,
    minZoom: 11,
    maxZoom: 18,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  map.on("click", () => schliessePanel());

  for (const standort of standorte) {
    const el = document.createElement("button");
    el.className = "ph-marker";
    el.type = "button";
    el.dataset.status = "offline";
    el.textContent = "–";
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      standortWaehlen(standort, el);
    });

    new maplibregl.Marker({ element: el })
      .setLngLat([standort.lon, standort.lat])
      .addTo(map);

    markerBySn.set(standort.sn, { el, standort });
  }

  btnLocate.addEventListener("click", () => zeigeStandort(map));

  await ladeLiveDaten();
  setInterval(ladeLiveDaten, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void ladeLiveDaten();
  });
}

void start();

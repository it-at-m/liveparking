import type { LiveEintrag, Standort } from "./types";
import { freiAnzeige, statusFuer } from "./types";
import { routenLinks } from "./routen";

const panelEl = document.getElementById("panel") as HTMLElement;

let offeneSn: string | null = null;
let letzterFokus: HTMLElement | null = null;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (z) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]!
  );
}

function inhalt(standort: Standort, eintrag: LiveEintrag | undefined, hinweis?: string): string {
  const status = statusFuer(eintrag);

  let auslastung: string;
  if (status === "offline") {
    auslastung = `
      <div class="panel-belegung" data-status="offline">
        <span class="belegung-zahl">–</span>
        <span class="belegung-text">Keine Live-Daten – Sensor offline</span>
      </div>`;
  } else {
    const frei = freiAnzeige(eintrag!);
    const prozent = Math.round((frei / eintrag!.kap) * 100);
    auslastung = `
      <div class="panel-belegung" data-status="${status}">
        <span class="belegung-zahl">${frei}</span>
        <span class="belegung-text">von ${eintrag!.kap} Plätzen frei</span>
      </div>
      <div class="belegung-balken" role="img" aria-label="${prozent} Prozent der Plätze frei">
        <span style="width:${prozent}%"></span>
      </div>`;
  }

  const routen = routenLinks(standort)
    .map(
      (r) =>
        `<a class="route-btn" href="${r.url}" target="_blank" rel="noopener noreferrer">${r.name}<span aria-hidden="true"> ↗</span></a>`
    )
    .join("");

  const adresse = standort.adresse
    ? `<p class="panel-adresse">${escapeHtml(standort.adresse)}</p>`
    : "";
  const hinweisHtml = hinweis ? `<p class="panel-hinweis">${escapeHtml(hinweis)}</p>` : "";
  const betreiber = standort.url
    ? `<a class="panel-betreiber" href="${escapeHtml(standort.url)}" target="_blank" rel="noopener noreferrer">Website des Betreibers<span aria-hidden="true"> ↗</span></a>`
    : "";

  return `
    <div class="panel-griff" aria-hidden="true"></div>
    <button class="panel-schliessen" type="button" aria-label="Details schließen">×</button>
    <span class="panel-code">${escapeHtml(standort.ph)}</span>
    <h2 class="panel-name">${escapeHtml(standort.name)}</h2>
    ${adresse}
    ${hinweisHtml}
    ${auslastung}
    <p class="routen-label">Route planen mit</p>
    <div class="routen">${routen}</div>
    ${betreiber}`;
}

export function oeffnePanel(
  standort: Standort,
  eintrag: LiveEintrag | undefined,
  optionen?: { hinweis?: string; fokusQuelle?: HTMLElement }
): void {
  offeneSn = standort.sn;
  if (optionen?.fokusQuelle) letzterFokus = optionen.fokusQuelle;
  panelEl.innerHTML = inhalt(standort, eintrag, optionen?.hinweis);
  panelEl.classList.add("offen");
  panelEl.setAttribute("aria-hidden", "false");
  (panelEl.querySelector(".panel-schliessen") as HTMLElement)?.focus();
}

export function schliessePanel(): void {
  if (!offeneSn) return;
  offeneSn = null;
  panelEl.classList.remove("offen");
  panelEl.setAttribute("aria-hidden", "true");
  letzterFokus?.focus();
  letzterFokus = null;
}

export function offenesPanelSn(): string | null {
  return offeneSn;
}

/** Bei jedem Daten-Refresh aufrufen: aktualisiert ein offenes Panel in place. */
export function aktualisierePanel(standort: Standort, eintrag: LiveEintrag | undefined): void {
  if (offeneSn !== standort.sn) return;
  // Nicht neu rendern, während der Nutzer im Panel navigiert (Fokus-Verlust).
  if (panelEl.contains(document.activeElement) && document.activeElement !== panelEl) return;
  panelEl.innerHTML = inhalt(standort, eintrag);
}

panelEl.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest(".panel-schliessen")) schliessePanel();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") schliessePanel();
});

export interface Standort {
  sn: string;
  ph: string;
  name: string;
  adresse: string | null;
  lat: number;
  lon: number;
  kapRef: number | null;
  url: string | null;
}

export interface LiveEintrag {
  sn: string;
  ph: string;
  name: string;
  frei: number;
  kap: number;
  aktiv: boolean;
}

export interface LiveDaten {
  quelle: string;
  abgerufen: string;
  stale: boolean;
  gesamt: { frei: number; kap: number };
  parkhaeuser: LiveEintrag[];
}

export type Status = "gut" | "knapp" | "voll" | "offline";

export function statusFuer(eintrag: LiveEintrag | undefined): Status {
  if (!eintrag || !eintrag.aktiv || eintrag.kap <= 0) return "offline";
  const quote = eintrag.frei / eintrag.kap;
  if (quote > 0.35) return "gut";
  if (quote > 0.12) return "knapp";
  return "voll";
}

export function freiAnzeige(eintrag: LiveEintrag): number {
  return Math.max(0, Math.min(eintrag.frei, eintrag.kap));
}

const ERDRADIUS_M = 6_371_000;

export function distanzMeter(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * ERDRADIUS_M * Math.asin(Math.sqrt(h));
}

export function distanzText(meter: number): string {
  if (meter < 1000) return `${Math.round(meter)} m`;
  return `${(meter / 1000).toFixed(1).replace(".", ",")} km`;
}

import type { Standort } from "./types";

// Reine Deep-Links ohne SDKs oder Tracking. Ziel sind die Koordinaten,
// nicht die Adresse — das funktioniert auch für Parkhäuser ohne Adresse
// und landet exakt an der Einfahrt.
export function routenLinks(standort: Standort): Array<{ name: string; url: string }> {
  const ziel = `${standort.lat},${standort.lon}`;
  return [
    {
      name: "Google Maps",
      url: `https://www.google.com/maps/dir/?api=1&destination=${ziel}`,
    },
    {
      name: "Apple Maps",
      url: `https://maps.apple.com/?daddr=${ziel}&dirflg=d`,
    },
    {
      name: "Waze",
      url: `https://waze.com/ul?ll=${ziel}&navigate=yes`,
    },
    {
      // Offener Routing-Dienst auf OSRM-Basis (Issue #5); srv=0 = Auto-Profil.
      // Erstes loc = Start (leer, wählt der Nutzer), zweites loc = Ziel.
      name: "OpenStreetMap",
      url: `https://routing.openstreetmap.de/?z=16&center=${encodeURIComponent(ziel)}&loc=&loc=${encodeURIComponent(ziel)}&hl=de&alt=0&srv=0`,
    },
  ];
}

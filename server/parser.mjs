// Parser für die Live-Tabelle von pls-muc-z.com.
// Pures Modul ohne I/O — wird vom lokalen Dev-Server und später
// von der Serverless Function gleichermaßen genutzt.

/**
 * Parst die HTML-Tabelle und normalisiert sie:
 * - bgcolor="darkgrey" markiert Zeilen, deren Sensor offline ist (aktiv: false);
 *   deren Frei/Kap-Werte sind eingefroren oder unplausibel.
 * - Mehrfach-Zeilen mit gleicher Seriennummer (Hauptbahnhof, sn 106525:
 *   Einfahrt Nord P11 + Süd P25) werden zu einem Standort summiert.
 *
 * @param {string} html Rohes HTML der Statusseite
 * @returns {{ parkhaeuser: Array<{sn: string, ph: string, name: string,
 *   frei: number, kap: number, aktiv: boolean}>,
 *   gesamt: {frei: number, kap: number} }}
 */
export function parseLiveTable(html) {
  const bySn = new Map();
  const trRe = /<tr(\s[^>]*)?>([\s\S]*?)<\/tr>/gi;

  for (const m of html.matchAll(trRe)) {
    const aktiv = !/darkgrey/i.test(m[1] ?? "");
    const cells = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, "").trim()
    );
    if (cells.length !== 6 || cells[0] === "S/N") continue;

    const row = {
      sn: cells[0],
      ph: cells[2],
      name: cells[3],
      frei: Number(cells[4]),
      kap: Number(cells[5]),
      aktiv,
    };
    if (!row.sn || !Number.isFinite(row.frei) || !Number.isFinite(row.kap)) continue;

    const prev = bySn.get(row.sn);
    if (prev) {
      prev.frei += row.frei;
      prev.kap += row.kap;
      prev.aktiv = prev.aktiv || row.aktiv;
      prev.ph = `${prev.ph}/${row.ph}`;
    } else {
      bySn.set(row.sn, row);
    }
  }

  const parkhaeuser = [...bySn.values()];
  // Belegung nie negativ / über Kapazität melden; Originalwerte bleiben in frei/kap.
  const gesamt = parkhaeuser
    .filter((p) => p.aktiv && p.kap > 0)
    .reduce(
      (acc, p) => ({
        frei: acc.frei + Math.min(Math.max(p.frei, 0), p.kap),
        kap: acc.kap + p.kap,
      }),
      { frei: 0, kap: 0 }
    );

  return { parkhaeuser, gesamt };
}

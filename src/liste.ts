import type { LiveEintrag, Standort } from "./types";
import { distanzMeter, distanzText, freiAnzeige, statusFuer } from "./types";

const listeEl = document.getElementById("liste") as HTMLElement;

export interface ListenKontext {
  standorte: Standort[];
  liveBySn: Map<string, LiveEintrag>;
  position: { lat: number; lon: number } | null;
  onWahl: (standort: Standort, quelle: HTMLElement) => void;
}

export function renderListe(ctx: ListenKontext): void {
  const sortiert = [...ctx.standorte].sort((a, b) => {
    const ea = ctx.liveBySn.get(a.sn);
    const eb = ctx.liveBySn.get(b.sn);
    const fa = statusFuer(ea) === "offline" ? -1 : freiAnzeige(ea!);
    const fb = statusFuer(eb) === "offline" ? -1 : freiAnzeige(eb!);
    return fb - fa;
  });

  listeEl.replaceChildren(
    ...sortiert.map((standort) => {
      const eintrag = ctx.liveBySn.get(standort.sn);
      const status = statusFuer(eintrag);

      const zeile = document.createElement("button");
      zeile.type = "button";
      zeile.className = "ph-zeile";
      zeile.dataset.status = status;

      const links = document.createElement("span");
      links.className = "zeile-links";
      const name = document.createElement("span");
      name.className = "zeile-name";
      name.textContent = standort.name;
      const detail = document.createElement("span");
      detail.className = "zeile-detail";
      const teile: string[] = [];
      if (standort.adresse) teile.push(standort.adresse);
      if (ctx.position) {
        teile.push(
          distanzText(distanzMeter(ctx.position.lat, ctx.position.lon, standort.lat, standort.lon)) +
            " entfernt"
        );
      }
      detail.textContent = teile.join(" · ");
      links.append(name, detail);

      const rechts = document.createElement("span");
      rechts.className = "zeile-rechts";
      if (status === "offline") {
        rechts.innerHTML = `<span class="zeile-frei">–</span><span class="zeile-kap">keine Live-Daten</span>`;
        zeile.setAttribute("aria-label", `${standort.name}: keine Live-Daten`);
      } else {
        const frei = freiAnzeige(eintrag!);
        rechts.innerHTML = `<span class="zeile-frei">${frei}</span><span class="zeile-kap">von ${eintrag!.kap} frei</span>`;
        zeile.setAttribute("aria-label", `${standort.name}: ${frei} von ${eintrag!.kap} Plätzen frei`);
      }

      zeile.append(links, rechts);
      zeile.addEventListener("click", () => ctx.onWahl(standort, zeile));
      return zeile;
    })
  );
}

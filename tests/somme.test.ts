import { describe, expect, it } from "vitest";
import { lireCsv } from "../scripts/csv";
import { chargerCartes } from "../scripts/import-cartes";

const fichier = (nom: string) => lireCsv(`content/dataset-v18/kiffeurs-${nom}-v18.csv`);
const events = fichier("events");

describe("correction canonique de la bataille de la Somme", () => {
  it("reprend la convention de Verdun sans modifier le libellé ni les autres faits", () => {
    const somme = events.find((e) => e.event_id === "EVT-0210")!;
    const verdun = events.find((e) => e.event_id === "EVT-0482")!;
    expect(somme).toMatchObject({
      title_canonical: "bataille de la Somme", event_type: "EVENT", date_text: "1er juillet - 18 novembre 1916",
      start_year: "1916", start_month: "7", start_day: "1", end_year: "1916", end_month: "11", end_day: "18",
      precision: "DAY_RANGE", date_status: "EXACT", playable: "TRUE", playable_mode: "RANGE",
      playable_reason: "Jouable comme plage/période.", importance: "4", difficulty: "3",
    });
    for (const champ of ["event_type", "precision", "date_status", "playable_mode"])
      expect(somme[champ]).toBe(verdun[champ]);
    expect(events).toHaveLength(2001);
  });

  it("synchronise gameplay, collections et tags de type/mode", () => {
    const gameplay = fichier("gameplay").find((e) => e.event_id === "EVT-0210")!;
    expect(gameplay).toMatchObject({ playable_mode: "RANGE", precision: "DAY_RANGE", date_status: "EXACT", rule_note: "Jouable comme plage/période." });
    for (const nom of ["collection-events", "ready-collection-events"]) {
      const lignes = fichier(nom).filter((e) => e.event_id === "EVT-0210");
      expect(lignes).toHaveLength(nom === "collection-events" ? 9 : 4);
      expect(lignes.every((e) => e.playable_mode === "RANGE")).toBe(true);
    }
    const tags = fichier("event-tags").filter((e) => e.event_id === "EVT-0210").map((e) => e.tag_id);
    expect(tags).toContain("TAG-0067");
    expect(tags).toContain("TAG-0069");
    expect(tags).not.toContain("TAG-0064");
    expect(tags).not.toContain("TAG-0071");
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("conserve les 325 cartes, copie la plage complète et garde l’ordre de la Somme", () => {
    const cartes = chargerCartes();
    expect(cartes).toHaveLength(325);
    expect(new Set(cartes.map((c) => c.chapter_id)).size).toBe(41);
    expect(cartes.find((c) => c.card_id === "CARD-027-somme-guerre-usure")).toMatchObject({
      chapter_id: "THM-027", event_id: "EVT-0210", start_year: 1916, start_month: 7, start_day: 1,
      end_year: 1916, end_month: 11, end_day: 18, date_precision: "DAY_RANGE", date_status: "EXACT",
      date_text: "1er juillet - 18 novembre 1916", sort_order: 4,
      title: "La Somme illustre la guerre d’usure industrielle",
    });
  });
});

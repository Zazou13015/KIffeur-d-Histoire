import { describe, expect, it } from "vitest";
import { lireCsv } from "../scripts/csv";
import { chargerCartes, estUrlLocale, FICHIER_CARTES, importerCartesLocales, validerCartes } from "../scripts/import-cartes";

const fichier = (nom: string) => lireCsv(`content/dataset-v18/kiffeurs-${nom}-v18.csv`);
const events = fichier("events"), themes = fichier("themes"), liens = fichier("curriculum-links");
const lignes = lireCsv(FICHIER_CARTES);
const valider = (rows = lignes) => validerCartes(rows, events, themes, liens);
const changer = (id: string, modifications: Record<string, string>) => lignes.map((l) => l.card_id === id ? { ...l, ...modifications } : l);
const invalides: Record<string, string>[] = [
  { event_id: "EVT-INCONNU" }, { chapter_id: "THM-INCONNU" }, { event_id: "EVT-0024" },
  { official_wording: "programme inventé" }, { start_year: "-750" }, { start_month: "4" },
  { start_day: "21" }, { date_text: "une date vague" }, { date_precision: "YEAR" },
  { date_status: "EXACT" }, { body: "" }, { body: "mot ".repeat(121) }, { title: "" },
  { takeaway: "" }, { key_concepts: "" }, { key_concepts: "mythe;mythe" }, { sources: "" },
  { sort_order: "0" }, { sort_order: "2" }, { sort_order: "1.5" },
  { body: "En 1789, " + lignes[0].body }, { start_year: "0" },
];

describe("lot pédagogique v18", () => {
  it("ne parle pas de dataset, programme ou décisions techniques aux élèves", () => {
    for (const carte of chargerCartes()) {
      expect(`${carte.body} ${carte.takeaway}`).not.toMatch(/dataset|programme|éduscol|v18/i);
    }
  });
  it("ne rédige que deux chapitres collège et deux lycée, avec 5–12 cartes complètes", () => {
    const cartes = chargerCartes();
    expect(events).toHaveLength(2001);
    expect(cartes).toHaveLength(37);
    const ids = [...new Set(cartes.map((c) => c.chapter_id))];
    expect(ids).toEqual(["THM-005", "THM-016", "THM-020", "THM-028"]);
    expect(ids.map((id) => themes.find((t) => t.theme_id === id)!.level))
      .toEqual(["6e", "3e", "Seconde générale et technologique", "Terminale générale"]);
    expect(ids.map((id) => cartes.filter((c) => c.chapter_id === id).length)).toEqual([8, 12, 8, 9]);
    expect(new Set(cartes.map((c) => c.card_id)).size).toBe(cartes.length);
  });

  it("préserve toutes les composantes de date, les statuts et les périodes sans fausse année", () => {
    const cartes = valider();
    expect(cartes.find((c) => c.card_id === "CARD-005-rome"))
      .toMatchObject({ start_year: -753, start_month: 4, start_day: 21, date_status: "TRADITIONAL" });
    expect(cartes.find((c) => c.card_id === "CARD-005-jerusalem"))
      .toMatchObject({ start_year: -587, end_year: -586, date_status: "DISPUTED" });
    expect(cartes.find((c) => c.card_id === "CARD-020-circumnavigation"))
      .toMatchObject({ start_year: 1519, start_month: 9, start_day: 20, end_year: 1522, end_month: 9, end_day: 6 });
    expect(cartes.find((c) => c.card_id === "CARD-020-plantations"))
      .toMatchObject({ start_year: null, date_precision: "PERIOD_TEXT" });
    expect(cartes.find((c) => c.card_id === "CARD-016-nazisme"))
      .toMatchObject({ event_id: null, start_year: 1933, end_year: 1945, date_precision: "YEAR_RANGE" });
    for (const carte of cartes.filter((c) => c.event_id)) {
      const e = events.find((e) => e.event_id === carte.event_id)!;
      for (const champ of ["start_year", "start_month", "start_day", "end_year", "end_month", "end_day"] as const)
        expect(carte[champ]).toBe(e[champ] ? Number(e[champ]) : null);
      expect(carte.date_text).toBe(e.date_text);
    }
  });

  it.each(invalides)("refuse un champ incohérent avant écriture : %j", (modifications) => {
    expect(() => valider(changer(lignes[0].card_id, modifications))).toThrow();
  });

  it("refuse doublons, chapitres incomplets, ordre inversé et contexte inventé", () => {
    expect(() => valider([...lignes, lignes[0]])).toThrow();
    expect(() => valider(lignes.filter((l) => l.chapter_id !== "THM-005" || Number(l.sort_order) < 5))).toThrow();
    const swapped = lignes.map((l) => l.card_id === "CARD-028-munich" ? { ...l, sort_order: "8" } :
      l.card_id === "CARD-028-pogrom" ? { ...l, sort_order: "7" } : l);
    expect(() => valider(swapped)).toThrow(/chronologique/);
    expect(() => valider(changer("CARD-016-nazisme", { end_year: "1944" }))).toThrow(/période/);
    expect(() => valider([])).toThrow();
  });

  it("bloque tout import de cartes distant avant la requête RPC", async () => {
    for (const url of ["https://example.invalid", "https://localhost.example.invalid", "http://example.invalid/127.0.0.1"])
      expect(estUrlLocale(url)).toBe(false);
    for (const url of ["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321"])
      expect(estUrlLocale(url)).toBe(true);
    await expect(importerCartesLocales(valider(), "https://example.invalid", "cle-fictive")).rejects.toThrow(/LOCAL/);
  });
});

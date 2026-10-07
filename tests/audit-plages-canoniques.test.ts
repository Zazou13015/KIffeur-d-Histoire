import { describe, expect, it } from "vitest";
import { auditerPlagesCanoniques } from "../scripts/audit-plages-canoniques";
import { lireCsv, type LigneCsv } from "../scripts/csv";

const point = (date_text: string, modifications: LigneCsv = {}): LigneCsv => ({
  event_id: "EVT-TEST", date_text, start_year: "1916", start_month: "11", start_day: "18",
  end_year: "", end_month: "", end_day: "", precision: "DAY", date_status: "EXACT",
  ...modifications,
});

describe("audit des plages textuelles du canon", () => {
  it.each([
    "1er juillet - 18 novembre 1916", "1er juillet–18 novembre 1916",
    "du 1er juillet 1916 au 18 novembre 1916", "1er-18 novembre 1916",
    "juillet à novembre 1916", "1914-1918", "entre 1914 et 1918",
  ])("signale une plage explicite réduite à un point : %s", (texte) => {
    expect(auditerPlagesCanoniques([point(texte)])).toHaveLength(1);
  });

  it.each([
    "18 novembre 1916", "1916-11-18", "22 juillet 1954 à 24 h (heure de Genève)",
    "15 juillet 1099 ; siège 7 juin-15 juillet", "30 mars 1862 à Bruxelles ; 3 avril 1862 à Paris",
    "vers 2560 av. J.-C. ; le début du chantier est estimé entre 2600 et 2550 av. J.-C.",
    "1799-1814/1815", "1914 ou 1918", "206 av. J.-C.", "XXe siècle",
  ])("ne confond pas point, heure, date secondaire ou ambiguïté avec une plage : %s", (texte) => {
    expect(auditerPlagesCanoniques([point(texte)])).toEqual([]);
  });

  it("accepte une plage structurée et une période sans point numérique", () => {
    const plage = point("1er juillet - 18 novembre 1916");
    expect(auditerPlagesCanoniques([
      { ...plage, start_month: "7", start_day: "1", end_year: "1916", end_month: "11", end_day: "18", precision: "DAY_RANGE" },
      { ...plage, precision: "PERIOD_TEXT", start_year: "", start_month: "", start_day: "" },
    ])).toEqual([]);
  });

  it("ne détecte plus d’anomalie après correction, mais retrouve la régression de la Somme", () => {
    const evenements = lireCsv("content/dataset-v18/kiffeurs-events-v18.csv");
    const avant = JSON.stringify(evenements);
    const anomalies = auditerPlagesCanoniques(evenements);
    expect(anomalies).toEqual([]);
    const regression = evenements.map((e) => e.event_id === "EVT-0210" ? {
      ...e, start_month: "11", start_day: "18", end_year: "", end_month: "", end_day: "", precision: "DAY",
    } : e);
    expect(auditerPlagesCanoniques(regression).map((e) => e.event_id)).toEqual(["EVT-0210"]);
    expect(JSON.stringify(evenements)).toBe(avant);
  });
});

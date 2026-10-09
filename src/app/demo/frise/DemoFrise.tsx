"use client";

import { useMemo, useState } from "react";
import { Frise } from "@/components/frise/Frise";
import { Bouton } from "@/components/ui/Bouton";
import { formatHistoricDate, type HistoricDate, type Precision } from "@/lib/game/dates";
import type { MarqueurFrise } from "@/lib/game/marqueurs";

// Les 10 événements jouables de supabase/seed.sql. En vrai jeu, les dates ne sont jamais envoyées au navigateur
// avant la réponse : cette page de démonstration n'est pas un écran de jeu.
const EVENEMENTS: MarqueurFrise[] = [
  { id: "EVT-0024", titre: "Fondation de Rome", date: { year: -753, month: 4, day: 21 }, motif: "colonne" },
  { id: "EVT-0044", titre: "Couronnement de Charlemagne", date: { year: 800, month: 12, day: 25 }, motif: "couronne" },
  { id: "EVT-0048", titre: "Traité de Verdun", date: { year: 843, month: 8 }, motif: "parchemin" },
  { id: "EVT-0414", titre: "Bible de Gutenberg", date: { year: 1455 }, motif: "plume" },
  { id: "EVT-0063", titre: "Colomb à Guanahaní", date: { year: 1492, month: 10, day: 12 }, motif: "caravelle" },
  { id: "EVT-0173", titre: "Prise de la Bastille", date: { year: 1789, month: 7, day: 14 }, motif: "bastille" },
  { id: "EVT-0175", titre: "Déclaration des droits", date: { year: 1789, month: 8, day: 26 }, motif: "parchemin" },
  { id: "EVT-0012", titre: "Première Guerre mondiale", date: { year: 1914, month: 7, day: 28 }, motif: "casque" },
  { id: "EVT-0014", titre: "Appel du 18 juin", date: { year: 1940, month: 6, day: 18 }, motif: "journal" },
  { id: "EVT-0118", titre: "Traités de Rome", date: { year: 1957, month: 3, day: 25 }, motif: "cocarde" },
];

const PRECISIONS: { p: Precision; libelle: string }[] = [
  { p: "annee", libelle: "Année" },
  { p: "mois", libelle: "Mois" },
  { p: "jour", libelle: "Jour" },
];

// 200 marqueurs pour éprouver la fluidité et le regroupement.
const BEAUCOUP: MarqueurFrise[] = Array.from({ length: 200 }, (_, i) => ({
  id: `test-${i}`,
  titre: `Événement ${i + 1}`,
  date: { year: -3000 + Math.round((i * 5000) / 200) },
  motif: ["biface", "pyramide", "donjon", "caravelle", "locomotive"][i % 5],
}));

type Reglage = "dix" | "deux-cents" | "reponse";

export function DemoFrise() {
  const [reglage, setReglage] = useState<Reglage>("dix");
  const [precision, setPrecision] = useState<Precision>("annee");
  const [reponse, setReponse] = useState<HistoricDate | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null);

  const marqueurs = useMemo(() => {
    if (reglage === "reponse") return undefined;
    const base = reglage === "dix" ? EVENEMENTS : BEAUCOUP;
    return base.map((m) => (m.id === choisi ? { ...m, etat: "actif" as const } : m));
  }, [reglage, choisi]);

  const evenementChoisi = EVENEMENTS.find((m) => m.id === choisi);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Bouton variante={reglage === "dix" ? "primaire" : "secondaire"} onClick={() => setReglage("dix")}>
          10 événements
        </Bouton>
        <Bouton variante={reglage === "deux-cents" ? "primaire" : "secondaire"} onClick={() => setReglage("deux-cents")}>
          200 marqueurs
        </Bouton>
        <Bouton variante={reglage === "reponse" ? "primaire" : "secondaire"} onClick={() => setReglage("reponse")}>
          Mode réponse
        </Bouton>
      </div>

      {reglage === "reponse" && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Précision demandée">
          {PRECISIONS.map(({ p, libelle }) => (
            <Bouton
              key={p}
              variante={precision === p ? "primaire" : "secondaire"}
              aria-pressed={precision === p}
              onClick={() => {
                setPrecision(p);
                setReponse(null);
              }}
            >
              {libelle}
            </Bouton>
          ))}
        </div>
      )}

      <Frise
        key={`${reglage}-${precision}`}
        precision={reglage === "reponse" ? precision : "jour"}
        mode={reglage === "reponse" ? "selection" : "lecture"}
        marqueurs={marqueurs}
        onMarqueur={setChoisi}
        reponse={reglage === "reponse" ? reponse : null}
        onReponse={setReponse}
      />

      <p className="m-0 min-h-6 text-encre-douce" role="status">
        {reglage === "reponse" &&
          (reponse ? `Date posée : ${formatHistoricDate(reponse, precision)}` : "Cliquez ou tapez sur la frise pour poser une date.")}
        {reglage === "dix" &&
          (evenementChoisi
            ? `${evenementChoisi.titre} : ${formatHistoricDate(evenementChoisi.date, "jour")}`
            : "Touchez une carte pour voir sa date.")}
        {reglage === "deux-cents" && "Zoomez : les groupes se séparent à mesure que la place le permet."}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Frise } from "@/components/frise/Frise";
import { SaisieClavier } from "@/components/saisie/SaisieClavier";
import { Bouton } from "@/components/ui/Bouton";
import { formatHistoricDate, type HistoricDate, type Precision } from "@/lib/game/dates";

const PRECISIONS: { p: Precision; libelle: string }[] = [
  { p: "annee", libelle: "Facile · année" },
  { p: "mois", libelle: "Moyen · mois" },
  { p: "jour", libelle: "Difficile · jour" },
];

export function DemoSaisie() {
  const [precision, setPrecision] = useState<Precision>("jour");
  const [reponse, setReponse] = useState<HistoricDate | null>(null);
  const [origine, setOrigine] = useState("");

  function donner(d: HistoricDate, par: string) {
    setReponse(d);
    setOrigine(par);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulté">
        {PRECISIONS.map(({ p, libelle }) => (
          <Bouton
            key={p}
            variante={precision === p ? "primaire" : "secondaire"}
            aria-pressed={precision === p}
            onClick={() => {
              setPrecision(p);
              setReponse(null);
              setOrigine("");
            }}
          >
            {libelle}
          </Bouton>
        ))}
      </div>

      <SaisieClavier key={`clavier-${precision}`} precision={precision} onAnswer={(d) => donner(d, "le clavier")} />

      <Frise key={`frise-${precision}`} precision={precision} mode="selection" reponse={reponse} onReponse={(d) => donner(d, "la frise")} />

      <p className="m-0 min-h-6 text-encre-douce" role="status">
        {reponse ? (
          <>
            Réponse donnée par {origine} : <b className="date text-xl text-encre">{formatHistoricDate(reponse, precision)}</b>
          </>
        ) : (
          "Aucune réponse pour l'instant."
        )}
      </p>
    </div>
  );
}

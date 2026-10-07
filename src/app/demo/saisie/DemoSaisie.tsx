"use client";

import { useState } from "react";
import { SaisieCalendrier } from "@/components/saisie/SaisieCalendrier";
import { SaisieClavier } from "@/components/saisie/SaisieClavier";
import { Bouton } from "@/components/ui/Bouton";
import { formatHistoricDate, type HistoricDate, type Precision } from "@/lib/game/dates";

const PRECISIONS: { p: Precision; libelle: string }[] = [
  { p: "annee", libelle: "Facile · année" },
  { p: "mois", libelle: "Moyen · mois" },
  { p: "jour", libelle: "Difficile · jour" },
];

type Methode = "clavier" | "calendrier";

export function DemoSaisie() {
  const [precision, setPrecision] = useState<Precision>("jour");
  const [methode, setMethode] = useState<Methode>("clavier");
  const [reponse, setReponse] = useState<HistoricDate | null>(null);

  function donner(d: HistoricDate) {
    setReponse(d);
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
            }}
          >
            {libelle}
          </Bouton>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Méthode de saisie">
        <Bouton variante={methode === "clavier" ? "primaire" : "secondaire"} aria-pressed={methode === "clavier"} onClick={() => setMethode("clavier")}>
          Au clavier
        </Bouton>
        <Bouton variante={methode === "calendrier" ? "primaire" : "secondaire"} aria-pressed={methode === "calendrier"} onClick={() => setMethode("calendrier")}>
          Au calendrier
        </Bouton>
      </div>

      {methode === "clavier" ? (
        <SaisieClavier key={`clavier-${precision}`} precision={precision} onAnswer={donner} />
      ) : (
        <SaisieCalendrier key={`calendrier-${precision}`} precision={precision} onAnswer={donner} />
      )}

      <p className="m-0 min-h-6 text-encre-douce" role="status">
        {reponse ? (
          <>
            Réponse envoyée : <b className="date text-xl text-encre">{formatHistoricDate(reponse, precision)}</b>
          </>
        ) : (
          "Aucune réponse pour l'instant."
        )}
      </p>
    </div>
  );
}

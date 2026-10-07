"use client";

import { useState } from "react";
import { Frise } from "@/components/frise/Frise";
import { useVue } from "@/components/frise/useVue";
import { SaisieDate } from "@/components/partie/SaisieDate";
import { useSaisieFrise } from "@/components/saisie/useSaisieFrise";
import { Bouton } from "@/components/ui/Bouton";
import { formatHistoricDate, type Precision } from "@/lib/game/dates";

const PRECISIONS: { p: Precision; libelle: string }[] = [
  { p: "annee", libelle: "Facile · année" },
  { p: "mois", libelle: "Moyen · mois" },
  { p: "jour", libelle: "Difficile · jour" },
];

export function DemoSaisie() {
  const [precision, setPrecision] = useState<Precision>("jour");
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulté">
        {PRECISIONS.map(({ p, libelle }) => (
          <Bouton key={p} variante={precision === p ? "primaire" : "secondaire"} aria-pressed={precision === p} onClick={() => setPrecision(p)}>
            {libelle}
          </Bouton>
        ))}
      </div>
      {/* Une clé par précision : changer de difficulté repart d'une saisie vide. */}
      <Essai key={precision} precision={precision} />
    </div>
  );
}

function Essai({ precision }: { precision: Precision }) {
  const controle = useVue(precision);
  const saisie = useSaisieFrise(precision, controle);
  const { reponse } = saisie;

  return (
    <>
      <div className="max-w-md"><SaisieDate
        precision={precision}
        champs={saisie.champs}
        onChange={saisie.changerChamps}
        onFocusChange={saisie.setEnSaisie}
        onValider={() => {}}
        verrouille={false}
      /></div>
      <Frise
        precision={precision}
        controle={controle}
        reponse={reponse}
        onReponse={saisie.poserSurFrise}
        enSaisie={saisie.enSaisie}
      />
      <p className="m-0 min-h-6 text-encre-douce" role="status">
        {reponse ? (
          <>
            Réponse : <b className="date text-xl text-encre">{formatHistoricDate(reponse, precision)}</b>
            {saisie.complete ? "" : " (cases à compléter)"}
          </>
        ) : (
          "Aucune réponse pour l'instant."
        )}
      </p>
    </>
  );
}

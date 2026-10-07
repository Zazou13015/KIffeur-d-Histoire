"use client";

import { useId, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { formatHistoricDate, type HistoricDate, type Precision } from "@/lib/game/dates";
import { lireDate } from "@/lib/game/saisie";

type Props = {
  precision: Precision;
  onAnswer: (date: HistoricDate) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

const EXEMPLES: Record<Precision, string> = {
  annee: "1789 ou 44 av. J.-C.",
  mois: "07/1789 ou juillet 1789",
  jour: "14/07/1789 ou 14 juillet 1789",
};

const CONSIGNES: Record<Precision, string> = {
  annee: "l'année",
  mois: "le mois et l'année",
  jour: "le jour, le mois et l'année",
};

// Un seul champ pour taper la date comme on l'écrit. On montre en direct comment elle est comprise.
export function SaisieClavier({ precision, onAnswer, disabled = false, autoFocus = false }: Props) {
  const [texte, setTexte] = useState("");
  const [essai, setEssai] = useState(false);
  const idChamp = useId();
  const idAide = useId();
  const idRetour = useId();
  const lecture = texte.trim() ? lireDate(texte, precision) : null;

  function valider() {
    setEssai(true);
    if (lecture?.ok) onAnswer(lecture.date);
  }

  // L'erreur n'apparaît qu'après un essai de validation : pas de reproche pendant qu'on tape.
  const erreur = essai && !texte.trim() ? "Tapez une date." : essai && lecture && !lecture.ok ? lecture.erreur : null;

  return (
    <form
      className="grid gap-2 border border-filet bg-papier p-3"
      onSubmit={(e) => {
        e.preventDefault();
        valider();
      }}
    >
      <label htmlFor={idChamp} className="text-[13px] text-encre-douce">
        Tapez la date : {CONSIGNES[precision]}
      </label>
      <div className="flex flex-wrap items-stretch gap-2">
        <input
          id={idChamp}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          disabled={disabled}
          value={texte}
          placeholder={EXEMPLES[precision]}
          aria-describedby={`${idAide} ${idRetour}`}
          aria-invalid={erreur ? true : undefined}
          onChange={(e) => {
            setTexte(e.target.value);
            setEssai(false);
          }}
          className="date cible min-w-0 flex-1 basis-48 border border-filet border-b-2 border-b-encre bg-blanc-cartel px-3 py-1 text-3xl leading-none text-oxyde placeholder:text-base placeholder:font-normal placeholder:text-encre-douce focus:shadow-focus focus:outline-none disabled:opacity-70"
        />
        <Bouton type="submit" disabled={disabled}>
          Valider
        </Bouton>
      </div>
      <p id={idRetour} role="status" className="m-0 min-h-6 text-[15px]">
        {erreur ? (
          <span className="text-oxyde">{erreur}</span>
        ) : lecture?.ok ? (
          <span className="text-encre-douce">
            Je comprends : <b className="date text-xl text-encre">{formatHistoricDate(lecture.date, precision)}</b>
          </span>
        ) : null}
      </p>
      <p id={idAide} className="m-0 text-xs text-encre-douce">
        Exemples : {EXEMPLES[precision]}. « - » devant l&apos;année ou « av. J.-C. » pour avant Jésus-Christ. Entrée pour valider.
      </p>
    </form>
  );
}

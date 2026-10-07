"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  ouverte: boolean;
  onFermer: () => void;
  titre: string;
  children: ReactNode;
  /** Boutons du bas (ex. Confirmer / Annuler). */
  actions?: ReactNode;
};

// Balise <dialog> native : le clavier (Échap, Tab piégé dans la fenêtre) et le lecteur d'écran sont gérés par le navigateur.
export function Modale({ ouverte, onFermer, titre, children, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitre = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    if (!ouverte && d.open) d.close();
  }, [ouverte]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitre}
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
      onClick={(e) => {
        // Un clic sur le fond (le <dialog> lui-même) ferme la fenêtre.
        if (e.target === ref.current) onFermer();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg border border-encre bg-blanc-cartel p-0 text-encre shadow-cartel backdrop:bg-encre/60"
    >
      <div className="grid gap-4 p-5">
        <h2 id={idTitre} className="text-2xl leading-tight">
          {titre}
        </h2>
        <div className="text-[15px] text-encre-douce">{children}</div>
        {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </dialog>
  );
}

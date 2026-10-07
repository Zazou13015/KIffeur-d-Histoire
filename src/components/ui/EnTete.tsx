import Link from "next/link";
import type { ReactNode } from "react";
import { Sceau } from "@/components/charte/Sceau";

// En-tête commun : logo à gauche, zone de connexion à droite.
export function EnTete({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-filet bg-papier">
      <div className="conteneur flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 text-sm">
        <Link href="/" className="cible flex items-center gap-2.5" aria-label="Kiffeurs d'Histoire, accueil">
          <Sceau taille={36} />
          <span className="font-titre text-lg leading-none">
            Kiffeurs <span className="text-laiton">d&apos;</span>Histoire
          </span>
        </Link>
        {children}
      </div>
    </header>
  );
}

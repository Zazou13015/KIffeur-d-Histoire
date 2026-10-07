import type { ReactNode } from "react";

type Ton = "neutre" | "laiton" | "oxyde" | "sauge";

// Fond léger + texte encre : lisible en clair comme en sombre, et l'information
// est toujours dans le texte, jamais dans la couleur seule.
const TONS: Record<Ton, string> = {
  neutre: "border-filet bg-papier text-encre",
  laiton: "border-laiton bg-laiton-clair text-encre",
  oxyde: "border-oxyde bg-fond-resultat text-oxyde",
  sauge: "border-sauge bg-vert-de-gris text-encre",
};

export function Badge({ ton = "neutre", children }: { ton?: Ton; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-mono text-[11px] uppercase leading-tight tracking-[0.08em] ${TONS[ton]}`}
    >
      {children}
    </span>
  );
}

export type Difficulte = "facile" | "moyen" | "difficile";

const DIFFICULTES: Record<Difficulte, { libelle: string; ton: Ton }> = {
  facile: { libelle: "Facile", ton: "sauge" },
  moyen: { libelle: "Moyen", ton: "laiton" },
  difficile: { libelle: "Difficile", ton: "oxyde" },
};

export function BadgeDifficulte({ niveau }: { niveau: Difficulte }) {
  const { libelle, ton } = DIFFICULTES[niveau];
  return <Badge ton={ton}>{libelle}</Badge>;
}

/** Niveau scolaire : « CM1 », « 5e », « Terminale »… */
export function BadgeNiveau({ niveau }: { niveau: string }) {
  return <Badge ton="neutre">{niveau}</Badge>;
}

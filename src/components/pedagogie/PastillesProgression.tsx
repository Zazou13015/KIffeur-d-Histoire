import { Badge } from "@/components/ui/Badge";
import { pourcentage } from "@/lib/profil/types";
import { LIBELLE_DIFFICULTE, type ProgressionChapitre } from "@/lib/progression/types";

// L'état est toujours écrit en toutes lettres (jamais la couleur seule).
export function PastillesProgression({ progression }: { progression?: ProgressionChapitre }) {
  if (!progression || (!progression.decouvert && progression.precision == null)) return null;
  return <span className="flex flex-wrap gap-1.5">
    {progression.decouvert && <Badge ton="sauge">Découvert</Badge>}
    {progression.precision != null && <Badge ton="laiton">
      Meilleur test : {pourcentage(progression.precision)}{progression.difficulte ? ` · ${LIBELLE_DIFFICULTE[progression.difficulte]}` : ""}
    </Badge>}
  </span>;
}

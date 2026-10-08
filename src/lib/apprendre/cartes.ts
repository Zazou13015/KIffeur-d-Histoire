import type { CartePedagogique } from "@/lib/pedagogie";

// Projection propre à /apprendre : le serveur décide, aucun lien interne n'est transmis.
export type CarteApprendre = CartePedagogique & { illustrationDediee: boolean };

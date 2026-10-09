"use server";

import type { Progression } from "@/lib/progression/types";
import { enregistrerTest, lireProgressionJoueur, marquerDecouvert, type EnregistrementTest } from "@/lib/progression/serveur";

// Server Actions (POST, jamais mises en cache) : la page /apprendre reste statique et anonyme,
// la progression personnelle arrive après coup, sous l'identité de la session.
// Les erreurs ne détaillent rien : le navigateur retombe sur la progression de la session.

/** null = visiteur sans compte. */
export async function lireProgression(): Promise<Progression | null> {
  try { return await lireProgressionJoueur(); } catch { return null; }
}

/** true = enregistré dans le compte ; false = pas de compte (ou indisponible) : garder dans la session. */
export async function marquerChapitreDecouvert(chapitre: string): Promise<boolean> {
  try { return await marquerDecouvert(chapitre); } catch { return false; }
}

export async function enregistrerTestChapitre(partie: string): Promise<EnregistrementTest & { erreur?: true }> {
  try { return await enregistrerTest(partie); } catch { return { connecte: true, erreur: true }; }
}

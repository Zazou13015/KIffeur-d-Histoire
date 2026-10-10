"use server";

import { changerQuestion } from "@/lib/admin-packs/serveur";
import type { PackActionResult } from "@/lib/admin-packs/types";

// Chaque appel est de nouveau autorisé en SQL : la page n'est pas une permission.
export async function modifierQuestion(packId: string, eventId: string, removed: boolean, reason = ""): Promise<PackActionResult> {
  if (typeof packId !== "string" || !packId || packId.length > 100
    || typeof eventId !== "string" || !eventId || eventId.length > 100
    || typeof removed !== "boolean" || typeof reason !== "string" || reason.length > 1000) {
    return { ok: false, message: "Choix invalide ou motif trop long (1 000 caractères maximum)." };
  }
  try {
    const data = await changerQuestion(packId, eventId, removed, reason);
    if (!data) return { ok: false, message: "Accès réservé aux administrateurs. Reconnectez-vous si nécessaire." };
    return { ok: true, data };
  } catch {
    return { ok: false, message: "La modification n’a pas pu être confirmée. Réessayez : l’action ne sera pas enregistrée deux fois." };
  }
}

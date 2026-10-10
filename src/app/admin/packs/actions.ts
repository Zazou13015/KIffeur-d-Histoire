"use server";

import { changerQuestion, chargerHistoriqueEvenement, corrigerEvenement, EditorialConflictError } from "@/lib/admin-packs/serveur";
import type { EditorialActionResult, HistoryActionResult, PackActionResult } from "@/lib/admin-packs/types";

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

export async function enregistrerCorrection(packId: string, eventId: string, title: string, niveau: number,
  reason: string, expectedTitle: string, expectedNiveau: number): Promise<EditorialActionResult> {
  if (typeof packId !== "string" || !packId || packId.length > 100
    || typeof eventId !== "string" || !eventId || eventId.length > 100
    || typeof title !== "string" || !title.trim() || title.trim().length > 500 || /[\u0000-\u001f\u007f]/.test(title)
    || !Number.isInteger(niveau) || niveau < 1 || niveau > 3
    || typeof reason !== "string" || reason.length > 1000
    || typeof expectedTitle !== "string" || !Number.isInteger(expectedNiveau) || expectedNiveau < 1 || expectedNiveau > 3) {
    return { ok: false, message: "Vérifiez le titre (1 à 500 caractères), le niveau et le motif (1 000 caractères maximum)." };
  }
  try {
    const data = await corrigerEvenement(packId, eventId, title, niveau, reason, expectedTitle, expectedNiveau);
    if (!data) return { ok: false, message: "Accès réservé aux administrateurs. Reconnectez-vous si nécessaire." };
    return { ok: true, data };
  } catch (error) {
    if (error instanceof EditorialConflictError) return { ok: false, conflict: true, message: error.message };
    return { ok: false, message: "La correction n’a pas pu être confirmée. Réessayez pour vérifier son enregistrement." };
  }
}

export async function consulterHistorique(eventId: string): Promise<HistoryActionResult> {
  if (typeof eventId !== "string" || !eventId || eventId.length > 100) return { ok: false, message: "Question invalide." };
  try {
    const history = await chargerHistoriqueEvenement(eventId);
    if (!history) return { ok: false, message: "Accès réservé aux administrateurs." };
    return { ok: true, history };
  } catch {
    return { ok: false, message: "L’historique est momentanément indisponible. Réessayez." };
  }
}

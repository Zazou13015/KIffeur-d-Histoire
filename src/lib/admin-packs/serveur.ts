import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdminPack, EditorialChange, EditorialResult, PackChange, PackQuestion } from "./types";

const INDISPONIBLE = "La gestion des packs est momentanément indisponible. Réessayez.";
export class EditorialConflictError extends Error {}

// Même autorisation SQL que les indicateurs. Aucun cache partagé de données privées.
async function appeler<T>(rpc: string, params?: Record<string, string | number | null>): Promise<T | null> {
  try {
    const client = await createClient({ noStore: true });
    const { data, error } = await client.schema("histoire").rpc(rpc, params);
    if (error?.code === "42501") return null;
    if (error?.code === "40001") throw new EditorialConflictError("Cette question a été modifiée dans un autre onglet. Rechargez la page avant de reprendre la correction.");
    if (error || data == null) throw new Error(INDISPONIBLE);
    return data as T;
  } catch (error) {
    if (error instanceof EditorialConflictError) throw error;
    // Les erreurs réseau, SQL et PostgREST ne quittent pas le serveur.
    throw new Error(INDISPONIBLE);
  }
}

export async function chargerPacks(): Promise<AdminPack[] | null> {
  return appeler<AdminPack[]>("admin_list_packs");
}

export async function chargerQuestions(packId: string): Promise<PackQuestion[] | null> {
  return appeler<PackQuestion[]>("admin_pack_questions", { p_pack_id: packId });
}

export async function changerQuestion(packId: string, eventId: string, removed: boolean, reason: string): Promise<PackChange | null> {
  return appeler<PackChange>(removed ? "admin_remove_pack_event" : "admin_restore_pack_event", {
    p_pack_id: packId, p_event_id: eventId, p_reason: reason.trim() || null,
  });
}

export async function corrigerEvenement(packId: string, eventId: string, title: string, niveau: number,
  reason: string, expectedTitle: string, expectedNiveau: number): Promise<EditorialResult | null> {
  return appeler<EditorialResult>("admin_edit_event", {
    p_pack_id: packId, p_event_id: eventId, p_title: title.trim(), p_niveau: niveau,
    p_reason: reason.trim() || null, p_expected_title: expectedTitle, p_expected_niveau: expectedNiveau,
  });
}

export async function chargerHistoriqueEvenement(eventId: string): Promise<EditorialChange[] | null> {
  return appeler<EditorialChange[]>("admin_event_history", { p_event_id: eventId });
}

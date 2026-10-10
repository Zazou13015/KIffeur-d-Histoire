import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdminPack, PackChange, PackQuestion } from "./types";

const INDISPONIBLE = "La gestion des packs est momentanément indisponible. Réessayez.";

// Même autorisation SQL que les indicateurs. Aucun cache partagé de données privées.
async function appeler<T>(rpc: string, params?: Record<string, string | null>): Promise<T | null> {
  try {
    const client = await createClient({ noStore: true });
    const { data, error } = await client.schema("histoire").rpc(rpc, params);
    if (error?.code === "42501") return null;
    if (error || data == null) throw new Error(INDISPONIBLE);
    return data as T;
  } catch {
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

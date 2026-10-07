import "server-only";
import { cartePublique, type CartePedagogique } from "@/lib/pedagogie";

// Client de contenu anonyme, sans cookie ni clé service_role. La RPC STABLE
// permet un GET mis en cache dans le Data Cache Next (clé : URL du chapitre).
export async function chargerCartesChapitre(id: string): Promise<CartePedagogique[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Contenu pédagogique momentanément indisponible.");
  const reponse = await fetch(`${url}/rest/v1/rpc/get_chapter_cards?p_chapter_id=${encodeURIComponent(id)}`, {
    headers: { apikey: key, "Accept-Profile": "histoire" },
    next: { revalidate: 3600, tags: ["cartes-pedagogiques", `chapitre-${id}`] },
    signal: AbortSignal.timeout(15000),
  });
  // Ne jamais transférer le message ou les en-têtes d'erreur Supabase.
  if (!reponse.ok) throw new Error("Contenu pédagogique momentanément indisponible.");
  const cartes: CartePedagogique[] = await reponse.json();
  if (!Array.isArray(cartes) || cartes.some((c) => c.chapter_id !== id)) throw new Error("Contenu pédagogique momentanément indisponible.");
  return cartes.map(cartePublique).sort((a, b) => a.sort_order - b.sort_order);
}

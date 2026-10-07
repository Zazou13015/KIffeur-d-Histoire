import { NextResponse } from "next/server";
import { completeAuthCallback } from "@/lib/authCallback";
import { connexionPath, safeNextPath } from "@/lib/authRedirect";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { accountDestination } from "@/lib/account";
import { completePendingProfile } from "@/lib/pendingProfile";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let destination = connexionPath(safeNextPath(url.searchParams.get("next")));
  if (isSupabaseConfigured) {
    try {
      const client = await createClient();
      const next = await completeAuthCallback(client, url);
      await completePendingProfile(client);
      destination = await accountDestination(client, next);
      if (/^\/partie\/[0-9a-f-]{36}$/.test(destination)) {
        destination = `/auth/retour?next=${encodeURIComponent(destination)}`;
      }
    } catch {
      // Ne pas exposer les détails du fournisseur, le code ou la session.
    }
  }
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

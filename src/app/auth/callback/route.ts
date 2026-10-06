import { NextResponse } from "next/server";
import { completeAuthCallback } from "@/lib/authCallback";
import { connexionPath, safeNextPath } from "@/lib/authRedirect";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let destination = connexionPath(safeNextPath(url.searchParams.get("next")));
  if (isSupabaseConfigured) {
    try {
      destination = await completeAuthCallback(await createClient(), url);
    } catch {
      // Ne pas exposer les détails du fournisseur, le code ou la session.
    }
  }
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

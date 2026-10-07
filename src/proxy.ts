import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Démo de relecture autonome : pas de lecture/rafraîchissement de session.
  if (request.nextUrl.pathname === "/demo/pedagogie") return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    // Toutes les pages, sauf les fichiers statiques et les images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

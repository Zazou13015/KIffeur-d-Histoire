import { illustrationCarte } from "@/lib/apprendre/illustration-serveur";

export async function GET(_request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  let svg: string | null;
  try { svg = illustrationCarte(cardId); }
  catch { return new Response(null, { status: 503 }); }
  if (!svg) return new Response(null, { status: 404 });
  // Aucun header upstream, redirect, JSON, nom de fichier ou identifiant EVT.
  return new Response(svg, { headers: {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  } });
}

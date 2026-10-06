import type { SupabaseClient } from "@supabase/supabase-js";

const internalOrigin = "https://histoire.invalid";

// Valide aussi les encodages successifs et les chemins normalisés (../).
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return "/";
  try {
    let decoded = value;
    for (let depth = 0; depth < 8; depth++) {
      if (!decoded.startsWith("/") || decoded.includes("//") || decoded.includes("\\") || /[\u0000-\u0020\u007f]/.test(decoded)) return "/";
      const url = new URL(decoded, internalOrigin);
      const pathname = url.pathname.toLowerCase();
      if (url.origin !== internalOrigin || pathname.includes("//") || /^\/(?:connexion|login|auth)(?:\/|$)/.test(pathname)) return "/";
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) {
        const destination = new URL(value, internalOrigin);
        return `${destination.pathname}${destination.search}${destination.hash}`;
      }
      decoded = nextDecoded;
    }
  } catch {
    // Encodage invalide : revenir à l'accueil.
  }
  return "/";
}

export function connexionPath(next: string): string {
  const params = new URLSearchParams({ erreur: "oauth", next: safeNextPath(next) });
  return `/connexion?${params}`;
}

export function authCallbackUrl(origin: string, next: string): string {
  const callback = new URL("/auth/callback", origin);
  const destination = safeNextPath(next);
  if (destination !== "/") callback.searchParams.set("next", destination);
  return callback.toString();
}

export async function signInWithGoogle(client: SupabaseClient, origin: string, next: string): Promise<boolean> {
  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl(origin, next) },
    });
    return !error;
  } catch {
    return false;
  }
}

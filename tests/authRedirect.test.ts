import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { authCallbackUrl, safeNextPath, signInWithGoogle } from "@/lib/authRedirect";

export const unsafePaths = [
  null, undefined, "", "https://evil.example", "//evil.example", "javascript:alert(1)",
  "apercu", "/\\evil.example", "/%2f%2fevil.example", "/%5cevil.example",
  "/%252f%252fevil.example", "/%255cevil.example", "/\nevil.example", "/%09/evil.example",
  "/%00evil.example", "/%7fevil.example", "/%", "/connexion", "/connexion?next=/apercu",
  "/connexion/", "/login", "/auth/callback", "/auth/callback/", "/auth/other",
  "/%63onnexion", "/%2563onnexion", "/AUTH/callback", "/foo/../connexion",
  "/foo/../auth/callback", "/foo/..//evil.example", "/.%2e/auth/callback", "/auth%2fcallback",
];

describe("destinations internes de connexion", () => {
  it.each(unsafePaths)("refuse %s", (path) => expect(safeNextPath(path)).toBe("/"));
  it.each(["/", "/apercu", "/apercu?mode=solo#partie", "/chapitres/%C3%A9poque"])("conserve %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });
  it("normalise un chemin interne avec ..", () => {
    expect(safeNextPath("/chapitres/../apercu")).toBe("/apercu");
  });
  it("limite le décodage imbriqué", () => {
    const deeplyEncoded = "/" + "%" + "25".repeat(9) + "63onnexion";
    expect(safeNextPath(deeplyEncoded)).toBe("/");
  });
});

describe("départ Google", () => {
  it("utilise le callback de l'origine Histoire et conserve next", () => {
    const callback = new URL(authCallbackUrl("https://k-iffeur-d-histoire.vercel.app", "/apercu?mode=solo#partie"));
    expect(callback.origin).toBe("https://k-iffeur-d-histoire.vercel.app");
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("next")).toBe("/apercu?mode=solo#partie");
    expect(authCallbackUrl("http://localhost:3000", "//evil.example")).toBe("http://localhost:3000/auth/callback");
  });
  it("demande le fournisseur google avec redirectTo, sans permissions supplémentaires", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { signInWithOAuth } } as unknown as SupabaseClient;
    expect(await signInWithGoogle(client, "https://histoire.example", "/apercu")).toBe(true);
    expect(signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
      provider: "google", options: { redirectTo: "https://histoire.example/auth/callback?next=%2Fapercu" },
    });
  });
  it("signale un échec Supabase ou réseau", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValueOnce({ error: new Error("refus") }).mockRejectedValueOnce(new Error("réseau"));
    const client = { auth: { signInWithOAuth } } as unknown as SupabaseClient;
    expect(await signInWithGoogle(client, "https://histoire.example", "/")).toBe(false);
    expect(await signInWithGoogle(client, "https://histoire.example", "/")).toBe(false);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeAuthCallback } from "@/lib/authCallback";
vi.mock("@/lib/account", () => ({ accountDestination: async (_client: unknown, next: string) => next }));
vi.mock("@/lib/pendingProfile", () => ({ completePendingProfile: vi.fn() }));
import { GET } from "@/app/auth/callback/route";

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), configured: true }));
vi.mock("@/lib/supabase/config", () => ({ get isSupabaseConfigured() { return mocks.configured; } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }) }));

beforeEach(() => {
  mocks.configured = true;
  mocks.exchange.mockReset().mockResolvedValue({ data: { session: { user: { id: "test-player" } } }, error: null });
});

describe("callback PKCE", () => {
  const client = { auth: { exchangeCodeForSession: mocks.exchange } } as unknown as SupabaseClient;
  it("échange le code une seule fois et renvoie next", async () => {
    expect(await completeAuthCallback(client, new URL("https://histoire.example/auth/callback?code=test-code&next=%2Fapercu"))).toBe("/apercu");
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("test-code");
  });
  it.each(["", "?error=access_denied&code=test-code", "?error_code=refused", "?code="])("refuse un callback incomplet ou une erreur %s", async (query) => {
    await expect(completeAuthCallback(client, new URL(`https://histoire.example/auth/callback${query}`))).rejects.toThrow();
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it.each([
    { data: { session: null }, error: null },
    { data: { session: null }, error: new Error("expired") },
  ])("refuse un échange sans session valide", async (result) => {
    mocks.exchange.mockResolvedValue(result);
    await expect(completeAuthCallback(client, new URL("https://histoire.example/auth/callback?code=test-code"))).rejects.toThrow();
  });
});

describe("route /auth/callback", () => {
  it("termine la navigation OAuth avant le retour à la partie pour retrouver le cookie Strict", async () => {
    const response = await GET(new Request("https://histoire.example/auth/callback?code=test-code&next=%2Fpartie%2F00000000-0000-0000-0000-000000000024"));
    expect(response.headers.get("location")).toBe("https://histoire.example/auth/retour?next=%2Fpartie%2F00000000-0000-0000-0000-000000000024");
  });
  it("reste sur Histoire, conserve next et interdit la mise en cache", async () => {
    const response = await GET(new Request("https://histoire.example/auth/callback?code=test-code&next=%2Fapercu%3Fmode%3Dsolo%23partie", {
      headers: { "x-forwarded-host": "evil.example" },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://histoire.example/apercu?mode=solo#partie");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it.each(["//evil.example", "https://evil.example", "/%5cevil.example", "/auth/callback", "/connexion", "/%2563onnexion"])("renvoie à l'accueil pour next=%s", async (next) => {
    const params = new URLSearchParams({ code: "test-code", next });
    const response = await GET(new Request(`https://histoire.example/auth/callback?${params}`));
    expect(response.headers.get("location")).toBe("https://histoire.example/");
  });
  it("revient à la connexion avec next sans exposer l'erreur fournisseur", async () => {
    const response = await GET(new Request("https://histoire.example/auth/callback?error=access_denied&error_description=private-message&next=%2Fapercu"));
    expect(response.headers.get("location")).toBe("https://histoire.example/connexion?erreur=oauth&next=%2Fapercu");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("permet de réessayer si le code a expiré ou que le réseau échoue", async () => {
    mocks.exchange.mockRejectedValue(new Error("private-message"));
    const response = await GET(new Request("https://histoire.example/auth/callback?code=test-code&next=//evil.example"));
    expect(response.headers.get("location")).toBe("https://histoire.example/connexion?erreur=oauth&next=%2F");
  });
  it("gère Supabase non configuré", async () => {
    mocks.configured = false;
    const response = await GET(new Request("https://histoire.example/auth/callback?code=test-code"));
    expect(response.headers.get("location")).toContain("/connexion?erreur=oauth");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
});

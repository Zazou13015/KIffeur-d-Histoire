import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";

const mocks = vi.hoisted(() => ({ values: new Map<string, string>(), set: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: true }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  getAll: () => [...mocks.values].map(([name, value]) => ({ name, value })),
  get: (name: string) => mocks.values.has(name) ? { value: mocks.values.get(name) } : undefined,
  delete: (name: string) => mocks.values.delete(name),
  set: mocks.set,
}) }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://histoire-test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-only-publishable-key");
  mocks.values.clear();
  mocks.set.mockReset().mockImplementation((name: string, value: string) => mocks.values.set(name, value));
  // Données fictives exclusivement locales : aucun jeton issu de Supabase.
  const verifier = `base64-${Buffer.from(JSON.stringify("test-only-pkce-verifier")).toString("base64url")}`;
  mocks.values.set("sb-histoire-test-auth-token-code-verifier", verifier);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("échange le code avec le vrai client SSR et écrit les cookies avant le retour Histoire", async () => {
  const user = { id: "test-player", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} };
  const fetchMock = vi.fn(async (url: string) => {
    const body = url.includes("/auth/v1/user") ? user : url.includes("/rpc/ensure_player") ? null
      : url.includes("/profiles?") ? { username: "Pseudo Contrée" } : {
    access_token: "test-only-access-token", refresh_token: "test-only-refresh-token",
    token_type: "bearer", expires_in: 3600,
    user,
  };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);

  const response = await GET(new Request("https://histoire.example/auth/callback?code=test-only-code&next=%2Fapercu"));
  expect(response.headers.get("location")).toBe("https://histoire.example/apercu");
  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(fetchMock.mock.calls[1][0]).toContain("/auth/v1/user");
  expect(fetchMock.mock.calls[2][0]).toContain("/rpc/ensure_player");
  expect(fetchMock.mock.calls[3][0]).toContain("/profiles?select=username&id=eq.test-player");
  const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://histoire-test.supabase.co/auth/v1/token?grant_type=pkce");
  expect(JSON.parse(options.body as string)).toMatchObject({ auth_code: "test-only-code", code_verifier: "test-only-pkce-verifier" });
  expect(mocks.set).toHaveBeenCalled();
  const session = mocks.values.get("sb-histoire-test-auth-token");
  expect(session).toBeTruthy();
  const stored = JSON.parse(Buffer.from(session!.slice("base64-".length), "base64url").toString());
  expect(stored.user.id).toBe("test-player");
  expect(stored.access_token).toBe("test-only-access-token");
  expect(mocks.values.get("sb-histoire-test-auth-token-code-verifier")).toBe("");
});

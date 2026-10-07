import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { register, requestPasswordReset, resetPassword, updateUsername } from "@/app/compte/actions";
import { signIn } from "@/app/connexion/actions";
import { completePendingProfile } from "@/lib/pendingProfile";
import { createClient } from "@/lib/supabase/server";

const userA = "00000000-0000-4000-8000-00000000000a";
const userB = "00000000-0000-4000-8000-00000000000b";
const mocks = vi.hoisted(() => ({ signup: vi.fn(), signin: vi.fn(), reset: vi.fn(), update: vi.fn(), user: vi.fn(), taken: vi.fn(), save: vi.fn(), profile: vi.fn(), set: vi.fn(), remove: vi.fn(), pending: "", revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: {
  signUp: mocks.signup, signInWithPassword: mocks.signin, resetPasswordForEmail: mocks.reset, updateUser: mocks.update, getUser: mocks.user,
} }) }));
vi.mock("next/headers", () => ({
  headers: async () => new Map([["origin","https://histoire.example"],["host","histoire.example"]]),
  cookies: async () => ({ get: () => mocks.pending ? { value: mocks.pending } : undefined, set: mocks.set, delete: mocks.remove }),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/profiles", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/profiles")>(), isUsernameTaken: mocks.taken, saveProfileUsername: mocks.save, getProfileUsername: mocks.profile }));
vi.mock("@/lib/account", () => ({ accountDestination: async (_client: unknown, next: string) => next }));
const form = (extra: Record<string,string> = {}) => {
  const result = new FormData();
  for (const [key,value] of Object.entries({ username: " Pseudo\t KFFR ", email: "joueur@example.test", password: "password-local", confirmation: "password-local", next: "/partie/00000000-0000-0000-0000-000000000024", ...extra })) result.set(key,value);
  return result;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.pending = "";
  mocks.set.mockImplementation((_name: string, value: string) => { mocks.pending = value; });
  mocks.remove.mockImplementation(() => { mocks.pending = ""; });
  mocks.taken.mockResolvedValue(false);
  mocks.signup.mockResolvedValue({ data: { user: { id: userA }, session: null }, error: null });
  mocks.signin.mockResolvedValue({ error: null });
  mocks.profile.mockResolvedValue(null);
  mocks.save.mockResolvedValue({ error: null });
  mocks.reset.mockResolvedValue({ error: null });
  mocks.user.mockResolvedValue({ data: { user: { id: userA } }, error: null });
  mocks.update.mockResolvedValue({ error: null });
});
afterEach(() => { vi.unstubAllEnvs(); });
it("inscription : pseudo nettoyé, unicité, mot de passe envoyé uniquement à Auth", async () => {
  const state = await register({},form());
  expect(state.message).toContain("confirmation");
  expect(mocks.taken.mock.calls[0][1]).toBe("Pseudo KFFR");
  expect(mocks.signup).toHaveBeenCalledExactlyOnceWith({ email: "joueur@example.test", password: "password-local", options: { emailRedirectTo: "https://histoire.example/auth/callback?next=%2Fpartie%2F00000000-0000-0000-0000-000000000024" } });
  expect(mocks.set).toHaveBeenCalledExactlyOnceWith("histoire-pending-username", JSON.stringify({ userId: userA, username: "Pseudo KFFR" }), {
    httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 86400,
  });
  expect(JSON.stringify(state)).not.toContain("password-local");
  expect(mocks.save).not.toHaveBeenCalled();
});
it("inscription sans confirmation termine le profil comme utilisateur connecté et conserve next", async () => {
  mocks.signup.mockResolvedValue({ data: { user: { id: userA }, session: {} }, error: null });
  await expect(register({},form())).rejects.toThrow("redirect:/partie/");
  expect(mocks.profile).toHaveBeenCalledWith(expect.anything(), userA);
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(expect.anything(), "Pseudo KFFR");
  expect(mocks.pending).toBe("");
});
it("inscription A, connexion B sans pseudo, puis confirmation A : l'intention reste réservée à A", async () => {
  await register({}, form());
  const pendingA = mocks.pending;
  expect(JSON.parse(pendingA)).toEqual({ userId: userA, username: "Pseudo KFFR" });
  const client = await createClient();
  mocks.user.mockResolvedValue({ data: { user: { id: userB } }, error: null });
  await expect(signIn(form({ email: "b@example.test" }))).rejects.toThrow("redirect:/partie/");
  expect(mocks.profile).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.pending).toBe(pendingA);
  mocks.user.mockResolvedValue({ data: { user: { id: userA } }, error: null });
  await completePendingProfile(client);
  expect(mocks.profile).toHaveBeenCalledExactlyOnceWith(client, userA);
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(client, "Pseudo KFFR");
  expect(mocks.pending).toBe("");
});
it("B choisit son propre pseudo sans supprimer l'intention en attente pour A", async () => {
  await register({}, form());
  const pendingA = mocks.pending;
  mocks.user.mockResolvedValue({ data: { user: { id: userB } }, error: null });
  await expect(updateUsername({}, form({ username: "Pseudo B" }))).rejects.toThrow("redirect:/partie/");
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(expect.anything(), "Pseudo B");
  expect(mocks.pending).toBe(pendingA);
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("le cookie ne contient que l'UUID et le pseudo, même si Auth renvoie une session avec secrets", async () => {
  mocks.signup.mockResolvedValue({ data: { user: { id: userA, email: "joueur@example.test" }, session: { access_token: "access-secret", refresh_token: "refresh-secret" } }, error: null });
  await expect(register({}, form())).rejects.toThrow("redirect:/partie/");
  const serialized = mocks.set.mock.calls[0][1];
  expect(JSON.parse(serialized)).toEqual({ userId: userA, username: "Pseudo KFFR" });
  expect(serialized).not.toMatch(/password-local|access-secret|refresh-secret|joueur@example/);
});
it("Auth sans identifiant utilisateur ne crée jamais d'intention non liée", async () => {
  mocks.signup.mockResolvedValue({ data: { user: null, session: null }, error: null });
  expect((await register({}, form())).message).toContain("confirmation");
  expect(mocks.set).not.toHaveBeenCalled();
});
it("en production l'intention conserve toutes les protections du cookie", async () => {
  vi.stubEnv("NODE_ENV", "production");
  await register({}, form());
  expect(mocks.set).toHaveBeenCalledWith("histoire-pending-username", expect.any(String), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 86400,
  });
});
it("pseudo pris : aucun compte créé ; pseudo invalide : aucun accès Auth", async () => {
  mocks.taken.mockResolvedValue(true);
  expect(await register({},form())).toEqual({ error: "Ce pseudo est déjà pris." });
  expect((await register({},form({ username: "" }))).error).toContain("pseudo");
  expect(mocks.signup).not.toHaveBeenCalled();
});
it("un échec ne reflète pas les détails Auth ni le mot de passe", async () => {
  mocks.signup.mockResolvedValue({ error: { message: "private-secret" } });
  expect(JSON.stringify(await register({},form()))).not.toMatch(/private-secret|password-local/);
  expect(mocks.set).not.toHaveBeenCalled();
});
it("la confirmation du mot de passe est vérifiée avant toute écriture", async () => {
  expect((await register({},form({ confirmation: "different" }))).error).toContain("correspondent");
  expect((await resetPassword({},form({ password: "x", confirmation: "x" }))).error).toContain("6 caractères");
  expect(mocks.signup).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it("le profil ignore les identifiants fournis, invalide l'en-tête et valide next", async () => {
  mocks.profile.mockResolvedValue("Pseudo KFFR");
  await expect(updateUsername({},form({ id: "foreign", user_id: "foreign", next: "//evil.example" }))).rejects.toThrow("redirect:/");
  expect(mocks.save.mock.calls[0][1]).toBe(" Pseudo\t KFFR ");
  expect(mocks.save.mock.calls[0]).toHaveLength(2);
  expect(mocks.revalidate).toHaveBeenCalledExactlyOnceWith("/","layout");
});
it("mot de passe oublié : callback sécurisé et réponse indépendante de l'existence du compte", async () => {
  expect((await requestPasswordReset({},form())).message).toContain("Si ce compte existe");
  expect(mocks.reset).toHaveBeenCalledExactlyOnceWith("joueur@example.test", { redirectTo: "https://histoire.example/auth/callback?next=%2Fnouveau-mot-de-passe" });
});
it("reset exige un utilisateur vérifié avant updateUser", async () => {
  mocks.user.mockResolvedValueOnce({ data: { user: null }, error: null });
  expect((await resetPassword({},form())).error).toContain("expiré");
  expect(mocks.update).not.toHaveBeenCalled();
  expect((await resetPassword({},form())).message).toContain("deux jeux");
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ password: "password-local" });
});

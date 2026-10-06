import { beforeEach, expect, it, vi } from "vitest";
import { register, requestPasswordReset, resetPassword, updateUsername } from "@/app/compte/actions";

const mocks = vi.hoisted(() => ({ signup: vi.fn(), reset: vi.fn(), update: vi.fn(), user: vi.fn(), taken: vi.fn(), save: vi.fn(), set: vi.fn(), remove: vi.fn(), pending: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: {
  signUp: mocks.signup, resetPasswordForEmail: mocks.reset, updateUser: mocks.update, getUser: mocks.user,
} }) }));
vi.mock("next/headers", () => ({
  headers: async () => new Map([["origin","https://histoire.example"],["host","histoire.example"]]),
  cookies: async () => ({ set: mocks.set, delete: mocks.remove }),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/profiles", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/profiles")>(), isUsernameTaken: mocks.taken, saveProfileUsername: mocks.save }));
vi.mock("@/lib/pendingProfile", () => ({ completePendingProfile: mocks.pending }));
vi.mock("@/lib/account", () => ({ accountDestination: async (_client: unknown, next: string) => next }));
const form = (extra: Record<string,string> = {}) => {
  const result = new FormData();
  for (const [key,value] of Object.entries({ username: " Pseudo\t KFFR ", email: "joueur@example.test", password: "password-local", confirmation: "password-local", next: "/partie/00000000-0000-0000-0000-000000000024", ...extra })) result.set(key,value);
  return result;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.taken.mockResolvedValue(false);
  mocks.signup.mockResolvedValue({ data: { session: null }, error: null });
  mocks.save.mockResolvedValue({ error: null });
  mocks.reset.mockResolvedValue({ error: null });
  mocks.user.mockResolvedValue({ data: { user: { id: "verified" } }, error: null });
  mocks.update.mockResolvedValue({ error: null });
});
it("inscription : pseudo nettoyé, unicité, mot de passe envoyé uniquement à Auth", async () => {
  const state = await register({},form());
  expect(state.message).toContain("confirmation");
  expect(mocks.taken.mock.calls[0][1]).toBe("Pseudo KFFR");
  expect(mocks.signup).toHaveBeenCalledExactlyOnceWith({ email: "joueur@example.test", password: "password-local", options: { emailRedirectTo: "https://histoire.example/auth/callback?next=%2Fpartie%2F00000000-0000-0000-0000-000000000024" } });
  expect(mocks.set).toHaveBeenCalledWith("histoire-pending-username", "Pseudo KFFR", expect.objectContaining({ httpOnly: true, sameSite: "lax" }));
  expect(JSON.stringify(state)).not.toContain("password-local");
  expect(mocks.save).not.toHaveBeenCalled();
});
it("inscription sans confirmation termine le profil comme utilisateur connecté et conserve next", async () => {
  mocks.signup.mockResolvedValue({ data: { session: {} }, error: null });
  await expect(register({},form())).rejects.toThrow("redirect:/partie/");
  expect(mocks.pending).toHaveBeenCalledOnce();
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

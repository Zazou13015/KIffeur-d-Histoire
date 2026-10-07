import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountDestination, getAccount } from "@/lib/account";
import { completePendingProfile } from "@/lib/pendingProfile";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), profile: vi.fn(), save: vi.fn(), pending: "", remove: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: true }));
vi.mock("@/lib/profiles", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/profiles")>(), getProfileUsername: mocks.profile, saveProfileUsername: mocks.save }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.pending ? { value: mocks.pending } : undefined, delete: mocks.remove }) }));
const client = { auth: { getUser: mocks.user }, schema: () => ({ rpc: mocks.rpc }) } as unknown as SupabaseClient;
const userId = "00000000-0000-4000-8000-00000000000a";
const pendingProfile = (username: string) => JSON.stringify({ userId, username });
beforeEach(() => {
  vi.resetAllMocks(); mocks.pending = "";
  mocks.user.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  mocks.save.mockResolvedValue({ error: null });
  mocks.remove.mockImplementation(() => { mocks.pending = ""; });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.profile.mockResolvedValue("Pseudo Contrée");
});
it("même compte, création players idempotente, identité directement dans public", async () => {
  expect((await getAccount(client))?.username).toBe("Pseudo Contrée");
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("ensure_player");
  expect(mocks.profile).toHaveBeenCalledWith(client,userId);
});
it("Google sans pseudo passe au profil avant de revenir vers sa partie", async () => {
  mocks.profile.mockResolvedValue(null);
  expect(await accountDestination(client,"/partie/test")).toBe("/profil?next=%2Fpartie%2Ftest");
  expect(await accountDestination(client,"/nouveau-mot-de-passe")).toBe("/nouveau-mot-de-passe");
});
it("le pseudo provisoire ne remplace jamais celui déjà choisi dans Contrée", async () => {
  mocks.pending = pendingProfile("Inscription ancienne");
  await completePendingProfile(client);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.remove).toHaveBeenCalledWith("histoire-pending-username");
});
it("après confirmation le profil absent est complété sous session utilisateur", async () => {
  mocks.pending = pendingProfile("Pseudo choisi"); mocks.profile.mockResolvedValue(null);
  await completePendingProfile(client);
  expect(mocks.save).toHaveBeenCalledWith(client,"Pseudo choisi");
  expect(mocks.pending).toBe("");
});
it("sans session le pseudo provisoire ne peut rien écrire", async () => {
  mocks.pending = pendingProfile("Pseudo choisi");
  mocks.user.mockResolvedValue({ data: { user: null }, error: null });
  await completePendingProfile(client);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
it.each([
  "Ancien pseudo sans UUID", "{", "null", "[]",
  JSON.stringify({ username: "Pseudo choisi" }),
  JSON.stringify({ userId: "invalide", username: "Pseudo choisi" }),
  JSON.stringify({ userId, username: "" }),
  JSON.stringify({ userId, username: 42 }),
])("un cookie ancien ou invalide est supprimé sans écriture : %s", async value => {
  mocks.pending = value;
  await completePendingProfile(client);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.profile).not.toHaveBeenCalled();
  expect(mocks.pending).toBe("");
});
it("une écriture refusée conserve l'intention pour un prochain essai", async () => {
  mocks.pending = pendingProfile("Pseudo choisi");
  mocks.profile.mockResolvedValue(null);
  mocks.save.mockResolvedValue({ error: "Indisponible" });
  await completePendingProfile(client);
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.pending).toBe(pendingProfile("Pseudo choisi"));
});
it("une erreur getUser interdit toute écriture même avec un utilisateur dans la réponse", async () => {
  mocks.pending = pendingProfile("Pseudo choisi");
  mocks.user.mockResolvedValue({ data: { user: { id: userId } }, error: { message: "session invalide" } });
  await completePendingProfile(client);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("la correspondance des UUID est exacte, sans normalisation", async () => {
  mocks.pending = pendingProfile("Pseudo choisi");
  mocks.user.mockResolvedValue({ data: { user: { id: userId.toUpperCase() } }, error: null });
  await completePendingProfile(client);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.profile).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});

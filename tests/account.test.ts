import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountDestination, getAccount } from "@/lib/account";
import { completePendingProfile } from "@/lib/pendingProfile";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), profile: vi.fn(), save: vi.fn(), pending: "", remove: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: true }));
vi.mock("@/lib/profiles", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/profiles")>(), getProfileUsername: mocks.profile, saveProfileUsername: mocks.save }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.pending ? { value: mocks.pending } : undefined, delete: mocks.remove }) }));
const client = { auth: { getUser: mocks.user }, schema: () => ({ rpc: mocks.rpc }) } as unknown as SupabaseClient;
beforeEach(() => {
  vi.resetAllMocks(); mocks.pending = "";
  mocks.user.mockResolvedValue({ data: { user: { id: "même-id-KFFR" } }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.profile.mockResolvedValue("Pseudo Contrée");
});
it("même compte, création players idempotente, identité directement dans public", async () => {
  expect((await getAccount(client))?.username).toBe("Pseudo Contrée");
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("ensure_player");
  expect(mocks.profile).toHaveBeenCalledWith(client,"même-id-KFFR");
});
it("Google sans pseudo passe au profil avant de revenir vers sa partie", async () => {
  mocks.profile.mockResolvedValue(null);
  expect(await accountDestination(client,"/partie/test")).toBe("/profil?next=%2Fpartie%2Ftest");
  expect(await accountDestination(client,"/nouveau-mot-de-passe")).toBe("/nouveau-mot-de-passe");
});
it("le pseudo provisoire ne remplace jamais celui déjà choisi dans Contrée", async () => {
  mocks.pending = "Inscription ancienne";
  await completePendingProfile(client);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.remove).toHaveBeenCalledWith("histoire-pending-username");
});
it("après confirmation le profil absent est complété sous session utilisateur", async () => {
  mocks.pending = "Pseudo choisi"; mocks.profile.mockResolvedValue(null);
  await completePendingProfile(client);
  expect(mocks.save).toHaveBeenCalledWith(client,"Pseudo choisi");
});
it("sans session le pseudo provisoire ne peut rien écrire", async () => {
  mocks.pending = "Pseudo choisi";
  mocks.user.mockResolvedValue({ data: { user: null }, error: null });
  await completePendingProfile(client);
  expect(mocks.save).not.toHaveBeenCalled();
});

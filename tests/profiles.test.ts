import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanUsername, getProfileUsername, isUsernameTaken, saveProfileUsername, validateUsername } from "@/lib/profiles";

const ownId = "compte-kffr-A";
const mocks = { auth: vi.fn(), schema: vi.fn(), from: vi.fn(), rpc: vi.fn(), eq: vi.fn(), update: vi.fn(), insert: vi.fn(), single: vi.fn(), select: vi.fn() };
const client = { auth: { getUser: mocks.auth }, schema: mocks.schema } as unknown as SupabaseClient;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: ownId } }, error: null });
  mocks.schema.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
  mocks.from.mockReturnValue({ select: mocks.select, update: mocks.update, insert: mocks.insert });
  mocks.select.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.single });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.single, select: mocks.select });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.single.mockResolvedValue({ data: { username: "Pseudo Contrée" }, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
});
it("reprend exactement les validations de Contrée", () => {
  expect(cleanUsername("  Pseudo\t KFFR\n ")).toBe("Pseudo KFFR");
  expect(validateUsername("a")).toBeNull();
  expect(validateUsername("a".repeat(40))).toBeNull();
  expect(validateUsername(" ")).toBe("Choisis un pseudo.");
  expect(validateUsername("a".repeat(41))).toContain("40 caractères");
  expect(validateUsername("x\0y")).toContain("non autorisés");
  expect(validateUsername("x\u007fy")).toContain("non autorisés");
  expect(validateUsername("Éléonore d’Histoire")).toBeNull();
});
it("lit le même id/username Contrée et relit la nouvelle valeur sans cache ni copie", async () => {
  expect(await getProfileUsername(client, ownId)).toBe("Pseudo Contrée");
  mocks.single.mockResolvedValueOnce({ data: { username: "Renommé dans Contrée" }, error: null });
  expect(await getProfileUsername(client, ownId)).toBe("Renommé dans Contrée");
  expect(mocks.schema).toHaveBeenCalledWith("public");
  expect(mocks.from).toHaveBeenCalledWith("profiles");
  expect(mocks.eq).toHaveBeenCalledWith("id", ownId);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("modifie uniquement le compte vérifié par Auth, sans id fourni par le formulaire", async () => {
  expect(await saveProfileUsername(client," Nouveau\t pseudo ")).toEqual({ error: null });
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ username: "Nouveau pseudo" });
  expect(mocks.eq).toHaveBeenCalledWith("id", ownId);
  expect(mocks.auth).toHaveBeenCalledOnce();
  expect(mocks.schema.mock.calls.every(([schema]) => schema === "public")).toBe(true);
});
it("complète un profil absent par INSERT soumis aux mêmes RLS", async () => {
  mocks.single.mockResolvedValueOnce({ data: null, error: null });
  expect(await saveProfileUsername(client,"Choisi")).toEqual({ error: null });
  expect(mocks.insert).toHaveBeenCalledExactlyOnceWith({ id: ownId, username: "Choisi" });
});
it("refuse avant écriture un username invalide ou une session invalide", async () => {
  expect((await saveProfileUsername(client, "")).error).toBeTruthy();
  mocks.auth.mockResolvedValue({ data: { user: null }, error: {} });
  expect((await saveProfileUsername(client, "Valide")).error).toContain("Connecte-toi");
  expect(mocks.update).not.toHaveBeenCalled();
});
it.each([true,false])("traite l'unicité atomique en UPDATE ou INSERT (insert=%s)", async insert => {
  if (insert) {
    mocks.single.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ error: { code: "23505", message: "private row" } });
  } else mocks.single.mockResolvedValue({ data: null, error: { code: "23505", message: "private row" } });
  expect(await saveProfileUsername(client,"Pris")).toEqual({ error: "Ce pseudo est déjà pris." });
});
it("vérifie la disponibilité avec la RPC KFFR existante sans SELECT sur un tiers", async () => {
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  expect(await isUsernameTaken(client, " Pris  ")).toBe(true);
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("is_username_taken", { p_username: "Pris" });
  expect(mocks.from).not.toHaveBeenCalled();
});
it("une erreur de lecture ne se confond pas avec un profil absent", async () => {
  mocks.single.mockResolvedValue({ data: null, error: { message: "private" } });
  await expect(getProfileUsername(client,ownId)).rejects.toThrow("Impossible de lire");
});

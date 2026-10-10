import { beforeEach, expect, it, vi } from "vitest";
import { chargerPacks, chargerQuestions } from "@/lib/admin-packs/serveur";
import { modifierQuestion } from "@/app/admin/packs/actions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), client: vi.fn(), schema: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  mocks.schema.mockReset().mockReturnValue({ rpc: mocks.rpc });
  mocks.client.mockReset().mockResolvedValue({ schema: mocks.schema });
});

it("lit exclusivement les RPC admin sans cache partagé", async () => {
  await chargerPacks(); await chargerQuestions("COL-0059");
  expect(mocks.client).toHaveBeenCalledWith({ noStore: true });
  expect(mocks.schema).toHaveBeenCalledWith("histoire");
  expect(mocks.rpc.mock.calls).toEqual([["admin_list_packs", undefined], ["admin_pack_questions", { p_pack_id: "COL-0059" }]]);
});

it("une permission refusée ne restitue aucune donnée même si la réponse en contient", async () => {
  mocks.rpc.mockResolvedValue({ data: { start_year: 1901 }, error: { code: "42501", message: "privé" } });
  expect(await chargerPacks()).toBeNull();
  expect(await chargerQuestions("A87")).toBeNull();
  expect(await modifierQuestion("A87", "A87-E1", true)).toEqual({ ok: false,
    message: "Accès réservé aux administrateurs. Reconnectez-vous si nécessaire." });
});

it("retrait et réintégration transmettent uniquement association et motif, jamais un administrateur fourni par le client", async () => {
  const data = { changed: true, packs: [], questions: [] };
  mocks.rpc.mockResolvedValue({ data, error: null });
  expect(await modifierQuestion("A87", "A87-E1", true, "  Hors thème  ")).toEqual({ ok: true, data });
  expect(mocks.rpc).toHaveBeenLastCalledWith("admin_remove_pack_event", {
    p_pack_id: "A87", p_event_id: "A87-E1", p_reason: "Hors thème",
  });
  await modifierQuestion("A87", "A87-E1", false);
  expect(mocks.rpc).toHaveBeenLastCalledWith("admin_restore_pack_event", {
    p_pack_id: "A87", p_event_id: "A87-E1", p_reason: null,
  });
});

it("refuse les entrées corrompues avant toute requête", async () => {
  for (const args of [["", "e", true, ""], ["p", "", true, ""], ["p", "e", true, "x".repeat(1001)],
    ["p", "e", "true", ""], [null, "e", true, ""], ["p", "e", false, {}]]) {
    const r = await modifierQuestion(...args as [string, string, boolean, string]);
    expect(r.ok).toBe(false);
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("masque les erreurs SQL, le défaut de migration et les exceptions réseau", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "event_answers secret SQL" } });
  await expect(chargerPacks()).rejects.toThrow("momentanément indisponible");
  const sql = await modifierQuestion("A87", "A87-E1", true);
  expect(sql.ok).toBe(false); expect(JSON.stringify(sql)).not.toContain("event_answers");
  mocks.client.mockRejectedValue(new Error("adresse privée du serveur"));
  await expect(chargerQuestions("A87")).rejects.toThrow("momentanément indisponible");
  expect(JSON.stringify(await modifierQuestion("A87", "A87-E1", false))).not.toContain("adresse privée");
});

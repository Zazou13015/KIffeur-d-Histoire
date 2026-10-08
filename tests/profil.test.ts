import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chargerHistorique, chargerStatistiques } from "@/lib/profil/serveur";
import {
  cursorValide,
  nombre,
  pourcentage,
  datePartie,
  mois,
} from "@/lib/profil/types";
import { historique, statistiques } from "./fixtures/profil";
vi.mock("server-only", () => ({}));
const user = vi.fn(),
  rpc = vi.fn(),
  schema = vi.fn(() => ({ rpc }));
const client = { auth: { getUser: user }, schema } as unknown as SupabaseClient;
beforeEach(() => {
  vi.clearAllMocks();
  user.mockResolvedValue({ data: { user: { id: "A" } }, error: null });
  rpc.mockResolvedValue({ data: statistiques, error: null });
});
it("requête privée sous identité Auth, sans identifiant de joueur en entrée", async () => {
  expect(await chargerStatistiques(client)).toEqual(statistiques);
  expect(schema).toHaveBeenCalledWith("histoire");
  expect(rpc).toHaveBeenCalledExactlyOnceWith("player_stats");
  rpc.mockResolvedValue({ data: historique, error: null });
  expect(await chargerHistorique(historique.next_cursor, client)).toEqual(
    historique,
  );
  expect(rpc).toHaveBeenLastCalledWith("player_history", {
    p_cursor: historique.next_cursor,
  });
});
it.each([null, { id: "A" }])(
  "refuse une session absente ou invalide avant la RPC : %s",
  async (value) => {
    user.mockResolvedValue({
      data: { user: value },
      error: { message: "refus" },
    });
    await expect(chargerStatistiques(client)).rejects.toThrow(
      "Connexion requise",
    );
    await expect(chargerHistorique(null, client)).rejects.toThrow(
      "Connexion requise",
    );
    expect(rpc).not.toHaveBeenCalled();
  },
);
it("filtre les curseurs et ne publie jamais les erreurs SQL internes", async () => {
  rpc.mockResolvedValue({
    data: null,
    error: { message: "user_id de B et secret SQL" },
  });
  await expect(chargerHistorique("user_id=B", client)).rejects.toThrow(
    "L’historique est momentanément indisponible.",
  );
  expect(rpc).toHaveBeenCalledWith("player_history", { p_cursor: null });
  await expect(chargerStatistiques(client)).rejects.toThrow(
    "Les statistiques sont momentanément indisponibles.",
  );
});
it("formate les valeurs nulles sans inventer une précision nulle et utilise les dates françaises", () => {
  expect(nombre(null)).toBe("—");
  expect(pourcentage(null)).toBe("—");
  expect(pourcentage(0)).toBe("0 %");
  expect(pourcentage(80.125)).toBe("80,13 %");
  expect(datePartie("2026-10-08T12:00:00Z")).toContain("14:00");
  expect(mois("2026-10-01")).toContain("2026");
  expect(cursorValide([historique.next_cursor])).toBeNull();
});

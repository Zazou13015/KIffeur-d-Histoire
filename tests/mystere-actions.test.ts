import { beforeEach, expect, it, vi } from "vitest";
import { preparerMystere } from "@/app/solo/mystere";
import { lancer } from "@/app/partie/actions";
const mocks = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("@/app/solo/actions", () => ({ startGame: mocks.start }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
const winner = { mode: "theme", id: "NOUVEAU-95", titre: "Le thème de la base" };
beforeEach(() => mocks.start.mockReset().mockResolvedValue({ game_id: "partie-95", question_count: 5,
  mystery: { winner, candidates: [winner] } }));
it.each([5, 10, 20, "tout"] as const)("prépare une seule partie de longueur %s avant de rendre le gagnant", async (longueur) => {
  const resultat = await preparerMystere(`mode=general&difficulte=DAY&niveau=2&sens=inverse&longueur=${longueur}`);
  expect(mocks.start).toHaveBeenCalledExactlyOnceWith({ mystery: true, difficulty: "DAY", niveau: 2,
    direction: "inverse", questionCount: longueur === "tout" ? 0 : longueur });
  expect("tirage" in resultat).toBe(true);
  if (!("tirage" in resultat)) throw new Error("Tirage manquant");
  expect(resultat.tirage.gagnant).toEqual(winner);
  const c = new URLSearchParams(new URL(resultat.tirage.destination, "http://local").searchParams.get("c")!);
  expect(c.get("theme")).toBe(winner.id); expect(c.get("sens")).toBe("inverse");
});
it("Rejouer ce thème transmet le gagnant à la RPC au lieu d'un nouveau tirage", async () => {
  const f = new FormData(); f.set("c", "mode=theme&theme=NOUVEAU-95&mystere=1&difficulte=YEAR&niveau=3&longueur=5");
  const destination = await lancer(f).catch((e: Error) => e.message);
  expect(String(destination)).toContain("/partie/partie-95");
  expect(mocks.start).toHaveBeenCalledWith({ mystery: true, tagId: winner.id, difficulty: "YEAR", niveau: 3, questionCount: 5 });
});
it("ne rend aucune roulette quand il n'y a pas assez de questions", async () => {
  mocks.start.mockRejectedValue(new Error("Pas assez de questions pour ces filtres"));
  const r = await preparerMystere("mode=general&difficulte=DAY&niveau=1&longueur=20");
  expect(r).toEqual({ erreur: expect.stringContaining("Aucun thème") });
});
it("refuse le scolaire et les entrées invalides avant de contacter le moteur", async () => {
  expect(await preparerMystere("mode=general&difficulte=YEAR&longueur=100")).toHaveProperty("erreur");
  expect(await preparerMystere("mode=scolaire&difficulte=YEAR")).toHaveProperty("erreur");
  expect(mocks.start).not.toHaveBeenCalled();
});
it("masque les erreurs SQL et indique le profil si le pseudo manque", async () => {
  mocks.start.mockRejectedValueOnce(new Error("secret SQL"));
  expect(JSON.stringify(await preparerMystere("mode=general&difficulte=YEAR"))).not.toContain("secret SQL");
  mocks.start.mockRejectedValueOnce(new Error("Choisis ton pseudo KFFR"));
  expect(await preparerMystere("mode=general&difficulte=DAY&sens=inverse")).toHaveProperty("profil", "/profil?next=%2Finverse");
});

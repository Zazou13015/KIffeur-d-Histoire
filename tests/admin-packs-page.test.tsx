import { beforeEach, expect, it, vi } from "vitest";
import PacksPage from "@/app/admin/packs/page";

const mocks = vi.hoisted(() => ({ account: vi.fn(), packs: vi.fn(), questions: vi.fn() }));
vi.mock("@/lib/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/admin-packs/serveur", () => ({ chargerPacks: mocks.packs, chargerQuestions: mocks.questions }));
vi.mock("@/components/admin/AdministrationPacks", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); },
  notFound: () => { throw new Error("404"); } }));
beforeEach(() => {
  mocks.account.mockReset().mockResolvedValue({ user: { id: "joueur" } });
  mocks.packs.mockReset().mockResolvedValue([{ id: "A87" }, { id: "B87" }]);
  mocks.questions.mockReset().mockResolvedValue([{ start_year: 1901 }]);
});

it("redirige l'anonyme sans demander la moindre date", async () => {
  mocks.account.mockResolvedValue(null);
  await expect(PacksPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/connexion?next=%2Fadmin%2Fpacks");
  expect(mocks.packs).not.toHaveBeenCalled(); expect(mocks.questions).not.toHaveBeenCalled();
});
it("un joueur non admin reçoit 404 avant toute lecture de questions", async () => {
  mocks.packs.mockResolvedValue(null);
  await expect(PacksPage({ searchParams: Promise.resolve({ pack: "A87" }) })).rejects.toThrow("404");
  expect(mocks.questions).not.toHaveBeenCalled();
});
it("charge uniquement le pack choisi après autorisation SQL", async () => {
  const r = await PacksPage({ searchParams: Promise.resolve({ pack: "B87" }) });
  expect(mocks.questions).toHaveBeenCalledExactlyOnceWith("B87");
  expect(r.props.selectedId).toBe("B87");
});
it("refuse les packs inexistants et une révocation en cours de lecture", async () => {
  await expect(PacksPage({ searchParams: Promise.resolve({ pack: "inconnu" }) })).rejects.toThrow("404");
  expect(mocks.questions).not.toHaveBeenCalled();
  mocks.questions.mockResolvedValue(null);
  await expect(PacksPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("404");
});
it("un catalogue vide reste consultable sans RPC de questions", async () => {
  mocks.packs.mockResolvedValue([]);
  expect((await PacksPage({ searchParams: Promise.resolve({}) })).props.initialQuestions).toEqual([]);
  expect(mocks.questions).not.toHaveBeenCalled();
});

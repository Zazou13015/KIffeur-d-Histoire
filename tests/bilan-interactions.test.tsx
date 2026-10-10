// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Bilan } from "@/components/partie/Bilan";
import { fixtureBilan, partieBilan } from "./fixtures/bilan";
import { CHAPITRES } from "@/lib/solo/choix";
import { lireProgressionSession } from "@/lib/progression/session";

const mocks = vi.hoisted(() => ({ claim: vi.fn(), test: vi.fn(), refresh: vi.fn(), lancer: vi.fn() }));
vi.mock("@/app/partie/actions", () => ({ lancer: mocks.lancer }));
vi.mock("@/app/solo/actions", () => ({ claimGame: mocks.claim }));
vi.mock("@/app/solo/mystere", () => ({ preparerMystere: vi.fn() }));
vi.mock("@/app/apprendre/actions", () => ({ enregistrerTestChapitre: mocks.test }));
const router = { refresh: mocks.refresh };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  mocks.test.mockResolvedValue({ connecte: true, meilleur: true, precision: 82 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
function question(n: number) { return within(screen.getByRole("navigation", { name: "Choisir une réponse" })).getByRole("button", { name: new RegExp(`^Question ${n} :`) }); }
function bilan(cas = "classique", connecte = true, anonyme = false, relance?: string) {
  return render(<Bilan resultat={fixtureBilan(cas)} connecte={connecte} anonyme={anonyme} relance={relance} />);
}
it("synchronise numéros, navigation clavier, repères et vue rapprochée", () => {
  bilan();
  expect(question(3).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(question(1));
  expect(screen.getByRole("heading", { name: "Prise de la Bastille" })).toBeTruthy();
  fireEvent.keyDown(question(1), { key: "ArrowRight" });
  expect(document.activeElement).toBe(question(2));
  expect(question(2).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Question suivante →" }));
  fireEvent.click(screen.getByRole("button", { name: "Voir l’écart" }));
  expect(screen.getByRole("img", { name: "Écart de la question 3" })).toBeTruthy();
  fireEvent.click(question(1));
  expect(screen.getByRole("img", { name: "Écart de la question 1" })).toBeTruthy();
  expect(screen.getByText(/deux repères alignés/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tout le parcours" }));
  const repere = screen.getAllByRole("button", { name: /^Repère :/ })[0];
  fireEvent.click(repere);
  expect(question(3).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(question(10));
  expect((screen.getByRole("button", { name: "Voir l’écart" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/Temps écoulé : seule/)).toBeTruthy();
});
it.each(["inverse", "absente"])("explique l'absence d'écart et affiche le contrat %s", (cas) => {
  bilan(cas);
  expect((screen.getByRole("button", { name: "Voir l’écart" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(cas === "inverse" ? /votre réponse est un événement/ : /Aucune date complète/)).toBeTruthy();
  expect(screen.getByRole("article").textContent).toContain(cas === "inverse" ? "Bataille d’Alésia" : "Sans réponse");
});
it("affiche un maximum et une navigation dynamiques, sans dix questions imposées", () => {
  bilan("trois");
  expect(screen.getByRole("img", { name: "270 points sur 300" })).toBeTruthy();
  expect(within(screen.getByRole("navigation", { name: "Choisir une réponse" })).getAllByRole("button")).toHaveLength(3);
  fireEvent.keyDown(question(3), { key: "Home" }); expect(question(1).getAttribute("aria-pressed")).toBe("true");
  fireEvent.keyDown(question(1), { key: "End" }); expect(question(3).getAttribute("aria-pressed")).toBe("true");
});
it("garde dix numéros à l'écran et atteint la centième réponse au clavier et par séries", async () => {
  bilan("cent");
  expect(screen.getByRole("img", { name: "10000 points sur 10000" })).toBeTruthy();
  expect(within(screen.getByRole("navigation", { name: "Choisir une réponse" })).getAllByRole("button")).toHaveLength(10);
  fireEvent.keyDown(question(3), { key: "End" });
  await waitFor(() => expect(document.activeElement).toBe(question(100)));
  expect(question(100).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "← Dix précédentes" }));
  expect(question(81).getAttribute("aria-pressed")).toBe("true");
  fireEvent.keyDown(question(81), { key: "Home" });
  expect(question(1).getAttribute("aria-pressed")).toBe("true");
});
it("préserve le choix de relance et le lien de rattachement sans compte", () => {
  const relance = "mode=general&difficulte=MONTH&niveau=2";
  const { container } = bilan("classique", false, true, relance);
  expect((container.querySelector('input[name="c"]') as HTMLInputElement).value).toBe(relance);
  expect(screen.getByRole("link", { name: "Se connecter pour la sauvegarder" }).getAttribute("href")).toBe(`/connexion?next=${encodeURIComponent(`/partie/${partieBilan.game_id}`)}`);
  expect(screen.getByRole("link", { name: "Changer de mode" }).getAttribute("href")).toBe("/");
});
it("un bilan rouvert du profil reprend les filtres de sa partie de cent questions", () => {
  const resultat = { ...fixtureBilan("cent"), replay_filters: { difficulty: "YEAR" as const, niveau: 3 as const, questionCount: 0 } };
  const { container } = render(<Bilan resultat={resultat} connecte anonyme={false} />);
  const choix = new URLSearchParams((container.querySelector('input[name="c"]') as HTMLInputElement).value);
  expect(choix.get("longueur")).toBe("tout"); expect(choix.get("niveau")).toBe("3");
});
it("rouvrir un ancien test du profil n'enregistre pas à nouveau sa progression", () => {
  const resultat = { ...fixtureBilan("classique"), replay_filters: { difficulty: "YEAR" as const, chapterTest: true, chapterIds: [CHAPITRES[0].id] } };
  render(<Bilan resultat={resultat} connecte anonyme={false} />);
  expect(screen.getByRole("link", { name: "Revoir le chapitre" })).toBeTruthy();
  expect(mocks.test).not.toHaveBeenCalled();
});
it("ne rattache qu'une fois, même en naviguant, puis rafraîchit à la réussite", async () => {
  let finir!: (v: { saved: boolean }) => void;
  mocks.claim.mockReturnValue(new Promise((resolve) => { finir = resolve; }));
  bilan("classique", true, true);
  fireEvent.click(question(1)); fireEvent.click(question(7));
  expect(mocks.claim).toHaveBeenCalledTimes(1);
  finir({ saved: true }); await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
});
it("conserve l'erreur de rattachement malgré la navigation", async () => {
  mocks.claim.mockResolvedValue({ saved: false, error: "Sauvegarde indisponible." });
  bilan("classique", true, true);
  await screen.findByRole("alert"); fireEvent.click(question(8));
  expect(screen.getByRole("alert").textContent).toBe("Sauvegarde indisponible.");
  expect(mocks.claim).toHaveBeenCalledTimes(1);
});
it("conserve la sauvegarde et enregistre le test une seule fois, avec le retour au chapitre", async () => {
  bilan("classique", true, false, `mode=scolaire&difficulte=YEAR&chapitres=${CHAPITRES[0].id}&test=chapitre`);
  await screen.findByText(/Nouveau meilleur test de ce chapitre/);
  fireEvent.click(question(1)); fireEvent.click(question(9));
  expect(mocks.test).toHaveBeenCalledTimes(1);
  expect(mocks.test).toHaveBeenCalledWith(partieBilan.game_id);
  expect(screen.getByText(/Partie sauvegardée dans ton compte/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Revoir le chapitre" }).getAttribute("href")).toMatch(/^\/apprendre\//);
});
it("attend le rattachement avant le test et conserve la progression invitée dans l'onglet", () => {
  mocks.claim.mockReturnValue(new Promise(() => {}));
  const relance = `mode=scolaire&difficulte=YEAR&chapitres=${CHAPITRES[0].id}&test=chapitre`;
  const { unmount } = bilan("classique", true, true, relance);
  expect(mocks.test).not.toHaveBeenCalled(); unmount();
  bilan("classique", false, true, relance);
  fireEvent.click(question(2));
  expect(lireProgressionSession()[CHAPITRES[0].id]).toMatchObject({ tests: 1, precision: 82 });
  expect(mocks.test).not.toHaveBeenCalled();
});

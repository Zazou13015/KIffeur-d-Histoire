// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RouletteMystere, DUREE_ANNONCE, DUREE_ROULETTE } from "@/components/choix/RouletteMystere";
import { BoutonMystere } from "@/components/choix/BoutonMystere";
import { Bilan } from "@/components/partie/Bilan";
import { ChoixSolo } from "@/components/choix/ChoixSolo";
import { ChoixScolaire } from "@/components/choix/ChoixScolaire";
import { partieBilan } from "./fixtures/bilan";
import type { TirageMystere } from "@/lib/solo/mystere";

const mocks = vi.hoisted(() => ({ preparer: vi.fn(), push: vi.fn(), lancer: vi.fn(), compter: vi.fn() }));
vi.mock("@/app/solo/mystere", () => ({ preparerMystere: mocks.preparer }));
vi.mock("@/app/solo/disponibilite", () => ({ compterQuestions: mocks.compter }));
vi.mock("@/app/partie/actions", () => ({ lancer: mocks.lancer }));
const router = { push: mocks.push };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const tirage: TirageMystere = { gagnant: { mode: "pack", id: "M95-PACK", titre: "Cabinet surprise" },
  candidats: [{ mode: "theme", id: "M95-THEME", titre: "Un autre thème" }],
  choix: "mode=pack&pack=M95-PACK&mystere=1&niveau=2&difficulte=MONTH&longueur=tout", destination: "/partie/jeu-95?n=42" };
let reduite = false;
const changements = new Set<() => void>();
const showModalInitial = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const closeInitial = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); reduite = false; changements.clear();
  mocks.preparer.mockReset().mockResolvedValue({ tirage });
  mocks.push.mockReset(); mocks.compter.mockReset().mockResolvedValue({ YEAR: 42, MONTH: 30, DAY: 25 });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true,
    value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
  vi.stubGlobal("matchMedia", () => ({ matches: reduite,
    addEventListener: (_: string, listener: () => void) => changements.add(listener),
    removeEventListener: (_: string, listener: () => void) => changements.delete(listener) }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (showModalInitial) Object.defineProperty(HTMLDialogElement.prototype, "showModal", showModalInitial);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (closeInitial) Object.defineProperty(HTMLDialogElement.prototype, "close", closeInitial);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

it("défile quatre secondes puis annonce le gagnant avant de naviguer une seule fois", () => {
  const terminer = vi.fn(); render(<RouletteMystere tirage={tirage} terminer={terminer} />);
  expect(screen.getByRole("dialog", { name: "Thème mystère" })).toBeTruthy();
  act(() => vi.advanceTimersByTime(DUREE_ROULETTE - 1)); expect(terminer).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1)); expect(screen.getByRole("status").textContent).toBe("C'est parti : Cabinet surprise");
  act(() => vi.advanceTimersByTime(DUREE_ANNONCE)); expect(terminer).toHaveBeenCalledTimes(1);
});
it("Passer arrête sur le même gagnant et ignore les anciens timers", () => {
  const terminer = vi.fn(); const { container } = render(<RouletteMystere tirage={tirage} terminer={terminer} />);
  fireEvent.click(screen.getByRole("button", { name: "Passer" }));
  expect(container.querySelector('[data-gagnante="true"]')?.textContent).toContain(tirage.gagnant.titre);
  act(() => vi.advanceTimersByTime(10000)); expect(terminer).toHaveBeenCalledTimes(1);
});
it.each([true, false])("respecte reduced motion initial ou modifié en cours de tirage : %s", (initiale) => {
  reduite = initiale;
  const terminer = vi.fn(); render(<RouletteMystere tirage={tirage} terminer={terminer} />);
  if (!initiale) { reduite = true; act(() => changements.forEach((f) => f())); }
  expect(screen.getByRole("status").textContent).toBe("C'est parti : Cabinet surprise");
  act(() => vi.advanceTimersByTime(DUREE_ANNONCE)); expect(terminer).toHaveBeenCalledTimes(1);
});
it("Échap termine le tirage sans perdre la partie préparée", () => {
  const terminer = vi.fn(); render(<RouletteMystere tirage={tirage} terminer={terminer} />);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
  expect(screen.getByRole("status").textContent).toContain(tirage.gagnant.titre);
  act(() => vi.advanceTimersByTime(DUREE_ANNONCE)); expect(terminer).toHaveBeenCalledTimes(1);
});
it("bloque les doubles clics pendant la préparation puis joue la destination reçue", async () => {
  let resoudre!: (r: { tirage: TirageMystere }) => void;
  mocks.preparer.mockReturnValue(new Promise((r) => { resoudre = r; }));
  const memoriser = vi.fn(); render(<BoutonMystere choix="mode=general&difficulte=MONTH&niveau=2&longueur=tout" memoriser={memoriser} />);
  const bouton = screen.getByRole("button", { name: /Thème mystère/ });
  fireEvent.click(bouton); fireEvent.click(bouton); expect(mocks.preparer).toHaveBeenCalledTimes(1);
  await act(async () => { resoudre({ tirage }); });
  expect(memoriser).toHaveBeenCalledWith(tirage.choix); expect(mocks.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Passer" }));
  act(() => vi.advanceTimersByTime(DUREE_ANNONCE)); expect(mocks.push).toHaveBeenCalledExactlyOnceWith(tirage.destination);
});
it("affiche une erreur réessayable sans annoncer de thème quand le moteur refuse", async () => {
  mocks.preparer.mockResolvedValueOnce({ erreur: "Aucun thème disponible." });
  render(<BoutonMystere choix="mode=general&difficulte=YEAR" />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Thème mystère/ })); });
  expect(screen.getByRole("alert").textContent).toContain("Aucun thème disponible.");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect((screen.getByRole("button", { name: /Thème mystère/ }) as HTMLButtonElement).disabled).toBe(false);
});
it("le bilan rouvert utilise le gagnant enregistré même si l'URL contient un autre thème", async () => {
  const resultat = { ...partieBilan, replay_filters: { mystery: true, mysteryLabel: tirage.gagnant.titre,
    packId: tirage.gagnant.id, difficulty: "MONTH" as const, niveau: 2 as const, questionCount: 0 } };
  const { container } = render(<Bilan resultat={resultat} connecte anonyme={false} relance="mode=general&difficulte=YEAR" />);
  expect(screen.getByRole("button", { name: /Rejouer ce thème/ })).toBeTruthy();
  const rejouer = new URLSearchParams(container.querySelector<HTMLInputElement>('input[name="c"]')!.value);
  expect(rejouer.get("pack")).toBe(tirage.gagnant.id); expect(rejouer.get("mystere")).toBe("1");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Relancer la roulette/ })); });
  const choix = new URLSearchParams(mocks.preparer.mock.calls[0][0]);
  expect(choix.get("pack")).toBeNull(); expect(choix.get("longueur")).toBe("tout"); expect(choix.get("niveau")).toBe("2");
});
it("le bouton du choix garde les réglages bruts même si le pack courant est insuffisant", async () => {
  localStorage.setItem("histoire-choix-inverse", "mode=general&sens=inverse&difficulte=DAY&niveau=3&longueur=20");
  mocks.compter.mockResolvedValue({ YEAR: 0, MONTH: 0, DAY: 0 });
  render(<ChoixSolo inverse />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Thème mystère/ })); });
  const c = new URLSearchParams(mocks.preparer.mock.calls[0][0]);
  expect(c.get("sens")).toBe("inverse"); expect(c.get("longueur")).toBe("20"); expect(c.get("niveau")).toBe("3");
  cleanup(); render(<ChoixScolaire />);
  expect(screen.queryByRole("button", { name: /Thème mystère/ })).toBeNull();
});

it("reprend les réglages d'un gagnant absent des tuiles sans bloquer le choix", async () => {
  localStorage.setItem("histoire-choix-solo", tirage.choix);
  const { container } = render(<ChoixSolo />);
  await act(async () => { vi.advanceTimersByTime(200); });
  const c = new URLSearchParams(container.querySelector<HTMLInputElement>('input[name="c"]')!.value);
  expect(c.get("mode")).toBe("general"); expect(c.get("niveau")).toBe("2");
  expect(c.get("difficulte")).toBe("MONTH"); expect(c.get("longueur")).toBe("tout");
});

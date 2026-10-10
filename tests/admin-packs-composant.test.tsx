// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdministrationPacks from "@/components/admin/AdministrationPacks";
import type { AdminPack, PackQuestion } from "@/lib/admin-packs/types";

const mocks = vi.hoisted(() => ({ modifier: vi.fn() }));
vi.mock("@/app/admin/packs/actions", () => ({ modifierQuestion: mocks.modifier }));
const packs: AdminPack[] = [{ id: "A87", title: "Antiquité", active: true, total: 2, retired: 1, playable: 1 }];
const question: PackQuestion = { id: "e1", title: "César", niveau: 1, date_text: null, start_year: -44,
  start_month: 3, start_day: 15, end_year: null, end_month: null, end_day: null, removed: false, playable: true, last_change: null };
const questions: PackQuestion[] = [question, { ...question, id: "e2", title: "Rome", niveau: 3, removed: true, playable: false }];
const modalInitial = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const closeInitial = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeEach(() => {
  mocks.modifier.mockReset();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true,
    value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (modalInitial) Object.defineProperty(HTMLDialogElement.prototype, "showModal", modalInitial);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (closeInitial) Object.defineProperty(HTMLDialogElement.prototype, "close", closeInitial);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
function afficher() { render(<AdministrationPacks initialPacks={packs} selectedId="A87" initialQuestions={questions} />); }

it("affiche dates antiques et retraits ; combine recherche, niveau exact et statut sans RPC", () => {
  afficher(); expect(screen.getAllByText("15 mars 44 av. J.-C.")).toHaveLength(2);
  expect(screen.getByText("Retirée")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Rechercher par titre"), { target: { value: "rOm" } });
  expect(screen.queryByText("César")).toBeNull(); expect(screen.getByText("Rome")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Niveau"), { target: { value: "1" } });
  expect(screen.getByText("Aucune question pour cette sélection.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Niveau"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Statut"), { target: { value: "removed" } });
  expect(screen.getByText("Rome")).toBeTruthy(); expect(mocks.modifier).not.toHaveBeenCalled();
});
it("annule le retrait sans requête et ferme la confirmation avec Échap", () => {
  afficher(); fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Annuler" }));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(mocks.modifier).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("confirme avec motif, bloque le double clic puis met à jour les questions et décomptes", async () => {
  let resolve!: (value: unknown) => void;
  mocks.modifier.mockImplementation(() => new Promise((r) => { resolve = r; }));
  afficher(); fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
  fireEvent.change(screen.getByLabelText("Motif facultatif"), { target: { value: "Hors thème" } });
  const form = screen.getByRole("dialog").querySelector("form")!;
  fireEvent.submit(form); fireEvent.submit(form);
  expect(mocks.modifier).toHaveBeenCalledExactlyOnceWith("A87", "e1", true, "Hors thème");
  expect(screen.getByRole("button", { name: "Enregistrement…" }).hasAttribute("disabled")).toBe(true);
  await act(async () => resolve({ ok: true, data: { changed: true,
    packs: [{ ...packs[0], retired: 2, playable: 0 }], questions: questions.map((q) => ({ ...q, removed: true, playable: false })) } }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("0 jouables · 2 retirées · 2 au total")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Remettre" })).toHaveLength(2);
  expect(screen.getByRole("status").textContent).toContain("question retirée");
});
it("une erreur conserve le motif et l'état confirmé, puis permet de réessayer", async () => {
  mocks.modifier.mockResolvedValue({ ok: false, message: "Réessayez" });
  afficher(); fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
  fireEvent.change(screen.getByLabelText("Motif facultatif"), { target: { value: "À vérifier" } });
  await act(async () => fireEvent.submit(screen.getByRole("dialog").querySelector("form")!));
  expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe("Réessayez");
  expect((screen.getByLabelText("Motif facultatif") as HTMLTextAreaElement).value).toBe("À vérifier");
  expect(screen.getByText("1 jouables · 1 retirées · 2 au total")).toBeTruthy();
});
it("remet une question et gère une coupure réseau sans changer l'état local", async () => {
  mocks.modifier.mockRejectedValue(new Error("réseau")); afficher();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remettre" })));
  expect(screen.getByRole("alert").textContent).toContain("connexion");
  expect(screen.getByText("Retirée")).toBeTruthy();
  mocks.modifier.mockResolvedValue({ ok: true, data: { changed: true,
    packs: [{ ...packs[0], playable: 2, retired: 0 }], questions: questions.map((q) => ({ ...q, removed: false, playable: true })) } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remettre" })));
  expect(screen.getByText("2 jouables · 0 retirées · 2 au total")).toBeTruthy();
  expect(screen.queryByText("Retirée")).toBeNull();
});

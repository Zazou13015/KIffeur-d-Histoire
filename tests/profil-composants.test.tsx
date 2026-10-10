// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { Historique } from "@/components/profil/Historique";
import { Statistiques } from "@/components/profil/Statistiques";
import { GraphiquePrecision } from "@/components/profil/GraphiquePrecision";
import { historique, statistiques, statistiquesVides } from "./fixtures/profil";
afterEach(cleanup);
it("affiche les valeurs connues, les répartitions et les contextes sans faux progrès pédagogique", () => {
  render(<Statistiques data={statistiques} progression={{ connecte: true, chapitres: {} }} />);
  expect(screen.getByText("72")).toBeTruthy();
  expect(screen.getAllByText("90").length).toBeGreaterThan(0);
  expect(screen.queryByText("720")).toBeNull();
  expect(screen.getAllByText("80 %")).toHaveLength(2);
  expect(screen.getByText("Grands repères")).toBeTruthy();
  expect(screen.getByText("Révolutions")).toBeTruthy();
  expect(screen.getByText("La Révolution française")).toBeTruthy();
  expect(screen.getByText(/1 partie ancienne/)).toBeTruthy();
  // Sans progression enregistrée : un état vide, aucun chapitre ni score inventé.
  expect(screen.getByText(/Un premier chapitre, puis des repères/)).toBeTruthy();
  expect(screen.queryByText(/sur 41/)).toBeNull();
});
it("propose de jouer sans afficher de moyenne ou record fabriqué pour un joueur sans partie", () => {
  render(<Statistiques data={statistiquesVides} />);
  expect(screen.getAllByText("—")).toHaveLength(3);
  expect(screen.getByText("0")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /Jouer une partie/ }).getAttribute("href"),
  ).toBe("/");
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
});
it("montre le bilan, le score avec dénominateur, le contexte réel et la pagination", () => {
  render(<Historique data={historique} cursor={null} next="/partie/retour" />);
  expect(screen.getByText("100 %")).toBeTruthy();
  expect(screen.getByText(/Pack : Grands repères/)).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /Revoir le bilan/ }).getAttribute("href"),
  ).toBe(`/partie/${historique.games[0].id}`);
  expect(
    screen
      .getByRole("link", { name: /Parties plus anciennes/ })
      .getAttribute("href"),
  ).toContain("next=%2Fpartie%2Fretour");
});
it("présente un historique vide et un point unique lisible avec alternative tabulaire", () => {
  const { unmount } = render(
    <Historique
      data={{ games: [], next_cursor: null }}
      cursor={null}
      next="/profil"
    />,
  );
  expect(screen.getByText("Ton histoire commence ici.")).toBeTruthy();
  unmount();
  const { container } = render(
    <GraphiquePrecision points={[statistiques.accuracy_over_time[0]]} />,
  );
  expect(
    screen.getByRole("img", { name: /Évolution de ta précision/ }),
  ).toBeTruthy();
  expect(container.querySelectorAll("circle")).toHaveLength(1);
  expect(container.querySelector("polyline")).toBeNull();
  expect(
    within(screen.getByRole("table", { hidden: true })).getByText("60 %"),
  ).toBeTruthy();
});

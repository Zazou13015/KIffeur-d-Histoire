// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DemoPedagogie } from "@/app/demo/pedagogie/DemoPedagogie";
import { chargerDemoPedagogie } from "@/app/demo/pedagogie/donnees";

afterEach(cleanup);

it("rend les 325 cartes accessibles dans les 41 chapitres regroupés par niveau", () => {
  const chapitres = chargerDemoPedagogie();
  render(<DemoPedagogie chapitres={chapitres} />);
  const select = screen.getByRole("combobox", { name: "Choisir un chapitre" });
  expect(within(select).getAllByRole("option").map((o) => o.textContent))
    .toEqual(chapitres.map((c) => `${c.id} · ${c.titre}`));
  expect(within(select).getAllByRole("option")).toHaveLength(41);
  expect(Array.from(select.querySelectorAll("optgroup")).map((g) => g.label))
    .toEqual([...new Set(chapitres.map((c) => c.niveau))]);
  let total = 0;
  for (const chapitre of chapitres) {
    fireEvent.change(select, { target: { value: chapitre.id } });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(chapitre.titre);
    expect(screen.getByText(`${chapitre.cartes.length} cartes`)).toBeTruthy();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(chapitre.cartes.length);
    articles.forEach((article, i) => {
      const carte = chapitre.cartes[i];
      expect(within(article).getByRole("heading", { level: 3 }).textContent).toBe(carte.title);
      expect(article.textContent).toContain(carte.date_text);
      expect(article.textContent).toContain(carte.body);
      expect(article.textContent).toContain(carte.takeaway);
      carte.key_concepts.forEach((notion) => expect(article.textContent).toContain(notion));
      expect(within(article).queryAllByRole("link")).toHaveLength(0);
    });
    expect(document.body.innerHTML).not.toMatch(/EVT-\d+|event_id|EXACT|CONVENTIONAL|APPROXIMATE|DISPUTED|TRADITIONAL|CARD-/);
    total += articles.length;
  }
  expect(total).toBe(325);
});

it("n’envoie pas les identifiants d’événements ni les métadonnées internes au navigateur", () => {
  const serialized = JSON.stringify(chargerDemoPedagogie());
  expect(/event_id|EVT-\d+|official_wording|date_status|date_precision|"sources"\s*:|https?:\/\//.test(serialized)).toBe(false);
  for (const chapitre of chargerDemoPedagogie()) for (const carte of chapitre.cartes)
    expect(Object.keys(carte).sort()).toEqual(["card_id", "chapter_id", "title", "body", "takeaway", "key_concepts", "start_year", "start_month", "start_day", "end_year", "end_month", "end_day", "date_text", "sort_order"].sort());
});

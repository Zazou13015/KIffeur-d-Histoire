import assert from "node:assert/strict";
import test from "node:test";
import { fusionnerDescriptions } from "./import-descriptions";

const vide = { event_id: "EVT-TEST", title_canonical: "Événement test", description_short: "" };
const proposition = { ...vide, description_short: "Une décision change les droits des habitants.", sources: "https://example.org/source", antonin_validation: "" };
const local = "http://127.0.0.1:54321";
const distantFictif = "https://example.invalid";

test("complète localement une description vide sans modifier le canonique en mémoire", () => {
  const resultat = fusionnerDescriptions([vide], [proposition], new Map(), local);
  assert.equal(resultat.evenements[0].description_short, proposition.description_short);
  assert.equal(resultat.bilan.completees, 1);
  assert.equal(vide.description_short, "");
});
test("conserve le canonique déjà décrit et une explication différente présente en base", () => {
  const canonique = { ...vide, description_short: "Explication canonique." };
  assert.equal(fusionnerDescriptions([canonique], [proposition], new Map(), local).evenements[0].description_short, canonique.description_short);
  const resultat = fusionnerDescriptions([vide], [proposition], new Map([[vide.event_id, "Explication déjà relue."]]), local);
  assert.equal(resultat.evenements[0].description_short, "Explication déjà relue.");
  assert.equal(resultat.bilan.baseConservees, 1);
  const texteAvecEspaces = "  Explication déjà relue.\n";
  assert.equal(fusionnerDescriptions([vide], [proposition], new Map([[vide.event_id, texteAvecEspaces]]), local).evenements[0].description_short, texteAvecEspaces);
});
test("second import identique et absence du fichier facultatif préservent la base", () => {
  const base = new Map([[vide.event_id, proposition.description_short]]);
  const resultat = fusionnerDescriptions([vide], [proposition], base, local);
  assert.equal(resultat.bilan.completees, 0);
  assert.equal(resultat.bilan.identiques, 1);
  assert.equal(fusionnerDescriptions([vide], [], base, local).evenements[0].description_short, proposition.description_short);
});
test("aucune proposition non validée n'est importée à distance, y compris avec localhost dans le chemin", () => {
  for (const url of [distantFictif, "https://localhost.example.invalid", "https://example.invalid/127.0.0.1"]) {
    const resultat = fusionnerDescriptions([vide], [proposition], new Map(), url);
    assert.equal(resultat.evenements[0].description_short, "");
    assert.equal(resultat.bilan.nonValideesIgnorees, 1);
  }
  assert.equal(fusionnerDescriptions([vide], [{ ...proposition, antonin_validation: "VALIDE" }], new Map(), distantFictif).evenements[0].description_short, proposition.description_short);
});
test("refuse les propositions incohérentes avant toute écriture", () => {
  for (const lignes of [
    [proposition, proposition], [{ ...proposition, event_id: "INCONNU" }],
    [{ ...proposition, title_canonical: "Autre titre" }], [{ ...proposition, description_short: "x".repeat(281) }],
    [{ ...proposition, sources: "" }], [{ ...proposition, antonin_validation: "AUTOMATIQUE" }],
  ]) assert.throws(() => fusionnerDescriptions([vide], lignes, new Map(), local));
});

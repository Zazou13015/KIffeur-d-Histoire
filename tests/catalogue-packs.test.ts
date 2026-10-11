import { expect, it } from "vitest";
import { contenuPacksHierarchiques } from "../scripts/catalogue-packs";
it("génère le catalogue d'un ancien pack et l'union des descendants sans doublon", () => {
  const packs = [{ collection_id: "P", parent_id: "" }, { collection_id: "C", parent_id: "P" },
    { collection_id: "G", parent_id: "C" }, { collection_id: "F", parent_id: "" }];
  const contenu = new Map([["P", ["e1", "e2"]], ["C", ["e2", "e3"]], ["G", ["e4"]], ["F", ["e5"]]]);
  const resultat = contenuPacksHierarchiques(packs, contenu);
  expect([...resultat.get("P")!]).toEqual(["e1", "e2", "e3", "e4"]);
  expect([...resultat.get("C")!]).toEqual(["e2", "e3", "e4"]);
  expect([...resultat.get("F")!]).toEqual(["e5"]);
});
it("refuse les cycles et parents manquants avant de produire un catalogue", () => {
  expect(() => contenuPacksHierarchiques([{ collection_id: "P", parent_id: "C" }, { collection_id: "C", parent_id: "P" }], new Map())).toThrow("Cycle");
  expect(() => contenuPacksHierarchiques([{ collection_id: "C", parent_id: "absent" }], new Map())).toThrow("Parent absent");
});
it("ignore les branches inactives dans l'union et garde un enfant directement jouable", () => {
  const packs = [{ collection_id: "P", active: "TRUE", parent_id: "" },
    { collection_id: "C", active: "FALSE", parent_id: "P" },
    { collection_id: "G", active: "TRUE", parent_id: "C" }];
  const resultat = contenuPacksHierarchiques(packs, new Map([["P", ["e1"]], ["C", ["e2"]], ["G", ["e3"]]]));
  expect([...resultat.get("P")!]).toEqual(["e1"]);
  expect([...resultat.get("G")!]).toEqual(["e3"]);
});

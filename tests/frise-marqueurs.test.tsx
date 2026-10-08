// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Frise } from "@/components/frise/Frise";
import { marqueursCartes, cadrageChapitre } from "@/lib/apprendre/frise";
import { chargerDemoPedagogie } from "@/app/demo/pedagogie/donnees";
import { empiler, type MarqueurFrise } from "@/lib/game/marqueurs";
import { useVue } from "@/components/frise/useVue";
import type { Vue } from "@/lib/game/frise";
import { lireCsv } from "../scripts/csv";
import s from "@/components/frise/frise.module.css";

let largeur = 1120;
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("ResizeObserver", class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(el: HTMLElement) {
      Object.defineProperty(el, "clientWidth", { value: largeur, configurable: true });
      this.callback([], this as unknown as ResizeObserver);
    }
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function controle(vue: Vue): ReturnType<typeof useVue> {
  // `bornes` : la frise de partie s'y limite (PR #69) ; ici toute la plage visible.
  return { vue, vueRef: { current: vue }, placer: vi.fn(), animer: vi.fn(), zoomer: vi.fn(), arreter: vi.fn(), bornes: vue } as ReturnType<typeof useVue>;
}
const marqueurs: MarqueurFrise[] = [
  { id: "CARD-016-verdun", titre: "Verdun", date: { year: 1916 }, motif: "casque", illustration: "/api/pedagogie/illustration/CARD-016-verdun", etat: "actif" },
  { id: "CARD-016-nazisme", titre: "Un régime totalitaire", date: { year: 1933 }, motif: "casque" },
];

it.each([1120, 375])("montre une miniature entière et le motif fallback, avec sélection/clic et titres accessibles à %i px", (pixels) => {
  largeur = pixels;
  const ouvrir = vi.fn();
  const { container } = render(<Frise precision="jour" mode="lecture" presentationMarqueurs="illustree" marqueurs={marqueurs} onMarqueur={ouvrir} controle={controle({ debut: 1915, fin: 1934 })} />);
  const dedie = screen.getByRole("button", { name: "Verdun, 1916" });
  const fallback = screen.getByRole("button", { name: "Un régime totalitaire, 1933" });
  expect(dedie.classList.contains(s.marqueurIllustre)).toBe(true);
  expect(dedie.getAttribute("aria-pressed")).toBe("true");
  const img = dedie.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("/api/pedagogie/illustration/CARD-016-verdun");
  expect([img.getAttribute("width"), img.getAttribute("height"), img.getAttribute("alt")]).toEqual(["48", "36", ""]);
  expect(img.getAttribute("loading")).toBe("lazy");
  expect(dedie.querySelector("svg")).toBeNull();
  expect(fallback.querySelector("img")).toBeNull(); expect(fallback.querySelector("use")?.getAttribute("href")).toBe("/motifs.svg#m-casque");
  expect(fallback.classList.contains(s.marqueurIllustre)).toBe(false);
  expect(Number.parseFloat(dedie.style.left)).toBeGreaterThanOrEqual(72);
  expect(Number.parseFloat(dedie.style.left)).toBeLessThanOrEqual(pixels - 72);
  fireEvent.click(dedie); expect(ouvrir).toHaveBeenCalledExactlyOnceWith("CARD-016-verdun");
  expect(container.innerHTML).not.toMatch(/EVT-\d|event_id|content\/illustrations/);
});

it("garde la frise compacte, son motif et sa géométrie pour les autres écrans même avec une illustration optionnelle", () => {
  largeur = 1120;
  render(<Frise precision="jour" mode="lecture" marqueurs={marqueurs} controle={controle({ debut: 1915, fin: 1934 })} />);
  const bouton = screen.getByRole("button", { name: "Verdun, 1916" });
  expect(bouton.querySelector("img")).toBeNull(); expect(bouton.querySelector("svg")).not.toBeNull();
  expect(bouton.classList.contains(s.marqueurIllustre)).toBe(false);
  expect(bouton.classList.contains(s.marqueurPedagogique)).toBe(false);
  expect(bouton.getAttribute("aria-pressed")).toBeNull();
  expect(bouton.style.top).toBe("10px");
  expect(bouton.style.left).toBe("66px");
  expect(screen.getByRole("button", { name: "Un régime totalitaire, 1933" }).style.top).toBe("62px");
});

it("ajuste l'espacement seulement sur opt-in et garde le zoom du groupe, dont la sélection reste visible", () => {
  largeur = 800;
  const dates = [{ ...marqueurs[0], date: { year: 1916 } }, { ...marqueurs[1], date: { year: 1933 } }];
  const vue = controle({ debut: 1900, fin: 2000 }), ouvrir = vi.fn();
  const { rerender } = render(<Frise precision="jour" marqueurs={dates} controle={vue} onMarqueur={ouvrir} />);
  expect(screen.queryByRole("button", { name: /événements proches/ })).toBeNull();
  rerender(<Frise precision="jour" marqueurs={dates} controle={vue} onMarqueur={ouvrir} presentationMarqueurs="illustree" />);
  const groupe = screen.getByRole("button", { name: /^2 événements proches/ });
  expect(groupe.getAttribute("aria-pressed")).toBe("true"); expect(groupe.classList.contains(s.groupeActif)).toBe(true);
  expect(groupe.querySelector("img")).toBeNull();
  fireEvent.click(groupe); expect(vue.animer).toHaveBeenCalledExactlyOnceWith(1907.5, 1941.5); expect(ouvrir).not.toHaveBeenCalled();
});

it("rapproche effectivement les dates d'un grand groupe mobile à chaque clic", () => {
  largeur = 375;
  const chapitre = chargerDemoPedagogie().find(c => c.id === "THM-016")!;
  const cartes = chapitre.cartes.map(c => ({ ...c, illustrationDediee: c.card_id !== "CARD-016-nazisme" }));
  const { plage, bornes } = cadrageChapitre(cartes);
  function Chapitre() {
    const vue = useVue("jour", bornes, plage);
    return <><output>{vue.vue.fin - vue.vue.debut}</output><Frise precision="jour" mode="lecture" presentationMarqueurs="illustree" marqueurs={marqueursCartes(cartes, cartes[0].card_id)} controle={vue} /></>;
  }
  render(<Chapitre />);
  const initiale = Number(screen.getByRole("status").textContent);
  fireEvent.click(screen.getByRole("button", { name: /^12 événements proches/ }));
  expect(Number(screen.getByRole("status").textContent)).toBeLessThan(initiale);
  // Plusieurs clics restent possibles pour déplier les dates rapprochées.
  for (let i = 0; i < 5 && !screen.queryByRole("button", { name: /, 1933$/ }); i++) {
    const groupe = screen.getAllByRole("button", { name: /événements proches/ }).find(b => b.getAttribute("aria-label")!.includes("L’Allemagne nazie"));
    if (!groupe) break;
    const avant = Number(screen.getByRole("status").textContent);
    fireEvent.click(groupe);
    expect(Number(screen.getByRole("status").textContent)).toBeLessThan(avant);
  }
  expect(screen.getByRole("button", { name: /, 1933$/ }).querySelector("use")).not.toBeNull();
});

it("préserve glissement tactile, pincement, molette et commandes de zoom sans capturer le clic d'une miniature", () => {
  largeur = 375;
  class Pointeur extends MouseEvent {
    pointerId: number; pointerType: string;
    constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerId = init.pointerId!; this.pointerType = init.pointerType!; }
  }
  vi.stubGlobal("PointerEvent", Pointeur);
  const vue = controle({ debut: 1900, fin: 2000 }), ouvrir = vi.fn();
  render(<Frise precision="jour" mode="lecture" presentationMarqueurs="illustree" marqueurs={marqueurs} controle={vue} onMarqueur={ouvrir} />);
  const frise = screen.getByLabelText("Frise chronologique : molette pour zoomer, glisser pour se déplacer");
  Object.defineProperty(frise, "setPointerCapture", { value: vi.fn() });
  vi.spyOn(frise, "getBoundingClientRect").mockReturnValue({ left: 0, width: 375 } as DOMRect);
  fireEvent.pointerDown(frise, { pointerId: 1, pointerType: "touch", clientX: 100 });
  fireEvent.pointerMove(frise, { pointerId: 1, pointerType: "touch", clientX: 175 });
  expect(vue.placer).toHaveBeenLastCalledWith(1880, 1980);
  fireEvent.pointerUp(frise, { pointerId: 1, clientX: 175 });
  fireEvent.pointerDown(frise, { pointerId: 1, pointerType: "touch", clientX: 100 });
  fireEvent.pointerDown(frise, { pointerId: 2, pointerType: "touch", clientX: 200 });
  fireEvent.pointerMove(frise, { pointerId: 2, pointerType: "touch", clientX: 300 });
  expect(vue.placer).toHaveBeenLastCalledWith(1920, 1970);
  fireEvent.pointerCancel(frise, { pointerId: 1 }); fireEvent.pointerCancel(frise, { pointerId: 2 });
  fireEvent.wheel(frise, { clientX: 187.5, deltaY: -100 });
  const [debut, fin] = vi.mocked(vue.placer).mock.lastCall!; expect(fin - debut).toBeLessThan(100);
  fireEvent.click(screen.getByRole("button", { name: "Zoomer" })); expect(vue.zoomer).toHaveBeenCalledWith(0.5);
  fireEvent.click(screen.getByRole("button", { name: "Dézoomer" })); expect(vue.zoomer).toHaveBeenCalledWith(2);
  vi.mocked(vue.placer).mockClear();
  // Cadrage rapproché pour séparer la carte du groupe.
  cleanup();
  const rapproche = controle({ debut: 1915, fin: 1934 });
  render(<Frise precision="jour" mode="lecture" presentationMarqueurs="illustree" marqueurs={marqueurs} controle={rapproche} onMarqueur={ouvrir} />);
  const carte = screen.getByRole("button", { name: "Verdun, 1916" });
  fireEvent.pointerDown(carte.querySelector("img")!, { pointerId: 3, pointerType: "touch", clientX: 72 });
  fireEvent.pointerUp(carte, { pointerId: 3, clientX: 72 }); fireEvent.click(carte);
  expect(ouvrir).toHaveBeenCalledExactlyOnceWith("CARD-016-verdun"); expect(rapproche.placer).not.toHaveBeenCalled();
});

it.each([1120, 375])("préserve les dates, les groupes des 41 chapitres et les cartes sans date à %i px", (pixels) => {
  largeur = pixels;
  const canonique = lireCsv("content/pedagogie/cartes-v1.csv");
  let datees = 0, miniatures = 0, motifs = 0;
  for (const chapitre of chargerDemoPedagogie()) {
    const cartes = chapitre.cartes.map(c => ({ ...c, illustrationDediee: Boolean(canonique.find(l => l.card_id === c.card_id)!.event_id) }));
    const marques = marqueursCartes(cartes, cartes[0].card_id);
    datees += marques.length; miniatures += marques.filter(m => m.illustration).length; motifs += marques.filter(m => !m.illustration).length;
    const { plage } = cadrageChapitre(cartes);
    const { container, unmount } = render(<Frise precision="jour" mode="lecture" presentationMarqueurs="illustree" marqueurs={marques} controle={controle(plage)} />);
    const boutons = [...container.querySelectorAll<HTMLButtonElement>("[data-marqueur]")];
    expect(boutons.length).toBeGreaterThan(0);
    for (const bouton of boutons) {
      expect(bouton.getAttribute("aria-label")).toBeTruthy();
      const centre = Number.parseFloat(bouton.style.left);
      const demi = bouton.querySelector("img") ? 70 : bouton.querySelector("svg") ? 54 : 22;
      expect(centre - demi).toBeGreaterThanOrEqual(0); expect(centre + demi).toBeLessThanOrEqual(pixels);
    }
    expect(container.innerHTML).not.toMatch(/EVT-\d|event_id|content\/illustrations/);
    unmount();
  }
  // Les 22 cartes sans date ne sont pas déplacées artificiellement sur la frise.
  expect({ datees, miniatures, motifs }).toEqual({ datees: 303, miniatures: 290, motifs: 13 });
});

describe("empiler : toutes les cartes visibles sans groupe", () => {
  it("monte d'un couloir quand la place est prise et ne chevauche jamais tant qu'il reste des couloirs", () => {
    const r = empiler([{ x: 100, demi: 60 }, { x: 110, demi: 60 }, { x: 400, demi: 60 }], 800, 3);
    expect(r.map((c) => c.couloir)).toEqual([0, 1, 0]);
  });
  it("décale une carte quand tous les couloirs sont pris, y compris contre le bord droit", () => {
    const r = empiler([{ x: 780, demi: 60 }, { x: 790, demi: 60 }, { x: 795, demi: 60 }], 800, 2);
    const meme = r.filter((c) => c.couloir === r[2].couloir);
    expect(Math.abs(meme[0].centre - meme[1].centre)).toBeGreaterThanOrEqual(120);
    for (const c of r) expect(c.centre).toBeLessThanOrEqual(740);
  });
});

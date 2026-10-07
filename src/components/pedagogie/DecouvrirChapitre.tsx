"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CartePedagogique } from "@/lib/pedagogie";
import { cadrageChapitre, debutCarte, marqueursCartes } from "@/lib/apprendre/frise";
import { Frise } from "@/components/frise/Frise";
import { useVue } from "@/components/frise/useVue";
import { versT } from "@/lib/game/frise";
import { Badge } from "@/components/ui/Badge";
import { Bouton } from "@/components/ui/Bouton";

export function DecouvrirChapitre({ cartes }: { cartes: CartePedagogique[] }) {
  const [selection, setSelection] = useState<string | null>(cartes[0]?.card_id ?? null);
  const cadre = useMemo(() => cadrageChapitre(cartes), [cartes]);
  const controle = useVue("jour", cadre.bornes, cadre.plage);
  const { placer, animer, vueRef } = controle;
  const boutons = useRef(new Map<string, HTMLButtonElement>());
  const panneau = useRef<HTMLElement>(null);
  const index = cartes.findIndex((c) => c.card_id === selection);
  const carte = cartes[index];
  const marqueurs = useMemo(() => marqueursCartes(cartes, selection), [cartes, selection]);

  useEffect(() => { placer(cadre.plage.debut, cadre.plage.fin); }, [cadre, placer]);

  function ouvrir(id: string) {
    setSelection(id);
    const date = debutCarte(cartes.find((c) => c.card_id === id)!);
    if (date) {
      const t = versT(date), vue = vueRef.current;
      if (t < vue.debut + (vue.fin - vue.debut) * 0.08 || t > vue.fin - (vue.fin - vue.debut) * 0.08) {
        const rayon = (vue.fin - vue.debut) / 2;
        animer(t - rayon, t + rayon);
      }
    }
    requestAnimationFrame(() => {
      const el = panneau.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      // Sur mobile, la liste précède le panneau : rendre la carte ouverte visible.
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight - 160 || rect.bottom < 0) {
        el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }
    });
  }
  function fermer() {
    if (selection) boutons.current.get(selection)?.focus();
    setSelection(null);
  }

  return <div className="grid min-w-0 gap-6">
    <section aria-label="Frise du chapitre" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl">Parcourir la frise</h2>
        <Bouton variante="secondaire" onClick={() => animer(cadre.plage.debut, cadre.plage.fin)}>Voir tout le chapitre</Bouton>
      </div>
      <Frise precision="jour" mode="lecture" plageInitiale={{ debut: { year: Math.floor(cadre.plage.debut) || -1 }, fin: { year: Math.ceil(cadre.plage.fin) || 1 } }}
        controle={controle} marqueurs={marqueurs} onMarqueur={ouvrir} />
      <p className="m-0 text-sm text-encre-douce">Les périodes sont placées à leur début. Les cartes sans date précise se parcourent dans la liste.</p>
    </section>
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <nav aria-label="Cartes du chapitre" className="min-w-0 border border-filet bg-papier p-4">
        <h2 className="mb-3 text-2xl">Les cartes</h2>
        <ol className="m-0 grid list-none gap-2 p-0">
          {cartes.map((c, i) => <li key={c.card_id}>
            <button type="button" aria-pressed={selection === c.card_id} onClick={() => ouvrir(c.card_id)}
              ref={(el) => { if (el) boutons.current.set(c.card_id, el); else boutons.current.delete(c.card_id); }}
              className={`cible flex w-full items-start gap-3 border p-3 text-left ${selection === c.card_id ? "border-laiton bg-fond-resultat" : "border-filet bg-blanc-cartel hover:border-laiton"}`}>
              <span className="date shrink-0 text-oxyde">{i + 1}</span>
              <span className="min-w-0 break-words">{c.title}</span>
            </button>
          </li>)}
        </ol>
      </nav>
      {carte ? <article ref={panneau} tabIndex={-1} aria-labelledby="titre-carte" className="grid min-w-0 gap-5 border border-filet bg-papier p-5 shadow-cartel sm:p-8"
        onKeyDown={(e) => {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          if (e.key === "Escape") { e.preventDefault(); fermer(); }
          if (e.key === "ArrowLeft" && index > 0) { e.preventDefault(); ouvrir(cartes[index - 1].card_id); }
          if (e.key === "ArrowRight" && index < cartes.length - 1) { e.preventDefault(); ouvrir(cartes[index + 1].card_id); }
        }}>
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm text-encre-douce" aria-live="polite">Carte {index + 1} sur {cartes.length}</p>
          <button type="button" onClick={fermer} className="cible underline">Fermer</button>
        </div>
        <header className="grid gap-2">
          <p className="date m-0 text-xl text-oxyde">{carte.date_text}</p>
          <h2 id="titre-carte" className="break-words text-3xl leading-tight">{carte.title}</h2>
        </header>
        {/* SVG du dépôt, servi sous card_id ; aucun chemin d'événement. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG 160×120 déjà optimisé, URL applicative sûre */}
        <img src={`/api/pedagogie/illustration/${encodeURIComponent(carte.card_id)}`} alt="" width={160} height={120}
          className="mx-auto block h-auto w-full max-w-60 border border-filet" />
        <p className="m-0 max-w-prose break-words leading-relaxed">{carte.body}</p>
        <p className="m-0 border-l-2 border-laiton bg-fond-resultat p-4 leading-relaxed"><strong>À retenir :</strong> {carte.takeaway.replace(/^À retenir :\s*/, "")}</p>
        <div className="grid gap-2">
          <h3 className="text-xl">Notions clés</h3>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {carte.key_concepts.map((notion) => <li key={notion}><Badge ton="laiton">{notion}</Badge></li>)}
          </ul>
        </div>
        <nav aria-label="Parcourir les cartes" className="grid grid-cols-2 gap-3 border-t border-filet pt-4">
          <Bouton variante="secondaire" disabled={index === 0} onClick={() => ouvrir(cartes[index - 1].card_id)}>← Précédente</Bouton>
          <Bouton variante="secondaire" disabled={index === cartes.length - 1} onClick={() => ouvrir(cartes[index + 1].card_id)}>Suivante →</Bouton>
        </nav>
      </article> : <p className="border border-filet bg-papier p-5">Choisis une carte sur la frise ou dans la liste pour la lire.</p>}
    </div>
    <div className="grid justify-items-start gap-2 border-t border-filet pt-5">
      <Bouton disabled aria-describedby="test-a-venir">Me tester sur ce chapitre</Bouton>
      <p id="test-a-venir" className="m-0 text-sm text-encre-douce">Le test de ce chapitre sera disponible prochainement.</p>
    </div>
  </div>;
}

"use client";

import { useState } from "react";
import { Badge, BadgeNiveau } from "@/components/ui/Badge";
import type { ChapitrePedagogique } from "@/lib/pedagogie";

export function DemoPedagogie({ chapitres }: { chapitres: ChapitrePedagogique[] }) {
  const [selection, setSelection] = useState(chapitres[0].id);
  const chapitre = chapitres.find((c) => c.id === selection)!;

  return (
    <div className="grid gap-8">
      <div className="grid justify-items-start gap-2">
        <label htmlFor="chapitre-pedagogie" className="inventaire">Choisir un chapitre</label>
        <select
          id="chapitre-pedagogie"
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="cible max-w-full border border-filet bg-papier px-3 py-2 text-encre focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-laiton"
        >
          {[...new Set(chapitres.map((c) => c.niveau))].map((niveau) => (
            <optgroup key={niveau} label={niveau}>
              {chapitres.filter((c) => c.niveau === niveau).map((c) => (
                <option key={c.id} value={c.id}>{c.id} · {c.titre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <section aria-labelledby="titre-chapitre" className="grid gap-6">
        <header className="grid gap-3 border-b border-filet pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <BadgeNiveau niveau={chapitre.niveau} />
            <span className="inventaire" aria-live="polite">{chapitre.cartes.length} cartes</span>
          </div>
          <h2 id="titre-chapitre" className="max-w-3xl text-3xl leading-tight">{chapitre.titre}</h2>
          {chapitre.lacune && (
            <p className="m-0 max-w-prose text-sm text-encre-douce">
              {chapitre.lacune}
            </p>
          )}
        </header>
        <ol className="m-0 grid list-none gap-6 p-0">
          {chapitre.cartes.map((carte) => (
            <li key={carte.card_id}>
              <article className="grid gap-5 border border-filet bg-papier p-5 sm:p-8">
                <header className="grid gap-2">
                  <p className="date m-0 text-lg text-oxyde">{carte.date_text}</p>
                  <h3 className="text-2xl leading-tight">{carte.title}</h3>
                </header>
                <p className="m-0 max-w-prose leading-relaxed">{carte.body}</p>
                <p className="m-0 max-w-prose border-l-2 border-laiton bg-fond-resultat px-4 py-3 leading-relaxed">
                  <strong>À retenir :</strong> {carte.takeaway.replace(/^À retenir :\s*/, "")}
                </p>
                <div className="grid gap-2">
                  <span className="inventaire">Notions clés</span>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {carte.key_concepts.map((notion) => <li key={notion}><Badge ton="laiton">{notion}</Badge></li>)}
                  </ul>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

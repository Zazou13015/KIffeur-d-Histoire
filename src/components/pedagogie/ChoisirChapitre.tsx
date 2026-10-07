"use client";

import { useState } from "react";
import Link from "next/link";
import type { Chapitre } from "@/lib/apprendre/catalogue";
import { cheminChapitre, NIVEAUX } from "@/lib/apprendre/catalogue";
import { Motif } from "@/components/charte/Motif";

export function ChoisirChapitre({ chapitres }: { chapitres: Chapitre[] }) {
  const [niveau, setNiveau] = useState(NIVEAUX[0].slug);
  return <div className="grid min-w-0 gap-6">
    <div className="grid gap-2">
      <label htmlFor="niveau-apprendre" className="font-bold">1. Choisir mon niveau</label>
      <select id="niveau-apprendre" value={niveau} onChange={(e) => setNiveau(e.target.value)}
        className="cible w-full max-w-md border border-filet bg-papier px-3 py-2 text-base text-encre">
        {NIVEAUX.map((n) => <option key={n.slug} value={n.slug}>{n.nom}</option>)}
      </select>
    </div>
    <h2 className="text-2xl">2. Découvrir un chapitre</h2>
    {NIVEAUX.map((n) => <section key={n.slug} hidden={niveau !== n.slug} aria-label={`Chapitres ${n.nom}`}>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
        {chapitres.filter((c) => c.niveauSlug === n.slug).map((c) => <li key={c.id} className="min-w-0">
          <Link href={cheminChapitre(c)} prefetch={false}
            className="flex h-full items-center gap-4 border border-filet bg-papier p-5 text-encre shadow-cartel hover:border-laiton">
            <Motif nom="parchemin" className="h-10 w-10 shrink-0" />
            <span className="min-w-0 break-words text-lg leading-snug">{c.titre}</span>
          </Link>
        </li>)}
      </ul>
    </section>)}
  </div>;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Chapitre } from "@/lib/apprendre/catalogue";
import { cheminChapitre, NIVEAUX } from "@/lib/apprendre/catalogue";
import { Motif } from "@/components/charte/Motif";
import { lireProgression } from "@/app/apprendre/actions";
import { lireProgressionSession } from "@/lib/progression/session";
import type { Progression } from "@/lib/progression/types";
import { PastillesProgression } from "./PastillesProgression";

export function ChoisirChapitre({ chapitres }: { chapitres: Chapitre[] }) {
  const [niveau, setNiveau] = useState(NIVEAUX[0].slug);
  // La page est statique et identique pour tous : la progression arrive après coup, par une Server Action
  // (compte connecté) ou depuis la session du navigateur (sans compte).
  const [progression, setProgression] = useState<Progression | null>(null);
  useEffect(() => {
    let actif = true;
    const session = (): Progression => ({ connecte: false, chapitres: lireProgressionSession() });
    lireProgression().then((p) => { if (actif) setProgression(p ?? session()); }).catch(() => { if (actif) setProgression(session()); });
    return () => { actif = false; };
  }, []);
  return <div className="grid min-w-0 gap-6">
    <div className="grid gap-2">
      <label htmlFor="niveau-apprendre" className="font-bold">1. Choisir mon niveau</label>
      <select id="niveau-apprendre" value={niveau} onChange={(e) => setNiveau(e.target.value)}
        className="cible w-full max-w-md border border-filet bg-papier px-3 py-2 text-base text-encre">
        {NIVEAUX.map((n) => <option key={n.slug} value={n.slug}>{n.nom}</option>)}
      </select>
    </div>
    <h2 className="text-2xl">2. Découvrir un chapitre</h2>
    {progression && !progression.connecte && <p role="note" className="m-0 max-w-prose text-sm text-encre-douce">
      Sans compte, ta progression est gardée seulement tant que cet onglet reste ouvert.{" "}
      <Link href="/connexion?next=%2Fapprendre" className="font-bold underline underline-offset-4">Se connecter pour la garder</Link>
    </p>}
    {NIVEAUX.map((n) => <section key={n.slug} hidden={niveau !== n.slug} aria-label={`Chapitres ${n.nom}`}>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
        {chapitres.filter((c) => c.niveauSlug === n.slug).map((c) => <li key={c.id} className="min-w-0">
          <Link href={cheminChapitre(c)} prefetch={false}
            className="flex h-full items-center gap-4 border border-filet bg-papier p-5 text-encre shadow-cartel hover:border-laiton">
            <Motif nom="parchemin" className="h-10 w-10 shrink-0" />
            <span className="grid min-w-0 gap-2">
              <span className="break-words text-lg leading-snug">{c.titre}</span>
              <PastillesProgression progression={progression?.chapitres[c.id]} />
            </span>
          </Link>
        </li>)}
      </ul>
    </section>)}
  </div>;
}

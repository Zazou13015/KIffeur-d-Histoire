import type { Metadata } from "next";
import Link from "next/link";
import { DemoPartie } from "./DemoPartie";

export const metadata: Metadata = { title: "Démonstration de la partie · Kiffeurs d'Histoire" };

export default function PageDemoPartie() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="conteneur grid gap-2 py-5">
        <span className="inventaire">Démonstration · issue 3.4</span>
        <h1 className="text-4xl leading-tight">Une partie de trois questions</h1>
        <p className="m-0 max-w-prose text-encre-douce">
          Le déroulé complet (question, chrono, correction, bilan) avec un faux moteur dans le navigateur, chrono de 15 secondes. La vraie
          partie se lance depuis <Link href="/partie/nouvelle" className="underline underline-offset-4">Nouvelle partie</Link>.
        </p>
      </header>
      <DemoPartie />
    </main>
  );
}

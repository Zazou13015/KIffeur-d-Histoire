import type { Metadata } from "next";
import { DemoFrise } from "./DemoFrise";

export const metadata: Metadata = { title: "Démonstration de la frise · Kiffeurs d'Histoire" };

export default function PageDemoFrise() {
  return (
    <main className="conteneur grid flex-1 grid-cols-1 content-start gap-6 py-8">
      <header className="grid gap-2">
        <span className="inventaire">Démonstration · issue 3.2</span>
        <h1 className="text-4xl leading-tight">La frise zoomable</h1>
        <p className="m-0 max-w-prose text-encre-douce">
          Molette ou pincement pour zoomer, glisser pour se déplacer. Les dix événements de la base d&apos;exemple sont posés sur la
          frise : zoomez pour séparer ceux qui sont proches. En mode « réponse », un clic donne la date à la précision choisie.
        </p>
      </header>
      <DemoFrise />
    </main>
  );
}

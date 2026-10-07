import type { Metadata } from "next";
import { DemoSaisie } from "./DemoSaisie";

export const metadata: Metadata = { title: "Démonstration de la saisie · Kiffeurs d'Histoire" };

export default function PageDemoSaisie() {
  return (
    <main className="conteneur grid flex-1 grid-cols-1 content-start gap-6 py-8">
      <header className="grid gap-2">
        <span className="inventaire">Démonstration · issue 3.3</span>
        <h1 className="text-4xl leading-tight">Répondre : clavier, calendrier ou frise</h1>
        <p className="m-0 max-w-prose text-encre-douce">
          Les trois façons de répondre donnent le même résultat. Tapez une date, choisissez-la au calendrier ou cliquez sur la
          frise : la réponse s&apos;affiche en bas, et la frise la montre quelle que soit la méthode.
        </p>
      </header>
      <DemoSaisie />
    </main>
  );
}

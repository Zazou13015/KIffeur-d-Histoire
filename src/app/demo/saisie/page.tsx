import type { Metadata } from "next";
import { DemoSaisie } from "./DemoSaisie";

export const metadata: Metadata = { title: "Démonstration de la saisie · Kiffeurs d'Histoire" };

export default function PageDemoSaisie() {
  return (
    <main className="conteneur grid flex-1 grid-cols-1 content-start gap-6 py-8">
      <header className="grid gap-2">
        <span className="inventaire">Démonstration · issue 3.3</span>
        <h1 className="text-4xl leading-tight">Répondre au clavier ou sur la frise</h1>
        <p className="m-0 max-w-prose text-encre-douce">
          Tapez la date dans les cases jour, mois, année, ou pointez la frise : les deux se répondent. La réponse
          s&apos;affiche en bas.
        </p>
      </header>
      <DemoSaisie />
    </main>
  );
}

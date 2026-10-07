import type { Metadata } from "next";
import { DemoPartie } from "./DemoPartie";

export const metadata: Metadata = { title: "Démonstration de la partie · Kiffeurs d'Histoire" };

export default function PageDemoPartie() {
  return (
    <main className="flex flex-1 flex-col">
      <DemoPartie />
    </main>
  );
}

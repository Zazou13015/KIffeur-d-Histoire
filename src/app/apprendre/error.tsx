"use client";
import { Bouton } from "@/components/ui/Bouton";
export default function ErreurChapitre({ retry }: { retry: () => void }) {
  return <main className="conteneur grid flex-1 content-start justify-items-start gap-5 py-8">
    <h1 className="text-3xl">Le chapitre est momentanément indisponible</h1>
    <p>Réessaie dans quelques instants.</p>
    <Bouton onClick={retry}>Réessayer</Bouton>
    <Bouton href="/apprendre" variante="secondaire">Choisir un autre chapitre</Bouton>
  </main>;
}

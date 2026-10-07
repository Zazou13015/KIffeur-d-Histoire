import { Bouton } from "@/components/ui/Bouton";
export default function ChapitreIntrouvable() {
  return <main className="conteneur grid flex-1 content-start justify-items-start gap-5 py-8">
    <h1 className="text-3xl">Chapitre introuvable</h1>
    <p>Ce chapitre n’est pas disponible pour ce niveau.</p>
    <Bouton href="/apprendre">Choisir un chapitre</Bouton>
  </main>;
}

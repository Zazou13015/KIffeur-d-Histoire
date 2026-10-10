"use client";

export default function PacksError({ reset }: { reset: () => void }) {
  return <main className="conteneur flex-1 py-8">
    <h1 className="font-titre text-3xl">Gestion des packs indisponible</h1>
    <p>Les packs n’ont pas pu être chargés. Réessayez dans un instant.</p>
    <button className="cible rounded bg-encre px-4 text-papier" onClick={reset}>Réessayer</button>
  </main>;
}

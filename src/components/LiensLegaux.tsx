import Link from "next/link";

// Liens discrets vers les pages légales, sous l'accueil et les formulaires de compte.
export default function LiensLegaux() {
  return (
    <p className="m-0 flex flex-wrap gap-x-4 text-sm text-encre-douce">
      <Link href="/mentions-legales" className="cible inline-flex items-center underline">Mentions légales</Link>
      <Link href="/confidentialite" className="cible inline-flex items-center underline">Confidentialité</Link>
    </p>
  );
}

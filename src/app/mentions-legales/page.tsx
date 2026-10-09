import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Mentions légales · Kiffeurs d’Histoire" };

export default function MentionsLegales() {
  return (
    <main className="conteneur flex-1 py-8">
      <article className="max-w-2xl space-y-4">
        <h1 className="font-titre text-3xl">Mentions légales</h1>

        <h2 className="font-titre text-xl">Éditeurs</h2>
        <p>
          Kiffeurs d’Histoire est un jeu gratuit, sans publicité, édité à titre non professionnel par Maxou et
          Antonin, les créateurs de KFFR Contrée. Conformément à l’article 6 de la loi pour la confiance dans
          l’économie numérique, leur identité a été communiquée à l’hébergeur.
        </p>
        <p>Contact : <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a></p>

        <h2 className="font-titre text-xl">Hébergement</h2>
        <p>
          Site : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).
          <br />
          Base de données et comptes : Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 (supabase.com),
          serveurs situés dans l’Union européenne (Stockholm).
        </p>

        <h2 className="font-titre text-xl">Contenus</h2>
        <p>
          Les événements, dates, explications et illustrations sont rédigés par les éditeurs à partir des programmes
          d’histoire de l’Éducation nationale et de sources publiques. Une erreur ? Écrivez-nous, nous corrigeons.
        </p>

        <h2 className="font-titre text-xl">Données personnelles</h2>
        <p>
          Voir la <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
        </p>
      </article>
    </main>
  );
}

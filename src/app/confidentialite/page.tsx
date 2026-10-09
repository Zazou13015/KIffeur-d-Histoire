import Link from "next/link";

export const metadata = { title: "Confidentialité · Kiffeurs d’Histoire" };

export default function Confidentialite() {
  return (
    <main className="conteneur flex-1 py-8">
      <article className="max-w-2xl space-y-4">
        <h1 className="font-titre text-3xl">Politique de confidentialité</h1>
        <p>
          On collecte le moins possible : de quoi faire marcher le jeu et garder ta progression si tu crées un compte.
          Rien n’est vendu, rien ne sert à de la publicité.
        </p>

        <h2 className="font-titre text-xl">Sans compte</h2>
        <p>
          Tu peux tout jouer sans compte. Tes réponses sont gardées 24 heures, le temps de finir la partie, puis
          effacées. Pour mesurer si le jeu plaît (nombre de parties, joueurs qui reviennent), on garde pour chaque
          partie une ligne sans titre, sans réponse et sans donnée personnelle : le mode, la difficulté, la précision
          moyenne et un identifiant tiré au hasard pour ton navigateur.
        </p>

        <h2 className="font-titre text-xl">Avec un compte</h2>
        <p>
          Le compte est commun à Kiffeurs d’Histoire et à KFFR Contrée. On garde ton adresse e-mail (ou ton compte
          Google si tu te connectes avec lui), ton pseudo, et tes parties (réponses, scores, chapitres découverts) pour
          t’afficher ton historique et tes statistiques. Ton pseudo est le seul élément visible par les autres
          joueurs. Ces données sont gardées tant que ton compte existe.
        </p>

        <h2 className="font-titre text-xl">Cookies</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Cookies de connexion, si tu as un compte : nécessaires pour rester connecté.</li>
          <li>Un cookie par partie sans compte, effacé à la fermeture du navigateur : il prouve que la partie est la tienne.</li>
          <li>
            <code>histoire-visiteur</code> : l’identifiant tiré au hasard dont on parle plus haut, gardé 13 mois au plus,
            uniquement pour nos statistiques de fréquentation. Il ne sert à aucune publicité et n’est partagé avec personne.
          </li>
        </ul>
        <p>Les statistiques de pages vues de Vercel fonctionnent sans cookie.</p>

        <h2 className="font-titre text-xl">Moins de 15 ans</h2>
        <p>
          Le jeu est pensé pour les collégiens et les lycéens. Avant 15 ans, demande l’accord d’un parent pour créer
          un compte. Un parent peut nous demander de supprimer le compte de son enfant.
        </p>

        <h2 className="font-titre text-xl">Qui voit tes données</h2>
        <p>
          Seulement les éditeurs et nos deux hébergeurs, Vercel (le site) et Supabase (la base de données, en Europe) :
          voir les <Link href="/mentions-legales" className="underline">mentions légales</Link>.
        </p>

        <h2 className="font-titre text-xl">Tes droits</h2>
        <p>
          Tu peux demander à voir, corriger ou supprimer tes données, ou ton compte, en le demandant directement à Maxou ou à
          Antonin, sur les réseaux de KFFR. On répond sous un mois. Tu peux aussi saisir la CNIL (cnil.fr).
        </p>
      </article>
    </main>
  );
}

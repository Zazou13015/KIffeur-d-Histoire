import { notFound, redirect } from "next/navigation";
import { getAccount } from "@/lib/account";
import { chargerIndicateurs, type Indicateurs } from "@/lib/indicateurs";

export const metadata = {
  title: "Indicateurs · Kiffeurs d’Histoire",
  robots: { index: false, follow: false },
};

// Réservée aux comptes de histoire.admins (Maxou et Antonin) : la base refuse tous les autres.
export default async function IndicateursPage() {
  const account = await getAccount();
  if (!account) redirect(`/connexion?next=${encodeURIComponent("/admin/indicateurs")}`);
  const kpi = await chargerIndicateurs();
  // Un autre compte ne doit même pas savoir que la page existe.
  if (!kpi) notFound();

  return (
    <main className="conteneur flex-1 py-8">
      <p className="inventaire">Cabinet de l’équipe</p>
      <h1 className="font-titre text-3xl">Indicateurs de réussite</h1>
      <p className="mb-6 max-w-2xl text-encre-douce">
        Les six mesures du PRD, sur les 7 et les 30 derniers jours. Un joueur est un compte, ou un navigateur
        anonyme. Calculé le {new Date(kpi.calcule_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {CARTES.map((carte) => (
          <section key={carte.titre} className="rounded border border-filet bg-blanc-cartel p-4">
            <h2 className="font-titre text-lg">{carte.titre}</h2>
            <p className="mb-3 text-sm text-encre-douce">{carte.question}</p>
            <div className="grid grid-cols-2 gap-3">
              {([7, 30] as const).map((jours) => {
                const { valeur, detail } = carte.lire(kpi, jours);
                return (
                  <div key={jours}>
                    <span className="inventaire">{jours} jours</span>
                    <p className="date m-0 text-3xl">{valeur}</p>
                    <p className="m-0 text-sm text-encre-douce">{detail}</p>
                  </div>
                );
              })}
            </div>
            {carte.note && <p className="mt-3 mb-0 text-xs text-encre-douce">{carte.note}</p>}
          </section>
        ))}
      </div>
    </main>
  );
}

const pourcent = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("fr-FR")} %`);
const nombre = (v: number | null) => (v == null ? "—" : v.toLocaleString("fr-FR"));
function ligne<K extends keyof Omit<Indicateurs, "calcule_le">>(kpi: Indicateurs, cle: K, jours: 7 | 30) {
  return kpi[cle].find((l) => l.jours === jours) as Indicateurs[K][number];
}

type Carte = {
  titre: string;
  question: string;
  note?: string;
  lire: (kpi: Indicateurs, jours: 7 | 30) => { valeur: string; detail: string };
};

const CARTES: Carte[] = [
  {
    titre: "Parties terminées par session",
    question: "Le geste central donne-t-il envie d’enchaîner ?",
    note: "Une session regroupe les parties d’un même joueur espacées de moins de 30 minutes.",
    lire: (kpi, j) => {
      const l = ligne(kpi, "parties_par_session", j);
      return { valeur: nombre(l.parties_terminees_par_session), detail: `${l.parties_terminees} terminées sur ${l.parties_lancees} lancées, ${l.sessions} sessions` };
    },
  },
  {
    titre: "Joueurs qui reviennent dans la semaine",
    question: "Le jeu fidélise-t-il ?",
    note: "Rejoue un autre jour, au plus 7 jours après sa première partie de la période. Les derniers arrivés n’ont pas encore eu toute leur semaine.",
    lire: (kpi, j) => {
      const l = ligne(kpi, "retour_semaine", j);
      return { valeur: pourcent(l.part_revenus), detail: `${l.joueurs_revenus} joueurs revenus sur ${l.joueurs}` };
    },
  },
  {
    titre: "Parties en scolaire et en pédagogique",
    question: "Les élèves s’en servent-ils pour réviser ?",
    note: "Pédagogique : tests « Me tester sur ce chapitre ».",
    lire: (kpi, j) => {
      const l = ligne(kpi, "repartition_modes", j);
      return {
        valeur: pourcent(l.part_scolaire_pedagogique),
        detail: `Sur ${l.parties} parties : ${l.scolaire} scolaire, ${l.pedagogique} pédagogique, ${l.libre} libre, ${l.inverse} inversé`,
      };
    },
  },
  {
    titre: "Joueurs sans compte qui passent à un compte",
    question: "La sauvegarde de progression motive-t-elle ?",
    note: "Navigateurs qui ont joué sans compte, puis se sont connectés (nouvelle partie ou partie sauvegardée).",
    lire: (kpi, j) => {
      const l = ligne(kpi, "conversion_compte", j);
      return { valeur: pourcent(l.part_convertis), detail: `${l.joueurs_convertis} sur ${l.joueurs_sans_compte} joueurs sans compte` };
    },
  },
  {
    titre: "Réponses à la frise ou au clavier",
    question: "Quelle saisie privilégier ?",
    note: "Il n’y a pas de calendrier dans la V1 (décision du PRD) : sa part reste à 0.",
    lire: (kpi, j) => {
      const l = ligne(kpi, "methodes_saisie", j);
      return {
        valeur: `${pourcent(l.part_frise)} frise`,
        detail: `${l.frise} à la frise, ${l.clavier} au clavier, ${l.calendrier} au calendrier (${pourcent(l.part_clavier)} clavier)`,
      };
    },
  },
  {
    titre: "Progression sur un même chapitre",
    question: "Le jeu fait-il vraiment apprendre ?",
    note: "Écart de précision entre le premier et le dernier test d’un joueur sur un chapitre (au moins deux tests).",
    lire: (kpi, j) => {
      const l = ligne(kpi, "progression_chapitre", j);
      const gain = l.gain_moyen == null ? "—" : `${l.gain_moyen > 0 ? "+" : ""}${l.gain_moyen.toLocaleString("fr-FR")} pts`;
      return {
        valeur: gain,
        detail: `${l.en_progres} en progrès sur ${l.joueurs_chapitres} (de ${pourcent(l.precision_premier_test)} à ${pourcent(l.precision_dernier_test)})`,
      };
    },
  },
];

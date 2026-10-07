import Link from "next/link";
import { lancer } from "@/app/partie/actions";
import SaveGame from "@/app/partie/[id]/SaveGame";
import { Bouton } from "@/components/ui/Bouton";
import { formatHistoricDate } from "@/lib/game/dates";
import { dateDepuis, precisionDepuis } from "@/lib/game/partie";
import type { SoloResult } from "@/lib/game/solo";

type Props = {
  resultat: SoloResult;
  /** Un compte est connecté. */
  connecte: boolean;
  /** La partie a été jouée sans compte et peut encore être rattachée au compte connecté. */
  anonyme: boolean;
};

// Fin de partie : précision moyenne, points (100 par question) et la bonne date de chaque question.
export function Bilan({ resultat, connecte, anonyme }: Props) {
  const { game_id: id, question_count: n, total_points: points, average_accuracy: precision, questions } = resultat;
  const suite = `/partie/${id}`;
  const difficulte = questions[0]?.unit ?? "YEAR";

  return (
    <section className="grid gap-5" aria-label="Fin de la partie">
      <header className="grid gap-1">
        <span className="inventaire">Partie terminée</span>
        <h1 className="text-4xl leading-tight">
          <span className="date text-5xl text-oxyde">{points}</span> points
          <span className="text-2xl text-encre-douce"> sur {n * 100}</span>
        </h1>
        <p className="m-0 text-encre-douce">
          Précision moyenne : <b className="text-encre">{precision} %</b>
        </p>
      </header>

      {!connecte ? (
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 border border-laiton bg-laiton-clair px-4 py-3">
          <span>Tu as joué sans compte : cette partie ne sera pas sauvegardée.</span>
          <Link href={`/connexion?next=${encodeURIComponent(suite)}`} className="font-bold underline underline-offset-4">
            Se connecter pour la sauvegarder
          </Link>
        </p>
      ) : anonyme ? (
        <SaveGame gameId={id} />
      ) : (
        <p role="status" className="m-0 text-encre-douce">
          Partie sauvegardée dans ton compte KFFR.
        </p>
      )}

      <ol className="m-0 grid list-none gap-2 p-0">
        {questions.map((q) => (
          <li key={q.question_id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border border-filet bg-blanc-cartel px-4 py-3">
            <span className="date text-xl text-encre-douce">{q.position}</span>
            <span className="grid gap-0.5">
              <span className="font-bold">{q.title}</span>
              <span className="date text-lg text-oxyde">{formatHistoricDate(dateDepuis(q.correct_date), precisionDepuis(q.unit))}</span>
              {q.expired && <span className="text-sm text-encre-douce">Temps écoulé</span>}
            </span>
            <span className="date text-xl">{q.points} pts</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <form action={lancer}>
          <input type="hidden" name="difficulte" value={difficulte} />
          <Bouton type="submit">Rejouer</Bouton>
        </form>
        <Bouton variante="secondaire" href="/">
          Changer de mode
        </Bouton>
      </div>
    </section>
  );
}

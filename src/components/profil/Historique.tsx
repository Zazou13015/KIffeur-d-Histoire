import Link from "next/link";
import { Badge, BadgeDifficulte } from "@/components/ui/Badge";
import {
  datePartie,
  MODES_PROFIL,
  nombre,
  pourcentage,
  type Historique as DonneesHistorique,
} from "@/lib/profil/types";
import styles from "./Profil.module.css";

export function Historique({
  data,
  cursor,
  next,
}: {
  data: DonneesHistorique;
  cursor: string | null;
  next: string;
}) {
  const query = new URLSearchParams();
  if (data.next_cursor) query.set("curseur", data.next_cursor);
  if (next !== "/profil") query.set("next", next);
  return (
    <section aria-labelledby="historique-titre">
      <h2 id="historique-titre" className={styles.heading}>
        Tes dernières parties
      </h2>
      <p className={`${styles.muted} mb-5`}>
        Les parties terminées et sauvegardées, de la plus récente à la plus
        ancienne.
      </p>
      {!data.games.length ? (
        <div className={styles.empty}>
          <h3 className={styles.heading}>
            {cursor
              ? "Tu as parcouru tout ton historique."
              : "Ton histoire commence ici."}
          </h3>
          <p>
            {cursor
              ? "Reviens aux dernières parties pour consulter tes résultats."
              : "Joue une première partie en étant connecté : ton résultat trouvera sa place dans ce carnet."}
          </p>
          <Link className={styles.link} href="/">
            Choisir un mode de jeu
          </Link>
        </div>
      ) : (
        <ol className={styles.games}>
          {data.games.map((game) => (
            <li key={game.id} className={styles.game}>
              <div className={styles.gameTop}>
                <h3 className="text-lg">{MODES_PROFIL[game.mode]}</h3>
                <time className={styles.muted} dateTime={game.finished_at}>
                  {datePartie(game.finished_at)}
                </time>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <BadgeDifficulte
                  niveau={
                    { YEAR: "facile", MONTH: "moyen", DAY: "difficile" }[
                      game.difficulty
                    ] as "facile" | "moyen" | "difficile"
                  }
                />
                <Badge>{game.question_count} questions</Badge>
              </div>
              <dl className={styles.gameMetrics}>
                <div>
                  <dt className={styles.muted}>Score</dt>
                  <dd className="date text-2xl">
                    {nombre(game.total_points)}{" "}
                    <span className="text-base font-normal">
                      / {nombre(game.question_count * 100)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className={styles.muted}>Précision</dt>
                  <dd className="date text-2xl">
                    {pourcentage(game.average_accuracy)}
                  </dd>
                </div>
              </dl>
              {(game.pack ||
                game.theme ||
                game.level ||
                game.chapters.length > 0) && (
                <ul className={styles.context}>
                  {game.pack && <li>Pack : {game.pack}</li>}
                  {game.theme && <li>Thème : {game.theme}</li>}
                  {game.level && <li>Niveau : {game.level}</li>}
                  {game.chapters.map((chapter, i) => (
                    <li key={i}>
                      Chapitre : {chapter.label} · {chapter.level}
                    </li>
                  ))}
                </ul>
              )}
              <Link className={styles.link} href={`/partie/${game.id}`}>
                Revoir le bilan{" "}
                <span aria-hidden="true" className="ml-2">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <nav aria-label="Pages de l’historique" className={styles.pagination}>
        {cursor && (
          <Link
            className={styles.link}
            href={
              next === "/profil"
                ? "/profil"
                : `/profil?next=${encodeURIComponent(next)}`
            }
          >
            Retour aux dernières parties
          </Link>
        )}
        {data.next_cursor && (
          <Link className={styles.link} href={`/profil?${query}`}>
            Parties plus anciennes →
          </Link>
        )}
      </nav>
    </section>
  );
}

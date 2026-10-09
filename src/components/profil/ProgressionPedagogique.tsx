import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CHAPITRES, cheminChapitre, NIVEAUX } from "@/lib/apprendre/catalogue";
import { nombre, pourcentage } from "@/lib/profil/types";
import { LIBELLE_DIFFICULTE, type Progression } from "@/lib/progression/types";
import styles from "./Profil.module.css";

// Progression pédagogique du joueur connecté : chapitres découverts et meilleur test par chapitre,
// regroupés par niveau. `null` = lecture impossible : on le dit, sans inventer de zéros.
export function ProgressionPedagogique({ progression }: { progression: Progression | null }) {
  return (
    <section aria-labelledby="progression-titre" className="border-t border-filet pt-5">
      <h2 id="progression-titre" className={styles.heading}>Ton parcours pédagogique</h2>
      {!progression ? (
        <p role="alert" className={styles.muted}>
          Ta progression est momentanément indisponible. Elle reste enregistrée ; recharge la page dans quelques instants.
        </p>
      ) : <Parcours progression={progression} />}
    </section>
  );
}

function Parcours({ progression }: { progression: Progression }) {
  const lignes = Object.values(progression.chapitres);
  const decouverts = lignes.filter((p) => p.decouvert).length;
  const testes = lignes.filter((p) => p.precision != null).length;
  if (!decouverts && !testes) {
    return (
      <div className={styles.empty}>
        <h3 className={styles.heading}>Un premier chapitre, puis des repères.</h3>
        <p>Ouvre un chapitre pour le découvrir, puis teste-toi : tes chapitres découverts et ton meilleur test apparaîtront ici.</p>
        <Link href="/apprendre" className={styles.link}>Découvrir un chapitre →</Link>
      </div>
    );
  }
  return (
    <>
      <p className={styles.muted}>
        {nombre(decouverts)} chapitre{decouverts > 1 ? "s" : ""} découvert{decouverts > 1 ? "s" : ""} sur {CHAPITRES.length}
        {" · "}{nombre(testes)} testé{testes > 1 ? "s" : ""}. Le meilleur test garde la précision la plus haute, quelle que soit la difficulté choisie.
      </p>
      <div className="grid gap-2">
        {NIVEAUX.map((n) => {
          const chapitres = CHAPITRES.filter((c) => c.niveauSlug === n.slug);
          const vus = chapitres.filter((c) => progression.chapitres[c.id]?.decouvert).length;
          const essayes = chapitres.filter((c) => progression.chapitres[c.id]?.precision != null).length;
          return (
            <details key={n.slug} open={vus + essayes > 0} className="border border-filet bg-blanc-cartel">
              <summary className="cible cursor-pointer px-3 py-2 font-bold">
                {n.nom}
                <span className="font-normal text-encre-douce"> · {vus} sur {chapitres.length} découverts · {essayes} testés</span>
              </summary>
              <ul className="m-0 grid list-none gap-1 p-3 pt-0">
                {chapitres.map((c) => {
                  const p = progression.chapitres[c.id];
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link href={cheminChapitre(c)} className="min-w-0 break-words underline underline-offset-4">{c.titre}</Link>
                      {p?.decouvert && <Badge ton="sauge">Découvert</Badge>}
                      {p?.precision != null && (
                        <Badge ton="laiton">
                          Meilleur test : {pourcentage(p.precision)}{p.difficulte ? ` · ${LIBELLE_DIFFICULTE[p.difficulte]}` : ""}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
      <Link href="/apprendre" className={styles.link}>Découvrir un chapitre →</Link>
    </>
  );
}

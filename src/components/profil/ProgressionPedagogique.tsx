import Link from "next/link";
import styles from "./Profil.module.css";
// Point de raccordement isolé : attendre le contrat de progression de #23.
// Aucun chapitre vu ni résultat de test déduit des parties solo.
export function ProgressionPedagogique() {
  return (
    <section
      aria-labelledby="progression-titre"
      className="border-t border-filet pt-5"
    >
      <h2 id="progression-titre" className={styles.heading}>
        Ton parcours pédagogique
      </h2>
      <p className={styles.muted}>
        Le suivi des chapitres découverts et des tests sera disponible
        prochainement. Tu peux déjà explorer les chapitres.
      </p>
      <Link href="/apprendre" className={styles.link}>
        Découvrir un chapitre →
      </Link>
    </section>
  );
}

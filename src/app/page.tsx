import Link from "next/link";
import { Motif } from "@/components/charte/Motif";
import { getAccount } from "@/lib/account";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import styles from "@/components/choix/choix.module.css";

// Accueil du jeu : les quatre façons de jouer.
const ENTREES = [
  { href: "/solo", titre: "Solo libre", texte: "Toute l'Histoire, une période, un pack ou un thème.", motif: "globe" },
  { href: "/scolaire", titre: "Solo scolaire", texte: "Le programme de ta classe, chapitre par chapitre.", motif: "plume" },
  { href: null, titre: "Mode inversé", texte: "On te donne la date, tu retrouves l'événement.", motif: "boussole" },
  { href: "/apprendre", titre: "Apprendre", texte: "Explore un chapitre avec ses dates, sans chrono.", motif: "parchemin" },
] as const;

export default async function Accueil() {
  const compte = isSupabaseConfigured ? await getAccount() : null;
  return (
    <main className={styles.ecran}>
      <div className={styles.colonne}>
        <header className={styles.titre}>
          <h1>Kiffeurs d&apos;Histoire</h1>
          <p>Place les grands événements de l&apos;Histoire sur la frise. Choisis comment jouer.</p>
        </header>
        <ul className={styles.entrees}>
          {ENTREES.map((e) => {
            const contenu = (
              <>
                <Motif nom={e.motif} />
                <div>
                  <h2>{e.titre}</h2>
                  <p>{e.texte}</p>
                </div>
              </>
            );
            return (
              <li key={e.titre} className="grid">
                {e.href ? (
                  <Link href={e.href} className={styles.entree}>{contenu}</Link>
                ) : (
                  <div className={`${styles.entree} ${styles.entreeInactive}`} aria-disabled="true">
                    <span className={styles.badge}>Bientôt</span>
                    {contenu}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!compte && (
          <div className={styles.compte}>
            <span>Sans compte, tu peux tout jouer ; ta progression n&apos;est pas gardée.</span>
            <Link href="/connexion" className="cible inline-flex items-center border border-encre px-4 py-2 font-bold text-encre">Se connecter</Link>
          </div>
        )}
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ChoixScolaire } from "@/components/choix/ChoixScolaire";
import { ErreurLancement } from "@/components/choix/Erreur";
import styles from "@/components/choix/choix.module.css";

export const metadata: Metadata = { title: "Solo scolaire · Kiffeurs d'Histoire" };

export default async function Scolaire({ searchParams }: PageProps<"/scolaire">) {
  const { erreur } = await searchParams;
  return (
    <main className={styles.ecran}>
      <div className={styles.colonne}>
        <Link href="/" className={styles.retour}>← Accueil</Link>
        <header className={styles.titre}>
          <h1>Solo scolaire</h1>
          <p>Révise le programme d&apos;histoire : choisis ta classe, puis les chapitres à travailler.</p>
        </header>
        <ErreurLancement code={erreur} />
        <ChoixScolaire />
      </div>
    </main>
  );
}

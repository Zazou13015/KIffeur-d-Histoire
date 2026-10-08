import type { Metadata } from "next";
import Link from "next/link";
import { ChoixSolo } from "@/components/choix/ChoixSolo";
import { ErreurLancement } from "@/components/choix/Erreur";
import styles from "@/components/choix/choix.module.css";

export const metadata: Metadata = { title: "Solo libre · Kiffeurs d'Histoire" };

export default async function Solo({ searchParams }: PageProps<"/solo">) {
  const { erreur } = await searchParams;
  return (
    <main className={styles.ecran}>
      <div className={styles.colonne}>
        <Link href="/" className={styles.retour}>← Accueil</Link>
        <header className={styles.titre}>
          <h1>Solo libre</h1>
          <p>Choisis ce que tu veux jouer, puis la précision demandée. Dix questions à placer sur la frise.</p>
        </header>
        <ErreurLancement code={erreur} />
        <ChoixSolo />
      </div>
    </main>
  );
}

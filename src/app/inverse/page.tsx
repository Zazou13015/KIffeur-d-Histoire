import type { Metadata } from "next";
import Link from "next/link";
import { ChoixScolaire } from "@/components/choix/ChoixScolaire";
import { ChoixSolo } from "@/components/choix/ChoixSolo";
import { ErreurLancement } from "@/components/choix/Erreur";
import styles from "@/components/choix/choix.module.css";

export const metadata: Metadata = { title: "Mode inversé · Kiffeurs d'Histoire" };

// Mode inversé : mêmes filtres que le solo libre ou le solo scolaire, mais on donne la date et le joueur écrit l'événement.
export default async function Inverse({ searchParams }: PageProps<"/inverse">) {
  const { erreur, type } = await searchParams;
  const scolaire = type === "scolaire";
  return (
    <main className={styles.ecran}>
      <div className={styles.colonne}>
        <Link href="/" className={styles.retour}>← Accueil</Link>
        <header className={styles.titre}>
          <h1>Mode inversé</h1>
          <p>On te donne une date : à toi d&apos;écrire l&apos;événement qui s&apos;est passé ce jour-là. Dix questions.</p>
        </header>
        <nav className={styles.onglets} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }} aria-label="Type de partie">
          <Link href="/inverse" aria-current={scolaire ? undefined : "page"} className={styles.ongletLien}>Solo libre</Link>
          <Link href="/inverse?type=scolaire" aria-current={scolaire ? "page" : undefined} className={styles.ongletLien}>Solo scolaire</Link>
        </nav>
        <ErreurLancement code={erreur} />
        {scolaire ? <ChoixScolaire inverse /> : <ChoixSolo inverse />}
      </div>
    </main>
  );
}

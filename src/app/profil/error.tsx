"use client";
import styles from "@/components/profil/Profil.module.css";
export default function ErrorProfil({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.paper} role="alert">
        <h1 className={styles.heading}>
          Ton profil est momentanément indisponible.
        </h1>
        <p>Réessaie dans quelques instants.</p>
        <button className={styles.link} onClick={reset}>
          Réessayer
        </button>
      </div>
    </main>
  );
}

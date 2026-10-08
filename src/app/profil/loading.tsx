import styles from "@/components/profil/Profil.module.css";
export default function LoadingProfil() {
  return (
    <main className={styles.page}>
      <div className={styles.paper}>
        <p role="status" className="py-12">
          Ouverture de ton carnet…
        </p>
      </div>
    </main>
  );
}

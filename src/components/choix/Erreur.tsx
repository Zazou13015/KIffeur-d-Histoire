import styles from "./choix.module.css";

const MESSAGES: Record<string, string> = {
  choix: "Ce choix n'est pas valable. Choisis à nouveau ce que tu veux jouer.",
  peu: "Il n'y a pas assez de questions pour ce choix. Essaie une autre difficulté ou élargis ton choix.",
  "1": "La partie n'a pas pu démarrer. Réessaie dans un instant.",
};

export function ErreurLancement({ code }: { code?: string | string[] }) {
  const message = typeof code === "string" ? MESSAGES[code] : undefined;
  return message ? <p className={styles.alerte} role="alert">{message}</p> : null;
}
